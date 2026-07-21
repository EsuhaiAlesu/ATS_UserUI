# 31 · Âm thanh chuyên nghiệp — Thiết bị loa, âm lượng & giám sát ngõ ra

> Đề xuất rà soát & bổ sung cho **Bàn điều khiển dịch** (`/audio` · `AudioRouting.tsx`).
> Mục tiêu: đưa phần quản lý loa/âm thanh của PROYAKU lên đúng chuẩn một **console
> phiên dịch chuyên nghiệp** — nhưng **khả thi**, **an toàn cho gala 8/8**, và **trung thực**
> về giới hạn kiến trúc (trình duyệt + backend Mac Studio).

---

## 0. TL;DR (đọc nhanh)

- Hiện app đã có: **chọn mic** · **chọn loa theo kênh VI/JA** · **test tone** · **VU meter đầu vào** · **pre-flight**. Đây là nền tốt.
- Thiếu so với console chuyên nghiệp: **âm lượng/gain (quan trọng nhất)** · **VU meter ĐẦU RA** · **quét lại thiết bị** · **mute/solo** · **bù trễ** · **bus nghe riêng (tai nghe)** · **hồ sơ âm thanh theo hội trường**.
- ⚠ **Sự thật kiến trúc**: trình duyệt **không** quét RF, **không** ghép Bluetooth, **không** điều khiển phần cứng. Việc "scan loa" thực chất = ghép thiết bị ở macOS → backend liệt kê → app **Quét lại** để cập nhật danh sách. RF là **hệ phần cứng riêng** (Bosch/Sennheiser), ngoài tầm app.
- ⚠ **Khuyến nghị chuyên môn cho gala**: **KHÔNG dùng loa Bluetooth cho dịch trực tiếp** (trễ 100–300 ms + nén lossy). Dùng loa **có dây / USB / interface / Dante**.
- Ưu tiên gala (còn ~18 ngày): làm ngay **Tầng A** (FE-only, an toàn) + đề xuất **B1 âm lượng** & **B2 VU ngõ ra** cho đội backend.

---

## 1. Hiện trạng (đã rà trong code)

| Chức năng | Nơi | Ghi chú |
|---|---|---|
| Chọn mic đầu vào | `AudioRouting.tsx` (`inputDevice`, `/audio/devices`) | select trong ngăn Cài đặt |
| Chọn loa ngõ ra theo kênh | `outVi` / `outJa` → `outputs:{vi,ja}` (`/audio/outputs`) | 2 select "Loa VI" / "Loa JA" |
| Test tone từng loa | `playTestTone(device)` (`/audio/test_tone`) | nút "Test loa VI/JA" |
| VU meter **đầu vào** | `useMeter` + WS `/api/ws/meter` (`level`,`rms`) | chỉ đo mic, **không đo ngõ ra** |
| Pre-flight | `preflight[]` | mic đã chọn · ngõ ra VI/JA · VI≠JA |
| TTS on/off · tốc độ · fast-mode | `ttsPrefs`, `setLiveFast` | — |

**Hợp đồng backend hiện có** (`api.ts`): `AudioInputDevice{index,name,channels,sr}`,
`AudioOutputDevice{index,name}`, `AudioDevices{devices,default,speakers?,default_speaker?}`,
`LiveConfig.outputs: Record<string,number>` (**chỉ map kênh→chỉ số thiết bị, KHÔNG có gain**).

**Kết luận**: hợp đồng hiện tại **không có bất kỳ khái niệm âm lượng/gain/mute/monitor nào**, và
chỉ đo mức **đầu vào**. Đây là khoảng trống lớn nhất so với console chuyên nghiệp.

---

## 2. Sự thật kiến trúc (quyết định "làm được / không làm được")

```
[Trình duyệt · React FE]  ──HTTP/WS──►  [Backend · Mac Studio · CoreAudio/PortAudio]  ──►  Loa/Interface
     (UI, điều khiển)                        (sở hữu toàn bộ audio I/O thật)
```

- **Trình duyệt KHÔNG thể**: quét RF; ghép (pair) Bluetooth; điều khiển phần cứng cấp thấp;
  đặt âm lượng thiết bị hệ thống. (`navigator.bluetooth` chỉ cho thiết bị BLE/GATT, **không** dùng để
  ghép loa nhạc A2DP; `setSinkId` cũng vô nghĩa vì audio **không** phát từ trình duyệt.)
- **Backend (Mac Studio) CÓ thể**: liệt kê **mọi thiết bị macOS đang thấy** — có dây, USB,
  loa Bluetooth **đã ghép sẵn ở macOS**, thiết bị ảo (Dante Virtual Soundcard, Loopback, Aggregate Device).
