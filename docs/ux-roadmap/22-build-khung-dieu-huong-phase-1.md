# 22 — Build: Khung điều hướng (IA Phase 1) — spec để code

> **Biến thiết kế [19](19-ia-dieu-huong-mot-truc.md) thành kế hoạch code cụ thể cho Phase 1.** Đây là đòn bẩy WOW lớn nhất (giết "menu rối / khó tiến-lùi"). Chỉ **sắp xếp lại điều hướng** — KHÔNG thêm tính năng, KHÔNG đổi lõi phiên (LiveSessionContext). Làm trên nhánh, duyệt trước khi qua Phase 2.

## 22.0 Định nghĩa hoàn thành (DoD)
- MỘT thanh rail trái duy nhất trên mọi trang vận hành; xoá 3 hệ nav cũ.
- `/prep` là nhà duy nhất; `/` = splash → tự vào `/prep`.
- Breadcrumb + 1 nút "‹ Quay lại" nhất quán; **EMERGENCY STOP + trạng thái phiên** ghim chân rail, gọi được từ MỌI trang.
- `/stream`, `/reveal` giữ toàn màn hình (ngoài rail), chỉ "✕ Thoát".
- Build+lint sạch; test tay: splash→/prep, back nhất quán, EMERGENCY STOP từ mọi trang, /stream+/reveal không dính rail.

## 22.1 File đụng tới
| Hành động | File | Nội dung |
|---|---|---|
| **TẠO** | `src/components/OperatorLayout.tsx` | Component khung: rail trái + top-bar (breadcrumb + "‹ Quay lại") + khối AN TOÀN chân rail; render `<Outlet/>`. |
| **SỬA** | `src/App.tsx` | Bọc `/prep /audio /script /glossary /voices` trong `<Route element={<OperatorLayout/>}>`. `/`: splash xong → `<Navigate to="/prep" replace/>`. `/stream /reveal` để NGOÀI layout. |
| **SỬA** | `src/pages/AudioRouting.tsx` | Bỏ **sidebar-điều-hướng** (giữ nội dung console). EMERGENCY STOP chuyển lên rail (hoặc để layout render). |
| **SỬA** | `GlossaryEditor · ScriptPrep · VoiceStudio · PrepDesk` | Bỏ back-link riêng mỗi trang (layout lo). |
| **RETIRE** | `src/components/MainLayout.tsx` | Không còn dùng làm nav (chưa nối router). Xoá hoặc để `Home` render thẳng nội dung. |
| **GIỮ NGUYÊN** | `src/lib/LiveSessionContext.tsx` | **KHÔNG đụng** — chỉ đọc `useLiveSession()`. |

## 22.2 Phác API `OperatorLayout`
```tsx
// Đọc trạng thái từ context có sẵn — KHÔNG thêm nguồn state mới.
const session = useLiveSession();   // backendOnline, status, audienceCut, stop()
const loc = useLocation();          // để tô sáng mục rail + dựng breadcrumb

const NAV = [
  { group: 'Nhà',        items: [{ label: 'Bảng chỉ huy', to: '/prep', icon: 'dashboard' }] },
  { group: 'Chuẩn bị',   items: [{ to:'/script', label:'Kịch bản' }, { to:'/glossary', label:'Từ điển & Tên riêng' }, { to:'/voices', label:'Giọng đọc' }] },
  { group: 'Vận hành',   items: [{ to:'/audio', label:'Bàn điều khiển' }, { to:'/stream', label:'Tường phụ đề', external:true }, { to:'/reveal', label:'Reveal', external:true }] },
  { group: 'Sau',        items: [{ to:'/prep?phase=post', label:'Tổng kết' }] },
];
// Khối AN TOÀN (chân rail, LUÔN hiện): đèn = masterLabel(session); nút EMERGENCY STOP = session.stop().
// Breadcrumb: map route → "Nhóm › Trang".
```
- Rail `~240px`, thu về icon khi `md` hẹp / khi `status ∈ {warming,ready,listening}`. **Khối AN TOÀN luôn giữ nhãn CHỮ** dù thu gọn.
- Mục `external:true` (/stream, /reveal): mở toàn màn hình (đánh dấu icon "mở ngoài"); các trang đó tự có "✕ Thoát" về /prep.

## 22.3 Thứ tự làm (từng bước, có kiểm)
1. Tạo `OperatorLayout` render rail + top-bar + `<Outlet/>` + khối AN TOÀN. Style KIM SẮC, **1 marker vàng** (mục đang chọn); tiêu đề trang màu kem.
2. Bọc route trong `App.tsx`; `/`→splash→Navigate `/prep`. Build → mở từng trang xem rail hiện đúng.
3. Bỏ sidebar-nav ở AudioRouting; bỏ back-link các trang prep. Build → không còn nav trùng.
4. Test tay: (a) splash→/prep; (b) rail tô sáng đúng trang; (c) breadcrumb đúng; (d) "‹ Quay lại" nhất quán; (e) **EMERGENCY STOP từ /glossary, /script, /voices, /audio đều gọi `session.stop()`**; (f) /stream, /reveal toàn màn hình, không rail; (g) offline không vỡ.
5. Guard rời-trang-khi-LIVE (xác nhận nếu `status ∈ {connecting,warming,listening}`); EMERGENCY STOP KHÔNG bị guard.

## 22.4 Rủi ro & rollback
- **Bookmark `/` cũ / pop-out `/stream?display=1`**: giữ redirect splash + để /stream ngoài layout → không gãy.
- **EMERGENCY STOP** phải test từ MỌI trang (đây là an toàn — không được regress).
- Làm trên nhánh; nếu lệch, `git revert` gọn vì chỉ đụng layout + routing, **không đụng LiveSessionContext**.
- **Diễn tập** full ở Green Room trước khi coi Phase 1 là "xong".

→ Phase kế: [19 §19.7](19-ia-dieu-huong-mot-truc.md) (Phase 2 gọn /audio · Phase 3 luồng dẫn dắt · Phase 4 kỷ luật màu). Trạng thái: [00](00-dong-bo-hien-trang.md).
