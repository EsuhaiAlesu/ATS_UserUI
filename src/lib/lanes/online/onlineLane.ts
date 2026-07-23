// src/lib/lanes/online/onlineLane.ts
//
// ONLINE lane client — implements LaneController for the Esuhai Realtime Translation core.
// Contract: docs/ONLINE-LANE-CONTRACT.md (v0.2). NEVER invent endpoints/events/fields
// beyond that file. Every network call goes through the `/online-api` proxy base path.
//
// Phases layered here:
//   Phase 0 — token → WS(ASR) → subtitles → refine
//   Phase 1 — M2 self-healing WS · M3 sentence segmentation · M4 ghost-transcript guard
//   Phase 2 — M5 fast DRAFT tier (while speaking) · M6 accurate REFINE tier + session context

import type { LaneController, LaneEvents, LaneLine, LaneStatus } from '../types';
import { startPcm16Capture, type CaptureHandle, type CapturePacket } from './pcm16Capture';
import { endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak } from './transcriptSegmentation';
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence } from './asrSpeechEvidence';
import { isStableDraftPrefix, joinLiveDraftSource, stripPromotedPrefix } from './liveDraftTranslation';
import { DRAFT_RATE_WINDOW_MS, decideDraftAdmission, getAdaptiveShortUtteranceFlushDelay } from './livePipelinePolicy';
import { estimateSourceSpeechPace } from './sourceSpeechPace';

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

// M4 — ghost-transcript guard
const VOICED_WINDOW_MS = 4_000; // sliding window over which voiced evidence is summed
const REPEAT_GUARD_MIN_CHARS = 12; // finals this long that repeat verbatim are hallucinations
const LONG_SILENCE_MS = 4_000; // a transcript after this long with no sound -> ghost

// M5 — fast draft tier
const DRAFT_DEBOUNCE_MS = 500; // interim text changed -> wait 500ms before considering a draft
const DRAFT_MIN_CHARS = 20; // shorter source -> no draft yet
const DRAFT_MIN_NEW_CHARS = 14; // must have grown >= 14 chars since the last draft call
const DRAFT_PROMOTION_MS = 1_200; // a draft stable for 1.2s is "promoted" into the official line
const COMMA_FINAL_MIN_CHARS = 2; // a clause ending at a comma boundary drafts immediately from 2 chars

// M6 — accurate refine tier + session context
const REFINE_IDLE_MS = 950; // after finalize, wait 950ms of quiet before refine
const PUNCTUATION_REFINE_IDLE_MS = 360; // ... but only 360ms when the text already ends with strong punctuation
const REFINE_RETRY_DELAY_MS = 800; // retry once after 800ms on network/5xx
const SOURCE_SPEECH_GAP_MS = 1_200; // silent gaps longer than this are excluded from the pace window
const FIRST_PARTIAL_LEAD_MS = 650; // Qwen emits its first partial later than real speech onset

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
  draftCalls: number;
  draftSkipped: { duplicate: number; 'rate-limit': number; 'in-flight': number };
  refineCalls: number;
  refineRetries: number;
}

// Concrete online controller = the treaty + a diagnostics readout (Phase 4 consumes it).
// This does NOT change src/lib/lanes/types.ts — the treaty stays untouched.
export type OnlineLaneController = LaneController & { getDiagnostics(): OnlineDiagnostics };

