# 35 · Nhận diện LOẠI thiết bị loa (Bluetooth/RF/HDMI/USB…) + chuẩn hoá "chọn thiết bị"

> Trả lời câu hỏi của Quý Công Ty: các app chuyên nghiệp có **danh sách thiết bị nhận diện qua Bluetooth / RF / HDMI…** — mình đã có ở BE chưa, và **logic đúng-mượt-chuyên nghiệp** nên làm thế nào?
> Liên quan: [31](31-am-thanh-thiet-bi-loa-va-am-luong.md) (âm thanh/loa/âm lượng), [32](32-giao-viec-backend-am-luong-vu-ngo-ra.md) (giao việc BE âm lượng), [34](34-xuat-phu-de-da-man-dinh-tuyen.md) (xuất phụ đề = màn hình), [27](27-giao-viec-backend-buoc-0.md) (Bước 0).

---

## 0. TL;DR

- **Trước hết phải tách 2 khái niệm** hay bị gộp nhầm:
  - **Xuất PHỤ ĐỀ (chữ) → MÀN HÌNH** (HDMI/DisplayPort/LED). Đây là thiết bị **HIỂN THỊ**, do **trình duyệt** liệt kê (Window Management API) — **KHÔNG phải Bluetooth/RF**, **KHÔNG phải BE**. → **ĐÃ CÓ** (doc 34 · Bước 2: "Quét màn hình").
  - **Loa (Bluetooth/RF/USB/HDMI-audio) → TIẾNG** (giọng đọc TTS). Đây là thiết bị **ÂM THANH** của CoreAudio, do **backend Mac Studio** liệt kê. → thuộc **định tuyến âm thanh** (Cài đặt · thiết bị), **không** thuộc menu xuất phụ đề.
- **BE đã có** endpoint liệt kê loa (`GET /audio/outputs`) nhưng **mỗi thiết bị chỉ có `{index, name}` — THIẾU trường "loại" (transport)**. FE hiện **đoán loại từ TÊN** (regex `deviceKind()`), chỉ là phỏng đoán.
- **Sự thật kỹ thuật:** trình duyệt **và cả backend** KHÔNG "quét sóng + ghép" Bluetooth/RF. Việc ghép BT / nhận RF là của **hệ điều hành** (macOS). App chỉ **ĐỌC danh sách OS đã ghép** + hiển thị loại + cảnh báo.
- **Đề xuất:** nâng hợp đồng BE để trả **`transport` + `connected`** thật (từ CoreAudio `kAudioDevicePropertyTransportType`), FE hiển thị **badge loại thật** thay heuristic. Ưu tiên: **Bước 0 trước**, rồi mới thêm trường này.

---

## 1. Phân biệt PHẢI nắm — màn hình (phụ đề) vs loa (âm thanh)

| | Ngõ ra | Cơ chế đúng | Ai liệt kê | Hiện trạng |
|---|---|---|---|---|
| **Phụ đề (chữ)** | Màn hình HDMI/DP/LED | Cửa sổ trình duyệt trên màn · **Window Management API** | Trình duyệt | ✅ Đã có (doc 34 · Bước 2) |
| **Loa (tiếng)** | Bluetooth/RF/USB/HDMI-audio/built-in | Thiết bị CoreAudio | **Backend Mac Studio** | ⚠ Có list nhưng thiếu "loại" |

**Hệ quả:** trong **menu xuất phụ đề**, "thiết bị" đúng nghĩa = **màn hình** (đã làm đúng). **Bluetooth/RF không nằm ở đây** — chúng là ÂM THANH, thuộc phần định tuyến loa. Nhét BT/RF vào menu phụ đề là **sai phạm trù** (phụ đề là hình, không phải tiếng).

---

## 2. Hiện trạng (kiểm chứng theo `src/lib/api.ts` + `AudioRouting.tsx`)

