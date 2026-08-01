import { describe, it, expect } from 'vitest'
import {
  normalizeForMatch,
  diceCoefficient,
  buildScriptCandidates,
  createScriptMatcher,
  isUsableText,
  scriptKeyterms,
  DEFAULT_SCRIPT_MATCH_CONFIG,
} from '../src/lib/lanes/online/scriptMatcher'
import type { ScriptMatcherEntry } from '../src/lib/lanes/online/scriptMatcher'

// A slice of the kind of script an Esuhai 20th-anniversary gala actually runs to: six Vietnamese
// lines the MC reads in order, one Japanese line the guest speaks, one thank-you line. Row 6 is
// still a draft — nobody has approved its Japanese yet — which is what the demotion cases lean on.
const GALA: ScriptMatcherEntry[] = [
  { id: 'g01', src_lang: 'vi', src: 'Kính thưa quý vị đại biểu, quý vị khách quý.', dst_lang: 'ja', dst: 'ご来賓の皆様、ご列席の皆様。', status: 'approved' },
  { id: 'g02', src_lang: 'vi', src: 'Kính thưa các vị lãnh đạo các cơ quan ban ngành.', dst_lang: 'ja', dst: '関係官庁のご来賓の皆様。', status: 'approved' },
  { id: 'g03', src_lang: 'vi', src: 'Kính thưa toàn thể cán bộ nhân viên công ty Esuhai.', dst_lang: 'ja', dst: 'エスハイ社の社員の皆様。', status: 'approved' },
  { id: 'g04', src_lang: 'vi', src: 'Hôm nay chúng ta long trọng tổ chức lễ kỷ niệm hai mươi năm thành lập công ty.', dst_lang: 'ja', dst: '本日、私たちは創立二十周年記念式典を厳かに執り行います。', status: 'approved' },
  { id: 'g05', src_lang: 'vi', src: 'Xin trân trọng kính mời quý vị cùng hướng lên sân khấu.', dst_lang: 'ja', dst: '皆様、どうぞステージにご注目ください。', status: 'approved' },
  { id: 'g06', src_lang: 'vi', src: 'Sau đây là tiết mục văn nghệ chào mừng của các bạn thực tập sinh.', dst_lang: 'ja', dst: '続きまして、技能実習生の皆さんによる歓迎の演目でございます。', status: 'draft' },
  { id: 'g07', src_lang: 'ja', src: '本日はお忙しい中、誠にありがとうございます。', dst_lang: 'vi', dst: 'Hôm nay quý vị đã dành thời gian quý báu đến dự, chúng tôi xin chân thành cảm ơn.', status: 'approved' },
  { id: 'g08', src_lang: 'vi', src: 'Xin trân trọng cảm ơn ông Takebe đã đến tham dự buổi lễ hôm nay.', dst_lang: 'ja', dst: '竹部様、本日はご列席いただき誠にありがとうございました。', status: 'approved' },
]

const srcOf = (...ids: string[]) =>
  ids.map((id) => GALA.find((row) => row.id === id)?.src ?? '').join(' ')

