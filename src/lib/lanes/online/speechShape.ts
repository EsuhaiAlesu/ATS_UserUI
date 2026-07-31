// speechShape.ts — M13: is the loud thing in the hall actually a PERSON SPEAKING?
//
// The near-mic gate in pcm16Capture.ts measures LOUD vs QUIET. That is the right question for a hand mic
// held to the mouth and the wrong one for a hall: music, applause, a video soundtrack and a lion dance are
// all LOUD, so the gate lets them through untouched, and every downstream guard that counts "voiced
// milliseconds" then agrees that somebody must be speaking. That is where the remaining hallucinations come
// from — the recogniser is handed four seconds of music and writes down words nobody said, frequently in a
// third language, which is also how a wrong language reaches the voice.
//
// This module asks the other question — does the sound have the SHAPE of speech? — from two cheap measures
// taken over a rolling window of the very audio we are already sending:
//
//   • gaps — speech is syllables separated by stop closures and breaths, so across four seconds its quiet
//     moments sit far below its loud ones. Sustained music and applause hold one level.
//   • rate — how often the waveform crosses zero. Applause and hiss cross constantly; a bass line or a
//     room hum barely crosses at all. Speech sits in between, and stays there even for a sibilant
//     language, because the measure below is a MEDIAN over the window rather than a peak.
//
// DELIBERATELY ONE-SIDED. A verdict of "not speech" only ever DROPS A SENTENCE. It never cuts the audio on
// the wire, so it can never take the middle out of a word, and the worst a wrong verdict can cost is one
// line — against a ghost sentence that would otherwise be translated and READ ALOUD to the hall. Every
// threshold below is therefore set so that anything ambiguous is called speech: this accuses only when the
// evidence is unmistakable, and says nothing at all until it has heard enough.

/** Same window the voiced-evidence guard uses, so both guards judge the same stretch of sound. */
export const SHAPE_WINDOW_MS = 4_000;
/** 32ms @16kHz — short enough to fall INSIDE one syllable, which is what makes the gaps visible. */
export const SHAPE_SUBFRAME = 512;
/** Below this a sub-frame is silence, not sound; it can never be evidence of non-speech. */
export const SHAPE_ACTIVE_RMS = 0.01;
/** ≈1s of audible sound must be on the books before any verdict other than "speech" is allowed. */
export const SHAPE_MIN_ACTIVE = 32;
/** loud/quiet ratio below this = the level never moves = no syllable rhythm at all. */
export const SHAPE_GAP_RATIO = 2.5;
/**
 * …and the rule may only be applied at all when this share of the window is audible end to end.
 *
 * The one way the gap rule could take a real sentence is a hall whose background noise sits so high that
 * the speaker's own quiet moments never drop below it — the level then looks as steady as music. Requiring
 * an unbroken wall of sound first costs nothing against the target (a musical number IS unbroken) and
 * takes the rule off the table entirely for speech that has any audible break in four seconds.
 */
export const SHAPE_STEADY_SHARE = 0.8;
/** Median crossing rate at or above this ≈ 2.8kHz of hiss — applause, not words. */
export const SHAPE_HISS_ZCR = 0.35;
/** Median crossing rate at or below this ≈ 96Hz — below any human voice; a hum or a held bass note. */
export const SHAPE_HUM_ZCR = 0.012;

export interface SpeechShapeVerdict {
  speechLike: boolean;
  /** Vietnamese, operator-facing, shown in diagnostics — '' when the verdict is "speech". */
  reason: string;
}

export interface SpeechShapeMonitor {
  /** Feed one captured packet of PCM16 @16kHz. Only ever pass audio the microphone REALLY heard. */
  observe(pcm: ArrayBuffer | Int16Array, at?: number): void;
  verdict(at?: number): SpeechShapeVerdict;
  reset(): void;
}

const SPEECH: SpeechShapeVerdict = { speechLike: true, reason: '' };

interface Frame {
  at: number;
  rms: number;
  zcr: number;
}

/**
 * Split one packet into 32ms sub-frames and measure each. Exported because these two numbers are the whole
 * basis of the verdict, and a threshold nobody can measure is a threshold nobody can trust.
 */
export function analyzeSubframes(samples: Int16Array): { rms: number; zcr: number }[] {
  const out: { rms: number; zcr: number }[] = [];
  for (let start = 0; start + SHAPE_SUBFRAME <= samples.length; start += SHAPE_SUBFRAME) {
    let sumSq = 0;
    let crossings = 0;
    let prev = samples[start];
    for (let i = start; i < start + SHAPE_SUBFRAME; i++) {
      const cur = samples[i];
      const s = cur / 32768;
      sumSq += s * s;
      if (cur >= 0 !== prev >= 0) crossings += 1;
      prev = cur;
    }
    out.push({ rms: Math.sqrt(sumSq / SHAPE_SUBFRAME), zcr: crossings / (SHAPE_SUBFRAME - 1) });
  }
  return out;
}

/** Nearest-rank percentile over an already-sorted ascending list. */
function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

export function createSpeechShapeMonitor(): SpeechShapeMonitor {
  let frames: Frame[] = [];

  function prune(now: number): void {
    const cutoff = now - SHAPE_WINDOW_MS;
    while (frames.length && frames[0].at < cutoff) frames.shift();
  }

  return {
    observe(pcm: ArrayBuffer | Int16Array, at: number = Date.now()): void {
      const samples = pcm instanceof Int16Array ? pcm : new Int16Array(pcm);
      for (const f of analyzeSubframes(samples)) frames.push({ at, rms: f.rms, zcr: f.zcr });
      prune(at);
    },

    verdict(at: number = Date.now()): SpeechShapeVerdict {
      prune(at);
      // Only audible sub-frames can testify. The quiet ones still count for the gap measure below — they
      // ARE the gaps — but a window that is mostly silence has nothing to accuse.
      const active = frames.filter((f) => f.rms >= SHAPE_ACTIVE_RMS);
      if (active.length < SHAPE_MIN_ACTIVE) return SPEECH;

      // Median, not mean: one sibilant or one thump must not decide four seconds.
      const zcrs = active.map((f) => f.zcr).sort((a, b) => a - b);
      const zcr = percentile(zcrs, 0.5);
      if (zcr >= SHAPE_HISS_ZCR) return { speechLike: false, reason: 'âm rào rào (vỗ tay / nhiễu)' };
      if (zcr <= SHAPE_HUM_ZCR) return { speechLike: false, reason: 'âm ù trầm (nhạc nền)' };

      // Gaps, over the WHOLE window including its silences. When the near-mic gate is doing its job the
      // quiet end is a flat zero and the ratio is infinite — speech, correctly. The rule only bites when
      // the sound never breaks AND its level never falls, which is exactly a sustained hall sound.
      if (active.length / frames.length < SHAPE_STEADY_SHARE) return SPEECH;
      const rmsSorted = frames.map((f) => f.rms).sort((a, b) => a - b);
      const quiet = percentile(rmsSorted, 0.1);
      const loud = percentile(rmsSorted, 0.9);
      if (quiet > 0 && loud / quiet < SHAPE_GAP_RATIO) {
        return { speechLike: false, reason: 'âm đều, không có nhịp nói' };
      }
      return SPEECH;
    },

    reset(): void {
      frames = [];
    },
  };
}
