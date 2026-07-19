# 21 — Đánh giá kỹ thuật: mức độ trưởng thành (trung thực)

> **Đánh giá thẳng, không tô hồng — cho anh Hiên (backend) & CodeLong (R0).** Ngày: 2026-07-19. Đối tượng: PROYAKU như **một phần mềm hỗ trợ thông dịch đồng thời ứng dụng A.I**. Kết luận cốt lõi: *kiến trúc tốt, công cụ vận hành mạnh, nhưng **lõi AI dịch còn nhỏ và CHƯA kiểm chứng** — "mức độ" thật đang bị **khoá sau [Bước 0](17-buoc-0-chay-backend-mac.md)** (chạy + đo trên Mac).*

## 21.0 Kết luận một dòng
Trên thang **1 (ý tưởng) → 5 (production đã kiểm chứng thực chiến)**: tổng thể **≈ 3/5** — *nguyên mẫu nghiêm túc, tích hợp chạy được, chưa validate trên phần cứng/điều kiện thật.* Theo TRL: **~4–5** (tích hợp trong "lab", chưa demo vận hành ở môi trường thật).

## 21.1 Mức trưởng thành theo lớp
| Lớp | Mức | Đánh giá |
|---|---|---|
| **Kiến trúc hệ thống** | Khá — **4/5** | On-device/offline · 1 máy · pipeline graph (ASR→MT→phụ đề/TTS) streaming WebSocket. Đúng bài cho phiên dịch realtime tự-host. |
| **Công cụ vận hành (FE)** | Khá–Tốt — **4/5** | Điểm mạnh THẬT: bàn điều khiển, go/no-go, reconnect, cut-to-safe, Trust HUD latency, hold-to-confirm. Tư duy tầm Wordly/Interprefy mảng vận hành. |
| **Lõi AI (mô hình)** | Nguyên mẫu chưa đo — **2–3/5** | Model nhỏ, hạng trung, on-device (§21.3). Không phải hạng SOTA; cặp VI⇄JA vốn khó. |
| **Lớp "thông minh"** (matcher/memory) | Trên giấy — **1–2/5** | Cascade Matcher / tái dùng bản duyệt / học liên tục (doc 14) **chưa có API backend** — mới là thiết kế. |
| **Kiểm chứng thực tế** | **CHƯA — 0–1/5** ⚠️ | **Backend CHƯA từng chạy trên Mac Studio.** Không có **một con số thật** nào về độ chính xác/độ trễ/độ bền. Ngưỡng 900/1800/2500ms mới là mục tiêu. |

## 21.2 Ba sự thật cốt lõi
1. **KHÔNG phải "phiên dịch đồng thời" đúng nghĩa** — mà là **phụ đề song ngữ có độ trễ + TTS**. Phiên dịch đồng thời (người) chồng lời gần tức thì; đây trễ theo pipeline.
2. **Đẳng cấp AI thật HIỆN CHƯA BIẾT** — vì chưa chạy phần cứng thật. Có thể "đủ tốt cho kịch bản duyệt", cũng có thể lộ vấn đề. **Chỉ Bước 0 mới trả lời.**
3. **So sân chơi:** Wordly/Interprefy/DeepL Voice dùng model đám mây khổng lồ + nhiều năm tinh chỉnh. PROYAKU ở **hạng khác — tự-host, model nhỏ, cho một sự kiện**: đánh đổi độ chính xác để lấy **offline / riêng tư / kiểm soát độ trễ / không phí theo lượt**.

## 21.3 Lõi AI — đánh giá model stack thật (từ API.md §8)
| Vai | Model | Đánh giá thẳng |
|---|---|---|
| ASR | **Qwen3-ASR-1.7B** | Nhỏ, đa ngữ. Kém Whisper-large-v3 / ASR đám mây. Rủi ro: giọng vùng miền, nói nhanh, **tên riêng** → phải dựa hotword/glossary. |
| MT | **NLLB-600M / 1.3B** | NLLB-200 mở, phủ VI+JA. 600M là bản **distilled yếu**; VI⇄JA chất lượng **khá-không-xuất-sắc** (JA đảo trật tự, cuối-mệnh-đề; **kính ngữ khó**). Kém DeepL/GPT-4. Post-correct + glossary đỡ phần nào. |
| LLM sidecar | **Qwen2.5-1.5B-Instruct** | Nhỏ, cho ngữ cảnh/dự đoán. Khiêm tốn. *(Điểm chạm CUDA duy nhất — trên Mac là Metal, xem [17](17-buoc-0-chay-backend-mac.md).)* |
| TTS | **VoiceVox (JA) · vieneu (VI) · gpt-sovits** | Ổn cho mục đích. VoiceVox cần server :50021. |
| Nền tảng | **Mac Studio M3 Ultra 96GB · Metal/MPS** | Đủ RAM. Hiệu năng Metal **CHƯA đo**. Cảnh báo: **NLLB qua CTranslate2 = CPU-only trên Mac** → có thể là **nút thắt độ trễ**. |

**Độ trễ:** pipeline cộng dồn ASR + MT (+ TTS). Câu hỏi sống-còn: *model nhỏ trên Metal có đạt 900/1800/2500ms không?* — **chưa đo.**

## 21.4 Chấm theo ĐÚNG mục tiêu
- Mục tiêu **"thay thế phiên dịch viên người, tự động hoàn toàn"** → còn **xa (≈2/5)**.
- Mục tiêu **"lớp phụ đề song ngữ hỗ trợ lễ 20 năm — phụ-đề-là-chính, có phiên dịch người đứng cạnh, chạy kịch bản đã duyệt"** (đúng khuyến nghị [audit 15](15-audit-lo-hong-va-cai-tien.md)) → **mức hiện tại PHÙ HỢP & khả thi**, miễn Bước 0 xác nhận model chạy ổn.

## 21.5 Điều gì NÂNG mức kỹ thuật (theo thứ tự đòn bẩy)
1. **[Bước 0](17-buoc-0-chay-backend-mac.md) — chạy + ĐO thật trên Mac** *(số 1 — biến "chưa biết" thành "có số")*. Cửa mở khoá mọi đánh giá thật.
2. Nếu số đo kém → **nâng model** (whisper-large cho ASR; NLLB-1.3B hoặc model dịch mạnh hơn; hoặc chấp nhận CPU chậm) — quyết định dựa số thật.
3. Build **lớp thông minh** (matcher/memory) — cần backend thêm endpoint (xem [20 Mission Control §20.2](20-mission-control.md)).
4. Hoàn thiện **UX** (khung điều hướng + lễ nghi — [19](19-ia-dieu-huong-mot-truc.md)).

## 21.6 Tóm tắt cho quyết định
> Về kỹ thuật, PROYAKU là **nguyên mẫu được kiến-trúc-tốt + công-cụ-vận-hành mạnh, nhưng lõi AI dịch nhỏ & CHƯA kiểm chứng.** "Mức độ" thật **đang khoá sau Bước 0**. **Chạy backend trên Mac + đo** là việc quyết định nhất để biết nó thực sự ở đâu — và để chốt có cần nâng model trước 8/8 hay không.

Liên quan: [15 audit](15-audit-lo-hong-va-cai-tien.md) · [17 Bước 0](17-buoc-0-chay-backend-mac.md) · [20 Mission Control](20-mission-control.md) · [00 trạng thái](00-dong-bo-hien-trang.md).
