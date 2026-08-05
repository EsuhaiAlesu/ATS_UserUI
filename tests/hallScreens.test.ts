// tests/hallScreens.test.ts — màn khán giả đo bằng MÉT, không đo bằng điểm ảnh.
//
// Lỗi gốc mà bộ này canh: cỡ chữ trước nay tính bằng điểm ảnh (wallLayout → 2,6 × 18px ≈ 47px). Điểm ảnh
// KHÔNG phải kích thước. Cùng một tấm màn 6 m: máy chiếu nhận 1920 điểm ảnh thì 47px là chữ cao ~15 cm,
// hàng ghế cuối đọc được; cũng tấm màn đó nhận 3840 điểm ảnh thì 47px chỉ còn ~7 cm, hàng cuối chịu thua.
// Thứ duy nhất không đổi khi đổi máy chiếu là CHIỀU CAO THẬT của con chữ — nên đó là thứ được chỉnh, còn
// điểm ảnh do máy tự quy ra lúc vẽ.

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_HALL_WALLS, HALL_CHAR_CM, HALL_GAP_M, WALL_GLYPH_RATIO, WALL_M,
  clampCharCm, clampWallM, decodeHallWalls, encodeHallWalls, fitToAspect, hallFontPx, hallMockupUrl,
  hallOrder, hasPhysicalSize, mockupLayout, readingDistanceM, type HallWall,
} from '../src/lib/hallScreens'

const wall = (p: Partial<HallWall> = {}): HallWall => ({
  id: 'center', label: 'Màn giữa', view: 'both', showSource: false, widthM: 6, heightM: 3, ...p,
})

// Chiều cao thật của con chữ, suy ngược từ cỡ chữ px — đúng phép tính mà mắt người xem thực hiện.
const realCharCm = (fontPx: number, viewportPx: number, widthM: number): number =>
  (fontPx / viewportPx) * widthM * WALL_GLYPH_RATIO * 100

describe('DEFAULT_HALL_WALLS', () => {
  it('là đúng hội trường 20 năm: màn chính 6 × 3 m, hai màn hông 3,5 × 2,5 m', () => {
    // Một chỗ duy nhất ghi hội trường — DEFAULT_WALL_OUTPUTS dựng từ đây và /wall-mockup mở trơn cũng
    // rơi về đây, nên bảng điều khiển và màn xem thử không thể mô tả hai hội trường khác nhau.
    expect(DEFAULT_HALL_WALLS.map((w) => `${w.id} ${w.widthM}x${w.heightM}`))
      .toEqual(['center 6x3', 'left 3.5x2.5', 'right 3.5x2.5'])
    // Màn giữa hai chiều, hai màn hông mỗi bên một tiếng.
    expect(DEFAULT_HALL_WALLS.map((w) => w.view)).toEqual(['both', 'vi2ja', 'ja2vi'])
    // Tất cả đều nằm trong khoảng hợp lệ, nếu không thì chính mặc định sẽ bị loại khi đọc lại.
    for (const w of DEFAULT_HALL_WALLS) expect(hasPhysicalSize(w.widthM, w.heightM)).toBe(true)
  })
})

