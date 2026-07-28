# PROMPT 09 — ONLINE lane inside the operator console: one console two lanes · one mic two directions · audience wall · subtitle mechanism

> This is the **complete, single-run** version of PROMPT 09. It replaces the earlier three-task draft: the operator reviewed a working preview of that draft and asked for ten further changes, which are now folded in here as TASK 4–TASK 11, plus a reliability list as TASK 12. Run this prompt once; do not look for a PROMPT 10 for these items.
>
> **The job ends on the live site, not in the editor.** Phases 7, 8 and 9 — review and fix, dry acceptance, then deploy, live test and debug — are part of this prompt and are not optional extras.
>
> **Run it in one continuous pass.** Do not stop between phases for approval and do not send a report per phase; keep a running log, and write **one** overall report at the very end of Phase 9. The only things that stop the run are the four red lights in rule 7 below.
>
> **Start at "How to run this prompt — nine phases, in order", immediately after the task list.** The twelve tasks are the specification; the phases are the order you execute them in and the gates that tell you a phase is done. Do not begin editing before you have read that section.

<role>
You are a senior front-end engineer working in the **ATS_UserUI** repository. TASK 1–TASK 10 are UI architecture; TASK 11 replaces the speech-recognition transport underneath it; TASK 12 is the reliability list that keeps the whole thing standing for a two-hour ceremony. Either way: no new npm dependency, one new backend endpoint, one new route. The OFFLINE lane is production-critical for a real gala — it must come out of this work rendering and behaving exactly as it does today. Read `CLAUDE.md` before you start; its two-lane rules are binding for every task below.
</role>

<context>
**Current state — verified by the reviewer, no need to re-check.**
Commit `d2eedfe` is live on Railway. The reviewer reproduced the build locally and got byte-identical asset hashes (`assets/index-Cks_aJVu.js`, `assets/index-vaIXQ7bt.css`), downloaded the live bundle and confirmed it contains no vendor env name, model id, API host or key value, ran `npm ci` clean and `npm test` (7 files / 30 tests pass), and confirmed no offline-lane file was touched by STAGE 2. The lockfile root cause and its fix in `74beb8e` were confirmed line by line. PROMPT-08 is accepted.

**Then the operator used it, and reported three defects.**

**Defect 1 — ONLINE is a different screen, not the same console.**
On `/audio`, OFFLINE renders `OfflineConsole` in `src/pages/AudioRouting.tsx`: a full operator console — a 248 px left control rail (Bắt đầu dịch · MÀN KHÁN GIẢ · ÂM THANH & GIỌNG · NỘI DUNG · Cài đặt & thiết bị), a centre stage that is always "the screen" (ceremonial standby: **20周年 / 2006–2026 / ESUHAI / PROYAKU · …**, or a two-column live bilingual monitor), a status strip with the annunciator + VI⇄JA pill, a trust-HUD strip, a thin VU line, and a right-hand pre-event settings drawer.

ONLINE renders `OnlineConferenceMode` (same file, near the bottom): a plain scrolling page, `max-w-4xl mx-auto px-6 py-8`, with an `<h1>Dịch hội nghị — Chế độ ONLINE</h1>` and the `OnlinePanel` card stack under it. Functionally complete, but it looks and feels like a different application. The operator's words: *"I want it to blend into the interface, not be a new screen. Same screen — just that the setup is my online one instead of the self-hosted offline one."*

**Defect 2 — the lane switch overlaps the settings drawer.**
`ModePill` in `src/pages/AudioRouting.tsx` is positioned `xl:absolute xl:top-3 xl:right-4` with `z-50`, inside the page. The OFFLINE console's settings drawer is `absolute top-0 right-0 … z-40`. So when the operator opens **Cài đặt & thiết bị**, the "Luồng dịch OFFLINE|ONLINE" pill paints on top of the drawer's "Cài đặt phiên (Pre-event)" header. The operator wants the switch **out of the page and up in the head bar**, on the right, on the same row as the **DỊCH HỘI NGHỊ** pill — next to the red **DỪNG** button.

**Defect 3 — the head-bar DỪNG button does nothing in ONLINE mode.**
`src/components/OperatorLayout.tsx` renders the emergency-stop button as `onClick={() => session.stop()}` — that is the OFFLINE `LiveSessionContext`. In ONLINE mode the operator presses it and the online capture keeps running. DỪNG must stop translation on whichever lane is live — and on the ONLINE lane, where the console carries its own stop button, it must not be shown at all (2.4).

**Then the operator reviewed a preview of the fix and asked for ten more things.** These are TASK 4–TASK 11, and they are what the real event actually needs:

1. The left rail must survive small screens, including an icon-only collapsed mode.
2. **NỘI DUNG** must share data with Từ điển / Bộ nhớ diễn giả / Kịch bản from the **Chuẩn bị** area. The term mechanism itself stays as it is — what is missing is that nobody fills the box. The terms must reach both places that can use them: the **recogniser**, as keyterms while it listens (TASK 11), and the **refine stage**, which decides how each name is written in the translation (11.12).
3. Add an **ÂM THANH & GIỌNG** group for ONLINE: a rail settings panel. The voice field becomes a **dropdown listing the real voices from the voice service** (including "my voices"), and there are two speed modes — *auto* (the existing emotion/pace logic) and *manual*.
4. **MÀN KHÁN GIẢ** like "transync": **one mic, one stream, output to three screens**. The two side screens are two detachable windows, one per translation direction — a Japanese stretch and a Vietnamese stretch go into the *same* microphone, so the lane must recognise per utterance which language was spoken and route it to the right window. Most of the ceremony is scripted; only off-script remarks need live AI. An **"Xuất"** button puts each window on its matching monitor. All of it responsive.
5. A precise **subtitle display mechanism** (nine rules, TASK 8). Behaviour exactly as specified; **colours, fonts and motion must come from the existing UI/UX design system**, not from a new visual language. The text must read like a page — starting at the **top**, left to right, wrapping downward, scrolling only once the screen is full. In the preview it grew from the bottom upward, which reads as running backwards.
6. Route prefix is wrong — the conference console lives at `/audio`, which is a name about audio devices, not about the console.
7. The OFFLINE status pill and the DỪNG button must not appear on the **Chuẩn bị** page.
8. The label **"Khoá dịch vụ"** must say what it is in the provider's own words: **"Khoá dịch vụ (API Key)"** — and inside the Settings section each field must be named after the **provider it belongs to** ("API Key của ElevenLabs", "API Key của GPT (OpenAI)"), not after the job we use it for. The person filling the form already knows what we do with the value; what they cannot guess is whose website to go to (9.1a).
9. *(added after that review)* The speech recognition itself must change: **one recogniser, ElevenLabs Scribe v2 Realtime, with the browser dialling the vendor directly** — set up exactly like the vendor's own "Try the demo" page, from the handshake down to how the microphone is taken. The two-pass arrangement (Qwen3 ASR alongside Google Chirp) ends; Qwen3 stays only for the translation step after recognition. Once the recogniser is told the event's names directly, the language model's **second pass over the source transcript** is retired as well — it stays only on the subtitle (11.12). And because the hall microphone runs through a mixer and hears the whole room, the recogniser's *"ignore the audience murmur"* setting must be a **switch the technician can flip on the console during the rehearsal**, not a server setting (11.13). This is TASK 11.
10. The default operating mode is **"khách mời đeo tai nghe"**: MC and presenters speak VI/JA into the hall microphone and out the hall speakers; the software captures in parallel and delivers the translated voice into the **guests' headphones**. The microphone therefore never hears the translated voice, so the anti-echo gate must default to **off** (full duplex — nothing is dropped when speaker and voice overlap).

**And one more thing, which came from a code review rather than from the operator.** Before this release goes to a live hall, a reading of the ONLINE lane's server and save path turned up a short list of defects that nobody notices in a ten-minute test and everybody notices during a two-hour ceremony: sockets that are never closed, a save failure that turns into a download every thirty seconds on the projected screen, an audio queue with no ceiling, an upstream that can hang forever without ever timing out. None of them is a feature; all of them are the difference between a system that survives the evening and one that has to be restarted in front of an audience. They are **TASK 12**, and they run last, after everything else is working. This is the last item because it is the only one that can be safely dropped if time runs out — but drop it deliberately and say so, do not simply not reach it.

