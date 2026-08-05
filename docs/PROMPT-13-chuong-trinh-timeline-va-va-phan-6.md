# PROMPT-13 — Chương trình chạy theo Timeline · vá lỗi còn lại của PHẦN 6 · ba việc khi dẫn kịch bản

<context>
Chạy **SAU khi PROMPT-11 PHẦN 6 đã xong và đã commit**. Mọi khối `Find and replace` bên dưới được đối
chiếu byte-for-byte với **commit `e22cfd6`** ("PROMPT-11 PHẦN 6/6 — dẫn theo kịch bản, và vá gấp cửa sổ bỏ
câu").

**Kiểm nền trước khi làm gì cả** (nhánh `develop`):

```bash
git merge-base --is-ancestor e22cfd6 HEAD && echo "nền OK"
```

Không in ra `nền OK` thì **dừng lại và báo** — nghĩa là PHẦN 6 chưa có trong nhánh này.

Đừng so `git log --oneline -1` với một mã cụ thể: **PROMPT-12 chạy trước PROMPT-13** (xem phần thứ tự bên
dưới), nên lúc bạn bắt đầu đọc tệp này thì `HEAD` đã là commit của PROMPT-12 rồi — đúng như vậy. Điều cần
đúng chỉ là `e22cfd6` **nằm trong** lịch sử của `HEAD`. Còn `867acda` chỉ là commit lưu tệp prompt vào
`docs/`, không đụng tệp nào dưới `src/`, nên có hay không có nó đều không ảnh hưởng.

**PROMPT-12 chưa chạy thì dừng lại**, chạy PROMPT-12 xong rồi hãy quay lại đây.

**Đọc phần này trước.** PHẦN 6 được gửi trước khi soát xong, và soát sau tìm ra **bốn lỗi**. Bạn đã tự tìm
và vá **ba trong bốn** cái đó trước khi commit — tôi đã kiểm lại từng cái trong `e22cfd6` và cả ba đều
đúng, riêng cái ④ bạn làm **kỹ hơn bản tôi định gửi** (bạn ghi cả `?language=<vi|ja>` và hình dạng phản hồi
thật). Không phải làm lại gì cả. Bảng dưới đây để bạn đối chiếu, không phải để làm:

| # | Lỗi | Hậu quả nếu còn | Tình trạng |
|---|---|---|---|
| ① | `speakerModeRef` đặt TRƯỚC `useState('script')` khai ra `speakerMode` | `ReferenceError` (TDZ) ngay render đầu ⇒ **màn điều khiển trắng** | ✅ bạn đã vá trong `e22cfd6` (ref nay ở dòng 337, sau `useState` ở dòng 282) |
| ② | `tests/sessionTranscriptFields.test.ts` ghim `recordSessionLine` gọi đúng 4 chỗ; PHẦN 6 thêm chỗ thứ 5 | bộ test **không bao giờ xanh** | ✅ bạn đã vá (nay ghim 5 chỗ gọi · 2 chỗ bật cờ · 3 chỗ bốn đối số) |
| ④ | Hợp đồng có **hai mục "8."** | tài liệu tự mâu thuẫn | ✅ bạn đã vá (`/voices` nay là mục 11, đúng số, đúng chỗ) |
| ③ | Bảng dẫn neo nhầm vào biến `prepCounts` | bảng dẫn **không có trên màn chạy**, chỉ hiện trong hai popup Chuẩn bị, và vẽ **hai lần** | ❌ **còn nguyên** — TASK 58 viết lại hẳn |

Lỗi ③ là lý do bạn không bấm thử được bảng dẫn: nó **không nằm trên màn chạy**. Không phải vì máy thiếu
khoá dịch vụ. Việc duy nhất của TASK 51 bây giờ là dọn mấy dòng CSS chết mà lỗi đó để lại.

**Rồi tới việc lớn.** Buổi lễ 20 năm ngày 08/08 dài khoảng bốn tiếng, hơn sáu mươi đoạn. Trong đó có
khoảng mười bảy đoạn mà máy **bắt buộc phải câm**: video, bài hát, Yosakoi, chụp ảnh, tiệc. Hôm nay người
điều khiển phải tự nhớ từng đoạn đó và bấm tay bốn ô khác nhau mỗi lần đổi người: ai đang nói · kiểu nói ·
nghe hay câm · con trỏ dòng kịch bản. Bốn tiếng, sáu mươi lần, giữa hội trường tối. Đó là chỗ hỏng.

PROMPT-13 dựng **Chương trình (Timeline)**: soạn trước một lần ở màn Chuẩn bị, chạy buổi lễ thì mỗi đoạn
chỉ còn **một cú bấm "Phần sau"**, và cú bấm đó đặt cả bốn thứ cùng lúc.

Kèm theo là ba việc nhỏ nhưng cần thiết, đều rút ra từ tổng duyệt 01/08 và từ chính kịch bản 04/08:

1. **Khoá chiều dịch theo người.** Một người nói MỘT thứ tiếng. Khách Nhật mở lời bằng "Xin chào" thì đó
   là một câu **trích dẫn**, không phải đổi người nói — chiều dịch vẫn là Nhật → Việt. Máy đọc chữ nên máy
   thấy tiếng Việt và lật chiều, rồi cắt câu làm đôi. Chỉ Chương trình mới biết ai đang cầm micro.
2. **Tự câm khi MC bên kia đọc bản dịch.** Nhả xong một dòng kịch bản thì trong phòng chỉ còn đúng một
   việc: MC bên kia đọc bản dịch. Máy nghe tiếp là chép lời người thứ hai và đẩy rác lên tường.
3. **Độ khớp khi dẫn kịch bản chọn được.** Sàn 0,45 là số cứng trong mã, và nó chặn đúng ba dòng người
   điều khiển CẦN: `Một...` · `Hai...` · `Kanpai!` đều nằm trong kịch bản, bấm đúng dòng, mà máy không nhả
   vì câu quá ngắn. Micro đã sát miệng và đã có một lớp chặn ồn ở trước — thêm một lớp lọc cứng nữa là quá
   tay.

Và **TASK 61**, thêm sau cùng, không thuộc ba việc trên: một nút **"Xoá hết"** ở màn Kịch bản. Kịch bản
04/08 thay hẳn bản 24/07 — đo bằng chính `scriptMatcher.ts` thì chỉ **24 trong 40** câu duyệt còn dùng
được. Mà màn Kịch bản hôm nay chỉ biết **cộng thêm**, không biết thay: muốn đổi kịch bản phải bấm xoá từng
dòng một, bốn mươi lần, và nhập đè lên thì dòng lặp làm bộ khớp **thôi nhả** đúng những câu đang chạy tốt.
Lý do đầy đủ nằm ở TASK 61.

**Thứ tự với PROMPT-12 — quan trọng, và tôi đã sửa lại so với lần trước.** Chạy **PROMPT-12 trước,
PROMPT-13 sau**. Thứ tự này **không đảo được**, và đây là lý do:

Hai prompt cùng đụng đúng một dòng `import` trong `src/pages/Settings.tsx`. PROMPT-12 **thêm một dòng mới
bên dưới** dòng đó; PROMPT-13 **sửa chính dòng đó**. Chạy PROMPT-12 trước thì dòng gốc còn nguyên, nên khối
của PROMPT-13 vẫn khớp. Chạy ngược lại thì dòng gốc đã đổi và **khối của PROMPT-12 không còn tìm thấy gì**.
Tôi đã thử cả hai chiều trên cây thật để chắc điều này, không phải suy đoán.

Ngoài dòng đó ra, hai prompt không đụng nhau: PROMPT-12 sửa `schedule.ts` ở hàm `write()`, PROMPT-13 sửa ở
phần khai kiểu và ở `normConf`. Và vì PROMPT-12 đồng bộ **nguyên khối** lịch lên kho, `Conference.segments`
mà PROMPT-13 thêm vào đi theo miễn phí, không phải sửa gì thêm.
</context>

<what_you_must_not_do>
- **Không sửa `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`,
  `src/lib/lanes/types.ts`.** Không một dòng nào của PROMPT-13 cần tới bốn tệp đó.
- **Không để `src/lib/lanes/online/` import THẲNG `src/lib/schedule.ts`.** Ranh giới thật nằm ở chỗ khác:
  **facade của làn** (`applySegment`) nhận **dữ liệu thuần** — `{ speakerName, mode, listen, scriptIndex,
  language }` — chứ **không** nhận đối tượng `Segment`. Đó là lý do `SegmentMode` được khai lại y hệt
  trong `schedule.ts` thay vì import từ làn. Giữ đúng chỗ đó là đủ.

  **Một chỗ đi chệch luật này, và là cố ý — đừng "sửa cho đúng luật".** TASK 58.3(a) cho
  `OnlineConsole.tsx` import `../../../segments`, mà `src/lib/segments.ts` lại `import { uid } from
  './schedule'`. Tức màn điều khiển kéo `schedule.ts` vào theo đường bắc cầu. Tôi biết và tôi chấp nhận:
  màn điều khiển là **giao diện**, nó vốn đã đọc `prepData`, `scriptLoad`, `kbscope`, `ActiveEventContext`
  từ ngoài làn ra rồi (xem đầu tệp ở nền). Thứ **không** được chệch là đường dữ liệu chạy thật —
  `onlineLane.ts` tuyệt đối không biết `Segment` là gì, và nó vẫn không biết. Nếu bạn thấy dòng import đó
  rồi định gỡ ra cho "sạch luật": **đừng**, gỡ là vỡ chín khối của TASK 58.

  (Ghi cho rõ: `CLAUDE.md` luật 2 **không** cấm việc này — luật 2 chặn chiều ngược lại, tệp ngoài làn
  import vào trong làn. Đây là luật riêng của tôi cho prompt này, và trên đây là ngoại lệ duy nhất.)
- **Không thêm trường nào vào `ScriptEntry`.** Hợp đồng của nó với Cascade Matcher là byte-đối-byte, và
  `normEntry` dựng lại từng trường một nên mọi trường lạ bị nuốt im lặng. **Đoạn trỏ TỚI dòng kịch bản;
  dòng kịch bản không bao giờ khai mình thuộc đoạn nào.**
- **Không đổi tham số `language` gửi lên máy nghe.** Khoá chiều chỉ khoá **chiều dịch** — thứ chạy hoàn
  toàn trong máy. Máy nghe vẫn để `'auto'` để một câu tiếng Việt trích dẫn vẫn được chép đúng là tiếng
  Việt, và để không phải mở lại kết nối giữa buổi lễ.
- **Không thêm dependency.** Không thư viện phân tích HTML, không thư viện lịch, không state manager.
- Không đặt tên nhà cung cấp, tên biến môi trường của khóa, tên model hay địa chỉ API vào bất cứ đâu dưới
  `src/`.
- **Không đổi hành vi mặc định của một buổi chưa dựng Timeline.** `Conference.segments` vắng mặt là bình
  thường; buổi đó phải chạy **y hệt hôm nay**, từng ô bấm tay như cũ.
</what_you_must_not_do>

---

## TASK 51 — `src/index.css`: dọn CSS chết của PHẦN 6 (làm trước, làm riêng)

PHẦN 6 §35.2(d) và §36.2(c) bảo viết CSS cho `.guided-panel`, `.guided-list`, `.guided-line`,
`.guided-line-now`, `.guided-buttons`, `.guided-draft`, `.guided-speaker`, `.guided-hint`,
`.guided-blocked`, `.guided-num`, `.guided-readout`, `.guided-note`.

Đó là một sai lầm của tôi, và ảnh chụp màn hình cho thấy hậu quả: cả ứng dụng này dùng Tailwind +
Material 3, còn những lớp đó là ô nhập trần của trình duyệt nhét vào một cột rộng 248px — danh sách 40
dòng kịch bản không đọc nổi. TASK 58 viết lại toàn bộ khối đó bằng đúng ngôn ngữ thiết kế của ứng dụng và
**không dùng một lớp `guided-` nào nữa**, nên mấy chục dòng CSS này thành rác: không ai dùng, nhưng người
đọc sau sẽ tưởng còn dùng và cố giữ cho khớp với một component đã không còn nhắc tới chúng.

Khối này nằm ở **cuối** `src/index.css`. Find and replace:

```css
@media (prefers-reduced-motion: reduce) { .sub-para { transition: none; } }


/* TASK 35 — "dẫn theo kịch bản": the operator's paper script, on screen, during a ceremony.
   Sized for a finger in a dark hall rather than a mouse under office light. */
.guided-panel { margin-top: 0.5rem; padding: 0.5rem 0.625rem; border: 1px solid var(--color-outline-variant); border-radius: 0.5rem; background: var(--color-surface-container-low); }
.guided-readout { margin-top: 0.25rem; color: var(--color-on-surface-variant); }
.guided-buttons { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
.guided-buttons button { min-height: 2.5rem; flex: 1; border: 1px solid var(--color-outline-variant); border-radius: 0.5rem; background: var(--color-surface-container); color: var(--color-on-surface); }
.guided-buttons button:disabled { opacity: 0.4; cursor: not-allowed; }
/* Scrolls inside itself so a 60-line script never pushes the rest of the console off the screen. */
.guided-list { max-height: 40vh; overflow-y: auto; margin-top: 0.5rem; padding-left: 0; list-style: none; }
.guided-line { display: flex; gap: 0.5rem; align-items: baseline; min-height: 2rem; padding: 0.375rem 0.5rem; cursor: pointer; border-radius: 0.375rem; }
.guided-line:hover { background: var(--color-surface-container); }
.guided-num { min-width: 2ch; text-align: right; color: var(--color-on-surface-variant); font-variant-numeric: tabular-nums; }
/* The ONE thing on screen that answers "where does the machine think we are". It has to be unmissable. */
.guided-line-now { background: var(--color-surface-container-high); font-weight: 700; color: var(--color-on-surface); box-shadow: inset 3px 0 0 var(--gold-line, #f4d06a); }
.guided-draft { color: var(--color-error, #ef4444); }
.guided-note { margin-top: 0.5rem; color: var(--color-on-surface-variant); line-height: 1.5; }

/* TASK 36 — "đang tới lượt ai". Wraps on a narrow console; the controls stay finger-sized. */
.guided-speaker { display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; align-items: center; margin-bottom: 0.5rem; }
.guided-speaker input, .guided-speaker select { min-height: 2.25rem; border: 1px solid var(--color-outline-variant); border-radius: 0.375rem; background: var(--color-surface); color: var(--color-on-surface); padding: 0 0.5rem; }
.guided-hint { flex-basis: 100%; font-size: 0.75rem; color: var(--color-on-surface-variant); }
.guided-blocked { margin-top: 0.25rem; font-size: 0.75rem; color: var(--color-error, #ef4444); line-height: 1.5; }
```

with

```css
@media (prefers-reduced-motion: reduce) { .sub-para { transition: none; } }
```

Kiểm ngay sau khối này:

```bash
grep -rn "guided-" src/index.css   # phải RỖNG
grep -rc "guided-" src/lib/lanes/online/components/OnlineConsole.tsx   # phải ra 14
```

**Đọc kỹ con số thứ hai: 14 là ĐÚNG, không phải hỏng.** TASK 51 chỉ dọn CSS. Mười bốn dòng `className` /
`id` mang chữ `guided-` trong `OnlineConsole.tsx` (dòng 411, 415, 420, 426, 442, 456, 458, 461, 475, 479,
482, 483, 484, 488) **phải còn nguyên tới TASK 58** — khối `Find` lớn nhất của cả prompt trích đúng những
dòng đó từng chữ. Sửa hay xoá chúng bây giờ là khối TASK 58 mất neo, và bản vá lỗi ③ hỏng theo.

Tới cuối PROMPT-13 thì `grep -rn "guided-" src/` được phép còn đúng ba dòng, đều là `id`/`name` của ô chọn
nấc trong `OnlineGuidedMatchSettings.tsx` — TASK 57.3 dựng.

Chạy `npx tsc -b --noEmit`. Phải sạch. Rồi mới đọc tiếp.

---

## TASK 52 — `src/lib/schedule.ts`: một dòng Timeline là gì

Timeline sống **trong `Conference`**, không phải một kho riêng. Lịch đã là một kho lưu được rồi, nên
Timeline đi theo buổi mà không phải thêm một endpoint nào, không thêm một khoá `localStorage` nào, và
PROMPT-12 — đã chạy trước rồi — đồng bộ nguyên khối lịch, nên Timeline lên kho miễn phí.

**Chiều trỏ là một chiều, và đây là chỗ dễ làm sai nhất.** Đoạn trỏ TỚI dòng kịch bản đầu của nó
(`startScriptId`). Dòng kịch bản **không bao giờ** khai mình thuộc đoạn nào — `ScriptEntry` là hợp đồng
byte-đối-byte với Cascade Matcher, và `normEntry` dựng lại từng trường một nên mọi trường lạ bị nuốt im
lặng, không báo lỗi, không ai biết cho tới lúc chạy thật.

**(a)** Kiểu dữ liệu. Find and replace:

```ts
    note?: string;
}

export interface Conference {
```

with

```ts
    note?: string;
}

/**
 * Một DÒNG của Timeline chương trình (màn Chuẩn bị · Chương trình).
 *
 * Sống trong `Conference` chứ không phải một kho riêng: lịch đã là một kho đồng bộ được, nên Timeline
 * đi theo buổi mà không cần thêm một endpoint nào. Dòng kịch bản KHÔNG được mang `segmentId` — hợp
 * đồng `ScriptEntry` với Cascade Matcher là byte-đối-byte và `normEntry` sẽ nuốt mọi trường lạ. Đoạn
 * trỏ TỚI dòng đầu của nó, không phải dòng khai mình thuộc đoạn nào.
 */
export type SegmentMode = 'script' | 'partial' | 'none';   // = SpeakerMode của lane, cố ý KHÔNG import
export type SegmentListen = 'auto' | 'on' | 'off';

export interface Segment {
    id: string;
    time?: string;          // "18:29" — giờ dự kiến, chỉ để đọc
    dur?: string;           // "3'"
    kind?: string;          // "MC" · "PHÁT BIỂU VIP" · "VIDEO" … — quyết định mặc định của `listen`
    title: string;
    detail?: string;
    owner?: string;         // nguyên văn ô "người phụ trách" của file gốc — giữ làm ghi chú
    speakerId?: string;     // trỏ vào Conference.speakers[].id
    lang?: string;          // tiếng người đó SẼ nói: '' | 'vi' | 'ja' — dùng để khởi động ấm
    mode?: SegmentMode;
    listen?: SegmentListen; // 'auto' = suy từ `kind`
    startScriptId?: string; // dòng kịch bản đầu của đoạn
    /**
     * Bản sao NỘI DUNG của dòng đó, làm neo dự phòng.
     *
     * `id` của dòng kịch bản KHÔNG bền: nhập lại kịch bản là `normEntry` sinh `uid()` mới cho từng
     * dòng, và mọi `startScriptId` thành mồ côi cùng lúc. Giữa buổi lễ, một con trỏ mồ côi im lặng
     * nguy hiểm hơn hẳn một con trỏ báo lỗi. Có neo chữ thì máy tìm lại được dòng cũ và tự gắn lại;
     * không tìm được thì nói thẳng là MẤT DẤU, chứ không lặng lẽ không nhảy.
     */
    startScriptText?: string;
    docIds?: string[];      // tài liệu riêng của đoạn/người này
    divider?: boolean;      // dòng tiêu đề phần (01 LỄ KHAI MẠC…) — không phải một đoạn chạy được
}

export interface Conference {
```

**(b)** Gắn vào buổi. Find and replace:

```ts
    speakers: Speaker[];
    seriesId?: string;   // thuộc Chuỗi hội nghị (doc 30). Vắng ⇒ sự kiện MỘT LẦN (mặc định).
```

with

```ts
    speakers: Speaker[];
    segments?: Segment[];  // Timeline chương trình. Vắng ⇒ buổi chưa dựng Timeline (mặc định).
    seriesId?: string;   // thuộc Chuỗi hội nghị (doc 30). Vắng ⇒ sự kiện MỘT LẦN (mặc định).
```

**(c)** Chuẩn hoá khi đọc từ kho. `normConf` dựng lại từng trường một, nên một trường không được nhắc tên
ở đây sẽ **biến mất im lặng mỗi lần lưu**. Find and replace:

```ts
function normConf(c: unknown): Conference {
```

with

```ts
const ALLOWED_MODE = new Set(['script', 'partial', 'none']);
const ALLOWED_LISTEN = new Set(['auto', 'on', 'off']);

function normSegment(s: unknown): Segment {
    const o = (s && typeof s === 'object' ? s : {}) as Record<string, unknown>;
    const mode = str(o.mode);
    const listen = str(o.listen);
    const seg: Segment = {
        id: str(o.id) || uid(),
        time: str(o.time), dur: str(o.dur), kind: str(o.kind),
        title: str(o.title), detail: str(o.detail), owner: str(o.owner),
        speakerId: str(o.speakerId) || undefined,
        // Đoạn chỉ nói được tiếng Việt hoặc tiếng Nhật — lane không đọc được tiếng khác.
        lang: str(o.lang) === 'vi' || str(o.lang) === 'ja' ? str(o.lang) : '',
        mode: ALLOWED_MODE.has(mode) ? (mode as Segment['mode']) : 'none',
        listen: ALLOWED_LISTEN.has(listen) ? (listen as Segment['listen']) : 'auto',
        startScriptId: str(o.startScriptId) || undefined,
        startScriptText: str(o.startScriptText) || undefined,
        docIds: Array.isArray(o.docIds) ? o.docIds.filter((x): x is string => typeof x === 'string') : undefined,
    };
    if (o.divider === true) seg.divider = true;
    return seg;
}

function normConf(c: unknown): Conference {
```

**(d)** Và trường mới phải được nhắc tên trong `normConf`. Find and replace:

```ts
        speakers: Array.isArray(o.speakers) ? o.speakers.map(normSpeaker) : [],
```

with

```ts
        speakers: Array.isArray(o.speakers) ? o.speakers.map(normSpeaker) : [],
        segments: Array.isArray(o.segments) ? o.segments.map(normSegment) : undefined,
```

> **Một cảnh báo thật, không phải lý thuyết.** Từ giây phút khối (d) này chạy, bản build CŨ trở thành máy
> xoá dữ liệu: một máy chưa cập nhật mở lịch, `normConf` của nó không biết `segments`, lưu lại là Timeline
> biến mất sạch — và nếu PROMPT-12 đã chạy thì bản trắng đó còn được đẩy lên kho đè lên bản đúng. Nên sau
> khi deploy, **mọi máy dùng cho buổi lễ phải tải lại trang** (Ctrl+F5) trước khi ai đó mở màn Chuẩn bị.

---

## TASK 53 — `src/lib/segments.ts` (tệp mới) + hai chỗ nối

### 53.1 Tệp mới `src/lib/segments.ts`

Toàn bộ phần suy luận của Timeline nằm ở đây: thuần, không React, không fetch, nên test được thẳng.

Ba việc nó làm, theo thứ tự quan trọng:

1. **Suy mặc định từ LOẠI dòng.** Đây mới là giá trị lớn nhất của cả màn Chương trình — lớn hơn chuyện bám
   kịch bản. Gala 08/08 có 64 dòng / ~239 phút, và theo bảng `SILENT_KINDS` dưới đây thì **33 dòng /
   ~115 phút** là lúc máy **tuyệt đối không được nghe** — video, bài hát, Yosakoi, chụp ảnh, ăn uống —
   nếu không nó chép lời bài hát thành phụ đề bắn lên màn hình khán giả. Hôm nay người điều khiển phải
   tự bấm "Ngưng nghe" mấy chục lần trong bốn tiếng, trong bóng tối. (Con số này tôi đếm bằng máy trên
   chính tệp chương trình, không phải ước lượng.)
2. **Nhập Timeline có sẵn từ file HTML.** Bốn trên năm cột nhập được sạch (giờ · thời lượng · loại · nội
   dung). Cột thứ năm — "người phụ trách" — là văn xuôi song ngữ trộn cả người nói, người hỗ trợ, MC dẫn
   và ghi chú; ví dụ thật trong file: `Nguyên Bộ trưởng Đào Ngọc Dung  Hỗ trợ 1 NV tuyến LĐTB&XH  MC dẫn /
   司会 Lê Vi Trang (VN)`. Máy tách ô đó cho đúng là **không làm được**, nên nó được giữ nguyên văn vào
   `owner` và người soạn gán tay người nói. Nhập bốn cột đã đỡ rất nhiều gõ, và không nói dối về cột thứ
   năm.
3. **Giải neo dòng kịch bản** — bằng `id` trước, bằng **nội dung** sau. Nhập lại kịch bản là mọi
   `startScriptId` mồ côi **cùng một lúc**; giữa buổi lễ, một con trỏ đứng im không lời giải thích nguy
   hiểm hơn hẳn một dòng chữ đỏ. Bốn trạng thái: `ok` (kèm `healed` nếu tìm ra nhờ chữ) · `unapproved` ·
   `lost` · `none`.

Tạo tệp với đúng nội dung này:

```ts
// Timeline chương trình (Chuẩn bị · Chương trình) — helpers thuần, không React, không fetch.
//
// `Segment` sống trong `Conference` (schedule.ts). Tệp này chỉ làm ba việc: suy ra mặc định từ LOẠI
// dòng, nhập một Timeline có sẵn từ file HTML, và trả lời câu hỏi mà màn điều khiển hỏi mỗi lần người
// điều khiển bấm sang đoạn khác: "đoạn này máy có phải nghe không, và nghe tiếng gì".
//
// Vì sao mặc định lại quan trọng đến thế: gala 08/08 có 64 dòng / ~239 phút, và theo bảng loại dưới
// đây thì 33 dòng / ~115 phút là lúc máy TUYỆT ĐỐI không được nghe — video, bài hát, Yosakoi, chụp
// ảnh, ăn uống — nếu không nó chép lời bài hát thành phụ đề bắn lên màn khán giả. Hôm nay người điều
// khiển phải tự bấm "Ngưng nghe" mấy chục lần trong bốn tiếng, trong bóng tối. Một dòng Timeline biết loại của nó thì việc đó thành
// tự động — và đó là giá trị lớn nhất của cả màn này, lớn hơn chuyện bám kịch bản.

import { uid } from './schedule';
import type { Conference, Segment, SegmentMode } from './schedule';

/** Loại dòng mà máy PHẢI câm: không có tiếng người để dịch, chỉ có nhạc, vỗ tay và tiếng ồn hội trường. */
const SILENT_KINDS = [
    'VIDEO', 'BÀI HÁT', 'YOSAKOI', 'CHỤP ẢNH', 'TẶNG HOA', 'CÚI CHÀO', 'ĂN UỐNG', 'KHAI VỊ',
    'VÀO VỊ TRÍ', 'VỀ CHỖ', 'TIỄN KHÁCH', 'KIRAKIRA', 'BÀN ', 'NGHI THỨC', 'KAMPAI', 'TIẾT MỤC',
    'VĂN NGHỆ', 'NGHỈ', 'GIẢI LAO',
];

/** Loại dòng mà người nói ĐỌC kịch bản gần đúng từng chữ — chỉ MC. */
const SCRIPT_KINDS = ['MC'];

/** Loại dòng có người nói thật nhưng nói bài của họ, không đọc kịch bản MC. */
const PARTIAL_KINDS = [
    'PHÁT BIỂU', 'KHAI MẠC', 'ĐỊNH HƯỚNG', 'DIATALENT', 'ESUTECH', 'JPC', 'OB', 'GIAO LƯU',
    'TRI ÂN', 'SHOWCASE', 'CHIA SẺ', 'DEMO', 'SLIDE',
];

const upper = (s: string) => (s || '').toLocaleUpperCase('vi');
const hasAny = (kind: string, list: string[]) => { const k = upper(kind); return list.some((w) => k.includes(w)); };

/** Máy có nên nghe ở đoạn này không, khi người điều khiển để `listen: 'auto'`. */
export function autoListen(kind: string | undefined): boolean {
    return !hasAny(kind ?? '', SILENT_KINDS);
}

/** Kiểu nói mặc định suy từ loại dòng. Chỉ là ĐỀ XUẤT — người soạn sửa được từng dòng. */
export function autoMode(kind: string | undefined): SegmentMode {
    const k = kind ?? '';
    if (!autoListen(k)) return 'none';
    if (hasAny(k, SCRIPT_KINDS)) return 'script';
    if (hasAny(k, PARTIAL_KINDS)) return 'partial';
    return 'none';
}

/** Quyết định cuối cùng cho một đoạn: `auto` hỏi loại dòng, `on`/`off` là lệnh tay và luôn thắng. */
export function segmentListens(seg: Segment | undefined): boolean {
    if (!seg) return true;
    if (seg.listen === 'on') return true;
    if (seg.listen === 'off') return false;
    return autoListen(seg.kind);
}

/**
 * Tiếng mà đoạn này SẼ được nói, để nạp sẵn cho bộ theo dõi ngôn ngữ trước câu đầu tiên.
 * Ưu tiên tiếng khai thẳng trên đoạn, sau đó mới tới tiếng ghi trong hồ sơ người nói của buổi.
 */
export function segmentLanguage(seg: Segment | undefined, conf: Conference | undefined): 'vi' | 'ja' | '' {
    if (!seg) return '';
    if (seg.lang === 'vi' || seg.lang === 'ja') return seg.lang;
    const sp = (conf?.speakers ?? []).find((s) => s.id === seg.speakerId);
    return sp?.lang === 'vi' || sp?.lang === 'ja' ? sp.lang : '';
}

/** Tên người nói của đoạn, hoặc chuỗi rỗng. */
export function segmentSpeakerName(seg: Segment | undefined, conf: Conference | undefined): string {
    const sp = (conf?.speakers ?? []).find((s) => s.id === seg?.speakerId);
    return sp?.name?.trim() ?? '';
}

/** Nhãn ngắn cho một dòng Timeline — dùng chung giữa màn soạn và ô chọn ở console. */
export function segmentLabel(seg: Segment, index: number): string {
    const head = [seg.time, seg.kind].filter(Boolean).join(' · ');
    const title = seg.title.trim() || '(chưa đặt tên)';
    return `${index + 1}. ${title}${head ? ` — ${head}` : ''}`;
}

export const newSegment = (): Segment =>
    ({ id: uid(), time: '', dur: '', kind: '', title: '', detail: '', owner: '', lang: '', mode: 'none', listen: 'auto' });

// ─────────────────────────────────────────────────────────── nhập Timeline từ file HTML
//
// Bốn trên năm cột nhập được sạch: giờ · thời lượng · loại · nội dung. Cột thứ năm ("người phụ trách")
// là văn xuôi song ngữ trộn cả người nói, người hỗ trợ, MC dẫn và ghi chú — ví dụ thật:
//   "Nguyên Bộ trưởng Đào Ngọc Dung  Hỗ trợ 1 NV tuyến LĐTB&XH  MC dẫn / 司会 Lê Vi Trang (VN)"
// Máy tách ô đó cho đúng là không làm được, nên nó được giữ NGUYÊN VĂN vào `owner` và người soạn gán
// tay người nói. Nhập được bốn cột đã đỡ rất nhiều gõ, và không nói dối về cột thứ năm.

const stripTags = (s: string): string =>
    s.replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ').trim();

const pick = (html: string, cls: string): string => {
    const m = new RegExp(`<div class="${cls}">([\\s\\S]*?)</div>`).exec(html);
    return m ? stripTags(m[1]) : '';
};

/** Đoán tiếng của dòng từ ô người phụ trách. Chỉ là gợi ý — người soạn thấy và sửa được. */
export function guessLang(owner: string): 'vi' | 'ja' | '' {
    const o = owner || '';
    const vi = /\(VN[,)]|\(VN\b|tiếng Việt/i.test(o);
    const ja = /\(JP[,)]|\(JP\b|tiếng Nhật|氏|さん/.test(o);
    if (vi && !ja) return 'vi';
    if (ja && !vi) return 'ja';
    return '';   // cả hai (hai MC nối nhau) hoặc không rõ ⇒ để máy tự nhận như hôm nay
}

export interface ImportResult { segments: Segment[]; rows: number; sections: number }

/**
 * Đọc một Timeline dạng HTML (bảng `<tr>` với cột giờ · thời lượng · loại · nội dung · người phụ trách,
 * xen kẽ các tiêu đề phần `sh-num`/`sh-name`) thành danh sách đoạn. Không bao giờ ném lỗi: một tệp
 * không đúng dạng trả về danh sách rỗng chứ không làm hỏng màn soạn.
 */
export function importTimelineHtml(html: string): ImportResult {
    const segments: Segment[] = [];
    let rows = 0, sections = 0;
    try {
        // Đi theo THỨ TỰ TRONG TỆP: tiêu đề phần và bảng xen kẽ nhau, nên gộp hai loại mốc rồi sắp lại.
        const marks: { at: number; kind: 'section' | 'table'; html: string }[] = [];
        for (const m of html.matchAll(/<div class="sh-num">([\s\S]*?)<\/div>[\s\S]{0,400}?<div class="sh-name">([\s\S]*?)<\/div>/g)) {
            marks.push({ at: m.index ?? 0, kind: 'section', html: `${stripTags(m[1])} ${stripTags(m[2])}` });
        }
        for (const m of html.matchAll(/<table[\s\S]*?<\/table>/g)) {
            marks.push({ at: m.index ?? 0, kind: 'table', html: m[0] });
        }
        marks.sort((a, b) => a.at - b.at);

        for (const mark of marks) {
            if (mark.kind === 'section') {
                sections += 1;
                segments.push({ ...newSegment(), title: mark.html.trim(), divider: true, listen: 'off', mode: 'none' });
                continue;
            }
            for (const tr of mark.html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
                const body = tr[1];
                const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];
                if (cells.length < 3) continue;   // hàng tiêu đề `<th>` — bỏ qua
                const raw = cells.map((c) => c[1]);
                const time = stripTags(raw[0]);
                const dur = stripTags(raw[1]);
                const kind = stripTags(raw[2]);
                const contentCell = raw[3] ?? '';
                const title = pick(contentCell, 'c-title') || stripTags(contentCell).slice(0, 120);
                const detail = pick(contentCell, 'c-detail');
                const owner = stripTags(raw[raw.length - 1] ?? '');
                rows += 1;
                segments.push({
                    ...newSegment(),
                    time, dur, kind, title, detail, owner,
                    lang: guessLang(owner),
                    mode: autoMode(kind),
                    listen: 'auto',
                });
            }
        }
    } catch {
        return { segments: [], rows: 0, sections: 0 };
    }
    return { segments, rows, sections };
}

// ───────────────────────────────────────────── neo dòng kịch bản: id trước, chữ sau, im lặng thì không
//
// `ScriptEntry.id` không bền qua một lần nhập lại kịch bản (`normEntry` cấp `uid()` mới cho dòng không
// mang id), nên MỌI `startScriptId` mồ côi cùng một lúc. Ba trạng thái dưới đây tồn tại để giữa buổi lễ
// không bao giờ có chuyện "bấm sang phần mà con trỏ đứng im, không ai biết vì sao":
//
//   ok         — tìm thấy trong kịch bản đã duyệt (kèm `healed` khi tìm ra nhờ neo chữ, không nhờ id)
//   unapproved — dòng còn đó nhưng chưa duyệt ⇒ lane không giữ nó, con trỏ không nhảy được
//   lost       — không còn dấu vết nào ⇒ phải gắn lại tay
//   none       — đoạn này cố ý không gắn dòng nào (phát biểu tự do, video…)

export type ScriptAnchor =
    | { kind: 'none' }
    | { kind: 'ok'; index: number; id: string; healed: boolean }
    | { kind: 'unapproved' }
    | { kind: 'lost' };

export interface AnchorRow { id: string; src: string; }

/** Chuẩn hoá nhẹ để so hai dòng "cùng một câu" qua một lần nhập lại: gộp khoảng trắng + không phân biệt hoa thường. */
export const anchorText = (src: string): string => (src || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi').slice(0, 160);

/**
 * `approved` = kịch bản lane đang giữ (chỉ dòng đã duyệt, đúng thứ tự con trỏ đếm).
 * `all` = mọi dòng lưu cho buổi, kể cả bản nháp — chỉ dùng để phân biệt "chưa duyệt" với "mất hẳn".
 */
export function resolveScriptAnchor(seg: Segment | undefined, approved: readonly AnchorRow[], all: readonly AnchorRow[]): ScriptAnchor {
    if (!seg?.startScriptId && !seg?.startScriptText) return { kind: 'none' };

    if (seg.startScriptId) {
        const i = approved.findIndex((r) => r.id === seg.startScriptId);
        if (i >= 0) return { kind: 'ok', index: i, id: approved[i].id, healed: false };
        if (all.some((r) => r.id === seg.startScriptId)) return { kind: 'unapproved' };
    }

    // Id không còn: nhập lại kịch bản, hoặc dòng bị xoá. Neo chữ trả lời được chuyện đó.
    const key = anchorText(seg.startScriptText ?? '');
    if (key) {
        const i = approved.findIndex((r) => anchorText(r.src) === key);
        if (i >= 0) return { kind: 'ok', index: i, id: approved[i].id, healed: true };
        if (all.some((r) => anchorText(r.src) === key)) return { kind: 'unapproved' };
    }
    return { kind: 'lost' };
}

/**
 * Gắn lại hàng loạt sau một lần nhập kịch bản: mọi đoạn tìm được dòng cũ nhờ neo chữ đều được viết lại
 * `startScriptId` mới. Trả về danh sách mới + số đoạn đã chữa + số đoạn mất hẳn (phải gắn tay).
 *
 * Thuần và không ghi gì — người gọi quyết định có lưu hay không, nên chạy được cả ở màn soạn lẫn trong test.
 */
export function healSegmentAnchors(segments: Segment[] | undefined, approved: readonly AnchorRow[], all: readonly AnchorRow[]): { segments: Segment[]; healed: number; lost: number } {
    const list = segments ?? [];
    let healed = 0, lost = 0;
    const next = list.map((seg) => {
        const a = resolveScriptAnchor(seg, approved, all);
        if (a.kind === 'lost') { lost += 1; return seg; }
        if (a.kind !== 'ok' || !a.healed) return seg;
        healed += 1;
        return { ...seg, startScriptId: a.id };
    });
    return { segments: next, healed, lost };
}

/** Câu giải thích cho người điều khiển, đúng một dòng. Rỗng khi không có gì phải nói. */
export function anchorMessage(a: ScriptAnchor): string {
    if (a.kind === 'unapproved') return 'Dòng kịch bản của phần này chưa được duyệt — con trỏ không nhảy.';
    if (a.kind === 'lost') return 'MẤT DẤU dòng kịch bản (kịch bản đã được nhập lại hoặc dòng bị xoá) — mở Chương trình gắn lại.';
    return '';
}

/** Thống kê để màn soạn nói thật buổi này máy sẽ nghe bao nhiêu, câm bao nhiêu. */
export function timelineStats(segments: Segment[] | undefined): { rows: number; listen: number; mute: number; noSpeaker: number } {
    const list = (segments ?? []).filter((s) => !s.divider);
    const listen = list.filter((s) => segmentListens(s)).length;
    return {
        rows: list.length,
        listen,
        mute: list.length - listen,
        noSpeaker: list.filter((s) => segmentListens(s) && !s.speakerId).length,
    };
}
```

### 53.2 `src/lib/prepData.ts` — bối cảnh cho MỘT người, trọn ngân sách

Đây là một lỗi có thật đã nằm sẵn trong bản đang chạy, và nó **im lặng**: `collectPrepPack` chia
`BRIEF_MAX_CHARS` cho **mọi** tài liệu của buổi bằng `share = floor(left / n) - DOC_EXTRACT_MIN`. Một buổi
có tiêu đề ~400 ký tự và **năm** tài liệu ra `share ≈ 100`, thấp hơn `DOC_EXTRACT_MIN`, và cả vòng lặp tài
liệu bị bỏ qua — **chuẩn bị càng nhiều tài liệu thì càng chắc chắn KHÔNG tài liệu nào tới được máy dịch.**

Cắt phạm vi xuống đúng người đang cầm micro là thứ chữa được chuyện đó. Find and replace:

```ts
/**
 * Collect a paste-ready pack for the given session direction. The SOURCE side of the session decides
```

with

```ts
/**
 * TASK 53 — the brief for ONE segment of the running order: the meeting header plus the documents that
 * segment's speaker actually brought, on the WHOLE budget instead of a share of it.
 *
 * The mechanical brief below spreads `BRIEF_MAX_CHARS` across every document of the event. That works
 * for one or two documents and silently collapses beyond that: `share = floor(left / n) - DOC_EXTRACT_MIN`,
 * so a meeting with a ~400-character header and five documents computes a share of about 100 — below
 * DOC_EXTRACT_MIN, and the whole document loop is skipped. Preparing MORE material makes it certain that
 * NONE of it reaches the model. Scoping to the person now at the microphone is what fixes that.
 *
 * Synchronous and never throws: documents are localStorage, and this is called while a ceremony runs.
 * Returns '' when the segment has no documents — the caller then keeps the session-wide brief.
 */
export function collectSegmentBrief(conf: Conference | undefined, docIds: string[] | undefined, speakerName = ''): string {
  if (!conf || !docIds?.length) return ''
  const wanted = new Set(docIds)
  const docList = safeDocs(conf).filter((d) => wanted.has(d.id))
  if (!docList.length) return ''

  const parts: string[] = []
  const header = collectPrepHeader(conf)
  if (header) parts.push(header)
  const who = clean(speakerName)
  if (who) parts.push(`Người đang phát biểu: ${who}`)

  let left = BRIEF_MAX_CHARS - parts.join('\n').length
  const share = Math.floor(left / docList.length) - DOC_EXTRACT_MIN
  if (share < DOC_EXTRACT_MIN) return parts.join('\n').slice(0, BRIEF_MAX_CHARS)
  for (const d of docList) {
    const body = flat(d.text).slice(0, share)
    if (body.length < DOC_EXTRACT_MIN) continue
    const line = `- ${flat(d.name)}: ${body}`
    if (line.length + 1 > left) break
    parts.push(line)
    left -= line.length + 1
  }
  return parts.join('\n').slice(0, BRIEF_MAX_CHARS)
}

/**
 * Collect a paste-ready pack for the given session direction. The SOURCE side of the session decides
```

### 53.3 `src/lib/scriptLoad.ts` — công bố cả những dòng chưa duyệt

Màn điều khiển cần phân biệt **"dòng này chưa được duyệt"** với **"dòng này đã biến mất"** — hai chuyện đó
trông giống hệt nhau nếu chỉ nhìn danh sách dòng đã duyệt, mà câu phải nói cho người điều khiển thì khác
hẳn nhau. Danh sách đầy đủ được công bố ngay tại đây thay vì để mỗi màn tự mở lại kho kịch bản: cả module
này tồn tại để màn điều khiển đọc kịch bản qua **đúng một cửa**, và `tests/scriptLoadConsole.test.ts` ghim
điều đó.

**(a)** Find and replace:

```ts
    /** Rows the matcher may speak verbatim: approved AND carrying both sides. */
    rows: ScriptEntry[];
```

with

```ts
    /** Rows the matcher may speak verbatim: approved AND carrying both sides. */
    rows: ScriptEntry[];
    /**
     * EVERY row stored for this event, in stored order — drafts and half-filled rows included.
     *
     * `rows` alone cannot tell "dòng này chưa được duyệt" apart from "dòng này đã biến mất": both look
     * like a miss. A Timeline segment pointing at a row needs that distinction to say the right sentence
     * to the technician, so the full list is published here rather than making each screen re-open the
     * store — the whole point of this module is that the console reads the script through exactly one door.
     */
    allRows: ScriptEntry[];
```

**(b)** Find and replace:

```ts
    return { rows, total: all.length, draft, missingTranslation, eventId, reason };
```

with

```ts
    return { rows, allRows: all, total: all.length, draft, missingTranslation, eventId, reason };
```

---

## TASK 54 — màn hình **Chương trình** trong Chuẩn bị

Đứng **giữa Tài liệu và Kịch bản**, vì đó đúng là thứ tự công việc thật:

> Đặt lịch (tạo buổi + người) → Tài liệu (nạp nguyên liệu) → **Chương trình** (dựng khung, gán
> người/kiểu/tài liệu cho từng đoạn) → Kịch bản (viết lời cho các đoạn cần lời).

Màn này **không viết một chữ nào vào Kịch bản**. Nó chỉ trỏ.

### 54.1 Tệp mới `src/pages/ProgramTimeline.tsx`

Những gì màn này làm, để bạn biết mình đang dán cái gì:

- **Nhập từ file HTML** — chọn tệp `.html` của chương trình, đọc ra giờ · thời lượng · loại · nội dung, và
  các dòng tiêu đề phần. Đọc được 0 dòng thì báo lỗi và **không đụng gì** vào Timeline đang có.
- **Sửa từng dòng** — mở rộng một dòng ra để gán người nói (chọn từ danh sách người của buổi, hoặc thêm
  người mới ngay tại chỗ), tiếng, kiểu nói, nghe/câm, dòng kịch bản đầu, và tài liệu riêng của đoạn.
- **Gắn lại tự động** — sau một lần nhập lại kịch bản, bấm một nút là mọi đoạn còn tìm được dòng cũ **nhờ
  neo chữ** được viết lại `startScriptId` mới; số đoạn mất dấu được nói thẳng ra, không giấu.
- **Thống kê nói thật** — buổi này máy sẽ nghe bao nhiêu đoạn, câm bao nhiêu, và **bao nhiêu đoạn có nghe
  mà chưa gán người** (đó chính là các đoạn sẽ chạy sai chiều dịch).

Lưu bằng `upsertConference` — cùng một cửa với màn Đặt lịch, nên Timeline đi theo buổi và không sinh thêm
một kho nào.

Tạo tệp với đúng nội dung này:

```tsx
import React, { useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { toast } from '../lib/toast';
import { useActiveEvent } from '../lib/ActiveEventContext';
import { upsertConference, newSpeaker } from '../lib/schedule';
import type { Conference, Segment, SegmentListen, SegmentMode } from '../lib/schedule';
import {
    importTimelineHtml, newSegment, segmentListens, timelineStats, autoListen, autoMode,
    resolveScriptAnchor, healSegmentAnchors, type ScriptAnchor,
} from '../lib/segments';
import { getScriptLocal } from '../lib/script';
import { loadScriptForSession } from '../lib/scriptLoad';
import { effectiveDocs } from '../lib/kbscope';

// Chương trình (Chuẩn bị) — Timeline của buổi lễ, đứng giữa Tài liệu và Kịch bản vì đó đúng là thứ tự
// công việc thật: Đặt lịch tạo buổi + người → Tài liệu nạp nguyên liệu → CHƯƠNG TRÌNH dựng khung và
// gán người/kiểu/tài liệu cho từng đoạn → Kịch bản viết lời cho các đoạn cần lời.
//
// Màn này KHÔNG viết một chữ nào vào Kịch bản. Nó chỉ trỏ: đoạn giữ `startScriptId` của dòng kịch bản
// đầu tiên thuộc về nó. Dòng kịch bản không bao giờ mang `segmentId` — hợp đồng `ScriptEntry` với
// Cascade Matcher là byte-đối-byte và mọi trường lạ sẽ bị nuốt ở lần đọc kế tiếp.

const MODES: { value: SegmentMode; label: string; hint: string }[] = [
    { value: 'script', label: 'Bám kịch bản', hint: 'Đọc gần đúng từng dòng — bật dẫn được' },
    { value: 'partial', label: 'Lệch một nửa', hint: 'Có bài nhưng nói thêm — dùng tài liệu của người này làm bối cảnh' },
    { value: 'none', label: 'Nói tự do', hint: 'Máy dịch hoàn toàn tự động' },
];

const LISTENS: { value: SegmentListen; label: string }[] = [
    { value: 'auto', label: 'Tự động' },
    { value: 'on', label: 'Nghe' },
    { value: 'off', label: 'Câm' },
];

const FIELD =
    'w-full bg-surface text-on-surface border border-outline-variant rounded-lg py-1.5 px-2 text-[13px] ' +
    'focus:ring-0 focus:border-secondary field-lux';

// ── Một dòng Timeline ────────────────────────────────────────────────────────────────────────────
const Row: React.FC<{
    seg: Segment;
    n: number;
    conf: Conference;
    scriptRows: { id: string; src: string }[];
    docs: { id: string; name: string }[];
    onPatch: (p: Partial<Segment>) => void;
    onRemove: () => void;
    onAddSpeaker: () => void;
    anchor: ScriptAnchor;
}> = ({ seg, n, conf, scriptRows, docs, onPatch, onRemove, onAddSpeaker, anchor }) => {
    const [open, setOpen] = useState(false);
    const listens = segmentListens(seg);

    if (seg.divider) {
        return (
            <div className="flex items-center gap-3 pt-5 pb-1">
                <span className="material-symbols-outlined text-secondary text-[18px]" aria-hidden="true">bookmark</span>
                <input value={seg.title} onChange={(e) => onPatch({ title: e.target.value })}
                    className="flex-1 bg-transparent border-0 focus:ring-0 p-0 font-label-caps text-label-caps tracking-[0.14em] text-secondary" />
                <button onClick={onRemove} title="Xoá dòng tiêu đề"
                    className="w-7 h-7 rounded-lg grid place-items-center text-on-surface-variant hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">close</span>
                </button>
            </div>
        );
    }

    const speakerName = conf.speakers.find((s) => s.id === seg.speakerId)?.name;
    const nDocs = seg.docIds?.length ?? 0;

    return (
        <div className={`rounded-xl border transition-colors ${listens ? 'border-outline-variant bg-surface-container' : 'border-outline-variant/50 bg-surface-container-lowest'}`}>
            <div className="flex items-start gap-2.5 p-2.5">
                <span className="shrink-0 w-6 pt-1.5 text-right tabular-nums font-label-caps text-[11px] text-on-surface-variant/60">{n}</span>

                {/* giờ + thời lượng — chỉ để người điều khiển dò theo bản giấy */}
                <div className="shrink-0 w-[74px] space-y-1">
                    <input value={seg.time ?? ''} onChange={(e) => onPatch({ time: e.target.value })} placeholder="18:29"
                        className={`${FIELD} tabular-nums text-center`} aria-label="Giờ" />
                    <input value={seg.dur ?? ''} onChange={(e) => onPatch({ dur: e.target.value })} placeholder="3'"
                        className={`${FIELD} tabular-nums text-center opacity-70`} aria-label="Thời lượng" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex gap-1.5">
                        <input value={seg.kind ?? ''} onChange={(e) => onPatch({ kind: e.target.value })} placeholder="LOẠI (MC · PHÁT BIỂU · VIDEO…)"
                            className={`${FIELD} w-[190px] shrink-0 font-label-caps text-[11px] tracking-[0.08em]`} aria-label="Loại dòng" />
                        <input value={seg.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Nội dung đoạn"
                            className={`${FIELD} flex-1 min-w-0`} aria-label="Nội dung" />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* nghe / câm — cái quan trọng nhất của cả bảng này */}
                        <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5">
                            {LISTENS.map((l) => (
                                <button key={l.value} type="button" onClick={() => onPatch({ listen: l.value })}
                                    title={l.value === 'auto' ? `Tự động theo loại dòng — hiện là ${autoListen(seg.kind) ? 'NGHE' : 'CÂM'}` : undefined}
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors ${seg.listen === l.value ? (l.value === 'off' ? 'bg-error/80 text-white' : 'bg-secondary text-on-secondary') : 'text-on-surface-variant hover:text-on-surface'}`}>
                                    {l.label}
                                </button>
                            ))}
                        </div>
                        <span className={`font-label-caps text-[10px] px-2 py-1 rounded-md ${listens ? 'text-secondary bg-secondary/10' : 'text-error bg-error/10'}`}>
                            {listens ? 'MÁY NGHE' : 'MÁY CÂM'}
                        </span>

                        {listens && (
                            <>
                                <select value={seg.speakerId ?? ''} onChange={(e) => { if (e.target.value === '::them::') onAddSpeaker(); else onPatch({ speakerId: e.target.value || undefined }); }}
                                    className={`${FIELD} w-auto max-w-[190px] cursor-pointer`} aria-label="Người nói">
                                    <option value="">— chưa gán người —</option>
                                    {conf.speakers.filter((s) => s.name.trim()).map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}{s.role?.trim() ? ` · ${s.role.trim()}` : ''}</option>
                                    ))}
                                    <option value="::them::">+ Thêm người vào buổi…</option>
                                </select>

                                <select value={seg.lang ?? ''} onChange={(e) => onPatch({ lang: e.target.value })}
                                    className={`${FIELD} w-[112px] cursor-pointer`} aria-label="Tiếng người này nói" title="Máy được mách trước để khỏi đoán sai câu đầu tiên">
                                    <option value="">Tiếng: tự nhận</option>
                                    <option value="vi">Tiếng Việt</option>
                                    <option value="ja">Tiếng Nhật</option>
                                </select>

                                <select value={seg.mode ?? 'none'} onChange={(e) => onPatch({ mode: e.target.value as SegmentMode })}
                                    className={`${FIELD} w-[142px] cursor-pointer`} aria-label="Kiểu nói"
                                    title={MODES.find((m) => m.value === (seg.mode ?? 'none'))?.hint}>
                                    {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>

                                <button type="button" onClick={() => setOpen((v) => !v)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${open ? 'border-secondary text-secondary' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                                    {seg.mode === 'script'
                                        ? (anchor.kind === 'ok' ? 'Đã gắn dòng kịch bản' : anchor.kind === 'none' ? 'Gắn dòng kịch bản' : 'Gắn LẠI dòng kịch bản')
                                        : (nDocs ? `${nDocs} tài liệu` : 'Gắn tài liệu')}
                                </button>
                                {seg.mode === 'script' && anchor.kind !== 'ok' && anchor.kind !== 'none' && (
                                    <span className="font-label-caps text-[10px] px-2 py-1 rounded-md text-error bg-error/10">
                                        {anchor.kind === 'lost' ? 'MẤT DẤU' : 'CHƯA DUYỆT'}
                                    </span>
                                )}
                            </>
                        )}
                    </div>

                    {seg.owner && <p className="text-[11px] leading-snug text-on-surface-variant/60 line-clamp-2" title={seg.owner}>Bản gốc: {seg.owner}</p>}
                    {listens && !seg.speakerId && <p className="text-[11px] text-error/80">Chưa gán người nói — máy vẫn dịch được, nhưng không lấy được tài liệu riêng.</p>}
                    {speakerName && seg.mode === 'partial' && nDocs === 0 && (
                        <p className="text-[11px] text-on-surface-variant/70">Kiểu “lệch một nửa” mà chưa gắn tài liệu của {speakerName} — bối cảnh sẽ lấy chung của cả buổi.</p>
                    )}
                </div>

                <button onClick={onRemove} title="Xoá đoạn"
                    className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-on-surface-variant hover:text-error transition-colors">
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">delete</span>
                </button>
            </div>

            {open && (
                <div className="border-t border-outline-variant px-3 py-2.5 space-y-2">
                    {seg.mode === 'script' ? (
                        <>
                            <div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">DÒNG KỊCH BẢN ĐẦU TIÊN CỦA ĐOẠN</div>
                            <select value={seg.startScriptId ?? ''}
                                onChange={(e) => {
                                    const id = e.target.value;
                                    // Lưu kèm NỘI DUNG làm neo dự phòng: id sẽ đổi ở lần nhập lại kịch bản kế tiếp.
                                    const row = scriptRows.find((r) => r.id === id);
                                    onPatch({ startScriptId: id || undefined, startScriptText: row ? row.src : undefined });
                                }}
                                className={`${FIELD} cursor-pointer`}>
                                <option value="">— chưa gắn —</option>
                                {scriptRows.map((r, i) => <option key={r.id} value={r.id}>{i + 1}. {r.src.slice(0, 90)}</option>)}
                            </select>
                            <p className="text-[11px] text-on-surface-variant/70">Đoạn sở hữu mọi dòng từ đây tới dòng đầu của đoạn sau. Bấm sang đoạn này ở màn điều khiển là con trỏ nhảy đúng dòng.</p>
                            {anchor.kind === 'lost' && seg.startScriptText && (
                                <p className="text-[11px] text-error">Neo cũ: “{seg.startScriptText.slice(0, 70)}…” — không còn dòng nào khớp.</p>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">TÀI LIỆU RIÊNG CỦA ĐOẠN NÀY</div>
                            {docs.length === 0
                                ? <p className="text-[12px] text-on-surface-variant">Buổi này chưa có tài liệu nào — nạp ở màn Tài liệu.</p>
                                : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {docs.map((d) => {
                                            const on = seg.docIds?.includes(d.id) ?? false;
                                            return (
                                                <button key={d.id} type="button"
                                                    onClick={() => onPatch({ docIds: on ? (seg.docIds ?? []).filter((x) => x !== d.id) : [...(seg.docIds ?? []), d.id] })}
                                                    className={`px-2.5 py-1 rounded-full text-[12px] border transition-colors ${on ? 'border-secondary bg-secondary/15 text-on-surface' : 'border-outline-variant text-on-surface-variant hover:text-on-surface'}`}>
                                                    {on ? '✓ ' : ''}{d.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            <p className="text-[11px] text-on-surface-variant/70">Khi tới đoạn này, máy lấy đúng những tài liệu đã chọn làm bối cảnh — thay vì chia đều ngân sách cho cả kho rồi rơi hết.</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Trang ────────────────────────────────────────────────────────────────────────────────────────
const ProgramTimeline: React.FC = () => {
    const { event, refresh } = useActiveEvent();
    const fileRef = useRef<HTMLInputElement>(null);

    const segments = event?.segments ?? [];
    const stats = useMemo(() => timelineStats(segments), [segments]);
    const scriptRows = useMemo(() => (event ? getScriptLocal(event.id).map((r) => ({ id: r.id, src: r.src })) : []), [event]);
    // Kịch bản LANE sẽ giữ (chỉ dòng đã duyệt) — con trỏ đếm theo danh sách này, không theo danh sách đầy đủ.
    const approvedRows = useMemo(() => (event ? loadScriptForSession(event.id).rows.map((r) => ({ id: r.id, src: r.src })) : []), [event]);
    const anchors = useMemo(() => segments.map((s) => resolveScriptAnchor(s, approvedRows, scriptRows)), [segments, approvedRows, scriptRows]);
    // Chỉ đếm những đoạn THẬT SỰ cần dòng kịch bản: đoạn nói tự do không gắn gì là chuyện bình thường.
    const broken = segments.filter((s, i) => s.mode === 'script' && (anchors[i].kind === 'lost' || anchors[i].kind === 'unapproved')).length;
    const healable = anchors.some((a) => a.kind === 'ok' && a.healed);
    const docs = useMemo(() => { try { return event ? effectiveDocs(event).map((d) => ({ id: d.id, name: d.name })) : []; } catch { return []; } }, [event]);

    const save = (next: Segment[]): void => {
        if (!event) return;
        upsertConference({ ...event, segments: next });
        refresh();
    };
    const patch = (id: string, p: Partial<Segment>): void => save(segments.map((s) => (s.id === id ? { ...s, ...p } : s)));

    const addSpeakerTo = (segId: string): void => {
        if (!event) return;
        const name = window.prompt('Tên người nói (sẽ được thêm vào danh sách người phát biểu của buổi):', '');
        if (!name?.trim()) return;
        const sp = { ...newSpeaker(), name: name.trim() };
        upsertConference({
            ...event,
            speakers: [...event.speakers, sp],
            segments: segments.map((s) => (s.id === segId ? { ...s, speakerId: sp.id } : s)),
        });
        refresh();
        toast.success(`Đã thêm ${sp.name} vào buổi`);
    };

    const onImport = async (file: File): Promise<void> => {
        if (!event) return;
        const text = await file.text();
        const res = importTimelineHtml(text);
        if (res.rows === 0) { toast.error('Không đọc được dòng nào trong tệp — kiểm tra lại file Timeline.'); return; }
        if (segments.length && !window.confirm(`Timeline hiện có ${segments.length} dòng sẽ bị THAY bằng ${res.rows} dòng vừa đọc. Tiếp tục?`)) return;
        save(res.segments);
        toast.success(`Đã nhập ${res.rows} dòng · ${res.sections} phần. Người nói để trống — gán tay từng dòng.`);
    };

    if (!event) {
        return (
            <div className="flex flex-col h-full">
                <PageHeader icon="event_note" title="Chương trình" subtitle="Timeline & người nói" />
                <div className="flex-1 overflow-y-auto">
                    <EmptyState icon="calendar_month" title="Chưa chọn buổi nào"
                        hint="Timeline thuộc về một buổi cụ thể. Mở Đặt lịch, chọn buổi rồi quay lại đây." />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <PageHeader icon="event_note" title="Chương trình" subtitle={event.title.trim() || 'Buổi chưa đặt tên'}>
                <div className="ml-auto flex items-center gap-2">
                    <input ref={fileRef} type="file" accept=".html,.htm" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />
                    <button onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface-variant px-3 py-1.5 text-[13px] hover:text-primary hover:border-primary transition-colors">
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">upload_file</span>Nhập từ file HTML
                    </button>
                    <button onClick={() => save([...segments, newSegment()])}
                        className="inline-flex items-center gap-1.5 rounded-lg btn-lux bg-secondary text-on-secondary px-3 py-1.5 text-[13px] font-semibold hover:opacity-90">
                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">add</span>Thêm đoạn
                    </button>
                </div>
            </PageHeader>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                {segments.length === 0 ? (
                    <EmptyState icon="event_note" title="Chưa dựng Timeline cho buổi này"
                        hint="Nhập từ file HTML của chương trình (đọc được giờ · thời lượng · loại · nội dung), hoặc thêm từng đoạn bằng tay. Người nói luôn phải gán tay — ô người phụ trách trong file gốc là văn xuôi, máy tách không đúng được.">
                        <button onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-lg btn-lux bg-secondary text-on-secondary px-4 py-2 text-sm font-semibold hover:opacity-90">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập từ file HTML
                        </button>
                        <button onClick={() => save([newSegment()])}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant text-on-surface px-4 py-2 text-sm hover:border-primary hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>Thêm đoạn đầu tiên
                        </button>
                    </EmptyState>
                ) : (
                    <>
                        {/* Bảng tổng — trả lời đúng câu hỏi mà không màn nào hôm nay trả lời được:
                            buổi này máy phải câm bao nhiêu lần. */}
                        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-outline-variant bg-surface-container px-4 py-3">
                            <div><div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">TỔNG</div><div className="text-[15px] font-semibold text-on-surface tabular-nums">{stats.rows} đoạn</div></div>
                            <div><div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">MÁY NGHE</div><div className="text-[15px] font-semibold text-secondary tabular-nums">{stats.listen}</div></div>
                            <div><div className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">MÁY CÂM</div><div className="text-[15px] font-semibold text-on-surface-variant tabular-nums">{stats.mute}</div></div>
                            {stats.noSpeaker > 0 && (
                                <div className="ml-auto text-[12px] text-error/90 max-w-md leading-snug">
                                    Còn <b>{stats.noSpeaker}</b> đoạn có tiếng nói nhưng chưa gán người — vẫn dịch được, chỉ là không lấy được tài liệu riêng của người đó.
                                </div>
                            )}
                        </div>

                        {/* Nhập lại kịch bản là mọi `startScriptId` mồ côi cùng lúc. Neo chữ tìm lại được dòng
                            cũ; chỗ nào không tìm được thì nói thẳng chứ không để con trỏ đứng im giữa buổi lễ. */}
                        {(healable || broken > 0) && (
                            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-error/50 bg-error/[0.07] px-4 py-3">
                                <span className="material-symbols-outlined text-error text-[19px]" aria-hidden="true">link_off</span>
                                <div className="flex-1 min-w-[240px] text-[12.5px] leading-snug text-on-surface">
                                    {healable
                                        ? <>Kịch bản đã được nhập lại — có đoạn đang bám theo <b>nội dung dòng</b> chứ không còn bám theo mã. Bấm gắn lại để chốt.</>
                                        : <>Có <b>{broken}</b> đoạn “Bám kịch bản” không dùng được con trỏ: dòng đã mất dấu hoặc chưa được duyệt.</>}
                                </div>
                                {healable && (
                                    <button onClick={() => {
                                        const r = healSegmentAnchors(segments, approvedRows, scriptRows);
                                        save(r.segments);
                                        toast.success(`Đã gắn lại ${r.healed} đoạn${r.lost ? ` · còn ${r.lost} đoạn mất dấu, gắn tay` : ''}`);
                                    }}
                                        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg btn-lux bg-secondary text-on-secondary px-3 py-1.5 text-[13px] font-semibold hover:opacity-90">
                                        <span className="material-symbols-outlined text-[17px]" aria-hidden="true">link</span>Gắn lại tự động
                                    </button>
                                )}
                            </div>
                        )}

                        {segments.map((seg, i) => (
                            <Row key={seg.id} seg={seg} conf={event} scriptRows={scriptRows} docs={docs} anchor={anchors[i]}
                                n={segments.slice(0, i).filter((s) => !s.divider).length + 1}
                                onPatch={(p) => patch(seg.id, p)}
                                onRemove={() => save(segments.filter((s) => s.id !== seg.id))}
                                onAddSpeaker={() => addSpeakerTo(seg.id)} />
                        ))}

                        <p className="pt-2 text-[12px] text-on-surface-variant/70 leading-relaxed">
                            “Tự động” đọc LOẠI dòng để quyết máy nghe hay câm — {autoMode('MC') === 'script' ? 'MC ⇒ bám kịch bản' : ''}, video / bài hát / Yosakoi / chụp ảnh ⇒ câm.
                            Đặt tay “Nghe” hoặc “Câm” thì lệnh tay luôn thắng.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProgramTimeline;
```

### 54.2 `src/App.tsx` — đường dẫn `/program`

**(a)** Find and replace:

```tsx
import DocumentsLibrary from './pages/DocumentsLibrary'
```

with

```tsx
import DocumentsLibrary from './pages/DocumentsLibrary'
import ProgramTimeline from './pages/ProgramTimeline'
```

**(b)** Find and replace:

```tsx
              <Route path="/documents" element={<DocumentsLibrary />} />
```

with

```tsx
              <Route path="/documents" element={<DocumentsLibrary />} />
              <Route path="/program" element={<ProgramTimeline />} />
```

### 54.3 `src/components/OperatorLayout.tsx` — mục menu

Find and replace:

```tsx
    { key: 'prep', label: 'Chuẩn bị', match: ['/prep', '/script', '/glossary', '/voices', '/schedule', '/speakers', '/documents'], tools: [
        { label: 'Tổng quan', icon: 'dashboard', desc: 'Sẵn sàng & đếm ngược', to: '/prep' },
        { label: 'Đặt lịch', icon: 'calendar_month', desc: 'Lịch hội nghị, diễn giả', to: '/schedule' },
        { label: 'Tài liệu', icon: 'folder_open', desc: 'Thư viện tài liệu nguồn', to: '/documents' },
        { label: 'Kịch bản', icon: 'description', desc: 'Câu song ngữ đã duyệt', to: '/script' },
```

with

```tsx
    { key: 'prep', label: 'Chuẩn bị', match: ['/prep', '/script', '/glossary', '/voices', '/schedule', '/speakers', '/documents', '/program'], tools: [
        { label: 'Tổng quan', icon: 'dashboard', desc: 'Sẵn sàng & đếm ngược', to: '/prep' },
        { label: 'Đặt lịch', icon: 'calendar_month', desc: 'Lịch hội nghị, diễn giả', to: '/schedule' },
        { label: 'Tài liệu', icon: 'folder_open', desc: 'Thư viện tài liệu nguồn', to: '/documents' },
        { label: 'Chương trình', icon: 'event_note', desc: 'Timeline & người nói', to: '/program' },
        { label: 'Kịch bản', icon: 'description', desc: 'Câu song ngữ đã duyệt', to: '/script' },
```

---

## TASK 55 — khoá chiều dịch theo người

**Vấn đề, nói bằng một ví dụ có thật trong kịch bản 08/08.** Khách mời người Nhật mở lời bằng
*"Xin chào Việt Nam"* rồi nói tiếp bằng tiếng Nhật. Máy đọc **chữ**, và ba chữ đó đúng là tiếng Việt thật,
nên máy lật chiều dịch sang Việt → Nhật; tệ hơn, chốt chặn "đổi lượt" của M11 thấy tiếng đổi giữa câu nên
**cắt câu làm đôi**. Kết quả trên màn hình khán giả là một mẩu vô nghĩa, rồi phần còn lại của bài phát
biểu dịch ngược chiều cho tới khi máy tự sửa được.

**Chỉ có Chương trình mới biết ai đang cầm micro.** Một người nói MỘT thứ tiếng suốt lượt của họ; ngoại
ngữ chêm vào là **trích dẫn**, và chữ trích dẫn phải nằm nguyên trong câu chứ không được lật cả lượt.

**Điều KHÔNG làm, và phải hiểu vì sao.** Khoá này **không** đụng tới tham số `language` gửi cho máy nghe —
nó vẫn là `'auto'`. Hai lý do, cả hai đều quan trọng: (1) câu tiếng Việt trích dẫn vẫn phải được **chép
đúng** là tiếng Việt, nếu ép máy nghe thành tiếng Nhật thì ba chữ đó thành rác; (2) tham số đó chỉ gửi
được lúc mở kết nối, nên đổi nó giữa buổi lễ đồng nghĩa với **mở lại socket** giữa một bài phát biểu.
Khoá chỉ khoá **chiều dịch**, thứ chạy hoàn toàn trong máy.

### 55.1 `src/lib/lanes/online/onlineLane.ts`

**(a)** Biến trạng thái. Find and replace:

```ts
  const settledDir = new Map<string, 'vi2ja' | 'ja2vi'>();
```

with

```ts
  const settledDir = new Map<string, 'vi2ja' | 'ja2vi'>();
  /**
   * TASK 55 — the running order says who is at the microphone, so it also says which language.
   *
   * A person speaks ONE language. A foreign phrase inside their turn ("Xin chào" from a Japanese guest)
   * is a QUOTATION, not a change of speaker: the direction must stay ja→vi and the quoted words simply
   * ride along inside the sentence. Auto-detection cannot know that — it sees Vietnamese and flips, which
   * both mistranslates the rest of the turn and (via the M11 turn split below) chops the sentence in two.
   *
   * So when a segment names the speaker's language the direction is LOCKED for that segment: the vendor's
   * own tag, the script evidence and the turn split all stand down. `null` = no lock, auto-detect as
   * before — a segment that leaves the language blank keeps exactly the old behaviour.
   *
   * The recogniser is NOT touched: it stays on 'auto' so a quoted Vietnamese phrase is still transcribed
   * as Vietnamese. Only the translation direction is pinned, which is pure client state — no reconnect.
   */
  let lockedSource: Lang | null = null;
```

**(b)** Thứ tự quyết định chiều cho một câu. Khoá đứng **sau** `settledDir` (câu đã chốt rồi thì giữ chiều
cũ — một dòng cũ không bao giờ được nhảy sang cửa sổ khán giả khác) và **trước** mọi phép đoán từ chữ.
Find and replace:

```ts
    const settled = settledDir.get(lid);
    let source: Lang;
    if (settled) source = settled === 'vi2ja' ? 'vi' : 'ja';
```

with

```ts
    const settled = settledDir.get(lid);
    let source: Lang;
    // A sentence that already finalised keeps its direction even if the operator has since moved the
    // running order on — an old line must never jump audience windows.
    if (settled) source = settled === 'vi2ja' ? 'vi' : 'ja';
    // TASK 55: the running order named this speaker's language. Nothing in the text overrules it.
    else if (lockedSource) { source = lockedSource; if (!interim) settledDir.set(lid, directionOf(source)); }
```

**(c)** Chốt chặn "đổi lượt" của M11 đứng xuống khi đang khoá. Find and replace:

```ts
    if (twoWay && decided.language && segmentBuffer.trim()) {
```

with

```ts
    // TASK 55: while the direction is locked there IS no other language — a Vietnamese phrase inside a
    // Japanese turn is a quotation and belongs in the same sentence, so the turn split stands down. The
    // real handover is the operator pressing the next segment, and that flushes the buffer explicitly.
    if (twoWay && !lockedSource && decided.language && segmentBuffer.trim()) {
```

**(d)** Nhãn tiếng của nhà cung cấp cũng đứng xuống. Find and replace:

```ts
    if (twoWay && tracker && decided.language && decided.basis !== 'none') {
```

with

```ts
    // TASK 55: a lock outranks the vendor's tag. The recogniser is right about what it HEARD; it is not
    // right about who is speaking, and a quoted phrase would otherwise settle the whole turn the wrong way.
    if (twoWay && tracker && !lockedSource && decided.language && decided.basis !== 'none') {
```

**(e)** Hàm khoá + công bố ra ngoài. Find and replace:

```ts
  return { id: 'online', start, stop, getDiagnostics, saveSession };
```

with

```ts
  /**
   * TASK 55 — pin (or release) the translation direction for the segment now running.
   *
   * `'vi' | 'ja'` locks; `null` returns to auto-detect. Changing it closes the buffer first: the words
   * still waiting belong to the PREVIOUS speaker and must not be finished in the next speaker's language.
   * The operator's press is better evidence of a handover than any guess made from the text.
   */
  function lockLanguage(language: Lang | null): void {
    if (!twoWay || !tracker) return;
    if (lockedSource === language) return;
    if (segmentBuffer.trim()) flushSegment('turn-end');
    lockedSource = language;
    if (language) tracker.reset(language);
  }

  return { id: 'online', start, stop, getDiagnostics, saveSession, lockLanguage };
```

**(f)** Khai vào kiểu của bộ điều khiển. Find and replace:

```ts
export type OnlineLaneController = LaneController & {
  getDiagnostics(): OnlineDiagnostics;
  saveSession(): Promise<SaveOutcome>;
};
```

with

```ts
export type OnlineLaneController = LaneController & {
  getDiagnostics(): OnlineDiagnostics;
  saveSession(): Promise<SaveOutcome>;
  /**
   * Pin the translation direction to the language the running order says this speaker speaks — or pass
   * `null` to go back to auto-detect.
   *
   * A person speaks ONE language for the length of their turn. A foreign phrase inside it is a quotation,
   * not a handover: a Japanese guest opening with "Xin chào" is still ja→vi, and those two words should
   * ride inside the sentence rather than flipping the rest of the speech and splitting the line in two.
   * Auto-detection reads the words, and the words are genuinely Vietnamese — only the running order knows
   * who is holding the microphone, so only the running order can settle this.
   *
   * While a lock is on, the vendor's language tag, the script classifier and the M11 turn split all stand
   * down. Segments that leave the language blank pass `null` and behave exactly as before.
   */
  lockLanguage(language: Lang | null): void;
};
```

**(g)** Phiên mới bắt đầu bằng tự nhận, không thừa hưởng khoá của buổi trước. Find and replace:

```ts
    settledDir.clear();
    running = true;
```

with

```ts
    settledDir.clear();
    lockedSource = null; // a new session starts on auto-detect; the running order re-arms it per segment
    running = true;
```

---

## TASK 56 — nhả xong một dòng thì máy tự im, tới khi được bấm dòng sau

**Chuyện xảy ra trong phòng, theo đúng thứ tự.** Người điều khiển bấm dòng 1 → MC Mika nói câu 1 bằng
tiếng Việt → máy khớp, đẩy câu 1 và bản dịch đã duyệt lên tường, đọc bằng giọng máy → **MC Nhật đọc bản
dịch tiếng Nhật của chính câu đó** → người điều khiển bấm dòng 2 → Mika nói câu 2.

Chỗ hỏng nằm ở mũi tên áp chót. Trong lúc MC Nhật đọc, máy vẫn nghe, vẫn chép, vẫn dịch — và đó là **một
người thứ hai** đọc **một bản dịch đã có sẵn**. Kết quả: một dòng thừa, dịch ngược lại thứ vừa mới lên
tường, đẩy thẳng ra màn hình khán giả. Không chốt chặn nào hiện có bắt được: chống dội chỉ biết giọng của
chính máy, khoá chiều ở TASK 55 chỉ biết ai *lẽ ra* đang nói.

**Cách chữa: nhả xong là ngủ. Thứ đánh thức là chính cú bấm dòng sau.** Không đoán, không hẹn giờ. Con trỏ
nhích một dòng là máy nghe lại.

**Bấm trễ có mất tiếng không — con số thật.** Không. Máy thu gửi từng gói 4096 mẫu ở 16 kHz, tức
**256 mili giây một gói**, và quyết định câm/nghe áp cho **cả gói tại lúc gói về**, không phải lúc thu.
Nên gói đầu tiên sau cú bấm mang theo tối đa 256 ms tiếng **đã thu TRƯỚC lúc bấm**. Bấm ngay khi MC Nhật
vừa dứt là an toàn; bấm trễ hơn một chút vẫn vớt lại được. Độ trễ tệ nhất từ lúc bấm tới lúc nghe lại là
**một gói = 256 ms**.

**Cái sai duy nhất của cơ chế này là người điều khiển quên bấm.** Nên có hai lớp đỡ: một trần 30 giây
trong lane, và một dòng chữ **ĐANG IM** trên màn điều khiển (TASK 58) để trạng thái đó không bao giờ vô
hình.

### 56.1 `src/lib/lanes/online/onlineLane.ts`

**(a)** Trần cho giấc ngủ. Find and replace:

```ts
const SCRIPT_KEYTERM_LIMIT = 30;
```

with

```ts
const SCRIPT_KEYTERM_LIMIT = 30;

/**
 * TASK 56 — trần cho giấc ngủ sau khi nhả một dòng kịch bản.
 *
 * Cái đánh thức đúng là người điều khiển bấm dòng sau. Trần này chỉ để cái sai duy nhất của cơ chế —
 * người điều khiển quên bấm — không biến thành một micro điếc vĩnh viễn mà không ai hay. 30 giây đủ dài
 * cho MC đọc trọn một đoạn dịch dài, và đủ ngắn để không mất cả một bài phát biểu.
 */
const GUIDED_DEAF_MAX_MS = 30_000;
```

**(b)** Trạng thái. Đặt ngay dưới khối `lockedSource` của TASK 55. Find and replace:

```ts
  let lockedSource: Lang | null = null;
```

with

```ts
  let lockedSource: Lang | null = null;

  /**
   * TASK 56 — dòng kịch bản mà việc NHẢ nó đã đưa micro vào giấc ngủ; -1 = đang thức.
   *
   * Nhả xong dòng N thì trong phòng chỉ còn đúng một việc diễn ra: MC bên kia đọc bản dịch. Máy nghe
   * tiếp là chép lời một người thứ hai và đẩy rác lên tường. Nên nhả xong là ngủ, và thứ đánh thức nó là
   * chính cái bấm dòng N+1 của người điều khiển — không đoán, không hẹn giờ. Con trỏ nhích là thức.
   *
   * Giá của việc thức: đúng MỘT gói tiếng (4096 mẫu @16kHz ≈ 256ms). Và không mất tiếng nào cả — gói tới
   * ngay sau cái bấm mang theo 256ms tiếng ĐÃ THU TRƯỚC lúc bấm, vì quyết định câm/nghe áp cho cả gói tại
   * lúc gói về chứ không phải lúc thu. Bấm hơi trễ vẫn còn vớt lại được.
   */
  let guidedDeafAtIndex = -1;
  let guidedDeafSince = 0;
```

**(c)** Đường tiếng. Đây là chỗ duy nhất quyết định một gói bị câm hay không, và nó phải giữ nguyên hình
dạng đó: một gói bị câm được thay bằng **im lặng dài đúng bằng nó**, không bao giờ là một gói vắng mặt —
nếu không, đồng hồ đếm 1,5 giây im lặng của máy nghe sẽ đứng lại giữa câu. Find and replace:

```ts
          const frame = decideCaptureFrame({ listenPaused: config.getListenPaused?.() ?? false, gateActive });
```

with

```ts
          // TASK 56: con trỏ kịch bản nhích (hoặc tắt dẫn tay, hoặc quá trần) là thức. Đọc mỗi gói —
          // 256ms một lần — nên cái bấm của người điều khiển ăn ngay ở gói kế tiếp.
          if (guidedDeafAtIndex >= 0) {
            const g = config.getGuided?.() ?? GUIDED_OFF;
            if (!g.armed || g.index !== guidedDeafAtIndex || Date.now() - guidedDeafSince > GUIDED_DEAF_MAX_MS) {
              guidedDeafAtIndex = -1;
            }
          }
          const frame = decideCaptureFrame({
            listenPaused: (config.getListenPaused?.() ?? false) || guidedDeafAtIndex >= 0,
            gateActive,
          });
```

**(d)** Ngủ **sau** khi dòng đã lên tường và đã vào bản ghi — không bao giờ trước. Find and replace:

```ts
        if (config.getSpeakEnabled?.()) void speakSnap(verdict.target, verdict.language, lid, order);
```

with

```ts
        if (config.getSpeakEnabled?.()) void speakSnap(verdict.target, verdict.language, lid, order);
        // TASK 56: dòng đã lên tường, giờ tới lượt MC bên kia đọc bản dịch. Ngủ tới khi được bấm dòng sau.
        guidedDeafAtIndex = guided.index;
        guidedDeafSince = Date.now();
```

**(e)** Phiên mới thì thức. Find and replace:

```ts
    lockedSource = null; // a new session starts on auto-detect; the running order re-arms it per segment
    running = true;
```

with

```ts
    lockedSource = null; // a new session starts on auto-detect; the running order re-arms it per segment
    guidedDeafAtIndex = -1;
    guidedDeafSince = 0;
    running = true;
```

**(f)** Công bố ra chẩn đoán, **tách hẳn** khỏi `listenPaused`. Người điều khiển phải phân biệt được "máy
đang chờ tôi bấm" với "tôi đã bấm Ngưng nghe và quên bật lại" — hai chuyện đó chữa bằng hai thao tác khác
nhau. Find and replace:

```ts
  listenPaused: boolean;
  pausedMs: number;
```

with

```ts
  listenPaused: boolean;
  pausedMs: number;
  /**
   * TASK 56 — dẫn theo kịch bản: câu vừa nhả xong, micro đang ngủ chờ bấm dòng sau.
   *
   * Between releasing line N and the operator pressing line N+1 exactly one thing happens in the room:
   * the OTHER MC reads the translation aloud. That is a second human, not a quoted phrase, so neither the
   * half-duplex gate (which only knows our own voice) nor the direction lock covers it — heard and
   * translated, it puts a garbage line on the audience wall. This flag is that sleep, and it is a separate
   * field from `listenPaused` because the operator must be able to tell "máy đang chờ tôi bấm" apart from
   * "tôi đã bấm Ngưng nghe và quên bật lại".
   */
  guidedDeaf: boolean;
```

**(g)** Và điền giá trị. Find and replace:

```ts
      listenPaused: config.getListenPaused?.() ?? false,
      pausedMs: Math.round(pausedMs),
```

with

```ts
      listenPaused: config.getListenPaused?.() ?? false,
      guidedDeaf: guidedDeafAtIndex >= 0,
      pausedMs: Math.round(pausedMs),
```

---

## TASK 57 — độ khớp khi dẫn kịch bản: chọn được, và không chặn câu ngắn nữa

**Lỗi thật, đọc kỹ vì nó tinh vi.** `judgeGuided` từ chối mọi câu nghe được ngắn hơn 8 ký tự (sau khi bỏ
dấu và bỏ mọi ký tự không phải chữ/số). Ý định ban đầu đúng: một tiếng ậm ừ không được phép nhả một dòng
dài mà nó tình cờ trùng vài cặp chữ. Nhưng số 8 đó là **tuyệt đối**, nên nó biến một **dòng kịch bản
ngắn** thành dòng **không bao giờ nhả được**:

| Dòng trong kịch bản 08/08 | Sau chuẩn hoá | Dài | Kết quả cũ |
|---|---|---|---|
| `Một...` | `mot` | 3 | không bao giờ nhả |
| `Hai...` | `hai` | 3 | không bao giờ nhả |
| `Kanpai!` | `kanpai` | 6 | không bao giờ nhả |

Ba dòng đó **nằm trong bản dẫn kịch bản**, người điều khiển bấm đúng dòng, MC đọc đúng chữ. Và micro đã
sát miệng, đã có một lớp chặn ồn ở trước — thêm một lớp lọc cứng nữa là quá tay.

**Sửa: đo theo chính dòng đang bấm.** Yêu cầu thành `min(8, độ dài dòng)` — dòng dài 6 ký tự thì chỉ đòi
nghe 6. Đổi lại, **dòng ngắn dưới 8 ký tự bị đòi giống 80%** thay vì 45%: câu 3 ký tự chỉ có 2 cặp chữ nên
trùng ngẫu nhiên rất dễ, "Một" phải nghe ra "Một" chứ không được là "Hai". Đó là **nâng bar, không phải
cấm** — không lần bấm đúng nào bị chặn.

Và vì con số 0,45 vốn là một hằng số cứng trong mã, nó thành **một nấc chọn được trong Cài đặt**, có nấc
thứ tư **Thả cửa** cho lúc chạy thử.

### 57.1 `src/lib/lanes/online/guidedScript.ts`

**(a)** Find and replace:

```ts
/** Below this many characters nothing is released verbatim, whatever the score says. */
export const GUIDED_MIN_CHARS = 8;
```

with

```ts
/**
 * The length floor — measured against the ARMED LINE, not as an absolute.
 *
 * It used to be an absolute floor on the heard text, and that was wrong: it made a SHORT LINE
 * unreleasable for ever. "Một… Hai… Ba — Kagami Biraki! Kanpai!" is in the script, the operator presses
 * it, the MC says exactly that, and the machine refused because "kanpai" is six characters. The point of
 * the floor was never to filter the room — the microphone is at the mouth and there is a noise gate in
 * front of it already — it was to stop a stray grunt releasing a LONG line it happens to share bigrams
 * with. So the requirement is now `min(8, độ dài dòng)`: a six-character line asks for six characters.
 */
export const GUIDED_MIN_CHARS = 8;

/**
 * A line this short has almost no bigrams, so `diceCoefficient` gets coarse — three characters is two
 * bigrams, and a chance collision is no longer rare. Such a line is held to a higher bar instead of being
 * refused: "Một" must actually be heard as "Một", not as "Hai".
 */
export const GUIDED_SHORT_LINE = 8;
export const GUIDED_SHORT_FLOOR = 0.8;

/**
 * The bar this heard sentence really has to clear.
 *
 * `base <= 0` is "thả cửa": the operator pressing the line IS the evidence and nothing is measured. Every
 * other setting keeps the short-line bump, which never blocks a correct press — only a wrong one.
 */
export function guidedBarFor(lineLength: number, base: number = GUIDED_FLOOR): number {
    if (base <= 0) return 0;
    return lineLength > 0 && lineLength < GUIDED_SHORT_LINE ? Math.max(base, GUIDED_SHORT_FLOOR) : base;
}
```

**(b)** Sàn độ dài thành tương đối. Find and replace:

```ts
    const text = normalizeForMatch(heard);
    if (text.length < GUIDED_MIN_CHARS) {
        return { kind: 'mismatch', score: 0, reason: `câu quá ngắn (${text.length} ký tự)` };
    }
```

with

```ts
    const text = normalizeForMatch(heard);
    // Measured against the LINE the operator is pointing at, so a short line stays reachable. The longer
    // of the two sides is the yardstick: the same row is read in Vietnamese by one MC and in Japanese by
    // the other, and whichever is being read now, the row is as long as its longer side.
    const lineLength = Math.max(normalizeForMatch(row.src).length, normalizeForMatch(row.dst).length);
    const need = Math.min(GUIDED_MIN_CHARS, lineLength);
    if (floor > 0 && text.length < need) {
        return { kind: 'mismatch', score: 0, reason: `câu quá ngắn (${text.length}/${need} ký tự)` };
    }
```

**(c)** Vạch điểm thành tương đối. Find and replace:

```ts
    if (score < floor) {
        return { kind: 'mismatch', score, reason: `không giống dòng ${index + 1} (${score})` };
    }
```

with

```ts
    const bar = guidedBarFor(lineLength, floor);
    if (score < bar) {
        return { kind: 'mismatch', score, reason: `không giống dòng ${index + 1} (${score}/${bar})` };
    }
```

### 57.2 Tệp mới `src/lib/lanes/online/guidedMatch.ts`

Bốn nấc, đặt tên chứ không phải một con số — cùng hình dạng với "nhịp nói của buổi", và cùng một lý do:
người chỉnh nó mười phút trước giờ khai mạc sẽ không ngồi suy nghĩ về hệ số Dice.

Nấc thứ tư là một **loại** khác chứ không phải một con số nhỏ hơn. `open` mang sàn 0, mà `judgeGuided` đọc
là "không đo gì cả": người điều khiển đã bấm dòng, và người điều khiển **chính là** bằng chứng. Đó là nấc
đúng cho lúc tổng duyệt, cho lúc đọc rà kịch bản khi không có ai ở micro, và cho một buổi mà máy nghe đang
có một đêm tồi tệ — và là nấc **sai** cho buổi lễ thật, vì một con trỏ đặt lùi một dòng sẽ đẩy hẳn một câu
đã duyệt **khác** ra loa hội trường bằng giọng người, và không rút lại được.

Tạo tệp với đúng nội dung này:

```ts
// src/lib/lanes/online/guidedMatch.ts — "độ khớp khi dẫn theo kịch bản": how closely the machine must
// recognise the line before it releases the approved translation the operator is pointing at.
//
// Four named steps, never a number, for the same reason as `speechRhythm`: the person setting this ten
// minutes before a ceremony is not going to reason about a Dice coefficient.
//
// The fourth step is a different KIND of step rather than a lower number. `open` carries floor 0, which
// `judgeGuided` reads as "measure nothing": the operator pressed the line, and the operator IS the
// evidence. That is the right setting for a rehearsal, for a read-through where nobody is at the
// microphone, and for a run where the recogniser is having a bad night — and it is the wrong setting for
// a live ceremony with no second witness, because a cursor left one line behind will now put the WRONG
// approved sentence on the audience wall in a confident human voice, and that cannot be taken back.
//
// Pure module: no React, no fetch, no DOM. Persisted, like the mishearing box — a setting found during a
// rehearsal must still be there on the night.

export type GuidedMatch = 'strict' | 'normal' | 'loose' | 'open';

export const GUIDED_MATCH_KEY = 'proyaku_online_guided_match';
export const GUIDED_MATCH_DEFAULT: GuidedMatch = 'normal';

export const GUIDED_MATCH_OPTIONS: readonly {
    value: GuidedMatch;
    label: string;
    /** the bar handed to `judgeGuided`; 0 means "don't measure at all" */
    floor: number;
    hint: string;
}[] = [
    {
        value: 'strict',
        label: 'Chặt',
        floor: 0.6,
        hint: 'Chỉ nhả khi máy nghe gần đúng nguyên câu. An toàn nhất, nhưng bỏ lỡ nhiều.',
    },
    {
        value: 'normal',
        label: 'Thường',
        floor: 0.45,
        hint: 'Mặc định. Nghe na ná là nhả — vẫn đủ để chặn một con trỏ đặt nhầm dòng.',
    },
    {
        value: 'loose',
        label: 'Thoáng',
        floor: 0.3,
        hint: 'Cho máy nghe sai nhiều hơn mà vẫn nhả. Dùng khi hội trường ồn hoặc người nói lệch kịch bản.',
    },
    {
        value: 'open',
        label: 'Thả cửa',
        floor: 0,
        hint: 'Bấm dòng nào nhả dòng đó, không soi chữ. Dùng khi chạy thử. Bấm nhầm dòng là ra câu khác.',
    },
];

const byValue = (v: unknown): GuidedMatch =>
    GUIDED_MATCH_OPTIONS.some((o) => o.value === v) ? (v as GuidedMatch) : GUIDED_MATCH_DEFAULT;

export function loadGuidedMatch(): GuidedMatch {
    try {
        return byValue(localStorage.getItem(GUIDED_MATCH_KEY));
    } catch {
        return GUIDED_MATCH_DEFAULT; // private mode → the default, never a crash
    }
}

export function saveGuidedMatch(value: GuidedMatch): void {
    try {
        localStorage.setItem(GUIDED_MATCH_KEY, byValue(value));
    } catch {
        /* private mode / quota — the session still runs, it just will not be remembered */
    }
}

/** The number `judgeGuided` wants. Unknown input reads as the default rather than as "measure nothing". */
export const guidedMatchFloor = (value: GuidedMatch): number =>
    GUIDED_MATCH_OPTIONS.find((o) => o.value === byValue(value))?.floor ?? 0.45;

export const guidedMatchLabel = (value: GuidedMatch): string =>
    GUIDED_MATCH_OPTIONS.find((o) => o.value === byValue(value))?.label ?? 'Thường';
```

### 57.3 Tệp mới `src/lib/lanes/online/components/OnlineGuidedMatchSettings.tsx`

Cố ý **không** gọi `useOnlineLane` — cùng lý do với `OnlineMicSettings` / `OnlineRhythmSettings`: một
trang cấu hình không được dựng đồng hồ chẩn đoán, bộ phát màn khán giả hay lần tải danh sách giọng đọc.

Tạo tệp với đúng nội dung này:

```tsx
// src/lib/lanes/online/components/OnlineGuidedMatchSettings.tsx — the "Độ khớp khi dẫn theo kịch bản"
// Settings section (TASK 57.3).
//
// Chỉ có tác dụng khi chế độ DẪN THEO KỊCH BẢN đang bật. Ở mọi chế độ khác, không nấc nào của màn này
// đụng tới cái gì cả — máy vẫn dịch như thường.
//
// Vì sao tồn tại: sàn khớp từng là một con số cứng trong mã (0,45) và nó chặn đúng những dòng người vận
// hành CẦN — "Một…", "Hai…", "Kanpai!" đều nằm trong bản dẫn kịch bản, người điều khiển bấm đúng dòng,
// mà máy vẫn không nhả. Micro đã sát miệng và đã có một lớp chặn ồn ở trước; thêm một lớp lọc cứng nữa
// là quá tay. Nay số đó là một nấc chọn được, và nấc "Thả cửa" bỏ hẳn việc đo.
//
// Deliberately does NOT call `useOnlineLane` — same reason as OnlineMicSettings / OnlineRhythmSettings:
// a config page must not spin up diagnostics timers, the audience publisher, or the voice-catalog fetch.

import React, { useState } from 'react'
import { GUIDED_MATCH_OPTIONS, loadGuidedMatch, saveGuidedMatch, guidedMatchLabel, type GuidedMatch } from '../index'
import { toast } from '../../../toast'

/** 0.45 → "45%". Người vận hành đọc phần trăm, không đọc hệ số Dice. */
const pct = (floor: number): string => `${Math.round(floor * 100)}%`

const OnlineGuidedMatchSettings: React.FC = () => {
  const [value, setValue] = useState<GuidedMatch>(() => loadGuidedMatch())

  const choose = (v: GuidedMatch) => {
    setValue(v)
    saveGuidedMatch(v)
    toast.success(
      v === 'open'
        ? 'Đã chọn Thả cửa — bấm dòng nào nhả dòng đó, máy không soi chữ nữa'
        : `Đã chọn ${guidedMatchLabel(v)} — máy phải nghe giống dòng đó ít nhất ${pct(GUIDED_MATCH_OPTIONS.find((o) => o.value === v)?.floor ?? 0.45)}`,
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Khi đang <strong>dẫn theo kịch bản</strong>: người điều khiển bấm một dòng, máy nghe câu vừa nói, và
        chỉ đọc lên <strong>bản dịch đã duyệt</strong> của dòng đó nếu thấy đủ giống. Nấc này quyết định{' '}
        <strong>“đủ giống” là bao nhiêu</strong>. Không ảnh hưởng gì tới các chế độ khác.
      </p>

      <div role="radiogroup" aria-label="Độ khớp khi dẫn theo kịch bản" className="space-y-2">
        {GUIDED_MATCH_OPTIONS.map((o) => {
          const on = value === o.value
          return (
            <label
              key={o.value}
              htmlFor={`guided-match-${o.value}`}
              className={`flex items-start gap-3 rounded-DEFAULT border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-secondary bg-surface' : 'border-outline-variant hover:border-primary'}`}
            >
              <input
                id={`guided-match-${o.value}`}
                type="radio"
                name="guided-match"
                value={o.value}
                checked={on}
                onChange={() => choose(o.value)}
                className="accent-secondary mt-1"
              />
              <span className="min-w-0">
                <span className={`font-label-caps text-label-caps ${on ? 'text-secondary' : 'text-on-surface'}`}>
                  {o.label}
                  <span className="ml-2 tabular-nums text-on-surface-variant">
                    {o.floor > 0 ? `giống ≥ ${pct(o.floor)}` : 'không đo'}
                  </span>
                </span>
                <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Đang chọn: <strong>{guidedMatchLabel(value)}</strong>
        {value === 'open'
          ? ' — máy không đo gì cả, bấm dòng nào nhả dòng đó. Bấm nhầm dòng là ra câu khác trước mặt khán giả.'
          : ' — dòng NGẮN (dưới 8 ký tự, ví dụ “Một…”, “Kanpai!”) vẫn nhả được: máy chỉ đòi nghe đúng chừng đó chữ, nhưng đòi giống hơn (80%) vì câu ngắn dễ trùng ngẫu nhiên.'}{' '}
        <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi. Lưu trên máy này.
      </p>
    </div>
  )
}

export default OnlineGuidedMatchSettings
```

### 57.4 `src/lib/lanes/online/onlineLane.ts` — lane hỏi sàn ở TỪNG câu

Đọc lại ở mỗi câu chứ không chốt lúc `start()`: đổi nấc giữa buổi lễ phải ăn ngay câu sau, không phải Dừng
rồi Bắt đầu lại. Giữa một buổi lễ, đó là khác biệt giữa sửa được và không.

**(a)** Find and replace:

```ts
import { judgeGuided, GUIDED_OFF, type GuidedState } from './guidedScript';
```

with

```ts
import { judgeGuided, GUIDED_FLOOR, GUIDED_OFF, type GuidedState } from './guidedScript';
```

**(b)** Find and replace:

```ts
  getGuided?: () => GuidedState | undefined;
```

with

```ts
  getGuided?: () => GuidedState | undefined;
  /**
   * Độ khớp khi dẫn theo kịch bản, đọc LẠI ở từng câu — đổi nấc trong Cài đặt là ăn ngay câu sau, không
   * phải Dừng rồi Bắt đầu lại. Giữa buổi lễ đó là khác biệt giữa sửa được và không.
   */
  getGuidedFloor?: () => number;
```

**(c)** Find and replace:

```ts
      const verdict = judgeGuided(guided, scriptSeedRows, head);
```

with

```ts
      const verdict = judgeGuided(guided, scriptSeedRows, head, config.getGuidedFloor?.() ?? GUIDED_FLOOR);
```

### 57.5 `src/pages/Settings.tsx` — mục mới

**(a)** Find and replace:

```tsx
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings } from '../lib/lanes/online';
```

with

```tsx
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings, OnlineGuidedMatchSettings } from '../lib/lanes/online';
```

**(b)** Find and replace:

```tsx
                        <OnlineRhythmSettings />
                    </Section>
```

with

```tsx
                        <OnlineRhythmSettings />
                    </Section>

                    {/* CHẾ ĐỘ ONLINE — ĐỘ KHỚP KHI DẪN THEO KỊCH BẢN (TASK 57) */}
                    <Section id="gm" icon="rule" title="Chế độ ONLINE — Độ khớp khi dẫn theo kịch bản" desc="Bấm một dòng kịch bản thì máy phải nghe giống tới đâu mới đọc lên bản dịch đã duyệt. Nấc Thả cửa: bấm là nhả.">
                        <OnlineGuidedMatchSettings />
                    </Section>
```

### 57.6 `src/lib/lanes/online/index.ts` — nối nấc đã chọn vào lane

**(a)** Find and replace:

```ts
import { SUBTITLE_FONT, clampSubtitleFont } from '../../audienceSubtitles'
```

with

```ts
import { SUBTITLE_FONT, clampSubtitleFont } from '../../audienceSubtitles'
// TASK 57 — sàn khớp của chế độ dẫn tay. Đọc từ localStorage ở TỪNG câu, không giữ trong state React:
// đổi nấc trong Cài đặt phải ăn ngay câu sau, không đợi màn console vẽ lại.
import { guidedMatchFloor, loadGuidedMatch } from './guidedMatch'
```

**(b)** Find and replace:

```ts
  rhythmPauseSecs, rhythmCommitWindows, clampPauseSecs,
} from './speechRhythm'
```

with

```ts
  rhythmPauseSecs, rhythmCommitWindows, clampPauseSecs,
} from './speechRhythm'
// TASK 57 — "độ khớp khi dẫn theo kịch bản". Cùng hình dạng với nhịp nói: Cài đặt chọn nấc, lane đọc
// LẠI ở từng câu. Nấc "Thả cửa" mang sàn 0 = bấm dòng nào nhả dòng đó, dùng lúc chạy thử.
export type { GuidedMatch } from './guidedMatch'
export {
  GUIDED_MATCH_KEY, GUIDED_MATCH_DEFAULT, GUIDED_MATCH_OPTIONS,
  loadGuidedMatch, saveGuidedMatch, guidedMatchFloor, guidedMatchLabel,
} from './guidedMatch'
```

**(c)** Find and replace:

```ts
        getGuided: () => guidedRef.current,
```

with

```ts
        getGuided: () => guidedRef.current,
        getGuidedFloor: () => guidedMatchFloor(loadGuidedMatch()),
```

**(d)** Find and replace:

```ts
export { default as OnlineRhythmSettings } from './components/OnlineRhythmSettings'
```

with

```ts
export { default as OnlineRhythmSettings } from './components/OnlineRhythmSettings'
//   OnlineGuidedMatchSettings — the Settings "Độ khớp khi dẫn theo kịch bản" section (TASK 57): how
//   closely the machine must recognise the armed line before it releases the approved translation.
export { default as OnlineGuidedMatchSettings } from './components/OnlineGuidedMatchSettings'
```

---

## TASK 58 — màn điều khiển: một cú bấm thay bốn, và bảng dẫn đọc được

Hai việc trong một TASK vì chúng đụng cùng một vùng mã, và tách ra thì phải sửa cùng chỗ hai lần.

**Việc 1 — vá lỗi ③ của PHẦN 6.** Neo `<div>{scriptLoadMessage(scriptLoad)}</div>` mà §35.2(b) dùng có
**hai** bản trong tệp, và nó trúng bản nằm trong biến `prepCounts`. `prepCounts` chỉ được vẽ trong hai
popup của Chuẩn bị (`panel === 'terms'` và `panel === 'brief'`), nên bảng dẫn: (1) **không có trên màn
chạy** — giữa buổi lễ phải mở popup chuẩn bị mới bấm được Tới/Lùi; (2) vẽ **hai lần**, kèm hai phần tử
trùng `id="guided-speaker-names"`.

**Việc 2 — giao diện.** Ảnh chụp màn hình cho thấy hậu quả của §35.2(d): mọi lớp `guided-*` là ô nhập trần
của trình duyệt trong một ứng dụng Tailwind + Material 3, nhét vào một cột rộng 248px, và danh sách 40
dòng kịch bản **không đọc nổi**. Bản mới:

- **Cột trái giữ ĐIỀU KHIỂN**, không giữ nội dung: chọn phần · chọn người · kiểu nói · công tắc Dẫn ·
  **thẻ hiện đúng dòng đang chọn (cả hai mặt)** · Lùi/Tới ô bấm to.
- **Kịch bản chuyển sang popup rộng 660px**, cuộn được, tự kéo dòng đang chọn vào giữa màn, bấm dòng nào
  là con trỏ nhảy tới dòng đó, hiện cả hai mặt và nhãn "chưa duyệt".
- Người nói đổi từ ô gõ tay thành **chọn từ danh sách người của buổi**, có "Khác…" cho khách gọi lên từ
  hàng ghế. Tên gõ dưới ánh đèn sân khấu là tên viết khác với danh sách.

### 58.1 `src/lib/lanes/online/index.ts` — bốn thứ trong một lời gọi

**(a)** Kiểu của hook. Find and replace:

```ts
  guidedText: string
```

with

```ts
  guidedText: string
  /**
   * TASK 58 — bấm sang một đoạn của Timeline. MỘT lời gọi đặt cả bốn thứ mà hôm nay người điều khiển
   * phải bấm riêng lẻ giữa buổi lễ: ai đang nói · kiểu nói · máy nghe hay câm · con trỏ dòng kịch bản;
   * cộng một cú mách tiếng cho bộ theo dõi trước câu đầu tiên.
   *
   * Facade nhận DỮ LIỆU THUẦN chứ không nhận `Segment`: lane không được import `src/lib/schedule.ts`
   * (luật 2 của CLAUDE.md), và một đoạn Timeline là chuyện của màn Chuẩn bị, không phải của lane.
   */
  applySegment: (seg: {
    speakerName?: string
    mode?: SpeakerMode
    listen?: boolean
    scriptIndex?: number
    language?: 'vi' | 'ja' | ''
  }) => void
  /** TASK 58 — bối cảnh riêng của đoạn đang chạy. Rỗng ⇒ dùng ô Bối cảnh chung của buổi. */
  setSegmentBrief: (v: string) => void
```

**(b)** Bối cảnh của đoạn. Cố ý **không** ghi đè ô Bối cảnh: ô đó là bối cảnh chung của cả buổi và người
điều khiển đã soạn nó bằng tay. Find and replace:

```ts
  const briefRef = useRef('')
  briefRef.current = brief
```

with

```ts
  const briefRef = useRef('')
  briefRef.current = brief
  // TASK 58 — bối cảnh của ĐOẠN đang chạy. Cố ý KHÔNG ghi đè ô Bối cảnh: ô đó là bối cảnh chung của cả
  // buổi và người điều khiển đã soạn nó; đây là một kênh riêng, rỗng thì tự quay về ô chung.
  const segmentBriefRef = useRef('')
  const setSegmentBrief = useCallback((v: string) => { segmentBriefRef.current = v }, [])
```

**(c)** Lời gọi một-đặt-bốn. Find and replace:

```ts
  useEffect(() => { setGuided(GUIDED_OFF) }, [script])
```

with

```ts
  useEffect(() => { setGuided(GUIDED_OFF) }, [script])
  const applySegment = useCallback((seg: {
    speakerName?: string; mode?: SpeakerMode; listen?: boolean; scriptIndex?: number; language?: 'vi' | 'ja' | ''
  }) => {
    if (seg.speakerName !== undefined) setSpeakerName(seg.speakerName)
    if (seg.mode) {
      setSpeakerModeState(seg.mode)
      speakerModeRef.current = seg.mode
      // Same ONE-WAY rule as setSpeakerMode: a segment may disarm guided release, never arm it. Arming
      // stays a deliberate human act — picking the next item off a running order is not that.
      if (!guidedAllowed(seg.mode)) setGuided((prev) => ({ ...prev, armed: false }))
    }
    if (seg.listen !== undefined) {
      setListenPaused(!seg.listen)
      listenPausedRef.current = !seg.listen
    }
    if (typeof seg.scriptIndex === 'number' && seg.scriptIndex >= 0) {
      setGuided((prev) => ({ ...prev, index: clampGuidedIndex(seg.scriptIndex as number, scriptRef.current.length) }))
    }
    // Last: pin the direction to this speaker's language. A segment that declares NO language releases
    // the pin rather than leaving the previous speaker's language latched on — "để trống" means
    // auto-detect, and it has to actually mean that or a blank segment would inherit a stale lock.
    if (seg.language !== undefined) {
      laneRef.current?.lockLanguage(seg.language === 'vi' || seg.language === 'ja' ? seg.language : null)
    }
  }, [])
```

**(d)** Bối cảnh sống, đọc lại ở mỗi câu. Find and replace:

```ts
        getListenPaused: () => listenPausedRef.current,
```

with

```ts
        getListenPaused: () => listenPausedRef.current,
        getBrief: () => segmentBriefRef.current,
```

**(e)** Trả ra ngoài. Find and replace:

```ts
    guided, setGuidedArmed, setGuidedIndex, stepGuided, guidedText,
```

with

```ts
    guided, setGuidedArmed, setGuidedIndex, stepGuided, guidedText, applySegment, setSegmentBrief,
```

### 58.2 `src/lib/lanes/online/onlineLane.ts` — bối cảnh của đoạn thắng bối cảnh chung

**(a)** Khai vào cấu hình. Find and replace:

```ts
  getListenPaused?: () => boolean;
```

with

```ts
  getListenPaused?: () => boolean;
  /**
   * TASK 58 — bối cảnh SỐNG, đọc lại ở mỗi câu thay vì chốt một lần lúc Bắt đầu.
   *
   * `opts.brief` là bối cảnh chung của cả buổi. Nhưng một buổi lễ có nhiều người nói, mỗi người mang
   * tài liệu riêng, và ngân sách 1500 ký tự chia đều cho cả kho thì mỗi tài liệu chỉ còn vài trăm ký
   * tự — dưới sàn 120 ký tự của `prepData` là rơi SẠCH, không một chữ nào tới được mô hình. Trả về
   * bối cảnh của ĐOẠN đang chạy thì đúng người đó được trọn ngân sách.
   *
   * Rỗng ⇒ quay về `opts.brief`. Không có getter ⇒ hành xử y như trước.
   */
  getBrief?: () => string;
```

**(b)** Dùng nó. Find and replace:

```ts
      sessionBrief: o.brief,
```

with

```ts
      sessionBrief: (config.getBrief?.() || '').trim() || o.brief,
```

### 58.3 `src/lib/lanes/online/components/OnlineConsole.tsx`

**(a)** Hai import. Find and replace:

```tsx
import { useOnlineLane, fetchOnlineConfigStatus, summarizePrepDocs, ONLINE_SPEED_RANGE, SUBTITLE_FONT, type LaneStatus, type OnlineVoice, type AudienceLine, type WallOutput, type WallDock, MIC_SENSITIVITY_OPTIONS, micSensitivityLabel, LOUD_GATE_OPTIONS, resolveLoudThreshold, type MicSensitivity, type LoudGateMode, splitMishearingLines, previewKeyterms, KEYTERM_MAX, KEYTERM_MAX_LEN, fetchOnlineGlossary, saveOnlineGlossary, parseGlossaryLines, formatGlossaryLines, fetchSessionBoxes, saveSessionBoxes, EMPTY_SESSION_BOXES, fetchMishearings, saveMishearings } from '../index'
import { useConferenceMode } from '../../../ConferenceModeContext'
import { useActiveEvent } from '../../../ActiveEventContext'
import { collectPrepPack, collectPrepDocuments, collectPrepHeader, type PrepPack } from '../../../prepData'
import { savePrepSummary, clearPrepSummary, getPrepSummary, type PrepSummary } from '../../../prepSummary'
import { kbScopeId } from '../../../kbscope'
import { loadScriptForSession, approveTranslatedRows, scriptLoadMessage, type ScriptLoad } from '../../../scriptLoad'
import { GUIDED_FLOOR, SPEAKER_MODES, guidedAllowed, guidedBlockedReason } from '../guidedScript'
import SubtitleParagraphs from '../../../../components/SubtitleParagraphs'

type CfgStatus = Awaited<ReturnType<typeof fetchOnlineConfigStatus>>
```

with

```tsx
import { useOnlineLane, fetchOnlineConfigStatus, summarizePrepDocs, ONLINE_SPEED_RANGE, SUBTITLE_FONT, type LaneStatus, type OnlineVoice, type AudienceLine, type WallOutput, type WallDock, MIC_SENSITIVITY_OPTIONS, micSensitivityLabel, LOUD_GATE_OPTIONS, resolveLoudThreshold, type MicSensitivity, type LoudGateMode, splitMishearingLines, previewKeyterms, KEYTERM_MAX, KEYTERM_MAX_LEN, fetchOnlineGlossary, saveOnlineGlossary, parseGlossaryLines, formatGlossaryLines, fetchSessionBoxes, saveSessionBoxes, EMPTY_SESSION_BOXES, fetchMishearings, saveMishearings } from '../index'
import { useConferenceMode } from '../../../ConferenceModeContext'
import { useActiveEvent } from '../../../ActiveEventContext'
import { collectPrepPack, collectPrepDocuments, collectPrepHeader, collectSegmentBrief, type PrepPack } from '../../../prepData'
import { savePrepSummary, clearPrepSummary, getPrepSummary, type PrepSummary } from '../../../prepSummary'
import { kbScopeId } from '../../../kbscope'
import { loadScriptForSession, approveTranslatedRows, scriptLoadMessage, type ScriptLoad } from '../../../scriptLoad'
import { SPEAKER_MODES, guidedAllowed, guidedBlockedReason } from '../guidedScript'
// TASK 57 — sàn khớp THẬT đang dùng, do màn Cài đặt quyết định. Màn này từng in hằng số mặc định 45%; khi
// có nấc chọn thì con số in ra phải là con số đang chạy, nếu không thì nấc "Thả cửa" vẫn khoe "ít nhất 45%".
import { guidedMatchFloor, guidedMatchLabel, loadGuidedMatch } from '../guidedMatch'
import { segmentListens, segmentLanguage, segmentSpeakerName, segmentLabel, resolveScriptAnchor, anchorMessage } from '../../../segments'
import SubtitleParagraphs from '../../../../components/SubtitleParagraphs'

type CfgStatus = Awaited<ReturnType<typeof fetchOnlineConfigStatus>>
```

**(b)** Popup mới + hằng số cho ô "Khác…". Find and replace:

```tsx
  </div>
)

type Panel = 'gate' | 'voice' | 'terms' | 'brief' | 'glossary' | 'wall' | null

function wallSupportLine(support: string, count: number): string {
  if (support === 'multi') return `Thấy ${count} màn hình — chọn màn cho từng cửa sổ rồi bấm Xuất.`
```

with

```tsx
  </div>
)

type Panel = 'gate' | 'voice' | 'terms' | 'brief' | 'glossary' | 'wall' | 'script' | null

// Sentinel for the "Khác…" row of the speaker dropdown. Deliberately not a name-shaped string: a real
// person on the roster must never be able to collide with it.
const OTHER_SPEAKER = '::khac::'

function wallSupportLine(support: string, count: number): string {
  if (support === 'multi') return `Thấy ${count} màn hình — chọn màn cho từng cửa sổ rồi bấm Xuất.`
```

**(c)** Ba biến trạng thái. Find and replace:

```tsx
  // the script status has to be true from that second rather than after some promise settles.
  const [scriptLoad, setScriptLoad] = useState<ScriptLoad>(() => loadScriptForSession(eventId))
  const prepLoadedRef = useRef('')

  // Report running state + register the stop function to the neutral context, so the head-bar DỪNG can
  // relay to this lane and the lane switch locks while a capture is live. (ConferenceModeContext is
```

with

```tsx
  // the script status has to be true from that second rather than after some promise settles.
  const [scriptLoad, setScriptLoad] = useState<ScriptLoad>(() => loadScriptForSession(eventId))
  const prepLoadedRef = useRef('')
  // "Đang tới lượt" is normally picked off the meeting's own speaker list. `otherSpeaker` is the escape
  // hatch for the person who was never on it (a guest called up from the floor) — free text, as before.
  const [otherSpeaker, setOtherSpeaker] = useState(false)
  // Đoạn Timeline đang tới lượt. -1 = chưa bấm sang đoạn nào (buổi chưa bắt đầu, hoặc buổi không dựng
  // Timeline) — khi đó màn này hành xử đúng như trước: bấm tay từng ô.
  const [segIndex, setSegIndex] = useState(-1)
  // Nấc khớp đang chọn, CHỈ để in ra cho người điều khiển đọc. Quyết định nhả câu vẫn nằm ở lane, và lane
  // đọc lại nấc này ở TỪNG câu. Đọc lại mỗi lần mở bảng kịch bản là đủ: nấc chỉ đổi được ở màn Cài đặt,
  // tức người dùng đã rời màn này rồi quay lại.
  const [matchStep, setMatchStep] = useState(() => loadGuidedMatch())
  // The armed line, scrolled into view inside the wide script popup. During a ceremony the operator must
  // never have to hunt for the highlighted row after pressing TỚI twenty times.
  const guidedLineRef = useRef<HTMLLIElement | null>(null)

  // Report running state + register the stop function to the neutral context, so the head-bar DỪNG can
  // relay to this lane and the lane switch locks while a capture is live. (ConferenceModeContext is
```

**(d) — đây là bản vá lỗi ③.** Bỏ **toàn bộ** bảng dẫn mà PHẦN 6 đặt nhầm vào `prepCounts`. Nó được dựng
lại ở đúng chỗ trong khối (g). Find and replace:

```tsx
      {/* M9 — an empty or unapproved script behaves exactly like a script that never matches, so it must
          be said out loud here; nothing else on this screen would tell the operator before going live. */}
      <div>{scriptLoadMessage(scriptLoad)}</div>
      {/* TASK 35 — dẫn theo kịch bản. Only offered once the script actually loaded: arming a cursor over
          zero rows is a button that can only disappoint. Kept right under the script status line so the
          two are read together — "kịch bản nào" and "đang ở dòng nào" are one question in practice. */}
      {lane.script.length > 0 && (
        <div className="guided-panel">
          {/* TASK 36 — the speaker list already exists on the meeting (`Conference.speakers[]`); nothing
              is added to the script format for this. An empty list is normal for a meeting nobody filled
              in, so the box stays usable as free text. */}
          <div className="guided-speaker">
            <label>
              Đang tới lượt{' '}
              <input
                type="text"
                list="guided-speaker-names"
                value={lane.speakerName}
                onChange={(e) => lane.setSpeakerName(e.target.value)}
                placeholder="tên người đang nói"
              />
            </label>
            <datalist id="guided-speaker-names">
              {(event?.speakers ?? []).map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
            <label>
              Kiểu nói{' '}
              <select
                value={lane.speakerMode}
                onChange={(e) => lane.setSpeakerMode(e.target.value as typeof lane.speakerMode)}
              >
                {SPEAKER_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <div className="guided-hint">
              {SPEAKER_MODES.find((m) => m.value === lane.speakerMode)?.hint}
            </div>
          </div>
          <label>
            <input
              type="checkbox"
              checked={lane.guided.armed}
              disabled={!guidedAllowed(lane.speakerMode)}
              onChange={(e) => lane.setGuidedArmed(e.target.checked)}
            />{' '}
            Dẫn theo kịch bản
          </label>
          {!guidedAllowed(lane.speakerMode) && (
            <div className="guided-blocked">{guidedBlockedReason(lane.speakerMode)}</div>
          )}
          <div className="guided-readout">{lane.guidedText}</div>
          {lane.guided.armed && (
            <>
              <div className="guided-buttons">
                <button type="button" onClick={() => lane.stepGuided(-1)} disabled={lane.guided.index <= 0}>
                  ← Lùi
                </button>
                <button
                  type="button"
                  onClick={() => lane.stepGuided(1)}
                  disabled={lane.guided.index >= lane.script.length - 1}
                >
                  Tới →
                </button>
              </div>
              {/* The list is the operator's paper script on screen. Clicking a line IS the cursor move —
                  during a ceremony nobody counts button presses to get from line 3 to line 17. */}
              <ol className="guided-list">
                {lane.script.map((row, i) => (
                  <li
                    key={row.id}
                    className={i === lane.guided.index ? 'guided-line guided-line-now' : 'guided-line'}
                    onClick={() => lane.setGuidedIndex(i)}
                  >
                    <span className="guided-num">{i + 1}</span>
                    <span className="guided-src">{row.src}</span>
                    {row.status !== 'approved' ? <span className="guided-draft"> · chưa duyệt</span> : null}
                  </li>
                ))}
              </ol>
              <div className="guided-note">
                Máy chỉ đọc nguyên văn dòng đang chọn khi câu vừa nghe giống dòng đó ít nhất{' '}
                {Math.round(GUIDED_FLOOR * 100)}%. Nếu không giống, máy tự dịch như bình thường — bấm sai
                dòng không làm buổi lễ tệ hơn khi tắt chế độ này.
              </div>
            </>
          )}
        </div>
      )}
      {/* TASK 20 — the operator has to be able to tell "this will be here tomorrow" from "this is in this
          tab only". One short line; it appears under both boxes because both are saved together. */}
      <div>{boxesSaved ? 'Đã nhớ Thuật ngữ và Bối cảnh cho buổi này' : 'Chưa lưu — gõ xong vài giây là tự nhớ cho buổi này'}</div>
```

with

```tsx
      {/* M9 — an empty or unapproved script behaves exactly like a script that never matches, so it must
          be said out loud here; nothing else on this screen would tell the operator before going live. */}
      <div>{scriptLoadMessage(scriptLoad)}</div>
      {/* TASK 20 — the operator has to be able to tell "this will be here tomorrow" from "this is in this
          tab only". One short line; it appears under both boxes because both are saved together. */}
      <div>{boxesSaved ? 'Đã nhớ Thuật ngữ và Bối cảnh cho buổi này' : 'Chưa lưu — gõ xong vài giây là tự nhớ cho buổi này'}</div>
```

**(e)** Tự kéo dòng đang chọn vào giữa màn khi mở popup kịch bản. Find and replace:

```tsx
  }
  // Scan the screens the first time the flyout opens — the permission prompt must be tied to the action.
  useEffect(() => { if (panel === 'wall' && lane.wallSupport === 'idle') void lane.scanWall() }, [panel, lane.wallSupport, lane])
  const enabledWallCount = lane.wallOutputs.filter((o) => o.enabled).length
  const wallNoteMsg = wallNote && wallNote.atCount === lane.wallOpenIds.length ? wallNote.msg : ''
```

with

```tsx
  }
  // Scan the screens the first time the flyout opens — the permission prompt must be tied to the action.
  useEffect(() => { if (panel === 'wall' && lane.wallSupport === 'idle') void lane.scanWall() }, [panel, lane.wallSupport, lane])
  useEffect(() => {
    if (panel !== 'script') return
    guidedLineRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [panel, lane.guided.index])
  const enabledWallCount = lane.wallOutputs.filter((o) => o.enabled).length
  const wallNoteMsg = wallNote && wallNote.atCount === lane.wallOpenIds.length ? wallNote.msg : ''
```

**(f)** Các giá trị dẫn xuất: danh sách người của buổi, dòng đang chọn, danh sách đoạn chạy được, giải
neo, và hàm `gotoSegment` — cú bấm đặt cả bốn thứ.

Chú ý một dòng trong khối này: `allScriptRows` lấy từ **`scriptLoad.allRows`** (TASK 53.3), **không** mở
lại kho kịch bản. `tests/scriptLoadConsole.test.ts` ghim rằng tệp này không được chứa chữ `getScriptLocal`
— màn điều khiển đọc kịch bản qua đúng một cửa.

Find and replace:

```tsx
  // signature of the 2026-08-01 failure.
  const scriptReady = scriptLoad.reason === 'ok'
  const danglingEvent = eventId !== '' && !event

  // TASK 14: the transcript records which meeting it belongs to, taken from the SAME resolved pointer the
  // script is loaded from — so a saved file and the script it was read against can never name two
```

with

```tsx
  // signature of the 2026-08-01 failure.
  const scriptReady = scriptLoad.reason === 'ok'
  const danglingEvent = eventId !== '' && !event
  // The meeting's own roster, names only — the dropdown behind "Đang tới lượt".
  const speakerNames = (event?.speakers ?? []).map((s) => s.name).filter((n) => n.trim())
  // The armed line, or undefined when the cursor is parked. Read once here so the rail card and the wide
  // popup can never disagree about which line is "now".
  const guidedRow = lane.guided.index >= 0 ? lane.script[lane.guided.index] : undefined

  // ── TASK 58 · Timeline chương trình ──────────────────────────────────────────────────────────────
  // Chỉ những dòng CHẠY ĐƯỢC (bỏ dòng tiêu đề phần) mới vào ô chọn — người điều khiển bấm sang "phần",
  // không bấm sang một cái nhan đề.
  const runSegments = useMemo(() => (event?.segments ?? []).filter((s) => !s.divider), [event])
  const curSegment = segIndex >= 0 ? runSegments[segIndex] : undefined
  // Mọi dòng lưu cho buổi (kể cả bản nháp) — CHỈ để phân biệt "dòng chưa duyệt" với "dòng mất hẳn".
  // Lấy từ CÙNG một lần đọc `loadScriptForSession` đã nạp `scriptLoad`: màn hình này không tự mở kho
  // kịch bản, chỉ đi qua đúng một cửa.
  const allScriptRows = useMemo(
    () => scriptLoad.allRows.map((r) => ({ id: r.id, src: r.src })),
    [scriptLoad],
  )
  const curAnchor = useMemo(
    () => resolveScriptAnchor(curSegment, lane.script, allScriptRows),
    [curSegment, lane.script, allScriptRows],
  )
  const gotoSegment = useCallback((i: number) => {
    const seg = runSegments[i]
    if (!seg) return
    setSegIndex(i)
    // Con trỏ chỉ nhảy khi neo giải được về một dòng ĐÃ DUYỆT mà lane đang giữ. Neo giải bằng mã trước,
    // bằng nội dung sau — nhập lại kịch bản đổi hết mã, và một con trỏ đứng im không lời giải thích
    // giữa buổi lễ nguy hiểm hơn hẳn một dòng chữ đỏ.
    const a = resolveScriptAnchor(seg, lane.script, allScriptRows)
    // Bối cảnh riêng của người này. Rỗng (đoạn không gắn tài liệu) ⇒ lane tự quay về ô Bối cảnh chung.
    lane.setSegmentBrief(collectSegmentBrief(event, seg.docIds, segmentSpeakerName(seg, event)))
    lane.applySegment({
      speakerName: segmentSpeakerName(seg, event) || '',
      mode: seg.mode ?? 'none',
      listen: segmentListens(seg),
      scriptIndex: a.kind === 'ok' ? a.index : -1,
      language: segmentLanguage(seg, event),
    })
  }, [runSegments, event, lane, allScriptRows])

  // TASK 14: the transcript records which meeting it belongs to, taken from the SAME resolved pointer the
  // script is loaded from — so a saved file and the script it was read against can never name two
```

**(g)** Đọc lại nấc khớp mỗi lần mở bảng kịch bản.

Con số in trên bảng kịch bản phải là **sàn đang chạy thật**, không phải hằng số mặc định. Nấc chỉ đổi được
ở màn Cài đặt — tức người dùng đã rời màn này rồi quay lại — nên đọc lại lúc mở bảng là đủ, không cần theo
dõi liên tục. Find and replace:

```tsx
  const setLaneEventId = lane.setEventId
  useEffect(() => { setLaneEventId(eventId) }, [eventId, setLaneEventId])

  const diag = lane.diagnostics
  const lat = diag?.latency
```

with

```tsx
  const setLaneEventId = lane.setEventId
  useEffect(() => { setLaneEventId(eventId) }, [eventId, setLaneEventId])

  // TASK 57 — mở bảng kịch bản là đọc lại nấc khớp. Rẻ, và giữ cho con số in trên bảng luôn là con số thật.
  useEffect(() => { if (panel === 'script') setMatchStep(loadGuidedMatch()) }, [panel])

  const diag = lane.diagnostics
  const lat = diag?.latency
```

**(h)** Khối điều khiển trên màn chạy — chỗ ĐÚNG của bảng dẫn. Đây là khối lớn nhất của cả prompt.

Nó nằm ngay dưới dòng trạng thái kịch bản của **màn chạy** (dòng có `scriptReady ?`), không phải trong
`prepCounts`. Hai điều đáng chú ý khi đọc:

- điều kiện mở là `lane.script.length > 0 || runSegments.length > 0` — **Timeline có giá trị ngay cả khi
  buổi không có kịch bản**, vì giá trị lớn nhất của nó là tự câm ở các đoạn video / bài hát / Yosakoi,
  chuyện chẳng liên quan gì tới kịch bản;
- ô **ĐANG IM** chỉ hiện khi `diag?.guidedDeaf` — trạng thái ngủ của TASK 56 không bao giờ được vô hình.

Find and replace:

```tsx
              <span className="text-[12px] font-medium text-on-surface truncate" title={event?.title?.trim() || undefined}>{event?.title?.trim() || 'Chưa chọn buổi nào'}</span>
            </div>
            <div className={`text-[11px] leading-snug ${scriptReady ? 'text-on-surface-variant' : 'text-error'}`}>{scriptLoadMessage(scriptLoad)}</div>
            {danglingEvent && (
              <div className="text-[11px] leading-snug text-error">Buổi đang chọn không còn trong Đặt lịch — mở Chuẩn bị chọn lại buổi rồi quay lại đây.</div>
            )}
```

with

```tsx
              <span className="text-[12px] font-medium text-on-surface truncate" title={event?.title?.trim() || undefined}>{event?.title?.trim() || 'Chưa chọn buổi nào'}</span>
            </div>
            <div className={`text-[11px] leading-snug ${scriptReady ? 'text-on-surface-variant' : 'text-error'}`}>{scriptLoadMessage(scriptLoad)}</div>
            {/* TASK 35 — dẫn theo kịch bản. Only offered once the script actually loaded: arming a cursor over
                zero rows is a button that can only disappoint. Kept right under the script status line so the
                two are read together — "kịch bản nào" and "đang ở dòng nào" are one question in practice. */}
            {/* Timeline có giá trị NGAY CẢ khi buổi không có kịch bản: giá trị lớn nhất của nó là tự
                câm ở các đoạn video / bài hát / Yosakoi, chuyện không liên quan gì tới kịch bản. */}
            {(lane.script.length > 0 || runSegments.length > 0) && (
              <div className="pt-2 mt-0.5 border-t border-outline-variant/60 space-y-2.5">
                {/* TASK 58 — ĐANG TỚI PHẦN. Một ô chọn thay cho bốn thao tác tay: người nói · kiểu nói ·
                    nghe/câm · con trỏ dòng. Gala 08/08 có ~17 đoạn máy bắt buộc phải câm (video, bài hát,
                    Yosakoi, chụp ảnh) rải trong bốn tiếng; bấm sang đoạn là máy tự câm, không phải nhớ. */}
                {runSegments.length > 0 && (
                  <div className="space-y-1.5 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60">ĐANG TỚI PHẦN</span>
                      <span className="font-label-caps text-[10px] text-on-surface-variant/50 tabular-nums">{segIndex >= 0 ? segIndex + 1 : '–'}/{runSegments.length}</span>
                    </div>
                    <select
                      aria-label="Phần chương trình đang tới lượt"
                      value={segIndex >= 0 ? String(segIndex) : ''}
                      onChange={(e) => { const v = e.target.value; if (v === '') setSegIndex(-1); else gotoSegment(Number(v)) }}
                      className={`${SELECT_CLS} py-1.5 text-[13px]`}
                    >
                      <option value="">— chưa vào phần nào —</option>
                      {runSegments.map((s, i) => <option key={s.id} value={i}>{segmentLabel(s, i)}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button type="button" onClick={() => gotoSegment(segIndex - 1)} disabled={segIndex <= 0}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors disabled:opacity-35 disabled:cursor-not-allowed text-[12px] font-semibold">
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_upward</span>Phần trước
                      </button>
                      <button type="button" onClick={() => gotoSegment(segIndex + 1)} disabled={segIndex >= runSegments.length - 1}
                        className="flex items-center justify-center gap-1 py-1.5 rounded-lg border border-secondary/60 text-secondary hover:bg-secondary/10 transition-colors disabled:opacity-35 disabled:cursor-not-allowed text-[12px] font-bold">
                        Phần sau<span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_downward</span>
                      </button>
                    </div>
                    {curSegment && (
                      <div className={`rounded-lg border px-2.5 py-2 space-y-0.5 ${segmentListens(curSegment) ? 'border-outline-variant bg-surface-container' : 'border-error/50 bg-error/[0.08]'}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`material-symbols-outlined text-[15px] ${segmentListens(curSegment) ? 'text-secondary' : 'text-error'}`} aria-hidden="true">{segmentListens(curSegment) ? 'hearing' : 'hearing_disabled'}</span>
                          <span className={`font-label-caps text-[10px] ${segmentListens(curSegment) ? 'text-secondary' : 'text-error'}`}>{segmentListens(curSegment) ? 'MÁY ĐANG NGHE' : 'MÁY ĐANG CÂM'}</span>
                        </div>
                        <p className="text-[11.5px] leading-snug text-on-surface-variant">
                          {segmentSpeakerName(curSegment, event) || 'chưa gán người'}
                          {segmentLanguage(curSegment, event)
                            ? ` · khoá chiều ${segmentLanguage(curSegment, event) === 'vi' ? 'Việt → Nhật' : 'Nhật → Việt'}`
                            : ' · chiều dịch: máy tự nhận'}
                        </p>
                        {/* Khoá chiều chỉ sống trong phiên HAI CHIỀU — một chiều thì chiều dịch đã chốt từ
                            lúc Bắt đầu, và ô "tiếng" của đoạn trở thành nút bấm giả. Nói thẳng ra. */}
                        {segmentLanguage(curSegment, event) && !lane.twoWay && (
                          <p className="text-[11px] text-error/90">Phiên này đang MỘT CHIỀU nên tiếng gắn cho đoạn không có tác dụng. Dừng → bật “Một mic hai chiều” → Bắt đầu lại.</p>
                        )}
                        {anchorMessage(curAnchor) && <p className="text-[11px] text-error/90">{anchorMessage(curAnchor)}</p>}
                        {curAnchor.kind === 'ok' && curAnchor.healed && (
                          <p className="text-[11px] text-on-surface-variant/75">Kịch bản đã nhập lại — con trỏ bám theo nội dung dòng. Mở Chương trình bấm “Gắn lại tự động” cho chắc.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TASK 36 — the speaker list already exists on the meeting (`Conference.speakers[]`); nothing
                    is added to the script format for this. An empty list is normal for a meeting nobody filled
                    in, so free text stays reachable — behind "Khác…" rather than as the default, because a
                    name typed under stage lights is a name spelled differently from the roster. */}
                <div className="space-y-1.5">
                  <span className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60 block">ĐANG TỚI LƯỢT</span>
                  {speakerNames.length > 0 && !otherSpeaker ? (
                    <select
                      aria-label="Người đang nói"
                      value={speakerNames.includes(lane.speakerName) ? lane.speakerName : ''}
                      onChange={(e) => {
                        if (e.target.value === OTHER_SPEAKER) { setOtherSpeaker(true); lane.setSpeakerName('') }
                        else lane.setSpeakerName(e.target.value)
                      }}
                      className={`${SELECT_CLS} py-1.5 text-[13px]`}
                    >
                      <option value="">— chưa chọn —</option>
                      {(event?.speakers ?? []).filter((s) => s.name.trim()).map((s) => (
                        <option key={s.id} value={s.name}>{s.name}{s.role?.trim() ? ` · ${s.role.trim()}` : ''}</option>
                      ))}
                      <option value={OTHER_SPEAKER}>Khác… (gõ tên)</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        aria-label="Người đang nói"
                        value={lane.speakerName}
                        onChange={(e) => lane.setSpeakerName(e.target.value)}
                        placeholder="tên người đang nói"
                        className="flex-1 min-w-0 bg-surface text-on-surface border border-outline-variant rounded-DEFAULT py-1.5 px-2.5 text-[13px] focus:ring-0 focus:border-secondary field-lux"
                      />
                      {speakerNames.length > 0 && (
                        <button type="button" onClick={() => { setOtherSpeaker(false); lane.setSpeakerName('') }}
                          title="Quay lại danh sách người phát biểu của buổi"
                          className="shrink-0 h-[34px] w-8 grid place-items-center rounded-DEFAULT border border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary transition-colors">
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">list</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Kiểu nói — three taps wide, not a dropdown: mid-ceremony the operator changes this while
                    looking at the stage, and a dropdown costs two interactions and a moment of blind aim. */}
                <div className="space-y-1.5">
                  <span className="font-label-caps text-[10px] tracking-[0.14em] text-on-surface-variant/60 block">KIỂU NÓI</span>
                  <div className="grid grid-cols-3 gap-0.5 bg-surface rounded-lg p-0.5">
                    {SPEAKER_MODES.map((m) => (
                      <button key={m.value} type="button" title={m.hint} onClick={() => lane.setSpeakerMode(m.value)}
                        className={`px-1 py-1.5 rounded-md text-[11px] font-semibold leading-tight transition-colors ${lane.speakerMode === m.value ? 'bg-secondary text-on-secondary shadow' : 'text-on-surface-variant hover:text-on-surface'}`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-snug text-on-surface-variant/85">{SPEAKER_MODES.find((m) => m.value === lane.speakerMode)?.hint}</p>
                </div>

                {/* Mọi thứ dưới đây cần có kịch bản. Buổi chỉ có Timeline mà không có kịch bản vẫn dùng
                    được phần trên (chọn phần · người nói · kiểu nói · nghe/câm). */}
                {lane.script.length > 0 && (<>
                {/* Bật dẫn — the one switch in this rail that changes what the ballroom HEARS, so it is the
                    one thing here that looks like a switch and turns green. */}
                <button type="button" disabled={!guidedAllowed(lane.speakerMode)}
                  onClick={() => lane.setGuidedArmed(!lane.guided.armed)}
                  title={guidedAllowed(lane.speakerMode) ? 'Đọc thẳng dòng kịch bản đã duyệt' : guidedBlockedReason(lane.speakerMode)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${lane.guided.armed ? 'border-secondary bg-secondary/15 text-on-surface' : 'border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-surface'}`}>
                  <span className={`shrink-0 w-8 h-[18px] rounded-full relative transition-colors ${lane.guided.armed ? 'bg-secondary' : 'bg-outline-variant'}`}>
                    <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-surface-container-lowest transition-all ${lane.guided.armed ? 'left-[16px]' : 'left-[2px]'}`}></span>
                  </span>
                  <span className="text-[12.5px] font-semibold">Dẫn theo kịch bản</span>
                </button>
                {!guidedAllowed(lane.speakerMode) && (
                  <p className="text-[11px] leading-snug text-on-surface-variant/75">{guidedBlockedReason(lane.speakerMode)}</p>
                )}

                <div className={`text-[11px] leading-snug ${lane.guided.armed ? 'text-secondary' : 'text-on-surface-variant'}`}>{lane.guidedText}</div>

                {lane.guided.armed && (
                  <>
                    {/* What is about to be SPOKEN, in the rail. Until now the only way to see it was to open a
                        list — and the one number an operator checks before pressing TỚI is whether the line
                        they are pointing at is the line the MC is reading. */}
                    {guidedRow ? (
                      <div className="rounded-lg border border-secondary/40 bg-secondary/[0.07] px-2.5 py-2 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-label-caps text-[10px] text-secondary tabular-nums">DÒNG {lane.guided.index + 1}/{lane.script.length}</span>
                          {guidedRow.status !== 'approved' && <span className="text-[10px] text-error font-semibold">CHƯA DUYỆT</span>}
                        </div>
                        <p className="text-[12px] leading-snug text-on-surface line-clamp-3">{guidedRow.src}</p>
                        <p className="text-[12px] leading-snug text-secondary/90 line-clamp-3">{guidedRow.dst}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-on-surface-variant">Chưa chọn dòng — bấm “Mở kịch bản” rồi chọn dòng MC đang đọc.</p>
                    )}
                    {/* TASK 56 — micro đang ngủ sau khi nhả câu. Không được để nó vô hình: cái sai duy
                        nhất của cơ chế này là người điều khiển quên bấm dòng sau. */}
                    {diag?.guidedDeaf && (
                      <div className="flex items-center gap-1.5 rounded-lg border border-tertiary/50 bg-tertiary/[0.10] px-2.5 py-2">
                        <span className="material-symbols-outlined text-[16px] text-tertiary" aria-hidden="true">hearing_disabled</span>
                        <p className="text-[11.5px] leading-snug text-on-surface-variant">
                          <span className="font-label-caps text-[10px] text-tertiary">ĐANG IM</span> — MC bên kia đọc bản dịch. Bấm “Tới” khi người nói sắp vào câu sau.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button type="button" onClick={() => lane.stepGuided(-1)} disabled={lane.guided.index <= 0}
                        className="flex items-center justify-center gap-1 py-2.5 rounded-lg border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors disabled:opacity-35 disabled:cursor-not-allowed text-[13px] font-semibold">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>Lùi
                      </button>
                      <button type="button" onClick={() => lane.stepGuided(1)} disabled={lane.guided.index >= lane.script.length - 1}
                        className="flex items-center justify-center gap-1 py-2.5 rounded-lg btn-lux bg-secondary text-on-secondary hover:opacity-90 transition-opacity disabled:opacity-35 disabled:cursor-not-allowed text-[13px] font-bold">
                        Tới<span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
                      </button>
                    </div>
                  </>
                )}

                <button type="button" onClick={() => setPanel((p) => (p === 'script' ? null : 'script'))}
                  className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-full font-label-caps text-label-caps border transition-colors ${panel === 'script' ? 'border-secondary text-secondary bg-secondary/10' : 'border-outline-variant text-on-surface-variant hover:text-primary hover:border-primary'}`}>
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">format_list_numbered</span>
                  {panel === 'script' ? 'Đóng kịch bản' : 'Mở kịch bản'}
                </button>
                </>)}
              </div>
            )}
            {danglingEvent && (
              <div className="text-[11px] leading-snug text-error">Buổi đang chọn không còn trong Đặt lịch — mở Chuẩn bị chọn lại buổi rồi quay lại đây.</div>
            )}
```

**(i)** Popup kịch bản rộng.

Đọc kỹ đoạn chữ hướng dẫn trong khối này: nó có **hai bản**. Khi sàn khớp > 0 thì nó in đúng phần trăm
đang chạy và trấn an "bấm nhầm dòng không làm buổi lễ tệ đi". Khi nấc là **Thả cửa** (sàn 0) thì lời trấn
an đó **sai**, nên khối in ngược lại: bấm dòng nào là máy đọc thẳng dòng đó, bấm nhầm là phòng tiệc nghe
nhầm câu. Một màn hình nói sai về mức an toàn của chính nó còn tệ hơn không nói gì.

Find and replace:

```tsx
      {panel && (
        <>
          <div className="absolute inset-0 z-30" onClick={() => setPanel(null)}></div>
          <div className="absolute top-1/2 -translate-y-1/2 left-[256px] z-40 w-[min(80vw,400px)] rounded-2xl border border-outline-variant bg-surface-container-high p-4 shadow-2xl">
            {panel === 'gate' && (
              <div className="space-y-3">
                <h3 className="font-label-caps text-label-caps text-on-surface">Chống dội (gate)</h3>
```

with

```tsx
      {panel && (
        <>
          <div className="absolute inset-0 z-30" onClick={() => setPanel(null)}></div>
          <div className={`absolute top-1/2 -translate-y-1/2 left-[256px] z-40 rounded-2xl border border-outline-variant bg-surface-container-high p-4 shadow-2xl ${panel === 'script' ? 'w-[min(72vw,660px)] max-h-[86vh] flex flex-col' : 'w-[min(80vw,400px)]'}`}>
            {/* KỊCH BẢN CHƯƠNG TRÌNH — the operator's paper script, on screen and readable. It does not fit
                in a 248px rail, and a script the operator cannot read is a cursor they cannot trust. Both
                sides are shown: `src` is what they will HEAR, `dst` is what the ballroom will hear back. */}
            {panel === 'script' && (
              <div className="flex flex-col min-h-0 gap-3">
                <div className="flex items-center justify-between gap-3 shrink-0">
                  <h3 className="font-label-caps text-label-caps text-on-surface">Kịch bản chương trình · {lane.script.length} dòng</h3>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => lane.stepGuided(-1)} disabled={!lane.guided.armed || lane.guided.index <= 0}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface hover:border-primary hover:text-primary transition-colors disabled:opacity-35 disabled:cursor-not-allowed text-[13px] font-semibold">
                      <span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_back</span>Lùi
                    </button>
                    <button type="button" onClick={() => lane.stepGuided(1)} disabled={!lane.guided.armed || lane.guided.index >= lane.script.length - 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg btn-lux bg-secondary text-on-secondary hover:opacity-90 transition-opacity disabled:opacity-35 disabled:cursor-not-allowed text-[13px] font-bold">
                      Tới<span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_forward</span>
                    </button>
                  </div>
                </div>
                <p className="shrink-0 text-[11.5px] leading-snug text-on-surface-variant">
                  {lane.guided.armed
                    ? guidedMatchFloor(matchStep) > 0
                      ? <>Bấm vào dòng MC đang đọc để chuyển con trỏ. Máy chỉ đọc nguyên văn khi câu vừa nghe giống dòng đang chọn ít nhất {Math.round(guidedMatchFloor(matchStep) * 100)}% (nấc “{guidedMatchLabel(matchStep)}” trong Cài đặt) — không giống thì máy tự dịch như thường, nên bấm nhầm dòng không làm buổi lễ tệ đi.</>
                      : <>Cài đặt đang để nấc “{guidedMatchLabel(matchStep)}”: bấm dòng nào là máy đọc thẳng dòng đó, <b className="text-error">không kiểm tra câu vừa nghe có giống hay không</b>. Bấm nhầm dòng là phòng tiệc nghe nhầm câu. Nấc này để chạy thử, buổi thật nên về “Thường”.</>
                    : <>Đang xem kịch bản. Bật “Dẫn theo kịch bản” bên trái nếu muốn máy đọc thẳng dòng đã duyệt.</>}
                </p>
                <ol className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-1">
                  {lane.script.map((row, i) => {
                    const now = i === lane.guided.index
                    return (
                      <li key={row.id} ref={now ? guidedLineRef : undefined}
                        onClick={() => lane.setGuidedIndex(i)}
                        className={`flex gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer border transition-colors ${now ? 'border-secondary bg-secondary/[0.14]' : 'border-transparent hover:border-outline-variant hover:bg-surface-container'}`}>
                        <span className={`shrink-0 w-7 pt-[1px] text-right tabular-nums font-label-caps text-[11px] ${now ? 'text-secondary' : 'text-on-surface-variant/60'}`}>{i + 1}</span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-[13px] leading-snug text-on-surface">{row.src}</p>
                          <p className="text-[13px] leading-snug text-on-surface-variant">{row.dst}</p>
                        </div>
                        {row.status !== 'approved' && (
                          <span className="shrink-0 self-start px-1.5 py-0.5 rounded font-label-caps text-[10px] border border-error/50 text-error">chưa duyệt</span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
            {panel === 'gate' && (
              <div className="space-y-3">
                <h3 className="font-label-caps text-label-caps text-on-surface">Chống dội (gate)</h3>
```

Sau khối này, `grep -rn "guided-" src/` **chỉ được** còn đúng ba dòng, đều trong
`OnlineGuidedMatchSettings.tsx` và đều là `id`/`name` của ô chọn nấc (`guided-match-…`, `name="guided-match"`).
Còn bất cứ `guided-panel`, `guided-line`, `guided-speaker`… nào là CSS chết của TASK 51 chưa xoá.

---

## TASK 59 — test

### 59.1 Bốn tệp test MỚI

Đây là mã thật, không phải mô tả. Tạo đúng bốn tệp với đúng nội dung dưới đây.

| Tệp | Số ca | Ghim cái gì |
|---|---|---|
| `tests/programTimeline.test.ts` | 33 | mặc định theo LOẠI dòng · bộ đọc HTML · giải neo kịch bản 4 trạng thái · thống kê. Có một khối chạy trên **file Timeline thật** của gala nếu tệp có mặt, và **tự bỏ qua** nếu không. |
| `tests/segmentDirectionLock.test.ts` | 13 | khoá chiều: thứ tự quyết định · hai chốt chặn đứng xuống · xả bộ đệm trước khi đổi · một chiều thì không làm gì · máy nghe vẫn `'auto'` |
| `tests/guidedDeaf.test.ts` | 9 | số học 256 ms · quyết định nằm ở đường gói tiếng chứ không ở React · gói câm là im lặng **dài bằng** gói thật · ngủ đặt SAU khi dòng đã lên tường · trần 30 giây |
| `tests/guidedMatch.test.ts` | 18 | bốn nấc · `Kanpai!`/`Một...` nhả được · bấm nhầm dòng ngắn vẫn bị chặn · "thả cửa" bỏ đo · dòng chưa duyệt thì không nấc nào nhả |

**`tests/programTimeline.test.ts`:**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
    autoListen, autoMode, segmentListens, segmentLanguage, segmentSpeakerName,
    segmentLabel, guessLang, importTimelineHtml, timelineStats, newSegment,
    resolveScriptAnchor, healSegmentAnchors, anchorMessage,
} from '../src/lib/segments';
import type { Conference, Segment } from '../src/lib/schedule';

// TASK 52-54 — Timeline chương trình. Điều đáng test nhất KHÔNG phải bảng nhập, mà là quyết định
// "máy nghe hay máy câm": gala 08/08 có ~17 đoạn máy bắt buộc phải câm rải trong bốn tiếng, và một
// lần sót là hội trường nhìn thấy máy chép lời bài hát thành phụ đề.

const FIXTURE = `
<div class="sh-num">01</div><div class="sh-name">LỄ KHAI MẠC</div>
<table><thead><tr><th class="col-time">Giờ</th><th class="col-dur">TL</th><th class="col-type">Loại</th><th class="col-content">Nội dung</th><th class="col-owner">Phụ trách</th></tr></thead>
<tbody>
<tr><td>18:00</td><td class="dur">14'</td><td>🕺 YOSAKOI</td><td><div class="c-title">Hợp xướng mở màn</div><div class="c-detail">70 nhân viên</div></td><td class="owner">Biên đạo Cô Kuroe</td></tr>
<tr><td>18:15</td><td class="dur">1'</td><td>🎙 MC</td><td><div class="c-title">MC ra sân khấu</div><div class="c-detail">chào mừng</div></td><td class="owner">MC Huy Phạm (tiếng Việt) · Mika (tiếng Nhật)</td></tr>
<tr><td>18:29</td><td class="dur">3'</td><td>🎙 KHAI MẠC</td><td><div class="c-title">Phát biểu khai mạc</div><div class="c-detail">ngắn</div></td><td class="owner">Bà Shimizu Hiroko ／ シミズ・ヒロコ氏</td></tr>
<tr><td>18:37</td><td class="dur">3'</td><td>🎙 PHÁT BIỂU VIP</td><td><div class="c-title">Chủ tịch UBND tỉnh</div><div class="c-detail">dự kiến</div></td><td class="owner">Ông Trần Trí Quang (VN)</td></tr>
<tr><td>18:40</td><td class="dur">1'</td><td>💐 TẶNG HOA</td><td><div class="c-title">Tặng hoa</div><div class="c-detail"></div></td><td class="owner">Chị Nakagawa</td></tr>
</tbody></table>`;

describe('autoListen — loại dòng quyết định máy câm hay nghe', () => {
    it('câm ở video, bài hát, Yosakoi, chụp ảnh, tặng hoa', () => {
        for (const k of ['🎬 VIDEO', '🎵 BÀI HÁT ③', '🕺 YOSAKOI ⑤', '📸 CHỤP ẢNH ★', '💐 TẶNG HOA', '🍽 ĂN UỐNG', '🙇 CÚI CHÀO']) {
            expect(autoListen(k), k).toBe(false);
        }
    });
    it('nghe ở MC và mọi kiểu phát biểu', () => {
        for (const k of ['🎙 MC', '🎙 MC ★', '🎙 KHAI MẠC', '🎙 PHÁT BIỂU VIP', '📋 ĐỊNH HƯỚNG', '🎯 DIATALENT']) {
            expect(autoListen(k), k).toBe(true);
        }
    });
    it('loại rỗng thì nghe — im lặng không bao giờ là mặc định', () => {
        expect(autoListen('')).toBe(true);
        expect(autoListen(undefined)).toBe(true);
    });
});

describe('autoMode', () => {
    it('MC ⇒ bám kịch bản; khách mời phát biểu ⇒ lệch một nửa; đoạn câm ⇒ không kịch bản', () => {
        expect(autoMode('🎙 MC')).toBe('script');
        expect(autoMode('🎙 KHAI MẠC')).toBe('partial');
        expect(autoMode('🎙 PHÁT BIỂU VIP')).toBe('partial');
        expect(autoMode('🎬 VIDEO')).toBe('none');
    });
});

describe('segmentListens — lệnh tay luôn thắng suy đoán', () => {
    const seg = (p: Partial<Segment>): Segment => ({ ...newSegment(), ...p });
    it('auto hỏi loại dòng', () => {
        expect(segmentListens(seg({ kind: '🎵 BÀI HÁT', listen: 'auto' }))).toBe(false);
        expect(segmentListens(seg({ kind: '🎙 MC', listen: 'auto' }))).toBe(true);
    });
    it('đặt tay "Nghe" thắng cả một dòng bài hát', () => {
        expect(segmentListens(seg({ kind: '🎵 BÀI HÁT', listen: 'on' }))).toBe(true);
    });
    it('đặt tay "Câm" thắng cả một dòng MC', () => {
        expect(segmentListens(seg({ kind: '🎙 MC', listen: 'off' }))).toBe(false);
    });
    it('không có đoạn nào thì mặc định là nghe', () => {
        expect(segmentListens(undefined)).toBe(true);
    });
});

describe('guessLang — đoán tiếng từ ô người phụ trách', () => {
    it('đoán được khi chỉ có một bên', () => {
        expect(guessLang('Ông Trần Trí Quang (VN)')).toBe('vi');
        expect(guessLang('Bà Shimizu Hiroko ／ シミズ・ヒロコ氏')).toBe('ja');
        expect(guessLang('MC Huy Phạm (JP, 7 người)')).toBe('ja');
    });
    it('BỎ TRỐNG khi một dòng có cả hai MC nối nhau — chiều lật ngay trong dòng', () => {
        expect(guessLang('Lê Vi Trang (VN) → Huy Phạm (JP)')).toBe('');
        expect(guessLang('MC Huy Phạm (tiếng Việt) · Mika (tiếng Nhật)')).toBe('');
    });
    it('không rõ thì trả rỗng chứ không đoán bừa', () => {
        expect(guessLang('Ekip Điệp Văn')).toBe('');
        expect(guessLang('')).toBe('');
    });
});

describe('importTimelineHtml', () => {
    const res = importTimelineHtml(FIXTURE);
    it('đọc đúng số dòng và số phần, bỏ hàng tiêu đề <th>', () => {
        expect(res.rows).toBe(5);
        expect(res.sections).toBe(1);
    });
    it('dòng tiêu đề phần đứng TRƯỚC các dòng của phần đó', () => {
        expect(res.segments[0].divider).toBe(true);
        expect(res.segments[0].title).toContain('LỄ KHAI MẠC');
        expect(res.segments[1].divider).toBeUndefined();
    });
    it('tách đủ giờ · thời lượng · loại · nội dung · chi tiết', () => {
        const mc = res.segments[2];
        expect(mc.time).toBe('18:15');
        expect(mc.dur).toBe("1'");
        expect(mc.kind).toContain('MC');
        expect(mc.title).toBe('MC ra sân khấu');
        expect(mc.detail).toBe('chào mừng');
    });
    it('giữ NGUYÊN VĂN ô người phụ trách và KHÔNG tự gán người nói', () => {
        const khaimac = res.segments[3];
        expect(khaimac.owner).toContain('Shimizu Hiroko');
        expect(khaimac.speakerId).toBeUndefined();
    });
    it('đặt sẵn kiểu nói và tiếng theo loại dòng', () => {
        expect(res.segments[2].mode).toBe('script');       // MC
        expect(res.segments[3].mode).toBe('partial');      // khai mạc
        expect(res.segments[3].lang).toBe('ja');           // 氏
        expect(res.segments[1].mode).toBe('none');         // Yosakoi
        expect(segmentListens(res.segments[1])).toBe(false);
    });
    it('tệp không đúng dạng trả về rỗng chứ không ném lỗi', () => {
        expect(importTimelineHtml('<p>không phải timeline</p>').rows).toBe(0);
        expect(importTimelineHtml('').segments).toEqual([]);
    });
});

describe('timelineStats — nói thật buổi này máy câm bao nhiêu', () => {
    it('không đếm dòng tiêu đề phần, và đếm được đoạn thiếu người nói', () => {
        const { segments } = importTimelineHtml(FIXTURE);
        const st = timelineStats(segments);
        expect(st.rows).toBe(5);
        expect(st.listen).toBe(3);   // MC · khai mạc · phát biểu VIP
        expect(st.mute).toBe(2);     // Yosakoi · tặng hoa
        expect(st.noSpeaker).toBe(3);
    });
});

describe('người nói + tiếng của đoạn', () => {
    const conf = {
        id: 'e1', title: 'Gala', date: '', startTime: '', endTime: '', booker: '', createdAt: '',
        speakers: [{ id: 's1', name: 'Bà Shimizu Hiroko', role: 'BOD', lang: 'ja' }],
    } as Conference;
    it('tiếng khai thẳng trên đoạn thắng tiếng trong hồ sơ người nói', () => {
        expect(segmentLanguage({ ...newSegment(), speakerId: 's1', lang: 'vi' }, conf)).toBe('vi');
    });
    it('đoạn không khai thì lấy tiếng của người nói', () => {
        expect(segmentLanguage({ ...newSegment(), speakerId: 's1', lang: '' }, conf)).toBe('ja');
    });
    it('chưa gán người thì không mách gì cả — máy tự nhận như hôm nay', () => {
        expect(segmentLanguage({ ...newSegment(), lang: '' }, conf)).toBe('');
        expect(segmentSpeakerName({ ...newSegment() }, conf)).toBe('');
    });
    it('nhãn đoạn luôn đọc được, kể cả khi chưa đặt tên', () => {
        expect(segmentLabel({ ...newSegment(), title: '', time: '18:29', kind: 'MC' }, 5)).toContain('6.');
        expect(segmentLabel({ ...newSegment(), title: '' }, 0)).toContain('chưa đặt tên');
    });
});

describe('neo dòng kịch bản — id không bền, nên phải có neo chữ', () => {
    const seg = (p: Partial<Segment>): Segment => ({ ...newSegment(), mode: 'script', ...p });
    const OLD = [{ id: 'a1', src: 'Kính thưa quý vị đại biểu' }, { id: 'a2', src: 'Xin mời quý vị an tọa' }];
    // Y như sau một lần nhập lại: cùng nội dung, mã hoàn toàn mới.
    const REIMPORTED = [{ id: 'z9', src: 'Kính thưa quý vị đại biểu' }, { id: 'z8', src: 'Xin mời quý vị an tọa' }];

    it('đoạn không gắn dòng nào ⇒ none, không phải lỗi', () => {
        expect(resolveScriptAnchor(seg({}), OLD, OLD).kind).toBe('none');
        expect(resolveScriptAnchor(undefined, OLD, OLD).kind).toBe('none');
    });
    it('mã còn ⇒ ok, và trả đúng CHỈ SỐ trong danh sách đã duyệt', () => {
        const a = resolveScriptAnchor(seg({ startScriptId: 'a2' }), OLD, OLD);
        expect(a).toMatchObject({ kind: 'ok', index: 1, healed: false });
    });
    it('dòng còn trong kịch bản nhưng CHƯA DUYỆT ⇒ unapproved, không nhầm với mất dấu', () => {
        const approved = [OLD[0]];
        expect(resolveScriptAnchor(seg({ startScriptId: 'a2' }), approved, OLD).kind).toBe('unapproved');
    });
    it('nhập lại kịch bản: mã chết nhưng neo chữ cứu được, và báo là đã chữa', () => {
        const a = resolveScriptAnchor(seg({ startScriptId: 'a1', startScriptText: 'Kính thưa quý vị đại biểu' }), REIMPORTED, REIMPORTED);
        expect(a).toMatchObject({ kind: 'ok', index: 0, id: 'z9', healed: true });
    });
    it('neo chữ chịu được khác khoảng trắng và khác hoa thường', () => {
        const a = resolveScriptAnchor(seg({ startScriptId: 'x', startScriptText: '  kính   THƯA quý vị đại biểu ' }), REIMPORTED, REIMPORTED);
        expect(a.kind).toBe('ok');
    });
    it('không còn dấu vết ⇒ lost, KHÔNG im lặng', () => {
        const a = resolveScriptAnchor(seg({ startScriptId: 'a1', startScriptText: 'Một câu đã bị xoá hẳn' }), REIMPORTED, REIMPORTED);
        expect(a.kind).toBe('lost');
        expect(anchorMessage(a)).toContain('MẤT DẤU');
    });
    it('chỉ có mã, không có neo chữ (đoạn soạn trước khi có neo) ⇒ lost chứ không đoán bừa', () => {
        expect(resolveScriptAnchor(seg({ startScriptId: 'a1' }), REIMPORTED, REIMPORTED).kind).toBe('lost');
    });
    it('anchorMessage im lặng khi không có gì phải nói', () => {
        expect(anchorMessage({ kind: 'ok', index: 0, id: 'a1', healed: false })).toBe('');
        expect(anchorMessage({ kind: 'none' })).toBe('');
    });

    it('healSegmentAnchors viết lại mã mới cho đoạn cứu được, để yên đoạn mất dấu', () => {
        const list = [
            seg({ startScriptId: 'a1', startScriptText: 'Kính thưa quý vị đại biểu' }),
            seg({ startScriptId: 'a2', startScriptText: 'Xin mời quý vị an tọa' }),
            seg({ startScriptId: 'a3', startScriptText: 'Câu đã bị xoá' }),
            seg({}),
        ];
        const r = healSegmentAnchors(list, REIMPORTED, REIMPORTED);
        expect(r.healed).toBe(2);
        expect(r.lost).toBe(1);
        expect(r.segments[0].startScriptId).toBe('z9');
        expect(r.segments[1].startScriptId).toBe('z8');
        expect(r.segments[2].startScriptId).toBe('a3');   // để nguyên — người phải gắn tay
        expect(r.segments[3].startScriptId).toBeUndefined();
    });
    it('chạy lại lần hai không đổi gì nữa (idempotent)', () => {
        const once = healSegmentAnchors([seg({ startScriptId: 'a1', startScriptText: 'Kính thưa quý vị đại biểu' })], REIMPORTED, REIMPORTED);
        const twice = healSegmentAnchors(once.segments, REIMPORTED, REIMPORTED);
        expect(twice.healed).toBe(0);
        expect(twice.segments[0].startScriptId).toBe('z9');
    });
});

// Bài test trên DỮ LIỆU THẬT: chạy khi tệp Timeline của gala có mặt. Đây là chỗ duy nhất chứng minh bộ
// đọc chịu được HTML thật chứ không chỉ chịu được fixture do chính mình viết. Không có tệp thì BỎ QUA —
// một máy không có tệp không được vì thế mà đỏ bộ test.
const CANDIDATES = [
    '../docs/KICH_BAN_GALA_8_8_V8_song_ngu.html', // không có tệp thì cả khối này tự bỏ qua
];
const REAL = CANDIDATES.find((p) => existsSync(new URL(p, import.meta.url)));
describe.skipIf(!REAL)('Timeline gala 08/08 thật', () => {
    it('đọc được 64 dòng · 4 phần, và chỉ ra số đoạn máy phải câm', () => {
        const html = readFileSync(new URL(REAL as string, import.meta.url), 'utf8');
        const res = importTimelineHtml(html);
        expect(res.sections).toBe(4);
        expect(res.rows).toBe(64);
        const st = timelineStats(res.segments);
        expect(st.rows).toBe(64);
        expect(st.mute).toBeGreaterThanOrEqual(15);
        expect(st.listen).toBeGreaterThan(20);
    });
});
```

**`tests/segmentDirectionLock.test.ts`:**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// TASK 55 — khoá chiều theo người của Timeline.
//
// Một người nói MỘT thứ tiếng. Câu ngoại ngữ chêm vào giữa lượt của họ là một câu TRÍCH DẪN, không phải
// đổi người: khách Nhật mở lời bằng "Xin chào" thì vẫn là Nhật → Việt, và hai chữ đó nằm nguyên trong câu.
// Máy tự nhận không biết điều đó — nó đọc chữ, mà chữ thì đúng là tiếng Việt thật, nên nó lật chiều cho
// cả phần còn lại của bài phát biểu VÀ cắt câu làm đôi (turn split của M11).
//
// Chỉ có bảng chương trình mới biết ai đang cầm micro. Nên khi đoạn khai tiếng, chiều bị KHOÁ, và ba chỗ
// từng có quyền lật chiều đều phải đứng im. Bộ test này ghim đúng ba chỗ đó — mất một chỗ là buổi lễ lại
// lật chiều giữa câu, mà đó là lỗi không nhìn thấy được cho tới lúc nó xảy ra trước mặt khán giả.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = read('src/lib/lanes/online/onlineLane.ts')
const FACADE = read('src/lib/lanes/online/index.ts')
const CONSOLE = read('src/lib/lanes/online/components/OnlineConsole.tsx')

/** Thân một hàm khai bằng `function ten(` — cắt tới dấu đóng ngoặc cùng cấp. */
function body(src: string, decl: string): string {
    const at = src.indexOf(decl)
    expect(at, `không tìm thấy ${decl}`).toBeGreaterThan(-1)
    // Thân hàm mở ở dấu `{` CUỐI CÙNG của dòng khai — dấu `{` đầu tiên có thể thuộc kiểu trả về
    // (`): { source: Lang; … } {`), lấy nhầm nó thì cắt ra được mỗi cái kiểu.
    const eol = src.indexOf('\n', at)
    const open = src.lastIndexOf('{', eol)
    let depth = 0
    for (let i = open; i < src.length; i += 1) {
        if (src[i] === '{') depth += 1
        else if (src[i] === '}') { depth -= 1; if (depth === 0) return src.slice(open, i + 1) }
    }
    throw new Error(`không đóng được thân ${decl}`)
}

describe('khoá chiều theo đoạn — cái khoá tồn tại và mặc định là TẮT', () => {
    it('1 · lane giữ một trạng thái khoá riêng, khởi tạo rỗng', () => {
        expect(LANE).toContain('let lockedSource: Lang | null = null')
    })

    it('2 · mỗi phiên mới bắt đầu bằng máy tự nhận — khoá không sống sót qua lần Bắt đầu sau', () => {
        const start = body(LANE, 'async function start(startOpts: StartOpts)')
        expect(start).toContain('lockedSource = null')
        // Cùng chỗ với việc dọn hướng đã chốt của phiên cũ, để không ai xoá một cái mà quên cái kia.
        expect(start.indexOf('lockedSource = null')).toBeGreaterThan(start.indexOf('settledDir.clear()'))
    })

    it('3 · controller phơi ra lockLanguage', () => {
        expect(LANE).toContain('lockLanguage(language: Lang | null): void')
        expect(LANE).toContain('saveSession, lockLanguage }')
    })
})

describe('khi khoá bật, ba chỗ từng lật chiều phải đứng im', () => {
    it('4 · dirLangs lấy tiếng của khoá, không hỏi chữ nữa', () => {
        const fn = body(LANE, 'function dirLangs(')
        expect(fn).toContain('else if (lockedSource)')
        // Câu ĐÃ CHỐT vẫn được xét trước khoá: một dòng cũ không bao giờ được nhảy cửa sổ khán giả khi
        // người điều khiển bấm sang đoạn sau.
        expect(fn.indexOf('if (settled)')).toBeLessThan(fn.indexOf('else if (lockedSource)'))
        // …và khoá phải đứng TRƯỚC hai nhánh đoán chữ, nếu không nó chẳng bao giờ tới lượt.
        expect(fn.indexOf('else if (lockedSource)')).toBeLessThan(fn.indexOf('else if (interim)'))
    })

    it('5 · câu chốt dưới khoá tự ghi hướng, nên nó không bị đoán lại về sau', () => {
        const fn = body(LANE, 'function dirLangs(')
        expect(fn).toContain('if (!interim) settledDir.set(lid, directionOf(source))')
    })

    it('6 · nhãn tiếng của nhà cung cấp KHÔNG được ghi đè khoá', () => {
        expect(LANE).toContain("if (twoWay && tracker && !lockedSource && decided.language && decided.basis !== 'none')")
    })

    it('7 · turn split của M11 đứng im — câu trích dẫn không được cắt câu làm đôi', () => {
        expect(LANE).toContain('if (twoWay && !lockedSource && decided.language && segmentBuffer.trim())')
    })
})

describe('đổi khoá = đổi người, nên phải chốt nốt câu của người trước', () => {
    it('8 · lockLanguage xả bộ đệm trước khi đổi, và chỉ khi thật sự có đổi', () => {
        const fn = body(LANE, 'function lockLanguage(')
        expect(fn).toContain('if (lockedSource === language) return')
        expect(fn).toContain("if (segmentBuffer.trim()) flushSegment('turn-end')")
        // Xả TRƯỚC khi gán, nếu không phần đuôi của người trước bị chốt bằng tiếng của người sau.
        expect(fn.indexOf('flushSegment')).toBeLessThan(fn.indexOf('lockedSource = language'))
    })

    it('9 · phiên một chiều thì lockLanguage không làm gì cả', () => {
        expect(body(LANE, 'function lockLanguage(')).toContain('if (!twoWay || !tracker) return')
    })
})

describe('đường từ bảng chương trình xuống lane', () => {
    it('10 · đoạn để trống tiếng thì NHẢ khoá, không giữ lại tiếng của người trước', () => {
        expect(FACADE).toContain('if (seg.language !== undefined)')
        expect(FACADE).toContain("lockLanguage(seg.language === 'vi' || seg.language === 'ja' ? seg.language : null)")
    })

    it('11 · màn điều khiển nói rõ đang khoá chiều nào, hay đang để máy tự nhận', () => {
        expect(CONSOLE).toContain('khoá chiều')
        expect(CONSOLE).toContain('chiều dịch: máy tự nhận')
    })

    it('12 · và nói thẳng khi phiên một chiều làm ô tiếng của đoạn thành nút bấm giả', () => {
        expect(CONSOLE).toContain('segmentLanguage(curSegment, event) && !lane.twoWay')
        expect(CONSOLE).toContain('MỘT CHIỀU nên tiếng gắn cho đoạn không có tác dụng')
    })
})

describe('máy NGHE vẫn để tự nhận — chỉ chiều DỊCH bị khoá', () => {
    it('13 · tham số tiếng gửi lúc mở đường nghe không đụng tới khoá', () => {
        // Nếu khoá lọt vào đây thì khách Nhật nói "Xin chào" sẽ ra chữ Nhật bậy, và đổi đoạn giữa buổi
        // sẽ phải nối lại đường nghe — đúng cái giá đã tuyên bố là không trả.
        expect(LANE).toContain("language: twoWay ? 'auto' : opts!.sourceLanguage")
        const dial = LANE.slice(LANE.indexOf('session = await fetchAsrSession({'), LANE.indexOf('} catch (err) {', LANE.indexOf('session = await fetchAsrSession({')))
        expect(dial).not.toContain('lockedSource')
    })
})
```

**`tests/guidedDeaf.test.ts`:**

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { decideCaptureFrame } from '../src/lib/lanes/online/livePipelinePolicy'

// TASK 56 — nhả xong một dòng kịch bản thì micro ngủ, và cái bấm dòng sau đánh thức nó.
//
// Giữa lúc nhả dòng N và lúc bấm dòng N+1, trong phòng chỉ có đúng một việc: MC bên kia đọc bản dịch.
// Đó là NGƯỜI THỨ HAI, không phải câu trích dẫn — cổng nửa song công chỉ biết giọng của chính máy, còn
// khoá chiều thì đang khoá theo người nói trước, nên nghe được là đẩy rác lên tường khán giả.
//
// Cái phải ghim chặt nhất ở đây là ĐỘ TRỄ THỨC DẬY, vì người điều khiển bấm xong là Mika nói ngay:
//   · quyết định câm/nghe đọc lại MỖI GÓI tiếng, không phải mỗi lần React vẽ lại ⇒ ăn ngay gói kế tiếp;
//   · một gói = 4096 mẫu @16kHz = 256ms;
//   · và gói đó mang theo 256ms tiếng THU TRƯỚC lúc bấm, nên bấm hơi trễ vẫn vớt lại được, không mất chữ.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

const LANE = read('src/lib/lanes/online/onlineLane.ts')
const CAPTURE = read('src/lib/lanes/online/pcm16Capture.ts')
const CONSOLE = read('src/lib/lanes/online/components/OnlineConsole.tsx')

describe('độ trễ thức dậy — con số, không phải lời hứa', () => {
    it('1 · một gói tiếng là 4096 mẫu @16kHz = 256ms', () => {
        expect(CAPTURE).toContain('new Int16Array(4096)')
        expect(CAPTURE).toContain('this.outCount >= 4096')
        expect(4096 / 16).toBe(256) // mẫu / 16 = ms @16kHz
    })

    it('2 · trạng thái ngủ được xét lại NGAY TRONG đường đi của gói tiếng, không qua React', () => {
        const at = LANE.indexOf('const frame = decideCaptureFrame({')
        expect(at).toBeGreaterThan(-1)
        const before = LANE.slice(at - 700, at)
        expect(before).toContain('if (guidedDeafAtIndex >= 0) {')
        expect(before).toContain('config.getGuided?.() ?? GUIDED_OFF')
        // Con trỏ nhích = thức. Đó là chính cái bấm của người điều khiển, không phải một cái hẹn giờ.
        expect(before).toContain('g.index !== guidedDeafAtIndex')
    })

    it('3 · gói bị câm là im lặng CÙNG ĐỘ DÀI, không phải gói vắng mặt', () => {
        // Vắng gói thì đồng hồ đóng câu 1,5s của máy nghe ngừng đếm giữa câu ⇒ ASR không còn chạy liên tục.
        expect(LANE).toContain('pcm = new ArrayBuffer(packet.pcm.byteLength)')
        expect(decideCaptureFrame({ listenPaused: true, gateActive: false }).mute).toBe(true)
        expect(decideCaptureFrame({ listenPaused: false, gateActive: false }).mute).toBe(false)
    })
})

describe('ngủ khi nào, thức khi nào', () => {
    it('4 · nhả một dòng kịch bản là ngủ, và nhớ mình ngủ ở dòng nào', () => {
        const at = LANE.indexOf("if (verdict.kind === 'release')")
        expect(at).toBeGreaterThan(-1)
        const block = LANE.slice(at, at + 1400)
        expect(block).toContain('guidedDeafAtIndex = guided.index')
        expect(block).toContain('guidedDeafSince = Date.now()')
        // Ngủ SAU khi câu đã lên tường và đã vào bản ghi buổi — không được nuốt mất chính câu vừa nhả.
        expect(block.indexOf('emitLine(')).toBeLessThan(block.indexOf('guidedDeafAtIndex = guided.index'))
        expect(block.indexOf('recordSessionLine(')).toBeLessThan(block.indexOf('guidedDeafAtIndex = guided.index'))
    })

    it('5 · tắt dẫn theo kịch bản cũng là thức — không để lại một micro điếc sau khi rút đạn', () => {
        const at = LANE.indexOf('const frame = decideCaptureFrame({')
        expect(LANE.slice(at - 700, at)).toContain('!g.armed')
    })

    it('6 · có trần thời gian, vì quên bấm là cái sai duy nhất cơ chế này gây ra', () => {
        expect(LANE).toContain('const GUIDED_DEAF_MAX_MS = 30_000')
        const at = LANE.indexOf('const frame = decideCaptureFrame({')
        expect(LANE.slice(at - 700, at)).toContain('Date.now() - guidedDeafSince > GUIDED_DEAF_MAX_MS')
    })

    it('7 · phiên mới luôn bắt đầu ở trạng thái THỨC', () => {
        const at = LANE.indexOf('async function start(startOpts: StartOpts)')
        const block = LANE.slice(at, at + 2000)
        expect(block).toContain('guidedDeafAtIndex = -1')
        expect(block).toContain('guidedDeafSince = 0')
    })
})

describe('không bao giờ ngủ mà không ai thấy', () => {
    it('8 · lane công bố guidedDeaf riêng, KHÔNG trộn vào listenPaused của "Ngưng nghe"', () => {
        expect(LANE).toContain('guidedDeaf: boolean')
        expect(LANE).toContain('guidedDeaf: guidedDeafAtIndex >= 0')
        // Trộn thì người điều khiển không phân biệt được "máy đang chờ tôi bấm" với "tôi bấm Ngưng nghe
        // rồi quên bật lại" — hai chuyện cần hai phản ứng khác hẳn nhau.
        expect(LANE).toContain('listenPaused: config.getListenPaused?.() ?? false,')
    })

    it('9 · màn điều khiển hiện băng ĐANG IM và nói phải làm gì tiếp', () => {
        expect(CONSOLE).toContain('diag?.guidedDeaf')
        expect(CONSOLE).toContain('ĐANG IM')
        expect(CONSOLE).toContain('MC bên kia đọc bản dịch')
    })
})
```

**`tests/guidedMatch.test.ts`:**

```ts
import { describe, it, expect, beforeEach, vi, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  GUIDED_MATCH_KEY,
  GUIDED_MATCH_DEFAULT,
  GUIDED_MATCH_OPTIONS,
  loadGuidedMatch,
  saveGuidedMatch,
  guidedMatchFloor,
  guidedMatchLabel,
} from '../src/lib/lanes/online/guidedMatch'
import {
  judgeGuided,
  guidedBarFor,
  GUIDED_FLOOR,
  GUIDED_MIN_CHARS,
  GUIDED_SHORT_LINE,
  GUIDED_SHORT_FLOOR,
} from '../src/lib/lanes/online/guidedScript'
import type { ScriptMatcherEntry } from '../src/lib/lanes/online/scriptMatcher'

// TASK 57 — the length floor used to be ABSOLUTE, and that quietly made a short script line
// unreleasable for ever: "Một…", "Hai…", "Kanpai!" are all in the 08/08 script, the operator presses
// them, the MC says exactly that, and the machine refused because "kanpai" is six characters. The
// microphone is at the mouth and a noise gate already sits in front of it — a second hard filter was one
// too many. So the floor is now measured against the ARMED LINE, a short line is held to a HIGHER
// similarity bar instead of being refused, and how strict any of it is became a four-step setting.

const store = new Map<string, string>()
const stub = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size },
}
vi.stubGlobal('localStorage', stub)
afterAll(() => { vi.unstubAllGlobals() })
beforeEach(() => { store.clear(); vi.stubGlobal('localStorage', stub) })

const read = (p: string) => readFileSync(resolve(__dirname, p), 'utf8')
// Comments stripped: a header sentence EXPLAINING why the hook is absent must stay legal.
const readCode = (p: string) => read(p)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n')

const row = (over: Partial<ScriptMatcherEntry> = {}): ScriptMatcherEntry => ({
  id: 'r1', src_lang: 'vi', src: 'Xin kính chào quý vị đại biểu', dst_lang: 'ja', dst: 'ご来賓の皆様、ようこそ',
  status: 'approved', ...over,
})
const armed = { armed: true, index: 0 }

describe('guidedMatch — bốn nấc độ khớp', () => {
  it('1 · đúng bốn nấc, đúng thứ tự, đúng sàn; nấc cuối là 0 = không đo', () => {
    expect(GUIDED_MATCH_OPTIONS.map((o) => o.value)).toEqual(['strict', 'normal', 'loose', 'open'])
    expect(GUIDED_MATCH_OPTIONS.map((o) => o.floor)).toEqual([0.6, 0.45, 0.3, 0])
    // Sàn phải giảm dần: một nấc "thoáng hơn" mà lại đòi giống hơn thì cái tên nói dối.
    const floors = GUIDED_MATCH_OPTIONS.map((o) => o.floor)
    expect([...floors].sort((a, b) => b - a)).toEqual(floors)
  })

  it('2 · mặc định là "Thường" — KHÔNG phải "Thả cửa"', () => {
    // Cố ý: sàn tương đối ở dưới đã đủ để nhả "Một…"/"Kanpai!". Mặc định thả cửa thì một con trỏ đặt
    // nhầm dòng sẽ đẩy hẳn một câu KHÁC ra loa hội trường bằng giọng người, và không rút lại được.
    expect(GUIDED_MATCH_DEFAULT).toBe('normal')
    expect(guidedMatchFloor(GUIDED_MATCH_DEFAULT)).toBe(GUIDED_FLOOR)
    expect(loadGuidedMatch()).toBe('normal')
  })

  it('3 · lưu rồi đọc lại; rác trong localStorage đọc ra mặc định, không phải "không đo"', () => {
    saveGuidedMatch('open')
    expect(store.get(GUIDED_MATCH_KEY)).toBe('open')
    expect(loadGuidedMatch()).toBe('open')
    expect(guidedMatchFloor(loadGuidedMatch())).toBe(0)

    store.set(GUIDED_MATCH_KEY, 'turbo')
    expect(loadGuidedMatch()).toBe('normal')
    // @ts-expect-error — cố tình đưa rác vào
    expect(guidedMatchFloor('turbo')).toBe(GUIDED_FLOOR)
    // @ts-expect-error — cố tình đưa rác vào
    expect(guidedMatchLabel('turbo')).toBe('Thường')
  })

  it('4 · localStorage hỏng (chế độ ẩn danh) thì trả mặc định chứ không nổ', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('denied') },
      setItem: () => { throw new Error('denied') },
    })
    expect(loadGuidedMatch()).toBe('normal')
    expect(() => saveGuidedMatch('loose')).not.toThrow()
  })
})

describe('guidedBarFor — dòng ngắn bị đòi giống hơn, không bị cấm', () => {
  it('5 · dòng dài giữ nguyên sàn đang chọn', () => {
    expect(guidedBarFor(30, 0.45)).toBe(0.45)
    expect(guidedBarFor(30, 0.6)).toBe(0.6)
    expect(guidedBarFor(GUIDED_SHORT_LINE, 0.45)).toBe(0.45) // đúng vạch = chưa phải dòng ngắn
  })

  it('6 · dòng ngắn nâng lên 0,8 — nhưng không bao giờ HẠ sàn đang chọn', () => {
    expect(guidedBarFor(6, 0.45)).toBe(GUIDED_SHORT_FLOOR)
    expect(guidedBarFor(3, 0.3)).toBe(GUIDED_SHORT_FLOOR)
    expect(guidedBarFor(6, 0.9)).toBe(0.9)
  })

  it('7 · "thả cửa" là 0 ở MỌI độ dài — nấc đó bỏ hẳn việc đo', () => {
    expect(guidedBarFor(6, 0)).toBe(0)
    expect(guidedBarFor(400, 0)).toBe(0)
    expect(guidedBarFor(0, 0.45)).toBe(0.45) // không đo được độ dài thì giữ sàn thường
  })
})

describe('judgeGuided — ba dòng ngắn của kịch bản 08/08 phải nhả được', () => {
  it('8 · "Kanpai!" nhả được: đòi 6 ký tự vì dòng chỉ dài 6', () => {
    const v = judgeGuided(armed, [row({ src: 'Kanpai!', dst: '乾杯！' })], 'Kanpai!')
    expect(v.kind).toBe('release')
    if (v.kind === 'release') {
      expect(v.target).toBe('乾杯！')
      expect(v.language).toBe('ja')
    }
  })

  it('9 · "Một..." nhả được, mà "Hai..." bấm nhầm vào dòng đó thì không', () => {
    const rows = [row({ src: 'Một...', dst: '一…' })]
    expect(judgeGuided(armed, rows, 'Một...').kind).toBe('release')
    const wrong = judgeGuided(armed, rows, 'Hai...')
    expect(wrong.kind).toBe('mismatch')
    // Trượt vì KHÔNG GIỐNG, chứ không phải vì "quá ngắn" — sàn ngắn mới là thứ chặn nó.
    if (wrong.kind === 'mismatch') expect(wrong.reason).toContain('không giống')
  })

  it('10 · sàn độ dài vẫn giữ cho dòng DÀI: một tiếng ậm ừ không nhả nổi câu 28 ký tự', () => {
    const v = judgeGuided(armed, [row()], 'Ừ')
    expect(v.kind).toBe('mismatch')
    if (v.kind === 'mismatch') expect(v.reason).toContain(`/${GUIDED_MIN_CHARS} ký tự`)
  })

  it('11 · "thả cửa": bấm dòng nào nhả dòng đó, kể cả nghe ra một tiếng ậm ừ', () => {
    const v = judgeGuided(armed, [row()], 'Ừ', 0)
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
    const rows = [row({ status: 'draft', src: 'Kanpai!', dst: '乾杯！' })]
    expect(judgeGuided(armed, rows, 'Kanpai!', 0).kind).toBe('off')
  })
})

describe('nối dây — nấc trong Cài đặt phải chạy tới đúng chỗ đo', () => {
  const LANE = read('../src/lib/lanes/online/onlineLane.ts')
  const FACADE = read('../src/lib/lanes/online/index.ts')
  const SETTINGS = read('../src/pages/Settings.tsx')

  it('14 · onlineLane hỏi sàn qua config, và đọc LẠI ở từng câu (không nhớ lúc khởi động)', () => {
    expect(LANE).toContain('getGuidedFloor?: () => number')
    expect(LANE).toContain('config.getGuidedFloor?.() ?? GUIDED_FLOOR')
    // Đọc ngay tại chỗ gọi judgeGuided ⇒ đổi nấc giữa buổi là ăn ngay câu sau.
    const call = LANE.slice(LANE.indexOf('judgeGuided(guided'), LANE.indexOf('judgeGuided(guided') + 160)
    expect(call).toContain('getGuidedFloor')
  })

  it('15 · facade nối nấc đã lưu vào lane, và nhớ hộ khi tắt trình duyệt', () => {
    expect(FACADE).toContain('getGuidedFloor: () => guidedMatchFloor(loadGuidedMatch())')
    expect(FACADE).toContain("from './guidedMatch'")
    expect(FACADE).toContain("export { default as OnlineGuidedMatchSettings } from './components/OnlineGuidedMatchSettings'")
  })

  it('16 · màn Cài đặt có gắn mục này, đúng một chỗ', () => {
    expect(SETTINGS).toContain('OnlineGuidedMatchSettings')
    expect(SETTINGS.match(/<OnlineGuidedMatchSettings \/>/g)?.length).toBe(1)
    expect(SETTINGS).toContain('Chế độ ONLINE — Độ khớp khi dẫn theo kịch bản')
  })

  it('17 · màn cài đặt KHÔNG được gọi useOnlineLane (trang cấu hình không dựng phiên chạy)', () => {
    const UI = readCode('../src/lib/lanes/online/components/OnlineGuidedMatchSettings.tsx')
    expect(UI).not.toContain('useOnlineLane')
    expect(UI).toContain('saveGuidedMatch')
  })

  it('18 · sàn độ dài trong guidedScript là TƯƠNG ĐỐI theo dòng, không còn là số tuyệt đối', () => {
    const CODE = readCode('../src/lib/lanes/online/guidedScript.ts')
    expect(CODE).toContain('Math.min(GUIDED_MIN_CHARS, lineLength)')
    expect(CODE).toContain('guidedBarFor(lineLength, floor)')
    // Nếu ai đó bỏ `floor > 0` thì nấc "thả cửa" lại đi chặn câu ngắn, đúng thứ vừa sửa.
    expect(CODE).toContain('floor > 0 && text.length < need')
  })
})
```

### 59.2 `tests/guidedConsole.test.ts` — bốn ca của PHẦN 6 ghim vào thứ TASK 58 vừa xoá

Đây là chỗ dễ mất một giờ nếu không đọc trước. `tests/guidedConsole.test.ts` của PHẦN 6 ghim mấy chuỗi mà
TASK 58 **xoá hết**, nên chạy `npx vitest run` ngay sau TASK 58 sẽ thấy **bốn ca đỏ**. Mã đúng, ca test cũ.

| Ca | Chuỗi PHẦN 6 ghim | Vì sao mất | Ghim gì thay thế |
|---|---|---|---|
| 2 | `'lane.script.length > 0 && ('` | Timeline chạy được ở buổi **không có** kịch bản | điều kiện hai vế, cộng cổng riêng cho phần cần kịch bản |
| 5 | `'guided-line-now'` | lớp CSS tay bị thay bằng Tailwind | chính biến quyết định dòng nào đang tới lượt, cộng `ref` tự cuộn |
| 6 | `'bấm sai'` · `'GUIDED_FLOOR'` | câu chữ viết lại, và con số nay là sàn **thật** chứ không phải hằng số | `guidedMatchFloor(matchStep)` + hai bản câu chữ |
| 8 | `'guided-speaker-names'` | id đó không còn | nguồn danh sách tên, cộng lối thoát "Khác…" |

**Đây là tệp test được phép sửa trong PROMPT-13.** Ba khối, làm đủ cả ba.

**(a)** Ca 2. Find and replace:

```ts
describe('guidedConsole — bảng dẫn', () => {
  it('1 · bảng có mặt và đọc trạng thái từ làn', () => {
    expect(CONSOLE).toContain('Dẫn theo kịch bản')
    expect(CONSOLE).toContain('lane.guided.armed')
  })

  it('2 · chưa nạp kịch bản thì không có bảng', () => {
    expect(CONSOLE).toContain('lane.script.length > 0 && (')
  })

  it('3 · hai nút TỚI/LÙI, và cả hai đều biết tự tắt', () => {
    expect(CONSOLE).toContain('lane.stepGuided(-1)')
    expect(CONSOLE).toContain('lane.stepGuided(1)')
    expect(CONSOLE).toContain('disabled={lane.guided.index <= 0}')
```

with

```ts
describe('guidedConsole — bảng dẫn', () => {
  it('1 · bảng có mặt và đọc trạng thái từ làn', () => {
    expect(CONSOLE).toContain('Dẫn theo kịch bản')
    expect(CONSOLE).toContain('lane.guided.armed')
  })

  // PHẦN 6 ghim đúng một vế: `lane.script.length > 0 && (`. TASK 58 nới ra, có chủ ý — Timeline đáng giá
  // nhất ở những buổi KHÔNG có kịch bản (video, bài hát, Yosakoi: việc của nó là tự câm, chẳng dính gì tới
  // kịch bản). Luật cũ "không có gì thì không bày bảng" vẫn nguyên, chỉ rộng thêm một vế; và mọi thứ THẬT
  // SỰ cần kịch bản vẫn nằm sau cổng riêng của nó.
  it('2 · không kịch bản mà cũng không Timeline thì không có bảng; có một trong hai là hiện', () => {
    expect(CONSOLE).toContain('(lane.script.length > 0 || runSegments.length > 0) && (')
    expect(CONSOLE).toContain('{lane.script.length > 0 && (<>')
  })

  it('3 · hai nút TỚI/LÙI, và cả hai đều biết tự tắt', () => {
    expect(CONSOLE).toContain('lane.stepGuided(-1)')
    expect(CONSOLE).toContain('lane.stepGuided(1)')
    expect(CONSOLE).toContain('disabled={lane.guided.index <= 0}')
```

**(b)** Ca 5 và ca 6. Find and replace:

```ts
  })

  it('4 · bấm thẳng vào một dòng là chuyển con trỏ tới dòng đó', () => {
    expect(CONSOLE).toContain('lane.setGuidedIndex(i)')
  })

  it('5 · dòng đang tới lượt có lớp riêng để nhìn ra ngay', () => {
    expect(CONSOLE).toContain('guided-line-now')
  })

  it('6 · ghi chú an toàn nói rõ bấm sai thì không tệ hơn khi tắt', () => {
    expect(CONSOLE).toContain('bấm sai')
    expect(CONSOLE).toContain('GUIDED_FLOOR')
  })

  it('7 · con trỏ KHÔNG BAO GIỜ được nhớ qua phiên', () => {
    for (const line of FACADE.split('\n')) {
      const lower = line.toLowerCase()
      if (lower.includes('guided') && lower.includes('localstorage')) {
```

with

```ts
  })

  it('4 · bấm thẳng vào một dòng là chuyển con trỏ tới dòng đó', () => {
    expect(CONSOLE).toContain('lane.setGuidedIndex(i)')
  })

  // TASK 58 dựng lại bảng này bằng Tailwind/M3 nên lớp CSS tay `guided-line-now` không còn; thứ được ghim
  // bây giờ là CHÍNH cái quyết định "dòng nào đang tới lượt", cộng cái ref tự cuộn nó vào tầm mắt — dòng
  // thứ 180 của kịch bản mà không tự cuộn thì nhìn ra cũng bằng thừa.
  it('5 · dòng đang tới lượt nhìn ra ngay, và tự cuộn vào tầm mắt', () => {
    expect(CONSOLE).toContain('const now = i === lane.guided.index')
    expect(CONSOLE).toContain("now ? 'border-secondary bg-secondary/[0.14]'")
    expect(CONSOLE).toContain('ref={now ? guidedLineRef : undefined}')
  })

  // Ghi chú an toàn vẫn phải có, nhưng nay nó phải NÓI THẬT. Con số in ra không còn là hằng số 45% mà là
  // sàn đang chạy, do nấc trong Cài đặt quyết định; và nấc "Thả cửa" (sàn 0) đảo ngược hẳn lời trấn an —
  // ở nấc đó bấm nhầm dòng LÀ phòng tiệc nghe nhầm câu, nên màn hình phải nói đúng như thế.
  it('6 · ghi chú an toàn in đúng sàn đang chạy, và đảo lời khi nấc là "Thả cửa"', () => {
    expect(CONSOLE).toContain('bấm nhầm dòng không làm buổi lễ tệ đi')
    expect(CONSOLE).toContain('Math.round(guidedMatchFloor(matchStep) * 100)')
    expect(CONSOLE).toContain('guidedMatchFloor(matchStep) > 0')
    expect(CONSOLE).toContain('Bấm nhầm dòng là phòng tiệc nghe nhầm câu')
    // và không còn đường nào in ra hằng số mặc định
    expect(CONSOLE).not.toContain('GUIDED_FLOOR')
  })

  it('7 · con trỏ KHÔNG BAO GIỜ được nhớ qua phiên', () => {
    for (const line of FACADE.split('\n')) {
      const lower = line.toLowerCase()
      if (lower.includes('guided') && lower.includes('localstorage')) {
```

**(c)** Ca 8, và **bốn ca mới** cho ô ĐANG TỚI PHẦN — hai việc trong một khối vì chúng nằm sát nhau ở cuối
tệp. Bốn ca mới ghim mặt lớn nhất mà PROMPT-13 thêm vào màn điều khiển và tới giờ không ca nào ghim: bấm
sang một đoạn phải đặt **đủ bốn thứ trong một lời gọi**, con trỏ chỉ nhảy khi neo giải được (giải không ra
thì bỏ trỏ chứ không đoán bừa), và đoạn đang chạy phải nói thẳng máy đang nghe hay đang câm.

Find and replace:

```ts
    }
    expect(FACADE).toContain('const [guided, setGuided] = useState<GuidedState>(GUIDED_OFF)')
  })
})

describe('guidedConsole — ô "đang tới lượt"', () => {
  it('8 · ô chọn người có mặt, gợi ý tên lấy từ danh sách diễn giả của buổi', () => {
    expect(CONSOLE).toContain('Đang tới lượt')
    expect(CONSOLE).toContain('guided-speaker-names')
  })

  it('9 · ô tick dẫn bị khoá khi người nói không bám kịch bản', () => {
    expect(CONSOLE).toContain('disabled={!guidedAllowed(lane.speakerMode)}')
  })

  it('10 · luật MỘT CHIỀU nằm ở facade chứ không phải chỉ ở giao diện', () => {
    // Đổi kiểu người nói phải TẮT dẫn; và không đường nào bật nó lên hộ người vận hành.
    expect(FACADE).toContain('if (!guidedAllowed(mode)) setGuided')
    expect(FACADE).toContain('armed && !guidedAllowed(speakerModeRef.current)')
  })
})
```

with

```ts
    }
    expect(FACADE).toContain('const [guided, setGuided] = useState<GuidedState>(GUIDED_OFF)')
  })
})

describe('guidedConsole — ô "đang tới lượt"', () => {
  // Nhãn nay viết hoa theo hàng nhãn của màn console; và danh sách gợi ý vẫn lấy từ danh sách diễn giả của
  // buổi chứ không phải một kho tên nào khác — đó mới là điều ca này giữ.
  it('8 · ô chọn người có mặt, gợi ý tên lấy từ danh sách diễn giả của buổi', () => {
    expect(CONSOLE).toContain('ĐANG TỚI LƯỢT')
    expect(CONSOLE).toContain('(event?.speakers ?? []).filter((s) => s.name.trim())')
    // và lối thoát "gõ tay" vẫn còn, cho buổi chưa ai điền danh sách
    expect(CONSOLE).toContain('<option value={OTHER_SPEAKER}>Khác… (gõ tên)</option>')
  })

  it('9 · ô tick dẫn bị khoá khi người nói không bám kịch bản', () => {
    expect(CONSOLE).toContain('disabled={!guidedAllowed(lane.speakerMode)}')
  })

  it('10 · luật MỘT CHIỀU nằm ở facade chứ không phải chỉ ở giao diện', () => {
    // Đổi kiểu người nói phải TẮT dẫn; và không đường nào bật nó lên hộ người vận hành.
    expect(FACADE).toContain('if (!guidedAllowed(mode)) setGuided')
    expect(FACADE).toContain('armed && !guidedAllowed(speakerModeRef.current)')
  })
})

// TASK 58 — ô "ĐANG TỚI PHẦN". Đây là mặt lớn nhất mà TASK 58 thêm vào màn console và tới giờ chưa ca nào
// ghim: bấm sang một đoạn của Timeline phải đặt CẢ BỐN thứ mà hôm nay người điều khiển bấm rời rạc giữa
// buổi lễ. Gala 08/08 có ~17 đoạn máy bắt buộc phải câm rải trong bốn tiếng — quên đúng một cái là loa
// phòng tiệc đọc lời bài hát.
describe('guidedConsole — ô "đang tới phần"', () => {
  it('11 · chỉ những đoạn CHẠY ĐƯỢC mới vào ô chọn, dòng nhan đề bị loại', () => {
    expect(CONSOLE).toContain("const runSegments = useMemo(() => (event?.segments ?? []).filter((s) => !s.divider), [event])")
  })

  it('12 · bấm sang một đoạn đặt đủ bốn thứ trong MỘT lời gọi, cộng bối cảnh riêng của đoạn', () => {
    expect(CONSOLE).toContain('lane.setSegmentBrief(collectSegmentBrief(event, seg.docIds, segmentSpeakerName(seg, event)))')
    const at = CONSOLE.indexOf('lane.applySegment({')
    expect(at).toBeGreaterThan(0)
    const call = CONSOLE.slice(at, CONSOLE.indexOf('})', at))
    for (const key of ['speakerName:', 'mode:', 'listen:', 'scriptIndex:', 'language:']) {
      expect(call).toContain(key)
    }
  })

  it('13 · con trỏ chỉ nhảy khi neo giải được; giải không ra thì bỏ trỏ chứ không đoán bừa', () => {
    expect(CONSOLE).toContain('const a = resolveScriptAnchor(seg, lane.script, allScriptRows)')
    expect(CONSOLE).toContain('scriptIndex: a.kind === \'ok\' ? a.index : -1,')
    // "mất dòng" khác "dòng chưa duyệt" — phân biệt được là nhờ danh sách MỌI dòng của buổi, lấy từ CÙNG
    // một lần đọc kho kịch bản chứ không mở kho lần hai.
    expect(CONSOLE).toContain('scriptLoad.allRows.map((r) => ({ id: r.id, src: r.src }))')
  })

  it('14 · đoạn đang chạy nói thẳng máy đang nghe hay đang câm', () => {
    expect(CONSOLE).toContain("segmentListens(curSegment) ? 'MÁY ĐANG NGHE' : 'MÁY ĐANG CÂM'")
    // và khoá chiều gắn cho đoạn phải tự thú khi phiên đang MỘT CHIỀU, lúc đó nó là nút bấm giả
    expect(CONSOLE).toContain('segmentLanguage(curSegment, event) && !lane.twoWay')
  })
})
```

> Ba chuỗi trong nhóm này đã có ca khác ghim rồi, không phải ghim lại: `diag?.guidedDeaf` nằm ở
> `tests/guidedDeaf.test.ts` ca 9, còn `lane.setGuidedIndex(i)` và `'Dẫn theo kịch bản'` vẫn nằm ở ca 4 và
> ca 1 của chính tệp này — hai ca đó **không đụng tới**.

### 59.3 Con số

Bộ test của bạn ở `e22cfd6` là **760 ca / 58 tệp**. PROMPT-13 thêm:

| Nguồn | Số ca |
|---|---|
| bốn tệp mới ở 59.1 | +73 |
| bốn ca mới ở 59.2(d) | +4 |
| năm ca mới ở TASK 61 | +5 |
| **Tổng sau PROMPT-13** | **842 ca / 62 tệp** |

Bốn ca sửa ở 59.2(a)(b)(c) **không** làm đổi số: sửa nội dung ghim, không thêm ca. TASK 61 thêm ca vào
một tệp **đã có** (`tests/scriptTransfer.test.ts`) nên số tệp vẫn là 62.

Bản của tôi: **842 ca / 62 tệp, xanh hết**, `npx tsc -b --noEmit` sạch. Nếu bên bạn ra số khác, đừng chữa
cho khớp số — báo tôi con số thật và tên tệp đỏ.

**Một ca sẽ hiện SKIP bên bạn, và đó là đúng.** Khối `Timeline gala 08/08 thật` ở §59.1 đọc tệp
`docs/KICH_BAN_GALA_8_8_V8_song_ngu.html`; tệp đó **không có trong kho này** (nó là tệp chương trình của
buổi lễ, chưa ai đưa vào repo), nên khối tự bỏ qua. Bên bạn sẽ thấy **`841 passed | 1 skipped (842)`** —
tổng vẫn 842. Đừng đi tìm ca "thiếu": không thiếu. Ngày nào tệp đó được bỏ vào `docs/` thì ca tự chạy.

---

## TASK 60 — tài liệu

### 60.1 `docs/ONLINE-LANE-UI-API.md`

**(a)** Thêm vào khối exports. Find and replace:

```md
  summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS,   // documented below; was missing from this list
```

with

```md
  summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS,   // documented below; was missing from this list
  OnlineGuidedMatchSettings,                              // Settings: "Độ khớp khi dẫn theo kịch bản"
  GUIDED_MATCH_OPTIONS, GUIDED_MATCH_DEFAULT, GUIDED_MATCH_KEY,
  loadGuidedMatch, saveGuidedMatch, guidedMatchFloor, guidedMatchLabel, type GuidedMatch,
```

**(b)** Một mục mới cho Timeline. Find and replace:

```md
### `summarizePrepDocs(input): Promise<PrepBriefResult>` (M14)
```

with

```md
### `applySegment(seg)` · `setSegmentBrief(text)` — bấm sang một đoạn của Chương trình (TASK 58)

`applySegment({ speakerName?, mode?, listen?, scriptIndex?, language? })` là MỘT lời gọi đặt cả bốn thứ
mà người điều khiển vốn phải bấm riêng lẻ giữa buổi lễ, cộng một cú khoá chiều dịch. Nó nhận **dữ liệu
thuần**, không nhận `Segment`: lane không được import `src/lib/schedule.ts`, và một dòng Timeline là
chuyện của màn Chuẩn bị.

Hai quy tắc một chiều nằm sẵn trong đó, đừng gỡ:

- `mode` chỉ **tắt** được chế độ dẫn, không bao giờ **bật**. Bật dẫn luôn phải là một hành động cố ý của
  con người; chọn tên người kế tiếp trong một danh sách không phải là hành động đó.
- `language: ''` **nhả khoá**, không phải "giữ nguyên khoá cũ". Một đoạn để trống tiếng nghĩa là máy tự
  nhận, và nó phải thật sự có nghĩa như vậy — nếu không, đoạn trống sẽ thừa hưởng khoá của người trước.

`setSegmentBrief(text)` là bối cảnh riêng của đoạn đang chạy, đọc lại ở **mỗi câu** (`getBrief`). Rỗng ⇒
lane tự quay về ô Bối cảnh chung. Nó **không** ghi đè ô Bối cảnh: ô đó là bối cảnh cả buổi, do người điều
khiển soạn tay.

`lockLanguage(lang | null)` của lane là chỗ khoá thật sự nằm. Nó **không** đụng tham số `language` gửi cho
máy nghe — máy nghe vẫn `'auto'`, để một câu ngoại ngữ trích dẫn vẫn được chép đúng và để không phải mở
lại kết nối giữa buổi. Đổi khoá thì **xả bộ đệm trước**: chữ đang chờ thuộc về người nói TRƯỚC.

### `GUIDED_MATCH_*` — độ khớp khi dẫn theo kịch bản (TASK 57)

Bốn nấc: `strict` 0,6 · `normal` 0,45 (mặc định) · `loose` 0,3 · `open` **0 = không đo**. Lane đọc lại ở
từng câu qua `getGuidedFloor`, nên đổi nấc trong Cài đặt ăn ngay câu sau, không phải Dừng rồi Bắt đầu lại.

`open` là một **loại** nấc khác chứ không phải một con số nhỏ hơn: người điều khiển bấm dòng CHÍNH LÀ bằng
chứng, và không có phép đo nào cả. Đúng cho lúc chạy thử; sai cho buổi lễ thật, vì một con trỏ đặt lùi một
dòng sẽ đẩy hẳn một câu đã duyệt khác ra loa hội trường bằng giọng người.

Sàn độ dài đo theo **dòng đang bấm** (`min(8, độ dài dòng)`), không phải một con số tuyệt đối — nếu không,
`Một...` · `Hai...` · `Kanpai!` là những dòng có thật trong kịch bản mà máy không bao giờ nhả nổi. Dòng
ngắn dưới 8 ký tự bị đòi giống 80% (`guidedBarFor`) vì câu ngắn dễ trùng ngẫu nhiên.

### `summarizePrepDocs(input): Promise<PrepBriefResult>` (M14)
```

### 60.2 `docs/ONLINE-LANE-CONTRACT.md`

**Không sửa gì cả.** Không có endpoint mới nào trong PROMPT-13 — toàn bộ phần này chạy trong máy. Chuyện
"hai mục 8." bạn đã tự vá trước khi commit `e22cfd6`, và vá kỹ hơn bản tôi định gửi.

---

## TASK 61 — `src/pages/ScriptPrep.tsx`: nút **Xoá hết** kịch bản

Việc này không nằm trong ba việc kể ở đầu prompt. Nó đến từ ngày 05/08, khi kịch bản 04/08 thay hẳn kịch
bản 24/07, và không có cách nào thay kịch bản trong máy.

**Chuyện thật.** Bản kịch bản song ngữ đang nạp có 40 câu duyệt, dựng theo kịch bản 24/07. Đối chiếu bằng
chính `scriptMatcher.ts` với kịch bản 04/08: **24 câu còn nguyên** (23 câu khớp 1.000, tức giống từng
chữ), **1 câu đổi chữ**, **15 câu chết hẳn** — chúng thuộc bốn chỗ bản v6.7 dựng lại (Ông Takebe không còn
phát biểu riêng · không còn mời TGĐ và phu nhân · phần định hướng đổi từ 4 nhóm sang Xuân Lanh + 9 người
trẻ · đoạn điều phối chụp ảnh bị bỏ). Nên kịch bản phải **thay**, không phải bù thêm.

**Vì sao không thể chỉ nhập đè lên.** `commitImport` là `[...prev, ...entries]` — **cộng thêm**, không
thay. Và một dòng bị lặp không hề vô hại: ở `scriptMatcher.ts` biên á quân là **0.06**, còn
`runnerUp = scored.find((item) => !sameStart(candidate, item.candidate))` lấy đúng ứng viên **khác vị trí
đầu**. Hai dòng chữ giống hệt nhau là hai ứng viên khác vị trí với điểm **bằng nhau**: hiệu số bằng 0,
dưới 0.06, và cặp đó bị hạ từ `snap` xuống `suggest`. Nói cách khác, nhập bản mới đè lên bản cũ sẽ **tự
tay làm câm đúng 24 câu đang chạy tốt**. Hôm nay đường thoát duy nhất là bấm `×` bốn mươi lần.

**Và sau PROMPT-12 thì xoá localStorage bằng tay cũng không đủ nữa** — kịch bản lúc đó nằm trên kho chung
(Volume). Lệnh xoá phải đi qua `writeScriptLocal`, vì đó là chỗ PROMPT-12 gắn `markCloudDirty('script')`.
Đây cũng là lý do TASK 61 **không** tự đụng vào `localStorage`.

Ba điều bắt buộc, đừng đơn giản hoá:

1. **Ghi bản rỗng xuống máy TRƯỚC, đồng bộ (không `await`), rồi mới đẩy lên backend.** Làm ngược thì lần
   tự lưu trễ 400ms đóng dấu `updatedAt` mới hơn `syncedAt`, và bảng báo "Chưa đồng bộ" trên một kịch bản
   thật ra đã đồng bộ xong.
2. **Mất mạng thì báo ĐỎ, không báo xanh.** Xoá tại máy xong mà backend còn giữ bản cũ là đúng cái bẫy
   khiến buổi tổng duyệt chạy theo kịch bản cũ và không ai hiểu vì sao.
3. **Hỏi lại bằng `window.confirm`**, đúng lối mọi việc xoá khác trong app (`ScriptPrep.tsx` đã dùng ở
   `pullBackend`), và câu hỏi phải nhắc "Xuất .json" trước.

### 61.1 `src/pages/ScriptPrep.tsx`

**(a)** Nhập đè lên kịch bản đang có thì nói ra tổng số dòng. Find and replace:

```tsx
        // in green is how somebody concludes on the morning of an event that the script is loaded.
        if (!entries.length) {
            toast.error('Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên');
            return;
        }
        mutate((prev) => [...prev, ...entries]);
        toast.success(`Đã thêm ${entries.length} dòng`);
        closeImport();
    };

    const exportScriptJson = () => {
        const { filename, json } = buildScriptExport(eventId, dir, rows, new Date().toISOString());
        try {
```

with

```tsx
        // in green is how somebody concludes on the morning of an event that the script is loaded.
        if (!entries.length) {
            toast.error('Tệp không có dòng kịch bản nào — kịch bản hiện tại giữ nguyên');
            return;
        }
        mutate((prev) => [...prev, ...entries]);
        // TASK 61: importing onto a script that is not empty ADDS. Report the running total in that
        // case, so a replacement done the wrong way (import without clearing) is visible in the same
        // second rather than at the rehearsal, when the duplicate rows have already gone quiet.
        toast.success(`Đã thêm ${entries.length} dòng${rows.length ? ` — buổi này nay có ${rows.length + entries.length} dòng. Muốn THAY chứ không cộng thêm thì bấm "Xoá hết" rồi nhập lại.` : ''}`);
        closeImport();
    };

    const exportScriptJson = () => {
        const { filename, json } = buildScriptExport(eventId, dir, rows, new Date().toISOString());
        try {
```

> Chuỗi `` toast.success(`Đã thêm `` giữ nguyên ở đầu, có chủ ý: ca có sẵn
> `tests/scriptTransfer.test.ts > the page uses it > refuses an empty import…` ghim đúng chuỗi đó. Đừng
> tách thành hai lời gọi `toast.success` — làm vậy là ca cũ đỏ.

**(b)** Hàm `clearAll`. Find and replace:

```tsx
            toast.success(`Đã xuất ${rows.length} dòng`);
        } catch {
            toast.error('Không tải được tệp về máy');
        }
    };

    const openImport = () => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setImportOpen(true); setImportShown(false);
        setTimeout(() => setImportShown(true), 20);
    };
    const closeImport = () => {
```

with

```tsx
            toast.success(`Đã xuất ${rows.length} dòng`);
        } catch {
            toast.error('Không tải được tệp về máy');
        }
    };

    // TASK 61 — replace a script, don't stack one on top of another. `commitImport` APPENDS, and two
    // rows carrying the same sentence are not harmless: the matcher's runner-up margin (0.06) sees a
    // duplicate as an equally-good rival, the gap is 0, and the pair is demoted out of `snap` — so an
    // import laid over the old script silently disarms exactly the lines that were working. Deleting
    // 40 rows by hand before a rehearsal is not a plan, so this is one button.
    //
    // It writes the empty list through `writeScriptLocal` FIRST and synchronously: the debounced
    // autosave would otherwise land after the backend push and stamp `updatedAt` newer than
    // `syncedAt`, showing "Chưa đồng bộ" over a script that is in fact synced. Going through
    // `writeScriptLocal` is also what feeds the shared store — the clear has to reach the Volume, not
    // just this browser.
    const clearAll = async () => {
        const n = rows.length;
        if (!n) return;
        if (!window.confirm(`Xoá hết ${n} dòng kịch bản của buổi này? KHÔNG thể hoàn tác — nếu chưa bấm "Xuất .json" thì huỷ và xuất trước đã.`)) return;
        writeScriptLocal(eventId, []);
        setRows([]);
        if (!session.backendOnline) {
            // Local is empty, the matcher's copy is not. Saying "đã xoá" here is how a rehearsal runs
            // against the old script and nobody understands why.
            setBeDirty(true);
            toast.error(`Đã xoá ${n} dòng tại máy — backend VẪN giữ bản cũ cho matcher. Bấm "Đồng bộ BE" khi có mạng.`);
            return;
        }
        setSyncing(true);
        try {
            await pushToBackend(eventId, []);
            setBeDirty(false);
            toast.success(`Đã xoá ${n} dòng — cả tại máy lẫn bản matcher đang đọc`);
        } catch (e) {
            setBeDirty(true);
            toast.error('Đã xoá tại máy, nhưng backend chưa xoá được: ' + (e instanceof Error ? e.message : String(e)));
        } finally { setSyncing(false); }
    };

    const openImport = () => {
        if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
        setImportOpen(true); setImportShown(false);
        setTimeout(() => setImportShown(true), 20);
    };
    const closeImport = () => {
```

**(c)** Cái nút. Find and replace:

```tsx
                    later reads as "the script was empty". */}
                <button onClick={exportScriptJson} disabled={rows.length === 0}
                    title="Tải kịch bản (kèm trạng thái duyệt) về máy, để mở trên máy khác"
                    className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-full font-label-caps text-label-caps hover:border-secondary hover:text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>Xuất .json
                </button>
                <button onClick={openImport} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập tệp</button>
            </PageHeader>

            <div className="flex-1 overflow-y-auto">
                <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
                    {/* Readiness / % tiếp thu — hero */}
```

with

```tsx
                    later reads as "the script was empty". */}
                <button onClick={exportScriptJson} disabled={rows.length === 0}
                    title="Tải kịch bản (kèm trạng thái duyệt) về máy, để mở trên máy khác"
                    className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-full font-label-caps text-label-caps hover:border-secondary hover:text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">download</span>Xuất .json
                </button>
                {/* TASK 61: sits immediately AFTER "Xuất .json" on purpose — the only safe order is
                    export, then clear, then import, and the row of buttons should read that way. */}
                <button onClick={clearAll} disabled={rows.length === 0 || syncing}
                    title="Xoá hết kịch bản của buổi này (tại máy + bản matcher đọc) để nhập bản mới"
                    className="flex items-center gap-1.5 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-full font-label-caps text-label-caps hover:border-error hover:text-error transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-outline-variant disabled:hover:text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete_sweep</span>Xoá hết
                </button>
                <button onClick={openImport} className="btn-lux flex items-center gap-1.5 bg-secondary text-on-secondary px-4 py-2 rounded-full font-label-caps text-label-caps hover:opacity-80"><span className="material-symbols-outlined text-[18px]" aria-hidden="true">upload_file</span>Nhập tệp</button>
            </PageHeader>

            <div className="flex-1 overflow-y-auto">
                <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
                    {/* Readiness / % tiếp thu — hero */}
```

### 61.2 `tests/scriptTransfer.test.ts`

Năm ca, nối vào cuối tệp. Find and replace:

```ts
    const reader = PAGE.indexOf('await readImportFile(file)');
    expect(branch).toBeGreaterThan(-1);
    expect(reader).toBeGreaterThan(-1);
    expect(branch).toBeLessThan(reader);
  });
});
```

with

```ts
    const reader = PAGE.indexOf('await readImportFile(file)');
    expect(branch).toBeGreaterThan(-1);
    expect(reader).toBeGreaterThan(-1);
    expect(branch).toBeLessThan(reader);
  });
});

// TASK 61 — replacing a script. Import APPENDS, and a duplicated row is not free: the matcher reads a
// second copy of the same sentence as an equally-good rival, the runner-up gap collapses to 0, and the
// pair drops out of `snap`. So the only correct way to swap in a new script is clear-then-import, and
// the page has to make that possible in one click and truthful about the backend copy.
describe('xoá hết kịch bản (TASK 61)', () => {
  it('1 · có nút, và nút tắt khi không còn gì để xoá', () => {
    expect(PAGE).toContain('onClick={clearAll} disabled={rows.length === 0 || syncing}');
    expect(PAGE).toContain('>Xoá hết');
  });

  it('2 · hỏi lại trước khi xoá, và câu hỏi nói rõ số dòng lẫn đường lui', () => {
    const ask = PAGE.indexOf('Xoá hết ${n} dòng kịch bản của buổi này?');
    expect(ask).toBeGreaterThan(-1);
    expect(PAGE).toContain('KHÔNG thể hoàn tác');
    expect(PAGE).toContain('Xuất .json" thì huỷ và xuất trước đã');
    // và phải là window.confirm — cùng lối với mọi việc xoá khác trong app
    expect(PAGE.slice(ask - 200, ask)).toContain('window.confirm');
  });

  it('3 · ghi bản rỗng xuống máy TRƯỚC khi đẩy lên backend', () => {
    // Ngược lại thì lần tự lưu trễ 400ms đóng dấu updatedAt mới hơn syncedAt và bảng báo "Chưa đồng bộ"
    // trên một kịch bản thật ra đã đồng bộ. Đây cũng là đường mà kho chung (Volume) nhận lệnh xoá.
    const write = PAGE.indexOf('writeScriptLocal(eventId, []);');
    const push = PAGE.indexOf('await pushToBackend(eventId, []);');
    expect(write).toBeGreaterThan(-1);
    expect(push).toBeGreaterThan(-1);
    expect(write).toBeLessThan(push);
  });

  it('4 · mất mạng thì KHÔNG được báo xanh — backend vẫn giữ bản cũ', () => {
    const off = PAGE.indexOf('if (!session.backendOnline) {\n            // Local is empty');
    expect(off).toBeGreaterThan(-1);
    expect(PAGE).toContain('backend VẪN giữ bản cũ cho matcher');
    // chỉ soi trong đúng nhánh mất mạng: từ chỗ rẽ tới lệnh đầu tiên của nhánh còn mạng
    const branch = PAGE.slice(off, PAGE.indexOf('setSyncing(true);', off));
    expect(branch).toContain('toast.error(');
    expect(branch).not.toContain('toast.success(');
  });

  it('5 · nhập đè lên kịch bản đang có thì nói ra tổng số dòng', () => {
    expect(PAGE).toContain('buổi này nay có ${rows.length + entries.length} dòng');
    expect(PAGE).toContain('Muốn THAY chứ không cộng thêm thì bấm "Xoá hết" rồi nhập lại');
  });
});
```

### 61.3 Kiểm bằng tay riêng cho TASK 61

- Chuẩn bị → Kịch bản, buổi đang có vài dòng → nút **Xoá hết** sáng, nằm ngay sau **Xuất .json**.
- Buổi trống chưa có dòng nào → nút **Xoá hết** phải mờ (không bấm được).
- Bấm Xoá hết → hộp hỏi ghi đúng số dòng và nhắc Xuất .json. Bấm **Huỷ** → không mất dòng nào.
- Bấm lại, đồng ý → bảng về 0 dòng; tải lại trang (F5) → **vẫn 0 dòng** (đã xuống máy thật, không phải chỉ
  biến mất trên màn).
- Tắt backend (hoặc chạy `npm run dev` không có backend) rồi Xoá hết → phải ra **thông báo đỏ** nói backend
  vẫn giữ bản cũ, và huy hiệu đầu trang chuyển **Chưa đồng bộ**.
- Có backend, Xoá hết → thông báo xanh; bấm **Tải về** → kéo đúng 0 dòng (không phải bản cũ).
- Nhập tệp mới lên một buổi đang có 40 dòng → thông báo phải ghi tổng số dòng mới và nhắc "Xoá hết".

---

## Kiểm bằng tay (làm hết, đừng bỏ mục nào)

Chuẩn bị: một buổi trong Đặt lịch, có ít nhất hai người nói — **một người gắn tiếng Việt, một người gắn
tiếng Nhật** — và một kịch bản đã duyệt vài dòng.

1. **Màn Chương trình mở được.** Chuẩn bị → Chương trình. Chưa có Timeline thì thấy màn hình trống có hai
   nút. Bấm "Thêm đoạn" → một dòng hiện ra, gõ tên, tải lại trang → dòng vẫn còn.
2. **Nhập từ file HTML.** Chọn một tệp Timeline `.html`. Đọc được thì báo số dòng và số phần; các dòng
   loại VIDEO / BÀI HÁT / YOSAKOI phải hiện là **CÂM** mà không phải bấm gì.
3. **Thống kê nói thật.** Đầu màn phải ghi rõ buổi này nghe bao nhiêu đoạn, câm bao nhiêu, và **bao nhiêu
   đoạn có nghe mà chưa gán người**.
4. **Bấm sang đoạn ở màn chạy.** Mở màn điều khiển ONLINE, bật **Một mic hai chiều**, Bắt đầu. Cột trái có
   ô **ĐANG TỚI PHẦN**. Chọn một đoạn gắn người nói tiếng Nhật → thẻ dưới ô phải ghi
   `… · khoá chiều Nhật → Việt`, và ô người nói tự đổi theo.
5. **Đoạn CÂM thì câm thật.** Bấm sang một đoạn VIDEO → thẻ đỏ **MÁY ĐANG CÂM**, và đồng hồ chữ trên màn
   phải đứng im dù có nói vào micro. Bấm sang đoạn sau → nghe lại ngay.
6. **Khoá chiều làm đúng việc của nó.** Ở đoạn gắn tiếng Nhật, nói *"Xin chào Việt Nam"* rồi nói tiếp
   tiếng Nhật trong cùng một hơi. Trước đây câu bị cắt đôi và dịch ngược chiều; bây giờ phải ra **một câu**
   và vẫn dịch Nhật → Việt.
7. **Phiên MỘT CHIỀU nói thật.** Dừng, tắt "Một mic hai chiều", Bắt đầu lại, bấm sang một đoạn có gắn
   tiếng → phải hiện dòng chữ đỏ nói rằng tiếng gắn cho đoạn **không có tác dụng** ở phiên một chiều.
8. **Bảng dẫn nằm trên màn CHẠY.** Không mở popup Chuẩn bị nào cả, phải thấy ngay: công tắc Dẫn theo kịch
   bản, thẻ dòng đang chọn (cả hai mặt), Lùi/Tới. Đây là bản vá lỗi ③.
9. **Popup kịch bản.** Bấm "Mở kịch bản" → popup rộng, cuộn được, dòng đang chọn tự nằm giữa màn. Bấm một
   dòng khác → con trỏ nhảy tới đó, thẻ bên trái đổi theo.
10. **Tự im rồi tự nghe lại.** Bật Dẫn, bấm một dòng, đọc đúng câu đó → dòng lên tường. Ngay sau đó phải
    hiện ô **ĐANG IM**. Nói tiếp vào micro → **không** có chữ nào chạy. Bấm **Tới** → ô ĐANG IM biến mất
    và chữ chạy lại trong khoảng một phần tư giây.
11. **Ba dòng ngắn nhả được.** Trong kịch bản để một dòng đã duyệt là `Kanpai!` (bản dịch `乾杯！`), bấm
    đúng dòng đó rồi nói "Kanpai" → phải nhả. Trước PROMPT-13 dòng này không bao giờ nhả.
12. **Nấc Thả cửa.** Cài đặt → *Độ khớp khi dẫn theo kịch bản* → **Thả cửa**. Quay lại màn chạy (không
    Dừng), bấm một dòng, ho một tiếng → dòng vẫn nhả. Đổi lại **Thường** → hết nhả bừa.
13. **Buổi chưa dựng Timeline chạy y như cũ.** Chọn một buổi không có Timeline → không có ô ĐANG TỚI PHẦN,
    mọi thứ khác nguyên như trước.
14. **Nhập lại kịch bản.** Nhập lại kịch bản của buổi (mã dòng đổi hết) → mở Chương trình, bấm
    **Gắn lại tự động** → báo số đoạn đã chữa và số đoạn mất dấu. Ở màn chạy, đoạn mất dấu phải hiện chữ
    đỏ **MẤT DẤU**, không được im lặng không nhảy.

## Chạy trước khi báo xong

```
npx tsc -b --noEmit          # phải sạch
npx vitest run               # phải 0 đỏ · 841 passed | 1 skipped (842) · 62 tệp
npm run build                # phải xong
grep -rn "guided-" src/      # phải còn ĐÚNG 3 dòng, xem ngay dưới
```

Ba dòng `guided-` được phép còn lại đều nằm trong `OnlineGuidedMatchSettings.tsx` và đều là `id`/`name`
của ô chọn nấc: `guided-match-${o.value}` (hai chỗ) và `name="guided-match"`. Còn bất cứ `guided-panel`,
`guided-line`, `guided-list`, `guided-speaker`, `guided-hint`, `guided-blocked`, `guided-num`,
`guided-readout`, `guided-note` nào là CSS chết của TASK 51 chưa xoá — quay lại làm TASK 51.

## Nói với Sếp bằng tiếng dễ hiểu

Chương trình buổi lễ giờ **nằm sẵn trong máy**. Trước ngày lễ, soạn một lần: buổi có những phần nào, phần
nào ai nói, người đó nói tiếng gì, phần nào máy phải im.

Đến hôm chạy thật, mỗi khi chuyển sang phần mới, người điều khiển chỉ bấm **một nút "Phần sau"**. Máy tự
biết bốn thứ cùng lúc: ai đang nói · người đó đọc theo kịch bản hay nói tự do · **có phải im không** · và
đang ở câu nào trong kịch bản. Trước đây bốn thứ đó là bốn ô phải bấm tay, sáu mươi lần, suốt bốn tiếng,
trong hội trường tối.

Ba việc nhỏ hơn nhưng ai cũng thấy ngay:

- **Khách Nhật nói chen một câu tiếng Việt** ("Xin chào Việt Nam") thì máy hiểu đó là **câu trích**, vẫn
  dịch Nhật sang Việt như cũ, và không cắt câu làm đôi nữa.
- **Khi đang bật "Dẫn theo kịch bản": MC bên kia đọc bản dịch thì máy tự im** — vì câu đó đã có bản dịch
  duyệt sẵn rồi, nghe thêm chỉ sinh
  ra một dòng rác trên màn hình khán giả. Bấm sang câu sau là máy nghe lại ngay, chậm hơn **một phần tư
  giây**, và phần tiếng ngay trước lúc bấm cũng không mất.
- **Những câu rất ngắn trong kịch bản** — "Một…", "Hai…", "Kanpai!" — trước đây máy không chịu đọc vì cho
  là quá ngắn. Nay đọc được. Và trong Cài đặt có thêm một nút chọn máy phải nghe **giống tới đâu** mới
  đọc; lúc chạy thử để **Thả cửa** cho thoải mái, buổi thật để **Thường**.

**Thêm một nút nhỏ mà lần này rất cần: "Xoá hết" ở màn Kịch bản.** Kịch bản ngày 04/08 thay hẳn bản cũ —
đối chiếu bằng máy thì chỉ 24 trong 40 câu duyệt còn dùng được: 15 câu thuộc những phần đã bỏ hẳn, thêm
1 câu bị sửa lại chữ. Trước
đây muốn thay kịch bản thì phải bấm xoá **từng dòng một**, bốn mươi lần; mà nhập chồng lên bản cũ thì còn
tệ hơn — hai dòng giống hệt nhau làm máy phân vân và **thôi không đọc** đúng những câu vốn đang chạy tốt.
Nay bấm một nút là sạch, hỏi lại một lần trước khi xoá, và nếu lúc đó mất mạng thì máy **báo đỏ** để nhắc
rằng bản trên máy chủ vẫn còn bản cũ.

Một chỗ tôi làm khác với ý mình lúc đầu, nói thẳng: ban đầu tôi định để mặc định là **Thả cửa** cho dễ
chạy, nhưng cuối cùng giữ **Thường**. Ba câu ngắn
kia đã đọc được rồi nên Thường không còn chặn gì nữa; còn Thả cửa mà bấm nhầm dòng thì **một câu khác** sẽ
lên màn hình và ra loa bằng giọng người, giữa hội trường, không rút lại được. Muốn thả thì chỉ một cú bấm
trong Cài đặt.

**Một việc phải làm sau khi bản mới đã lên máy chủ:** mọi máy dùng cho buổi lễ **tải lại trang** (Ctrl+F5) trước khi mở
màn Chuẩn bị. Máy chưa cập nhật mà mở lịch rồi lưu sẽ xoá mất Chương trình vừa soạn.
