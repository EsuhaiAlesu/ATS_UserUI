# Online Lane — UI facade API (FIX-07)

The online lane is exposed to the real UI through ONE facade root: `src/lib/lanes/online` (its
`index.ts`). No file outside `src/lib/lanes/online/` may import anything deeper than this root, except
the two sanctioned integration points (the live-screen mode switch and the Settings key section).

## Exports (facade root)

```ts
import {
  useOnlineLane,          // the hook — all orchestration + lifecycle
  OnlinePanel,            // shared console UI (used by /online-lab AND the live screen)
  OnlineKeysSettings,     // the Settings key section
  fetchOnlineConfigStatus, saveOnlineConfigKeys, ONLINE_KEY_FIELDS,
  ONLINE_ACTIVE_STATUSES, ONLINE_STATUS_COLOR,
  type OnlineConfigStatus, type OnlineDirection,
  type LaneLine, type LaneStatus, type OnlineDiagnostics, type TtsGateMode, type SaveOutcome,
} from '../lib/lanes/online'
```

### `summarizePrepDocs(input): Promise<PrepBriefResult>` (M14)

Not part of the hook, on purpose. `summarizePrepDocs({ sourceLanguage, targetLanguage, header?, documents })`
posts the event's imported documents to `POST /online-api/summarize-prep-docs` and returns
`{ brief, terms, documents, usedChars }` — the Bối cảnh text plus suggested term lines. It is a
**pre-session** call: tens of seconds, a whole script on the wire, and its result is a SUGGESTION the
operator reads and edits in the box before pressing Bắt đầu. Never call it while a session runs. It
rejects with an operator-facing Vietnamese message; the console shows it verbatim. Also exported:
`PREP_DOCS_MAX`, `PREP_DOC_MAX_CHARS`, and the `PrepBriefInput` / `PrepBriefResult` / `PrepBriefDoc` types.

### `useOnlineLane(): UseOnlineLane`

Returns state + config (state & setters) + controls. Committed signature:

- **state**: `status`, `statusDetail`, `running`, `level` (0..1 VU), `error`, `lines: LaneLine[]`
  (each with source/draft/final `interim`/`corrected` stages), `diagnostics: OnlineDiagnostics | null`
  (incl. `silentReconnects`), `saveStatus`.
- **devices**: `inputDevices`, `outputDevices`, `refreshDevices()`.
- **config (state + setter each)**: `deviceId`, `outputDeviceId` (setter also routes TTS output),
  `nearMicGate`, `speakEnabled`, `gateMode: TtsGateMode`, `direction: OnlineDirection`, `terms`, `brief`.
- **live control (the exception)**: `listenPaused` / `setListenPaused(v)` — every other config value above
  is latched by `start()`; this one is read on every captured audio frame precisely so it can be flipped
  MID-SESSION. While true the microphone puts equal-length digital silence on the wire (the socket and the
  recogniser's own 1.5s close keep running; there is simply nothing in the audio to transcribe), which is
  what a performance, a video or a musical number needs. `start()` always releases it.
- **controls**: `start()` (reads the config above), `stop()`, `saveSession()`.

**Lifecycle safety**: `stop()` and React unmount fully release the session — mic tracks stopped
(`readyState === 'ended'`, browser mic indicator off), ASR WS closed, TTS stopped, all timers/watchdogs
cleared. A module-level guard makes a second concurrent `start()` reject (surfaced via `error`).

## Minimal embed

```tsx
import { OnlinePanel } from '../lib/lanes/online'

// The bench simply renders the shared panel:
export default function DevBench() {
  return <OnlinePanel />
}
```

The panel accepts two optional props:
- `onBeforeStart?: () => Promise<boolean> | boolean` — a gate run before Start; return `false` to abort
  (e.g. the missing-key popup).
- `onRunningChange?: (running: boolean) => void` — reports the live-session state to the parent.

## Mode-switch pattern (live screen) — the never-both-captures rule

`AudioRouting.tsx` renders EITHER the (unchanged) offline console OR the online panel, never both:

```tsx
const [mode, setMode] = useState<'offline' | 'online'>(/* localStorage, default 'offline' */)
const offlineLive = isSessionActive(session.status)
const [onlineRunning, setOnlineRunning] = useState(false)
// NEVER two captures at once: block a mode change while EITHER lane is live.
const selectorDisabled = mode === 'online' ? onlineRunning : offlineLive

return (
  <div className="h-full w-full relative">
    {mode === 'offline'
      ? <OfflineConsole />                                   {/* unchanged offline experience */}
      : <OnlinePanel onBeforeStart={gateKeys} onRunningChange={setOnlineRunning} />}
    <ModePill mode={mode} disabled={selectorDisabled} onChange={setMode} />
  </div>
)
```

Switching to OFFLINE unmounts the online panel → its `useOnlineLane` unmount cleanup releases the mic
BEFORE the offline lane can claim it (and vice-versa). Default mode is OFFLINE (zero regression).

## Key configuration (Settings)

`OnlineKeysSettings` renders six masked, write-only inputs (always empty; status per key from
`config-status`) and posts only the filled fields to `config-keys`. The client uses opaque **slugs**
(`asr_endpoint`, `asr_key`, `refine_key`, `tts_key`, `tts_voice_ja`, `tts_voice_vi`); the server maps
each slug to its env var. No vendor env name, model id, host, or value ever reaches the client.

`OnlineMicSettings` renders the **Độ nhạy micro** section (four steps: auto / close / medium / far),
persisted per machine under one key through `micSensitivity.ts`. That module is the ONLY reader and
writer of the key, so the Settings page and the console hook cannot drift apart, and the Settings page
never has to call `useOnlineLane` (which would start diagnostics timers, the audience publisher and a
voice-catalog fetch on a page that only edits config).

## Removed from the UI: the hall-babble switch (`roomFilter`)

The console checkbox "hall babble" and its facade state (`roomFilter` / `setRoomFilter`, the localStorage
key `proyaku_online_room_filter`, the lane's `getRoomFilter`, and the field in the token request body)
were removed on 02/08/2026. **Do not add them back on the strength of the feature existing** — it does
exist; what does not exist is using it together with timestamps.

Measured against the live vendor that day, three handshakes, no audio sent, parameters built by
`buildScribeWsParams` itself:

- `filter_background_audio=true` **+** `include_timestamps=true` (exactly what the app sent with the box
  ticked) → `{"message_type":"invalid_request","error":"filter_background_audio cannot be combined with
  include_timestamps. This will be supported in a future update."}`, then close code **1008**, before any
  `session_started`. The session never begins; not one utterance is transcribed.
- `filter_background_audio=true` alone → `session_started` normally, config echo
  `"filter_background_audio":true,"include_timestamps":false`.
- `include_timestamps=true` alone (the box unticked) → `session_started` normally.

Timestamps are not negotiable: the SECOND, timestamped final is the message that carries `language_code`,
and the whole one-mic-two-directions mechanism stands on it.

It also failed **invisibly**: `invalid_request` is not in `asrTransport.ts`'s `FATAL_TOKENS`, so the lane
did not tear down — it burnt all five `RECONNECT_MAX_ATTEMPTS`, minting a fresh token each round, and only
then reported a generic "connection lost".

**The way back in, when the vendor lifts the restriction:** the server is untouched. `buildScribeWsParams`
still implements the three-state rule (`true` → set it; `false` → send nothing and beat the env; absent →
`SCRIBE_FILTER_BACKGROUND`) and the token endpoint still accepts a boolean `roomFilter` in the request
body. The client simply always takes the "absent" branch now, so switching it back on is one environment
variable — no code change, no client redeploy.
