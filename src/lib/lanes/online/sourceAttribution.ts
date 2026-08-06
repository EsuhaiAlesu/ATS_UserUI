// src/lib/lanes/online/sourceAttribution.ts — câu vừa rồi vào máy bằng CỔNG NÀO.
//
// Đây là cơ chế hai chiều thật của các sản phẩm thương mại, bóc trần ra thì rất tầm thường: chúng ngồi
// trên máy của MỘT người, nên "mic của tôi" và "tiếng ra loa máy" là hai sợi dây khác nhau. Chiều dịch
// không cần đoán — nó là thuộc tính của sợi dây.
//
//     mic (Jabra)         → người trong phòng   → tiếng Việt → dịch sang Nhật
//     tiếng máy (Teams)   → phía đầu cầu bên kia → tiếng Nhật → dịch sang Việt
//
// Không mô hình, không ngưỡng tin cậy, không quán tính. Sai số bằng không khi hai bên ngồi hai đầu.
//
// VÌ SAO KHÔNG CẦN SOCKET THỨ HAI. Cám dỗ đầu tiên là ghim mỗi cổng một phiên chép lời — và đó là trả gấp
// đôi tiền để mua một bài toán trọng tài mới. Ta không cần chép hai lần; ta chỉ cần biết câu vừa chốt phát
// ra từ cổng nào. Nên hai đường tiếng được TRỘN thành một dòng gửi lên máy nghe y như hôm nay, còn năng
// lượng thì đo RIÊNG từng đường. Chốt câu, hỏi lại cửa sổ thời gian của câu đó: bên nào có tiếng.
//
// LUẬT BẤT ĐỐI XỨNG — chỗ dễ làm sai nhất, và là lý do tệp này không dùng tỉ lệ đơn thuần.
// Trong phòng có tiếng vọng: tiếng đầu cầu bên kia phát ra loa Jabra rồi quay ngược vào chính mic Jabra.
// Nên khi phía kia nói, CẢ HAI đường đều có tiếng, và mọi luật kiểu "bên nào to hơn" đều lung lay.
// Nhưng chiều ngược lại thì không đối xứng chút nào:
//
//     tiếng máy có tiếng  ⇒  CHẮC CHẮN phía bên kia đang nói — không thứ gì trong phòng làm được
//                            cho máy tính tự phát ra tiếng.
//     chỉ mic có tiếng    ⇒  người trong phòng đang nói.
//
// Nên luật là: hỏi đường TIẾNG MÁY trước. Nó không thể bị phòng làm nhiễu, còn mic thì có.
//
// Pure module: không React, không fetch, không DOM, không đồng hồ (phía gọi đưa mốc thời gian vào).

export type CaptureSource = 'mic' | 'system';

/** Bao nhiêu mili-giây tiếng trong cửa sổ thì mới coi là "đường này có người nói". */
export const SOURCE_MIN_VOICED_MS = 300;

/**
 * Cửa sổ nhìn lại tối đa khi chốt một câu.
 *
 * Chặn trên, không phải độ dài thật: cửa sổ thật là từ câu chốt TRƯỚC tới câu này. Cần chặn vì lượt đầu
 * phiên, và những câu sau một quãng im dài, sẽ có cửa sổ dài bằng cả buổi — mà tiếng của mười phút trước
 * thì không nói gì về câu vừa rồi.
 */
export const SOURCE_WINDOW_MAX_MS = 12_000;

export interface SourceVerdict {
    source: CaptureSource;
    /** Mili-giây tiếng đo được trong cửa sổ, từng đường — để đọc log, không để đoán. */
    micVoicedMs: number;
    sysVoicedMs: number;
    /** Cả hai đường đều vượt sàn: phòng nói đè lên đầu cầu, hoặc tiếng vọng mạnh. */
    overlapped: boolean;
}

export interface SourceAttributorStats {
    /** Số câu chốt được gán về mic. */
    mic: number;
    /** Số câu chốt được gán về tiếng máy. */
    system: number;
    /** Số câu không gán được — không đường nào đủ tiếng. */
    unattributed: number;
    /** Số câu gán được nhưng cả hai đường cùng có tiếng. */
    overlapped: number;
}

export interface SourceAttributor {
    /** Mỗi gói tiếng (~256ms): bao nhiêu mili-giây có tiếng ở từng đường. */
    observe(at: number, micVoicedMs: number, sysVoicedMs: number): void;
    /**
     * Câu vừa chốt lúc `endAt`, bắt đầu từ `startAt` (mốc câu chốt trước; 0 = chưa có câu nào).
     * `null` = không đủ tiếng ở đường nào để kết luận — phía gọi phải rơi về cách đoán cũ.
     */
    verdictFor(startAt: number, endAt: number): SourceVerdict | null;
    reset(): void;
    stats(): SourceAttributorStats;
}

type Sample = { at: number; mic: number; sys: number };

export function createSourceAttributor(): SourceAttributor {
    let samples: Sample[] = [];
    const stats: SourceAttributorStats = { mic: 0, system: 0, unattributed: 0, overlapped: 0 };

    return {
        observe(at: number, micVoicedMs: number, sysVoicedMs: number) {
            samples.push({ at, mic: micVoicedMs, sys: sysVoicedMs });
            // Cắt cụt theo THỜI GIAN, không theo số phần tử: gói tới đều đặn 256ms nên hai cách gần như
            // giống nhau lúc chạy tốt, nhưng khi luồng chính nghẽn thì gói dồn cục — lúc đó cắt theo số
            // phần tử sẽ vứt mất đúng phần tiếng ta cần.
            const floor = at - SOURCE_WINDOW_MAX_MS * 2;
            if (samples.length > 8 && samples[0].at < floor) samples = samples.filter((s) => s.at >= floor);
        },

        verdictFor(startAt: number, endAt: number): SourceVerdict | null {
            const from = Math.max(startAt || 0, endAt - SOURCE_WINDOW_MAX_MS);
            let mic = 0;
            let sys = 0;
            for (const s of samples) {
                if (s.at <= from || s.at > endAt) continue;
                mic += s.mic;
                sys += s.sys;
            }
            const micLoud = mic >= SOURCE_MIN_VOICED_MS;
            const sysLoud = sys >= SOURCE_MIN_VOICED_MS;
            if (!micLoud && !sysLoud) {
                stats.unattributed += 1;
                return null;
            }
            const overlapped = micLoud && sysLoud;
            if (overlapped) stats.overlapped += 1;
            // Luật bất đối xứng — xem đầu tệp. Tiếng máy có tiếng là bằng chứng KHÔNG THỂ do phòng tạo ra,
            // nên nó được hỏi trước; mic có tiếng thì có thể chỉ là tiếng vọng của chính đường kia.
            const source: CaptureSource = sysLoud ? 'system' : 'mic';
            stats[source] += 1;
            return { source, micVoicedMs: mic, sysVoicedMs: sys, overlapped };
        },

        reset() {
            samples = [];
            stats.mic = 0; stats.system = 0; stats.unattributed = 0; stats.overlapped = 0;
        },

        stats: () => ({ ...stats }),
    };
}
