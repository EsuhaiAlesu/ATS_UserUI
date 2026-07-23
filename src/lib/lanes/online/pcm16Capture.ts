// src/lib/lanes/online/pcm16Capture.ts
const WORKLET_SRC = `
class Pcm16Tap extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch && ch.length) this.port.postMessage(ch.slice(0));
    return true;
  }
}
registerProcessor('pcm16-tap', Pcm16Tap);
`;

export interface CaptureHandle { stop(): void; }

export async function startPcm16Capture(
  deviceId: string | undefined,
  onChunk: (pcm: ArrayBuffer) => void,
  onLevel: (v: number) => void,
): Promise<CaptureHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
  });
  // AudioContext at 16kHz: Chrome/Edge resample internally — the WS receives true PCM16@16k.
  const ctx = new AudioContext({ sampleRate: 16000 });
  const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const src = ctx.createMediaStreamSource(stream);
  const tap = new AudioWorkletNode(ctx, 'pcm16-tap');
  let lastLevelAt = 0;
  tap.port.onmessage = (e: MessageEvent<Float32Array>) => {
    const f32 = e.data;
    const i16 = new Int16Array(f32.length);
    let sum = 0;
    for (let i = 0; i < f32.length; i++) {
      const s = Math.max(-1, Math.min(1, f32[i]));
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      sum += s * s;
    }
    onChunk(i16.buffer);
    const now = performance.now();
    if (now - lastLevelAt > 100) { lastLevelAt = now; onLevel(Math.min(1, Math.sqrt(sum / f32.length) * 4)); }
  };
  src.connect(tap);
  return {
    stop() {
      tap.port.onmessage = null;
      src.disconnect(); tap.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}
