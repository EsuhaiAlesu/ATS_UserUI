# 15 — Audit trung thực: Lỗ hổng, rủi ro & cải tiến (bản "chính trực")

[← 14 Kiến trúc Pre/In/Post](14-proyaku-pre-in-post-event.md) · [Về README](README.md)

> Thầy yêu cầu rà lại **trung thực và chính trực**, bằng con mắt chuyên gia AI cấp cao + kỹ sư phần cứng + kiến trúc giải pháp + người hiểu nghề **thông dịch cabin**. Đây là kết quả — **không tô hồng**.
>
> **Cách làm:** hội đồng **7 chuyên gia red-team** (AI/ML · phần cứng Apple Silicon · thông dịch đồng thời · độ tin cậy sự kiện · bảo mật · kinh tế · code) săn lỗ hổng độc lập; **50 phát hiện critical/high được kiểm chứng đối kháng**. Kết quả: **49/49 lỗ hổng critical/high còn đứng vững — 0 cái bị bác.** Đó là một kết quả nặng, và trung thực mà nói: **thiết kế thông minh nhưng có lỗ hổng thật sự nghiêm trọng** nếu đưa ra sân khấu 8/8 như hiện tại.

---

## 15.0. Bảy sự thật khó nghe nhất (đọc trước tiên)

1. 🔴 **Chưa ai từng chạy backend trên Mac Studio — hoặc trên bất kỳ máy Mac nào.** `docs/API.md §8` ghi rõ LLM sidecar dùng **"CUDA context"** (CUDA = NVIDIA, **không tồn tại trên Apple Silicon**); `INTEGRATION.md` thừa nhận backend **mới chỉ đọc source, chưa từng chạy**. Toàn bộ kiến trúc đang đứng trên một giả định **chưa kiểm chứng**. → **Đây là việc phải làm đầu tiên, tuần này.**
2. 🔴 **Một máy = một điểm chết, không có lưới an toàn nào.** Mac Studio treo/OOM/quá nhiệt/mất điện giữa lễ → **sập toàn bộ**, không máy dự phòng, không cut-to-safe. Reconnect chỉ chữa *chớp mạng*, **không** chữa *crash máy* (và reconnect còn kích hoạt **warm lại toàn bộ model ~20–40s** — cold start trên sân khấu).
3. 🔴 **Đây KHÔNG phải "phiên dịch đồng thời" (simultaneous).** Pipeline chốt-theo-clause là **phụ đề trễ + TTS**, cấu trúc *consecutive*, không overlap/đón đầu như cabin. **Đừng gọi/quảng bá là "simultaneous interpreter"**, và với sự kiện trọng đại **nên có thông dịch viên người làm primary/standby** cho phần ứng biến — không chuyên gia nào ký duyệt AI-only, một máy, một lần, trước hàng trăm khách.
4. 🔴 **Fast-path chỉ giúp phần kịch bản — đúng chỗ dịch DỄ; và bỏ mặc đúng chỗ dịch KHÓ** (Q&A, lời chúc ngẫu hứng, cảm xúc, hài, chồng tiếng) — nơi quyết định "giỏi hay không" của một thông dịch viên.
5. 🔴 **Lỗ hổng thuật toán nguy hiểm nhất: tái dùng bản dịch chuẩn khi người nói ĐỔI Ý giữa câu.** Tiếng Nhật mang nghĩa ở **cuối câu** (phủ định/thì/kính ngữ) — nơi độ-tương-tự *mù nhất*. "達成しました" (đạt được) vs "達成できませんでした" (KHÔNG đạt) → điểm gần như y hệt → **tái dùng nghĩa ngược** lên màn LED. Tệ hơn: nhánh `on_script≥0.90` **bỏ qua cả cổng bảo vệ số/tên** (§14.3 dừng ở bước 4 trước bước 10–11).
6. 🔴 **Phần lớn "sức mạnh backend" mà tài liệu 14 dựa vào KHÔNG có trong hợp đồng API.** `on_script` chỉ là **{lid, score}** (badge), **không** đảm bảo phát ra bản dịch-đã-duyệt; runtime chỉ có **một** công tắc boolean `/api/live/fast`. Cascade Matcher / Tier-0 reuse / Router / Governor / Budget **không có API để đứng**. → Phải xác minh với tác giả backend TRƯỚC khi hứa với khách.
7. 🔴 **Bảo mật đang là "may mắn", không phải "kiểm soát".** Backend **không auth**, frontend `serve` bind **`0.0.0.0`** và đã từng deploy **Railway (cloud)**; `/api/file` **ghi được không cần auth** → kẻ trên mạng có thể **viết lại một dòng kịch bản** rồi nó hiện lên LED wall gắn badge "SCRIPTED". Confidential brief (kịch bản chưa công bố) nằm sau endpoint ghi-được-không-khoá.

