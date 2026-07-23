// src/lib/lanes/online/onlineLane.ts
//
// ONLINE lane client — implements LaneController for the Esuhai Realtime Translation core.
// Contract: docs/ONLINE-LANE-CONTRACT.md (v0.2). NEVER invent endpoints/events/fields
// beyond that file. Every network call goes through the `/online-api` proxy base path.
//
// Phase 1 hardening on top of the Phase 0 vertical slice:
//   M2 — self-healing WS client (backoff reconnect + stall watchdog)
//   M3 — sentence segmentation (merge finalized fragments; number-safe breaks)
//   M4 — ghost-transcript guard (speech-evidence / repeat / long-silence)

import type { LaneController, LaneEvents, LaneLine, LaneStatus } from '../types';
import { startPcm16Capture, type CaptureHandle, type CapturePacket } from './pcm16Capture';
import { endsWithStrongSentenceBreak, findLastStrongSentenceBreak } from './transcriptSegmentation';
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence } from './asrSpeechEvidence';

const ONLINE_BASE = '/online-api';
const RECENT_FINALS_MAX = 6;
const CORPUS_MAX_CHARS = 2000; // contract: corpus ≤ 2000 chars

// M2 — self-healing WS client (field-measured constants; do NOT tune)
const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 600; // exponential: 600, 1200, 2400, 4800, 5000 (capped)
const RECONNECT_MAX_DELAY_MS = 5_000;
const STALL_RECONNECT_MS = 45_000; // 45s with zero events -> upstream wedged -> reconnect
const STALL_LOUD_RECONNECT_MS = 35_000; // sound present but 35s with zero events -> reconnect earlier
const AUDIO_LOUD_LEVEL_THRESHOLD = 0.09; // onLevel >= this counts as "sound present" (≈ peak 12/127)
const WATCHDOG_INTERVAL_MS = 5_000;

// M3 — sentence segmentation
const SEGMENT_MAX_CHARS = 120; // longer finalized text -> cut at the last strong break
const SEGMENT_MIN_CHARS = 18; // shorter fragments wait to merge with the next one
const UTTERANCE_MIN_FLUSH_CHARS = 40; // finals shorter than this wait for a companion
const STALE_SEGMENT_FLUSH_MS = 2_500; // ... but wait at most 2.5s, then flush anyway

// M4 — ghost-transcript guard
const VOICED_WINDOW_MS = 4_000; // sliding window over which voiced evidence is summed
const REPEAT_GUARD_MIN_CHARS = 12; // finals this long that repeat verbatim are hallucinations
const LONG_SILENCE_MS = 4_000; // a transcript after this long with no sound -> ghost

type StartOpts = {
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
  terms?: string;
  brief?: string;
};

export interface OnlineLaneConfig {
  // The shared LaneController.start() signature (the treaty) carries no device/gate options,
  // so the host page supplies them here; both are read at capture-start time.
  getDeviceId?: () => string | undefined;
  getNearMicGate?: () => boolean;
}

export interface OnlineDiagnostics {
  reconnectAttempts: number;
  secondsSinceLastEvent: number;
  voicedMsRecent: number;
  droppedGhosts: number;
}

// Concrete online controller = the treaty + a diagnostics readout (Phase 4 consumes it).
// This does NOT change src/lib/lanes/types.ts — the treaty stays untouched.
export type OnlineLaneController = LaneController & { getDiagnostics(): OnlineDiagnostics };

