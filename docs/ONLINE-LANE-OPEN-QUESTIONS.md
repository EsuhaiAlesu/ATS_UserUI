# Online Lane — Open questions & pending decisions

The 5-phase online lane (Phases 0–4) is implemented, per-phase reviewed, and committed
(`173d3d8` → `fcaa4c6`, polish `8cd9e85`). **FIX-06 (PROMPT-06) delivered the core team's official
rulings and ported the online backend into this repo's production server.** Isolation + treaty are clean.

Status legend: ❓ = awaiting a ruling · ✅ = decided/done · 🕒 = deferred (agreed).

## A. Backend & serving

1. ✅ **Online core (Node backend).** RESOLVED by FIX-06: the backend was ported into THIS repo's
   production server (`server/online-api.mjs`, mounted by `server.js` at `/online-api/*` HTTP + WS).
   One Railway deploy = UI + online backend; the same server runs on the gala Mac mini. No external
   core, no proxy. Env-driven (keys/models set by the operator in Railway; see PROMPT-06 TASK 1).
2. ✅ **Production `/online-api` serving.** SUPERSEDED by A1: `server.js` now serves `/online-api/*`
   in-process (same origin). The vite dev proxy points at the local Node server (`:3000`, `ws:true`,
   no rewrite). Prod has no proxy.
3. ✅ **Gala-usable vs research bench.** DECIDED: keep `/online-lab` HIDDEN (no menu/navbar link).
   The real operator UI is a later, owner-designed phase.
4. ✅ **Auth + cost controls.** DECIDED: the new `/online-api/*` routes (and the WS upgrade) reuse
   the app's existing login gate (`server.js` `isAuthed`); when `AUTH_PASSWORD` is unset the gate is
   off (open). Client draft admission (≤30/min) + usage reports are the accepted cost controls for now.
   Post-gala hardening item: a per-session cloud budget / kill-switch (see C15).

## B. Interpretation choices (confirmed by the core team)

5. ✅ **`ttsGate`** added to the treaty `start()` opts as an ADDITIVE optional field. The only treaty
   change across all phases.
6. ✅ **Diagnostics + `saveSession()`** live on `OnlineLaneController` (a superset of the treaty).
7. ✅ **Refine idle = fixed post-flush delay** (950/360 ms), not reset by later partials — ACCEPTED
   (behaviorally equivalent; a finalized lid receives no further partials).
8. ✅ **Draft promotion translates only the fresh tail** after promotion — ACCEPTED (verified
   identical to the core; refine re-translates the full sentence).
9. ✅ **Provisional-at-flush transcript, upgraded in place** — ACCEPTED (complete-in-count beats
   complete-in-quality for a live transcript).
10. ✅ **`onLevel` is peak-based** (loud threshold 0.09 ≈ peak 12/127) — ACCEPTED (matches the core).
11. ✅ **Two disclosed `ttsPlayback.ts` deviations** (stop-guard on the deferred `play()`; the
    playback-start hook) — ACCEPTED (both are real fixes).

## C. Post-gala hardening

12. ✅ **Committed automated tests.** DONE in FIX-06 TASK 2: `vitest` runner + `tests/*.test.ts`
    (30 tests over the deterministic modules); `npm test` passes from a clean checkout.
13. 🕒 **TypeScript `strict`** is OFF project-wide (deferred, "sau gala").
14. 🕒 **Device hot-swap** (unplug mic/output mid-event) — not detected/surfaced; no `devicechange`
    listener.
15. 🕒 **Network-loss auto-resume + per-session cloud budget/kill-switch** — the reconnect caps at 5
    attempts then errors; the lab's restart wipes the visible transcript (data is safe via auto-save +
    download fallback). No `navigator.onLine` auto-resume; refine/tts/ASR minutes are uncapped.
16. 🕒 **VI↔JA only** + Chromium assumption (setSinkId / MediaSource / AudioWorklet); no capability
    preflight in the (dev-bench) UI.

## D. Notes

- ✅ **45 s silent-pause reconnect toast** — SOFTENED in FIX-06 TASK 3: a 45 s stall with no recent
  voice reconnects quietly (`console.info` + `silentReconnects` diagnostic, no error toast). The
  35 s loud path and exhausted-attempts still toast.
- Token response `asrWsPath` is documented in the contract; the client uses the fixed
  `WS /online-api/asr` path (server returns `asrWsPath: '/online-api/asr'`).
