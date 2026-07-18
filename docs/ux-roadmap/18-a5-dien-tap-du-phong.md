# A5 — SỔ TAY DIỄN TẬP & DỰ PHÒNG/FAILOVER: VẬN HÀNH PROYAKU TẠI GALA 20 NĂM ESUHAI

> **Tài liệu vận hành cho ngày lễ — in khổ A5, dán tại mọi trạm.** Tổng duyệt / Green Room: **07/08/2026**. Chính lễ: **08/08/2026**. Ngôn ngữ: **VI⇄JA**. Chủ khách: MC Việt + khách Nhật.

> **SỰ THẬT CẦN NHỚ:** PROYAKU là **lớp PHỤ ĐỀ song ngữ có độ trễ + TTS tùy chọn**, KHÔNG phải phiên dịch đồng thời tự động, KHÔNG tự chủ hoàn toàn. Phán quyết audit cho gala: **PHỤ ĐỀ LÀ CHÍNH + PHIÊN DỊCH VIÊN NGƯỜI đứng cạnh + Mac dự phòng #2 warm sẵn**.

> **NGƯỠNG LATENCY (partial ≤900ms / final ≤1800ms / spoken ≤2500ms) LÀ MỤC TIÊU DỰ KIẾN — CHƯA ĐO trên Mac Studio này.** Chỉ có số thật sau khi chạy **Bước 0 (file 17)** ở Green Room 07/08. Trong lễ: tin vào MẮT (Trust HUD + phiên dịch người) hơn con số chưa kiểm chứng.

> **NGUYÊN TẮC BẤT DI BẤT DỊCH:** Mọi đường lỗi kết thúc ở **TRẠNG THÁI AN TOÀN = mic người BẬT + màn GIỮ DÒNG CUỐI (G) hoặc SLATE (B)**. KHÔNG BAO GIỜ màn trắng. KHÔNG BAO GIỜ phụ đề demo giả.

---

## 0) MỤC TIÊU, NGUYÊN TẮC & VAI TRÒ

### 0.1 Mục tiêu
Vận hành PROYAKU an toàn xuyên suốt buổi lễ, mỗi phân đoạn ceremony được ánh xạ sang một hành động rõ ràng (**SCRIPTED / LIVE / FREEZE / CUT-TO-HUMAN**), và mọi sự cố đều đáp xuống trạng thái an toàn — không màn trắng, không demo.

### 0.2 Bốn nguyên tắc chốt
1. **AI làm NỀN, người làm QUYỀN LỰC.** PROYAKU chỉ DẪN ở đoạn đã nạp `/script` và duyệt tay. Mọi đoạn ngoài kịch bản: người dẫn. *Nghi ngờ = nhường người.*
2. **Ba phím cắt là luật:** `L` = LIVE, `G` = FREEZE (giữ dòng cuối), `B` = SLATE (thẻ chờ đục). Mọi đường lỗi kết ở G hoặc B + mic người.
3. **Không bao giờ demo giả.** Pop-out `/stream?...&display=1` chỉ soi phiên live; khi rớt, `/stream` tự hiện slate "MẤT TÍN HIỆU — GIỮ DÒNG CUỐI", không hiện diễn văn demo.
4. **Chỉ dùng control CÓ THẬT.** Không bịa nút mới. Việc "cắt TTS / lên mic người" làm ở **mixer nhà hát (fader)**, không phải trong app.

### 0.3 Quy ước điều khiển (control CÓ THẬT — tham chiếu duy nhất)
| Trang | Control thật |
|---|---|
| **/prep** "Trung tâm điều phối" | Bảng GO / NO-GO / DEGRADED; 5 blocker: backend-reachable · models-warm (latch/signed) · script-rehearsed (attest) · names-verified (attest) · human-interpreter (attest). Attest ký who+time vào localStorage, cảnh báo nếu ký trước ngày tổng duyệt. Mở đầu MỌI phiên. In-event: mirror annunciator/E2E/NO-SIGNAL read-only. |
| **/audio** "Bàn điều khiển" | Chọn mic + model STT/MT; **START INTERPRETER = HOLD-TO-CONFIRM giữ 800ms**, gated bởi pre-flight (backend·mic·ASR·MT·VI-out·JA-out·VI≠JA); STOP cũng hold-to-confirm; **EMERGENCY STOP = 1 chạm** ở sidebar; Master Annunciator (OFFLINE/STANDBY/CONNECTING/WARMING/READY/LIVE/DEGRADED/RECONNECTING/FAULT); Trust HUD (E2E + per-stage, script-match %, name-fix count, TTS-speaking); **NO-SIGNAL alarm** kêu nếu mic im >2s khi live; output device khóa khi active; **Fast Mode** toggle. |
| **/stream** "Tường phụ đề" | Dòng mới = vàng sáng; zoom `+ / − / 0` (lưu localStorage); **L / G / B** qua bàn phím + nút thanh điều khiển; broadcast lệnh cắt tới MỌI cửa sổ qua **BroadcastChannel session bus**; pop-out `/stream?lang=vi&display=1` / `?lang=ja&display=1` mirror phiên thật; khi rớt hiện slate "MẤT TÍN HIỆU — GIỮ DÒNG CUỐI". |
| **/glossary** · **/script** · **/voices** · **/reveal** | Danh từ riêng/keigo/hotword → `data/glossary.json`; dòng song ngữ đã duyệt → `data/script.json`; chọn giọng TTS + Pronunciation Clinic; trang reveal nghi lễ. |

**Đã seed sẵn:** Lê Long Sơn = TGĐ · Esuhai · Kaizen Yoshida School · Kaizen/改善 · 御社/keigo · số **20 / 20周年** ghim hotword.