export function createOnlineLane(events: LaneEvents, config: OnlineLaneConfig = {}): OnlineLaneController {
  let running = false;
  let sessionReady = false; // session.created received → safe to stream audio
  let ws: WebSocket | null = null;
  let capture: CaptureHandle | null = null;
  let opts: StartOpts | null = null;

  let counter = 0;

  // M2 state
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let watchdogTimer: ReturnType<typeof setInterval> | null = null;
  let lastEventAt = 0; // any JSON event from the WS (or a fresh (re)connect)
  let lastLoudAt = 0; // onLevel exceeded the loud threshold

  // M3 segmentation state
  let segmentBuffer = ''; // finalized fragments awaiting flush
  let segmentLid: string | null = null; // lid of the in-progress (interim) line
  let segmentTimer: ReturnType<typeof setTimeout> | null = null;

  // M4 ghost-guard state
  const voicedWindow: { at: number; voicedMs: number }[] = [];
  let previousFinalTranscript = '';
  let droppedGhosts = 0;

  const recentFinals: string[] = [];

  const setStatus = (s: LaneStatus, detail?: string) => events.onStatus(s, detail);
  const emitLine = (line: Omit<LaneLine, 'at'>) => events.onLine({ ...line, at: Date.now() });

  function pruneVoiced(): number {
    const cutoff = Date.now() - VOICED_WINDOW_MS;
    while (voicedWindow.length && voicedWindow[0].at < cutoff) voicedWindow.shift();
    let sum = 0;
    for (const e of voicedWindow) sum += e.voicedMs;
    return sum;
  }

  function joinSeg(a: string, b: string): string {
    if (!a) return b;
    if (!b) return a;
    return /\s$/.test(a) ? a + b : `${a} ${b}`;
  }

  function clearSegmentTimer(): void {
    if (segmentTimer) {
      clearTimeout(segmentTimer);
      segmentTimer = null;
    }
  }

  function dropGhost(reason: string, transcript: string): void {
    droppedGhosts += 1;
    // eslint-disable-next-line no-console
    console.debug(`[onlineLane] dropped ghost (${reason}): ${transcript.slice(0, 40)}`);
  }

  function wsUrl(): string {
    const o = opts!;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const corpus = encodeURIComponent((o.terms ?? '').slice(0, CORPUS_MAX_CHARS));
    return `${proto}//${location.host}${ONLINE_BASE}/asr?language=${o.sourceLanguage}&corpus=${corpus}`;
  }

  async function fetchToken(): Promise<void> {
    const o = opts!;
    const res = await fetch(`${ONLINE_BASE}/realtime-preview-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetLanguage: o.targetLanguage }),
    });
    if (!res.ok) throw new Error(`token request failed (HTTP ${res.status})`);
    const data = (await res.json()) as { mode?: string; ephemeralKey?: string; sdpUrl?: string };
    // Contract: the only supported mode is 'transcribe'. ephemeralKey/sdpUrl ⇒ WebRTC misconfig.
    if (data.mode !== 'transcribe') {
      throw new Error('server is in WebRTC mode, fix server config');
    }
  }

  async function ensureCapture(): Promise<void> {
    if (capture) return; // already capturing (e.g. across a reconnect)
    try {
      const handle = await startPcm16Capture(
        config.getDeviceId?.(),
        (packet: CapturePacket) => {
          voicedWindow.push({ at: Date.now(), voicedMs: packet.voicedMs });
          pruneVoiced();
          // Only send audio while the WS is OPEN and the upstream session is ready.
          // Audio produced while not OPEN is discarded here — no unbounded buffering.
          if (ws && ws.readyState === WebSocket.OPEN && sessionReady) ws.send(packet.pcm);
        },
        (v: number) => {
          events.onLevel(v);
          if (v >= AUDIO_LOUD_LEVEL_THRESHOLD) lastLoudAt = Date.now();
        },
        { nearMicGate: config.getNearMicGate?.() ?? true },
      );
      // stop() may have fired while the mic-permission prompt was open — never leave a hot mic.
      if (!running) {
        handle.stop();
        return;
      }
      capture = handle;
    } catch (err) {
      const m = `microphone error: ${err instanceof Error ? err.message : String(err)}`;
      teardown();
      setStatus('error', m);
      events.onError(m);
    }
  }

  // ---- M3: segment buffer ----

  function handlePartial(msg: Record<string, unknown>): void {
    const text = typeof msg.text === 'string' ? msg.text : '';
    const stash = typeof msg.stash === 'string' ? msg.stash : '';
    // M4: only display partials backed by clear speech evidence / recent sound.
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_PARTIAL_MIN_VOICED_MS)) return;
    if (Date.now() - lastLoudAt >= LONG_SILENCE_MS) return;
    if (!segmentLid) segmentLid = `online-${++counter}`;
    const shown = joinSeg(segmentBuffer, (text + stash).trim());
    emitLine({ lid: segmentLid, sourceText: shown, targetText: '', interim: true, corrected: false });
  }

  function handleFinal(msg: Record<string, unknown>): void {
    const transcript = (typeof msg.transcript === 'string' ? msg.transcript : '').trim();
    if (!transcript) return;
    // M4 ghost guards (drop finals, count them).
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_FINAL_MIN_VOICED_MS)) {
      dropGhost('low-voiced', transcript);
      return;
    }
    if (Date.now() - lastLoudAt >= LONG_SILENCE_MS) {
      dropGhost('long-silence', transcript);
      return;
    }
    if (transcript.length >= REPEAT_GUARD_MIN_CHARS && transcript === previousFinalTranscript) {
      dropGhost('repeat', transcript);
      return;
    }
    previousFinalTranscript = transcript;

    // M3: append to the segment buffer; the finalized sentence is not yet its own line.
    segmentBuffer = joinSeg(segmentBuffer, transcript);
    if (!segmentLid) segmentLid = `online-${++counter}`;
    emitLine({ lid: segmentLid, sourceText: segmentBuffer, targetText: '', interim: true, corrected: false });

    clearSegmentTimer();
    const buf = segmentBuffer.trim();
    const strongBreak = endsWithStrongSentenceBreak(buf, true) && buf.length >= SEGMENT_MIN_CHARS;
    const longEnough = buf.length >= UTTERANCE_MIN_FLUSH_CHARS;
    if (strongBreak || longEnough) {
      flushSegment();
    } else {
      // (c) wait at most 2.5s for a companion final, then flush anyway.
      segmentTimer = setTimeout(() => {
        segmentTimer = null;
        flushSegment();
      }, STALE_SEGMENT_FLUSH_MS);
    }
  }

  function flushSegment(): void {
    clearSegmentTimer();
    const text = segmentBuffer.trim();
    if (!text) {
      segmentBuffer = '';
      segmentLid = null;
      return;
    }
    let head = text;
    let remainder = '';
    if (text.length > SEGMENT_MAX_CHARS) {
      const cut = findLastStrongSentenceBreak(text, true);
      if (cut > 0 && cut < text.length) {
        head = text.slice(0, cut).trim();
        remainder = text.slice(cut).trim();
      }
    }
    if (!head) {
      head = text;
      remainder = '';
    }
    const lid = segmentLid ?? `online-${++counter}`;
    // Finalize the line the user watched grow; then translate it (plain refine as in Phase 0).
    emitLine({ lid, sourceText: head, targetText: '', interim: false, corrected: false });
    void refine(lid, head);
    // Carry any post-cut remainder into a fresh interim line.
    segmentBuffer = remainder;
    if (remainder) {
      segmentLid = `online-${++counter}`;
      emitLine({ lid: segmentLid, sourceText: remainder, targetText: '', interim: true, corrected: false });
      // The remainder has no trailing strong break and is often < 40 chars, so it owns no
      // flush trigger — arm the stale-flush timer (rule c) so it can't sit interim forever
      // and get discarded on a pause/stop. (clearSegmentTimer() already ran at the top.)
      segmentTimer = setTimeout(() => {
        segmentTimer = null;
        flushSegment();
      }, STALE_SEGMENT_FLUSH_MS);
    } else {
      segmentLid = null;
    }
  }

  function handleEvent(msg: Record<string, unknown>): void {
    lastEventAt = Date.now(); // ANY JSON event refreshes the stall window
    const type = typeof msg.type === 'string' ? msg.type : '';
    switch (type) {
      case 'session.created': {
        sessionReady = true;
        reconnectAttempts = 0; // upstream ready again → reset the backoff ladder
        setStatus('listening');
        void ensureCapture();
        break;
      }
      case 'conversation.item.input_audio_transcription.text':
        handlePartial(msg);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        handleFinal(msg);
        break;
      case 'asr.emotion':
        // Captured by the contract; not consumed in Phase 1 (used by a later TTS phase).
        break;
      case 'error': {
        // Upstream error with internal model fallback — keep the connection unless WS closes.
        const err = msg.error;
        let m = 'online lane upstream error';
        if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
          m = (err as { message: string }).message;
        }
        events.onError(m);
        break;
      }
      default:
        break;
    }
  }

  async function refine(lid: string, transcript: string): Promise<void> {
    const o = opts!;
    // Pass the PRIOR finalized sentences as context, then record this one (keep last 6).
    const priorFinals = recentFinals.slice(-RECENT_FINALS_MAX);
    recentFinals.push(transcript);
    if (recentFinals.length > RECENT_FINALS_MAX) {
      recentFinals.splice(0, recentFinals.length - RECENT_FINALS_MAX);
    }
    try {
      const res = await fetch(`${ONLINE_BASE}/refine-preview-translation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: transcript,
          sourceLanguage: o.sourceLanguage,
          targetLanguage: o.targetLanguage,
          recentFinals: priorFinals,
          sessionTerms: o.terms,
          sessionBrief: o.brief,
          refineStage: 'refine',
        }),
      });
      if (!res.ok) throw new Error(`refine failed (HTTP ${res.status})`);
      const data = (await res.json()) as { sourceText?: string; translatedText?: string };
      // Always display the returned (possibly ASR-corrected) sourceText, not the raw transcript.
      emitLine({
        lid,
        sourceText: data.sourceText ?? transcript,
        targetText: data.translatedText ?? '',
        interim: false,
        corrected: true,
      });
    } catch (err) {
      // The session must survive a translation failure: keep the source line, no translation.
      emitLine({ lid, sourceText: transcript, targetText: '', interim: false, corrected: false });
      events.onError(`refine failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ---- M2: WS lifecycle + reconnect + watchdog ----

  function openWs(): void {
    lastEventAt = Date.now(); // give the fresh connection a full stall window before its first event
    const socket = new WebSocket(wsUrl());
    socket.binaryType = 'arraybuffer';
    ws = socket;

    socket.onopen = () => setStatus('ready');
    socket.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return; // the core sends JSON text events only
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(ev.data) as Record<string, unknown>;
      } catch {
        return;
      }
      handleEvent(msg);
    };
    socket.onerror = () => {
      // Swallow — `onclose` always follows and owns the reconnect decision.
    };
    socket.onclose = () => {
      if (ws === socket) ws = null;
      if (!running) return; // intentional stop
      sessionReady = false;
      scheduleReconnect();
    };
  }

  function scheduleReconnect(): void {
    if (!running) return;
    if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      teardown();
      setStatus('error', 'connection lost');
      events.onError('online lane: connection lost after retries');
      return;
    }
    const delayMs = Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts), RECONNECT_MAX_DELAY_MS);
    reconnectAttempts += 1;
    setStatus('reconnecting', `attempt ${reconnectAttempts}/${RECONNECT_MAX_ATTEMPTS}`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (running) openWs();
    }, delayMs);
  }

  function forceReconnect(reason: string): void {
    if (!ws) return;
    const s = ws;
    ws = null;
    sessionReady = false;
    s.onopen = s.onmessage = s.onerror = s.onclose = null; // detach so its onclose can't double-fire
    try {
      s.close();
    } catch {
      /* ignore */
    }
    events.onError(`online lane stalled (${reason}) → reconnecting`);
    scheduleReconnect();
  }

  function startWatchdog(): void {
    stopWatchdog();
    watchdogTimer = setInterval(() => {
      if (!running || !ws || ws.readyState !== WebSocket.OPEN) return;
      const now = Date.now();
      const sinceEvent = now - lastEventAt;
      // A transcription session emits nothing during real silence, so silence and a wedged
      // upstream look identical from events alone — the local level monitor disambiguates.
      if (sinceEvent > STALL_RECONNECT_MS) {
        forceReconnect('45s no events');
      } else if (lastLoudAt > lastEventAt && sinceEvent > STALL_LOUD_RECONNECT_MS) {
        forceReconnect('35s no events with sound present');
      }
    }, WATCHDOG_INTERVAL_MS);
  }

  function stopWatchdog(): void {
    if (watchdogTimer) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }

  function teardown(): void {
    running = false;
    sessionReady = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopWatchdog();
    clearSegmentTimer();
    if (ws) {
      const s = ws;
      ws = null;
      s.onopen = s.onmessage = s.onerror = s.onclose = null;
      try {
        s.close();
      } catch {
        /* ignore */
      }
    }
    if (capture) {
      try {
        capture.stop();
      } catch {
        /* ignore */
      }
      capture = null;
    }
    segmentBuffer = '';
    segmentLid = null;
    voicedWindow.length = 0;
    events.onLevel(0);
  }

  async function start(startOpts: StartOpts): Promise<void> {
    if (running) return; // already running — ignore duplicate Start
    opts = startOpts;
    running = true;
    sessionReady = false;
    reconnectAttempts = 0;
    counter = 0;
    segmentBuffer = '';
    segmentLid = null;
    voicedWindow.length = 0;
    previousFinalTranscript = '';
    droppedGhosts = 0;
    recentFinals.length = 0;
    const now = Date.now();
    lastEventAt = now;
    lastLoudAt = now; // grace: don't ghost-drop the first transcripts before any loud frame
    setStatus('connecting');
    try {
      await fetchToken();
    } catch (err) {
      running = false;
      const m = err instanceof Error ? err.message : String(err);
      setStatus('error', m);
      events.onError(m);
      throw err;
    }
    // stop() may have fired while the token request was in flight — abort before opening anything.
    if (!running) return;
    startWatchdog();
    openWs();
  }

  async function stop(): Promise<void> {
    teardown();
    setStatus('stopped');
  }

  function getDiagnostics(): OnlineDiagnostics {
    return {
      reconnectAttempts,
      secondsSinceLastEvent: lastEventAt ? Math.max(0, (Date.now() - lastEventAt) / 1000) : 0,
      voicedMsRecent: Math.round(pruneVoiced()),
      droppedGhosts,
    };
  }

  return { id: 'online', start, stop, getDiagnostics };
}
