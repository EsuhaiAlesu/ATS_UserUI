# PROMPT 04 — Phase 3: Voice output (TTS) + speaker selection + half-duplex anti-feedback gate

> Cách dùng: gửi SAU KHI Phase 2 (PROMPT-03) đã nghiệm thu. Phase này CẮT ĐƯỢC nếu thiếu thời gian — các phase sau không phụ thuộc. Copy toàn bộ nội dung dưới dấu gạch ngang cho Claude trên repo `EsuhaiAlesu/ATS_UserUI`. Copy nguyên phản hồi gửi lại để review.

---

<role>
You are a senior frontend engineer working in the **ATS_UserUI** repository, continuing the **ONLINE lane** built in the previous phase. You are precise, you follow the contract exactly, and you never invent endpoints, events, or fields that are not in `docs/ONLINE-LANE-CONTRACT.md`.
</role>

<context>
Reminder of the mandatory rules already in this repo's `CLAUDE.md`: online-lane code lives only in `src/lib/lanes/online/` + the `/online-lab` page; the backend is reached only through `/online-api`; offline-lane files (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, existing pages) must not be touched.

This phase adds: **(M7a) spoken translation playback** via `POST /online-api/tts`, **(M7b) output-device selection**, **(M7c) a half-duplex gate** — temporarily silencing the mic feed while the app itself is speaking, so the TTS voice never loops back into the ASR.

The real problem the gate solves: speakers play the TTS voice → the mic (same room/same machine) picks it up → the ASR transcribes the app's own voice → feedback loop. The fix is NOT to stop capture or close the WS — it is to replace outgoing frames with silence of equal length (preserving server-VAD timing, same technique as the Phase 1 noise gate).
</context>

<task>
1. Create the TTS playback module (adapted production code below).
2. Add speaker selection + a playback toggle to `/online-lab`.
3. Implement the half-duplex gate in `onlineLane.ts`.
4. Self-verify and reply in the mandatory report format.
</task>

## TASK 1 — M7a: TTS playback module (`src/lib/lanes/online/ttsPlayback.ts`)

<reference_code>
Create the file with the following content — an ADAPTATION of the module running in production in the core repo (internal store dependencies removed, endpoint switched to `/online-api`). Keep the logic identical; only adjust small details if this repo's TypeScript config requires it:

```ts
// If a sentence has waited this long before playback starts, drop it so the
// voice stays close to live instead of reading an ever-growing backlog.
const MAX_QUEUE_AGE_MS = 12_000;

export type TtsLanguage = 'ja' | 'vi';

type QueueItem = {
  text: string;
  language: TtsLanguage;
  emotion?: string;
  speed?: number;
  enqueuedAt: number;
  subtitleId?: string;
  fetchPromise?: Promise<Response | null>;
};

let queue: QueueItem[] = [];
let playing = false;
let generation = 0;
let currentAudio: HTMLAudioElement | null = null;
let currentFinish: (() => void) | null = null;
let warned = false;

// Store replacement: the UI registers the output device + warning handler here.
let sinkId: string | undefined;
let onWarn: (message: string) => void = () => undefined;
export function setTtsSinkId(id: string | undefined) { sinkId = id; }
export function setTtsWarningHandler(handler: (message: string) => void) { onWarn = handler; }

// "Speaking" state drives the half-duplex ASR gate: while the app's own
// voice is audible, the mic would feed it straight back into the ASR.
// The tail covers output latency/room reverb after the clip ends.
const SPEAKING_TAIL_MS = 450;

type SpeakingListener = (speaking: boolean) => void;
let speaking = false;
let speakingTailTimer: number | null = null;
const speakingListeners = new Set<SpeakingListener>();

function setSpeaking(next: boolean) {
  if (next) {
    if (speakingTailTimer !== null) {
      window.clearTimeout(speakingTailTimer);
      speakingTailTimer = null;
    }
    if (!speaking) {
      speaking = true;
      speakingListeners.forEach((listener) => listener(true));
    }
    return;
  }
  if (!speaking || speakingTailTimer !== null) return;
  speakingTailTimer = window.setTimeout(() => {
    speakingTailTimer = null;
    speaking = false;
    speakingListeners.forEach((listener) => listener(false));
  }, SPEAKING_TAIL_MS);
}

/** Subscribe to TTS speaking state; fires immediately with the current value. */
export function subscribeTtsSpeaking(listener: SpeakingListener) {
  speakingListeners.add(listener);
  listener(speaking);
  return () => {
    speakingListeners.delete(listener);
  };
}

function warnOnce(message: string) {
  if (warned) return;
  warned = true;
  onWarn(message);
}

async function fetchTtsResponse(item: QueueItem): Promise<Response | null> {
  try {
    const response = await fetch('/online-api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: item.text,
        language: item.language,
        ...(item.emotion ? { emotion: item.emotion } : {}),
        ...(Number.isFinite(item.speed) ? { speed: item.speed } : {}),
        ...(item.subtitleId ? { subtitleId: item.subtitleId } : {}),
      }),
    });
    if (!response.ok) {
      warnOnce(
        response.status === 503
          ? 'Voice output unavailable: TTS engine is not configured or unreachable.'
          : 'Voice output failed; subtitles continue as usual.',
      );
      return null;
    }
    return response;
  } catch {
    warnOnce('Voice output failed; subtitles continue as usual.');
    return null;
  }
}

function releaseCurrentAudio() {
  const audio = currentAudio;
  const finish = currentFinish;
  currentAudio = null;
  currentFinish = null;
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
  }
  // Resolve the pending playback promise so a stopped drain loop never hangs.
  finish?.();
}

function playBlob(blob: Blob, myGeneration: number) {
  return new Promise<void>((resolve) => {
    if (generation !== myGeneration) {
      resolve();
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (currentAudio === audio) {
        currentAudio = null;
        currentFinish = null;
      }
      URL.revokeObjectURL(url);
      setSpeaking(false);
      resolve();
    };
    currentAudio = audio;
    currentFinish = finish;
    audio.onended = finish;
    audio.onerror = finish;
    setSpeaking(true);
    // Route to the operator-selected output device. Applied per clip so
    // mid-session changes take effect on the next sentence; a failed
    // setSinkId (device unplugged) falls back to the default device.
    const routed = sinkId && typeof audio.setSinkId === 'function'
      ? audio.setSinkId(sinkId).catch(() => undefined)
      : Promise.resolve();
    void routed.then(() => audio.play()).catch(finish);
  });
}

function appendSourceBuffer(sourceBuffer: SourceBuffer, chunk: Uint8Array) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      sourceBuffer.removeEventListener('updateend', onUpdateEnd);
      sourceBuffer.removeEventListener('error', onError);
    };
    const onUpdateEnd = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Could not append streamed TTS audio.'));
    };
    sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true });
    sourceBuffer.addEventListener('error', onError, { once: true });
    const ownedChunk = new Uint8Array(chunk.byteLength);
    ownedChunk.set(chunk);
    sourceBuffer.appendBuffer(ownedChunk);
  });
}

async function playResponse(response: Response, myGeneration: number) {
  const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() || '';
  if (
    !response.body ||
    contentType !== 'audio/mpeg' ||
    typeof MediaSource === 'undefined' ||
    !MediaSource.isTypeSupported('audio/mpeg')
  ) {
    await playBlob(await response.blob(), myGeneration);
    return;
  }

  await new Promise<void>((resolve) => {
    if (generation !== myGeneration) {
      void response.body?.cancel();
      resolve();
      return;
    }
    const mediaSource = new MediaSource();
    const url = URL.createObjectURL(mediaSource);
    const audio = new Audio(url);
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      void reader?.cancel().catch(() => undefined);
      if (currentAudio === audio) {
        currentAudio = null;
        currentFinish = null;
      }
      audio.onended = null;
      audio.onerror = null;
      audio.onplaying = null;
      audio.pause();
      URL.revokeObjectURL(url);
      setSpeaking(false);
      resolve();
    };
    currentAudio = audio;
    currentFinish = finish;
    audio.onended = finish;
    audio.onerror = finish;
    audio.onplaying = () => setSpeaking(true);

    const routed = sinkId && typeof audio.setSinkId === 'function'
      ? audio.setSinkId(sinkId).catch(() => undefined)
      : Promise.resolve();

    mediaSource.addEventListener('sourceopen', () => {
      void (async () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
          reader = response.body!.getReader();
          let started = false;
          while (generation === myGeneration) {
            const next = await reader.read();
            if (next.done) break;
            if (!next.value.byteLength) continue;
            await appendSourceBuffer(sourceBuffer, next.value);
            if (!started) {
              started = true;
              await routed;
              await audio.play();
            }
          }
          if (!started || generation !== myGeneration) {
            finish();
            return;
          }
          if (mediaSource.readyState === 'open' && !sourceBuffer.updating) mediaSource.endOfStream();
        } catch {
          finish();
        }
      })();
    }, { once: true });
  });
}

async function drainQueue() {
  if (playing) return;
  playing = true;
  const myGeneration = generation;
  try {
    while (queue.length > 0 && generation === myGeneration) {
      const item = queue.shift()!;
      if (Date.now() - item.enqueuedAt > MAX_QUEUE_AGE_MS) continue;
      if (!item.fetchPromise) item.fetchPromise = fetchTtsResponse(item);
      // Prefetch the next sentence while this one plays.
      const next = queue[0];
      if (next && !next.fetchPromise) next.fetchPromise = fetchTtsResponse(next);
      const response = await item.fetchPromise;
      if (generation !== myGeneration) return;
      if (!response) continue;
      await playResponse(response, myGeneration);
    }
  } finally {
    if (generation === myGeneration) playing = false;
  }
}

// Shorter chunks synthesize faster (time-to-first-audio) and age out with
// finer granularity when the engine is slow.
function splitTtsSentences(text: string): string[] {
  const chunks = text.match(/[^。．！？!?]+[。．！？!?]*/gu) ?? [text];
  const merged: string[] = [];
  for (const raw of chunks) {
    const chunk = raw.trim();
    if (!chunk) continue;
    const previous = merged[merged.length - 1];
    if (previous && (previous.length < 8 || chunk.length < 8)) {
      merged[merged.length - 1] = `${previous}${chunk}`;
    } else {
      merged.push(chunk);
    }
  }
  return merged.length ? merged : [text.trim()];
}

export function enqueueTtsSentence(
  text: string,
  language: TtsLanguage = 'ja',
  emotion?: string,
  speed?: number,
  subtitleId?: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return;
  for (const chunk of splitTtsSentences(trimmed)) {
    const item: QueueItem = { text: chunk, language, emotion, speed, subtitleId, enqueuedAt: Date.now() };
    if (queue.length < 2) item.fetchPromise = fetchTtsResponse(item);
    queue.push(item);
  }
  void drainQueue();
}

export function stopTtsPlayback() {
  generation += 1;
  queue = [];
  playing = false;
  releaseCurrentAudio();
}

export function resetTtsPlayback() {
  stopTtsPlayback();
  warned = false;
}
```
</reference_code>

