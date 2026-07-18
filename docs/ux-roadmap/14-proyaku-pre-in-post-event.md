# 14 — Kiến trúc PROYAKU: Pre-Event · In-Event · Post-Event

[← 13 Phiếu bối cảnh](13-phieu-boi-canh-du-an.md) · [Về README](README.md) · Liên quan: [08](08-san-pham-va-do-tin-cay.md) · [11](11-ngon-ngu-thiet-ke.md) · [12](12-thu-vien-mau-giao-dien.md)

> Tài liệu này thiết kế PROYAKU thành một **thông dịch viên chuyên nghiệp** đúng nghĩa — **chuẩn bị kỹ (Pre)** · **thi triển tối ưu (In)** · **rút kinh nghiệm & tự nâng cấp (Post)**. Trọng tâm là **bộ nhớ học tài liệu trước** + **thuật toán so khớp** quyết định *tái dùng bản dịch chuẩn (nhanh, rẻ, chính xác)* hay *dịch trực tiếp (khi lệch)* — tối ưu đồng thời **chất lượng × độ trễ × token**.
>
> Tổng hợp từ hội đồng 7 chuyên gia (thông dịch, thuật toán/ML, tối ưu realtime, học liên tục, UX admin, kiến trúc dữ liệu on-device). **Mọi tính năng neo vào sức mạnh backend đã có** (`docs/API.md`) — không bịa năng lực không hỗ trợ. Chạy **trên máy** (Mac Studio M3 Ultra 96GB) và **offline**.

---

> ## ⚠️ ĐỌC KÈM [15 — Audit trung thực](15-audit-lo-hong-va-cai-tien.md) TRƯỚC KHI THỰC THI
> Tài liệu 14 là **TẦM NHÌN**, không phải trạng thái đã có. Bản audit red-team (49/49 lỗ hổng critical/high còn đứng vững) chỉ ra:
> - **Phần lớn phần In-Event (Cascade Matcher, Tier-0 reuse, Router, Budget) CHƯA có API backend đỡ** — cần xác minh với tác giả backend, đừng coi là "đã neo sẵn".
> - **"token" dùng sai:** model chạy cục bộ → **0 phí token**; cái tối ưu là **độ trễ + hàng đợi GPU**. Mọi chỗ ghi "token budget/governor" đọc là **latency governor**.
> - Đây là **phụ đề trễ + TTS**, **KHÔNG** phải "simultaneous interpreter".
> - Budget **900/1800/2500ms** là **mục tiêu chưa đo** trên Mac. Backend **chưa từng chạy trên Mac Studio** (API.md ghi CUDA).
> - **Khuyến nghị: gala 8/8 nên PHỤ ĐỀ-ONLY + có thông dịch viên người + máy dự phòng.** Xem [15](15-audit-lo-hong-va-cai-tien.md).

---

## 14.0. Mười nguyên tắc vàng của thông dịch viên bậc thầy (kim chỉ nam)

Toàn bộ thiết kế phục tùng 10 nguyên tắc này — đây là "linh hồn nghề" mà Thầy nhắc:

1. **Chuẩn bị CHÍNH LÀ phiên dịch.** ~80% chất lượng được định đoạt trước khi diễn giả mở lời → menu giàu nhất, "có quan điểm" nhất nằm ở **Pre-Event Prep Desk**, không phải console live.
2. **Không bao giờ đoán tên, số, chức danh.** Khi không chắc → giữ nguyên gốc hoặc **giữ dòng đã xác thực cuối**. Một tên riêng sai đầy tự tin là lỗi *không thể tha thứ* trên sân khấu. "Chất lượng" ở đây = **kỷ luật từ chối đoán**.
3. **Quyết định register (kính ngữ) TRƯỚC, không phải trong lúc.** Cấp keigo (sonkeigo/teineigo) & mức trang trọng tiếng Việt gắn theo **pha nghị trình + diễn giả**. Lệch register = bất lịch sự dù từng chữ "đúng".
4. **Nhất quán thắng "khôn vặt".** Một khái niệm — một cách dịch — cho cả sự kiện. **Khoá thuật ngữ canonical** thay vì dịch cùng một cụm ba kiểu.
5. **Quản lý décalage (độ trễ) có ý thức.** Trễ là *núm vặn*, không phải tai nạn: theo dõi, khi tụt lại → **rút ngắn có chủ đích** (model nhanh, tái dùng nhiều hơn) thay vì tích luỹ trễ.
6. **Diễn tập trên chính vật thật.** Green Room chạy thử trên **bản ghi diễn văn thật** → biến rủi ro ẩn thành glossary cố định trước giờ mở cửa. Hành động an toàn đòn bẩy cao nhất.
7. **Đoạn cố định thì thuộc lòng.** Khai mạc lễ, lời chúc, lời cảm ơn đều công thức → khớp kịch bản, **đọc bản dịch đã duyệt sẵn** — vừa chính xác nhất, nhanh nhất, rẻ nhất cùng lúc.
8. **Đoán trước cuối câu**, nhất là tiếng Nhật (động từ/phủ định nằm cuối) → gợi ý dự đoán cho người vận hành một nhịp để kịp bắt lỗi trước khi commit.
9. **Debrief trung thực, ghi lại thứ đã "vật lộn".** Mỗi từ máy nghe sai / phải dịch mới là một bài học → phản hồi lại để **sự kiện sau bắt đầu thông minh hơn**.
10. **Đặc thù VI⇄JA không phải ngoại lệ, chính là nghề:** thứ tự họ-tên (JA họ trước / VI tên sau), âm Hán-Việt sau kanji, **trợ số đếm & con số kiểu 周年**, tiền tố kính ngữ お/ご — mỗi cái một **luật khoá sẵn**, không đoán tại chỗ.

---

## 14.1. Kiến trúc 3 pha (tổng quan)

```
┌──────────── PRE-EVENT (Prep Desk) ────────────┐   ┌──── IN-EVENT ────┐   ┌──── POST-EVENT ────┐
│ Nhập: hồ sơ sự kiện · nghị trình · diễn giả   │   │ Cascade Matcher  │   │ Learning Inbox     │
│ · KỊCH BẢN (căn song ngữ) · glossary/tên      │──▶│ (fast-path/live) │──▶│ (duyệt 1-chạm)     │
│ · tài liệu · voice-training                    │   │ Tiered Router    │   │ misheard→correct   │
│           ▼ biên dịch trước từng dòng          │   │ Budget Governor  │   │ KB versioned       │
│   ┌─ KNOWLEDGE-PACK COMPILER ─┐                │   │ Trust HUD        │   │ transcript/report  │
│   │ glossary.json · script.jsonl (pre-dịch)   │   │ TTS + phụ đề     │   │ → nạp cho sự kiện  │
│   │ embeddings · warm models   │               │   └──────────────────┘   │    KẾ TIẾP          │
│   └────────────────────────────┘               │        ▲  ▼              └────────────────────┘
└────────────────────────────────────────────────┘   Mac Studio M3 Ultra · offline · on-device
```

> **Triết lý xuyên suốt:** *"Cái gì hoàn thiện được TRƯỚC thì hoàn thiện trước"* — để lúc live chỉ dành **token/độ trễ/sự bất định** cho phần thật sự không đoán trước được. Đoạn kịch bản → tái dùng (0 token, độ trễ = chỉ ASR); đoạn ngẫu hứng → dịch trực tiếp có kiểm soát.

---

## 14.2. PRE-EVENT — Cổng Admin "Prep Desk" (nhập càng nhiều càng tối ưu)

Menu nhập liệu, mỗi cái biên soạn ra một mẩu **bộ nhớ** cho pha In-Event:

| Tính năng | Ưu tiên | Nhập gì → sinh ra gì | Backend |
|-----------|:---:|----------------------|---------|
| **Hồ sơ sự kiện & Register** | P0 | Tên/mục đích/khán giả/ngôn ngữ + **cấp keigo** → seed `main_context`, mặc định kính ngữ | `/api/file` event.json; block `main_context` |
| **Nghị trình theo mốc giờ** | P1 | Timeline segment (giờ, diễn giả, chủ đề, ngôn ngữ nguồn kỳ vọng, link đoạn kịch bản) → **thu hẹp cửa sổ script + hotword** theo segment | agenda.json; `script_anchor` |
| **Danh sách diễn giả (Roster)** | P0 | Tên VI/JA, chức danh, tiếng mẹ đẻ, mức kính ngữ, mẫu giọng → đẩy vào glossary `type=name` (JA để trống = **giữ nguyên**), `reading`, `asr_hotword` | glossary; `name_fix`; `/api/voice/record` |
| **Script Studio (căn song ngữ)** | P0 | Dán/upload diễn văn → tự cắt theo **clause**, căn VI↔JA, id dòng ổn định → nạp `script_anchor/script_lock` | `/api/file` script.jsonl; `on_script` |
| **Biên dịch trước từng dòng** | P0 | Mỗi dòng kịch bản chạy MT/LLM **offline**, người duyệt → cache bản đích chuẩn để **tái dùng nguyên văn** lúc live (0 token) | `/api/run` per line; `script_lock` |
| **Glossary/Terminology Workbench** | P0 | Bảng `vi\|ja\|reading\|type\|asr_hotword\|misheard\|note`; sao "★ tối quan trọng" → cascade hotword+lock | `/api/file` glossary.json |
| **Thư viện tài liệu + trích thuật ngữ** | P1 | Upload PDF/slide/DOCX → parse text → LLM **trích ứng viên thuật ngữ** cho người duyệt + seed context | `/api/file` refs; LLM sidecar |
| **Voice/Pronunciation Clinic** | P1 | Nhân sự đọc to script giàu thuật ngữ → diff nghe-được → **thêm luật misheard→correct** trước | `/api/voice/script`, `record`, `learn` |
| **Khoá "Must-Be-Perfect"** | P0 | Danh sách tên/chức danh **không được sai** → verbatim + hotword + hiển thị SCRIPTED | glossary + `script_lock` |
| **TTS Voice & Readings** | P2 | Chọn giọng nói mỗi ngôn ngữ + preview (vì PROYAKU **vừa nói vừa phụ đề**) | `/api/tts/voices`, `preview` |
| **Green Room / Dry-run** | P1 | Chạy thử pipeline trên file ghi → auto-flag tên sai → glossary | `device:file, realtime:true` |
| **KNOWLEDGE-PACK COMPILER** | P0 | Biên dịch tất cả input trên → 1 "gói tri thức" (glossary + script pre-dịch + embeddings + warm models) sẵn sàng nạp | tổng hợp |
| **Readiness / Go-No-Go** | P1 | Bảng sẵn sàng: health, mic, warm, test tone, VI≠JA, glossary, script | pre-flight ([12.7](12-thu-vien-mau-giao-dien.md)) |

> **Chú thích quan trọng:** `on_script` (điểm khớp kịch bản), `name_fix` (khôi phục tên), `script_anchor/script_lock`, `main_context` **đã có sẵn trong backend** — Prep Desk chỉ *nạp dữ liệu* để kích hoạt chúng.

---

## 14.3. ⭐ THUẬT TOÁN CỐT LÕI — "Cascade Matcher" (fast-path vs live)

Đây là trọng tâm câu hỏi của Thầy. Với **mỗi clause đã chốt (final)**, máy quyết định: **TÁI DÙNG** bản chuẩn (nhanh/rẻ/chính xác) hay **DỊCH TRỰC TIẾP** (khi lệch). Luồng cụ thể (engineer implement được ngay):

