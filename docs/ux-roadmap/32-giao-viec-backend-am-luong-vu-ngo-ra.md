# 32 · Giao việc Backend — Âm lượng ngõ ra & VU meter đầu ra

> Kèm theo [doc 31](31-am-thanh-thiet-bi-loa-va-am-luong.md) (B1, B2).
> **FE đã làm xong phần của mình** (UI + gửi lệnh, đã build & test). Tài liệu này là **hợp đồng**
> để đội backend (Mac Studio) triển khai phần áp âm lượng vào audio thật.
> Nguyên tắc: FE **không** chạm backend; hai bên khớp qua hợp đồng dưới đây.

---

## 0. Tình trạng hiện tại

- **FE đã có** (trang Điều khiển `/audio`): nút **"Âm lượng"** mở panel 3 fader **Tổng / VI / JA** (0–100%),
  và fader âm lượng cạnh mỗi loa trong ngăn Cài đặt. Giá trị lưu tại máy (`localStorage: proyaku_audio_vol`).
- **FE đã GỬI SẴN lệnh** (an toàn — backend chưa hiểu thì bỏ qua, không lỗi):
  - Lúc **BẮT ĐẦU**: trường `gains` trong bản tin config đầu tiên của WS `/ws/live`.
  - **Giữa phiên** (kéo fader): bản tin `{cmd:'set', id, patch:{audio:{gain:…}}}`.
  - **Khi reconnect**: FE tự gửi lại config (có `gains`) rồi gửi lại `set` (FE đã xử lý — backend không cần lo).
- **Cần backend làm**: đọc `gains` / `audio.gain` và **nhân vào tín hiệu ra** từng kênh trước khi phát ra loa.
- Khi backend xong: báo FE **lật cờ** `AUDIO_GAIN_BACKEND_READY = true` trong `src/pages/AudioRouting.tsx`
  (để bỏ dòng chú thích "chờ backend").

---

## B1 · Âm lượng ngõ ra (per-channel + master) — **ưu tiên P0**

### 1.1 Lúc bắt đầu phiên (config đầu tiên qua WS `/ws/live`)

Bản tin config (hiện có) nay có thêm trường `gains`:

```jsonc
{
  "device": "mic",
  "device_index": 3,
  "single_auto": { "...": "..." },
  "outputs": { "vi": 5, "ja": 7 },      // đã có: kênh → CHỈ SỐ thiết bị ngõ ra
  "gains":   { "vi": 1.0, "ja": 0.8, "master": 1.0 }  // MỚI: hệ số âm lượng 0.0–1.0
}
```

- `gains.vi`, `gains.ja`, `gains.master`: **float 0.0–1.0**, đơn vị tuyến tính, **unity = 1.0** (không đổi).
- **Không khuếch đại > 1.0** (FE chỉ cho suy giảm, tránh méo/clip).
- Thiếu trường nào → coi như **1.0**. `gains` vắng mặt hoàn toàn → giữ nguyên hành vi cũ.

### 1.2 Giữa phiên (kéo fader) — bản tin `set` qua WS `/ws/live`

```jsonc
{ "cmd": "set", "id": "c12", "patch": { "audio": { "gain": { "vi": 1.0, "ja": 0.6, "master": 0.9 } } } }
```

- FE luôn gửi **đủ cả 3 giá trị** (snapshot), nên backend có thể **thay thế** thẳng, không cần merge.
- Nếu có thể, backend **trả ack**: `{ "type": "ack", "id": "c12", "ok": true }` (không bắt buộc; FE đã có timeout + gửi lại 1 lần).

### 1.3 Ngữ nghĩa áp dụng (đề xuất)

- **Âm lượng hiệu dụng mỗi kênh = gain_kênh × gain_master.**
  - Ví dụ: `vi=1.0, master=0.9` → kênh VI phát ở hệ số `0.9`.
- Áp **mượt** (fade ~20–50 ms) khi đổi giá trị để tránh "tách/pop".
- Áp cho **từng ngõ ra** tương ứng (`outputs.vi` → loa VI, `outputs.ja` → loa JA).
- `0.0` = im lặng kênh đó (không phải "mute" logic — chỉ là gain 0).

### 1.4 Tiêu chí nghiệm thu B1

1. Đặt `gains.ja=0.5` lúc bắt đầu → loa JA nhỏ hơn rõ rệt so với VI.
2. Kéo fader **Tổng** xuống giữa phiên → **cả hai** kênh nhỏ đi ngay (trong ~1 s), không pop.
3. Kéo fader **VI** → chỉ VI đổi, JA giữ nguyên.
4. Rớt mạng rồi kết nối lại → âm lượng **giữ đúng** mức đang đặt (FE gửi lại; backend áp lại).
5. Backend cũ (chưa hỗ trợ) nhận `gains`/`audio.gain` → **không lỗi, không crash** (bỏ qua trường lạ).

---

## B2 · VU meter ĐẦU RA (mức âm ra loa từng kênh) — P1

Hiện WS chỉ phát mức **đầu vào** (`level`/`rms` ở `/ws/meter`). Đề xuất backend phát thêm mức **đầu ra**
trên WS `/ws/live` để FE dựng đồng hồ VU xác nhận "âm thật sự ra loa":

```jsonc
{ "type": "out_level", "vi": 0.42, "ja": 0.0, "clip_vi": false, "clip_ja": false }
```

- `vi`, `ja`: mức ra **sau khi đã áp gain**, 0.0–1.0 (peak hoặc RMS — ghi rõ loại).
- `clip_*`: cờ quá tải (đỉnh chạm trần) để FE cảnh báo đỏ.
- Nhịp ~**15–20 Hz** là đủ mượt cho mắt.
- FE sẽ hiện 2 thanh VU (VI/JA) cạnh fader — khi có event này FE tự bật; không có thì ẩn.

### Tiêu chí nghiệm thu B2

1. Khi có tiếng ra loa VI → thanh VU VI nhảy; JA im → VU JA đứng yên.
2. Đẩy `master`/`vi` lên cao gây quá tải → `clip_vi=true`, FE hiện cảnh báo.

---

## Ghi chú an toàn (quan trọng cho gala)

- Mọi trường mới (`gains`, `audio.gain`, `out_level`) **thuần cộng thêm** — backend cũ bỏ qua là **an toàn**.
- **Không** đổi ngữ nghĩa `outputs` (vẫn là kênh→chỉ số thiết bị).
- Gợi ý an toàn: nếu backend nhận gain **ngoài [0,1]** thì **kẹp** về [0,1] thay vì tin tuyệt đối.

---

## Tóm tắt việc cho backend

| Việc | Ưu tiên | Đầu vào từ FE | Backend cần làm |
|---|---|---|---|
| **B1** Âm lượng VI/JA/master | P0 | `config.gains` + `set{audio.gain}` (WS `/ws/live`) | Nhân gain vào tín hiệu ra từng kênh, fade mượt, (ack) |
| **B2** VU meter đầu ra | P1 | — | Phát `{type:'out_level', vi, ja, clip_*}` ~15–20 Hz |
| Bật cờ FE | sau khi xong | — | Báo FE lật `AUDIO_GAIN_BACKEND_READY=true` |
