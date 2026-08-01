# Bộ nhận diện PROYAKU — đọc dòng này trước

Thư mục `brand/` giữ **bộ nhận diện đầy đủ**: SVG, PNG tới 4096, PDF/EPS bản in,
sổ tay quy chuẩn, token màu, thành phần React/web-component.

**`brand/` KHÔNG được deploy.** Nó nằm trong git để cả nhóm lấy được, nhưng không
nằm trong `public/` — nên bản chạy trên mạng không kèm 3,7 MB này, và PDF bản in
cùng sổ tay quy chuẩn không thành công khai cho bất kỳ ai có link.

## App đang dùng file nào

| Dùng ở đâu | File |
|---|---|
| Logo trên head bar + ngăn điều hướng | `public/proyaku/svg/proyaku-chinh-nen-trong.svg` |
| Favicon (thẻ `<link rel="icon">` trong `index.html`) | `public/proyaku/svg/proyaku-icon-vuong.svg` |

`proyaku-chinh-nen-trong.svg` = y hệt `brand/svg/proyaku-chinh.svg`, **chỉ bỏ tấm nền
đặc `#1C1D22`**. Bản gốc có nền đặc, mà head bar của app là `#080c18` (đậm hơn), nên
để nguyên thì logo hiện thành một hộp xám nổi rõ. Bỏ nền đi thì chữ xanh `#4ADE80`
còn **tăng** tương phản chứ không giảm. Màu thương hiệu giữ nguyên không đổi một mã nào.

## Sửa logo thì làm gì

1. Sửa/thay trong `brand/` trước — đó là bản gốc.
2. Dựng lại bản nền trong rồi chép sang `public/proyaku/svg/`:
   ```
   perl -0pe 's{<rect width="100%" height="100%" fill="#1C1D22"/>}{}' \
     brand/svg/proyaku-chinh.svg > public/proyaku/svg/proyaku-chinh-nen-trong.svg
   ```
3. Xem lại ở 390px và 1280px — head bar là chỗ chật nhất, logo rộng ra là đè chữ.

## ⚠ LỖI TRONG BỘ KIT — cả bộ icon bị lệch khung

**Cả 3 bản SVG icon (`vuong`, `tron`, `trong`) và TẤT CẢ file PNG/`.ico` trong `brand/icon/`
đều bị lệch: chữ P bị đẩy gần hết ra ngoài khung, chỉ còn một vệt xanh ở mép trên.**

Nguyên nhân, đo bằng `getBBox()` trên trình duyệt chứ không đoán:

| | Đúng phải là | Kit đang để |
|---|---|---|
| Khung chữ P | 463,85 × 614,40 | — |
| `translate` x | `(1024−463,85)/2 = 280,08` | `280.08` ✅ đúng sẵn |
| `translate` y | `(1024−614,40)/2 = 204,80` | `-409.60` ❌ |

`-409,60 = 204,80 − 614,40` — người xuất đã **trừ nhầm nguyên chiều cao chữ**.

**Đã xử lý tạm:** `public/proyaku/svg/proyaku-icon-vuong.svg` (bản app dùng) đã sửa thành
`translate(280.08, 204.80)` và kiểm bằng mắt — chữ P cân giữa. `index.html` **chỉ khai bản SVG
này**, cố ý KHÔNG khai `.ico` và `apple-touch-icon`, vì hai file đó vẫn hỏng: khai vào thì trình
duyệt cũ hiện một ô đen với vệt xanh cụt, tệ hơn là không có gì.

**Cần làm cho đúng:** xuất lại cả bộ icon từ nguồn với y = 204,80, rồi:
1. thay `brand/svg/proyaku-icon-*.svg` + `brand/icon/*`,
2. chép bản vuông sang `public/proyaku/svg/`,
3. thêm lại 2 dòng `.ico` + `apple-touch-icon` vào `index.html`.

Kit gốc trong `brand/` Em **giữ nguyên chưa sửa**, để còn đối chiếu khi xuất lại.
