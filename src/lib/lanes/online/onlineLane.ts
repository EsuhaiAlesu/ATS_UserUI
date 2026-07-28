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
import { enqueueTtsSentence, getTtsQueueLength, resetTtsPlayback, setTtsPlaybackStartHandler, stopTtsPlayback, subscribeTtsSpeaking } from './ttsPlayback';
import { buildSessionExport, saveSessionExport, type SaveOutcome, type SessionLine } from './sessionExport';
import { createLatencyTracker, type LatencyReport } from './latencyTracker';
import { classifyUtterance, createDirectionTracker, directionOf, type DirectionTracker, type Lang } from './utteranceDirection';
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';

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

// M7 — half-duplex anti-feedback gate (Phase 3)
export type TtsGateMode = 'auto' | 'always' | 'off';
const TTS_GATE_NETWORK_TAIL_MS = 1_200; // 'always': extra un-gate delay after playback ends

// M8 — session operations (Phase 4)
const AUTO_SAVE_INTERVAL_MS = 30_000; // checkpoint the transcript every 30s if new lines exist
const USAGE_REPORT_INTERVAL_MS = 300_000; // usage report every 5 min (and once on stop)

// TASK 12.5 — the browser silently queues ws.send() on a weak uplink; the subtitle drifts while
// everything still says "connected". Audio is 8192 bytes / 256 ms ≈ 32 KB/s, so:
const SEND_BACKLOG_WARN_BYTES = 256 * 1024; // ≈ 8s of audio queued → surface it to the operator
const SEND_BACKLOG_RECONNECT_BYTES = 768 * 1024; // ≈ 24s → the uplink is unusable, reconnect the ladder
const BACKLOG_TOAST_THROTTLE_MS = 60_000; // at most one backlog-reconnect toast per minute (the diag row stays live)

// TASK 11.4 — the ONE Stop exception to VAD commit: on Dừng, send a single commit and wait briefly for
// the trailing final, then await the outstanding refine so the last sentence gets its finished
// translation before teardown. A stop button that hesitates is worse than a lost tail — keep both bounds tight.
const STOP_COMMIT_WAIT_MS = 700;
const STOP_REFINE_WAIT_MS = 2_000;

type StartOpts = {
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
  terms?: string;
  brief?: string;
  ttsGate?: TtsGateMode;
};

// TASK 6.2: per-utterance direction leaves the lane through this lane-private channel (NOT the treaty
// LaneLine — src/lib/lanes/types.ts stays untouched), alongside events.onLine rather than instead of it.
export type DirectedLaneLine = LaneLine & { dir: 'vi2ja' | 'ja2vi' };

export interface OnlineLaneConfig {
  // The shared LaneController.start() signature (the treaty) carries no device/gate options,
  // so the host page supplies them here; all are read live at the relevant moment.
  getDeviceId?: () => string | undefined;
  getNearMicGate?: () => boolean;
  getSpeakEnabled?: () => boolean; // Phase 3: speak refined translations via TTS
  // TASK 6.2: one mic, two directions — read ONCE at start() and latched for the whole session.
  getTwoWay?: () => boolean;
  onDirectedLine?: (line: DirectedLaneLine) => void;
  // TASK 11.13: hall-babble rejection — read at TICKET time (baked into the single-use asrWsUrl).
  getRoomFilter?: () => boolean;
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
  silentReconnects: number;
  ttsQueueLength: number;
  gateActive: boolean;
  gatedMs: number;
  latency: LatencyReport;
  lastUsageReportAt: number | null;
  lastSaveAt: number | null;
  lastSaveDownloaded: boolean;
  lastSaveOk: boolean; // TASK 12.3 — false when the last save failed (even if nothing downloaded)
  sendBacklogBytes: number; // TASK 12.5 — the WS send buffer at the last audio frame
}

