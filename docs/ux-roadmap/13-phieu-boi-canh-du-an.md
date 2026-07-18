# 13 — Phiếu bối cảnh dự án (em điền thử · Thầy tinh chỉnh)

[← Về README](README.md)

> Em đã **điền thử cột "Gợi ý của em"** dựa trên những gì suy ra được từ mã nguồn + bối cảnh, để Thầy chỉ việc **xem & sửa** thay vì điền từ đầu. Cột **"Chốt (Thầy điền)"** để Thầy xác nhận/điều chỉnh.
>
> **Ký hiệu mức chắc chắn:** ✅ suy ra khá chắc từ code/bối cảnh · 💡 đề xuất hợp lý (cần xác nhận) · ❓ chỉ Thầy biết — em nêu phương án mặc định.

---

## A. Sự kiện & nội dung

| Câu hỏi | Gợi ý của em | Chốt (Thầy điền) |
|---------|--------------|------------------|
| Ngày/giờ tổ chức? | ❓ Kịch bản demo ghi *"Hôm nay mùng 8 tháng 8"* → có thể **08/08/2026**? | ✅ **7/8 + 8/8/2026** — 8/8 là lễ kỷ niệm 20 năm (chính). Còn ~3 tuần. |
| Địa điểm (hội trường)? | ❓ Chưa rõ — cần để test "đọc từ hàng cuối" tại chỗ | |
| Số khách dự kiến? | 💡 Giả định **hội trường lớn ~300–500 khách** để chốt cỡ chữ tối thiểu | |
| Có kịch bản diễn văn soạn trước? | ✅ **Có, ít nhất phần khai mạc** (đang dùng làm demo trong `BilingualStream`). Cần bản đầy đủ để nạp glossary + on-script | |
| Mấy diễn giả? Ai VI, ai JA? | 💡 Giả định: lãnh đạo/MC nói **tiếng Việt** (→ dịch JA cho khách Nhật) + khách/đối tác **Nhật** nói tiếng Nhật (→ dịch VI) | |
| Tên riêng / keigo cần khoá | ✅ Danh sách khởi đầu: **Lê Long Sơn**, **Esuhai**, **Kaizen Yoshida School**, **Trung tâm Nhật ngữ Cải Tiến**, **Kaizen (改善)**, **Success in Shigoto / Shigoto (仕事)**, **PROYAKU**, keigo **御社 (おんしゃ)** | ✅ Thầy muốn **CỔNG ADMIN nhập tài liệu** (lịch trình, tên/nội dung/mục đích sự kiện, tài liệu đính kèm, kịch bản, từ vựng chuyên môn) → PROYAKU **học trước**; thuật toán **so khớp bộ nhớ** (khớp cao → tái dùng nhanh; khớp thấp → dịch trực tiếp). → thiết kế **Pre/In/Post-Event** (xem tài liệu mới đang biên soạn). |
| Phiên dịch NÓI (TTS) hay chỉ phụ đề? | 💡 Hiện app **chỉ phụ đề** | ✅ **VỪA NÓI (TTS) VỪA PHỤ ĐỀ** → phải wire TTS (`/api/tts/*`, block `tts`) |
| Ngôn ngữ: VI⇄JA hay +EN? | 💡 **Trọng tâm VI⇄JA** (đúng tên sản phẩm). Thêm EN nếu có nhiều khách quốc tế | |

## B. Hội trường & phần cứng

| Câu hỏi | Gợi ý của em | Chốt (Thầy điền) |
|---------|--------------|------------------|
| Màn chính: máy chiếu/LED? Kích thước? Độ phân giải? | ❓ Giả định **máy chiếu/LED ≥1080p**. Cỡ chữ fluid sẽ tự thích ứng, nhưng cần số thật để chốt cỡ tối thiểu | |
| Tỉ lệ khung? | 💡 **16:9** (app đang letterbox 16:9). Nếu LED khác tỉ lệ → dùng chế độ fill | |
| Khoảng cách xa nhất tới màn? | ❓ Giả định ~15–25m | ✅ **Đa dạng: phòng 20m² → 40m² → 100m² → 500m² → 1000m²** → BẮT BUỘC cỡ chữ **fluid + chỉnh được theo không gian** (full màn) |
| Bố trí **3 màn hình**? | 💡 màn giữa song ngữ + 2 cạnh mỗi màn 1 ngôn ngữ | ✅ **3 LỚP MÀN LED**: (1) màn giữa 16:9 **10m×5m** (song ngữ); (2) 2 màn **cánh gà dọc/portrait** LED đứng **3m×6m**; (3) LED cánh 2 bên: lớn **1.2m×5.2m**, nhỏ **1m×4.6m**. Trái/phải mỗi bên 1 ngôn ngữ để từng bên theo dõi. |
| Ánh sáng phòng? | 💡 Lễ trang trọng thường **giảm sáng** → hợp **dark-first KIM SẮC**. Cần xác nhận | |
| Máy chạy app: cấu hình? OS? | ✅ Code phát triển trên **Windows** (PowerShell, `C:\Users\Admin`). ⚠️ Backend cần **GPU/CUDA** (sidecar LLM + STT/MT). Cần rõ cấu hình máy | |

