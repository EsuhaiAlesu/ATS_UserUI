# PROMPT-17 — Nghe đúng tiếng, và đừng đọc lên thứ không ai nói

**Nền:** `8f31389` (đầu `origin/develop` lúc viết, chính là PROMPT-16). **Chạy sau PROMPT-16.** Toàn bộ 64
khối thay trong bản này đã được áp thử lên đúng nền đó và cho ra **đúng từng byte** cây mã đã chạy thật.

## Chuyện đang xảy ra

Chiều 06/08 chạy thử luồng online với một buổi hai tiếng. Bốn chuyện dưới đây **đo được từ bản ghi buổi**,
không phải cảm giác.

**1. Đổi chiều nói thì máy đứng, và lần sau đứng lâu hơn lần trước.** Nói tiếng Việt, chuyển sang tiếng
Nhật — đứng 6 giây. Chuyển lại tiếng Việt — đứng 24 giây. Chuyển sang tiếng Nhật lần nữa — **treo hẳn**,
quá 35 giây, máy tự nối lại, và **mất luôn đoạn đã nói trong lúc treo**.

Lý do tìm ra trong mã: có một cái trần 25 giây, hết 25 giây mà máy nghe chưa chốt lượt thì mình tự chốt
giùm. Nhưng cái trần đó **chỉ chốt được khi máy nghe còn gửi chữ nháp về**. Máy nghe câm hẳn thì trần bỏ
cuộc, hẹn lại trọn 25 giây nữa, rồi lại bỏ cuộc — vòng vô tận. Tức là **nó vô hiệu đúng lúc cần nó nhất**.
Chỉ còn cái đồng hồ 35 giây, mà cái đó thì nối lại — và nối lại là mất tiếng.

**2. Máy nghe đọc lại đoạn vừa rồi.** 7 trên 60 dòng của buổi lên tường **hai lần**: một câu đã hiện, đã
được đọc lên loa, rồi hai ba câu sau nó hiện lại, lần này nằm trong một khối dài hơn. Chốt chặn cũ chỉ nhớ
**một** câu ngay trước và chỉ so **bằng nhau tuyệt đối** — sáu trong bảy ca nằm cách 2–3 dòng nên ngoài tầm
với, còn ca cách 1 dòng cũng lọt vì bản mới **dài hơn** bản cũ chứ không giống hệt.

**3. Ở chỗ nối giữa hai thứ tiếng, ba câu liền biến thành cháo.** Đoạn tiếng Nhật vừa hết, tiếng Việt bắt
đầu, nhưng máy nghe còn kẹt ở tiếng Nhật nên nó **phiên âm tiếng Việt bằng chữ Nhật**:

> `チ-イ-ラ-モ-、ケ-イ-、ケ-イ-、ケ-イ-、ケ-イ-、ヒ-ウ-ワ-ア-、バン-ド-ウ。`

Ba câu như vậy, khoảng **15 giây**, được dịch ra thành `la-, to-, i-, ka-n-be-` rồi **đọc lên loa**. Không
lớp nào chặn được, vì nhãn tiếng của máy nghe nói "tiếng Nhật" và mặt chữ cũng là chữ Nhật — mọi lớp đồng
thuận, mọi lớp đều sai, vì cả hai đều đọc cùng một thứ do chính máy nghe viết ra.

**4. Dẫn theo kịch bản: máy đọc trước mặt người đang nói.** Người dẫn mới đọc được một phần ba dòng thì máy
đã nhả **trọn cả dòng** đã duyệt lên tường và đọc lên loa. Lý do: điểm giống nhau được tính theo kiểu
thưởng cho câu ngắn, nên một phần ba dòng đã đạt 0,50 trong khi ngưỡng chỉ là 0,45. Ngưỡng thấp là **cố ý**
(có người chỉ tay vào dòng rồi, máy chỉ cần đồng ý đại khái là đúng dòng đó — chính chỗ đó tha cho micrô
tồi), nhưng nó tha luôn một thứ nó chưa bao giờ định tha.

## Bảy việc trong bản này

1. **Đường tiếng thứ hai.** Người vận hành có thể chỉ cho máy một nguồn tiếng thứ hai (tiếng từ máy tính —
   người họp từ xa, video phát ra loa). Từ đó máy biết **câu này vào bằng ngõ nào**, và ngõ vào thì không
   phải một phép đo có thể sai: cái gì nói trong phòng không tự chui vào máy tính được, cái gì máy tính
   phát ra thì không vào micrô mà lại không vào đường của chính nó. Bằng chứng này **đứng trên mọi bằng
   chứng khác**, chỉ dưới bảng chương trình.

2. **Một chỗ duy nhất quyết chiều dịch, và nó không bao giờ vứt câu.** Trước đây khi máy nghe gọi tên một
   thứ tiếng thứ ba (tiếng Trung, tiếng Nga, tiếng Ý — bản ghi buổi lễ có đủ, trên giọng người Việt) thì
   câu đó **bị xoá hẳn**. Từ hội trường nhìn lên, đó không phải "máy chưa nhận ra tôi", đó là một khoảng
   lặng không biết bao giờ hết. Nay câu tiếng lạ được **mượn** sang chiều còn lại cho đúng một câu, không
   bao giờ chốt lại. Và có ba luật của người phiên dịch thật: nhãn nghe được từ âm thanh đứng trên mặt chữ;
   một chữ kana không phải là đổi người nói; **nghỉ một nhịp là bàn giao**.

3. **Mượn nhãn của câu kề bên.** Nhãn tiếng chỉ đi kèm bản chốt của máy nghe, mà câu "nhả sớm" thì cắt ra
   từ dòng chữ nháp nên **không bao giờ có nhãn**. Đo được: 39 trong 52 câu của một buổi là nhả sớm, tức ba
   phần tư số câu đang được định chiều bằng cách **đọc mặt chữ** — đúng cái việc cần bớt đi. Nay câu không
   có nhãn được mượn nhãn của câu liền kề, trong vòng 8 giây, và chỉ là bằng chứng **yếu**.

4. **Máy nghe đọc lại thì cắt đi.** Nhớ 6 câu gần nhất thay vì 1, và so theo **bao hàm** thay vì bằng nhau.
   So theo **chữ**, bỏ qua dấu câu và dấu nháy — vì dấu chấm giữa câu là do chính nấc "nhả câu sớm" chấm
   vào lúc cắt, chứ không phải người nói. Cắt cả kiểu "đuôi câu cũ = đầu câu mới". Nhưng **sai một chữ thì
   không cắt**: cắt mù là nuốt chữ, mà nuốt thì không ai thấy, còn lặp thì thấy được.

5. **Trần 25 giây có đường cấp cứu.** Máy nghe câm hẳn thì vẫn chốt được, miễn là micrô có nghe thấy tiếng
   từ lần chốt trước. Và nếu cấp cứu cũng không vào được thì có một **con số đếm** hiện lên bảng chẩn đoán
   — đó là thứ duy nhất nhìn thấy trước khi cái treo xảy ra.

6. **Đừng đọc lên thứ không phải tiếng người.** Hai chốt: dòng **không có lấy một chữ cái nào** (buổi 06/08
   kết thúc bằng một dòng có nội dung đúng bằng một dấu nháy kép — nó vẫn lên tường, vẫn gọi bộ dịch, vẫn
   được đọc lên loa), và **cháo âm tiết**. Quét cả kho bản ghi (2659 dòng, mọi buổi đã ghi): hai chốt này
   bắt **41 dòng**, và **không bắt nhầm dòng thật nào**.

7. **Chưa đọc hết dòng thì chưa nhả; và chữ tách khỏi giọng.** Dòng kịch bản phải được đọc tới đuôi mới
   nhả — đo trên một dòng lễ thật: đọc ba phần tư thì phần đuôi được 0,47, đọc trọn qua micrô tồi thì phần
   đuôi được 1,0; ngưỡng đặt vào đúng khoảng giữa. Và **chữ lên tường ngay, còn giọng đọc thì chờ** chiều
   dịch được chốt — người ta đọc được chữ sai chiều trong nửa giây, chứ không nghe lại được câu đã đọc sai.

**Số:** 989 ca / 72 tệp  →  **1147 ca / 79 tệp** (thêm 158 ca). `tsc` sạch, `npm run build` xanh,
`oxlint` 0 lỗi.

**Bốn tệp test có sẵn bị sửa, và đây là lý do — không phải nới ca cho dễ đậu:**

| Tệp | Đổi gì | Vì sao |
|---|---|---|
| `tests/segmentDirectionLock.test.ts` | 2 khẳng định đổi chữ | Việc chốt tiếng của một câu đã xong nay do bộ định chiều làm chứ không do luật đọc mặt chữ. Thứ bộ test này canh — bảng chương trình khoá thì cả hai chỗ phải đứng im — **giữ nguyên**, và vẫn được canh y như cũ. |
| `tests/guidedRelease.test.ts` | 1 khẳng định đổi chữ | Hàm đọc dòng kịch bản nhận thêm một tham số (chiều nguồn). Ý của ca này — nhả dẫn tay thì **phải đọc lên** — không đổi. |
| `tests/guidedDeaf.test.ts` | nới bề rộng cửa sổ 1400 → 2200 | Ca này cắt một khúc mã ra soi. Có thêm mã chèn vào giữa khúc đó nên cửa sổ phải rộng ra mới bọc trọn. Con số chỉ là bề rộng, không mang ý nghĩa nào khác. |
| `tests/guidedMatch.test.ts` | thêm 1 ca, sửa 1 ca | Ca cũ dùng một dòng thử **quá ngắn** nên bị chính cổng "chưa hết câu" mới chặn — đã thay bằng dòng đầy đủ, giữ nguyên ý. Ca thêm là ca cho cổng mới. |

**Hai tệp KHÔNG có trong bản này, cố ý:** `voicePrint.ts` và `speakerTurn.ts` (nhận người nói qua đặc trưng
giọng) đã viết xong nhưng **không nối vào đâu cả** — hướng đó bị thay bằng "đọc theo ngõ vào" ở việc số 1,
vốn không phải phỏng đoán. Không đưa mã chết sang máy Sếp.

---

## TASK 104 — `src/lib/lanes/online/sourceAttribution.ts` (TỆP MỚI)

Câu vừa rồi vào bằng ngõ nào. Luật **không đối xứng** và đó là chủ ý: tiếng máy tính thì chắc chắn không
phải người trong phòng nói, nên chỉ cần đường máy tính có tiếng là gán cho nó; còn micrô thì hở, tiếng loa
trong phòng cũng lọt vào micrô được. Tạo tệp mới với nội dung sau.

**`src/lib/lanes/online/sourceAttribution.ts`**

```ts
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
```

## TASK 105 — `src/lib/lanes/online/directionRouter.ts` (TỆP MỚI)

Chỗ duy nhất quyết chiều của một câu đã chốt. Đọc kỹ ba luật ở đầu tệp — chúng là ba thói quen của một kíp
phiên dịch thật, và luật thứ ba (**nghỉ một nhịp là bàn giao**) mới là thứ phá được cái kẹt "máy dính cứng
ở tiếng Nhật": ra khỏi tiếng Nhật không còn phải cãi thắng chữ kana nữa, chỉ cần chờ ai đó thở. Tạo tệp
mới với nội dung sau.

**`src/lib/lanes/online/directionRouter.ts`**

```ts
// src/lib/lanes/online/directionRouter.ts — WHICH WAY IS THIS SENTENCE GOING.
//
// One microphone, two languages, and until now the answer came from `decideFinalLanguage` alone: kana
// beats everything, instantly, with no memory and no inertia. That single rule made switching direction a
// ONE-WAY RATCHET, and the ratchet is what the hall experiences as "the machine gets stuck in Japanese":
//
//   · getting IN  — one stray kana character anywhere in the sentence, and the turn is Japanese;
//   · getting OUT — needs Vietnamese tone marks, or the vendor's own tag. But while the recogniser is
//     sitting in Japanese context, Vietnamese speech comes back as kana and kanji — so the wrong answer
//     keeps re-confirming itself, sentence after sentence.
//
// And the last gate made it worse rather than better: when the vendor named a THIRD language and the text
// carried no tone marks, the sentence was DISCARDED. A Vietnamese sentence misheard as Chinese did not
// arrive late — it never arrived at all. From the ballroom that is not "it hasn't recognised me yet", it
// is a silence with no end in sight.
//
// This module is the three rules that a human interpreting team follows without thinking about it:
//
//   1. PROJECT, NEVER DROP. Anything that is not one of our two languages is assigned to the one that is
//      not the base direction. A wrongly-labelled sentence can still be read; a discarded one cannot.
//   2. INERTIA. One kana character is not a change of speaker. Switching needs strong evidence, or two
//      weak ones in a row.
//   3. A PAUSE IS A HANDOVER. People do not change which language they are speaking mid-breath; they stop,
//      and someone else starts. So a gap past the threshold forgets the running direction and re-decides
//      from the base. THIS is what breaks the ratchet — leaving Japanese no longer has to out-argue kana,
//      it only has to wait for somebody to take a breath.
//
// Pure module: no React, no fetch, no DOM, no clock of its own (the caller passes the measured gap).

import { normalizeVendorLanguage, scriptSignals, type Lang } from './utteranceDirection';

export type { Lang };

export type RouterBasis =
    | 'source'      // the sound came in on a cable that only one side can put sound into — see `sourceLang`
    | 'kana'        // hiragana/katakana — no other language has them
    | 'script'      // Vietnamese tone marks — likewise
    | 'vendor'      // the recogniser named one of our two
    | 'vendor-near' // no tag on THIS sentence; borrowed the acoustic tag of the one beside it
    | 'projected'   // it named a third one; we borrowed the non-base direction for this sentence only
    | 'pause-reset' // nothing in the text decided it; the handover did
    | 'sticky'      // nothing decided it; the turn in progress carries on
    | 'locked';     // the running order said so, and the running order outranks every measurement

export interface RouterEvidence {
    /** The finalised (or early-released) sentence. */
    text: string;
    /** The vendor's own language tag, raw and unfolded (`vi`, `ja-JP`, `zh`, `und`, …). May be absent. */
    vendorRaw?: string;
    /**
     * Nhãn ÂM của một câu KỀ BÊN, mượn sang khi câu này không có nhãn của riêng nó.
     *
     * Vì sao cần: nhãn tiếng chỉ cưỡi trên bản chốt CÓ MỐC THỜI GIAN của máy nghe. Câu "nhả sớm" thì cắt
     * ra từ dòng partial, nên nó KHÔNG BAO GIỜ có nhãn. Đo trên phiên 06/08: 39 trong 52 câu là nhả sớm,
     * và cả 39 câu đó đi tới đây với `vendorRaw` rỗng — tức là ba phần tư số câu được định chiều bằng
     * cách đọc mặt chữ, đúng cái việc mà cả tệp này dựng ra để bớt đi.
     *
     * Nên câu không có nhãn được mượn nhãn của câu liền kề, nhưng chỉ như một bằng chứng YẾU: nó nói về
     * người đang cầm micro, không nói về câu này. Yếu nghĩa là quán tính vẫn áp — muốn lật chiều thì phải
     * hai lượt liên tiếp, hoặc một nhịp nghỉ. Và nó vẫn nằm DƯỚI kana đặc: một câu tiếng Nhật thật sự thì
     * tự nó làm chứng được, không cần hỏi hàng xóm.
     *
     * Phía gọi chịu trách nhiệm về ĐỘ TƯƠI — nhãn của mười phút trước không nói gì về câu bây giờ.
     */
    vendorCarriedRaw?: string;
    /** Milliseconds of silence before this sentence began. The caller measures it; this module only reads. */
    gapMs: number;
    /**
     * The language implied by WHICH AUDIO CABLE this sentence arrived on. Absent unless the operator has
     * given the lane a second audio source (see `sourceAttribution.ts`).
     *
     * This outranks every other reading in this file, and it is not a close call. Everything else here is
     * an inference from a transcript that a recogniser produced — kana can be a Vietnamese sentence written
     * in the wrong script, the vendor tag can name Italian. A cable cannot: nothing said in the room can
     * make the computer play audio, and nothing played by the computer arrives on the room's microphone
     * without also arriving on the computer's own output. There is no measurement to be wrong about.
     */
    sourceLang?: Lang;
}

export interface RouterVerdict {
    /** The language to transcribe/translate FROM. Never null — this module always answers. */
    language: Lang;
    /** Did the running direction actually change on this sentence? */
    switched: boolean;
    /** The vendor named a third language and it was borrowed onto ours rather than thrown away. */
    projected: boolean;
    /**
     * Always false. It exists so the invariant is TESTABLE rather than merely claimed: there is no path
     * through this module that loses a sentence, and a future edit that adds one will turn a test red.
     */
    dropped: false;
    basis: RouterBasis;
    /** One short line for the diagnostics readout, in the operator's language. */
    reason: string;
}

/**
 * What a pause MEANS, and it is not the same thing in a ceremony as in a meeting.
 *
 * · `anchor` — there is a running order, so `base` is a fact about the room: this part of the programme is
 *   in Vietnamese, that part is in Japanese. A pause returns to it, because the schedule outranks whoever
 *   happened to be talking a moment ago.
 *
 * · `free` — an internal meeting. Nobody wrote down who speaks what, so `base` is only the direction
 *   somebody picked when they switched the machine on. Snapping back to it on every breath is actively
 *   wrong: a Japanese guest explaining something for five minutes pauses constantly, and each pause would
 *   drag the direction back to Vietnamese and force it to be won again. Here a pause does NOT change the
 *   running direction — it REOPENS THE QUESTION: inertia is cleared, and the first reading after it counts
 *   for a switch on its own instead of needing a second one to back it up. A handover is exactly the
 *   moment when one piece of evidence is worth two.
 */
export type BaseMode = 'anchor' | 'free';

export interface DirectionRouterConfig {
    baseMode: BaseMode;
    /**
     * How long a silence has to be before it counts as somebody handing over.
     *
     * 1.5s, in the middle of the band a human interpreter uses. Below ~1s is still one person thinking
     * mid-sentence; past ~2s the machine has already spent the pause pointing the wrong way, which is the
     * whole cost this number is here to avoid.
     */
    pauseResetMs: number;
    /**
     * How many kana before the evidence is STRONG rather than weak.
     *
     * One is not evidence of anything: "ông Tanaka さん" in the middle of a Vietnamese sentence is a name,
     * not a change of language, and treating it as strong is exactly how half a Vietnamese sentence used
     * to be translated backwards.
     */
    kanaStrong: number;
    /** Vietnamese tone marks needed before the same is true the other way. */
    marksStrong: number;
    /** Weak readings in a row, all pointing the same way, that add up to one strong one. */
    weakToSwitch: number;
    /**
     * Latin letters in a sentence with NO Japanese script at all before that absence becomes evidence.
     *
     * Real Japanese transcription is never a bare Latin run: hiragana carries the grammar, so a sentence
     * with no kana and no kanji is not a Japanese sentence — whatever else it is. That matters because the
     * hardest handover in the room produces exactly this shape. The MC takes the microphone back while the
     * recogniser is still in Japanese context, and Vietnamese comes out with the tone marks stripped:
     * "Cam on ong da chia se." No kana, no kanji, no tone marks, no vendor tag. Every other rule in this
     * file has nothing to say about it, so the turn stayed Japanese and was translated backwards.
     *
     * 10 letters ≈ two or three words, which is what keeps the things people genuinely say inside a
     * Japanese turn from firing it: "OK", "Esuhai", "ISO 9001", a year. WEAK, never strong — one line of
     * romaji must not outrank a pause or the running order.
     */
    latinRunWeak: number;
    /**
     * Đọc nhãn ngôn ngữ của máy nghe TRƯỚC khi soi mặt chữ. Bật sẵn.
     *
     * Đây là một phép TRỪ, không phải phép cộng, và nó đảo lại thứ tự cũ của tệp này. Lý do:
     *
     *   · nhãn của máy nghe là kết luận từ ÂM THANH. Nó nghe sóng âm, không đọc chữ.
     *   · mọi luật còn lại trong tệp này đọc CHỮ — mà chữ là thứ do chính máy nghe viết ra.
     *
     * Khác biệt chỉ lộ ra ở đúng ca đắt nhất: máy nghe chép một câu tiếng Việt RA KANA. Lúc đó chữ không
     * im lặng, chữ NÓI DỐI, và luật kana — luật đứng đầu bảng theo thứ tự cũ — bị lừa với đầy đủ sức mạnh
     * của một bằng chứng "mạnh". Nhãn âm không dính lỗi đó, vì nó không đọc cái chữ ấy.
     *
     * Đổi lại thì mất gì: nhãn âm đã ĐO ĐƯỢC là có lúc sai (log buổi lễ có cả tiếng Trung, Nga, Ý trên
     * giọng người Việt). Nhưng lúc nó sai kiểu đó, nó gọi tên một tiếng THỨ BA — và tiếng thứ ba đã có
     * đường đi riêng (`projected`, mượn cho đúng một câu, không bao giờ chốt lại). Cái bật lên ở đây chỉ
     * là: khi nó gọi tên MỘT TRONG HAI tiếng của ta, hãy tin nó hơn mặt chữ.
     *
     * Tắt đi (`false`) là về đúng thứ tự cũ, để đối chứng A/B trên cùng một buổi ghi log.
     */
    vendorFirst: boolean;
}

export const DIRECTION_ROUTER_DEFAULTS: DirectionRouterConfig = {
    baseMode: 'anchor', // the ceremony is the case that already exists; a meeting has to ask for `free`
    pauseResetMs: 1_500,
    kanaStrong: 3,
    marksStrong: 2,
    weakToSwitch: 2,
    latinRunWeak: 10,
    vendorFirst: true,
};

export interface RouterStats {
    /** Sentences where the running direction actually changed. */
    switches: number;
    /** Sentences that were a third language and got borrowed onto ours instead of dropped. */
    projected: number;
    /** Handovers detected from silence. */
    pauseResets: number;
    /** Sentences that carried on the direction already running, because nothing in them decided. */
    sticky: number;
    /**
     * Cái gì đã quyết chiều, đếm theo từng loại — đây là cách DUY NHẤT để trả lời "bớt quán tính đi thì
     * tốt hơn hay tệ hơn" bằng số thay vì bằng cảm giác. Sau một buổi ghi log, `vendor` cao và `sticky`
     * thấp nghĩa là nhãn âm đang gánh việc; `sticky` cao nghĩa là router đang đi bằng quán tính, tức là
     * đang đoán.
     */
    byBasis: Record<RouterBasis, number>;
}

const emptyBasisCounts = (): Record<RouterBasis, number> => ({
    source: 0, kana: 0, script: 0, vendor: 0, 'vendor-near': 0, projected: 0, 'pause-reset': 0, sticky: 0, locked: 0,
});

type Reading = { language: Lang; strong: boolean; basis: RouterBasis } | null;

/**
 * What one sentence, on its own, says about the language it is in.
 *
 * The order is the point. Kana and Vietnamese tone marks come first because they appear in no other
 * language on earth; the vendor comes after them because it hears the audio but has been measurably wrong
 * about Vietnamese (Chinese, Russian and Italian all appear in the ceremony logs, on Vietnamese speech).
 *
 * Note what is NOT evidence: BARE KANJI. A Chinese mis-transcription of Vietnamese looks exactly like
 * Japanese to a character test, and that lookalike is the single most expensive mistake this pipeline has
 * made — it is what routed whole sentences backwards and then had them read aloud.
 */
/** Letters of the Latin alphabet, unaccented — the shape a Vietnamese sentence takes when tones are lost. */
const LATIN = /[a-z]/gi;

function read(ev: RouterEvidence, cfg: DirectionRouterConfig, base: Lang): Reading & { projected?: boolean } {
    const { kana, kanji, vnMarks } = scriptSignals(ev.text);
    const vendor = normalizeVendorLanguage(ev.vendorRaw);
    const named = vendor === 'vi' || vendor === 'ja';

    // `vendorFirst`: nhãn ÂM đứng trên mặt CHỮ. Xem chú thích dài ở `DirectionRouterConfig.vendorFirst` —
    // câu tiếng Việt bị chép ra kana là ca duy nhất hai thứ này bất đồng, và cũng là ca đắt nhất.
    if (cfg.vendorFirst && named) return { language: vendor as Lang, strong: true, basis: 'vendor' };

    if (kana >= cfg.kanaStrong) return { language: 'ja', strong: true, basis: 'kana' };
    if (kana === 0 && vnMarks >= cfg.marksStrong) return { language: 'vi', strong: true, basis: 'script' };

    if (named) return { language: vendor as Lang, strong: true, basis: 'vendor' };
    if (vendor === 'other') {
        // Rule 1. Borrowed for THIS SENTENCE ONLY and never latched: the machine has just admitted it does
        // not know what it heard, and letting a confession of ignorance set the direction for everything
        // after it would build a second ratchet beside the one this file exists to remove.
        return { language: base === 'vi' ? 'ja' : 'vi', strong: false, basis: 'projected', projected: true };
    }

    // Câu này không có nhãn của riêng nó ⇒ mượn nhãn ÂM của câu kề bên. Đứng TRÊN mọi bằng chứng mặt chữ
    // yếu bên dưới, vì cùng một lý lẽ đã bật `vendorFirst`: nhãn nghe từ sóng âm, còn chữ là thứ do chính
    // máy nghe viết ra và có thể viết sai. Đứng DƯỚI kana đặc ở trên, vì câu tự làm chứng được thì không
    // cần hỏi hàng xóm.
    const carried = normalizeVendorLanguage(ev.vendorCarriedRaw);
    if (carried === 'vi' || carried === 'ja') {
        return { language: carried as Lang, strong: false, basis: 'vendor-near' };
    }

    if (kana > 0) return { language: 'ja', strong: false, basis: 'kana' };
    if (vnMarks > 0) return { language: 'vi', strong: false, basis: 'script' };

    // The absence of Japanese script IS evidence, once there is enough of a sentence for the absence to
    // mean something. A run of Latin this long with no kana and no kanji is not Japanese — and the case it
    // rescues is the worst handover in the room: the MC takes the microphone back, the recogniser is still
    // in Japanese context, and Vietnamese arrives with the tones stripped and no vendor tag. Nothing above
    // this line has anything to say about "Cam on ong da chia se." See `latinRunWeak`.
    if (kana === 0 && kanji === 0 && (ev.text.match(LATIN) || []).length >= cfg.latinRunWeak) {
        return { language: 'vi', strong: false, basis: 'script' };
    }

    return null; // bare kanji, "OK", "Esuhai", a number — nothing here decides anything
}

export interface DirectionRouter {
    /** Judge one sentence. This is the only call that changes state. */
    next(ev: RouterEvidence): RouterVerdict;
    /** The direction currently running. */
    current(): Lang;
    /** The direction the operator (or the running order) says this part of the ceremony is in. */
    base(): Lang;
    setBase(next: Lang): void;
    /**
     * Ceremony or meeting. Runtime-settable rather than fixed at construction because the lane learns which
     * one it is AFTER the router exists — a script may be loaded (or cleared) at start, and a session that
     * begins with no running order is a meeting until one arrives.
     */
    baseMode(): BaseMode;
    setBaseMode(next: BaseMode): void;
    /** The running order naming this speaker's language outranks every measurement. `null` releases it. */
    lock(next: Lang | null): void;
    locked(): Lang | null;
    stats(): RouterStats;
    reset(next?: Lang): void;
}

export function createDirectionRouter(
    initialBase: Lang,
    overrides: Partial<DirectionRouterConfig> = {},
): DirectionRouter {
    const cfg: DirectionRouterConfig = { ...DIRECTION_ROUTER_DEFAULTS, ...overrides };
    let base: Lang = initialBase;
    let running: Lang = initialBase;
    let lockedLang: Lang | null = null;
    let weakLang: Lang | null = null;
    let weakCount = 0;
    const stats: RouterStats = { switches: 0, projected: 0, pauseResets: 0, sticky: 0, byBasis: emptyBasisCounts() };

    const clearWeak = () => { weakLang = null; weakCount = 0; };
    const tally = <T extends RouterVerdict>(v: T): T => { stats.byBasis[v.basis] += 1; return v; };

    function next(ev: RouterEvidence): RouterVerdict {
        if (lockedLang) {
            return tally({
                language: lockedLang, switched: false, projected: false, dropped: false,
                basis: 'locked' as const, reason: `chương trình khoá chiều · ${lockedLang}`,
            });
        }

        const before = running;

        // Bằng chứng CỔNG đứng trên tất cả, chỉ dưới khoá chương trình. Nó không phải một phép đo có thể
        // sai — nó là sợi dây. Và nó chạy TRƯỚC nhánh khoảng lặng: biết chắc ai vừa nói thì không còn gì
        // để một cái ngưỡng im lặng phỏng đoán nữa. Quán tính cũng bị xoá, vì bằng chứng yếu góp nhặt từ
        // lượt của người khác thì nói về người khác.
        if (ev.sourceLang) {
            running = ev.sourceLang;
            clearWeak();
            const switchedBySource = running !== before;
            if (switchedBySource) stats.switches += 1;
            return tally({
                language: running, switched: switchedBySource, projected: false, dropped: false,
                basis: 'source' as const,
                reason: `theo nguồn tiếng · ${NAME[running]}`,
            });
        }

        // Rule 3, and it runs BEFORE anything is read: the handover has already happened by the time the
        // next sentence exists, so the sentence must be judged against the base, not against whoever was
        // talking a moment ago.
        let viaPause = false;
        if (ev.gapMs >= cfg.pauseResetMs) {
            viaPause = true;
            stats.pauseResets += 1;
            // `anchor`: the running order says what this part of the programme is in, so go back to it.
            // `free`: there is no running order to go back to. The pause reopens the question (below) but
            // does not answer it — the turn in progress carries on until something in the text says
            // otherwise. See BaseMode.
            if (cfg.baseMode === 'anchor') running = base;
            clearWeak();
        }

        const reading = read(ev, cfg, base);

        if (reading?.projected) {
            stats.projected += 1;
            return tally({
                language: reading.language, switched: false, projected: true, dropped: false,
                basis: 'projected' as const,
                reason: `máy nghe gọi tên một tiếng khác — đọc theo ${reading.language === 'ja' ? 'tiếng Nhật' : 'tiếng Việt'}`,
            });
        }

        let basis: RouterBasis;
        if (!reading) {
            stats.sticky += 1;
            basis = viaPause && cfg.baseMode === 'anchor' ? 'pause-reset' : 'sticky';
        } else if (reading.language === running) {
            clearWeak();
            basis = reading.basis;
        } else if (reading.strong) {
            running = reading.language;
            clearWeak();
            basis = reading.basis;
        } else {
            // Rule 2. Weak, and pointing away from the turn in progress: remember it, and let the NEXT one
            // decide. Two in a row saying the same thing is a speaker, one on its own is a proper noun.
            weakCount = weakLang === reading.language ? weakCount + 1 : 1;
            weakLang = reading.language;
            // In `free`, the FIRST sentence after a handover switches on weak evidence alone. Inertia is
            // there to stop a proper noun mid-turn from flipping the direction — but right after a pause
            // there is no turn to be mid-way through, and making the new speaker prove themselves twice is
            // exactly the two sentences of backwards translation this module exists to remove.
            const enough = weakCount >= cfg.weakToSwitch || (viaPause && cfg.baseMode === 'free');
            if (enough) {
                running = reading.language;
                clearWeak();
                basis = reading.basis;
            } else {
                basis = viaPause && cfg.baseMode === 'anchor' ? 'pause-reset' : 'sticky';
            }
        }

        const switched = running !== before;
        if (switched) stats.switches += 1;
        return tally({
            language: running, switched, projected: false, dropped: false, basis,
            reason: reasonFor(basis, running, viaPause && cfg.baseMode === 'anchor'),
        });
    }

    return {
        next,
        current: () => running,
        base: () => base,
        setBase(nextBase: Lang) { base = nextBase; },
        baseMode: () => cfg.baseMode,
        setBaseMode(nextMode: BaseMode) { cfg.baseMode = nextMode; },
        lock(nextLock: Lang | null) {
            lockedLang = nextLock;
            // A lock is also a STATEMENT ABOUT THE DIRECTION NOW RUNNING, not merely an override sitting on
            // top of it. Leave `running` alone and it goes stale for the whole locked segment, so releasing
            // the lock hands the room back to whoever was talking before the segment began — which is the
            // previous speaker, in the previous language, and exactly the handover the operator just
            // corrected by pressing the line. Inertia is cleared for the same reason: weak evidence
            // collected before a named speaker took the microphone is about somebody else.
            if (nextLock) { running = nextLock; clearWeak(); }
        },
        locked: () => lockedLang,
        stats: () => ({ ...stats, byBasis: { ...stats.byBasis } }),
        reset(nextBase?: Lang) {
            if (nextBase) base = nextBase;
            running = base;
            lockedLang = null;
            clearWeak();
        },
    };
}

const NAME: Record<Lang, string> = { vi: 'tiếng Việt', ja: 'tiếng Nhật' };

function reasonFor(basis: RouterBasis, lang: Lang, viaPause: boolean): string {
    const who = NAME[lang];
    switch (basis) {
        case 'kana': return `thấy chữ kana · ${who}`;
        case 'script': return `thấy dấu thanh · ${who}`;
        case 'vendor': return `máy nghe gọi tên · ${who}`;
        case 'vendor-near': return `mượn nhãn câu kề bên · ${who}`;
        case 'pause-reset': return `nghỉ một nhịp — về chiều nền · ${who}`;
        case 'locked': return `chương trình khoá chiều · ${who}`;
        default: return viaPause ? `nghỉ một nhịp — về chiều nền · ${who}` : `nói tiếp lượt đang chạy · ${who}`;
    }
}
```

## TASK 106 — `src/lib/lanes/online/echoGuard.ts` (TỆP MỚI)

Máy nghe đọc lại đoạn vừa rồi. Luật an toàn nằm ở đầu tệp và nó là chỗ đánh đổi **có chủ ý**: khớp thì mới
cắt, sai một chữ thì giữ nguyên cả câu — vì lặp một lần trên tường thì nhìn thấy được và sửa được, còn nuốt
mất một tiếng thì không ai biết. Tạo tệp mới với nội dung sau.

**`src/lib/lanes/online/echoGuard.ts`**