```
1. Chỉ chạy trên clause CHỐT (committed/final).
2. CHUẨN HOÁ: áp misheard→correct (glossary + giọng người nói), NFKC/gập độ rộng, chuẩn hoá dấu tiếng Việt.
3. SLOTIZE: tách số/ngày/giờ/tiền/% và tên/công ty/giải thưởng → template + bản đồ slot ({NUM_i},{NAME_i}…).
4. NẾU on_script.score ≥ 0.90  → TÁI DÙNG dòng server, gắn badge "SCRIPTED", dừng.   ← đoạn kịch bản
5. LỚP 1 (exact): hash template; khớp chính xác trong KB (ưu tiên cửa sổ diễn giả → rồi toàn cục) → TÁI DÙNG, dừng.
6. LỚP 2 (lexical): lex = 0.6·token_set_ratio + 0.4·levenshtein_ratio (trên cửa sổ ứng viên).
7. LỚP 3 (semantic): embed 1 lần, cosine vs vector đã cache → sem.
8. HOÀ ĐIỂM: S = 0.5·lex + 0.5·sem.
9. PHÂN DẢI (kèm cổng slot):
     • S ≥ 0.92  VÀ lex ≥ 0.85  VÀ mọi slot bảo vệ giải được  → TÁI DÙNG
     • 0.75 ≤ S < 0.92                                          → VERIFY/BLEND (dịch có kịch bản làm mồi)
     • S < 0.75                                                 → LIVE (dịch trực tiếp)
10. Bất kỳ số/tên/ngày CHƯA map được → hạ REUSE xuống VERIFY (an toàn).
11. RENDER đích từ template + điền slot (số/tên chạy formatter tất định — KHÔNG qua model → không "ảo").
12. Áp name_fix, phát dòng, ghi log quyết định.
```

> ⚠️ **SỬA THEO AUDIT ([15](15-audit-lo-hong-va-cai-tien.md) C1/C2):** bước 4 (on_script) **KHÔNG được dừng trước** cổng bảo vệ. Phải chạy **slotize + cổng số/tên (bước 3,10) + cổng phủ định/thì/kính-ngữ** *TRƯỚC* mọi lần tái dùng — kể cả on_script — rồi mới phát. Nếu không, đúng nhánh dùng nhiều nhất (đoạn kịch bản) lại **ít bảo vệ nhất**, và câu "…達成しました" (đạt) vs "…達成できませんでした" (KHÔNG đạt) sẽ bị tái dùng nghĩa ngược.

**Ngưỡng mặc định:** REUSE `S≥0.92` (& `lex≥0.85`); VERIFY sàn `0.75`; on_script fast-path `≥0.90`.

