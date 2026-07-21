# 33 · Chuẩn hoá luồng lõi — Nối tiếp & Song song · Thiết bị–API–Phần cứng · Thiếu hụt (trung thực)

> Bổ sung cho sơ đồ 2 màn (/audio ↔ /stream). Sơ đồ đó ĐÚNG nhưng chỉ vẽ *bề mặt*
> (mic → backend → 2 màn). Tài liệu này rà **ruột** của luồng: pipeline nội bộ, các kênh
> chạy **nối tiếp** vs **song song**, tầng thiết bị/API/phần cứng, và **những gì còn thiếu**
> để đạt chuẩn chuyên nghiệp — nói thẳng, dựa trên code thật (không vẽ lý thuyết).
> Liên quan: [26](26-buoc-0-dac-ta-ky-thuat-fe-be.md) (đặc tả FE–BE), [27](27-giao-viec-backend-buoc-0.md)/[28](28-giao-viec-backend-kich-ban.md) (giao việc BE), [31](31-am-thanh-thiet-bi-loa-va-am-luong.md)/[32](32-giao-viec-backend-am-luong-vu-ngo-ra.md) (âm lượng/loa).

---

## 0. TL;DR

- Sơ đồ cũ thiếu: **pipeline nội bộ** (VAD→STT→nhận diện ngôn ngữ→hậu-kiểm→khớp kịch bản/MT→khôi phục tên→phụ đề + TTS), **các kênh song song**, **tầng thiết bị/API**, và **độ bền** (heartbeat, reconnect, đo trễ, đồng bộ đa màn).
- Kiến trúc FE đã dựng **đầy đủ & chuyên nghiệp trên hợp đồng**, nhưng **hợp đồng FE–BE chưa được kiểm end-to-end với backend thật** (Bước 0). Đây là **thiếu hụt #1**.
- 3 thiếu hụt kỹ thuật nói thẳng: **heartbeat auto-ping đang TẮT**; **đo trễ E2E chưa thực** (đang là tổng chặng); **đồng bộ đa-màn chỉ cùng-máy** (BroadcastChannel).

---

## 1. Luồng lõi ĐẦY ĐỦ — phần NỐI TIẾP (serial pipeline, cho mỗi lượt nói)

Mỗi câu nói của diễn giả đi qua chuỗi **tuần tự** (số liệu trong ngoặc = event WS backend gửi về):

```
[1] Thu âm (mic, CoreAudio · Mac Studio)
      → [2] VAD / mức âm ........................ event: level {v, speech}
      → [3] STT nghe-thành-chữ (bản nháp→chốt) .. event: transcript → line
      → [4] Nhận diện ngôn ngữ nguồn ............ event: speech_lang {lang, prob}
      → [5] Hậu-kiểm: hotword + khôi phục tên ... event: name_fix {fixes}
      → [6] RẼ NHÁNH:
             (a) KHỚP KỊCH BẢN duyệt sẵn ........ event: on_script {score}  (tái dùng nguyên văn)
             (b) HOẶC DỊCH MÁY (MT) + ngữ cảnh .. event: context {summary}
      → [7] Chốt dòng phụ đề (đích) ............. event: line / line_update {lid, lang, text, corrected}
      → [8] TTS đọc tiếng (nếu bật) ............. event: say → speaking {lang} → spoken/said
      → [9] Ra loa (đích: VI→loa VI / JA→loa JA)
   Đo trễ từng chặng .......................... event: timing {stt_ms, proc_ms, mt_ms, e2e_ms}
```

**Vòng đời phiên (state, tuần tự)**: `idle → connecting → warming(step/steps) → ready → listening → …`
· rớt mạng → `reconnecting` (đóng băng phụ đề, không rơi về demo) · hỏng hẳn → `error` (FAULT slate).

---

## 2. ĐỒNG THỜI SONG SONG (parallel channels)

Cùng lúc pipeline chạy, có **nhiều kênh chạy song song** (đây là phần sơ đồ cũ thiếu):

