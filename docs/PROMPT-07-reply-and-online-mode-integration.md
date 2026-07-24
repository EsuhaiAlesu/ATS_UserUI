# PROMPT 07 — Trả lời FIX-06 + tích hợp mode ONLINE vào UI chính + nhập API key trong Cài đặt

<role>
You are a senior full-stack engineer working in the **ATS_UserUI** repository, continuing the **ONLINE lane** after FIX-06. You are precise, you follow the contract exactly, and you never invent endpoints, events, or capabilities that do not exist.
</role>

<context>
Your FIX-06 report was reviewed against the core reference implementation and the running core server: **APPROVED**. The raw-http port, the auth wiring (ruling A4), the vite proxy, the committed vitest suite, the quiet silent-reconnect, and the bundle-secrecy grep are all correct. No rework is requested on FIX-06.

PART A below closes your three open questions. Since your report, the rollout plan changed in one important way: instead of the operator setting vendor keys as Railway env vars and verifying on the hidden `/online-lab` bench, the owner wants the online lane integrated into the REAL UI now — an ONLINE/OFFLINE mode on the live screen — with the vendor keys entered through the app's own Settings UI (stored server-side only), and the first real end-to-end run happening directly on the production UI after the next deploy. PART B specifies that work.
</context>

## PART A — Answers to your FIX-06 questions

1. **Env + redeploy (your Q1)** → SUPERSEDED by PART B: the six vendor values will be entered at runtime through a new Settings section in the app (server-side stored, write-only). Railway env vars remain supported as a **fallback** (runtime-entered values take precedence), so nothing you built breaks; the operator may still set env vars later for permanence.
2. **ASR upstream URL/handshake (your Q2)** → CONFIRMED correct, keep exactly as implemented. The running core server uses the identical handshake: `${QWEN3_ASR_WS_BASE}/api-ws/v1/realtime?model=…`, headers `Authorization: Bearer <key>` + `OpenAI-Beta: realtime=v1`, then `session.update` with `input_audio_transcription` (+ optional `corpus`) and `turn_detection: server_vad`. `QWEN3_ASR_WS_BASE` will be the vendor workspace base that expects precisely this path and handshake. Do not change anything.
3. **Dev workflow (your Q3)** → Accepted as described: dev runs `node server.js` alongside vite with the auth gate off; the cookie-less proxy limitation is expected.

## PART B — Integrate ONLINE mode into the real UI

<task>
1. Expose the online lane behind ONE facade hook (`useOnlineLane`) with safe lifecycle.
2. Server: make the six vendor values runtime-configurable (Settings-entered, env fallback) with two small auth-gated endpoints.
3. UI: Settings section to enter the keys (write-only, masked, status display).
4. UI: ONLINE/OFFLINE mode on the live/conference screen; Start in ONLINE mode without keys → popup pointing to Settings.
5. Update CLAUDE.md isolation rules + docs; keep `/online-lab` alive as the hidden debug bench.
</task>

### TASK 1 — Facade `src/lib/lanes/online/index.ts`

1. Create the single entry point exporting **one hook — `useOnlineLane`** — plus public TypeScript types. Its surface must cover everything `/online-lab` currently does, and nothing more: state (connection status, subtitle list with source/draft/final stages, audio level, diagnostics incl. `silentReconnects`, last error), controls (`start(options)`, `stop()`, TTS on/off, session brief/terms, session export), and options (languages, TTS, devices if already supported). Move orchestration logic that currently lives in the lab page INTO the facade; pages keep rendering only. Adapt names to what actually exists — report the real signature.
2. **Lifecycle safety** (what makes a mode switch possible): `stop()` and React unmount must fully release every resource — mic tracks stopped (`readyState === 'ended'`, browser mic indicator off), ASR WS closed, TTS playback stopped, timers/watchdogs cleared. A module-level active-session guard makes a second concurrent `start()` reject with a clear error. Rapid mount→unmount→mount must not leak a socket or stick in `reconnecting`.
3. Rewire `OnlineLab.tsx` to import ONLY from the facade root — zero behavior change. The lab page STAYS (hidden, no menu link): it is the debug bench used to isolate pipeline issues from UI-integration issues.

