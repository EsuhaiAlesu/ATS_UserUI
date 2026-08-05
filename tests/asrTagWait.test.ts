import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createAsrCodec, ASR_TAG_WAIT_MS } from '../src/lib/lanes/online/asrTransport'

// Chốt "chờ bản có nhãn" từng KHÔNG CÓ HẠN.
//
// Nhà cung cấp gửi mỗi câu chốt hai lần: bản trơn trước, bản có dấu thời gian sau, và chỉ bản sau mang
// nhãn tiếng. Codec giữ bản trơn để không vứt mất nhãn — đúng. Nhưng nó giữ tới khi bản có nhãn về, hoặc
// tới khi một bản trơn KHÁC về, tức tới khi CÂU SAU đã nói xong. Với một thứ nhà cung cấp tự khai là
// "delayed final message", đó là biến độ trễ của họ thành điều kiện bắt buộc trước khi phụ đề, bản dịch
// và giọng đọc của câu N được chạy. Máy nghe không dừng; mọi thứ phía sau thì có.
//
// Những ca dưới đây ghim: (1) trong hạn thì mọi thứ y như cũ và nhãn còn nguyên; (2) quá hạn thì câu ĐƯỢC
// NHẢ chứ không bị treo; (3) bản có nhãn về muộn sau đó bị nuốt, không thành câu thứ hai trên tường;
// (4) nhịp gói tiếng cũng nhả được — đây là đường duy nhất còn chạy khi người nói đã im; (5) số đo có
// thật để phân xử bằng số.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const LANE = 'src/lib/lanes/online/onlineLane.ts'
const COMPLETED = 'conversation.item.input_audio_transcription.completed'

type Emitted = { type: string; transcript: string; detectedLanguage?: string }

/** Codec có đồng hồ giả, và bắt tay đã hứa nhận diện tiếng nên đường giữ câu được lên nòng từ câu một. */
const rig = (tagWaitMs = ASR_TAG_WAIT_MS) => {
    let t = 1_000_000
    const codec = createAsrCodec(undefined, { tagWaitMs, now: () => t })
    codec.decode(JSON.stringify({ message_type: 'session_started', config: { include_language_detection: true } }))
    return {
        codec,
        advance: (ms: number) => { t += ms },
        plain: (text: string) => codec.decode(JSON.stringify({ message_type: 'final_transcript', transcript: text })),
        tagged: (text: string, lang = 'vie') =>
            codec.decode(JSON.stringify({ message_type: 'final_transcript_with_timestamps', transcript: text, language_code: lang })),
        partial: (text: string) => codec.decode(JSON.stringify({ message_type: 'partial_transcript', text })),
        audio: () => codec.encodeAudio(new ArrayBuffer(8192)),
        drain: () => (codec.drain?.() ?? []) as Emitted[],
        stats: () => codec.stats!(),
    }
}

describe('trong hạn: không đổi gì cả', () => {
    it('1 · bản có nhãn về trong hạn thì phát MỘT lần kèm nhãn, không câu nào bị nhả sớm', () => {
        const r = rig()
        expect(r.plain('Kính thưa quý vị.')).toBeNull()
        r.advance(200)
        const out = r.tagged('Kính thưa quý vị.')
        expect(r.drain()).toEqual([])   // không có câu nào phải cứu
        expect(out?.event).toMatchObject({ type: COMPLETED, transcript: 'Kính thưa quý vị.', detectedLanguage: 'vie' })
        expect(r.stats().tagTimeouts).toBe(0)
    })

    it('2 · số đo ghi đúng khoảng chờ thật, và giữ mốc lâu nhất của cả phiên', () => {
        const r = rig()
        r.plain('A'); r.advance(120); r.tagged('A')
        expect(r.stats().tagWaitLastMs).toBe(120)
        r.plain('B'); r.advance(430); r.tagged('B')
        expect(r.stats().tagWaitLastMs).toBe(430)
        expect(r.stats().tagWaitMaxMs).toBe(430)
        r.plain('C'); r.advance(50); r.tagged('C')
        expect(r.stats().tagWaitLastMs).toBe(50)
        expect(r.stats().tagWaitMaxMs).toBe(430)   // mốc lâu nhất KHÔNG bị một câu nhanh xoá đi
        expect(r.stats()).toMatchObject({ plainFinals: 3, taggedFinals: 3, tagTimeouts: 0 })
    })
})

