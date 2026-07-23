# ATS_UserUI — Claude instructions

## Two-lane rules (online / offline) — MANDATORY

This app has 2 independent, switchable interpretation lanes, manually switched by a technician:
- OFFLINE = HanDichThuat backend (`/api/*`, `WS /api/ws/live`). Code: `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, and the existing pages.
- ONLINE = Esuhai Realtime Translation core. Code lives ONLY in `src/lib/lanes/online/` + the lab route `/online-lab`. Contract: `docs/ONLINE-LANE-CONTRACT.md` — this is the source of truth; NEVER invent endpoints/events outside that file.

Rules:
1. When the user asks to change/add a feature WITHOUT specifying the lane → you MUST ask "Is this for the online lane or the offline lane?" before writing any code.
2. Online-lane work must not modify offline-lane files. Offline-lane work must not modify `src/lib/lanes/online/`.
3. The shared interface file `src/lib/lanes/types.ts` is the treaty between the two lanes — only change it with explicit user confirmation, and always state the impact on both lanes.
4. The online lane ALWAYS calls its backend through the `/online-api` base path (proxy). Relative `/api/*` paths belong to HanDichThuat — never call the online core via `/api`.
5. Every response touching the online lane must state: files changed, why, and whether any offline-lane file was touched (the default answer must be NO).
