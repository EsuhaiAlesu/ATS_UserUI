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
| Favicon — trình duyệt hiện đại | `public/proyaku/svg/proyaku-icon-vuong.svg` |
| Favicon — trình duyệt cũ / Windows | `public/proyaku/icon/favicon.ico` |
| Ghim màn hình chính iPad/iPhone | `public/proyaku/icon/apple-touch-icon.png` |

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

## Lịch sử: lỗi lệch khung icon — ĐÃ XONG

Bộ kit lần đầu bị lệch khung: cả 3 bản SVG icon và toàn bộ PNG/`.ico` đều đẩy chữ P gần
hết ra ngoài, chỉ còn một vệt xanh ở mép trên. Nguyên nhân là `translate` y để `-409.60`
thay vì `204.80` (`-409,60 = 204,80 − 614,40` — trừ nhầm nguyên chiều cao chữ).

**Bộ kit hiện tại đã được xuất lại đúng** (`translate(274.80, 204.80)`), chữ P cân giữa và
được vẽ lại bo góc. Đã kiểm bằng mắt cả bản SVG lẫn bản PNG 512. Không còn phải vá gì ở
phía app, và `index.html` đã khai lại đủ `.ico` + `apple-touch-icon`.

Ghi lại đây để nếu bộ kit được xuất lại lần nữa thì có cái mà đối chiếu: **lắp xong phải mở
trình duyệt nhìn**, đừng tin file chạy được là file đúng — lần đó `tsc`, `build`, `curl 200`
đều xanh trong khi icon hỏng hoàn toàn.
