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
import { endsProvisionalSentence, endsWithStrongSentenceBreak, findFirstCommaClauseBreak, findLastStrongSentenceBreak, segmentCharLimit, stripProvisionalSentenceEnd } from './transcriptSegmentation';
import { planParagraphCut } from './paragraphStream';
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence, isInventedNumber, isNonSpeechAnnotation } from './asrSpeechEvidence';
import { isStableDraftPrefix, joinLiveDraftSource, stripPromotedPrefix } from './liveDraftTranslation';
import { decidePromotion, livePromoteStableMs, loadLivePromote, LIVE_PROMOTE_MIN_CHARS } from './livePromote';
import { ECHO_MEMORY, judgeEcho, rememberEcho } from './echoGuard';
import { hasNoLetters, isSyllableSoup } from './notLanguage';
import { DRAFT_RATE_WINDOW_MS, decideCaptureFrame, decideDraftAdmission, getContinuationWaitMs } from './livePipelinePolicy';
import { createSpeechPauseProfile } from './speechPauseProfile';
import { createSpeechShapeMonitor } from './speechShape';
import { checkTtsLanguage } from './ttsLanguageGuard';
import { createScriptMatcher, scriptKeyterms, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
import { judgeGuided, GUIDED_FLOOR, GUIDED_OFF, type GuidedState } from './guidedScript';
import { applyMishearings, formatMishearingRules, splitMishearingLines, MISHEARING_MAX_CHARS, type MishearingRule } from './mishearing';
import { planForceCommit, planStableScribeCommit, planStillnessCommit, type ScribeManualCommitReason } from './scribeManualCommit';
import { estimateSourceSpeechPace } from './sourceSpeechPace';
import { enqueueTtsSentence, getTtsQueueLength, resetTtsPlayback, setTtsPlaybackStartHandler, stopTtsPlayback, subscribeTtsSpeaking } from './ttsPlayback';
import { buildSessionExport, saveSessionExport, type SaveOutcome, type SessionLine } from './sessionExport';
import { createLatencyTracker, type LatencyReport } from './latencyTracker';
import { classifyInterimUtterance, createDirectionTracker, decideFinalLanguage, directionOf, type DirectionTracker, type Lang } from './utteranceDirection';
import { createDirectionRouter, type DirectionRouter } from './directionRouter';
import { createSpeakGate } from './speakGate';
import { createSourceAttributor } from './sourceAttribution';
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';
import { SPEECH_RHYTHM_DEFAULT, loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, rhythmUsesManualCommit, speechRhythmLabel } from './speechRhythm';
import { refineReasonText } from './refineFailure';

const ONLINE_BASE = '/online-api';
const RECENT_FINALS_MAX = 6;
const CORPUS_MAX_CHARS = 2000; // contract: corpus ≤ 2000 chars
// The server keeps at most 30 keyterms (`pickScribeKeyterms`), so lifting more than 30 names out of the
// script can never reach the handshake. They are appended AFTER the operator's own glossary, so the
// glossary always wins the budget and the script fills what is left.
const SCRIPT_KEYTERM_LIMIT = 30;

/**
 * TASK 56 — trần cho giấc ngủ sau khi nhả một dòng kịch bản.
 *
 * Cái đánh thức đúng là người điều khiển bấm dòng sau. Trần này chỉ để cái sai duy nhất của cơ chế —
 * người điều khiển quên bấm — không biến thành một micro điếc vĩnh viễn mà không ai hay. 30 giây đủ dài
 * cho MC đọc trọn một đoạn dịch dài, và đủ ngắn để không mất cả một bài phát biểu.
 */
const GUIDED_DEAF_MAX_MS = 30_000;

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
// TASK 28 — SOFT ceiling vs HARD ceiling. The 3s above used to apply to every buffer, including one sitting
// in the middle of an unfinished sentence, and it cut wherever the buffer happened to be. The 04/08
// transcript shows the result verbatim: "Ở đây mình có những viên s" / "ét- ...", "Lúc này anh có" /
// "thể chọn" — cut mid-word, and a stub like that drags its translation and its loudspeaker line down with
// it.
//
// From now on 3s may only cut AFTER a sentence-ending mark. With no legal place to cut, the sentence keeps
// running until the hard ceiling below, so in practice "cut mid-sentence" disappears instead of merely
// becoming rarer.
//
// 8s, not longer, and the reason is the room rather than the language. A continuous run of speech with no
// sentence-ending mark at all is rare, so the ceiling is reached rarely — but when it IS reached, this
// number is how long a hall full of people watches a line that does not move. Eight seconds is already a
// long time to stare at a frozen subtitle; the earlier draft said twelve, which is longer than most people
// will tolerate before assuming the machine has died. A forced cut is the lesser harm. Raise it after the
// ceremony if a measured session says the cut lands badly.
const SEGMENT_HARD_HOLD_MS = 8_000;
// M12 — how long an unfinished head stays available as "the first half" for the NEXT line. Long enough to
// cover the recogniser's 1.5s silence close plus a real thinking pause, short enough that a genuinely new
// thought is never translated as the continuation of something the speaker had already abandoned.
const FRAGMENT_LINK_MAX_GAP_MS = 10_000;

// M4 — ghost-transcript guard
const REPEAT_GUARD_MIN_CHARS = 12; // finals this long that repeat verbatim are hallucinations
// TASK 29 — these two windows must NOT be constants, and that lesson was paid for on 04/08.
//
// They used to be 4 000 each, and 4 000 was not arbitrary: it is the 1.5s default silence threshold plus a
// 2.5s margin. A final can never arrive sooner than the vendor's own silence threshold, so raising that
// threshold to 3.0s (TASK 27's step) leaves under 1 000ms of margin for the vendor's own pass, the network
// and the event loop — where there used to be 2 500ms. Finals that overran the remainder landed past the
// 4 000ms line and were thrown away by this very guard. `dropGhost` only writes `console.debug`: no toast,
// no red line, nothing on the wall. A whole sentence vanished in complete silence.
//
// Derived from the threshold ACTUALLY IN FORCE, the pair produces exactly 4 000 again at the default, so
// nothing changes for anyone who has not chosen the new step.
const GHOST_SILENCE_MARGIN_MS = 2_500;
const FALLBACK_PAUSE_SECS = 1.5;
// TASK 37 — the floor, and it is not decoration. The derivation above was written to WIDEN this window,
// but it applies to every step, and `fast` sends 0.9s ⇒ 3 400ms: TIGHTER than the 4 000 this replaced.
// `fast` is the step whose own hint reads "Lễ, MC đọc theo kịch bản" — the one most likely to be running
// at a ceremony — and the thing this window guards is a sentence vanishing with only a console.debug to
// show for it. So the derivation may raise this window and may never lower it.
const GHOST_WINDOW_FLOOR_MS = 4_000; // never stricter than the constant TASK 29 replaced

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

/**
 * R5 — how long the VOICE may wait for the router to settle the direction. The subtitle never waits.
 *
 * Same shape as SNAP_TTS_ORDER_WAIT_MS above and for the same reason: holding the hall in silence is
 * itself a failure, so every wait in this file has a ceiling. 1200ms is the top of the budget stated for
 * the router layer (500-1000ms) plus a little air; past it the voice goes out on the direction the wall
 * is already showing, because reading aloud what the room is reading is the least surprising thing left.
 *
 * Today the router answers synchronously inside `acceptFinalText`, well before any sentence reaches the
 * speaking stage, so this timer never actually starts. It exists so that making the router slow — the
 * model-based router, or two pinned sockets that must both finish an utterance before they can be
 * compared — costs the loudspeaker latency and costs the wall none.
 */
const DIRECTION_SETTLE_WAIT_MS = 1_200;

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
  /**
   * CHIỀU THEO NGUỒN TIẾNG — đường tiếng thứ hai, là tiếng đang phát ra từ chính máy này (Teams/Zoom).
   *
   * Đây là cơ chế hai chiều thật của các sản phẩm thương mại, và bóc ra thì rất tầm thường: chúng ngồi
   * trên máy của MỘT người, nên "mic của tôi" và "tiếng ra loa máy" là hai sợi dây khác nhau, và chiều
   * dịch là thuộc tính của sợi dây chứ không phải một phép đoán. Không mô hình, không ngưỡng, không quán
   * tính — xem `sourceAttribution.ts`.
   *
   * Phía gọi phải tự xin luồng này bằng `getDisplayMedia({ audio: true })` từ một cú bấm của người dùng,
   * và tự giữ vòng đời của nó. `null` (mặc định) = không có đường thứ hai, mọi thứ chạy y như trước.
   *
   * Đọc MỘT LẦN lúc mở micro, vì đồ thị âm thanh không dựng lại được sau khi đã chạy.
   */
  getSystemStream?: () => MediaStream | null | undefined;
  /**
   * Tiếng nào nằm ở đường tiếng máy. `null`/không đặt = phía bên kia nói thứ tiếng CÒN LẠI so với chiều
   * nguồn của phiên — đúng cảnh thường gặp: phòng nói tiếng Việt, đầu cầu Nhật Bản nói tiếng Nhật.
   */
  getSystemLanguage?: () => Lang | null | undefined;
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
  /**
   * TASK 58 — bối cảnh SỐNG, đọc lại ở mỗi câu thay vì chốt một lần lúc Bắt đầu.
   *
   * `opts.brief` là bối cảnh chung của cả buổi. Nhưng một buổi lễ có nhiều người nói, mỗi người mang
   * tài liệu riêng, và ngân sách 1500 ký tự chia đều cho cả kho thì mỗi tài liệu chỉ còn vài trăm ký
   * tự — dưới sàn 120 ký tự của `prepData` là rơi SẠCH, không một chữ nào tới được mô hình. Trả về
   * bối cảnh của ĐOẠN đang chạy thì đúng người đó được trọn ngân sách.
   *
   * Rỗng ⇒ quay về `opts.brief`. Không có getter ⇒ hành xử y như trước.
   */
  getBrief?: () => string;
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
  // TASK 34: where the operator says the ceremony has got to. Read LIVE on every finalised sentence, the
  // opposite of getScript above — the whole point is that a human moves it WHILE the ceremony runs.
  getGuided?: () => GuidedState | undefined;
  /**
   * Độ khớp khi dẫn theo kịch bản, đọc LẠI ở từng câu — đổi nấc trong Cài đặt là ăn ngay câu sau, không
   * phải Dừng rồi Bắt đầu lại. Giữa buổi lễ đó là khác biệt giữa sửa được và không.
   */
  getGuidedFloor?: () => number;
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
  /** Bảy chốt chặn của `dropGhost`, tách theo lý do — xem chú thích ở `dropGhost`. */
  droppedByReason: Record<string, number>;
  /**
   * Số đo của chốt "chờ bản có nhãn" trong codec. `tagWaitMaxMs` là câu trả lời bằng số cho "cái khựng
   * giữa hai câu dài bao nhiêu", `tagTimeouts` là số câu đã phải nhả sớm và mất nhãn tiếng.
   */
  asrTag: { waitLastMs: number; waitMaxMs: number; timeouts: number; plainFinals: number; taggedFinals: number };
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
  /**
   * TASK 56 — dẫn theo kịch bản: câu vừa nhả xong, micro đang ngủ chờ bấm dòng sau.
   *
   * Between releasing line N and the operator pressing line N+1 exactly one thing happens in the room:
   * the OTHER MC reads the translation aloud. That is a second human, not a quoted phrase, so neither the
   * half-duplex gate (which only knows our own voice) nor the direction lock covers it — heard and
   * translated, it puts a garbage line on the audience wall. This flag is that sleep, and it is a separate
   * field from `listenPaused` because the operator must be able to tell "máy đang chờ tôi bấm" apart from
   * "tôi đã bấm Ngưng nghe và quên bật lại".
   */
  guidedDeaf: boolean;
  // M13 — finished sentences discarded because the sound behind them had the shape of music, applause or a
  // hum rather than of a voice. Zero all evening means the guard never fired; a number that climbs during
  // a musical number means it is doing exactly its job.
  nonSpeechDrops: number;
  lastNonSpeechReason: string;
  /**
   * Máy nghe đọc lại đoạn đã nhả (`echoGuard.ts`). `echoDrops` = câu bỏ hẳn vì không còn gì mới;
   * `echoTrims` = câu bị cắt mất phần đầu trùng rồi vẫn nhả phần đuôi.
   *
   * Hai số này ĐỀU BẰNG 0 nghĩa là máy nghe không đọc lại — không phải là chốt chặn hỏng. Trên bản ghi
   * 06/08 chúng ra 4 và 3 trên 60 dòng.
   */
  echoDrops: number;
  echoTrims: number;
  /**
   * Số câu phải MƯỢN nhãn ÂM của câu kề bên vì tự nó không có (gần như luôn là câu nhả sớm — nhãn chỉ
   * cưỡi trên bản chốt có mốc thời gian). `carriedTags` cao cùng lúc với `nhả sớm` cao là bình thường;
   * `carriedTags` cao mà `vendorTags` bằng 0 nghĩa là cả buổi không có nhãn nào để mà mượn.
   */
  carriedTags: number;
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
  scriptFlips: number; // TASK 32 — snaps rescued by asking the script in the other language too
  guidedReleases: number; // TASK 34 — answered verbatim because the operator pointed at the line
  guidedMisses: number; // TASK 34 — armed but the sentence did not resemble the line
  scriptPosition: number; // 1-based script line expected next; 1 until something is accepted
  lastScriptReason: string; // why the last finalised sentence did not snap — verbatim for the operator
  // M11 — turn handling and the two-way guards.
  manualCommits: number; // turns the CLIENT closed instead of waiting for the vendor's silence
  /** Câu được nhả SỚM từ dòng partial, không chờ máy nghe chốt lượt. Xem `livePromote.ts`. */
  promotions: number;
  /** Lần trần 25s phải CHỜ một khe im lặng thay vì cắt ngay, và lần chờ lâu nhất. */
  forceGapWaits: number;
  forceGapWaitMaxMs: number;
  /**
   * Số lần trần 25s tới hạn mà không chốt được gì. Bằng 0 là đúng. Leo lên trong khi hội trường có tiếng
   * nghĩa là đường cấp cứu cũng không vào được và phiên sắp phải nối lại — số duy nhất nhìn thấy trước
   * được cái treo 131 giây của phiên 06/08.
   */
  ceilingNoops: number;
  /**
   * Sentences the vendor tagged as a THIRD language and the router borrowed onto ours rather than dropped.
   *
   * This replaces `foreignDrops`, and the rename is the point: the same event used to DELETE the sentence,
   * so the number was a count of what the hall never saw. Now the sentence arrives — possibly pointed the
   * wrong way, which is recoverable and visible — and the counter measures how hard the recogniser is
   * struggling rather than how much it threw away.
   */
  languageProjections: number;
  /** R5 — sentences shown but held back from the loudspeaker because the router settled the other way. */
  voiceDirectionHolds: number;
  /** The router's own words for the most recent direction verdict — the diagnostics readout. */
  lastRouterReason: string;
  /** Đường tiếng thứ hai có track tiếng thật và đang được trộn vào. */
  systemSourceLive: boolean;
  /** Số câu mà chiều được quyết bởi CỔNG chứ không phải bởi phỏng đoán. */
  sourceVerdicts: number;
  /** Câu gần nhất vào bằng cổng nào, kèm số mili-giây đo được từng đường. */
  lastSourceReason: string;
  /**
   * Cái gì đã quyết chiều, đếm theo loại, cả phiên.
   *
   * Đây là bảng để trả lời "bớt quán tính đi thì tốt hơn hay tệ hơn" bằng SỐ. `source` cao = đang đi bằng
   * sợi dây; `vendor` cao = đang đi bằng nhãn âm; `sticky` cao = đang đi bằng quán tính, tức là đang đoán.
   */
  routerBasis: Record<string, number>;
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
  /**
   * Pin the translation direction to the language the running order says this speaker speaks — or pass
   * `null` to go back to auto-detect.
   *
   * A person speaks ONE language for the length of their turn. A foreign phrase inside it is a quotation,
   * not a handover: a Japanese guest opening with "Xin chào" is still ja→vi, and those two words should
   * ride inside the sentence rather than flipping the rest of the speech and splitting the line in two.
   * Auto-detection reads the words, and the words are genuinely Vietnamese — only the running order knows
   * who is holding the microphone, so only the running order can settle this.
   *
   * While a lock is on, the vendor's language tag, the script classifier and the M11 turn split all stand
   * down. Segments that leave the language blank pass `null` and behave exactly as before.
   */
  lockLanguage(language: Lang | null): void;
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
  /**
   * 06/08 — the router that now settles the direction of every FINALISED sentence (directionRouter.ts).
   *
   * It replaces two things that used to sit inline here. The first was `decideFinalLanguage`'s precedence,
   * where kana beat everything instantly and with no inertia, so getting INTO Japanese took one stray
   * character while getting OUT needed evidence that a recogniser sitting in Japanese context does not
   * produce — a one-way ratchet the hall experienced as "it is stuck in Japanese". The second was the
   * `foreign` gate below it, which DISCARDED a sentence when the vendor named a third language and the
   * text carried no tone marks; the ceremony logs are full of Vietnamese speech tagged Chinese, Russian and
   * Italian, and every one of those sentences never reached the wall at all.
   *
   * `tracker` is kept, but demoted: it now only guesses at the direction of DRAFTS (dirLangs, interim), and
   * every final realigns it to whatever the router settled. Two objects, one authority.
   */
  let router: DirectionRouter | null = null;
  /**
   * When the previous accepted final landed — the only input the router cannot measure for itself.
   *
   * A pause is a handover, so this number is what lets "somebody stopped, somebody else started" be
   * detected at all. 0 means no sentence yet this session: the first one is given gap 0 (nothing to hand
   * over FROM), not an infinite gap, which would fire a handover on the very first sentence.
   */
  let lastAcceptedFinalAt = 0;
  /**
   * CHIỀU THEO NGUỒN TIẾNG — câu vừa chốt vào máy bằng cổng nào. Xem `sourceAttribution.ts`.
   *
   * Chỉ sống khi người vận hành có đấu đường tiếng thứ hai. Không đấu thì mọi câu đều không gán được và
   * router chạy y hệt như trước, không rẽ nhánh nào.
   */
  const sourceAttributor = createSourceAttributor();
  /** Đường tiếng máy có thật sự được nối không — để màn điều khiển nói thật, không nói theo ý định. */
  let systemSourceLive = false;
  let sourceVerdicts = 0;
  let lastSourceReason = '';
  /**
   * R5 — the seam between SHOWING a sentence and SPEAKING it. See speakGate.ts.
   *
   * The subtitle goes out on the direction available at flush time and never waits for anybody. The voice
   * asks this gate first, and if the router has settled on a different direction than the one the sentence
   * was TRANSLATED in, the voice stays shut: that translation was made backwards, so speaking it is not a
   * wrong accent on a right sentence, it is a wrong sentence. The wall keeps it, because a wrong subtitle
   * is something the room can see and the operator can fix.
   */
  const speakGate = createSpeakGate();
  const settledDir = new Map<string, 'vi2ja' | 'ja2vi'>();
  /**
   * TASK 55 — the running order says who is at the microphone, so it also says which language.
   *
   * A person speaks ONE language. A foreign phrase inside their turn ("Xin chào" from a Japanese guest)
   * is a QUOTATION, not a change of speaker: the direction must stay ja→vi and the quoted words simply
   * ride along inside the sentence. Auto-detection cannot know that — it sees Vietnamese and flips, which
   * both mistranslates the rest of the turn and (via the M11 turn split below) chops the sentence in two.
   *
   * So when a segment names the speaker's language the direction is LOCKED for that segment: the vendor's
   * own tag, the script evidence and the turn split all stand down. `null` = no lock, auto-detect as
   * before — a segment that leaves the language blank keeps exactly the old behaviour.
   *
   * The recogniser is NOT touched: it stays on 'auto' so a quoted Vietnamese phrase is still transcribed
   * as Vietnamese. Only the translation direction is pinned, which is pure client state — no reconnect.
   */
  let lockedSource: Lang | null = null;

  /**
   * TASK 56 — dòng kịch bản mà việc NHẢ nó đã đưa micro vào giấc ngủ; -1 = đang thức.
   *
   * Nhả xong dòng N thì trong phòng chỉ còn đúng một việc diễn ra: MC bên kia đọc bản dịch. Máy nghe
   * tiếp là chép lời một người thứ hai và đẩy rác lên tường. Nên nhả xong là ngủ, và thứ đánh thức nó là
   * chính cái bấm dòng N+1 của người điều khiển — không đoán, không hẹn giờ. Con trỏ nhích là thức.
   *
   * Giá của việc thức: đúng MỘT gói tiếng (4096 mẫu @16kHz ≈ 256ms). Và không mất tiếng nào cả — gói tới
   * ngay sau cái bấm mang theo 256ms tiếng ĐÃ THU TRƯỚC lúc bấm, vì quyết định câm/nghe áp cho cả gói tại
   * lúc gói về chứ không phải lúc thu. Bấm hơi trễ vẫn còn vớt lại được.
   */
  let guidedDeafAtIndex = -1;
  let guidedDeafSince = 0;

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
  /**
   * Mấy câu VỪA NHẢ, để bắt máy nghe đọc lại đoạn cũ (`echoGuard.ts`).
   *
   * KHÁC `recentFinals` bên dưới, và cố ý không dùng chung: `recentFinals` giữ đầu ĐOẠN lúc gom xong, làm
   * ngữ cảnh cho bản dịch tinh; cái này giữ từng CÂU lúc vừa nhận, đúng thứ máy nghe có thể đọc lại. Gộp
   * hai thứ lại là để chốt chặn nhìn nhầm hạt.
   */
  let echoMemory: string[] = [];
  let echoDrops = 0;  // câu bị bỏ hẳn vì đã nhả rồi
  let echoTrims = 0;  // câu bị cắt mất phần đầu vì phần đầu đã nhả rồi
  /**
   * Nhãn ÂM gần nhất máy nghe gắn được, và lúc nó về.
   *
   * Nhãn chỉ cưỡi trên bản chốt CÓ MỐC THỜI GIAN. Câu "nhả sớm" cắt ra từ dòng partial nên không bao giờ
   * có nhãn của riêng nó — đo trên phiên 06/08: 39/52 câu là nhả sớm và cả 39 đi tới bộ định tuyến với
   * tay không. Giữ lại nhãn gần nhất để chuyền sang cho chúng, như một bằng chứng YẾU.
   */
  let lastVendorTag = '';
  let lastVendorTagAt = 0;
  let carriedTags = 0;
  /** Nhãn cũ hơn chừng này thì thôi: nó nói về người cầm micro, và người cầm micro thì đổi. */
  const VENDOR_TAG_CARRY_MS = 8_000;
  const noteVendorTag = (tag: string | undefined, at: number): void => {
    if (!tag) return;
    lastVendorTag = tag;
    lastVendorTagAt = at;
  };
  const carriedVendorTag = (at: number): string | undefined =>
    (lastVendorTag && at - lastVendorTagAt <= VENDOR_TAG_CARRY_MS ? lastVendorTag : undefined);
  let droppedGhosts = 0;
  const droppedByReason: Record<string, number> = {};
  // NHẢ CÂU SỚM. `promotedPrefix` là đoạn ĐẦU của lượt đang mở mà ta đã nhả đi rồi — nó vẫn nằm nguyên
  // trong mọi partial kế tiếp (máy nghe chưa chốt gì cả), nên phải trừ ra ở cả chỗ hiển thị lẫn lúc lượt
  // thật sự chốt. `promoteCandidate` là tiền tố đang được theo dõi xem có đứng yên đủ lâu chưa.
  let promotedPrefix = '';
  let promoteCandidate = '';
  let promoteCandidateAt = 0;
  let promotions = 0;
  // Trần 25s giờ chờ một khe im lặng mới cắt (`planForceCommit`). Hai số này là bằng chứng nó có phải
  // chờ thật hay không — chờ lâu bất thường nghĩa là hội trường không bao giờ im, và ta muốn thấy điều đó.
  let forceGapWaits = 0;
  let forceGapWaitMaxMs = 0;
  /** Số lần trần 25s tới hạn mà KHÔNG chốt được gì cả. Xem `sendManualCommit`. */
  let ceilingNoops = 0;

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
  let languageProjections = 0;
  /**
   * R5 — sentences shown on the wall but NEVER SPOKEN, because by the time the voice was ready the router
   * had settled on the other direction. A number worth watching: it climbing means the pipeline is
   * translating sentences backwards and only the gate is stopping the hall from hearing them.
   */
  let voiceDirectionHolds = 0;
  let lastRouterReason = '';
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
  // TASK 32 — snaps that only happened because the script was asked in the OTHER direction too, i.e. the
  // recogniser had the language wrong. Worth counting on its own: a session where this climbs is a
  // session where language detection is struggling, and that is invisible in the snap count alone.
  let scriptFlips = 0;
  // TASK 34 — the rows themselves, kept alongside the matcher so guided mode can read the pair for an
  // arbitrary line. The matcher only exposes candidates, and a candidate is not addressable by row.
  let scriptSeedRows: readonly ScriptMatcherEntry[] = [];
  let guidedReleases = 0; // sentences answered because the OPERATOR pointed at the line
  let guidedMisses = 0; // armed, but the sentence did not resemble the line — fell through to normal
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
    // A sentence that already finalised keeps its direction even if the operator has since moved the
    // running order on — an old line must never jump audience windows.
    if (settled) source = settled === 'vi2ja' ? 'vi' : 'ja';
    // TASK 55: the running order named this speaker's language. Nothing in the text overrules it.
    else if (lockedSource) { source = lockedSource; if (!interim) settledDir.set(lid, directionOf(source)); }
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

  // The silence threshold the SERVER reported as applied on the most recent dial — never the number the
  // client asked for, because the server clamps it. Re-latched on every dial (including reconnects).
  let appliedPauseSecs = FALLBACK_PAUSE_SECS;
  const ghostWindowMs = (): number =>
    Math.max(GHOST_WINDOW_FLOOR_MS, Math.round(appliedPauseSecs * 1000) + GHOST_SILENCE_MARGIN_MS);

  function pruneVoiced(): number {
    const cutoff = Date.now() - ghostWindowMs();
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
    }, getContinuationWaitMs({
      text,
      sessionTerms: opts?.terms,
      unitsPerSecond: currentSegmentUnitsPerSecond(text),
      // The ruler for "long enough to be a sentence" is SEGMENT_MIN_CHARS, and it lives here rather than in
      // the policy module so that this decision and `complete` below can never drift apart.
      provisionalEnd: endsProvisionalSentence(text, SEGMENT_MIN_CHARS),
    }));
  }

  function clearSegmentTimer(): void {
    if (segmentTimer) {
      clearTimeout(segmentTimer);
      segmentTimer = null;
    }
  }

  function dropGhost(reason: string, transcript: string): void {
    droppedGhosts += 1;
    // Đếm RIÊNG từng lý do. Trước đây bảy chốt chặn dưới đây chỉ ghi `console.debug` rồi cộng vào một
    // con số tổng, nên trên màn hình một câu bị CHÍNH MÁY NÀY bỏ trông y hệt một câu nhà cung cấp nuốt
    // mất. Muốn phân xử "lỗi tại đâu" thì phải biết chốt nào đã bắn, và bắn bao nhiêu lần.
    droppedByReason[reason] = (droppedByReason[reason] ?? 0) + 1;
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
          // TASK 56: con trỏ kịch bản nhích (hoặc tắt dẫn tay, hoặc quá trần) là thức. Đọc mỗi gói —
          // 256ms một lần — nên cái bấm của người điều khiển ăn ngay ở gói kế tiếp.
          if (guidedDeafAtIndex >= 0) {
            const g = config.getGuided?.() ?? GUIDED_OFF;
            if (!g.armed || g.index !== guidedDeafAtIndex || Date.now() - guidedDeafSince > GUIDED_DEAF_MAX_MS) {
              guidedDeafAtIndex = -1;
            }
          }
          const frame = decideCaptureFrame({
            listenPaused: (config.getListenPaused?.() ?? false) || guidedDeafAtIndex >= 0,
            gateActive,
          });
          const frameMs = packet.pcm.byteLength / 2 / 16; // samples / 16 = ms @16kHz
          if (frame.countPaused) pausedMs += frameMs;
          if (frame.countGated) gatedMs += frameMs;
          if (frame.observeShape) speechShape.observe(packet.pcm);
          if (frame.mute) {
            pcm = new ArrayBuffer(packet.pcm.byteLength);
            voicedMs = 0;
          }
          const packetAt = Date.now();
          voicedWindow.push({ at: packetAt, voicedMs });
          pruneVoiced();
          notePausePace(voicedMs);
          // Ghi năng lượng RIÊNG từng đường, ngay tại đây. Gói bị câm (cổng nửa song công / Ngưng nghe)
          // đã có `voicedMs = 0` ở trên, nhưng hai con số dưới đây lấy từ CHÍNH gói gốc — chủ ý: một câu
          // bị câm nửa chừng vẫn phải gán đúng cho người đã nói nó.
          sourceAttributor.observe(packetAt, packet.micVoicedMs, packet.sysVoicedMs);
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
              // Câu bị giữ quá hạn chờ nhãn được nhả ra ngay ở nhịp gói tiếng (~256 ms). Đây là đường
              // DUY NHẤT còn chạy khi người nói đã dứt lời và im — cũng chính là lúc việc giữ câu gây
              // khó chịu nhất, vì không còn tin nào về để đánh thức `decode`.
              if (codec) for (const rescued of codec.drain?.() ?? []) {
                lastEventAt = Date.now();
                handleEvent(rescued as unknown as Record<string, unknown>);
              }
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
        {
          nearMicGate: config.getNearMicGate?.() ?? true,
          micSensitivity: config.getMicSensitivity?.() ?? 'auto',
          systemStream: config.getSystemStream?.() ?? null,
        },
      );
      // stop()/restart may have fired, or a duplicate capture may have won, while the mic-permission
      // prompt was open — never leave a hot mic, a stale-session mic, or a second mic.
      if (!running || gen !== sessionGen || capture) {
        handle.stop();
        return;
      }
      capture = handle;
      // Nói THẬT về việc đường thứ hai có sống không. `getDisplayMedia` vẫn trả về luồng hợp lệ khi người
      // vận hành quên tích "chia sẻ âm thanh hệ thống" — luồng đó chỉ có hình, và nếu màn điều khiển báo
      // "đang chạy theo nguồn" trong khi thật ra không có tiếng nào vào, thì mọi câu lặng lẽ bị gán cho
      // mic và không ai biết vì sao chiều vẫn sai.
      systemSourceLive = (config.getSystemStream?.()?.getAudioTracks().length ?? 0) > 0;
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

  /**
   * Ask upstream to close the current turn now. Returns false when there is nothing to close.
   *
   * `atCeiling` là đường CẤP CỨU, và nó cố ý bỏ qua hai điều kiện mà đường thường phải có:
   *
   *   · `scribeCommitPending` — một lệnh chốt đã gửi mà mãi không thấy trả lời KHÔNG phải lý do để im
   *     lặng thêm, nó chính là dấu hiệu nghẽn.
   *   · `scribeLastPartial` — và đây mới là chỗ hỏng thật. Biến này chỉ được ghi trong `scheduleStableCommit`
   *     (tức là phải CÓ partial về mới có), và bị xoá trắng ở mỗi lần chốt lượt. Nên đúng lúc máy nghe câm
   *     — không partial nào về, tức là đúng lúc cần cấp cứu nhất — thì `sendManualCommit` bỏ cuộc ngay ở
   *     dòng này, `armForceCommit` hẹn lại trọn 25 giây nữa, và vòng đó lặp vô hạn. Lưới còn lại duy nhất
   *     là watchdog 35s, mà nó chữa bằng cách nối lại socket và tiếng đang bay thì mất.
   *
   *     Đo được trên phiên 06/08: ba lần đổi tiếng cho ra ba khoảng câm 6,2s → 24,3s → 131s, lần cuối là
   *     treo hẳn rồi nối lại và mất nguyên đoạn đã nói.
   *
   * Đổi lại, cấp cứu vẫn phải có bằng chứng là CÓ TIẾNG để mà chốt — nếu không thì một căn phòng im lặng
   * sẽ bị bắn lệnh chốt 25 giây một lần suốt buổi. Bằng chứng đó là micro, không phải dòng chữ trả về.
   */
  function sendManualCommit(reason: ScribeManualCommitReason, atCeiling = false): boolean {
    if (scribeCommitPending && !atCeiling) return false;
    if (!codec || !ws || ws.readyState !== WebSocket.OPEN || !sessionReady) return false;
    const soundSinceCommit = lastLoudAt > 0 && lastLoudAt >= scribeLastCommitAt;
    if (!scribeLastPartial.trim() && !(atCeiling && soundSinceCommit)) return false;
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
  //
  // 05/08: it no longer cuts the moment the timer expires. `planForceCommit` holds it until the
  // microphone goes quiet for a couple of hundred milliseconds — the gap between two words — because a
  // commit cuts the AUDIO and this was the one trigger with no boundary test at all. Two names were
  // bisected in the 08/05 rehearsal ("của Esuh" | "ai lên phát biểu"), and each half was then translated
  // on its own. `graceMs` inside the planner guarantees the hold always ends.
  function armForceCommit(): void {
    if (scribeForceCommitTimer) {
      clearTimeout(scribeForceCommitTimer);
      scribeForceCommitTimer = null;
    }
    const now = Date.now();
    if (!scribeLastCommitAt) scribeLastCommitAt = now;
    const plan = planForceCommit({ lastCommitAt: scribeLastCommitAt, now, lastLoudAt });
    if (plan.commit) {
      if (plan.waitedMs > 0) {
        forceGapWaits += 1;
        if (plan.waitedMs > forceGapWaitMaxMs) forceGapWaitMaxMs = plan.waitedMs;
      }
      // `sendManualCommit` re-arms on success; only the "nothing to commit" path has to restart the clock.
      //
      // `atCeiling` = true: đây là đường cấp cứu. Trước đây chỗ này gọi đường thường, và đường thường bỏ
      // cuộc ngay khi không có partial — tức là vô hiệu đúng lúc máy nghe câm, đúng lúc cần nó nhất.
      if (!sendManualCommit('max-duration', true)) {
        // Thật sự không có gì để chốt (phòng im, chưa ai nói từ lần chốt trước). Đếm riêng: số này leo
        // trong khi người ta ĐANG NÓI nghĩa là cấp cứu cũng không vào được, và lúc đó chỉ còn nối lại.
        ceilingNoops += 1;
        scribeLastCommitAt = Date.now();
        armForceCommit();
      }
      return;
    }
    scribeForceCommitTimer = setTimeout(() => {
      scribeForceCommitTimer = null;
      armForceCommit(); // look again — never cut blind
    }, plan.delayMs);
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
    // TASK 27: the "Chạy liền mạch" step never commits BECAUSE OF PUNCTUATION — punctuation is what was
    // cutting words in half. Read LIVE, exactly as `stableCommitWindows` below does, so moving the knob
    // mid-session takes effect at once instead of waiting for the next Bắt đầu. One net remains, and it is
    // not optional: leaving the close entirely to the vendor's VAD was measured on 04/08 to produce a
    // session with no close at all (AGC on the hall microphone lifts every pause into noise), leaving only
    // the 25s ceiling — dim text, nothing ever going bold.
    if (!rhythmUsesManualCommit(loadSpeechRhythm())) {
      const still = planStillnessCommit(text, scribePartialChangedAt, scribeLastCommitAt, Date.now());
      if (!still) return;
      lastStableWindowMs = still.stableMs;
      lastStableWindowAdaptive = false;
      scribeCommitTimer = setTimeout(() => {
        scribeCommitTimer = null;
        sendManualCommit(still.reason);
      }, still.delayMs);
      return;
    }
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
    // Lượt chết thì đoạn đã nhả cũng hết nghĩa: nó là tiền tố của MỘT lượt cụ thể. Giữ lại qua một lần
    // nối lại socket là lượt sau bị trừ mất đoạn đầu — chính là kiểu nuốt chữ mà cả cơ chế này phải tránh.
    // (`handleFinal` đã tự dọn trước khi gọi vào đây; chỗ này lo cho nối lại, Dừng, và teardown.)
    promotedPrefix = '';
    promoteCandidate = '';
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

  /**
   * Nhả một câu đã xong ra khỏi dòng partial, không chờ máy nghe chốt lượt.
   *
   * Nấc đọc LẠI ở từng partial, cùng nếp với nhịp nói và độ khớp: đổi nấc trong Cài đặt là ăn ngay, không
   * phải Dừng rồi Bắt đầu lại — giữa buổi lễ đó là khác biệt giữa sửa được và không.
   *
   * `promotedPrefix` được ghi theo **chuỗi con thật của `base`**, không phải theo số ký tự đã tiêu. Máy
   * nghe sửa lại đoạn đầu thì `stripPromotedPrefix` không khớp và ta giữ nguyên bản đã sửa: lặp một câu,
   * chứ không nuốt mất chữ.
   */
  function maybePromote(base: string, detectedLanguage: string | undefined): void {
    const stableMs = livePromoteStableMs(loadLivePromote());
    if (stableMs <= 0) { promoteCandidate = ''; return; }
    const seen = stripPromotedPrefix(base, promotedPrefix);
    if (seen.coveredByPromoted) { promoteCandidate = ''; return; }
    const live = seen.text;
    const decision = decidePromotion({
      live,
      candidate: promoteCandidate,
      candidateAt: promoteCandidateAt,
      now: Date.now(),
      stableMs,
      // Cùng cái thước đã dùng cho bộ đệm đoạn: một ký tự tiếng Nhật gánh nhiều nghĩa hơn một ký tự tiếng
      // Việt (đo được 1,85×), nên sàn phải đi theo tiếng của chính đoạn đang đo.
      minChars: segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, live),
      breakAt: (t) => findLastStrongSentenceBreak(t, true),
      boundaryOk: isStableDraftPrefix,
    });
    if (decision.candidate !== promoteCandidate) {
      promoteCandidate = decision.candidate;
      promoteCandidateAt = Date.now();
    }
    if (!decision.promote) return;
    // Vị trí cắt tính trên `base`, vì `live` là một hậu tố của `base` (stripPromotedPrefix chỉ cắt đầu).
    const offset = base.length - live.length;
    promotedPrefix = base.slice(0, offset + decision.cut).trim();
    promoteCandidate = '';
    promotions += 1;
    acceptFinalText(decision.candidate, detectedLanguage);
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
    if (Date.now() - lastLoudAt >= ghostWindowMs()) return;
    // M13: loud is not the same as spoken. Keep the lyrics of the song playing in the hall off the
    // audience wall — where an interim line is the most visible thing in the room.
    if (!speechShape.verdict().speechLike) return;
    noteSpeechTiming();
    // M11: judge the turn upstream is still HOLDING — not segmentBuffer, whose earlier sentences are
    // already committed and would make every partial look finished.
    // Vẫn là TOÀN BỘ đoạn máy nghe đang giữ, kể cả phần ta đã nhả sớm: bộ đếm nhịp chốt lượt đang đo việc
    // của MÁY NGHE, không phải việc của màn hình.
    const base = (text + stash).trim();
    // Máy nghe thỉnh thoảng gắn nhãn ngay trên dòng partial. Nhặt lấy: đây là nhãn TƯƠI NHẤT có thể có,
    // và câu nhả sớm ngay sau đó sẽ cần nó (xem `carriedVendorTag`).
    //
    // Trừ khi đang là cháo âm tiết. Lúc máy nghe phiên âm một thứ tiếng nó không nhận ra, nhãn nó gắn kèm
    // là nhãn của cái ngôn ngữ nó ĐANG KẸT chứ không phải của người đang nói — mà đó đúng là lúc câu kế
    // tiếp cần mượn nhãn nhất. Rác không được bỏ phiếu, ở mọi đường vào (`notLanguage.ts`).
    if (!isSyllableSoup(base)) {
      noteVendorTag(typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined, Date.now());
    }
    scheduleStableCommit(base);
    if (!segmentLid) segmentLid = `online-${++counter}`;
    latency.markFirstPartial(segmentLid, performance.now());
    // NHẢ CÂU SỚM — làm TRƯỚC khi vẽ, để dòng vẽ ra không lặp lại câu vừa nhả.
    maybePromote(base, typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined);
    // The wall must not show the invented stop either: while the dim text is still moving, the sentence is
    // demonstrably not over, and a full stop sitting in the middle of a live line reads as a mistake.
    const shown = stripPromotedPrefix(base, promotedPrefix);
    const live = shown.coveredByPromoted ? '' : shown.text;
    if (!live) return; // cả đoạn đang nghe đã nhả đi rồi — không còn gì mờ để vẽ
    // Cháo âm tiết cũng không được lên tường ở dạng chữ MỜ. Dòng mờ là thứ dễ thấy nhất trong phòng — nó
    // to, nó động, và mắt người bám vào cái đang chuyển động. Chốt chặn ở `acceptFinalText` chặn được câu
    // CHỐT, nhưng dòng mờ đi thẳng ra `emitLine` nên phải chặn riêng ở đây.
    //
    // Dừng vẽ, chứ không xoá: tường giữ nguyên dòng mờ cuối cùng còn đọc được. Và không gọi `scheduleDraft`
    // nữa — không tiêu một lượt dịch cho rác. Bắt nhầm là chuyện không xảy ra được: dòng thật nhiều gạch
    // nhất trong cả kho log là 5 nhóm, ngưỡng là 8.
    if (isSyllableSoup(live)) return;
    currentInterimSource = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, live, SEGMENT_MIN_CHARS), live);
    emitLine({ lid: segmentLid, sourceText: currentInterimSource, targetText: lastInterimTarget, interim: true, corrected: false });
    scheduleDraft();
  }

  function handleFinal(msg: Record<string, unknown>): void {
    // Giữ lại TRƯỚC khi dọn: `resetScribeCommitState` xoá `promotedPrefix` (đúng, vì lượt đã chết), nhưng
    // chính lượt vừa chết mới là lượt cần trừ đi phần đã nhả sớm.
    const promotedInTurn = promotedPrefix;
    // M11: the turn upstream was holding is closed, whatever closed it — clock a fresh window.
    resetScribeCommitState(true);
    // TASK 5: correct BEFORE every guard below. The repeat guard, the script matcher, the refine call,
    // the audience wall and the saved transcript must all see the same corrected string — otherwise the
    // name is fixed on screen and still wrong in the recording.
    const raw = applyMishearings((typeof msg.transcript === 'string' ? msg.transcript : '').trim(), activeMishearings()).text;
    if (!raw) return;
    // NHẢ CÂU SỚM: phần đầu của lượt này có thể đã được nhả ra từ dòng partial rồi. Trừ đi đúng phần đó.
    //
    // `stripPromotedPrefix` cắt CHỈ KHI khớp tiền tố chính xác. Máy nghe sửa lại đoạn đầu ⇒ không khớp ⇒
    // giữ nguyên bản đã sửa. Đó là lặp một câu trên tường, và lặp thì thấy được; cắt mù theo số ký tự là
    // nuốt mất chữ, và nuốt thì không ai thấy. Đổi lấy cái thấy được là cố ý.
    const rest = stripPromotedPrefix(raw, promotedInTurn);
    // Máy nghe chốt lượt mà không có gì mới so với những gì đã nhả — bình thường, và không phải một câu.
    if (rest.coveredByPromoted) return;
    const transcript = rest.text;
    if (!transcript) return;
    acceptFinalText(transcript, typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined);
  }

  /**
   * Đường đi của MỘT câu đã xong, dù nó đến từ đâu.
   *
   * Hai lối vào: máy nghe chốt lượt (`handleFinal`), hoặc một tiền tố đứng yên đủ lâu trong dòng partial
   * được nhả sớm (`maybePromote`). Cố ý dùng CHUNG toàn bộ đoạn dưới đây — mọi chốt chặn ma, bộ khớp kịch
   * bản, bộ đệm đoạn, refine, giọng đọc, dòng lưu lại. Một câu nhả sớm phải đi qua đúng những cái cổng mà
   * một câu chốt bình thường đi qua, nếu không thì bật cơ chế nhả sớm lên là lặng lẽ tắt hết các lớp bảo
   * vệ đã dựng suốt sáu tháng.
   */
  function acceptFinalText(incoming: string, detectedLanguage: string | undefined): void {
    const msg: Record<string, unknown> = detectedLanguage ? { detectedLanguage } : {};
    // M4 ghost guards (drop finals, count them).
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_FINAL_MIN_VOICED_MS)) {
      dropGhost('low-voiced', incoming);
      return;
    }
    if (Date.now() - lastLoudAt >= ghostWindowMs()) {
      dropGhost('long-silence', incoming);
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
      dropGhost(`non-speech sound · ${shape.reason}`, incoming);
      return;
    }
    // MÁY NGHE ĐỌC LẠI ĐOẠN VỪA RỒI. Chốt lượt không xoá ngữ cảnh của nó, nên lượt sau có thể mở ra bằng
    // chính những chữ vừa đóng lại rồi mới nói tiếp — bản ghi 06/08 có 7/60 dòng như thế (12%).
    //
    // Chốt chặn cũ ở đúng chỗ này chỉ nhớ MỘT câu ngay trước, và chỉ so BẰNG NHAU tuyệt đối. Sáu trong
    // bảy ca nằm cách 2–3 dòng nên ngoài tầm với, còn ca cách 1 dòng cũng lọt vì bản mới DÀI HƠN bản cũ.
    // Nay nhớ nhiều câu và so theo BAO HÀM — xem `echoGuard.ts` cho luật an toàn.
    const echo = judgeEcho(incoming, echoMemory, REPEAT_GUARD_MIN_CHARS);
    if (echo.kind === 'repeat') {
      echoDrops += 1;
      dropGhost('repeat', incoming);
      return;
    }
    if (echo.kind === 'trimmed') echoTrims += 1;
    // Từ đây trở xuống là chữ THẬT SỰ MỚI của câu này. Mọi chốt chặn còn lại, bộ khớp kịch bản, bản dịch
    // và dòng lưu lại đều phải nhìn cùng một chuỗi — trừ ở đây rồi mới đi tiếp là cách duy nhất bảo đảm.
    const transcript = echo.text;
    if (!transcript) return;
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
    // 06/08 — hai chốt chặn cuối cùng của loạt này, cả hai đo từ phiên 14:47. Xem `notLanguage.ts`.
    //
    // Đứng ĐÚNG CHỖ NÀY chứ không sớm hơn, vì hai lý do: chúng đọc `transcript` (đã trừ phần nhả sớm và
    // phần máy nghe đọc lại) nên thấy đúng cái sẽ lên tường — mảnh `"` cô độc chỉ LỘ RA sau khi trừ; và
    // chúng nằm TRƯỚC `rememberEcho`/`noteVendorTag` bên dưới, nên rác không vào bộ nhớ chống-đọc-lại và
    // không được bỏ phiếu cho chiều dịch.
    if (hasNoLetters(transcript)) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = 'không có chữ nào';
      dropGhost('no letters', transcript);
      return;
    }
    if (isSyllableSoup(transcript)) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = 'cháo âm tiết';
      dropGhost('syllable soup', transcript);
      return;
    }
    echoMemory = rememberEcho(echoMemory, transcript, ECHO_MEMORY);

    // M11: what language was this, really? The vendor tags every completed transcript (the session is
    // opened with include_language_detection) and until now nothing read it.
    const vendorLanguage = typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined;
    if (vendorLanguage) vendorTags += 1;
    noteVendorTag(vendorLanguage, Date.now());
    // 06/08 — THE ROUTER decides, and the `foreign` gate that used to stand here is GONE.
    //
    // That gate discarded a sentence whenever the vendor named a third language and the text carried no
    // Vietnamese tone marks. The intent was sound (better a missing sentence than a fictional one), but
    // the ceremony logs show what it actually did: Vietnamese speech tagged Chinese, Russian and Italian,
    // deleted, silently, mid-ceremony. From the hall that is not "it hasn't recognised me" — it is a
    // silence with no end in sight, and the operator has nothing to react to because `dropGhost` only
    // writes console.debug. The router BORROWS instead: a third language is read as the non-base direction
    // for that one sentence and never latched (directionRouter.ts, rule 1).
    //
    // Nothing is reopened by removing it. The vendor's own "（聞き取り不能）", "(inaudible)", "[音楽]" and "♪"
    // markers — the other half of what this gate used to catch — are caught above by isNonSpeechAnnotation.
    const finalAt = Date.now();
    // First sentence of the session hands over from nobody, so gap 0 rather than "the whole session".
    const gapMs = lastAcceptedFinalAt ? finalAt - lastAcceptedFinalAt : 0;
    // CHIỀU THEO NGUỒN TIẾNG. Hỏi cửa sổ thời gian của ĐÚNG câu này — từ câu chốt trước tới bây giờ —
    // xem tiếng vào máy bằng cổng nào. Đây là bằng chứng duy nhất trong cả đường ống không phải một phép
    // đo: không thứ gì trong phòng làm cho máy tính tự phát ra tiếng.
    //
    // Chỉ chạy khi đường thứ hai SỐNG THẬT. Không đấu thì `verdictFor` luôn thấy `sysVoicedMs = 0`, mọi
    // câu gán về mic, và gán tất cả về một phía thì chẳng khác gì không có tín hiệu — tệ hơn thế, nó sẽ
    // ghim cứng chiều của cả buổi. Nên cửa `systemSourceLive` phải đứng ngoài cùng.
    const sourceVerdict = systemSourceLive && twoWay
        ? sourceAttributor.verdictFor(lastAcceptedFinalAt, finalAt)
        : null;
    const systemLang: Lang = config.getSystemLanguage?.()
        ?? (opts?.sourceLanguage === 'ja' ? 'vi' : 'ja');
    const sourceLang: Lang | undefined = sourceVerdict
        ? (sourceVerdict.source === 'system' ? systemLang : (systemLang === 'ja' ? 'vi' : 'ja'))
        : undefined;
    if (sourceLang) {
        sourceVerdicts += 1;
        lastSourceReason = `${sourceVerdict!.source === 'system' ? 'tiếng máy' : 'micro'}`
            + ` (mic ${Math.round(sourceVerdict!.micVoicedMs)}ms · máy ${Math.round(sourceVerdict!.sysVoicedMs)}ms`
            + `${sourceVerdict!.overlapped ? ' · chồng tiếng' : ''})`;
    }
    lastAcceptedFinalAt = finalAt;
    // One-way listening does not route: the socket itself is opened pinned to the operator's language
    // (`language: twoWay ? 'auto' : opts.sourceLanguage`), so there is no direction to decide and no third
    // language the recogniser could return.
    // Câu KHÔNG có nhãn của riêng nó thì mượn nhãn ÂM gần nhất — gần như luôn là câu nhả sớm, vì nhãn chỉ
    // cưỡi trên bản chốt có mốc thời gian. Chỉ mượn khi nhãn còn tươi; hết tươi thì thà không có gì còn
    // hơn có một cái nhãn nói về người đã rời micro từ lâu.
    const vendorCarriedRaw = vendorLanguage ? undefined : carriedVendorTag(finalAt);
    if (vendorCarriedRaw) carriedTags += 1;
    const routed = twoWay && router ? router.next({ text: transcript, vendorRaw: vendorLanguage, vendorCarriedRaw, gapMs, sourceLang }) : null;
    if (routed?.projected) languageProjections += 1;
    lastRouterReason = routed?.reason ?? '';
    const routedLang: Lang | null = routed ? routed.language : (opts?.sourceLanguage ?? null);

    // M13: the recogniser has just named the language that was at the microphone. Point the pause profile
    // at that speaker's bucket, so the next turn is measured against pauses taken in the same language.
    if (routedLang) pauseKey = routedLang;

    // M11: one microphone, two languages. A final in the OTHER language must not be glued onto the
    // buffer: the whole buffer settles its direction ONCE, so "Xin chào quý vị" + "皆様こんにちは" becomes a
    // single Japanese line and the Vietnamese half is translated as if it were Japanese. Closing the
    // buffer at the turn also removes the wait — the previous speaker's tail no longer sits out the whole
    // continuation window waiting for a continuation that will never come, which is most of the pause the
    // operator sees whenever the two languages alternate.
    // TASK 55: while the direction is locked there IS no other language — a Vietnamese phrase inside a
    // Japanese turn is a quotation and belongs in the same sentence, so the turn split stands down. The
    // real handover is the operator pressing the next segment, and that flushes the buffer explicitly.
    if (twoWay && !lockedSource && routedLang && segmentBuffer.trim()) {
      const held = decideFinalLanguage(segmentBuffer).language;
      if (held && held !== routedLang) {
        languageTurns += 1;
        flushSegment('turn-end');
      }
    }

    // M3: append to the segment buffer; the finalized sentence is not yet its own line.
    const hadWaitingText = segmentBuffer.trim().length > 0;
    // 04/08: the speaker carries on in lowercase ⇒ the full stop the recogniser added when it closed the
    // turn is invented, so drop it before joining. Leave it in and "Nếu mà tính. năng nó bật lên" is both
    // misspelled and counted as TWO sentences by TASK 26's paragraph rule, and refine is handed a stub.
    segmentBuffer = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, transcript, SEGMENT_MIN_CHARS), transcript);
    if (!segmentLid) segmentLid = `online-${++counter}`;
    // M11: settle the direction from the strongest evidence available rather than letting dirLangs guess
    // from the script at flush time. This is what finally routes toneless Vietnamese correctly — the
    // vendor heard it, we can only read it. The tracker is realigned too, so the next sticky fallback
    // (an "OK", a number) inherits the language actually being spoken.
    // TASK 55: a lock outranks the vendor's tag. The recogniser is right about what it HEARD; it is not
    // right about who is speaking, and a quoted phrase would otherwise settle the whole turn the wrong way.
    // 06/08: the `basis !== 'none'` condition that used to guard this is gone with the router. The old
    // decision could genuinely have nothing to say ("OK", a number, toneless Latin) and then dirLangs had
    // to guess from the script at flush time; the router always answers, and its answer — inertia, the
    // handover pause, the running order's lock — is strictly better informed than that guess ever was.
    if (twoWay && tracker && router && !lockedSource && routedLang) {
      settledDir.set(segmentLid, directionOf(routedLang));
      // The tracker mirrors the router's RUNNING direction, not this sentence's. The two differ on a
      // projected sentence: a third-language tag is borrowed for one line only and must not be allowed to
      // become the direction of the turn — that would build a second ratchet beside the one just removed.
      tracker.reset(router.current());
    }
    // R5: the arbiter has spoken for this sentence — release anything holding the loudspeaker for it.
    // Placed here rather than at flush time on purpose: this is the moment the DECISION exists, and the
    // whole point of the gate is that the decision and the display no longer have to happen together.
    if (routedLang) speakGate.settle(segmentLid, routedLang);
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
    // TASK 28 — ONE SENTENCE IS NOT A PARAGRAPH. Until now, the moment the buffer read as a finished
    // sentence it went out, so the hall received a column of one-sentence stubs and every translation lost
    // the sentence before it. A finished sentence now still has to reach 2–3 sentences before the line
    // breaks; if no continuation ever arrives, the continuation window below closes the paragraph — and a
    // genuinely long pause IS the right place to break.
    if (complete && planParagraphCut(buf).ready) {
      flushSegment('complete');
      return;
    }
    const held = Date.now() - segmentFirstFinalAt;
    // The soft ceiling may only fire when there is a legal place to cut — a sentence-ending mark that is
    // NOT at the very end (one at the end is what `complete` above already handles, and cutting there
    // leaves nothing behind).
    const softCeiling = buf.length >= segmentCharLimit(SEGMENT_MAX_CHARS, buf) || held >= SEGMENT_MAX_HOLD_MS;
    // A cut position that COINCIDES with the end of the buffer is not a cut position: cutting there leaves
    // nothing behind, i.e. it ships the whole fragment alone — the exact disease being treated. There has to
    // be a sentence-ending mark with TEXT STILL AFTER IT, or a full paragraph's worth. Neither ⇒ wait for
    // the hard ceiling.
    //
    // Without this, TASK 30 is only half done: "Nếu mà tính." satisfies the old test ON ITS OWN INVENTED
    // FULL STOP and is flushed alone three seconds later, no matter how long the continuation window is.
    const lastBreak = findLastStrongSentenceBreak(buf, true);
    const innerBreak = lastBreak > 0 && lastBreak < buf.trimEnd().length;
    if (softCeiling && (innerBreak || planParagraphCut(buf).ready)) {
      flushSegment('ceiling');
      return;
    }
    if (held >= SEGMENT_HARD_HOLD_MS) {
      flushSegment('ceiling'); // out of road: cutting mid-sentence beats a sentence that never appears
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
    // TASK 28 — the only LEGAL place to cut is immediately after a sentence-ending mark. This rule used to
    // apply only when the buffer was over-long; every ceiling expiry cut wherever the buffer stood.
    const cutAt = ((): number => {
      // 'stop' and 'turn-end' must NOT leave a remainder behind: one is shutting the session down, the
      // other has just handed the microphone to the other language. A remainder there would never find a
      // continuation, and would be glued to the next speaker's turn. Both keep the old behaviour.
      if (reason === 'stop' || reason === 'turn-end') {
        return text.length > segmentCharLimit(SEGMENT_MAX_CHARS, text) ? findLastStrongSentenceBreak(text, true) : 0;
      }
      const para = planParagraphCut(text);
      // A paragraph's worth is ready and the buffer holds more: the extra sentence opens the NEXT paragraph
      // instead of being crammed into this one.
      if (para.ready && para.cut < text.length) return para.cut;
      if (reason === 'complete') return 0;
      // A ceiling: fall back to the last sentence-ending mark. 0 means the buffer holds no whole sentence
      // at all — only the hard ceiling reaches that point, and cutting mid-sentence is the last resort
      // rather than the default.
      return findLastStrongSentenceBreak(text, true);
    })();
    if (cutAt > 0 && cutAt < text.length) {
      head = text.slice(0, cutAt).trim();
      remainder = text.slice(cutAt).trim();
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
    // TASK 34 — the operator's cursor is asked FIRST. When somebody sitting beside the stage has pointed
    // at a line, they are a better witness than any similarity score, and their line is released with a
    // much lower bar. `judgeGuided` still refuses when the sentence does not resemble the line at all:
    // a wrong cursor plus verbatim release puts entirely different words over the ballroom speakers.
    const guided = config.getGuided?.() ?? GUIDED_OFF;
    if (guided.armed) {
      const verdict = judgeGuided(guided, scriptSeedRows, head, config.getGuidedFloor?.() ?? GUIDED_FLOOR);
      if (verdict.kind === 'release') {
        guidedReleases += 1;
        // Deliberately NOT calling `scriptMatcher.accept()`. The two cursors are independent by design:
        // the automatic one only shifts a candidate's score by ±0.04–0.06, so letting it fall behind
        // costs almost nothing, whereas driving it from here would mean a disarm mid-ceremony hands the
        // matcher a position no evidence ever put it in.
        lastScriptReason = `dẫn tay · dòng ${guided.index + 1} (${verdict.score})`;
        emitLine({ lid, sourceText: head, targetText: verdict.target, interim: false, corrected: true });
        latency.markRefineShown(lid, performance.now());
        recordSessionLine(lid, finalizedAt, head, verdict.target, true);
        // R5: a HUMAN pointed at this line. That outranks the router, which is reading text off a machine
        // that was listening to a ballroom — so the gate is settled here rather than waited on, and the
        // voice goes out without asking. `verdict.language` is what to speak, so the source is the other.
        const guidedSource: Lang = verdict.language === 'vi' ? 'ja' : 'vi';
        speakGate.show(lid, guidedSource);
        speakGate.settle(lid, guidedSource);
        if (config.getSpeakEnabled?.()) void speakSnap(verdict.target, verdict.language, guidedSource, lid, order);
        // TASK 56: dòng đã lên tường, giờ tới lượt MC bên kia đọc bản dịch. Ngủ tới khi được bấm dòng sau.
        guidedDeafAtIndex = guided.index;
        guidedDeafSince = Date.now();
        // eslint-disable-next-line no-console
        console.info(`[onlineLane][guided] release lid=${lid} line=${guided.index + 1} score=${verdict.score}`);
        return true;
      }
      if (verdict.kind === 'mismatch') {
        guidedMisses += 1;
        // Deliberately NOT `return false` — fall through to the automatic matcher below. A cursor one
        // line behind the ceremony is the common case, and the matcher may well still find the right
        // line on its own; refusing here would make guided mode WORSE than leaving it off.
        //
        // And deliberately NOT writing `verdict.reason` into `lastScriptReason`: the sentence is about to
        // take the automatic path, and that path's own reason is the one the operator needs. The count in
        // the diagnostics line is what says the cursor is off; `guidedMisses` climbing while
        // `guidedReleases` stands still is the whole signal.
      }
    }
    if (!scriptMatcher) return false;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    let result: ScriptMatch;
    let heardLanguage: 'vi' | 'ja';
    try {
      // TASK 32: ask the script in the language the recogniser claimed AND in the other one. When the
      // other direction is the one that snaps, the script is the better witness: a human approved that
      // pair hours ago, whereas the language label came from a machine listening to a noisy ballroom.
      const both = scriptMatcher.matchBothWays(head, dl.source);
      result = both.result;
      heardLanguage = both.language;
    } catch {
      return false; // a fault in the matcher must never cost the session a sentence
    }
    lastScriptReason = result.reason;
    if (result.band !== 'snap') {
      if (result.band === 'suggest') scriptSuggests += 1;
      return false;
    }
    // The row must translate INTO the language the OTHER side of the room needs. Normally that is
    // `dl.target`. When the script overruled the recogniser, `dl` is describing the wrong direction
    // entirely, so the script's own pair decides — that is the whole point of overruling it.
    const flipped = heardLanguage !== dl.source;
    const speakLanguage = flipped ? result.targetLanguage : dl.target;
    if (result.targetLanguage !== speakLanguage) return false;
    const target = result.scriptTarget.trim();
    if (!target) return false;
    if (flipped) scriptFlips += 1;
    // R5: the direction this line was actually BUILT in — `heardLanguage`, not `dl.source`, because when
    // the script overruled the recogniser those two differ and the script is the one that won.
    speakGate.show(lid, heardLanguage);
    // And when it overruled, it also ANSWERS the router's question: a human approved that pair hours ago
    // (TASK 32). Settling here stops the gate from reading a deliberate, better-evidenced flip as the
    // router disagreeing and silencing a line that is correct.
    if (flipped) speakGate.settle(lid, heardLanguage);

    scriptMatcher.accept(result); // the script cursor advances only on a line actually used
    scriptSnaps += 1;
    emitLine({ lid, sourceText: head, targetText: target, interim: false, corrected: true });
    latency.markRefineShown(lid, performance.now()); // final quality reached, just without the round trip
    recordSessionLine(lid, finalizedAt, head, target, true); // answered by the approved script, word for word
    // `speakLanguage`, not `dl.target`: when the script overruled the recogniser, `dl.target` names the
    // language this line is NOT in, and the voice would read approved Japanese with a Vietnamese voice.
    if (config.getSpeakEnabled?.()) void speakSnap(target, speakLanguage, heardLanguage, lid, order);
    // eslint-disable-next-line no-console
    console.info(`[onlineLane][script] snap lid=${lid} score=${result.score} line=${result.index + 1}/${scriptRows}`);
    return true;
  }

  // Hold a snap's VOICE — never its subtitle — until every sentence spoken before it has left refine,
  // so the hall hears the sentences in the order they were said. Bounded: see SNAP_TTS_ORDER_WAIT_MS.
  async function speakSnap(text: string, language: Lang, source: Lang, lid: string, order: number): Promise<void> {
    const gen = sessionGen;
    // R5 — the direction gate comes FIRST, before the ordering wait. Two waits, two different questions:
    // this one asks "is this sentence pointed the right way", the one below asks "is it this sentence's
    // turn to be heard". Asking them in this order means a sentence that is never going to be spoken does
    // not spend a second and a half holding up the queue behind it.
    const settled = await speakGate.wait(lid, DIRECTION_SETTLE_WAIT_MS, source);
    if (gen !== sessionGen) return;
    if (settled.changed) { voiceDirectionHolds += 1; speakGate.forget(lid); return; }
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
    speakGate.forget(lid);
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
    // R5: the direction this sentence is being TRANSLATED in, recorded before the round trip — so that
    // when the voice asks the gate 1-2 seconds later there is something concrete for the router's verdict
    // to be compared against: "the wall already says this; is it still true?"
    speakGate.show(lid, dl.source);
    const body = JSON.stringify({
      sourceText: head,
      sourceLanguage: dl.source,
      targetLanguage: dl.target,
      refineStage: 'refine',
      recentFinals: priorFinals,
      sessionBrief: (config.getBrief?.() || '').trim() || o.brief,
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
          // R5 — the subtitle above went out already. Only now does the voice ask the router whether this
          // sentence was pointed the right way, and a disagreement SILENCES it: the translation was made
          // in the other direction, so it is not a right sentence with a wrong accent, it is a backwards
          // sentence. The hall reads it instead of hearing it, which is the recoverable half of the two.
          const settled = await speakGate.wait(lid, DIRECTION_SETTLE_WAIT_MS, dl.source);
          if (gen !== sessionGen) return;
          if (settled.changed) {
            voiceDirectionHolds += 1;
            speakGate.forget(lid);
            return;
          }
          speakGate.forget(lid);
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

    // TASK 29: the ghost windows follow the threshold the SERVER says it applied. Latched here rather than
    // read from the knob, because the server clamps and a client-side number can be out of range.
    appliedPauseSecs = typeof session.pauseSecs === 'number' ? session.pauseSecs : FALLBACK_PAUSE_SECS;

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
    // The router is seeded from the same chosen language and, like the tracker, does not survive the
    // session — a new Start is a new room. `baseMode` is decided a few lines down, once we know whether
    // there is a running order in this session at all.
    router = createDirectionRouter(startOpts.sourceLanguage);
    lastAcceptedFinalAt = 0;
    speakGate.reset(); // R5 — wakes anything a previous session left waiting, then forgets every sentence

    settledDir.clear();
    lockedSource = null; // a new session starts on auto-detect; the running order re-arms it per segment
    guidedDeafAtIndex = -1;
    guidedDeafSince = 0;
    running = true;
    sessionGen += 1; // new session generation — stale fetches from any prior session are now ignored
    sessionReady = false;
    reconnectAttempts = 0;
    counter = 0;
    segmentBuffer = '';
    segmentLid = null;
    voicedWindow.length = 0;
    recentLevels = []; // a new session never shows the previous room's VU peak
    echoMemory = [];
    echoDrops = 0;
    echoTrims = 0;
    // Phiên mới là căn phòng mới: nhãn của buổi trước không được quyết chiều của câu đầu tiên buổi này.
    lastVendorTag = '';
    lastVendorTagAt = 0;
    carriedTags = 0;
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
    // 06/08 — a script IS a running order, and a running order is the whole reason `base` means anything.
    //
    // With one (a ceremony), a pause returns the direction to the base: the programme says this part is in
    // Vietnamese, and that outranks whoever was talking a moment ago. Without one (an internal meeting),
    // `base` is only the direction somebody picked when they switched the machine on, and returning to it
    // on every breath would drag a Japanese guest's five-minute explanation back to Vietnamese at each
    // pause. So there a pause REOPENS the question instead of answering it. See BaseMode in directionRouter.
    router.setBaseMode(scriptRows ? 'anchor' : 'free');
    scriptSeedRows = scriptSeed; // TASK 34 — guided mode addresses rows by number, not by candidate
    // TASK 6: the names on the approved rows are known hours before the ceremony — prime the recogniser
    // with them instead of letting it guess at them live. Latched here with the rows themselves, so the
    // corpus rebuilt at each dial keeps using the script this session actually started with.
    scriptKeytermCorpus = scriptSeed.length ? scriptKeyterms(scriptSeed, SCRIPT_KEYTERM_LIMIT).join('\n') : '';
    scriptSnaps = 0;
    scriptSuggests = 0;
    scriptFlips = 0;
    guidedReleases = 0;
    guidedMisses = 0;
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
    promotions = 0;
    // Ba số của cái trần 25s cũng phải về 0 ở phiên mới, y như `manualCommits` ngay trên: đọc "trần chờ
    // khe im 14 lần" mà 14 đó là của buổi tổng duyệt sáng nay thì con số nói dối.
    forceGapWaits = 0;
    forceGapWaitMaxMs = 0;
    ceilingNoops = 0;
    languageProjections = 0;
    voiceDirectionHolds = 0;
    lastRouterReason = '';
    // Phiên mới là căn phòng mới. `systemSourceLive` được đặt lại thành true/false ở `ensureCapture`, khi
    // biết chắc luồng chia sẻ có track tiếng hay không — ở đây chỉ tắt, không được đoán là còn sống.
    sourceAttributor.reset();
    systemSourceLive = false;
    sourceVerdicts = 0;
    lastSourceReason = '';
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
      droppedByReason: { ...droppedByReason },
      asrTag: (() => {
        const s = codec?.stats?.();
        return {
          waitLastMs: s?.tagWaitLastMs ?? -1,
          waitMaxMs: s?.tagWaitMaxMs ?? 0,
          timeouts: s?.tagTimeouts ?? 0,
          plainFinals: s?.plainFinals ?? 0,
          taggedFinals: s?.taggedFinals ?? 0,
        };
      })(),
      draftCalls,
      draftSkipped: { ...draftSkipped },
      refineCalls,
      refineRetries,
      silentReconnects,
      ttsQueueLength: getTtsQueueLength(),
      gateActive,
      gatedMs: Math.round(gatedMs),
      listenPaused: config.getListenPaused?.() ?? false,
      guidedDeaf: guidedDeafAtIndex >= 0,
      pausedMs: Math.round(pausedMs),
      nonSpeechDrops,
      lastNonSpeechReason,
      echoDrops,
      echoTrims,
      carriedTags,
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
      scriptFlips,
      guidedReleases,
      guidedMisses,
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
      lastScriptReason,
      manualCommits,
      promotions,
      forceGapWaits,
      forceGapWaitMaxMs,
      ceilingNoops,
      languageProjections,
      voiceDirectionHolds,
      lastRouterReason,
      systemSourceLive,
      sourceVerdicts,
      lastSourceReason,
      routerBasis: router?.stats().byBasis ?? {},
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

  /**
   * TASK 55 — pin (or release) the translation direction for the segment now running.
   *
   * `'vi' | 'ja'` locks; `null` returns to auto-detect. Changing it closes the buffer first: the words
   * still waiting belong to the PREVIOUS speaker and must not be finished in the next speaker's language.
   * The operator's press is better evidence of a handover than any guess made from the text.
   */
  function lockLanguage(language: Lang | null): void {
    if (!twoWay || !tracker) return;
    if (lockedSource === language) return;
    if (segmentBuffer.trim()) flushSegment('turn-end');
    lockedSource = language;
    if (language) tracker.reset(language);
    // The router keeps its own lock so that `router.current()` stays truthful while one is on, and so the
    // direction the operator pinned is the one the router CARRIES ON WITH when the lock is released — a
    // release must not hand the room back to whatever was running before the segment started.
    router?.lock(language);
  }

  return { id: 'online', start, stop, getDiagnostics, saveSession, lockLanguage };
}