describe('normalizeForMatch / diceCoefficient — what counts as "the same string"', () => {
  it('drops Vietnamese tone marks and ALL whitespace, so a split syllable still coincides', () => {
    expect(normalizeForMatch('Kính thưa quý vị đại biểu')).toBe('kinhthuaquyvidaibieu')
    // The recogniser splits and joins syllables freely; after normalisation the two coincide.
    expect(normalizeForMatch('Ê su hai')).toBe(normalizeForMatch('Esuhai'))
    expect(normalizeForMatch('Kính  thưa\tquý\nvị')).toBe(normalizeForMatch('Kínhthưaquývị'))
    // đ is not a combining mark — it is folded explicitly.
    expect(normalizeForMatch('đại biểu')).toBe('daibieu')
  })

  it('does NOT strip Japanese dakuten — が must not become か', () => {
    expect(normalizeForMatch('が')).toBe('が')
    expect(normalizeForMatch('が')).not.toBe(normalizeForMatch('か'))
    expect(normalizeForMatch('ご来賓の皆様')).toBe('ご来賓の皆様')
  })

  it('folds katakana onto hiragana and half/full-width digits together', () => {
    expect(normalizeForMatch('エスハイ')).toBe('えすはい')
    expect(normalizeForMatch('ステージ')).toBe(normalizeForMatch('すてーじ'))
    expect(normalizeForMatch('２０２６')).toBe('2026')
    expect(normalizeForMatch('２０周年')).toBe(normalizeForMatch('20周年'))
  })

  it('Dice is 1 for identical strings and 0 for disjoint ones', () => {
    expect(diceCoefficient('kinhthuaquyvi', 'kinhthuaquyvi')).toBe(1)
    expect(diceCoefficient('abcdef', 'abcdef')).toBe(1)
    expect(diceCoefficient('abcd', 'wxyz')).toBe(0)
    expect(diceCoefficient('', 'kinhthua')).toBe(0)
  })

  it('a half-filled box is not "text" at all', () => {
    expect(isUsableText('ご来賓の皆様、ご列席の皆様。', 'ja')).toBe(true)
    expect(isUsableText('', 'ja')).toBe(false)
    expect(isUsableText('N/A', 'ja')).toBe(false)
    expect(isUsableText('chưa dịch', 'ja')).toBe(false)
    // Vietnamese sitting in the Japanese box is not Japanese.
    expect(isUsableText('Kính thưa quý vị', 'ja')).toBe(false)
  })
})

describe('snapping — when the script may be spoken verbatim', () => {
  it('a near-verbatim read snaps and hands back the approved Japanese', () => {
    const matcher = createScriptMatcher(GALA)
    const result = matcher.match(GALA[3].src, 'vi')
    expect(result.band).toBe('snap')
    expect(result.entryIds).toEqual(['g04'])
    expect(result.scriptTarget).toBe(GALA[3].dst)
    expect(result.targetLanguage).toBe('ja')
    expect(result.score).toBe(1)
    expect(result.reason).toBe('khớp kịch bản')
  })

  it('a read with several words misheard still snaps', () => {
    // trọng→chọng, chức→chứt, ty→ti: consonant errors that survive normalisation.
    const heard = 'Hôm nay chúng ta long chọng tổ chứt lễ kỷ niệm hai mươi năm thành lập công ti'
    const result = createScriptMatcher(GALA).match(heard, 'vi')
    expect(result.band).toBe('snap')
    expect(result.entryIds).toEqual(['g04'])
    expect(result.score).toBeGreaterThanOrEqual(DEFAULT_SCRIPT_MATCH_CONFIG.snapThreshold)
    expect(result.score).toBeLessThan(1)
  })

  it('the reverse direction works — hearing the Japanese returns the script\'s Vietnamese', () => {
    const result = createScriptMatcher(GALA).match(GALA[3].dst, 'ja')
    expect(result.band).toBe('snap')
    expect(result.entryIds).toEqual(['g04'])
    expect(result.scriptTarget).toBe(GALA[3].src)
    expect(result.targetLanguage).toBe('vi')
  })

  it('two lines read in one breath match the merged candidate, not just the second one', () => {
    const result = createScriptMatcher(GALA).match(srcOf('g01', 'g02'), 'vi')
    expect(result.band).toBe('snap')
    expect(result.entryIds).toEqual(['g01', 'g02'])
    expect(result.index).toBe(0)
    expect(result.scriptTarget).toContain(GALA[0].dst)
    expect(result.scriptTarget).toContain(GALA[1].dst)
  })

  it('FIVE ceremonial lines in one breath still cover all five, in order, starting at line 1', () => {
    const result = createScriptMatcher(GALA).match(srcOf('g01', 'g02', 'g03', 'g04', 'g05'), 'vi')
    expect(result.band).toBe('snap')
    expect(result.entryIds).toEqual(['g01', 'g02', 'g03', 'g04', 'g05'])
    expect(result.index).toBe(0) // starts at line 1 — the first line is never dropped
    for (const row of GALA.slice(0, 5)) expect(result.scriptTarget).toContain(row.dst)
  })

  it('a run never merges across a direction flip', () => {
    const candidates = buildScriptCandidates(GALA)
    // g06 is the last vi→ja row before the ja→vi guest line g07: no run may span the two.
    expect(candidates.some((c) => c.entryIds.includes('g06') && c.entryIds.includes('g07'))).toBe(false)
    expect(candidates.some((c) => c.entryIds.includes('g07') && c.entryIds.includes('g08'))).toBe(false)
    // Not vacuous: within the same direction the run really does grow to the merge span.
    expect(candidates.some((c) => c.entryIds.join('+') === 'g01+g02+g03+g04+g05+g06')).toBe(true)
    // The flip row itself is still a candidate on its own, in both directions.
    expect(candidates.filter((c) => c.entryIds.join('+') === 'g07')).toHaveLength(2)
  })

  it('a run that includes one unapproved row is demoted to suggest as a whole', () => {
    const result = createScriptMatcher(GALA).match(srcOf('g05', 'g06'), 'vi')
    expect(result.entryIds).toEqual(['g05', 'g06'])
    expect(result.score).toBe(1) // it is a perfect textual match…
    expect(result.band).toBe('suggest') // …and still not spoken
    expect(result.reason).toBe('dòng chưa được duyệt')
  })
})

