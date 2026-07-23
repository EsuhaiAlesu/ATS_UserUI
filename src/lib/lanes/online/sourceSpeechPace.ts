export type SourceSpeechPaceLabel = 'slow' | 'normal' | 'fast' | 'very_fast';

export type SourceSpeechPace = {
  label: SourceSpeechPaceLabel;
  unitsPerSecond: number;
  durationMs: number;
  speechUnits: number;
  confidence: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Estimate source delivery pace from Qwen's text-so-far and the actual mic
 * speech window. Vietnamese whitespace tokens are a useful syllable proxy.
 */
export function estimateSourceSpeechPace(text: string, durationMs: number): SourceSpeechPace | undefined {
  const speechUnits = text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  if (speechUnits < 3 || !Number.isFinite(durationMs) || durationMs < 500) return undefined;

  const safeDurationMs = clamp(durationMs, 500, 60_000);
  const unitsPerSecond = speechUnits / (safeDurationMs / 1_000);
  const label: SourceSpeechPaceLabel = unitsPerSecond < 2.3
    ? 'slow'
    : unitsPerSecond < 3.6
      ? 'normal'
      : unitsPerSecond < 4.8
        ? 'fast'
        : 'very_fast';
  const confidence = clamp(Math.min(speechUnits / 12, safeDurationMs / 3_000), 0.2, 1);

  return {
    label,
    unitsPerSecond: Number(unitsPerSecond.toFixed(2)),
    durationMs: Math.round(safeDurationMs),
    speechUnits,
    confidence: Number(confidence.toFixed(2)),
  };
}
