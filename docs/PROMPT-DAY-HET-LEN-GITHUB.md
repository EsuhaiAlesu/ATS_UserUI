# VIỆC NHỎ — đẩy hết code lên GitHub cho sạch nợ

Máy anh đang giữ code mới hơn code trên GitHub. Bản chạy thật (Railway) chỉ lấy code từ GitHub,
nên phần nào chưa đẩy lên thì buổi lễ sẽ **không có** phần đó.

Làm đúng 5 bước dưới đây, không làm gì thêm.

---

## Bước 1 — xem còn gì chưa lưu

```
git status
```

## Bước 2 — nếu còn tệp chưa lưu thì lưu hết vào một lần

```
git add -A
git commit -m "PHẦN 6: dẫn theo kịch bản"
```

Nếu bước 1 báo sạch (`nothing to commit`) thì bỏ qua bước 2.

## Bước 3 — đẩy lên GitHub

```
git push origin develop
```

## Bước 4 — kiểm lại đã lên thật chưa

```
git log --oneline -3
git status -sb
```

Dòng đầu của `git status -sb` phải KHÔNG còn chữ `ahead`. Nếu vẫn còn `ahead` là chưa lên,
báo lại nguyên văn dòng đó.

## Bước 5 — báo lại cho tôi 3 con số

1. Mã commit mới nhất (7 ký tự)
2. Kết quả `npx vitest run` — bao nhiêu ca đạt / bao nhiêu tệp
3. Dòng `git status -sb`

---

## Không được làm

- `git push --force` (hoặc `-f`)
- `git reset --hard`, `git rebase`, `git clean`
- Xóa nhánh, đổi tên nhánh
- Sửa thêm bất kỳ dòng code nào trong lần này

Nếu `git push` báo lỗi (bị chặn, hết hạn đăng nhập, xung đột) thì **dừng lại**, chép nguyên văn
lỗi gửi tôi. Đừng tự xử lý bằng lệnh mạnh.

## Sau khi đẩy xong

Vào Railway, chọn dự án, bấm **Redeploy** để bản chạy thật lấy code mới. Xong báo tôi một câu:
"Đã đẩy xong, đã Redeploy".