### 0.4 Roster & comms (headset kênh riêng)
| Vai | Trạm / nhiệm vụ |
|---|---|
| **STAGE MANAGER (SM)** | Chủ trì đồng hồ T-minus, gọi mọi cue & hand-off. **NGƯỜI DUY NHẤT** ra lệnh cắt và hô ABORT. Quyết định GO/HOLD cuối ở T-10. |
| **OP-AUDIO** (Operator PROYAKU) | Ngồi `/audio`. **NGƯỜI DUY NHẤT** cầm START/STOP/EMERGENCY STOP. Canh Annunciator + Trust HUD + NO-SIGNAL. |
| **OP-SCREEN** (Operator phụ đề/AV-LED) | Cầm `/stream`: mở 3 pop-out, set zoom, **bấm phím L/G/B**. Quản A/B switch + cầu dao đổi Mac. |
| **REL-LEAD** (Trực độ tin cậy) | Sở hữu Mac #2 (warm, cùng glossary+script), giữ `/prep` READY, cầm công tắc A/B, đo nhiệt/RAM Mac #1, **thực hiện cutover**, đề xuất ABORT. |
| **PD** (Phiên dịch người) | **Chính + dự bị**. Dẫn mọi đoạn ngoài kịch bản; lưới an toàn cuối. Mic riêng, đường âm độc lập PROYAKU. |
| **PROOFER** (Người soát phụ đề) | Đọc SONG SONG VI+JA trên `/stream` + Trust HUD. Chốt chặn DUY NHẤT bắt lỗi "đúng ngữ pháp nhưng sai nghĩa/keigo/tên/số". |
| **BE** (Kỹ sư backend) | Trực cạnh Mac, theo log backend/WARMING, restart khi crash. |
| **KỸ SƯ ÂM THANH** | Giữ 2 fader tách biệt: fader TTS PROYAKU và fader mic PD; fade sạch khi hand-off. |
| **MC LIAISON** | Cánh gà, báo trước cho SM mỗi khi diễn giả sắp rời script; xác nhận tên sắp xướng để đối chiếu `/glossary`. |
| **THẦY / Chủ nhiệm** | Ký GO/NO-GO cuối, xác nhận tên nghe đúng trên LED, chốt phạm vi máy/người. |
| **NHẬT KÝ DIỄN TẬP** | Ghi số đo THẬT (median partial/final/spoken, thời gian cutover, nhiệt), đánh dấu ĐẠT/RỚT từng cửa. |

**Closed-loop comms:** SM ra lệnh → người thực thi **NHẮC LẠI lệnh** ("người dẫn, go") **rồi mới** hành động.
**Tín hiệu tay dự phòng (khi headset chết):** SM giơ tay NGANG = người dẫn · SM chỉ vào màn LED = PROYAKU dẫn.

---

## 1) LỊCH D-7 → D-DAY