Properties you MUST preserve (each is the result of live-session tuning):
- Sequential queue, one sentence at a time; a sentence that waited > **12 s** is dropped (the voice stays close to live instead of reading a backlog).
- **Prefetch** of the next sentence while the current one plays.
- `audio/mpeg` is **streamed through MediaSource** (playback starts on the first chunk — no waiting for the full download); other content types (e.g. `audio/wav`) fall back to blob playback.
- `stopTtsPlayback()` bumps `generation` to cancel any in-flight playback loop; call it from the lane's `stop()`.

## TASK 2 — M7b: Speaker selection on `/online-lab`

- Output-device dropdown (`enumerateDevices` → `audiooutput`); call `setTtsSinkId(deviceId)` on change. Mid-session changes take effect from the next sentence (already handled inside the module).
- A "🔊 Speak translations" toggle (default ON). When ON: each refine response (Phase 2 already stores `ttsText`/`emotion`/`ttsSpeed`) → `enqueueTtsSentence(ttsText || translatedText, targetLanguage, emotion, ttsSpeed, lid)`.
- Wire `setTtsWarningHandler` into the lab's error area (warns once, never spams).

## TASK 3 — M7c: Half-duplex gate (in `onlineLane.ts`)

```ts
export type TtsGateMode = 'auto' | 'always' | 'off';
const TTS_GATE_NETWORK_TAIL_MS = 1_200; // 'always': extra un-gate delay after playback ends
```

- Subscribe to `subscribeTtsSpeaking` inside the lane. While `speaking === true` and the gate is active → every outgoing `CapturePacket` has its `pcm` replaced with zeros of equal length and `voicedMs = 0`.
- **`auto`** (default): gate while speaking (the speaking state already includes a 450 ms tail inside the TTS module).
- **`always`**: like auto, but after `speaking → false` keep the gate closed for an extra **1 200 ms** (covers a voice looped back through an online meeting: network RTT + far-end playback delay).
- **`off`**: never gate (for headphone setups — no feedback path).
- Gate mode is a `start()` option: add `ttsGate?: 'auto' | 'always' | 'off'` to opts. This is an ADDITIVE optional field only — do not change any existing field of `LaneController`; if `types.ts` must be touched, add the optional field only and state it explicitly in your report.
- Diagnostics add: `ttsQueueLength`, `gateActive` (boolean), cumulative `gatedMs`.

<constraints>
Files you must NOT modify: offline-lane files (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, existing pages other than `OnlineLab.tsx`). `src/lib/lanes/types.ts` may only gain the optional field described above.
If anything is ambiguous or conflicts with the repo's reality, ask in the "Questions" section instead of inventing a solution.
</constraints>

<acceptance_criteria>
Verify each item yourself before replying, by actually running the checks — do not assume:
- [ ] `npm run build` passes.
- [ ] With speaking ON, saying a sentence produces voice output on the selected device; when TTS fails, subtitles continue unaffected (single warning, no spam).
- [ ] While the voice plays, diagnostics show `gateActive: true` and the transcript does NOT re-transcribe the app's own voice (test with external speakers).
- [ ] Calling `stop()` mid-playback stops the audio immediately with no leaked audio elements.
- [ ] Mode `off` → no gating (the transcript may echo the app's voice — acceptable; that is the user's choice).
- [ ] No diff on forbidden files; any `types.ts` change is additive-optional only and reported.
</acceptance_criteria>

<report_format>
Reply in exactly this structure (the reviewer cannot open this repo — the report is the only window into your work):
1. **Summary** — ≤5 lines in English + 1 closing line in Vietnamese (tóm tắt 1 dòng).
2. **Files** — every file created/modified, one line each with purpose.
3. **Full content** of the gate section in `onlineLane.ts` + the `types.ts` diff (if any). No need to re-paste `ttsPlayback.ts` — just confirm it matches the embedded reference.
4. **Build output** — paste the actual tail of `npm run build` verbatim. Do not paraphrase; if you did not run it, say so explicitly.
5. **Questions / uncertainties** — anything unresolved; never decide beyond the contract on your own.
</report_format>
