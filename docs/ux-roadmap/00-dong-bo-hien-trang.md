# 00 — ĐỒNG BỘ / TRẠNG THÁI HIỆN TẠI (đọc TRƯỚC mỗi phiên & mỗi lần push)

> **Tài liệu SỐNG — nguồn-sự-thật-duy-nhất cho cả đội** (CodeLong · HoangKha · anh Hiên · các agent). Cập nhật mỗi khi có thay đổi lớn. **00 KHÔNG lặp nội dung doc khác** — chỉ giữ (a) ẢNH NHANH hiện trạng, (b) chỗ doc khác đang TRÔI LỆCH, (c) NHẬT KÝ. Chi tiết "làm thế nào" nằm ở doc chuyên đề, 00 chỉ TRỎ tới.

## ① ẢNH NHANH (cập nhật: 2026-07-19)
| Hạng mục | Hiện trạng |
|---|---|
| **URL chính thức** | **https://proyaku.up.railway.app** |
| URL cũ | `atsuserui-production…up.railway.app` → **404 vì ĐỔI TÊN domain** (không phải sập). Bỏ dùng. |
| App khác (KHÔNG liên quan) | `agent-translator-cloud…` = "Esuhai Realtime Translation" — dự án của người khác. **Bỏ qua.** Chỉ có **1** app PROYAKU. |
| Repo | `github.com/EsuhaiAlesu/ATS_UserUI` · nhánh deploy **`develop`** (main theo sau) |
| **Theme** | **KIM SẮC vàng–đen — ĐÃ BUILD & LIVE** (đen `#100d07` · vàng `#e8b84b`/`#f4d06a` · kem `#f3ead3` · đỏ `#ff6b60` CHỈ báo động). Màu thật trong `src/index.css`. |
| **Deploy** | Railway **KHÔNG tự deploy khi push** → phải **bấm Redeploy tay** (hoặc bật Settings→Source→Auto Deploy nhánh develop). |
| **Backend** | **CHƯA chạy trên Mac Studio** (Bước 0 chưa làm — [17](17-buoc-0-chay-backend-mac.md)). Repo backend `HarryDoan123/HanDichThuat` đang **404/private** — cần xin quyền. |
| **Đăng nhập** | Cổng login (`server.js`) — **TẮT tới khi đặt `AUTH_PASSWORD`** trong Railway Variables (user mặc định `leson@esuhai.com`). |

## ② DOC ĐANG TRÔI LỆCH (dùng bảng này thay vì sửa tay 66 chỗ — sẽ vá dần)
| Doc | Đang ghi (cũ) | Thực tế |
|---|---|---|
| README · 01 · 03 · 04 · 07 · 09 · 11 | theme **ĐỎ / wine `#1a0b0b` / vàng là "tương lai"** | **VÀNG–ĐEN đã build**. Màu chuẩn = `index.css` + [11](11-ngon-ngu-thiet-ke.md). |
| 08 | "Glossary / TTS / pre-flight **vắng mặt**" | **ĐÃ BUILD**: `/glossary`, `/voices` (TTS+clinic), pre-flight ở `/audio`. |
| 15 (bảng F) | F4 pop-out=demo · F5 lid trùng · F6 production proxy = **🔴 chưa** | **ĐÃ SỬA** (A1.5 session bus · A1.7 epoch-key · A1.6 preview proxy). |
| 16 (playbook) | trạng thái A1–A4 rải rác | **A1·A2·A3·A4 + theme = DONE**. |
| — | *(chưa có)* IA/menu & Mission Control | **ĐÃ THÊM** [19](19-ia-dieu-huong-mot-truc.md) · [20](20-mission-control.md) (đề xuất, chưa build). |

