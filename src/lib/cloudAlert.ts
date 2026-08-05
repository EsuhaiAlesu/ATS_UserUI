// src/lib/cloudAlert.ts — the one thing on screen that says "your work is not reaching the store".
//
// WHY THIS IS NOT A REACT COMPONENT.
//
// The message has to be visible from every screen — the run console, the Timeline, Chuẩn bị — and the
// only place that could mount it for all of them is the shared layout, which is precisely the file three
// other pieces of work are editing at the same time. A banner appended to `document.body` needs nobody's
// permission and collides with nothing. It is forty lines of DOM against a merge conflict in the file
// every screen depends on.
//
// It also has to survive being wrong about styling: inline styles only, because Tailwind builds its sheet
// by scanning source for class names and a `.ts` file outside that scan would ship a banner with no
// colours — an invisible warning, which is worse than none.
//
// It appears for exactly two states and is otherwise absent from the DOM: a push the server REFUSED, and
// a store that is provably ahead of this machine. Anything more and it becomes the thing operators learn
// to ignore.

import { subscribeCloud, type CloudState } from './cloudSync';

const ID = 'proyaku-cloud-alert';

/** Deliberately not a link: a hard navigation would throw away whatever the operator was in the middle of. */
const SETTINGS_HINT = 'Vào Cài đặt → Dữ liệu → "Lấy từ kho chung về máy này".';

function textFor(s: CloudState): string {
    if (s.status === 'conflict') {
        const who = s.remoteBy ? ` (máy ${s.remoteBy})` : '';
        return `Chưa lưu được lên kho chung: trên kho đã có bản mới hơn${who}. ${SETTINGS_HINT}`;
    }
    if (s.remoteNewer) {
        return `Kho chung có bản mới hơn máy này. ${SETTINGS_HINT}`;
    }
    return '';
}

function box(): HTMLElement {
    const found = document.getElementById(ID);
    if (found) return found;
    const el = document.createElement('div');
    el.id = ID;
    el.setAttribute('role', 'status');
    el.style.cssText = [
        'position:fixed', 'left:16px', 'bottom:16px', 'z-index:2147483000',
        'max-width:min(420px, calc(100vw - 32px))',
        'padding:12px 14px', 'border-radius:12px',
        'background:#3a1212', 'color:#ffd9d9', 'border:1px solid #b3261e',
        'font:500 13px/1.5 system-ui, sans-serif',
        'box-shadow:0 8px 24px rgba(0,0,0,.45)',
        'display:flex', 'gap:10px', 'align-items:flex-start',
    ].join(';');
    const msg = document.createElement('span');
    msg.dataset.role = 'msg';
    msg.style.flex = '1';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Đóng');
    close.style.cssText = 'background:none;border:0;color:inherit;cursor:pointer;font-size:14px;line-height:1;padding:2px';
    // Dismissing hides THIS message, not the next one: the state is still wrong, and the operator will be
    // told again the moment it changes. A permanent mute would be a silent failure with a checkbox.
    close.onclick = () => { el.remove(); };
    el.append(msg, close);
    document.body.append(el);
    return el;
}

function render(s: CloudState): void {
    const text = textFor(s);
    if (!text) {
        document.getElementById(ID)?.remove();
        return;
    }
    const el = box();
    const msg = el.querySelector('[data-role="msg"]');
    if (msg && msg.textContent !== text) msg.textContent = text;
}

/** Start watching. Returns the unsubscribe, so a test can take it back down. */
export function mountCloudAlert(): () => void {
    if (typeof document === 'undefined') return () => { };
    const off = subscribeCloud(render);
    return () => { off(); document.getElementById(ID)?.remove(); };
}