**Explicitly OUT OF SCOPE for this prompt (owner's decision, do not do it):** authentication / `AUTH_PASSWORD` / any access gate on `/online-api/*`. The owner has decided to leave the deployment open for now. Do not add a login, do not add a password prompt, do not change `server.js` **auth** behaviour. (TASK 12 does touch `server.js`, but only its static-file path check — nothing to do with the login. If a hardening item cannot be done without adding an access gate, skip that item and report it instead.)
</context>

<task>
1. Render the ONLINE lane inside the **same console layout** as OFFLINE — same rail, same stage, same status strip, same settings drawer. Full feature parity with `OnlinePanel`.
2. Move the ONLINE/OFFLINE switch into the head bar's right cluster; make head-bar **DỪNG** stop whichever lane is live, and hide it entirely on the ONLINE lane, where the console's own rail button is the stop; hide the session-control cluster on pages where no session can be controlled.
3. Rename the console route `/audio` → `/console`, keeping `/audio` as a redirect.
4. Fill **NỘI DUNG** from the Chuẩn bị data (Từ điển · Bộ nhớ diễn giả · buổi đang chọn).
5. Add the **ÂM THANH & GIỌNG** group: voice catalog dropdown + auto/manual speed.
6. One microphone, two directions: classify each utterance and translate it into the *other* language.
7. **MÀN KHÁN GIẢ**: detachable `/wall` windows, one per direction, with an **Xuất** button that places them on the right monitors.
8. Implement the nine-rule subtitle mechanism, shared by the console monitor and the wall windows, reading from the **top** down.
9. Wording and defaults: "Khoá dịch vụ (API Key)" everywhere, the Settings key fields named after their **provider**; anti-echo gate defaults to off (headphone mode).
10. Responsive pass + the small cleanups at the end.
11. Swap the ONLINE lane's speech recognition to **Scribe v2 Realtime, dialled directly from the browser** — one recogniser instead of two, one network hop instead of two, audio taken raw from the chosen device — stop the key gate demanding the two credentials this swap retires, retire the language model's rewrite of the source transcript now that the recogniser knows the event's names, and put the hall-babble rejection on a switch in the settings drawer so it can be tried both ways at the rehearsal.
12. Harden the lane for a long live evening: close what is never closed, cap what is never capped, and stop the save fallback from raining downloads onto the projected screen.
</task>

---

## How to run this prompt — nine phases, in order

This document is long on purpose: it is one release, specified once, so that nothing has to be guessed later. **Do not read it end to end and then start typing.** Work it phase by phase. Each phase below is a self-contained unit of work with its own gate, and you do not open the next phase until the current gate is green.

**The seven rules that keep this from going wrong:**

1. **Phases run in order.** They are ordered by dependency, not by importance. Phase N assumes Phase N−1 landed and its gate passed. Where a later phase adds something to an earlier phase's work, the earlier section says so.
2. **One phase, one commit.** The commit letters are given per phase. Phase 4 in particular must stay its own commit — it is the one change that may have to be reverted on its own if the hall's network blocks the direct socket. The last two phases are the exception in one direction only: their commits contain **fixes and nothing else**, and a fix that turns into a feature has left its phase.
3. **One file, one writer.** Inside a phase you may work in parallel, but two workers must never hold the same file. Three files are edited in almost every phase and are exactly where a parallel run corrupts itself: **`server/online-api.mjs`**, **`src/lib/lanes/online/index.ts`** (the facade) and **`src/lib/lanes/online/components/OnlineConsole.tsx`**. Per phase, name one owner for each of those three; everyone else hands their change to the owner as a described patch instead of editing it.
4. **Parallelise the reading and the brand-new files; serialise the edits.** If your environment gives you subagents, background agents, worktrees or parallel tool calls, the safe fan-out is: read-only exploration, brand-new files nobody else touches, independent test files, and verification sweeps. If you have none of that, run the same items one after another — **the phase order is what matters; the parallelism is only speed.** Never parallelise two writers onto one file to save time.
5. **A subagent gets a slice, never the whole prompt.** Hand a worker exactly three things: the phase section it is working on, the **Hard constraints** section at the bottom, and `CLAUDE.md`. Handing a worker all twelve tasks is how a worker ends up "helpfully" refactoring the OFFLINE console.
6. **A gate is run, not reasoned about.** At the end of every phase: `npm run lint`, `npm test`, `npm run build`, plus `git diff src/pages/AudioRouting.tsx` to confirm `OfflineConsole` is still untouched. A phase whose gate you did not actually execute is not finished.
7. **Run straight through; write it down as you go; report once at the end.** Do not stop between phases to ask permission and do not send a report per phase — that is decided. Instead keep a running log at `docs/PROMPT-09-RUN-LOG.md`, appending three lines as each phase closes: what landed, the gate result, anything you had to decide on your own or could not prove. Add a line the moment something goes wrong, while you still remember the exact error. That file is the raw material for the one **Report back** written at the very end of Phase 9 — and it is what makes a wrong turn traceable to the phase that made it.

   **The four red lights that do stop the run**, immediately and before the next phase: `git diff src/pages/AudioRouting.tsx` shows `OfflineConsole` changed · the bundle grep finds a vendor env name, model id, API host or key value · `src/lib/lanes/types.ts` needs to change · `package.json` needs to change. Stop, write down exactly what you hit, and hand it to the owner. Everything else you decide yourself, note in the log, and keep moving.

| Phase | What it is | Tasks | Commit | Depends on |
|---|---|---|---|---|
| **0** | Read the ground before touching it | — | none | — |
| **1** | One console, two lanes | TASK 1 · 2 · 3 | A + B | 0 |
| **2** | Session content and voices | TASK 4 · 5 | C | 1 |
| **3** | One mic two directions · audience wall · subtitles | TASK 6 · 7 · 8 | D | 1 (2 for the rail groups) |
| **4** | Swap the recogniser | TASK 11 (11.1–11.13) | E | 1, and 3 for `language=auto` |
| **5** | Wording, defaults, responsive, cleanups | TASK 9 · 10 | F | 4 (9.1a reads 11.10's `required`) |
| **6** | Survive the evening (reliability) | TASK 12 | G | 4 (it edits what Phase 4 rewrote) |
| **7** | Hunt your own bugs before the hall does | — | H (fixes only) | 6 |
| **8** | Dry acceptance — everything provable without a live session | — | — | 7 |
| **9** | Deploy · owner's live test · one batched debug round · the single report | — | I₁…Iₙ (fixes) | 8 |

---

### PHASE 0 — Read before you write (no code at all)

**Goal.** Know where everything already is, and prove the starting point is healthy, so that a later failure is attributable to your change.

**Do:** read `CLAUDE.md` (its two-lane rules bind every phase), `docs/ONLINE-LANE-CONTRACT.md`, `src/pages/AudioRouting.tsx` (both the `OfflineConsole` and the `OnlineConferenceMode` halves), `src/components/OperatorLayout.tsx`, the online facade `src/lib/lanes/online/index.ts` and `OnlinePanel`, and `server/online-api.mjs` + `server/online-config.mjs`. Then run `npm ci`, `npm test`, `npm run build` on the untouched tree and write the numbers down.

**Parallel-safe (all read-only):** one worker per area — console layout · head bar/routing · online facade · server endpoints — each returning a short map of "what lives where, and which symbols the next phase will need". This is the single best use of parallel agents in the whole prompt: four readers, one page of notes, no edits.

**Gate.** Baseline recorded: test count (should be 7 files / 30 tests), build succeeds, `git status` clean. A written file map exists.

---

### PHASE 1 — One console, two lanes (TASK 1 · 2 · 3) — commits A + B

**Goal.** The ONLINE lane renders inside the same console shell as OFFLINE; the lane switch moves to the head bar; DỪNG behaves per 2.4; `/audio` becomes `/console`.

**Order inside the phase:** `ConferenceModeContext` (2.1) → head bar + routing (2.2–2.5, TASK 3) → `OnlineConsole` (1.1–1.3). The context comes first because both of the others read it.

**Parallel-safe:** the new `src/lib/ConferenceModeContext.tsx` and the route work in `src/App.tsx` are disjoint from the console copy and can run alongside it.
**Single writer:** `src/pages/AudioRouting.tsx` (one worker only — this is the file where a stray edit breaks the gala console), `src/components/OperatorLayout.tsx`, `OnlineConsole.tsx`, the facade `index.ts`.

**Two forward references, so this phase does not block on later ones:** the drawer's **Nguồn vào** section (§1.2) gets a second checkbox in Phase 4 (11.13) — build the section now, leave room. The preflight row's `n/m` reads the server's `required` list, which only appears in Phase 4 (11.10); the specified fallback ("all six when the field is absent") is what makes this phase work on its own, so implement the fallback now rather than hard-coding six.

**Gate.** Acceptance items: OfflineConsole diff proof · the two consoles look alike · head-bar switch swaps in place and is disabled while busy · drawer not overlapped · DỪNG absent on ONLINE and still present for a running OFFLINE session · rail `Dừng dịch` stops on one click · Chuẩn bị has no pill and no DỪNG · `/audio` redirects · feature-parity walk-through of `OnlinePanel`.

---

### PHASE 2 — Session content and voices (TASK 4 · 5) — commit C

**Goal.** The Thuật ngữ and Bối cảnh boxes fill themselves from Chuẩn bị; the operator picks a voice by name and can override the rate.

**Parallel-safe:** `src/lib/prepData.ts` + `tests/prepData.test.ts` (brand-new, lane-neutral) · the `GET /online-api/voices` endpoint in the server · `ttsPlayback.ts`. Three workers, three disjoint file sets.
**Single writer:** the facade `index.ts` (it gains the voice state of 5.3) and `OnlineConsole.tsx` (the two flyouts). Land those last, once the three above are in.
**Server owner for this phase:** the voices worker. Nobody else opens `server/online-api.mjs` in Phase 2.

**Gate.** Thuật ngữ auto-fills and states its counts; hand-typed text survives; **Nạp từ Chuẩn bị** overwrites; `/api` unreachable degrades with a message. The `/online-api/voices` body carries no provider voice id. Voice and speed changes apply from the next sentence while running.

---

### PHASE 3 — One mic, two directions · audience wall · subtitle mechanism (TASK 6 · 7 · 8) — commit D

**Goal.** One microphone serves both languages, the two audience windows exist and can be placed on the hall monitors, and one shared subtitle block drives both the console monitor and the wall.

**Parallel-safe — this is the widest fan-out in the prompt.** Five brand-new files, each with its own test file, none of which imports another: `utteranceDirection.ts` · `audienceChannel.ts` · `audienceSubtitles.ts` · `SubtitleParagraphs.tsx` · `audienceWindows.ts`. Give each to its own worker with only TASK 6.1 / 7.1 / 8 / 7.3 respectively.
**Single writer, and only after those land:** `onlineLane.ts` (6.2 wiring), the facade `index.ts` (6.3, 7.3.1, 8's font state), `OnlineConsole.tsx` (the MÀN KHÁN GIẢ group and the two-column monitor), `src/pages/AudienceWall.tsx`, `src/App.tsx` (the `/wall` route), `src/index.css` (three lines), and `server/online-api.mjs` — this phase's only server change is accepting `language=auto` and omitting the language field on the proxied path (6.2); one worker, and not the same one editing the client.

**Gate.** Two languages into one microphone land in the right columns and never jump after finalisation · Xuất opens and re-places windows · closing a window by hand is reflected within a second · backfill works · the nine subtitle rules · **and the reading-direction check (top-anchored, filling downward)** — that last one is a specific defect the operator already reported once, so do not skip it.

---

### PHASE 4 — Swap the recogniser (TASK 11, all of 11.1–11.13) — commit E, on its own

**Goal.** One recogniser instead of two, dialled directly from the browser; the key gate stops asking for the two credentials this retires; no model rewrites the source transcript; the hall-babble switch reaches the settings drawer.

**Keep this phase whole and keep it separate.** Server and client change together here: mint the ticket in Phase 4 without the client adapter and the lane cannot dial at all. If you must pause mid-phase, `ONLINE_ASR_PROVIDER=qwen3` puts the old path back with no front-end change (11.6) — verify that escape hatch *before* you need it.

**Order inside the phase:** server (11.1 token + keyterms + params, 11.10 required-keys, 11.12 refine prompt, 11.13 server half) → client adapter (11.2) → capture (11.3) → lane wiring, commit and reconnect (11.4, 11.5) → the facade preference and the drawer checkbox (11.13 client half) → contract (11.8) → tests (11.11 + 11.13).

**Parallel-safe:** `asrTransport.ts` and its test suite can be written against the message vocabulary in 11.2 while the server work is in flight — the adapter never imports the server. The bundle-leak grep of 11.9 and the contract edit of 11.8 are also independent.
**Single writer:** `server/online-api.mjs` — **one worker for the whole phase**, carrying 11.1, 11.10, 11.12 and 11.13's server half together. These four touch the same three functions; splitting them across workers is the most likely way to lose an edit. Also single-writer: `onlineLane.ts`, `pcm16Capture.ts`, the facade `index.ts`, `OnlineConsole.tsx`.

**Gate.** Raw capture proven in DevTools · JSON frames only, 8192 bytes decoded · one token per dial · the Dừng commit is last on the wire · no double subtitles · the long keyterm is dropped without killing the session · fatal vs retryable · rollback to `qwen3` · the retired keys no longer block Start · nobody rewrites what was heard · the hall switch behaves in all three states · **the microphone is released when capture setup fails (11.3)** · **the last sentence still receives its finished translation (11.4)** · nothing leaked into the bundle.

**No report at the end of this phase.** Run the gate, append the three lines to the run log, go straight into Phase 5. And do not deadlock here: any gate item that needs a real spoken sentence against a real credential cannot be proven on your machine — prove everything else, write that item into the log as **owed**, and carry it to the Phase 8 owed list where it will be tested live. An owed item is never reported as passed; but it is also not a reason to stop the run.

---

### PHASE 5 — Wording, defaults, responsive, cleanups (TASK 9 · 10) — commit F

**Goal.** Every visible string reads "Khoá dịch vụ (API Key)", the key fields are named after their provider, the anti-echo gate defaults to headphone mode, and the shell survives 390–1920 px.

**Why last:** 9.1a's line above the key list is built from the server's `required` list, which only exists after Phase 4. Doing this earlier means writing it twice.

**Parallel-safe:** the wording sweep (9.1) · the responsive measurements at the six widths (10.1) · the comment-drift and `h-[100dvh]` cleanups (10.2, 10.3) · the drawer `EventSwitcher` clipping fix (10.4). Four workers, four small disjoint areas — but they all end up editing shared files, so have each one *report* its exact change and let a single writer apply the ones that land in `OperatorLayout.tsx` / `AudioRouting.tsx`.

**Gate.** No `Khóa API` / `Khoá API` left anywhere · the six provider-named labels read exactly as specified and each hint says where to get the value · gate defaults to off on a fresh profile · zero horizontal overflow at all six widths · a stated decision about the 768–1279 px breakpoint.

---

### PHASE 6 — Survive the evening (TASK 12) — commit G

**Goal.** The eight reliability defects of TASK 12, none of which changes anything the operator sees when everything goes right, and every one of which decides what happens when something goes wrong.

**Why last:** two of these items live in files Phase 4 rewrites (`onlineLane.ts`, `server/online-api.mjs`). Doing them earlier means doing them twice, on code that is about to be replaced.

**Parallel-safe:** the three server items (12.1, 12.2, 12.4) are disjoint from the two client items (12.3, 12.5), and the new test file (12.8) is nobody else's file. Three workers at most.
**Single writer:** `server/online-api.mjs` (12.1 and 12.4 together — same file, one owner) · `onlineLane.ts` (12.3 and 12.5) · `server.js` (12.2 only, and **only** the static-file line — a worker sent into `server.js` must be told in the same breath that the login code is out of scope).

**This phase may be dropped, but only on purpose.** If you run out of time or something here turns out to be riskier than it looks, ship phases 1–5 and say clearly in your report which TASK 12 items were not done and why. Half-doing one is worse than skipping it.

**Gate.** An unknown WebSocket path is refused instead of hanging · a save failure downloads nothing during the session and both files on Dừng · the audio queue has a stated ceiling · a dead upstream fails within its timeout instead of forever · the diagnostics show the send backlog · `npm test` covers the config helper.

---

### PHASE 7 — Hunt your own bugs before the hall does — commit H (fixes only)

**Goal.** The code is finished; now find what is wrong with it while it is still cheap. Nothing new is built in this phase. Every change here is a fix for something you found, and each one gets a one-line note saying what it fixed.

**Do it in this order — cheapest signal first:**

1. **The mechanical gate, on the whole tree, from clean.** `npm ci` (not `npm install` — prove the lockfile is honest), then `npm run lint`, `npm test`, `npm run build`. Any warning that appeared during this work and was not there in the Phase 0 baseline counts as a finding, not as noise: compare against the numbers you wrote down in Phase 0 and state the difference.
2. **Read your own diff.** `git diff main...HEAD` end to end. Not the files — the *diff*. This is the single most productive half hour in the whole prompt, and it is where the leftovers live: a `console.log` you added while chasing the audio path, a `TODO`, a commented-out block, a temporary timeout of 50 ms you meant to put back to 700, a debug flag left on, a file added to git that should not be in the repo. Grep the diff for `console.`, `TODO`, `FIXME`, `debugger`, `localhost`, `127.0.0.1`, and hard-coded ports.
3. **Run a proper review pass.** If your environment has a code-review command — in Claude Code that is `/code-review` — run it over the branch and work through what it reports. If the command is not available to you, do the same thing deliberately instead: give a fresh subagent the branch diff, the **Hard constraints** section and `CLAUDE.md`, and ask it to find defects, not to praise the work. Two or three reviewers with different briefs beat one general one: **(a)** *does this break the OFFLINE lane or the two-lane rules* · **(b)** *correctness of the audio and socket lifecycle — leaks, races, things never closed, promises never awaited* · **(c)** *does anything leak a vendor env name, model id, host or key into `src/`, the bundle, a log line or an error message*. Say in your report which of these you ran and how.
4. **Triage what comes back — do not fix everything.** Three buckets, and say which bucket each finding went in: **fix now** (anything wrong, anything that leaks, anything that breaks a hard constraint, anything the operator can trip over on the night) · **write down and leave** (style, naming, refactors, "could be nicer") · **disagree** (the reviewer is wrong — say why in one line). A review that produced twenty changes is usually a review that got obeyed instead of read. Do not let a review pass turn into a redesign at the end of a long piece of work.
5. **Re-run the gate after the fixes** — all four commands again, plus `git diff src/pages/AudioRouting.tsx` one last time to prove `OfflineConsole` never moved. A fix is not finished until the gate is green *after* it.

**Parallel-safe:** the reviewers of step 3 are read-only and run beautifully in parallel — that is the best fan-out in the second half of this prompt. The fixes afterwards are serial, one file one writer, exactly as before.

**Gate.** `npm ci` + lint + test + build all green from a clean tree · the diff has been read end to end and contains no debug leftovers · the review pass ran and every finding is in one of the three buckets · `OfflineConsole` still untouched.

---

### PHASE 8 — Dry acceptance: everything that can be proven without a live session

The acceptance list at the bottom splits in two, by one rule: **an item that needs a spoken sentence to be recognised is a live item; everything else is dry.** The dry items are proven here, at your desk, before the deploy. The live items are proven in Phase 9, on the deployed site, by the owner, with the real keys and a real microphone — that is the only place they can honestly be proven, so do not fake them here.

**Dry — run every one of these now, in one sitting, on the build that came out of Phase 7:** the `OfflineConsole` diff proof · the two consoles rendering alike · the head-bar switch, its disabled-while-busy state, and DỪNG hidden on ONLINE · Chuẩn bị carrying neither pill nor DỪNG · the drawer and all its sections · the missing-keys modal and the preflight counter · `/audio` redirecting · every wording item of 9.1 and the six provider-named labels · the anti-echo default on a fresh profile · the six responsive widths · the bundle grep for env names, model ids, hosts and `xi-api-key` · the whole vitest suite · `/online-lab` still rendering `OnlinePanel` · the response *shapes* of `config-status` and `voices`. A check that passed in Phase 2 can be broken by Phase 4 — that is exactly what this pass is for. Anything that fails goes back to Phase 7's fix loop, and then this list runs again.

**Live — do not attempt these here, and above all do not mark them passed.** Write them into an explicit **owed list** that travels to Phase 9: two-way VI/JA · the voice catalog and the two speed modes · the audience windows, Xuất and backfill · the nine subtitle rules and the reading direction · the Dừng commit and the last sentence's finished translation · the hall-babble switch in all three states · the 11.10 and 11.12 behaviour against a live token · every TASK 12 item. **An owed item is not a passed item**, and no report may present it as one. This is the single easiest way for a long run like this to end up looking finished while being unverified.

No report is written in this phase. There is exactly one report, at the end of Phase 9.

---

### PHASE 9 — Deploy, hand it to the owner, then fix everything in one batch

**Deploying is not the last step. Watching the deploy is.** A build that is green locally can be red on Railway for reasons that have nothing to do with your code being wrong, and the only person who can tell the difference is the one who just wrote it. Do not hand over a deploy you have not seen serve a real page.

**Deploy without asking.** The owner has already authorised this phase; do not stop at the edge of it to request permission. Stop only for a red light (see the stop rules) or when there is nothing left to do.

**The keys are the owner's, and they stay that way.** The four values the direct path needs — `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `VI_ELEVENLABS_VOICE_ID` — are set by the owner as **Railway environment variables**, not through the Settings form, exactly because of 12.7: `online-keys.json` sits on an ephemeral disk and is erased by every redeploy, while environment variables survive one. Never ask for a key value, never accept one in chat, never print one. Your job is to make the app tell you *whether* they are set — `config-status` — not what they are.

**Before you push:** note the currently-live deployment — its commit and its id — in one line. That is your rollback point, and you will want it at exactly the moment you are least able to think of it.

**1. Push and watch the build.** Follow the Railway build log to the end rather than assuming. If it fails, the failure is almost always one of a short list — check these before theorising:
- **`npm ci` rejects the lockfile.** This is CLAUDE.md rule 7 and it is the classic: your local npm 11/12 accepts a lockfile that Railway's npm 10 refuses. If `package.json` changed at all in this work — it should not have — regenerate the lockfile under Node 20 / npm 10 in a container and push that.
- **A TypeScript or build error that lint did not catch** — usually a file that only the production build type-checks.
- **A missing env var at build time**, or a `VITE_` variable you expected to exist and does not.

**2. Watch the boot, which is a different log from the build.** A green build followed by a crash loop is a *deploy* log problem, not a build one. Look for: the port binding (`process.env.PORT`, never a hard-coded number), the dist path resolving on Linux where the case of a filename matters and on Windows it did not, and a module that only exists in devDependencies. Then confirm through `config-status` that the four required values are present on the service; if one is missing, say **which slug** is missing and let the owner set it — do not work around it.

**3. The four checks you can run alone.** Do these yourself, before spending anyone else's time:
1. `/console` loads and the head bar shows both lanes.
2. `GET /online-api/config-status` over HTTPS returns the expected `required` list — and no key value anywhere in the body.
3. The OFFLINE lane still works. Check this **before** the online one: it is the lane that must never have been touched, and it is the one whose breakage would be entirely your fault.
4. `GET /online-api/voices` returns the catalog with no provider voice id in it.

Anything wrong here you fix immediately, without waiting: it is your own build failing its own basics.

**4. Hand over for the live test.** Give the owner the live URL, the serving commit, and the **owed list** from Phase 8 — the items that need a real microphone and a real hall. They walk it and come back with everything that is wrong, as one list.

**5. The debug round — one batch, not one item at a time.** The point of collecting the whole list first is that you fix it in one pass and redeploy once, instead of interrupting the owner for every small thing. The rules that make a batch safe:
- **Reproduce before you change anything.** Get the exact error text out of the browser console, the network tab or the Railway log — the real message, not your reading of it. Put it in your report verbatim.
- **Decide which side it is on first**: browser (console, network) · our server (Railway deploy log) · the vendor (an error event on the ASR socket, an HTTP status from their host). The fix for each is in a different place and guessing wrong costs a whole cycle.
- **Independent problems are batched; related ones are not.** Group the list by cause. Problems that clearly cannot influence each other are fixed together and go out in one redeploy — **each still its own commit**, each message naming the one thing it fixes. But if two symptoms could share a root cause, or if a fix does not do what you expected, drop back to one hypothesis, one change, one deploy until it is understood.
- **Never skip the local gate to save time.** `npm test` and `npm run build` before every push, without exception. A hotfix that breaks the build costs more than the bug did.
- **A fix fixes; it does not improve.** No refactoring, no renaming, no "while I am in here". A second problem you notice goes on the list, not into this commit.
- **Three failed rounds on the same symptom = stop and report.** Roll back to the deployment you noted at the start, say exactly what you saw and what you tried, and hand it over. Rolling back is a result; a site left broken while you keep trying is not.
- **Nothing from a log goes into the report unredacted.** Keys and tokens appear in error output; redact them there and then, not later.

**6. The single report.** There is one report for this whole prompt and it is written here, at the end — not per phase, and not before the deploy. Write the **Report back** section below in the order given, and with it: the live URL and the serving commit · every phase's one-line result · everything that went wrong during the run and how it ended · the owed list with each item marked passed or failed · every fix made in the debug round with the error that caused it. If something never worked, say **that**, and say precisely where it stops. An honest "the tail commit still drops the last sentence, here is the error" is worth more than a confident "deployed".

---

## TASK 1 (PHASE 1) — One console, two lanes

### 1.1 Slot mapping (this is the specification — follow it)

| Console slot as it exists today (OFFLINE) | What ONLINE puts there |
|---|---|
| **Rail · A · PHIÊN** — `Bắt đầu dịch` (primary, disabled until pre-flight passes) / while live, a red **`Dừng dịch`** button | `start()` / `stop()` from `useOnlineLane`. Keep the existing missing-keys gate: before `start()`, `await fetchOnlineConfigStatus()`; if `!ready` (or it throws) show `MissingKeysModal` → **Mở Cài đặt** → `/settings#ok`. **Dừng dịch is a plain one-click button — no hold-to-confirm, no confirm dialog** (see §1.1a). |
| **Rail · B · MÀN KHÁN GIẢ** (Xuất phụ đề · Live/Giữ hình/Màn an toàn · Reveal) | **Do not reuse the OFFLINE buttons** — `/stream` and `/reveal` read the OFFLINE `LiveSessionContext` and would be dead. ONLINE gets its **own** MÀN KHÁN GIẢ group: a two-way toggle and an **Xuất màn khán giả** flyout. See TASK 7. |
| **Rail · C · ÂM THANH & GIỌNG** (Đang đọc tiếng / Chỉ phụ đề · Tốc độ · Âm lượng) | `Đang đọc tiếng / Chỉ phụ đề` → `speakEnabled` / `setSpeakEnabled` (identical icon + label logic). `Chống dội (gate)` → a rail flyout with the three `gateMode` choices and the existing explanatory note. Voice + speed → see TASK 5. |
| **Rail · D · NỘI DUNG** (Người nói · Từ điển) | `Thuật ngữ / corpus` → rail flyout containing the existing `terms` textarea (≤ 2000 chars, same counter/limit) **plus the "Nạp từ Chuẩn bị" button of TASK 4**. `Bối cảnh (brief)` → rail flyout with the `brief` textarea, same button. `Lưu transcript` → `saveSession()`, with `saveStatus` shown under the button. |
| **Rail foot** (Cài đặt & thiết bị · Chế độ nhanh · Toàn màn hình · Thoát console) | `Cài đặt & thiết bị` opens the same right drawer (see 1.2), with the same readiness dot (`bg-secondary` when ready, `bg-primary animate-pulse` when not). Drop `Chế độ nhanh` (offline-only). Keep `Toàn màn hình` and `Thoát console` verbatim. |
| **Status strip** — annunciator dot + label + `mm:ss` timer, centred VI⇄JA pill | Map `LaneStatus` onto the vocabulary the offline annunciator already uses: `idle`/`stopped` → `STANDBY`, `connecting` → `CONNECTING…`, `ready` → `READY`, `listening` → `LIVE`, `reconnecting` → `MẤT KẾT NỐI · ĐANG KẾT NỐI LẠI`, `error` → `FAULT · LỖI`. Reuse the same dot colours/animations (`listening-pulse` on LIVE). Keep the `mm:ss` session timer. The VI⇄JA pill highlights the source side of `direction` — and in two-way mode (TASK 6) **both** sides light and the label reads `VI ⇄ JA`. |
| **Centre stage — live** (two columns: `TIẾNG VIỆT` / `日本語`) | The same two columns, but they are **language** columns, not source/target columns — in two-way mode a column is sometimes the source and sometimes the translation. Each column renders through the shared subtitle block of TASK 8. |
| **Centre stage — standby** (20周年 / 2006–2026 / ESUHAI + a status sentence) | Identical, only the sentence changes: keys missing → `Chưa nhập khoá dịch vụ (API Key) — mở ⚙ Cài đặt & thiết bị để nhập.`; keys present → `Nhấn ▶ Bắt đầu dịch ở thanh bên trái để lên sóng — kết quả song ngữ sẽ hiện ngay tại đây.` |
| **Error strip** at the top of the stage | The lane's `error` string, in the same red bordered strip. |
| **Trust-HUD strip** (only while live) | The essentials from `diagnostics`, in the same one-line monospace style: `TRỄ  draft p50 · refine p50 · tts p50`, `ĐỌC  ttsQueue N · gate on/off`, `KẾT NỐI  reconnects N`. The **full** diagnostics block (voicedMsRecent, droppedGhosts, draftCalls, skip dup/rate/inflight, refineCalls, refineRetries, gatedMs, p90s, usageReport, sinceEvent) moves into the drawer — see 1.2. Nothing is lost, only relocated. |
| **Bottom VU line** | `level` from `useOnlineLane` (same thin gradient bar). |
| **Right drawer — "Cài đặt phiên (Pre-event)"** | See 1.2. |

### 1.1a Stopping: one button, one click

`Dừng dịch` at the top of the rail is the **only** stop control the ONLINE lane shows (the head-bar DỪNG is hidden here — 2.4), and it stops on a plain `onClick`.

Do not gate it behind a press-and-hold, a progress fill, or a confirm dialog. A hold-to-stop was tried and it fails in the room: the operator presses, nothing visibly happens, and they conclude the button is broken — mid-conference, that is the worst possible moment to be guessing which control works. Weigh the two mistakes honestly: an accidental stop costs a few seconds (press Bắt đầu dịch again; the transcript is still there), while a stop button that reads as broken costs the operator's trust in the whole console. Label it `Dừng dịch`, `aria-label="Dừng phiên dịch"`, red, full width, first item in the rail.

### 1.2 The ONLINE settings drawer (same 400 px drawer, same section styling)

1. **KIỂM TRA · n/4 đạt** — same checklist widget, ONLINE items:
   `Khoá dịch vụ (API Key) · n/m` (from `fetchOnlineConfigStatus`; **`m` is the number of keys the server says it needs — read it from the response, never write a literal 6**, see 11.10) · `Mic sẵn sàng` (a device is selected and still present in `inputDevices`) · `Thiết bị ra` (`outputDeviceId` resolvable, or "Mặc định hệ thống") · `Hướng dịch đã chọn`. When keys are missing, show a button **Nhập khoá dịch vụ (API Key)** → `/settings#ok`. Unlike OFFLINE there is no hard backend gate, but `Bắt đầu dịch` stays gated on the required keys via the existing modal.
2. **Nguồn vào** — `Micro` select (`inputDevices`) + `Quét lại` (`refreshDevices`) + the `Noise gate (near-mic)` checkbox with its current label, **and directly under it the new `Bỏ qua tiếng xì xào hội trường` checkbox of TASK 11.13** with its state-dependent explanation.
3. **Chiều dịch** — the `VI → JA` / `JA → VI` segmented pair, **plus the two-way checkbox of TASK 6** with its one-line explanation.
4. **Ngõ ra** — `Thiết bị ra` select (`outputDevices`) · `Đọc bản dịch` on/off · `Chống dội (gate)` select, plus the existing note *"Đổi thiết bị ra áp dụng từ câu kế tiếp. Chế độ gate chốt khi Bắt đầu (đổi lúc đang chạy không áp)."*
5. **Chẩn đoán** — the full diagnostics block, verbatim text, in the same monospace style it uses today.

All of these are `disabled` while `running`, exactly as the OFFLINE drawer disables device pickers while a session is active.

### 1.3 File plan — DUPLICATE the shell, do NOT refactor the OFFLINE console

The OFFLINE console is the production bench for a real gala. The owner's #1 requirement for this prompt is: **the OFFLINE front-end code does not change.** Therefore:

- **Do NOT extract, restructure, or "share" any part of `OfflineConsole`.** No lifting its markup into common components, no renaming, no reordering, no "harmless" cleanup inside it. The `OfflineConsole` component (and every helper it uses — `RailBtn`, `MonitorColumn`, `VolRow`, `renderOutput`, the popovers, the settings drawer) must be **byte-identical** after your change. Verification is part of the job: `git diff` on `src/pages/AudioRouting.tsx` must show changes ONLY in the wrapper/`ModePill`/`OnlineConferenceMode` region at the bottom of the file — zero changed lines inside `OfflineConsole` or its helpers.
- New `src/lib/lanes/online/components/OnlineConsole.tsx` — the ONLINE console, built as **its own copy** of the offline console's layout markup with the same class strings, same DOM structure, same spacing, so the two modes are visually indistinguishable at the frame level. Copy–paste from `OfflineConsole` and swap the wiring to `useOnlineLane`. Yes, this duplicates markup — that is a deliberate, owner-approved trade: duplication is cheap, breaking the gala console is not. Do not "fix" the duplication.
- `OnlineConsole` lives entirely inside `src/lib/lanes/online/` and is exported from the facade root `src/lib/lanes/online/index.ts`. It must **not** import `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, or `src/lib/useMeter.ts`.
- `src/pages/AudioRouting.tsx` shrinks to: read `mode` from the new context (TASK 2) and render `<OfflineConsole/>` or `<OnlineConsole/>`. Delete `ModePill` and `OnlineConferenceMode` from it (`MissingKeysModal` moves next to `OnlineConsole` inside the online lane).
- `OnlinePanel` **stays exported and working** — `/online-lab` still uses it as the bench. Do not delete it.

---

## TASK 2 (PHASE 1) — Head bar: lane switch, DỪNG, and where the session cluster is allowed to appear

**2.1 Neutral mode context.** New `src/lib/ConferenceModeContext.tsx` — imports nothing from `src/lib/lanes/`, so it belongs to neither lane:

```ts
mode: 'offline' | 'online'          // persisted at localStorage['proyaku_conference_mode']
setMode(m): void                    // no-op while `busy`
busy: boolean                       // a capture is live on the current lane
setBusy(v: boolean): void           // each console reports its own running state
registerStop(fn: (() => void) | null): void   // the ACTIVE console registers its stop function
requestStop(): void                 // head-bar DỪNG calls this
```

Keep the current default rule exactly: only an explicitly stored `'offline'` selects OFFLINE; unset or `'online'` → ONLINE. Mount the provider where `LiveSessionProvider` is mounted (above the router shell), so both `OperatorLayout` and `AudioRouting` can read it.

**2.2 The switch in the head bar.** Render it in `src/components/OperatorLayout.tsx`, in the right-hand cluster **before** the status light and the DỪNG button, and **only while the ops menu is active** (`cur.key === 'ops'`) — the lane is meaningless on Chuẩn bị / Báo cáo / Cài đặt.

- Same segmented look it has now (`OFFLINE` | `ONLINE`), `bg-secondary text-on-secondary` on the selected side, sized to sit on the head-bar row without pushing DỪNG off screen (an `h-7` pill inside a `rounded-full` border fits the `h-14` mobile bar).
- Keep a short `LUỒNG` label at `xl`+ and hide it below `xl`.
- `disabled` when `busy`, with `title="Đang chạy — hãy Dừng trước khi đổi luồng"`.
- Delete the page-level `ModePill` entirely — do not leave a second copy.

**2.3 Never two captures.** A mode change is blocked while either lane is live, and switching unmounts the other lane so `useOnlineLane`'s cleanup releases the mic (tracks `readyState === 'ended'`) before the other lane can claim it.

**2.4 DỪNG stops the live lane — and disappears where a better button already exists.** The head-bar button becomes `onClick={() => { session.stop(); requestStop(); }}`.

**Keep the `session.stop()` call** — do NOT replace it with `requestStop()` alone. The DỪNG button exists on every operator page, and today it stops an OFFLINE session from any of them. If it only called `requestStop()`, no console would be registered on those pages and the button would silently become a no-op — a regression on the OFFLINE lane. `session.stop()` on an idle session is harmless, so calling both is safe in either mode.

`requestStop()` covers the ONLINE side: `OnlineConsole` registers `() => void stop()` from the facade while it is mounted and clears the registration on unmount. The OFFLINE registration is done by the `AudioRouting` wrapper (which already calls `useLiveSession()`), **not** inside `OfflineConsole` — that file must not change. Keep the button never-guarded (no confirm dialog) — it is the emergency stop.

**Then hide it on the ONLINE lane.** Render the DỪNG button only when `!(mode === 'online' && !isSessionActive(session.status))`. Reasoning, because it looks like a contradiction of the paragraphs above and is not:

- The ONLINE console has its own red **Dừng dịch** at the top of the left rail (§1.1), and an ONLINE session **stops by itself when the operator leaves the console**, so the head-bar button can only ever appear on the very screen that already has a bigger, closer stop button. Two red stops in two corners is one decision too many at the moment it matters.
- The wiring stays exactly as specified above. The condition keeps the button whenever an OFFLINE session is genuinely running — including while the operator is looking at the ONLINE lane — because there it is the only way to stop that session.
- Do not "simplify" this to `mode === 'offline'`: that would strip the emergency stop from a live OFFLINE session the moment somebody flipped the lane switch.

**2.5 Hide the session cluster where it controls nothing (operator request 7).**
On **Chuẩn bị**, the head bar today shows a red **DỪNG** button and an `OFFLINE` status pill even though no session exists and no lane is selected. The operator reads that as "something is broken". Two rules:

- Render the whole cluster (lane switch · status light · DỪNG) only when `opsActive || isSessionActive(session.status)` — i.e. on the console, or when a session is genuinely still running after the operator has navigated away, where DỪNG must stay within reach.
- Render the status light only when `mode === 'offline' || isSessionActive(session.status)`. That light reads the OFFLINE backend; while the operator is on the ONLINE lane it would print the word "OFFLINE" right next to the word "ONLINE". The ONLINE console has its own annunciator in the status strip.

---

## TASK 3 (PHASE 1) — Rename the console route (operator request 6)

`/audio` describes audio devices; the page is the live interpretation console.

- `/console` → `AudioRouting` (the console).
- `/audio` → `<Navigate to="/console" replace />`, so existing bookmarks and any already-open window keep working. Do not delete it.
- `MENUS` in `OperatorLayout.tsx`: the ops entry becomes `match: ['/console', '/audio']` and its "Điều khiển" tool points at `/console`. Sweep the repo for other `/audio` links and update them; leave the redirect as the only remaining reference.
- Do **not** rename the file `src/pages/AudioRouting.tsx` in this prompt — a file rename on top of everything else makes the diff unreadable. A comment at the top of the file noting the route name is enough.

---

## TASK 4 (PHASE 2) — NỘI DUNG reads the Chuẩn bị data (operator request 2)

**The mechanism already works and does not change.** `terms` already goes to the recogniser as the biasing corpus (`corpus`, ≤ 2000 chars — keyterms on the direct path, `?corpus=` on the proxied one) *and* to the refine stage as `sessionTerms`; `brief` already goes to refine as `sessionBrief`. So both the listening stage and the translation stage already consume terms — **what is missing is that nothing ever fills the boxes.** The technician built the Từ điển, the Bộ nhớ diễn giả and the Kịch bản over in Chuẩn bị and then had to retype the terms by hand into the console, where a misspelt person's name is visible to the whole hall.

New **lane-neutral** module `src/lib/prepData.ts` — it must live outside `src/lib/lanes/online/` because it reads offline-side stores (`./api` glossary, `./speakers`, `./script`, `./schedule`) and CLAUDE.md rule 2 forbids a lane file from being imported by non-lane code and vice versa. It is read-only: it never writes back to any Chuẩn bị store.

```ts
export interface PrepPack {
    terms: string;   // ready to paste into the console box, already trimmed to the core's limits
    brief: string;
    stats: { termLines: number; glossary: number; speakers: number; scriptApproved: number; dropped: number };
    glossaryReachable: boolean;  // false = /api absent (an ONLINE-only deploy) — not an error
}
export async function collectPrepPack(conf: Conference | undefined, dir: 'vi2ja' | 'ja2vi'): Promise<PrepPack>
```

Rules it must obey:

- **The source side of the session decides the left-hand side of each line.** `vi2ja` → `tiếng Việt = 日本語`; `ja2vi` → the reverse. Feeding the wrong side makes the recogniser bias towards words nobody is about to say. Re-collect when the direction changes.
- Output format, one per line: `nguồn = đích`, or bare `nguồn` meaning *"this name is correct — push mishearings back onto it"*.
- **Priority ordering is mandatory, not an optimisation**: the core accepts at most **40 term lines** and the box caps at **2000 characters**, so the overflow is dropped. Rank `0` = speaker names and glossary entries flagged `asr_hotword`; `1` = speaker aliases, entries typed `name`/`company`; `2` = everything else. De-duplicate case-insensitively (`toLocaleLowerCase('vi')`) before truncating, and report how many were dropped.
- Speakers contribute their canonical name as a bare line, and each alias as `alias = canonical name`.
- `brief` is built from the active conference: `Hội nghị: <title · date · venue>` / `Nội dung: <agenda>` / `Người phát biểu:` + one `- Tên (chức danh · đơn vị)` per speaker, capped at 1500 chars.
- **It must never throw.** Every source is read inside a guard; a missing source contributes nothing. `getGlossary()` lives behind `/api`, which does not exist on an ONLINE-only deploy — catch it, set `glossaryReachable: false`, and carry on with the localStorage sources.

Wiring in `OnlineConsole`:

- Read the active conference from `useActiveEvent()`.
- **Auto-load once per (event × direction)**, and only into boxes that are still empty — auto-fill must never overwrite something the technician typed.
- A **Nạp từ Chuẩn bị** button in both the Thuật ngữ and Bối cảnh flyouts reloads on demand and **does** overwrite — that is what the person pressing it means. Disable it while running.
- Under the boxes, print what arrived, in numbers: `12 thuật ngữ · 30 mục từ điển · 4 diễn giả`, plus `còn N mục vượt hạn mức 40 dòng` when something was dropped, plus `chưa với tới Từ điển trên máy chủ nội bộ` when `glossaryReachable` is false. The technician must be able to see whether the data actually crossed over.
- `scriptApproved` is collected and displayed but not yet sent to the core — the approved script is a later feature; do not invent an endpoint for it.

Add `tests/prepData.test.ts`: direction flipping, priority + 40-line truncation with the dropped count, alias rows, and a glossary fetch that rejects (must still return a usable pack with `glossaryReachable: false`).

---

## TASK 5 (PHASE 2) — ÂM THANH & GIỌNG for ONLINE (operator request 3)

Today the two voices are typed as raw voice IDs in Settings and never change. The operator wants to pick a voice **by name** from the account's real catalog, including their own cloned voices, and to override the speaking rate.

**5.1 Server — new endpoint `GET /online-api/voices?language=vi|ja`** in `server/online-api.mjs`.

This is the only new endpoint in this prompt. It exists because of CLAUDE.md rule 6: the key may not leave the server, so the browser cannot call the provider itself.

- Fetch the account's voice list with the existing TTS key, cache it in-process for 5 minutes (`TTS_VOICE_CATALOG_TTL_MS`), cap at 200 entries.
- **The provider's real voice id must never reach the browser.** Emit an opaque, stable slug instead: `v_ + sha256(voiceId).slice(0,12)`. The response contains exactly `{ voices: [{ slug, name, language, category, labels }], current, cachedAt }` — build that array by **listing the fields explicitly**, never by spreading the provider's object, or the next API version will leak a new field into the bundle.
- `category: 'personal'` for cloned/professional/generated/personal voices — these are the operator's "my voices" and must sort **first**, then alphabetically by name.
- Language filter: keep voices whose language matches **and** voices with no language label at all (multilingual voices usually carry no label; filtering them out would empty the list).
- `503` when no TTS key is configured, `502` when the provider does not answer. Both are non-fatal for the UI.

`POST /online-api/tts` gains an optional `voice` field carrying that slug. Resolve it back to the real id through the cached catalog; **an unknown or unresolvable slug falls back to the configured voice, it does not fail the request.** Picking a voice is a convenience — it must never be able to kill the audio path mid-ceremony.

**5.2 Playback module.** `src/lib/lanes/online/ttsPlayback.ts` gains `setTtsVoice(language, slug | undefined)` and `setTtsManualSpeed(speed | undefined)`. In `fetchTtsResponse`, the manual speed wins when set, otherwise the per-sentence `ttsSpeed` computed from the speaker's own pace is kept: `const speed = manualSpeed ?? item.speed`. Send `voice` only when a slug is chosen.

**5.3 Facade.** `useOnlineLane` exposes `voices: Record<'ja'|'vi', OnlineVoice[]>`, `voicesStatus`, `refreshVoices()`, `voiceJa/setVoiceJa`, `voiceVi/setVoiceVi`, `speedMode/setSpeedMode` (`'auto' | 'manual'`), `manualSpeed/setManualSpeed`, and `ONLINE_SPEED_RANGE = { min: 0.85, max: 1.2, step: 0.01 }`. Persist each choice to `localStorage` (`proyaku_online_voice_ja`, `…_voice_vi`, `…_speed_mode`, `…_manual_speed`) inside a try/catch — private mode must not break the console. Load the catalog once when the console mounts so the panel is populated before it is opened; a failure is normal (no TTS key yet) and shows *"Chưa lấy được danh sách giọng — vẫn dùng giọng đã cài sẵn."*

Changing voice or speed **while running** is allowed and must apply from the next sentence — that is normal behaviour in a hall.

**5.4 UI.** A rail flyout under **ÂM THANH & GIỌNG** containing, in this order: `Đang đọc tiếng / Chỉ phụ đề`, the two voice dropdowns (`Giọng tiếng Nhật` / `Giọng tiếng Việt`, each with a `— Giọng đã cài sẵn —` first option and personal voices grouped at the top), the speed mode pair `Tự động theo nhịp nói` / `Đặt tay` with a slider bound to `ONLINE_SPEED_RANGE` shown only in manual mode, `Chống dội (gate)`, and a `Tải lại danh sách giọng` link. Use the existing select/label styling from the console — no new visual language.

---

## TASK 6 (PHASE 3) — One microphone, two directions (operator request 4, part 1)

At an Esuhai conference nobody hands out a second microphone. The MC speaks Vietnamese for a while, the Japanese guest speaks for a while, into the same mic. Pinning one language for the whole session makes half the ceremony come out as garbage.

**6.1 Classifier.** New `src/lib/lanes/online/utteranceDirection.ts` — pure functions, no network:

```ts
classifyUtterance(text, previous?): { language: 'vi'|'ja'; confidence: number; basis: 'script'|'sticky'|'default' }
directionOf(language): 'vi2ja' | 'ja2vi'
createDirectionTracker(initial): { next(text), current(), reset() }
```

Decide from the **script of the transcript**, not from a second model call — kana/kanji versus Latin is unambiguous, and every extra round trip is latency the audience feels:

- any kana → `ja` (confidence `0.8 + kana/10`);
- kanji with no Vietnamese diacritics → `ja` (`0.7 + kanji/10`);
- Vietnamese diacritics → `vi` (`0.7 + marks/8`);
- undiacriticised Latin only (`"OK"`, `"2026"`, `"Esuhai"`, Vietnamese typed without tone marks) → **not enough evidence**: keep the previous utterance's language (`basis: 'sticky'`, confidence `0.5`). People rarely switch language on a filler word, and flipping the direction mid-ceremony on a guess is far worse than being sticky.

The tracker only remembers a verdict when `basis === 'script'` and `confidence ≥ 0.6`, so one guessed utterance cannot drag the following ones off course. The first utterance of a session falls back to the direction the technician selected.

Add `tests/utteranceDirection.test.ts` covering: pure kana, kanji-only, Vietnamese with marks, mixed, the sticky path, an empty string, and that a low-confidence verdict does not update the tracker.

**6.2 Lane wiring — and the treaty stays closed.**
`LaneLine` in `src/lib/lanes/types.ts` has nowhere to put a per-utterance direction, and CLAUDE.md rule 3 says that file changes only with explicit confirmation. **Do not touch it.** Instead the direction leaves the lane through a lane-private channel, alongside `events.onLine` rather than instead of it:

```ts
export type DirectedLaneLine = LaneLine & { dir: 'vi2ja' | 'ja2vi' }

export interface OnlineLaneConfig {
  …
  getTwoWay?: () => boolean
  onDirectedLine?: (line: DirectedLaneLine) => void
}
```

In `createOnlineLane`:

- Read `getTwoWay()` **once, at `start()`** and latch it. The ASR socket is opened with one listening mode; flipping it mid-session only produces drift. Reset the tracker with the technician's chosen source language at the same moment.
- Two-way opens the ASR socket with `language=auto`; the server then simply omits the `language` field from the transcription config so the model detects it. One-way keeps today's behaviour exactly.
- A helper `speechOf(lid, sourceText, interim)` returns `{ source, target, dir }` for a single utterance. Interim text is only *guessed* (the words are still changing); the verdict is **settled** at finalisation and, once settled, an utterance may never change direction again — otherwise a sentence jumps from one audience window to the other in front of the hall.
- Feed `spoken.source` / `spoken.target` into the draft call, the refine call, the TTS enqueue, and `recordSessionLine` — so the saved transcript records the true language of each line, not the session default.
- `emitLine` calls `events.onLine(full)` unchanged, then `config.onDirectedLine?.({ ...full, dir })`.

**6.3 Facade + UI.** `useOnlineLane` exposes `twoWay` / `setTwoWay` (persisted at `proyaku_online_two_way`) and `directedLines: AudienceLine[]` — `lines` joined with the direction map that `onDirectedLine` maintains in a ref. The toggle appears twice, in the rail's MÀN KHÁN GIẢ group (icon `sync_alt` when on, `east` when off) and in the drawer's Chiều dịch section, both disabled while running, with one plain sentence: *"Một micro cho cả hai thứ tiếng: máy tự nhận ra câu vừa nói là tiếng Việt hay tiếng Nhật rồi dịch sang tiếng còn lại. Chiều đã chọn ở trên chỉ dùng cho câu đầu tiên."*

The console monitor's two columns become **language** columns fed from `directedLines`: for each line, the Vietnamese text (source when `vi2ja`, translation when `ja2vi`) goes into the VI column and the Japanese text into the JA column. Force each column's own direction into the renderer, so `jp-text` and `lineBreak: 'strict'` key off the *column*, not off the utterance.

---

## TASK 7 (PHASE 3) — MÀN KHÁN GIẢ: detachable windows + Xuất (operator request 4, part 2)

The hall has three screens: one centre screen for everybody and two flanking screens for the two delegations. In two-way mode the flanking screens are the **two directions of one microphone**, not two sessions.

**7.1 Transport — `src/lib/audienceChannel.ts` (lane-neutral).**
Audience windows are separate browser windows so they can be dragged onto another monitor; they share no memory with the console. `BroadcastChannel('proyaku-audience')` is the shortest path between two windows of the same origin: no network, no added latency, works with the venue's internet down.

This file must live **outside** `src/lib/lanes/online/` because `src/pages/AudienceWall.tsx` imports it and rule 2 forbids a non-lane page importing lane internals.

```ts
type AudienceLine = { lid; sourceText; targetText; interim; corrected; at; dir }
createAudiencePublisher(): { publish(line), reset(), close() }
subscribeAudience(onLines: (lines: AudienceLine[]) => void): () => void
```

- `publish` replaces an existing entry with the same `lid` (an utterance is revised: interim → final → refined), keeps a backlog of the last **80** lines, and posts `{type:'line', session, line}`.
- A new window posts `{type:'hello'}` on mount; the publisher answers with `{type:'snapshot', session, lines}`. **Without this backfill, a window opened after the ceremony started — or reopened after being closed by accident — stays blank until the next sentence, in front of the whole hall.** A subscriber accepts a snapshot only while it still has nothing, so a late snapshot cannot overwrite lines it already received.
- `reset()` bumps the session number and posts `{type:'reset'}`; every window clears. Call it from `start()` so a new session never begins with the previous one's sentences hanging on the wall.
- `BroadcastChannel` missing (very old browser) → every function is a safe no-op; the console must still run.

The publisher is created **when the console mounts**, not when the session starts, so windows opened before the opening ceremony are already connected.

**7.2 The window — `src/pages/AudienceWall.tsx`, route `/wall`.**
Full-screen, no operator chrome, alongside `/stream` and `/reveal`. Query parameters: `?dir=vi2ja|ja2vi|both`, `&src=1` to also show the source text (default off), `&font=<px>`.

- `dir=both` splits into two columns (`日本語` translation | `Tiếng Việt` translation); the single-direction views fill the screen with one column.
- Multiply the chosen font size by a wall scale (**2.6**) — the console slider is calibrated for a laptop, the wall is read from thirty metres.
- Keyboard: `F` fullscreen, `S` toggle source, `+` / `−` size, `0` reset. A control bar that fades out after a few seconds of no mouse movement, because it is projected.
- Everything it renders goes through the shared subtitle block of TASK 8 — the wall and the console monitor must never drift apart.

**7.3 Placing the windows — `src/lib/lanes/online/audienceWindows.ts`.**

```ts
type WallOutput = { id; label; enabled; view: 'vi2ja'|'ja2vi'|'both'; showSource: boolean; screenIdx?: number }
DEFAULT_WALL_OUTPUTS = [
  { id:'center', label:'Màn giữa', enabled:true, view:'both',  showSource:false },
  { id:'left',   label:'Màn trái', enabled:true, view:'vi2ja', showSource:false },
  { id:'right',  label:'Màn phải', enabled:true, view:'ja2vi', showSource:false },
]
```

Persist to `localStorage['proyaku_online_wall_outputs']`, merging a stored entry over its default so a stale or corrupt entry can never break the console mid-event.

- `detectWallScreens()` uses the **Window Management API** (`window.getScreenDetails()`, `screen.isExtended`) to learn how many monitors exist and where they are. Declare the two interfaces you need locally — do not depend on a particular TS lib version. Return one of `idle | unsupported | single | multi | denied` and **always keep a manual fallback**: no API (Firefox/Safari) or permission denied still opens the windows, evenly divided across the current screen, and tells the operator to drag them across and press `F`.
- `openWallWindows(outputs, screens, fontSize)` opens one popup per enabled output, named `proyaku-wall-<id>`. **`window.open` reuses a window with the same name and ignores the position string on reuse** — so remember the handles: an already-open window is re-navigated only when its URL actually changed (no flicker mid-ceremony) and is then moved/resized onto its assigned screen. Every `moveTo`/`resizeTo` is wrapped in try/catch; browsers restrict them.
- Return `{ opened, total, blocked }` so the UI can say something true: `blocked` means the pop-up blocker ate some.
- If a monitor is unplugged mid-event, `scanWallScreens()` clears any `screenIdx` that no longer exists rather than opening a window on the wrong screen.
- `getOpenWallIds(): string[]` — the ids of the windows that are **actually open right now**. It reads `win.closed` on each remembered handle (in a try/catch: a lost window counts as closed) and deletes the dead ones, so the next Xuất opens a fresh window instead of trying to steer one that no longer exists.
- `closeWallWindows()` — close every audience window at once (end of the event).

**7.3.1 The open count must be live state, not a message from the last click.**
A browser **never tells the parent page that a child window was closed** — there is no event for it. So if the console remembers "Đã xuất 3 màn" from the moment the button was pressed, that sentence stays on screen after the operator closes the windows by hand or a monitor is unplugged, and the technician believes the hall has subtitles when it has none. The only honest way is to ask the windows.

In the hook (`src/lib/lanes/online/index.ts`): keep `wallOpenIds: string[]` in state, refresh it from `getOpenWallIds()` on a `window.setInterval(…, 1000)` and immediately after `openWall()` / `closeWall()`, and only call `setState` when the list actually changed (it is three booleans a second — cheap, but there is no reason to re-render on every tick). Expose `wallOpenIds` and `closeWall` alongside `openWall`.

**Every piece of audience-window UI is derived from `wallOpenIds`.** The only thing the click handler is still allowed to remember is what cannot be read back from the windows — the pop-up blocker verdict and "no screen enabled" — and even that is cleared as soon as the open count changes.

**7.4 Rail group + flyout.** A **MÀN KHÁN GIẢ** group in the ONLINE rail with the two-way toggle and an **Xuất màn khán giả** button (icon `cast`) opening a flyout that contains:

- a **Quét màn hình** button plus one plain-Vietnamese line per support state — e.g. `multi` → `Thấy 3 màn hình — chọn màn cho từng cửa sổ rồi bấm Xuất.`; `unsupported` → `Trình duyệt này chưa tự nhận diện màn hình. Vẫn xuất được — mở xong kéo cửa sổ sang màn hội trường rồi bấm F.`; `denied` → `Chưa được phép sắp cửa sổ. Bấm Quét màn hình rồi chọn "Cho phép", hoặc kéo tay cũng được.`
- one card per output: enable checkbox, view select, screen select (only when more than one screen was found), and a `Hiện cả bản gốc` checkbox — plus, on every enabled card, a live badge read from `wallOpenIds`: **`Đang mở`** (a small `bg-secondary` dot + `text-secondary`) or **`Chưa mở`** (`text-on-surface-variant/70`). The operator must be able to tell at a glance *which* screen went dark, not just that one did;
- the **CỠ CHỮ PHỤ ĐỀ** slider (TASK 8) so the size can be set before exporting;
- the gold export button, labelled **`Xuất ra màn hình`** when nothing is open and **`Xuất lại`** when something is, next to it an outlined **`Đóng hết`** button (icon `close`) that appears only while at least one window is open — at the end of the evening the operator should not have to hunt for three windows on three monitors;
- a status line **computed from `wallOpenIds` on every render**, four cases:
  - no output enabled → `Chưa bật màn nào.`
  - none open → `Chưa mở cửa sổ nào (đã bật 3 màn). Bấm Xuất ra màn hình.`
  - some open → `Đang mở 2/3 cửa sổ — có màn đã bị đóng. Bấm Xuất lại để mở lại.`
  - all open → `Đang mở 3 cửa sổ. Kéo sang màn hội trường rồi bấm F để phóng toàn màn hình.`
- underneath it, only if there is something the windows cannot tell us: `Trình duyệt đang chặn cửa sổ bật lên (mở được 1/3) — cho phép rồi bấm Xuất lại.` or `Chưa bật màn nào — chọn ít nhất một màn rồi bấm Xuất.` This one line is the *only* remembered message, and it clears itself as soon as the open count changes;
- the rail button's collapsed-state dot follows `wallOpenIds.length > 0`, not "the operator pressed Xuất at some point";
- a warning when the session is one-way but a `both` screen is enabled — one of its two columns will stay empty all evening.

The flyout is taller than the others: give it `maxHeight: calc(100vh - 96px)` and `overflow-y-auto`, or the Xuất button falls off the bottom of a 768 px laptop screen.

Scan the screens automatically the first time the flyout is opened (`support === 'idle'`), not on mount — the permission prompt must be tied to the operator's action.

---

## TASK 8 (PHASE 3) — The subtitle mechanism (operator request 5)

**The behaviour below is the specification. The look is not: colours, fonts, bars, motion and empty states all come from the existing design system** (`text-on-surface`, `text-on-surface-variant`, `border-secondary`, `border-outline-variant`, `jp-text`, `listening-pulse`, `font-label-caps`). Do not introduce a new palette or a new typeface.

Split it in two so the console monitor and the wall windows can never drift apart:

**`src/lib/audienceSubtitles.ts` — pure computation, lane-neutral, unit-tested.**

1. **Nothing renders until there is a translation.** Lines whose `targetText` is empty are dropped entirely — no placeholder row, no reserved caption space, no blinking cursor.
2. `stableText` (finalised) in the main text colour; `volatileText` (still being spoken) appended immediately after it, italic at `opacity 0.42`.
3. **No source line, no ASR toggle on the audience wall.** The audience is listening to the original live; they only need the translation. (The operator console keeps both bilingual columns — that is the *operator's* screen, and the offline console already behaves that way.)
4. **Merge consecutive utterances into one paragraph** when: the gap is ≤ **7 s**, the direction is the same, the merged length is under **200 characters**, and the current paragraph has no unfinished tail. Otherwise start a new paragraph.
5. **Length is counted on the translation only** — `sourceText` never affects paragraph breaks, because it is not on screen.
6. Join with `''` for Japanese and `' '` for Vietnamese. Getting this wrong either glues words together or leaves a gap in the middle of a sentence, and both are obvious on a large screen.
7. The last paragraph is the **live** one: accent bar (`border-secondary`) + brighter text. Finished paragraphs get the pale bar (`border-outline-variant`).
8. `appendedTail(previous, next)` returns only the **newly appended** characters, so the animation runs on those and the text already being read stays perfectly still. If the text was *rewritten* rather than extended, treat the whole thing as new.
9. `SUBTITLE_FONT = { min: 12, max: 28, default: 18, step: 1 }` with a clamp helper. The console honours these literally; the wall multiplies by its own scale.

Empty state: `subtitleEmptyState()` returns `'listening'` when nothing has arrived at all and `'translating'` when utterances exist but none is translated yet — the operator must be able to tell "nobody has spoken" from "someone spoke and the translation has not landed".

**`src/components/SubtitleParagraphs.tsx` — the shared rendering block, lane-neutral** (the wall page imports it, so it cannot live under the lane directory).

Props: `{ lines, direction?, fontSize, scale?, className? }`.

- Auto-scroll: pin to the bottom in `useLayoutEffect` (before paint, or new text visibly jumps once before sliding down). When the viewer scrolls more than **80 px** away from the bottom, stop pinning and show a **"Về dòng mới nhất"** button; pressing it smooth-scrolls back and re-pins.
- **Text reads like a page, from the top down: `justify-start`, no `min-h-full`.** The first paragraph must sit against the **top** edge of the block; each new paragraph falls **below** the previous one; the screen fills downward and only then does the auto-scroll above start moving. Do **not** bottom-anchor the column (`justify-end` + `min-h-full`): that pins the first paragraph to the *bottom* of an empty screen and makes every later line shove the earlier ones *upward*, which the operator reads as subtitles running backwards. Bottom-anchoring is right for a two-line caption strip and wrong for a full-height wall — this block is the full-height wall. (The OFFLINE lane's own subtitle blocks in `src/pages/AudioRouting.tsx` and `src/pages/BilingualStream.tsx` keep `justify-end`. Do not touch them.)
- Per paragraph: `lang` attribute, `jp-text` and `lineBreak: 'strict'` for Japanese, the live/finished bar from rule 7, the appended tail wrapped in `<span class="sub-append">`.
- Empty state: a `listening-pulse` icon (`hearing` / `subtitles`) with `Đang lắng nghe…` / `Đang tạo phụ đề…` and the Japanese equivalents beneath.

**`src/index.css`** gains only:

```css
.sub-append { animation: subAppend 0.45s ease-out both; }
@keyframes subAppend { from { opacity: 0.25; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .sub-append { animation: none; } }
```

Fade in **opacity only, never position** — if the paragraph shifts a notch every time a word arrives, the audience loses the line they were reading.

The font size lives in `useOnlineLane` as `subtitleFont` / `setSubtitleFont`, persisted at `proyaku_online_subtitle_font`, and is passed to the opened windows as `?font=`.

Add `tests/audienceSubtitles.test.ts`: merge inside 7 s, split beyond it, split on direction change, split at 200 chars, untranslated lines ignored, the Japanese/Vietnamese joiners, `appendedTail` for both append and rewrite, the two empty states, and the font clamp.

---

## TASK 9 (PHASE 5) — Wording and defaults (operator requests 8 and 10)

**9.1 "Khoá dịch vụ (API Key)".** The person who fetches these keys is reading the provider's own English page. "Khoá dịch vụ" alone is friendly but does not match anything printed there. Every place the phrase appears must carry the parenthetical:

- `src/pages/Settings.tsx` — the section title becomes `Chế độ ONLINE — Khoá dịch vụ (API Key)`.
- `OnlineKeysSettings` intro — `Nhập khoá dịch vụ (API Key) cho luồng ONLINE.`
- `OnlineConsole` — the pre-flight row, the missing-keys modal (heading, body, aria-label, button), the standby sentence, and the `PROYAKU · CHỜ KHOÁ DỊCH VỤ` line.

Sweep for `Khóa API` / `Khoá API` and leave none behind.

**9.1a `ONLINE_KEY_FIELDS` labels name the PROVIDER, not the function.** The person filling this form is holding an account at a named company and looking at that company's website. A label like "Khoá đọc giọng — TTS (API Key)" describes what we do with the value, which is the one thing they already know; what they cannot work out is *whose* key goes in the box. So:

| slug | label | hint (where to get it — not what it does) |
|---|---|---|
| `asr_endpoint` | `Endpoint của Qwen` | `Địa chỉ wss workspace Qwen — chỉ dùng khi quay về cách nhận dạng cũ` |
| `asr_key` | `API Key của Qwen` | `Lấy ở trang Alibaba Cloud Model Studio (DashScope) → API Keys` |
| `refine_key` | `API Key của GPT (OpenAI)` | `Lấy ở platform.openai.com → API keys → Create new secret key` |
| `tts_key` | `API Key của ElevenLabs` | `Lấy ở elevenlabs.io → ảnh đại diện góc phải → API Keys` |
| `tts_voice_ja` | `Voice ID tiếng Nhật (ElevenLabs)` | `Ở elevenlabs.io → Voices → chọn giọng → nút Copy Voice ID` |
| `tts_voice_vi` | `Voice ID tiếng Việt (ElevenLabs)` | `Ở elevenlabs.io → Voices → chọn giọng → nút Copy Voice ID` |

Two things this deliberately does **not** do: it does not call a Voice ID an "API Key" (they are different values on different pages, and mixing the words is how a Voice ID ends up pasted into a key box), and it does not keep the functional description as a suffix.

Above the list, print one line that names the fields this configuration actually needs, **built from the server's `required` list** (11.10), never hard-coded — under the direct-dial recogniser that is the GPT key, the ElevenLabs key and the two ElevenLabs Voice IDs; the two Qwen fields are the rollback path and read `không bắt buộc`.

**This is the one place a provider's brand name is allowed in the client.** CLAUDE.md rule 6 bans vendor **env names, model ids, API hosts and key values** from `src/` and the bundle. A brand name in a form label is none of those. The dashboard addresses in the hints (`platform.openai.com`, `elevenlabs.io`) are the pages a human logs into to *create* a key — they are not the API hosts we call, and no request in this app is ever sent to them; the real hosts stay in `server/`, and the one the browser dials for TASK 11 arrives at runtime inside the token response (11.9), never as a literal in the bundle. Do not "fix" these labels back into functional descriptions to make a broad grep come out empty; grep for what rule 6 actually lists — env names, model ids, API hosts, key values.

**9.2 Headphone mode is the default.** `gateMode` currently defaults to `'auto'`, which mutes the microphone whenever the translated voice is speaking. That is right when the translation goes out over the hall speakers. It is **wrong for the way Esuhai actually runs the event**: the MC and the presenters speak into the hall microphone and out the hall speakers, while the software captures in parallel and sends the translated voice only into the **guests' headphones**. The microphone never hears the translated voice, so gating it only throws away words spoken while the voice is playing.

Change the default to `'off'` (full duplex) and say why in a comment at the declaration. `'auto'` and `'always'` stay available in the flyout and the drawer for the speaker-output setup — this is a change of default, not a removal.

---

## TASK 10 (PHASE 5) — Responsive pass and small cleanups (operator request 1 + carry-over)

1. **The rail must survive small screens.** Keep the collapsed, icon-only rail working: ~60–68 px wide with icons and tooltips only, group labels replaced by a thin divider, and the flyouts anchored to the collapsed width instead of the expanded one. Check that at 480 px the page has **zero** horizontal overflow (`document.documentElement.scrollWidth === clientWidth`) and that the rail is still usable — verify at 390 px, 480 px, 768 px, 900 px, 1280 px and 1920 px.
2. **Comment drift.** Several comments in `AudioRouting.tsx` and `OperatorLayout.tsx` still say *"dưới md"*, *"dưới lg"*, *"md:absolute"* while the classes are `max-xl:` / `xl:`. Make the comments state what the code actually does.
3. **`h-screen` → `h-[100dvh]`** on the `OperatorLayout` root, so mobile browser chrome does not cut off the bottom of the shell.
4. **Drawer `EventSwitcher` is clipped.** The mobile drawer renders a second `<EventSwitcher />` inside a panel that is `overflow-y-auto`; the switcher's dropdown is `absolute` and gets cut off. Make it usable (render it outside the scrolling area, or otherwise stop the clipping).
5. **Desktop breakpoint.** PROMPT-08 moved the desktop threshold from `md` (768) to `xl` (1280), so 768–1279 px (iPad landscape, small laptops) now loses the contextual rail and falls back to the hamburger. If that was deliberate, say so in your report and leave it. If not, consider `lg` (1024) for the rail while keeping the crowded head-bar nav at `xl`.

---

## TASK 11 (PHASE 4 · operator request 9) — Swap the ONLINE lane's speech recognition to Scribe v2 Realtime, dialled directly from the browser

**Why.** Today the ONLINE lane's ASR is Qwen3, reached over `WS /online-api/asr`: the browser's audio goes to our Node server, our server forwards it to the vendor, and every transcript walks the same two hops back. That is one extra round trip on *every* 256 ms packet, on a hall stage where the delay is the whole product. It is also a second vendor to keep alive when the account that powers our voice output already offers a realtime transcriber.

**What changes.** The recogniser becomes **ElevenLabs Scribe v2 Realtime** (`scribe_v2_realtime`), and the browser opens the socket **to the vendor directly**. Our server's only job is to mint a **single-use token** (15-minute lifetime, consumed on first use) and hand the browser one finished address. Set up everything — handshake parameters, capture format, commit strategy — to match the vendor's own **"Try the demo"** page for Speech to Text, because that demo is the quality baseline we are measured against.

**No new key, no new account.** `ELEVENLABS_API_KEY` is already configured for TTS and the voice catalog (`server/online-config.mjs` slug `tts_key`); the ASR reuses it. Nothing new for the operator to paste.

**11.1 Server — mint the ticket, never hand over the key.**
In `server/online-api.mjs`:
- Config block, all `env()`-driven with the defaults given here, so the event can be tuned without a redeploy: `ONLINE_ASR_PROVIDER` (default `scribe`; the literal value `qwen3` restores the old proxy path), `SCRIBE_MODEL_ID=scribe_v2_realtime`, `SCRIBE_WS_BASE=wss://api.elevenlabs.io`, `SCRIBE_TOKEN_URL=https://api.elevenlabs.io/v1/single-use-token/realtime_scribe`, `SCRIBE_COMMIT_STRATEGY=vad`, `SCRIBE_VAD_SILENCE_SECS=1.5`, `SCRIBE_VAD_THRESHOLD=0.4`, `SCRIBE_MIN_SPEECH_MS=100`, `SCRIBE_MIN_SILENCE_MS=100`, `SCRIBE_FILTER_BACKGROUND` (empty = do not send the parameter at all — demo parity; note this one is only the **fallback**: the operator's console switch of 11.13 outranks it in both directions), `SCRIBE_NO_VERBATIM` (also empty by default; `true` makes the recogniser itself drop fillers and stutters — see 11.12), `SCRIBE_SEND_LANGUAGE_CODE=false`.
- `mintScribeToken()` — `POST` the token URL with header `xi-api-key`, under the existing `withTimeout(…, ELEVENLABS_TIMEOUT_MS, …)`. On a non-OK response throw with **the HTTP status only**: the error body can carry account information. **Never log the token, never return it as its own field, never store it.**
- `pickScribeKeyterms(corpus)` — split the session terms on `[,\n;·]`, trim, drop empties. **Discard any term longer than 20 characters and cap the list at 30.** This is not a style choice: a single over-long keyterm makes Scribe reject the *entire session* — the failure was observed in the field on 14/07 with the term `Chương trình Vinh danh`. A dropped term still reaches the refine stage, so no meaning is lost. Return `{kept, dropped}`.
- `buildScribeWsParams({token, language, keyterms, roomFilter})` — `model_id`, `token`, `commit_strategy=vad` plus `vad_silence_threshold_secs` / `vad_threshold` / `min_speech_duration_ms` / `min_silence_duration_ms`, always `include_timestamps=true` and `include_language_detection=true`, one repeated `keyterms` parameter per kept term, and `no_verbatim` **only when its env var is non-empty** (an unset knob must add no parameter at all). `filter_background_audio` follows the three-state `roomFilter` rule of 11.13, whose OFF state also adds nothing. Do **not** send `audio_format` (`pcm_16000` is the default — fewer parameters, closer to the demo). Do **not** send `language_code` unless `SCRIBE_SEND_LANGUAGE_CODE=true`: the gala is bilingual and pinning a language is exactly what breaks TASK 6.
- Extend **the existing** `POST /online-api/realtime-preview-token` — do not invent a new endpoint. It now also accepts `language`, `corpus` and `roomFilter` (11.13) in the body, and answers:
  `{ mode:'transcribe', asrProvider, asrTransport:'direct', asrModel, asrCommitMode:'vad', asrTokenTtlMs, asrKeytermCount, asrKeytermsDropped, asrSourceCorrectionEnabled, asrCorrectionTermCount, asrRoomFilter, asrWsUrl }`
  where **`asrWsUrl` is one complete, opaque `wss://…` address** with the token and every parameter already attached. If minting fails, answer **503** with the message. Log one line per session with **counts only** (`asrKeytermCount`, `asrKeytermsDropped`) — no term text, no URL, no token.
- The `qwen3` branch keeps the old response and adds `asrTransport:'proxy'`, so the client chooses its path from one field and never from a vendor name.

**11.2 Client — one adapter, everything else unchanged.**
New file `src/lib/lanes/online/asrTransport.ts`. It is the **only** client file that knows this wire format, and it still must not contain a vendor name, a model id or a host — it receives `asrWsUrl` and opens it.
- `fetchAsrSession({targetLanguage, language, corpus})` → `POST` the token endpoint, reject anything that is not `mode:'transcribe'` with the existing "server is in WebRTC mode, fix server config" message, and return `{transport, url, commitMode}`. For `proxy`, compose the old `ws(s)://…/online-api/asr?language=…&corpus=…` exactly as today.
- `createAsrCodec(previousText?)` → `{encodeAudio, encodeCommit, decode}`.
  - `encodeAudio(pcm)` → `{message_type:'input_audio_chunk', audio_base_64, sample_rate:16000}`. `previous_text` rides on the **first chunk only**, and only when reconnecting — see 11.5.
  - `encodeCommit()` → the same message with `audio_base_64:''` and `commit:true`.
  - `decode(raw)` → `{event, fatal}`, mapping the vendor's vocabulary onto the lane's existing one so nothing downstream changes: `session_started` → `{type:'session.created'}`; `partial_transcript` → `{type:'conversation.item.input_audio_transcription.text', text:'', stash:<text>, language?}`; `committed_transcript`, `committed_transcript_with_timestamps`, `final_transcript`, `final_transcript_with_timestamps` → `{type:'conversation.item.input_audio_transcription.completed', transcript, language?}`; `commit_throttled` → `{type:'asr.commit_throttled'}` (diagnostic only); anything error-shaped → `{type:'error', error:{message}}`.
  - **De-duplicate the finals.** With `include_timestamps=true` a single committed sentence arrives as *two* messages — plain and timestamped — with identical text. Emit the first and swallow an identical text seen again within 2 s, otherwise the audience reads every sentence twice. Do not de-duplicate beyond that window: a speaker really does say "Vâng." twice.
  - `fatal: true` for `auth_error`, `quota_exceeded`, `unaccepted_terms` — reconnecting cannot fix any of them, so the lane must stop and tell the operator. Everything else is `fatal: false` and follows the normal reconnect ladder.
- In `onlineLane.ts`, `wsUrl()` and `fetchToken()` disappear into one `async openWs(initial = false)`. Because the token is single-use, **it fetches a fresh session on every dial, including every reconnect** — never reuse an address. Guard the awaited fetch with the session generation *and* a new dial counter, so a token that arrives after Dừng or after a restart is dropped instead of opening a stray socket. Audio sends become `ws.send(codec ? codec.encodeAudio(pcm) : pcm)`; `onmessage` runs through `codec.decode` when a codec exists and takes the old JSON path when it does not. Clear the codec and bump the dial counter in `teardown()`.

**11.3 Capture — straight from the device, uncompressed.** This is the part that decides recognition quality; the vendor demo does exactly this and so must we. In `src/lib/lanes/online/pcm16Capture.ts`:
- `getUserMedia` with `deviceId:{exact:…}` — the operator's chosen microphone, never the browser default — plus `channelCount:1`, `echoCancellation`, `noiseSuppression`, `autoGainControl`. `exact` matters: with `ideal`, Windows switching its default device mid-event silently switches the microphone under us.
- Request the `AudioContext` at **`{sampleRate: 16000}`**, with a plain `new AudioContext()` as fallback. Reason: the worklet's 48k→16k conversion is linear interpolation with **no anti-alias filter**, so every sound above 8 kHz folds back into the speech band as artefacts a listener barely notices and a recogniser mishears. Asking for a 16 kHz room hands the resampling to the browser's proper filter. Expose the achieved rate on the capture handle so a machine that refuses can be identified from diagnostics.
- The worklet emits **PCM16 little-endian, mono, 16 kHz, 4096 samples (~256 ms) per packet**. **No `MediaRecorder`, no Opus, no WebM, no compressed audio anywhere in this path.**
- Split *measuring* voice from *gating* it. The ghost-transcript guard (M4) counts voiced milliseconds; that counter used to be incremented only while the near-mic gate was enabled, so an operator turning the gate off silently disabled the hallucination guard as well. Always measure; only cut samples when the operator asked for cutting. Scribe runs its own VAD — our gate must not fight it.
- **Give the microphone back when the setup fails.** You are rewriting this function anyway, so fix a leak that is in it today: `getUserMedia` succeeds first, and *then* the `AudioContext` is created and the worklet module is loaded. If either of those throws — and the worklet load does throw on some machines — the function exits with the stream still live. The recording light stays on, the device stays held by the tab, and the only cure the operator knows is reloading the page in the middle of the event. Wrap everything after `getUserMedia` in `try/catch`; in the `catch`, stop every track (and close the context if it was created) **before** re-throwing, so the error still reaches the operator but the hardware is free. The same must be true of any early return you add.

**11.4 Committing — the vendor's VAD decides, with exactly one exception.** `commit_strategy=vad` means silence ends the sentence (1.5 s at threshold 0.4). Never commit on a timer: frequent commits degrade the model and get throttled. The one exception is **Dừng** — the speaker often finishes a sentence and *then* the operator presses stop, so `stop()` sends one `commit`, stops sending audio from that moment (the commit must be the last thing on the wire), waits **at most 700 ms** for the trailing final, and then runs the existing residual flush. 700 ms, not more: a stop button that hesitates is worse than one lost tail.

**And let that last sentence finish being translated.** You are rewriting `stop()` for the commit above, so repair what it does next while you are in it. Today the residual flush only *schedules* the refine pass — it starts a timer and returns — and `teardown()`, which runs immediately after, clears `pendingRefineTimers`. The timer is killed before it ever fires, so the very last line of the session keeps its rough draft translation and never receives the polished one. That line is the closing sentence of a ceremony, it is the one still on the wall when the lights come up, and it is the one people photograph. Make `stop()` **await the outstanding refine before tearing down** — bounded, at most **2 s**, and only for what is genuinely pending: if the reply does not arrive in time, keep the draft and carry on. Do not let this delay the socket closing or the microphone being released — the audio path stops on the first press, exactly as it does now; only the teardown of the refine queue waits. If a second press of Dừng arrives during that window, abandon the wait immediately and tear down.

**11.5 Reconnecting.** The existing 5-attempt backoff ladder is unchanged; it now re-mints a token each time. On a reconnect only — never on a fresh session — the first audio chunk may carry `previous_text` with the **last finalised sentence**, so the recogniser picks the thread back up. Never put a partial in there: a partial is still wrong, and mistakes fed back in propagate.

**11.6 Rollback.** `ONLINE_ASR_PROVIDER=qwen3` returns the entire lane to the proxied Qwen3 path with **no client change and no redeploy of the front end**. Verify this works before you finish — it is the escape hatch if the hall's network blocks the direct socket.

**11.7 Two-pass ASR is over.** Qwen3 no longer transcribes and Google Chirp is not run alongside anything: one recogniser, one pass. Qwen3 stays exactly where it is for the **translation** step after recognition (`/online-api/refine-preview-translation`) — do not touch that. If a `VITE_TWO_PASS_ASR` flag or any parallel-ASR branch exists in this repo, it is now dead and must go; if it does not exist here, say so in your report rather than inventing one.

**11.8 The contract.** Bump `docs/ONLINE-LANE-CONTRACT.md` to **v0.4** and document, in the file itself: the new request/response fields, "one token call per dial", the capture format from 11.3, the direct-dial message vocabulary and its mapping to the existing events, the fatal-error list, the single Stop commit, the `ONLINE_ASR_PROVIDER` rollback, the retirement of source-transcript correction from §3 (11.12), and the `roomFilter` / `asrRoomFilter` pair with its three-state rule (11.13). Nothing outside that file may be invented.

**11.9 Where the vendor is allowed to appear.** Rule 6 still binds: no vendor env name, model id, API host or key value under `src/` or in the built bundle. Name the adapter and its symbols for what they *do* (`asrTransport.ts`, `createAsrCodec`) rather than for who makes the service, and grep the built bundle to prove it. Be honest about the one unavoidable consequence in your report: dialling direct means **the vendor's host is visible in the token response and in DevTools' network panel at runtime**. That is inherent to removing the hop; the bundle stays clean and the key never leaves the server.

**11.10 The key gate must stop asking for the two keys this task retires.** This is the one place TASK 11 reaches outside the ASR path, and skipping it makes the whole lane unstartable — so do it in the same commit.

Six values are configurable today (`asr_endpoint`, `asr_key`, `refine_key`, `tts_key`, `tts_voice_ja`, `tts_voice_vi`) and `GET /online-api/config-status` reports `ready` only when **all six** are present. `OnlineConsole.handleStart` hard-blocks on that flag. But once the browser dials the recogniser directly it spends the **TTS vendor's key**, and `asr_endpoint` / `asr_key` belong to the proxied path that is now switched off — so the operator is asked for a credential nothing consumes, cannot obtain it, and can never start. Assume this will happen on the day of the event if you leave it.

- `getConfigStatus()` takes the list of slugs that are actually required and returns `{ keys, required, ready }`: `keys` still reports **all six** true/false, `required` is the subset that matters for the current configuration, and `ready` = every slug in `required` is set. Server-side, that list is `ONLINE_KEY_SLUGS` minus `asr_endpoint` and `asr_key` on the direct path, and all six again under `ONLINE_ASR_PROVIDER=qwen3` — one constant next to `ASR_PROVIDER`, so the rollback in 11.6 carries the gate with it.
- Every client counter reads `required`, never `Object.keys(keys).length` and never a literal 6. That means the preflight row in §1.2 (`Khoá dịch vụ (API Key) · n/…`), the Settings summary line, and the toast after saving. Add one exported helper on the facade (e.g. `onlineRequiredKeySlugs(status)`) so the console and the Settings section cannot drift apart, and have it fall back to "all six" when `required` is absent — a server that predates this change must keep gating as it does today.
- In the Settings section, a field outside `required` still accepts input (the rollback needs it) but must read **"không bắt buộc"**, and its empty state must say so instead of "Chưa có" — otherwise the person entering keys goes hunting for a value that does not exist.
- Nothing here weakens the gate: with the four required values missing, **Bắt đầu dịch** must still refuse and still open the missing-keys modal.

**11.11 Tests.** A new vitest suite covering, at minimum: the audio frame is base64 PCM16 at 16000 and decodes back to the original bytes; `previous_text` appears on the first chunk only and never on a fresh session; commit carries no audio; `session_started` maps to `session.created`; a partial lands in `stash`; the timestamped twin of a committed sentence is swallowed while a genuinely different sentence is not; the three fatal errors are fatal and a transcriber error is not; unknown messages and malformed JSON are ignored rather than thrown; an over-long keyterm is dropped and the list caps at 30; the handshake sets the VAD parameters, asks for timestamps and language detection, carries every keyterm, and pins **no** language by default. For 11.10: `ready` follows `required` and not the full slug list; the two retired slugs are absent from `required` on the direct path and present under `qwen3`; with only the four required values set the status is `ready`; an unknown slug in the list is ignored rather than counted missing; and the client helper returns the server's list, falling back to all six when the field is absent. For 11.12: export the prompt builder and assert that the built prompt never asks for a `source_corrected` key, that it contains the read-only-transcript instruction, that it still shows the model both the transcript and the session terms, and that it still asks for `target_final` / `emotion` / `tts_speed`; plus one handshake test proving `no_verbatim`, `filter_background_audio` and `audio_format` are all absent by default. For 11.13: the three `roomFilter` states described there. And two small regression tests for the repairs folded into this phase: with `getUserMedia` stubbed to succeed and the worklet load stubbed to throw, every track's `stop()` is called and the error still propagates (11.3); and `stop()` does not tear the refine queue down until the pending refine has resolved or the 2 s bound has elapsed, with the resolved translation replacing the draft on the last line (11.4).

**11.12 Retire the language model's pass over the *source* transcript. Keep the one over the *subtitle*.**

Today `POST /online-api/refine-preview-translation` asks the refine model for two things at once: the final translation **and** a rewritten version of what the microphone heard (`source_corrected`, surfaced as `sourceText` in the response, with `asrSourceCorrectionEnabled` / `asrCorrectionTermCount` advertising it in the token response). That second job existed because the old recogniser had no way to be told the names used at this event. It now does — TASK 11 sends the session's terms to the recogniser as **keyterms**, so the proper nouns land correctly *while listening*, not by a second model guessing afterwards. Guessing is also where the worst failure lives: give a model a list of names and a sentence, and it will sooner or later put a name into a sentence nobody said. On a wall in front of an audience, an invented name is worse than a misheard syllable.

So:

- The refine prompt asks for **one** text output: the translation (plus its optional spoken variant). It must state plainly that the source transcript is **read-only evidence** and must never be rewritten, cleaned up, or returned. Remove the `source_corrected` key from the prompt, from the JSON schema, and from the response parser — but keep tolerating it on the way in, so an old-shaped answer from the model can never reach the screen.
- The endpoint keeps returning a `sourceText` field — the response shape in the contract does not change and the client needs no edit — but it is now a **verbatim echo** of the `sourceText` that was sent (trimmed, nothing else).
- `asrSourceCorrectionEnabled` becomes permanently `false` and `asrCorrectionTermCount` permanently `0`, on both the direct and the `qwen3` branch. Leave the fields in place; a client that reads them keeps working and simply learns that the feature is off.
- **Session terms are not weakened, they are re-aimed.** They still travel with every refine request and still bind the translation: the term list decides how a name is written in the language the audience is actually reading. They additionally reach the recogniser as keyterms. The only thing that goes away is a model rewriting Vietnamese into Vietnamese.
- Two smaller wins that come for free and are worth stating in your report: one less field to generate means the subtitle lands sooner, and it costs fewer tokens on every sentence of a two-hour event.
- If the speaker's fillers ("à", "ờ", repeated words) were part of why the correction pass existed, the recogniser can drop them itself — set `SCRIBE_NO_VERBATIM=true` (11.1). That is a handshake parameter, not another model call. Leave it **empty by default**: on a ceremonial script there is little to clean, and verbatim text is easier to debug when something goes wrong on stage.

**One more env knob, off by default — wire it, document it, do not enable it.** `SCRIBE_NO_VERBATIM=true` → `no_verbatim`, described by the vendor as removing filler words, false starts and disfluencies. Empty value must send **no** parameter at all. Say in your report that you left it unset and that flipping it is an env change plus a server restart — no front-end rebuild.

---

### TASK 11.13 — Hall-babble rejection is a switch on the desk, not a redeploy

The one remaining handshake knob, `filter_background_audio`, is the one the operator genuinely needs to try **both ways during the rehearsal**, because whether it helps depends entirely on how the microphone is wired that day: a mixer feed picks up the whole room, a lapel mic does not. Nobody can answer that from a desk. So it does not live in the env — it lives in the settings drawer, next to the other input controls, and the technician flips it while listening.

What it actually does, so the wording on screen is honest: it is **not** a noise remover. It does not strip music or room rumble out of the speaker's voice. It works at the "is anyone speaking" stage, cutting **false activations from nearby conversations and ambient noise** — the audience murmuring while the MC is between sentences. The symptom it fixes is *sentences nobody said appearing on the wall*. (Vendor interaction worth knowing: they lower the VAD threshold automatically when this is on *and no explicit `vad_threshold` is set* — we always set `0.4`, so that automatic adjustment never applies to us.)

- **Server, `buildScribeWsParams`** — accept a `roomFilter` argument and make it **three-state, not boolean**. `true` → set the parameter. `false` → set **nothing at all**: the vendor default is already off, so an explicit OFF keeps byte-parity with the vendor demo, *and* it must beat a server env that says on — the person in the hall outranks the deploy config. **Absent** (an older client that sends no such field) → fall back to `SCRIBE_FILTER_BACKGROUND`. Keep that env var: it is the fallback and the headless default, it is simply no longer the only way in.
- **Server, the token endpoint** — read `roomFilter` from the request body and accept it **only if it is a real boolean**; anything else stays `undefined` so the fallback path is the one that runs. Pass it to `buildScribeWsParams`, then answer with `asrRoomFilter` set to **what actually ended up in the handshake** (read it back off the built parameters), not to what was requested — otherwise a console that displays it starts lying the moment the value came from the env. Log the same applied value on the `asr.session` line.
- **Client, rule 6 holds.** Nothing under `src/` may name the vendor parameter. The client speaks `roomFilter` on the wire and *"Bỏ qua tiếng xì xào hội trường"* on screen; the server alone knows what that becomes. Thread it through the ASR-session request as an optional field (an `undefined` drops out of `JSON.stringify` by itself, which is exactly the absent-field case above) and read it from the lane config at **ticket time**.
- **The facade gains one preference**, alongside the existing ones: `roomFilter: boolean` + `setRoomFilter(v)`, default **off** (vendor-demo parity), remembered across restarts in local storage under its own key. Keep the value in a ref for the lane to read, the same pattern the other live-read preferences already use.
- **In the drawer** — the **Nguồn vào** section of TASK 4, immediately after the existing near-mic noise-gate checkbox, because both are answers to "what is this microphone hearing". Label: **Bỏ qua tiếng xì xào hội trường**. Below it, one short line that changes with the state — ON: *"Máy nghe sẽ bỏ qua tiếng trò chuyện và tiếng ồn xung quanh, chỉ bám giọng chính. Bật khi trên màn hiện ra câu mà không ai phát biểu. Đây KHÔNG phải bộ lọc tiếng ồn: nó không tẩy nhạc ra khỏi giọng nói, chỉ bớt việc máy tưởng nhầm tiếng ồn là lời nói."* · OFF: *"Máy nghe bắt mọi thứ lọt vào micro. Mic đi qua bàn trộn thì thu cả phòng — nếu thấy phụ đề hiện câu chẳng ai nói, bật ô này rồi thử lại."* Both states end with the timing sentence below.
- **Disabled while a capture is running**, exactly like the gate mode in TASK 4, and the line says so: *"Chốt khi Bắt đầu — đổi lúc đang chạy thì áp dụng từ lần bắt đầu sau."* This is not laziness — the parameter is baked into the single-use `asrWsUrl` at handshake time, so honouring a mid-session change would mean redialling, and a redial during the real ceremony can drop the sentence being spoken. The rehearsal is where this gets tried; Bắt đầu / Dừng between attempts costs nothing there.
- **Contract** — record the new request field and the `asrRoomFilter` response field in §1 of `docs/ONLINE-LANE-CONTRACT.md`, including the three-state rule and the fact that the response reports the applied value.
- **Tests** — three, on `buildScribeWsParams`: ON sets the parameter; OFF sets nothing (demo parity); and, with the env forced on, an absent field inherits the env **while an explicit OFF still wins over it**. Restore the env afterwards so test order does not matter.

**Do not:** add an npm dependency (this is `fetch`, `WebSocket` and `AudioWorklet`); send raw binary frames on the direct socket; put the token or the assembled URL in a log, in `localStorage`, or in an error message shown to the operator; reuse a token across dials; commit on a timer; let the near-mic gate close while the vendor's VAD is deciding sentence ends; let any model rewrite the source transcript again, anywhere in the lane (11.12); or change anything in the OFFLINE lane — this task touches `server/online-api.mjs`, `server/online-config.mjs` (11.10 only), `docs/ONLINE-LANE-CONTRACT.md` and files under `src/lib/lanes/online/`, and nothing else. In particular, 11.10 must not relax the gate for the keys that *are* required, and must not touch the OFFLINE lane's own readiness checks.

---

## TASK 12 (PHASE 6) — Survive the evening: eight defects a two-hour ceremony will find

None of this is a feature. Every item here is invisible while things go well, and every one of them decides what the audience sees when something goes wrong. They come from a line-by-line reading of the ONLINE lane's server and save path, and they are ordered by what costs most on the night. **Do them after everything else works**, in their own commit, so that if one of them misbehaves it can be reverted without taking a feature with it.

**12.1 — A WebSocket knocking on the wrong door must be shown out.** In `server/online-api.mjs`, the `upgrade` listener claims `/online-api/asr` and, for every other path, simply `return`s. Nobody else answers, so the client's socket sits there, connected to nothing, holding a file descriptor until the process restarts. A scanner, a stale tab, a mistyped URL — each leaves one behind, and they only ever accumulate. Fix: for an unclaimed path, write a plain `HTTP/1.1 400 Bad Request` line to the socket and `destroy()` it. One caveat worth respecting rather than ignoring: the current `return` was written to leave room for another `upgrade` listener. So destroy **only when ours is the only one attached** (`server.listenerCount('upgrade') === 1`) and keep the polite `return` otherwise, with a one-line comment saying why. Today the condition is true; if someone later mounts a second listener, this stays correct on its own.

**12.2 — The path-traversal guard is one character short.** `server.js:129` refuses a request whose resolved file path does not start with the dist folder — but `startsWith(DIST)` also accepts `…/dist-secret/…`, because the check never requires the separator. Nothing in this repo is named that way today, which is exactly why it will never be noticed. Compare against `DIST + path.sep` (and allow the exact `DIST` itself). One line, no behaviour change for any real file. **Touch nothing else in `server.js`** — the login code is out of scope by the owner's decision.

**12.3 — Never let a save failure become a download every thirty seconds.** `saveSessionExport` (`src/lib/lanes/online/sessionExport.ts`) falls back to downloading the transcript as two files whenever the POST fails. That is right for a save the operator asked for, and wrong for the 30-second auto-save timer in `onlineLane.ts`: if the server's save endpoint is unhappy — a full disk, a redeploy, a 413 — the fallback fires **every thirty seconds for the whole evening**, and after the second one Chrome puts its "allow multiple downloads?" prompt on top of whatever is on the projected screen. Fix: give `saveSessionExport` an explicit `allowDownload` argument (or a second entry point) — **true** for the manual **Lưu transcript** button and for the save on Dừng, **false** for the auto-save tick. When it is false and the POST fails, download nothing, record the failure in the lane's existing diagnostics/save-status, and let the next tick try again. The operator must still be able to see that saving is failing — silent must not mean invisible.

**12.4 — Two missing ceilings on the proxied path.** In the `qwen3` fallback branch of `server/online-api.mjs` (the rollback of 11.6 — so it must keep working): audio frames that arrive before the upstream socket opens are pushed into `pendingFrames` with **no limit**, and there is **no connect timeout** on the upstream at all. If the upstream never opens, the array grows by ~8 KB every 256 ms for as long as the operator leaves it running, and nothing ever tells them why no text is appearing. Fix both: cap the queue at roughly **five seconds of audio** (about 20 frames — put the number in a named constant with the arithmetic in a comment) and drop the **oldest** frame when full, because in speech the newest audio is the useful one; and start a **timer at construction, 8 seconds**, cleared on `open`, that on expiry sends the client the existing error event shape with a message the operator can act on and closes both sockets. Log one line with the number of frames dropped, so a hall with a bad uplink is diagnosable afterwards.

**12.5 — Show the operator when the network is falling behind.** `ws.send(pcm)` is called every 256 ms and never looks at `bufferedAmount`. On a weak venue uplink the browser silently queues the audio, the subtitle drifts further and further behind the speaker, and everything on screen still says "connected" — the single most confusing failure mode there is, because it looks like the recogniser is slow rather than the network. Fix: read `bufferedAmount` before each send. Above a threshold of a few hundred kilobytes (again, a named constant with its arithmetic in a comment — this is seconds of audio, so say how many), surface it in the lane's existing diagnostics as a backlog figure the operator can see, and if it keeps rising past a second, larger threshold, treat it as the connection being unusable and go through the normal reconnect ladder rather than pretending. **Do not silently drop audio to keep up** — a hole in the middle of a sentence is worse than a late sentence, and the operator must be told either way.

**12.6 — The event's vocabulary does not belong in a URL** *(lowest priority of the phase — skip it and say so if anything above ran long)*. On the proxied path the session terms travel as `?corpus=…`, up to 2000 characters. Query strings end up in access logs and hit length limits on any proxy in front of us; the terms are not secret, but a truncated URL is a silently broken feature. Move them to a **first WebSocket message** on that path (`{type:'session.terms', corpus}`), and **keep accepting the query parameter as well** for one release, so the 11.6 rollback still works with any client. Nothing about the direct path changes: there the terms are keyterms in the vendor's own handshake, which is the vendor's API and not ours to redesign.

**12.7 — Say out loud that the transcripts are on sand.** `./translated_history` and `./online-keys.json` sit on the container's ephemeral disk: **every redeploy erases both** — the evening's transcripts and all six keys. This one is a decision, not a code change, so do not invent an answer. Do two things instead. First, in the README (or the contract's operations section, whichever this repo already uses), state plainly that these two paths do not survive a redeploy, and that a Railway Volume mounted at that path is what would fix it. Second, make the console tell the truth to whoever is standing at the desk: after **Dừng**, the save status must make it obvious that downloading the transcript is what keeps it. Report the disk question back to the owner as an open decision with a one-line recommendation — it costs money, so it is theirs to make.

**12.8 — The server has no tests at all.** Nothing in the suite touches `server/online-config.mjs`. Add a small vitest file for it — the slug list, that reading back a stored key never returns the value itself, that an unknown slug is refused, that the file round-trips — plus one test for 12.1 (an upgrade on an unknown path ends with the socket destroyed) and one for 12.4 (the queue stops growing at the cap and keeps the newest frames). This is not a coverage exercise: these are exactly the functions where a mistake is invisible until it is expensive.

**What this task deliberately does not fix, and why.** Say all three back in your report so the owner knows they were considered, not missed: the login cookie's `Secure` flag and the per-boot `SESSION_SECRET` both only matter when the access gate is on, and the owner has switched it off; and the open `/online-api/*` endpoints are the direct consequence of that same decision. Do not "improve" any of them here.

---

## File plan at a glance

**New — lane-neutral (must NOT live under `src/lib/lanes/online/`, because non-lane files import them):**
`src/lib/ConferenceModeContext.tsx` · `src/lib/prepData.ts` · `src/lib/audienceChannel.ts` · `src/lib/audienceSubtitles.ts` · `src/components/SubtitleParagraphs.tsx` · `src/pages/AudienceWall.tsx`

**New — inside the online lane:**
`src/lib/lanes/online/components/OnlineConsole.tsx` · `src/lib/lanes/online/utteranceDirection.ts` · `src/lib/lanes/online/audienceWindows.ts` · `src/lib/lanes/online/asrTransport.ts` (TASK 11)

**Changed:**
`server/online-api.mjs` (voice catalog, `language=auto`, `voice` on TTS, **the TASK-11 ASR token, the 11.12 refine prompt/schema, and the 11.13 `roomFilter` rule**) · `server/online-config.mjs` (TASK 11.10 — which keys are actually required) · `docs/ONLINE-LANE-CONTRACT.md` (→ v0.4, TASK 11) · `src/App.tsx` (routes + provider) · `src/components/OperatorLayout.tsx` (lane switch, DỪNG routing **+ DỪNG hidden on the ONLINE lane — 2.4**, session cluster) · `src/index.css` (`.sub-append` only) · `src/pages/AudioRouting.tsx` (wrapper only) · `src/pages/Settings.tsx` (title) · `src/lib/lanes/online/index.ts` (facade **+ the provider-named key labels of 9.1a the `required`-list helper of 11.10, and the `roomFilter` preference of 11.13**) · `src/lib/lanes/online/onlineLane.ts` (per-utterance direction **+ the TASK-11 transport**) · `src/lib/lanes/online/pcm16Capture.ts` (TASK 11 capture) · `src/lib/lanes/online/ttsPlayback.ts` (voice + speed) · `src/lib/lanes/online/components/OnlineKeysSettings.tsx` (intro **+ the "không bắt buộc" fields of 11.10**) · `src/lib/lanes/online/sessionExport.ts` (TASK 12.3 — the download fallback becomes opt-in) · `server.js` (**TASK 12.2 only — the one static-file path line, and nothing else in that file**) · the README / operations notes (TASK 12.7)

**Not changed, at all:** `src/lib/lanes/types.ts` · `src/lib/api.ts` · `src/lib/LiveSessionContext.tsx` · `src/lib/useMeter.ts` · `OfflineConsole` and every helper it uses · `package.json` / `package-lock.json`

Commit split so a regression is easy to bisect — **one commit per phase**, in phase order: **A** (phase 1) = head-bar switch + DỪNG routing + mode context + route rename; **B** (phase 1) = `OnlineConsole` replacing `OnlineConferenceMode`; **C** (phase 2) = prep data + voice catalog; **D** (phase 3) = two-way + audience wall + subtitle mechanism; **E** (phase 4) = the TASK-11 ASR swap (keep it as its own commit — it is the one change that can be reverted on its own if the hall network misbehaves); **F** (phase 5) = wording, defaults, responsive, cleanups; **G** (phase 6) = the TASK-12 reliability fixes, which touch no feature and can therefore be reverted alone; **H** (phase 7) = whatever the review pass and your own reading of the diff turned up, fixes only, no new behaviour; **I₁…Iₙ** (phase 9) = one small commit per post-deploy hotfix, each named after the error it fixes.

---

## Hard constraints

- **The OFFLINE lane must not change** — not its code, not its rendering, not its behaviour. Do not modify `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, and do not touch a single line inside the `OfflineConsole` component or its helpers (see 1.3 — duplication, not extraction).
- **The treaty file `src/lib/lanes/types.ts` is not modified.** Per-utterance direction travels through the lane-private `OnlineLaneConfig` hooks (TASK 6.2). If you believe the treaty must change, stop and report instead — do not change it unasked.
- **No file outside `src/lib/lanes/online/` may import anything but the facade root** — the sanctioned integration points remain `src/pages/AudioRouting.tsx`, `src/pages/Settings.tsx`, and the `/online-lab` bench. The six lane-neutral files above are the reason `audienceChannel` / `audienceSubtitles` / `SubtitleParagraphs` are placed outside the lane: `/wall` is not a lane page and may not reach into lane internals.
- **No new npm dependency**, TASK 11 included — the direct socket is plain `WebSocket` + `fetch` + `AudioWorklet`. `package.json` must come out of this work unchanged. If it changes at all, CLAUDE.md rule 7 applies: regenerate the lockfile and prove `npm ci` with npm 10 in a Node-20 container before pushing.
- **No vendor env name, model id, API host or key value** under `src/` or in the built bundle. The config endpoints keep speaking opaque slugs, and the voice catalog is the new place this could leak — build the response field by field, never by spreading the provider's object. TASK 11 is the second such place: name the ASR adapter and its symbols for what they do, and let the assembled `asrWsUrl` be opaque to the client. Grep the built bundle before you push. **The one thing this rule does not ban is a provider's brand name in a Settings form label** (9.1a): it is not an env name, not a model id, not a host and not a value, and the operator cannot fill the form without knowing whose account the key comes from. The vendor host is in any case observable in the Network tab of a running session.
- **One new route (`/wall`) and one new endpoint (`GET /online-api/voices`) — nothing else.** TASK 11 adds **no** endpoint: it extends the existing `POST /online-api/realtime-preview-token`. `/online-lab` keeps working through `OnlinePanel`.
- **No new key for the operator — one fewer, in fact.** TASK 11 reuses the already-configured `ELEVENLABS_API_KEY`. If you find yourself asking for a second credential, you have taken a wrong turn. It also retires two: after 11.10 the operator fills **four** values, not six, and the Start gate must count four.
- **Feature parity:** nothing currently reachable in `OnlinePanel` may become unreachable. Before you push, walk the list — mic select, Quét lại, noise gate, direction, status, VU, diagnostics (all fields), Bắt đầu, Dừng, Đọc bản dịch, thiết bị ra, chống dội + its note, thuật ngữ, bối cảnh, error box, subtitle lines, Lưu transcript + save status — and confirm each one has a home in the new console.
- **No authentication work.** See the out-of-scope note in the context block.
- **Nothing here may make the audio path fail-closed.** A missing voice catalog, a denied screen permission, an absent `/api`, a browser with no `BroadcastChannel` — every one of these degrades to "works as before", never to "cannot start".

## Acceptance criteria

Each phase gate above names the subset that belongs to that phase; run those as you finish the phase. Then run **this whole list again in PHASE 8** on the assembled build — a check that passed in phase 2 can be broken by phase 4, and that is exactly what the final pass is for.

- [ ] `git diff` proof that `OfflineConsole` and its helpers are untouched: every changed hunk in `src/pages/AudioRouting.tsx` is in the wrapper/`ModePill`/`OnlineConferenceMode` region. Include the `git diff --stat` and the hunk headers (`@@` lines) for this file in your report.
- [ ] `git diff --stat` shows `src/lib/lanes/types.ts`, `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, `package.json` and `package-lock.json` all **absent**.
- [ ] `npm ci` from a clean tree, `npm run build`, `npm run lint` and `npm test` all pass. Tests go up, not down: the four new suites (`prepData`, `utteranceDirection`, `audienceSubtitles`, `asrTransport`) bring the total well above the current 30.
- [ ] On `/console` in ONLINE mode: left rail, ceremonial standby stage, status strip and settings drawer are present and look like the OFFLINE console — a screenshot of the two modes side by side should differ only in the rail items and the drawer contents.
- [ ] Switching OFFLINE↔ONLINE from the head bar swaps the console in place; the page frame does not jump. The switch is disabled while a capture is running on either lane.
- [ ] Opening **Cài đặt & thiết bị** in either mode: nothing overlaps the drawer header.
- [ ] Head-bar **DỪNG** is **not rendered at all** on the ONLINE lane (check both before and during a session) — the rail's `Dừng dịch` is the only stop control there. On OFFLINE it is unchanged: it still stops a running session from Chuẩn bị / Báo cáo / Cài đặt. Switch the head-bar lane selector to ONLINE **while an OFFLINE session is still running** and confirm DỪNG stays on screen (2.4).
- [ ] The rail's **`Dừng dịch`** stops an ONLINE capture on **one plain click** — no press-and-hold, no confirm dialog. Status goes to `stopped`, the browser mic indicator turns off, the mic tracks report `ended`, and the button is replaced by **Bắt đầu dịch**.
- [ ] On **Chuẩn bị** with no session running: no OFFLINE pill, no DỪNG button in the head bar. Start an OFFLINE session, navigate to Chuẩn bị: DỪNG is back.
- [ ] `/audio` redirects to `/console`; the "Dịch hội nghị" pill still lights on both.
- [ ] With no keys configured, **Bắt đầu dịch** still shows the missing-keys modal and routes to `/settings#ok`. Every visible instance of the phrase reads "Khoá dịch vụ (API Key)".
- [ ] In **Cài đặt**, every key field is named after its provider (9.1a): the six labels read exactly `Endpoint của Qwen`, `API Key của Qwen`, `API Key của GPT (OpenAI)`, `API Key của ElevenLabs`, `Voice ID tiếng Nhật (ElevenLabs)`, `Voice ID tiếng Việt (ElevenLabs)`; each hint says **where to get the value**, not what we do with it; no label carries a functional description; and the line above the list names only the fields the server actually requires. Paste a screenshot of the section.
- [ ] `Chống dội` defaults to the headphone setting (off / full duplex) on a fresh profile; the other two modes are still selectable.
- [ ] Opening the Thuật ngữ flyout on an event that has glossary + speakers fills the box, and the summary line states the counts. Typing something by hand and reopening does not overwrite it; pressing **Nạp từ Chuẩn bị** does. With `/api` unreachable, the box still fills from the local stores and says the glossary was not reachable.
- [ ] The voice dropdowns list real voice names with personal voices first; the network payload for `/online-api/voices` contains **no** provider voice id (check the response body, not just the UI). Selecting a voice changes the voice that speaks; manual speed changes the rate; both apply from the next sentence while running.
- [ ] Two-way mode: speak Vietnamese, then Japanese, into the same microphone — each utterance is translated into the other language, lands in the correct console column, and the sentence never jumps columns after it is finalised.
- [ ] **Xuất màn khán giả** opens the enabled windows; with two monitors attached and permission granted they land on the assigned screens; with permission denied they still open and the hint says so. Changing a screen assignment and pressing Xuất again moves the existing window rather than opening a second one.
- [ ] **Close the audience windows by hand** (click the X on each) without touching the console: within about a second the flyout drops to `Đang mở 2/3 …` and then to `Chưa mở cửa sổ nào (đã bật 3 màn) …`, the per-card badges flip to `Chưa mở`, the `Đóng hết` button disappears, the export button goes back to `Xuất ra màn hình`, and the collapsed-rail dot goes out. Pressing **Đóng hết** closes all three and produces the same state. Nowhere does the panel still claim three screens are exported.
- [ ] A wall window opened **after** several sentences have gone by shows them immediately (backfill), and pressing **Bắt đầu dịch** again clears every open wall window.
- [ ] Subtitle rules, verified on `/wall?dir=both`: two utterances 2 s apart merge into one paragraph; a 10 s gap starts a new one; the unfinished tail is italic and faded; there is no source line and no reserved empty caption row; the live paragraph has the accent bar; scrolling up 100 px shows "Về dòng mới nhất" and stops the auto-scroll; the font slider persists across a reload.
- [ ] **Reading direction, on the same `/wall` window.** With only two sentences on screen, the **first** one sits against the **top** edge and the empty space is **below** it — the text must not be hanging off the bottom of the screen. Keep speaking until the screen is full: sentences continue to appear **below** the previous ones and only then does the view scroll, with the newest sentence last. At no point does an earlier sentence get pushed *up* by a later one while empty space remains underneath. Verify the console monitor behaves identically (same component), and confirm in your report that the OFFLINE lane's subtitle blocks were **not** changed. Paste two screenshots: the near-empty screen and the scrolled-full screen.
- [ ] Checked at 390 px, 480 px, 768 px, 1280 px and 1920 px: no horizontal page scroll, DỪNG never pushed off the head bar, the collapsed rail still usable, the Xuất flyout still scrollable to its button.
- [ ] **TASK 11 — the microphone is taken raw.** With a session running, in DevTools: `getUserMedia` was called with `deviceId:{exact:…}`, `channelCount:1`, `echoCancellation`, `noiseSuppression`, `autoGainControl`; the live track reports `channelCount: 1`; the `AudioContext` reports `sampleRate === 16000`; `MediaRecorder` is never constructed anywhere in the capture path. Paste the constraints object and the context sample rate into your report.
- [ ] **TASK 11 — what goes on the wire.** Every outgoing frame on the ASR socket is JSON `input_audio_chunk` with `sample_rate: 16000` and a base64 payload that decodes to **8192 bytes** (4096 PCM16 samples ≈ 256 ms). Zero binary frames. State the observed frame count and byte size.
- [ ] **TASK 11 — the ticket is single-use.** Each Bắt đầu and each reconnect performs its own `POST /online-api/realtime-preview-token`; no address is opened twice. Force a reconnect (kill the socket in DevTools) and show the second token call in the network log.
- [ ] **TASK 11 — Dừng flushes the tail.** Speak a sentence, stay silent for well under 1.5 s, press Dừng: the sentence still lands. On the wire, the commit frame is the **last** thing sent, carries `audio_base_64: ''`, and there is exactly one of it.
- [ ] **TASK 11 — no double subtitles.** With `include_timestamps=true` a committed sentence arrives twice from the vendor; the audience wall and the console monitor each show it **once**.
- [ ] **TASK 11 — the long keyterm does not kill the session.** Put `Chương trình Vinh danh` in Thuật ngữ and start: the session runs, the server log reports `asrKeytermsDropped: 1`, and the term still reaches the refine stage.
- [ ] **TASK 11 — fatal vs retryable.** With a deliberately wrong `ELEVENLABS_API_KEY`, the lane stops with a visible error instead of looping the reconnect ladder five times.
- [ ] **TASK 11 — rollback works.** Set `ONLINE_ASR_PROVIDER=qwen3`, restart the server, and the lane transcribes again over `WS /online-api/asr` with **no** front-end change.
- [ ] **TASK 11 — the retired keys no longer block Start.** With `asr_endpoint` and `asr_key` left empty and the other four set, `GET /online-api/config-status` returns `ready: true`, the preflight row reads `4/4`, **Bắt đầu dịch** starts a session, and the Settings section marks those two fields "không bắt buộc". Clear one of the four that *is* required and confirm Start refuses again with the modal. Under `ONLINE_ASR_PROVIDER=qwen3` the same endpoint asks for all six again. Paste both `config-status` responses.
- [ ] **TASK 11.12 — nobody rewrites what was heard.** Send one refine request whose `sourceText` deliberately contains a mangled proper noun (e.g. `công ty Ê su hai`) together with a `sessionTerms` entry that maps that name to its correct form. The response's `sourceText` must come back **character-for-character identical** to what you sent, while `translatedText` uses the term correctly. Then check the token response: `asrSourceCorrectionEnabled: false` and `asrCorrectionTermCount: 0` on both the direct path and under `ONLINE_ASR_PROVIDER=qwen3`. Paste both bodies (request and response) verbatim.
- [ ] **TASK 11.13 — the hall switch is real, and it is honest.** In **Cài đặt & thiết bị → Nguồn vào**, tick **Bỏ qua tiếng xì xào hội trường**, press Bắt đầu, and check the token response: `asrRoomFilter: true`. Stop, untick it, start again: `asrRoomFilter: false` **and the handshake carries no such parameter at all** (compare the two `asrWsUrl` query strings — the difference must be exactly this one parameter appearing and disappearing). Now set `SCRIBE_FILTER_BACKGROUND=true` on the server and restart: with the box **unticked** the handshake stays clean, because the operator's explicit OFF beats the env. Reload the page with the box ticked and confirm the choice survived. Finally, start a session and confirm the checkbox is **disabled** while running. Paste both query strings with the token value redacted.
- [ ] **TASK 11.3 — a failed start gives the microphone back.** In DevTools, force the worklet load to fail (block the blob URL, or temporarily throw inside `addModule`) and press Bắt đầu: an error is shown to the operator, **and** the browser's recording indicator goes out, the tab stops holding the device, and pressing Bắt đầu again after undoing the sabotage starts a normal session **without reloading the page**. Say in your report which throw you simulated.
- [ ] **TASK 11.4 — the last sentence gets its finished translation.** Speak a clearly translatable sentence, wait for its draft subtitle to appear, then press Dừng immediately. Within about two seconds the last line on the wall and on the monitor updates from the draft to the polished translation — it does not stay in the rough version. Repeat with the network throttled so the refine cannot answer in time: the draft stays, nothing hangs, and Dừng still completes. State both results.
- [ ] **TASK 11 — nothing leaked.** Grep the built bundle for **the vendor env names, the model ids, the API hosts and `xi-api-key`**: zero hits. Confirm in your report that no log line, no error message and no `localStorage` entry contains the token or the assembled URL. Note the one deliberate exception: the provider **brand names** in the Settings key labels (9.1a) do appear in the bundle, by design — a brand word is not an env name, a model id, a host or a value. Do not report those as leaks, and do not remove the labels to make a broader grep come out empty.
- [ ] **TASK 12.1 — a wrong door is closed, not left open.** Open a WebSocket to `wss://<host>/online-api/nonsense` from the DevTools console: it fails immediately instead of staying pending. `netstat`/the process's handle count does not grow after ten such attempts. The real `/online-api/asr` path still upgrades normally under `ONLINE_ASR_PROVIDER=qwen3`.
- [ ] **TASK 12.3 — a save failure is quiet, not a download storm.** Stop the save endpoint (or point it at a path that fails), run a session for **two minutes** and speak a few sentences: **zero** files are downloaded during the session, the console's save status shows the failure, and Chrome never asks about multiple downloads. Then press **Lưu transcript** by hand, and press **Dừng**: each of those does produce the two files. State how many downloads happened in each part.
- [ ] **TASK 12.4 — the queue and the upstream both have limits.** With `ONLINE_ASR_PROVIDER=qwen3` and the upstream host made unreachable, start a session: within 8 s the operator sees an actionable error instead of silence, both sockets close, and the server log reports the number of dropped frames. Memory does not climb while it waits. Paste the log line.
- [ ] **TASK 12.5 — a slow network is visible.** With DevTools throttling set to a slow profile, the diagnostics show a rising send backlog while the subtitle lags, and past the second threshold the lane reconnects rather than silently drifting. Confirm no audio is dropped to keep up. Paste the diagnostics figure at its worst.
- [ ] **TASK 12.7 — the disk warning is written down.** The README (or operations section) states that `./translated_history` and `./online-keys.json` do not survive a redeploy and what would fix it; the save status after Dừng makes downloading look like the safe move. Quote the sentence you added.
- [ ] `/online-lab` still renders `OnlinePanel` and still works.
- [ ] **PHASE 7 — the code was reviewed, not just written.** `npm ci` + lint + test + build are green from a clean tree; the branch diff was read end to end; the review pass ran (name it: `/code-review`, or the reviewer subagents and their briefs); every finding sits in one of the three buckets. Zero `console.log`, `TODO`, `FIXME`, `debugger` or hard-coded host/port added by this work remains in the diff.
- [ ] **PHASE 9 — the live site actually works, and you watched it.** Railway's build **and** boot logs are clean; the four solo checks pass on the live URL, OFFLINE checked before ONLINE; `config-status` confirms the four required values are set as Railway environment variables (12.7 — never through the form); the owed list came back from the live test and every item on it is marked passed, failed or not tested; a real session runs end to end with voice out. Each fix from the debug round is its own commit with its triggering error quoted verbatim in the report. If anything on the owed list is still failing, this box stays **unticked** and the failing item is named.

## Report back

State, in this order:

1. The `git diff --stat` for the whole change, plus the hunk headers for `src/pages/AudioRouting.tsx` proving `OfflineConsole` is untouched.
2. Files changed and why, grouped by task.
3. **Whether any offline-lane file or the treaty file was touched — the expected answer is NO for both.**
4. The parity walk-through result (the `OnlinePanel` list above, each item's new location).
5. How the ONLINE lane is stopped now: proof that the head-bar DỪNG is absent on ONLINE, that the rail's `Dừng dịch` stops the capture on a single click, that DỪNG still stops an OFFLINE session from Chuẩn bị / Báo cáo / Cài đặt, and how you verified the head-bar cluster disappears on Chuẩn bị.
6. The `/online-api/voices` response body for one language, verbatim, showing that no provider voice id appears in it — plus the bundle grep for env names / model ids / hosts / `xi-api-key` (brand names in the key labels excepted, per 9.1a).
7. What the two-way test actually produced: the VI and JA column contents after speaking both languages into one microphone.
8. Which cleanups you did and what you decided about the 768–1279 px breakpoint.
9. **TASK 11:** the `getUserMedia` constraints object and the `AudioContext` sample rate verbatim; one outgoing ASR frame with its payload byte length; proof of a token call per dial; what the Dừng commit looked like on the wire; the `asrKeytermsDropped` count for the long-keyterm test; the result of the `ONLINE_ASR_PROVIDER=qwen3` rollback test; the bundle grep; **both `config-status` responses from the 11.10 check (direct path and `qwen3`), and how many keys the operator must now enter**; and a plain statement that the vendor host is visible in the runtime token response while the key and the token are not.
9a. **TASK 11.12:** the refine request and response bodies from the echo test, showing the transcript came back untouched while the translation used the session term; the two token-response fields (`asrSourceCorrectionEnabled`, `asrCorrectionTermCount`); and confirmation that `SCRIBE_NO_VERBATIM` is left unset, with one sentence on what it does and when the operator would flip it.
9b. **TASK 11.13:** the two redacted handshake query strings (box on / box off) side by side, the `asrRoomFilter` value in each token response, one screenshot of the checkbox in the drawer with its explanation line, and a one-line statement that nothing under `src/` names the vendor parameter.
9c. **The two repairs folded into Phase 4:** which capture failure you simulated for 11.3 and proof the recording indicator went out without a page reload; and for 11.4, the last line before and after Dừng in both the normal and the throttled run.
9d. **Subtitle direction:** the two `/wall` screenshots, and confirmation that `src/pages/AudioRouting.tsx` and `src/pages/BilingualStream.tsx` kept their own bottom-anchored blocks.
10. **TASK 12:** which of the eight items you did and which you deliberately skipped, with the reason for each skip; the two constants you chose (queue cap and backlog threshold) with the seconds-of-audio each one works out to; the dropped-frame log line; the download counts from the 12.3 test; the sentence you added to the README for 12.7 plus your one-line recommendation on the disk question; and the three deliberately-unfixed items with their one-line reasons.
11. **PHASE 7 — the review pass.** Which review you actually ran (`/code-review`, or the reviewer subagents and the brief each was given). Then the findings as a short table: what it said · which bucket you put it in · what you did. Include the ones you disagreed with and why — a review with zero disagreements usually means it was obeyed rather than read. Finish with the clean-tree `npm ci` / lint / test / build output and the comparison against the Phase 0 baseline numbers.
12. **PHASE 9 — the deploy, honestly.** The live URL and the commit that is serving. The commit and deployment id you noted as the rollback point before pushing. The build log result and the boot log result, separately. The four solo checks with a pass/fail each. The **owed list** from Phase 8, item by item, each marked passed or failed by the live test — an item nobody tested is marked *not tested*, never passed. Every fix from the debug round: the **verbatim error text** (keys and tokens redacted), which side it was on (browser / our server / vendor), the change you made, and why it worked. And the final state in one sentence — either "the live site passes everything on commit X" or exactly what it still fails at.
13. **The run log** — `docs/PROMPT-09-RUN-LOG.md` in full (rule 7 of the phase plan), in order, so the reviewer can see where each decision was made and what went wrong on the way.