describe('the refusals — every way the matcher declines to speak', () => {
  it('a short utterance never snaps, in either language', () => {
    const matcher = createScriptMatcher(GALA)
    const vi = matcher.match('Xin cảm ơn.', 'vi')
    expect(vi.band).toBe('none')
    expect(vi.reason).toContain('câu quá ngắn')
    const ja = matcher.match('はい。', 'ja')
    expect(ja.band).toBe('none')
    expect(ja.reason).toContain('câu quá ngắn')
  })

  it('two near-identical script lines are demoted to suggest by the runner-up margin', () => {
    // The real gala shape: identical thanks, only the guest's family name differs.
    const twins: ScriptMatcherEntry[] = [
      { id: 't1', src_lang: 'ja', src: '竹部様、本日は誠にありがとうございました。', dst_lang: 'vi', dst: 'Xin chân thành cảm ơn ông Takebe.', status: 'approved' },
      { id: 't2', src_lang: 'ja', src: '里村様、本日は誠にありがとうございました。', dst_lang: 'vi', dst: 'Xin chân thành cảm ơn ông Satomura.', status: 'approved' },
    ]
    // The name comes back as 竹村 — half of one line, half of the other.
    const result = createScriptMatcher(twins).match('竹村様、本日は誠にありがとうございました。', 'ja')
    expect(result.band).toBe('suggest')
    expect(result.reason).toContain('sát điểm với một dòng khác')
    // It was the MARGIN that stopped it, not the score: the winner cleared the snap bar outright.
    expect(result.score).toBeGreaterThanOrEqual(DEFAULT_SCRIPT_MATCH_CONFIG.snapThreshold)
    expect(result.score - result.runnerUpScore).toBeLessThan(DEFAULT_SCRIPT_MATCH_CONFIG.runnerUpMargin)
  })

  it('an unapproved line is suggest however high it scores', () => {
    const result = createScriptMatcher(GALA).match(GALA[5].src, 'vi')
    expect(result.entryIds).toEqual(['g06'])
    expect(result.score).toBe(1)
    expect(result.band).toBe('suggest')
    expect(result.reason).toBe('dòng chưa được duyệt')
  })

  it('an off-script improvised sentence matches nothing', () => {
    const result = createScriptMatcher(GALA).match(
      'Trời hôm nay Sài Gòn mưa rất to nên xe cộ ngoài đường đi lại khó khăn lắm.',
      'vi',
    )
    expect(result.band).toBe('none')
    expect(result.score).toBeLessThan(DEFAULT_SCRIPT_MATCH_CONFIG.suggestThreshold)
  })

  it('a sentence twice the length of its best line is stopped by the length gate', () => {
    const matcher = createScriptMatcher([GALA[3]])
    expect(matcher.match(GALA[3].src, 'vi').band).toBe('snap')
    // The same line read twice: every bigram agrees, and it is still refused before scoring.
    const doubled = matcher.match(`${GALA[3].src} ${GALA[3].src}`, 'vi')
    expect(doubled.band).toBe('none')
    expect(doubled.rawScore).toBe(0)
    expect(doubled.reason).toBe('không có dòng nào gần giống')
  })

  it('a read LONGER than the merge span is demoted, not snapped onto a run offset by one line', () => {
    // Three lines of near-identical length, read in one breath, against a merge span of two: the
    // runs 1–2 and 2–3 come out level, and 2–3 would drop line 1 and speak line 3 early.
    const trio: ScriptMatcherEntry[] = [
      { id: 'a', src_lang: 'vi', src: 'Kính thưa quý vị đại biểu và quý vị khách quý.', dst_lang: 'ja', dst: 'ご来賓の皆様、ご列席の皆様。', status: 'approved' },
      { id: 'b', src_lang: 'vi', src: 'Kính thưa các vị lãnh đạo cơ quan ban ngành.', dst_lang: 'ja', dst: '関係官庁のご指導の皆様。', status: 'approved' },
      { id: 'c', src_lang: 'vi', src: 'Kính thưa toàn thể cán bộ nhân viên công ty.', dst_lang: 'ja', dst: '全社員の皆様。', status: 'approved' },
    ]
    const breath = trio.map((row) => row.src).join(' ')

    const tooShort = createScriptMatcher(trio, { maxMergeLines: 2 }).match(breath, 'vi')
    expect(tooShort.band).toBe('suggest')
    expect(tooShort.reason).toContain('sát điểm với một dòng khác')

    // With a span that covers the breath the correct full run wins outright — the candidate-shape
    // fix, not a threshold change.
    const covered = createScriptMatcher(trio, { maxMergeLines: 3 }).match(breath, 'vi')
    expect(covered.band).toBe('snap')
    expect(covered.entryIds).toEqual(['a', 'b', 'c'])
  })

  it('a half-filled row is never spoken', () => {
    const halfFilled: ScriptMatcherEntry = {
      id: 'h2',
      src_lang: 'vi',
      src: 'Kính mời quý vị đại biểu lên sân khấu chụp ảnh lưu niệm cùng ban lãnh đạo.',
      dst_lang: 'ja',
      dst: 'N/A',
      status: 'approved',
    }
    // On its own it produces no candidate at all — there is nothing that could be read out.
    expect(createScriptMatcher([halfFilled]).size).toBe(0)
    // Beside a complete row it never enters ANY candidate — not on its own, and not swallowed into a
    // merged run either. A run must stop at it rather than grow through it: the joined target
    // ("…ご列席の皆様。 N/A") passes isUsableText as a whole, so only the row-by-row guard catches it.
    const candidates = buildScriptCandidates([GALA[0], halfFilled])
    expect(candidates.some((c) => c.entryIds.includes('h2'))).toBe(false)
    expect(candidates.every((c) => !c.target.includes('N/A'))).toBe(true)
    // Not vacuous, and the good row beside it is untouched: g01 still stands alone, both directions.
    expect(candidates.filter((c) => c.entryIds.join('+') === 'g01')).toHaveLength(2)
    // …and reading it aloud matches nothing.
    expect(createScriptMatcher([GALA[0], halfFilled]).match(halfFilled.src, 'vi').band).toBe('none')
    // Nor does reading the complete row and the half-filled one in a single breath.
    const breath = createScriptMatcher([GALA[0], halfFilled]).match(`${GALA[0].src} ${halfFilled.src}`, 'vi')
    expect(breath.band).toBe('none')
    expect(breath.entryIds).not.toContain('h2')
  })

  it('an empty script says kịch bản trống', () => {
    const matcher = createScriptMatcher([])
    expect(matcher.size).toBe(0)
    const result = matcher.match(GALA[0].src, 'vi')
    expect(result.band).toBe('none')
    expect(result.reason).toBe('kịch bản trống')
    expect(result.index).toBe(-1)
  })

  it('a sentence in the other language is not even compared', () => {
    const matcher = createScriptMatcher(GALA)
    // Labelled Vietnamese, so the Japanese-source candidates are skipped outright.
    const asVi = matcher.match(GALA[6].src, 'vi')
    expect(asVi.band).toBe('none')
    expect(asVi.reason).toBe('không có dòng nào gần giống')
    expect(asVi.entryIds).toEqual([])
    // The same string labelled Japanese snaps — the only difference is the language filter.
    matcher.reset()
    const asJa = matcher.match(GALA[6].src, 'ja')
    expect(asJa.band).toBe('snap')
    expect(asJa.entryIds).toEqual(['g07'])
  })
})

