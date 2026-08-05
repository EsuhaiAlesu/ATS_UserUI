import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  planForceCommit,
  nextScribeForceCommitDelay,
  SCRIBE_MANUAL_FORCE_COMMIT_MS,
  SCRIBE_FORCE_COMMIT_GAP_MS,
  SCRIBE_FORCE_COMMIT_RETRY_MS,
  SCRIBE_FORCE_COMMIT_GRACE_MS,
} from '../src/lib/lanes/online/scribeManualCommit'

// Trần 25s là trigger DUY NHẤT trong tệp này từng cắt mà không xét gì cả — không dấu câu, không đứng yên,
// không mức tiếng. Bằng chứng là bản ghi tổng duyệt 05/08: `"...đặc biệt của Esuh" | "ai lên phát biểu
// khai mạc."` và `'lời tuyên bố: "Es" | "uhai, chúng ta sẵn sàng"'` — hai lần bổ đôi đúng tên công ty,
// rồi hai nửa được dịch riêng, và tường hội trường hiện 「うはい、私たちは…」.
//
// Commit là cắt TIẾNG, không phải cắt chữ; chữ về sau tiếng vài trăm mili-giây nên không phép thử chữ nào
// cứu được. Tín hiệu thật duy nhất là micro: một khe không có năng lượng âm. Bộ ca này ghim đúng chuyện
// đó — chờ khe, và cái chờ ấy phải LUÔN kết thúc.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const T0 = 1_000_000
const due = T0 + SCRIBE_MANUAL_FORCE_COMMIT_MS // đúng lúc trần chạm

describe('chưa tới trần thì không có chuyện gì xảy ra', () => {
  it('1 · còn sớm ⇒ hẹn lại đúng phần thời gian còn thiếu, không cắt', () => {
    const p = planForceCommit({ lastCommitAt: T0, now: T0 + 10_000, lastLoudAt: T0 + 9_990 })
    expect(p.commit).toBe(false)
    expect(p.delayMs).toBe(nextScribeForceCommitDelay(T0, T0 + 10_000))
    expect(p.delayMs).toBe(SCRIBE_MANUAL_FORCE_COMMIT_MS - 10_000)
    expect(p.waitedMs).toBe(0)
  })
})

describe('tới trần rồi mới hỏi micro', () => {
  it('2 · đang có tiếng ⇒ KHÔNG cắt, ngó lại sau một nhịp ngắn', () => {
    const p = planForceCommit({ lastCommitAt: T0, now: due, lastLoudAt: due - 10 })
    expect(p.commit).toBe(false)
    expect(p.delayMs).toBe(SCRIBE_FORCE_COMMIT_RETRY_MS)
  })

  it('3 · ngay sát ngưỡng khe vẫn là "đang nói" — không cắt sớm một mili-giây nào', () => {
    const p = planForceCommit({ lastCommitAt: T0, now: due, lastLoudAt: due - (SCRIBE_FORCE_COMMIT_GAP_MS - 1) })
    expect(p.commit).toBe(false)
  })

  it('4 · im đủ lâu ⇒ cắt ngay, đây là khe giữa hai từ', () => {
    const p = planForceCommit({ lastCommitAt: T0, now: due, lastLoudAt: due - SCRIBE_FORCE_COMMIT_GAP_MS })
    expect(p.commit).toBe(true)
    expect(p.delayMs).toBe(0)
  })

  it('5 · phòng chưa từng có tiếng ⇒ cắt tự do, không có từ nào để cắt vào', () => {
    expect(planForceCommit({ lastCommitAt: T0, now: due, lastLoudAt: 0 }).commit).toBe(true)
  })
})

describe('cái chờ phải LUÔN kết thúc', () => {
  it('6 · hội trường ồn liên tục ⇒ hết hạn ân hạn là cắt, dù vẫn đang có tiếng', () => {
    const late = due + SCRIBE_FORCE_COMMIT_GRACE_MS
    const p = planForceCommit({ lastCommitAt: T0, now: late, lastLoudAt: late })
    expect(p.commit).toBe(true)
    expect(p.waitedMs).toBe(SCRIBE_FORCE_COMMIT_GRACE_MS)
  })

  it('7 · nhịp ngó lại không bao giờ vượt quá phần ân hạn còn lại', () => {
    const nearly = due + SCRIBE_FORCE_COMMIT_GRACE_MS - 50
    const p = planForceCommit({ lastCommitAt: T0, now: nearly, lastLoudAt: nearly })
    expect(p.commit).toBe(false)
    expect(p.delayMs).toBe(50) // không phải 120 — nếu không, một lần ngó nữa là vượt trần ân hạn
  })

  it('8 · lặp lại thật: 3 giây ồn liên tục rồi mới có khe ⇒ cắt đúng ở khe, không cắt trước', () => {
    let now = due
    let commits = 0
    for (let step = 0; step < 40; step += 1) {
      // ồn suốt 3 giây đầu, sau đó im
      const loudAt = now - due < 3_000 ? now : due + 3_000
      const p = planForceCommit({ lastCommitAt: T0, now, lastLoudAt: loudAt })
      if (p.commit) { commits += 1; break }
      now += p.delayMs
    }
    expect(commits).toBe(1)
    expect(now - due).toBeGreaterThanOrEqual(3_000 + SCRIBE_FORCE_COMMIT_GAP_MS)
    expect(now - due).toBeLessThan(SCRIBE_FORCE_COMMIT_GRACE_MS) // và vẫn còn xa hạn ân hạn
  })
})

describe('nối vào lane', () => {
  it('9 · trần đi qua bộ hoạch định, không còn setTimeout thẳng vào sendManualCommit', () => {
    const lane = read('src/lib/lanes/online/onlineLane.ts')
    const at = lane.indexOf('function armForceCommit')
    const body = lane.slice(at, lane.indexOf('\n  // TASK 24', at))
    expect(body).toContain('planForceCommit({ lastCommitAt: scribeLastCommitAt, now, lastLoudAt })')
    expect(body).toContain('armForceCommit(); // look again — never cut blind')
    // cách hỏng cũ: hẹn giờ rồi cắt thẳng, không hỏi gì
    expect(body).not.toContain('nextScribeForceCommitDelay')
  })

  it('10 · số lần phải chờ khe lên bảng chẩn đoán', () => {
    const lane = read('src/lib/lanes/online/onlineLane.ts')
    expect(lane).toContain('forceGapWaits: number')
    expect(lane).toContain('forceGapWaits += 1')
    expect(read('src/lib/lanes/online/components/OnlineConsole.tsx')).toContain('trần 25s chờ khe im')
  })
})