| Cặp song song | Chạy đồng thời như thế nào |
|---|---|
| **Kênh HÌNH ∥ kênh TIẾNG** | Từ 1 câu dịch (bước 7): phụ đề hiện NGAY (hình) **song song** với TTS đọc (tiếng, bước 8). Không chờ nhau. |
| **Hướng VI→JA ∥ hướng JA→VI** | Auto theo `speech_lang`: diễn giả nói VI → phụ đề+loa JA; nói JA → phụ đề+loa VI. Hai hướng đối xứng, luân phiên theo người nói. |
| **/audio ∥ /stream ∥ /reveal** | Cùng một `session.lines`, render **song song** trên nhiều màn: monitor vận hành, màn phụ đề khán giả, màn công bố. |
| **Dữ liệu ∥ heartbeat ∥ metering** | Trên cùng WS: luồng `line/timing…` (dữ liệu) chạy **song song** với `ping/pong` (liveness) và `level` (đồng hồ mức âm). |
| **Đa cửa sổ /stream** | Pop-out VI và JA ra 2 màn biên (`/stream?lang=vi&display=1`) chạy song song, đồng bộ qua bus. |
| **Take-to-safe (Live/Giữ hình/An toàn)** | Lệnh cắt phát **đồng thời** tới mọi màn khán giả cùng lúc. |

**Nguyên tắc chuẩn hoá**: *nối tiếp* trong pipeline dịch (thứ tự bắt buộc để đúng nghĩa); *song song* ở tầng phát/hiển thị/giám sát (để mượt, không nghẽn). Hình không bao giờ chờ tiếng; giám sát không bao giờ chặn dịch.

---

## 3. Ánh xạ UX/UI — sự kiện → nơi hiển thị (chuẩn hoá hiện trạng)

| Event WS | Trạng thái/ý nghĩa | Hiện ở đâu (UX/UI) |
|---|---|---|
| `warming` | Đang nạp model | /audio: đèn "WARMING x/y" + thanh tiến độ |
| `ready`/`listening` | Sẵn sàng / đang nghe | /audio: đèn "READY"/"LIVE"; /stream: chờ diễn giả |
| `level {v,speech}` | Mức âm vào | /audio: **thanh VU đáy sân khấu**; đèn trạng thái |
| `transcript`→`line` | Nghe-thành-chữ → phụ đề chốt | /audio monitor 2 cột; /stream 2 cột khán giả |
| `speech_lang` | Hướng dịch | /audio: cụm "VI ⇄ JA" (bên đang nói sáng) |
| `on_script {score}` | Khớp kịch bản duyệt | /audio: nhãn độ khớp trên dòng |
| `timing` | Trễ từng chặng | /audio: HUD tin cậy (⚠ xem §5) |
| `name_fix` | Sửa tên riêng | /audio: đếm số lần sửa |
| `speaking/spoken` | TTS đang đọc/xong | /audio: "ĐANG ĐỌC …" |
| `pong` | Nhịp sống backend | /audio: RTT (nếu bật heartbeat) |
| `error` | Lỗi (không chí mạng) | /audio: băng lỗi đỏ |

---

## 4. Tầng THIẾT BỊ – API – PHẦN CỨNG (chuẩn hoá kết nối)

**Phần cứng**
- **Mac Studio** = backend: CoreAudio (thu/phát) + GPU chạy model STT/MT/TTS.
- Vào: **1 micro** (`device_index`). Ra: **loa VI** + **loa JA** (`outputs.vi/ja` = chỉ số thiết bị) → 2 vùng/ngõ khác nhau.
- Hiển thị khán giả: **máy chiếu / màn LED** (cửa sổ /stream kéo sang màn ngoài).

**Kết nối phần mềm**
- FE (trình duyệt) ↔ Backend qua **HTTP + WebSocket** trên LAN. Backend **bind 127.0.0.1** (an toàn) → FE chạy **cùng máy** (proxy same-origin) hoặc trỏ `apiBase` tới địa chỉ backend.
- Trình duyệt **không** chạm phần cứng audio; **backend** sở hữu toàn bộ audio I/O.

**Hợp đồng API (hiện trạng)**
- REST: `GET /health · /blocks · /audio/devices · /audio/outputs · /tts/voices · /live/fast` · `POST /audio/test_tone · /live/fast`.
- WS: **`/ws/live`** (phiên: nhận `config` → phát chuỗi event ở §1; nhận lệnh `{cmd:'set',patch}` giữa phiên; `{cmd:'ping'}→{type:'pong'}`) và **`/ws/meter`** (mức âm vào ngoài phiên).
- `LiveConfig`: `device/device_index · single_auto{model, mt_model, targets} · tts · outputs{vi,ja} · gains{vi,ja,master}(doc 32) · post_correct · hotwords · glossary`.
- Lệnh giữa phiên: `{audio:{gain}} · {tts:{on,rate,voice}} · {speaker} · {direction}` — áp lại khi reconnect (hotPatch).

---

## 5. THIẾU HỤT — nói thẳng (điều cần bổ sung cho chuyên nghiệp, không lỗi, mượt)