describe('quá hạn: nhả câu ra, đừng treo', () => {
    it('3 · quá hạn thì câu được nhả qua drain, không phải chờ tới lúc câu sau nói xong', () => {
        const r = rig()
        expect(r.plain('Xin kính chào quý vị.')).toBeNull()
        r.advance(ASR_TAG_WAIT_MS - 1)
        r.partial('câu sau đang nói')
        expect(r.drain()).toEqual([])                     // chưa tới hạn: vẫn giữ

        r.advance(2)
        r.partial('câu sau đang nói dở')
        const out = r.drain()
        expect(out).toHaveLength(1)
        expect(out[0]).toMatchObject({ type: COMPLETED, transcript: 'Xin kính chào quý vị.' })
        expect(out[0].detectedLanguage).toBeUndefined()   // nhãn mất — đó là cái giá, và nó được ĐẾM
        expect(r.stats().tagTimeouts).toBe(1)
    })

    it('4 · nhịp gói tiếng cũng nhả được — đường duy nhất còn chạy khi người nói đã im', () => {
        const r = rig()
        r.plain('Câu cuối trước quãng lặng.')
        r.advance(ASR_TAG_WAIT_MS + 1)
        r.audio()                                          // không tin nào về; chỉ có gói tiếng gửi đi
        const out = r.drain()
        expect(out).toHaveLength(1)
        expect(out[0].transcript).toBe('Câu cuối trước quãng lặng.')
    })

    it('5 · bản có nhãn về MUỘN sau khi đã nhả thì bị nuốt, không thành câu thứ hai trên tường', () => {
        const r = rig()
        r.plain('Một câu.')
        r.advance(ASR_TAG_WAIT_MS + 1)
        r.audio()
        expect(r.drain()).toHaveLength(1)

        r.advance(300)
        expect(r.tagged('Một câu.')).toBeNull()            // bộ nhớ chống trùng đã được ghi lúc nhả
        expect(r.drain()).toEqual([])
    })

    it('6 · một câu THẬT nhắc lại sau đó vẫn lên được, không bị bộ nhớ chống trùng nuốt oan', () => {
        const r = rig()
        r.plain('Vâng.')
        r.advance(ASR_TAG_WAIT_MS + 1)
        r.audio()
        expect(r.drain()).toHaveLength(1)

        r.advance(60_000)                                  // rất lâu sau — quá cửa sổ chống trùng
        r.plain('Vâng.')
        r.advance(100)
        const out = r.tagged('Vâng.')
        expect(out?.event).toMatchObject({ type: COMPLETED, transcript: 'Vâng.' })
    })
})

describe('nối vào lane', () => {
    it('7 · lane rút hàng đợi ở CẢ đường tin nhắn lẫn đường gói tiếng', () => {
        const lane = read(LANE)
        expect(lane.split('codec.drain?.() ?? []').length - 1).toBeGreaterThanOrEqual(2)
        // và chỗ rút ở đường gói tiếng phải nằm ngay sau lệnh gửi, không phải ở một hàm khác
        const send = lane.indexOf('ws.send(codec ? codec.encodeAudio(pcm) : pcm);')
        expect(send).toBeGreaterThan(0)
        expect(lane.slice(send, send + 400)).toContain('codec.drain?.()')
    })

    it('8 · số đo lên bảng chẩn đoán, và bảy chốt bỏ câu được tách theo lý do', () => {
        const lane = read(LANE)
        expect(lane).toContain('asrTag: { waitLastMs: number; waitMaxMs: number; timeouts: number')
        expect(lane).toContain('droppedByReason: Record<string, number>')
        expect(lane).toContain('droppedByReason[reason] = (droppedByReason[reason] ?? 0) + 1')
    })
})