```ts
// src/lib/lanes/online/echoGuard.ts — MÁY NGHE ĐỌC LẠI ĐOẠN VỪA RỒI.
//
// Chốt lượt (`commit`) KHÔNG xoá ngữ cảnh của máy nghe. Nó đóng một lượt, nhưng lượt kế tiếp có thể mở ra
// bằng chính những chữ vừa đóng lại, rồi nói tiếp. Nhìn từ hội trường: một câu đã lên tường, đã được đọc
// lên loa, rồi ba câu sau nó lên tường lần nữa — lần này nằm trong một khối dài hơn.
//
// Đo được, không phải phỏng đoán. Bản ghi 06/08 (`online_20260806-131634.json`, 60 dòng) có 7 dòng lặp,
// tức 12%, khoảng cách từ 1 tới 3 dòng:
//
//     dòng 3  = dòng 1 + dòng 2 + phần mới     dòng 16 = dòng 13, nguyên văn
//     dòng 9  = dòng 7 + phần mới              dòng 17 = dòng 14, nguyên văn
//
// VÌ SAO HAI LỚP SẴN CÓ ĐỀU TRƯỢT:
//
//   · `stripPromotedPrefix` chỉ trừ TRONG MỘT LƯỢT. `promotedPrefix` là tiền tố của một lượt cụ thể và bị
//     xoá ngay khi lượt đó chốt — đúng, nhưng nó không nói gì về lượt SAU.
//   · chốt chặn lặp cũ so `transcript === previousFinalTranscript`: MỘT biến (sâu đúng 1 bậc) và MỘT phép
//     so BẰNG NHAU. Sáu trong bảy ca trên nằm ở khoảng cách 2–3, còn ca duy nhất ở khoảng cách 1 cũng lọt
//     vì bản mới DÀI HƠN bản cũ chứ không giống hệt.
//
// Nên tệp này đổi hai thứ, đúng hai thứ đó: nhớ NHIỀU câu, và so theo BAO HÀM thay vì bằng nhau.
//
// LUẬT AN TOÀN — cắt mù là nuốt chữ, và nuốt thì không ai thấy. Chỉ cắt khi khớp CHÍNH XÁC theo CHỮ. Máy
// nghe chép lại đoạn cũ có SỬA một chữ ⇒ không khớp ⇒ giữ nguyên cả câu. Đó là lặp một lần trên tường, và
// lặp thì nhìn thấy được. Đổi lấy cái thấy được là cố ý, giống hệt lý lẽ đã viết ở `stripPromotedPrefix`.
//
// KHỚP THEO CHỮ, KHÔNG THEO DẤU — đo được ở phiên 14:43 ngày 06/08:
//
//     đã nhả:  "...so với các quyền lực cứng."
//     chốt sau: "...so với các quyền lực cứng về sức mạnh kinh tế hay là sức mạnh về quân sự."
//
// Bản đầu của tệp này chỉ bỏ qua khoảng trắng, nên nó dừng ngay ở dấu chấm: câu đã nhả có "cứng." còn câu
// sau có "cứng về" — lệch một ký tự, và cả câu dài lên tường lần thứ hai. Dấu chấm đó KHÔNG do người nói
// mà do chính nấc "nhả câu sớm" chấm vào lúc cắt. Cùng phiên còn một ca nữa: `hai chữ "đủ đầy"` với cặp
// nháy, so với `hai chữ đủ đầy` không nháy. Nên phép so bỏ qua luôn dấu câu và dấu nháy — chỉ chữ mới
// tính. Bỏ qua dấu KHÔNG nới lỏng luật an toàn ở trên: sai một CHỮ thì vẫn không cắt.
//
// Pure module: không React, không fetch, không DOM, không đồng hồ.

/** Nhớ bao nhiêu câu đã nhả. Bản ghi 06/08 có ca xa nhất là 3; lấy gấp đôi cho chắc. */
export const ECHO_MEMORY = 6;

/**
 * Đoạn trùng phải dài bằng này (đã bỏ khoảng trắng và dấu câu) mới được coi là tiếng vọng.
 *
 * Dưới ngưỡng thì trùng nhau là chuyện bình thường của tiếng nói: "Ừm.", "Vâng ạ.", "Dạ không." lặp lại
 * hàng chục lần trong một buổi và mỗi lần đều là một lần người ta thật sự nói. Bằng đúng con số của chốt
 * chặn cũ (`REPEAT_GUARD_MIN_CHARS`), để việc nới rộng này không kéo theo một ngưỡng thứ hai phải chỉnh.
 */
export const ECHO_MIN_CHARS = 12;

/**
 * Sàn RIÊNG, cao hơn, cho phép cắt "đuôi câu cũ = đầu câu mới".
 *
 * Cắt tiền tố thì cả câu cũ phải nằm gọn ở đầu câu mới — trùng cỡ đó gần như chắc chắn là máy đọc lại.
 * Cắt chồng-đuôi thì chỉ cần một MẨU cuối của câu cũ khớp đầu câu mới, mà người ta vẫn hay bắt đầu câu
 * sau bằng chính mấy chữ vừa nói ("...ở Sài Gòn này. Sài Gòn này thì..."). Nên mẩu đó phải dài gấp đôi
 * mới được động dao: dưới ngưỡng đó thì thà để lặp một lần trên tường còn hơn nuốt chữ người nói.
 */
export const ECHO_OVERLAP_MIN_CHARS = 24;

export interface EchoVerdict {
    /**
     * `fresh`   — không dính gì tới các câu đã nhả; dùng nguyên văn.
     * `trimmed` — phần ĐẦU trùng câu cũ đã bị trừ; phần đuôi là chữ mới, vẫn phải nhả.
     * `repeat`  — cả câu nằm gọn trong một câu đã nhả; không còn gì mới, bỏ hẳn.
     */
    kind: 'fresh' | 'trimmed' | 'repeat';
    /** Chữ còn lại để dùng. Rỗng khi `repeat`. */
    text: string;
    /** Số ký tự (đã bỏ khoảng trắng) bị trừ đi — để đọc log, không để đoán. */
    removedChars: number;
}

/**
 * Ký tự KHÔNG tính khi so hai câu: khoảng trắng, dấu câu, dấu nháy — nửa rộng lẫn nguyên rộng.
 *
 * Máy nghe tự thêm/bớt những thứ này giữa hai lần chép cùng một đoạn (xem chú thích đầu tệp), nên để
 * chúng dự phần vào phép so là tự làm hỏng phép so.
 */
const SOFT = /[\s.,;:!?…·、。，；：！？"'“”‘’「」『』]/u;

/** Bỏ hết ký tự mềm — dùng ĐỂ SO và ĐỂ ĐO ĐỘ DÀI, không bao giờ dùng làm chữ nhả ra. */
const bare = (s: string): string => Array.from(s).filter((c) => !SOFT.test(c)).join('');

/** Dấu thừa còn sót ở đầu phần đuôi sau khi cắt. Không đụng dấu nháy: nháy mở đầu là chữ thật. */
const LEADING_JUNK = /^[\s.,;:!?…·、。，；：！？]+/u;

/**
 * `text` có mở đầu bằng `head` không, nếu bỏ qua mọi khác biệt về khoảng trắng và dấu câu?
 *
 * Trả về vị trí TRONG `text` ngay sau phần khớp, hoặc -1. Phải đi từng ký tự chứ không so hai chuỗi đã
 * lọc, vì cái cần cuối cùng là một vị trí cắt trên chuỗi GỐC — cắt trên chuỗi đã lọc rồi ghép lại là tự
 * tay dán liền hai từ.
 */
function prefixEnd(text: string, head: string): number {
    let i = 0;
    let j = 0;
    while (j < head.length) {
        while (j < head.length && SOFT.test(head[j])) j += 1;
        if (j >= head.length) break;
        while (i < text.length && SOFT.test(text[i])) i += 1;
        if (i >= text.length || text[i] !== head[j]) return -1;
        i += 1;
        j += 1;
    }
    return i;
}

/** Vị trí trong `text` ngay sau ký tự-CHỮ thứ `count` (ký tự mềm không đếm). */
function contentIndex(text: string, count: number): number {
    let seen = 0;
    for (let i = 0; i < text.length; i += 1) {
        if (SOFT.test(text[i])) continue;
        seen += 1;
        if (seen === count) return i + 1;
    }
    return text.length;
}

/**
 * ĐUÔI của `head` có trùng ĐẦU của `text` không — mẩu trùng dài nhất, và phải dài ít nhất `floor` chữ.
 *
 * Ca đo được ở phiên 14:43: câu đã nhả kết thúc bằng "Em cảm thấy ấm áp khi nghe hai chữ đủ đầy. Ừm." và
 * câu sau MỞ ĐẦU bằng đúng chừng đó rồi mới nói tiếp. Cắt tiền tố không với tới, vì cả câu cũ không nằm ở
 * đầu câu mới — chỉ có cái đuôi của nó nằm ở đó.
 *
 * Trả về vị trí cắt trên chuỗi GỐC, hoặc -1.
 */
function overlapEnd(text: string, head: string, floor: number): number {
    const bareText = bare(text);
    const bareHead = bare(head);
    const max = Math.min(bareText.length, bareHead.length);
    for (let k = max; k >= floor; k -= 1) {
        if (bareHead.endsWith(bareText.slice(0, k))) return contentIndex(text, k);
    }
    return -1;
}

/**
 * Câu vừa chốt có phải tiếng vọng của những câu đã nhả không.
 *
 * `recent` xếp theo thứ tự nhả, cũ trước mới sau. Cắt LẶP LẠI cho tới khi không cắt được nữa: bản ghi
 * 06/08 có dòng nuốt trọn HAI dòng liền trước nó, nên cắt một lần là vẫn còn lặp một nửa.
 */
export function judgeEcho(
    text: string,
    recent: readonly string[],
    minChars: number = ECHO_MIN_CHARS,
): EchoVerdict {
    const original = text.trim();
    if (!original) return { kind: 'fresh', text: '', removedChars: 0 };

    // Chỉ những câu cũ ĐỦ DÀI mới được quyền cắt. Một câu cũ ngắn ("Ừm.") mà được dùng làm dao thì nó là
    // tiền tố của gần như mọi thứ, và mỗi lần cắt là một lần nuốt mất chữ đầu của câu mới.
    const knives = recent.map((r) => r.trim()).filter((r) => bare(r).length >= minChars);
    if (!knives.length) return { kind: 'fresh', text: original, removedChars: 0 };

    const startChars = bare(original).length;
    let cur = original;
    let cut = true;

    while (cut && cur) {
        cut = false;
        // BAO HÀM trước: cả câu này nằm gọn trong một câu đã nhả ⇒ không còn gì mới. Đây là ca chiếm đa số
        // trong bản ghi (máy nghe chốt lại NGUYÊN VĂN đoạn cũ), và nó phải được hỏi trước phép cắt tiền tố
        // — cắt xong mới phát hiện chẳng còn gì thì đã đi qua một vòng vô ích.
        const bareCur = bare(cur);
        if (bareCur.length >= minChars && knives.some((k) => bare(k).includes(bareCur))) {
            return { kind: 'repeat', text: '', removedChars: startChars };
        }
        for (const knife of knives) {
            // Tiền tố trước, chồng-đuôi sau: tiền tố là ca chặt chẽ hơn (cả câu cũ nằm gọn ở đầu câu mới)
            // nên phải được thử trước, và nó có sàn thấp hơn.
            let end = prefixEnd(cur, knife);
            if (end < 0) end = overlapEnd(cur, knife, Math.max(minChars, ECHO_OVERLAP_MIN_CHARS));
            if (end < 0) continue;
            cur = cur.slice(end).replace(LEADING_JUNK, '').trim();
            cut = true;
            break;
        }
    }

    const removed = startChars - bare(cur).length;
    if (!cur) return { kind: 'repeat', text: '', removedChars: startChars };
    if (!removed) return { kind: 'fresh', text: original, removedChars: 0 };
    return { kind: 'trimmed', text: cur, removedChars: removed };
}

/** Ghi câu vừa nhả vào bộ nhớ ngắn, cũ nhất rơi ra. Trả về mảng MỚI (không sửa mảng đang có). */
export function rememberEcho(recent: readonly string[], text: string, max: number = ECHO_MEMORY): string[] {
    const value = text.trim();
    if (!value) return recent.slice();
    return [...recent, value].slice(-max);
}
```

## TASK 107 — `src/lib/lanes/online/notLanguage.ts` (TỆP MỚI)

Hai chốt "cái này không phải tiếng người". Mọi con số trong tệp đo trên **2659 dòng** của cả kho bản ghi,
và phần chú thích ghi rõ **vì sao không đặt sàn theo độ dài** (đặt vậy thì mất luôn tiếng đáp `うん。` →
"Ừm.", vốn là một lượt nói thật trong buổi phỏng vấn) và **vì sao không dựng chốt cho dạng cháo không có
gạch nối** (dạng đó chưa từng xảy ra lần nào trong 2659 dòng). Tạo tệp mới với nội dung sau.

**`src/lib/lanes/online/notLanguage.ts`**

```ts
// src/lib/lanes/online/notLanguage.ts — CÁI NÀY KHÔNG PHẢI TIẾNG NGƯỜI.
//
// Hai chốt chặn, cùng một câu hỏi: chuỗi này có phải một câu ai đó đã nói không? Không hỏi nó thuộc tiếng
// nào — việc đó của `directionRouter.ts`. Chỉ hỏi có đáng đưa lên tường và đọc lên loa không.
//
// Cả hai đều đo được từ bản ghi thật, không phải phòng xa. Số liệu dưới đây lấy trên TOÀN BỘ kho log của
// máy này (2659 dòng, mọi buổi đã ghi tính tới 06/08/2026), không phải một phiên.
//
// ── 1. KHÔNG CÓ CHỮ NÀO ────────────────────────────────────────────────────────────────────────────────
//
// Phiên 14:47 kết thúc bằng một dòng có nội dung đúng bằng một dấu nháy kép:
//
//     #62 "Cái chức danh"        #63 "tôi được là cái gì?"        #64 "\""
//
// Người nói: «Và nó không còn giới hạn cái chuyện là: "Cái lương tôi bao nhiêu? … Cái chức danh tôi được
// là cái gì?"». Nấc "nhả câu sớm" cắt ở mỗi dấu hỏi, còn dấu nháy ĐÓNG thì tới trong mảnh sau — nên nó ở
// lại một mình và thành một "câu" riêng: một dòng trên tường khán giả, một lượt gọi bộ dịch, một lượt đọc
// lên loa, cho đúng một ký tự dấu.
//
// VÌ SAO KHÔNG ĐẶT SÀN THEO ĐỘ DÀI — đây là chỗ tôi đã suýt làm sai. Cùng phiên đó có 7 dòng dưới 15 chữ,
// và nếu chặn theo độ dài thì mất luôn:
//
//     #14  「うん。」 → "Ừm."        ← một tiếng đáp thật, trong một buổi phỏng vấn nó LÀ một lượt nói
//
// Nên luật là "không có lấy MỘT chữ cái hay chữ số nào", chứ không phải "ngắn quá". Dòng `"` có 0 chữ;
// dòng 「うん。」 có 2. Một cái là rác, một cái là người ta đang nói.
//
// ── 2. CHÁO ÂM TIẾT ────────────────────────────────────────────────────────────────────────────────────
//
// Khi tiếng vào đổi ngôn ngữ, máy nghe còn kẹt ở ngôn ngữ cũ và nó PHIÊN ÂM tiếng mới bằng bảng chữ cũ.
// Phiên 14:47, đúng chỗ nối giữa đoạn tiếng Nhật và đoạn tiếng Việt, ba dòng liền:
//
//     #40  えっと、うーん、ラ-、ト-、イ-、カ-ン-ベ-、サ-オ-、テ-ミ-…      (20 nhóm gạch)
//     #41  …ドゥン-、ラ-、ト-ア-ッ-ケ-オ-。                              (25 nhóm gạch)
//     #42  チ-イ-ラ-モ-、ケ-イ-、ケ-イ-、ケ-イ-、ケ-イ-…                  (40 nhóm gạch)
//
// Ba câu, khoảng 15 giây, dịch ra thành "la-, to-, i-, ka-n-be-" rồi đọc lên loa. Không lớp nào bắt được:
// nhãn máy nghe nói `ja`, mặt chữ là kana nên bằng chứng chữ CŨNG nói `ja`. Mọi lớp đồng thuận, mọi lớp
// đều sai — vì cả hai đều đọc cùng một thứ do chính máy nghe viết ra.
//
// Chốt này không sửa chiều. Nó chỉ nói: chuỗi này không phải chữ, đừng đưa đi đâu cả.
//
// NGƯỠNG, VÀ VÌ SAO PHẢI HAI ĐIỀU KIỆN CHỨ KHÔNG MỘT — đo trên cả 2659 dòng:
//
//     dòng THẬT nhiều gạch nhất:   5 nhóm   ("それですね。はい。で、えーと、私は、お-- ついた-- あ、この辺りは…")
//     ba dòng cháo:               20, 25, 40 nhóm
//
//   · chỉ đếm SỐ NHÓM thì một dòng dài lê thê có 8 chỗ lắp bắp rải rác sẽ bị oan → cần thêm tỉ lệ;
//   · chỉ đo TỈ LỆ thì bắt nhầm ngay: "Thì em cứ l-l-lên-" có tỉ lệ 0,167 — cao hơn ngưỡng — mà đó là
//     một người đang nói lắp thật.
//
// Nên phải khớp CẢ HAI. Với ngưỡng dưới đây, trên toàn bộ 2659 dòng chỉ đúng ba dòng cháo bị bắt, không
// một dòng thật nào. Khoảng cách giữa 5 và 20 là bốn lần — không phải một ngưỡng đặt sát mép.
//
// ĐẾM THEO NHÓM, KHÔNG THEO TỪNG DẤU: máy nghe viết lắp bắp bằng gạch ĐÔI ("và khi mà-- một khi mà"), nên
// đếm lẻ từng dấu sẽ thổi phồng đúng những dòng thật cần tha. Cháo thì dùng gạch ĐƠN sau mỗi âm tiết, nên
// đếm theo nhóm không hề làm nó nhẹ đi.
//
// KHÔNG tính 「ー」 (U+30FC): đó là dấu kéo dài của tiếng Nhật, có trong コーヒー, サービス — chữ thật. Ba dòng
// cháo đo được dùng gạch ASCII `-` (U+002D). Nhầm hai thứ này là xoá tiếng Nhật thật.
//
// ── CHÁO KHÔNG CÓ GẠCH THÌ SAO — đã hỏi, đã đo, và câu trả lời là ĐỪNG ─────────────────────────────────
//
// Chốt này chỉ bắt được dạng có gạch nối. Dạng không gạch — một dải katakana dài mà không có lấy một chữ
// hiragana nào — về lý là bắt được, vì hiragana gánh ngữ pháp tiếng Nhật nên một câu tiếng Nhật thật
// không thể vắng nó (cùng lý lẽ với `latinRunWeak` trong `directionRouter.ts`).
//
// Nhưng quét cả 2659 dòng: đúng MỘT dòng có ≥20 katakana và 0 hiragana, và nó chính là dòng cháo 40 gạch
// ở trên — đã bị bắt rồi. Dạng không gạch CHƯA TỪNG XẢY RA. Dựng chốt cho một hình dạng chưa ai thấy là
// đổi một rủi ro đo được (xoá nhầm 「コーヒーとサービス」, tên riêng, thực đơn) lấy một lợi ích tưởng tượng.
//
// Nếu về sau nó xuất hiện thật, log sẽ chỉ ra — và lúc đó mới có số để đặt ngưỡng.
//
// Pure module: không React, không fetch, không DOM, không đồng hồ.

/**
 * Bao nhiêu NHÓM gạch nối thì bắt đầu nghi là cháo âm tiết.
 *
 * Dòng thật nhiều gạch nhất trong toàn kho log là 5 nhóm; ba dòng cháo là 20, 25, 40. Lấy 8 — trên mức
 * thật đo được 60%, dưới mức cháo thấp nhất 2,5 lần.
 */
export const SOUP_MIN_GROUPS = 8;

/**
 * Và bấy nhiêu nhóm đó phải DÀY tới mức này (nhóm chia cho số ký tự).
 *
 * Một dòng 500 chữ có 8 chỗ lắp bắp rải rác là chuyện bình thường của tiếng nói (tỉ lệ ~0,016). Cháo thì
 * 0,328 trở lên. 0,15 nằm giữa, gần gấp đôi bên dưới và chưa tới một nửa bên trên.
 */
export const SOUP_MIN_RATE = 0.15;

/** Gạch nối ASCII và nguyên rộng. CỐ Ý không có 「ー」 — xem chú thích đầu tệp. */
const HYPHEN_GROUP = /[-－]+/gu;

/**
 * Chuỗi này không có lấy một chữ cái hay chữ số nào ⇒ không ai nói ra nó được.
 *
 * Dấu câu, dấu nháy, khoảng trắng, ký hiệu — bao nhiêu cũng vậy. Chỉ cần MỘT chữ là qua: 「うん。」 qua,
 * "Ừ" qua, "5" qua. Sàn thấp nhất có thể mà vẫn chặn được dòng chỉ có một dấu nháy.
 */
export function hasNoLetters(text: string): boolean {
    return !/[\p{L}\p{N}]/u.test(text);
}

/**
 * Máy nghe đang phiên âm một thứ tiếng nó không nhận ra, từng âm tiết một, ngăn bằng gạch nối.
 *
 * Phải khớp CẢ HAI điều kiện — xem chú thích đầu tệp cho lý do và cho hai ca phản chứng đo được.
 */
export function isSyllableSoup(text: string): boolean {
    const length = Array.from(text).length;
    if (!length) return false;
    const groups = (text.match(HYPHEN_GROUP) ?? []).length;
    if (groups < SOUP_MIN_GROUPS) return false;
    return groups / length >= SOUP_MIN_RATE;
}
```

## TASK 108 — `src/lib/lanes/online/speakGate.ts` (TỆP MỚI)

Cổng tách **chữ** khỏi **giọng**. Chữ lên tường ngay khi có, còn giọng đọc thì chờ tới khi chiều dịch của
câu đó được chốt. Lý do: đọc nhầm chiều thì không rút lại được, còn chữ sai chiều nằm trên tường nửa giây
thì người ta đọc qua được. Tạo tệp mới với nội dung sau.

**`src/lib/lanes/online/speakGate.ts`**

```ts
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
```

## TASK 109 — Phép đo "đã đọc hết dòng chưa" (`src/lib/lanes/online/scriptMatcher.ts`)

Điểm giống nhau không trả lời được câu hỏi "đã đọc hết dòng chưa", vì nó **thưởng cho câu ngắn**. Cần một
phép đo khác: nghe được bao nhiêu phần của dòng, và riêng **phần đuôi** được bao nhiêu. Phần đuôi mới là
thứ tách được hai ca mà điểm giống nhau không tách nổi.

**Tệp: `src/lib/lanes/online/scriptMatcher.ts`** — 4 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Kiểu dữ liệu cho phép đo "đã đọc được bao nhiêu phần của dòng". Find and replace:

```ts
    outOfOrderPenalty: number;
    /** How many consecutive script lines may be merged into one candidate (1 = no merging). */
    maxMergeLines: number;
};

// The three thresholds below were measured over 139 real sessions (6,950 utterances), not chosen by
```

with

```ts
    outOfOrderPenalty: number;
    /** How many consecutive script lines may be merged into one candidate (1 = no merging). */
    maxMergeLines: number;
    /**
     * How much of the LINE the heard sentence must actually account for before it may be spoken.
     *
     * Dice is symmetric — it answers "how alike are these two", not "has the whole line been said yet" —
     * and a prefix scores far higher on it than it deserves: 2p/(p+L) puts three quarters of a line at
     * 0.86, over the 0.82 snap bar, while the last quarter is still in the MC's mouth. See `coverageOf`.
     */
    coverageFloor: number;
    /** …and how much of the line's LAST THIRD, which is the part a prefix can never have. */
    tailFloor: number;
};

// The three thresholds below were measured over 139 real sessions (6,950 utterances), not chosen by
```

**(b)** Hàm đo: bao nhiêu phần trăm dòng đã nghe được, và riêng phần ĐUÔI được bao nhiêu. Find and replace:

```ts
    orderBonus: 0.04,
    outOfOrderPenalty: 0.06,
    maxMergeLines: 6,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
```

with

```ts
    orderBonus: 0.04,
    outOfOrderPenalty: 0.06,
    maxMergeLines: 6,
    // Deliberately BETWEEN the suggest bar and the snap bar. When the two sides are the same length,
    // recall and Dice measure almost the same thing, so a floor just under `snapThreshold` cannot take
    // away a match that would otherwise have been correct — the only thing it removes is the prefix
    // corner, where Dice is high precisely BECAUSE the heard text is short.
    // Measured on a 63-character ceremonial line: a three-quarter read scores 0.774 here, a complete read
    // through a bad microphone 0.919. The bar sits between them, but only just — which is why the TAIL is
    // the gate that actually does the work (0.467 against 1.0 on the same two reads) and this one is the
    // backup that catches a prefix long enough to score well and still be unfinished.
    coverageFloor: 0.78,
    tailFloor: 0.55,
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
```

**(c)** Xuất hàm ra ngoài. Find and replace:

```ts
    return total === 0 ? 0 : (2 * shared) / total;
}

type Candidate = {
    entryIds: string[];
    index: number;
```

with

```ts
    return total === 0 ? 0 : (2 * shared) / total;
}

export type ScriptCoverage = {
    /** Share of the LINE's bigrams the heard sentence accounts for. Linear in "how much has been said". */
    recall: number;
    /** The same measure over the line's LAST QUARTER — the part a prefix cannot possibly have yet. */
    tailRecall: number;
};

/**
 * A QUARTER, measured — not a third, which was the first guess and was wrong.
 *
 * With a third, the tail of a 63-character line starts at character 42, and the three-quarter prefix that
 * this whole gate exists to stop already reaches character 49. It therefore scored 0.60 on the tail and
 * sailed through. A quarter starts at 47, past where that prefix ends, so the same read scores ~0.15 —
 * while a complete read through a bad microphone still scores ~0.7. That gap is the whole mechanism.
 */
const TAIL_SHARE = 4;
/** The tail is never shorter than this, so a very short line still has something to measure. */
const TAIL_MIN_CHARS = 4;

/** Share of `lineNormalized`'s bigrams present in an already-built bag of heard bigrams. */
function recallInto(heardGrams: Map<string, number>, lineNormalized: string): number {
    if (lineNormalized.length < 2) return 0;
    const line = bigrams(lineNormalized);
    const total = gramTotal(line);
    if (total === 0) return 0;
    let shared = 0;
    for (const [gram, count] of line) {
        const other = heardGrams.get(gram);
        if (other) shared += Math.min(count, other);
    }
    return shared / total;
}

/**
 * Has the whole line actually been said yet?
 *
 * Dice cannot answer that. It is symmetric, so a prefix is rewarded for being SHORT: with a prefix of
 * length p against a line of length L it returns 2p/(p+L), which puts a third of a line at 0.50 and three
 * quarters at 0.86. Recall of the line's bigrams is linear instead — a third of the line reads as ~0.33 —
 * and when the two sides are the same length the two measures nearly coincide, which is what makes this
 * safe to place just under an already-calibrated Dice threshold.
 *
 * `tailRecall` exists because recall alone cannot separate "read three quarters of it" (0.74) from "read
 * all of it through a bad microphone" (0.80) — those two numbers are too close to put a bar between. The
 * end of the line separates them completely: the first has not been spoken at all, the second has. Note
 * it never reaches a clean zero — character bigrams collide by chance in any language — so the bar
 * belongs in the gap (~0.2 against ~0.7), not at the floor.
 */
export function coverageOf(heard: string, line: string): ScriptCoverage {
    const h = normalizeForMatch(heard);
    const l = normalizeForMatch(line);
    if (h.length < 2 || l.length < 2) return { recall: 0, tailRecall: 0 };
    const heardGrams = bigrams(h);
    const recall = round2(recallInto(heardGrams, l));
    const tail = l.slice(-Math.min(l.length, Math.max(TAIL_MIN_CHARS, Math.ceil(l.length / TAIL_SHARE))));
    return { recall, tailRecall: tail.length < 2 ? recall : round2(recallInto(heardGrams, tail)) };
}

type Candidate = {
    entryIds: string[];
    index: number;
```

**(d)** Ghi chú cho bộ khớp. Find and replace:

```ts
        if (adjusted < config.snapThreshold) {
            return { ...result, band: 'suggest', reason: `gần giống nhưng chưa đủ chắc (${result.score})` };
        }
        // Winner and runner-up neck and neck means the script holds two near-identical lines — if they
        // cannot be told apart, do not guess.
        if (adjusted - runnerUp < config.runnerUpMargin) {
```

with

```ts
        if (adjusted < config.snapThreshold) {
            return { ...result, band: 'suggest', reason: `gần giống nhưng chưa đủ chắc (${result.score})` };
        }
        // Similar enough — but "similar" is not "finished". Dice rewards a prefix for being SHORT, so
        // this is where a line the MC is still halfway through is stopped, one bar under the threshold it
        // just cleared. Downgraded to `suggest` rather than silenced: the operator should still see which
        // line the ceremony is on, and the sentence takes the ordinary translate-and-refine path.
        const cover = coverageOf(text, candidate.source);
        if (cover.recall < config.coverageFloor || cover.tailRecall < config.tailFloor) {
            return { ...result, band: 'suggest', reason: `mới nghe được ${Math.round(cover.recall * 100)}% dòng` };
        }
        // Winner and runner-up neck and neck means the script holds two near-identical lines — if they
        // cannot be told apart, do not guess.
        if (adjusted - runnerUp < config.runnerUpMargin) {
```


## TASK 110 — Chưa hết câu thì chưa nhả (`src/lib/lanes/online/guidedScript.ts`)

**Tệp: `src/lib/lanes/online/guidedScript.ts`** — 3 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Nhập hàm đo độ phủ. Find and replace:

```ts
    DEFAULT_SCRIPT_MATCH_CONFIG,
    normalizeForMatch,
    diceCoefficient,
    type ScriptMatcherEntry,
    type ScriptLanguage,
} from './scriptMatcher';
```

with

```ts
    DEFAULT_SCRIPT_MATCH_CONFIG,
    normalizeForMatch,
    diceCoefficient,
    coverageOf,
    type ScriptMatcherEntry,
    type ScriptLanguage,
} from './scriptMatcher';
```

**(b)** Hai ngưỡng: phủ 55% cả dòng, và 60% riêng phần đuôi. Find and replace:

```ts
export const GUIDED_SHORT_LINE = 8;
export const GUIDED_SHORT_FLOOR = 0.8;

/**
 * The bar this heard sentence really has to clear.
 *
```

with

```ts
export const GUIDED_SHORT_LINE = 8;
export const GUIDED_SHORT_FLOOR = 0.8;

/**
 * HAS THE LINE BEEN FINISHED — the question the similarity score cannot ask.
 *
 * `GUIDED_FLOOR` is 0.45 deliberately: a human is pointing at the line, so the machine only has to agree
 * that the sentence is roughly that one, and the low bar is what forgives a bad microphone. But Dice is
 * symmetric, and a PREFIX is rewarded for being short — 2p/(p+L) puts one third of a line at 0.50. So the
 * low bar was also forgiving something it was never meant to forgive: **a line the MC is only a third of
 * the way through was released in full, out loud, ahead of the person speaking it.**
 *
 * The tail is what separates the two cases and the similarity score never could. Measured on a real
 * ceremonial line: three quarters read → tail 0.47; the whole line read through a bad microphone → tail
 * 1.0. The bar goes in that gap. `recall` is the second net, low enough that mishearing still passes.
 */
export const GUIDED_COVERAGE_FLOOR = 0.55;
export const GUIDED_TAIL_FLOOR = 0.6;

/**
 * The bar this heard sentence really has to clear.
 *
```

**(c)** Cổng mới: giống dòng chưa đủ, phải ĐỌC HẾT dòng thì mới nhả. Nấc "thả cửa" bỏ qua cổng này. Find and replace:

```ts
        return { kind: 'mismatch', score, reason: `không giống dòng ${index + 1} (${score}/${bar})` };
    }

    const source = useForward ? row.src : row.dst;
    const target = useForward ? row.dst : row.src;
    const language = (useForward ? row.dst_lang : row.src_lang) as ScriptLanguage;
    // The lane only speaks Vietnamese and Japanese. A row translating into anything else is a row this
```

with

```ts
        return { kind: 'mismatch', score, reason: `không giống dòng ${index + 1} (${score}/${bar})` };
    }

    // It looks like the line. That is not the same as the line being FINISHED, and until this gate existed
    // nothing here asked the difference: a third of a line scores 0.50 on a 0.45 bar, so the machine read
    // the whole approved sentence out over the hall while the MC was still in the middle of saying it.
    // Skipped entirely at floor 0 ("thả cửa") — there the operator's press is the only evidence wanted.
    const spoken = useForward ? row.src : row.dst;
    if (floor > 0) {
        const cover = coverageOf(heard, spoken);
        if (cover.recall < GUIDED_COVERAGE_FLOOR || cover.tailRecall < GUIDED_TAIL_FLOOR) {
            return {
                kind: 'mismatch',
                score,
                reason: `mới nghe được ${Math.round(cover.recall * 100)}% dòng ${index + 1} — chưa hết câu`,
            };
        }
    }

    const source = spoken;
    const target = useForward ? row.dst : row.src;
    const language = (useForward ? row.dst_lang : row.src_lang) as ScriptLanguage;
    // The lane only speaks Vietnamese and Japanese. A row translating into anything else is a row this
```


## TASK 111 — Hai đường tiếng vào (`src/lib/lanes/online/pcm16Capture.ts`)

Bộ trộn nhận hai đường thay vì một, và **đo riêng năng lượng từng đường trước khi trộn**. Đo sau khi trộn
là mất hẳn thông tin: trộn rồi thì không còn biết ai vừa nói.

**Tệp: `src/lib/lanes/online/pcm16Capture.ts`** — 7 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Bộ trộn nhận HAI đường vào thay vì một. Find and replace:

```ts
    this.outBuffer = new Int16Array(4096);
    this.outCount = 0;
    this.voicedCount = 0;

    // --- near-mic noise gate state ---
    this.noiseRms = 0.002;
    this.hangoverSamples = 0;
    this.hangoverSamplesMax = Math.round(0.360 * this.inputSampleRate); // 360ms hangover

    // --- VU throttle (~10 ticks/second), peak-based, measured BEFORE gating ---
    this.levelWindowPeak = 0;
    this.levelWindowSamples = 0;
```

with

```ts
    this.outBuffer = new Int16Array(4096);
    this.outCount = 0;
    this.voicedCount = 0;
    this.micVoicedCount = 0;
    this.sysVoicedCount = 0;

    // --- near-mic noise gate state ---
    this.noiseRms = 0.002;
    this.hangoverSamples = 0;
    this.hangoverSamplesMax = Math.round(0.360 * this.inputSampleRate); // 360ms hangover

    // --- second source (tiếng ra loa máy: Teams/Zoom), nếu người vận hành có đấu vào ---
    // Đường này là tín hiệu SỐ lấy thẳng từ máy, không đi qua không khí: không có ồn phòng, không có
    // tiếng vọng, không cần cổng thích nghi. Nên nó dùng sàn cố định và hangover riêng, chứ không dùng
    // chung bộ học ồn nền của mic — học ồn trên một đường vốn im như tờ chỉ tạo ra một con số vô nghĩa.
    this.sysHangoverSamples = 0;
    this.sysFloorRms = 0.004;

    // --- VU throttle (~10 ticks/second), peak-based, measured BEFORE gating ---
    this.levelWindowPeak = 0;
    this.levelWindowSamples = 0;
```

**(b)** Nhận luồng tiếng máy tính và nối vào đường thứ hai. Find and replace:

```ts
  flushPacket() {
    const buf = this.outBuffer.buffer;
    const voicedMs = this.voicedCount / 16; // 16 samples per ms @16kHz
    this.port.postMessage({ type: 'packet', pcm: buf, voicedMs: voicedMs }, [buf]);
    this.outBuffer = new Int16Array(4096); // previous buffer was transferred away
    this.outCount = 0;
    this.voicedCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const ch = input && input[0];
    if (!ch || ch.length === 0) return true;
    const n = ch.length;

    // --- metrics on the RAW quantum (before gating) ---
    let sumSq = 0;
    let peak = 0;
```

with

```ts
  flushPacket() {
    const buf = this.outBuffer.buffer;
    const voicedMs = this.voicedCount / 16; // 16 samples per ms @16kHz
    this.port.postMessage({
      type: 'packet',
      pcm: buf,
      voicedMs: voicedMs,
      micVoicedMs: this.micVoicedCount / 16,
      sysVoicedMs: this.sysVoicedCount / 16,
    }, [buf]);
    this.outBuffer = new Int16Array(4096); // previous buffer was transferred away
    this.outCount = 0;
    this.voicedCount = 0;
    this.micVoicedCount = 0;
    this.sysVoicedCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    const ch = input && input[0];
    // Đường thứ hai có thể vắng mặt hoàn toàn (không đấu, hoặc chưa có gói nào) — mọi chỗ dưới đây phải
    // chạy đúng y như cũ khi nó vắng.
    const sysInput = inputs[1];
    const sysCh = sysInput && sysInput[0];
    if (!ch || ch.length === 0) return true;
    const n = ch.length;

    // --- đo riêng đường tiếng máy, trước khi trộn ---
    let sysVoiced = false;
    if (sysCh && sysCh.length >= n) {
      let sysSumSq = 0;
      for (let i = 0; i < n; i++) { const s = sysCh[i]; sysSumSq += s * s; }
      if (Math.sqrt(sysSumSq / n) >= this.sysFloorRms) this.sysHangoverSamples = this.hangoverSamplesMax;
      else {
        this.sysHangoverSamples -= n;
        if (this.sysHangoverSamples < 0) this.sysHangoverSamples = 0;
      }
      sysVoiced = this.sysHangoverSamples > 0;
    }

    // --- metrics on the RAW quantum (before gating) ---
    let sumSq = 0;
    let peak = 0;
```

**(c)** Đo riêng năng lượng từng đường trước khi trộn. Find and replace:

```ts
    const cut = this.nearMicGateEnabled && !voiced;   // only cut samples when the operator asked for it

    // --- stateful linear resample to 16kHz, apply cut, accumulate, count voiced ---
    for (let i = 0; i < n; i++) {
      const cur = ch[i];
      this.resampleAccumulator += this.ratioInc;
      while (this.resampleAccumulator >= 1) {
        this.resampleAccumulator -= 1;
        const frac = 1 - this.resampleAccumulator;
        let interp = this.lastSample + (cur - this.lastSample) * frac;
        if (cut) interp = 0;
        const clamped = interp < -1 ? -1 : (interp > 1 ? 1 : interp);
        this.outBuffer[this.outCount++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        if (voiced) this.voicedCount++;
        if (this.outCount >= 4096) this.flushPacket();
      }
      this.lastSample = cur;
```

with

```ts
    const cut = this.nearMicGateEnabled && !voiced;   // only cut samples when the operator asked for it

    // --- stateful linear resample to 16kHz, apply cut, accumulate, count voiced ---
    // Hai đường được TRỘN ở đây, trước khi hạ mẫu: máy nghe vẫn chỉ thấy MỘT dòng tiếng như từ trước tới
    // nay, nên không có socket thứ hai và không có đồng hồ tiền thứ hai. Việc phân biệt ai nói nằm ở hai
    // con số voiced gửi kèm gói, không nằm ở việc chép hai lần.
    // Cổng near-mic chỉ cắt phần MIC. Cắt cả tiếng máy là tự bịt tai với đúng nửa cuộc họp.
    const mixSys = sysCh && sysCh.length >= n;
    for (let i = 0; i < n; i++) {
      const cur = (cut ? 0 : ch[i]) + (mixSys ? sysCh[i] : 0);
      this.resampleAccumulator += this.ratioInc;
      while (this.resampleAccumulator >= 1) {
        this.resampleAccumulator -= 1;
        const frac = 1 - this.resampleAccumulator;
        const interp = this.lastSample + (cur - this.lastSample) * frac;
        const clamped = interp < -1 ? -1 : (interp > 1 ? 1 : interp);
        this.outBuffer[this.outCount++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
        // voicedCount là bằng chứng CÓ NGƯỜI NÓI mà chốt chặn ảo giác M4 đọc. Nó phải tính cả hai đường:
        // nếu chỉ đếm mic thì một câu do đầu cầu bên kia nói (mic bị khử vọng ăn mất) sẽ bị chính chốt
        // chặn của ta vứt đi như một câu ma.
        // (Không được dùng dấu nháy ngược trong khối này: cả worklet nằm trong một template literal.)
        if (voiced || sysVoiced) this.voicedCount++;
        if (voiced) this.micVoicedCount++;
        if (sysVoiced) this.sysVoicedCount++;
        if (this.outCount >= 4096) this.flushPacket();
      }
      this.lastSample = cur;
```

**(d)** Trộn rồi mới hạ tần số — không đo sau khi trộn, vì trộn rồi thì không biết ai đã nói. Find and replace:

```ts

export interface CapturePacket {
  pcm: ArrayBuffer;
  voicedMs: number;
}

export interface CaptureHandle {
```

with

```ts

export interface CapturePacket {
  pcm: ArrayBuffer;
  /** Tiếng nói đo được ở BẤT KỲ đường nào — bằng chứng cho chốt chặn ảo giác. */
  voicedMs: number;
  /** Riêng đường mic (phòng). */
  micVoicedMs: number;
  /** Riêng đường tiếng máy (đầu cầu bên kia). 0 khi không đấu nguồn thứ hai. */
  sysVoicedMs: number;
}

