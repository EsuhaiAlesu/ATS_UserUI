// src/lib/cloudBoot.ts — the three things the sync channel does on its own, and where they are allowed.
//
// Kept out of `main.tsx` so that file stays two lines longer than it was, and out of `cloudSync.ts` so
// that file stays importable by a test without a browser starting to talk to a server behind its back.
//
// NOT on the audience windows. `/wall` is a subtitle screen opened three times over on ceremony night;
// it holds no Chuẩn bị data, edits nothing, and the last thing it should do mid-sentence is reload itself
// because a store somewhere was empty. The check is on the PATH rather than on a flag, because the wall
// windows are opened by URL and there is nothing else to ask.

import { adoptFromCloudIfEmpty, checkRemoteNewer, startSettingsWatch } from './cloudSync';
import { mountCloudAlert } from './cloudAlert';

// Every full-screen surface pointed at the room rather than at the operator. `/wall` was the only one when
// this was written; `/stream` (the two-language stream page) and `/reveal` (the ceremonial reveal) are the
// same kind of window and were simply missed — both are opened on a hall screen for the whole ceremony,
// both hold no Chuẩn bị data of their own, and both would happily reload themselves mid-sentence because
// a store somewhere was empty.
const AUDIENCE_PATHS = ['/wall', '/stream', '/reveal'] as const;

/** `/wall`, `/wall-mockup`, `/stream`, `/reveal` — and anything nested under them. */
export function isAudienceWindow(pathname: string): boolean {
    return AUDIENCE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || pathname.startsWith('/wall-');
}

/**
 * Never throws and never blocks the first paint: everything here is either instant and local (the
 * "is this machine empty" check reads two keys) or happens after the app is already on screen.
 */
export async function bootCloud(pathname = window.location.pathname): Promise<void> {
    if (isAudienceWindow(pathname)) return;
    mountCloudAlert();
    try {
        // A fresh machine takes the store and starts again with it. The reload is the honest move: every
        // page here read its data synchronously at mount, and this one mounted a moment ago on nothing.
        if (await adoptFromCloudIfEmpty()) {
            window.location.reload();
            return;
        }
        await checkRemoteNewer();
    } catch { /* a start-up nicety must never be the reason the app does not start */ }
    startSettingsWatch();
}