### TASK 2 — Server: runtime key config (write-only) with env fallback

1. New module (suggested `server/online-config.mjs`): holds runtime values for exactly these six names — `QWEN3_ASR_WS_BASE`, `QWEN3_ASR_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `VI_ELEVENLABS_VOICE_ID`. `getOnlineConfig(name)` returns the runtime value if set, else `process.env[name]`. Persist runtime values as JSON on disk (path from `ONLINE_KEYS_FILE`, default `./online-keys.json`), loaded on boot, written on change; add the file to `.gitignore`. Note for the report: on Railway the filesystem is ephemeral — runtime-entered keys are lost on each redeploy and must be re-entered (or eventually mirrored into Railway env as the permanent fallback).
2. **Refactor `server/online-api.mjs`**: today the six values are read into module-level consts at import time — that would freeze empty values forever. Change every use of these six to a call-time read via `getOnlineConfig(...)` (WS connect, refine, TTS, token endpoint). The optional tuning envs with defaults (model ids, timeouts, VAD, output format) may stay as they are.
3. Two new auth-gated routes inside the existing online-api handler:
   - `GET /online-api/config-status` → `{ keys: { <name>: true|false, … }, ready: boolean }` where a key is `true` if EITHER a runtime value or an env var provides it, and `ready` means all six are provided. **Never return any value, full or partial.**
   - `POST /online-api/config-keys` → body is a partial object of the six allowed names; trim values; a non-empty string sets, an explicit `""` clears the runtime value (env fallback then applies); unknown names → 400. Response: the same shape as `config-status`. **Never echo values; never log values** (log only which names changed).
4. Both routes sit behind the same auth gate as the rest of `/online-api/*`. Secrets must still never appear in the client bundle — these are runtime data, not build-time constants.

### TASK 3 — Settings UI: "Online mode — API keys"

Add a section to the app's existing Settings surface (follow its current design idiom; if the app has no settings page, add a settings modal reachable from the live screen's ONLINE mode and say so in Questions):

1. Six labeled inputs (masked, `type="password"`, autocomplete off), one per key name, each with a plain-language hint of what it is (e.g. "Khóa dịch vụ nhận dạng giọng nói"). Inputs are **write-only**: they always render empty; next to each, show the current status from `config-status` ("Đã thiết lập" / "Chưa có").
2. Save → `POST /online-api/config-keys` with only the fields the user filled; then refresh the status display. Show a clear success/error toast in the app's style.
3. This screen is only reachable behind the app's login, like the rest of the app.

### TASK 4 — ONLINE/OFFLINE mode on the live screen + missing-key popup

1. Add a mode selector (ONLINE / OFFLINE) on the live/conference screen, following the app's existing design language. **Default = OFFLINE** (today's behavior, zero regression). Persisting the last choice in localStorage is welcome but optional.
2. OFFLINE selected → the existing offline experience, byte-identical, untouched.
3. ONLINE selected → render the online panel driven ONLY by `useOnlineLane`: Start/Stop, subtitle feed (source / draft / refined), TTS toggle, level indicator, and a small diagnostics line. Reuse/adapt the lab components by moving them under `src/lib/lanes/online/` (components subfolder) so both the lab and the real screen share them.
4. **Missing-key popup**: when Start is pressed in ONLINE mode, first call `config-status`; if not `ready`, do NOT start — show a modal in the app's style: keys are not configured yet, with a button/link that takes the user to the Settings section from TASK 3. Use the app's language/i18n conventions for the copy (Vietnamese-first if that is the app's norm).
5. **Never two captures at once**: the mode selector is disabled while a session is live (user must Stop first); switching to OFFLINE unmounts the online panel, which by TASK 1 releases the microphone completely before the offline lane can claim it.

### TASK 5 — Rules + docs

1. `CLAUDE.md`: amend the online-lane isolation rule — online client code still lives in `src/lib/lanes/online/` + `/online-lab`, and there are now exactly TWO sanctioned integration points that may import the facade root (nothing deeper): the live-screen mode switch (TASK 4) and the Settings key section (TASK 3). Offline lib files (`src/lib/api.ts`, `LiveSessionContext.tsx`, `useMeter.ts`) remain untouchable.
2. `docs/ONLINE-LANE-CONTRACT.md`: add the two config endpoints under a "Runtime key configuration (app-side management)" note — they are app-management endpoints layered on top of the pipeline contract (pipeline endpoints/events unchanged).
3. `docs/ONLINE-LANE-UI-API.md` (new): the facade API reference (real committed signature), one minimal embed example, and the mode-switch pattern with the never-both-captures rule stated explicitly.

<constraints>
Offline lib files (`src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`) and `src/lib/lanes/types.ts` must not be modified. The live screen and Settings page may be edited ONLY for the mode switch / key section described above; when OFFLINE is selected the app must behave exactly as before this prompt.
Do not change online pipeline logic (segmentation, draft/refine policy, speech evidence, reconnect policy, TTS gating) beyond the facade re-organization; FIX-06 server logic stays identical except the TASK 2 config refactor.
No new runtime dependencies beyond what already exists. No model identifier, API host, or key value may appear in any file under `src/`, in the built bundle, in logs, or in any server response. `/online-lab` keeps working and stays unlinked from any menu.
If anything is ambiguous (no settings page exists, the live screen structure resists a clean switch, auth specifics), ask in the "Questions" section instead of inventing a solution.
</constraints>

<acceptance_criteria>
Verify each item yourself before replying, by actually running the checks — do not assume:
- [ ] `npm run build` and `npm test` pass; existing 30 tests stay green (extend tests only where the repo's infra already supports it).
- [ ] With NO keys anywhere (no env, empty store): ONLINE mode Start → the missing-key popup appears, nothing starts, no console error storm.
- [ ] `POST /online-api/config-keys` with test values flips `config-status` to `ready:true`; restarting the server preserves them (file store); `GET` responses and server logs contain no key value (grep your own log output).
- [ ] With placeholder keys entered via the Settings UI: Start attempts the WS and surfaces the structured error path (proving the runtime values reach the vendor calls — the call-time refactor works).
- [ ] Mode switch: ONLINE session live → selector disabled; Stop → switch to OFFLINE → mic indicator goes off and captured tracks report `readyState === 'ended'`; offline flow then works exactly as before (quick regression pass).
- [ ] `/online-lab` still works identically through the facade; grep proves no file outside `src/lib/lanes/online/` imports anything but the facade root except the two sanctioned integration points.
- [ ] Secrecy: grep the built bundle for env names/model identifiers → 0; unauthenticated requests to both config endpoints are rejected.
- [ ] With real keys (the owner will have them entered): full E2E on the REAL UI — Start → speak Vietnamese → source subtitles → draft appears before the sentence ends → refined replaces it → TTS plays streamed; a ≥45 s silent pause reconnects with NO error toast and `silentReconnects` increments. Report exactly which of these you observed yourself vs which need the operator.
</acceptance_criteria>

<report_format>
Reply in exactly this structure (the reviewer cannot open this repo — the report is the only window into your work):
1. **Summary** — ≤5 lines in English + 1 closing line in Vietnamese (tóm tắt 1 dòng).
2. **Files** — every file created/modified/moved, one line each with purpose.
3. **Full content** of `src/lib/lanes/online/index.ts` (facade) and `server/online-config.mjs`, plus the exact diff summary of `server/online-api.mjs` (which consts became call-time reads) and where the mode switch + Settings section were placed.
4. **Build & test output** — paste the actual tail of `npm run build` AND `npm test` verbatim, plus the live-server check transcript (popup case, config-keys → status flip, restart persistence). Do not paraphrase; if you did not run something, say so explicitly.
5. **Questions / uncertainties** — anything unresolved; never decide beyond the contract on your own.
</report_format>