export interface CaptureHandle {
```

**(e)** Gói âm thanh mang theo năng lượng của cả hai đường. Find and replace:

```ts
  deviceId: string | undefined,
  onPacket: (packet: CapturePacket) => void,
  onLevel: (v: number) => void,
  options?: { nearMicGate?: boolean; micSensitivity?: MicSensitivity },
): Promise<CaptureHandle> {
  // The operator's chosen microphone, never the browser default (`exact` — with `ideal`, Windows
  // switching its default device mid-event silently switches the mic under us). Mono; keep browser DSP.
```

with

```ts
  deviceId: string | undefined,
  onPacket: (packet: CapturePacket) => void,
  onLevel: (v: number) => void,
  options?: {
    nearMicGate?: boolean;
    micSensitivity?: MicSensitivity;
    /**
     * Đường tiếng thứ hai: tiếng đang phát ra từ chính máy này (Teams/Zoom), lấy bằng
     * `getDisplayMedia({ audio: true })` ở phía gọi.
     *
     * Phía gọi phải tự xin, vì `getDisplayMedia` chỉ mở được từ một cú bấm của người dùng — gọi nó trong
     * lòng hàm này thì trình duyệt từ chối, và một phiên đang chạy không có cú bấm nào để mượn.
     *
     * Vòng đời cũng do phía gọi giữ: hàm này KHÔNG tắt track của luồng đó khi `stop()`. Người vận hành
     * chọn "chia sẻ màn hình" một lần cho cả buổi; tự tắt nó mỗi lần nối lại máy nghe là bắt họ bấm lại
     * hộp thoại chia sẻ giữa buổi lễ.
     */
    systemStream?: MediaStream | null;
  },
): Promise<CaptureHandle> {
  // The operator's chosen microphone, never the browser default (`exact` — with `ideal`, Windows
  // switching its default device mid-event silently switches the mic under us). Mono; keep browser DSP.
```

**(f)** Dọn đường thứ hai khi tắt. Find and replace:

```ts
    const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    const src = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, 'pcm16-tap', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    node.port.onmessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; pcm?: ArrayBuffer; voicedMs?: number; value?: number } | null;
      if (!d) return;
      if (d.type === 'packet' && d.pcm) onPacket({ pcm: d.pcm, voicedMs: d.voicedMs ?? 0 });
      else if (d.type === 'level') onLevel(d.value ?? 0);
    };
    node.port.postMessage({
      type: 'configure',
```

with

```ts
    const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'text/javascript' }));
    try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
    const src = ctx.createMediaStreamSource(stream);
    // Hai đầu vào LUÔN được khai báo, kể cả khi không có nguồn thứ hai: một đầu vào không ai nối vào thì
    // `inputs[1]` chỉ là mảng rỗng, và worklet đã xử đúng ca đó. Khai báo theo điều kiện thì số đầu vào
    // của node phụ thuộc thời điểm gọi, mà đồ thị âm thanh thì không dựng lại được sau khi đã chạy.
    const node = new AudioWorkletNode(ctx, 'pcm16-tap', {
      numberOfInputs: 2,
      numberOfOutputs: 1,
      outputChannelCount: [1],
    });
    node.port.onmessage = (e: MessageEvent) => {
      const d = e.data as {
        type?: string; pcm?: ArrayBuffer; voicedMs?: number; micVoicedMs?: number; sysVoicedMs?: number; value?: number;
      } | null;
      if (!d) return;
      if (d.type === 'packet' && d.pcm) {
        onPacket({
          pcm: d.pcm,
          voicedMs: d.voicedMs ?? 0,
          micVoicedMs: d.micVoicedMs ?? 0,
          sysVoicedMs: d.sysVoicedMs ?? 0,
        });
      } else if (d.type === 'level') onLevel(d.value ?? 0);
    };
    node.port.postMessage({
      type: 'configure',
```

**(g)** Kiểu dữ liệu của gói âm thanh có thêm hai số năng lượng. Find and replace:

```ts
      nearMicGateEnabled: options?.nearMicGate ?? true,
      micSensitivity: options?.micSensitivity ?? 'auto',
    });
    src.connect(node);
    node.connect(ctx.destination); // worklet writes no output → silence; keeps the graph pulling.
    const context = ctx;
    return {
      sampleRate: context.sampleRate,
      stop() {
        node.port.onmessage = null;
        try { src.disconnect(); node.disconnect(); } catch { /* ignore */ }
        stream.getTracks().forEach((t) => t.stop());
        void context.close();
      },
```

with

```ts
      nearMicGateEnabled: options?.nearMicGate ?? true,
      micSensitivity: options?.micSensitivity ?? 'auto',
    });
    src.connect(node, 0, 0);
    // Nguồn thứ hai chỉ được nối khi nó THẬT SỰ có track tiếng: `getDisplayMedia` vẫn trả về một luồng
    // hợp lệ khi người vận hành quên tích "chia sẻ âm thanh hệ thống", và luồng đó chỉ có hình. Nối một
    // luồng câm vào đây thì mọi câu đều bị gán cho mic, im lặng và không có gì báo.
    let sysSrc: MediaStreamAudioSourceNode | null = null;
    const sysStream = options?.systemStream ?? null;
    if (sysStream && sysStream.getAudioTracks().length > 0) {
      sysSrc = ctx.createMediaStreamSource(sysStream);
      sysSrc.connect(node, 0, 1);
    }
    node.connect(ctx.destination); // worklet writes no output → silence; keeps the graph pulling.
    const context = ctx;
    return {
      sampleRate: context.sampleRate,
      stop() {
        node.port.onmessage = null;
        try { src.disconnect(); sysSrc?.disconnect(); node.disconnect(); } catch { /* ignore */ }
        // CHỈ tắt micro. Luồng chia sẻ màn hình do phía gọi giữ và tắt — xem chú thích ở `systemStream`.
        stream.getTracks().forEach((t) => t.stop());
        void context.close();
      },
```


## TASK 112 — Nối tất cả vào lane (`src/lib/lanes/online/onlineLane.ts`)

Đây là phần dài nhất và cần đọc kỹ nhất. Ba chỗ dễ làm sai, ghi ra để khỏi phải dò:

1. **Hai chốt "không phải tiếng người" phải đứng TRƯỚC chỗ ghi nhớ và chỗ nhặt nhãn tiếng.** Đứng sau thì
   cháo âm tiết chui vào bộ nhớ chống-đọc-lại rồi thành dao cắt câu thật, và nhãn của thứ tiếng máy nghe
   **đang kẹt** được chuyền cho câu kế tiếp — đúng lúc câu kế tiếp cần mượn nhãn nhất.
2. **Chúng đọc chuỗi ĐÃ TRỪ, không đọc chuỗi thô.** Mảnh `"` cô độc chỉ **lộ ra sau khi** đã trừ phần nhả
   sớm và phần máy nghe đọc lại.
3. **Đường cấp cứu của trần 25 giây phải có bằng chứng CÓ TIẾNG**, và bằng chứng đó lấy từ **micrô**, không
   lấy từ dòng chữ máy nghe trả về. Không có nó thì một phòng im sẽ bị bắn lệnh chốt suốt buổi.

**Tệp: `src/lib/lanes/online/onlineLane.ts`** — 35 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Nhập hai bộ luật mới: chống máy nghe đọc lại, và chốt "cái này không phải tiếng người". Find and replace:

```ts
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence, isInventedNumber, isNonSpeechAnnotation } from './asrSpeechEvidence';
import { isStableDraftPrefix, joinLiveDraftSource, stripPromotedPrefix } from './liveDraftTranslation';
import { decidePromotion, livePromoteStableMs, loadLivePromote, LIVE_PROMOTE_MIN_CHARS } from './livePromote';
import { DRAFT_RATE_WINDOW_MS, decideCaptureFrame, decideDraftAdmission, getContinuationWaitMs } from './livePipelinePolicy';
import { createSpeechPauseProfile } from './speechPauseProfile';
import { createSpeechShapeMonitor } from './speechShape';
```

with

```ts
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence, isInventedNumber, isNonSpeechAnnotation } from './asrSpeechEvidence';
import { isStableDraftPrefix, joinLiveDraftSource, stripPromotedPrefix } from './liveDraftTranslation';
import { decidePromotion, livePromoteStableMs, loadLivePromote, LIVE_PROMOTE_MIN_CHARS } from './livePromote';
import { ECHO_MEMORY, judgeEcho, rememberEcho } from './echoGuard';
import { hasNoLetters, isSyllableSoup } from './notLanguage';
import { DRAFT_RATE_WINDOW_MS, decideCaptureFrame, decideDraftAdmission, getContinuationWaitMs } from './livePipelinePolicy';
import { createSpeechPauseProfile } from './speechPauseProfile';
import { createSpeechShapeMonitor } from './speechShape';
```

**(b)** Nhập bộ định chiều và bộ đọc nguồn tiếng. Find and replace:

```ts
import { buildSessionExport, saveSessionExport, type SaveOutcome, type SessionLine } from './sessionExport';
import { createLatencyTracker, type LatencyReport } from './latencyTracker';
import { classifyInterimUtterance, createDirectionTracker, decideFinalLanguage, directionOf, type DirectionTracker, type Lang } from './utteranceDirection';
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';
import { SPEECH_RHYTHM_DEFAULT, loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, rhythmUsesManualCommit, speechRhythmLabel } from './speechRhythm';
import { refineReasonText } from './refineFailure';
```

with

```ts
import { buildSessionExport, saveSessionExport, type SaveOutcome, type SessionLine } from './sessionExport';
import { createLatencyTracker, type LatencyReport } from './latencyTracker';
import { classifyInterimUtterance, createDirectionTracker, decideFinalLanguage, directionOf, type DirectionTracker, type Lang } from './utteranceDirection';
import { createDirectionRouter, type DirectionRouter } from './directionRouter';
import { createSpeakGate } from './speakGate';
import { createSourceAttributor } from './sourceAttribution';
import { fetchAsrSession, createAsrCodec, type AsrCodec } from './asrTransport';
import { SPEECH_RHYTHM_DEFAULT, loadSpeechRhythm, rhythmCommitWindows, rhythmPauseSecs, rhythmUsesManualCommit, speechRhythmLabel } from './speechRhythm';
import { refineReasonText } from './refineFailure';
```

**(c)** Hằng số cho cổng "hiện tách khỏi đọc": chữ lên tường ngay, còn giọng đọc thì chờ chiều được chốt. Find and replace:

```ts
const SNAP_TTS_ORDER_WAIT_MS = 1_500;
const SNAP_TTS_ORDER_POLL_MS = 60;

type StartOpts = {
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
```

with

```ts
const SNAP_TTS_ORDER_WAIT_MS = 1_500;
const SNAP_TTS_ORDER_POLL_MS = 60;

/**
 * R5 — how long the VOICE may wait for the router to settle the direction. The subtitle never waits.
 *
 * Same shape as SNAP_TTS_ORDER_WAIT_MS above and for the same reason: holding the hall in silence is
 * itself a failure, so every wait in this file has a ceiling. 1200ms is the top of the budget stated for
 * the router layer (500-1000ms) plus a little air; past it the voice goes out on the direction the wall
 * is already showing, because reading aloud what the room is reading is the least surprising thing left.
 *
 * Today the router answers synchronously inside `acceptFinalText`, well before any sentence reaches the
 * speaking stage, so this timer never actually starts. It exists so that making the router slow — the
 * model-based router, or two pinned sockets that must both finish an utterance before they can be
 * compared — costs the loudspeaker latency and costs the wall none.
 */
const DIRECTION_SETTLE_WAIT_MS = 1_200;

type StartOpts = {
  sourceLanguage: 'vi' | 'ja';
  targetLanguage: 'vi' | 'ja';
```

**(d)** Lane nhận thêm ĐƯỜNG TIẾNG THỨ HAI: một hàm trả về luồng tiếng máy tính, và tiếng nào chảy trong đó. Find and replace:

```ts
  // The shared LaneController.start() signature (the treaty) carries no device/gate options,
  // so the host page supplies them here; all are read live at the relevant moment.
  getDeviceId?: () => string | undefined;
  getNearMicGate?: () => boolean;
  // "Độ nhạy micro" — which voice floor the capture worklet treats as speech. Read ONCE at Bắt đầu
  // (it is baked into the worklet's configure message), so the console disables it while running.
```

with

```ts
  // The shared LaneController.start() signature (the treaty) carries no device/gate options,
  // so the host page supplies them here; all are read live at the relevant moment.
  getDeviceId?: () => string | undefined;
  /**
   * CHIỀU THEO NGUỒN TIẾNG — đường tiếng thứ hai, là tiếng đang phát ra từ chính máy này (Teams/Zoom).
   *
   * Đây là cơ chế hai chiều thật của các sản phẩm thương mại, và bóc ra thì rất tầm thường: chúng ngồi
   * trên máy của MỘT người, nên "mic của tôi" và "tiếng ra loa máy" là hai sợi dây khác nhau, và chiều
   * dịch là thuộc tính của sợi dây chứ không phải một phép đoán. Không mô hình, không ngưỡng, không quán
   * tính — xem `sourceAttribution.ts`.
   *
   * Phía gọi phải tự xin luồng này bằng `getDisplayMedia({ audio: true })` từ một cú bấm của người dùng,
   * và tự giữ vòng đời của nó. `null` (mặc định) = không có đường thứ hai, mọi thứ chạy y như trước.
   *
   * Đọc MỘT LẦN lúc mở micro, vì đồ thị âm thanh không dựng lại được sau khi đã chạy.
   */
  getSystemStream?: () => MediaStream | null | undefined;
  /**
   * Tiếng nào nằm ở đường tiếng máy. `null`/không đặt = phía bên kia nói thứ tiếng CÒN LẠI so với chiều
   * nguồn của phiên — đúng cảnh thường gặp: phòng nói tiếng Việt, đầu cầu Nhật Bản nói tiếng Nhật.
   */
  getSystemLanguage?: () => Lang | null | undefined;
  getNearMicGate?: () => boolean;
  // "Độ nhạy micro" — which voice floor the capture worklet treats as speech. Read ONCE at Bắt đầu
  // (it is baked into the worklet's configure message), so the console disables it while running.
```

**(e)** Bảng chẩn đoán: đường thứ hai có sống không, và nó đã quyết chiều cho bao nhiêu câu. Find and replace:

```ts
  // a musical number means it is doing exactly its job.
  nonSpeechDrops: number;
  lastNonSpeechReason: string;
  latency: LatencyReport;
  lastUsageReportAt: number | null;
  lastSaveAt: number | null;
```

with

```ts
  // a musical number means it is doing exactly its job.
  nonSpeechDrops: number;
  lastNonSpeechReason: string;
  /**
   * Máy nghe đọc lại đoạn đã nhả (`echoGuard.ts`). `echoDrops` = câu bỏ hẳn vì không còn gì mới;
   * `echoTrims` = câu bị cắt mất phần đầu trùng rồi vẫn nhả phần đuôi.
   *
   * Hai số này ĐỀU BẰNG 0 nghĩa là máy nghe không đọc lại — không phải là chốt chặn hỏng. Trên bản ghi
   * 06/08 chúng ra 4 và 3 trên 60 dòng.
   */
  echoDrops: number;
  echoTrims: number;
  /**
   * Số câu phải MƯỢN nhãn ÂM của câu kề bên vì tự nó không có (gần như luôn là câu nhả sớm — nhãn chỉ
   * cưỡi trên bản chốt có mốc thời gian). `carriedTags` cao cùng lúc với `nhả sớm` cao là bình thường;
   * `carriedTags` cao mà `vendorTags` bằng 0 nghĩa là cả buổi không có nhãn nào để mà mượn.
   */
  carriedTags: number;
  latency: LatencyReport;
  lastUsageReportAt: number | null;
  lastSaveAt: number | null;
```

**(f)** Bảng chẩn đoán: cái gì đã quyết chiều, máy nghe đọc lại mấy lần, mượn nhãn kề bên mấy câu, trần 25 giây kẹt mấy lần. Find and replace:

```ts
  /** Lần trần 25s phải CHỜ một khe im lặng thay vì cắt ngay, và lần chờ lâu nhất. */
  forceGapWaits: number;
  forceGapWaitMaxMs: number;
  foreignDrops: number; // finals discarded because neither signal called them Vietnamese or Japanese
  languageTurns: number; // buffers closed because the other language started speaking
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
  asrLanguages: string | null; // what the recogniser AGREED to listen for; null = free auto-detect
```

with

```ts
  /** Lần trần 25s phải CHỜ một khe im lặng thay vì cắt ngay, và lần chờ lâu nhất. */
  forceGapWaits: number;
  forceGapWaitMaxMs: number;
  /**
   * Số lần trần 25s tới hạn mà không chốt được gì. Bằng 0 là đúng. Leo lên trong khi hội trường có tiếng
   * nghĩa là đường cấp cứu cũng không vào được và phiên sắp phải nối lại — số duy nhất nhìn thấy trước
   * được cái treo 131 giây của phiên 06/08.
   */
  ceilingNoops: number;
  /**
   * Sentences the vendor tagged as a THIRD language and the router borrowed onto ours rather than dropped.
   *
   * This replaces `foreignDrops`, and the rename is the point: the same event used to DELETE the sentence,
   * so the number was a count of what the hall never saw. Now the sentence arrives — possibly pointed the
   * wrong way, which is recoverable and visible — and the counter measures how hard the recogniser is
   * struggling rather than how much it threw away.
   */
  languageProjections: number;
  /** R5 — sentences shown but held back from the loudspeaker because the router settled the other way. */
  voiceDirectionHolds: number;
  /** The router's own words for the most recent direction verdict — the diagnostics readout. */
  lastRouterReason: string;
  /** Đường tiếng thứ hai có track tiếng thật và đang được trộn vào. */
  systemSourceLive: boolean;
  /** Số câu mà chiều được quyết bởi CỔNG chứ không phải bởi phỏng đoán. */
  sourceVerdicts: number;
  /** Câu gần nhất vào bằng cổng nào, kèm số mili-giây đo được từng đường. */
  lastSourceReason: string;
  /**
   * Cái gì đã quyết chiều, đếm theo loại, cả phiên.
   *
   * Đây là bảng để trả lời "bớt quán tính đi thì tốt hơn hay tệ hơn" bằng SỐ. `source` cao = đang đi bằng
   * sợi dây; `vendor` cao = đang đi bằng nhãn âm; `sticky` cao = đang đi bằng quán tính, tức là đang đoán.
   */
  routerBasis: Record<string, number>;
  languageTurns: number; // buffers closed because the other language started speaking
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
  asrLanguages: string | null; // what the recogniser AGREED to listen for; null = free auto-detect
```

**(g)** Dựng bộ định chiều cho phiên, và giữ lại nhãn tiếng của máy nghe kèm hạn tươi 8 giây. Find and replace:

```ts
  // direction keep an utterance from ever changing direction after it finalises.
  let twoWay = false;
  let tracker: DirectionTracker | null = null;
  const settledDir = new Map<string, 'vi2ja' | 'ja2vi'>();
  /**
   * TASK 55 — the running order says who is at the microphone, so it also says which language.
```

with

```ts
  // direction keep an utterance from ever changing direction after it finalises.
  let twoWay = false;
  let tracker: DirectionTracker | null = null;
  /**
   * 06/08 — the router that now settles the direction of every FINALISED sentence (directionRouter.ts).
   *
   * It replaces two things that used to sit inline here. The first was `decideFinalLanguage`'s precedence,
   * where kana beat everything instantly and with no inertia, so getting INTO Japanese took one stray
   * character while getting OUT needed evidence that a recogniser sitting in Japanese context does not
   * produce — a one-way ratchet the hall experienced as "it is stuck in Japanese". The second was the
   * `foreign` gate below it, which DISCARDED a sentence when the vendor named a third language and the
   * text carried no tone marks; the ceremony logs are full of Vietnamese speech tagged Chinese, Russian and
   * Italian, and every one of those sentences never reached the wall at all.
   *
   * `tracker` is kept, but demoted: it now only guesses at the direction of DRAFTS (dirLangs, interim), and
   * every final realigns it to whatever the router settled. Two objects, one authority.
   */
  let router: DirectionRouter | null = null;
  /**
   * When the previous accepted final landed — the only input the router cannot measure for itself.
   *
   * A pause is a handover, so this number is what lets "somebody stopped, somebody else started" be
   * detected at all. 0 means no sentence yet this session: the first one is given gap 0 (nothing to hand
   * over FROM), not an infinite gap, which would fire a handover on the very first sentence.
   */
  let lastAcceptedFinalAt = 0;
  /**
   * CHIỀU THEO NGUỒN TIẾNG — câu vừa chốt vào máy bằng cổng nào. Xem `sourceAttribution.ts`.
   *
   * Chỉ sống khi người vận hành có đấu đường tiếng thứ hai. Không đấu thì mọi câu đều không gán được và
   * router chạy y hệt như trước, không rẽ nhánh nào.
   */
  const sourceAttributor = createSourceAttributor();
  /** Đường tiếng máy có thật sự được nối không — để màn điều khiển nói thật, không nói theo ý định. */
  let systemSourceLive = false;
  let sourceVerdicts = 0;
  let lastSourceReason = '';
  /**
   * R5 — the seam between SHOWING a sentence and SPEAKING it. See speakGate.ts.
   *
   * The subtitle goes out on the direction available at flush time and never waits for anybody. The voice
   * asks this gate first, and if the router has settled on a different direction than the one the sentence
   * was TRANSLATED in, the voice stays shut: that translation was made backwards, so speaking it is not a
   * wrong accent on a right sentence, it is a wrong sentence. The wall keeps it, because a wrong subtitle
   * is something the room can see and the operator can fix.
   */
  const speakGate = createSpeakGate();
  const settledDir = new Map<string, 'vi2ja' | 'ja2vi'>();
  /**
   * TASK 55 — the running order says who is at the microphone, so it also says which language.
```

**(h)** Bộ nhớ ngắn cho việc chống đọc lại, thay cho biến cũ chỉ nhớ đúng MỘT câu. Find and replace:

```ts

  // M4 ghost-guard state
  const voicedWindow: { at: number; voicedMs: number }[] = [];
  let previousFinalTranscript = '';
  let droppedGhosts = 0;
  const droppedByReason: Record<string, number> = {};
  // NHẢ CÂU SỚM. `promotedPrefix` là đoạn ĐẦU của lượt đang mở mà ta đã nhả đi rồi — nó vẫn nằm nguyên
```

with

```ts

  // M4 ghost-guard state
  const voicedWindow: { at: number; voicedMs: number }[] = [];
  /**
   * Mấy câu VỪA NHẢ, để bắt máy nghe đọc lại đoạn cũ (`echoGuard.ts`).
   *
   * KHÁC `recentFinals` bên dưới, và cố ý không dùng chung: `recentFinals` giữ đầu ĐOẠN lúc gom xong, làm
   * ngữ cảnh cho bản dịch tinh; cái này giữ từng CÂU lúc vừa nhận, đúng thứ máy nghe có thể đọc lại. Gộp
   * hai thứ lại là để chốt chặn nhìn nhầm hạt.
   */
  let echoMemory: string[] = [];
  let echoDrops = 0;  // câu bị bỏ hẳn vì đã nhả rồi
  let echoTrims = 0;  // câu bị cắt mất phần đầu vì phần đầu đã nhả rồi
  /**
   * Nhãn ÂM gần nhất máy nghe gắn được, và lúc nó về.
   *
   * Nhãn chỉ cưỡi trên bản chốt CÓ MỐC THỜI GIAN. Câu "nhả sớm" cắt ra từ dòng partial nên không bao giờ
   * có nhãn của riêng nó — đo trên phiên 06/08: 39/52 câu là nhả sớm và cả 39 đi tới bộ định tuyến với
   * tay không. Giữ lại nhãn gần nhất để chuyền sang cho chúng, như một bằng chứng YẾU.
   */
  let lastVendorTag = '';
  let lastVendorTagAt = 0;
  let carriedTags = 0;
  /** Nhãn cũ hơn chừng này thì thôi: nó nói về người cầm micro, và người cầm micro thì đổi. */
  const VENDOR_TAG_CARRY_MS = 8_000;
  const noteVendorTag = (tag: string | undefined, at: number): void => {
    if (!tag) return;
    lastVendorTag = tag;
    lastVendorTagAt = at;
  };
  const carriedVendorTag = (at: number): string | undefined =>
    (lastVendorTag && at - lastVendorTagAt <= VENDOR_TAG_CARRY_MS ? lastVendorTag : undefined);
  let droppedGhosts = 0;
  const droppedByReason: Record<string, number> = {};
  // NHẢ CÂU SỚM. `promotedPrefix` là đoạn ĐẦU của lượt đang mở mà ta đã nhả đi rồi — nó vẫn nằm nguyên
```

**(i)** Đếm số lần trần 25 giây tới hạn mà không chốt được gì — số này leo là sắp phải nối lại. Find and replace:

```ts
  // chờ thật hay không — chờ lâu bất thường nghĩa là hội trường không bao giờ im, và ta muốn thấy điều đó.
  let forceGapWaits = 0;
  let forceGapWaitMaxMs = 0;

  const recentFinals: string[] = [];

```

with

```ts
  // chờ thật hay không — chờ lâu bất thường nghĩa là hội trường không bao giờ im, và ta muốn thấy điều đó.
  let forceGapWaits = 0;
  let forceGapWaitMaxMs = 0;
  /** Số lần trần 25s tới hạn mà KHÔNG chốt được gì cả. Xem `sendManualCommit`. */
  let ceilingNoops = 0;

  const recentFinals: string[] = [];

```

**(j)** Đếm số câu tiếng lạ được CỨU (trước đây là số câu bị vứt). Find and replace:

```ts
  let scribeCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let scribeForceCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let manualCommits = 0;
  let foreignDrops = 0;
  let languageTurns = 0;
  let vendorTags = 0;
  let asrLanguages: string | null = null;
```

with

```ts
  let scribeCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let scribeForceCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let manualCommits = 0;
  let languageProjections = 0;
  /**
   * R5 — sentences shown on the wall but NEVER SPOKEN, because by the time the voice was ready the router
   * had settled on the other direction. A number worth watching: it climbing means the pipeline is
   * translating sentences backwards and only the gate is stopping the hall from hearing them.
   */
  let voiceDirectionHolds = 0;
  let lastRouterReason = '';
  let languageTurns = 0;
  let vendorTags = 0;
  let asrLanguages: string | null = null;
```

**(k)** Đo năng lượng RIÊNG từng đường tiếng vào, ngay tại gói âm thanh. Find and replace:

```ts
            pcm = new ArrayBuffer(packet.pcm.byteLength);
            voicedMs = 0;
          }
          voicedWindow.push({ at: Date.now(), voicedMs });
          pruneVoiced();
          notePausePace(voicedMs);
          // Only send audio while the WS is OPEN and the upstream session is ready. Audio produced while
          // not OPEN is discarded here — no unbounded buffering. Direct transport → JSON frame via codec;
          // proxy → raw binary as before (11.2).
```

with

```ts
            pcm = new ArrayBuffer(packet.pcm.byteLength);
            voicedMs = 0;
          }
          const packetAt = Date.now();
          voicedWindow.push({ at: packetAt, voicedMs });
          pruneVoiced();
          notePausePace(voicedMs);
          // Ghi năng lượng RIÊNG từng đường, ngay tại đây. Gói bị câm (cổng nửa song công / Ngưng nghe)
          // đã có `voicedMs = 0` ở trên, nhưng hai con số dưới đây lấy từ CHÍNH gói gốc — chủ ý: một câu
          // bị câm nửa chừng vẫn phải gán đúng cho người đã nói nó.
          sourceAttributor.observe(packetAt, packet.micVoicedMs, packet.sysVoicedMs);
          // Only send audio while the WS is OPEN and the upstream session is ready. Audio produced while
          // not OPEN is discarded here — no unbounded buffering. Direct transport → JSON frame via codec;
          // proxy → raw binary as before (11.2).
```

**(l)** Trộn hai đường trước khi hạ tần số gửi đi. Find and replace:

```ts
          recentLevels.push({ at: now, v });
          if (v >= loudThreshold) lastLoudAt = now;
        },
        { nearMicGate: config.getNearMicGate?.() ?? true, micSensitivity: config.getMicSensitivity?.() ?? 'auto' },
      );
      // stop()/restart may have fired, or a duplicate capture may have won, while the mic-permission
      // prompt was open — never leave a hot mic, a stale-session mic, or a second mic.
```

with

```ts
          recentLevels.push({ at: now, v });
          if (v >= loudThreshold) lastLoudAt = now;
        },
        {
          nearMicGate: config.getNearMicGate?.() ?? true,
          micSensitivity: config.getMicSensitivity?.() ?? 'auto',
          systemStream: config.getSystemStream?.() ?? null,
        },
      );
      // stop()/restart may have fired, or a duplicate capture may have won, while the mic-permission
      // prompt was open — never leave a hot mic, a stale-session mic, or a second mic.
```

**(m)** Nói THẬT về việc đường thứ hai có sống không — chia sẻ màn hình mà quên tích ô âm thanh thì luồng vẫn hợp lệ nhưng câm. Find and replace:

```ts
        return;
      }
      capture = handle;
    } catch (err) {
      const m = `microphone error: ${err instanceof Error ? err.message : String(err)}`;
      teardown();
```

with

```ts
        return;
      }
      capture = handle;
      // Nói THẬT về việc đường thứ hai có sống không. `getDisplayMedia` vẫn trả về luồng hợp lệ khi người
      // vận hành quên tích "chia sẻ âm thanh hệ thống" — luồng đó chỉ có hình, và nếu màn điều khiển báo
      // "đang chạy theo nguồn" trong khi thật ra không có tiếng nào vào, thì mọi câu lặng lẽ bị gán cho
      // mic và không ai biết vì sao chiều vẫn sai.
      systemSourceLive = (config.getSystemStream?.()?.getAudioTracks().length ?? 0) > 0;
    } catch (err) {
      const m = `microphone error: ${err instanceof Error ? err.message : String(err)}`;
      teardown();
```

**(n)** Đường CẤP CỨU của trần 25 giây: khi máy nghe câm hẳn, vẫn phải chốt được, miễn là micrô có nghe thấy tiếng. Find and replace:

```ts
    }
  }

  /** Ask upstream to close the current turn now. Returns false when there is nothing to close. */
  function sendManualCommit(reason: ScribeManualCommitReason): boolean {
    if (scribeCommitPending) return false;
    if (!codec || !ws || ws.readyState !== WebSocket.OPEN || !sessionReady) return false;
    if (!scribeLastPartial.trim()) return false;
    try {
      ws.send(codec.encodeCommit());
    } catch {
```

with

```ts
    }
  }

  /**
   * Ask upstream to close the current turn now. Returns false when there is nothing to close.
   *
   * `atCeiling` là đường CẤP CỨU, và nó cố ý bỏ qua hai điều kiện mà đường thường phải có:
   *
   *   · `scribeCommitPending` — một lệnh chốt đã gửi mà mãi không thấy trả lời KHÔNG phải lý do để im
   *     lặng thêm, nó chính là dấu hiệu nghẽn.
   *   · `scribeLastPartial` — và đây mới là chỗ hỏng thật. Biến này chỉ được ghi trong `scheduleStableCommit`
   *     (tức là phải CÓ partial về mới có), và bị xoá trắng ở mỗi lần chốt lượt. Nên đúng lúc máy nghe câm
   *     — không partial nào về, tức là đúng lúc cần cấp cứu nhất — thì `sendManualCommit` bỏ cuộc ngay ở
   *     dòng này, `armForceCommit` hẹn lại trọn 25 giây nữa, và vòng đó lặp vô hạn. Lưới còn lại duy nhất
   *     là watchdog 35s, mà nó chữa bằng cách nối lại socket và tiếng đang bay thì mất.
   *
   *     Đo được trên phiên 06/08: ba lần đổi tiếng cho ra ba khoảng câm 6,2s → 24,3s → 131s, lần cuối là
   *     treo hẳn rồi nối lại và mất nguyên đoạn đã nói.
   *
   * Đổi lại, cấp cứu vẫn phải có bằng chứng là CÓ TIẾNG để mà chốt — nếu không thì một căn phòng im lặng
   * sẽ bị bắn lệnh chốt 25 giây một lần suốt buổi. Bằng chứng đó là micro, không phải dòng chữ trả về.
   */
  function sendManualCommit(reason: ScribeManualCommitReason, atCeiling = false): boolean {
    if (scribeCommitPending && !atCeiling) return false;
    if (!codec || !ws || ws.readyState !== WebSocket.OPEN || !sessionReady) return false;
    const soundSinceCommit = lastLoudAt > 0 && lastLoudAt >= scribeLastCommitAt;
    if (!scribeLastPartial.trim() && !(atCeiling && soundSinceCommit)) return false;
    try {
      ws.send(codec.encodeCommit());
    } catch {
```

**(o)** Cấp cứu cũng không vào được thì đếm lại và hẹn vòng sau. Find and replace:

```ts
        if (plan.waitedMs > forceGapWaitMaxMs) forceGapWaitMaxMs = plan.waitedMs;
      }
      // `sendManualCommit` re-arms on success; only the "nothing to commit" path has to restart the clock.
      if (!sendManualCommit('max-duration')) {
        scribeLastCommitAt = Date.now();
        armForceCommit();
      }
```

with

```ts
        if (plan.waitedMs > forceGapWaitMaxMs) forceGapWaitMaxMs = plan.waitedMs;
      }
      // `sendManualCommit` re-arms on success; only the "nothing to commit" path has to restart the clock.
      //
      // `atCeiling` = true: đây là đường cấp cứu. Trước đây chỗ này gọi đường thường, và đường thường bỏ
      // cuộc ngay khi không có partial — tức là vô hiệu đúng lúc máy nghe câm, đúng lúc cần nó nhất.
      if (!sendManualCommit('max-duration', true)) {
        // Thật sự không có gì để chốt (phòng im, chưa ai nói từ lần chốt trước). Đếm riêng: số này leo
        // trong khi người ta ĐANG NÓI nghĩa là cấp cứu cũng không vào được, và lúc đó chỉ còn nối lại.
        ceilingNoops += 1;
        scribeLastCommitAt = Date.now();
        armForceCommit();
      }
```

**(p)** Cháo âm tiết không được gắn nhãn tiếng cho câu kế tiếp. Find and replace:

```ts
    // Vẫn là TOÀN BỘ đoạn máy nghe đang giữ, kể cả phần ta đã nhả sớm: bộ đếm nhịp chốt lượt đang đo việc
    // của MÁY NGHE, không phải việc của màn hình.
    const base = (text + stash).trim();
    scheduleStableCommit(base);
    if (!segmentLid) segmentLid = `online-${++counter}`;
    latency.markFirstPartial(segmentLid, performance.now());
```

with

```ts
    // Vẫn là TOÀN BỘ đoạn máy nghe đang giữ, kể cả phần ta đã nhả sớm: bộ đếm nhịp chốt lượt đang đo việc
    // của MÁY NGHE, không phải việc của màn hình.
    const base = (text + stash).trim();
    // Máy nghe thỉnh thoảng gắn nhãn ngay trên dòng partial. Nhặt lấy: đây là nhãn TƯƠI NHẤT có thể có,
    // và câu nhả sớm ngay sau đó sẽ cần nó (xem `carriedVendorTag`).
    //
    // Trừ khi đang là cháo âm tiết. Lúc máy nghe phiên âm một thứ tiếng nó không nhận ra, nhãn nó gắn kèm
    // là nhãn của cái ngôn ngữ nó ĐANG KẸT chứ không phải của người đang nói — mà đó đúng là lúc câu kế
    // tiếp cần mượn nhãn nhất. Rác không được bỏ phiếu, ở mọi đường vào (`notLanguage.ts`).
    if (!isSyllableSoup(base)) {
      noteVendorTag(typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined, Date.now());
    }
    scheduleStableCommit(base);
    if (!segmentLid) segmentLid = `online-${++counter}`;
    latency.markFirstPartial(segmentLid, performance.now());
```

**(q)** Cháo âm tiết không được lên tường ở dạng chữ mờ. Find and replace:

```ts
    const shown = stripPromotedPrefix(base, promotedPrefix);
    const live = shown.coveredByPromoted ? '' : shown.text;
    if (!live) return; // cả đoạn đang nghe đã nhả đi rồi — không còn gì mờ để vẽ
    currentInterimSource = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, live, SEGMENT_MIN_CHARS), live);
    emitLine({ lid: segmentLid, sourceText: currentInterimSource, targetText: lastInterimTarget, interim: true, corrected: false });
    scheduleDraft();
```

with

```ts
    const shown = stripPromotedPrefix(base, promotedPrefix);
    const live = shown.coveredByPromoted ? '' : shown.text;
    if (!live) return; // cả đoạn đang nghe đã nhả đi rồi — không còn gì mờ để vẽ
    // Cháo âm tiết cũng không được lên tường ở dạng chữ MỜ. Dòng mờ là thứ dễ thấy nhất trong phòng — nó
    // to, nó động, và mắt người bám vào cái đang chuyển động. Chốt chặn ở `acceptFinalText` chặn được câu
    // CHỐT, nhưng dòng mờ đi thẳng ra `emitLine` nên phải chặn riêng ở đây.
    //
    // Dừng vẽ, chứ không xoá: tường giữ nguyên dòng mờ cuối cùng còn đọc được. Và không gọi `scheduleDraft`
    // nữa — không tiêu một lượt dịch cho rác. Bắt nhầm là chuyện không xảy ra được: dòng thật nhiều gạch
    // nhất trong cả kho log là 5 nhóm, ngưỡng là 8.
    if (isSyllableSoup(live)) return;
    currentInterimSource = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, live, SEGMENT_MIN_CHARS), live);
    emitLine({ lid: segmentLid, sourceText: currentInterimSource, targetText: lastInterimTarget, interim: true, corrected: false });
    scheduleDraft();
```

**(r)** Cửa chung của mọi câu nay nhận thêm nhãn tiếng của máy nghe. Find and replace:

```ts
   * một câu chốt bình thường đi qua, nếu không thì bật cơ chế nhả sớm lên là lặng lẽ tắt hết các lớp bảo
   * vệ đã dựng suốt sáu tháng.
   */
  function acceptFinalText(transcript: string, detectedLanguage: string | undefined): void {
    const msg: Record<string, unknown> = detectedLanguage ? { detectedLanguage } : {};
    // M4 ghost guards (drop finals, count them).
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_FINAL_MIN_VOICED_MS)) {
      dropGhost('low-voiced', transcript);
      return;
    }
    if (Date.now() - lastLoudAt >= ghostWindowMs()) {
      dropGhost('long-silence', transcript);
      return;
    }
    // M13: the guards above ask "was there sound?", and during a musical number the answer is yes, which
```

with

```ts
   * một câu chốt bình thường đi qua, nếu không thì bật cơ chế nhả sớm lên là lặng lẽ tắt hết các lớp bảo
   * vệ đã dựng suốt sáu tháng.
   */
  function acceptFinalText(incoming: string, detectedLanguage: string | undefined): void {
    const msg: Record<string, unknown> = detectedLanguage ? { detectedLanguage } : {};
    // M4 ghost guards (drop finals, count them).
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_FINAL_MIN_VOICED_MS)) {
      dropGhost('low-voiced', incoming);
      return;
    }
    if (Date.now() - lastLoudAt >= ghostWindowMs()) {
      dropGhost('long-silence', incoming);
      return;
    }
    // M13: the guards above ask "was there sound?", and during a musical number the answer is yes, which
```

**(s)** Ba chốt chặn ma ghi lại đúng chữ gốc. Find and replace:

```ts
    if (!shape.speechLike) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = shape.reason;
      dropGhost(`non-speech sound · ${shape.reason}`, transcript);
      return;
    }
    if (transcript.length >= REPEAT_GUARD_MIN_CHARS && transcript === previousFinalTranscript) {
      dropGhost('repeat', transcript);
      return;
    }
    // M11: the transcriber's own "I could not hear that" marker is not something anybody said.
    if (isNonSpeechAnnotation(transcript)) {
      dropGhost('non-speech annotation', transcript);
```

with

```ts
    if (!shape.speechLike) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = shape.reason;
      dropGhost(`non-speech sound · ${shape.reason}`, incoming);
      return;
    }
    // MÁY NGHE ĐỌC LẠI ĐOẠN VỪA RỒI. Chốt lượt không xoá ngữ cảnh của nó, nên lượt sau có thể mở ra bằng
    // chính những chữ vừa đóng lại rồi mới nói tiếp — bản ghi 06/08 có 7/60 dòng như thế (12%).
    //
    // Chốt chặn cũ ở đúng chỗ này chỉ nhớ MỘT câu ngay trước, và chỉ so BẰNG NHAU tuyệt đối. Sáu trong
    // bảy ca nằm cách 2–3 dòng nên ngoài tầm với, còn ca cách 1 dòng cũng lọt vì bản mới DÀI HƠN bản cũ.
    // Nay nhớ nhiều câu và so theo BAO HÀM — xem `echoGuard.ts` cho luật an toàn.
    const echo = judgeEcho(incoming, echoMemory, REPEAT_GUARD_MIN_CHARS);
    if (echo.kind === 'repeat') {
      echoDrops += 1;
      dropGhost('repeat', incoming);
      return;
    }
    if (echo.kind === 'trimmed') echoTrims += 1;
    // Từ đây trở xuống là chữ THẬT SỰ MỚI của câu này. Mọi chốt chặn còn lại, bộ khớp kịch bản, bản dịch
    // và dòng lưu lại đều phải nhìn cùng một chuỗi — trừ ở đây rồi mới đi tiếp là cách duy nhất bảo đảm.
    const transcript = echo.text;
    if (!transcript) return;
    // M11: the transcriber's own "I could not hear that" marker is not something anybody said.
    if (isNonSpeechAnnotation(transcript)) {
      dropGhost('non-speech annotation', transcript);
```

**(t)** Khối lớn nhất: chống đọc lại, hai chốt "không phải tiếng người", và bộ định chiều thay cho cửa vứt câu tiếng lạ. Find and replace:

```ts
      dropGhost('invented number', transcript);
      return;
    }
    previousFinalTranscript = transcript;

    // M11: what language was this, really? The vendor tags every completed transcript (the session is
    // opened with include_language_detection) and until now nothing read it.
    const vendorLanguage = typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined;
    if (vendorLanguage) vendorTags += 1;
    const decided = decideFinalLanguage(transcript, vendorLanguage);
    if (decided.foreign) {
      // Neither our two languages by EITHER signal. In the ceremony logs this was Chinese and Italian
      // transcripts of Vietnamese speech, and the vendor's own "（聞き取り不能）" marker — all of which were
      // faithfully translated and read aloud to the hall. Better a missing sentence than a fictional one.
      foreignDrops += 1;
      dropGhost('foreign-language', transcript);
      return;
    }

    // M13: the recogniser has just named the language that was at the microphone. Point the pause profile
    // at that speaker's bucket, so the next turn is measured against pauses taken in the same language.
    if (decided.language) pauseKey = decided.language;

    // M11: one microphone, two languages. A final in the OTHER language must not be glued onto the
    // buffer: the whole buffer settles its direction ONCE, so "Xin chào quý vị" + "皆様こんにちは" becomes a
```

with

```ts
      dropGhost('invented number', transcript);
      return;
    }
    // 06/08 — hai chốt chặn cuối cùng của loạt này, cả hai đo từ phiên 14:47. Xem `notLanguage.ts`.
    //
    // Đứng ĐÚNG CHỖ NÀY chứ không sớm hơn, vì hai lý do: chúng đọc `transcript` (đã trừ phần nhả sớm và
    // phần máy nghe đọc lại) nên thấy đúng cái sẽ lên tường — mảnh `"` cô độc chỉ LỘ RA sau khi trừ; và
    // chúng nằm TRƯỚC `rememberEcho`/`noteVendorTag` bên dưới, nên rác không vào bộ nhớ chống-đọc-lại và
    // không được bỏ phiếu cho chiều dịch.
    if (hasNoLetters(transcript)) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = 'không có chữ nào';
      dropGhost('no letters', transcript);
      return;
    }
    if (isSyllableSoup(transcript)) {
      nonSpeechDrops += 1;
      lastNonSpeechReason = 'cháo âm tiết';
      dropGhost('syllable soup', transcript);
      return;
    }
    echoMemory = rememberEcho(echoMemory, transcript, ECHO_MEMORY);

    // M11: what language was this, really? The vendor tags every completed transcript (the session is
    // opened with include_language_detection) and until now nothing read it.
    const vendorLanguage = typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined;
    if (vendorLanguage) vendorTags += 1;
    noteVendorTag(vendorLanguage, Date.now());
    // 06/08 — THE ROUTER decides, and the `foreign` gate that used to stand here is GONE.
    //
    // That gate discarded a sentence whenever the vendor named a third language and the text carried no
    // Vietnamese tone marks. The intent was sound (better a missing sentence than a fictional one), but
    // the ceremony logs show what it actually did: Vietnamese speech tagged Chinese, Russian and Italian,
    // deleted, silently, mid-ceremony. From the hall that is not "it hasn't recognised me" — it is a
    // silence with no end in sight, and the operator has nothing to react to because `dropGhost` only
    // writes console.debug. The router BORROWS instead: a third language is read as the non-base direction
    // for that one sentence and never latched (directionRouter.ts, rule 1).
    //
    // Nothing is reopened by removing it. The vendor's own "（聞き取り不能）", "(inaudible)", "[音楽]" and "♪"
    // markers — the other half of what this gate used to catch — are caught above by isNonSpeechAnnotation.
    const finalAt = Date.now();
    // First sentence of the session hands over from nobody, so gap 0 rather than "the whole session".
    const gapMs = lastAcceptedFinalAt ? finalAt - lastAcceptedFinalAt : 0;
    // CHIỀU THEO NGUỒN TIẾNG. Hỏi cửa sổ thời gian của ĐÚNG câu này — từ câu chốt trước tới bây giờ —
    // xem tiếng vào máy bằng cổng nào. Đây là bằng chứng duy nhất trong cả đường ống không phải một phép
    // đo: không thứ gì trong phòng làm cho máy tính tự phát ra tiếng.
    //
    // Chỉ chạy khi đường thứ hai SỐNG THẬT. Không đấu thì `verdictFor` luôn thấy `sysVoicedMs = 0`, mọi
    // câu gán về mic, và gán tất cả về một phía thì chẳng khác gì không có tín hiệu — tệ hơn thế, nó sẽ
    // ghim cứng chiều của cả buổi. Nên cửa `systemSourceLive` phải đứng ngoài cùng.
    const sourceVerdict = systemSourceLive && twoWay
        ? sourceAttributor.verdictFor(lastAcceptedFinalAt, finalAt)
        : null;
    const systemLang: Lang = config.getSystemLanguage?.()
        ?? (opts?.sourceLanguage === 'ja' ? 'vi' : 'ja');
    const sourceLang: Lang | undefined = sourceVerdict
        ? (sourceVerdict.source === 'system' ? systemLang : (systemLang === 'ja' ? 'vi' : 'ja'))
        : undefined;
    if (sourceLang) {
        sourceVerdicts += 1;
        lastSourceReason = `${sourceVerdict!.source === 'system' ? 'tiếng máy' : 'micro'}`
            + ` (mic ${Math.round(sourceVerdict!.micVoicedMs)}ms · máy ${Math.round(sourceVerdict!.sysVoicedMs)}ms`
            + `${sourceVerdict!.overlapped ? ' · chồng tiếng' : ''})`;
    }
    lastAcceptedFinalAt = finalAt;
    // One-way listening does not route: the socket itself is opened pinned to the operator's language
    // (`language: twoWay ? 'auto' : opts.sourceLanguage`), so there is no direction to decide and no third
    // language the recogniser could return.
    // Câu KHÔNG có nhãn của riêng nó thì mượn nhãn ÂM gần nhất — gần như luôn là câu nhả sớm, vì nhãn chỉ
    // cưỡi trên bản chốt có mốc thời gian. Chỉ mượn khi nhãn còn tươi; hết tươi thì thà không có gì còn
    // hơn có một cái nhãn nói về người đã rời micro từ lâu.
    const vendorCarriedRaw = vendorLanguage ? undefined : carriedVendorTag(finalAt);
    if (vendorCarriedRaw) carriedTags += 1;
    const routed = twoWay && router ? router.next({ text: transcript, vendorRaw: vendorLanguage, vendorCarriedRaw, gapMs, sourceLang }) : null;
    if (routed?.projected) languageProjections += 1;
    lastRouterReason = routed?.reason ?? '';
    const routedLang: Lang | null = routed ? routed.language : (opts?.sourceLanguage ?? null);

    // M13: the recogniser has just named the language that was at the microphone. Point the pause profile
    // at that speaker's bucket, so the next turn is measured against pauses taken in the same language.
    if (routedLang) pauseKey = routedLang;

    // M11: one microphone, two languages. A final in the OTHER language must not be glued onto the
    // buffer: the whole buffer settles its direction ONCE, so "Xin chào quý vị" + "皆様こんにちは" becomes a