describe('the order window — where the script has got to', () => {
  it('accept() — and only accept() — advances the cursor', () => {
    const matcher = createScriptMatcher(GALA)
    expect(matcher.position()).toBe(0)
    const first = matcher.match(GALA[0].src, 'vi')
    expect(matcher.position()).toBe(0) // matching alone decides nothing; the operator may veto
    matcher.match(GALA[1].src, 'vi')
    expect(matcher.position()).toBe(0)
    matcher.accept(first)
    expect(matcher.position()).toBe(1)
  })

  it('a merged run advances the cursor past every line it covered', () => {
    const matcher = createScriptMatcher(GALA)
    matcher.accept(matcher.match(GALA[0].src, 'vi'))
    expect(matcher.position()).toBe(1)
    const run = matcher.match(srcOf('g02', 'g03', 'g04'), 'vi')
    expect(run.entryIds).toEqual(['g02', 'g03', 'g04'])
    matcher.accept(run)
    expect(matcher.position()).toBe(4) // not 2 — all three lines are behind us
  })

  it('reset() returns the cursor to the top', () => {
    const matcher = createScriptMatcher(GALA)
    matcher.accept(matcher.match(srcOf('g01', 'g02', 'g03'), 'vi'))
    expect(matcher.position()).toBeGreaterThan(0)
    matcher.reset()
    expect(matcher.position()).toBe(0)
  })

  it('an MC who skips a few lines still matches a later one', () => {
    const matcher = createScriptMatcher(GALA)
    matcher.accept(matcher.match(GALA[0].src, 'vi'))
    expect(matcher.position()).toBe(1)
    const jumped = matcher.match(GALA[4].src, 'vi') // lines 2–4 skipped
    expect(jumped.band).toBe('snap')
    expect(jumped.entryIds).toEqual(['g05'])
    matcher.accept(jumped)
    expect(matcher.position()).toBe(5)
  })
})

