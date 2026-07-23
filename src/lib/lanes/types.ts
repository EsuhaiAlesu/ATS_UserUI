// Shared interface between the two interpretation lanes (offline / online).
// This file is the TREATY between the lanes — see CLAUDE.md rule #3. Only change
// it with explicit user confirmation, and always state the impact on both lanes.

export type LaneId = 'offline' | 'online';
export type LaneStatus = 'idle' | 'connecting' | 'ready' | 'listening' | 'reconnecting' | 'error' | 'stopped';

export interface LaneLine {
  lid: string;
  sourceText: string;       // source text (ASR-corrected version when available)
  targetText: string;       // translation; '' while not yet translated
  interim: boolean;         // true = still being spoken, may change
  corrected: boolean;       // true = refined (equivalent to line_update corrected)
  at: number;
}

export interface LaneEvents {
  onStatus(status: LaneStatus, detail?: string): void;
  onLine(line: LaneLine): void;        // create OR update by lid (upsert)
  onLevel(v: number): void;            // 0..1, ~10 ticks/second
  onError(message: string): void;
}

export interface LaneController {
  readonly id: LaneId;
  // `ttsGate` (Phase 3) is ADDITIVE + OPTIONAL: the online lane's half-duplex anti-feedback
  // gate mode. Offline-lane controllers ignore it. Adding it here is backward-compatible.
  start(opts: { sourceLanguage: 'vi' | 'ja'; targetLanguage: 'vi' | 'ja'; terms?: string; brief?: string; ttsGate?: 'auto' | 'always' | 'off' }): Promise<void>;
  stop(): Promise<void>;
}