// Concrete online controller = the treaty + a diagnostics readout + a manual transcript save.
// This does NOT change src/lib/lanes/types.ts — the treaty stays untouched.
export type OnlineLaneController = LaneController & {
  getDiagnostics(): OnlineDiagnostics;
  saveSession(): Promise<SaveOutcome>;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createOnlineLane(events: LaneEvents, config: OnlineLaneConfig = {}): OnlineLaneController {
  let running = false;
  let sessionReady = false; // session.created received → safe to stream audio
  let ws: WebSocket | null = null;
  let capture: CaptureHandle | null = null;
  let capturingInFlight = false; // a getUserMedia is pending (capture is assigned only after it resolves)
  let opts: StartOpts | null = null;

  // TASK 6.2: one mic, two directions. `twoWay` is latched at start(); the tracker + per-lid settled
  // direction keep an utterance from ever changing direction after it finalises.
  let twoWay = false;
  let tracker: DirectionTracker | null = null;
  const settledDir = new Map<string, 'vi2ja' | 'ja2vi'>();

  // TASK 11: direct-dial transport. `codec` is set on a direct dial (JSON wire), null on the qwen3 proxy
  // (raw binary). Because the token is single-use, EVERY dial mints a fresh one; the dial counter drops a
  // token that resolves after Dừng or a restart. `lastFinalForReconnect` seeds previous_text on reconnect.
  let codec: AsrCodec | null = null;
  let dialCounter = 0;
  let lastFinalForReconnect = '';

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
  const pendingRefineTimers = new Map<string, { timer: ReturnType<typeof setTimeout>; run: () => Promise<void> }>();
  let latestEmotion: string | undefined;
  // per-segment pace timing
  let segmentFirstPartialAt = 0;
  let lastPartialAt = 0;
  let segmentSilentGapsMs = 0;

  // diagnostics counters
  let draftCalls = 0;
  const draftSkipped = { duplicate: 0, 'rate-limit': 0, 'in-flight': 0 };
  let refineCalls = 0;
  let refineRetries = 0;

  // M7 half-duplex gate state
  let ttsGateMode: TtsGateMode = 'auto';
  let ttsSpeaking = false;
  let gateActive = false;
  let gateExtraTimer: ReturnType<typeof setTimeout> | null = null;
  let gatedMs = 0;
  let unsubscribeSpeaking: (() => void) | null = null;

  // M8 session-ops state
  const latency = createLatencyTracker((r) => {
    // eslint-disable-next-line no-console
    console.info(`[onlineLane][latency] ${JSON.stringify(r)}`);
  });
  const sessionLines = new Map<string, SessionLine>();
  let sessionStartedAt = 0;
  let sessionStartedISO = '';
  let sessionLinesVersion = 0;
  let lastSavedVersion = -1;
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  let usageReportTimer: ReturnType<typeof setInterval> | null = null;
  let lastSaveAt: number | null = null;
  let lastSaveDownloaded = false;
  let lastSaveOk = true; // TASK 12.3: false once a save (auto or manual) fails — surfaced in diagnostics
  let sendBacklogBytes = 0; // TASK 12.5: the browser's WS send buffer at the last audio frame
  let lastBacklogToastAt = 0; // TASK 12.5: throttle the backlog-reconnect toast (reviewer B4)
  let lastUsageReportAt: number | null = null;
  let finals = 0; // finalized sentences (usage report)
  let ttsSentences = 0; // TTS sentences enqueued (usage report)
  let reconnectsTotal = 0; // cumulative reconnect attempts (usage report)
  let silentReconnects = 0; // silence-driven reconnects that did NOT show an error toast (TASK 3)

  const setStatus = (s: LaneStatus, detail?: string) => events.onStatus(s, detail);

  // Resolve source/target language + direction for an utterance. One-way → the latched opts. Two-way →
  // the tracker decides: GUESSED for interim text (no state change), SETTLED at finalisation and never
  // changed again (a sentence must not jump audience windows after it is finalised).
  function dirLangs(lid: string, sourceText: string, interim: boolean): { source: Lang; target: Lang; dir: 'vi2ja' | 'ja2vi' } {
    if (!twoWay || !tracker) {
      const source: Lang = opts?.sourceLanguage ?? 'vi';
      return { source, target: source === 'vi' ? 'ja' : 'vi', dir: directionOf(source) };
    }
    const settled = settledDir.get(lid);
    let source: Lang;
    if (settled) source = settled === 'vi2ja' ? 'vi' : 'ja';
    else if (interim) source = classifyUtterance(sourceText, tracker.current()).language;
    else { source = tracker.next(sourceText).language; settledDir.set(lid, directionOf(source)); }
    return { source, target: source === 'vi' ? 'ja' : 'vi', dir: directionOf(source) };
  }

  const emitLine = (line: Omit<LaneLine, 'at'>) => {
    const full: LaneLine = { ...line, at: Date.now() };
    events.onLine(full);
    if (config.onDirectedLine) config.onDirectedLine({ ...full, dir: dirLangs(full.lid, full.sourceText, full.interim).dir });
  };

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

  // Recompute the half-duplex gate from the TTS speaking state + the chosen mode.
  function updateGate(): void {
    if (ttsGateMode === 'off') {
      gateActive = false;
      if (gateExtraTimer) {
        clearTimeout(gateExtraTimer);
        gateExtraTimer = null;
      }
      return;
    }
    if (ttsSpeaking) {
      gateActive = true;
      if (gateExtraTimer) {
        clearTimeout(gateExtraTimer);
        gateExtraTimer = null;
      }
      return;
    }
    // Speaking ended. 'auto' relies on the TTS module's 450ms tail; 'always' holds the gate
    // an extra 1200ms to cover a voice looped back through an online meeting (RTT + far-end delay).
    if (ttsGateMode === 'always') {
      if (gateActive && !gateExtraTimer) {
        gateExtraTimer = setTimeout(() => {
          gateExtraTimer = null;
          gateActive = false;
        }, TTS_GATE_NETWORK_TAIL_MS);
      }
    } else {
      gateActive = false;
    }
  }

  // ---- M8: session operations (transcript save + usage report) ----

  function recordSessionLine(lid: string, at: number, sourceText: string, targetText: string): void {
    const o = opts;
    if (!o) return;
    sessionLines.set(lid, { lid, at, sourceText, targetText, sourceLanguage: o.sourceLanguage, targetLanguage: o.targetLanguage });
    sessionLinesVersion += 1;
  }

  function collectSessionLines(): SessionLine[] {
    return Array.from(sessionLines.values()).sort((a, b) => a.at - b.at);
  }

  // TASK 12.3: `allowDownload` is true for operator-driven saves (manual button, save on Dừng) where
  // a local download is the right safety net, and false for the 30s auto-save tick — a failing server
  // must not turn into a download every thirty seconds on the projected screen.
  async function doSave(allowDownload: boolean): Promise<SaveOutcome> {
    const o = opts;
    const gen = sessionGen;
    const versionAtSave = sessionLinesVersion;
    const exp = buildSessionExport(collectSessionLines(), {
      startedAt: sessionStartedAt || Date.now(),
      endedAt: Date.now(),
      sourceLanguage: o?.sourceLanguage ?? 'vi',
      targetLanguage: o?.targetLanguage ?? 'ja',
    });
    const outcome = await saveSessionExport(exp, allowDownload);
    // A save from a prior session must not stamp the new session's save-state (rare stop→start race).
    if (gen === sessionGen) {
      lastSaveAt = Date.now();
      lastSaveDownloaded = outcome.downloaded;
      lastSaveOk = outcome.saved; // false if the server rejected — diagnostics show it even when nothing downloaded
      lastSavedVersion = versionAtSave;
    }
    return outcome;
  }

  async function sendUsageReport(): Promise<void> {
    try {
      await fetch(`${ONLINE_BASE}/usage-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lane: 'online',
          sessionStartedAt: sessionStartedISO,
          finals,
          draftCalls,
          draftSkipped: { ...draftSkipped },
          refineCalls,
          refineRetries,
          ttsSentences,
          reconnects: reconnectsTotal,
          droppedGhosts,
        }),
      });
      lastUsageReportAt = Date.now();
    } catch {
      /* usage reporting is best-effort */
    }
  }

  // Fire a final transcript save + usage report (synchronous build, fire-and-forget POST).
  function finalizeSession(): void {
    if (sessionLines.size > 0) void doSave(true); // save on Dừng: a download is the right safety net (12.3)
    void sendUsageReport();
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

  // TASK 11.2: wsUrl()/fetchToken() are gone — one `openWs()` mints a fresh single-use session on EVERY
  // dial (including every reconnect) via asrTransport and opens the finished address. See below.

  async function ensureCapture(): Promise<void> {
    // `capture` is assigned only AFTER getUserMedia resolves, so a second session.created (e.g. a
    // reconnect) during that await would open a SECOND mic and orphan the first. The in-flight
    // sentinel + the gen check below make ensureCapture single-flight and session-scoped.
    if (capture || capturingInFlight) return;
    capturingInFlight = true;
    const gen = sessionGen;
    try {
      const handle = await startPcm16Capture(
        config.getDeviceId?.(),
        (packet: CapturePacket) => {
          let pcm = packet.pcm;
          let voicedMs = packet.voicedMs;
          if (gateActive) {
            // Half-duplex: while the app's own voice is audible, replace outgoing frames with
            // equal-length silence (preserve server-VAD timing) so TTS never loops into the ASR.
            gatedMs += packet.pcm.byteLength / 2 / 16; // samples / 16 = ms @16kHz
            pcm = new ArrayBuffer(packet.pcm.byteLength);
            voicedMs = 0;
          }
          voicedWindow.push({ at: Date.now(), voicedMs });
          pruneVoiced();
          // Only send audio while the WS is OPEN and the upstream session is ready. Audio produced while
          // not OPEN is discarded here — no unbounded buffering. Direct transport → JSON frame via codec;
          // proxy → raw binary as before (11.2).
          if (ws && ws.readyState === WebSocket.OPEN && sessionReady) {
            // TASK 12.5: watch the browser's own send buffer. On a weak uplink ws.send() queues silently
            // and the subtitle drifts while the UI still says "connected" — the single most confusing
            // failure there is. Surface the backlog (diagnostics), and past a larger threshold treat the
            // connection as unusable and reconnect. NEVER drop audio to keep up: a hole mid-sentence is
            // worse than a late sentence, so we still send below the reconnect threshold.
            const backlog = ws.bufferedAmount;
            // Only surface a backlog worth acting on (≥ WARN ≈ 8s of audio); below that it is noise.
            sendBacklogBytes = backlog >= SEND_BACKLOG_WARN_BYTES ? backlog : 0;
            if (backlog > SEND_BACKLOG_RECONNECT_BYTES) {
              // Reconnect, but THROTTLE the operator-facing toast: a persistently weak uplink would
              // otherwise flash a red toast every ~24s for the whole ceremony (a healthy reconnect resets
              // the attempt count, so it never latches). The always-visible diagnostics backlog row keeps
              // telling the truth in between — so a throttled toast loses no information.
              const now = Date.now();
              const quiet = now - lastBacklogToastAt < BACKLOG_TOAST_THROTTLE_MS;
              if (!quiet) lastBacklogToastAt = now;
              forceReconnect('send backlog too high (uplink cannot keep up)', quiet);
            } else {
              ws.send(codec ? codec.encodeAudio(pcm) : pcm);
            }
          }
        },
        (v: number) => {
          events.onLevel(v);
          if (v >= AUDIO_LOUD_LEVEL_THRESHOLD) lastLoudAt = Date.now();
        },
        { nearMicGate: config.getNearMicGate?.() ?? true },
      );
      // stop()/restart may have fired, or a duplicate capture may have won, while the mic-permission
      // prompt was open — never leave a hot mic, a stale-session mic, or a second mic.
      if (!running || gen !== sessionGen || capture) {
        handle.stop();
        return;
      }
      capture = handle;
    } catch (err) {
      const m = `microphone error: ${err instanceof Error ? err.message : String(err)}`;
      teardown();
      setStatus('error', m);
      events.onError(m);
    } finally {
      // Only clear the shared in-flight flag for the CURRENT session. A stale invocation whose
      // getUserMedia resolves AFTER a fast stop→start must not clobber the new session's guard —
      // otherwise a second session.created could slip a SECOND mic open (reviewer B, TASK 11.3 race).
      if (gen === sessionGen) capturingInFlight = false;
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
    const dl = dirLangs(lid, sentSource, true); // interim → guessed direction
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
          sourceLanguage: dl.source,
          targetLanguage: dl.target,
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
      latency.markDraftShown(lid, performance.now());
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
    latency.markFirstPartial(segmentLid, performance.now());
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
    const finalizedAt = Date.now();
    finals += 1;
    latency.markFinal(lid, performance.now());

    // Source pace over the actual speaking window (minus silent gaps, plus the ASR lead).
    const rawDurationMs = segmentFirstPartialAt ? finalizedAt - segmentFirstPartialAt : 0;
    const durationMs = rawDurationMs > 0 ? Math.max(0, rawDurationMs - segmentSilentGapsMs) + FIRST_PARTIAL_LEAD_MS : 0;
    const sourcePace = estimateSourceSpeechPace(head, durationMs)?.label;

    // recentFinals order is captured at flush time (deterministic), not at refine time.
    const priorFinals = recentFinals.slice(-RECENT_FINALS_MAX);
    recentFinals.push(head);
    if (recentFinals.length > RECENT_FINALS_MAX) {
      recentFinals.splice(0, recentFinals.length - RECENT_FINALS_MAX);
    }

    // Finalize the SOURCE line; keep the draft translation (dim) until refine returns.
    // On a >120 cut, the whole-line draft over-covers the head (it also translated the remainder),
    // so don't reuse it as the head's provisional target — refine fills the head-only version.
    const draftFallback = remainder ? '' : lastInterimTarget;
    emitLine({ lid, sourceText: head, targetText: draftFallback, interim: false, corrected: false });
    lastFinalForReconnect = head; // seeds previous_text if the socket drops and we re-dial (11.5)
    // Record NOW (provisional draft translation) so a Stop before refine resolves still keeps the
    // sentence in the transcript deliverable; refine upgrades this same lid in place when it returns.
    recordSessionLine(lid, finalizedAt, head, draftFallback);
    scheduleRefine(lid, head, priorFinals, sourcePace, draftFallback, finalizedAt);

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

  function scheduleRefine(lid: string, head: string, priorFinals: string[], sourcePace: string | undefined, draftFallback: string, finalizedAt: number): void {
    const idleDelay = endsWithStrongSentenceBreak(head, true) ? PUNCTUATION_REFINE_IDLE_MS : REFINE_IDLE_MS;
    const existing = pendingRefineTimers.get(lid);
    if (existing) clearTimeout(existing.timer);
    // Store the invocation as a thunk so stop() (11.4) can fire the last pending refine immediately and
    // await it before teardown, instead of losing it to teardown's timer-clear.
    const run = () => refine(lid, head, priorFinals, sourcePace, draftFallback, finalizedAt);
    const timer = setTimeout(() => { pendingRefineTimers.delete(lid); void run(); }, idleDelay);
    pendingRefineTimers.set(lid, { timer, run });
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

  async function refine(lid: string, head: string, priorFinals: string[], sourcePace: string | undefined, draftFallback: string, finalizedAt: number): Promise<void> {
    const o = opts!;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    const gen = sessionGen;
    const body = JSON.stringify({
      sourceText: head,
      sourceLanguage: dl.source,
      targetLanguage: dl.target,
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
      // Always display the server's returned (ASR-corrected) sourceText, not the raw transcript.
      const finalSource = data.sourceText ?? head;
      const finalTarget = data.translatedText ?? draftFallback;
      emitLine({ lid, sourceText: finalSource, targetText: finalTarget, interim: false, corrected: true });
      latency.markRefineShown(lid, performance.now());
      recordSessionLine(lid, finalizedAt, finalSource, finalTarget); // M8 transcript
      // Phase 3: speak the refined translation (targetLanguage voice) on the selected device.
      if (config.getSpeakEnabled?.()) {
        const speakText = data.ttsText || data.translatedText || '';
        if (speakText) {
          enqueueTtsSentence(speakText, dl.target, data.emotion, data.ttsSpeed, lid);
          ttsSentences += 1;
        }
      }
    } else {
      // Session must survive: keep the finalized source line with its draft translation.
      emitLine({ lid, sourceText: head, targetText: draftFallback, interim: false, corrected: false });
      recordSessionLine(lid, finalizedAt, head, draftFallback); // M8 transcript (refine failed)
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

  async function openWs(initial: boolean): Promise<void> {
    lastEventAt = Date.now(); // give the fresh connection a full stall window before its first event
    const gen = sessionGen;
    const dial = ++dialCounter;
    let session;
    try {
      session = await fetchAsrSession({
        targetLanguage: opts!.targetLanguage,
        language: twoWay ? 'auto' : opts!.sourceLanguage,
        corpus: (opts!.terms ?? '').slice(0, CORPUS_MAX_CHARS),
        roomFilter: config.getRoomFilter?.(),
      });
    } catch (err) {
      // A token that arrives after Dừng or a restart is dropped, not surfaced.
      if (gen !== sessionGen || dial !== dialCounter || !running) return;
      if (initial) { // the very first dial failing is fatal — the operator must know
        const m = err instanceof Error ? err.message : String(err);
        teardown(); setStatus('error', m); events.onError(m);
        return;
      }
      scheduleReconnect(); // a reconnect dial failing → let the backoff ladder retry
      return;
    }
    // The awaited fetch is guarded by the session generation AND the dial counter: a single-use token
    // that resolves after Dừng/restart is dropped instead of opening a stray socket.
    if (gen !== sessionGen || dial !== dialCounter || !running) return;

    // previous_text rides the FIRST chunk on a RECONNECT only (never a fresh session); a partial is never
    // fed back (a mistake fed back propagates).
    codec = session.transport === 'direct' ? createAsrCodec(initial ? undefined : (lastFinalForReconnect || undefined)) : null;
    // TASK 12.6: on the proxied (qwen3) path the session terms travel as the FIRST WS message, not in the
    // URL query string (query strings land in access logs and hit proxy length limits). On the direct
    // path terms are keyterms in the vendor's own handshake — not ours to move. `codec === null` ⇒ proxy.
    const proxyTerms = codec ? null : (opts?.terms ?? '').slice(0, CORPUS_MAX_CHARS);

    const socket = new WebSocket(session.url);
    socket.binaryType = 'arraybuffer';
    ws = socket;

    socket.onopen = () => {
      if (proxyTerms !== null) {
        try { socket.send(JSON.stringify({ type: 'session.terms', corpus: proxyTerms })); } catch { /* ignore */ }
      }
      setStatus('ready');
    };
    socket.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return; // JSON text frames only (both transports)
      if (codec) {
        const decoded = codec.decode(ev.data);
        if (!decoded) return;
        lastEventAt = Date.now();
        if (decoded.fatal) {
          const message = decoded.event.type === 'error' ? decoded.event.error.message : 'ASR fatal error';
          teardown(); setStatus('error', message); events.onError(`online lane: ${message}`);
          return;
        }
        handleEvent(decoded.event as unknown as Record<string, unknown>);
        return;
      }
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(ev.data) as Record<string, unknown>; } catch { return; }
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
    reconnectsTotal += 1; // cumulative (usage report)
    setStatus('reconnecting', `attempt ${reconnectAttempts}/${RECONNECT_MAX_ATTEMPTS}`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (running) void openWs(false);
    }, delayMs);
  }

  function forceReconnect(reason: string, silent: boolean): void {
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
    if (silent) {
      // Genuine long pause (no recent voice): reconnect quietly — don't alarm the operator on stage.
      silentReconnects += 1;
      // eslint-disable-next-line no-console
      console.info(`[onlineLane] silent reconnect (${reason})`);
    } else {
      events.onError(`online lane stalled (${reason}) → reconnecting`);
    }
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
        // 45s with no events: if there was also no recent voice, it's a genuine pause → be quiet.
        forceReconnect('45s no events', pruneVoiced() < 1);
      } else if (lastLoudAt > lastEventAt && sinceEvent > STALL_LOUD_RECONNECT_MS) {
        forceReconnect('35s no events with sound present', false);
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
    dialCounter += 1; // a token/socket resolving after teardown is now stale (11.2)
    codec = null;
    sessionReady = false;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopWatchdog();
    clearSegmentTimer();
    resetDraftState();
    for (const t of pendingRefineTimers.values()) clearTimeout(t.timer);
    pendingRefineTimers.clear();
    // Phase 3: stop playing our own voice + release the speaking subscription + open the gate.
    if (unsubscribeSpeaking) {
      unsubscribeSpeaking();
      unsubscribeSpeaking = null;
    }
    if (gateExtraTimer) {
      clearTimeout(gateExtraTimer);
      gateExtraTimer = null;
    }
    stopTtsPlayback();
    ttsSpeaking = false;
    gateActive = false;
    // Phase 4: stop the session-ops timers + release the playback-start hook.
    setTtsPlaybackStartHandler(() => undefined);
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
    if (usageReportTimer) {
      clearInterval(usageReportTimer);
      usageReportTimer = null;
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
    capturingInFlight = false; // unblock a fresh session's ensureCapture (a pending getUserMedia's
    // own gen check will stop its now-stale handle when it resolves).
    segmentBuffer = '';
    segmentLid = null;
    currentInterimSource = '';
    voicedWindow.length = 0;
    inFlightDraftSources.clear();
    segmentFirstPartialAt = 0;
    lastPartialAt = 0;
    segmentSilentGapsMs = 0;
    sendBacklogBytes = 0; // don't leave a stale high backlog in diagnostics after the ladder gives up (B3)
    events.onLevel(0);
  }

  async function start(startOpts: StartOpts): Promise<void> {
    if (running) return; // already running — ignore duplicate Start
    opts = startOpts;
    // TASK 6.2: latch the listening mode ONCE (flipping it mid-session only produces drift) and seed the
    // tracker with the technician's chosen source language for the first utterance.
    twoWay = config.getTwoWay?.() ?? false;
    tracker = createDirectionTracker(startOpts.sourceLanguage);
    settledDir.clear();
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
    for (const t of pendingRefineTimers.values()) clearTimeout(t.timer);
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
    // Phase 3 gate + TTS setup
    ttsGateMode = startOpts.ttsGate ?? 'auto';
    gatedMs = 0;
    gateActive = false;
    ttsSpeaking = false;
    if (gateExtraTimer) {
      clearTimeout(gateExtraTimer);
      gateExtraTimer = null;
    }
    resetTtsPlayback(); // clear any leftover queue + re-arm the one-shot warning
    unsubscribeSpeaking?.();
    unsubscribeSpeaking = subscribeTtsSpeaking((s) => {
      ttsSpeaking = s;
      updateGate();
    });
    // subscribeTtsSpeaking fires synchronously with the module's current value, which can be a
    // STALE `speaking=true` left by a just-stopped session's 450ms tail. No TTS has played in THIS
    // session yet, so force the gate open; this session's real speaking state will re-drive it.
    ttsSpeaking = false;
    updateGate();
    // Phase 4 session ops: reset counters/lines, (re)start the auto-save + usage-report timers.
    sessionLines.clear();
    sessionLinesVersion = 0;
    lastSavedVersion = -1;
    finals = 0;
    ttsSentences = 0;
    reconnectsTotal = 0;
    silentReconnects = 0;
    lastSaveAt = null;
    lastSaveDownloaded = false;
    lastSaveOk = true;
    sendBacklogBytes = 0;
    lastBacklogToastAt = 0;
    lastUsageReportAt = null;
    latency.reset();
    setTtsPlaybackStartHandler((subtitleId) => {
      if (subtitleId) latency.markTtsStart(subtitleId, performance.now());
    });
    const now = Date.now();
    sessionStartedAt = now;
    sessionStartedISO = new Date(now).toISOString();
    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(() => {
      // TASK 12.3: auto-save NEVER downloads on failure — a bad endpoint must not fire a download
      // every 30s onto the projected screen. The failure is recorded (lastSaveOk) and the next tick retries.
      if (sessionLinesVersion !== lastSavedVersion && sessionLines.size > 0) void doSave(false);
    }, AUTO_SAVE_INTERVAL_MS);
    if (usageReportTimer) clearInterval(usageReportTimer);
    usageReportTimer = setInterval(() => void sendUsageReport(), USAGE_REPORT_INTERVAL_MS);
    lastEventAt = now;
    lastLoudAt = now; // grace: don't ghost-drop the first transcripts before any loud frame
    setStatus('connecting');
    startWatchdog();
    // openWs mints the first single-use token via asrTransport and opens the socket; it surfaces its own
    // fatal error (and tears down) on the initial dial, so no separate preflight is needed.
    await openWs(true);
  }

  // TASK 11.4: fire any pending refine NOW and await it (bounded) so the last sentence gets its finished
  // translation on screen + in the transcript before teardown clears the refine queue. If the reply does
  // not arrive in time, keep the draft and carry on; a second Dừng bumps sessionGen and abandons the wait.
  async function awaitLastRefine(maxMs: number): Promise<void> {
    const runs: Promise<void>[] = [];
    for (const [lid, entry] of Array.from(pendingRefineTimers)) {
      clearTimeout(entry.timer);
      pendingRefineTimers.delete(lid);
      runs.push(entry.run());
    }
    if (!runs.length) return;
    await Promise.race([Promise.allSettled(runs).then(() => undefined), delay(maxMs)]);
  }

  async function stop(): Promise<void> {
    if (!running) { teardown(); setStatus('stopped'); return; }
    // The audio path stops on the FIRST press. Prevent any reconnect, release the mic, and send exactly
    // ONE commit as the last thing on the wire (the speaker often finishes a sentence and THEN the
    // operator presses stop); wait at most 700ms for the trailing final.
    running = false;
    capture?.stop();
    capture = null;
    if (codec && ws && ws.readyState === WebSocket.OPEN && sessionReady) {
      try { ws.send(codec.encodeCommit()); } catch { /* ignore */ }
      sessionReady = false; // nothing more on the wire after the commit
      await delay(STOP_COMMIT_WAIT_MS);
    }
    // Flush the FULL residual (loop: a >120-char buffer cuts head+remainder each pass, so this terminates).
    while (segmentBuffer.trim()) flushSegment();
    await awaitLastRefine(STOP_REFINE_WAIT_MS); // last line → finished translation before we checkpoint
    finalizeSession();
    teardown();
    setStatus('stopped');
  }

  async function saveSession(): Promise<SaveOutcome> {
    return doSave(true); // manual "Lưu transcript": download on failure is the right safety net (12.3)
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
      silentReconnects,
      ttsQueueLength: getTtsQueueLength(),
      gateActive,
      gatedMs: Math.round(gatedMs),
      latency: latency.getReport(),
      lastUsageReportAt,
      lastSaveAt,
      lastSaveDownloaded,
      lastSaveOk,
      sendBacklogBytes,
    };
  }

  return { id: 'online', start, stop, getDiagnostics, saveSession };
}