describe('scriptKeyterms — priming the recogniser', () => {
  const KEYTERM_SCRIPT: ScriptMatcherEntry[] = [
    { id: 'k1', src_lang: 'vi', src: 'Công ty Esuhai xin kính chào quý vị tại Thành phố Hồ Chí Minh.', dst_lang: 'ja', dst: 'エスハイ株式会社より、ホーチミン市の皆様にご挨拶申し上げます。', status: 'approved' },
  ]

  it('lifts Vietnamese proper nouns (including multi-word ones) and katakana runs', () => {
    const terms = scriptKeyterms(KEYTERM_SCRIPT)
    expect(terms).toContain('Esuhai')
    expect(terms).toContain('Hồ Chí Minh') // a run of capitalised words is lifted as one term
    expect(terms).toContain('エスハイ')
    expect(terms).toContain('ホーチミン')
    // Nothing shorter than three characters gets in.
    expect(terms.every((term) => term.length >= 3)).toBe(true)
    // Each term appears once, however many rows repeat it.
    expect(new Set(terms).size).toBe(terms.length)
    expect(scriptKeyterms(GALA)).toEqual(expect.arrayContaining(['Esuhai', 'Takebe', 'エスハイ', 'ステージ']))
  })

  it('honours the limit', () => {
    expect(scriptKeyterms(GALA, 3)).toHaveLength(3)
    expect(scriptKeyterms(GALA, 1)).toHaveLength(1)
    expect(scriptKeyterms(GALA, 0)).toHaveLength(0)
    expect(scriptKeyterms(GALA).length).toBeLessThanOrEqual(100) // the default limit
  })
})
