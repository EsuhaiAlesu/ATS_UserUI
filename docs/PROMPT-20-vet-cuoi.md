# PROMPT-20 — Vết cuối, rồi đẩy đi

> ## 🟡 Sếp dán dòng này TRƯỚC, rồi mới dán phần còn lại
>
> ```
> /goal Trong kho ATS_UserUI: (1) commit nguyên trạng phần PROMPT-19 đang nằm trong cây làm việc thành MỘT commit riêng, chưa push; (2) sửa ba việc trong prompt kế tiếp; (3) nghiệm thu bằng dynamic workflow, bắt buộc phải giết được hai mutant nêu trong prompt; (4) chỉ khi bốn cổng xanh VÀ hai mutant đều đỏ VÀ workflow kết luận ĐẠT thì mới commit lần hai rồi push cả hai commit. Không làm gì ngoài ba việc đó. Mã của ba việc này là do bạn tự viết, nên bạn ĐƯỢC PHÉP sửa đi sửa lại mã đó cho tới khi xanh — đó là việc bình thường. Nhưng khi gặp đỏ thì chỉ được sửa MÃ MỚI của chính mình; không được nới lỏng ca test, không được đổi mutant cho dễ, và không được đụng vào commit ở bước 1. Loay hoay quá năm lần một chỗ mà vẫn đỏ thì DỪNG và báo lại.
> ```

**Nền:** cây làm việc hiện tại của Sếp — tức là bản đã áp trọn PROMPT-19, bốn cổng xanh, **chưa commit**.
**Prompt này KHÔNG có khối chép sẵn.** Ba việc đều nhỏ và em mô tả bằng **điều kiện phải đạt**, để Claude
Code của Sếp tự viết mã — nhưng em ghim sẵn **hai phép thử phá hoại** mà nó bắt buộc phải vượt qua, nên
không thể viết bừa mà vẫn báo xanh được.

Cảm ơn Sếp đã dừng đúng chỗ ở PROMPT-19. Em đã tự kiểm lại cả hai chỗ Sếp báo đỏ — **Sếp đúng cả hai**.
Việc áp thì hoàn hảo từng byte, nên phần đó cứ commit và giữ nguyên, đừng sửa lại gì.

---

## BƯỚC 0 — Commit phần PROMPT-19 trước, chưa push

Cây làm việc đang có đúng 18 tệp đã sửa và đã xanh bốn cổng. Commit nguyên trạng, **không sửa thêm dòng
nào**, rồi dừng lại ở đó:

```
PROMPT-19: nghiệm thu v1 luồng online (TASK 128-143)
```

Vì sao tách làm hai commit: phần PROMPT-19 đã được kiểm bằng áp thử từng byte và sáu vòng phản biện, còn
ba việc dưới đây là mã mới viết tại chỗ. Tách ra thì nếu việc mới có vấn đề, Sếp lùi **một** commit là về
lại bản đã nghiệm thu, không mất gì.

---

## VIỆC 1 — Làn OFFLINE đang kéo tường của làn ONLINE ra khỏi toàn màn hình

Đây là việc **quan trọng nhất** của prompt này, và là thứ duy nhất có rủi ro thật ở hội trường.

Hai làn đặt **cùng một tên cửa sổ** `proyaku-wall-${o.id}` trên **cùng bộ id** `center` / `left` / `right`
(`src/lib/hallScreens.ts:34-36` và `src/pages/AudioRouting.tsx:159-161` — cả ba đều bật sẵn). Nhưng:

| | ONLINE `audienceWindows.ts` | OFFLINE `AudioRouting.tsx` |
|---|---|---|
| Chốt "đang toàn màn hình thì đừng đụng" | **có** (TASK 136 vừa thêm) | **không có gì** |
| `moveTo` / `resizeTo` | chỉ khi chưa toàn màn hình | **vô điều kiện** |
| Bộ nhớ cửa sổ | `wallWindows` Map | `wallWinsRef` — **không biết gì về Map kia** |

Hậu quả: tường ONLINE đang chạy toàn màn hình trên màn LED, ai đó gạt sang OFFLINE rồi bấm
**"Mở màn phụ đề"** → trình duyệt tìm thấy đúng cửa sổ đó **theo tên**, điều hướng nó và kéo về màn chính.
Mất toàn màn hình ngay trước mặt phòng. **Đúng kiểu hỏng mà TASK 136 vừa bịt, còn nguyên ở làn kia.**

### Phải đạt

Trong hàm mở màn phụ đề của `src/pages/AudioRouting.tsx`, bịt **cả hai lối** — y như TASK 136 đã làm cho
làn ONLINE:

- **Lối 1 — cửa sổ mà chính làn OFFLINE đang nhớ** (nhánh `prev` hiện có): nếu cửa sổ đó **đang toàn màn
  hình** thì **bỏ qua hoàn toàn** — không `location.replace`, không `moveTo`, không `resizeTo`. Chỉ đếm là
  đã mở.
