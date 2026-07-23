// src/lib/lanes/online/ttsPlayback.ts
//
// ONLINE-lane TTS playback (Phase 3 / M7a). Adaptation of the core repo's production module:
// internal store dependencies removed, endpoint switched to `/online-api/tts`. Logic preserved:
//   sequential queue · drop sentences older than 12s · prefetch next · MediaSource streaming for
//   audio/mpeg (blob fallback otherwise) · generation counter cancels in-flight playback.

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

// setSinkId is part of the Audio Output Devices API; type it defensively for older lib targets.
type AudioWithSink = HTMLAudioElement & { setSinkId?: (sinkId: string) => Promise<void> };

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

/** Current number of sentences waiting to be spoken (for diagnostics). */
export function getTtsQueueLength() { return queue.length; }

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
    const withSink = audio as AudioWithSink;
    const routed = sinkId && typeof withSink.setSinkId === 'function'
      ? withSink.setSinkId(sinkId).catch(() => undefined)
      : Promise.resolve();
    // Guard the deferred play: a stop() during the (async) setSinkId await must not un-pause a
    // released element (acceptance: stop() mid-playback stops audio immediately, no leak).
    void routed.then(() => {
      if (done || generation !== myGeneration) return;
      return audio.play();
    }).catch(finish);
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

    const withSink = audio as AudioWithSink;
    const routed = sinkId && typeof withSink.setSinkId === 'function'
      ? withSink.setSinkId(sinkId).catch(() => undefined)
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
              if (done || generation !== myGeneration) return; // stopped during setSinkId → don't un-pause
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
