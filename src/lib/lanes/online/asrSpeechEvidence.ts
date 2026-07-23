export const ASR_PARTIAL_MIN_VOICED_MS = 96;
export const ASR_FINAL_MIN_VOICED_MS = 160;

export type EvidenceGatedAsrProvider = 'qwen3';

export function providerNeedsSpeechEvidence(provider: string): provider is EvidenceGatedAsrProvider {
  return provider === 'qwen3';
}

export function hasClearSpeechEvidence(voicedMs: number, minimumMs: number) {
  return Number.isFinite(voicedMs) && voicedMs >= minimumMs;
}