> Xếp theo mức ảnh hưởng. ⚠ = rủi ro cho gala; ⚙ = cần backend (Bước 0).

1. **⚠⚙ Hợp đồng FE–BE chưa kiểm end-to-end**: FE đã dựng đủ event, nhưng nhiều event là *scaffolding chưa xác nhận với backend thật* (`committed/speech_start/say`… "UNVERIFIED against a running backend"). → **Phải chạy Bước 0** khớp từng event với backend Mac trước gala.
2. **⚠⚙ Heartbeat auto-ping đang TẮT** (`HEARTBEAT_ENABLED=false`). Backend "treo im" (nhận rồi ngừng phát) có thể **không được phát hiện nhanh**. → Backend xác nhận `{ping}→{pong}` rồi **bật** cờ.
3. **⚙ Đo trễ E2E chưa THỰC**: nếu backend không gửi `e2e_ms`, HUD hiển thị **tổng các chặng** (`measured=false`) — không phải trễ cảm nhận thật. → Backend đo & gửi `e2e_ms` (mốc: câu-chốt → dòng lên sóng).
4. **Đồng bộ đa-MÁY**: các màn đồng bộ qua **BroadcastChannel = chỉ cùng máy/cùng origin**. Nếu dùng **nhiều máy tính** đẩy nhiều màn → **KHÔNG đồng bộ**; khi đó cần **bus mạng** (backend fan-out qua WS).
   → ✅ **Đã chốt (Quý Công Ty)**: gala dùng **MỘT máy điều khiển + nhiều màn ngoài (HDMI/LED)** → BroadcastChannel cùng-máy **ĐỦ**, thiếu hụt này **không áp cho gala này**. **Ràng buộc**: tuyệt đối **không** đẩy màn khán giả từ một máy tính khác (sẽ lệch); mọi màn phải là **màn ngoài của chính máy điều khiển**.
5. **⚙ Giám sát ngõ RA thiếu**: chưa có **VU meter đầu ra** (B2) → không xác nhận âm **thật sự ra loa**; âm lượng (B1) chưa áp. → doc 32.
6. **Suy giảm theo tầng (graceful degradation) chưa định nghĩa rõ**: STT lỗi vs MT lỗi vs TTS lỗi phải có ứng xử riêng (vd TTS chết → **vẫn giữ phụ đề**; MT chậm → giữ thứ tự `lid`, không đảo dòng). → Cần bảng ứng xử lỗi từng tầng.
7. **Dự phòng / chuyển đổi (failover) chưa có**: mic/loa/model/máy **dự phòng** + nút chuyển nhanh. Gala nên có đường lui.
8. **Đồng bộ Hình–Tiếng (A/V align)**: có `lag_ms` nhưng **chưa có bù trễ** (delay offset, B5) để khớp phụ đề với tiếng/khẩu hình.
9. **Matcher đọc file GLOBAL, chưa bám sự kiện** (giới hạn đã biết) → độ chính xác kịch bản/từ điển theo *buổi* chưa tối ưu (doc 29/30 đã mở đường FE).
10. **Ghi âm/lưu buổi** (`record`) chưa có pipeline + UI.

---

## 6. Đề xuất chuẩn hoá theo ưu tiên (để logic · không lỗi · mượt)

**P0 trước gala (bắt buộc):**
- Chạy **Bước 0** khớp hợp đồng WS thật (từng event ở §1) với backend Mac; **bật heartbeat**; **đo `e2e_ms` thực**.
- **VU meter ngõ ra + áp âm lượng** (doc 32).
- Chốt mô hình màn: **một máy điều khiển + nhiều màn ngoài (HDMI/LED)** để né giới hạn đồng bộ đa-máy; nếu buộc đa máy → bus mạng.
- Bảng **suy giảm theo tầng** + **đường lui dự phòng** (mic/loa/máy).

**Sau gala:**
- Bù trễ A/V (B5), bus đồng bộ mạng chính thức, matcher bám sự kiện, ghi âm/lưu buổi, PFL/monitor tai nghe.

---

## 7. Việc cần Quý Công Ty quyết
1. ✅ **Đã chốt**: gala dùng **một máy điều khiển + nhiều màn ngoài (HDMI/LED)** → không cần bus mạng (§5.4). Ràng buộc: không đẩy màn từ máy khác.
2. Duyệt **P0** (§6) để chuyển đội backend chạy Bước 0 + doc 32.
3. Có cần **đường lui dự phòng** (máy/mic/loa thứ 2) cho gala không?
