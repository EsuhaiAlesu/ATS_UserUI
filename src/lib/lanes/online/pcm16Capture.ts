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

const WORKLET_SRC = `
class Pcm16Tap extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputSampleRate = sampleRate;   // AudioWorkletGlobalScope global (device rate)
    this.outputSampleRate = 16000;
    this.ratioInc = this.outputSampleRate / this.inputSampleRate; // output samples per input sample
    this.nearMicGateEnabled = true;

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

    // --- near-mic noise gate (per quantum); gated frames become silence, NOT dropped ---
    let gateOpen = true;
    if (this.nearMicGateEnabled) {
      const isSilent = rms < 0.012 && peak < 0.035 && rms < this.noiseRms * 3.2;
      if (isSilent) {
        this.noiseRms = this.noiseRms * 0.95 + rms * 0.05;
        this.hangoverSamples -= n;
        if (this.hangoverSamples < 0) this.hangoverSamples = 0;
      } else {
        this.hangoverSamples = this.hangoverSamplesMax;
      }
      gateOpen = this.hangoverSamples > 0;
    }

    // --- stateful linear resample to 16kHz, apply gate, accumulate, count voiced ---
    for (let i = 0; i < n; i++) {
      const cur = ch[i];
      this.resampleAccumulator += this.ratioInc;
      while (this.resampleAccumulator >= 1) {
        this.resampleAccumulator -= 1;
        const frac = 1 - this.resampleAccumulator;
        let interp = this.lastSample + (cur - this.lastSample) * frac;
        if (!gateOpen) interp = 0;
        const clamped = interp < -1 ? -1 : (interp > 1 ? 1 : interp);
        this.outBuffer[this.outCount++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        if (gateOpen) this.voicedCount++;
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
}

export async function startPcm16Capture(
  deviceId: string | undefined,
  onPacket: (packet: CapturePacket) => void,
  onLevel: (v: number) => void,
  options?: { nearMicGate?: boolean },
): Promise<CaptureHandle> {
  // Our gate runs AFTER the browser's own processing, so keep the browser DSP on.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  // Default-rate context: the worklet resamples to 16k internally (keeps resampler state).
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      /* ignore — createMediaStreamSource still pulls once audio flows */
    }
  }
  const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
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
  });
  src.connect(node);
  node.connect(ctx.destination); // worklet writes no output → silence; keeps the graph pulling.
  return {
    stop() {
      node.port.onmessage = null;
      try {
        src.disconnect();
        node.disconnect();
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