---

## 15.1. Lỗ hổng CRITICAL đã xác nhận (nhóm theo chủ đề)

### A. Nền tảng chưa kiểm chứng — rủi ro số 1
| # | Lỗ hổng | Mức |
|---|---------|:---:|
| A1 | Backend **chưa từng chạy trên Mac Studio**; API.md ghi **CUDA** (NVIDIA-only) → có thể **không chạy** trên Apple Silicon | 🔴 confirmed |
| A2 | **Chưa test end-to-end** với backend thật; `LiveConfig.targets` gửi dạng **map** nhưng API.md ghi **array** → START xong có thể **WARMING mãi mãi** | 🔴 confirmed |
| A3 | **Bản production không có `/api` proxy** — proxy chỉ có ở `vite dev`; app đã build **không kết nối được backend** trừ khi set `VITE_API_BASE` + CORS | 🔴 confirmed |
| A4 | Từng khung Metal khác nhau: whisper-large-v2 (CTranslate2) **có thể chạy CPU-only trên Mac** → fallback ASR chậm gấp nhiều lần | 🟠 likely |
| A5 | 96GB **không phải** ràng buộc; ràng buộc thật là **băng thông bộ nhớ + 1 hàng đợi GPU** khi ASR+MT+LLM+TTS chạy đồng thời — chưa đo | 🟠 confirmed |

### B. Điểm chết duy nhất & thiếu lưới an toàn
| # | Lỗ hổng | Mức |
|---|---------|:---:|
| B1 | **1 Mac Studio chạy tất cả, không failover** cho sự kiện một-lần công khai | 🔴 confirmed |
| B2 | **Không có thông dịch viên người** làm lưới an toàn cho AI-only | 🔴 confirmed |
| B3 | Reconnect = **warm lại model ~20–40s** (cold start trên sân khấu), không phải "vài giây" | 🟠 confirmed |
| B4 | **Không có nút cut-to-safe** độc lập pipeline (broadcast luôn phải có "take-to-black" 1 nút) | 🟠 confirmed |
| B5 | **Không backup off-machine** cho "gói tri thức" (80% chất lượng nằm trên 1 SSD) | 🟠 confirmed |
| B6 | Single-resident-model rule **mâu thuẫn** router đa-bậc (không thể vừa free-on-switch vừa giữ fast+main nóng) | 🟠 confirmed |

### C. Lỗi thuật toán (chất lượng dịch)
| # | Lỗ hổng | Mức |
|---|---------|:---:|
| C1 | `on_script` fast-path **bỏ qua cổng bảo vệ số/tên** (bước 4 dừng trước bước 10–11) → nhánh dùng nhiều nhất **ít bảo vệ nhất** | 🔴 confirmed |
| C2 | **Tái dùng khi người nói đổi ý** — độ-tương-tự mù ở cuối câu JA (phủ định/thì/kính ngữ) | 🔴 confirmed |
| C3 | **"Số/tên không bao giờ ảo" là nửa sự thật** — formatter tất định nhưng **ASR nghe sai** thì render sai đầy tự tin (20周年→25周年) | 🟠 confirmed |
| C4 | **Hạ ngưỡng khi trễ** → sloppy đúng lúc rủi ro cao nhất (Q&A ngẫu hứng); phải hạ *độ trễ*, **không hạ ngưỡng khớp** | 🟠 confirmed |
| C5 | **VERIFY/BLEND chưa định nghĩa** — "trộn 2 bản dịch" không phải phép toán rõ ràng; priming kéo output về kịch bản → wrong-but-confident | 🟠 confirmed |
| C6 | **Predictive commit** dùng edit-distance trên *nguồn*, không trên *nghĩa* → 1 hạt phủ định lọt qua | 🟠 confirmed |
| C7 | **Embedding không đáng tin trên clause lễ nghi ngắn** (ありがとう/よろしく/おめでとう ~cosine 0.8) → thổi phồng REUSE sai | 🟠 confirmed |
| C8 | **1 nhãn ngôn ngữ/segment** không xử lý được **code-switch VI/JA trong 1 câu** (rất phổ biến ở Esuhai) | 🟡 likely |

