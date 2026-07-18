# 10 — Đo lường & Kiểm thử UX

[← 09 Lộ trình](09-lo-trinh-nang-cap.md) · [Về README](README.md)

> Nâng cấp mà không đo thì không biết có tốt lên không. File này định nghĩa **cách chứng minh** mỗi thay đổi thật sự cải thiện trải nghiệm, và **cách chặn regression**.

---

## 10.1. Chỉ số UX cốt lõi (đo trước & sau)

| Chỉ số | Định nghĩa | Mục tiêu | Vì sao quan trọng |
|--------|-----------|:---:|-------------------|
| **Time-to-live** | Từ mở console → phiên LISTENING | < 60s có checklist | Chuẩn bị nhanh dưới áp lực |
| **Độ trễ hiển thị** | Nói xong → phụ đề hiện | Đo & hiện được (`timing`) | Cốt lõi cảm nhận "realtime" |
| **Đọc-được từ xa** | % người đọc đúng dòng ở hàng cuối | ≥ 95% | Lý do tồn tại của màn phụ đề |
| **Thời gian phục hồi sự cố** | Rớt phiên → resume live | < 5s tự động | Không gián đoạn buổi lễ |
| **Tỉ lệ recovery không cần người** | Sự cố tự khắc phục / tổng sự cố | > 90% | Vận hành một người |
| **Độ chính xác tên riêng** | Tên/keigo hiển thị đúng | 100% cho tên trọng yếu | Sự cố xấu hổ nhất |
| **Tương phản (APCA/WCAG)** | Cặp màu chữ/nền đạt chuẩn | AA (≥4.5:1, ≥7:1 dòng chính) | Đọc-được + tuân thủ |

---

## 10.2. Kiểm thử tự động (chặn regression)

Thêm vào CI (chạy trên bản build của cả `/`, `/audio`, `/stream`):

| Công cụ | Kiểm gì | Cổng chặn |
|---------|---------|-----------|
| **axe-core** (playwright/vitest) | aria-live, label, focus, role, tên nút | 0 vi phạm critical/serious |
| **Lighthouse CI** | Accessibility ≥ 95, không render-blocking `@import` font, Performance | Ngưỡng tối thiểu |
| **Unit test tương phản token** | Duyệt mọi cặp `on-*`/surface qua APCA/WCAG | Không cặp nào fail AA |
| **Playwright E2E** | Kịch bản sự cố (mục 10.3) | Pass |
| **`tsc -b` + `oxlint`** | Type + lint (đã có) | Pass |
| **Emulate `prefers-reduced-motion`** | Không animation vô hạn khi reduce | Pass |

> Gợi ý: đặt cổng axe-core + tương phản token là **bắt buộc** để hệ token không bao giờ regress về vàng-trên-đỏ hay mauve-highlight (bài học từ [07](07-accessibility.md)).

---

## 10.3. Kịch bản E2E bắt buộc (mô phỏng sự cố sân khấu)

Mỗi kịch bản là một **acceptance test** cho các mục P0 ở [09](09-lo-trinh-nang-cap.md):

1. **Rớt backend giữa phiên** → màn `/stream` hiện slate "Đang khôi phục", **KHÔNG** hiện phụ đề demo; footer không ghi "DEMO MODE". Khôi phục backend → tự resume, lịch sử còn nguyên.
2. **Pop-out khi đang live** → cửa sổ VI/JA hiện đúng phụ đề live trong ~200ms; rớt phiên → cả popup hiện slate, không demo.
3. **Bấm STOP** → yêu cầu xác nhận/hold; một click đơn **không** kết thúc phiên.
4. **START khi chưa sẵn sàng** (thiếu tín hiệu mic / VI=JA) → nút bị chặn, mục lỗi được chỉ rõ.
5. **Offline load** → **không** hiện chuỗi lỗi kỹ thuật thô (`SyntaxError…`); hiện thông điệp thân thiện.
6. **Dòng `line_update corrected:true`** → dòng lóe rồi chốt, không đổi chữ vô hình.
7. **Reduce Motion bật** → không blur/particle/pulse vô hạn.
8. **Deep-link `/xyz` lạ** → route 404/fallback, không trang trắng.