## C. Vận hành (độ tin cậy)

| Câu hỏi | Gợi ý của em | Chốt (Thầy điền) |
|---------|--------------|------------------|
| Ai vận hành? 1 hay 2 người? | 💡 Tối thiểu **1**; sự kiện quan trọng nên **2** (1 transport + 1 giám sát glossary/confidence). Console đang thiết kế cho 1 người | |
| Backend chạy ở đâu? | ✅ HanDichThuat `127.0.0.1:8080`, không auth | ✅ **Mac Studio M3 Ultra 96GB**; frontend mở **từ chính máy này** → cùng máy. ⚠️ Apple Silicon = **Metal/MPS (không CUDA)**; 96GB đủ giữ ASR+MT+LLM+TTS. Link UI↔backend gần như không rớt; **chạy offline được** → nên self-host font. |
| Mạng: LAN hay Wi-Fi? | 💡 Gợi ý **LAN có dây** cho ổn định; tránh Wi-Fi hội trường. (Reconnect vừa thêm để phòng chớp mạng) | |
| Có internet ổn định, hay cần **offline hoàn toàn**? | 💡 App đang tải **Google Fonts** (cần net). Nếu mạng yếu → **self-host font** (north-star [06](06-typography-i18n.md)). Cần biết có net ổn không | |
| Được **chạy thử tại hội trường** trước không? | 💡 **Rất khuyên** — "Green Room" chạy thử trên file ghi diễn văn. Cần xác nhận | |
| Micro: loại gì? mấy cái? mixer? | ❓ Cần biết để cấu hình `device_index`. Gợi ý: mic hội trường qua **mixer → 1 nguồn vào** | |

## D. Thương hiệu (để em dùng đúng bản sắc)

| Câu hỏi | Gợi ý của em | Chốt (Thầy điền) |
|---------|--------------|------------------|
| Có **brand guideline Esuhai chính thức**? | ❓ Em đang suy ra **đỏ `#dc2626` + vàng** từ code. Cần bản chính thức (mã đỏ chuẩn, font) để chốt; chưa có thì dùng KIM SẮC hiện tại | |
| Có **key visual lễ 20 năm**? | ❓ Nếu có poster/motif → em đồng bộ palette/hoạ tiết. Chưa có → dùng KIM SẮC | |
| Logo gốc SVG/PNG? | ✅ Có `logo_esuhai@2x.png` trong `src/assets` (PNG). Cần **SVG gốc** + logo **PROYAKU** nếu có | |
| Tên sản phẩm **chính thức**? | 💡 Đang lẫn 4 tên | ✅ **CHỐT: "PROYAKU"** — thống nhất mọi nơi (bỏ Hana-Yaku / Agent Translator / Precision Linguistics). |
| Giữ **vàng** hay theo màu chủ đề khác? | 💡 Gợi ý **giữ vàng** (hợp lễ + tương phản tốt trên nền đỏ vang). Nếu lễ có màu chủ đề riêng → theo màu đó | |

## E. Thời gian & đội ngũ

| Câu hỏi | Gợi ý của em | Chốt (Thầy điền) |
|---------|--------------|------------------|
| **Deadline** còn bao lâu? | ❓ Nếu sự kiện **08/8** thì còn **~3 tuần** → đủ cho **Giai đoạn 0 + phần lớn Giai đoạn 1**. Cần xác nhận ngày | |
| Ai code frontend? | 💡 Repo có tác giả **HoangKha** (hoangkha@esuhai.com) + KhoaVo → đội Esuhai. Cần biết mấy người | |
| Kinh nghiệm React/TS? | 💡 Code chất lượng khá → giả định **có kinh nghiệm React/TS tốt** | |
| Ưu tiên: **kịp sự kiện** hay **đầu tư dài hạn**? | 💡 Gợi ý: **kịp & tin cậy cho sự kiện trước** (GĐ 0–1), rồi đầu tư dài hạn (GĐ 2–3) sau | |
| Ngân sách thời gian/tuần? | ❓ Cần Thầy cho biết để định nhịp lộ trình | |

---

## F. Ghi chú tự do

> Bất cứ điều gì Thầy thấy quan trọng mà các mục trên chưa hỏi:

```
(Thầy ghi ở đây)
```

---

### 🔎 Những mục em cần Thầy quyết nhất (ảnh hưởng lớn tới thiết kế & lộ trình)
1. **Ngày sự kiện** (A) → định cả deadline & phạm vi khả thi.
2. **Bố trí màn hình + kích thước/khoảng cách** (B) → định cỡ chữ, chế độ đa màn hình.
3. **Backend chạy ở đâu + mạng + offline** (C) → định thiết kế reconnect/font/độ tin cậy.
4. **Brand thật (mã đỏ, key visual 20 năm) + tên chính thức** (D) → chốt KIM SẮC.
5. **TTS nói hay chỉ phụ đề** (A) → định phạm vi tính năng.
6. **Danh sách tên riêng/keigo đầy đủ** (A) → khoá glossary trước lễ.

> Các mục 💡 còn lại là **default hợp lý** — nếu Thầy không sửa, em coi như đồng ý và làm theo.

[← Về README](README.md)
