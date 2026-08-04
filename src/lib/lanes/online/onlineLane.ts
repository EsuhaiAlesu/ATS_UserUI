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
import { startPcm16Capture, type CaptureHandle, type CapturePacket, type MicSensitivity } from './pcm16Capture';
import { resolveLoudThreshold, type LoudGateMode } from './loudGate';
import { endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak, segmentCharLimit } from './transcriptSegmentation';
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence, isInventedNumber, isNonSpeechAnnotation } from './asrSpeechEvidence';
import { isStableDraftPrefix, joinLiveDraftSource, stripPromotedPrefix } from './liveDraftTranslation';
import { DRAFT_RATE_WINDOW_MS, decideCaptureFrame, decideDraftAdmission, getContinuationWaitMs } from './livePipelinePolicy';
import { createSpeechPauseProfile } from './speechPauseProfile';
import { createSpeechShapeMonitor } from './speechShape';
import { checkTtsLanguage } from './ttsLanguageGuard';
import { createScriptMatcher, scriptKeyterms, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
import { applyMishearings, formatMishearingRules, splitMishearingLines, MISHEARING_MAX_CHARS, type MishearingRule } from './mishearing';
import { nextScribeForceCommitDelay, planStableScribeCommit, type ScribeManualCommitReason } from './scribeManualCommit';
import { estimateSourceSpeechPace } from './sourceSpeechPace';
import { enqueueTtsSentence, getTtsQueueLength, resetTtsPlayback, setTtsPlaybackStartHandler, stopTtsPlayback, subscribeTtsSpeaking } from './ttsPlayback';
import { buildSessionExport, saveSessionExport, type SaveOutcome, type SessionLine } from './sessionExport';
import { createLatencyTracker, type LatencyReport } from './latencyTracker';
import { classifyInterimUtterance, createDirectionTracker, decideFinalLanguage, directionOf, type DirectionTracker, type Lang } from './utteranceDirection';
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';
import { SPEECH_RHYTHM_DEFAULT, loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, speechRhythmLabel } from './speechRhythm';
import { refineReasonText } from './refineFailure';

const ONLINE_BASE = '/online-api';
const RECENT_FINALS_MAX = 6;
const CORPUS_MAX_CHARS = 2000; // contract: corpus ≤ 2000 chars
// The server keeps at most 30 keyterms (`pickScribeKeyterms`), so lifting more than 30 names out of the
// script can never reach the handshake. They are appended AFTER the operator's own glossary, so the
// glossary always wins the budget and the script fills what is left.
const SCRIPT_KEYTERM_LIMIT = 30;

// M2 — self-healing WS client (field-measured constants; do NOT tune)
const RECONNECT_MAX_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY_MS = 600; // exponential: 600, 1200, 2400, 4800, 5000 (capped)
const RECONNECT_MAX_DELAY_MS = 5_000;
const STALL_RECONNECT_MS = 45_000; // 45s with zero events -> upstream wedged -> reconnect
const STALL_LOUD_RECONNECT_MS = 35_000; // sound present but 35s with zero events -> reconnect earlier
// "Đủ to" — the level a VU frame must reach before it counts as "sound present". It used to be the hard
// 0.09 that lived on this line; the number itself has not moved (`LOUD_BASE_THRESHOLD` in `loudGate.ts`
// is still 0.09 and the close-mic step still resolves to exactly that), but it is now a knob rather than
// a constant: it follows "Độ nhạy micro" and the operator can override it live from the console. Why:
// the capture worklet's "there is a voice here" floor already followed the sensitivity while this one did
// not, so with a far microphone the same speech was voice AND silence at once, and every final was thrown
// away as `long-silence`.
const RECENT_LEVEL_PEAK_WINDOW_MS = 3_000; // how far back the diagnostics VU peak looks
const WATCHDOG_INTERVAL_MS = 5_000;

// M3 — sentence segmentation
const SEGMENT_MAX_CHARS = 120; // longer finalized text -> cut at the last strong break
const SEGMENT_MIN_CHARS = 18; // shorter fragments wait to merge with the next one
// M12 — the two hard ceilings on the continuation window (livePipelinePolicy). A buffer past either one
// is flushed even mid-thought: a late sentence is recoverable, a sentence that never appears is not.
const SEGMENT_MAX_HOLD_MS = 3_000; // how long finalised text may keep waiting for the rest of its thought
// M12 — how long an unfinished head stays available as "the first half" for the NEXT line. Long enough to
// cover the recogniser's 1.5s silence close plus a real thinking pause, short enough that a genuinely new
// thought is never translated as the continuation of something the speaker had already abandoned.
const FRAGMENT_LINK_MAX_GAP_MS = 10_000;

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

// M9 — script snap. A snapped line is ready the instant the sentence finalises, while a refined line
// takes 1–2s. If an EARLIER sentence is still at refine, speaking the snap straight away would put the
// two sentences on the loudspeaker in the wrong order. The subtitle still snaps at once (it is addressed
// by lid, so it cannot land out of order) — only the VOICE waits, and only this long: past that the
// earlier line has effectively failed and holding the hall in silence is worse than one inverted pair.
const SNAP_TTS_ORDER_WAIT_MS = 1_500;
const SNAP_TTS_ORDER_POLL_MS = 60;

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

// M12: why a buffer was closed. Only `ceiling` means "cut while the thought was still open and more may
// still be coming" — the others have all had their full chance to grow, which is what lets refine run on
// the short idle instead of adding its wait on top of the continuation window.
type FlushReason =
  | 'complete' // the buffer already reads as a finished sentence
  | 'waited' // the continuation window expired: nothing more of this thought arrived
  | 'ceiling' // character cap or hold cap hit mid-thought
  | 'turn-end' // the other language started, so this speaker's turn is over
  | 'stop'; // Dừng — drain whatever is left

// M12: everything refine needs to know about where this sentence sits inside the speaker's thought.
type ContinuationContext = {
  fragment: boolean;         // this head was closed by silence/a ceiling, not by the speaker
  previousFragment: string;  // the half this head resumes, '' when it starts a thought of its own
  alreadyWaited: boolean;    // it has sat out a full continuation window, so refine skips the long idle
};

export interface OnlineLaneConfig {
  // The shared LaneController.start() signature (the treaty) carries no device/gate options,
  // so the host page supplies them here; all are read live at the relevant moment.
  getDeviceId?: () => string | undefined;
  getNearMicGate?: () => boolean;
  // "Độ nhạy micro" — which voice floor the capture worklet treats as speech. Read ONCE at Bắt đầu
  // (it is baked into the worklet's configure message), so the console disables it while running.
  getMicSensitivity?: () => MicSensitivity;
  // "Ngưỡng đủ to" — read LIVE on every VU frame, unlike the sensitivity above. It is a knob the operator
  // turns WHILE listening ("phụ đề đứng im dù có người đang nói → hạ một nấc"), so making them stop and
  // restart the session to try the next step would defeat the point. Nothing is baked into the worklet.
  getLoudGate?: () => LoudGateMode;
  getSpeakEnabled?: () => boolean; // Phase 3: speak refined translations via TTS
  // M13 "Ngưng nghe" — read LIVE on every captured frame, because its whole purpose is to be flipped
  // mid-ceremony: the technician holds it down for a performance, a video or a musical number, and the
  // microphone goes silent on the wire until they release it. Never latched at start().
  getListenPaused?: () => boolean;
  // TASK 6.2: one mic, two directions — read ONCE at start() and latched for the whole session.
  getTwoWay?: () => boolean;
  onDirectedLine?: (line: DirectedLaneLine) => void;
  // TASK 11.13's hall-babble getter used to sit here. Removed: the vendor rejects that filter whenever
  // timestamps are on, and the session then fails to start at all. Do not add it back without checking
  // docs/ONLINE-LANE-UI-API.md → "Removed from the UI: the hall-babble switch".
  // M9: the approved event script (Chuẩn bị → Kịch bản). It rides here, NOT in start(): the treaty in
  // src/lib/lanes/types.ts is shared with the offline lane and only changes by explicit decision, while
  // this config object is the sanctioned home for lane-private options (same as the device/gate getters
  // above). Read ONCE at start() and latched for the session, like getTwoWay — a script edited under a
  // running ceremony would move the cursor mid-sentence. Rows in either direction are fine: the matcher
  // only considers rows whose source language is the one actually being spoken.
  getScript?: () => readonly ScriptMatcherEntry[] | undefined;
  // TASK 14: which meeting the saved transcript belongs to. Read ONCE at start(), like the script.
  getEventId?: () => string | undefined;
  // TASK 5: the misheard-substitution layer, read LIVE on every event — deliberately NOT latched at
  // start() the way the script above is. This is the one thing the operator has to be able to fix while
  // the ceremony is running: hearing the machine say the company's name wrong and having to stop the
  // session to correct it is not an option on the day.
  getMishearing?: () => string;
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
  // M13 — "Ngưng nghe". `listenPaused` is the only way to tell a deliberately deaf microphone from a
  // broken one, and `pausedMs` says how much of the ceremony was spent that way (a technician who forgets
  // to release it is the one failure this feature can cause, so it must be visible at a glance).
  listenPaused: boolean;
  pausedMs: number;
  // M13 — finished sentences discarded because the sound behind them had the shape of music, applause or a
  // hum rather than of a voice. Zero all evening means the guard never fired; a number that climbs during
  // a musical number means it is doing exactly its job.
  nonSpeechDrops: number;
  lastNonSpeechReason: string;
  latency: LatencyReport;
  lastUsageReportAt: number | null;
  lastSaveAt: number | null;
  lastSaveDownloaded: boolean;
  lastSaveOk: boolean; // TASK 12.3 — false when the last save failed (even if nothing downloaded)
  sendBacklogBytes: number; // TASK 12.5 — the WS send buffer at the last audio frame
  // "Đủ to". These two are a PAIR and only mean anything together: `loudThreshold` is the level a VU
  // frame must reach to count as sound, `recentLevelPeak` is the loudest frame of the last 3 seconds.
  // Peak below threshold while somebody is speaking = every final of this stretch will be thrown away as
  // `long-silence`, and lowering the knob one step is the fix. Neither number is actionable alone.
  loudThreshold: number;
  recentLevelPeak: number;
  // M9 — script matching. `scriptLines` is 0 when no script was loaded, which is the one state the
  // operator must be able to see before going live: everything else looks identical to a script that
  // simply never matches.
  scriptLines: number;
  scriptSnaps: number; // sentences answered by the approved line (refine skipped entirely)
  scriptSuggests: number; // close, but judged not safe enough to speak — translated as usual
  scriptPosition: number; // 1-based script line expected next; 1 until something is accepted
  lastScriptReason: string; // why the last finalised sentence did not snap — verbatim for the operator
  // M11 — turn handling and the two-way guards.
  manualCommits: number; // turns the CLIENT closed instead of waiting for the vendor's silence
  foreignDrops: number; // finals discarded because neither signal called them Vietnamese or Japanese
  languageTurns: number; // buffers closed because the other language started speaking
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
  asrLanguages: string | null; // what the recogniser AGREED to listen for; null = free auto-detect
  // The OTHER half of the same handshake reply: did the recogniser accept language detection? The
  // timestamped final's `language_code` is the evidence the two-way router runs on, and it only exists
  // when this is true. `null` = the vendor said nothing either way.
  asrLanguageDetection: boolean | null;
  // M13 — the sentence-cut threshold in force for the speaker at the microphone right now.
  // `pauseWindowMs` is what the last planned commit waited for (0 before the first one); `pauseSamples`
  // is how many of this speaker's pauses the profile has collected, and stays under 8 — the point where
  // it starts trusting itself — for a speaker who never pauses inside a sentence. `pauseAdaptive` says
  // where the number came from: true = measured off this speaker, false = a fixed number (the 600/800ms
  // guess, or the step the operator picked). `pauseRhythm` names that step, so an operator who wonders
  // why sentences cut where they do can read the answer instead of guessing.
  pauseWindowMs: number;
  pauseSamples: number;
  pauseAdaptive: boolean;
  pauseRhythm: string;
  // M13 — sentences displayed but NOT spoken, because the text was not in the target language.
  // `lastTtsSkipReason` is the guard's own words for the most recent one.
  ttsLanguageSkips: number;
  lastTtsSkipReason: string;
  // M12 — waiting for whole thoughts.
  continuationMerges: number; // fragments glued onto a thought that was already waiting
  fragmentRefines: number; // heads sent to refine without a closing punctuation mark
  fragmentLinks: number; // heads translated as the continuation of the half before them
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
  // The threshold ACTUALLY in force at the last VU frame, and the loudest VU frame of the last few
  // seconds. Both exist to be READ OUT in the console: without them, "lower it until it hears" is
  // guesswork in the dark — the operator has to be able to see that their voice peaks at, say, 0.03 while
  // the gate sits at 0.09. `loudThreshold` starts at the close-mic base so the value shown before the
  // first frame is the honest one.
  let loudThreshold = resolveLoudThreshold('auto', 'close');
  let recentLevels: { at: number; v: number }[] = [];

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
  // M12: when the FIRST finalised fragment entered the current buffer — the clock for SEGMENT_MAX_HOLD_MS.
  let segmentFirstFinalAt = 0;
  // M12: the unfinished head the NEXT line may be continuing, and when it was closed.
  let pendingFragmentTail = '';
  let pendingFragmentAt = 0;

  // M11 turn-handling state. `scribeLastPartial` is the vendor's UNCOMMITTED text for the current turn
  // (not segmentBuffer, which already holds committed sentences) — the commit planner must judge the turn
  // upstream is actually holding. `scribeCommitPending` stops a second commit going out while the first
  // has not been answered; it clears on the completed transcript, on commit_throttled, and on reconnect.
  let scribeLastPartial = '';
  let scribePartialChangedAt = 0;
  let scribeLastCommitAt = 0;
  let scribeCommitPending = false;
  let scribeCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let scribeForceCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let manualCommits = 0;
  let foreignDrops = 0;
  let languageTurns = 0;
  let vendorTags = 0;
  let asrLanguages: string | null = null;
  let asrLanguageDetection: boolean | null = null;
  // M13 — the cut threshold this speaker earns for themselves. The 600/800ms stability windows in
  // scribeManualCommit.ts are one guess for everybody; this measures the pauses the person at the
  // microphone is actually taking and hands the planner their own numbers. `lastVoicedAt` is the last
  // audio frame that carried voice, and the silence between two such frames is one pause. Keyed by the
  // language being spoken, because the microphone is shared: a fast Japanese guest must not set the
  // threshold for the slow Vietnamese MC. The key starts as the technician's chosen source language and
  // follows the recogniser from there.
  const pauseProfile = createSpeechPauseProfile();
  let lastVoicedAt = 0;
  let pauseKey: Lang = 'vi';
  // What the LAST planned commit actually waited for, and whether that number was learned or the
  // constant. The operator needs both: a window that never leaves 600ms means the profile is not
  // learning, and a window that has moved is the single visible proof that it is.
  let lastStableWindowMs = 0;
  let lastStableWindowAdaptive = false;
  // M13 — sentences whose VOICE was held back because the text was not in the target language (the
  // subtitle was still shown). A number that climbs during a ceremony means the model is handing back
  // English, and the operator should know it rather than wonder why some lines are silent.
  let ttsLanguageSkips = 0;
  let lastTtsSkipReason = '';

  // M13 — the hall's OWN sound, judged by shape rather than by loudness. The near-mic gate cannot tell
  // applause from a voice, so the ghost guards above (which only count "voiced ms") all agree that music
  // is somebody speaking. This monitor is the second opinion, and it only ever drops a finished sentence —
  // never a byte of audio. See speechShape.ts.
  const speechShape = createSpeechShapeMonitor();
  let nonSpeechDrops = 0;
  let lastNonSpeechReason = '';
  // M13 — "Ngưng nghe": the technician tells us a performance/video is running. While it is held the
  // microphone puts silence on the wire, so nothing at all can be transcribed out of the music.
  let pausedMs = 0;
  let continuationMerges = 0;
  let fragmentRefines = 0;
  let fragmentLinks = 0;

  // diagnostics counters
  let draftCalls = 0;
  const draftSkipped = { duplicate: 0, 'rate-limit': 0, 'in-flight': 0 };
  let refineCalls = 0;
  let refineRetries = 0;

  // M9 script-snap state. The matcher is built once per session from the script handed to start();
  // `flushSeq` + `outstandingRefine` exist only to keep the loudspeaker in speaking order (see
  // SNAP_TTS_ORDER_WAIT_MS): a line goes into the map when it is sent to refine and comes out when
  // refine settles, so a snap can tell whether anything said EARLIER is still unspoken.
  // TASK 5 — the misheard-substitution layer. Two sources feed it: the "Sửa nghe nhầm" box, read live
  // through the getter, and any `~` line the operator typed into Thuật ngữ out of habit. Re-parsed only
  // when the text actually changed, because this is called on every partial.
  let mishearingSeen: string | null = null; // null, never a string — so the first call always parses
  let mishearingRules: MishearingRule[] = [];
  function activeMishearings(): MishearingRule[] {
    const raw = `${config.getMishearing?.() ?? ''}\n${opts?.terms ?? ''}`.slice(0, MISHEARING_MAX_CHARS * 2);
    if (raw !== mishearingSeen) {
      mishearingSeen = raw;
      mishearingRules = splitMishearingLines(raw).rules;
    }
    return mishearingRules;
  }

  // TASK 5 + TASK 6 — the single answer to "what is the recogniser primed with", rebuilt at every dial so
  // a rule added mid-session reaches it at the next reconnect. Three sources, in this order:
  //   1. Thuật ngữ with every `~` line removed;
  //   2. the CORRECT side of every mishearing rule, and never the misheard side — priming the recogniser
  //      with "suhai" would train it toward the exact surface we are trying to get rid of;
  //   3. proper nouns lifted from the approved script (TASK 6 fills this; empty until then).
  let scriptKeytermCorpus = '';
  function buildAsrCorpus(): string {
    const plain = splitMishearingLines(opts?.terms ?? '').terms;
    const corrected = activeMishearings().map((rule) => rule.correct).join('\n');
    return [plain, corrected, scriptKeytermCorpus].filter(Boolean).join('\n').slice(0, CORPUS_MAX_CHARS);
  }

  let scriptMatcher: ScriptMatcher | null = null;
  let scriptRows = 0; // approved rows this session; the matcher's own `size` counts candidates, not lines
  let scriptSnaps = 0;
  let scriptSuggests = 0;
  let lastScriptReason = '';
  let flushSeq = 0;
  const outstandingRefine = new Map<string, number>();

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
  let sessionEventId = ''; // TASK 14 — latched at start(), written into every save of this session
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
    // M12: a draft INHERITS the direction the last finalised sentence settled on (tracker.current(), which
    // handleFinal realigns from the vendor's own tag) and only leaves it on unambiguous script evidence.
    else if (interim) source = classifyInterimUtterance(sourceText, tracker.current()).language;
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

  // The loudest VU frame of the last few seconds — the number the operator compares against the threshold
  // when deciding whether to lower the knob. Pruned on read (same shape as pruneVoiced), so a session
  // sitting idle in the diagnostics panel decays to 0 instead of showing a peak from ten minutes ago.
  function pruneRecentLevels(): number {
    const cutoff = Date.now() - RECENT_LEVEL_PEAK_WINDOW_MS;
    while (recentLevels.length && recentLevels[0].at < cutoff) recentLevels.shift();
    let peak = 0;
    for (const e of recentLevels) if (e.v > peak) peak = e.v;
    return peak;
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

  // TASK 14: the direction is read from `dirLangs`, which SETTLED it at finalisation and keyed it on this
  // lid — not from `opts`, whose single pair described only the direction the operator started in. Nothing
  // at the call sites has to change: the same lid gives the same answer however often it is asked, which
  // is exactly what the refine path already relies on.
  function recordSessionLine(lid: string, at: number, sourceText: string, targetText: string, fromScript = false): void {
    const o = opts;
    if (!o) return;
    const dl = dirLangs(lid, sourceText, false);
    sessionLines.set(lid, {
      lid, at, sourceText, targetText,
      sourceLanguage: dl.source,
      targetLanguage: dl.target,
      dir: dl.dir,
      ...(fromScript ? { fromScript: true } : {}),
    });
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
      eventId: sessionEventId || undefined,
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

  // M12: how fast the person speaking right now is actually speaking, for the continuation window. Same
  // window flushSegment uses for `sourcePace`: speaking time minus silent gaps, plus the recogniser lead.
  function currentSegmentUnitsPerSecond(text: string): number | undefined {
    if (!segmentFirstPartialAt) return undefined;
    const rawDurationMs = Date.now() - segmentFirstPartialAt;
    if (rawDurationMs <= 0) return undefined;
    const durationMs = Math.max(0, rawDurationMs - segmentSilentGapsMs) + FIRST_PARTIAL_LEAD_MS;
    return estimateSourceSpeechPace(text, durationMs)?.unitsPerSecond;
  }

  // Hold an unfinished buffer for one continuation window; the next final clears this timer and re-arms it.
  function armContinuationWait(text: string): void {
    segmentTimer = setTimeout(() => {
      segmentTimer = null;
      flushSegment('waited');
    }, getContinuationWaitMs({ text, sessionTerms: opts?.terms, unitsPerSecond: currentSegmentUnitsPerSecond(text) }));
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
          // One decision, one place (livePipelinePolicy.decideCaptureFrame): the half-duplex gate mutes
          // our own voice, "Ngưng nghe" mutes a performance, and a muted frame is equal-length silence —
          // never an absent frame, or the recogniser's 1.5s close would stop counting mid-sentence.
          const frame = decideCaptureFrame({ listenPaused: config.getListenPaused?.() ?? false, gateActive });
          const frameMs = packet.pcm.byteLength / 2 / 16; // samples / 16 = ms @16kHz
          if (frame.countPaused) pausedMs += frameMs;
          if (frame.countGated) gatedMs += frameMs;
          if (frame.observeShape) speechShape.observe(packet.pcm);
          if (frame.mute) {
            pcm = new ArrayBuffer(packet.pcm.byteLength);
            voicedMs = 0;
          }
          voicedWindow.push({ at: Date.now(), voicedMs });
          pruneVoiced();
          notePausePace(voicedMs);
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
          const now = Date.now();
          // Read the knob on EVERY frame: the operator turns it mid-session while watching the two
          // numbers this same callback feeds into the diagnostics (threshold in force vs VU peak).
          loudThreshold = resolveLoudThreshold(
            config.getLoudGate?.() ?? 'auto',
            config.getMicSensitivity?.() ?? 'auto',
          );
          recentLevels.push({ at: now, v });
          if (v >= loudThreshold) lastLoudAt = now;
        },
        { nearMicGate: config.getNearMicGate?.() ?? true, micSensitivity: config.getMicSensitivity?.() ?? 'auto' },
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

  // ---- M13: learn the speaker's own pauses ----

  // Called on every captured audio frame. Only silence taken MID-TURN teaches anything: the quiet before
  // somebody starts speaking, and the quiet after a turn was closed, is an empty room, and counting it
  // would drag every threshold to the ceiling. `scribeLastPartial` being non-empty is exactly the
  // condition "a turn is open right now", so it is the gate.
  //
  // A stretch of TTS needs no special case: the half-duplex gate zeroes `voicedMs` while the app's own
  // voice plays, so the gap spanning it is longer than PAUSE_GAP_MAX_MS and the profile discards it.
  function notePausePace(voicedMs: number): void {
    if (!(voicedMs > 0)) return;
    const now = Date.now();
    const previous = lastVoicedAt;
    lastVoicedAt = now;
    if (previous > 0 && scribeLastPartial) pauseProfile.observe(now - previous, pauseKey);
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

  // ---- M11: client-side sentence commit (the cure for long stalls) ----

  function clearScribeCommitTimer(): void {
    if (scribeCommitTimer) {
      clearTimeout(scribeCommitTimer);
      scribeCommitTimer = null;
    }
  }

  /** Ask upstream to close the current turn now. Returns false when there is nothing to close. */
  function sendManualCommit(reason: ScribeManualCommitReason): boolean {
    if (scribeCommitPending) return false;
    if (!codec || !ws || ws.readyState !== WebSocket.OPEN || !sessionReady) return false;
    if (!scribeLastPartial.trim()) return false;
    try {
      ws.send(codec.encodeCommit());
    } catch {
      return false; // the socket is going down; the reconnect path will re-arm everything
    }
    scribeCommitPending = true;
    scribeLastCommitAt = Date.now();
    manualCommits += 1;
    // eslint-disable-next-line no-console
    console.debug(`[onlineLane][commit] ${reason} len=${scribeLastPartial.trim().length}`);
    armForceCommit();
    return true;
  }

  // The hard ceiling. Nothing — not applause, not a speaker who never pauses — may hold the microphone
  // for more than SCRIBE_MANUAL_FORCE_COMMIT_MS. With nothing to commit, restart the window rather than
  // poll a quiet room every tick.
  function armForceCommit(): void {
    if (scribeForceCommitTimer) {
      clearTimeout(scribeForceCommitTimer);
      scribeForceCommitTimer = null;
    }
    const now = Date.now();
    if (!scribeLastCommitAt) scribeLastCommitAt = now;
    scribeForceCommitTimer = setTimeout(() => {
      scribeForceCommitTimer = null;
      if (!sendManualCommit('max-duration')) {
        scribeLastCommitAt = Date.now();
        armForceCommit();
      }
    }, nextScribeForceCommitDelay(scribeLastCommitAt, now));
  }

  // TASK 24: which two waits the planner should use for THIS partial, given the step the operator picked
  // in Cài đặt. Read live (not cached at start) so a technician can move the knob between two speakers
  // without restarting the session — the same rule the loud-gate knob follows.
  //
  // Three different intents, deliberately not collapsed:
  //   • Bình thường  → exactly what the lane did before this knob existed: the M13 learner, its own
  //                    1_100ms ceiling, planner constants until it has 8 pauses. Nobody who never opened
  //                    Cài đặt gets a changed session.
  //   • Chậm / Nhanh → the operator has stated the answer. Their numbers win outright and the learner is
  //                    ignored; a machine that quietly overrules an explicit choice is worse than one
  //                    that never adapts.
  //   • Tự học       → the learner with a wider ceiling, so a speaker who really does leave 1.6s between
  //                    clauses keeps 1.6s instead of being flattened to 1.1s. Until it has measured
  //                    enough, it runs at a middle stand-in (900/1_100ms) rather than at 600ms.
  function stableCommitWindows(): {
    windows: { sentenceMs: number; longMs: number } | null;
    /** true only when the number was MEASURED off this speaker — the diagnostics line says so. */
    learned: boolean;
  } {
    const rhythm = loadSpeechRhythm();
    if (rhythm === SPEECH_RHYTHM_DEFAULT) {
      const measured = pauseProfile.windows(pauseKey);
      return { windows: measured, learned: Boolean(measured) };
    }
    const rung = rhythmCommitWindows(rhythm);
    const fixed = { sentenceMs: rung.sentenceMs, longMs: rung.longMs };
    if (!rung.adaptive) return { windows: fixed, learned: false };
    const measured = pauseProfile.windows(pauseKey, rung.maxMs);
    return measured ? { windows: measured, learned: true } : { windows: fixed, learned: false };
  }

  // Drive the planner from the vendor's live partial. Called on every partial: the planner is cheap and
  // it is the CHANGE timestamp, not the arrival timestamp, that decides — a speaker holding a pause
  // keeps re-sending identical text, and that stillness is the signal.
  function scheduleStableCommit(partial: string): void {
    const text = partial.trim();
    if (text !== scribeLastPartial) {
      scribeLastPartial = text;
      scribePartialChangedAt = Date.now();
    }
    clearScribeCommitTimer();
    if (!text || scribeCommitPending) return;
    // M13 + the rhythm knob: this speaker's own measured windows, or the step the operator chose; null
    // means neither had an answer and the planner falls back to its constants.
    const chosen = stableCommitWindows();
    const plan = planStableScribeCommit(
      text,
      scribePartialChangedAt,
      scribeLastCommitAt,
      Date.now(),
      chosen.windows,
    );
    if (!plan) return; // no punctuation and not long yet — the VAD backstop still owns this turn
    lastStableWindowMs = plan.stableMs;
    // NOT `plan.adaptive`: the planner only knows it was handed numbers, not whether they were measured
    // off this speaker or picked by hand in Cài đặt.
    lastStableWindowAdaptive = chosen.learned;
    scribeCommitTimer = setTimeout(() => {
      scribeCommitTimer = null;
      sendManualCommit(plan.reason);
    }, plan.delayMs);
  }

  /** Forget the turn. Called when a final lands, on reconnect, and at start/teardown. */
  function resetScribeCommitState(rearm: boolean): void {
    clearScribeCommitTimer();
    scribeLastPartial = '';
    scribePartialChangedAt = 0;
    scribeCommitPending = false;
    if (rearm) {
      scribeLastCommitAt = Date.now();
      armForceCommit();
    } else {
      scribeLastCommitAt = 0;
      if (scribeForceCommitTimer) {
        clearTimeout(scribeForceCommitTimer);
        scribeForceCommitTimer = null;
      }
    }
  }

  // ---- events ----

  function handlePartial(msg: Record<string, unknown>): void {
    // TASK 5: correct on arrival. The operator's Nguồn column, the draft translation and the audience
    // wall all read from here, so the fix has to land before any of them sees the words.
    const rules = activeMishearings();
    const text = applyMishearings(typeof msg.text === 'string' ? msg.text : '', rules).text;
    const stash = applyMishearings(typeof msg.stash === 'string' ? msg.stash : '', rules).text;
    // M4: only display partials backed by clear speech evidence / recent sound.
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_PARTIAL_MIN_VOICED_MS)) return;
    if (Date.now() - lastLoudAt >= LONG_SILENCE_MS) return;
    // M13: loud is not the same as spoken. Keep the lyrics of the song playing in the hall off the
    // audience wall — where an interim line is the most visible thing in the room.
    if (!speechShape.verdict().speechLike) return;
    noteSpeechTiming();
    // M11: judge the turn upstream is still HOLDING — not segmentBuffer, whose earlier sentences are
    // already committed and would make every partial look finished.
    scheduleStableCommit((text + stash).trim());
    if (!segmentLid) segmentLid = `online-${++counter}`;
    latency.markFirstPartial(segmentLid, performance.now());
    currentInterimSource = joinSeg(segmentBuffer, (text + stash).trim());
    emitLine({ lid: segmentLid, sourceText: currentInterimSource, targetText: lastInterimTarget, interim: true, corrected: false });
    scheduleDraft();
  }

  function handleFinal(msg: Record<string, unknown>): void {
    // M11: the turn upstream was holding is closed, whatever closed it — clock a fresh window.
    resetScribeCommitState(true);
    // TASK 5: correct BEFORE every guard below. The repeat guard, the script matcher, the refine call,
    // the audience wall and the saved transcript must all see the same corrected string — otherwise the
    // name is fixed on screen and still wrong in the recording.
    const transcript = applyMishearings((typeof msg.transcript === 'string' ? msg.transcript : '').trim(), activeMishearings()).text;
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
    // M13: the guards above ask "was there sound?", and during a musical number the answer is yes, which
    // is how a song became a sentence that was translated and READ ALOUD. This one asks whether the sound
    // had the shape of a person speaking. It accuses only on unmistakable evidence (speechShape.ts), and
    // the whole cost of being wrong is this one line.
    const shape = speechShape.verdict();
    if (!shape.speechLike) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = shape.reason;
      dropGhost(`non-speech sound · ${shape.reason}`, transcript);
      return;
    }
    if (transcript.length >= REPEAT_GUARD_MIN_CHARS && transcript === previousFinalTranscript) {
      dropGhost('repeat', transcript);
      return;
    }
    // M11: the transcriber's own "I could not hear that" marker is not something anybody said.
    if (isNonSpeechAnnotation(transcript)) {
      dropGhost('non-speech annotation', transcript);
      return;
    }
    // TASK 22: the gates above all ask about the AUDIO, and on repeated filler ("anh, anh, anh") the
    // audio is real speech — the recogniser is what invents the digits. This one reads the words instead,
    // so "Anh 1000, anh 1000," and a bare "177。" stop reaching the hall. Counted with the other
    // non-speech drops so the technician can see it happening on the diagnostics line.
    if (isInventedNumber(transcript)) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = 'số ảo';
      dropGhost('invented number', transcript);
      return;
    }
    previousFinalTranscript = transcript;

    // M11: what language was this, really? The vendor tags every completed transcript (the session is
    // opened with include_language_detection) and until now nothing read it.
    const vendorLanguage = typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined;
    if (vendorLanguage) vendorTags += 1;
    const decided = decideFinalLanguage(transcript, vendorLanguage);
    if (decided.foreign) {
      // Neither our two languages by EITHER signal. In the ceremony logs this was Chinese and Italian
      // transcripts of Vietnamese speech, and the vendor's own "（聞き取り不能）" marker — all of which were
      // faithfully translated and read aloud to the hall. Better a missing sentence than a fictional one.
      foreignDrops += 1;
      dropGhost('foreign-language', transcript);
      return;
    }

    // M13: the recogniser has just named the language that was at the microphone. Point the pause profile
    // at that speaker's bucket, so the next turn is measured against pauses taken in the same language.
    if (decided.language) pauseKey = decided.language;

    // M11: one microphone, two languages. A final in the OTHER language must not be glued onto the
    // buffer: the whole buffer settles its direction ONCE, so "Xin chào quý vị" + "皆様こんにちは" becomes a
    // single Japanese line and the Vietnamese half is translated as if it were Japanese. Closing the
    // buffer at the turn also removes the wait — the previous speaker's tail no longer sits out the whole
    // continuation window waiting for a continuation that will never come, which is most of the pause the
    // operator sees whenever the two languages alternate.
    if (twoWay && decided.language && segmentBuffer.trim()) {
      const held = decideFinalLanguage(segmentBuffer).language;
      if (held && held !== decided.language) {
        languageTurns += 1;
        flushSegment('turn-end');
      }
    }

    // M3: append to the segment buffer; the finalized sentence is not yet its own line.
    const hadWaitingText = segmentBuffer.trim().length > 0;
    segmentBuffer = joinSeg(segmentBuffer, transcript);
    if (!segmentLid) segmentLid = `online-${++counter}`;
    // M11: settle the direction from the strongest evidence available rather than letting dirLangs guess
    // from the script at flush time. This is what finally routes toneless Vietnamese correctly — the
    // vendor heard it, we can only read it. The tracker is realigned too, so the next sticky fallback
    // (an "OK", a number) inherits the language actually being spoken.
    if (twoWay && tracker && decided.language && decided.basis !== 'none') {
      settledDir.set(segmentLid, directionOf(decided.language));
      tracker.reset(decided.language);
    }
    currentInterimSource = segmentBuffer;
    emitLine({ lid: segmentLid, sourceText: segmentBuffer, targetText: lastInterimTarget, interim: true, corrected: false });

    clearSegmentTimer();
    const buf = segmentBuffer.trim();
    if (!segmentFirstFinalAt) segmentFirstFinalAt = Date.now();
    // M12: a buffer that already READS as a finished sentence goes straight through. Everything else is
    // treated as half a thought and waits one continuation window — the "≥40 characters ⇒ translate it
    // now" rule that used to sit here is what put half-sentences on the loudspeaker. Two ceilings bound
    // the wait: the buffer is already a full line's worth, or it has been held long enough.
    //
    // TASK 23: both ceilings COUNT CHARACTERS, and a Vietnamese character carries less meaning than a
    // Japanese one (measured: 1.85×). With the fixed numbers Vietnamese hit the cut ceiling 40× as often
    // as Japanese, while Japanese was glued into whole thoughts and Vietnamese almost never was. So the
    // ruler now follows the language of the text it measures.
    const complete = endsWithStrongSentenceBreak(buf, true) && buf.length >= segmentCharLimit(SEGMENT_MIN_CHARS, buf);
    if (complete) {
      flushSegment('complete');
      return;
    }
    if (buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf) || Date.now() - segmentFirstFinalAt >= SEGMENT_MAX_HOLD_MS) {
      flushSegment('ceiling');
      return;
    }
    if (hadWaitingText) continuationMerges += 1; // this fragment was glued onto a thought already waiting
    armContinuationWait(buf);
  }

  function flushSegment(reason: FlushReason): void {
    clearSegmentTimer();
    const text = segmentBuffer.trim();
    if (!text) {
      segmentBuffer = '';
      segmentLid = null;
      currentInterimSource = '';
      segmentFirstFinalAt = 0;
      resetDraftState();
      return;
    }
    let head = text;
    let remainder = '';
    if (text.length > segmentCharLimit(SEGMENT_MAX_CHARS, text)) {
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
    // M12: was this head closed by the speaker, or by us? Anything not ending on strong punctuation was
    // closed by silence or by a ceiling, so refine is TOLD it is a fragment instead of being left to
    // invent a finished sentence around half a thought.
    const fragment = !endsWithStrongSentenceBreak(head, true);
    // M12: and is this head itself the SECOND half of the previous one? `recentFinals` already carries the
    // previous line, but only as neighbouring context — the model has no way to know it was cut mid-thought
    // and that this text resumes it. Naming it is what makes the two subtitles join up when read in a row.
    const previousFragment =
      pendingFragmentTail && finalizedAt - pendingFragmentAt <= FRAGMENT_LINK_MAX_GAP_MS ? pendingFragmentTail : '';
    // A turn-end hands the microphone to the other language, so whatever comes next belongs to a different
    // speaker and can never be the rest of this sentence.
    pendingFragmentTail = fragment && reason !== 'turn-end' ? head : '';
    pendingFragmentAt = finalizedAt;
    // M9: the approved script may answer this sentence outright — exact human wording, and no refine
    // round trip. Only when it refuses does the sentence take the normal draft → refine path.
    const order = ++flushSeq;
    if (!trySnapToScript(lid, head, finalizedAt, order)) {
      if (fragment) fragmentRefines += 1; // a snapped line came from the approved script — not a fragment
      if (previousFragment) fragmentLinks += 1;
      outstandingRefine.set(lid, order);
      scheduleRefine(lid, head, priorFinals, sourcePace, draftFallback, finalizedAt, {
        fragment,
        previousFragment,
        alreadyWaited: reason !== 'ceiling',
      });
    }

    // Reset per-segment draft + timing state (this segment is done).
    resetDraftState();
    segmentFirstPartialAt = 0;
    lastPartialAt = 0;
    segmentSilentGapsMs = 0;

    // Carry any post-cut remainder into a fresh interim line with its own continuation window.
    segmentBuffer = remainder;
    if (remainder) {
      segmentLid = `online-${++counter}`;
      currentInterimSource = remainder;
      segmentFirstFinalAt = Date.now(); // the remainder starts its own hold clock
      emitLine({ lid: segmentLid, sourceText: remainder, targetText: '', interim: true, corrected: false });
      armContinuationWait(remainder);
    } else {
      segmentLid = null;
      currentInterimSource = '';
      segmentFirstFinalAt = 0;
    }
  }

  // ---- M9: script snap ----

  // Answer a finalised sentence from the approved script when the match is beyond doubt; return true
  // when it did, so the caller skips refine.
  //
  // The source line keeps the words actually HEARD, not the script's own wording. If a snap ever lands
  // on the wrong line, whoever is watching the console sees source and translation disagree — replacing
  // the heard text with the script's would make a wrong snap look flawless on screen.
  function trySnapToScript(lid: string, head: string, finalizedAt: number, order: number): boolean {
    // A script whose every row is unusable (junk text, a language the matcher does not handle) builds
    // zero candidates. That is deliberately NOT short-circuited here: letting the matcher answer puts
    // its own "kịch bản trống" into the diagnostics line, where a script silently doing nothing would
    // otherwise look exactly like a script that simply never matches.
    if (!scriptMatcher) return false;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    let result: ScriptMatch;
    try {
      result = scriptMatcher.match(head, dl.source);
    } catch {
      return false; // a fault in the matcher must never cost the session a sentence
    }
    lastScriptReason = result.reason;
    if (result.band !== 'snap') {
      if (result.band === 'suggest') scriptSuggests += 1;
      return false;
    }
    // The matched row must translate INTO the language this utterance is being shown in: the same row
    // read from the other direction is a different sentence for this audience.
    if (result.targetLanguage !== dl.target) return false;
    const target = result.scriptTarget.trim();
    if (!target) return false;

    scriptMatcher.accept(result); // the script cursor advances only on a line actually used
    scriptSnaps += 1;
    emitLine({ lid, sourceText: head, targetText: target, interim: false, corrected: true });
    latency.markRefineShown(lid, performance.now()); // final quality reached, just without the round trip
    recordSessionLine(lid, finalizedAt, head, target, true); // answered by the approved script, word for word
    if (config.getSpeakEnabled?.()) void speakSnap(target, dl.target, lid, order);
    // eslint-disable-next-line no-console
    console.info(`[onlineLane][script] snap lid=${lid} score=${result.score} line=${result.index + 1}/${scriptRows}`);
    return true;
  }

  // Hold a snap's VOICE — never its subtitle — until every sentence spoken before it has left refine,
  // so the hall hears the sentences in the order they were said. Bounded: see SNAP_TTS_ORDER_WAIT_MS.
  async function speakSnap(text: string, language: Lang, lid: string, order: number): Promise<void> {
    const gen = sessionGen;
    const deadline = Date.now() + SNAP_TTS_ORDER_WAIT_MS;
    while (Date.now() < deadline) {
      let earlier = false;
      for (const pending of outstandingRefine.values()) {
        if (pending < order) { earlier = true; break; }
      }
      if (!earlier) break;
      await delay(SNAP_TTS_ORDER_POLL_MS);
      if (gen !== sessionGen) return; // stopped or restarted while waiting — this line is history
    }
    if (gen !== sessionGen) return;
    enqueueTtsSentence(text, language, undefined, undefined, lid);
    ttsSentences += 1;
  }

  // ---- M6: refine tier ----

  function scheduleRefine(lid: string, head: string, priorFinals: string[], sourcePace: string | undefined, draftFallback: string, finalizedAt: number, cont: ContinuationContext): void {
    // M12: the long idle exists to let a late revision settle. A head that ends on strong punctuation
    // never needed it, and a head that has ALREADY sat out a full continuation window has had exactly
    // that chance — so only a ceiling cut (more of this thought may still be arriving) keeps the 950ms.
    // Without this, the completeness gate would stack its wait on top of the refine wait.
    const idleDelay = !cont.fragment || cont.alreadyWaited ? PUNCTUATION_REFINE_IDLE_MS : REFINE_IDLE_MS;
    const existing = pendingRefineTimers.get(lid);
    if (existing) clearTimeout(existing.timer);
    // Store the invocation as a thunk so stop() (11.4) can fire the last pending refine immediately and
    // await it before teardown, instead of losing it to teardown's timer-clear.
    const run = () => refine(lid, head, priorFinals, sourcePace, draftFallback, finalizedAt, cont);
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
      if (!res.ok) {
        // TASK 16: the server names the cause in a code that identifies nothing. Read it before giving
        // up — "refine HTTP 502" was a message nobody could act on.
        let reason = '';
        try { reason = String(((await res.json()) as { reason?: unknown }).reason ?? ''); } catch { /* no body */ }
        return { ok: false, retriable: res.status >= 500, message: reason ? refineReasonText(reason) : `refine HTTP ${res.status}` };
      }
      const data = (await res.json()) as Record<string, unknown>;
      return { ok: true, data };
    } catch (err) {
      return { ok: false, retriable: true, message: err instanceof Error ? err.message : String(err) };
    }
  }

  async function refine(lid: string, head: string, priorFinals: string[], sourcePace: string | undefined, draftFallback: string, finalizedAt: number, cont: ContinuationContext): Promise<void> {
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
      // TASK 5: `~` lines never travel as terms — a misheard surface sitting in the term list reads to
      // the model as vocabulary the speaker is expected to use, which is the opposite of what it is. They
      // travel as their own field, where they become a correction instruction. `head` has already been
      // corrected by the plain replace above; this is the model's backstop for the inflected or partial
      // surfaces a string replace cannot catch.
      sessionTerms: splitMishearingLines(o.terms ?? '').terms,
      sessionMishearings: formatMishearingRules(activeMishearings()),
      sourcePace,
      sourceEmotion: latestEmotion,
      sourceIsFragment: cont.fragment,
      previousFragment: cont.previousFragment || undefined,
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
    // M9: this sentence is no longer waiting on refine, so a later snap is free to speak. The delete
    // MUST stay in the same synchronous run as the enqueueTtsSentence below — a snap released here and
    // queued before this line's own voice is exactly the inversion the wait exists to prevent.
    outstandingRefine.delete(lid);
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
          // M13: never hand the voice a language it cannot pronounce. The subtitle above has ALREADY been
          // shown and saved — only the loudspeaker is held back, so a wrong skip costs one sentence the
          // hall reads instead of hears, while a wrong speak is a burst of noise over the next sentence.
          const guard = checkTtsLanguage(speakText, dl.target);
          if (guard.speak) {
            enqueueTtsSentence(speakText, dl.target, data.emotion, data.ttsSpeed, lid);
            ttsSentences += 1;
          } else {
            ttsLanguageSkips += 1;
            lastTtsSkipReason = guard.reason;
            // eslint-disable-next-line no-console
            console.debug(`[onlineLane][tts] skipped (${guard.reason}): ${speakText.slice(0, 40)}`);
          }
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
        // The recogniser's own reply to the handshake. If a two-language restriction was requested and
        // this comes back empty, the vendor IGNORED it — the session is still free auto-detect, and the
        // operator can see that on the console instead of discovering it from a Chinese subtitle.
        const langs = Array.isArray(msg.asrLanguages) ? msg.asrLanguages.filter((l) => typeof l === 'string') : [];
        asrLanguages = langs.length ? langs.join('+') : null;
        // The codec has been putting this on the event since language detection was introduced and nothing
        // has ever read it. Without it, a vendor that silently declines detection produces a session that
        // looks healthy on screen while every sentence is routed with no evidence at all.
        asrLanguageDetection = typeof msg.languageDetection === 'boolean' ? msg.languageDetection : null;
        // M11: the commit clock starts here on EVERY dial, including reconnects — the first moment a
        // commit could actually reach upstream.
        resetScribeCommitState(true);
        setStatus('listening');
        void ensureCapture();
        break;
      }
      case 'asr.commit_throttled':
        // Upstream refused (too soon). The turn is still open, so let the planner re-schedule — its
        // MIN_COMMIT_GAP arithmetic pushes the retry past the throttle window instead of hammering it.
        scribeCommitPending = false;
        scheduleStableCommit(scribeLastPartial);
        break;
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
        // TASK 24: re-read at EVERY dial, never latched at create — change the step in Cài đặt, press
        // Bắt đầu again, and the new backstop is already in the handshake. No page reload.
        pauseSecs: rhythmPauseSecs(loadSpeechRhythm()),
        corpus: buildAsrCorpus(),
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
    const proxyTerms = codec ? null : buildAsrCorpus();

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
        // TASK 9: a decode can rescue a sentence the codec had been holding for a twin that never came.
        // Drained BEFORE this decode's own event, because the rescued sentence was spoken first.
        for (const rescued of codec.drain?.() ?? []) {
          lastEventAt = Date.now();
          handleEvent(rescued as unknown as Record<string, unknown>);
        }
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
      resetScribeCommitState(false); // the turn dies with the socket; session.created re-arms
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
    resetScribeCommitState(false); // the turn dies with the socket; session.created re-arms
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
    resetScribeCommitState(false); // no commit may be sent, or armed, after the session ends
    resetDraftState();
    for (const t of pendingRefineTimers.values()) clearTimeout(t.timer);
    pendingRefineTimers.clear();
    outstandingRefine.clear(); // M9: nothing is owed a turn on the loudspeaker any more
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
    // M13: the learned pauses SURVIVE a reconnect (same speaker, same room), but the open gap does not —
    // the silence spanning a dropped socket is dead air, not a pause somebody took.
    lastVoicedAt = 0;
    // The sound the room was making before the socket dropped says nothing about the sound after it.
    speechShape.reset();
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
    recentLevels = []; // a new session never shows the previous room's VU peak
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
    // M9: build the session's script matcher. Rows are read ONCE here, like terms/brief — editing the
    // script mid-session would move the cursor under a running ceremony. An absent or empty script
    // leaves the matcher null and every sentence takes the normal path.
    const scriptSeed = config.getScript?.() ?? [];
    scriptMatcher = scriptSeed.length ? createScriptMatcher(scriptSeed) : null;
    scriptRows = scriptSeed.length;
    // TASK 6: the names on the approved rows are known hours before the ceremony — prime the recogniser
    // with them instead of letting it guess at them live. Latched here with the rows themselves, so the
    // corpus rebuilt at each dial keeps using the script this session actually started with.
    scriptKeytermCorpus = scriptSeed.length ? scriptKeyterms(scriptSeed, SCRIPT_KEYTERM_LIMIT).join('\n') : '';
    scriptSnaps = 0;
    scriptSuggests = 0;
    lastScriptReason = '';
    flushSeq = 0;
    outstandingRefine.clear();
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
    sessionEventId = (config.getEventId?.() ?? '').trim(); // TASK 14 — latched with the script, for the same reason
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
    // M11/M12: the force-commit clock starts at session.created, not at Start.
    resetScribeCommitState(false);
    manualCommits = 0;
    foreignDrops = 0;
    languageTurns = 0;
    vendorTags = 0;
    asrLanguages = null;
    asrLanguageDetection = null;
    // M13: a new session is a new speaker in a new room — never inherit the previous event's pauses. The
    // key starts at the technician's chosen source language, so the very first turn is already measured
    // into the right bucket instead of into a nameless one.
    pauseProfile.reset();
    lastVoicedAt = 0;
    pauseKey = startOpts.sourceLanguage;
    lastStableWindowMs = 0;
    lastStableWindowAdaptive = false;
    ttsLanguageSkips = 0;
    lastTtsSkipReason = '';
    speechShape.reset();
    nonSpeechDrops = 0;
    lastNonSpeechReason = '';
    pausedMs = 0;
    continuationMerges = 0;
    fragmentRefines = 0;
    fragmentLinks = 0;
    segmentFirstFinalAt = 0;
    pendingFragmentTail = '';
    pendingFragmentAt = 0;
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
    while (segmentBuffer.trim()) flushSegment('stop');
    await awaitLastRefine(STOP_REFINE_WAIT_MS); // last line → finished translation before we checkpoint
    finalizeSession();
    teardown();
    setStatus('stopped');
  }

  async function saveSession(): Promise<SaveOutcome> {
    return doSave(true); // manual "Lưu transcript": download on failure is the right safety net (12.3)
  }

  function getDiagnostics(): OnlineDiagnostics {
    const learned = pauseProfile.windows(pauseKey);
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
      listenPaused: config.getListenPaused?.() ?? false,
      pausedMs: Math.round(pausedMs),
      nonSpeechDrops,
      lastNonSpeechReason,
      latency: latency.getReport(),
      lastUsageReportAt,
      lastSaveAt,
      lastSaveDownloaded,
      lastSaveOk,
      sendBacklogBytes,
      loudThreshold,
      recentLevelPeak: pruneRecentLevels(),
      scriptLines: scriptRows,
      scriptSnaps,
      scriptSuggests,
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
      lastScriptReason,
      manualCommits,
      foreignDrops,
      languageTurns,
      vendorTags,
      asrLanguages,
      asrLanguageDetection,
      pauseWindowMs: lastStableWindowMs,
      pauseSamples: learned?.samples ?? 0,
      pauseAdaptive: lastStableWindowAdaptive,
      pauseRhythm: speechRhythmLabel(loadSpeechRhythm()),
      ttsLanguageSkips,
      lastTtsSkipReason,
      continuationMerges,
      fragmentRefines,
      fragmentLinks,
    };
  }

  return { id: 'online', start, stop, getDiagnostics, saveSession };
}
