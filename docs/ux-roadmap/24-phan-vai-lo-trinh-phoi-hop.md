# 24 — Phân vai & Phối hợp đội (chống dẫm nhau)

> **Nhiều người/agent trên 1 repo** (CodeLong · HoangKha · anh Hiên · Claude Code · các agent). Tài liệu này chốt **ai làm gì · phụ thuộc ra sao · 1 người push** để không lặp lại vụ suýt force-push. Trạng thái sống ở [00](00-dong-bo-hien-trang.md); trình tự ở [16](16-so-tay-thuc-thi.md).

## 24.1 Ai làm gì (RACI gọn)
| Vai | Chịu trách nhiệm | KHÔNG làm |
|---|---|---|
| **Sếp Sơn (CPO)** | Duyệt hướng · cấp reference (màu/thương hiệu) · chốt người/máy/mạng · ưu tiên GO/NO-GO | — |
| **CodeLong (R0)** | Điều phối · duyệt spec · gác chất lượng | — |
| **anh Hiên + HoangKha (Backend/Ops)** | **Bước 0** (chạy backend trên Mac + đo — [17](17-buoc-0-chay-backend-mac.md)) · 3 endpoint Mission Control ([20 §20.2](20-mission-control.md)) · Railway deploy/redeploy · xin quyền repo `HanDichThuat` | Không sửa frontend UX |
| **Claude Code (FE)** | Frontend: UX/IA ([19](19-ia-dieu-huong-mot-truc.md)/[22](22-build-khung-dieu-huong-phase-1.md)) · Mission Control FE ([20](20-mission-control.md)) · glossary/script/voices · tài liệu | Không chạy backend · không tự đặt mật khẩu/secret · không tự deploy Railway |
| **Ops/AV** | Diễn tập · Mac #2 · mic/loa/LED · phiên dịch người ([18](18-a5-dien-tap-du-phong.md)) | — |

## 24.2 Chuỗi phụ thuộc (cái gì chặn cái gì)
```
[BƯỚC 0 — BE chạy backend trên Mac + đo]  ← CHẶN NẶNG NHẤT
      ├─→ biết mức AI thật ([21]) + quyết định ([23])
      ├─→ Mission Control phần ĐO có số thật ([20])
      └─→ GO/NO-GO gala có căn cứ

[3 endpoint backend — BE]  ─→ Mission Control phần GPU/nhiệt/restart ([20])

[UX/IA — FE]  ─── chạy SONG SONG, không chờ backend ───→ khung điều hướng ([22]) · kỷ luật màu · lễ nghi
      (chỉ phần "đo realtime" của /control cần backend chạy phiên)

[Ops — Mac #2 · người dịch · mạng]  ─── song song ───→ lưới an toàn gala ([18])
```
→ **FE (UX) và BE (Bước 0) làm song song được** — không ai chờ ai cho tới khi ghép Mission Control.

## 24.3 Governance push (bắt buộc)
- **Chốt 1 người push chính** (Sếp + anh Hiên quyết — đề xuất: 1 người gom & đẩy `develop`).
- **LUÔN `git fetch` + hoà việc trước khi push. KHÔNG force-push. Chỉ đẩy `develop`.**
- Deploy: sau push, **bấm Redeploy trên Railway** (chưa auto — [00](00-dong-bo-hien-trang.md)).
- Bắt đầu mỗi phiên: **đọc [00](00-dong-bo-hien-trang.md)**. Sau thay đổi lớn: cập nhật 00.

## 24.4 Việc kế tiếp mỗi vai (ngay bây giờ)
| Vai | Việc kế tiếp |
|---|---|
| **Sếp** | Duyệt spec [19](19-ia-dieu-huong-mot-truc.md)/[22](22-build-khung-dieu-huong-phase-1.md) · chốt **1 người push** · cho phép FE bắt đầu Phase 1 |
| **anh Hiên/HoangKha** | Xin quyền repo `HanDichThuat` → **chạy Bước 0 trên Mac** → gửi bảng số ([17](17-buoc-0-chay-backend-mac.md)) |
| **Claude Code (FE)** | Chờ đèn xanh Phase 1 → dựng khung điều hướng ([22]) → trình duyệt; song song: quick-win còn lại |
| **Ops** | Chốt Mac #2 · phiên dịch người · sơ đồ mic/LED ([18](18-a5-dien-tap-du-phong.md)) |

→ Liên quan: [00 trạng thái](00-dong-bo-hien-trang.md) · [16 sổ tay thực thi](16-so-tay-thuc-thi.md) · [23 quyết định sau Bước 0](23-phan-tich-buoc-0-quyet-dinh.md).
