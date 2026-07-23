// src/lib/lanes/online/onlineLane.ts
//
// ONLINE lane client — implements LaneController for the Esuhai Realtime Translation core.
// Contract: docs/ONLINE-LANE-CONTRACT.md (v0.2). NEVER invent endpoints/events/fields
// beyond that file. Every network call goes through the `/online-api` proxy base path.
//
// Vertical slice (Phase 0): token -> WS(ASR) -> partial/final subtitles -> per-sentence refine.

import type { LaneController, LaneEvents, LaneLine, LaneStatus } from '../types';
import { startPcm16Capture, type CaptureHandle } from './pcm16Capture';

const ONLINE_BASE = '/online-api';
const MAX_RECONNECT = 5;
const RECENT_FINALS_MAX = 6;
const CORPUS_MAX_CHARS = 2000; // contract: corpus ≤ 2000 chars

type StartOpts = {
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
  terms?: string;
  brief?: string;
};

export interface OnlineLaneConfig {
  // The shared LaneController.start() signature (the treaty) has no deviceId, so the
  // selected microphone is supplied here by the host page and read at capture time.
  getDeviceId?: () => string | undefined;
}

export function createOnlineLane(events: LaneEvents, config: OnlineLaneConfig = {}): LaneController {
  let running = false;
  let sessionReady = false; // session.created received → safe to stream audio
  let ws: WebSocket | null = null;
  let capture: CaptureHandle | null = null;
  let opts: StartOpts | null = null;

  let counter = 0;
  let currentLid: string | null = null; // lid of the in-progress (unfinalized) sentence
  const recentFinals: string[] = [];

  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  const setStatus = (s: LaneStatus, detail?: string) => events.onStatus(s, detail);

  const emitLine = (line: Omit<LaneLine, 'at'>) => events.onLine({ ...line, at: Date.now() });

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
        (pcm) => {
          // Only send audio while the WS is OPEN and the upstream session is ready.
          if (ws && ws.readyState === WebSocket.OPEN && sessionReady) ws.send(pcm);
        },
        (v) => events.onLevel(v),
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

  function handleEvent(msg: Record<string, unknown>): void {
    const type = typeof msg.type === 'string' ? msg.type : '';
    switch (type) {
      case 'session.created': {
        sessionReady = true;
        setStatus('listening');
        void ensureCapture();
        break;
      }
      case 'conversation.item.input_audio_transcription.text': {
        // Partial: stable `text` + provisional `stash` tail.
        const text = typeof msg.text === 'string' ? msg.text : '';
        const stash = typeof msg.stash === 'string' ? msg.stash : '';
        if (!currentLid) currentLid = `online-${++counter}`;
        emitLine({ lid: currentLid, sourceText: text + stash, targetText: '', interim: true, corrected: false });
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        // Final: freeze this line, then translate it. The next partial starts a new sentence.
        const transcript = typeof msg.transcript === 'string' ? msg.transcript : '';
        const lid = currentLid ?? `online-${++counter}`;
        currentLid = null;
        emitLine({ lid, sourceText: transcript, targetText: '', interim: false, corrected: false });
        void refine(lid, transcript);
        break;
      }
      case 'asr.emotion':
        // Captured by the contract; not consumed in Phase 0 (used by later TTS phase).
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

  function openWs(): void {
    const socket = new WebSocket(wsUrl());
    socket.binaryType = 'arraybuffer';
    ws = socket;

    socket.onopen = () => {
      reconnectAttempts = 0;
      setStatus('ready');
    };
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
    if (reconnectAttempts >= MAX_RECONNECT) {
      teardown();
      setStatus('error', 'connection lost');
      events.onError('online lane: connection lost after retries');
      return;
    }
    const delayMs = Math.pow(2, reconnectAttempts) * 1000; // 1s, 2s, 4s, 8s, 16s
    reconnectAttempts += 1;
    setStatus('reconnecting', `attempt ${reconnectAttempts}/${MAX_RECONNECT}`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (running) openWs();
    }, delayMs);
  }

  function teardown(): void {
    running = false;
    sessionReady = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
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
    currentLid = null;
    events.onLevel(0);
  }

  async function start(startOpts: StartOpts): Promise<void> {
    if (running) return; // already running — ignore duplicate Start
    opts = startOpts;
    running = true;
    sessionReady = false;
    currentLid = null;
    recentFinals.length = 0;
    reconnectAttempts = 0;
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
    // stop() may have fired while the token request was in flight — abort here so we
    // never open a zombie socket or turn the mic on after the user pressed Stop.
    if (!running) return;
    // Token OK → open the ASR socket. Mic capture starts on `session.created`.
    openWs();
  }

  async function stop(): Promise<void> {
    teardown();
    setStatus('stopped');
  }

  return { id: 'online', start, stop };
}
