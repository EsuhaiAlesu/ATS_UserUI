# PROMPT 08 — Sửa deploy production (lockfile lệch từ FIX-06) → mặc định ONLINE + responsive/mobile → viết lại README

<role>
You are a senior release + front-end engineer working in the **ATS_UserUI** repository. This prompt has two stages that must be done **in order and pushed separately**. STAGE 1 is an urgent, already-diagnosed one-file repair that unblocks production — ship it before you start anything else. STAGE 2 is a front-end pass: the live screen's default mode, responsiveness, visual consistency, and a README rewrite.
</role>

<context>
Production on Railway has failed to deploy **every commit since FIX-06**. The reviewer investigated a read-only clone of this repository and the GitHub deployment API, and the cause is confirmed — you do not need to re-diagnose it, only to fix and verify it.

**Evidence gathered by the reviewer:**

1. Deployment history of the environment "ATS-UserUI / production" (GitHub API), newest first:

```
5587660522  0843b9d  2026-07-24T10:53:10Z  → failure (15 s later)
5585010210  3457537  2026-07-24T06:56:12Z  → failure (12 s later)
5584400896  0dbf528  2026-07-24T05:49:30Z  → failure (15 s later)
5573405266  a913701  2026-07-23T13:37:42Z  → SUCCESS      ← last good deploy
```

The last successful deploy is `a913701`, the commit immediately **before** FIX-06 (`0dbf528`). Every deploy from FIX-06 onward fails after only 12–15 seconds — far too fast for a build to have run, which points at the install step.

2. Reproduced locally on a clean tree (Node v24.2.0, npm 11.15.0):

```
# on develop (0843b9d):
$ npm ci
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json
npm error or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install`.
npm error Missing: @emnapi/core@1.11.3 from lock file
npm error Missing: @emnapi/runtime@1.11.3 from lock file
npm error Missing: @emnapi/wasi-threads@1.2.3 from lock file