## ③ VIỆC ĐANG MỞ (theo ưu tiên GO/NO-GO gala)
1. **Bước 0** — đội kỹ thuật chạy backend trên Mac + đo số ([17](17-buoc-0-chay-backend-mac.md)). *Chặn mọi thứ có số liệu thật.*
2. **IA/menu một trục** — 4 phase ([19](19-ia-dieu-huong-mot-truc.md)). *Chờ duyệt.*
3. **Mission Control `/control`** — dựng phần chạy-được-ngay; metrics phần cứng chờ 3 endpoint backend ([20](20-mission-control.md)).
4. **A5** — diễn tập & dự phòng ngày lễ ([18](18-a5-dien-tap-du-phong.md)).

## ④ GOVERNANCE (chống dẫm nhau — bắt buộc)
- **Nhiều người/agent trên 1 repo** → chốt **1 người push chính** (Sếp + anh Hiên quyết).
- **LUÔN `git fetch` + hoà việc trước khi push. KHÔNG force-push. Chỉ đẩy `develop`.** *(Đã có 1 lần suýt force-push.)*
- Deploy: sau khi push, **bấm Redeploy trên Railway** (chưa auto).
- Author commit: `hoangkha@esuhai.com`. Không PII/secret trong repo (mật khẩu chỉ ở Railway Variables).

## ⑤ NHẬT KÝ (mới nhất trên cùng)
- **2026-07-19 (tối)** — ✅ **3 nước đi WOW ĐÃ BUILD** (từ 6/10 → ước ~8/10): (1) **IA Phase 1 — khung điều hướng** (`OperatorLayout` 1 rail + khối An toàn ghim, /prep là nhà, /→/prep, bỏ 3 nav cũ + sidebar /audio + back-link, xóa Home/MainLayout chết); (2) **Kỷ luật màu vàng** (hạ tiêu đề/nhãn xuống kem, vàng chỉ ~1 điểm nhấn/màn — hết "AI-làm"); (3) **Khoảnh khắc lễ 20 năm** trên /stream (lockup Cinzel "20周年 · 2006–2026 · ESUHAI" ở slate chờ · hiệu ứng "lên-sóng" đường vàng + PROYAKU tan khi cut→live, tôn trọng reduced-motion · lower-third tên diễn giả từ localStorage). Verify trình duyệt từng bước, 0 lỗi console, build+lint sạch. *Chờ Railway Redeploy để lên live.* Còn: Phase 2 (gọn /audio SETUP↔RUN), thống nhất icon, accessibility.
- **2026-07-19 (chiều)** — Audit UX trung thực: **6/10** (đẹp da chưa đẹp xương — nav rối, vàng bôi khắp, vết prototype). Đã sửa **quick win** (xóa footer giả + link chết · đổi "HanDichThuat"→"Lõi dịch PROYAKU" · xóa nút chết · fix bug bo góc/pill · làm mềm góc). Thêm **doc 21** (đánh giá kỹ thuật ≈3/5, khoá sau Bước 0), **22** (spec build khung điều hướng), **23** (đọc số Bước 0 & cây quyết định), **24** (phân vai & phối hợp đội). Còn chờ duyệt: nước đi lớn (khung điều hướng #1 · kỷ luật màu · khoảnh khắc lên-sóng) + chốt 1 người push.
- **2026-07-19 (sáng)** — Theme vàng–đen **build + LIVE**; đổi domain `proyaku.up.railway.app`; thêm cổng login (`server.js`); thêm doc 19 (IA), 20 (Mission Control), 00 (đồng bộ). Phát hiện: Railway không tự deploy (cần Redeploy tay); npm-ci lock đã fix (HoangKha `96ae673`).
- **2026-07-18** — A1–A4 + `/prep` Prep Desk + audit (15) + playbook (16) + runbook Bước 0 (17) & A5 (18); reskin KIM SẮC (docs 11/12).

> Mỗi lần thay đổi lớn: cập nhật ① ẢNH NHANH + thêm 1 dòng ⑤ NHẬT KÝ. Bắt đầu mỗi phiên: **đọc 00 trước.**