---

## 10.4. Kiểm thử con người (không thay được bằng automation)

- **Test đọc-được tại chính hội trường** trước sự kiện: chiếu lên đúng màn hình/máy chiếu, người đứng hàng ghế cuối đọc to vài dòng → đo % đúng. Chỉnh cỡ chữ/tương phản tại chỗ.
- **Test 5-giây (5-second test):** cho người lạ nhìn màn console 5s rồi hỏi "hệ thống đang LIVE hay không, có khỏe không?" → kiểm annunciator ([05](05-ban-dieu-khien.md)).
- **Diễn tập vận hành ("Green Room"):** một người vận hành chạy full pipeline trên đoạn nói thật, có người quan sát ghi lại mọi lần "khựng/tìm nút/không chắc".
- **Kiểm với người dùng thật:** nếu có khán giả lớn tuổi/khiếm thị màu, mời họ thử đọc màn phụ đề.
- **Kiểm song ngữ:** người bản ngữ Việt **và** Nhật cùng đọc — bắt lỗi dấu tiếng Việt, kinsoku tiếng Nhật, tên riêng.

---

## 10.5. Định nghĩa "Hoàn thành" (Definition of Done) cho mỗi hạng mục

Một hạng mục UX chỉ "xong" khi:

1. ✅ Đạt **acceptance criteria** ghi trong file lăng kính tương ứng.
2. ✅ Có **test tự động** (E2E hoặc unit) nếu có thể, đã pass trong CI.
3. ✅ Kiểm **thủ công** trên cả 3 route (`/`, `/audio`, `/stream`) ở **cả light & dark**, cả **desktop & khổ hẹp**.
4. ✅ Kiểm **`prefers-reduced-motion`** và **bàn phím-only** (nếu chạm UI tương tác).
5. ✅ Không tạo vi phạm axe-core / tương phản mới.
6. ✅ Cập nhật tài liệu nếu đổi hành vi (vd `docs/INTEGRATION.md`).

---

## 10.6. Theo dõi tiến độ

Gợi ý bảng theo dõi (có thể để trong `docs/ux-roadmap/` hoặc issue tracker):

| Hạng mục | Giai đoạn | Ưu tiên | Trạng thái | Điểm trước | Điểm sau | Ghi chú |
|----------|:---:|:---:|:---:|:---:|:---:|--------|
| 0.1 Slate SIGNAL-LOST | 0 | P0 | ☐ Chưa | Phụ đề 4 | — | |
| 0.4 Contrast dòng mới | 0 | P0 | ☐ Chưa | A11y 3 | — | |
| … | | | | | | |

> Chạy lại đợt đánh giá hội đồng sau mỗi giai đoạn để cập nhật **bảng điểm** ([README](README.md)) — mục tiêu đưa trung bình từ **4.5 → 7+** sau Giai đoạn 1, và **8+** sau Giai đoạn 2.

---

## 10.7. Kết

Bộ tài liệu này cố tình **trung thực và cụ thể** — không phải để chê, mà vì Thầy yêu cầu đánh giá thật để nâng cấp thật. Điểm mấu chốt xin nhắc lại:

> **Nền móng của app này tốt và đúng hướng.** Nó đã đẹp; việc còn lại là làm cho nó **tin cậy, đọc-được, và sâu về tính năng** — phần lớn bằng cách **đấu nối những tín hiệu backend đã có sẵn**, không phải xây lại. Bắt đầu từ [Giai đoạn 0](09-lo-trinh-nang-cap.md) là con đường an toàn nhất tới một buổi lễ 20 năm chỉn chu.

---

[← 09 Lộ trình](09-lo-trinh-nang-cap.md) · [Về README](README.md)
