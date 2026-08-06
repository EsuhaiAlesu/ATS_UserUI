// src/lib/lanes/online/speakGate.ts — HIỆN và ĐỌC không phải một việc, nên không được chờ chung một lúc.
//
// Cả tệp này dựng trên một điều bất đối xứng đã có sẵn trong lane, viết ở `onlineLane.ts` ngay trên chỗ
// gọi giọng đọc: "một câu bỏ đọc thì khán phòng ĐỌC thay vì NGHE, còn một câu đọc sai là một tràng tiếng
// đè lên câu kế tiếp". Nói cách khác:
//
//   · PHỤ ĐỀ sai thì sửa được. Nó có `lid`, viết đè lên chính nó, và người trong phòng thấy nó đổi.
//   · GIỌNG ĐỌC sai thì không. Nó đã phát ra loa, mất 3-4 giây để nói xong, và không có nút thu hồi.
//
// Nên hai thứ đó phải được đối xử khác nhau: phụ đề bắn NGAY theo chiều tạm thời, còn giọng đọc CHỜ trọng
// tài chốt chiều — có hạn giờ, vì im lặng kéo dài cũng là một kiểu hỏng.
//
// Vì sao phải tách bây giờ, khi trọng tài còn trả lời tức thì. Vì hai thứ sắp tới đều làm nó CHẬM đi:
// lớp router bằng model (500-1000ms) và hai socket ghim (phải chờ cả hai luồng cùng chép xong một đoạn
// rồi mới so). Không có cái cổng này thì mỗi mili-giây trọng tài nghĩ thêm là một mili-giây tường trống,
// và người ta sẽ chọn cách rẻ hơn: bắt trọng tài trả lời vội. Có cổng rồi thì độ trễ đó rơi vào chỗ chịu
// được nó — cái loa — chứ không rơi vào chỗ không chịu được — bức tường.
//
// Và khi chiều CHỐT khác chiều đã dịch, việc đúng KHÔNG phải là đọc bản dịch đó bằng tiếng khác. Bản dịch
// ấy được làm theo chiều cũ, nên nó sai từ gốc chứ không sai mỗi cái giọng; đọc lên là đưa một câu ngược
// vào loa. Việc đúng là NGẬM MIỆNG và để phụ đề đứng lại đó cho người ta đọc — đúng cái bất đối xứng ở
// đầu tệp này.
//
// Pure module: không React, không fetch, không DOM. Đồng hồ duy nhất là `setTimeout` cho hạn giờ.

export type Lang = 'vi' | 'ja';

export interface SettleOutcome {
    /** Chiều trọng tài chốt cho câu này. */
    language: Lang;
    /**
     * Chốt KHÁC chiều mà câu đã được dịch theo ⇒ bản dịch sai từ gốc, không được đọc lên.
     * Luôn false khi hết giờ: hết giờ nghĩa là không biết, mà không biết thì không phải là bằng chứng sai.
     */
    changed: boolean;
    /** Hết hạn giờ trước khi trọng tài chốt — đi tiếp với thứ đang có, không giữ khán phòng trong im lặng. */
    timedOut: boolean;
}

export interface SpeakGateStats {
    /** Số câu phải chờ thật (trọng tài chưa chốt lúc giọng đọc hỏi tới). */
    waits: number;
    /** Số câu bị giữ lại không đọc vì chiều chốt khác chiều đã dịch. */
    held: number;
    /** Số câu đi tiếp vì hết hạn giờ. */
    timedOut: number;
    /** Tổng số mili-giây giọng đọc đã phải chờ — để đo, không để đoán. */
    waitedMs: number;
}

export interface SpeakGate {
    /** Ghi lại chiều mà PHỤ ĐỀ đã hiện ra với. Gọi ngay lúc bắn phụ đề, không chờ ai. */
    show(lid: string, language: Lang): void;
    /** Trọng tài đã chốt câu này. Đánh thức mọi người đang chờ nó. */
    settle(lid: string, language: Lang): void;
    /**
     * Giọng đọc hỏi: chiều cuối cùng của câu này là gì?
     *
     * Chốt rồi thì trả lời ngay (không tạo timer, không nhường lượt — đường đi hôm nay chạy qua đây và nó
     * phải nhanh y như chưa có cổng). Chưa chốt thì chờ, tối đa `timeoutMs`.
     */
    wait(lid: string, timeoutMs: number, fallback: Lang): Promise<SettleOutcome>;
    /** Câu đã xong đời nó — bỏ khỏi bộ nhớ. Không gọi thì bảng lớn dần theo cả buổi. */
    forget(lid: string): void;
    /** Phiên mới là căn phòng mới. */
    reset(): void;
    stats(): SpeakGateStats;
}