| Mốc | Nội dung chính | Cửa phải qua |
|---|---|---|
| **D-7 (01/08)** | Xác nhận **Bước 0 đã có SỐ THẬT** (partial/final/spoken median cả 2 chiều; ghi rõ dạng LiveConfig backend chấp nhận). Nạp `/glossary` + `/script`, duyệt tay từng dòng. Dựng phòng diễn tập mô phỏng 3 màn. | 100% dòng MC = *approved*; tên/keigo/số 20 hiện đúng khi preview. **KHÔNG diễn tập nếu chưa có số Bước 0.** |
| **D-7→D-3** | Chạy TEST MATRIX 1–9 (mic thật, 2 chiều, stress tên/số, latency, VI≠JA, 3 màn mirror, drill G/B, drill reconnect). Lặp tới ổn. | Từng cửa Test đạt (mục 2.2). |
| **D-3 (05/08)** | TEST MATRIX 10 (cutover Mac #2), 12 (soak ≥3h + nhiệt), 13 (cô lập mạng). Bắt đầu ký attest những cửa đã đạt. | Cutover ≤X giây ≥2 lần; soak không throttle; mạng cô lập đạt. |
| **D-1 = 07/08 (GREEN ROOM)** | **Tổng duyệt sân khấu thật.** Chạy lại toàn ma trận rút gọn + 1 lượt FULL chương trình. **Ký (hoặc ký lại) TẤT CẢ attest** vì `/prep` cảnh báo chữ ký trước ngày tổng duyệt. | Chạy trọn không sự cố công khai; mọi failure path kết ở mic người + màn frozen/slate. Cuối buổi `/prep` dồn hết blocker về xanh. |
| **D-DAY = 08/08** | Checklist T-minus trước giờ mở cửa (mục 3). | **`/prep` đọc GO.** |

---

## 2) DIỄN TẬP: GREEN ROOM 07/08 + MA TRẬN KIỂM THỬ + CỔNG KÝ

**Quy tắc vàng của diễn tập:** Chứng minh bằng **số đo thật**, không bằng niềm tin. Mỗi Test có **CỬA ĐẠT/RỚT**. Chỉ khi ĐẠT mới được **ký tay attestation** tương ứng trong `/prep`. **KHÔNG ký khống.**

### 2.1 Bước 0 là điều kiện tiên quyết
Chạy **Bước 0 (file 17)** trên chính Mac Studio TRƯỚC mọi thứ. Có bảng partial/final/spoken median cho CẢ HAI chiều. Ghi rõ **dạng LiveConfig backend thật sự chấp nhận** (targets=list theo API.md HAY map+beam_size theo brief — backend chỉ nhận MỘT dạng, WS đóng ngay nếu sai). Thay mọi ngưỡng "dự kiến" bằng **số thật**.

### 2.2 Ma trận kiểm thử (13 Test)

| # | Test | Control thật | CỬA ĐẠT / RỚT |
|---|---|---|---|
| **1** | **Bản ghi diễn văn THẬT + tinh ASR/VAD/endpoint qua MIC SÂN KHẤU THẬT** (A5.1). Phát bản thu giọng thật (có nghỉ, vỗ tay) qua loa vào chính mic dùng 08/08. | `/audio` chọn mic + START hold 800ms sau pre-flight pass; Trust HUD per-stage; NO-SIGNAL alarm | ĐẠT: câu endpoint gọn, không cắt/gộp; NO-SIGNAL **KHÔNG** kêu khi đang nói, **PHẢI** kêu khi im >2s. |
| **2** | **Hai chiều VI→JA & JA→VI ra LINE đúng chữ.** ≥5 câu/chiều (lý tưởng ≥20). | `/audio` Annunciator = LIVE; `/stream` dòng mới vàng | ĐẠT: mỗi chiều ra LINE hợp nghĩa, không chiều nào "câm". RỚT → kiểm device_index/mic hoặc dạng LiveConfig, **dừng, sửa, không diễn tập trên nửa pipeline**. |
| **3** | **Stress test TÊN & SỐ.** Nhồi "20周年", "Lê Long Sơn", "Kaizen Yoshida School", 御社. | Trust HUD name-fix count; `/glossary`; `/stream` G nếu thấy số sai | ĐẠT: số 20 KHÔNG thành 12/22/25; tên đúng mặt chữ; Thầy xác nhận nghe đúng. RỚT nếu bất kỳ lần "20周年" lên LED sai số. |
| **4** | **Đo LATENCY thật vs ngân sách.** Median partial/final/spoken từng chiều. | Trust HUD E2E/per-stage; Fast Mode | ĐẠT: final median trong ngân sách ở chế độ phụ đề (TTS tắt). Nếu final >1800ms đều với NLLB-1.3B → chuyển NLLB-600M; vẫn vượt → Fast Mode và/hoặc phụ đề-only. **KHÔNG hạ ngưỡng khớp để "chữa" trễ.** |
| **5** | **TTS keigo check — CHỈ nếu dùng TTS** (khuyến nghị TẮT ở gala). | `/voices` Pronunciation Clinic; Trust HUD TTS-speaking | ĐẠT: keigo đúng đọc/giọng, spoken ≤2500ms, KHÔNG chồng mic người. RỚT → tắt TTS. Nếu phụ đề-only → **N/A, ghi "TTS OFF"**. |
| **6** | **Tách ngõ VI≠JA.** | `/audio` pre-flight mục VI≠JA (gate START); pop-out `?lang=vi` / `?lang=ja` | ĐẠT: pre-flight VI≠JA xanh + hai wing khác ngôn ngữ trên màn thật. RỚT → không START. |
| **7** | **3 màn MIRROR** (center song ngữ + 2 wing + strip). | pop-out `?lang=&display=1`; zoom +/−/0; session bus | ĐẠT: cả 3 mirror ĐÚNG phiên live, KHÔNG màn nào chiếu demo; chữ đọc được từ ghế cuối. **LƯU Ý topology:** BroadcastChannel chỉ đồng bộ TRONG CÙNG máy/trình duyệt — nếu 3 lớp LED do NHIỀU máy driver thì phải có feed từ backend. Xác nhận với AV ở D-7. |
| **8** | **DRILL Cut-to-safe G/B.** Kịch bản: (a) máy dịch bậy/số sai → G; (b) sự cố/chuyển tiết mục → B. | `/stream` L/G/B broadcast mọi màn; EMERGENCY STOP; STOP | ĐẠT: từ thấy lỗi tới màn an toàn **≤2 giây**; lệnh tới CẢ 3 màn; EMERGENCY STOP/STOP **không bao giờ** chiếu diễn văn giả — chỉ ra slate. |
| **9** | **DRILL Reconnect.** Rút mạng FE-BE 5s rồi cắm lại. | Annunciator RECONNECTING/WARMING/FAULT; `/stream` slate tự động | ĐẠT: `/stream` tự hiện slate (KHÔNG demo); backoff tăng dần, tới FAULT đúng cách (không kẹt vòng 1s). **Reconnect = warm lại ~20–40s (cold start), KHÔNG "vài giây"** → trong 20–40s đó PD nói, giữ FREEZE/SLATE. |
| **10** | **DRILL Cutover Mac #2** (A5.2). Mac #1 "chết" (kéo nguồn/treo). | Công tắc A/B; `/stream` B→L; `/audio` START Mac #2; `/prep` mirror | ĐẠT: khán giả chỉ thấy slate (không đen/demo); tổng cutover ≤ **X giây** (Thầy/AV chốt X, đề nghị ≤30s); đã tập ≥2 lần thành công. Trình tự: (1) B=SLATE, (2) gạt A/B, (3) PD nói lấp, (4) Mac #2 START, (5) L=LIVE. |
| **11** | **DRILL Hand-off PD** (A5.3). Q&A, lời chúc ngẫu hứng, đổi ý cuối câu tiếng Nhật (phủ định/kính ngữ ở cuối — chỗ máy mù nhất). | `/stream` G/B; Trust HUD script-match% (tín hiệu); mic người | ĐẠT: mỗi lần vào đoạn ngoài kịch bản, màn về FREEZE/SLATE và PD tiếp quản **≤3s**, không "màn trống". PD chính + dự bị đều tập. |
| **12** | **SOAK ≥3h + nhiệt** trên CẢ Mac #1 và #2. Đo `powermetrics gpu_power`, theo dõi latency trôi. | `/audio` phiên live dài; Trust HUD; `/prep` models-warm | ĐẠT: 3h KHÔNG throttle, final median không trôi vượt ngân sách, không OOM (kỳ vọng model <15GB, dư >70GB RAM). RỚT → giảm model / cải thiện tản nhiệt / rút TTS. **Điều kiện để ký models-warm.** |
| **13** | **Cô lập mạng** (A5.4). | Hạ tầng ngoài app — bảo vệ `/script`, `/glossary`, `/api/file` | ĐẠT (tất cả): (a) backend :8080 KHÔNG với tới từ WiFi khách (curl từ máy ngoài bị chặn); (b) FE&BE sau reverse-proxy CÓ auth; (c) đã bỏ bind 0.0.0.0; (d) KHÔNG endpoint cloud nào được gọi (tắt engine cloud TTS); (e) `/api/file` không ghi được từ ngoài. RỚT bất kỳ mục → chưa ký. |

### 2.3 Cổng ký — ánh xạ CỬA → ATTESTATION trong /prep

> Mỗi chữ ký ghi who+time vào localStorage. `/prep` cảnh báo nếu ký **trước** ngày tổng duyệt và không bao giờ tự-xanh. **Chữ ký ký trước 07/08 → phải ký lại tại Green Room.**

| Attestation /prep | Ký SAU khi ĐẠT | Ai ký |
|---|---|---|
| **script-rehearsed** | Test 1, 2, 4 (bản ghi thật + mic thật + latency đạt) | Operator + SM |
| **names-verified** | Test 3 (tên/số đúng trên LED, Thầy xác nhận nghe đúng) | Thầy + Operator |
| **models-warm** (latch) | Test 12 (soak 3h + nhiệt không throttle) | Ops |
| **second-mac** | Test 10 (cutover ≤X giây, tập ≥2 lần) | Ops + Operator |
| **human-interpreter** | Test 11 (có hợp đồng PD + đã tập hand-off) | PD + Operator |

---

## 3) NGÀY GALA (08/08) — QUY TRÌNH T-MINUS (kết ở /prep = GO)

| Mốc | Hành động | Control | Chủ trì |
|---|---|---|---|
| **T-90** | Khởi động kép: bật backend on-device (offline, không cloud) trên **CẢ** Mac #1 và Mac #2. Mở `/prep` đầu tiên mỗi máy. Bắt đầu warm models. **KHÔNG ký ô nào ở bước này.** | `/prep` (mở đầu mọi phiên) | OP-AUDIO + REL-LEAD |
| **T-60** | Cắm đúng **mic sân khấu thật**. Nói thử 1 câu VI + 1 câu JA. Phát test tone. Chủ ý im >2s để xác nhận **NO-SIGNAL** kêu đúng, rồi nói lại thấy nó tắt. | `/audio` chọn mic, Annunciator, NO-SIGNAL | OP-AUDIO + AV |
| **T-45** | **Pre-flight 7 điểm phải XANH:** backend · mic · ASR · MT · VI-out · JA-out · **VI≠JA**. Chọn loa VI và loa JA khác nhau. **TUYỆT ĐỐI không override.** Sau LIVE, output tự khóa. | `/audio` pre-flight (gate START), output lock | OP-AUDIO |
| **T-30** | Bung 3 màn: pop-out `?lang=vi&display=1` (wing VI), `?lang=ja&display=1` (wing JA), cửa sổ song ngữ (center 16:9). Set zoom phủ 10m×5m. Thử L→G→B, xác nhận lệnh lan ra TẤT CẢ cửa sổ. Pop-out `&display=1` chỉ soi live, không demo. | `/stream` pop-out, zoom +/−/0, L/G/B | OP-SCREEN |
| **T-20** | Đối chiếu `/script` + `/glossary` (Lê Long Sơn=TGĐ, Esuhai, Kaizen Yoshida School, Kaizen/改善, 御社, 20/20周年). Rồi **KÝ attest NGAY HÔM ĐÓ** (hoặc xác nhận chữ ký Green Room còn hợp lệ, không cảnh báo). | `/prep` attest, `/script`, `/glossary` | OP-AUDIO + MC Liaison |
| **T-10** | SM đọc bảng `/prep`: **GO** (mọi blocker xanh → được LIVE) · **DEGRADED** (chạy nhưng PHỤ ĐỀ LÀ CHÍNH, PD sẵn đỡ) · **NO-GO** (còn blocker đỏ → **KHÔNG bấm LIVE**, mở lễ bằng mic người + màn SLATE cho tới khi xanh). | `/prep` GO/NO-GO/DEGRADED | **SM (quyết định cuối)** |
| **T-5** | PD chính + dự bị vào vị trí. Chốt tín hiệu hand-off. Mac #2 xác nhận `/prep` READY, REL-LEAD tay đặt trên A/B switch. Thử 1 lần G→L cho tay OP-SCREEN nóng máy. | `/prep` mirror read-only, A/B switch | SM + PD + REL-LEAD |
| **T-0** | SM gọi "STANDBY CAPTION". Đúng khi MC bắt đầu: OP-AUDIO **HOLD-TO-CONFIRM START (giữ 800ms)**. Annunciator phải chuyển **● LIVE**. Màn ở chế độ **L**. | `/audio` START hold 800ms | OP-AUDIO |

> **Nếu bất kỳ blocker đỏ ở T-10:** NO-GO → thu hẹp về **phụ đề-only + PD làm primary**, KHÔNG ép LIVE. Mở lễ bằng mic người + màn SLATE.

---

## 4) CUE SHEET RUN-OF-SHOW (theo phân đoạn lễ)

| Cue | Phân đoạn | Chế độ | Hành động & Control | Call-out |
|---|---|---|---|---|
| **1** | Khai mạc / MC dẫn | **SCRIPTED, caption LIVE** | Dòng MC trong `/script`, để **L**. Theo dõi script-match % cao. E2E vọt → bật Fast Mode. | "CAPTION LIVE" |
| **2** | **DIỄN VĂN TGĐ LÊ LONG SƠN** (đỉnh điểm) | **SCRIPTED, bám script** | Diễn văn đã duyệt trong `/script`, matcher tái dùng dòng duyệt. Xác nhận name-fix ghim "Lê Long Sơn=TGĐ" + "20/20周年" (đếm name-fix trên HUD). Giữ **L**. Nếu TGĐ rời script ngẫu hứng → CUE 6. | "CAPTION LIVE — DIỄN VĂN" |
| **3** | Vinh danh / xướng tên | **SCRIPTED, glossary ghim tên** | Tên đã nạp `/glossary`, giữ **L**. MC Liaison báo trước từng tên. Nếu tên sai/lệch → **G** tức thì, PD xướng miệng, sửa `/glossary`, rồi "BACK TO LIVE". | "CAPTION LIVE" |
| **4** | **VIDEO 20 NĂM / TIẾT MỤC ÂM NHẠC** | **KHÔNG caption** | Video có phụ đề riêng → **B (SLATE)** nhường màn. Chỉ nhạc nền không lời → **G (FREEZE)** giữ dòng cuối. **KHÔNG STOP hẳn** (giữ phiên sống cho tiết mục sau). Tuyệt đối không chạy chữ trên nhạc/lời hát. | "FREEZE" hoặc "SLATE — VIDEO" |
| **5** | Reveal (nghi lễ) | **SCRIPTED hoặc SLATE** | `/reveal` do AV điều khiển. Màn phụ đề để **B** hoặc bám dòng script đã duyệt, KHÔNG nhận dạng tự do (tránh chữ nhảy phá không khí). Sau reveal về **L** trước khi vào giao lưu. | "SLATE — REVEAL" |
| **6** | **Q&A / GIAO LƯU / TOAST** | **CUT TO HUMAN** | Vùng off-script cao nhất. SM gọi "CUT TO HUMAN". PD dẫn dịch. Màn để **G (FREEZE)** giữ dòng cuối, hoặc **B (SLATE)** nếu hoàn toàn ngoài kịch bản. Quay lại nội dung đã duyệt: "BACK TO LIVE" → **L**. | "CUT TO HUMAN" / "BACK TO LIVE" |
| **7** | Bế mạc | **SCRIPTED, kết an toàn** | Dòng bế mạc trong `/script`, giữ **L**. MC dứt lời: OP-SCREEN để **B (SLATE)** trước, rồi OP-AUDIO **HOLD-TO-CONFIRM STOP**. Chỉ EMERGENCY STOP nếu cần dừng gấp. Kết ở: màn SLATE + mic người sẵn sàng. | "SLATE" → "STOP" |

**Bảng call-out headset (dán mọi trạm):**
- **STANDBY CAPTION** = chuẩn bị, tay đặt trên START.
- **CAPTION LIVE** = OP-AUDIO HOLD START, màn về L.
- **FREEZE** = bấm G, giữ dòng cuối (video/nhạc/lệch/off-script tạm).
- **SLATE** = bấm B, màn giữ mờ (reveal/video có phụ đề riêng/sự cố/khởi động lại).
- **CUT TO HUMAN** = PD dẫn, màn FREEZE.
- **BACK TO LIVE** = về nội dung đã duyệt, bấm L.
- **ABORT** = EMERGENCY STOP + SLATE + mic người.

---

## 5) PHỐI HỢP PHIÊN DỊCH NGƯỜI (Hand-off)

### 5.1 Hai chế độ dẫn
| | **CHẾ ĐỘ P (PROYAKU dẫn)** | **CHẾ ĐỘ H (Người dẫn)** |
|---|---|---|
| Annunciator | LIVE | LIVE/DEGRADED (giữ nền) |
| Màn `/stream` | **L** (dòng mới gold) | **G** (bám kịch bản) hoặc **B** (ngoài kịch bản hẳn) |
| Fader TTS | lên | fade về 0 tại mixer (**KHÔNG STOP** — giữ phiên warm) |
| Mic PD | mở-im, hot-standby (fader kéo xuống, KHÔNG tắt hẳn) | lên fader = audio chính |
| Dùng cho | dòng có trong `/script` | Q&A/toast/ứng khẩu |

Chuyển P⇄H **chỉ qua thủ tục HAND-OFF**.

### 5.2 Tín hiệu hand-off (3 nhịp cố định, in & dán tại bàn)
**CHỈ SM được gọi hand-off.**
1. SM: **"CHUẨN BỊ NGƯỜI DẪN"** → PD đặt tay lên mic, OP-SCREEN đặt ngón lên phím G.
2. SM: **"NGƯỜI DẪN — GO"** → Kỹ sư âm thanh fade TTS→0 + mic PD lên; OP-SCREEN bấm **G** (hoặc **B**); PD bắt đầu nói.
3. Quay lại kịch bản, SM: **"PROYAKU DẪN — GO"** → OP-SCREEN bấm **L**, Kỹ sư fade mic người xuống + TTS lên.

Người thực thi **nhắc lại lệnh** trước khi hành động (closed-loop). Tín hiệu tay dự phòng: tay SM NGANG = người dẫn; chỉ vào LED = PROYAKU dẫn.

### 5.3 Danh sách ĐỎ — PROYAKU KHÔNG được tự dẫn (SM gọi CHẾ ĐỘ H **TRƯỚC** khi đoạn bắt đầu)
1. Hỏi đáp / Q&A tự do.
2. Nâng ly / toast / chúc mừng ứng khẩu.
3. Phát biểu ngẫu hứng, chen ngang, sửa lời tại chỗ.
4. Chuyện cười, chơi chữ, thành ngữ.
5. Khoảnh khắc cảm xúc (tri ân, nghẹn ngào, tưởng niệm).
6. Kính ngữ trang trọng dày đặc (敬語/keigo): chào 御社, xưng hô lãnh đạo, cảm tạ khách quý — PROYAKU dễ hạ cấp lễ độ mà nghe vẫn "trôi".

Với 6 loại này: phụ đề để **B (SLATE)** hoặc **G (FREEZE)**, tuyệt đối không để chạy live dịch sai theo sau.

### 5.4 Cắt audio sang mic người SẠCH (không pop, không cắt phiên)
KHÔNG dùng STOP/EMERGENCY STOP để nhường người trong đoạn ngắn (phá phiên warm, khó quay lại kịp). Cách sạch: (1) OP-SCREEN bấm **G** (hoặc **B**) — màn không chạy dịch mới; (2) Kỹ sư fade TTS→0 (~300ms) + đẩy mic PD lên; (3) quay lại: bấm **L**, fade ngược. **EMERGENCY STOP chỉ khi PROYAKU phát nội dung SAI/độc hại ra loa và không kịp fader** — sau đó màn tự về slate STANDBY (không demo).

### 5.5 LỖI HIỂM: phụ đề SAI TINH VI mà không "gãy" rõ (RỦI RO SỐ 1)
Câu JA/VI đúng ngữ pháp, trôi chảy nhưng SAI nghĩa — hạ cấp keigo (御社 → suồng sã), đọc trại tên, sai số (20 → khác), dịch ngược ý. **Máy KHÔNG báo lỗi** vì với máy nó "hợp lệ". **Phòng thủ DUY NHẤT là NGƯỜI:** PROOFER đọc song song VI+JA + theo Trust HUD (script-match % **tụt** + name-fix count **nhảy** = cờ đỏ).

**Quy trình bắt & đè:** (1) PROOFER hô **"PHỤ ĐỀ SAI"**; (2) OP-SCREEN bấm **G** ngay (đóng băng, không cho dòng sai kế tiếp) hoặc **B** nếu cả đoạn nghi ngờ; (3) SM gọi CHẾ ĐỘ H, PD đọc đúng đè lên; (4) nếu lỗi tên/thuật ngữ lặp, sửa `/glossary` **sau đoạn** rồi mới **L** lại. **Nguyên tắc: nghi ngờ = đóng băng TRƯỚC, điều tra SAU — không để câu sai thứ hai xuất hiện.**

### 5.6 Bố trí booth / mic PD
Mic PD là kênh RIÊNG vào mixer, **KHÔNG đi qua PROYAKU** (tránh dội STT). Đặt cách loa monitor để không hú. PD có màn phụ mở `/stream?lang=ja&display=1` (và `?lang=vi`) để nhìn ĐÚNG phiên live — pop-out mirror thật, KHÔNG demo. PD đeo tai nghe nghe tiếng gốc (không nghe TTS để khỏi nhiễu). Fader mic PD luôn "mở nhưng kéo xuống" — hand-off chỉ là kéo fader, không phải bật nguồn (loại rủi ro mic chết lúc cần). PD dự bị nhận mic **<10s** khi PD chính hỏng tiếng.

---

## 6) SỔ TAY DỰ PHÒNG: THANG XUỐNG CẤP + CÂY QUYẾT ĐỊNH + CUTOVER MAC #2

### 6.1 THANG XUỐNG CẤP (Degrade Ladder) — luôn đi xuống từng bậc, mỗi bậc đều AN TOÀN

```
Bậc 0  BÌNH THƯỜNG   Annunciator LIVE, E2E trong ngân sách, phụ đề (+TTS) chạy, PD dự phòng
   ↓
Bậc 1  GIẢM TẢI      Bật Fast Mode khi E2E chớm cao
   ↓
Bậc 2  GIỮ HÌNH      OP-SCREEN G=FREEZE (giữ dòng cuối) + PD cầm mic (trễ/rớt ngắn)
   ↓
Bậc 3  MÀN AN TOÀN   B=SLATE (màn trung tính) + PD là chính (sai nội dung/mất tín hiệu kéo dài)
   ↓
Bậc 4  CUTOVER       A/B sang Mac #2 (warm) + L (Mac #1 hỏng nặng)
   ↓
Bậc 5  ABORT         Tắt phụ đề (STOP/EMERGENCY STOP) + SLATE + 100% PD tới hết
```
**Không bậc nào là màn trắng hay demo.**

### 6.2 Bảng chế độ hỏng (triệu chứng → hành động → AN TOÀN)

| Mã | Triệu chứng | Hành động | Trạng thái AN TOÀN |
|---|---|---|---|
| **FM-1 Quá nhiệt/throttle** | E2E leo dần, Annunciator DEGRADED·TRỄ CAO (E2E≥2500ms), quạt gào | OP-AUDIO **Fast Mode**; nếu vẫn ≥2500ms >30s → OP-SCREEN **G**, SM hô "NGƯỜI", REL-LEAD chuẩn bị cutover | Màn giữ dòng cuối + PD nói |
| **FM-2 OOM/kill** | Backend rớt, Annunciator FAULT/RECONNECTING, phụ đề đứng | OP-SCREEN **G** ngay, SM hô "NGƯỜI", REL-LEAD **CUTOVER** Mac #2 (A/B→B, bấm L) | Dòng cuối đóng băng + PD nói |
| **FM-3 Kernel panic** | Màn Mac #1 đen/khởi động lại, feed A mất hoàn toàn | REL-LEAD lật A/B ngay sang **B (Mac #2 warm)**; OP-SCREEN xác nhận Mac #2 LIVE; SM hô "NGƯỜI" che khoảng hở. (Không FREEZE được trên máy đã chết → dựa vào Mac #2 NÓNG sẵn) | Feed B ≤X giây + PD nói |
| **FM-4 Backend crash / kẹt WARMING** | Annunciator kẹt WARMING x/y hoặc FAULT; pre-flight đỏ | **KHÔNG START đè.** Giữa show: OP-SCREEN **G** + SM hô "NGƯỜI"; BE restart; >60s chưa warm → cutover Mac #2. Chuẩn bị (chưa live): giữ STANDBY, không lên feed | FREEZE + PD nói |
| **FM-5 Mất mic (NO-SIGNAL)** | LIVE mà mic im >2s → NO-SIGNAL alarm | **Phân biệt:** người ngừng nói (im thật) → KHÔNG cắt, chờ. Mic hỏng thật → OP-SCREEN **G**, SM chuyển mic PD/backup, BE kiểm cáp | Dòng cuối đóng băng + mic người |
| **FM-6 Rớt WebSocket** | Annunciator RECONNECTING; `/stream` slate MẤT TÍN HIỆU | Chờ ≤10s tự reconnect (app đã giữ khung). Quá 10s: OP-SCREEN **B**/giữ **G**, SM hô "NGƯỜI". **Nhớ: warm lại 20–40s.** Lặp nhiều → cutover Mac #2 | Slate/freeze thật + PD nói |
| **FM-7 Trễ cao HOẶC sai rõ** | A: E2E≥2500ms kéo dài. B: script-match % tụt/name-fix tăng/mắt thấy sai | (Trễ) Fast Mode; vẫn ≥2500ms → **G** + PD. (SAI) OP-SCREEN **B** ngay (không để câu sai đứng trên màn 10m) hoặc **G** về dòng đúng cuối, SM hô "NGƯỜI" | Slate/freeze + PD; sửa glossary/script rồi mới L lại |
| **FM-8 Mất feed LED / A/B / màn phụ** | Màn LED tắt/nhiễu; pop-out rớt session | Mất center → REL-LEAD kiểm A/B+cáp, SM dựa PD (âm thanh độc lập LED). Pop-out rớt tự hiện slate → mở lại URL `?lang=..&display=1` để mirror. A/B hỏng → nối thẳng feed máy đang chạy, nâng cảnh giác ABORT | Âm thanh người liên tục; màn còn lại giữ nội dung thật/slate |
| **FM-9 Mất điện (UPS)** | UPS báo chạy pin | 2 Mac + switch + A/B qua UPS đủ tải (kiểm runtime Green Room). OP-SCREEN chủ động **B** nếu nguy cơ tắt, SM chuyển PD (mic/PA có UPS riêng). UPS gần cạn → **ABORT có trật tự** thay vì để sập giữa câu | Slate + PD + PA còn điện |

### 6.3 CUTOVER MAC #2 (A5.2) — trình tự an toàn
Mac #2 giống hệt: cùng `glossary.json`, `script.json`, `/voices`, đã chạy Bước 0 riêng, giữ NÓNG (`/prep` GO, models-warm latch). Feed LED qua A/B: **A=Mac #1 (live), B=Mac #2 (warm)**.

```
(1) SM hô "CUTOVER"
(2) OP-SCREEN bấm B=SLATE trên feed đang phát  (khán giả không thấy trắng)
(3) PD nói lấp khoảng trống
(4) REL-LEAD lật A/B  A → B
(5) OP-AUDIO xác nhận /audio Mac #2: Annunciator = LIVE, Trust HUD chạy
(6) OP-SCREEN bấm L=LIVE trên màn Mac #2
```
**Mục tiêu ≤ X giây** (Thầy/AV chốt X, đề nghị ≤30s) — **ĐO thật** khi tập A5.2 ≥2 lần; nếu >20s luyện lại. Mac #2 KHÔNG chạy demo — `/stream` trên nó ở session thật hoặc SLATE.

### 6.4 EMERGENCY STOP vs STOP — dùng đúng nút
- **STOP (hold-to-confirm):** dừng CÓ TRẬT TỰ — hết phần máy, chuyển đoạn chỉ-người đã lên kế hoạch, kết thúc bình thường. Giữ tới 100% mới dừng (chống lỡ tay).
- **EMERGENCY STOP (1 chạm, sidebar):** CHỈ khi phải cắt PROYAKU NGAY vì nội dung sai nghiêm trọng/nhạy cảm đang phát ra loa, hoặc sự cố an toàn.
- **QUY TẮC ĐI KÈM:** trước/ngay khi EMERGENCY STOP, OP-SCREEN **phải B=SLATE hoặc G=FREEZE** để màn không rơi về trống/demo, và SM hô "NGƯỜI". **Không bao giờ EMERGENCY STOP mà bỏ màn trần.**

---

## 7) TIÊU CHÍ ABORT & AI CÓ QUYỀN (Bậc 5)

**ABORT** = tắt phụ đề, chuyển **100% sang PD** tới hết chương trình.

**GỌI ABORT khi thỏa BẤT KỲ điều:**
1. Cả Mac #1 và Mac #2 đều hỏng/không GO.
2. Phụ đề sai nội dung lặp lại **dù đã sửa** glossary/script.
3. E2E vượt ngân sách kéo dài, không cứu được bằng Fast Mode/cutover.
4. UPS gần cạn / mất điện kéo dài.
5. Bất kỳ rủi ro nội dung nhạy cảm lên màn công khai mà không kiểm soát được.

**THẨM QUYỀN:** chỉ **SM** được hô ABORT; **REL-LEAD** được ĐỀ XUẤT.
**Khi ABORT:** OP-SCREEN **B=SLATE**, OP-AUDIO **STOP** (hoặc EMERGENCY STOP nếu đang phát nội dung xấu), SM trao toàn bộ cho PD. **KHÔNG quay lại máy trong cùng chương trình** trừ khi SM đồng ý và `/prep` về GO.

---

## 8) CÔ LẬP MẠNG (A5.4)

Ngày diễn: **VLAN/SSID riêng** chỉ cho 2 Mac + các cửa sổ `/stream` pop-out; **KHÔNG nối Internet/cloud** (models on-device, offline). **BỎ bind 0.0.0.0** của backend — chỉ bind loopback/nội bộ, ra ngoài qua **reverse-proxy có xác thực**.

Màn phụ: `/stream?lang=vi&display=1` và `?lang=ja&display=1` (wing 1 ngôn ngữ), center `/stream` song ngữ — tất cả nối cùng session bus (BroadcastChannel), KHÔNG demo. **`/api/file` không ghi được từ ngoài** (chống viết lại kịch bản rồi hiện badge SCRIPTED giả lên LED). Đặc biệt **tắt engine cloud TTS** (gửi text ra cloud = vi phạm "offline").

**Kiểm ở Green Room:** rút mạng ngoài, xác nhận mọi thứ vẫn LIVE; curl từ máy khách phải bị chặn. Ghi vào `/prep` là điều kiện go-live.

---

## 9) THẺ CUE BỎ TÚI (in, ép nhựa) + CHECKLIST CUỐI TRƯỚC GIỜ MỞ CỬA

### 9.1 Thẻ SM
```
BẠN LÀ NGƯỜI DUY NHẤT gọi cut & hô ABORT.
Hand-off 3 nhịp: "CHUẨN BỊ NGƯỜI DẪN" → "NGƯỜI DẪN—GO" → "PROYAKU DẪN—GO"
Tay NGANG = người dẫn | Chỉ LED = PROYAKU dẫn
Gọi CHẾ ĐỘ H TRƯỚC các đoạn ĐỎ: Q&A · toast · ứng khẩu · đùa · cảm xúc · keigo
NGHI NGỜ = "NGƯỜI" + bảo OP-SCREEN FREEZE. Đóng băng trước, điều tra sau.
ABORT khi: 2 Mac hỏng | sai lặp lại | trễ không cứu | UPS cạn | nội dung nhạy cảm
```

### 9.2 Thẻ OP-AUDIO
```
Bắt đầu ở /prep. START = HOLD 800ms sau pre-flight 7 điểm XANH (KHÔNG override).
Trễ cao → Fast Mode. Vẫn ≥2500ms → báo SM, chờ FREEZE.
STOP = hold tới 100% (kết thúc/hand-off có kế hoạch).
EMERGENCY STOP (1 chạm) = CHỈ khi nội dung sai/độc thoát ra loa → KÈM SLATE + "NGƯỜI".
NO-SIGNAL kêu: người ngừng nói → chờ | mic hỏng → báo SM đổi mic PD.
```

### 9.3 Thẻ OP-SCREEN
```
L = LIVE | G = FREEZE (giữ dòng cuối) | B = SLATE (thẻ chờ đục)
Thấy lỗi → màn AN TOÀN ≤2 giây. Lệnh lan CẢ 3 màn qua session bus.
Video/nhạc → G hoặc B (KHÔNG chạy chữ trên nhạc). Reveal → B.
Q&A/off-script → G/B. Sai nội dung → B ngay (đừng để câu sai đứng trên 10m).
Pop-out rớt tự ra slate MẤT TÍN HIỆU — mở lại URL ?lang=..&display=1. KHÔNG BAO GIỜ demo.
Cutover: B → (Ops lật A/B) → xác nhận Mac #2 LIVE → L.
```

### 9.4 Thẻ PD (mặt trước / mặt sau)
```
[TRƯỚC] Bạn DẪN khi: Q&A · toast · ứng khẩu · đùa/chơi chữ · cảm xúc/tri ân · keigo (御社, chào lãnh đạo).
Chờ SM "NGƯỜI DẪN—GO", nhắc lại rồi nói. Mic bạn chết → chỉ tay sang PD dự bị, KHÔNG bỏ trống tiếng.
[SAU] Đúng tuyệt đối: Lê Long Sơn = Tổng Giám đốc · Esuhai · Kaizen Yoshida School · Kaizen/改善 · 御社 · 20周年 = nijū-shūnen.
Thấy phụ đề LED sai → nắm tay ra dấu OP-SCREEN + đọc đúng đè lên. ĐỪNG sửa máy giữa chừng.
```

### 9.5 Thẻ REL-LEAD
```
Mac #2 luôn WARM: /prep GO + models-warm latch. Tay trên A/B switch.
Đo nhiệt/RAM Mac #1. CUTOVER khi Mac #1 hỏng nặng: chờ SM "CUTOVER" → lật A/B → xác nhận Mac #2 LIVE.
Mục tiêu ≤ X giây (đã đo Green Room). Được ĐỀ XUẤT ABORT (SM mới hô).
```

### 9.6 CHECKLIST CUỐI (sáng 08/08, đi theo blocker `/prep`)
```
□ (1) backend-reachable XANH (health OK, đúng Mac #1)
□ (2) models-warm XANH (đã warm, latency đo lại đạt; Mac #2 cũng warm)
□ (3) script-rehearsed · names-verified · second-mac · human-interpreter
      — chữ ký hợp lệ từ Green Room (KHÔNG cảnh báo)
□ (4) /audio pre-flight: backend·mic·ASR·MT·VI-out·JA-out·VI≠JA PASS;
      test-tone; mic có tín hiệu thật; output device đã lock
□ (5) 3 màn pop-out mirror ĐÚNG live, KHÔNG demo; zoom set đúng venue
□ (6) PD primary + standby có mặt, đã bắt tín hiệu hand-off
□ (7) Công tắc A/B đúng vị trí, Mac #2 STANDBY/READY
□ (8) Thử 1 lần G=FREEZE → L=LIVE cho tay OP-SCREEN nóng máy
□ (9) Mạng cô lập xác nhận (curl từ máy ngoài bị chặn, không cloud)
──────────────────────────────────────────────
ĐÍCH: /prep hiển thị GO. Nếu blocker đỏ → NO-GO:
      thu hẹp phụ đề-only + PD làm primary, KHÔNG ép LIVE.
```

---

### PHỤ LỤC — CÂY QUYẾT ĐỊNH TỔNG HỢP (dán tại bàn OP-AUDIO & OP-SCREEN; SM giữ bản có ô ABORT tô đậm)

```
E2E chớm cao (chưa ≥2500ms)          → Fast Mode, tiếp tục theo dõi ............ LIVE (Bậc 1)
E2E≥2500ms kéo dài >30s              → G=FREEZE + SM "NGƯỜI" ................... FREEZE + PD (Bậc 2)
Câu dịch SAI/nhạy cảm trên màn       → B=SLATE ngay + SM "NGƯỜI" .............. SLATE + PD (Bậc 3)
RECONNECTING tự phục hồi ≤10s        → chờ (app giữ dòng cuối) ................ tự về LIVE
RECONNECTING >10s / lặp lại          → B/G + SM "NGƯỜI", chuẩn bị cutover ..... slate/freeze + PD
NO-SIGNAL do người ngừng nói         → KHÔNG cắt, chờ ......................... giữ LIVE
NO-SIGNAL do mic hỏng                → G + SM đổi mic PD ...................... freeze + mic người
Backend crash / WARMING kẹt >60s     → G + BE restart; không kịp → cutover #2 .. freeze → Mac #2 (Bậc 4)
Kernel panic / mất feed A hoàn toàn  → lật A/B → Mac #2 + L, SM "NGƯỜI" ....... feed B ≤X giây + PD (Bậc 4)
OOM / tiến trình bị kill             → G + cutover Mac #2 + L ................. freeze → Mac #2 (Bậc 4)
Vào Q&A/toast/ứng khẩu               → SM "NGƯỜI" + G (hoặc B) ................ PD dẫn, phụ đề không đè
Vào video 20 năm / nhạc             → B (video có phụ đề riêng) / G (nhạc nền)  KHÔNG chạy chữ trên nhạc
Mất màn LED center                   → REL-LEAD kiểm A/B+cáp, SM dựa PD ....... tiếng người liên tục
Pop-out /stream rớt                  → tự hiện slate; mở lại ?display=1 ....... slate rồi tự đồng bộ
UPS chạy pin / gần cạn               → B + SM chuyển PD, chuẩn bị ABORT ....... slate + PD + PA
Nội dung sai nghiêm trọng ra loa     → B + EMERGENCY STOP (1 chạm) + "NGƯỜI" .. màn an toàn + PD
2 Mac hỏng / sai lặp lại / trễ bất trị → SM hô ABORT: B + STOP + 100% PD ...... SLATE + PD (Bậc 5)
Dừng có kế hoạch / kết thúc          → STOP (hold tới 100%) ................... dừng trật tự
/prep NO-GO ở T-10                    → KHÔNG LIVE; mở lễ mic người + SLATE .... không lên LIVE khi chưa GO
```

**Mọi nhánh kết ở: mic người BẬT + màn FREEZE (G) hoặc SLATE (B). KHÔNG BAO GIỜ màn trắng. KHÔNG BAO GIỜ demo giả.**