### D. Hợp đồng backend không đỡ được thiết kế
| # | Lỗ hổng | Mức |
|---|---------|:---:|
| D1 | `on_script` chỉ là **badge {lid,score}**, không đảm bảo phát bản-đã-duyệt → Tier-0 "0 token, y bản duyệt" **chưa chắc đúng** | 🔴 needs-info |
| D2 | Cascade Matcher/Router/Governor/Budget **không có endpoint** — runtime chỉ có **1 boolean** `/api/live/fast` | 🟠 confirmed |
| D3 | `script_anchor/script_lock/predict/main_context` trong API.md **không có mô tả hành vi** — đang là giả định | 🟠 confirmed |

### E. Bảo mật & riêng tư
| # | Lỗ hổng | Mức |
|---|---------|:---:|
| E1 | **Không auth** + `0.0.0.0` + Railway → loopback assumption đã vỡ; ai trên WiFi cũng gọi được `/api/*` | 🔴 confirmed |
| E2 | `/api/file` **ghi được không auth** → viết lại kịch bản/glossary → hiện "SCRIPTED" trên LED | 🔴 confirmed |
| E3 | **Role guard** (admin/operator/audience) **chưa code** dù tài liệu ghi như đã có | 🟠 confirmed |
| E4 | **"offline/không lên cloud" bị mâu thuẫn**: engine **OpenAI TTS** gửi text ra cloud; frontend từng ở Railway | 🟡 confirmed |
| E5 | QR khách + feed live **không token/hết hạn** → rò Q&A nội bộ ra điện thoại ngoài phòng | 🟠 likely |
| E6 | Path-sandbox `/api/file` **không kiểm chứng được** từ repo này → cần review code backend (nguy cơ RCE nếu string-prefix) | 🟠 needs-info |

### F. Lỗi CODE trong prototype (đã/đang xử lý — xem 15.2)
| # | Lỗ hổng | Trạng thái |
|---|---------|:---:|
| F1 | **STOP/EMERGENCY STOP → chiếu diễn văn GIẢ** (có tên CEO) lên LED | ✅ **đã vá** |
| F2 | Reconnect **kẹt vòng lặp 1s** khi backend accept-rồi-drop (attemptRef reset sai chỗ) | ✅ **đã vá** |
| F3 | Mất cờ **`corrected`** khi line_update sau bỏ cờ | ✅ **đã vá** |
| F4 | **Pop-out màn cạnh KHÔNG BAO GIỜ hiện live** — cửa sổ riêng, không có session bus → 3 màn LED **chiếu demo** | 🔴 **CHƯA** (cần session bus/BroadcastChannel — kiến trúc mới) |
| F5 | **lid trùng khi reconnect** làm hỏng lịch sử "đóng băng" | 🟠 chưa (cần namespace lid theo epoch) |
| F6 | Production không có proxy (A3) | 🔴 chưa (quyết định topology) |

### G. Over-claim trong TÀI LIỆU của chính chúng ta (phải sửa cho chính trực)
| # | Over-claim | Sự thật |
|---|-----------|---------|
| G1 | "Tối ưu **token**" | Model chạy **cục bộ → 0 phí token**; cái cần tối ưu là **độ trễ + hàng đợi GPU**. "Budget Governor theo token" là pattern cloud sai chỗ. |
| G2 | "**Simultaneous interpreter**" | Là **phụ đề trễ + TTS** (consecutive-style). |
| G3 | "Số/tên **không bao giờ ảo**" | Chỉ đúng cho *render*; **ASR vẫn nghe sai**. |
| G4 | Budget **900/1800/2500ms** | Là **mục tiêu**, chưa đo lần nào trên Mac. |
| G5 | "Embedding chạy **ANE off-Metal**" | ANE **chỉ vào được qua Core ML**; chưa convert → thực tế chạy CPU/MPS. |
| G6 | "Neo vào backend đã có sẵn" | Phần lớn In-Event **là build mới**, không có API đỡ. |

> **Toàn bộ over-claim này đã/đang được sửa trong tài liệu** (xem 15.3). Trình bày "ý định thiết kế" như "thuộc tính đã có" là kiểu over-claim khiến khách bị bất ngờ — em nhận và sửa.

---

## 15.2. Đã sửa NGAY (chính trực = hành động)

3 lỗi **code trong prototype của chính em**, đã vá + **build pass (tsc+vite) + lint sạch**:

- **F1 — STOP không còn chiếu demo:** thêm cờ `everStarted` (sticky, không reset tới khi reload). Sau khi đã start, STOP → **slate "PROYAKU — CHỜ TÍN HIỆU / スタンバイ"**, **không bao giờ** diễn văn giả. ([`LiveSessionContext.tsx`](../../src/lib/LiveSessionContext.tsx), [`BilingualStream.tsx`](../../src/pages/BilingualStream.tsx))
- **F2 — Reconnect không còn kẹt vòng lặp 1s:** `attemptRef` **chỉ reset khi phiên chứng minh khỏe** (`ready`), không reset ở `onopen` → backend accept-rồi-drop sẽ **tăng backoff và tới FAULT** đúng cách.
- **F3 — Giữ cờ `corrected`:** `line_update` sau bỏ cờ không còn xoá badge "đã sửa".

> Các lỗi lớn hơn (**F4 pop-out demo, F6 production proxy, F5 lid collision**) cần quyết định kiến trúc/topology — em liệt kê ở 15.4, không tự ý làm ẩu.

---

## 15.3. VIỆC PHẢI LÀM TUẦN NÀY (đảo lại thứ tự ưu tiên)

> Với **~3 tuần tới 8/8**, thứ tự đúng KHÔNG phải là code thêm tính năng, mà là **khử rủi ro nền tảng**:

1. 🔴 **Chạy full backend trên CHÍNH Mac Studio M3 Ultra, offline** — từng role (ASR/MT/LLM/TTS/embedding) khởi động được không? Đo **cold-warm time**, **p50/p95** partial/final/spoken dưới tải đồng thời, và **soak ≥3h** đo nhiệt. **Chặn mọi việc khác tới khi qua bài này.** (Nếu CUDA-bound → quyết định gấp: đổi engine Metal, hay đổi máy.)
2. 🔴 **Handshake test LiveConfig thật** — chốt `targets` map vs array, `hotwords/beam_size` có được nhận, cả 2 chiều có ra `line` không. Thêm smoke-test vào Green Room.
3. 🔴 **Máy dự phòng thứ 2** (Mac Studio giống hệt, warm sẵn cùng gói tri thức) + **công tắc A/B trên feed LED** + tập cutover. *Đây là khoản ROI cao nhất, hơn mọi thứ ở §14.5 cộng lại.*
4. 🔴 **Thông dịch viên người** (1–2 người) — primary/standby cho toàn bộ phần **ngoài kịch bản** (Q&A, toast). PROYAKU = lớp phụ đề + mở rộng màn, không phải "the interpreter".
5. 🔴 **Cách ly mạng + auth**: VLAN/SSID riêng, reverse-proxy có xác thực trước cả frontend lẫn backend, `:8080` **không** với tới từ WiFi khách; bỏ `0.0.0.0`, không deploy production lên cloud.
6. 🟠 **Xác minh với tác giả backend**: `on_script` có phát bản-đã-duyệt không? `script_lock` làm gì? Có telemetry token/tier per-clause không? (quyết định Cascade Matcher chạy ở đâu.)

---

## 15.4. MVP thu gọn cho 8/8 (freeze scope — bỏ vàng-mạ)

Khoảng **một nửa tài liệu 14** (embeddings, adaptive threshold, speculative commit, versioned KB, speaker profiles, term-mining, **toàn bộ Post-Event learning**) **không thay đổi gì khán giả thấy ngày 8/8** — đó là **roadmap sản phẩm mặc áo deadline lễ**. Với 3 tuần, tập trung:

**LÀM (gala-critical):**
1. **Chạy được & đo được** trên Mac (mục 15.3.1).
2. **Nạp kịch bản + glossary + pre-translate + duyệt tay** (khoá tên/keigo: Lê Long Sơn, Kaizen Yoshida School…).
3. **Tier-0 tái dùng** *chỉ khi* đã xác minh backend hỗ trợ (D1) **+ cổng slot/negation chạy TRƯỚC reuse** (C1/C2).
4. **Green Room** chạy thử trên bản ghi + **tinh ASR/VAD/endpoint với mic sân khấu thật** (đây mới là trần chất lượng, không phải cosine).
5. **Phụ đề đọc-được từ hàng cuối** + **cut-to-safe** + **máy dự phòng** + **human interpreter**.
6. **Trust HUD tối thiểu** (đấu nối `on_script/name_fix/timing/corrected` đang bị bỏ) để người vận hành thấy máy tự tin tới đâu.

