# PROYAKU — Phiên dịch hội nghị VI ⇄ JA (ATS_UserUI)

Bàn điều khiển phiên dịch trực tiếp Việt ⇄ Nhật cho sự kiện của Esuhai (React 19 + Vite + TypeScript + Tailwind). Giao diện vận hành gồm: màn **Dịch hội nghị** (bàn dịch trực tiếp), xuất phụ đề ra màn khán giả, chuẩn bị sự kiện (kịch bản · từ điển · giọng đọc · lịch), báo cáo và cài đặt.

## 1. Hai luồng dịch (2 lanes)

Ứng dụng có **2 luồng phiên dịch độc lập**, kỹ thuật viên **chuyển tay** giữa chúng — **không bao giờ chạy đồng thời** (một luồng đang thu mic thì luồng kia phải Dừng):

| Luồng | Lõi dịch | Đường gọi | Vị trí code |
|---|---|---|---|
| **OFFLINE** | HanDichThuat (tự host, ví dụ trên Mac Studio) | `/api/*`, `WS /api/ws/live` | `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`, các trang hiện có |
| **ONLINE** | Esuhai Realtime Translation (dịch vụ đám mây: nhận dạng · dịch 2 tầng · đọc giọng) | `/online-api/*` (HTTP + WS) — phục vụ **ngay trong** `server.js` | `src/lib/lanes/online/` (+ `server/online-api.mjs`, `server/online-config.mjs`) |

- **Chuyển luồng:** ở màn **Dịch hội nghị** (`/audio`) — nút **"Luồng dịch" [OFFLINE | ONLINE]** (góc trên‑phải trên desktop; thanh trên cùng trên điện thoại/tablet). Nút khóa lại khi một phiên đang chạy để không mở hai mic.
- **Mặc định hiện tại = ONLINE:** lõi OFFLINE tự host **chưa được nối** vào bản deploy này, nên trình duyệt mới sẽ mở luồng dùng được ngay. **Lựa chọn của người dùng luôn được nhớ** (localStorage `proyaku_conference_mode`) theo cả hai chiều: đã chọn OFFLINE thì lần sau vẫn OFFLINE, đã chọn ONLINE thì vẫn ONLINE.

## 2. Yêu cầu & cách chạy

- **Node 20** (khớp môi trường Railway; đã kiểm `npm ci` chạy trên Node 18/20/22). Cài phụ thuộc bằng `npm ci`.

```bash
npm ci            # cài đúng theo package-lock.json (giống hệt production)
npm run dev       # Vite dev server (http://localhost:5173) — có proxy, xem dưới
npm run build     # tsc -b && vite build → dist/
npm test          # vitest (bộ test các module thuần)
npm start         # node server.js — phục vụ dist/ + backend ONLINE (cổng process.env.PORT || 3000)
npm run lint      # oxlint
```

**Proxy khi dev** (`vite.config.ts`):
- `/api/*` → HanDichThuat (mặc định `http://127.0.0.1:8080`, đổi bằng biến `ATS_BACKEND`).
- `/online-api/*` → backend ONLINE trong `server.js` (mặc định `http://127.0.0.1:3000`, đổi bằng `ONLINE_BACKEND`). Khi dev luồng ONLINE, chạy thêm `node server.js` ở một cửa sổ khác.

## 3. Triển khai (Railway)

Railway build nhánh **`develop`** theo chuỗi: **`npm ci` → `npm run build` → `npm start`**. Server lắng nghe ở `process.env.PORT`. Đăng nhập bật/tắt bằng `AUTH_PASSWORD` (+ `SESSION_SECRET`); không đặt thì cổng đăng nhập TẮT (fail‑open, tránh khóa cả hội trường vì thiếu secret).

> ⚠️ **Bẫy lockfile (quan trọng):** Railway dùng **`npm ci`**, lệnh này **fail cứng** khi `package-lock.json` lệch với `package.json`. `npm` mới (11/12) trên máy dev có thể sinh lockfile mà `npm ci` chạy được cục bộ **nhưng npm 10 của Railway lại từ chối** (nest khác nhau các optional dep như `@emnapi/runtime`). ⇒ Sau khi đổi `package.json`, luôn kiểm `npm ci` trên **đúng phiên bản npm của production** (Node 20 / npm 10.x), ví dụ trong Docker: `docker run --rm -v "$PWD/package.json:/app/package.json:ro" -v "$PWD/package-lock.json:/app/package-lock.json:ro" -w /app node:20-slim npm ci`. Xem thêm trong `CLAUDE.md`.

## 4. Cấu hình khóa dịch vụ (luồng ONLINE)

Luồng ONLINE cần **6 giá trị dịch vụ**: máy chủ + khóa **nhận dạng giọng nói**, khóa **tinh chỉnh bản dịch**, khóa + 2 mã giọng (VI, JA) **tổng hợp giọng nói**. Hai cách cung cấp:

1. **Nhập lúc chạy qua Cài đặt** → mục **"Chế độ ONLINE — Khóa API"**. Khóa được lưu **phía máy chủ** (`server/online-config.mjs`), **chỉ ghi** — không bao giờ trả về, hiển thị lại hay ghi log. Client chỉ dùng "slug đục", server tự ánh xạ sang biến môi trường thật.
2. **Biến môi trường trên Railway** — làm **fallback vĩnh viễn**.

> Giá trị nhập lúc chạy được lưu vào tệp trên đĩa; **đĩa Railway là tạm (ephemeral)** nên sau mỗi lần redeploy có thể phải nhập lại — dùng biến môi trường nếu muốn giữ vĩnh viễn. Không có khóa/mã model/địa chỉ dịch vụ nào được ghi trong mã nguồn hay lọt vào bundle client.

> ⚠️ **Dữ liệu trên đĩa KHÔNG sống sót qua redeploy (TASK 12.7).** Cả `./translated_history` (bản ghi transcript của buổi dịch) lẫn `./online-keys.json` (6 khóa dịch vụ nhập lúc chạy) đều nằm trên đĩa tạm của container: **mỗi lần redeploy là xoá sạch cả hai** — mất transcript của buổi và toàn bộ khóa. Cách khắc phục là gắn một **Railway Volume** vào đúng đường dẫn đó để nó tồn tại qua các lần deploy (đặt `ONLINE_KEYS_FILE` và thư mục lưu transcript vào điểm mount của Volume). Trong lúc chưa có Volume: sau khi bấm **Dừng**, hãy bấm **"Lưu transcript"** để **tải một bản về máy** — đó là bản chắc chắn giữ được. *(Quyết định gắn Volume tốn phí hạ tầng nên thuộc về chủ dự án; khuyến nghị: gắn một Volume nhỏ cho khóa để khỏi nhập lại sau mỗi deploy, còn transcript thì luôn tải bản dự phòng về máy sau mỗi buổi.)*

## 5. Bố cục repo

```
src/pages/             # các trang: AudioRouting (Dịch hội nghị), Settings, Prep, Report, Stream…
src/components/        # khung vỏ dùng chung: OperatorLayout (head bar + sidebar + drawer mobile)…
src/lib/               # api.ts, LiveSessionContext.tsx, useMeter.ts (luồng OFFLINE) + tiện ích chung
src/lib/lanes/online/  # LUỒNG ONLINE — facade (index.ts: hook useOnlineLane, config helpers)
  └ components/        #   OnlinePanel (console dịch), OnlineKeysSettings (mục khóa trong Cài đặt)
src/lib/lanes/types.ts # "hiệp ước" giao diện chung giữa 2 luồng
server.js              # server production (Node thuần): phục vụ dist/ + cổng đăng nhập + gắn ONLINE
server/                # online-api.mjs (backend ONLINE) + online-config.mjs (kho khóa, chỉ ghi)
docs/                  # hợp đồng luồng ONLINE, API luồng, ux-roadmap…
```

## 6. Quy tắc cho người làm việc trong repo

- **Tách biệt 2 luồng:** việc luồng ONLINE **không** sửa file OFFLINE (`src/lib/api.ts`, `LiveSessionContext.tsx`, `useMeter.ts`); việc luồng OFFLINE **không** sửa `src/lib/lanes/online/`.
- **Chỉ đúng 2 điểm tích hợp** được phép import facade luồng ONLINE (`src/lib/lanes/online/`): nút chuyển ONLINE/OFFLINE ở `src/pages/AudioRouting.tsx` và mục khóa ở `src/pages/Settings.tsx`. (`/online-lab` là bench debug **ẩn, không có link** — cũng import qua facade.)
- Luồng ONLINE **luôn** gọi qua `/online-api`; đường `/api/*` thuộc về HanDichThuat.
- Hợp đồng `docs/ONLINE-LANE-CONTRACT.md` là **nguồn chân lý** — không tự chế endpoint/event ngoài nó.
- **Không bí mật nào trong bundle client:** không tên biến môi trường, mã model, địa chỉ dịch vụ hay giá trị khóa nào được xuất hiện dưới `src/` hoặc trong bản build — các endpoint cấu hình chỉ nói "slug đục".
- Đổi `package.json` ⇒ kiểm `npm ci` bằng npm của production trước khi push (xem §3 và `CLAUDE.md`).

## 7. Tài liệu tham khảo

- `docs/ONLINE-LANE-CONTRACT.md` — hợp đồng FE⇄BE luồng ONLINE (nguồn chân lý).
- `docs/ONLINE-LANE-UI-API.md` — API facade luồng ONLINE cho UI.
- `CLAUDE.md` — quy tắc 2 luồng + bẫy lockfile khi deploy.

---

Phông chữ + icon Material Symbols được **tự host** dưới `public/fonts/` (không CDN Google Fonts) để toàn bộ UI — kể cả icon trên console và tường phụ đề khán giả — hiển thị được trên mạng hội trường bị cô lập/offline.
