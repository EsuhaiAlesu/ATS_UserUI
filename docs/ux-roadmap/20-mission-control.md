# 20 — Mission Control (`/control`): điều khiển + đo lường (đề xuất)

> **Trạng thái 2026-07-19: ĐỀ XUẤT. Phần ĐIỀU KHIỂN phần lớn dựng được ngay; phần ĐO LƯỜNG phần lớn CHỜ backend phát số liệu (Bước 0 + endpoint mới).** Không có backend chạy trên Mac + phát metrics thì dashboard chỉ là **vỏ**. Xem trạng thái sống ở [00](00-dong-bo-hien-trang.md).

## 20.0 Mục tiêu (theo yêu cầu Sếp/anh Hiên)
MỘT trang **`/control`** trong chính app PROYAKU (KHÔNG tạo app thứ 2) để điều khiển + đo toàn bộ Agent bằng **nút bấm/biểu đồ**, không cần mở code. Nó là mặt **"Vận hành"** trong IA mới ([19](19-ia-dieu-huong-mot-truc.md)) — gộp *bàn điều khiển + Trust HUD + cut-to-safe + tóm tắt go/no-go* thành một trang điều-khiển-và-đo.

**3 điều kiện làm đúng:** (1) 1 trang trong PROYAKU, không app thứ 2; (2) backend chạy trên Mac + phát metrics TRƯỚC ([Bước 0, file 17](17-buoc-0-chay-backend-mac.md)); (3) chốt 1 người push. **Ưu tiên phục vụ GO/NO-GO gala trước.**

## 20.1 Bản đồ thật — LÀM ĐƯỢC NGAY vs CẦN BACKEND

### A. Điều khiển
| Mục | Endpoint / thực tế | Trạng thái |
|---|---|---|
| Chọn model + warm/switch | `GET /api/blocks` · `POST /api/models/switch` · `POST /api/warm` | ✅ có |
| Bật/tắt **LLM sidecar** | `GET /api/llm/status` · `POST /api/llm/start\|stop` | ✅ có |
| Tham số: hotword · chiều VI/JA · TTS on/off | Trường trong `LiveConfig` gửi lúc mở `WS /api/ws/live` | ✅ có (đặt lúc START; đổi giữa-phiên = cần backend) |
| Nạp & khoá glossary + kịch bản | `GET/POST /api/file` (đã dựng ở /glossary, /script) | ✅ có |
| **CUT-TO-SAFE** (freeze/slate) | `session.audienceCut` + BroadcastChannel (đã build) | ✅ có |
| Bật/tắt/**restart riêng ASR · MT · TTS** | — | ❌ **cần endpoint mới** (chỉ có start/stop cả pipeline + LLM) |
| Đổi **máy dự phòng** | Thao tác phần cứng (công tắc A/B), không phải API | ❌ app chỉ hiện trạng thái + ký tay |

### B. Đo lường
| Mục | Nguồn | Trạng thái |
|---|---|---|
| p50/p95 độ trễ (nói→phụ đề→đọc) | Gộp client-side từ event `timing` (stt/proc/mt/e2e) của `WS /api/ws/live` | ◑ **gộp được lúc chạy phiên** (lưu lịch sử = cần backend) |
| Khớp kịch bản % · độ tự tin ASR · số lần tự sửa | `on_script.score` · `speech_lang.prob` · `name_fix` (qua WS live) | ◑ **có qua WS** |
| Số reconnect · uptime phiên | `LiveSessionContext` tự đếm | ◑ **frontend tự tính** |
| **GPU / nhiệt / hàng đợi Mac** | — | ❌ **cần endpoint mới** |
| **Biểu đồ soak 3 tiếng** · cảnh báo **vọng âm** | — | ❌ **cần backend phát metrics theo thời gian** |

## 20.2 Hợp đồng 3 endpoint backend cần thêm (cho anh Hiên/HoangKha)
Để dashboard **có số thật**, backend cần bổ sung (đặt cạnh các endpoint đã có trong [API.md](../API.md)):

```
1) WS /api/ws/metrics   (hoặc GET /api/metrics poll ~1s)
   → phát định kỳ: { gpu_util, gpu_mem_gb, temp_c, queue_depth, rss_gb, uptime_s, ts }
   (macOS: powermetrics / ioreg cho GPU & nhiệt; queue_depth từ pipeline)

2) POST /api/component/{asr|mt|tts}/{start|stop|restart}
   → bật/tắt/khởi động lại TỪNG phần (mở rộng mẫu /api/llm/* đã có sang ASR/MT/TTS)
   → trả { ok, component, state, error? }

3) (tuỳ chọn) GET /api/session/stats
   → { p50_ms, p95_ms, reconnects, soak: [{ts, e2e_ms, gpu_util, temp_c}], uptime_s }
   → chỉ cần nếu muốn số BỀN qua reload; nếu không, frontend tự gộp lúc chạy.
```

## 20.3 Cách làm (ưu tiên GO/NO-GO gala)
| Giai đoạn | Làm gì | Điều kiện |
|---|---|---|
| **Ngay được** | Dựng `/control`: khung điều khiển (model/warm/LLM/glossary/kịch bản/**CUT-TO-SAFE**) + đo **realtime từ WS live** (p50/p95, khớp kịch bản, độ tự tin, reconnect). Chừa sẵn "ô chờ" cho metrics phần cứng. | Chỉ cần backend chạy phiên (Bước 0) |
| **Sau khi có endpoint mới** | Cắm GPU/nhiệt/queue + soak 3h + restart-từng-phần vào ô đã chừa. | Chờ anh Hiên thêm 3 endpoint §20.2 |

→ Dựng **khung + phần chạy-được-ngay trước**, khi backend phát số là **cắm vào là chạy**, không làm lại.

## 20.4 Nguyên tắc & ranh giới
- **Không app thứ 2** — chỉ 1 trang `/control` trong PROYAKU.
- **Không giấu an toàn** — EMERGENCY STOP / CUT-TO-SAFE / trạng thái luôn hiện (theo [19 §19.5](19-ia-dieu-huong-mot-truc.md)).
- **Trung thực khi thiếu số** — ô nào chưa có backend thì hiện "chưa đo được / cần backend", KHÔNG hiện số giả.
- **Governance:** 1 người push; luôn fetch trước khi push; không force-push (xem [00](00-dong-bo-hien-trang.md)).

Liên quan: [16 sổ tay thực thi](16-so-tay-thuc-thi.md) · [17 Bước 0](17-buoc-0-chay-backend-mac.md) · [19 IA một trục](19-ia-dieu-huong-mot-truc.md).