describe('hallFontPx', () => {
  it('chữ cao đúng số centimet đã chọn, dù máy chiếu nhận bao nhiêu điểm ảnh', () => {
    // Đây là toàn bộ lý do file này tồn tại: 1920 hay 3840 cho ra CÙNG một chiều cao thật.
    for (const px of [1280, 1920, 2560, 3840]) {
      expect(realCharCm(hallFontPx(px, 6, 12), px, 6)).toBeCloseTo(12, 0)
    }
    // …và cỡ chữ px thì tăng gấp đôi khi độ phân giải gấp đôi, đúng như phải thế.
    expect(hallFontPx(3840, 6, 12)).toBeCloseTo(hallFontPx(1920, 6, 12) * 2, -1)
  })

  it('màn hông nhỏ hơn lại cần CỠ CHỮ PX TO HƠN, mà người xem vẫn thấy chữ cao bằng nhau', () => {
    // Chỗ dễ nghĩ ngược nhất, và cũng là chỗ đặt cỡ chữ bằng điểm ảnh sai từ gốc: cùng 1920 điểm ảnh mà
    // tấm màn chỉ rộng 3,5 m thì mỗi mét chứa NHIỀU điểm ảnh hơn, nên 12 cm ăn nhiều px hơn. Đặt một cỡ
    // px chung cho cả ba màn là để màn giữa và màn hông ra hai cỡ chữ thật khác nhau.
    const main = hallFontPx(1920, 6, 12)
    const side = hallFontPx(1920, 3.5, 12)
    expect(side).toBeGreaterThan(main)
    expect(realCharCm(side, 1920, 3.5)).toBeCloseTo(12, 0) // nhưng người xem thấy chữ cao y hệt
    expect(realCharCm(main, 1920, 6)).toBeCloseTo(12, 0)
  })

  it('thu nhỏ tấm màn thì chữ nhỏ theo đúng tỉ lệ — nền tảng của màn tượng trưng', () => {
    // Màn tượng trưng chỉ là tấm màn ấy vẽ vào một khung bé hơn: cùng một hàm, khung bé thì chữ bé đúng
    // tỉ lệ, nên nhìn bản thu nhỏ là biết được ngoài hội trường chữ chiếm bao nhiêu phần tấm màn.
    expect(hallFontPx(480, 6, 12) * 4).toBeCloseTo(hallFontPx(1920, 6, 12), -1)
  })

  it('không bao giờ trả về 0 hay số âm, kể cả khi đầu vào vô nghĩa', () => {
    expect(hallFontPx(0, 6, 12)).toBe(0)     // chưa đo được cửa sổ → chưa vẽ chữ
    expect(hallFontPx(1920, 0, 12)).toBe(0)
    expect(hallFontPx(1920, -6, 12)).toBe(0)
    expect(hallFontPx(1, 40, 12)).toBeGreaterThanOrEqual(1) // sàn 1px, không bao giờ ra 0px
  })

  it('cm ngoài khoảng bị kẹp lại trước khi tính, không nhân thẳng', () => {
    expect(hallFontPx(1920, 6, 999)).toBe(hallFontPx(1920, 6, HALL_CHAR_CM.max))
    // 0 và số âm bị nâng lên sàn chứ KHÔNG nhảy về mặc định: chỗ đọc địa chỉ đã biến "thiếu cm" thành
    // mặc định trước khi gọi, nên tới đây 0 là một con số người ta thật sự đưa vào, kẹp là đúng.
    expect(hallFontPx(1920, 6, 0)).toBe(hallFontPx(1920, 6, HALL_CHAR_CM.min))
    expect(hallFontPx(1920, 6, -5)).toBe(hallFontPx(1920, 6, HALL_CHAR_CM.min))
    expect(clampCharCm(0)).toBe(HALL_CHAR_CM.min)
  })
})

describe('clampCharCm · readingDistanceM · clampWallM', () => {
  it('kẹp trong khoảng và làm tròn', () => {
    expect(clampCharCm(12)).toBe(12)
    expect(clampCharCm(12.4)).toBe(12)
    expect(clampCharCm(1)).toBe(HALL_CHAR_CM.min)
    expect(clampCharCm(500)).toBe(HALL_CHAR_CM.max)
    expect(clampCharCm(Number.NaN)).toBe(HALL_CHAR_CM.default)
  })

  it('1 cm chữ đọc được khoảng 2 m — con số người điều khiển thật sự cần', () => {
    expect(readingDistanceM(12)).toBe(24)
    expect(readingDistanceM(15)).toBe(30)
    // Mặc định phải phủ được một hội trường có màn chính 6 m (thường sâu 25-30 m).
    expect(readingDistanceM(HALL_CHAR_CM.default)).toBeGreaterThanOrEqual(24)
  })

  it('cỡ màn bị kẹp vào khoảng vật lý — 600 gõ nhầm cho 6,00 không thành màn 600 m', () => {
    expect(clampWallM(6)).toBe(6)
    expect(clampWallM(600)).toBe(WALL_M.max)
    expect(clampWallM(0)).toBe(WALL_M.min)
    expect(clampWallM(Number.NaN)).toBe(1)
  })

  it('hasPhysicalSize đòi CẢ HAI cạnh hợp lệ', () => {
    expect(hasPhysicalSize(6, 3)).toBe(true)
    expect(hasPhysicalSize(6, undefined)).toBe(false)  // thiếu một cạnh thì không suy ra hình dạng được
    expect(hasPhysicalSize(undefined, 3)).toBe(false)
    expect(hasPhysicalSize(6, 0)).toBe(false)
    expect(hasPhysicalSize(6, 999)).toBe(false)
    expect(hasPhysicalSize(Number.NaN, 3)).toBe(false)
  })
})