- **Lối 2 — cửa sổ do làn KIA mở, làn này chưa hề biết** (nhánh `else` hiện có): trước khi mở bằng url,
  **dò trước** bằng một lần `window.open('', <đúng tên đó>, …)`. Nếu thứ dò được đang toàn màn hình thì
  **nhận nó về và để yên**, đừng mở bằng url nữa.

### Ràng buộc

- **Chỉ sửa `src/pages/AudioRouting.tsx`.** **Tuyệt đối không đụng `src/lib/lanes/online/audienceWindows.ts`**
  — tệp đó vừa được nghiệm thu từng byte ở PROMPT-19.
- Hàm `isFullscreen` bên làn ONLINE **không được export**, và đừng export nó ra. Viết một hàm nhỏ tương
  đương ngay trong `AudioRouting.tsx` (hỏi `win.document.fullscreenElement != null`, bọc `try/catch`, lỗi
  thì coi như **không** toàn màn hình).
- **Thêm ít nhất hai ca test** cho hai lối trên, dùng cửa sổ giả như các ca sẵn có trong
  `tests/audienceWindows.test.ts`. Đặt ở tệp test nào cũng được, miễn không xoá ca nào đang có.

---

## VIỆC 2 — Ca test 27 đang ghim một lời hứa, không ghim việc thực hiện lời hứa đó

`tests/speechRhythm.test.ts` ca **27** bắt giao diện phải ghi `'0,4–1,1s'` cho nấc *Bình thường*. Nhưng
**không ca nào** canh đoạn mã thật sinh ra con số đó — đoạn `if (rhythm === 'normal')` trong
`stableCommitWindows()` ở `src/lib/lanes/online/onlineLane.ts`.

Em đã chạy thử: giết đoạn đó đi thì nấc *Bình thường* rơi về **600ms cố định** trong khi màn hình vẫn hứa
"0,4–1,1s" — mà **cả 1166 ca vẫn xanh và `tsc -b` vẫn thoát 0**. Ca test đang bảo vệ một lời nói dối.

### Phải đạt

Thêm khẳng định vào ca 27 (hoặc một ca mới ngay cạnh) sao cho: **nếu nhánh `rhythm === 'normal'` bị vô
hiệu hoá thì `npm test` phải ĐỎ.** Cách làm tuỳ Claude Code chọn — miễn là mutant ở phần nghiệm thu bên
dưới **thật sự đỏ lên**.

⚠️ Đừng chỉ thêm một phép `toContain` tìm chuỗi `"rhythm === 'normal'"` trong tệp mã. Bọc dòng thật vào
`/* */` là chuỗi vẫn còn đó và ca vẫn xanh — đúng cái bẫy này đã sập chín lần trong dự án rồi. Nếu buộc
phải dò chữ thì **bỏ chú thích trước khi dò**.

---

## VIỆC 3 — Mười một chú thích còn nói sai (mức thấp, làm sau cùng)

Vòng nghiệm thu PROMPT-19 có nêu 11 chỗ chú thích còn mâu thuẫn với mã, nhưng em **không có danh sách**.
Nhờ Claude Code của Sếp tự dò lại trong 18 tệp mà PROMPT-19 đã đụng, rồi sửa những chỗ **chắc chắn sai**.

- Chỉ sửa **chú thích và chữ**, không đổi một dòng mã chạy nào.
- Chỗ nào không chắc thì **để nguyên và liệt kê ra** cho em, đừng đoán.
- Nếu việc này làm phình quá thì **bỏ qua nó** — hai việc trên mới là việc phải xong. Đừng để việc 3 chặn
  đường đẩy.

---

## NGHIỆM THU — dynamic workflow, và hai mutant bắt buộc phải đỏ

Chạy bốn cổng trước:

```bash
npx tsc -b        # thoát 0
npx oxlint        # 0 lỗi · đúng 5 cảnh báo only-export-components cũ
npm run build     # ✓ built
npm test          # 79 tệp; số ca sẽ TĂNG so với 1166 vì việc 1 thêm ca — báo số mới về
```

Rồi dán khối này:

> **Dùng dynamic workflow (tool `Workflow`) để nghiệm thu. Giữ trong khoảng 10–14 agent. Mỗi phát hiện**
> **phải có hai agent phản biện trước khi tính là thật; agent nào chết vì hết hạn mức thì ghi là**
> **"chưa kiểm được", KHÔNG được xếp thành "đã kiểm, không sao".**
>
> **① HAI MUTANT BẮT BUỘC — đây là cổng cứng, không đạt là hỏng.** Với mỗi mutant: sao lưu tệp và ghi
> lại mã băm trước khi sửa, chạy `npm test`, rồi **khôi phục và đối chiếu lại mã băm**. Làm trên bản sao
> hoặc worktree cách ly, đừng để cây làm việc lệch đi.
>
> - **Mutant A (việc 2).** Trong `src/lib/lanes/online/onlineLane.ts`, đổi `if (rhythm === 'normal')` thành một điều kiện không bao giờ đúng (ví dụ `if ((rhythm as string) === '__mutant__')`). `npm test`**PHẢI ĐỎ**. Còn xanh nghĩa là việc 2 chưa xong — làm lại, đừng báo đạt.
> - **Mutant B (việc 1).** Trong `src/pages/AudioRouting.tsx`, vô hiệu hoá chốt toàn màn hình vừa thêm
>   (cho nó luôn trả `false`). `npm test` **PHẢI ĐỎ**. Còn xanh nghĩa là ca test mới chỉ là trang trí.
> 
> **② Không làm hỏng thứ đã nghiệm thu.** So cây hiện tại với commit ở BƯỚC 0: ngoài
>`src/pages/AudioRouting.tsx`, tệp test được thêm ca, và các tệp chỉ đổi chú thích ở việc 3 — **không tệp
> nào khác được đổi**. Đặc biệt `src/lib/lanes/online/audienceWindows.ts` phải **0 dòng đổi**.
> 
> **③ Bốn tệp cấm** `src/lib/api.ts` · `src/lib/LiveSessionContext.tsx` · `src/lib/useMeter.ts` ·
>`src/lib/audienceChannel.ts`, cùng `package.json` và `package-lock.json`: **0 dòng đổi**.
> 
> **④ Chốt mới có thật sự bịt được cả hai lối không** — đọc lại mã việc 1, đối chiếu với hai lối em mô tả
>trong prompt. Thiếu một lối là vá hụt một nửa.
> 
> **⑤ Ca test mới có thật không** — thử phá đúng dòng mà mỗi ca tự nhận là nó ghim, ca nào vẫn xanh thì báo lên. Phá xong trả nguyên trạng.
>
> **Kết luận phải nói rõ ĐẠT hoặc CHƯA ĐẠT**, kèm số ca test mới.

---

## ĐẨY ĐI — chỉ khi mọi thứ xanh

> **Nếu và chỉ nếu: bốn cổng xanh · Mutant A đỏ · Mutant B đỏ · workflow kết luận ĐẠT** — commit lần hai với lời commit `PROMPT-20: chot chan toan man hinh cho lan offline + va ca test 27`, rồi **push cả hai commit**. In ra **mã của cả hai commit**.
> 
> **Bất cứ thứ gì đỏ, hoặc một trong hai mutant vẫn xanh: DỪNG.** Đừng commit lần hai, đừng push. Kể ra
>chính xác chỗ sai và chờ.

### ⚠️ "Sửa cho xanh" — lần này KHÁC PROMPT-19, em nói rõ để khỏi làm sai

Ở PROMPT-19 em cấm sửa cho xanh, vì mọi dòng ở đó em đã chạy thử rồi — **đỏ tức là em viết prompt sai**,
và để máy tự chữa thì cây mã lệch khỏi bản em đã kiểm.

**Prompt này ngược lại.** Ở đây em **không** đưa mã chép sẵn; mã là do Claude Code tự viết. Nên sửa đi
sửa lại cho tới khi xanh chính là **việc phải làm**, không phải việc cấm. Cái cần phân biệt không phải
"được sửa hay không", mà là **được sửa CÁI GÌ**:

| Gặp đỏ ở đâu | Được làm gì |
|---|---|
| Mã mới của việc 1 / việc 2 | ✅ **Sửa thoải mái** cho tới khi xanh. Đây là viết mã bình thường. |
| Bốn cổng đỏ vì mã mới | ✅ Sửa **mã mới**. |
| Mutant A hoặc B vẫn **xanh** | ✅ Làm **ca test mạnh lên**. ❌ **Không** được đổi mutant cho dễ, không được bỏ mutant. |
| Một ca test **có sẵn từ PROMPT-19** bỗng đỏ | 🛑 **DỪNG.** Nghĩa là việc mới vừa phá thứ đã nghiệm thu. Đừng sửa ca test đó cho xanh — báo lại cho em. |
| Loay hoay **quá năm lần** một chỗ mà vẫn đỏ | 🛑 **DỪNG**, kể rõ đã thử gì. Đừng nghĩ ra đường vòng. |

Nói ngắn: **được sửa mã của chính mình, không được nới lỏng thước đo.** Hạ một ca test xuống cho vừa mã
sai thì đúng là "sửa cho xanh" theo nghĩa xấu nhất — và đó là cách mà **chín ca test trang trí** trong
dự án này đã ra đời.

Và tuyệt đối không đụng vào **commit ở BƯỚC 0** — phần PROMPT-19 đã nghiệm thu từng byte, cứ để yên.

---

## Sau khi đẩy

1. Gửi em **mã hai commit**.
2. Deploy như mọi lần.
3. Và việc cuối cùng còn treo của v1, chỉ Sếp làm được: **bài thử ba lần bấm trên màn LED thứ hai** — kéo
   cửa sổ tường sang LED, bấm **F** cho toàn màn hình, rồi bấm lại **Xuất lại** ba lần (bấm lại · sau khi
   đổi cỡ chữ · sau F5). Cả năm ca test liên quan đều chạy trên cửa sổ giả, nên nếu ở hội trường nó vẫn
   nhảy thì phải biết **trước** ngày lễ, không phải giữa buổi.

Xong ba việc trên là luồng ONLINE đóng gói v1 thật sự. Cảm ơn Sếp.