- Vì vậy **"scan loa Bluetooth"** trong thực tế = quy trình 3 bước:
  1. Ghép loa BT **một lần** trong *System Settings → Bluetooth* của macOS;
  2. Backend `/audio/outputs` sẽ liệt kê loa đó;
  3. App bấm **"Quét lại thiết bị"** để cập nhật danh sách (nhặt thiết bị mới ghép).
- **RF / IR phân phối ngôn ngữ** (Bosch Integrus, Sennheiser…) là **hệ phần cứng độc lập**: app
  không điều khiển được; nếu Quý Công Ty dùng thì chỉ cần **đưa tín hiệu mỗi ngôn ngữ ra một ngõ audio**,
  bộ phát RF nhận từ ngõ đó. App chỉ việc **route đúng ngõ**.

> **Nguyên tắc phân việc**: FE đề xuất UI + hợp đồng API; **đội backend của Quý Công Ty triển khai** phần
> chạm audio thật. Tài liệu này **không** yêu cầu chỉnh/deploy backend — chỉ đề xuất hợp đồng để hai bên khớp.

---

## 3. Đề xuất theo 3 tầng khả thi

### Tầng A — FE làm được ngay, KHÔNG cần đổi backend (an toàn cho gala)

| # | Tool / chức năng | Mô tả | Giá trị |
|---|---|---|---|
| **A1** | **Quét lại thiết bị** | Nút "🔄 Quét lại" gọi lại `/audio/devices`+`/audio/outputs`; hiện thời điểm quét gần nhất. Nhặt loa BT/USB vừa cắm mà không cần mở lại app. | Cao |
| **A2** | **Danh sách thiết bị chuyên nghiệp** | Icon theo loại (Bluetooth / USB / tích hợp / ảo — suy ra từ tên) + nhãn mặc định + sample-rate. Thấy rõ "đang chọn cái gì". | Cao |
| **A3** | **Trợ lý kiểm tra loa (Sound-check)** | Nâng test tone thành quy trình có hướng dẫn: phát lần lượt từng kênh, người vận hành xác nhận "nghe rõ" → tick từng loa. Trạng thái xanh khi cả 2 kênh OK. | Cao |
| **A4** | **Hồ sơ âm thanh theo hội trường** | Lưu/gọi lại bộ (mic + loa VI + loa JA + nhãn) theo từng nơi: "Hội trường A", "Phòng họp BOD"… (localStorage). Không phải chọn lại mỗi lần. | Cao |
| **A5** | **Nhãn vùng loa** | Đặt tên vùng cho mỗi ngõ ("Sân khấu", "Khu VIP", "Cabin") thay vì chỉ tên thiết bị thô. | TB |
| **A6** | **Hướng dẫn ghép Bluetooth** | Panel ngắn: "Ghép loa BT trong macOS → bấm Quét lại". Trung thực về việc pairing là cấp OS; kèm cảnh báo trễ (mục 4). | TB |
| **A7** | **Pre-flight mở rộng** | Thêm cảnh báo: loa VI trùng loa JA · sample-rate lệch mic/loa · thiết bị đã chọn nay biến mất khỏi danh sách. | Cao |

### Tầng B — CẦN backend bổ sung API (FE đề xuất hợp đồng; backend triển khai)

| # | Tool / chức năng | Hợp đồng đề xuất | Ưu tiên |
|---|---|---|---|
| **B1** | **Âm lượng từng kênh + master** ⭐ | Mở rộng `outputs` → `{vi:{device,gain}, ja:{device,gain}}` + `master_gain`; và lệnh giữa phiên `{cmd:'set', audio:{gain:{vi,ja,master}}}`. **Đây là chức năng chuyên nghiệp thiếu nhất.** | P0 |
| **B2** | **VU meter NGÕ RA từng kênh** | Backend phát thêm mức đầu ra qua WS (hiện chỉ có `level` đầu vào): `{type:'out_level', vi:0.x, ja:0.x, clip:bool}`. Xác nhận âm thanh **thật sự ra loa**. | P0/P1 |
| **B3** | **Mute / Solo từng kênh + Master mute (panic)** | Lệnh `{cmd:'set', audio:{mute:{vi,ja,master}}}`. Nút "Tắt tiếng khẩn" đỏ cạnh nút DỪNG. | P1 |
| **B4** | **Trim/gain mic + limiter/AGC + noise-gate** | Tham số đầu vào trong `LiveConfig` + patch giữa phiên. Làm sạch tiếng nói nguồn (giảm ù, chống méo khi to). | P1 |
| **B5** | **Bù trễ / đồng bộ (latency offset)** | `audio:{delay_ms}` — trễ audio khớp khẩu hình/màn LED. | P2 |
| **B6** | **Bus nghe riêng (PFL/monitor) qua tai nghe** | Cho vận hành nghe thử 1 kênh bằng tai nghe **không** ảnh hưởng loa hội trường. | P2 |
| **B7** | **Cảnh báo hú/feedback (howl guard)** | Backend phát cảnh báo khi phát hiện cộng hưởng; app hiện đèn đỏ. | P2 |
| **B8** | **Sức khoẻ thiết bị realtime** | WS báo dropout/xrun/mất kết nối thiết bị; app hiện trạng thái. | P1 |

