import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

// An toàn gala: chặn MỘT lỗi render bất kỳ (script hỏng, localStorage lỗi, backend trả dữ liệu lạ)
// làm TRẮNG màn console điều khiển hoặc màn phụ đề khán giả giữa một sự kiện không lặp lại được.
// Fallback = nền tối trung tính + nút tải lại — không bao giờ để trắng, không bao giờ hiện demo.
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Lưu vết ra console để còn truy nguyên; KHÔNG gửi đi đâu (chạy offline, riêng tư).
        console.error('[PROYAKU] Lỗi hiển thị:', error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-background text-on-surface p-8 text-center">
                <span className="font-brand text-secondary text-4xl tracking-wide" style={{ textShadow: '0 0 40px rgba(232,184,75,0.3)' }}>PROYAKU</span>
                <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 40 }} aria-hidden="true">error</span>
                    <p className="text-lg font-semibold">Màn hình gặp lỗi hiển thị</p>
                    <p className="text-sm text-on-surface-variant max-w-md">
                        Đã chặn để không làm trắng màn. Bấm “Tải lại” để khôi phục — dữ liệu chuẩn bị,
                        định tuyến loa và phụ đề đều lưu tại máy nên không mất.
                    </p>
                </div>
                <button onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 rounded-lg bg-secondary text-on-secondary px-5 py-2.5 text-sm font-semibold hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-secondary/50">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>Tải lại
                </button>
            </div>
        );
    }
}
