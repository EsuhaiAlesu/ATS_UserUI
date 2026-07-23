// src/lib/lanes/online/latencyTracker.ts
//
// Phase 4 / M8 — per-segment latency timing. One SegmentTiming per lid; every 10 finalized
// segments emit median + p90 of firstPartial→draft, final→refine, final→tts (missing marks skipped).

export type SegmentTiming = {
  lid: string;
  firstPartialAt?: number; // first partial of the sentence
  finalAt?: number; // transcription.completed received / segment flushed
  draftShownAt?: number; // first draft translation displayed (if any)
  refineShownAt?: number; // refined translation displayed (corrected)
  ttsStartAt?: number; // voice playback started (if Phase 3 exists)
};

export interface LatencyReport {
  draftP50: number | null;
  draftP90: number | null;
  refineP50: number | null;
  refineP90: number | null;
  ttsP50: number | null;
  ttsP90: number | null;
  samples: number;
}

const LATENCY_REPORT_EVERY_SEGMENTS = 10;

// Nearest-rank percentile on an ascending array.
function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  const idx = Math.min(sorted.length - 1, Math.max(0, rank));
  return Math.round(sorted[idx]);
}

export interface LatencyTracker {
  markFirstPartial(lid: string, at: number): void;
  markFinal(lid: string, at: number): void;
  markDraftShown(lid: string, at: number): void;
  markRefineShown(lid: string, at: number): void;
  markTtsStart(lid: string, at: number): void;
  getReport(): LatencyReport;
  reset(): void;
}

export function createLatencyTracker(onReport?: (report: LatencyReport) => void): LatencyTracker {
  const timings = new Map<string, SegmentTiming>();
  let refineShownCount = 0;

  const get = (lid: string): SegmentTiming => {
    let t = timings.get(lid);
    if (!t) {
      t = { lid };
      timings.set(lid, t);
    }
    return t;
  };

  function computeReport(): LatencyReport {
    const draft: number[] = [];
    const refine: number[] = [];
    const tts: number[] = [];
    for (const t of timings.values()) {
      if (t.firstPartialAt !== undefined && t.draftShownAt !== undefined && t.draftShownAt >= t.firstPartialAt) {
        draft.push(t.draftShownAt - t.firstPartialAt);
      }
      if (t.finalAt !== undefined && t.refineShownAt !== undefined && t.refineShownAt >= t.finalAt) {
        refine.push(t.refineShownAt - t.finalAt);
      }
      if (t.finalAt !== undefined && t.ttsStartAt !== undefined && t.ttsStartAt >= t.finalAt) {
        tts.push(t.ttsStartAt - t.finalAt);
      }
    }
    draft.sort((a, b) => a - b);
    refine.sort((a, b) => a - b);
    tts.sort((a, b) => a - b);
    return {
      draftP50: percentile(draft, 50),
      draftP90: percentile(draft, 90),
      refineP50: percentile(refine, 50),
      refineP90: percentile(refine, 90),
      ttsP50: percentile(tts, 50),
      ttsP90: percentile(tts, 90),
      samples: timings.size,
    };
  }

  return {
    markFirstPartial(lid, at) {
      const t = get(lid);
      if (t.firstPartialAt === undefined) t.firstPartialAt = at;
    },
    markFinal(lid, at) {
      const t = get(lid);
      if (t.finalAt === undefined) t.finalAt = at;
    },
    markDraftShown(lid, at) {
      const t = get(lid);
      if (t.draftShownAt === undefined) t.draftShownAt = at;
    },
    markRefineShown(lid, at) {
      const t = get(lid);
      if (t.refineShownAt !== undefined) return; // first-wins; counts once toward the report cadence
      t.refineShownAt = at;
      refineShownCount += 1;
      if (refineShownCount % LATENCY_REPORT_EVERY_SEGMENTS === 0) onReport?.(computeReport());
    },
    markTtsStart(lid, at) {
      const t = get(lid);
      if (t.ttsStartAt === undefined) t.ttsStartAt = at;
    },
    getReport() {
      return computeReport();
    },
    reset() {
      timings.clear();
      refineShownCount = 0;
    },
  };
}