### Tầng C — Phần cứng / OS (ngoài phạm vi app; app chỉ hỗ trợ)

| # | Hạng mục | Vai trò của app |
|---|---|---|
| **C1** | **RF/IR phân phối ngôn ngữ** (Bosch Integrus, Sennheiser) | App **không điều khiển**; chỉ route mỗi ngôn ngữ ra một ngõ audio để bộ phát RF nhận. |
| **C2** | **Ghép Bluetooth** | Cấp macOS. App chỉ liệt kê + Quét lại + hướng dẫn (A6) + **cảnh báo không dùng cho gala** (mục 4). |
| **C3** | **Dante / AVB (audio mạng)** | Backend dùng thiết bị ảo (Dante Virtual Soundcard); app chỉ **chọn ngõ** như loa thường. Đây mới là hướng "chuyên nghiệp" đúng cho hội trường lớn. |

---

## 4. ⚠ Khuyến nghị chuyên môn cho gala 8/8

- **KHÔNG dùng loa Bluetooth cho dịch trực tiếp.** BT (A2DP) trễ 100–300 ms và nén lossy → phá đồng bộ khẩu hình, chồng tiếng. Chỉ chấp nhận BT cho nhạc nền, không cho lời dịch.
- **Nên dùng**: loa **có dây / USB / audio interface**, hoặc **Dante** (C3) cho hội trường lớn — độ trễ thấp, ổn định, nhiều kênh.
- **Luôn có đường lui**: loa/interface dự phòng + bài test loa (A3) chạy trong buổi diễn tập (7/8).
- **Tách kênh vật lý**: VI và JA nên ra **2 ngõ/2 vùng loa khác nhau** (pre-flight A7 đã kiểm "VI≠JA").

---

## 5. Ưu tiên đề xuất cho gala (còn ~18 ngày)

**Làm ngay (FE-only, an toàn, không đụng backend):**
1. **A1** Quét lại thiết bị
2. **A3** Trợ lý kiểm tra loa (sound-check)
3. **A4** Hồ sơ âm thanh theo hội trường
4. **A7** Pre-flight mở rộng
5. **A2/A5/A6** Danh sách thiết bị đẹp + nhãn vùng + hướng dẫn BT

**Đề xuất backend (nếu kịp trước gala, theo thứ tự giá trị):**
1. **B1** Âm lượng từng kênh + master ⭐
2. **B2** VU meter ngõ ra
3. **B8** Sức khoẻ thiết bị · **B3** Mute/panic

**Sau gala:** B4 (trim/limiter), B5 (bù trễ), B6 (PFL monitor), B7 (howl guard).

---

## 6. Tool lân cận nên cân nhắc (rà rộng theo yêu cầu)

- **Ghi âm & lưu trữ buổi dịch**: `LiveConfig.record` đã có field nhưng **chưa có UI** quản lý bật/tắt + tải file. Hữu ích để rút kinh nghiệm & lưu tư liệu.
- **Chế độ "diễn tập âm thanh"**: một mode chạy sound-check + đo trễ mà không lên sóng khán giả.
- **Bảng cắm dây (I/O map) in được**: sơ đồ mic→backend→loa để bàn giao cho ê-kíp âm thanh hội trường.

---

## 7. Việc cần Quý Công Ty quyết

1. **Chốt danh sách Tầng A** để em triển khai ngay (FE-only, an toàn).
2. **Duyệt hợp đồng B1/B2** để chuyển đội backend (âm lượng + VU ngõ ra là 2 thứ "chuyên nghiệp" đáng giá nhất).
3. **Xác nhận thiết bị thật của gala**: loa có dây/USB/Dante? (để em chỉnh pre-flight & hướng dẫn cho đúng).