```

**(u)** Cắt lượt khi người kia bắt đầu nói: hỏi bộ định chiều, không hỏi luật đọc mặt chữ nữa. Find and replace:

```ts
    // TASK 55: while the direction is locked there IS no other language — a Vietnamese phrase inside a
    // Japanese turn is a quotation and belongs in the same sentence, so the turn split stands down. The
    // real handover is the operator pressing the next segment, and that flushes the buffer explicitly.
    if (twoWay && !lockedSource && decided.language && segmentBuffer.trim()) {
      const held = decideFinalLanguage(segmentBuffer).language;
      if (held && held !== decided.language) {
        languageTurns += 1;
        flushSegment('turn-end');
      }
```

with

```ts
    // TASK 55: while the direction is locked there IS no other language — a Vietnamese phrase inside a
    // Japanese turn is a quotation and belongs in the same sentence, so the turn split stands down. The
    // real handover is the operator pressing the next segment, and that flushes the buffer explicitly.
    if (twoWay && !lockedSource && routedLang && segmentBuffer.trim()) {
      const held = decideFinalLanguage(segmentBuffer).language;
      if (held && held !== routedLang) {
        languageTurns += 1;
        flushSegment('turn-end');
      }
```

**(v)** Chốt tiếng của một câu đã xong: cũng vậy. Khoá của bảng chương trình vẫn đứng trên tất cả. Find and replace:

```ts
    // (an "OK", a number) inherits the language actually being spoken.
    // TASK 55: a lock outranks the vendor's tag. The recogniser is right about what it HEARD; it is not
    // right about who is speaking, and a quoted phrase would otherwise settle the whole turn the wrong way.
    if (twoWay && tracker && !lockedSource && decided.language && decided.basis !== 'none') {
      settledDir.set(segmentLid, directionOf(decided.language));
      tracker.reset(decided.language);
    }
    currentInterimSource = segmentBuffer;
    emitLine({ lid: segmentLid, sourceText: segmentBuffer, targetText: lastInterimTarget, interim: true, corrected: false });

```

with

```ts
    // (an "OK", a number) inherits the language actually being spoken.
    // TASK 55: a lock outranks the vendor's tag. The recogniser is right about what it HEARD; it is not
    // right about who is speaking, and a quoted phrase would otherwise settle the whole turn the wrong way.
    // 06/08: the `basis !== 'none'` condition that used to guard this is gone with the router. The old
    // decision could genuinely have nothing to say ("OK", a number, toneless Latin) and then dirLangs had
    // to guess from the script at flush time; the router always answers, and its answer — inertia, the
    // handover pause, the running order's lock — is strictly better informed than that guess ever was.
    if (twoWay && tracker && router && !lockedSource && routedLang) {
      settledDir.set(segmentLid, directionOf(routedLang));
      // The tracker mirrors the router's RUNNING direction, not this sentence's. The two differ on a
      // projected sentence: a third-language tag is borrowed for one line only and must not be allowed to
      // become the direction of the turn — that would build a second ratchet beside the one just removed.
      tracker.reset(router.current());
    }
    // R5: the arbiter has spoken for this sentence — release anything holding the loudspeaker for it.
    // Placed here rather than at flush time on purpose: this is the moment the DECISION exists, and the
    // whole point of the gate is that the decision and the display no longer have to happen together.
    if (routedLang) speakGate.settle(segmentLid, routedLang);
    currentInterimSource = segmentBuffer;
    emitLine({ lid: segmentLid, sourceText: segmentBuffer, targetText: lastInterimTarget, interim: true, corrected: false });

```

**(w)** Dòng kịch bản: ghi lại chiều NGUỒN, để cổng đọc có cái mà đối chiếu. Find and replace:

```ts
        emitLine({ lid, sourceText: head, targetText: verdict.target, interim: false, corrected: true });
        latency.markRefineShown(lid, performance.now());
        recordSessionLine(lid, finalizedAt, head, verdict.target, true);
        if (config.getSpeakEnabled?.()) void speakSnap(verdict.target, verdict.language, lid, order);
        // TASK 56: dòng đã lên tường, giờ tới lượt MC bên kia đọc bản dịch. Ngủ tới khi được bấm dòng sau.
        guidedDeafAtIndex = guided.index;
        guidedDeafSince = Date.now();
```

with

```ts
        emitLine({ lid, sourceText: head, targetText: verdict.target, interim: false, corrected: true });
        latency.markRefineShown(lid, performance.now());
        recordSessionLine(lid, finalizedAt, head, verdict.target, true);
        // R5: a HUMAN pointed at this line. That outranks the router, which is reading text off a machine
        // that was listening to a ballroom — so the gate is settled here rather than waited on, and the
        // voice goes out without asking. `verdict.language` is what to speak, so the source is the other.
        const guidedSource: Lang = verdict.language === 'vi' ? 'ja' : 'vi';
        speakGate.show(lid, guidedSource);
        speakGate.settle(lid, guidedSource);
        if (config.getSpeakEnabled?.()) void speakSnap(verdict.target, verdict.language, guidedSource, lid, order);
        // TASK 56: dòng đã lên tường, giờ tới lượt MC bên kia đọc bản dịch. Ngủ tới khi được bấm dòng sau.
        guidedDeafAtIndex = guided.index;
        guidedDeafSince = Date.now();
```

**(x)** Báo cho cổng biết câu này đã hiện lên tường. Find and replace:

```ts
    const target = result.scriptTarget.trim();
    if (!target) return false;
    if (flipped) scriptFlips += 1;

    scriptMatcher.accept(result); // the script cursor advances only on a line actually used
    scriptSnaps += 1;
```

with

```ts
    const target = result.scriptTarget.trim();
    if (!target) return false;
    if (flipped) scriptFlips += 1;
    // R5: the direction this line was actually BUILT in — `heardLanguage`, not `dl.source`, because when
    // the script overruled the recogniser those two differ and the script is the one that won.
    speakGate.show(lid, heardLanguage);
    // And when it overruled, it also ANSWERS the router's question: a human approved that pair hours ago
    // (TASK 32). Settling here stops the gate from reading a deliberate, better-evidenced flip as the
    // router disagreeing and silencing a line that is correct.
    if (flipped) speakGate.settle(lid, heardLanguage);

    scriptMatcher.accept(result); // the script cursor advances only on a line actually used
    scriptSnaps += 1;
```

**(y)** Hàm đọc dòng kịch bản nhận thêm chiều nguồn. Find and replace:

```ts

  // Hold a snap's VOICE — never its subtitle — until every sentence spoken before it has left refine,
  // so the hall hears the sentences in the order they were said. Bounded: see SNAP_TTS_ORDER_WAIT_MS.
  async function speakSnap(text: string, language: Lang, lid: string, order: number): Promise<void> {
    const gen = sessionGen;
    const deadline = Date.now() + SNAP_TTS_ORDER_WAIT_MS;
    while (Date.now() < deadline) {
      let earlier = false;
```

with

```ts

  // Hold a snap's VOICE — never its subtitle — until every sentence spoken before it has left refine,
  // so the hall hears the sentences in the order they were said. Bounded: see SNAP_TTS_ORDER_WAIT_MS.
  async function speakSnap(text: string, language: Lang, source: Lang, lid: string, order: number): Promise<void> {
    const gen = sessionGen;
    // R5 — the direction gate comes FIRST, before the ordering wait. Two waits, two different questions:
    // this one asks "is this sentence pointed the right way", the one below asks "is it this sentence's
    // turn to be heard". Asking them in this order means a sentence that is never going to be spoken does
    // not spend a second and a half holding up the queue behind it.
    const settled = await speakGate.wait(lid, DIRECTION_SETTLE_WAIT_MS, source);
    if (gen !== sessionGen) return;
    if (settled.changed) { voiceDirectionHolds += 1; speakGate.forget(lid); return; }
    const deadline = Date.now() + SNAP_TTS_ORDER_WAIT_MS;
    while (Date.now() < deadline) {
      let earlier = false;
```

**(z)** Câu chết thì quên nó khỏi cổng, không để cổng chờ mãi. Find and replace:

```ts
    if (gen !== sessionGen) return;
    enqueueTtsSentence(text, language, undefined, undefined, lid);
    ttsSentences += 1;
  }

  // ---- M6: refine tier ----
```

with

```ts
    if (gen !== sessionGen) return;
    enqueueTtsSentence(text, language, undefined, undefined, lid);
    ttsSentences += 1;
    speakGate.forget(lid);
  }

  // ---- M6: refine tier ----
```

**(aa)** Báo cổng cho câu thường (không phải dòng kịch bản). Find and replace:

```ts
    const o = opts!;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    const gen = sessionGen;
    const body = JSON.stringify({
      sourceText: head,
      sourceLanguage: dl.source,
```

with

```ts
    const o = opts!;
    const dl = dirLangs(lid, head, false); // settled at finalisation — never changes again
    const gen = sessionGen;
    // R5: the direction this sentence is being TRANSLATED in, recorded before the round trip — so that
    // when the voice asks the gate 1-2 seconds later there is something concrete for the router's verdict
    // to be compared against: "the wall already says this; is it still true?"
    speakGate.show(lid, dl.source);
    const body = JSON.stringify({
      sourceText: head,
      sourceLanguage: dl.source,
```

**(ab)** Chờ cổng chốt chiều rồi mới đọc lên loa — chữ thì đã lên tường từ trước. Find and replace:

```ts
      if (config.getSpeakEnabled?.()) {
        const speakText = data.ttsText || data.translatedText || '';
        if (speakText) {
          // M13: never hand the voice a language it cannot pronounce. The subtitle above has ALREADY been
          // shown and saved — only the loudspeaker is held back, so a wrong skip costs one sentence the
          // hall reads instead of hears, while a wrong speak is a burst of noise over the next sentence.
```

with

```ts
      if (config.getSpeakEnabled?.()) {
        const speakText = data.ttsText || data.translatedText || '';
        if (speakText) {
          // R5 — the subtitle above went out already. Only now does the voice ask the router whether this
          // sentence was pointed the right way, and a disagreement SILENCES it: the translation was made
          // in the other direction, so it is not a right sentence with a wrong accent, it is a backwards
          // sentence. The hall reads it instead of hearing it, which is the recoverable half of the two.
          const settled = await speakGate.wait(lid, DIRECTION_SETTLE_WAIT_MS, dl.source);
          if (gen !== sessionGen) return;
          if (settled.changed) {
            voiceDirectionHolds += 1;
            speakGate.forget(lid);
            return;
          }
          speakGate.forget(lid);
          // M13: never hand the voice a language it cannot pronounce. The subtitle above has ALREADY been
          // shown and saved — only the loudspeaker is held back, so a wrong skip costs one sentence the
          // hall reads instead of hears, while a wrong speak is a burst of noise over the next sentence.
```

**(ac)** Mỗi phiên dựng lại bộ định chiều. Find and replace:

```ts
    // tracker with the technician's chosen source language for the first utterance.
    twoWay = config.getTwoWay?.() ?? false;
    tracker = createDirectionTracker(startOpts.sourceLanguage);
    settledDir.clear();
    lockedSource = null; // a new session starts on auto-detect; the running order re-arms it per segment
    guidedDeafAtIndex = -1;
```

with

```ts
    // tracker with the technician's chosen source language for the first utterance.
    twoWay = config.getTwoWay?.() ?? false;
    tracker = createDirectionTracker(startOpts.sourceLanguage);
    // The router is seeded from the same chosen language and, like the tracker, does not survive the
    // session — a new Start is a new room. `baseMode` is decided a few lines down, once we know whether
    // there is a running order in this session at all.
    router = createDirectionRouter(startOpts.sourceLanguage);
    lastAcceptedFinalAt = 0;
    speakGate.reset(); // R5 — wakes anything a previous session left waiting, then forgets every sentence

    settledDir.clear();
    lockedSource = null; // a new session starts on auto-detect; the running order re-arms it per segment
    guidedDeafAtIndex = -1;
```

**(ad)** Mỗi phiên dọn sạch bộ nhớ chống đọc lại. Find and replace:

```ts
    segmentLid = null;
    voicedWindow.length = 0;
    recentLevels = []; // a new session never shows the previous room's VU peak
    previousFinalTranscript = '';
    droppedGhosts = 0;
    recentFinals.length = 0;
    // reset Phase-2 state + counters
```

with

```ts
    segmentLid = null;
    voicedWindow.length = 0;
    recentLevels = []; // a new session never shows the previous room's VU peak
    echoMemory = [];
    echoDrops = 0;
    echoTrims = 0;
    // Phiên mới là căn phòng mới: nhãn của buổi trước không được quyết chiều của câu đầu tiên buổi này.
    lastVendorTag = '';
    lastVendorTagAt = 0;
    carriedTags = 0;
    droppedGhosts = 0;
    recentFinals.length = 0;
    // reset Phase-2 state + counters
```

**(ae)** Có kịch bản thì chạy kiểu BUỔI LỄ (nghỉ một nhịp là về chiều nền); không có thì kiểu CUỘC HỌP. Find and replace:

```ts
    const scriptSeed = config.getScript?.() ?? [];
    scriptMatcher = scriptSeed.length ? createScriptMatcher(scriptSeed) : null;
    scriptRows = scriptSeed.length;
    scriptSeedRows = scriptSeed; // TASK 34 — guided mode addresses rows by number, not by candidate
    // TASK 6: the names on the approved rows are known hours before the ceremony — prime the recogniser
    // with them instead of letting it guess at them live. Latched here with the rows themselves, so the
```

with

```ts
    const scriptSeed = config.getScript?.() ?? [];
    scriptMatcher = scriptSeed.length ? createScriptMatcher(scriptSeed) : null;
    scriptRows = scriptSeed.length;
    // 06/08 — a script IS a running order, and a running order is the whole reason `base` means anything.
    //
    // With one (a ceremony), a pause returns the direction to the base: the programme says this part is in
    // Vietnamese, and that outranks whoever was talking a moment ago. Without one (an internal meeting),
    // `base` is only the direction somebody picked when they switched the machine on, and returning to it
    // on every breath would drag a Japanese guest's five-minute explanation back to Vietnamese at each
    // pause. So there a pause REOPENS the question instead of answering it. See BaseMode in directionRouter.
    router.setBaseMode(scriptRows ? 'anchor' : 'free');
    scriptSeedRows = scriptSeed; // TASK 34 — guided mode addresses rows by number, not by candidate
    // TASK 6: the names on the approved rows are known hours before the ceremony — prime the recogniser
    // with them instead of letting it guess at them live. Latched here with the rows themselves, so the
```

**(af)** Dọn nốt các bộ đếm còn lại — buổi trước không được quyết chuyện buổi này. Find and replace:

```ts
    resetScribeCommitState(false);
    manualCommits = 0;
    promotions = 0;
    foreignDrops = 0;
    languageTurns = 0;
    vendorTags = 0;
    asrLanguages = null;
```

with

```ts
    resetScribeCommitState(false);
    manualCommits = 0;
    promotions = 0;
    // Ba số của cái trần 25s cũng phải về 0 ở phiên mới, y như `manualCommits` ngay trên: đọc "trần chờ
    // khe im 14 lần" mà 14 đó là của buổi tổng duyệt sáng nay thì con số nói dối.
    forceGapWaits = 0;
    forceGapWaitMaxMs = 0;
    ceilingNoops = 0;
    languageProjections = 0;
    voiceDirectionHolds = 0;
    lastRouterReason = '';
    // Phiên mới là căn phòng mới. `systemSourceLive` được đặt lại thành true/false ở `ensureCapture`, khi
    // biết chắc luồng chia sẻ có track tiếng hay không — ở đây chỉ tắt, không được đoán là còn sống.
    sourceAttributor.reset();
    systemSourceLive = false;
    sourceVerdicts = 0;
    lastSourceReason = '';
    languageTurns = 0;
    vendorTags = 0;
    asrLanguages = null;
```

**(ag)** Đưa số "máy nghe đọc lại" ra bảng chẩn đoán. Find and replace:

```ts
      pausedMs: Math.round(pausedMs),
      nonSpeechDrops,
      lastNonSpeechReason,
      latency: latency.getReport(),
      lastUsageReportAt,
      lastSaveAt,
```

with

```ts
      pausedMs: Math.round(pausedMs),
      nonSpeechDrops,
      lastNonSpeechReason,
      echoDrops,
      echoTrims,
      carriedTags,
      latency: latency.getReport(),
      lastUsageReportAt,
      lastSaveAt,
```

**(ah)** Đưa số trần 25 giây và số nguồn tiếng ra bảng chẩn đoán. Find and replace:

```ts
      promotions,
      forceGapWaits,
      forceGapWaitMaxMs,
      foreignDrops,
      languageTurns,
      vendorTags,
      asrLanguages,
```

with

```ts
      promotions,
      forceGapWaits,
      forceGapWaitMaxMs,
      ceilingNoops,
      languageProjections,
      voiceDirectionHolds,
      lastRouterReason,
      systemSourceLive,
      sourceVerdicts,
      lastSourceReason,
      routerBasis: router?.stats().byBasis ?? {},
      languageTurns,
      vendorTags,
      asrLanguages,
```

**(ai)** Bảng chương trình khoá chiều thì khoá luôn bộ định chiều. Find and replace:

```ts
    if (segmentBuffer.trim()) flushSegment('turn-end');
    lockedSource = language;
    if (language) tracker.reset(language);
  }

  return { id: 'online', start, stop, getDiagnostics, saveSession, lockLanguage };
```

with

```ts
    if (segmentBuffer.trim()) flushSegment('turn-end');
    lockedSource = language;
    if (language) tracker.reset(language);
    // The router keeps its own lock so that `router.current()` stays truthful while one is on, and so the
    // direction the operator pinned is the one the router CARRIES ON WITH when the lock is released — a
    // release must not hand the room back to whatever was running before the segment started.
    router?.lock(language);
  }

  return { id: 'online', start, stop, getDiagnostics, saveSession, lockLanguage };
```


## TASK 113 — Bật/tắt đường tiếng thứ hai (`src/lib/lanes/online/index.ts`)

Chỗ đáng chú ý: khi xin chia sẻ màn hình mà người vận hành **quên tích ô "chia sẻ âm thanh"**, trình duyệt
vẫn trả về một luồng hợp lệ — chỉ có hình, không có tiếng. Nếu nhận bừa thì màn điều khiển sẽ báo "đang
chạy theo nguồn tiếng" trong khi thật ra chẳng có tiếng nào vào, và mọi câu lặng lẽ bị gán cho micrô mà
không ai hiểu vì sao chiều vẫn sai. Nên luồng không có tiếng thì **từ chối, và nói rõ lý do**.

**Tệp: `src/lib/lanes/online/index.ts`** — 6 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Giao diện lane có thêm: bật/tắt đường tiếng thứ hai, và lời nhắn khi bật hụt. Find and replace:

```ts
  // to start at all, silently. Evidence and the way back in: docs/ONLINE-LANE-UI-API.md.
  twoWay: boolean
  setTwoWay: (v: boolean) => void
  directedLines: AudienceLine[]
  subtitleFont: number
  setSubtitleFont: (n: number) => void
```

with

```ts
  // to start at all, silently. Evidence and the way back in: docs/ONLINE-LANE-UI-API.md.
  twoWay: boolean
  setTwoWay: (v: boolean) => void
  /**
   * CHIỀU THEO NGUỒN TIẾNG — đường tiếng thứ hai đang đấu hay chưa.
   *
   * Đây là cơ chế hai chiều thật của các sản phẩm thương mại, và nó tầm thường tới mức khó tin: chúng
   * ngồi trên máy của MỘT người, nên "mic của tôi" và "tiếng ra loa máy" là hai sợi dây khác nhau, và
   * chiều dịch là thuộc tính của sợi dây chứ không phải một phép đoán. Bật lên thì mọi câu vào bằng
   * đường tiếng máy được gán thẳng cho đầu cầu bên kia — không mô hình, không ngưỡng, không quán tính.
   *
   * Chỉ có nghĩa ở phiên HAI CHIỀU, và chỉ ăn từ lần Bắt đầu sau: đồ thị âm thanh không dựng lại được
   * sau khi micro đã mở.
   */
  systemSourceOn: boolean
  /** Vì sao chưa đấu được (người vận hành quên tích ô chia sẻ tiếng, hoặc trình duyệt từ chối). */
  systemSourceNote: string
  attachSystemSource: () => Promise<void>
  detachSystemSource: () => void
  directedLines: AudienceLine[]
  subtitleFont: number
  setSubtitleFont: (n: number) => void
```

**(b)** Giữ luồng màn hình đang chia sẻ. Find and replace:

```ts
  const [twoWay, setTwoWayState] = useState<boolean>(() => { try { return localStorage.getItem('proyaku_online_two_way') === '1' } catch { return false } })
  const [subtitleFont, setSubtitleFontState] = useState<number>(() => { try { return clampSubtitleFont(Number(localStorage.getItem('proyaku_online_subtitle_font')) || SUBTITLE_FONT.default) } catch { return SUBTITLE_FONT.default } })
  const [wallCharCm, setWallCharCmState] = useState<number>(() => { try { return clampCharCm(Number(localStorage.getItem('proyaku_online_wall_char_cm')) || HALL_CHAR_CM.default) } catch { return HALL_CHAR_CM.default } })
  const [wallOutputs, setWallOutputsState] = useState<WallOutput[]>(() => loadWallOutputs())
  const [wallSupport, setWallSupport] = useState<ScreenSupport>('idle')
  const [wallScreens, setWallScreens] = useState<WallScreen[]>([])
```

with

```ts
  const [twoWay, setTwoWayState] = useState<boolean>(() => { try { return localStorage.getItem('proyaku_online_two_way') === '1' } catch { return false } })
  const [subtitleFont, setSubtitleFontState] = useState<number>(() => { try { return clampSubtitleFont(Number(localStorage.getItem('proyaku_online_subtitle_font')) || SUBTITLE_FONT.default) } catch { return SUBTITLE_FONT.default } })
  const [wallCharCm, setWallCharCmState] = useState<number>(() => { try { return clampCharCm(Number(localStorage.getItem('proyaku_online_wall_char_cm')) || HALL_CHAR_CM.default) } catch { return HALL_CHAR_CM.default } })
  // Đường tiếng thứ hai. CỐ Ý không nhớ qua lần mở sau: `getDisplayMedia` bắt buộc phải có một cú bấm
  // của con người mỗi lần, nên một cái cờ nhớ trong localStorage chỉ tạo ra màn hình nói "ĐÃ ĐẤU" trong
  // khi thật ra không có luồng nào — đúng kiểu dối trá tệ nhất ở đây, vì nó dối về BẰNG CHỨNG MẠNH NHẤT.
  const systemStreamRef = useRef<MediaStream | null>(null)
  const [systemSourceOn, setSystemSourceOn] = useState(false)
  const [systemSourceNote, setSystemSourceNote] = useState('')
  const [wallOutputs, setWallOutputsState] = useState<WallOutput[]>(() => loadWallOutputs())
  const [wallSupport, setWallSupport] = useState<ScreenSupport>('idle')
  const [wallScreens, setWallScreens] = useState<WallScreen[]>([])
```

**(c)** Bật đường thứ hai: xin chia sẻ màn hình kèm âm thanh, và TỪ CHỐI nếu luồng không có tiếng. Find and replace:

```ts
  const setWallCharCm = useCallback((n: number) => { const c = clampCharCm(n); setWallCharCmState(c); try { localStorage.setItem('proyaku_online_wall_char_cm', String(c)) } catch { /* private mode */ } }, [])
  const setWallOutputs = useCallback((o: WallOutput[]) => { setWallOutputsState(o); saveWallOutputs(o) }, [])

  const scanWall = useCallback(async () => {
    const { support, screens } = await detectWallScreens()
    setWallSupport(support)
```

with

```ts
  const setWallCharCm = useCallback((n: number) => { const c = clampCharCm(n); setWallCharCmState(c); try { localStorage.setItem('proyaku_online_wall_char_cm', String(c)) } catch { /* private mode */ } }, [])
  const setWallOutputs = useCallback((o: WallOutput[]) => { setWallOutputsState(o); saveWallOutputs(o) }, [])

  // ── Đường tiếng thứ hai: đấu vào / gỡ ra ──────────────────────────────────────────────────────────
  const detachSystemSource = useCallback(() => {
    systemStreamRef.current?.getTracks().forEach((t) => t.stop())
    systemStreamRef.current = null
    setSystemSourceOn(false)
  }, [])

  const attachSystemSource = useCallback(async () => {
    setSystemSourceNote('')
    try {
      // Phải xin KÈM HÌNH. Trình duyệt không cho xin riêng tiếng của máy: `{ audio: true, video: false }`
      // bị từ chối thẳng. Nên ta xin cả hai rồi chỉ dùng đường tiếng — và CỐ Ý KHÔNG tắt đường hình, vì
      // tắt nó là cách nhanh nhất để trình duyệt coi như buổi chia sẻ đã kết thúc và giết luôn cả tiếng.
      // Đổi lại, thanh "Bạn đang chia sẻ màn hình" của trình duyệt vẫn nằm đó suốt buổi — cái đó tốt:
      // người vận hành nhìn thấy đường thứ hai còn sống, và có sẵn một nút tắt không cần vào phần mềm.
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      const audio = stream.getAudioTracks()
      if (!audio.length) {
        // Cửa sổ chọn màn hình VẪN trả về một luồng hợp lệ khi người ta quên tích ô chia sẻ tiếng. Luồng
        // đó chỉ có hình. Nhận bừa nó là để cả buổi chạy với một bằng chứng rỗng mà màn hình vẫn báo xanh.
        stream.getTracks().forEach((t) => t.stop())
        setSystemSourceNote('Luồng vừa chọn KHÔNG có tiếng. Chọn lại, và nhớ tích ô “Cũng chia sẻ âm thanh hệ thống” (chia sẻ một thẻ trình duyệt thì ô đó tên là “Chia sẻ âm thanh của thẻ”).')
        return
      }
      detachSystemSource() // một đường thôi — đấu cái mới thì cái cũ phải tắt hẳn, không để hai luồng chồng
      systemStreamRef.current = stream
      setSystemSourceOn(true)
      // Người vận hành bấm "Dừng chia sẻ" của chính trình duyệt thì phần mềm phải biết. Không nghe tin
      // này thì màn hình còn báo "ĐÃ ĐẤU" trong khi đường tiếng đã chết, và mọi câu lặng lẽ bị gán cho mic.
      audio[0].addEventListener('ended', () => {
        if (systemStreamRef.current !== stream) return
        detachSystemSource()
        setSystemSourceNote('Đường tiếng thứ hai đã ngắt (bấm “Dừng chia sẻ” trên thanh của trình duyệt).')
      })
    } catch (err) {
      // Bấm Huỷ ở cửa sổ chọn màn hình cũng rơi vào đây, và đó không phải lỗi — nên câu chữ phải trung tính.
      setSystemSourceNote(`Chưa đấu được đường tiếng thứ hai: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [detachSystemSource])

  const scanWall = useCallback(async () => {
    const { support, screens } = await detectWallScreens()
    setWallSupport(support)
```

**(d)** Tắt đường thứ hai. Find and replace:

```ts
        getListenPaused: () => listenPausedRef.current,
        getBrief: () => segmentBriefRef.current,
        getTwoWay: () => twoWayRef.current,
        // TASK 5: LIVE, not latched. The lane calls this on every event, so a rule typed in the middle of
        // a ceremony takes effect on the very next sentence.
        getMishearing: () => mishearingRef.current,
```

with

```ts
        getListenPaused: () => listenPausedRef.current,
        getBrief: () => segmentBriefRef.current,
        getTwoWay: () => twoWayRef.current,
        // Đường tiếng thứ hai. Đọc MỘT LẦN lúc mở micro (đồ thị âm thanh không dựng lại được), nên đấu
        // hay gỡ giữa buổi đều chỉ ăn từ lần Bắt đầu sau — màn điều khiển nói thẳng điều đó ra.
        getSystemStream: () => systemStreamRef.current,
        // Tiếng nào ở đầu bên kia. Chiều đã chọn nói phòng này nói tiếng gì, nên đầu cầu là tiếng còn
        // lại: chọn "VI → JA" tức là phòng nói tiếng Việt và bên kia nói tiếng Nhật. Viết ra ở đây chứ
        // không để lane tự suy, để chỗ nào quyết thì đọc thấy ngay ở chỗ đó.
        getSystemLanguage: () => (directionRef.current === 'vi2ja' ? 'ja' : 'vi'),
        // TASK 5: LIVE, not latched. The lane calls this on every event, so a rule typed in the middle of
        // a ceremony takes effect on the very next sentence.
        getMishearing: () => mishearingRef.current,
```

**(e)** Chuyển hai thứ xuống lane: luồng tiếng máy tính, và tiếng nào chảy trong đó. Find and replace:

```ts
    return () => {
      mountedRef.current = false
      void laneRef.current?.stop()
      moduleActiveSession = false
    }
  }, [])
```

with

```ts
    return () => {
      mountedRef.current = false
      void laneRef.current?.stop()
      // Luồng chia sẻ màn hình KHÔNG do lane sở hữu (lane chỉ mượn để đọc), nên `stop()` của lane không
      // đụng tới nó. Không tắt ở đây là để lại một thanh "đang chia sẻ màn hình" chạy mãi sau khi người
      // ta đã chuyển sang đường OFFLINE.
      systemStreamRef.current?.getTracks().forEach((t) => t.stop())
      systemStreamRef.current = null
      moduleActiveSession = false
    }
  }, [])
```

**(f)** Rời màn thì dừng luồng màn hình. Find and replace:

```ts
    eventId, setEventId,
    voices, voicesStatus, refreshVoices, voiceJa, setVoiceJa, voiceVi, setVoiceVi,
    speedMode, setSpeedMode, manualSpeed, setManualSpeed,
    twoWay, setTwoWay, directedLines, subtitleFont, setSubtitleFont, wallCharCm, setWallCharCm,
    wallOutputs, setWallOutputs, wallSupport, wallScreens, wallOpenIds, scanWall, openWall, closeWall,
    start, stop, saveSession,
  }
```

with

```ts
    eventId, setEventId,
    voices, voicesStatus, refreshVoices, voiceJa, setVoiceJa, voiceVi, setVoiceVi,
    speedMode, setSpeedMode, manualSpeed, setManualSpeed,
    twoWay, setTwoWay, systemSourceOn, systemSourceNote, attachSystemSource, detachSystemSource,
    directedLines, subtitleFont, setSubtitleFont, wallCharCm, setWallCharCm,
    wallOutputs, setWallOutputs, wallSupport, wallScreens, wallOpenIds, scanWall, openWall, closeWall,
    start, stop, saveSession,
  }
```


## TASK 114 — Màn điều khiển (`src/lib/lanes/online/components/OnlineConsole.tsx`)

**Tệp: `src/lib/lanes/online/components/OnlineConsole.tsx`** — 4 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Bảng tra tên tiếng Việt cho từng cách quyết chiều. Find and replace:

```tsx
  error: { label: 'FAULT · LỖI', text: 'text-error', dot: 'bg-error', anim: '' },
}

// A control row for the LEFT rail — this lane's OWN copy (the OFFLINE RailBtn lives in the offline page
// and must not be shared across lanes). icon + label (+ optional status dot).
const RailBtn: React.FC<{
```

with

```tsx
  error: { label: 'FAULT · LỖI', text: 'text-error', dot: 'bg-error', anim: '' },
}

// Tên tiếng Việt của từng loại bằng chứng mà bộ định tuyến chiều dịch dùng (`RouterBasis`). Người ngồi
// bàn điều khiển không đọc `pause-reset`; họ đọc "nhịp nghỉ".
const BASIS_VN: Record<string, string> = {
  source: 'nguồn tiếng', kana: 'chữ kana', script: 'dấu thanh', vendor: 'nhãn máy nghe',
  'vendor-near': 'nhãn kề bên', projected: 'chiếu tiếng lạ', 'pause-reset': 'nhịp nghỉ',
  sticky: 'quán tính', locked: 'khoá chương trình',
}
/** Xếp theo số lớn trước và bỏ hẳn ô bằng 0 — một dòng chẩn đoán dài mười mục thì không ai đọc. */
const basisReadout = (b: Record<string, number>): string =>
  Object.entries(b)
    .filter(([, n]) => n > 0)
    .sort((a, c) => c[1] - a[1])
    .map(([k, n]) => `${BASIS_VN[k] ?? k} ${n}`)
    .join(' · ')

// A control row for the LEFT rail — this lane's OWN copy (the OFFLINE RailBtn lives in the offline page
// and must not be shared across lanes). icon + label (+ optional status dot).
const RailBtn: React.FC<{
```

**(b)** Nút "Đường tiếng thứ hai" trên thanh bên — chỉ hiện khi đang chạy hai chiều. Find and replace:

```tsx
            <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">MÀN KHÁN GIẢ</div>
            <RailBtn icon={lane.twoWay ? 'sync_alt' : 'east'} label="Một mic hai chiều" title="Một micro cho cả VI và JA — máy tự nhận mỗi câu"
              tone={lane.twoWay ? 'active' : 'default'} disabled={lane.running} onClick={() => lane.setTwoWay(!lane.twoWay)} />
            <RailBtn icon="cast" label="Xuất màn khán giả" title="Định tuyến phụ đề ra các màn khán giả"
              tone={panel === 'wall' ? 'active' : 'default'} dot={lane.wallOpenIds.length > 0 ? 'bg-secondary' : undefined}
              onClick={() => setPanel((p) => (p === 'wall' ? null : 'wall'))} />
```

with

```tsx
            <div className="px-2 pb-1 font-label-caps text-[10px] text-on-surface-variant/55 tracking-[0.16em]">MÀN KHÁN GIẢ</div>
            <RailBtn icon={lane.twoWay ? 'sync_alt' : 'east'} label="Một mic hai chiều" title="Một micro cho cả VI và JA — máy tự nhận mỗi câu"
              tone={lane.twoWay ? 'active' : 'default'} disabled={lane.running} onClick={() => lane.setTwoWay(!lane.twoWay)} />
            {/* Đường tiếng thứ hai — chỉ có nghĩa khi đang HAI CHIỀU, nên chỉ hiện ở đó. Ở phiên một
                chiều thì chiều dịch đã chốt từ lúc Bắt đầu và nút này là nút giả. */}
            {lane.twoWay && (
              <RailBtn icon={lane.systemSourceOn ? 'cable' : 'settings_input_hdmi'} label="Đường tiếng thứ hai"
                title="Nhận thêm tiếng đang phát ra từ chính máy này (Teams/Zoom). Câu vào bằng đường đó là câu của đầu cầu bên kia — chiều dịch lấy theo đường tiếng chứ không đoán theo mặt chữ."
                tone={lane.systemSourceOn ? 'active' : 'default'} disabled={lane.running}
                dot={lane.systemSourceOn ? 'bg-secondary' : undefined}
                onClick={() => { if (lane.systemSourceOn) lane.detachSystemSource(); else void lane.attachSystemSource() }} />
            )}
            <RailBtn icon="cast" label="Xuất màn khán giả" title="Định tuyến phụ đề ra các màn khán giả"
              tone={panel === 'wall' ? 'active' : 'default'} dot={lane.wallOpenIds.length > 0 ? 'bg-secondary' : undefined}
              onClick={() => setPanel((p) => (p === 'wall' ? null : 'wall'))} />
```

**(c)** Ngăn kéo "Chiều theo nguồn tiếng": bật, tắt, và lời nhắn. Find and replace:

```tsx
                  <input type="checkbox" checked={lane.twoWay} onChange={(e) => lane.setTwoWay(e.target.checked)} disabled={lane.running} className="accent-secondary mt-0.5" />
                  <span>Một mic hai chiều<br /><span className="font-normal normal-case text-[11px] leading-relaxed">Máy tự nhận ra câu vừa nói là tiếng Việt hay tiếng Nhật rồi dịch sang tiếng còn lại. Chiều đã chọn ở trên chỉ dùng cho câu đầu tiên.</span></span>
                </label>
              </section>

              <div className="h-px bg-outline-variant"></div>
```

with

```tsx
                  <input type="checkbox" checked={lane.twoWay} onChange={(e) => lane.setTwoWay(e.target.checked)} disabled={lane.running} className="accent-secondary mt-0.5" />
                  <span>Một mic hai chiều<br /><span className="font-normal normal-case text-[11px] leading-relaxed">Máy tự nhận ra câu vừa nói là tiếng Việt hay tiếng Nhật rồi dịch sang tiếng còn lại. Chiều đã chọn ở trên chỉ dùng cho câu đầu tiên.</span></span>
                </label>
                {/* CHIỀU THEO NGUỒN TIẾNG. Cách trên là ĐOÁN — máy đọc lại chính cái chữ nó vừa viết ra và
                    suy ngược lại thứ tiếng. Cách này thì không đoán gì cả: nó hỏi câu vừa rồi vào máy bằng
                    SỢI DÂY nào. Chỉ dùng được ở cảnh có đầu cầu từ xa (họp Teams/Zoom chiếu lên phòng);
                    một hội trường chỉ có micro thì cả hai bên đi chung một dây và không có gì để phân biệt. */}
                {lane.twoWay && (
                  <div className="rounded-DEFAULT border border-outline-variant bg-surface p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-label-caps text-label-caps text-on-surface">Chiều theo nguồn tiếng</span>
                      <span className={`text-[11px] font-semibold ${lane.systemSourceOn ? 'text-secondary' : 'text-on-surface-variant'}`}>
                        {lane.systemSourceOn ? 'ĐÃ ĐẤU' : 'chưa đấu'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-on-surface-variant font-normal normal-case">
                      Nhận thêm tiếng đang phát ra từ chính máy này (Teams/Zoom). Câu nào có tiếng ở đường đó là câu của
                      đầu cầu bên kia; câu chỉ có ở micro là câu của người trong phòng. Chiều dịch lấy theo đường tiếng,
                      không phải đoán theo mặt chữ. Lúc trình duyệt hỏi chọn cửa sổ, <b>phải tích ô chia sẻ âm thanh</b> —
                      không tích thì luồng chỉ có hình và không câu nào được gán.
                    </p>
                    <button type="button" disabled={lane.running}
                      onClick={() => { if (lane.systemSourceOn) lane.detachSystemSource(); else void lane.attachSystemSource() }}
                      className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${lane.systemSourceOn ? 'bg-error text-on-error' : 'bg-secondary text-on-secondary'} ${lane.running ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}>
                      {lane.systemSourceOn ? 'Gỡ đường tiếng thứ hai' : 'Đấu đường tiếng thứ hai'}
                    </button>
                    {lane.systemSourceNote && <p className="text-[11px] text-error/90 font-normal normal-case">{lane.systemSourceNote}</p>}
                    {/* Đồ thị âm thanh dựng một lần lúc mở micro và không sửa lại được sau đó. Nói ra, chứ
                        không để người vận hành bấm giữa buổi rồi tưởng nó đã ăn. */}
                    {lane.running && <p className="text-[11px] text-on-surface-variant/80 font-normal normal-case">Phiên đang chạy — đấu hoặc gỡ đường này chỉ có tác dụng từ lần Bắt đầu sau.</p>}
                  </div>
                )}
              </section>

              <div className="h-px bg-outline-variant"></div>
```

**(d)** Bốn dòng số mới trên bảng chẩn đoán. Find and replace:

```tsx
                    {/* M11 — turn handling. `cắt` near zero during a busy hall means the client-side
                        commit is not firing and the long stalls are back; `bỏ lạ` and `đổi tiếng` are
                        the two-way guards, and both being zero in a bilingual session is also a signal. */}
                    <div>cắt {diag.manualCommits} · nhả sớm {diag.promotions} câu · bỏ tiếng lạ {diag.foreignDrops} · đổi tiếng {diag.languageTurns}</div>
                    {/* Trần 25s KHÔNG còn cắt mù: nó chờ một khe im lặng (~0,22s) rồi mới cắt, vì cắt là
                        cắt TIẾNG, và cắt giữa một từ thì không bản dịch nào chữa lại được. Số ở đây lớn
                        nghĩa là hội trường gần như không bao giờ im — lúc đó số ms mới là thứ đáng nhìn. */}
```

with

```tsx
                    {/* M11 — turn handling. `cắt` near zero during a busy hall means the client-side
                        commit is not firing and the long stalls are back; `bỏ lạ` and `đổi tiếng` are
                        the two-way guards, and both being zero in a bilingual session is also a signal. */}
                    <div>cắt {diag.manualCommits} · nhả sớm {diag.promotions} câu · cứu tiếng lạ {diag.languageProjections} · đổi tiếng {diag.languageTurns}</div>
                    {/* Máy nghe đọc lại đoạn đã nhả. Chốt lượt KHÔNG xoá ngữ cảnh của nó, nên lượt sau có
                        thể mở ra bằng chính những chữ vừa đóng lại rồi mới nói tiếp — bản ghi 06/08 có
                        7/60 dòng như thế. `bỏ` = không còn gì mới; `cắt đầu` = trừ phần trùng, nhả phần
                        đuôi. Cả hai bằng 0 là máy nghe không đọc lại, không phải chốt chặn hỏng. */}
                    {(diag.echoDrops > 0 || diag.echoTrims > 0) && (
                      <div>máy nghe đọc lại: bỏ {diag.echoDrops} · cắt đầu {diag.echoTrims}</div>
                    )}
                    {/* Nhãn tiếng chỉ cưỡi trên bản chốt CÓ MỐC THỜI GIAN, nên câu nhả sớm không bao giờ
                        có nhãn riêng và phải mượn nhãn của câu kề bên. `mượn` cao cùng lúc `nhả sớm` cao
                        là bình thường; `mượn` cao mà `nhãn` bằng 0 nghĩa là không có gì để mượn. */}
                    {diag.carriedTags > 0 && <div>mượn nhãn kề bên {diag.carriedTags} câu</div>}
                    {/* Trần 25s tới hạn mà KHÔNG chốt được gì — đường cấp cứu không vào được. Số này leo
                        trong khi hội trường đang có tiếng là dấu hiệu duy nhất nhìn thấy TRƯỚC khi phiên
                        phải nối lại và mất nguyên đoạn đã nói. Đỏ vì nó không được phép khác 0. */}
                    {diag.ceilingNoops > 0 && (
                      <div className="text-error">trần 25s không chốt được {diag.ceilingNoops} lần — sắp phải nối lại</div>
                    )}
                    {diag.lastRouterReason ? <div>chiều dịch: {diag.lastRouterReason}</div> : null}
                    {/* CÁI GÌ đã quyết chiều, đếm theo từng loại. Đây là con số duy nhất trả lời được câu
                        hỏi "bớt quán tính đi thì tốt hơn hay tệ hơn" bằng số thay vì bằng cảm giác:
                        `quán tính` cao nghĩa là router đang đi bằng trớn, tức là đang đoán; `nguồn tiếng`
                        hoặc `nhãn máy nghe` cao nghĩa là mỗi câu đang tự làm chứng cho chính nó. */}
                    {basisReadout(diag.routerBasis) && <div>chiều dịch nhờ: {basisReadout(diag.routerBasis)}</div>}
                    {/* Đường tiếng thứ hai. `KHÔNG có tiếng` = luồng chia sẻ màn hình chỉ có hình (quên
                        tích ô chia sẻ âm thanh) — lúc đó mọi câu đều rơi về cách đoán cũ mà không có gì
                        báo, nên phải đỏ lên ở đây. `chưa gán được` = có đấu dây nhưng cửa sổ thời gian của
                        câu đó không đủ tiếng ở đường nào, cũng rơi về cách cũ, và đó là chuyện bình thường. */}
                    {lane.systemSourceOn && (
                      diag.systemSourceLive
                        ? <div>nguồn tiếng: {diag.sourceVerdicts} câu gán được{diag.lastSourceReason ? ` · ${diag.lastSourceReason}` : ''}</div>
                        : <div className="text-error">đường tiếng thứ hai KHÔNG có tiếng — gỡ ra, đấu lại và tích ô chia sẻ âm thanh</div>
                    )}
                    {diag.voiceDirectionHolds > 0 ? <div>giữ giọng đọc {diag.voiceDirectionHolds} câu — sai chiều, tường vẫn hiện</div> : null}
                    {/* Trần 25s KHÔNG còn cắt mù: nó chờ một khe im lặng (~0,22s) rồi mới cắt, vì cắt là
                        cắt TIẾNG, và cắt giữa một từ thì không bản dịch nào chữa lại được. Số ở đây lớn
                        nghĩa là hội trường gần như không bao giờ im — lúc đó số ms mới là thứ đáng nhìn. */}
```


## TASK 115 — Bảy tệp test mới

Tạo bảy tệp dưới đây. Dữ liệu trong đó lấy **nguyên văn** từ bản ghi buổi thật — mỗi khẳng định là một câu
đã thật sự lên tường, không phải ví dụ nghĩ ra.

**`tests/sourceAttribution.test.ts`**

```ts
// tests/sourceAttribution.test.ts — CÂU VỪA RỒI VÀO MÁY BẰNG CỔNG NÀO.
//
// Lớp này không đoán ngôn ngữ. Nó trả lời một câu hỏi vật lý: trong khoảng thời gian của câu vừa chốt,
// đường nào có tiếng — micro trong phòng, hay tiếng đang phát ra từ chính máy này (Teams/Zoom).
//
// Vì sao đáng có một bộ test riêng: đây là bằng chứng MẠNH NHẤT trong cả đường ống (router đặt nó trên
// mọi thứ, chỉ dưới khoá chương trình), nên một lỗi ở đây không hiện ra thành "máy đoán sai một câu" mà
// thành "cả buổi dịch ngược, rất tự tin". Ba thứ phải đúng:
//
//   1. LUẬT BẤT ĐỐI XỨNG. Trong phòng có tiếng vọng: đầu cầu bên kia phát ra loa rồi quay lại chính mic.
//      Nên "bên nào to hơn" là luật SAI. Đúng là: đường tiếng máy có tiếng ⇒ phía bên kia đang nói, hết,
//      vì không thứ gì trong phòng làm cho máy tính tự phát ra tiếng.
//   2. CỬA SỔ. Cửa sổ thật là từ câu chốt trước tới câu này, chặn trên 12s. Không chặn thì câu đầu phiên
//      (và câu sau một quãng im dài) sẽ tính cả tiếng của mười phút trước.
//   3. IM LẶNG THÌ NÓI KHÔNG BIẾT. Không đường nào đủ tiếng ⇒ `null`, để phía gọi rơi về cách đoán cũ.
//      Bịa một câu trả lời ở đây là bịa ra bằng chứng mạnh nhất bảng.

import { describe, it, expect } from 'vitest';
import {
    createSourceAttributor,
    SOURCE_MIN_VOICED_MS,
    SOURCE_WINDOW_MAX_MS,
} from '../src/lib/lanes/online/sourceAttribution';

/** Một gói tiếng ~256ms. `mic`/`sys` = số mili-giây CÓ TIẾNG đo được trong gói đó, từng đường. */
const PACKET_MS = 256;

/** Rải `n` gói liên tiếp từ mốc `at`, mỗi gói mang cùng một cặp số. Trả về mốc của gói cuối. */
function feed(
    a: ReturnType<typeof createSourceAttributor>,
    at: number,
    n: number,
    mic: number,
    sys: number,
): number {
    let t = at;
    for (let i = 0; i < n; i += 1) {
        t += PACKET_MS;
        a.observe(t, mic, sys);
    }
    return t;
}

describe('luật bất đối xứng — tiếng máy có tiếng là bằng chứng phòng KHÔNG tạo ra được', () => {
    it('1 · chỉ micro có tiếng ⇒ người trong phòng nói', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 8, PACKET_MS, 0);
        const v = a.verdictFor(1_000, end);
        expect(v?.source).toBe('mic');
        expect(v?.overlapped).toBe(false);
    });

    it('2 · chỉ đường tiếng máy có tiếng ⇒ đầu cầu bên kia nói', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 8, 0, PACKET_MS);
        expect(a.verdictFor(1_000, end)?.source).toBe('system');
    });

    it('3 · CẢ HAI cùng có tiếng ⇒ vẫn là tiếng máy, và đây là chỗ mọi luật "bên nào to hơn" chết', () => {
        // Cảnh thật: đầu cầu Nhật nói → loa Jabra phát ra → chính mic Jabra thu lại. Mic nghe được NHIỀU
        // hơn hẳn đường tiếng máy (nó thu cả tiếng vọng lẫn tiếng giấy tờ, ho, ghế kéo trong phòng), nên
        // luật tỉ lệ sẽ gán câu này cho phòng và dịch ngược nguyên lượt của khách.
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 10, PACKET_MS, 100);
        const v = a.verdictFor(1_000, end);
        expect(v?.source).toBe('system');
        expect(v?.overlapped).toBe(true);
        expect(v!.micVoicedMs).toBeGreaterThan(v!.sysVoicedMs); // mic to hơn thật, và vẫn không thắng
        expect(a.stats().overlapped).toBe(1);
    });

    it('4 · một chút tiếng lọt vào đường máy KHÔNG đủ để cướp câu — có sàn', () => {
        // Tiếng "ting" của Teams, một nhịp nhạc chờ, nửa giây ai đó bật video: chưa phải người nói.
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 10, PACKET_MS, 20); // 200ms tiếng máy, dưới sàn 300ms
        expect(a.verdictFor(1_000, end)?.source).toBe('mic');
        expect(SOURCE_MIN_VOICED_MS).toBeGreaterThanOrEqual(200);
    });
});

describe('im lặng thì nói không biết — không được bịa bằng chứng mạnh nhất bảng', () => {
    it('5 · không đường nào đủ tiếng ⇒ null, và đếm riêng ra', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 4, 10, 10);
        expect(a.verdictFor(1_000, end)).toBeNull();
        expect(a.stats().unattributed).toBe(1);
        expect(a.stats().mic + a.stats().system).toBe(0);
    });

    it('6 · chưa có gói nào (câu đầu phiên tới trước gói tiếng đầu tiên) ⇒ null, không nổ', () => {
        const a = createSourceAttributor();
        expect(a.verdictFor(0, 5_000)).toBeNull();
    });
});

describe('cửa sổ — tiếng của mười phút trước không nói gì về câu vừa rồi', () => {
    it('7 · chỉ tính từ câu chốt TRƯỚC trở đi, không tính cả buổi', () => {
        const a = createSourceAttributor();
        // Lượt 1: đầu cầu bên kia nói dài.
        const firstEnd = feed(a, 1_000, 12, 0, PACKET_MS);
        expect(a.verdictFor(1_000, firstEnd)?.source).toBe('system');
        // Lượt 2, ngay sau đó: người trong phòng đáp lại. Nếu cửa sổ không bắt đầu từ mốc chốt trước thì
        // tiếng của lượt 1 vẫn nằm trong tổng, và luật bất đối xứng sẽ gán lượt 2 cho đầu cầu bên kia.
        const secondEnd = feed(a, firstEnd, 8, PACKET_MS, 0);
        expect(a.verdictFor(firstEnd, secondEnd)?.source).toBe('mic');
    });

    it('8 · chặn trên 12s: câu sau một quãng im dài không được kéo theo tiếng của trước đó', () => {
        const a = createSourceAttributor();
        // Đầu cầu bên kia nói, rồi im rất lâu, rồi người trong phòng nói một câu ngắn.
        const talk = feed(a, 1_000, 12, 0, PACKET_MS);
        const late = talk + SOURCE_WINDOW_MAX_MS + 5_000;
        const end = feed(a, late, 8, PACKET_MS, 0);
        // `startAt` là mốc chốt trước (rất xa), nên chỉ có chặn trên mới cứu được câu này.
        expect(a.verdictFor(talk, end)?.source).toBe('mic');
        expect(SOURCE_WINDOW_MAX_MS).toBeLessThanOrEqual(20_000);
    });

    it('9 · gói tới SAU mốc chốt không được tính vào câu đã chốt', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 8, PACKET_MS, 0);
        feed(a, end, 12, 0, PACKET_MS); // người kia bắt đầu nói, sau khi câu này đã chốt
        expect(a.verdictFor(1_000, end)?.source).toBe('mic');
    });

    it('10 · gói cũ bị cắt bớt nhưng KHÔNG được cắt vào phần đang cần', () => {
        // Bộ nhớ phải có trần, nếu không một buổi bốn tiếng là một mảng vài trăm nghìn phần tử. Nhưng cắt
        // quá tay thì `verdictFor` mất chính đoạn tiếng của câu vừa rồi và trả `null` — tức là bằng chứng
        // mạnh nhất bảng lặng lẽ biến mất giữa buổi, không có gì đỏ lên.
        const a = createSourceAttributor();
        let t = 0;
        for (let i = 0; i < 4_000; i += 1) { t += PACKET_MS; a.observe(t, 0, PACKET_MS); }
        const start = t - 3_000;
        expect(a.verdictFor(start, t)?.source).toBe('system');
    });
});

describe('sổ sách — để đọc log sau buổi, không để đoán lúc chạy', () => {
    it('11 · đếm đủ bốn loại kết cục', () => {
        const a = createSourceAttributor();
        const one = feed(a, 1_000, 8, PACKET_MS, 0);
        a.verdictFor(1_000, one);
        const two = feed(a, one, 8, 0, PACKET_MS);
        a.verdictFor(one, two);
        const three = feed(a, two, 8, PACKET_MS, PACKET_MS);
        a.verdictFor(two, three);
        const four = feed(a, three, 4, 5, 5);
        a.verdictFor(three, four);
        expect(a.stats()).toEqual({ mic: 1, system: 2, unattributed: 1, overlapped: 1 });
    });

    it('12 · phiên mới dọn sạch cả tiếng lẫn sổ — không để buổi trước quyết chiều của buổi này', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 12, 0, PACKET_MS);
        a.verdictFor(1_000, end);
        a.reset();
        expect(a.stats()).toEqual({ mic: 0, system: 0, unattributed: 0, overlapped: 0 });
        expect(a.verdictFor(1_000, end)).toBeNull();
    });

    it('13 · số mili-giây báo ra là số ĐO ĐƯỢC, không phải nhãn tròn trịa', () => {
        const a = createSourceAttributor();
        const end = feed(a, 1_000, 5, 100, 400);
        const v = a.verdictFor(1_000, end);
        expect(v?.micVoicedMs).toBe(500);
        expect(v?.sysVoicedMs).toBe(2_000);
    });
});
```

**`tests/directionRouter.test.ts`**

```ts
// tests/directionRouter.test.ts — lớp quyết định CHIỀU DỊCH, tách hẳn ra khỏi lane.
//
// Vì sao phải có một lớp riêng. Tới 06/08/2026 chiều dịch được quyết bởi `decideFinalLanguage`, và thứ tự
// bằng chứng ở đó là "kana thắng tất cả, ngay lập tức, không quán tính". Cái đó biến việc đổi chiều thành
// một CÁI BÁNH CÓC MỘT CHIỀU:
//
//   · vào tiếng Nhật: một ký tự kana lẻ trong cả câu là đủ — chốt ngay;
//   · ra khỏi tiếng Nhật: phải có dấu thanh tiếng Việt, hoặc phải có nhãn tiếng của nhà cung cấp. Mà lúc
//     máy nghe đang ở ngữ cảnh Nhật, tiếng Việt nói vào thường ra kana/kanji — tức là nó TỰ XÁC NHẬN LẠI
//     tiếng Nhật, vòng này qua vòng khác.
//
// Và cửa cuối cùng làm chuyện tệ hơn hẳn: nhãn nói "ngôn ngữ thứ ba" mà chữ không có dấu thanh thì câu bị
// VỨT ĐI (`foreign` ⇒ `dropGhost`). Câu tiếng Việt bị nghe thành tiếng Trung không hiện lên gì cả — đó
// không phải "chưa nhận ra tiếng", đó là đã xoá. Nhìn từ hội trường thì thành "máy đứng im một khúc".
//
// Ba luật của tệp này, đúng cách một đội phiên dịch thật làm việc:
//   1. CHIẾU chứ không vứt: ngôn ngữ thứ ba ⇒ gán cho tiếng KHÔNG-PHẢI-NỀN, không bao giờ mất câu.
//   2. QUÁN TÍNH: đổi chiều cần bằng chứng mạnh, hoặc hai lượt yếu liên tiếp.
//   3. NHỊP NGHỈ LÀ ĐỔI PHIÊN: nghỉ ≥ ngưỡng ⇒ quên chiều đang chạy, xử lại từ chiều nền. Đây mới là thứ
//      bẻ gãy bánh cóc — thoát khỏi tiếng Nhật không còn phải thắng kana nữa, chỉ cần một nhịp thở.

import { describe, it, expect } from 'vitest';
import {
    createDirectionRouter,
    DIRECTION_ROUTER_DEFAULTS,
    type RouterEvidence,
} from '../src/lib/lanes/online/directionRouter';

const VI_LINE = 'Kính thưa quý vị đại biểu và toàn thể quý khách.';
const JA_LINE = 'ご来賓の皆様、誠にありがとうございました。';
/** Tiếng Việt máy nghe chép KHÔNG DẤU — trông không giống ngôn ngữ nào cả. */
const VI_TONELESS = 'Kinh thua quy vi dai bieu va toan the quy khach.';
/** Tiếng Việt bị chép nhầm thành tiếng Trung — kanji, không kana. Ca có thật trong log buổi lễ. */
const VI_AS_CHINESE = '我是海空啊';

const say = (over: Partial<RouterEvidence>): RouterEvidence => ({ text: '', gapMs: 0, ...over });

describe('chiếu ngôn ngữ thứ ba, không vứt câu', () => {
    it('1 · nhà cung cấp gọi tên tiếng thứ ba ⇒ gán tiếng KHÔNG-PHẢI-NỀN, câu không mất', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' }));
        expect(v.language).toBe('ja');
        expect(v.projected).toBe(true);
        expect(v.dropped).toBe(false);
    });

    it('2 · nền là JA thì chiếu ngược lại — luật là "không phải nền", không phải "luôn luôn ja"', () => {
        const r = createDirectionRouter('ja');
        expect(r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'ru' })).language).toBe('vi');
    });

    it('3 · nhưng dấu thanh tiếng Việt vẫn thắng nhãn lạ — đó là bằng chứng không tiếng nào khác có', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_LINE, vendorRaw: 'zh' }));
        expect(v.language).toBe('vi');
        expect(v.projected).toBe(false);
    });

    it('4 · mã "không rõ" (und/auto/mul) KHÔNG phải tiếng thứ ba — không được kích hoạt phép chiếu', () => {
        const r = createDirectionRouter('vi');
        for (const code of ['und', 'auto', 'mul', 'zxx']) {
            const v = createDirectionRouter('vi').next(say({ text: VI_TONELESS, vendorRaw: code }));
            expect(v.projected, code).toBe(false);
            expect(v.language, code).toBe('vi');
        }
        expect(r.current()).toBe('vi');
    });

    it('5 · KHÔNG BAO GIỜ trả về "bỏ câu" — cả module không có đường nào làm mất một câu', () => {
        const r = createDirectionRouter('vi');
        for (const text of [VI_AS_CHINESE, '', '...', 'OK', '177。']) {
            expect(r.next(say({ text, vendorRaw: 'it' })).dropped, text).toBe(false);
        }
    });
});

describe('quán tính — một ký tự kana lẻ không được bẻ cả lượt nói', () => {
    it('6 · MỘT kana trong câu tiếng Việt KHÔNG đổi chiều (bánh cóc cũ đổi ngay ở đây)', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: 'Chúng tôi xin giới thiệu ông Tanaka さん.' }));
        expect(v.language).toBe('vi');
        expect(v.switched).toBe(false);
    });

    it('7 · một câu kana ĐẶC thì đổi ngay, không cần chờ lượt thứ hai', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: JA_LINE }));
        expect(v.language).toBe('ja');
        expect(v.switched).toBe(true);
        expect(v.basis).toBe('kana');
    });

    it('8 · nhãn nhà cung cấp gọi đúng một trong hai tiếng cũng là bằng chứng MẠNH', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_TONELESS, vendorRaw: 'ja-JP' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('vendor');
    });

    it('9 · hai lượt YẾU liên tiếp cùng chỉ một hướng thì cũng đủ đổi', () => {
        const r = createDirectionRouter('vi');
        const weak = say({ text: 'Tanaka さん' });
        expect(r.next(weak).language).toBe('vi');
        expect(r.next(weak).language).toBe('ja');
    });

    it('10 · một lượt yếu rồi một lượt rõ ràng tiếng nền thì bộ đếm phải xoá, không được cộng dồn', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: 'Tanaka さん' }));
        r.next(say({ text: VI_LINE }));
        expect(r.next(say({ text: 'Tanaka さん' })).language).toBe('vi');
    });
});

describe('nhịp nghỉ là đổi phiên — chỗ bẻ gãy bánh cóc', () => {
    it('11 · đang ở JA, nghỉ một nhịp dài rồi nói tiếng Việt KHÔNG DẤU ⇒ về đúng VI', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        expect(r.current()).toBe('ja');
        const v = r.next(say({ text: VI_TONELESS, gapMs: 2_000 }));
        expect(v.language).toBe('vi');
        // 06/08: nay chính câu đó tự làm chứng — chuỗi Latin dài mà không kana không kanji thì không phải
        // tiếng Nhật. Nhịp nghỉ vẫn xảy ra và vẫn được đếm, nó chỉ không còn là lý do DUY NHẤT nữa. Đó là
        // điều tốt hơn hẳn: câu này về đúng chiều kể cả khi không có nhịp nghỉ nào để dựa vào.
        expect(v.basis).toBe('script');
        expect(r.stats().pauseResets).toBe(1);
    });

    it('12 · KHÔNG nghỉ thì câu không dấu vẫn dính theo chiều đang chạy — đó là điều đúng giữa một lượt', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: VI_TONELESS, gapMs: 300 })).language).toBe('ja');
    });

    it('13 · nghỉ dài nhưng người đó nói tiếp tiếng Nhật ⇒ vẫn là JA, nghỉ không ép ai đổi tiếng', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: JA_LINE, gapMs: 3_000 })).language).toBe('ja');
    });

    it('14 · ngưỡng nghỉ nằm trong khoảng 1–2 giây như một đội dịch thật', () => {
        expect(DIRECTION_ROUTER_DEFAULTS.pauseResetMs).toBeGreaterThanOrEqual(1_000);
        expect(DIRECTION_ROUTER_DEFAULTS.pauseResetMs).toBeLessThanOrEqual(2_000);
    });

    it('15 · Timeline khoá chiều thì mọi thứ trên đây đứng yên — người điều khiển là trên cùng', () => {
        const r = createDirectionRouter('vi');
        r.lock('ja');
        expect(r.next(say({ text: VI_LINE })).language).toBe('ja');
        expect(r.next(say({ text: VI_LINE, gapMs: 5_000 })).language).toBe('ja');
        r.lock(null);
        expect(r.next(say({ text: VI_LINE })).language).toBe('vi');
    });

    it('16 · đổi chiều nền giữa buổi (người điều khiển bấm) thì chiều đang chạy theo luôn', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        r.setBase('ja');
        expect(r.base()).toBe('ja');
        expect(r.next(say({ text: VI_TONELESS, gapMs: 2_000 })).language).toBe('ja');
    });

    it('17b · KHOÁ cũng đặt luôn chiều đang chạy, nên nhả khoá không trả phòng về người nói trước', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE })); // đang chạy JA
        r.lock('vi'); // bảng chương trình: đoạn này người Việt nói
        expect(r.current()).toBe('vi');
        r.lock(null); // nhả khoá — KHÔNG được quay về JA của người trước
        expect(r.current()).toBe('vi');
        expect(r.next(say({ text: VI_TONELESS })).language).toBe('vi');
    });

    it('17 · đếm được số lần đổi chiều và số câu phải chiếu — để đo, không để đoán', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        r.next(say({ text: VI_LINE, gapMs: 2_000 }));
        r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' }));
        const s = r.stats();
        expect(s.switches).toBe(2);
        expect(s.projected).toBe(1);
        expect(s.pauseResets).toBe(1);
    });
});

// ── Buổi lễ hay cuộc họp: một nhịp nghỉ KHÔNG có cùng ý nghĩa ────────────────────────────────────────
//
// Ở buổi lễ có bảng chương trình, nên `base` là một sự thật về căn phòng: phần này tiếng Việt, phần kia
// tiếng Nhật. Nghỉ thì quay về đó, vì bảng chương trình to hơn người vừa nói xong.
//
// Ở cuộc họp nội bộ thì không ai viết sẵn ai nói tiếng gì. `base` chỉ là chiều người ta chọn lúc bật máy.
// Bắt nó quay về đó ở mỗi nhịp thở là SAI hẳn: khách Nhật giải thích năm phút thì nghỉ liên tục, và mỗi
// nhịp nghỉ lại kéo chiều về tiếng Việt rồi bắt tiếng Nhật giành lại từ đầu — thành ra giật từng câu.
//
// Nên ở `free`, nghỉ KHÔNG trả lời câu hỏi, nó MỞ LẠI câu hỏi: xoá quán tính, và câu đầu tiên sau nhịp
// nghỉ được đổi chiều bằng bằng chứng yếu một mình. Ngay sau lúc đổi phiên thì không có lượt nào đang dở
// để mà giữ quán tính, và bắt người mới chứng minh hai lần chính là hai câu dịch ngược.
describe('họp nội bộ (free) — nghỉ mở lại câu hỏi chứ không kéo về chiều nền', () => {
    const meeting = (b: 'vi' | 'ja' = 'vi') => createDirectionRouter(b, { baseMode: 'free' });

    it('18 · mặc định vẫn là "anchor" — buổi lễ là ca đang có, họp phải tự xin', () => {
        expect(DIRECTION_ROUTER_DEFAULTS.baseMode).toBe('anchor');
        expect(createDirectionRouter('vi').baseMode()).toBe('anchor');
        expect(meeting().baseMode()).toBe('free');
    });

    it('19 · khách Nhật nói dài có nghỉ giữa chừng thì KHÔNG bị kéo về tiếng Việt', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE }));
        // Ba nhịp nghỉ, ba câu KHÔNG có bằng chứng gì: tên riêng, một tiếng đệm, một mã số. Chỉ những câu
        // như thế mới phân biệt được hai chế độ — câu nào tự làm chứng thì chế độ nào cũng ra như nhau.
        for (const [text, gapMs] of [['Esuhai', 2_000], ['OK', 3_500], ['ISO 9001', 2_400]] as const) {
            expect(r.next(say({ text, gapMs })).language, text).toBe('ja');
        }
        expect(r.stats().pauseResets).toBe(3); // vẫn ĐẾM nhịp nghỉ, chỉ là không kéo chiều
    });

    it('20 · cùng dữ liệu đó ở buổi lễ (anchor) thì kéo về nền — hai chế độ phải khác nhau thật', () => {
        const r = createDirectionRouter('vi'); // anchor
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: 'Esuhai', gapMs: 2_000 })).language).toBe('vi');
    });

    it('21 · nhưng người kế tiếp chỉ cần MỘT bằng chứng yếu là đổi được, không phải hai', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE })); // đang JA
        const v = r.next(say({ text: 'Cam on quy vi da đen', gapMs: 2_000 })); // đúng 1 dấu (đ) = yếu
        expect(v.language).toBe('vi');
        expect(v.switched).toBe(true);
    });

    it('22 · KHÔNG nghỉ thì vẫn phải hai lượt yếu — quán tính giữa một lượt nói còn nguyên', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: 'Cam on quy vi da đen', gapMs: 200 })).language).toBe('ja');
        expect(r.next(say({ text: 'Cam on quy vi da đen', gapMs: 200 })).language).toBe('vi');
    });

    it('23 · đổi chế độ giữa phiên được (nạp kịch bản vào một buổi đang chạy)', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE }));
        r.setBaseMode('anchor');
        expect(r.baseMode()).toBe('anchor');
        expect(r.next(say({ text: VI_TONELESS, gapMs: 2_000 })).language).toBe('vi');
    });

    it('25 · chuỗi Latin dài mà KHÔNG có kana/kanji là bằng chứng — đó là tiếng Việt mất dấu', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE })); // đang JA
        // Ca khó nhất của cả căn phòng: MC lấy lại mic, máy nghe còn ở ngữ cảnh Nhật nên chép mất dấu, và
        // nhà cung cấp không gắn nhãn gì. Mọi luật khác đều câm trước câu này.
        const v = r.next(say({ text: VI_TONELESS, gapMs: 2_600 }));
        expect(v.language).toBe('vi');
        expect(v.switched).toBe(true);
    });

    it('26 · nhưng chữ Latin NGẮN chêm giữa lượt tiếng Nhật thì không được lật gì cả', () => {
        for (const t of ['OK', 'Esuhai', 'ISO 9001', '2026']) {
            const r = meeting();
            r.next(say({ text: JA_LINE }));
            expect(r.next(say({ text: t, gapMs: 2_600 })).language, t).toBe('ja');
        }
        expect(DIRECTION_ROUTER_DEFAULTS.latinRunWeak).toBeGreaterThanOrEqual(8);
    });

    it('27 · và nó chỉ là bằng chứng YẾU — giữa một lượt nói vẫn cần hai lần, không lật ngay', () => {
        const r = meeting();
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: VI_TONELESS, gapMs: 300 })).language).toBe('ja');
    });

    it('24 · ba luật kia không đổi theo chế độ — chiếu, khoá, và không bao giờ mất câu', () => {
        const r = meeting();
        expect(r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' })).language).toBe('ja');
        expect(r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh', gapMs: 9_000 })).dropped).toBe(false);
        r.lock('vi');
        expect(r.next(say({ text: JA_LINE, gapMs: 9_000 })).language).toBe('vi');
    });
});

// ── 06/08 chiều — BỚT ĐI CHỨ KHÔNG THÊM VÀO ───────────────────────────────────────────────────────────
//
// Mọi luật phía trên đọc CHỮ, mà chữ là thứ do chính máy nghe viết ra. Hai thứ dưới đây không đọc chữ:
//
//   · `sourceLang` — câu này vào máy bằng SỢI DÂY nào (mic trong phòng, hay tiếng máy tự phát ra).
//     Không phải phép đo, nên không có gì để sai. Đứng trên tất cả, chỉ dưới khoá chương trình.
//   · `vendorFirst` — nhãn tiếng của máy nghe là kết luận từ ÂM, nên khi nó gọi tên MỘT TRONG HAI tiếng
//     của ta thì tin nó hơn mặt chữ. Bật sẵn; tắt được để đối chứng A/B trên cùng một buổi ghi log.
//
// Cả hai đều là phép TRỪ: bớt quán tính, bớt suy diễn từ mặt chữ. Chỗ khác biệt duy nhất — và cũng là ca
// đắt nhất — là khi máy nghe chép một câu tiếng Việt RA KANA: lúc đó chữ không im lặng, chữ NÓI DỐI.
describe('chiều theo NGUỒN TIẾNG — sợi dây thắng mọi phép đoán', () => {
    it('28 · kana đặc cả câu vẫn thua sợi dây: câu vào bằng mic thì là tiếng của phòng', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: JA_LINE, vendorRaw: 'ja', sourceLang: 'vi' }));
        expect(v.language).toBe('vi');
        expect(v.basis).toBe('source');
        expect(v.dropped).toBe(false);
    });

    it('29 · nhưng khoá chương trình vẫn ở trên — người điều khiển là trên cùng, không đổi', () => {
        const r = createDirectionRouter('vi');
        r.lock('ja');
        const v = r.next(say({ text: VI_LINE, sourceLang: 'vi' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('locked');
    });

    it('30 · chạy TRƯỚC nhánh nghỉ: biết chắc ai vừa nói thì không còn gì cho ngưỡng im lặng đoán', () => {
        const r = createDirectionRouter('vi'); // anchor, nền VI
        r.next(say({ text: JA_LINE }));
        // Nghỉ 5 giây rồi đầu cầu bên kia nói tiếp. Luật nghỉ của buổi lễ sẽ kéo về nền (VI) — sai, vì
        // sợi dây đã nói rõ tiếng này ra từ máy tính chứ không ra từ phòng.
        const v = r.next(say({ text: 'Esuhai', gapMs: 5_000, sourceLang: 'ja' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('source');
        expect(r.stats().pauseResets).toBe(0); // nhánh nghỉ còn không được chạy tới
    });

    it('31 · xoá quán tính: bằng chứng yếu nhặt từ lượt người khác thì nói về người khác', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: 'Tanaka さん' })); // một lượt yếu chỉ về JA, chưa đủ đổi
        r.next(say({ text: VI_LINE, sourceLang: 'vi' })); // sợi dây chen vào giữa
        // Nếu bộ đếm yếu sống sót qua câu trên thì câu này là lượt yếu THỨ HAI và lật sang JA.
        expect(r.next(say({ text: 'Tanaka さん' })).language).toBe('vi');
    });

    it('32 · đổi chiều theo sợi dây vẫn được ĐẾM là một lần đổi — sổ sách phải nói thật', () => {
        const r = createDirectionRouter('vi');
        expect(r.next(say({ text: JA_LINE, sourceLang: 'vi' })).switched).toBe(false);
        expect(r.next(say({ text: VI_LINE, sourceLang: 'ja' })).switched).toBe(true);
        expect(r.stats().switches).toBe(1);
        expect(r.current()).toBe('ja');
    });

    it('33 · không có sợi dây (người vận hành chưa đấu đường thứ hai) thì mọi thứ chạy y như cũ', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: JA_LINE })); // `sourceLang` vắng mặt
        expect(v.basis).toBe('kana');
        expect(r.stats().byBasis.source).toBe(0);
    });
});

describe('nhãn ÂM đứng trên mặt CHỮ (vendorFirst)', () => {
    it('34 · bật sẵn — vì ca đắt nhất là câu tiếng Việt bị chép RA KANA', () => {
        expect(DIRECTION_ROUTER_DEFAULTS.vendorFirst).toBe(true);
        const r = createDirectionRouter('vi');
        // Máy nghe đang ở ngữ cảnh Nhật, chép câu tiếng Việt thành kana đặc, NHƯNG nhãn tiếng của chính
        // nó (nghe từ sóng âm, không đọc chữ nó vừa viết) vẫn gọi đúng tên tiếng Việt.
        const v = r.next(say({ text: 'ヴィエット ナム', vendorRaw: 'vi' }));
        expect(v.language).toBe('vi');
        expect(v.basis).toBe('vendor');
    });

    it('35 · tắt đi thì về đúng thứ tự cũ (kana thắng) — nhánh đối chứng A/B phải chạy được', () => {
        const r = createDirectionRouter('vi', { vendorFirst: false });
        const v = r.next(say({ text: 'ヴィエット ナム', vendorRaw: 'vi' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('kana');
    });

    it('36 · tiếng THỨ BA vẫn đi đường chiếu như cũ — bật cái này không đụng vào luật 1', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' }));
        expect(v.projected).toBe(true);
        expect(v.basis).toBe('projected');
    });

    it('37 · dấu thanh tiếng Việt vẫn thắng nhãn lạ — nhãn "không phải hai tiếng của ta" không được ưu tiên', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        expect(r.next(say({ text: VI_LINE, vendorRaw: 'und' })).language).toBe('vi');
    });
});

// ── Nhãn mượn của câu kề bên ─────────────────────────────────────────────────────────────────────────
//
// Nhãn tiếng chỉ cưỡi trên bản chốt CÓ MỐC THỜI GIAN của máy nghe. Câu "nhả sớm" cắt ra từ dòng partial
// nên không bao giờ có nhãn của riêng nó — và trên phiên 06/08 thì 39 trong 52 câu là nhả sớm. Tức là ba
// phần tư số câu tới bộ định tuyến với hai bàn tay trắng và phải định chiều bằng cách đọc mặt chữ, đúng
// cái việc mà `vendorFirst` vừa được bật lên để bớt đi. Đây là chỗ vá lỗ đó.
describe('nhãn ÂM mượn của câu kề bên — cứu những câu nhả sớm', () => {
    it('40 · câu không có nhãn riêng thì mượn nhãn gần nhất, thay vì rơi về đọc mặt chữ', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_TONELESS, vendorCarriedRaw: 'vi' }));
        expect(v.language).toBe('vi');
        expect(v.basis).toBe('vendor-near');
    });

    it('41 · nhưng chỉ là bằng chứng YẾU — một mình nó không lật được lượt đang chạy', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE })); // đang JA
        expect(r.next(say({ text: 'Esuhai', vendorCarriedRaw: 'vi' })).language).toBe('ja');
        // Hai lượt liên tiếp cùng chỉ một hướng thì mới đủ, đúng luật quán tính có sẵn.
        expect(r.next(say({ text: 'Esuhai', vendorCarriedRaw: 'vi' })).language).toBe('vi');
    });

    it('42 · nhãn THẬT của chính câu đó luôn thắng nhãn mượn', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_TONELESS, vendorRaw: 'ja', vendorCarriedRaw: 'vi' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('vendor');
    });

    it('43 · kana ĐẶC vẫn thắng nhãn mượn — câu tự làm chứng được thì không cần hỏi hàng xóm', () => {
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: JA_LINE, vendorCarriedRaw: 'vi' }));
        expect(v.language).toBe('ja');
        expect(v.basis).toBe('kana');
    });

    it('44 · nhưng nó thắng MỘT ký tự kana lẻ — đó chính là lỗ đang vá', () => {
        // "ông Tanaka さん" giữa câu tiếng Việt: mặt chữ nói JA (yếu), nhãn âm nói VI. Không có nhãn mượn
        // thì hai câu như thế liên tiếp là đủ lật cả lượt sang tiếng Nhật.
        const r = createDirectionRouter('vi');
        const weak = say({ text: 'Chúng tôi xin giới thiệu ông Tanaka さん.', vendorCarriedRaw: 'vi' });
        expect(r.next(weak).basis).toBe('vendor-near');
        expect(r.next(weak).language).toBe('vi');
        expect(r.stats().byBasis.kana).toBe(0);
    });

    it('45 · tiếng thứ ba ở nhãn mượn thì bỏ qua, KHÔNG kích hoạt phép chiếu', () => {
        // Phép chiếu là chuyện của câu tự nó bị gọi tên sai. Mượn một cái nhãn "tiếng Ý" của câu bên cạnh
        // rồi chiếu câu này sang tiếng kia là dựng bằng chứng từ hư không.
        const r = createDirectionRouter('vi');
        const v = r.next(say({ text: VI_TONELESS, vendorCarriedRaw: 'it' }));
        expect(v.projected).toBe(false);
        expect(v.basis).not.toBe('vendor-near');
    });

    it('46 · nguồn tiếng và khoá chương trình đều vẫn ở trên nó', () => {
        const r = createDirectionRouter('vi');
        expect(r.next(say({ text: VI_LINE, vendorCarriedRaw: 'vi', sourceLang: 'ja' })).basis).toBe('source');
        r.lock('ja');
        expect(r.next(say({ text: VI_LINE, vendorCarriedRaw: 'vi' })).basis).toBe('locked');
    });
});

describe('sổ sách theo TỪNG LOẠI bằng chứng — cách duy nhất đo được "bớt quán tính thì tốt hay tệ"', () => {
    it('38 · mỗi câu chốt cộng đúng một ô, và tổng bằng số câu đã đi qua router', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE, sourceLang: 'ja' }));       // source
        r.next(say({ text: JA_LINE }));                          // kana
        r.next(say({ text: VI_LINE, gapMs: 2_000 }));            // script
        r.next(say({ text: VI_TONELESS, vendorRaw: 'ja-JP' }));  // vendor
        r.next(say({ text: VI_AS_CHINESE, vendorRaw: 'zh' }));   // projected
        r.next(say({ text: 'OK', gapMs: 4_000 }));               // pause-reset (anchor)
        r.next(say({ text: 'OK' }));                             // sticky
        r.lock('vi');
        r.next(say({ text: JA_LINE }));                          // locked
        const b = r.stats().byBasis;
        expect(b).toEqual({
            source: 1, kana: 1, script: 1, vendor: 1, 'vendor-near': 0, projected: 1, 'pause-reset': 1, sticky: 1, locked: 1,
        });
        expect(Object.values(b).reduce((a, n) => a + n, 0)).toBe(8);
    });

    it('39 · sổ trả ra là BẢN SAO — người đọc log không sửa được số của router đang chạy', () => {
        const r = createDirectionRouter('vi');
        r.next(say({ text: JA_LINE }));
        const snap = r.stats();
        snap.byBasis.kana = 999;
        expect(r.stats().byBasis.kana).toBe(1);
    });
});
```

**`tests/directionRouterLane.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// 06/08 — LỚP ROUTER ĐÃ ĐƯỢC ĐẤU VÀO LANE, và bộ test này canh đúng cái mối nối đó.
//
// `directionRouter.test.ts` chứng minh module tự nó nghĩ đúng. Nhưng một module đúng mà không ai gọi thì
// không cứu được câu nào — mà đó lại đúng là chuyện đã xảy ra một lần trong dự án này (PROMPT-16 viết xong
// phần "máy trắng tự lấy về" rồi bị `migrateToEventScoped()` bịa một buổi trước `bootCloud()` làm cho vô
// hiệu 100%, không test nào đỏ). Nên chỗ nối phải được ghim riêng.
//
// Ba thứ phải đúng, và mất bất cứ cái nào cũng là im lặng chứ không phải lỗi:
//   1. cửa `foreign` PHẢI biến mất — còn nó thì câu tiếng Việt bị gán nhãn tiếng Trung vẫn bị xoá;
//   2. router phải được TẠO mỗi phiên và được HỎI ở mỗi câu chốt;
//   3. `baseMode` phải theo việc có kịch bản hay không — buổi lễ ≠ cuộc họp.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = read('src/lib/lanes/online/onlineLane.ts')
const CONSOLE = read('src/lib/lanes/online/components/OnlineConsole.tsx')
const FACADE = read('src/lib/lanes/online/index.ts')
const CAPTURE = read('src/lib/lanes/online/pcm16Capture.ts')

/** Thân một hàm khai bằng `function ten(` — cắt tới dấu đóng ngoặc cùng cấp. */
function body(src: string, decl: string): string {
    const at = src.indexOf(decl)
    expect(at, `không tìm thấy ${decl}`).toBeGreaterThan(-1)
    const eol = src.indexOf('\n', at)
    const open = src.lastIndexOf('{', eol)
    let depth = 0
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1
        else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(open, i + 1) }
    }
    throw new Error(`không đóng được thân ${decl}`)
}

describe('cửa "tiếng lạ thì vứt câu" đã bị gỡ', () => {
    it('1 · không còn đường nào bỏ câu vì tiếng lạ', () => {
        expect(LANE).not.toContain("dropGhost('foreign-language'")
        expect(LANE).not.toContain('decided.foreign')
        // Chỉ soi các chỗ DÙNG THẬT: chú thích còn nhắc tên cũ là cố ý, để đọc lại còn biết vì sao đổi.
        expect(LANE).not.toContain('foreignDrops +=')
        expect(LANE).not.toContain('foreignDrops = 0')
        expect(LANE).not.toContain('foreignDrops,')
    })

    it('2 · thay bằng bộ đếm câu được CỨU, không phải câu bị bỏ — con số phải nói thật', () => {
        expect(LANE).toContain('languageProjections: number')
        expect(LANE).toContain('if (routed?.projected) languageProjections += 1')
        expect(CONSOLE).toContain('cứu tiếng lạ')
        expect(CONSOLE).not.toContain('bỏ tiếng lạ')
    })

    it('3 · hai cái chốt còn lại vẫn đứng — gỡ cửa này KHÔNG mở lại lỗ "（聞き取り不能）"', () => {
        // Nhãn "không nghe được" của chính máy nghe do isNonSpeechAnnotation bắt, không phải cửa vừa gỡ.
        expect(LANE).toContain('if (isNonSpeechAnnotation(transcript))')
        expect(LANE).toContain('if (isInventedNumber(transcript))')
    })
})

describe('router được tạo mỗi phiên và được hỏi ở mỗi câu chốt', () => {
    it('4 · tạo trong start(), cạnh tracker, và dọn luôn mốc thời gian của phiên cũ', () => {
        const start = body(LANE, 'async function start(startOpts: StartOpts)')
        expect(start).toContain('router = createDirectionRouter(startOpts.sourceLanguage)')
        expect(start).toContain('lastAcceptedFinalAt = 0')
    })

    it('5 · mỗi câu chốt đều đi qua router, kèm khoảng lặng đo được', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        // 06/08 chiều — thêm `sourceLang` (chiều theo NGUỒN TIẾNG) rồi `vendorCarriedRaw` (nhãn âm mượn
        // của câu kề bên, cho những câu nhả sớm vốn không bao giờ có nhãn của riêng nó). Ý của khẳng định
        // này không đổi: mọi câu chốt vẫn phải đi qua router và vẫn phải mang khoảng lặng đo được. Hai thứ
        // thêm vào chỉ là bằng chứng đi kèm, và cả hai đều `undefined` khi không có gì để đưa.
        expect(fn).toContain('router.next({ text: transcript, vendorRaw: vendorLanguage, vendorCarriedRaw, gapMs, sourceLang })')
        expect(fn).toContain('const gapMs = lastAcceptedFinalAt ? finalAt - lastAcceptedFinalAt : 0')
        // Câu ĐẦU TIÊN của phiên bàn giao từ không ai cả, nên phải là 0 chứ không phải "cả buổi".
        expect(fn).toContain('lastAcceptedFinalAt = finalAt')
    })

    it('6 · phiên MỘT CHIỀU không định tuyến — đường nghe đã bị ghim sẵn tiếng rồi', () => {
        expect(body(LANE, 'function acceptFinalText(')).toContain('twoWay && router ? router.next(')
        expect(LANE).toContain("language: twoWay ? 'auto' : opts!.sourceLanguage")
    })

    it('7 · tracker bị hạ cấp: nó soi theo chiều ĐANG CHẠY của router, không theo câu vừa rồi', () => {
        // Khác nhau đúng ở câu được CHIẾU: nhãn tiếng thứ ba mượn cho một dòng, không được thành cả lượt.
        expect(body(LANE, 'function acceptFinalText(')).toContain('tracker.reset(router.current())')
    })

    it('8 · khoá của bảng chương trình được chuyển xuống router luôn', () => {
        expect(body(LANE, 'function lockLanguage(')).toContain('router?.lock(language)')
    })
})

// R5 — mối nối giữa HIỆN và ĐỌC. `speakGate.test.ts` chứng minh cái cổng nghĩ đúng; phần dưới đây canh
// việc nó được đấu vào đúng ba chỗ, và quan trọng nhất là canh CHIỀU của bất đối xứng: chỉ có giọng đọc
// được chờ. Đấu ngược lại — bắt phụ đề chờ trọng tài — là biến mọi mili-giây trọng tài nghĩ thêm thành
// mili-giây tường trống, tức là xoá sạch lý do tồn tại của cả lớp này.
describe('R5 — chỉ giọng đọc phải chờ, tường thì không bao giờ', () => {
    it('11 · giọng đọc hỏi cổng trước khi phát, ở CẢ hai đường (refine và snap)', () => {
        const refine = body(LANE, 'async function refine(')
        expect(refine).toContain('await speakGate.wait(lid, DIRECTION_SETTLE_WAIT_MS, dl.source)')
        expect(body(LANE, 'async function speakSnap(')).toContain('await speakGate.wait(lid, DIRECTION_SETTLE_WAIT_MS, source)')
    })

    it('12 · chốt chiều KHÁC chiều đã dịch ⇒ NGẬM MIỆNG, không phải đọc bằng tiếng khác', () => {
        // Bản dịch làm theo chiều cũ thì sai từ gốc, chứ không sai mỗi cái giọng. Đọc lên bằng tiếng kia
        // là đưa một câu ngược vào loa; giữ lại thì khán phòng vẫn ĐỌC được nó trên tường.
        expect(LANE).toContain('if (settled.changed) { voiceDirectionHolds += 1; speakGate.forget(lid); return; }')
        expect(body(LANE, 'async function refine(')).toContain('voiceDirectionHolds += 1')
        expect(LANE).toContain('voiceDirectionHolds: number')
    })

    it('13 · phụ đề KHÔNG chờ — emitLine không bao giờ nằm sau một lần chờ cổng', () => {
        for (const fn of ['async function refine(', 'function trySnapToScript(']) {
            const src = body(LANE, fn)
            const firstEmit = src.indexOf('emitLine(')
            const firstWait = src.indexOf('speakGate.wait(')
            expect(firstEmit, fn).toBeGreaterThan(-1)
            if (firstWait > -1) expect(firstEmit, fn).toBeLessThan(firstWait)
        }
    })

    it('14 · hạn giờ có thật và nằm trong ngân sách đã tuyên bố cho lớp router', () => {
        const m = LANE.match(/const DIRECTION_SETTLE_WAIT_MS = ([\d_]+);/)
        expect(m, 'không tìm thấy hạn giờ').toBeTruthy()
        const ms = Number(m![1].replace(/_/g, ''))
        expect(ms).toBeGreaterThanOrEqual(1_000)
        expect(ms).toBeLessThanOrEqual(2_000)
    })

    it('15 · người BẤM DÒNG và kịch bản lật chiều thì tự chốt cổng — không bắt chúng chờ trọng tài', () => {
        // Người ngồi cạnh sân khấu bấm dòng, và cặp câu trong kịch bản do người duyệt từ mấy tiếng trước:
        // cả hai đều là bằng chứng mạnh hơn trọng tài đọc chữ từ một cái máy nghe giữa hội trường ồn.
        const snap = body(LANE, 'function trySnapToScript(')
        expect(snap).toContain('speakGate.settle(lid, guidedSource)')
        expect(snap).toContain('if (flipped) speakGate.settle(lid, heardLanguage)')
    })

    it('16 · phiên mới dọn sạch cổng — không để một câu của buổi trước treo lời hứa', () => {
        expect(body(LANE, 'async function start(startOpts: StartOpts)')).toContain('speakGate.reset()')
    })
})

// ── CHIỀU THEO NGUỒN TIẾNG — cả sợi dây từ đầu đến cuối ──────────────────────────────────────────────
//
// `sourceAttribution.test.ts` chứng minh lớp gán nguồn nghĩ đúng; `directionRouter.test.ts` chứng minh
// router đặt nó lên trên mọi phép đoán. Cả hai đúng mà không ai nối dây thì cứu được đúng 0 câu — và đó
// là chuyện ĐÃ XẢY RA một lần trong dự án này (PROMPT-16, không test nào đỏ). Nên đường đi phải được ghim
// từng mắt một, vì mất bất cứ mắt nào cũng là im lặng chứ không phải lỗi:
//
//   micro + tiếng máy → worklet đo RIÊNG từng đường → gói tiếng → lớp gán nguồn → router → chiều dịch
//
// và một cái van ở giữa: người vận hành phải tự đấu được đường thứ hai bằng một cú bấm, nếu không thì cả
// nhánh này chỉ chạy được trong đầu người viết ra nó.
describe('chiều theo nguồn tiếng — sợi dây được nối đủ từ worklet tới router', () => {
    it('17 · worklet nhận HAI đường vào và đo năng lượng riêng từng đường', () => {
        // Trộn chung rồi mới đo là mất trắng: cái cần biết không phải "có tiếng hay không" (đã có sẵn),
        // mà là tiếng đó vào bằng cổng nào.
        expect(CAPTURE).toContain('numberOfInputs: 2')
        expect(CAPTURE).toContain('micVoicedMs: this.micVoicedCount / 16')
        expect(CAPTURE).toContain('sysVoicedMs: this.sysVoicedCount / 16')
        // Đường thứ hai chỉ được đấu khi nó CÓ TIẾNG thật. Luồng chia sẻ màn hình quên tích ô âm thanh
        // vẫn là một MediaStream hợp lệ, và nối nó vào là dựng một đầu vào câm rồi tin nó.
        expect(CAPTURE).toContain('if (sysStream && sysStream.getAudioTracks().length > 0)')
        expect(CAPTURE).toContain('sysSrc.connect(node, 0, 1)')
    })

    it('18 · lane ghi năng lượng hai đường ở MỖI gói tiếng, không phải chỉ khi có câu', () => {
        // Cửa sổ của một câu được hỏi lại lúc chốt, nên tiếng phải được ghi liên tục từ trước đó. Ghi
        // theo câu là ghi sau khi đã cần.
        expect(LANE).toContain('sourceAttributor.observe(packetAt, packet.micVoicedMs, packet.sysVoicedMs)')
    })

    it('19 · mỗi câu chốt hỏi lại cửa sổ của CHÍNH nó, và chỉ khi đường thứ hai sống thật', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        expect(fn).toContain('sourceAttributor.verdictFor(lastAcceptedFinalAt, finalAt)')
        // Không có cửa này thì `sysVoicedMs` luôn bằng 0, mọi câu gán về micro, và "mọi câu về một phía"
        // không phải là không có tín hiệu — nó là một tín hiệu SAI, ghim cứng chiều của cả buổi.
        expect(fn).toContain('systemSourceLive && twoWay')
    })

    it('20 · gán nguồn → tiếng: đường tiếng máy là tiếng của đầu cầu bên kia, mic là tiếng của phòng', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        expect(fn).toContain("sourceVerdict.source === 'system' ? systemLang :")
        // Không đặt thì mặc định phía bên kia nói thứ tiếng CÒN LẠI so với chiều nguồn của phiên.
        expect(fn).toContain("opts?.sourceLanguage === 'ja' ? 'vi' : 'ja'")
    })

    it('21 · người vận hành đấu được đường thứ hai bằng một cú bấm, và facade truyền nó xuống lane', () => {
        // `getDisplayMedia` bắt buộc phải có cử chỉ người dùng, nên nút bấm KHÔNG phải chuyện trang trí:
        // không có nó thì không đời nào có luồng thứ hai, và cả nhánh này chết trên giấy.
        expect(FACADE).toContain('navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })')
        expect(FACADE).toContain('getSystemStream: () => systemStreamRef.current')
        expect(FACADE).toContain('getSystemLanguage: ()')
        expect(CONSOLE).toContain('lane.attachSystemSource()')
        expect(CONSOLE).toContain('lane.detachSystemSource()')
    })

    it('22 · luồng chỉ có HÌNH bị từ chối ngay, không nhận bừa rồi báo xanh cả buổi', () => {
        expect(FACADE).toContain('if (!audio.length)')
        expect(FACADE).toContain('stream.getTracks().forEach((t) => t.stop())')
        // Và màn điều khiển phải đỏ lên khi đã đấu mà lane không thấy tiếng nào — đây là ca hay gặp nhất
        // (quên tích ô chia sẻ âm thanh), và cũng là ca im lặng nhất.
        expect(CONSOLE).toContain('diag.systemSourceLive')
        expect(CONSOLE).toContain('lane.systemSourceOn')
    })

    it('23 · và đếm được CÁI GÌ quyết chiều — không có số này thì "bớt quán tính" chỉ là cảm giác', () => {
        expect(LANE).toContain('routerBasis: router?.stats().byBasis ?? {}')
        expect(CONSOLE).toContain('basisReadout(diag.routerBasis)')
    })
})

// ── Ba bản vá của phiên chạy thử 06/08 ───────────────────────────────────────────────────────────────
//
// Cả ba đều đến từ MỘT phiên có ghi log (`online_20260806-131634.json`, 60 dòng), không phải từ suy đoán:
//
//   ① máy nghe đọc lại đoạn đã nhả — 7/60 dòng (12%), khoảng cách 1–3 dòng;
//   ② câu nhả sớm không có nhãn tiếng — 39/52 câu, nên 3/4 số câu định chiều bằng cách đọc mặt chữ;
//   ③ trần 25s vô hiệu khi máy nghe câm — ba lần đổi tiếng cho ba khoảng câm 6,2s → 24,3s → 131s.
//
// Mỗi cái mất đi đều là im lặng chứ không phải lỗi, nên phải ghim từng cái.
describe('ba bản vá 06/08 — đấu đủ dây, không nằm chờ trên giấy', () => {
    it('24 · ① chốt chặn lặp nay nhớ NHIỀU câu và so theo BAO HÀM, không còn sâu-1 so bằng nhau', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        expect(fn).toContain('judgeEcho(incoming, echoMemory, REPEAT_GUARD_MIN_CHARS)')
        expect(fn).toContain("if (echo.kind === 'repeat')")
        // Phần đuôi CÒN MỚI của một câu bị cắt đầu vẫn phải được nhả, không được bỏ cả câu.
        expect(fn).toContain("if (echo.kind === 'trimmed') echoTrims += 1")
        expect(fn).toContain('const transcript = echo.text')
        // Và bộ nhớ phải được ghi bằng chữ ĐÃ TRỪ, không phải chữ thô: ghi chữ thô là lần sau so với một
        // chuỗi chứa sẵn phần trùng, và cái lặp kế tiếp lọt lưới.
        expect(fn).toContain('echoMemory = rememberEcho(echoMemory, transcript, ECHO_MEMORY)')
        // Chốt chặn cũ phải đi hẳn — để lại là hai chốt cùng nói về một chuyện và sẽ lệch nhau. Cùng quy
        // ước với ca 1 ở đầu tệp: chỉ soi các chỗ DÙNG THẬT, chú thích còn nhắc tên cũ là cố ý (để đọc
        // lại còn biết vì sao đổi).
        expect(LANE).not.toContain('previousFinalTranscript =')
        expect(LANE).not.toContain('=== previousFinalTranscript')
    })

    it('25 · ② nhãn ÂM được giữ lại và chuyền cho câu không có nhãn, kèm hạn tươi', () => {
        expect(LANE).toContain('const VENDOR_TAG_CARRY_MS')
        // Nhặt ở CẢ HAI đường: bản chốt của máy nghe, và dòng partial (nhãn tươi nhất có thể có).
        expect(body(LANE, 'function acceptFinalText(')).toContain('noteVendorTag(vendorLanguage, Date.now())')
        expect(body(LANE, 'function handlePartial(')).toContain('noteVendorTag(')
        // Chỉ mượn khi câu này KHÔNG có nhãn riêng — nhãn thật luôn thắng nhãn mượn.
        expect(LANE).toContain('const vendorCarriedRaw = vendorLanguage ? undefined : carriedVendorTag(finalAt)')
    })

    it('26 · ③ trần 25s có đường CẤP CỨU, không bỏ cuộc vì thiếu partial', () => {
        // Đây là lỗi treo: `scribeLastPartial` bị xoá ở mỗi lần chốt lượt và chỉ được ghi lại khi CÓ
        // partial về. Máy nghe câm ⇒ không partial ⇒ trần bỏ cuộc ⇒ hẹn lại trọn 25s ⇒ lặp vô hạn.
        expect(LANE).toContain("sendManualCommit('max-duration', true)")
        expect(LANE).toContain('function sendManualCommit(reason: ScribeManualCommitReason, atCeiling = false)')
        expect(LANE).toContain('if (scribeCommitPending && !atCeiling) return false')
        // Nhưng cấp cứu vẫn phải có bằng chứng CÓ TIẾNG, nếu không một phòng im sẽ bị bắn lệnh chốt suốt
        // buổi. Bằng chứng là micro (`lastLoudAt`), không phải dòng chữ trả về.
        expect(LANE).toContain('const soundSinceCommit = lastLoudAt > 0 && lastLoudAt >= scribeLastCommitAt')
        expect(LANE).toContain('if (!scribeLastPartial.trim() && !(atCeiling && soundSinceCommit)) return false')
        // Và khi cấp cứu cũng không vào được thì phải ĐẾM — đó là số duy nhất nhìn thấy trước cái treo.
        expect(LANE).toContain('ceilingNoops += 1')
        expect(CONSOLE).toContain('diag.ceilingNoops')
    })

    it('27 · cả ba đều dọn sạch ở phiên mới — buổi trước không được quyết chuyện buổi này', () => {
        const start = body(LANE, 'async function start(startOpts: StartOpts)')
        for (const line of ['echoMemory = []', "lastVendorTag = ''", 'carriedTags = 0', 'ceilingNoops = 0', 'forceGapWaits = 0']) {
            expect(start, line).toContain(line)
        }
    })

    it('28 · rác không lên tường: hai chốt của `notLanguage` nằm trong đúng đường mà câu nhả sớm cũng đi qua', () => {
        const fn = body(LANE, 'function acceptFinalText(')
        expect(fn).toContain('if (hasNoLetters(transcript))')
        expect(fn).toContain('if (isSyllableSoup(transcript))')
        // Đọc `transcript` chứ không phải `incoming`: mảnh `"` cô độc chỉ LỘ RA sau khi đã trừ phần nhả
        // sớm và phần máy nghe đọc lại. Soi trên chữ thô là bỏ sót đúng cái ca đã đo được.
        expect(fn).not.toContain('hasNoLetters(incoming)')
        expect(fn).not.toContain('isSyllableSoup(incoming)')
        // Và dùng lại bộ đếm sẵn có, để dòng "bỏ tiếng không phải giọng" trên màn hiện ra mà không phải
        // thêm một ô số thứ hai nói về cùng một chuyện.
        expect(fn).toContain("lastNonSpeechReason = 'không có chữ nào'")
        expect(fn).toContain("lastNonSpeechReason = 'cháo âm tiết'")
        expect(CONSOLE).toContain('diag.lastNonSpeechReason')
    })

    it('29 · THỨ TỰ là cả vấn đề — rác phải bị chặn TRƯỚC khi nó kịp bỏ phiếu', () => {
        // Đứng sau `rememberEcho` thì cháo âm tiết vào bộ nhớ chống-đọc-lại và thành dao cắt câu thật.
        // Đứng sau `noteVendorTag` thì nhãn của cái ngôn ngữ máy nghe ĐANG KẸT được chuyền cho câu sau —
        // đúng lúc câu sau cần mượn nhãn nhất, vì đó là chỗ nối giữa hai người nói.
        const fn = body(LANE, 'function acceptFinalText(')
        const soup = fn.indexOf('if (isSyllableSoup(transcript))')
        const letters = fn.indexOf('if (hasNoLetters(transcript))')
        const remember = fn.indexOf('echoMemory = rememberEcho(')
        const note = fn.indexOf('noteVendorTag(vendorLanguage')
        for (const [name, at] of [['hasNoLetters', letters], ['isSyllableSoup', soup]] as const) {
            expect(at, name).toBeGreaterThan(-1)
            expect(at, `${name} phải đứng trước rememberEcho`).toBeLessThan(remember)
            expect(at, `${name} phải đứng trước noteVendorTag`).toBeLessThan(note)
        }
    })

    it('30 · đường partial cũng vậy — cháo không được gắn nhãn cho câu kế tiếp', () => {
        expect(body(LANE, 'function handlePartial(')).toContain('if (!isSyllableSoup(base))')
    })

    it('31 · và cháo cũng không được lên tường ở dạng chữ MỜ', () => {
        const fn = body(LANE, 'function handlePartial(')
        expect(fn).toContain('if (isSyllableSoup(live)) return')
        // Phải chặn TRƯỚC khi vẽ và trước khi đặt lịch dịch — chặn sau thì tường đã hiện rác rồi, và một
        // lượt gọi bộ dịch đã tiêu cho nó.
        const gate = fn.indexOf('if (isSyllableSoup(live)) return')
        expect(gate).toBeGreaterThan(-1)
        expect(gate).toBeLessThan(fn.indexOf('emitLine({'))
        expect(gate).toBeLessThan(fn.indexOf('scheduleDraft()'))
        // Soi `live` (phần chưa nhả) chứ không phải cả dòng ghép với bộ đệm đoạn: ghép vào rồi soi là để
        // một câu thật đã chốt pha loãng tỉ lệ gạch của phần rác đang tới.
        expect(fn).not.toContain('isSyllableSoup(currentInterimSource)')
    })
})

describe('buổi lễ hay cuộc họp — chọn theo việc có kịch bản hay không', () => {
    it('9 · có kịch bản ⇒ anchor (nghỉ về chiều nền); không có ⇒ free (nghỉ mở lại câu hỏi)', () => {
        const start = body(LANE, 'async function start(startOpts: StartOpts)')
        expect(start).toContain("router.setBaseMode(scriptRows ? 'anchor' : 'free')")
        // Phải đặt SAU khi đếm được số dòng kịch bản, nếu không nó luôn thấy 0 và cả buổi lễ chạy như họp.
        expect(start.indexOf('scriptRows = scriptSeed.length')).toBeLessThan(start.indexOf('setBaseMode'))
    })

    it('10 · màn điều khiển nói ra lý do chiều dịch, để người vận hành thấy nó đang nghĩ gì', () => {
        expect(LANE).toContain('lastRouterReason: string')
        expect(CONSOLE).toContain('diag.lastRouterReason')
    })
})
```

**`tests/echoGuard.test.ts`**

```ts
// tests/echoGuard.test.ts — MÁY NGHE ĐỌC LẠI ĐOẠN VỪA RỒI.
//
// Dữ liệu của bộ test này lấy NGUYÊN VĂN từ bản ghi 06/08/2026 (`online_20260806-131634.json`), phiên
// người vận hành chạy thử và báo "asr hay bị lặp". 7/60 dòng lặp = 12%, khoảng cách 1–3 dòng. Không phải
// ví dụ nghĩ ra: mỗi khẳng định dưới đây là một dòng đã thật sự lên tường hai lần.
//
// Hai lớp sẵn có đều trượt, và trượt vì lý do khác nhau:
//   · `stripPromotedPrefix` chỉ trừ trong MỘT lượt — sang lượt sau `promotedPrefix` đã bị xoá;
//   · chốt chặn cũ so `transcript === previousFinalTranscript`: sâu 1 bậc, và so BẰNG NHAU.
// Sáu trong bảy ca nằm ở khoảng cách 2–3, ca còn lại dài hơn bản cũ nên cũng không "bằng nhau".

import { describe, it, expect } from 'vitest';
import { judgeEcho, rememberEcho, ECHO_MEMORY, ECHO_MIN_CHARS, ECHO_OVERLAP_MIN_CHARS } from '../src/lib/lanes/online/echoGuard';

// ── nguyên văn từ bản ghi ────────────────────────────────────────────────────────────────────────────
const L1 = 'Hãy làm một phiên bản khác. Mình đã đi qua những cái giai đoạn để mình hiểu mình hơn.';
const L2 = 'Mình sẽ đối diện với những cái hoang mang trong một trạng thái hiểu mình hơn một chút.';
const L3 = 'Hãy làm một phiên bản khác. Mình đã đi qua những cái giai đoạn để mình hiểu mình hơn. Ừm, mình sẽ đối diện với';
const L13 = '...sẽ tạo được nhiều. Tại vì cái thời điểm đó là, đây không phải là một công việc, ừm, được coi là ổn định.';
const L7 = 'Tự tự hào hay là sự kiên trì, bất cứ điều gì.';
const L9 = 'Tự tự hào hay là sự kiên trì, bất cứ điều gì. Thì nghĩ khoai sẽ chọn trước hai viên này. Một viên màu xanh đậm';

describe('bao hàm — câu chốt lại NGUYÊN VĂN đoạn đã nhả', () => {
    it('1 · dòng 16 lặp nguyên văn dòng 13 (cách 3) — chốt chặn sâu-1 cũ không với tới', () => {
        const recent = [L13, 'Và nếu mà mẹ nhìn thấy cái điều này thì mẹ sẽ nghĩ tại sao lo cho m-mình ăn học mà mình lại đi bỏ nghề.', 'Tại vì cái việc học đại học trên Sài Gòn...'];
        const v = judgeEcho(L13, recent);
        expect(v.kind).toBe('repeat');
        expect(v.text).toBe('');
    });

    it('2 · máy nghe lùi về một đoạn NGẮN HƠN nằm gọn trong câu đã nhả ⇒ cũng là lặp', () => {
        const v = judgeEcho('Tại vì cái thời điểm đó là, đây không phải là một công việc', [L13]);
        expect(v.kind).toBe('repeat');
    });

    it('3 · khác biệt khoảng trắng không được cứu một câu lặp', () => {
        expect(judgeEcho(L13.replace(/ /g, '  '), [L13]).kind).toBe('repeat');
    });
});

describe('cắt tiền tố — câu mới NUỐT câu cũ rồi nói tiếp', () => {
    it('4 · dòng 9 = dòng 7 + phần mới ⇒ chỉ nhả phần mới', () => {
        const v = judgeEcho(L9, [L7, 'Thì nghĩ phải sẽ chọn trước hai viên này. Ừm.']);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('Thì nghĩ khoai sẽ chọn trước hai viên này. Một viên màu xanh đậm');
        expect(v.removedChars).toBeGreaterThan(30);
    });

    it('5 · dòng 3 nuốt dòng 1 — cắt xong phần còn lại vẫn phải là chữ đọc được, không dính liền từ', () => {
        const v = judgeEcho(L3, [L1, L2]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('Ừm, mình sẽ đối diện với');
        // Cắt trên chuỗi đã bỏ khoảng trắng rồi ghép lại là tự tay dán liền hai từ. Không được có chỗ nào
        // hai từ dính vào nhau, và chữ đầu không được mất.
        expect(v.text.startsWith('Ừm')).toBe(true);
    });

    it('6 · cắt NHIỀU LẦN: một câu nuốt trọn hai câu liền trước', () => {
        const a = 'Khoai và em của khoai cũng đều đi học đại học hết.';
        const b = 'Nhưng mà đối với mẹ là đó là một sự tự hào.';
        const v = judgeEcho(`${a} ${b} Con của tui đi học đại học.`, [a, b]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('Con của tui đi học đại học.');
    });

    it('7 · máy nghe SỬA một chữ trong đoạn cũ ⇒ KHÔNG cắt, giữ nguyên cả câu', () => {
        // Cắt mù là nuốt chữ, mà nuốt thì không ai thấy; lặp thì thấy được. Đây là chỗ đánh đổi có chủ ý,
        // và nó phải được ghim lại, nếu không một bản "cải tiến" sau này sẽ đổi nó mà không ai hay.
        const v = judgeEcho('Tự hào hay là sự kiên trì, bất cứ điều gì. Thì nghĩ khoai sẽ chọn.', [L7]);
        expect(v.kind).toBe('fresh');
        expect(v.text).toContain('Tự hào hay là sự kiên trì');
    });
});

describe('dấu câu do MÁY chấm vào không được cứu một câu lặp — phiên 14:43 ngày 06/08', () => {
    // Nấc "nhả câu sớm" cắt câu ở dấu chấm và CHẤM DẤU CHẤM vào chỗ cắt. Máy nghe thì đọc lại đoạn đó rồi
    // nói tiếp, nên bản sau không có dấu chấm ở giữa. Bản đầu của echoGuard chỉ bỏ qua khoảng trắng nên
    // lệch đúng một ký tự và cả câu dài lên tường lần thứ hai. Hai ca dưới đây nguyên văn từ phiên đó.
    const Q1 = 'Quyền lực mềm chính là quyền lực có thể giữ được lâu bền nhiều hơn so với các quyền lực cứng.';
    const Q2 = 'Quyền lực mềm chính là quyền lực có thể giữ được lâu bền nhiều hơn so với các quyền lực cứng về sức mạnh kinh tế hay là sức mạnh về quân sự.';

    it('16 · dấu chấm giữa câu do nhả sớm chấm vào ⇒ vẫn cắt được', () => {
        const v = judgeEcho(Q2, [Q1]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('về sức mạnh kinh tế hay là sức mạnh về quân sự.');
    });

    it('17 · cặp nháy máy nghe lúc có lúc không ⇒ vẫn nhận ra là lặp', () => {
        const a = 'Và đó cũng là một trong những cái động lực khiến cho khoai cần phải tìm ra một cái hướng đi nào đó nhanh nhất để mà hoàn thành được cái cột mốc đó. Em cảm thấy ấm áp khi nghe hai chữ đủ đầy. Ừm.';
        expect(judgeEcho('Em cảm thấy ấm áp khi nghe hai chữ "đủ đầy". Ừm.', [a]).kind).toBe('repeat');
    });

    it('18 · phần đuôi cắt xong không được mở đầu bằng dấu câu thừa', () => {
        const v = judgeEcho(`${Q1} , ... về sức mạnh kinh tế.`, [Q1]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('về sức mạnh kinh tế.');
    });

    it('19 · bỏ qua dấu KHÔNG được nới lỏng luật "sai một chữ thì không cắt"', () => {
        const v = judgeEcho('Quyền lực mềm chính là quyền lực có thể giữ được lâu dài nhiều hơn so với các quyền lực cứng về sức mạnh kinh tế.', [Q1]);
        expect(v.kind).toBe('fresh');
    });

    it('20 · máy nghe lắp bắp NGAY TRONG một câu thì tệp này không với tới — ghim lại giới hạn đã biết', () => {
        // Nguyên văn phiên 14:43: một dòng duy nhất chứa hai lần cùng một mệnh đề. echoGuard chỉ so câu
        // mới với các câu ĐÃ NHẢ, không bao giờ nhìn vào bên trong một câu. Ghim để đừng ai tưởng đã xong.
        const stutter = 'và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu, lưu vui. và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu lưuu.';
        expect(judgeEcho(stutter, []).kind).toBe('fresh');
    });
});

describe('chồng-đuôi — câu mới mở đầu bằng ĐUÔI của câu đã nhả', () => {
    const TAIL = 'Và đó cũng là một trong những cái động lực khiến cho khoai cần phải tìm ra một cái hướng đi nào đó nhanh nhất để mà hoàn thành được cái cột mốc đó. Em cảm thấy ấm áp khi nghe hai chữ đủ đầy. Ừm.';

    it('21 · nguyên văn phiên 14:43 — cắt tiền tố không với tới, chồng-đuôi thì với tới', () => {
        const next = 'Em cảm thấy ấm áp khi nghe hai chữ đủ đầy. Ừm. Vì trong những cái hành trình làm việc của các bạn trẻ hay là những điều mình hay nghe.';
        const v = judgeEcho(next, [TAIL]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('Vì trong những cái hành trình làm việc của các bạn trẻ hay là những điều mình hay nghe.');
    });

    it('22 · mẩu chồng NGẮN thì KHÔNG cắt — người ta hay mở câu sau bằng mấy chữ vừa nói', () => {
        // "...có một cái nơi ở ở Sài Gòn này." rồi "Sài Gòn này thì..." — mẩu chồng dưới sàn ⇒ giữ nguyên.
        const v = judgeEcho('Sài Gòn này thì đắt đỏ hơn quê mình rất là nhiều.', ['Để mà có một cái nơi ở ở Sài Gòn này.']);
        expect(v.kind).toBe('fresh');
        expect(ECHO_OVERLAP_MIN_CHARS).toBeGreaterThan(ECHO_MIN_CHARS);
    });

    it('24 · máy nghe lắp bắp khác đi một chữ cái ⇒ cắt xong còn sót mẩu cụt; CỐ Ý để vậy', () => {
        // Phiên 14:43: câu trước kết bằng "mưu lưuu.", câu sau chép lại thành "mưu lưuuu." — thừa một chữ
        // cái. Mẩu chồng dừng ở "lưuu" nên đầu câu còn lại một chữ "u." lạc lõng. Muốn dọn nốt thì phải
        // xoá mù mấy chữ cái đầu câu, mà làm vậy là ăn mất "Ừ.", "Dạ." thật. Một chữ cái thừa thì NHÌN
        // THẤY và sửa được; một tiếng bị nuốt thì không ai biết. Ghim lại để đừng ai "dọn" nhầm hướng.
        const prev = 'và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu, lưu vui. và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu lưuu.';
        const v = judgeEcho('và trong đó có bao gồm sự theo đuổi về mặt tài chính, mưu lưuuu. Nhưng thật ra nó không phải là theo đuổi những điều xa xỉ.', [prev]);
        expect(v.kind).toBe('trimmed');
        expect(v.text).toBe('u. Nhưng thật ra nó không phải là theo đuổi những điều xa xỉ.');
    });

    it('23 · chồng-đuôi cũng khớp theo CHỮ, sai một chữ thì không cắt', () => {
        const next = 'Em cảm thấy ấm áp khi nghe hai từ đủ đầy. Ừm. Vì trong những cái hành trình làm việc của các bạn trẻ.';
        expect(judgeEcho(next, [TAIL]).kind).toBe('fresh');
    });
});

describe('sàn an toàn — câu ngắn lặp lại là chuyện bình thường của tiếng nói', () => {
    it('8 · "Ừm." không bao giờ được dùng làm dao cắt câu sau', () => {
        const v = judgeEcho('Ừm. Lúc này anh có thể chọn những viên sỏi.', ['Ừm.']);
        expect(v.kind).toBe('fresh');
        expect(v.text.startsWith('Ừm.')).toBe(true);
    });

    it('9 · và một câu ngắn lặp lại thật thì vẫn được nhả, không bị bỏ', () => {
        for (const t of ['Ừm.', 'Vâng ạ.', 'Dạ không.']) {
            expect(judgeEcho(t, [t]).kind, t).toBe('fresh');
        }
        expect(ECHO_MIN_CHARS).toBeGreaterThanOrEqual(8);
    });

    it('10 · bộ nhớ rỗng ⇒ không đụng gì vào câu', () => {
        expect(judgeEcho(L1, [])).toEqual({ kind: 'fresh', text: L1, removedChars: 0 });
    });

    it('11 · câu rỗng không làm nổ gì cả', () => {
        expect(judgeEcho('   ', [L1]).kind).toBe('fresh');
    });
});

describe('bộ nhớ ngắn', () => {
    it('12 · giữ đúng N câu gần nhất, cũ nhất rơi ra', () => {
        let mem: string[] = [];
        for (let i = 1; i <= ECHO_MEMORY + 3; i += 1) mem = rememberEcho(mem, `câu số ${i}`);
        expect(mem).toHaveLength(ECHO_MEMORY);
        expect(mem[0]).toBe(`câu số ${4}`);
        expect(mem.at(-1)).toBe(`câu số ${ECHO_MEMORY + 3}`);
    });

    it('13 · đủ sâu cho ca xa nhất đo được (khoảng cách 3)', () => {
        expect(ECHO_MEMORY).toBeGreaterThanOrEqual(4);
    });

    it('14 · không sửa mảng đang có — một bản ghi cũ không được đổi sau lưng', () => {
        const before = rememberEcho([], L1);
        const after = rememberEcho(before, L2);
        expect(before).toEqual([L1]);
        expect(after).toEqual([L1, L2]);
    });

    it('15 · câu rỗng không chiếm chỗ trong bộ nhớ', () => {
        expect(rememberEcho([L1], '  ')).toEqual([L1]);
    });
});
```

**`tests/notLanguage.test.ts`**

```ts
// tests/notLanguage.test.ts — CÁI NÀY KHÔNG PHẢI TIẾNG NGƯỜI.
//
// Mọi chuỗi trong tệp này lấy NGUYÊN VĂN từ kho log của máy (2659 dòng, mọi buổi tính tới 06/08/2026).
// Không có ví dụ nghĩ ra: mỗi dòng "phải tha" ở đây là một câu đã thật sự có người nói, và mỗi dòng
// "phải bắt" là một dòng đã thật sự lên tường rồi được đọc lên loa.

import { describe, it, expect } from 'vitest';
import {
    hasNoLetters,
    isSyllableSoup,
    SOUP_MIN_GROUPS,
    SOUP_MIN_RATE,
} from '../src/lib/lanes/online/notLanguage';

// ── ba dòng cháo, phiên 14:47 ngày 06/08, nguyên văn ────────────────────────────────────────────────
const SOUP_40 = 'チ-イ-ラ-モ-、ケ-イ-、ケ-イ-、ケ-イ-、ケ-イ-、ヒ-ウ-ワ-ア-、バン-ド-ウ。ニ-ン-マ-、ノ-、デ-ン-ラ-イ-、ニュ-ン-、ケ-イ-、ヒ-ウ-ワ-ア-、ベ-、ケ-ジ-ン-ハ-ク-。';
const SOUP_25 = 'えっと、うーん、ラ-、ト-、イ-、カ-ン-ベ-、サ-オ-、テ-ミ-、カ-ン-カ-ム-テ-イ-、ラン-ラ-。ドゥン-、ラ-、ト-ア-ッ-ケ-オ-。';
const SOUP_20 = 'えっと、うーん、ラ-、ト-、イ-、カ-ン-ベ-、サ-オ-、テ-ミ-、カ-ン-カ-ム-テ-イ-、ラン-ラ-。ドゥン-、ラ-。';

describe('không có chữ nào', () => {
    it('1 · dòng chỉ có một dấu nháy — đúng dòng cuối phiên 14:47 đã lên tường', () => {
        expect(hasNoLetters('"')).toBe(true);
    });

    it('2 · một chữ thôi cũng đủ để được tha', () => {
        // Sàn thấp nhất có thể. Đây là chỗ luật "ngắn quá thì bỏ" sẽ giết nhầm, nên phải ghim.
        expect(hasNoLetters('うん。')).toBe(false);       // → "Ừm." — một lượt đáp thật
        expect(hasNoLetters('Ừ.')).toBe(false);
        expect(hasNoLetters('Cái chức danh')).toBe(false);
        expect(hasNoLetters('5')).toBe(false);
    });

    it('3 · bao nhiêu dấu câu và khoảng trắng cũng vẫn là không có chữ', () => {
        for (const t of ['', '   ', '。。。', '… " ', '?!', '、、、']) {
            expect(hasNoLetters(t), JSON.stringify(t)).toBe(true);
        }
    });
});

describe('cháo âm tiết — phải BẮT', () => {
    it('4 · cả ba dòng đo được ở chỗ nối tiếng Nhật → tiếng Việt', () => {
        for (const t of [SOUP_20, SOUP_25, SOUP_40]) expect(isSyllableSoup(t), t.slice(0, 24)).toBe(true);
    });

    it('5 · và chúng nằm CÁCH XA ngưỡng, không phải sát mép', () => {
        const groups = (t: string) => (t.match(/[-－]+/gu) ?? []).length;
        expect(groups(SOUP_20)).toBeGreaterThanOrEqual(SOUP_MIN_GROUPS * 2);
        expect(groups(SOUP_20) / Array.from(SOUP_20).length).toBeGreaterThan(SOUP_MIN_RATE * 2);
    });
});

describe('cháo âm tiết — phải THA', () => {
    it('6 · người nói lắp thật, tỉ lệ gạch CAO HƠN ngưỡng nhưng ít nhóm', () => {
        // 3 nhóm, tỉ lệ 0,167 — cao hơn SOUP_MIN_RATE. Nếu chỉ đo tỉ lệ thì câu này chết oan.
        const t = 'Thì em cứ l-l-lên-';
        expect((t.match(/[-－]+/gu) ?? []).length / Array.from(t).length).toBeGreaterThan(SOUP_MIN_RATE);
        expect(isSyllableSoup(t)).toBe(false);
    });

    it('7 · dòng dài có nhiều chỗ lắp bắp rải rác — nhiều nhóm nhưng thưa', () => {
        // Nếu chỉ đếm số nhóm mà không đo độ dày thì dạng này chết oan.
        const t = 'Dạ, chắc là, ờ, em sẽ cho-- đây cũng là-- một tính năng chính-- mà em muốn-- nói là-- '
            + 'nó sẽ chạy-- ngay trong-- cái phần đó ạ, tại vì-- mình phải làm cho nó gọn lại một chút.';
        expect((t.match(/[-－]+/gu) ?? []).length).toBeGreaterThanOrEqual(SOUP_MIN_GROUPS);
        expect(isSyllableSoup(t)).toBe(false);
    });

    it('8 · những dòng thật nhiều gạch nhất trong CẢ kho log đều được tha', () => {
        for (const t of [
            'それですね。はい。で、えーと、私は、お-- ついた-- あ、この辺りは、先生たちの-- お-- え-- 資料を入れたのかなと思うんですが。',
            'Ну, какая-то, я не помню, тим-йо-- тим-лидер, да, как-то так.',
            'Và cái video mà- ...của em làm với cái team của Joey á, là chiếu vào đâu đó.',
            'OK, tao-- cái này quay phim nó rất là-- nó rất là kịch tính, có nhiều người.',
            '啊，这个没有，那-那-那-那回去，回去，回去。',
            'Так, а-а-а, вы говорили, что вы пришли в компанию в 2015-м.',
        ]) {
            expect(isSyllableSoup(t), t.slice(0, 30)).toBe(false);
        }
    });

    it('9 · dấu kéo dài của tiếng Nhật KHÔNG phải gạch nối', () => {
        // 「ー」 U+30FC nằm trong chữ thật. Nhầm nó với `-` là xoá tiếng Nhật thật khỏi tường.
        const t = 'コーヒーとサービスとコンピューターとメーカーとデータとサーバーとユーザーとページ。';
        expect(t.includes('ー')).toBe(true);
        expect(isSyllableSoup(t)).toBe(false);
    });

    it('10 · câu bình thường, không gạch nào', () => {
        for (const t of [
            'Quyền lực mềm chính là quyền lực có thể giữ được lâu bền hơn quyền lực cứng.',
            'これをできれば日本語でやってもらったら、この広げる力っていうのはつくんじゃないかなと思います。',
            '',
        ]) {
            expect(isSyllableSoup(t)).toBe(false);
        }
    });
});

describe('ngưỡng — ghim lại lý lẽ, không chỉ con số', () => {
    it('11 · phải khớp CẢ HAI điều kiện, không phải một', () => {
        // Nhiều nhóm mà thưa → tha. Dày mà ít nhóm → tha. Test 6 và 7 ở trên là hai ca thật của đúng
        // hai vế này; đây là bản rút gọn để ý đồ nằm ngay trong tên khẳng định.
        expect(isSyllableSoup('a-'.repeat(SOUP_MIN_GROUPS) + 'x'.repeat(400))).toBe(false);
        expect(isSyllableSoup('a-'.repeat(SOUP_MIN_GROUPS - 1))).toBe(false);
        expect(isSyllableSoup('a-'.repeat(SOUP_MIN_GROUPS))).toBe(true);
    });

    it('12 · khoảng cách với dòng thật nhiều gạch nhất đo được (5 nhóm) là thật', () => {
        expect(SOUP_MIN_GROUPS).toBeGreaterThan(5);
        expect(SOUP_MIN_RATE).toBeGreaterThan(0.05);
        expect(SOUP_MIN_RATE).toBeLessThan(0.328); // dòng cháo loãng nhất
    });
});
```

**`tests/speakGate.test.ts`**

```ts
// tests/speakGate.test.ts — R5: HIỆN và ĐỌC không được chờ chung một lúc.
//
// Bất đối xứng đã nằm sẵn trong lane, viết ngay trên chỗ gọi giọng đọc: "bỏ đọc một câu thì khán phòng
// ĐỌC thay vì NGHE, còn đọc sai một câu là một tràng tiếng đè lên câu kế tiếp". Phụ đề có `lid`, viết đè
// lên chính nó, người ta thấy nó đổi. Giọng đọc thì đã ra loa rồi, mất 3-4 giây để nói xong, không thu về
// được. Nên phụ đề bắn NGAY theo chiều tạm, còn giọng đọc CHỜ trọng tài chốt — có hạn giờ.
//
// Hai điều bộ test này canh chặt nhất, vì hỏng cái nào cũng là hỏng ngoài hội trường:
//   · HẾT GIỜ KHÔNG PHẢI LÀ PHÁN QUYẾT. Trọng tài im lặng không có nghĩa là câu sai chiều. Nếu để hết giờ
//     đọc thành `changed` thì mỗi lần mạng chậm là cả buổi câm.
//   · ĐƯỜNG ĐÃ CHỐT PHẢI THẲNG. Hôm nay trọng tài trả lời đồng bộ ngay trong `acceptFinalText`, tức là
//     luôn chốt xong trước khi giọng đọc hỏi tới. Thêm dù một nhịp `await` thật vào đường đó là làm chậm
//     một thứ đang chạy tốt, để đổi lấy một thứ chưa ai dùng.

import { describe, it, expect } from 'vitest';
import { createSpeakGate } from '../src/lib/lanes/online/speakGate';

describe('đường đã chốt — phải thẳng, không chờ ai', () => {
    it('1 · chốt trước khi hỏi ⇒ trả lời ngay, không tính là một lần chờ', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        g.settle('l1', 'vi');
        const out = await g.wait('l1', 1_000, 'vi');
        expect(out).toEqual({ language: 'vi', changed: false, timedOut: false });
        expect(g.stats().waits).toBe(0);
        expect(g.stats().waitedMs).toBe(0);
    });

    it('2 · và trả lời trong CÙNG một nhịp — không nhường lượt cho timer nào', async () => {
        const g = createSpeakGate();
        g.show('l1', 'ja');
        g.settle('l1', 'ja');
        let landed = false;
        void g.wait('l1', 1_000, 'ja').then(() => { landed = true; });
        await Promise.resolve(); // đúng MỘT nhịp microtask
        expect(landed).toBe(true);
    });
});

describe('chưa chốt — giọng đọc chờ, phụ đề thì không', () => {
    it('3 · chờ tới lúc trọng tài chốt rồi mới trả lời', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        const p = g.wait('l1', 1_000, 'vi');
        let landed = false;
        void p.then(() => { landed = true; });
        await Promise.resolve();
        expect(landed).toBe(false); // vẫn đang chờ — đây mới là điểm của cả tệp
        g.settle('l1', 'vi');
        expect(await p).toEqual({ language: 'vi', changed: false, timedOut: false });
        expect(g.stats().waits).toBe(1);
    });

    it('4 · chốt KHÁC chiều đã hiện ⇒ changed, và câu bị giữ lại không đọc', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi'); // tường đã hiện bản dịch làm theo chiều vi→ja
        const p = g.wait('l1', 1_000, 'vi');
        g.settle('l1', 'ja'); // trọng tài: câu này thật ra là tiếng Nhật
        const out = await p;
        expect(out.changed).toBe(true);
        expect(out.language).toBe('ja');
        expect(g.stats().held).toBe(1);
    });

    it('5 · nhiều câu chờ độc lập nhau — chốt câu này không đánh thức câu kia', async () => {
        const g = createSpeakGate();
        g.show('a', 'vi'); g.show('b', 'vi');
        const pa = g.wait('a', 1_000, 'vi');
        const pb = g.wait('b', 1_000, 'vi');
        let bLanded = false;
        void pb.then(() => { bLanded = true; });
        g.settle('a', 'vi');
        expect(await pa).toMatchObject({ timedOut: false });
        await Promise.resolve();
        expect(bLanded).toBe(false);
        g.settle('b', 'ja');
        expect((await pb).changed).toBe(true);
    });
});

describe('hết giờ KHÔNG phải là một phán quyết', () => {
    it('6 · hết giờ ⇒ đi tiếp bằng chiều đã hiện, và KHÔNG được kết luận là sai chiều', async () => {
        const g = createSpeakGate();
        g.show('l1', 'ja');
        const out = await g.wait('l1', 5, 'vi');
        expect(out.timedOut).toBe(true);
        expect(out.language).toBe('ja'); // đọc to lên đúng thứ người ta đang đọc trên tường
        expect(out.changed).toBe(false); // ← câu quan trọng nhất tệp này: im lặng ≠ sai
        expect(g.stats().timedOut).toBe(1);
        expect(g.stats().held).toBe(0);
    });

    it('7 · chưa hiện gì cả thì hết giờ rơi về chiều dự phòng phía gọi đưa vào', async () => {
        const g = createSpeakGate();
        expect((await g.wait('l1', 5, 'ja')).language).toBe('ja');
    });

    it('8 · trọng tài chốt MUỘN sau khi đã hết giờ thì không lật ngược phán quyết đã trả', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        const p = g.wait('l1', 5, 'vi');
        await new Promise((r) => setTimeout(r, 25));
        g.settle('l1', 'ja'); // muộn — câu đã đi rồi
        const out = await p;
        expect(out.timedOut).toBe(true);
        expect(out.changed).toBe(false);
        expect(out.language).toBe('vi');
    });
});

describe('dọn dẹp — không treo lời hứa, không phình bộ nhớ', () => {
    it('9 · reset() đánh thức mọi câu đang chờ, không để treo qua lần bấm Dừng', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        const p = g.wait('l1', 60_000, 'vi'); // hạn giờ dài — chỉ reset mới cứu được
        g.reset();
        expect(await p).toMatchObject({ language: 'vi' }); // không treo là đủ; phía gọi có cửa sessionGen
        expect(g.stats().waits).toBe(0); // reset xoá luôn số đếm của phiên cũ
    });

    it('10 · forget() quên hẳn một câu — hỏi lại là như chưa từng thấy', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        g.settle('l1', 'vi');
        g.forget('l1');
        const out = await g.wait('l1', 5, 'ja');
        expect(out.timedOut).toBe(true);
        expect(out.language).toBe('ja'); // không còn `shown` nào để rơi về
    });

    it('11 · đếm được tổng thời gian giọng đọc đã phải chờ — để đo, không để đoán', async () => {
        const g = createSpeakGate();
        g.show('l1', 'vi');
        const p = g.wait('l1', 1_000, 'vi');
        await new Promise((r) => setTimeout(r, 20));
        g.settle('l1', 'vi');
        await p;
        expect(g.stats().waitedMs).toBeGreaterThanOrEqual(15);
    });
});
```

**`tests/scriptCoverage.test.ts`**

```ts
// tests/scriptCoverage.test.ts — cổng "ĐÃ NGHE HẾT DÒNG CHƯA", cho cả hai đường đọc kịch bản.
//
// Vì sao có tệp này. Cả bộ khớp tự động lẫn dẫn tay đều đo bằng Dice, và Dice là một phép đo ĐỐI XỨNG:
// nó hỏi "hai chuỗi này giống nhau bao nhiêu", không hỏi "chuỗi nghe được đã phủ hết dòng chưa". Với một
// tiền tố dài `p` của dòng dài `L`, Dice = 2p/(p+L):
//
//     MC mới đọc   1/4 dòng → 0.40      1/3 dòng → 0.50      1/2 dòng → 0.67      3/4 dòng → 0.86
//
// Sàn của dẫn tay là 0.45, nên **đọc được một phần ba dòng là máy nhả nguyên văn cả dòng ra loa**. Sàn
// snap tự động là 0.82, và cửa `lengthTolerance 0.35` cho lọt tiền tố từ 65% trở lên — nên ở 3/4 dòng
// (0.86) nó cũng nhả. Đó chính là "kịch bản nhảy trước MC".
//
// Phép đo đúng cho câu hỏi này là ĐỘ PHỦ, tức recall của bigram DÒNG: shared / bigram(dòng). Nó tuyến
// tính theo phần đã đọc (1/3 dòng → 0.33) thay vì bị Dice kéo lên 0.50. Và khi hai bên dài bằng nhau thì
// recall ≈ Dice, nên đặt sàn phủ NGAY DƯỚI sàn snap không lấy mất một ca khớp đúng nào — nó chỉ cắt đúng
// cái góc tiền tố.
//
// `tailRecall` là cửa thứ hai, và là cửa hợp với dẫn tay: nó chỉ hỏi phần ĐUÔI dòng có mặt hay không. Một
// tiền tố luôn trượt (đuôi chưa được nói ra), còn một câu nghe SAI nhưng đã đọc trọn dòng thì vẫn qua —
// đúng cái mà dẫn tay cần giữ, vì sàn thấp của nó sinh ra để tha thứ cho nghe nhầm, không phải để tha thứ
// cho đọc thiếu.

import { describe, it, expect } from 'vitest';
import {
    coverageOf,
    createScriptMatcher,
    normalizeForMatch,
    DEFAULT_SCRIPT_MATCH_CONFIG,
    type ScriptMatcherEntry,
} from '../src/lib/lanes/online/scriptMatcher';
import { judgeGuided, GUIDED_FLOOR, type GuidedState } from '../src/lib/lanes/online/guidedScript';

const LINE_VI = 'Kính thưa quý vị đại biểu, quý vị khách quý, cùng toàn thể cán bộ nhân viên Esuhai.';
const LINE_JA = 'ご来賓の皆様、ご列席の皆様、そしてエスハイ社員の皆様。';

/** Đúng những gì MC đã kịp đọc ra khi máy nhả câu — cắt theo mắt, tỉ lệ được khẳng định ngay dưới. */
const READ_A_THIRD = 'Kính thưa quý vị đại biểu,';
const READ_THREE_QUARTERS = 'Kính thưa quý vị đại biểu, quý vị khách quý, cùng toàn thể cán bộ';

const ratio = (heard: string, line: string) =>
    normalizeForMatch(heard).length / normalizeForMatch(line).length;

const row = (over: Partial<ScriptMatcherEntry> = {}): ScriptMatcherEntry => ({
    id: 'r1', src_lang: 'vi', src: LINE_VI, dst_lang: 'ja', dst: LINE_JA, status: 'approved', ...over,
});

const armed = (index: number): GuidedState => ({ armed: true, index });

// ---------------------------------------------------------------------------
describe('phép đo độ phủ', () => {
    it('1 · hai mẩu cắt ở trên đúng là 1/3 và 3/4 dòng — mọi con số dưới đây dựa vào đó', () => {
        expect(ratio(READ_A_THIRD, LINE_VI)).toBeGreaterThan(0.28);
        expect(ratio(READ_A_THIRD, LINE_VI)).toBeLessThan(0.40);
        expect(ratio(READ_THREE_QUARTERS, LINE_VI)).toBeGreaterThan(0.68);
        expect(ratio(READ_THREE_QUARTERS, LINE_VI)).toBeLessThan(0.82);
    });

    it('2 · đọc trọn dòng ⇒ phủ 1.0 và đuôi 1.0', () => {
        const c = coverageOf(LINE_VI, LINE_VI);
        expect(c.recall).toBe(1);
        expect(c.tailRecall).toBe(1);
    });

    // Hai khẳng định đuôi dưới đây KHÔNG đòi bằng 0 tuyệt đối: bigram ký tự luôn có va chạm ngẫu nhiên
    // ("nh", "an", "ie" có mặt ở khắp nơi trong tiếng Việt). Cái đáng đo là KHOẢNG CÁCH: tiền tố cho đuôi
    // ~0.2, còn một câu đọc trọn dòng dù nghe sai vẫn cho ~0.7 (ca 5). Sàn 0.5 nằm giữa hai đám đó.
    it('3 · tiền tố 1/3 dòng ⇒ phủ ~1/3 và đuôi gần như trắng — Dice cùng lúc đó đang là ~0.5', () => {
        const c = coverageOf(READ_A_THIRD, LINE_VI);
        expect(c.recall).toBeGreaterThan(0.2);
        expect(c.recall).toBeLessThan(0.45);
        expect(c.tailRecall).toBeLessThan(0.35);
    });

    it('4 · tiền tố 3/4 dòng vẫn trượt ở đuôi — đây là ca snap tự động đang nhả', () => {
        // Đo được: phủ 0.774 · đuôi 0.467. Đem so với ca 5 (phủ 0.919 · đuôi 1.0) thì thấy ngay đuôi mới
        // là chỗ hai đám tách hẳn ra, còn phủ thì hai đám gần nhau.
        const c = coverageOf(READ_THREE_QUARTERS, LINE_VI);
        expect(c.recall).toBeLessThan(0.8);
        expect(c.tailRecall).toBeLessThan(0.55);
    });

    it('5 · đọc TRỌN dòng nhưng máy nghe sai vài chữ ⇒ vẫn qua cả hai cửa', () => {
        // "quý vị" → "quí vị", "cán bộ" → "cáng bộ", "Esuhai" → "Ê su hai": đúng loại nhiễu thật.
        const misheard = 'Kính thưa quí vị đại biểu, quí vị khách quý, cùng toàn thể cáng bộ nhân viên Ê su hai.';
        const c = coverageOf(misheard, LINE_VI);
        expect(c.recall).toBeGreaterThan(0.7);
        expect(c.tailRecall).toBeGreaterThan(0.5);
    });

    it('6 · dòng rỗng hoặc câu rỗng không bao giờ ném lỗi, và không bao giờ là phủ đủ', () => {
        expect(coverageOf('', LINE_VI)).toEqual({ recall: 0, tailRecall: 0 });
        expect(coverageOf(LINE_VI, '')).toEqual({ recall: 0, tailRecall: 0 });
    });
});

// ---------------------------------------------------------------------------
describe('dẫn tay — không nhả dòng khi MC mới đọc một phần', () => {
    it('7 · MỘT PHẦN BA dòng KHÔNG được nhả (trước cổng này thì được, vì Dice 0.5 > sàn 0.45)', () => {
        const v = judgeGuided(armed(0), [row()], READ_A_THIRD, GUIDED_FLOOR);
        expect(v.kind).toBe('mismatch');
        if (v.kind === 'mismatch') expect(v.reason).toMatch(/mới nghe|phủ|chưa hết/i);
    });

    it('8 · BA PHẦN TƯ dòng cũng chưa được nhả — đuôi vẫn chưa ra khỏi miệng MC', () => {
        expect(judgeGuided(armed(0), [row()], READ_THREE_QUARTERS, GUIDED_FLOOR).kind).toBe('mismatch');
    });

    it('9 · đọc TRỌN dòng ⇒ nhả nguyên văn, đúng như trước', () => {
        const v = judgeGuided(armed(0), [row()], LINE_VI, GUIDED_FLOOR);
        expect(v.kind).toBe('release');
        if (v.kind === 'release') {
            expect(v.target).toBe(LINE_JA);
            expect(v.language).toBe('ja');
        }
    });

    it('10 · đọc trọn dòng mà nghe sai vài chữ VẪN nhả — sàn thấp của dẫn tay sinh ra để tha thứ chuyện đó', () => {
        const misheard = 'Kính thưa quí vị đại biểu, quí vị khách quý, cùng toàn thể cáng bộ nhân viên Ê su hai.';
        expect(judgeGuided(armed(0), [row()], misheard, GUIDED_FLOOR).kind).toBe('release');
    });

    it('11 · đọc dòng bằng tiếng Nhật (chiều ngược) cũng phải qua cổng phủ như thường', () => {
        const rows = [row()];
        expect(judgeGuided(armed(0), rows, LINE_JA, GUIDED_FLOOR).kind).toBe('release');
        // Hai phần ba dòng: Dice 0.68, thừa sức vượt sàn 0.45 — trước cổng phủ thì nhả.
        expect(judgeGuided(armed(0), rows, 'ご来賓の皆様、ご列席の皆様、', GUIDED_FLOOR).kind).toBe('mismatch');
    });

    it('12 · DÒNG NGẮN vẫn nhả được — cổng phủ không được giết lại ca "Kanpai!"', () => {
        const short = row({ src: 'Một, hai, ba — Kanpai!', dst: 'いち、に、さん — 乾杯！' });
        expect(judgeGuided(armed(0), [short], 'Một, hai, ba — Kanpai!', GUIDED_FLOOR).kind).toBe('release');
    });

    it('13 · "thả cửa" (sàn 0) vẫn bỏ qua MỌI phép đo, kể cả cổng phủ — người bấm là bằng chứng', () => {
        expect(judgeGuided(armed(0), [row()], READ_A_THIRD, 0).kind).toBe('release');
    });
});

// ---------------------------------------------------------------------------
describe('khớp tự động — cùng một cổng, đặt ngay dưới sàn snap nên không mất ca đúng nào', () => {
    it('14 · tiền tố 3/4 dòng KHÔNG còn snap (Dice của nó là 0.86, trên sàn 0.82)', () => {
        const m = createScriptMatcher([row()]);
        const r = m.match(READ_THREE_QUARTERS, 'vi');
        expect(r.band).not.toBe('snap');
        expect(r.reason).toMatch(/mới nghe|phủ|chưa hết/i);
    });

    it('15 · đọc trọn dòng vẫn snap — cổng phủ không được lấy mất cái nó không nhắm tới', () => {
        const m = createScriptMatcher([row()]);
        const r = m.match(LINE_VI, 'vi');
        expect(r.band).toBe('snap');
        expect(r.scriptTarget).toBe(LINE_JA);
    });

    it('16 · đọc trọn dòng với 6% nghe nhầm vẫn snap', () => {
        const m = createScriptMatcher([row()]);
        const r = m.match('Kính thưa quý vị đại biểu, quý vị khách quí, cùng toàn thể cán bộ nhân viên Esuhai.', 'vi');
        expect(r.band).toBe('snap');
    });

    it('17 · đọc hai dòng liền hơi ⇒ khớp đúng CHUỖI HAI DÒNG, không phải chuỗi ba', () => {
        const rows: ScriptMatcherEntry[] = [
            row({ id: 'a', src: 'Kính thưa quý vị đại biểu.', dst: 'ご来賓の皆様。' }),
            row({ id: 'b', src: 'Kính thưa quý vị khách quý.', dst: 'ご列席の皆様。' }),
            row({ id: 'c', src: 'Kính thưa toàn thể cán bộ nhân viên Esuhai.', dst: 'エスハイ社員の皆様。' }),
        ];
        const m = createScriptMatcher(rows);
        const r = m.match('Kính thưa quý vị đại biểu. Kính thưa quý vị khách quý.', 'vi');
        expect(r.band).toBe('snap');
        expect(r.entryIds).toEqual(['a', 'b']);
    });

    it('18 · sàn phủ nằm ngay DƯỚI sàn snap — bất biến giữ cho cổng này không bao giờ tự cắt ca đúng', () => {
        expect(DEFAULT_SCRIPT_MATCH_CONFIG.coverageFloor).toBeLessThan(DEFAULT_SCRIPT_MATCH_CONFIG.snapThreshold);
        expect(DEFAULT_SCRIPT_MATCH_CONFIG.coverageFloor).toBeGreaterThan(DEFAULT_SCRIPT_MATCH_CONFIG.suggestThreshold);
    });

    it('19 · trượt cổng phủ thì HẠ XUỐNG "gợi ý", không im lặng — người điều khiển vẫn thấy dòng', () => {
        const m = createScriptMatcher([row()]);
        expect(m.match(READ_THREE_QUARTERS, 'vi').band).toBe('suggest');
    });
});
```

## TASK 116 — Bốn tệp test có sẵn

Lý do từng tệp nằm ở bảng đầu bản này. Không tệp nào bị nới ca cho dễ đậu.

**Tệp: `tests/segmentDirectionLock.test.ts`** — 1 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Find and replace:

```ts
        expect(fn).toContain('if (!interim) settledDir.set(lid, directionOf(source))')
    })

    it('6 · nhãn tiếng của nhà cung cấp KHÔNG được ghi đè khoá', () => {
        expect(LANE).toContain("if (twoWay && tracker && !lockedSource && decided.language && decided.basis !== 'none')")
    })

    it('7 · turn split của M11 đứng im — câu trích dẫn không được cắt câu làm đôi', () => {
        expect(LANE).toContain('if (twoWay && !lockedSource && decided.language && segmentBuffer.trim())')
    })
})

```

with

```ts
        expect(fn).toContain('if (!interim) settledDir.set(lid, directionOf(source))')
    })

    // 06/08 — hai khẳng định dưới đây đổi CHỮ chứ không đổi Ý. Việc chốt tiếng của một câu đã xong nay do
    // `directionRouter` làm (`routedLang`) chứ không do `decideFinalLanguage` (`decided.language`) nữa;
    // điều phải giữ nguyên — và đó mới là thứ bộ test này canh — là `!lockedSource` vẫn đứng trong cả hai
    // điều kiện. Mất nó ở một trong hai chỗ là bảng chương trình hết quyền, và câu trích dẫn lại lật chiều.
    it('6 · nhãn tiếng của nhà cung cấp KHÔNG được ghi đè khoá', () => {
        expect(LANE).toContain('if (twoWay && tracker && router && !lockedSource && routedLang)')
    })

    it('7 · turn split của M11 đứng im — câu trích dẫn không được cắt câu làm đôi', () => {
        expect(LANE).toContain('if (twoWay && !lockedSource && routedLang && segmentBuffer.trim())')
    })
})

```


**Tệp: `tests/guidedRelease.test.ts`** — 1 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Find and replace:

```ts

    // trượt thì RƠI XUỐNG, không return — đây là ca 5 ở phía mã nguồn
    expect(lane).toContain('guidedMisses += 1;')
    expect(lane).toContain('void speakSnap(verdict.target, verdict.language, lid, order)')
  })
})
```

with

```ts

    // trượt thì RƠI XUỐNG, không return — đây là ca 5 ở phía mã nguồn
    expect(lane).toContain('guidedMisses += 1;')
    // R5 (06/08): speakSnap nay nhận thêm chiều NGUỒN, để cổng "hiện tách khỏi đọc" có thứ mà đối chiếu
    // với phán quyết của router. Ý của khẳng định này không đổi — nhả dẫn tay vẫn phải ĐỌC LÊN.
    expect(lane).toContain('void speakSnap(verdict.target, verdict.language, guidedSource, lid, order)')
  })
})
```


**Tệp: `tests/guidedDeaf.test.ts`** — 1 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Find and replace:

```ts
    it('4 · nhả một dòng kịch bản là ngủ, và nhớ mình ngủ ở dòng nào', () => {
        const at = LANE.indexOf("if (verdict.kind === 'release')")
        expect(at).toBeGreaterThan(-1)
        const block = LANE.slice(at, at + 1400)
        expect(block).toContain('guidedDeafAtIndex = guided.index')
        expect(block).toContain('guidedDeafSince = Date.now()')
        // Ngủ SAU khi câu đã lên tường và đã vào bản ghi buổi — không được nuốt mất chính câu vừa nhả.
```

with

```ts
    it('4 · nhả một dòng kịch bản là ngủ, và nhớ mình ngủ ở dòng nào', () => {
        const at = LANE.indexOf("if (verdict.kind === 'release')")
        expect(at).toBeGreaterThan(-1)
        // Cửa sổ nới 1400 → 2200 sau khi R5 chèn cổng "hiện tách khỏi đọc" vào giữa khối này. Con số chỉ
        // là bề rộng đủ để bọc trọn nhánh `release`, không mang ý nghĩa gì khác.
        const block = LANE.slice(at, at + 2200)
        expect(block).toContain('guidedDeafAtIndex = guided.index')
        expect(block).toContain('guidedDeafSince = Date.now()')
        // Ngủ SAU khi câu đã lên tường và đã vào bản ghi buổi — không được nuốt mất chính câu vừa nhả.
```


**Tệp: `tests/guidedMatch.test.ts`** — 2 khối. Mỗi khối: tìm đoạn thứ nhất, thay bằng đoạn thứ hai.

**(a)** Find and replace:

```ts
import {
  judgeGuided,
  guidedBarFor,
  GUIDED_FLOOR,
  GUIDED_MIN_CHARS,
  GUIDED_SHORT_LINE,
```

with

```ts
import {
  judgeGuided,
  guidedBarFor,
  guidedSimilarity,
  GUIDED_FLOOR,
  GUIDED_MIN_CHARS,
  GUIDED_SHORT_LINE,
```

**(b)** Find and replace:

```ts
    expect(v.kind).toBe('release')
  })

  it('12 · nấc "Chặt" vẫn chặn được câu na ná mà nấc "Thường" cho qua', () => {
    const rows = [row({ src: 'Kính thưa quý vị đại biểu và toàn thể quý khách', dst: 'ご来賓の皆様' })]
    const heard = 'Kính thưa quý vị đại biểu'
    const loose = judgeGuided(armed, rows, heard, 0.3)
    const strict = judgeGuided(armed, rows, heard, 0.9)
    expect(loose.kind).toBe('release')
    expect(strict.kind).toBe('mismatch')
  })

  it('13 · dòng chưa duyệt thì không nấc nào nhả được — kể cả "thả cửa"', () => {
```

with

```ts
    expect(v.kind).toBe('release')
  })

  // Ca này trước đây dùng một TIỀN TỐ ("Kính thưa quý vị đại biểu" của dòng dài gấp đôi) rồi khẳng định
  // nấc lỏng phải NHẢ. Đó chính là lỗi "kịch bản nhảy trước MC": bốn nấc sinh ra để cân xem câu nghe được
  // GIỐNG dòng tới đâu, không phải để cân xem MC đã đọc XONG dòng chưa. Nay câu thử là một lượt đọc TRỌN
  // dòng nhưng nghe sai vài chữ — đúng thứ bốn nấc phải cân — và ca 12b dưới khoá lại phần còn lại.
  it('12 · nấc "Chặt" vẫn chặn được câu na ná mà nấc "Thường" cho qua', () => {
    const rows = [row({ src: 'Kính thưa quý vị đại biểu và toàn thể quý khách', dst: 'ご来賓の皆様' })]
    const heard = 'Kính thưa quý bà quý ông và toàn thể quý khách'
    const score = guidedSimilarity(heard, rows[0].src)
    expect(score).toBeGreaterThan(0.3)   // fixture phải nằm GIỮA hai nấc, nếu không ca này không đo gì cả
    expect(score).toBeLessThan(0.82)
    expect(judgeGuided(armed, rows, heard, 0.3).kind).toBe('release')
    expect(judgeGuided(armed, rows, heard, 0.82).kind).toBe('mismatch')
  })

  it('12b · KHÔNG nấc nào nhả một dòng MC mới đọc được một nửa — kể cả nấc lỏng nhất', () => {
    const rows = [row({ src: 'Kính thưa quý vị đại biểu và toàn thể quý khách', dst: 'ご来賓の皆様' })]
    const half = 'Kính thưa quý vị đại biểu'
    for (const floor of [0.3, 0.45, 0.6, 0.82]) {
      const v = judgeGuided(armed, rows, half, floor)
      expect(v.kind, `sàn ${floor}`).toBe('mismatch')
    }
  })

  it('13 · dòng chưa duyệt thì không nấc nào nhả được — kể cả "thả cửa"', () => {
```


---

## Kiểm nhanh bằng mắt sau khi áp

1. `npx tsc --noEmit` — không lỗi. `npx vitest run` — **1147 ca / 79 tệp**. `npm run build` — xanh.
2. Mở màn điều khiển online, bật chạy **hai chiều**. Thanh bên phải có thêm nút **"Đường tiếng thứ hai"**.
3. Bảng chẩn đoán phải có bốn dòng mới: `chiều dịch nhờ: …`, `máy nghe đọc lại: bỏ … · cắt đầu …`,
   `mượn nhãn kề bên … câu`, và `trần 25s chờ khe im … lần`.
4. Nói một câu tiếng Việt rồi một câu tiếng Nhật. Dòng `chiều dịch: …` phải đổi theo, và cho biết **cái gì**
   đã quyết (máy nghe gọi tên / thấy dấu thanh / thấy chữ kana / mượn nhãn câu kề bên / theo nguồn tiếng).
5. Bấm **"Đường tiếng thứ hai"** rồi chọn một tab đang phát tiếng, **nhớ tích ô chia sẻ âm thanh**. Nếu quên
   tích thì phải hiện lời nhắn từ chối, chứ không được im lặng nhận.
