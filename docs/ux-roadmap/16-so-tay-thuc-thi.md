# 16 — SỔ TAY THỰC THI · Bước 0 → Hoàn thiện (BẮT ĐẦU TỪ ĐÂY)

[← Về README](README.md) · Nền tảng: [09 Lộ trình](09-lo-trinh-nang-cap.md) · [15 Audit](15-audit-lo-hong-va-cai-tien.md) · [14 Kiến trúc](14-proyaku-pre-in-post-event.md)

> Đây là **tài liệu điều phối duy nhất** — một chuỗi tuyến tính **Bước 0 → hoàn thiện**, gắn kết mọi tài liệu khác. Nó **thay thế thứ tự cũ** ở [09](09-lo-trinh-nang-cap.md) (đã được [15](15-audit-lo-hong-va-cai-tien.md) định lại sau audit). Mỗi bước ghi rõ: **việc · file chạm · Định-nghĩa-Hoàn-thành (DoD) · phụ thuộc · người làm**.
>
> **Nói thẳng:** không thể "hoàn thiện" chỉ bằng code. Rất nhiều bước phụ thuộc **quyết định của Thầy** và **kết quả test backend trên Mac thật**. Sổ tay này làm cho *thứ tự* và *cửa quyết định* rõ ràng, để không ai lao vào phần sai lúc.

**Ký hiệu người làm:** 🧑‍💻 Dev (frontend) · ⚙️ Ops/Infra · 🗣️ Chủ backend (HanDichThuat) · 👤 Thầy quyết định · 🎤 AV/Thông dịch viên.
**Ký hiệu trạng thái:** ✅ xong · 🔧 đang/ưu tiên · ⛔ đang chặn · ⬜ chưa.

---

## 0. Bản đồ tổng thể (2 đường ray)

```
        ┌──────────────────── BƯỚC 0: NỀN TẢNG (BLOCKING) ────────────────────┐
        │  Không xây tính năng nào cho tới khi qua các cửa này.                │
        │  0.1 Môi trường dev · 0.2 CHẠY BACKEND TRÊN MAC + ĐO · 0.3 Handshake │
        │  0.4 on_script semantics · 0.5 Quyết định vận hành (người/máy/mic)   │
        └───────────────┬─────────────────────────────────────┬───────────────┘
                        │ (qua cửa)                            │
          ┌─────────────▼──────────────┐        ┌──────────────▼──────────────┐
          │  TRACK A — GALA 8/8         │        │  TRACK B — SẢN PHẨM DÀI HẠN │
          │  (3 tuần · tối thiểu ·      │  sau   │  (sau lễ · đầy đủ Pre/In/Post│
          │   phụ đề-only · người+máy   │ ─────▶ │   · Cascade Matcher cứng ·   │
          │   dự phòng)  → GO/NO-GO     │  lễ    │   design system · học liên tục)│
          └────────────────────────────┘        └──────────────────────────────┘
```

> **Nguyên tắc chất lượng xuyên suốt (từ audit):** *Tin cậy trước → Đọc-được → Chuẩn bị nội dung → Diễn tập.* **Gala nên phụ đề-only + có thông dịch viên người + máy dự phòng.** Đừng để vẻ đẹp tài liệu che mất việc chưa ai chạy thử trên máy thật.

---

## 🟥 BƯỚC 0 — NỀN TẢNG (BLOCKING — làm trước mọi thứ)

> Đây là **cửa go/no-go của cả dự án**. Nếu bước 0 chưa qua, mọi việc khác là xây trên cát ([15 §15.0](15-audit-lo-hong-va-cai-tien.md)).

