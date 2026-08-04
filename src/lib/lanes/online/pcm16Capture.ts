// src/lib/lanes/online/pcm16Capture.ts
//
// Production capture pipeline for the ONLINE lane (Phase 1 / M1). All DSP runs on the
// audio rendering thread inside an AudioWorkletProcessor:
//   raw mic quantum (device rate)
//     → VU level (peak, pre-gate)         → onLevel(~10/s)
//     → near-mic noise gate (hangover)    → gated samples (silence kept, not dropped)
//     → stateful linear resampler → 16kHz → 4096-sample Int16 packets (~256ms)
//     → voiced-sample count per packet    → voicedMs (speech evidence for M4)
// The resampler KEEPS STATE across render quanta (`lastSample`, `resampleAccumulator` are
// processor fields, never locals in process()) — otherwise 44.1kHz devices click each quantum.

export type MicSensitivity = 'auto' | 'close' | 'medium' | 'far';

// Voice-floor resolver shared by the worklet AND the unit tests. Self-contained ON PURPOSE — its
// compiled source is injected into the AudioWorklet via toString(), where module scope does not exist,
// so it must capture nothing (every constant lives inside the function body).
export function resolveVoiceFloor(sensitivity: string, noiseRms: number): { rms: number; peak: number } {
  const CLOSE_RMS = 0.012;          // the original hard-coded tuning — a mic right at the mouth
  const PEAK_RATIO = 0.035 / 0.012; // keep that tuning's peak/rms proportion at every sensitivity
  let rms: number;
  if (sensitivity === 'far') rms = CLOSE_RMS * 0.25;
  else if (sensitivity === 'medium') rms = CLOSE_RMS * 0.5;
  else if (sensitivity === 'auto') {
    // Adapt to THIS mic: sit a fixed ratio above the learned noise floor — never above the close-mic
    // tuning (a hot mic keeps today's behaviour), never down into digital silence (a suppressed floor
    // of ~0 must not make breath count as speech).
    const noise = Number.isFinite(noiseRms) && noiseRms > 0 ? noiseRms : 0.002;
    rms = Math.min(CLOSE_RMS, Math.max(0.003, noise * 3.5));
  } else rms = CLOSE_RMS; // unknown value → the conservative original
  return { rms, peak: rms * PEAK_RATIO };
}

const WORKLET_SRC = `
class Pcm16Tap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputSampleRate = sampleRate;   // AudioWorkletGlobalScope global (device rate)
    this.outputSampleRate = 16000;
    this.ratioInc = this.outputSampleRate / this.inputSampleRate; // output samples per input sample
    this.nearMicGateEnabled = true;
    this.micSensitivity = 'auto';
    this.resolveVoiceFloor = (${resolveVoiceFloor.toString()});

    // --- resampler state (kept ACROSS render quanta) ---
    this.lastSample = 0;
    this.resampleAccumulator = 0;

    // --- output packet accumulation (4096 samples @16kHz ≈ 256ms) ---
    this.outBuffer = new Int16Array(4096);
    this.outCount = 0;
    this.voicedCount = 0;

    // --- near-mic noise gate state ---
    this.noiseRms = 0.002;
    this.hangoverSamples = 0;
    this.hangoverSamplesMax = Math.round(0.360 * this.inputSampleRate); // 360ms hangover

    // --- VU throttle (~10 ticks/second), peak-based, measured BEFORE gating ---
    this.levelWindowPeak = 0;
    this.levelWindowSamples = 0;
    this.levelWindowMax = Math.round(this.inputSampleRate / 10);

    this.port.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === 'configure') {
        if (typeof d.inputSampleRate === 'number' && d.inputSampleRate > 0) this.inputSampleRate = d.inputSampleRate;
        if (typeof d.outputSampleRate === 'number' && d.outputSampleRate > 0) this.outputSampleRate = d.outputSampleRate;
        if (typeof d.nearMicGateEnabled === 'boolean') this.nearMicGateEnabled = d.nearMicGateEnabled;
        if (typeof d.micSensitivity === 'string') this.micSensitivity = d.micSensitivity;
        this.ratioInc = this.outputSampleRate / this.inputSampleRate;
        this.hangoverSamplesMax = Math.round(0.360 * this.inputSampleRate);
        this.levelWindowMax = Math.round(this.inputSampleRate / 10);
      }
    };
  }

  flushPacket() {
    const buf = this.outBuffer.buffer;
    const voicedMs = this.voicedCount / 16; // 16 samples per ms @16kHz
    this.port.postMessage({ type: 'packet', pcm: buf, voicedMs: voicedMs }, [buf]);
    this.outBuffer = new Int16Array(4096); // previous buffer was transferred away
    this.outCount = 0;
    this.voicedCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const ch = input && input[0];
    if (!ch || ch.length === 0) return true;
    const n = ch.length;

    // --- metrics on the RAW quantum (before gating) ---
    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < n; i++) {
      const s = ch[i];
      sumSq += s * s;
      const a = s < 0 ? -s : s;
      if (a > peak) peak = a;
    }
    const rms = Math.sqrt(sumSq / n);

    // --- VU level (~10/s), peak-based, pre-gate ---
    if (peak > this.levelWindowPeak) this.levelWindowPeak = peak;
    this.levelWindowSamples += n;
    if (this.levelWindowSamples >= this.levelWindowMax) {
      this.port.postMessage({ type: 'level', value: this.levelWindowPeak < 1 ? this.levelWindowPeak : 1 });
      this.levelWindowPeak = 0;
      this.levelWindowSamples = 0;
    }

    // --- speech-activity detection runs ALWAYS (measure voiced), independent of whether we CUT ---
    // Splitting measuring from gating: turning the near-mic gate off must NOT silently disable the M4
    // hallucination guard, which counts voiced ms (11.3). The recogniser runs its own VAD — our gate must
    // not fight it, so cutting is opt-in and measuring is unconditional.
    const floor = this.resolveVoiceFloor(this.micSensitivity, this.noiseRms);
    const isSilent = rms < floor.rms && peak < floor.peak && rms < this.noiseRms * 3.2;
    if (isSilent) {
      this.noiseRms = this.noiseRms * 0.95 + rms * 0.05;
      this.hangoverSamples -= n;
      if (this.hangoverSamples < 0) this.hangoverSamples = 0;
    } else {
      this.hangoverSamples = this.hangoverSamplesMax;
    }
    const voiced = this.hangoverSamples > 0;          // speech evidence — measured regardless of the gate
    const cut = this.nearMicGateEnabled && !voiced;   // only cut samples when the operator asked for it

    // --- stateful linear resample to 16kHz, apply cut, accumulate, count voiced ---
    for (let i = 0; i < n; i++) {
      const cur = ch[i];
      this.resampleAccumulator += this.ratioInc;
      while (this.resampleAccumulator >= 1) {
        this.resampleAccumulator -= 1;
        const frac = 1 - this.resampleAccumulator;
        let interp = this.lastSample + (cur - this.lastSample) * frac;
        if (cut) interp = 0;
        const clamped = interp < -1 ? -1 : (interp > 1 ? 1 : interp);
        this.outBuffer[this.outCount++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        if (voiced) this.voicedCount++;
        if (this.outCount >= 4096) this.flushPacket();
      }
      this.lastSample = cur;
    }

    return true;
  }
}
registerProcessor('pcm16-tap', Pcm16Tap);
`;

