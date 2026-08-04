// src/lib/lanes/online/refineFailure.ts — the server's reason code, in words the operator can act on.
//
// The codes are the ONLY thing that crosses the wire about a failure: no provider name, no model id, no
// host, no environment variable name. This module turns each one into a sentence that names the action,
// because "lỗi" on a screen during a ceremony is the same as no message at all.

export function refineReasonText(reason: string): string {
  if (reason === 'no-key') return 'chưa cài khoá dịch — báo người quản trị';
  if (reason === 'timeout') return 'bên dịch trả lời quá chậm — vẫn đang giữ bản dịch nháp trên màn';
  if (reason === 'bad-json') return 'bên dịch trả về nội dung không đọc được';
  const http = /^upstream-http-(\d{3})$/.exec(reason);
  if (http) {
    if (http[1] === '429') return 'bên dịch từ chối vì quá nhiều yêu cầu (429) — thử lại sau vài giây';
    if (http[1] === '401' || http[1] === '403') return 'khoá dịch bị từ chối (' + http[1] + ') — báo người quản trị';
    return `bên dịch trả lỗi ${http[1]}`;
  }
  return 'lỗi không rõ từ bên dịch';
}
