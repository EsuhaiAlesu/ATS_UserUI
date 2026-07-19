# 23 — Đọc số Bước 0 & Cây quyết định

> **Khi đội gửi bảng số [Bước 0](17-buoc-0-chay-backend-mac.md) (`handich_buoc0_ketqua.md`) về — làm gì với nó.** Đây là bước biến "chưa biết mức AI" ([21](21-danh-gia-ky-thuat.md)) thành **quyết định có bằng chứng**. Đọc trước khi có số để biết mình đang tìm gì.

## 23.0 Ngưỡng tham chiếu (mục tiêu — xác nhận bằng số thật)
| Chỉ số | Xanh (tốt) | Vàng (chấp nhận có điều kiện) | Đỏ (phải xử lý) |
|---|---|---|---|
| **MPS available** | true, model chạy GPU | một phần CPU | chỉ CPU toàn bộ / crash |
| Warm READY | ≤ ~60s | 60–150s | > 150s / fail |
| **partial** (nói→LINE) | ≤ 900ms | 900–1500ms | > 1500ms |
| **final** (đã sửa) | ≤ 1800ms | 1800–2800ms | > 2800ms |
| **spoken** (→ đọc TTS) | ≤ 2500ms | 2500–4000ms | > 4000ms |
| Nhiệt sau soak 3h | không throttle | throttle nhẹ cuối | throttle sớm |
| Tên riêng ★ (Lê Long Sơn, Kaizen…) | nghe đúng | sai lẻ tẻ, glossary cứu được | sai hệ thống |
| Con số 20/周年 | luôn đúng | — | nghe nhầm |

## 23.1 Cây quyết định (triệu chứng → hành động)
```
Backend KHÔNG chạy trên Metal / chỉ CPU:
  → thử ép MPS + PYTORCH_ENABLE_MPS_FALLBACK=1 (file 17 §5)
  → nếu vẫn CPU: đo latency CPU; nếu trong ngưỡng vàng thì CHẤP NHẬN cho gala,
    còn nếu đỏ → nâng cấp/đổi engine (dưới).

TRỄ CAO (final/spoken đỏ) → xem stage nào chậm (stt_ms/proc_ms/mt_ms):
  • MT (NLLB) chậm — thường do CTranslate2 = CPU-only trên Mac:
      → (a) chạy NLLB qua torch/transformers trên MPS, HOẶC
      → (b) model dịch nhỏ hơn/nhanh hơn, HOẶC
      → (c) BẬT fast-path tái dùng kịch bản đã duyệt (giảm số câu phải dịch live).
  • ASR (Qwen3) chậm → model ASR nhỏ/nhanh hơn, hoặc chấp nhận partial trễ.
  • TTS chậm → GALA CHỈ PHỤ ĐỀ (tắt TTS) — đúng khuyến nghị audit; TTS để phòng họp.

ĐỘ CHÍNH XÁC kém:
  • Tên/số sai → nạp glossary + hotword mạnh hơn (đã có /glossary), luyện Clinic (/voices).
  • Câu dịch VI⇄JA sai nghĩa/keigo → (a) NLLB-1.3B thay 600M, HOẶC (b) model dịch mạnh hơn,
    HOẶC (c) dựa NHIỀU hơn vào kịch bản duyệt sẵn (/script) cho các đoạn cố định của lễ.

NHIỆT throttle trong soak 3h → giảm tải (tắt LLM sidecar/TTS), tản nhiệt, hoặc chia phiên.
```

## 23.2 Ý nghĩa GO/NO-GO cho gala
- **Đủ điều kiện chạy (subtitles-primary):** partial/final ở vàng-trở-lên · tên/số đúng · không throttle 3h · **có phiên dịch người + Mac #2** (luôn bắt buộc — [18](18-a5-dien-tap-du-phong.md)).
- **Kích hoạt phương án người-là-chính:** nếu final/spoken đỏ không cứu được, HOẶC độ chính xác sai hệ thống → **gala để phiên dịch người dẫn, PROYAKU chỉ phụ đề tham khảo** (không đọc TTS).

## 23.3 Cập nhật sau khi có số
- Ghi số thật vào [21 §21.1/21.3](21-danh-gia-ky-thuat.md) (thay "chưa đo" bằng con số) → nâng mục "kiểm chứng" từ 0–1/5 lên mức thật.
- Cập nhật ① ẢNH NHANH + ⑤ NHẬT KÝ trong [00](00-dong-bo-hien-trang.md).
- Nếu quyết nâng model → mở việc backend tương ứng; nếu tắt TTS → cập nhật [20 Mission Control](20-mission-control.md) + preflight.

→ Nguồn số: [17 mẫu báo cáo](17-buoc-0-chay-backend-mac.md). Người phân tích: FE (Claude Code) + BE (anh Hiên) + chủ backend.