export interface CapturePacket {
  pcm: ArrayBuffer;
  voicedMs: number;
}

export interface CaptureHandle {
  stop(): void;
  sampleRate: number; // the AudioContext rate actually achieved (diagnostics — 16000 when honoured)
}

export async function startPcm16Capture(
  deviceId: string | undefined,
  onPacket: (packet: CapturePacket) => void,
  onLevel: (v: number) => void,
  options?: { nearMicGate?: boolean; micSensitivity?: MicSensitivity },
): Promise<CaptureHandle> {
  // The operator's chosen microphone, never the browser default (`exact` — with `ideal`, Windows
  // switching its default device mid-event silently switches the mic under us). Mono; keep browser DSP.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  // Everything after getUserMedia can throw (the worklet load throws on some machines). If it does, GIVE
  // THE MICROPHONE BACK before re-throwing (11.3) — otherwise the recording light stays on and the tab
  // holds the device until the page is reloaded mid-event.
  let ctx: AudioContext | null = null;
  try {
    // Ask for a 16kHz context so the browser's proper anti-aliased resampler does 48k→16k, not the
    // worklet's cheap linear one (which folds >8kHz content back into the speech band). Fall back to the
    // default rate if the platform refuses.
    try { ctx = new AudioContext({ sampleRate: 16000 }); } catch { ctx = new AudioContext(); }
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* createMediaStreamSource still pulls once audio flows */ }
    }
    const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    const src = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, 'pcm16-tap', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    node.port.onmessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; pcm?: ArrayBuffer; voicedMs?: number; value?: number } | null;
      if (!d) return;
      if (d.type === 'packet' && d.pcm) onPacket({ pcm: d.pcm, voicedMs: d.voicedMs ?? 0 });
      else if (d.type === 'level') onLevel(d.value ?? 0);
    };
    node.port.postMessage({
      type: 'configure',
      inputSampleRate: ctx.sampleRate,
      outputSampleRate: 16000,
      nearMicGateEnabled: options?.nearMicGate ?? true,
      micSensitivity: options?.micSensitivity ?? 'auto',
    });
    src.connect(node);
    node.connect(ctx.destination); // worklet writes no output → silence; keeps the graph pulling.
    const context = ctx;
    return {
      sampleRate: context.sampleRate,
      stop() {
        node.port.onmessage = null;
        try { src.disconnect(); node.disconnect(); } catch { /* ignore */ }
        stream.getTracks().forEach((t) => t.stop());
        void context.close();
      },
    };
  } catch (err) {
    // Release the hardware (and close the context if it was created) before the error propagates.
    stream.getTracks().forEach((t) => t.stop());
    if (ctx) { try { void ctx.close(); } catch { /* already closing */ } }
    throw err;
  }
}