describe('fitToAspect', () => {
  it('màn 6 × 3 m nhận lát 640 × 1080 thì mở ra 640 × 320, không phải 640 × 1080', () => {
    // Nếu không nắn hình, người điều khiển tập dượt trên cửa sổ dọc, thấy chữ vừa đủ, rồi tấm màn ngang
    // ngoài hội trường lại nói khác — mọi phán đoán "chừng này chữ là vừa" đều làm trên sai hình dạng.
    expect(fitToAspect({ width: 640, height: 1080 }, 6, 3)).toEqual({ width: 640, height: 320 })
  })

  it('giữ đúng tỉ lệ và không bao giờ tràn khỏi khung', () => {
    for (const avail of [{ width: 1920, height: 1080 }, { width: 500, height: 500 }, { width: 300, height: 900 }]) {
      const fit = fitToAspect(avail, 3.5, 2.5)
      expect(fit.width).toBeLessThanOrEqual(avail.width)
      expect(fit.height).toBeLessThanOrEqual(avail.height)
      expect(fit.width / fit.height).toBeCloseTo(3.5 / 2.5, 1)
    }
  })

  it('đầu vào vô nghĩa thì trả nguyên khung, không trả 0 × 0', () => {
    expect(fitToAspect({ width: 640, height: 480 }, 0, 3)).toEqual({ width: 640, height: 480 })
    expect(fitToAspect({ width: 0, height: 0 }, 6, 3)).toEqual({ width: 0, height: 0 })
  })
})

describe('hallOrder', () => {
  it('xếp theo mắt người ngồi dưới nhìn lên: trái · giữa · phải', () => {
    expect(hallOrder(DEFAULT_HALL_WALLS).map((w) => w.id)).toEqual(['left', 'center', 'right'])
  })

  it('màn lạ vẫn còn, xếp sau các màn đã biết theo đúng thứ tự đưa vào', () => {
    const list = hallOrder([wall({ id: 'balcony' }), wall({ id: 'right' }), wall({ id: 'foyer' }), wall({ id: 'left' })])
    expect(list.map((w) => w.id)).toEqual(['left', 'right', 'balcony', 'foyer'])
  })
})

describe('mockupLayout', () => {
  const AVAIL = { width: 1600, height: 400 }

  it('thu nhỏ theo MỘT tỉ lệ chung, nên to nhỏ trên màn đúng như to nhỏ ngoài hội trường', () => {
    const { boxes, pxPerM, spanM } = mockupLayout(DEFAULT_HALL_WALLS, AVAIL)
    expect(spanM).toBe(3.5 + 6 + 3.5 + HALL_GAP_M * 2) // 16 m kể cả khoảng hở giữa các màn
    expect(pxPerM).toBe(100)
    const [left, center, right] = boxes
    expect(boxes.map((b) => b.id)).toEqual(['left', 'center', 'right'])
    // Màn chính rộng 6/3,5 ≈ 1,71 lần màn hông — đúng tỉ lệ thật, đó là toàn bộ giá trị của bản thu nhỏ.
    expect(center.width / left.width).toBeCloseTo(6 / 3.5, 2)
    expect(left.width).toBe(right.width)
    expect(left.height).toBe(right.height)
    expect(center.height).toBe(300)
  })

  it('các màn treo theo một đường tâm chung và không chồng lên nhau', () => {
    const { boxes } = mockupLayout(DEFAULT_HALL_WALLS, AVAIL)
    const midY = (b: { top: number; height: number }) => b.top + b.height / 2
    expect(midY(boxes[0])).toBeCloseTo(midY(boxes[1]), 0)
    expect(midY(boxes[1])).toBeCloseTo(midY(boxes[2]), 0)
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].left + boxes[i - 1].width)
    }
  })

  it('luôn nằm gọn trong khung và được canh giữa, mọi khổ màn hình', () => {
    for (const avail of [{ width: 1600, height: 400 }, { width: 900, height: 700 }, { width: 1920, height: 1080 }, { width: 640, height: 300 }]) {
      const { boxes } = mockupLayout(DEFAULT_HALL_WALLS, avail)
      const first = boxes[0]
      const last = boxes[boxes.length - 1]
      expect(first.left).toBeGreaterThanOrEqual(0)
      expect(last.left + last.width).toBeLessThanOrEqual(avail.width + 1)
      for (const b of boxes) {
        expect(b.top).toBeGreaterThanOrEqual(0)
        expect(b.top + b.height).toBeLessThanOrEqual(avail.height + 1)
      }
      // Canh giữa: lề trái và lề phải bằng nhau.
      expect(first.left).toBeCloseTo(avail.width - (last.left + last.width), 0)
    }
  })

  it('khung cao thì bị chiều cao màn cao nhất chặn lại, không kéo dãn', () => {
    // 1600 / 16 m = 100 px/m theo chiều ngang, nhưng khung chỉ cao 150px cho tấm màn 3 m → 50 px/m thắng.
    const { pxPerM } = mockupLayout(DEFAULT_HALL_WALLS, { width: 1600, height: 150 })
    expect(pxPerM).toBe(50)
  })

  it('danh sách rỗng hoặc khung chưa đo được thì trả về rỗng, không chia cho 0', () => {
    expect(mockupLayout([], { width: 800, height: 600 })).toEqual({ pxPerM: 0, boxes: [], spanM: 0 })
    expect(mockupLayout(DEFAULT_HALL_WALLS, { width: 0, height: 0 }).boxes).toEqual([])
  })

  it('một màn duy nhất thì không có khoảng hở nào được cộng vào', () => {
    const { spanM } = mockupLayout([wall()], AVAIL)
    expect(spanM).toBe(6)
  })
})