**BE — endpoint đã có:**
- `GET /audio/devices` → mic vào: `AudioInputDevice { index, name, channels, sr }` + `speakers?: {name}[]`.
- `GET /audio/outputs` → loa ra: `AudioOutputDevice { index, name }` · `default` · `error?`.
- ⟹ **Chỉ `index` + `name`. KHÔNG có `transport`/`type`/`connected`.**

**FE — hiện xử lý bằng phỏng đoán (Tầng A, doc 31):**
- `deviceKind(name)` — regex trên TÊN: chứa `bluetooth/airpod/a2dp/bt` → Bluetooth (cảnh báo trễ); `hdmi/display` → HDMI; `usb` → USB; `aggregate/loopback/blackhole/virtual` → Ảo; `built-in/mac studio…` → Tích hợp; còn lại → Loa.
- Có nút **"Quét lại thiết bị"** + hiển thị icon/nhãn loại + **cảnh báo BT trễ cao**.
- ⚠ Đây là **đoán tên** — sai nếu thiết bị đặt tên lạ (vd loa BT tên "JBL Go" không có chữ "bluetooth" → đoán nhầm "Loa").

**Chưa kiểm chứng:** cả hợp đồng audio này thuộc **Bước 0** (backend chưa chạy trên Mac) — chưa biết `/audio/outputs` thật trả gì.

---

## 3. Sự thật kỹ thuật — đừng vẽ thứ không làm được

- **Trình duyệt web KHÔNG** route âm thanh hệ thống ra loa BT, **KHÔNG** ghép Bluetooth, **KHÔNG** quét RF. (Web Bluetooth chỉ cho thiết bị BLE dữ liệu, không phải ngõ ra audio hệ thống.)
- **Backend cũng KHÔNG "dò sóng"**: nó chỉ **đọc danh sách CoreAudio** mà macOS đã có. Ghép Bluetooth / nhận RF là **việc của OS**:
  - **Bluetooth:** ghép ở **macOS → Settings → Bluetooth**. Ghép xong → thiết bị xuất hiện trong CoreAudio → BE liệt kê → FE hiển thị.
  - **RF:** micro/loa không dây RF đi qua **receiver (dongle)**. Cắm dongle vào Mac → nó hiện ra như **thiết bị audio USB/analog** trong CoreAudio → liệt kê bình thường. **Không có "quét RF" riêng** — chỉ cần cắm dongle.
- ⟹ Các app "pro" cũng chỉ **đọc danh sách OS + hiển thị loại + cảnh báo**; phần ghép do OS lo. Mô hình của mình phải theo đúng sự thật này để **mượt và không lỗi**.

---

## 4. Thiết kế đề xuất

### A. Phụ đề (màn hình) — giữ nguyên hướng đúng
- Window Management API (Quét màn hình + gán màn) — đã có.
- **Sau gala:** lắng nghe `screenschange` để tự cập nhật khi cắm/rút màn (doc 34 · Bước 3).
- **Không** đưa BT/RF vào menu phụ đề.

### B. Loa (nơi BT/RF thực sự thuộc về) — nâng BE + FE

**B1. Nâng hợp đồng BE** — mỗi thiết bị trả thêm **loại thật** (không đoán):

```jsonc
// GET /audio/outputs  (và /audio/devices tương tự cho mic)
{
  "devices": [
    {
      "index": 3,
      "name": "WH-1000XM5",
      "transport": "bluetooth",   // MỚI: bluetooth | usb | hdmi | displayport | builtin | airplay | aggregate | virtual | unknown
      "connected": true,          // MỚI: còn kết nối không (thiết bị đã ghép nhưng rời → false)
      "default": false,           // (tuỳ) có phải ngõ ra mặc định OS
      "latency_hint_ms": 180      // (tuỳ) gợi ý trễ nếu BE ước lượng được (BT thường cao)
    }
  ],
  "default": 3,
  "error": null
}
```

