# 03 — Hệ thống thiết kế (Design System) & Ngôn ngữ thị giác

[← 02 Đối chiếu app](02-doi-chieu-app-hang-dau.md) · Tiếp: [04 — Màn phụ đề →](04-man-hinh-phu-de.md)

**Điểm lăng kính: 6/10** — *Nền tảng Material-3 thật, nhưng hệ thống mới nửa vời, gần như không tái sử dụng component, bo góc lỗi, đỏ thương hiệu biến mất ở dark mode, và Times New Roman ở màn hình khán giả nhìn vào.*

> 🎨 **Áp dụng định hướng KIM SẮC:** *Linear* (kỷ luật token, chiều sâu bằng viền hairline) · *Raycast* (nền wine + accent đỏ) · *Stripe* (vàng foil làm chữ ký). Xem [11 — Ngôn ngữ thiết kế](11-ngon-ngu-thiet-ke.md) và [12 — Thư viện mẫu](12-thu-vien-mau-giao-dien.md) (Button 12.1, Card/Field 12.11, Divider 12.12).

---

## 3.1. Đang tốt ở đâu

- Bộ token tonal M3 đầy đủ trong `src/index.css` (`:root` + `.dark`), ánh xạ sang Tailwind (`tailwind.config.js`). Component "nói" bằng vai trò ngữ nghĩa (`bg-surface-container`) thay vì hex.
- Hệ spacing 8px có tên (`stack-sm/md/lg`, `gutter`, `section-gap`, `container-padding`).
- Palette **dark mode** thật sự cao cấp: nền wine `#1a0b0b`, vàng `#e9c349`, glow — trông như branding sự kiện thật.

## 3.2. Vấn đề & hướng sửa

### 🟠 P0 — Đỏ thương hiệu biến mất ở dark mode
Theo quy ước M3, `.dark --color-primary` được remap thành hồng-xám nhạt `#ddc0bf` (tông để đặt *lên* nền tối), **không phải** đỏ Esuhai. Nhưng app dùng `text-primary` cho các dấu hiệu thương hiệu (icon navbar, số dB, link footer) → ở dark mode chúng thành màu mauve nhạt. **Đỏ #dc2626 gần như biến mất; chỉ còn vàng gánh thương hiệu.**

→ **Sửa:** Tạo **token thương hiệu cố định** `brand-red`, `brand-gold` **không đổi giữa 2 mode**. Dùng chúng cho dấu hiệu thương hiệu; để dành `primary/on-primary` chỉ cho tương phản surface M3.

### 🟠 P0 — App khởi động light-first → reveal mặc định là bản yếu
`MainLayout` khởi tạo `isDarkMode=false`, chỉ thêm class `dark` nếu `localStorage==='dark'`; logic theme lại nằm *trong* MainLayout, còn RevealMoment/SplashScreen render trước đó. Lần tải đầu → sân khấu lễ hội hiện ra dưới dạng **chữ đỏ trên nền trắng/hồng với glow đỏ-trên-trắng đục** thay vì vàng-trên-đen như thiết kế. **Ấn tượng đầu tiên quan trọng nhất lại ship ở palette yếu nhất.**

→ **Sửa:** **Ép dark mode mặc định cho route `/` và `/stream`** (surface lễ hội chỉ đẹp ở dark). Console `/audio` vẫn cho toggle sáng.

### 🟠 P0 — Times New Roman trên sân khấu
`BilingualStream` hard-code `serifStyle = 'Times New Roman', Times, serif` cho **mọi dòng phụ đề VN** — đúng tiêu điểm cả buổi lễ. Times là serif mặc định "cấp thấp" nhất, render dấu tiếng Việt không đều và khác nhau trên mỗi máy. (Chi tiết ở [06](06-typography-i18n.md).)

→ **Sửa:** Thay bằng display serif được curate (hoặc Cinzel đã tải, hoặc Noto Serif) — hoặc thống nhất sang sans đậm. Bỏ `serifStyle`.

### 🟡 P1 — Bug thang bo góc
`tailwind.config.js` override radius: `DEFAULT 2px / lg 4px / xl 8px / full 12px`.
- `rounded-full` giờ chỉ **12px** → mọi "viên thuốc" (control bar, nút LATEST, badge ngôn ngữ) thành hình chữ nhật bo nhẹ, không còn là pill.
- `rounded-DEFAULT` **có thể không sinh ra class nào** (Tailwind phát ra key DEFAULT là `rounded`, không phải `rounded-DEFAULT`) → card/nút START/EMERGENCY có thể **góc vuông 0px** ngoài ý muốn.

→ **Sửa:** Đặt lại thang radius hợp lý; `rounded-full` thật sự tròn; kiểm tra CSS build xem `rounded-DEFAULT` có resolve không, thay bằng `rounded`.