describe('mã hoá hội trường lên địa chỉ', () => {
  it('đi và về nguyên vẹn', () => {
    expect(decodeHallWalls(encodeHallWalls(DEFAULT_HALL_WALLS))).toEqual(DEFAULT_HALL_WALLS)
  })

  it('giữ đúng chiều và cờ "hiện bản gốc" của từng màn', () => {
    const src = [wall({ id: 'left', view: 'ja2vi', showSource: true, widthM: 3.5, heightM: 2.5 })]
    const [back] = decodeHallWalls(encodeHallWalls(src))
    expect(back.view).toBe('ja2vi')
    expect(back.showSource).toBe(true)
    expect(back.widthM).toBe(3.5)
  })

  it('mục hỏng bị bỏ HẲN, không lọt vào một tấm màn nửa vời', () => {
    // Thà thiếu một màn trên bản xem thử (nhìn thấy được) còn hơn vẽ một tấm màn 0 m hoặc sai chiều.
    expect(decodeHallWalls('center|Màn giữa|both|0|6|3,hong|Hỏng|xxx|0|3|2')).toHaveLength(1)
    expect(decodeHallWalls('center|Màn giữa|both|0|abc|3')).toEqual([])
    expect(decodeHallWalls('center|Màn giữa|both|0|6')).toEqual([])      // thiếu trường
    expect(decodeHallWalls('center|Màn giữa|both|0|999|3')).toEqual([])  // ngoài khoảng vật lý
    expect(decodeHallWalls('')).toEqual([])
    expect(decodeHallWalls(null)).toEqual([])
  })

  it('tên màn có dấu phân cách bị làm sạch, không nuốt mất các trường sau nó', () => {
    const [back] = decodeHallWalls(encodeHallWalls([wall({ label: 'Màn giữa, to|rộng' })]))
    expect(back.label).toBe('Màn giữa  to rộng')
    expect(back.widthM).toBe(6) // vẫn đọc được cỡ màn, tức là các trường không bị trôi
  })

  it('hallMockupUrl dựng đúng địa chỉ mà /wall-mockup đọc lại được', () => {
    const url = hallMockupUrl(DEFAULT_HALL_WALLS, 15)
    expect(url.startsWith('/wall-mockup?')).toBe(true)
    const q = new URLSearchParams(url.slice(url.indexOf('?') + 1))
    expect(q.get('cm')).toBe('15')
    expect(decodeHallWalls(q.get('walls'))).toEqual(DEFAULT_HALL_WALLS)
  })

  it('cm ngoài khoảng bị kẹp ngay khi dựng địa chỉ', () => {
    expect(new URLSearchParams(hallMockupUrl(DEFAULT_HALL_WALLS, 999).split('?')[1]).get('cm')).toBe(String(HALL_CHAR_CM.max))
  })
})