// Phase-3 TTS metadata parked per finalized line (not on the LaneLine treaty).
interface TtsMeta {
  ttsText?: string;
  emotion?: string;
  ttsSpeed?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createOnlineLane(events: LaneEvents, config: OnlineLaneConfig = {}): OnlineLaneController {
  let running = false;
  let sessionReady = false; // session.created received → safe to stream audio
  let ws: WebSocket | null = null;
  let capture: CaptureHandle | null = null;
  let opts: StartOpts | null = null;

  let counter = 0;
  // Bumped on every start() and teardown(); an in-flight draft/refine fetch captures the value
  // at call time and refuses to emit if the session has since ended or restarted (lids restart
  // at online-1 each session, so a bare lid check cannot catch a cross-session collision).
  let sessionGen = 0;

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

  // M5 draft-tier state
  let currentInterimSource = ''; // latest interim source shown (buffer + partial)
  let lastInterimTarget = ''; // latest interim (draft) translation shown
  let draftDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let promotionTimer: ReturnType<typeof setTimeout> | null = null;
  let promotedSource = ''; // head source locked as promoted (not re-translated)
  let promotedTarget = ''; // its translation
  let lastDraft: { source: string; target: string; fullSource: string } | null = null;
  let lastDraftFullSourceLen = 0; // full interim-source length at the last draft call
  const inFlightDraftSources = new Set<string>();
  const draftWindow: number[] = []; // timestamps of draft calls (60s sliding window)
  let draftSeq = 0;

  // M6 refine-tier state
  const pendingRefineTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let latestEmotion: string | undefined;
  const ttsMeta = new Map<string, TtsMeta>();
  // per-segment pace timing
  let segmentFirstPartialAt = 0;
  let lastPartialAt = 0;
  let segmentSilentGapsMs = 0;

  // diagnostics counters
  let draftCalls = 0;
  const draftSkipped = { duplicate: 0, 'rate-limit': 0, 'in-flight': 0 };
  let refineCalls = 0;
  let refineRetries = 0;

  const setStatus = (s: LaneStatus, detail?: string) => events.onStatus(s, detail);
  const emitLine = (line: Omit<LaneLine, 'at'>) => events.onLine({ ...line, at: Date.now() });

  function pruneVoiced(): number {
    const cutoff = Date.now() - VOICED_WINDOW_MS;
    while (voicedWindow.length && voicedWindow[0].at < cutoff) voicedWindow.shift();
    let sum = 0;
    for (const e of voicedWindow) sum += e.voicedMs;
    return sum;
  }

  function pruneDraftWindow(): number {
    const cutoff = Date.now() - DRAFT_RATE_WINDOW_MS;
    while (draftWindow.length && draftWindow[0] < cutoff) draftWindow.shift();
    return draftWindow.length;
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

  // ---- timing helper for source pace ----

  function noteSpeechTiming(): void {
    const now = Date.now();
    if (segmentFirstPartialAt === 0) {
      segmentFirstPartialAt = now;
    } else {
      const gap = now - lastPartialAt;
      if (gap > SOURCE_SPEECH_GAP_MS) segmentSilentGapsMs += gap; // exclude silent pauses from the pace window
    }
    lastPartialAt = now;
  }

  // ---- M5: draft tier ----

  function isCommaFinal(src: string): boolean {
    const t = src.trim();
    if (t.length < COMMA_FINAL_MIN_CHARS) return false;
    const last = t[t.length - 1];
    if (last !== ',' && last !== '，' && last !== '、') return false;
    return findFirstCommaClauseBreak(t, COMMA_FINAL_MIN_CHARS) > 0;
  }

  // Strip the promoted head so only the fresh tail is (re)translated. Returns null when the
  // ASR revised the promoted prefix (promotion dropped) so the caller retranslates the full text.
  function draftPendingTail(full: string): string {
    if (!promotedSource) return full;
    const res = stripPromotedPrefix(full, promotedSource);
    if (!res.matched) {
      promotedSource = '';
      promotedTarget = '';
      return full;
    }
    if (res.coveredByPromoted) return ''; // ASR regressed to a prefix already promoted
    return res.text;
  }

  function scheduleDraft(): void {
    if (isCommaFinal(currentInterimSource)) {
      // Comma-final clauses jump the debounce and draft immediately (with priority).
      if (draftDebounceTimer) {
        clearTimeout(draftDebounceTimer);
        draftDebounceTimer = null;
      }
      considerDraft(true);
      return;
    }
    if (draftDebounceTimer) return; // throttle: at most one draft per debounce window
    draftDebounceTimer = setTimeout(() => {
      draftDebounceTimer = null;
      considerDraft(false);
    }, DRAFT_DEBOUNCE_MS);
  }

  function considerDraft(commaFinal: boolean): void {
    if (!running || !segmentLid) return;
    const full = currentInterimSource.trim();
    if (!full) return;
    if (!commaFinal) {
      if (full.length < DRAFT_MIN_CHARS) return;
      if (full.length - lastDraftFullSourceLen < DRAFT_MIN_NEW_CHARS) return;
    }
    const sentSource = draftPendingTail(full);
    if (!sentSource) return; // nothing new to translate (covered by promoted head)
    const decision = decideDraftAdmission({
      commaFinal,
      inFlightCount: inFlightDraftSources.size,
      duplicateInFlight: inFlightDraftSources.has(sentSource),
      requestsInWindow: pruneDraftWindow(),
    });
    if (!decision.allow) {
      draftSkipped[decision.reason] += 1;
      return;
    }
    void sendDraft(sentSource, full, segmentLid);
  }

  async function sendDraft(sentSource: string, fullAtSend: string, lid: string): Promise<void> {
    const o = opts!;
    const gen = sessionGen;
    inFlightDraftSources.add(sentSource);
    draftWindow.push(Date.now());
    draftCalls += 1;
    lastDraftFullSourceLen = fullAtSend.length;
    try {
      const res = await fetch(`${ONLINE_BASE}/refine-preview-translation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Drafts stay fast + cheap: no recentFinals / sessionBrief.
        body: JSON.stringify({
          sourceText: sentSource,
          sourceLanguage: o.sourceLanguage,
          targetLanguage: o.targetLanguage,
          refineStage: 'draft',
          traceId: `${lid}-d${++draftSeq}`,
          subtitleId: lid,
        }),
      });
      if (!res.ok) throw new Error(`draft HTTP ${res.status}`);
      const data = (await res.json()) as { translatedText?: string };
      // Apply only if the SAME session + interim segment is still live and the source still
      // extends what we submitted (otherwise the ASR revised backwards → discard, keep words).
      if (gen !== sessionGen || lid !== segmentLid) return;
      if (!isStableDraftPrefix(currentInterimSource, fullAtSend)) return;
      const tailTarget = data.translatedText ?? '';
      const shownTarget = joinLiveDraftSource(promotedTarget, tailTarget);
      lastInterimTarget = shownTarget;
      lastDraft = { source: sentSource, target: tailTarget, fullSource: fullAtSend };
      emitLine({ lid, sourceText: currentInterimSource, targetText: shownTarget, interim: true, corrected: false });
      schedulePromotion();
    } catch {
      // Drafts are best-effort; failures are silent (the refine tier is the source of truth).
    } finally {
      inFlightDraftSources.delete(sentSource);
    }
  }

  function schedulePromotion(): void {
    if (promotionTimer) clearTimeout(promotionTimer);
    promotionTimer = setTimeout(() => {
      promotionTimer = null;
      if (!lastDraft) return;
      // Promote only if the source portion has not changed for 1.2s.
      if (!isStableDraftPrefix(currentInterimSource, lastDraft.fullSource)) return;
      promotedSource = lastDraft.fullSource;
      promotedTarget = joinLiveDraftSource(promotedTarget, lastDraft.target);
      lastDraft = null; // folded into the promoted head; don't double-promote
    }, DRAFT_PROMOTION_MS);
  }

  function resetDraftState(): void {
    if (draftDebounceTimer) {
      clearTimeout(draftDebounceTimer);
      draftDebounceTimer = null;
    }
    if (promotionTimer) {
      clearTimeout(promotionTimer);
      promotionTimer = null;
    }
    promotedSource = '';
    promotedTarget = '';
    lastDraft = null;
    lastDraftFullSourceLen = 0;
    lastInterimTarget = '';
    // In-flight drafts resolve and self-discard via the lid check; the 60s rate window is
    // session-wide and intentionally NOT reset here.
  }

  // ---- events ----

  function handlePartial(msg: Record<string, unknown>): void {
    const text = typeof msg.text === 'string' ? msg.text : '';
    const stash = typeof msg.stash === 'string' ? msg.stash : '';
    // M4: only display partials backed by clear speech evidence / recent sound.
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_PARTIAL_MIN_VOICED_MS)) return;
    if (Date.now() - lastLoudAt >= LONG_SILENCE_MS) return;
    noteSpeechTiming();
    if (!segmentLid) segmentLid = `online-${++counter}`;
    currentInterimSource = joinSeg(segmentBuffer, (text + stash).trim());
    emitLine({ lid: segmentLid, sourceText: currentInterimSource, targetText: lastInterimTarget, interim: true, corrected: false });
    scheduleDraft();
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
    currentInterimSource = segmentBuffer;
    emitLine({ lid: segmentLid, sourceText: segmentBuffer, targetText: lastInterimTarget, interim: true, corrected: false });

    clearSegmentTimer();
    const buf = segmentBuffer.trim();
    const strongBreak = endsWithStrongSentenceBreak(buf, true) && buf.length >= SEGMENT_MIN_CHARS;
    const longEnough = buf.length >= UTTERANCE_MIN_FLUSH_CHARS;
    if (strongBreak || longEnough) {
      flushSegment();
    } else {
      // M6: fillers wait ~2.5s; meaningful clauses flush in 0.85–1.5s.
      segmentTimer = setTimeout(() => {
        segmentTimer = null;
        flushSegment();
      }, getAdaptiveShortUtteranceFlushDelay({ text: buf, sessionTerms: opts?.terms }));
    }
  }

  function flushSegment(): void {
    clearSegmentTimer();
    const text = segmentBuffer.trim();
    if (!text) {
      segmentBuffer = '';
      segmentLid = null;
      currentInterimSource = '';
      resetDraftState();
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

    // Source pace over the actual speaking window (minus silent gaps, plus the ASR lead).
    const rawDurationMs = segmentFirstPartialAt ? Date.now() - segmentFirstPartialAt : 0;
    const durationMs = rawDurationMs > 0 ? Math.max(0, rawDurationMs - segmentSilentGapsMs) + FIRST_PARTIAL_LEAD_MS : 0;
    const sourcePace = estimateSourceSpeechPace(head, durationMs)?.label;

    // recentFinals order is captured at flush time (deterministic), not at refine time.
    const priorFinals = recentFinals.slice(-RECENT_FINALS_MAX);
    recentFinals.push(head);
    if (recentFinals.length > RECENT_FINALS_MAX) {
      recentFinals.splice(0, recentFinals.length - RECENT_FINALS_MAX);
    }

    // Finalize the SOURCE line; keep the draft translation (dim) until refine returns.
    const draftFallback = lastInterimTarget;
    emitLine({ lid, sourceText: head, targetText: draftFallback, interim: false, corrected: false });
    scheduleRefine(lid, head, priorFinals, sourcePace, draftFallback);

    // Reset per-segment draft + timing state (this segment is done).
    resetDraftState();
    segmentFirstPartialAt = 0;
    lastPartialAt = 0;
    segmentSilentGapsMs = 0;

    // Carry any post-cut remainder into a fresh interim line with its own adaptive flush timer.
    segmentBuffer = remainder;
    if (remainder) {
      segmentLid = `online-${++counter}`;
      currentInterimSource = remainder;
      emitLine({ lid: segmentLid, sourceText: remainder, targetText: '', interim: true, corrected: false });
      segmentTimer = setTimeout(() => {
        segmentTimer = null;
        flushSegment();
      }, getAdaptiveShortUtteranceFlushDelay({ text: remainder, sessionTerms: opts?.terms }));
    } else {
      segmentLid = null;
      currentInterimSource = '';
    }
  }

  // ---- M6: refine tier ----

  function scheduleRefine(lid: string, head: string, priorFinals: string[], sourcePace: string | undefined, draftFallback: string): void {
    const idleDelay = endsWithStrongSentenceBreak(head, true) ? PUNCTUATION_REFINE_IDLE_MS : REFINE_IDLE_MS;
    const existing = pendingRefineTimers.get(lid);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      pendingRefineTimers.delete(lid);
      void refine(lid, head, priorFinals, sourcePace, draftFallback);
    }, idleDelay);
    pendingRefineTimers.set(lid, t);
  }

  async function attemptRefine(body: string): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; retriable: boolean; message: string }> {
    try {
      const res = await fetch(`${ONLINE_BASE}/refine-preview-translation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) return { ok: false, retriable: res.status >= 500, message: `refine HTTP ${res.status}` };
      const data = (await res.json()) as Record<string, unknown>;
      return { ok: true, data };
    } catch (err) {
      return { ok: false, retriable: true, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async function refine(lid: string, head: string, priorFinals: string[], sourcePace: string | undefined, draftFallback: string): Promise<void> {
    const o = opts!;
    const gen = sessionGen;
    const body = JSON.stringify({
      sourceText: head,
      sourceLanguage: o.sourceLanguage,
      targetLanguage: o.targetLanguage,
      refineStage: 'refine',
      recentFinals: priorFinals,
      sessionBrief: o.brief,
      sessionTerms: o.terms,
      sourcePace,
      sourceEmotion: latestEmotion,
      traceId: `${lid}-r`,
      subtitleId: lid,
    });
    refineCalls += 1;
    let result = await attemptRefine(body);
    if (!result.ok && result.retriable && running) {
      refineRetries += 1;
      await delay(REFINE_RETRY_DELAY_MS);
      if (gen !== sessionGen) return;
      result = await attemptRefine(body);
    }
    // Session ended (or restarted) while awaiting — never emit a stale line onto a reused lid.
    if (gen !== sessionGen) return;
    if (result.ok) {
      const data = result.data as { sourceText?: string; translatedText?: string; ttsText?: string; emotion?: string; ttsSpeed?: number };
      // Park Phase-3 TTS metadata (not on the LaneLine treaty).
      ttsMeta.set(lid, { ttsText: data.ttsText, emotion: data.emotion, ttsSpeed: data.ttsSpeed });
      // Always display the server's returned (ASR-corrected) sourceText, not the raw transcript.
      emitLine({
        lid,
        sourceText: data.sourceText ?? head,
        targetText: data.translatedText ?? draftFallback,
        interim: false,
        corrected: true,
      });
    } else {
      // Session must survive: keep the finalized source line with its draft translation.
      emitLine({ lid, sourceText: head, targetText: draftFallback, interim: false, corrected: false });
      events.onError(`refine failed: ${result.message}`);
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
      case 'asr.emotion': {
        const emo = typeof msg.emotion === 'string' ? msg.emotion : undefined;
        if (emo) latestEmotion = emo;
        break;
      }
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
    const delayMs = Math.min(RECONNECT_BASE_DELAY_MS * Math.pow(2, reconnectAttempts), RECONNECT_MAX_DELAY_MS); // 600,1200,2400,4800,5000
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
    sessionGen += 1; // invalidate any in-flight draft/refine fetches from this session
    sessionReady = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopWatchdog();
    clearSegmentTimer();
    resetDraftState();
    for (const t of pendingRefineTimers.values()) clearTimeout(t);
    pendingRefineTimers.clear();
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
    currentInterimSource = '';
    voicedWindow.length = 0;
    inFlightDraftSources.clear();
    segmentFirstPartialAt = 0;
    lastPartialAt = 0;
    segmentSilentGapsMs = 0;
    events.onLevel(0);
  }

  async function start(startOpts: StartOpts): Promise<void> {
    if (running) return; // already running — ignore duplicate Start
    opts = startOpts;
    running = true;
    sessionGen += 1; // new session generation — stale fetches from any prior session are now ignored
    sessionReady = false;
    reconnectAttempts = 0;
    counter = 0;
    segmentBuffer = '';
    segmentLid = null;
    voicedWindow.length = 0;
    previousFinalTranscript = '';
    droppedGhosts = 0;
    recentFinals.length = 0;
    // reset Phase-2 state + counters
    resetDraftState();
    currentInterimSource = '';
    draftWindow.length = 0;
    inFlightDraftSources.clear();
    draftSeq = 0;
    latestEmotion = undefined;
    ttsMeta.clear();
    for (const t of pendingRefineTimers.values()) clearTimeout(t);
    pendingRefineTimers.clear();
    segmentFirstPartialAt = 0;
    lastPartialAt = 0;
    segmentSilentGapsMs = 0;
    draftCalls = 0;
    draftSkipped.duplicate = 0;
    draftSkipped['rate-limit'] = 0;
    draftSkipped['in-flight'] = 0;
    refineCalls = 0;
    refineRetries = 0;
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
      draftCalls,
      draftSkipped: { ...draftSkipped },
      refineCalls,
      refineRetries,
    };
  }

  return { id: 'online', start, stop, getDiagnostics };
}