| # | Việc | File / Nơi | DoD (đạt khi) | Người |
|---|------|-----------|---------------|:---:|
| 0.1 | **Dựng môi trường dev**: `npm install`, `npm run dev`, hiểu proxy `/api` | `package.json`, `vite.config.ts` | App chạy dev, badge OFFLINE hiển thị đúng khi chưa có backend | 🧑‍💻 |
| 0.2 | **CHẠY BACKEND HanDichThuat TRÊN CHÍNH MAC STUDIO M3 Ultra, offline** — cài, chạy **từng role** (ASR/MT/LLM sidecar/TTS/embedding). Giải quyết mâu thuẫn **CUDA→Metal** (API.md §8) | Repo backend (ngoài repo này) | **Mỗi role khởi động được trên Metal/CPU**; ghi rõ role nào chạy GPU vs CPU | 🗣️⚙️ |
| 0.2b | **ĐO** trên Mac: cold-warm time toàn bộ; **p50/p95** partial/final/spoken dưới **tải đồng thời** (clip song ngữ 10–15', TTS ON, LLM ON); **soak ≥3h** đo nhiệt | — | Có **bảng số thật** (không phải 900/1800/2500ms lý thuyết); nhiệt không throttle trong 3h | ⚙️ |
| 0.3 | **Handshake test `LiveConfig` thật**: START, chốt `targets` **map vs array**, `hotwords/beam_size` có nhận, **cả 2 chiều ra `line`**, `ready` đến | `AudioRouting.tsx` (config), `api.ts` | Log lại config backend **chấp nhận**; smoke-test vào Green Room | 🧑‍💻🗣️ |
| 0.4 | **Xác minh `on_script`/`script_lock`**: điểm cao có khiến backend **phát bản-đã-duyệt** (Tier-0) không, hay chỉ badge live-MT? | Hỏi 🗣️ | Có câu trả lời rõ → **quyết định Cascade Matcher chạy ở đâu** ([15 D1/D2](15-audit-lo-hong-va-cai-tien.md)) | 🗣️👤 |
| 0.5 | **Quyết định vận hành** (từ [phiếu 13](13-phieu-boi-canh-du-an.md) + audit): **(a) có thông dịch viên người?** **(b) có máy dự phòng #2 + UPS?** **(c) sơ đồ mic** (1 feed/diễn giả?)? **(d) mạng cách ly?** **(e) 3 lớp LED do máy nào driver?** | — | Cả 5 câu có đáp án bằng văn bản | 👤🎤 |

> **CỬA QUYẾT ĐỊNH sau 0.2:** nếu backend **không chạy được/quá chậm trên Mac** → chọn: (i) đổi engine sang bản Metal (whisper.cpp thay CTranslate2, GGUF-Metal…), (ii) dùng model nhỏ hơn, (iii) đổi máy/kiến trúc. **Không đi tiếp Track A cho tới khi có đường chạy được đo được.**

---

## 🅰️ TRACK A — ĐƯỜNG GALA 8/8 (ưu tiên tuyệt đối · phụ đề-only)

> Mục tiêu: **chạy live không sự cố công khai**, phụ đề đọc-được, nội dung chính xác, có lưới an toàn (người + máy dự phòng). **Bỏ mọi thứ không phục vụ mục tiêu này** (freeze scope — [15 §15.4](15-audit-lo-hong-va-cai-tien.md)).

### A1 · An toàn sân khấu (làm trước — nhiều phần đã xong)
| # | Việc | File | DoD | TT |
|---|------|------|-----|:--:|
| A1.1 | STOP/EMERGENCY **không chiếu demo giả** → slate STANDBY | `LiveSessionContext.tsx`, `BilingualStream.tsx` | STOP giữa phiên → hiện "CHỜ TÍN HIỆU", không diễn văn giả | ✅ |
| A1.2 | Reconnect **không kẹt vòng lặp 1s** (backend accept-rồi-drop) | `LiveSessionContext.tsx` | Drop lặp → backoff tăng → tới FAULT đúng cách | ✅ |
| A1.3 | Giữ cờ `corrected` | `LiveSessionContext.tsx` | Badge "đã sửa" không bị mất | ✅ |
| A1.4 | **Nút CUT-TO-SAFE** độc lập pipeline (FREEZE dòng-cuối / SLATE) — phím L/G/B + nút thanh điều khiển, broadcast mọi màn | `LiveSessionContext.tsx`, `BilingualStream.tsx` | 1 nút/phím đưa màn về an toàn tức thì | ✅ |
| A1.5 | **Session bus 3 màn** (BroadcastChannel) — pop-out `?display=1` **mirror phiên live**, không còn chiếu demo | `LiveSessionContext.tsx`, `BilingualStream.tsx` | ✅ đã verify màn cạnh hiện STANDBY, không demo. **Lưu ý: cùng trình duyệt/máy**; đa-máy cần feed backend | ✅ (cùng máy) |
| A1.6 | **Production proxy**: `vite preview` nay proxy `/api` same-origin | `vite.config.ts` (`preview.proxy`) | Bản build chạy `npm run preview` kết nối được backend cùng máy | ✅ |
| A1.7 | **Namespace `lid` theo epoch** khi reconnect (`${epoch}:${lid}`) | `LiveSessionContext.tsx` | Lịch sử "đóng băng" không bị ghi đè bởi lid trùng | ✅ |

→ Chi tiết: [04](04-man-hinh-phu-de.md), [05](05-ban-dieu-khien.md), [08](08-san-pham-va-do-tin-cay.md), [15 §15.1 F/§15.5](15-audit-lo-hong-va-cai-tien.md).

### A2 · Đọc-được từ xa (broadcast-grade phụ đề)
| # | Việc | File | DoD |
|---|------|------|-----|
| A2.1 | **Cỡ chữ fluid** (`clamp()/cqw`) + **phím zoom** vận hành | `BilingualStream.tsx`, `index.css` | Trên 4K, dòng mới ~6–9% chiều cao màn; đọc từ hàng cuối phòng thật |
| A2.2 | **Tương phản dòng mới ≥7:1** (bỏ mauve), dòng cũ ≥4.5:1, bỏ blur | `BilingualStream.tsx`, `index.css` | Đo bằng công cụ tương phản ở từng "tuổi" dòng |
| A2.3 | **Ép dark mặc định** cho `/stream`; **bỏ Times → sans đậm** | `MainLayout.tsx`, `BilingualStream.tsx` | Sân khấu dark, VN sans đọc-được |
| A2.4 | **`lang="vi/ja"` + kinsoku + reduced-motion + trạng thái chờ** | `index.html`, `BilingualStream.tsx`, `index.css` | Screen reader/kinsoku đúng; Reduce Motion tôn trọng; có placeholder chờ |
| A2.5 | **3 màn: mỗi cạnh 1 ngôn ngữ** (VI trái / JA phải), fill toàn màn | `BilingualStream.tsx` | Mỗi màn cạnh full 1 ngôn ngữ, đồng bộ live (dựa A1.5) |

→ Chi tiết: [04](04-man-hinh-phu-de.md), [06](06-typography-i18n.md), [07](07-accessibility.md), [11 KIM SẮC](11-ngon-ngu-thiet-ke.md).

### A3 · Bàn điều khiển & niềm tin vận hành
| # | Việc | File | DoD |
|---|------|------|-----|
| A3.1 | ✅ **Đấu nối event đang bị bỏ** (`timing/on_script/name_fix/speech_lang/context/speaking`) vào state | `LiveSessionContext.tsx` (`handleEvent`) | ✅ Không còn `default: break` nuốt tín hiệu |
| A3.2 | ✅ **Master Annunciator** (một trạng thái chủ đạo, đổi màu) | `AudioRouting.tsx` | ✅ OFFLINE/STANDBY/CONNECTING/WARMING/READY/LIVE/DEGRADED/RECONNECTING/FAULT |
| A3.3 | 🔧 **Trust HUD tối thiểu** (SCRIPT-MATCH%, name_fix, độ trễ, hướng, TTS, ngữ cảnh) | `AudioRouting.tsx` | ✅ Bản đầu đã có (hiện khi active); còn: sparkline độ trễ, ngưỡng màu, gợi ý Fast Mode |
| A3.4 | ✅ **NO-SIGNAL alarm** (>2s) + **STOP hold-to-confirm** (EMERGENCY một-chạm riêng) + disable ngõ ra khi active | `AudioRouting.tsx` | ✅ Mic mất tín hiệu → báo; STOP không bấm nhầm. Còn: peak-hold/clip VU |
| A3.5 | ✅ **Pre-flight checklist** chặn START (backend · mic · ASR · MT · ngõ VI/JA · VI≠JA) + override | `AudioRouting.tsx` | ✅ START chỉ bật khi pass. Còn: mục "mic có tín hiệu thật" + test-tone-đã-bấm + model-warm |

→ Chi tiết: [05](05-ban-dieu-khien.md), [12.2/12.5/12.6/12.7](12-thu-vien-mau-giao-dien.md).

### A4 · Chuẩn bị nội dung (đây mới là TRẦN chất lượng dịch)
| # | Việc | File | DoD |
|---|------|------|-----|
| A4.1 | **Glossary & Names editor** + **khoá tên riêng** (Lê Long Sơn, Kaizen Yoshida School, Esuhai, keigo 御社…) | mới: `GlossaryEditor` + `/api/file` | Sửa/khoá/lưu term; verify tên hiển thị đúng trước lễ |
| A4.2 | **Nạp kịch bản + biên dịch trước từng dòng + duyệt tay** | mới: dùng `/api/file`, `/api/run` | Kịch bản khoá, bản dịch chuẩn đã duyệt sẵn |
| A4.3 | **Ghim cứng con số 20 (周年)** + gate số/tên theo độ tin cậy ASR | logic | Không tin ASR cho con số cốt lõi |
| A4.4 | *(Đã có)* **Voice Studio** — chọn giọng + Pronunciation Clinic | `VoiceStudio.tsx` | ✅ dùng cho phòng họp; **gala: thu sẵn kính ngữ bằng giọng người** |

→ Chi tiết: [12.8](12-thu-vien-mau-giao-dien.md), [14 §14.2](14-proyaku-pre-in-post-event.md), [15 §15.5](15-audit-lo-hong-va-cai-tien.md).

### A5 · Diễn tập & Lưới an toàn (KHÔNG bỏ qua)
| # | Việc | DoD | Người |
|---|------|-----|:---:|
| A5.1 | **Green Room** chạy thử trên **bản ghi diễn văn thật**; tinh **ASR/VAD/endpoint với mic sân khấu thật** | Có glossary cố định + số đo latency thật tại chỗ | 🧑‍💻⚙️🎤 |
| A5.2 | **Máy dự phòng #2** (Mac giống hệt, warm sẵn) + **công tắc A/B trên feed LED** + **tập cutover** | Cắt sang máy 2 trong <X giây, đã tập | ⚙️🎤 |
| A5.3 | **Thông dịch viên người** primary/standby cho **Q&A/toast ngoài kịch bản** | Có hợp đồng + tập phối hợp | 👤🎤 |
| A5.4 | **Mạng cách ly (VLAN/SSID) + reverse-proxy có auth**; bỏ `0.0.0.0`, không cloud | `:8080` không với tới từ WiFi khách | ⚙️ |

→ Chi tiết: [15 §15.3](15-audit-lo-hong-va-cai-tien.md).

### A6 · GO / NO-GO (trước giờ mở cửa)
Dùng checklist [09 §9.5](09-lo-trinh-nang-cap.md) + [15](15-audit-lo-hong-va-cai-tien.md): rớt backend không hiện demo · pop-out đúng live · đọc-được hàng cuối · STOP an toàn · glossary/tên đúng · VI≠JA test tone · Green Room đã chạy · **máy dự phòng + người phiên dịch sẵn sàng**.

---

## 📅 Lịch theo tuần tới 8/8 (từ 18/7 · ~3 tuần)

| Tuần | Trọng tâm | Kết quả cửa |
|------|-----------|-------------|
| **Tuần 1 (18–24/7)** | **BƯỚC 0** (đặc biệt 0.2 chạy+đo backend trên Mac) · Quyết định vận hành (0.5) · An toàn sân khấu A1 · Khởi động glossary/script (A4.1–A4.2) | ✅ Backend chạy+đo được trên Mac · Chốt người/máy/mic |
| **Tuần 2 (25–31/7)** | Đọc-được A2 · Trust HUD/annunciator/pre-flight A3 · Hoàn tất Prep nội dung A4 · Dựng máy dự phòng | ✅ Phụ đề broadcast-grade · Console tin cậy · Nội dung khoá |
| **Tuần 3 (1–7/8)** | **Green Room với mic thật + máy dự phòng + người phiên dịch** (A5) · tinh chỉnh · **GO/NO-GO** | ✅ Diễn tập đạt · Go |
| **7–8/8** | 🎊 **Lễ** — phụ đề máy + đọc/ứng biến người, có failover | — |

> Nếu Tuần 1 cửa 0.2 **fail** → dồn Tuần 1–2 vào giải quyết backend/máy; **thu hẹp gala về phụ đề tối giản** hoặc tăng vai trò thông dịch viên người. Trung thực: **thà một phụ đề chắc + người dịch giỏi, còn hơn một hệ thống hoa mỹ chưa chạy thử.**

---

## 🅱️ TRACK B — ĐƯỜNG SẢN PHẨM DÀI HẠN (sau 8/8)

Làm sau khi lễ xong, theo thứ tự đòn bẩy:

1. **Cascade Matcher CỨNG** (nếu 0.4 xác nhận backend hỗ trợ): cổng slot+negation **trước** reuse · không hạ ngưỡng khi trễ · gate ASR-confidence · lane hướng tường minh cho code-switch → [14 §14.3](14-proyaku-pre-in-post-event.md), [15 §15.5](15-audit-lo-hong-va-cai-tien.md).
2. **Đầy đủ Pre/In/Post** (admin workspace, ingestion, learning loop) → [14](14-proyaku-pre-in-post-event.md).
3. **Trích lớp UI primitive + KIM SẮC** (Button/Card/Select/StatusDot…) → [03](03-he-thong-thiet-ke.md), [12](12-thu-vien-mau-giao-dien.md).
4. **TTS ceremonial** (giọng chuẩn, prosody) + **accessibility đầy đủ** (WCAG) → [07](07-accessibility.md).
5. **QR khách + đa màn hình mở rộng · tối ưu on-device sâu** (embeddings, versioned KB) → [14 §14.6](14-proyaku-pre-in-post-event.md).
6. **Self-host font** (offline giống hệt) → [06](06-typography-i18n.md).
7. **Đo lường & CI** (axe, Lighthouse, tương phản token, E2E sự cố) → [10](10-do-luong-kiem-thu.md).

---

## 🌳 Cây quyết định (các ẩn số chịu tải)

```
Q0.2  Backend chạy được trên Mac + đạt latency?  ── KHÔNG ─▶ đổi engine Metal / model nhỏ / đổi máy  ── vẫn không ─▶ GALA PHỤ ĐỀ TỐI GIẢN + người dịch
   │ CÓ
Q0.4  on_script phát bản-đã-duyệt (Tier-0)?  ── KHÔNG ─▶ Cascade Matcher = build mới (Track B), gala KHÔNG dựa Tier-0
   │ CÓ
Q0.5a Có thông dịch viên người?  ── KHÔNG ─▶ ⚠️ Rủi ro rất cao; khuyến nghị mạnh: THUÊ, hoặc thu hẹp phạm vi live
Q0.5b Có máy dự phòng #2?  ── KHÔNG ─▶ ⚠️ Một điểm chết; tối thiểu: kịch bản cutover thủ công đã tập
Q0.5c 3 màn do NHIỀU máy driver?  ── CÓ ─▶ BroadcastChannel KHÔNG đủ → cần feed từ backend (mỗi màn subscribe read-only)
```

---

## Cách dùng sổ tay này
1. **Bắt đầu ở BƯỚC 0** — không bỏ qua, không xây tính năng trước.
2. Mỗi việc: mở tài liệu chi tiết được link để lấy **đặc tả + tiêu chí đầy đủ**.
3. Đánh dấu trạng thái (✅/🔧/⬜) ngay trong bảng để theo dõi.
4. Gặp ẩn số → tra **cây quyết định** trước khi code.
5. Trước lễ: chạy **A6 GO/NO-GO**.

> Tài liệu [09](09-lo-trinh-nang-cap.md) vẫn hữu ích cho *chi tiết từng hạng mục*, nhưng **thứ tự thực thi lấy theo sổ tay 16 này** (đã hoà giải với audit 15).

[← Về README](README.md)