- **Nguồn `transport`:** macOS CoreAudio có **`kAudioDevicePropertyTransportType`** → trả đúng: `BLUETOOTH` / `USB` / `HDMI` / `DisplayPort` / `BuiltIn` / `AirPlay` / `Aggregate` / `Virtual`. BE map sang enum trên. **Chính xác, không phụ thuộc tên.**
- `connected`: dùng `kAudioDevicePropertyDeviceIsAlive`/presence để biết thiết bị đã-ghép-nhưng-rời.
- **Tương thích ngược:** FE vẫn chạy nếu thiếu `transport` (rơi về `deviceKind()` đoán tên). Nên là **bổ sung**, không phá vỡ.

**B2. FE tiêu thụ:**
- Hiển thị **tên + badge loại THẬT** (icon Bluetooth/HDMI/USB/AirPlay…) — thay heuristic bằng `device.transport` khi có.
- **Cảnh báo trễ** cho `transport === 'bluetooth'` (đang có, nâng từ đoán-tên lên type-thật).
- Nút **"Quét lại"** (đã có) + dòng hướng dẫn: *"Ghép Bluetooth / cắm receiver RF ở macOS → Settings trước, rồi bấm Quét lại."*
- Ẩn/đánh dấu thiết bị `connected: false` (đã ghép nhưng rời) để không chọn nhầm.

---

## 5. Giao việc Backend (cụ thể, cho BE dev)

| # | Việc | Chi tiết | Nghiệm thu |
|---|---|---|---|
| BE‑35.1 | Thêm `transport` vào `/audio/outputs` và `/audio/devices` | Đọc `kAudioDevicePropertyTransportType` mỗi thiết bị, map sang enum `bluetooth\|usb\|hdmi\|displayport\|builtin\|airplay\|aggregate\|virtual\|unknown` | Ghép 1 loa BT + cắm 1 màn HDMI → list trả đúng `bluetooth` và `hdmi` |
| BE‑35.2 | Thêm `connected` (present/alive) | Thiết bị đã ghép nhưng đang rời → `connected:false` | Tắt loa BT → lần quét sau `connected:false` hoặc mất khỏi list |
| BE‑35.3 | (tuỳ) `latency_hint_ms` | Nếu ước lượng được độ trễ ngõ ra | Có số cho BT (cao), thấp/0 cho USB/built-in |
| BE‑35.4 | Giữ tương thích | Không đổi `index/name`; chỉ THÊM trường | FE cũ (chưa đọc `transport`) vẫn chạy |

**Không thuộc BE (nói rõ để khỏi hiểu nhầm):** quét/ghép Bluetooth, quét RF, đẩy phụ đề ra màn. Ghép BT/RF = OS; phụ đề ra màn = trình duyệt (Window Management).

---

## 6. Trình tự / ưu tiên (thực tế — đừng làm ngược)

1. **Bước 0 trước** — chạy + kiểm chứng backend trên Mac Studio; xác nhận `/audio/outputs` thật trả gì (doc 27).
2. **BE‑35.1/35.2** — thêm `transport` + `connected` (việc BE dev; FE tiêu thụ do mình làm sau khi BE xác nhận shape).
3. **FE** — dùng type thật thay heuristic; giữ nút quét lại + hướng dẫn ghép ở OS.
4. **Sau gala** — `screenschange` cho màn hình (doc 34 · Bước 3).

---

## 7. Khuyến nghị gala 8/8

- **Loa cho dịch trực tiếp: dùng CÓ DÂY / USB / HDMI‑audio** (trễ thấp, ổn định). **TRÁNH Bluetooth** (trễ cao — làm phụ đề/tiếng lệch nhịp; app đã cảnh báo sẵn).
- Ghép mọi thiết bị BT / cắm dongle RF **ở macOS TRƯỚC** buổi chạy, rồi "Quét lại" trong app để chắc chúng đã vào danh sách.
- Màn phụ đề (HDMI/LED): cắm trước, "Quét màn hình" trong console để gán đúng màn (doc 34).

---

## 8. Việc cần Quý Công Ty quyết
1. Duyệt hợp đồng BE‑35.1/35.2 để em chuyển cho BE dev (kèm doc 27 khi chạy Bước 0).
2. Chốt danh sách loa thật của gala (BT hay có dây?) — để em bật đúng cảnh báo/khuyến nghị.
