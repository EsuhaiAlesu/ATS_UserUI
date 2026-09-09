// src/lib/lanes/online/tuningVisibility.ts — MỘT công tắc duy nhất để ẩn/hiện các nút tinh chỉnh
// của luồng ONLINE.
//
// Vì sao có tệp này. 26/08/2026, khi bàn giao luồng online cho đội offline để ráp thành một ứng
// dụng có đủ hai chế độ: sáu nút tinh chỉnh (Độ nhạy micro · Ngưỡng đủ to · Nhịp nói của buổi ·
// Độ khớp khi dẫn theo kịch bản · Nhả câu sớm · Noise gate near-mic) đã được đặt sẵn ở giá trị
// chạy được ngay từ lần mở đầu tiên. Người vận hành buổi lễ không nên nhìn thấy chúng nữa: mỗi nút
// hiện ra là một cơ hội để ai đó chỉnh nhầm mười phút trước giờ G.
//
// 07/09/2026: công tắc này nay chỉ còn giấu NĂM nút. "Nhịp nói của buổi" đã được đưa RA ngoài, vì đó là
// nút duy nhất phải đổi theo TỪNG BUỔI — lễ có MC đọc kịch bản khác hẳn họp nội bộ vừa nghĩ vừa nói.
// Nó hiện ở màn Cài đặt và ở rail trái Bảng điều khiển; bật hay tắt công tắc này đều không đụng tới nó.
//
// ẨN, KHÔNG XOÁ. Toàn bộ cơ chế bên dưới vẫn chạy y nguyên, chỉ phần giao diện bị giấu đi:
//   · mọi hằng số mặc định (`MIC_SENSITIVITY_DEFAULT`, `LOUD_GATE_DEFAULT`, `SPEECH_RHYTHM_DEFAULT`,
//     `GUIDED_MATCH_DEFAULT`, `LIVE_PROMOTE_DEFAULT`) vẫn là thứ quyết định hành vi;
//   · giá trị đã lưu trong localStorage của máy nào từng chỉnh tay vẫn được đọc và vẫn có hiệu lực —
//     ẩn giao diện KHÔNG xoá lựa chọn cũ.
//
// ĐỪNG "xoá sạch các khoá `proyaku_online_*` cho về mặc định". Câu đó từng nằm đúng chỗ này và nó SAI —
// nguy hiểm nữa. Mười trong mười bốn khoá ấy cũng nằm trong `cloudSync.SETTINGS_KEYS`, mà máy chủ ghi kho
// `settings` TRỌN GÓI chứ không trộn. Xoá ở MỘT máy là lần đẩy kế tiếp của chính máy đó xoá luôn mười nấc
// khỏi KHO CHUNG — tức là của mọi máy, kể cả máy đang chạy buổi lễ. Xem `EXPORT_ONLY_PREFIXES` trong
// `src/lib/settings.ts` để biết vì sao nút "Xoá dữ liệu cục bộ" cố ý KHÔNG quét tiền tố này.
// Muốn một nấc về mặc định thì mở đúng nút của nó ra chỉnh (bật công tắc dưới đây nếu nút đang ẩn).
//
// GỌI LẠI KHI CẦN: đổi đúng MỘT dòng `false` → `true` bên dưới. Không phải sửa chỗ nào khác.
//
// Kiểu khai báo là `boolean` chứ không để TypeScript tự suy ra `false`, để lúc bật lại không sinh ra
// một loạt cảnh báo "điều kiện luôn sai" ở mọi chỗ dùng.
//
// Pure module: no React, no fetch, no DOM.

export const SHOW_ONLINE_TUNING: boolean = false;