Ba kỹ thuật bổ trợ quan trọng:
- **Slotization tất định (số/tên model-free):** số/ngày chạy formatter VI↔JA cố định, tên lấy verbatim từ glossary → **con đường số & tên không bao giờ qua model → không hallucination** (đúng nguyên tắc #2, #10).
- **Teleprompter windowing:** giữ con trỏ "dòng kịch bản kỳ vọng kế tiếp"; chỉ so khớp trong **±6 dòng** quanh con trỏ (rẻ, chính xác cao); chỉ mở rộng top-k=20 toàn cục khi S<0.75; diễn giả nhảy đoạn → resync con trỏ. → giảm so sánh & giảm false-positive off-script.
- **Ngưỡng thích ứng độ trễ:** EWMA `proc_ms`; nếu quá ngân sách >3 dòng → hạ REUSE 0.92→0.88 & VERIFY 0.75→0.70 (phục vụ nhiều hơn từ bộ nhớ *miễn phí*); quá >8 dòng → bật Fast Mode + annunciator DEGRADED; hồi phục >10 dòng → khôi phục (có hysteresis chống dao động).
- **Cache embeddings theo content-hash:** key = sha1(template chuẩn hoá); warm-start **không re-embed** nếu kịch bản không đổi → sẵn sàng tức thì (quan trọng cho máy đơn offline).

> **Vì sao vừa nhanh–rẻ–đúng:** đoạn kịch bản (chiếm phần lớn lễ trang trọng) đi đường **TÁI DÙNG** → độ trễ chỉ bằng ASR, **0 token MT/LLM**, và đã glossary-chuẩn. Chỉ đoạn ngẫu hứng mới tốn compute — đúng như một thông dịch viên thuộc lòng phần lễ và chỉ "gồng" ở phần Q&A.

---

## 14.4. IN-EVENT — Định tuyến, dự đoán, ngân sách, Trust HUD

**Tiered Translation Router (memory-first)** — mở rộng Fast Mode hiện có, chọn "bậc" theo `on_script s`, `speech_lang p`, độ phủ glossary `g`, độ dài clause, cờ high-stakes, độ trễ hiện tại:

| Bậc | Điều kiện | Xử lý | Token | Độ trễ |
|:---:|-----------|-------|:---:|:---:|
| **Tier 0** | `s ≥ 0.90` | **Tái dùng** bản kịch bản đã duyệt, commit ngay | 0 | chỉ ASR |
| **Tier 1.5** | `0.55 ≤ s < 0.90` | Dịch **có mồi** (dòng kịch bản làm prior) + verify MT nhanh | thấp | thấp |
| **Tier 1** | novel, clause ngắn, `g≈1.0`, còn dư độ trễ | MT nhanh + glossary post-correct, **bỏ LLM** | thấp | thấp |
| **Tier 2** | novel, phức tạp | Main model + `main_context` LLM | cao | cao |
| *Fast-mode* | panic ON | ép Tier 1, không LLM | thấp | thấp nhất |

**Governor guard:** nếu p95 end-to-end > ngân sách hoặc token/phút > trần → ép hạ 1 bậc cho N clause kế + gợi ý Fast Mode.

**Predictive/Speculative Commit:** trên mỗi partial, sidecar `predict` dịch trước clause dự phóng (nếu `on_script` đang cao → phóng thẳng từ dòng kịch bản kế). Khi final: nếu khoảng cách sửa `d ≤ ε` → commit bản đã cache (**độ trễ sập xuống chỉ ASR**); `ε<d≤δ` → sửa nhanh phần đổi; else → định tuyến lại. Có rate-limit theo ngân sách token.

**Ngân sách độ trễ (tunable):** partial ≤ ~**900ms** · final đã sửa ≤ ~**1800ms** · nói (TTS) ≤ ~**2500ms** sau khi hết clause. Trần token/phút để `proc` trong ngân sách. Rolling p50/p95 + leaky-bucket token; **tỉ lệ fast-path hit** là chỉ số tiết kiệm đầu bảng (mỗi hit = 0 token, 0 độ trễ MT).

**Trust HUD (người vận hành):** danh sách dòng với **badge SCRIPT-MATCH% vs LIVE**, lóe "corrected", khôi phục name_fix, hướng dịch từ `speech_lang`, context summary cuộn, timing mỗi dòng. → người vận hành **thấy máy tự tin tới đâu** và can thiệp kịp. (Neo [12.5 Telemetry](12-thu-vien-mau-giao-dien.md), §11 Fast Mode.)

**Tách caption-nhanh / speak-ổn định + TTS lag manager:** phụ đề hiện sớm (bản tạm), giọng nói phát bản đã ổn định; hàng đợi TTS quản lý trễ nói theo cue `say/speaking/spoken`.

---

## 14.5. POST-EVENT — Vòng học liên tục ("tự giỏi lên sau mỗi sự kiện")

Sau mỗi phiên, PROYAKU **tự debrief** và liệt kê ra thứ đã học/vật lộn để người duyệt **1-chạm** đưa vào bộ nhớ cho sự kiện sau:

| Tính năng | Ưu tiên | Làm gì | Backend |
|-----------|:---:|--------|---------|
| **Session Event Journal** | P0 | Ghi mọi quyết định (match/live, timing, corrected, on_script, name_fix) làm nền debrief | ghi log phiên |
| **Learning Inbox (duyệt 1-chạm)** | P0 | Đề xuất: luật misheard→correct, sửa tên, dòng điểm thấp → **accept/reject** → merge vào glossary | `/api/voice/learn`, `/api/file` |
| **Session Review Dashboard** | P1 | Scorecard: tỉ lệ fast-path, phân bố độ trễ, số lần sửa/cứu tên | từ journal |
| **Transcript + Accuracy Report** | P1 | Transcript song ngữ ghép theo `lid` (+ on_script/corrected/timing), link phát lại bản ghi | `record:true`, `session{dir}` |
| **Versioned KB** | P1 | Mỗi sự kiện một lớp KB có phiên bản; học được **cộng dồn** qua nhiều sự kiện | file versioned |
| **Glossary Diff** | P2 | Xem "cái gì đã đổi" so với snapshot trước sự kiện | diff |
| **Speaker Profiles** | P2 | Nhớ đặc điểm từng người qua nhiều sự kiện (cách phát âm, thuật ngữ hay dùng) | aggregate |
| **Next-Event Prep Handoff** | P1 | "Duplicate as new Event" → seed workspace kế với glossary đã cứng + script tái dùng | workspace |

> **Đây chính là "In-Class" của Thầy dịch sang phần mềm:** mỗi buổi kết thúc là một buổi *rút kinh nghiệm có hệ thống* → lần sau bắt đầu ở vạch cao hơn. Máy **chủ động đề xuất**, người **duyệt** (giữ kiểm soát chất lượng), tri thức **cộng dồn**.

---

## 14.6. Kiến trúc dữ liệu on-device (Mac Studio M3 Ultra 96GB · offline)

- **Per-event versioned KB store:** mỗi sự kiện một thư mục có phiên bản (`data/events/<id>/`): manifest, glossary snapshot, script.jsonl (pre-dịch), refs/*.md, kb_index.jsonl, kb_embeddings, recording dir.
- **Chunker theo clause VI/JA** + **embedding on-device** (model nhỏ ~250MB, chạy **CPU/ANE — off Metal queue**) + **flat vector index** (top-k nhỏ).
- **Memory-budget scheduler (mấu chốt cho Apple Silicon):** một model resident mỗi role (`/api/models/switch` free model cũ); **ghim** embedding + vector index luôn thường trú trên CPU/ANE để **không tranh Metal** với ASR/MT; ASR+MT+TTS trên GPU; LLM sidecar tiến trình riêng. Ước tính footprint fp16 (ASR ~2-4GB, MT ~1.5-3GB, LLM ~2GB, TTS ~1-2GB, embed ~0.25GB) → **96GB dư nhiều**; ràng buộc thật là *số role + vị trí hàng đợi*, không phải dung lượng.
- **Versioned commit atomic swap + integrity guard + graceful degrade:** nếu KB lỗi → tự lùi về live-only, không sập.
- **Privacy:** tài liệu brief có thể **nhạy cảm** (nội bộ doanh nghiệp) → **giữ trên máy, không lên cloud**; có retention control.
- **Offline assets:** **self-host font** (bỏ Google Fonts) → render giống hệt & tức thì kể cả không mạng (khớp [06 north-star](06-typography-i18n.md)).

---

## 14.7. Cấu trúc Admin Portal (Information Architecture)

Mô hình **workspace theo sự kiện**: `Tạo → Chuẩn bị → Chạy → Rút kinh nghiệm`, có state machine + role guard (admin/operator/audience). Neo [KIM SẮC](11-ngon-ngu-thiet-ke.md) + [component 12](12-thu-vien-mau-giao-dien.md).

```
EVENTS (trang chủ workspace: thẻ sự kiện + tỉ lệ fast-path lần trước · New/Duplicate/Archive)
│
├─ PREPARE ▸ Event Brief ....... tên song ngữ (hero foil) · mục đích · nghị trình · phòng · roster · hướng · TTS/subtitles
│           ▸ Script & Agenda .. editor 2 cột VI/JA-đã-duyệt · số dòng · import · slider độ chặt khớp (→ script_anchor/lock)
│           ▸ Documents & KB ... upload PDF/DOCX→text · "Mine terms" → hàng đợi glossary
│           ▸ Glossary & Names . bảng vi|ja|reading|type|hotword|misheard · badge khoá tên riêng
│           ▸ Voices & TTS ...... giọng mỗi ngôn ngữ + preview → LiveConfig.tts
│           ▸ Pronunciation Clinic  reading script · record · learn → misheard→correct
│           ▸ Models & Warm Bay . chọn STT/MT/LLM (/api/blocks) · Warm all (x/y) · start sidecar
│
├─ RUN ▸ Green Room (pre-flight)  checklist go/no-go · START chỉ bật khi all-pass · override ghi log
│       ▸ Live Console .......... Master Annunciator · VU + NO-SIGNAL · START(vàng)/STOP hold/EMERGENCY(đỏ) · Telemetry
│       ▸ Trust HUD ............. SCRIPT-MATCH% vs LIVE · corrected-flash · name_fix · hướng · context · timing
│       ▸ Audience Displays ..... ma trận 3 màn (giữa=both, cánh trái=VI, cánh phải=JA) · BroadcastChannel · QR khách
│       ▸ Quick-Fix drawer ...... sửa nhanh tên/hotword giữa phiên → glossary.json · Fast-Mode
│
└─ REVIEW ▸ Session Transcript .. transcript ghép VI↔JA + on_script/corrected/timing · phát lại bản ghi
          ▸ Learned-Memory Inbox  duyệt misheard→correct/name fix/dòng điểm thấp · merge + diff
          ▸ Debrief & Carry-forward  tỉ lệ fast-path · phân bố độ trễ · "Duplicate as new" seed sự kiện kế
```

---

## 14.8. Tối ưu Chất lượng × Tốc độ × Token — tại sao hiệu quả

| Cơ chế | ↑ Chất lượng | ↓ Độ trễ | ↓ Token | Nguyên tắc |
|--------|:---:|:---:|:---:|---|
| Tái dùng bản kịch bản đã duyệt (Tier 0) | ✅ glossary-chuẩn | ✅ chỉ ASR | ✅ 0 token | #1, #7 |
| Slotization số/tên model-free | ✅ không ảo | ✅ | ✅ | #2, #10 |
| Predictive commit | ✅ | ✅ sập độ trễ | ~ | #8 |
| Ngưỡng thích ứng độ trễ + Fast Mode | ~ | ✅ | ✅ | #5 |
| Term-consistency lock | ✅ nhất quán | | ✅ | #4 |
| Register/keigo quyết định trước | ✅ đúng lễ nghi | | | #3 |
| Never-guess-a-name + hold-last-good | ✅ an toàn | | | #2 |
| Pre-translate + embeddings cache offline | ✅ | ✅ warm tức thì | ✅ | #1, #6 |
| Post-event learning | ✅ sự kiện sau tốt hơn | | | #9 |

---

## 14.9. Tích hợp vào lộ trình

Đây là **tầm nhìn sản phẩm dài hạn** — xếp trên nền [Giai đoạn 0–2](09-lo-trinh-nang-cap.md):

- **Nền tảng (đã/đang làm, GĐ 0–1):** reconnect + không-demo-giả ✅, telemetry, TTS wiring, cỡ chữ fluid, glossary editor.
- **Pre/In/Post lõi (GĐ 2 mở rộng):** Event workspace · Script Studio + pre-translate · **Cascade Matcher (14.3)** · Trust HUD · Learning Inbox · versioned KB.
- **Nâng cao (GĐ 3):** document term-mining, speaker profiles, predictive commit, QR khách, tối ưu on-device sâu.

> Với **~3 tuần tới lễ 8/8**, ưu tiên thực dụng: **Pre-Event (nạp kịch bản + glossary + pre-translate) + Tier 0/1 fast-path + TTS + Trust HUD tối thiểu + Green Room** đủ tạo khác biệt lớn về chất lượng & tốc độ ngay tại lễ; phần Post-Event learning và tối ưu sâu làm tiếp sau sự kiện.

---

[← 13 Phiếu bối cảnh](13-phieu-boi-canh-du-an.md) · [Về README](README.md)
