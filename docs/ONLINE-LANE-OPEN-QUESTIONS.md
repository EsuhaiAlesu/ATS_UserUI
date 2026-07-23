# Online Lane — Open questions & pending decisions

The 5-phase online lane (Phases 0–4) is implemented, per-phase reviewed, and committed
(`173d3d8` → `fcaa4c6`). Isolation + treaty are clean. This file tracks the decisions still
owed to the product owner — previously they lived only in chat reports and were untracked.

Status legend: ❓ = awaiting a ruling · ✅ = decided.

## A. Blocking for real use (needs the backend team / owner)

1. ❓ **Online core (Node :8788) does not exist yet.** The whole lane is code-review + unit-test
   only — no pipeline/gate/TTS/save/latency behavior has EVER run end-to-end. This is the #1
   blocker for the online lane. Stand up (even a stub honoring `ONLINE-LANE-CONTRACT.md` v0.3),
   then run one full VI→JA + JA→VI pass through `/online-lab`.
2. ❓ **Production serving.** `npm start` (`server.js`) does NOT proxy `/online-api` — only
   `vite dev` / `vite preview` do. Decide one production command (preview, or add a reverse proxy
   to `server.js`, or front with Caddy/nginx). Same gap pre-exists for the offline `/api`.
3. ❓ **Is the online lane meant to be gala-usable, or a research bench for now?** Today it is only
   reachable via the hidden `/online-lab` dev bench (no navbar link) — this is exactly what the
   specs chartered. A real operator surface (mic/output/direction/terms/brief, VU, status, error
   banner, subtitle routing to `/stream`) is entirely un-built. If gala-usable → that UI is new work.
4. ❓ **Auth + cloud-cost controls.** The browser→core hops carry no auth token; only client-side
   cap is drafts ≤30/min (refine/tts/ASR minutes are uncapped). Confirm LAN isolation, or add an
   auth token to the token response + a per-session budget/kill-switch.

## B. Interpretation choices made while implementing (confirm or override)

Each was a reasonable reading of the spec; flagging so they are on record.

5. ✅ (implemented) **`ttsGate`** added to the treaty `start()` opts as an ADDITIVE optional field
   (PROMPT-04 authorized this). The only treaty change across all phases.
6. ✅ (implemented) **Diagnostics + `saveSession()`** live on `OnlineLaneController` (a superset of
   the treaty), not on the treaty itself.
7. ❓ **Refine idle = fixed 950 ms (360 ms if strong punctuation) after flush**, not reset by later
   partials. A finalized lid receives no further partials by construction, so this is behaviorally
   equivalent to "950 ms of quiet"; comment wording matches the behavior.
8. ❓ **Draft promotion sends only the fresh tail** to the draft endpoint (per "the promoted head is
   not re-translated"); the tail is drafted without the head's context (refine re-translates the
   whole sentence). Confirm this trade-off for the cheap draft tier.
9. ❓ **Provisional-at-flush transcript.** Each finalized line is recorded at flush time with its
   *draft* translation and upgraded in place when refine returns — so a save mid-refine (incl. the
   final save on Stop) may carry draft-quality translations. Trade-off: keep the sentence vs. drop
   it. The transcript is complete-in-count, not always complete-in-refined-quality.
10. ❓ **`onLevel` is peak-based** (so `AUDIO_LOUD_LEVEL_THRESHOLD=0.09` ≈ "peak 12/127"), vs the
    Phase-0 `rms*4`. Affects the VU bar sensitivity + loud-detection.
11. ❓ **`ttsPlayback.ts` deviates from its "frozen reference"** in two disclosed ways: (a) a
    stop()-guard before the deferred `play()` (fixes a real post-stop audio leak), (b) a
    playback-start hook for the latency metric. Both additive; no happy-path change.

## C. Post-gala hardening (deferred, agreed)

12. ❓ **Committed automated tests.** The pure modules were checked with ~46 throwaway scratchpad
    tests (not committed) — commit counts are therefore not reproducible. Recommend a `vitest`
    runner + real unit tests for the 6 deterministic modules (thresholds, filename format,
    `|` escaping, numeric-separator non-splitting, p50/p90).
13. ❓ **TypeScript `strict`** is OFF project-wide (deliberately deferred, "sau gala").
    `strictNullChecks` would harden the reconnect/stop race paths.
14. ❓ **Device hot-swap** (unplug mic/output mid-event) is not detected/surfaced; no
    `devicechange` listener. Standard for a live rig.
15. ❓ **Network-loss recovery** gives up after 5 attempts; the lab's restart wipes the visible
    transcript (data itself is safe via auto-save + download fallback). No `navigator.onLine`
    auto-resume.
16. ❓ **VI↔JA only** + Chromium assumption (setSinkId / MediaSource / AudioWorklet). Confirm the
    pair + pin the browser; optionally add a one-time capability preflight in the operator UI.

## D. Notes with no action needed

- The 45 s stall watchdog fires on a genuine ≥45 s speech pause (spec-compliant) → a spurious
  reconnect + error toast. Could be softened later (suppress the toast on silence-driven reconnect).
- Token response `asrWsPath` is informational; the client uses the fixed `WS /online-api/asr`.
  Reconciled in `ONLINE-LANE-CONTRACT.md` v0.3.
