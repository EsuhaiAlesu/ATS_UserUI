# PROYAKU — Bộ tài sản nhận diện

**Phiên dịch Việt ⇄ Nhật** · Professional Translate

Logo **đã vector hoá hoàn toàn** — chữ và slogan đều là đường bao, không gọi phông nào.

---

## Bắt đầu từ đâu

**Cần logo ngay:** lấy `svg/proyaku-chinh.svg`. Mở ở máy nào cũng đúng.

**Cần hiểu quy tắc:** mở `quy-chuan/proyaku-quy-chuan-nhan-dien.html`. Tám phần, in ra được.

**Cần đổi phông hoặc màu:** mở `xuong-dung-logo.html`.

---

## Cây thư mục

```
proyaku/
├── README.md
├── logo.html                     xem nhanh các bản
├── xuong-dung-logo.html          đổi phông và màu, có sẵn mã dò
├── svg/                          VÉC-TƠ · ưu tiên dùng
│   ├── proyaku-chinh.svg         bản chính, nền tối như app
│   ├── proyaku-nen-sang.svg      cho nền sáng
│   ├── proyaku-trang.svg         một màu trắng
│   ├── proyaku-mot-mau.svg       một màu chàm
│   ├── proyaku-khong-slogan.svg  chỉ chữ
│   ├── proyaku-icon-vuong.svg    biểu tượng, khung vuông bo tròn
│   ├── proyaku-icon-tron.svg     biểu tượng, khung tròn
│   ├── proyaku-icon-trong.svg    biểu tượng, không nền
│   └── proyaku-outfit / instrumentsans / poppins.svg   ba ứng viên phông
│
├── png/                          512 tới 4096, kèm webp và jpg
├── in-an/                        PDF và EPS, khổ 150 mm
├── icon/                         favicon.ico 7 cỡ, png 16..1024, apple-touch-icon
├── react/ProyakuLogo.jsx         thành phần React
├── web/proyaku-logo.js           thẻ <proyaku-logo>
├── tokens/                       biến CSS và dữ liệu JSON có cả CMYK
└── quy-chuan/                    sổ tay tám phần
```

---

## Màu

| Phần | Nền tối | Nền sáng |
|---|---|---|
| Chữ PROYAKU | `#4ADE80` · 9,65:1 | `#007639` · 5,75:1 |
| Slogan | `#FB7185` · 6,25:1 | `#B42F4B` · 6,09:1 |
| Nền app | `#1C1D22` | — |

**Hai màu này chưa phải mã thật.** Thầy chốt lấy màu xanh lá của chữ *Họp Ban Quản Trị* và
màu đỏ-hồng-cam của app, nhưng em chưa đọc được — trang là ứng dụng JavaScript.

Màu đang dùng chọn trong **cùng bảng màu mà app dùng**: nền `#1C1D22` và chữ `#E7EAF3` đo
được từ ảnh cho thấy app dùng bảng tối kiểu Tailwind.

---

## Hình học

| Phần | Số đo | Nguồn |
|---|---|---|
| Tổng bề rộng chữ PROYAKU | 7,625 | đo từ ảnh web app |
| Giãn chữ | 0,1943 em | tính ngược từ tổng bề rộng, đã nới để bù nét |
| **Làm dày nét chữ** | **1,6 lần** | nét thêm 53,2 đơn vị, bề dày 70,07 trên khung |
| Bề rộng slogan | 83,3% | mượn từ DIATALENT |
| Hở tới slogan | 0,2553 | |
| Giãn chữ slogan | 0,21 em | |
| Căn slogan | giữa theo bề rộng chữ | |
| Làm dày nét slogan | **1,4 lần** | riêng của PROYAKU — DIATALENT không làm dày |
| Lề bảo vệ | 0,260 | đều bốn phía |

---

## Làm dày mà vẫn giữ đúng hai số đo gốc

Nét vẽ lan đều mọi phía nên chữ vừa cao lên vừa rộng ra. Phải bù cả hai:

- Hệ số phóng tính theo **chiều cao chữ hoa cộng bề dày nét** → chữ vẫn cao đúng 1000
- Giãn chữ tính ngược từ **bề rộng đã gồm nét** → nới từ 0,1355 lên **0,1943**

Đo lại trên file xuất: bề rộng **7,625** đúng như ảnh, chữ P cao **1000,0**. Chữ O cao 1031,6
vì vượt đường chuẩn 3,2% — trong ảnh Thầy gửi chữ O cũng vượt **3,1%**, nên khớp.

Đã kiểm lỗ chữ: lỗ chữ O thu từ đường kính 596 xuống **483** — hẹp đi 19% nhưng vẫn rộng.
Khoảng hở nhỏ nhất giữa các chữ gần như không đổi (94,2 → 95,0) vì giãn chữ tự tăng bù lại.

---

## Đưa vào mã

```jsx
import ProyakuLogo from './react/ProyakuLogo';

<ProyakuLogo />                        // nền tối, bản chính
<ProyakuLogo tone="light" />           // nền sáng
<ProyakuLogo form="text" />            // không slogan
<ProyakuLogo form="mark" width={48} /> // chỉ chữ P
```

```html
<link rel="stylesheet" href="tokens/proyaku-tokens.css">
<script src="web/proyaku-logo.js" defer></script>

<proyaku-logo></proyaku-logo>
<proyaku-logo tone="light" height="40"></proyaku-logo>
```

---

## Ba chỗ còn treo

| Chỗ treo | Đang dùng tạm | Cách gỡ |
|---|---|---|
| Tên phông chữ PROYAKU | Outfit Bold | Ba ứng viên chênh 3,5–4,0%, nằm trong sai số ±3% của ảnh 32 px |
| Mã màu xanh lá | `#4ADE80` | Dán đoạn mã trong `xuong-dung-logo.html` vào Console trang `/settings` |
| Mã màu đỏ-hồng-cam | `#FB7185` | — một lần lấy được cả ba |

**Gỡ xong thì dựng lại rất nhanh.** Mọi số đo hình học không đổi khi thay phông hay màu.

---

## Về biểu tượng

PROYAKU chưa có biểu tượng hình riêng. Em dựng tạm từ **chữ P** — cùng phông, cùng màu với logo.

Nếu cần một biểu tượng có hình như viên kim cương của DIATALENT hay cái miệng phát âm của
ENACTon, Thầy cho em biết ý nghĩa muốn gửi gắm, em dựng riêng.

---

Ngày 1 tháng 8 năm 2026
Lê Long Sơn
