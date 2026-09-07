// src/lib/lanes/online/tuningVisibility.ts — MỘT công tắc duy nhất để ẩn/hiện các nút tinh chỉnh
// của luồng ONLINE.
//
// Vì sao có tệp này. 26/08/2026, khi bàn giao luồng online cho đội offline để ráp thành một ứng
// dụng có đủ hai chế độ: sáu nút tinh chỉnh (Độ nhạy micro · Ngưỡng đủ to · Nhịp nói của buổi ·
// Độ khớp khi dẫn theo kịch bản · Nhả câu sớm · Noise gate near-mic) đã được đặt sẵn ở giá trị
// chạy được ngay từ lần mở đầu tiên. Người vận hành buổi lễ không nên nhìn thấy chúng nữa: mỗi nút
// hiện ra là một cơ hội để ai đó chỉnh nhầm mười phút trước giờ G.
//
// ẨN, KHÔNG XOÁ. Toàn bộ cơ chế bên dưới vẫn chạy y nguyên, chỉ phần giao diện bị giấu đi:
//   · mọi hằng số mặc định (`MIC_SENSITIVITY_DEFAULT`, `LOUD_GATE_DEFAULT`, `SPEECH_RHYTHM_DEFAULT`,
//     `GUIDED_MATCH_DEFAULT`, `LIVE_PROMOTE_DEFAULT`) vẫn là thứ quyết định hành vi;
//   · giá trị đã lưu trong localStorage của máy nào từng chỉnh tay vẫn được đọc và vẫn có hiệu lực —
//     ẩn giao diện KHÔNG xoá lựa chọn cũ. Máy nào cần về mặc định thì xoá các khoá
//     `proyaku_online_*` trong localStorage.
//
// GỌI LẠI KHI CẦN: đổi đúng MỘT dòng `false` → `true` bên dưới. Không phải sửa chỗ nào khác.
//
// Kiểu khai báo là `boolean` chứ không để TypeScript tự suy ra `false`, để lúc bật lại không sinh ra
// một loạt cảnh báo "điều kiện luôn sai" ở mọi chỗ dùng.
//
// Pure module: no React, no fetch, no DOM.

export const SHOW_ONLINE_TUNING: boolean = false;