**KHUYẾN NGHỊ MẠNH: gala 8/8 nên PHỤ ĐỀ-ONLY.** TTS đang P2, chưa wire; đọc keigo sai giọng/sai đọc/lệch 2s over PA là **rủi ro sỉ nhục** cao nhất và **ít sẵn sàng nhất**. Để TTS lại cho pha phòng họp (âm học dễ, chỉnh giọng kỹ). → **PROYAKU vừa-nói-vừa-phụ-đề để cho phòng họp; gala nói bằng người, phụ đề bằng máy.**

**HOÃN (sau sự kiện):** embeddings/semantic layer, adaptive threshold, speculative commit, versioned KB, learning loop, speaker profiles, document term-mining, QR khách.

---

## 15.5. Cải tiến chất lượng dịch cụ thể (nếu làm Cascade Matcher)

1. **Chạy cổng slot + negation/polarity TRƯỚC mọi REUSE** (kể cả on_script). Không phát dòng tái dùng nếu chưa verify lại từng slot + phủ định/kính ngữ so với ASR *của chính câu này*.
2. **Gate số/tên theo độ tin cậy ASR** — dưới ngưỡng → giữ-dòng-cuối hoặc hiện **token nguồn nguyên văn**, không render số tự tin-sai. **Ghim cứng con số 20 (周年)** — không tin ASR cho con số cốt lõi của cả sự kiện.
3. **Không hạ ngưỡng khớp khi trễ** — chỉ giảm độ trễ (rút clause, bỏ LLM, bỏ TTS), giữ cổng chính xác cố định.
4. **Clause ngắn (<6–8 token): bỏ/giảm trọng số semantic**, đòi khớp lexical+slot gần-chính-xác.
5. **Lane theo hướng tường minh** (LiveConfig mode B directions/cascade) gắn theo nghị trình/diễn giả thay vì auto-LID mỗi segment → xử code-switch tốt hơn.
6. **Đóng băng dòng CORRECTED/FINAL cuối** khi hiccup, **không** đóng băng partial; số/tên **chỉ hiện sau `corrected`**.
7. **Ghi log mọi thay tên (hotword/name_fix)** ra Trust HUD để người vận hành **phủ quyết** — tránh biến tên khách lạ thành tên trong roster.
8. **TTS lễ nghi: thu sẵn bằng giọng người** cho đoạn kính ngữ cố định; TTS chỉ cho thông tin phụ.

---

## 15.6. Câu hỏi cần Thầy / chủ backend trả lời (ẩn số chịu tải)

1. **Backend đã từng chạy trên Mac Studio M3 Ultra chưa?** "CUDA context" nghĩa là gì cho bản Mac — sidecar đã recompile Metal, hay hard-require CUDA? p95/nhiệt/warm-time đo được là bao nhiêu?
2. `on_script` cao có khiến backend **phát bản-đã-duyệt** không, hay chỉ badge live-MT? `script_lock` làm gì?
3. **% chương trình 8/8 là kịch bản khoá** vs ngoài kịch bản (Q&A/toast)? (con số này quyết định cả bài toán fast-path và AI-only.)
4. **Sơ đồ mic**: mỗi diễn giả 1 feed sạch, hay mic chung/chồng tiếng? (quyết định diarization/cross-talk.)
5. **Có thông dịch viên người** không, và có sẵn sàng làm **1 nút human-takeover** vào cùng kênh phụ đề/TTS?
6. **3 lớp LED do máy nào driver** — 1 Mac nhiều ngõ ra, hay nhiều máy/đầu phát? (quyết định kiến trúc đồng bộ — BroadcastChannel **không** vượt máy.)
7. **Có máy dự phòng thứ 2 + UPS** không?

---

## 15.7. Kết — chính trực

Em trân trọng yêu cầu này của Thầy. **Thiết kế có nền tảng tốt và ý tưởng đúng** — nhưng nếu đưa ra sân khấu 8/8 như hiện tại, nó có **quá nhiều điểm có thể gãy công khai**. Sự chính trực ở đây là: **đừng để vẻ đẹp của tài liệu che mất việc chưa ai chạy thử trên máy thật, chưa có máy dự phòng, chưa có người làm lưới, và một nút STOP từng chiếu diễn văn giả.**

Tin tốt: **phần lớn rủi ro khử được bằng việc "chán" mà chắc** — chạy thử trên Mac, máy dự phòng, người phiên dịch, cách ly mạng, phụ đề-only, và tập Green Room. Em đã vá 3 lỗi code ngay; phần còn lại là **quyết định của Thầy** dựa trên §15.3 và §15.6.

---

[← 14 Kiến trúc Pre/In/Post](14-proyaku-pre-in-post-event.md) · [Về README](README.md)