type Entry = {
    shown: Lang | null;
    settled: Lang | null;
    waiters: Array<(language: Lang) => void>;
};

export function createSpeakGate(): SpeakGate {
    const entries = new Map<string, Entry>();
    const stats: SpeakGateStats = { waits: 0, held: 0, timedOut: 0, waitedMs: 0 };

    const ensure = (lid: string): Entry => {
        let e = entries.get(lid);
        if (!e) { e = { shown: null, settled: null, waiters: [] }; entries.set(lid, e); }
        return e;
    };

    return {
        show(lid: string, language: Lang) { ensure(lid).shown = language; },

        settle(lid: string, language: Lang) {
            const e = ensure(lid);
            e.settled = language;
            // Đánh thức trước khi xoá danh sách, và xoá TRƯỚC khi gọi, để một người chờ nào đó gọi ngược
            // lại settle() trong lúc chạy cũng không đánh thức chính mình hai lần.
            const waiters = e.waiters;
            e.waiters = [];
            for (const w of waiters) w(language);
        },

        async wait(lid: string, timeoutMs: number, fallback: Lang): Promise<SettleOutcome> {
            const e = ensure(lid);
            const verdict = (language: Lang, timedOut: boolean): SettleOutcome => ({
                language,
                // Hết giờ thì KHÔNG kết luận là sai: im lặng của trọng tài không phải một phán quyết.
                changed: !timedOut && e.shown !== null && e.shown !== language,
                timedOut,
            });

            // Đã chốt: trả lời thẳng, không tạo timer và không nhường lượt. Đây là đường đi của HÔM NAY —
            // trọng tài hiện chạy đồng bộ ngay trong `acceptFinalText`, tức là luôn chốt xong trước khi
            // giọng đọc hỏi tới. Thêm dù chỉ một `await` thật vào đây là làm chậm một thứ đang chạy tốt.
            if (e.settled !== null) {
                const fast = verdict(e.settled, false);
                if (fast.changed) stats.held += 1;
                return fast;
            }

            stats.waits += 1;
            const startedAt = Date.now();
            // `timedOut` được chốt BÊN TRONG lời hứa chứ không đọc lại `e.settled` sau khi await: trọng
            // tài có thể chốt ngay sau lúc hết giờ, và đọc lại thì lần chờ đó bị ghi nhầm là kịp.
            const { language, timedOut } = await new Promise<{ language: Lang; timedOut: boolean }>((resolve) => {
                let done = false;
                const timer = setTimeout(() => {
                    if (done) return;
                    done = true;
                    stats.timedOut += 1;
                    // Hết giờ: đi tiếp bằng chiều phụ đề đã hiện. Người trong phòng đang ĐỌC nó, nên đọc
                    // to lên đúng thứ họ đang đọc là điều ít bất ngờ nhất có thể làm.
                    resolve({ language: e.shown ?? fallback, timedOut: true });
                }, timeoutMs);
                e.waiters.push((settled) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    resolve({ language: settled, timedOut: false });
                });
            });
            stats.waitedMs += Date.now() - startedAt;
            const out = verdict(language, timedOut);
            if (out.changed) stats.held += 1;
            return out;
        },

        forget(lid: string) { entries.delete(lid); },

        reset() {
            // Đánh thức mọi người đang chờ trước khi xoá, nếu không một câu đang ở refine lúc bấm Dừng sẽ
            // treo lời hứa của nó vĩnh viễn. Chúng đánh thức bằng chiều phụ đề đã hiện; phía gọi vẫn còn
            // cửa `sessionGen` của riêng nó để bỏ câu đi.
            for (const e of entries.values()) {
                const waiters = e.waiters;
                e.waiters = [];
                for (const w of waiters) w(e.shown ?? 'vi');
            }
            entries.clear();
            stats.waits = 0; stats.held = 0; stats.timedOut = 0; stats.waitedMs = 0;
        },

        stats: () => ({ ...stats }),
    };
}
