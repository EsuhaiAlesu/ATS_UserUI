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
| Bộ icon (đã sẵn, **app CHƯA nối**) | `public/proyaku/icon/` |

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

## Còn treo

Favicon vẫn đang là `public/favicon.svg` (bản cũ, trước khi có bộ nhận diện). Bộ icon
thương hiệu đã nằm sẵn ở `public/proyaku/icon/` — muốn đổi thì sửa thẻ `<link rel="icon">`
trong `index.html`.