### 🟠 P1 — Gần như không tái sử dụng component
Không có `Button`, `Card`, `Select`, `Badge`, `StatusDot` dùng chung. `AudioRouting` lặp lại markup select 4 lần, card 3 lần, VU meter 2 lần; status dot LIVE/ONLINE/OFFLINE được viết lại độc lập ở MainLayout, AudioRouting, BilingualStream với size/class hơi khác nhau. **Đây là tín hiệu "template chứ không phải product" rõ nhất** — hệ thống chỉ sống trong CSS, chưa sống trong React.

→ **Sửa:** Trích `src/components/ui/` (Button, Card, Select/Field, StatusDot, Badge, IconButton) chỉ tiêu thụ token. Lint chặn utility màu/bo/size thô ở page. (Xem benchmark Linear ở [02](02-doi-chieu-app-hang-dau.md).)

### 🟡 P1 — Token mới dùng nửa vời
Dù có thang spacing, page vẫn rơi về giá trị thô liên tục: `pb-48`, `pt-4`, `gap-6`, `mt-4`; cỡ chữ hard-code `text-3xl/4xl`, `text-2xl`. → Không có single source of truth, không tinh chỉnh tập trung được.

→ **Sửa:** Định tuyến mọi spacing/size qua thang token; lint cờ giá trị ngoài thang.

### 🟡 P2 — Light mode chưa được art-direction
Light mode hiện là slate/red mặc định Tailwind, sân khấu hồng nhạt `#fee2e2`, không có vàng. Nó là **mặc định** nhưng lại bán rẻ sản phẩm.

→ **Sửa:** Hoặc thiết kế light mode ngang tầm (có vàng, surface lễ hội), hoặc **giới hạn light mode cho console**, để reveal/stream chỉ dark.

### 🟡 P2 — Nhãn hiệu (brand lockup) lẫn lộn
Bốn tên cho một sản phẩm: `ESUHAI` (splash), `Hana-Yaku` (reveal), `Agent Translator — 花訳` (navbar), `PRECISION LINGUISTICS` (footer AudioRouting) + ba cách xử lý chữ. Chữ 花訳 ở hero còn dùng font Latin (Be Vietnam Pro) nên kanji fallback giữa headline. → ✅ **Đã chốt tên chính thức: PROYAKU** (chữ Latin) — hết lẫn lộn; nếu vẫn dùng wordmark tiếng Nhật (vd プロヤク) thì vẫn cần font CJK tường minh.

→ **Sửa:** Một component **lockup PROYAKU** duy nhất (kanji + romaji + gạch vàng) dùng ở mọi surface; hoà giải tên ở footer/navbar/splash về một hệ.

---

## 3.3. North-star (tầm nhìn xa)

- **"Ceremony theme" bất biến theo mode:** vàng-trên-wine là bản sắc ở *cả* light lẫn dark, nhờ token thương hiệu cố định — buổi lễ không bao giờ phụ thuộc việc toggle có được set đúng hay không.
- **Ghép display typeface thật** (serif được curate cho sân khấu + Be Vietnam Pro cho UI) với thang type có "giọng" tương phản thật, áp nhất quán từ splash tới phụ đề.
- **Storybook / style guide sống** của các primitive đã trích + vai trò token → chứng minh đây là design system, không phải cây page được skin.
- **Chuyển cảnh reveal→sân khấu có biên đạo:** gạch vàng splash morph thành Divider của BilingualStream — biến 3 màn hình rời thành một "build" Keynote liền mạch.
- **Vàng chất liệu foil:** gradient + specular nhẹ trên nút diamond Divider và badge → từ `#e9c349` phẳng lên chất "kim loại sự kiện" cao cấp.

---

## 3.4. Tóm tắt hành động

| Ưu tiên | Việc | Công sức | Tác động |
|:---:|------|:---:|:---:|
| P0 | Ép dark mặc định cho reveal/stream | S | Cao |
| P0 | Token thương hiệu cố định `brand-red`/`brand-gold` | M | Cao |
| P0 | Thay Times New Roman trên sân khấu | S | Cao |
| P1 | Trích lớp UI primitive dùng chung | L | Cao |
| P1 | Sửa thang bo góc + audit `rounded-DEFAULT/full` | S | TB |
| P1 | Ép spacing/type theo token, lint chặn giá trị thô | M | TB |
| P2 | Art-direction light mode hoặc giới hạn cho console | M | TB |
| P2 | Thống nhất brand lockup + tên sản phẩm | S | TB |
| P2 | Tối ưu phân phối font (xem [06](06-typography-i18n.md)) | S | Thấp |

---

[← 02 Đối chiếu app](02-doi-chieu-app-hang-dau.md) · Tiếp: [04 — Màn phụ đề →](04-man-hinh-phu-de.md)
