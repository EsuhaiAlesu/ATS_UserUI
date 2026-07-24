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

### `useOnlineLane(): UseOnlineLane`

Returns state + config (state & setters) + controls. Committed signature:

- **state**: `status`, `statusDetail`, `running`, `level` (0..1 VU), `error`, `lines: LaneLine[]`
  (each with source/draft/final `interim`/`corrected` stages), `diagnostics: OnlineDiagnostics | null`
  (incl. `silentReconnects`), `saveStatus`.
- **devices**: `inputDevices`, `outputDevices`, `refreshDevices()`.
- **config (state + setter each)**: `deviceId`, `outputDeviceId` (setter also routes TTS output),
  `nearMicGate`, `speakEnabled`, `gateMode: TtsGateMode`, `direction: OnlineDirection`, `terms`, `brief`.
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