# on a913701 (last good deploy), same machine, same npm:
$ npm ci
added 111 packages, and audited 112 packages in 19s      ← passes
```

**Root cause:** when FIX-06 added `ws` (dependency) and `vitest` (devDependency), `package-lock.json` was committed in an incomplete state — three transitive optional packages pulled in by the new dependency tree (`@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`) are missing from it. Local development still works because `npm install` tolerates the drift, but Railway builds with `npm ci`, which refuses to install and aborts the deploy in ~15 seconds. FIX-07 and `0843b9d` inherited the same broken lockfile, so all three deploys failed for this one reason.

**Everything else was checked and is NOT the problem:** production correctly deploys from `develop` (deployment SHAs match develop's commits); `server.js` correctly binds `Number(process.env.PORT) || 3000` on `0.0.0.0`; the build itself is healthy; the built bundle really does contain the ONLINE mode UI. The reviewer verified the repair: after regenerating the lockfile, `npm ci` succeeds from a clean tree, `npm run build` succeeds, and all 30 tests pass.

The symptom the operator reported — no ONLINE/OFFLINE switch on the live screen, no way to enter API keys in Settings — is simply the consequence: production still serves the last successful build (`a913701`), which predates the entire ONLINE-mode integration.
</context>

<task>
STAGE 1 (urgent, push before starting STAGE 2)
1. Regenerate `package-lock.json` so it is in sync with `package.json`.
2. Prove `npm ci` succeeds from a completely clean tree, then build and test.
3. Commit and push to `develop` so Railway redeploys, and confirm the deploy goes green.
4. Add a standing guard so this cannot silently recur.

STAGE 2 (separate commit)
5. Make **ONLINE** the default mode of the live screen (the OFFLINE backend is not wired into this deployment yet), without removing or weakening the OFFLINE lane.
6. Make the whole app responsive — usable on a phone and on a shrunk desktop window, with no layout breakage.
7. Bring the ONLINE console into the app's design system so it stops looking foreign.
8. Rewrite `README.md` to describe the repository as it actually is today.
</task>

---

## STAGE 1 — Unblock production

### TASK 1 — Regenerate the lockfile

```
git checkout develop && git pull
rm -rf node_modules
npm install                 # rewrites package-lock.json in sync with package.json
git diff --stat -- package-lock.json
```

Expected: `package-lock.json` gains the missing `@emnapi/*` entries (the reviewer's run produced roughly `37 insertions, 10 deletions`). Only `package-lock.json` may change — if `npm install` also modifies `package.json`, stop and report; do not commit that.

Do **not** run `npm audit fix` and do **not** bump any dependency version here. The only goal is lockfile↔package.json consistency.

### TASK 2 — Prove it from a clean tree (this is the part that actually matters)

```
rm -rf node_modules
npm ci                      # MUST succeed — this is exactly what Railway runs
npm run build
npm test
```

All three must pass. Paste the real tail of each. If `npm ci` still fails, do not push — report the exact error instead.

### TASK 3 — Commit, push, confirm the deploy

Commit **only** `package-lock.json` (plus the CLAUDE.md line from TASK 4) on `develop` and push. Suggested message:

```
fix(deps): sync package-lock.json with package.json (npm ci was failing since FIX-06)

Railway builds with `npm ci`, which aborts when the lockfile drifts. Three
transitive optional packages (@emnapi/core, @emnapi/runtime, @emnapi/wasi-threads)
were missing from the lockfile committed with FIX-06, so every production deploy
since 0dbf528 failed in ~15s. Regenerated with npm install; `npm ci` now passes
from a clean tree, build + 30 tests green.
```

No force-push, no history rewriting, no merging into `main` (production deploys `develop`). After pushing, check that the new deployment reaches `success` (e.g. `gh api repos/EsuhaiAlesu/ATS_UserUI/deployments?per_page=1` then its `/statuses`) and report the result. **Do not start STAGE 2 until this deploy is green** — if it fails again, report the new failure and stop.

### TASK 4 — Standing guard

Add one rule to `CLAUDE.md` (in the existing rules/workflow section, wording adapted to the file's style):

> **Any change to `package.json` must be followed by `rm -rf node_modules && npm ci` on a clean tree before pushing.** Production builds with `npm ci`, which fails hard on lockfile drift — `npm install` succeeding locally is not proof the deploy will work.

---

## STAGE 2 — Default mode, responsive UI, consistency, README

### TASK 5 — Default mode = ONLINE (and keep everything where it already is)

Today `src/pages/AudioRouting.tsx` falls back to `'offline'` when nothing is stored:

```ts
const [mode, setMode] = useState<'offline' | 'online'>(() =>
    (localStorage.getItem(ONLINE_MODE_KEY) === 'online' ? 'online' : 'offline'));
```

The self-hosted OFFLINE backend is **not connected to this deployment yet**, so a fresh browser currently opens straight into a lane that cannot work. Invert the fallback:

- **No stored value → `'online'`.** A stored value must still win, in **both** directions (`'offline'` stored → OFFLINE, `'online'` stored → ONLINE). Do not clear or migrate what is already stored; do not remove the key.
- The ONLINE/OFFLINE control, its disabled-while-live behaviour, and the whole OFFLINE console stay exactly as they are. This is a default only — never a removal of OFFLINE, and no change to `/api/*` or to any offline-lane file.
- Update the comment on that line and the `ModePill` tooltip text so they no longer claim OFFLINE is the default (the OFFLINE tooltip currently says "mặc định").
- If any other place assumes OFFLINE-first (docs, `docs/ONLINE-LANE-CONTRACT.md`, README, tests), update it in the same commit and list what you changed.

**Placement is already correct and must not move.** State this back to the reviewer explicitly after checking it:

- The live translation UI for **both** lanes lives in the **Dịch hội nghị** screen (`src/pages/AudioRouting.tsx`) — one screen, one mode switch. Do not create a new page, route, tab or menu entry for the ONLINE lane.
- Key entry stays in the app's **Cài đặt** page, in the existing "Chế độ ONLINE — Khóa API" section.
- `/online-lab` stays a hidden, unlinked debug bench.

### TASK 6 — Responsive layout pass

The app is currently desktop-only: it breaks when the window is narrowed and is unusable on a phone. The reviewer inspected the source and found the concrete causes below. Fix each one; treat the list as the minimum, not the whole job.

| # | Where | What is wrong today | Requirement |
|---|---|---|---|
| 1 | `src/components/OperatorLayout.tsx` — the context rail is `hidden md:flex … w-[248px]` | Below 768 px the tool navigation **disappears entirely with no replacement**, so on a phone or a shrunk window the user cannot reach any tool of the current section | Below `md`, expose the same items through a proper mobile navigation (hamburger button in the header opening an overlay drawer, or an equivalent). Must trap focus, close on selection and on Escape, and not be reachable by tab while closed. Desktop (≥ `md`) behaviour and the collapse toggle stay exactly as they are. |
| 2 | Same file — the header is `h-20` with a top nav at `text-[21px]`, plus event switcher, status and logout, none of them responsive | The header crushes/overflows on narrow widths | Keep the section nav usable at every width: below `md` move the primary nav into the same mobile menu, keep the live status indicator visible, and never let the header overflow horizontally. |
| 3 | Same file — shell is `h-screen … overflow-clip` and the content row is `overflow-hidden` | When the viewport is short, content is **clipped instead of scrolling** — the user simply cannot reach the bottom of a page | The main content area must scroll vertically when it does not fit. The page body must never scroll horizontally at any width ≥ 320 px. |
| 4 | `src/pages/AudioRouting.tsx` — `ModePill` is `absolute top-3 right-4 z-50` | The ONLINE/OFFLINE control **overlaps page content** on narrow widths | Keep it floating on desktop; below `md` place it in normal flow (or shrink to an icon-only segmented control) so it never covers controls or text. It must stay obviously discoverable and keep its disabled-while-live behaviour. |
| 5 | `src/lib/lanes/online/components/OnlinePanel.tsx` — inline `gridTemplateColumns: '1fr 1fr'` | The two columns are hard-coded, so on a phone both halves are squeezed and unreadable | Stack to a single column below `sm`, two columns from `md` up. The subtitle feed must scroll inside its own container, and long unbroken text must wrap instead of widening the page. |
| 6 | `src/lib/lanes/online/components/OnlineKeysSettings.tsx`, `src/pages/Settings.tsx` | No responsive rules at all | Inputs and buttons must be full-width and comfortably tappable on a phone; labels must not overlap their status text. |
| 7 | App-wide | — | Touch targets ≥ 44×44 px on mobile; form inputs at ≥ 16 px font size so iOS does not zoom on focus; any table or wide block scrolls inside its own `overflow-x:auto` container, never the page. |

Behaviour, wording, colours and desktop appearance must not change — this is layout only. Do not touch pipeline logic, the facade's public surface, the offline lane's behaviour, or the protected files (`src/lib/api.ts`, `LiveSessionContext.tsx`, `useMeter.ts`, `src/lib/lanes/types.ts`).

**Verify by actually rendering**, not by reading code. Drive the app in a browser at these viewports and report what you saw at each: **360×640, 390×844, 768×1024, 1024×768, 1280×800, 1920×1080**. At every one of them check: no horizontal page scroll; the tool navigation is reachable; the live screen's mode control is visible and does not cover anything; the ONLINE panel is readable; the Settings key section is usable; the missing-key modal fits on screen.

### TASK 7 — Make the ONLINE console look native

`src/lib/lanes/online/components/OnlinePanel.tsx` still carries the debug bench's hard-coded inline dark styling (raw hex colours `#0f172a` / `#334155` / `#e2e8f0` / `#2563eb`, inline `style={{…}}` layout, no Tailwind tokens, no `material-symbols-outlined` icons). Next to the rest of the app — and especially now that it is the **default** screen — it looks like a different product. Convert it to the app's existing design system: the same tokens and classes the other pages use (`card-lux`, `surface-*`, `on-surface-*`, `outline-variant`, `btn-lux`, `field-lux`, `font-label-caps`, `material-symbols-outlined`, the shared `toast`). Follow `OnlineKeysSettings.tsx` as the reference — that file **already** conforms, so do not restyle it; only give it the responsive/tap-target treatment from TASK 6 and fix the one conflicting `className` that sets both `block` and `flex` on the same label, plus the missing `htmlFor`/`id` pairing between each label and its input.

The status indicator, the level meter, the subtitle feed, the diagnostics readout and the transcript-save controls must all remain present and keep their exact meaning — this is a reskin, not a redesign.

Constraints: appearance only — no change to props, state, the facade API, or any behaviour; `/online-lab` must keep working identically through the same components; no new dependencies.

### TASK 8 — Rewrite `README.md`

The current README no longer matches the repository. Rewrite it in **Vietnamese** (matching the repo's existing documentation language), accurate to what is actually in the tree today, covering:

1. What the app is, and the **two lanes**: the existing self-hosted OFFLINE lane at `/api/*`, and the ONLINE lane ported in-process into `server.js` at `/online-api/*` — including the rule that they never run simultaneously, how the user switches between them on the **Dịch hội nghị** screen, and that the current default is **ONLINE** (because the self-hosted backend is not wired into this deployment yet) while the user's own choice is remembered.
2. Requirements and how to run: Node version, `npm ci`, `npm run dev`, `npm run build`, `npm test`, `npm start`; how the dev proxy works.
3. **Deployment**: Railway builds `develop` with `npm ci` → `npm run build` → `npm start`; the server listens on `process.env.PORT`; and the lockfile rule from TASK 4 stated plainly as a deployment gotcha.
4. **Configuration**: the six ONLINE service values can be entered at runtime through Settings (stored server-side, write-only, never returned or logged) with environment variables as the permanent fallback; runtime-entered values are lost on redeploy because the platform disk is ephemeral. Refer to the services generically (speech recognition / translation refinement / speech synthesis). **Never write an actual key value, a vendor model identifier, or a vendor API host in the README.**
5. **Repository layout**: a short map of `src/pages`, `src/components`, `src/lib`, `src/lib/lanes/online/` (facade + components), `server.js`, `docs/`.
6. **Rules for anyone working in this repo**: lane isolation, the exactly-two sanctioned integration points that may import the online facade root, the protected offline files, `/online-lab` as a hidden debug bench, and the "no secrets in the client bundle" rule.
7. A short pointer list to `docs/ONLINE-LANE-CONTRACT.md`, `docs/ONLINE-LANE-UI-API.md`, and `CLAUDE.md`.

Keep it concise and practical (roughly one screen per section, no marketing prose). Verify every command you document by running it.

<constraints>
STAGE 1 must be committed and pushed **before** any STAGE 2 work begins, and STAGE 2 must be a separate commit (or commits). Never mix them.
No dependency upgrades, no new runtime dependencies, no Railway/platform changes from the repo side, no `npm audit fix`.
Do not commit `node_modules/`, `dist/`, or `online-keys.json`. Do not add any `.env` file. No key value, vendor model identifier, or vendor API host may appear anywhere in `src/`, in the built bundle, in logs, or in the README.
Do not weaken the auth gate or the config endpoints. Keep `/online-lab` hidden and unlinked.
The default-mode change (TASK 5) is a **fallback only**: the OFFLINE lane, its files, its endpoints and the mode switch all stay fully functional, and a stored user choice always wins.
Do not create any new page, route, tab or menu entry: the live translation UI stays in `AudioRouting.tsx` ("Dịch hội nghị") and key entry stays in the Settings page.
If `npm ci` still fails after regeneration, or a responsive fix would require changing behaviour or a protected file, stop and ask instead of improvising.
</constraints>

<acceptance_criteria>
Verify each yourself before replying — by running the command or looking at the rendered screen, not by reasoning:
- [ ] `rm -rf node_modules && npm ci` succeeds on `develop` (paste the real output).
- [ ] `npm run build` succeeds and `npm test` shows 30/30 passing — both after STAGE 1 and again after STAGE 2.
- [ ] The STAGE 1 commit contains only `package-lock.json` (+ `CLAUDE.md`), is pushed to `develop`, and the resulting production deployment reports **success**.
- [ ] With `localStorage` cleared, opening the live screen lands on **ONLINE**; after choosing OFFLINE and reloading it stays on OFFLINE; after choosing ONLINE and reloading it stays on ONLINE. (Check all three in a real browser.)
- [ ] At all six viewports listed in TASK 6: no horizontal page scroll, tool navigation reachable, mode control visible without overlapping, ONLINE panel readable, Settings key section usable, missing-key modal fits.
- [ ] Desktop at 1920×1080 looks the same as before STAGE 2 apart from the intended restyle of `OnlinePanel`.
- [ ] No new route, page or menu entry was added; the ONLINE UI is still reached only from the "Dịch hội nghị" screen and keys only from Settings.
- [ ] OFFLINE mode still behaves exactly as before (quick regression pass), and `/online-lab` still works.
- [ ] The built output still contains the ONLINE UI (e.g. `grep -o "Luồng dịch" dist/assets/*.js`) and still contains **no** env name, model id, API host, or key value.
- [ ] Every command documented in the new README was actually run by you.
</acceptance_criteria>

<report_format>
Reply in exactly this structure (the reviewer cannot open this repo):
1. **Summary** — ≤6 lines in English + 1 closing line in Vietnamese (tóm tắt 1 dòng).
2. **STAGE 1** — `git diff --stat -- package-lock.json`, the entries added/removed, verbatim tails of `npm ci` / `npm run build` / `npm test`, the pushed commit SHA, and the production deployment status after the push (success/failure with evidence).
3. **STAGE 2 — default mode** — the exact diff of the fallback line, the three localStorage cases you tested and what happened, every other place you updated because it assumed OFFLINE-first, and an explicit confirmation that the live UI and the key entry stayed in their existing screens (no new route/page/menu).
4. **STAGE 2 — responsive** — the TASK 6 table with what you changed for each row, then a viewport-by-viewport report of what you observed at 360×640, 390×844, 768×1024, 1024×768, 1280×800, 1920×1080. State plainly which you checked in a real browser and which you did not.
5. **STAGE 2 — restyle + README** — files changed; a short outline of the new README's sections; confirmation that no secret, model id, or API host appears in it.
6. **Verification output** — verbatim tails of the post-STAGE-2 `npm run build`, `npm test`, and both greps. If you did not run something, say so explicitly.
7. **Operator actions** — numbered, simple Vietnamese: what the operator must do on Railway now, and where to look to confirm the deploy went green.
8. **Questions / uncertainties** — anything unresolved. Never invent a result.
</report_format>
