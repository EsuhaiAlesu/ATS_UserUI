# PROMPT-14 — Nhả câu sớm · và ba cái trần đang cắt mù

<context>
Chạy **SAU khi PROMPT-12 và PROMPT-13 đã xong và đã commit**, theo đúng thứ tự đó. Mọi khối `Find and
replace` bên dưới được đối chiếu byte-for-byte với **cây có được sau khi chạy xong PROMPT-13**.

**Kiểm nền trước khi làm gì cả** (nhánh `develop`):

```bash
git merge-base --is-ancestor e22cfd6 HEAD && echo "nền OK"
grep -c "OnlineGuidedMatchSettings" src/pages/Settings.tsx   # phải ra 2
grep -c "planForceCommit" src/lib/lanes/online/scribeManualCommit.ts   # phải ra 0
```

Dòng đầu không in `nền OK` thì dừng lại và báo. Dòng thứ hai ra **2** nghĩa là PROMPT-13 đã chạy (một lần
ở `import`, một lần ở chỗ dùng); ra **0** nghĩa là **PROMPT-13 chưa chạy — dừng lại**, chạy PROMPT-13 xong
rồi hãy quay lại đây. Dòng thứ ba ra **0** là đúng: nó xác nhận PROMPT-14 chưa chạy lần nào; ra 1 trở lên
nghĩa là bạn đang chạy lại lần hai, đừng chạy tiếp.

---

## Chuyện gì đã xảy ra ở buổi chạy thử

Đây là ba đoạn cắt ra từ chính bản ghi buổi chạy thử ngày 05/08, cột tiếng Việt và cột tiếng Nhật đặt cạnh
nhau. Dấu `|` là chỗ máy cắt câu:

| Máy nghe được | Máy dịch ra |
|---|---|
| …thành viên Hội đồng quản trị đặc biệt của **Esuh** \| **ai** lên phát biểu khai mạc. | …清水博子様をご紹介いたします。 \| **に**ご登壇いただき、開会のご挨拶を賜ります。 |
| …một lời tuyên bố: "**Es** \| **uhai**, chúng ta sẵn sàng cho một chương mới." | 「**うはい**、私たちは新しい章への準備ができております。」 |
| Mika, em có thể chia sẻ thêm về bản thân mình không? Lời đầu tiên \| . Xin gửi chào đến các vị khách quý… | …まず最初に \| ご来場いただきましたご来賓の皆様に… |

Chỗ thứ hai là chỗ đau nhất: **tên công ty, vỡ làm đôi, hiện lên tường hội trường thành 「うはい」**, đúng
trong đêm kỷ niệm của chính nó.

Không ai nghỉ giữa chữ "Esuhai". Nên đây không phải chuyện người nói ngắt nghỉ, và cũng không phải chuyện
chỉnh nhịp chờ cho lâu hơn. Tôi đã rà lại cả ba đường ra lệnh cắt trong mã:

| Đường cắt | Điều kiện trước khi cắt | Cắt được giữa từ? |
|---|---|---|
| Cắt vì thấy dấu chấm | phải có dấu câu (hoặc câu đã dài 200 chữ) **và** chữ đứng yên 0,6–0,8 giây | không |
| Cắt vì chữ đứng im | chữ **không đổi một ký tự nào** suốt 2,5 giây | không |
| **Trần 25 giây** | **hết giờ. Không xét gì cả.** | **có** |

Trần 25 giây là một cái hẹn giờ trần trụi: cứ 25 giây một lần, nó ra lệnh cắt, **không nhìn dấu câu, không
nhìn chữ có đang chạy không, không nhìn micro có tiếng hay không**. Bốn tiếng buổi lễ là khoảng sáu trăm
lần cắt như vậy, và mỗi lần đều có thể rơi đúng vào giữa một từ.

**Điều cốt lõi phải hiểu, vì nó quyết định cách chữa: lệnh cắt là cắt TIẾNG, không phải cắt CHỮ.** Chữ về
sau tiếng vài trăm mili-giây. Nên khi ta nhìn thấy chữ thì dao đã xuống rồi — không phép kiểm tra chữ nào,
không mô hình nào, không bản dịch nào chữa lại được. Máy nghe **thật sự** đã nghe thấy "Esuh" rồi nghe
thấy "ai". Hai mảnh đó sau đó được **dịch riêng**, và ra 「うはい」.

## Ba việc PROMPT-14 làm

**Một — trần 25 giây chờ một khe im lặng rồi mới cắt.** Tín hiệu đúng duy nhất là chính cái micro, và máy
đã sẵn có nó (`lastLoudAt`: lần cuối micro vượt ngưỡng "đủ to"). Tới trần thì máy chờ khoảng **0,22 giây
không có tiếng** — tức khe giữa hai từ — rồi mới cắt. Người nói bình thường để lại khe cỡ đó vài lần mỗi
giây, nên gần như không ai thấy chậm đi. Có hạn 10 giây: hội trường ồn liên tục (vỗ tay, nhạc) thì vẫn
cắt, chỉ muộn hơn — mà lúc ồn cỡ đó thì cũng chẳng ai đang nói giữa chừng.

**Hai — bỏ cái trần vô hạn thứ hai, cái đang giữ câu lại gần một giây.** Nhà cung cấp gửi mỗi câu đã chốt
**hai lần**: bản trơn tới trước, bản có dấu thời gian tới sau, và **chỉ bản sau mới mang nhãn tiếng**. Máy
giữ bản trơn lại để không mất nhãn — đúng, vì mất nhãn là câu tiếng Việt bị đọc bằng giọng Nhật. Nhưng cái
giữ đó **không có hạn**: bản trơn chỉ được nhả khi bản có nhãn về, hoặc khi người ta đã nói xong câu **kế
tiếp**. Nghĩa là toàn bộ độ trễ của thứ mà nhà cung cấp tự khai là "tin nhắn final tới muộn" bị biến thành
điều kiện **bắt buộc** trước khi câu N được lên tường, được dịch, được đọc. Máy nghe không hề dừng — nhưng
mọi thứ phía sau thì có. Đó chính là cái khựng giữa hai câu. Nay có trần **600 mili-giây**, và số lần chạm
trần được đếm để nhìn thấy được.

**Ba — "Nhả câu sớm": cắt câu thẳng từ dòng chữ mờ, không chờ máy nghe chốt lượt nữa.** Đây là việc lớn
nhất, và là chỗ tháo nút thật.

Tới nay **mọi thứ** đứng sau một câu — phụ đề đậm, bản dịch tinh, giọng đọc, dòng lưu lại — đều chờ máy
nghe **chốt lượt**. Mà chốt lượt là việc của máy nghe. Micro hội trường có bộ tự chỉnh âm lượng, nó nâng
mọi quãng nghỉ thành tiếng ồn, nên máy nghe chốt rất thưa: đo ngày 04/08, có phiên nhà cung cấp **không
chốt lần nào**. Nhưng **dòng chữ mờ thì không bao giờ đứt** — nó chảy liên tục suốt lượt. Nên câu cắt được
từ đó, và khi ấy chốt lượt thưa tới đâu cũng không còn quan trọng.

Nấc này **mặc định TẮT**. Nó đổi đường đi của mọi câu, nên phải được bật một cách cố ý, sau khi đã chạy
thử. Bốn nấc trong Cài đặt: Tắt / Thận trọng 0,90s / Thường 0,65s / Nhanh 0,45s.

Ba lớp chống nhả bậy, cả ba phải cùng đúng mới nhả: có mối ngắt câu mạnh thật; đoạn đó **đứng yên không
đổi một ký tự** suốt cửa sổ đã chọn (máy nghe còn đang sửa chữ thì đồng hồ chạy lại từ đầu); và đoạn đó
phải là **một đơn vị trọn vẹn** — hết bằng `。！？!?` là xong, còn hết bằng dấu chấm ASCII thì phải có
khoảng trắng theo sau, chính là thứ chặn máy cắt giữa `www.esuhai.com`.

Và câu nhả sớm **đi qua đúng cái đường mà câu chốt lượt đi qua**: cùng một hàm `acceptFinalText`, cùng
từng chốt chặn ma, cùng bộ khớp kịch bản, cùng bộ đệm đoạn, cùng refine, cùng giọng đọc, cùng dòng lưu.
Bật nấc này lên **không** được phép âm thầm tắt các lớp bảo vệ đã dựng suốt sáu tháng — đó là điều kiện
thiết kế, không phải lời hứa suông, và có test ghim nó.

## Còn "cho một mô hình AI quyết định khi nào chốt" thì sao

Đây là câu hỏi đã đặt ra, và câu trả lời thẳng là **không**, ít nhất không phải tuần này:

- **Máy nghe hiện tại không nhận prompt.** Bắt tay mở phiên chỉ nhận: mã mô hình, kiểu chốt, các ngưỡng im
  lặng, bật/tắt dấu thời gian, bật/tắt nhận diện tiếng, và danh sách **từ khoá** (đang dùng cho tên riêng).
  **Không có trường chỉ thị nào.** Nó không phải mô hình sai bảo được — không có cách nào bảo nó "chỉ chốt
  khi hết câu".
- **Mô hình không cứu được vết cắt tiếng.** Chữ đã hỏng từ tầng dưới rồi, xem lại đoạn in đậm ở trên.
- **Và nó tốn đúng thứ đang phải giành giật.** Mỗi lần hỏi mất 0,3–0,8 giây. Bộ luật trong PROMPT-14 quyết
  định trong 0 giây và đọc được bằng mắt trong một tệp.

Chỗ đáng đặt mô hình — **sau** buổi lễ — là chỗ ghép mảnh vỡ lại, không phải chỗ quyết định chốt.
</context>

<what_you_must_not_do>
- **Không sửa `src/lib/api.ts`, `src/lib/LiveSessionContext.tsx`, `src/lib/useMeter.ts`,
  `src/lib/lanes/types.ts`.** Không một dòng nào của PROMPT-14 cần tới bốn tệp đó.
- **Không đổi mặc định của "Nhả câu sớm" thành bật.** Mặc định là `off`, và có test ghim đúng chuyện đó.
  Nếu bạn thấy nó "có vẻ nên bật sẵn cho tiện" thì đừng: nó đổi đường đi của mọi câu trong buổi lễ, và
  người vận hành phải là người bấm nút đó, sau khi đã nhìn thấy nó chạy.
- **Không gộp `acceptFinalText` ngược trở lại vào `handleFinal`.** Hai đường vào phải dùng chung một bộ
  chốt chặn. Gộp lại là một trong hai đường có bản sao riêng, rồi hai bản sao lệch nhau — đó đúng là kiểu
  hỏng mà cách chia này sinh ra để tránh.
- **Không đổi `stripPromotedPrefix` sang cắt theo số ký tự.** Nó cố ý chỉ cắt khi khớp tiền tố **chính
  xác**. Máy nghe sửa lại đoạn đầu thì không khớp, và ta **giữ nguyên bản đã sửa** — tức lặp một câu trên
  tường. Lặp thì thấy được và sửa được; cắt mù theo số ký tự là **nuốt mất chữ**, và nuốt thì không ai
  thấy. Đổi lấy cái thấy được là cố ý.
- **Không sửa tệp test nào ngoài `tests/mishearingWiring.test.ts`.** Đó là tệp test cũ duy nhất mà
  PROMPT-14 được phép đụng, lý do ghi ở TASK 68.
- **Không đổi ba con số 220 / 120 / 10 000 trong `planForceCommit`** và **không đổi 600 trong
  `ASR_TAG_WAIT_MS`** sang giá trị khác. Cả bốn đều có test ghim; đổi là test đỏ, và đỏ ở đây là đúng.
</what_you_must_not_do>

<what_to_do>


## TASK 62 — Trần cho việc giữ câu chờ nhãn tiếng (`src/lib/lanes/online/asrTransport.ts`)

Việc này chữa cái khựng gần một giây giữa hai câu, và nó nằm **trong mã của mình**, không phải ở nhà cung
cấp.

Nhà cung cấp gửi mỗi câu đã chốt hai lần. Bản trơn tới trước. Bản có dấu thời gian tới sau, và **chỉ bản
sau mang nhãn tiếng** — cái nhãn quyết định câu này được dịch sang tiếng nào và đọc bằng giọng nào. Máy
giữ bản trơn lại chờ bản có nhãn, và việc giữ đó là **đúng**: nhả sớm là mất nhãn, mất nhãn là câu tiếng
Việt bị đọc bằng giọng Nhật, đúng lỗi 「我是海空啊」 đã gặp.

Cái sai là **giữ không có hạn**. Hôm nay bản trơn chỉ được nhả ra khi một trong hai điều xảy ra: bản có
nhãn về, hoặc một bản trơn **khác** về — tức là người ta đã nói xong câu **kế tiếp**. Ca tệ nhất vì thế
lại là ca hay gặp nhất: câu cuối cùng trước một quãng lặng. Không có câu kế tiếp, nên chẳng có gì đánh
thức nó cả.

Sau TASK 62: giữ tối đa **600 mili-giây**. Bản có nhãn về kịp thì mọi thứ y như cũ và nhãn còn nguyên. Về
muộn hơn thì câu được nhả ra trước, nhãn coi như mất, và số lần đó **được đếm** — `tagTimeouts` — để lần
sau không phải đoán nữa.

Điểm tinh tế phải làm cho đúng, và là lý do việc này không chỉ là thêm một cái hẹn giờ: câu quá hạn được
nhả ra **ở nhịp gói tiếng gửi đi** (~256 mili-giây một lần), chứ không chỉ khi có tin nhắn về. Vì đúng cái
ca ta đang chữa — người nói dứt câu rồi im — thì **không có tin nào về nữa cả**. Chỉ trông vào đường tin
nhắn về là cái trần này không bao giờ bắn đúng lúc cần nó nhất.

**(a)** Khai thêm ô số đo trên `AsrCodec`. Find and replace:

```ts
   * the rescued sentence was spoken first. Optional so an older stub codec still satisfies the type.
   */
  drain?(): DecodedEvent[];
}

// Reconnecting cannot fix any of these, so the lane must stop and tell the operator rather
```

with

```ts
   * the rescued sentence was spoken first. Optional so an older stub codec still satisfies the type.
   */
  drain?(): DecodedEvent[];
  /**
   * Số đo của chính cái chốt "chờ bản có nhãn" — để trả lời bằng SỐ, không bằng cảm giác, câu hỏi "cái
   * khựng gần một giây giữa hai câu nằm ở đâu". Xem `ASR_TAG_WAIT_MS`.
   */
  stats?(): AsrCodecStats;
}

export interface AsrCodecStats {
  /** ms chờ của lần gần nhất bản có nhãn về sau bản trơn. -1 = chưa lần nào. */
  tagWaitLastMs: number;
  /** ms chờ lâu nhất của cả phiên. */
  tagWaitMaxMs: number;
  /** số câu phải nhả ra vì chờ quá `ASR_TAG_WAIT_MS` — mỗi lần là một lần MẤT nhãn tiếng. */
  tagTimeouts: number;
  plainFinals: number;
  taggedFinals: number;
}

// Reconnecting cannot fix any of these, so the lane must stop and tell the operator rather
```

**(b)** Con số 600, và vì sao là 600. Find and replace:

```ts
// from then on holding would put every sentence of the ceremony one behind.
const BROKEN_PROMISE_LIMIT = 3;

// A committed sentence arrives twice (plain + timestamped); swallow the twin only if it repeats within
// this window. Widened from 2000 ms on 02/08/2026: at the 01/08 rehearsal the timestamped twin of a long
// sentence routinely arrived more than two seconds after the plain one, and every one of those late twins
```

with

```ts
// from then on holding would put every sentence of the ceremony one behind.
const BROKEN_PROMISE_LIMIT = 3;

/**
 * TRẦN cho việc giữ một bản final trơn để chờ bản có nhãn của nó.
 *
 * Vì sao cần trần. Nhà cung cấp gửi mỗi câu chốt HAI lần: bản trơn tới trước, bản có dấu thời gian tới
 * sau và CHỈ bản sau mang nhãn tiếng. Codec giữ bản trơn lại để không vứt mất nhãn — đó là cách chữa
 * đúng cho chuyện "我是海空啊" bị đọc thành tiếng Nhật. Nhưng tới 04/08/2026 việc giữ đó **không có hạn**:
 * bản trơn chỉ được nhả khi bản có nhãn về, hoặc khi một bản trơn KHÁC về (tức câu sau đã nói xong).
 * Nghĩa là toàn bộ độ trễ của một thứ nhà cung cấp tự khai là "delayed final message" bị biến thành
 * điều kiện BẮT BUỘC trước khi phụ đề, bản dịch và giọng đọc của câu N được chạy. Máy nghe không hề
 * dừng — nhưng mọi thứ phía sau thì có, và đó chính là cái khựng người điều khiển nhìn thấy.
 *
 * 600 ms là mức chặn trên, không phải mức thường gặp: bản có nhãn về trong 600 ms thì mọi thứ y như cũ
 * và nhãn vẫn nguyên. Về muộn hơn thì câu được nhả ra trước, nhãn coi như mất, và `tagTimeouts` đếm
 * đúng số lần đó — đo được, không phải đoán. Đổi số này là đổi thẳng cán cân "nhanh" ↔ "chắc nhãn".
 */
export const ASR_TAG_WAIT_MS = 600;

// A committed sentence arrives twice (plain + timestamped); swallow the twin only if it repeats within
// this window. Widened from 2000 ms on 02/08/2026: at the 01/08 rehearsal the timestamped twin of a long
// sentence routinely arrived more than two seconds after the plain one, and every one of those late twins
```

**(c)** `createAsrCodec` nhận thêm hai tham số **tuỳ chọn** — trần chờ và đồng hồ. Cả hai chỉ để **test
tiêm vào**; chỗ gọi thật không truyền gì và nhận đúng giá trị mặc định. Find and replace:

```ts
 *   when reconnecting so the recogniser picks the thread back up. Fresh sessions pass
 *   `undefined` and it is never sent.
 */
export function createAsrCodec(previousText?: string): AsrCodec {
  let firstChunk = true;
  // Final-dedup memory: the normalised key of the last emitted `completed` transcript, when it was
  // emitted, and which of the two kinds of final it was.
```

with

```ts
 *   when reconnecting so the recogniser picks the thread back up. Fresh sessions pass
 *   `undefined` and it is never sent.
 */
export function createAsrCodec(
  previousText?: string,
  opts?: { tagWaitMs?: number; now?: () => number },
): AsrCodec {
  const tagWaitMs = opts?.tagWaitMs ?? ASR_TAG_WAIT_MS;
  const clock = opts?.now ?? Date.now;
  let firstChunk = true;
  // Final-dedup memory: the normalised key of the last emitted `completed` transcript, when it was
  // emitted, and which of the two kinds of final it was.
```

**(d)** Trạng thái giữ + hàm nhả quá hạn. Find and replace:

```ts
  // TASK 9: sentences owed to the caller — a held final rescued when its twin never came. Never dropped:
  // this is a sentence somebody actually said.
  const pending: DecodedEvent[] = [];

  return {
    encodeAudio(pcm: ArrayBuffer): string {
      const frame: Record<string, unknown> = {
        message_type: 'input_audio_chunk',
        audio_base_64: bytesToBase64(pcm),
```

with

```ts
  // TASK 9: sentences owed to the caller — a held final rescued when its twin never came. Never dropped:
  // this is a sentence somebody actually said.
  const pending: DecodedEvent[] = [];
  // Lúc bắt đầu giữ bản trơn hiện hành — mốc để cân với `tagWaitMs`.
  let heldSince = 0;
  const stats: AsrCodecStats = { tagWaitLastMs: -1, tagWaitMaxMs: 0, tagTimeouts: 0, plainFinals: 0, taggedFinals: 0 };

  /**
   * Hết hạn chờ thì nhả câu ra, đừng giữ nữa.
   *
   * Gọi ở CẢ HAI đường: mỗi tin nhắn về (`decode`) và mỗi gói tiếng gửi đi (`encodeAudio`, ~256 ms một
   * lần). Đường thứ hai mới là đường quan trọng: người nói dứt câu rồi im thì KHÔNG có tin nào về nữa
   * cả, và nếu chỉ trông vào `decode` thì đúng cái ca tệ nhất — câu cuối trước một quãng lặng — lại là
   * ca bị giữ lâu nhất.
   *
   * Câu nhả ra được ghi vào bộ nhớ chống trùng y như đường phát bình thường, nên bản có nhãn về muộn sau
   * đó bị nuốt đúng như một bản sinh đôi, không thành câu thứ hai trên tường.
   */
  const ageOutHeld = (): void => {
    if (heldPlainFinal === null) return;
    if (clock() - heldSince < tagWaitMs) return;
    pending.push({ type: 'conversation.item.input_audio_transcription.completed', transcript: heldPlainFinal });
    lastFinalKey = normaliseFinal(heldPlainFinal);
    lastFinalAt = clock();
    lastFinalTimestamped = false;
    heldPlainFinal = null;
    stats.tagTimeouts += 1;
  };

  return {
    encodeAudio(pcm: ArrayBuffer): string {
      ageOutHeld(); // nhịp ~256 ms — đường duy nhất còn chạy khi người nói đã im
      const frame: Record<string, unknown> = {
        message_type: 'input_audio_chunk',
        audio_base_64: bytesToBase64(pcm),
```

**(e)** Gọi ở nhịp gói tiếng, và mở ô đọc số đo. Find and replace:

```ts
      return pending.length ? pending.splice(0, pending.length) : [];
    },

    decode(raw: string): { event: DecodedEvent; fatal: boolean } | null {
      let msg: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(raw);
```

with

```ts
      return pending.length ? pending.splice(0, pending.length) : [];
    },

    stats(): AsrCodecStats {
      return { ...stats };
    },

    decode(raw: string): { event: DecodedEvent; fatal: boolean } | null {
      ageOutHeld(); // trước khi đọc tin mới: câu đang giữ có thể đã quá hạn từ trước
      let msg: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(raw);
```

**(f)** Đếm hai loại final, và đo bản có nhãn về **muộn bao nhiêu**. Con số này là câu trả lời thẳng cho
"cái khựng nằm ở đâu". Find and replace:

```ts
          // one is expected. Adaptive, not assumed: a session that never delivers a timestamped final
          // keeps working exactly as before, so a vendor change can never silence the transcript.
          const timestamped = type.endsWith('_with_timestamps');
          if (timestamped) {
            if (transcript.trim()) sawTimestampedFinal = true;
            brokenPromises = 0; // the promise is being kept again
            heldPlainFinal = null;
          } else if (sawTimestampedFinal || expectTaggedFinal) {
            // Self-healing: a SECOND plain final while the first is still waiting means the promised twin
```

with

```ts
          // one is expected. Adaptive, not assumed: a session that never delivers a timestamped final
          // keeps working exactly as before, so a vendor change can never silence the transcript.
          const timestamped = type.endsWith('_with_timestamps');
          if (timestamped) stats.taggedFinals += 1; else stats.plainFinals += 1;
          if (timestamped) {
            if (transcript.trim()) sawTimestampedFinal = true;
            brokenPromises = 0; // the promise is being kept again
            if (heldPlainFinal !== null) {
              // Đây là con số trả lời thẳng câu hỏi "cái khựng nằm ở đâu": bản có nhãn về SAU bản trơn
              // bao nhiêu mili-giây. Chỉ đo khi thật sự đang giữ một bản trơn, để không lẫn với những
              // phiên nhà cung cấp không gửi bản sinh đôi.
              const waited = clock() - heldSince;
              stats.tagWaitLastMs = waited;
              if (waited > stats.tagWaitMaxMs) stats.tagWaitMaxMs = waited;
            }
            heldPlainFinal = null;
          } else if (sawTimestampedFinal || expectTaggedFinal) {
            // Self-healing: a SECOND plain final while the first is still waiting means the promised twin
```

**(g)** Ghi mốc bắt đầu giữ, và — quan trọng — **một đồng hồ cho cả codec**. Chỗ này từng làm test đỏ khi
tôi dựng: cửa sổ chống trùng lặp đọc `Date.now()` thật trong khi hàm nhả quá hạn ghi mốc bằng đồng hồ
tiêm vào, nên hai bên đo bằng hai cái thước, và bản sinh đôi về muộn **lọt qua thành câu thứ hai trên
tường**. Find and replace:

```ts
                sawTimestampedFinal = false;
              } else {
                heldPlainFinal = transcript; // keep waiting for THIS one's twin; the tag is still worth it
                return null;
              }
            } else {
              heldPlainFinal = transcript;
              return null;
            }
          }
          const now = Date.now();
          const finalKey = normaliseFinal(transcript);
          // Swallow the twin — and only the twin. Three conditions, each earning its place:
          //   * same WORDS, not the same string: the two passes disagree about punctuation and width;
```

with

```ts
                sawTimestampedFinal = false;
              } else {
                heldPlainFinal = transcript; // keep waiting for THIS one's twin; the tag is still worth it
                heldSince = clock();
                return null;
              }
            } else {
              heldPlainFinal = transcript;
              heldSince = clock();
              return null;
            }
          }
          // MỘT đồng hồ cho cả codec. Cửa sổ chống trùng và hạn chờ nhãn phải cùng thước đo, nếu không
          // thì một câu nhả sớm ghi mốc bằng thước này rồi bị đo bằng thước kia, và bản sinh đôi về muộn
          // lọt qua thành câu thứ hai trên tường.
          const now = clock();
          const finalKey = normaliseFinal(transcript);
          // Swallow the twin — and only the twin. Three conditions, each earning its place:
          //   * same WORDS, not the same string: the two passes disagree about punctuation and width;
```

**(h)** Và đường tiêu thụ trong lane: câu được cứu phải được lấy ra ngay ở nhịp gói tiếng. Trong
`src/lib/lanes/online/onlineLane.ts`, find and replace:

```ts
              forceReconnect('send backlog too high (uplink cannot keep up)', quiet);
            } else {
              ws.send(codec ? codec.encodeAudio(pcm) : pcm);
            }
          }
        },
```

with

```ts
              forceReconnect('send backlog too high (uplink cannot keep up)', quiet);
            } else {
              ws.send(codec ? codec.encodeAudio(pcm) : pcm);
              // Câu bị giữ quá hạn chờ nhãn được nhả ra ngay ở nhịp gói tiếng (~256 ms). Đây là đường
              // DUY NHẤT còn chạy khi người nói đã dứt lời và im — cũng chính là lúc việc giữ câu gây
              // khó chịu nhất, vì không còn tin nào về để đánh thức `decode`.
              if (codec) for (const rescued of codec.drain?.() ?? []) {
                lastEventAt = Date.now();
                handleEvent(rescued as unknown as Record<string, unknown>);
              }
            }
          }
        },
```

**(i)** Tạo tệp test mới `tests/asrTagWait.test.ts` với đúng nội dung này:

```ts
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
```


## TASK 63 — Trần 25 giây chờ một khe im lặng rồi mới cắt

Đây là việc chữa thẳng vết "Esuh | ai" ở đầu tệp này.

`SCRIBE_MANUAL_FORCE_COMMIT_MS` (25 giây) là hạn tối đa một lượt được giữ micro, và nó phải còn — không có
nó thì một người nói không nghỉ sẽ giữ micro vô tận. Cái sai không nằm ở con số 25 giây, mà ở chỗ **nó bắn
đúng cái khoảnh khắc hết giờ, bất kể lúc đó đang là gì**.

Hai đường cắt còn lại trong tệp đó đều không làm hỏng được như vậy: một đường đòi có dấu câu **và** chữ
đứng yên, đường kia đòi chữ không nhúc nhích suốt 2,5 giây. Cả hai điều kiện đều không thể đúng khi miệng
đang phát âm dở một từ. Chỉ trần 25 giây là không xét gì.

Cách chữa phải nhìn vào **micro**, không nhìn vào chữ — lý do đã nói ở đầu tệp: chữ về sau tiếng. Lane đã
sẵn có đúng con số cần: `lastLoudAt`, mốc thời gian của khung tiếng cuối cùng vượt ngưỡng "đủ to". Tới
trần thì máy hỏi nó: im được 0,22 giây chưa? Chưa thì ngó lại sau 0,12 giây. Rồi hỏi lại. Người nói bình
thường để lại khe cỡ đó vài lần mỗi giây.

Và cái chờ này **phải luôn kết thúc** — đó là điều kiện thiết kế, không phải chi tiết. Hạn ân hạn 10 giây:
hội trường vỗ tay ba mươi giây liền thì vẫn cắt, chỉ muộn. Mà lúc ồn cỡ đó thì cũng chẳng ai đang nói giữa
chừng, nên cắt cũng không hỏng gì.

**(a)** Hàm quyết định, thuần, không hẹn giờ không mạng — để test được thẳng. Đặt ở **cuối**
`src/lib/lanes/online/scribeManualCommit.ts`. Find and replace:

```ts
  const base = lastCommitAt || now;
  return Math.max(0, SCRIBE_MANUAL_FORCE_COMMIT_MS - (now - base));
}

```

with

```ts
  const base = lastCommitAt || now;
  return Math.max(0, SCRIBE_MANUAL_FORCE_COMMIT_MS - (now - base));
}

// ---- the ceiling must not cut a word in half ----
//
// 08/05 evidence, from the rehearsal transcript: `"...Hội đồng quản trị đặc biệt của Esuh" | "ai lên phát
// biểu khai mạc."` and `'một lời tuyên bố: "Es" | "uhai, chúng ta sẵn sàng..."'`. Both halves were then
// translated SEPARATELY, and the hall wall showed 「うはい、私たちは…」 — the company's own name, broken, in
// the middle of its own anniversary.
//
// Nothing else in this file can do that. `planStableScribeCommit` needs punctuation (or 200 chars) AND
// stillness; `planStillnessCommit` needs 2.5s of a partial that has not moved. The ceiling was the one
// trigger that looked at NOTHING — a bare 25s timer firing wherever the speaker happened to be.
//
// A commit cuts the AUDIO at the instant it is sent, and the recogniser's text runs several hundred
// milliseconds behind that instant. So no text-level test can tell us whether the cut is safe: by the
// time the words arrive, the damage is done. The only honest signal is the microphone itself — a real
// gap between two words, where there is no phoneme energy to cut through.
//
// Hence: at the ceiling, WAIT for the next quiet moment instead of cutting. Ordinary speech leaves a gap
// this size several times a second, so the wait is normally imperceptible. `graceMs` is the promise that
// this can never hang: a hall that is never quiet (applause, music, a second microphone) still gets its
// commit, just late — and in a hall that loud, nobody is mid-word anyway.
export const SCRIBE_FORCE_COMMIT_GAP_MS = 220; // quiet this long ⇒ we are between two words, not inside one
export const SCRIBE_FORCE_COMMIT_RETRY_MS = 120; // not quiet yet ⇒ look again this soon
export const SCRIBE_FORCE_COMMIT_GRACE_MS = 10_000; // never quiet ⇒ commit anyway rather than hold forever

/**
 * The ceiling, made boundary-aware. Answers one of two things: commit now, or look again in `delayMs`.
 *
 * @param lastLoudAt when the microphone was last above the "sound present" threshold. 0 = never — an
 *                   idle room, where there is no word to cut and the commit is free.
 */
export function planForceCommit(args: {
  lastCommitAt: number;
  now: number;
  lastLoudAt: number;
  gapMs?: number;
  retryMs?: number;
  graceMs?: number;
}): { commit: boolean; delayMs: number; waitedMs: number } {
  const { lastCommitAt, now, lastLoudAt } = args;
  const gapMs = args.gapMs ?? SCRIBE_FORCE_COMMIT_GAP_MS;
  const retryMs = args.retryMs ?? SCRIBE_FORCE_COMMIT_RETRY_MS;
  const graceMs = args.graceMs ?? SCRIBE_FORCE_COMMIT_GRACE_MS;

  const due = nextScribeForceCommitDelay(lastCommitAt, now);
  if (due > 0) return { commit: false, delayMs: due, waitedMs: 0 };

  // How long we have already been holding PAST the ceiling — the number `graceMs` bounds, and the one
  // the diagnostics line reports so the operator can see the ceiling straining.
  const base = lastCommitAt || now;
  const waitedMs = Math.max(0, now - base - SCRIBE_MANUAL_FORCE_COMMIT_MS);

  if (!lastLoudAt) return { commit: true, delayMs: 0, waitedMs }; // silent room: nothing to cut through
  if (now - lastLoudAt >= gapMs) return { commit: true, delayMs: 0, waitedMs };
  if (waitedMs >= graceMs) return { commit: true, delayMs: 0, waitedMs };
  return { commit: false, delayMs: Math.min(retryMs, graceMs - waitedMs), waitedMs };
}

```

**(b)** Lane nhập hàm mới. Trong `src/lib/lanes/online/onlineLane.ts`, find and replace:

```ts
import { createScriptMatcher, scriptKeyterms, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
import { judgeGuided, GUIDED_FLOOR, GUIDED_OFF, type GuidedState } from './guidedScript';
import { applyMishearings, formatMishearingRules, splitMishearingLines, MISHEARING_MAX_CHARS, type MishearingRule } from './mishearing';
import { nextScribeForceCommitDelay, planStableScribeCommit, planStillnessCommit, type ScribeManualCommitReason } from './scribeManualCommit';
import { estimateSourceSpeechPace } from './sourceSpeechPace';
import { enqueueTtsSentence, getTtsQueueLength, resetTtsPlayback, setTtsPlaybackStartHandler, stopTtsPlayback, subscribeTtsSpeaking } from './ttsPlayback';
import { buildSessionExport, saveSessionExport, type SaveOutcome, type SessionLine } from './sessionExport';
```

with

```ts
import { createScriptMatcher, scriptKeyterms, type ScriptMatch, type ScriptMatcher, type ScriptMatcherEntry } from './scriptMatcher';
import { judgeGuided, GUIDED_FLOOR, GUIDED_OFF, type GuidedState } from './guidedScript';
import { applyMishearings, formatMishearingRules, splitMishearingLines, MISHEARING_MAX_CHARS, type MishearingRule } from './mishearing';
import { planForceCommit, planStableScribeCommit, planStillnessCommit, type ScribeManualCommitReason } from './scribeManualCommit';
import { estimateSourceSpeechPace } from './sourceSpeechPace';
import { enqueueTtsSentence, getTtsQueueLength, resetTtsPlayback, setTtsPlaybackStartHandler, stopTtsPlayback, subscribeTtsSpeaking } from './ttsPlayback';
import { buildSessionExport, saveSessionExport, type SaveOutcome, type SessionLine } from './sessionExport';
```

**(c)** Chú thích ở `armForceCommit` phải nói đúng nó làm gì bây giờ. Find and replace:

```ts
  // The hard ceiling. Nothing — not applause, not a speaker who never pauses — may hold the microphone
  // for more than SCRIBE_MANUAL_FORCE_COMMIT_MS. With nothing to commit, restart the window rather than
  // poll a quiet room every tick.
  function armForceCommit(): void {
    if (scribeForceCommitTimer) {
      clearTimeout(scribeForceCommitTimer);
```

with

```ts
  // The hard ceiling. Nothing — not applause, not a speaker who never pauses — may hold the microphone
  // for more than SCRIBE_MANUAL_FORCE_COMMIT_MS. With nothing to commit, restart the window rather than
  // poll a quiet room every tick.
  //
  // 05/08: it no longer cuts the moment the timer expires. `planForceCommit` holds it until the
  // microphone goes quiet for a couple of hundred milliseconds — the gap between two words — because a
  // commit cuts the AUDIO and this was the one trigger with no boundary test at all. Two names were
  // bisected in the 08/05 rehearsal ("của Esuh" | "ai lên phát biểu"), and each half was then translated
  // on its own. `graceMs` inside the planner guarantees the hold always ends.
  function armForceCommit(): void {
    if (scribeForceCommitTimer) {
      clearTimeout(scribeForceCommitTimer);
```

**(d)** Và chính `armForceCommit`. Chú ý chỗ này: `sendManualCommit` **tự gọi lại** `armForceCommit` khi
gửi được, nên chỉ nhánh "không có gì để cắt" mới phải tự lên dây lại đồng hồ. Nếu bạn thấy có vẻ thiếu một
lời gọi thì không phải — đọc lại `sendManualCommit` ở ngay phía trên. Find and replace:

```ts
    }
    const now = Date.now();
    if (!scribeLastCommitAt) scribeLastCommitAt = now;
    scribeForceCommitTimer = setTimeout(() => {
      scribeForceCommitTimer = null;
      if (!sendManualCommit('max-duration')) {
        scribeLastCommitAt = Date.now();
        armForceCommit();
      }
    }, nextScribeForceCommitDelay(scribeLastCommitAt, now));
  }

  // TASK 24: which two waits the planner should use for THIS partial, given the step the operator picked
```

with

```ts
    }
    const now = Date.now();
    if (!scribeLastCommitAt) scribeLastCommitAt = now;
    const plan = planForceCommit({ lastCommitAt: scribeLastCommitAt, now, lastLoudAt });
    if (plan.commit) {
      if (plan.waitedMs > 0) {
        forceGapWaits += 1;
        if (plan.waitedMs > forceGapWaitMaxMs) forceGapWaitMaxMs = plan.waitedMs;
      }
      // `sendManualCommit` re-arms on success; only the "nothing to commit" path has to restart the clock.
      if (!sendManualCommit('max-duration')) {
        scribeLastCommitAt = Date.now();
        armForceCommit();
      }
      return;
    }
    scribeForceCommitTimer = setTimeout(() => {
      scribeForceCommitTimer = null;
      armForceCommit(); // look again — never cut blind
    }, plan.delayMs);
  }

  // TASK 24: which two waits the planner should use for THIS partial, given the step the operator picked
```

**(e)** Tạo tệp test mới `tests/forceCommitGap.test.ts` với đúng nội dung này:

```ts
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
```


## TASK 64 — `src/lib/lanes/online/livePromote.ts` (tệp mới) — luật nhả câu sớm

Toàn bộ luật nằm ở một chỗ, thuần, không React không mạng không DOM, để đọc được và test được thẳng.

Tệp giữ hai thứ: **bốn nấc** mà người vận hành chọn trong Cài đặt, và **hàm quyết định** `decidePromotion`.
Hàm này nhận các thứ nó cần từ bên ngoài (hàm tìm mối ngắt câu, hàm kiểm biên, đồng hồ) thay vì tự đi lấy
— nên toàn bộ ba lớp chống nhả bậy đọc được trong mười dòng, và test đo đúng cái đang chạy chứ không phải
một bản mô phỏng.

Bốn nấc thay vì một con số, cùng lý do với "Nhịp nói của buổi" và "Độ khớp": người chỉnh cái này mười phút
trước buổi lễ, trong hội trường tối, không ngồi cân mili-giây.

Một điểm trong luật đáng nói riêng, vì nó suýt làm cả cơ chế **chết hẳn với tiếng Nhật**. Phép kiểm biên
có sẵn (`isStableDraftPrefix`) hỏi: ký tự **ngay sau** đoạn định nhả có phải khoảng trắng hoặc dấu câu
không. Đúng cho tiếng Việt. Nhưng **tiếng Nhật viết không có dấu cách**, sau `。` luôn là một chữ kana bình
thường — nên nếu chỉ hỏi câu đó thì tiếng Nhật **không bao giờ nhả được câu nào**, và nửa buổi lễ là tiếng
Nhật. Nên luật là: hết bằng `。！？!?` thì đã trọn vẹn rồi, khỏi hỏi thêm; còn hết bằng dấu chấm ASCII thì
vẫn phải có khoảng trắng theo sau — chính là thứ chặn máy cắt giữa `www.esuhai.com`.

Tạo `src/lib/lanes/online/livePromote.ts` với đúng nội dung này:

```ts
// src/lib/lanes/online/livePromote.ts — "nhả câu sớm": cắt câu từ DÒNG NGHE ĐƯỢC, không chờ máy nghe
// chốt lượt.
//
// Vì sao có tệp này. Tới 05/08/2026 mọi thứ đứng sau một câu — phụ đề đậm, bản dịch tinh, giọng đọc, dòng
// lưu lại — đều chờ máy nghe **chốt lượt**. Mà chốt lượt là việc của máy nghe, và trên micro hội trường
// có AGC thì nó chốt rất thưa: đo ngày 04/08, để hẳn cho VAD của nhà cung cấp thì có phiên **không chốt
// lần nào**, mọi quãng nghỉ đều bị AGC nâng thành tiếng ồn. Cái lưới "đứng yên 2,5 giây" của máy khách là
// thứ duy nhất còn đóng được câu, và nó vẫn thưa.
//
// Nhưng dòng partial thì KHÔNG bao giờ đứt. Nó chảy liên tục suốt lượt. Nên câu có thể được cắt từ đó,
// và khi ấy chốt lượt thưa tới đâu cũng không còn quan trọng nữa — đó chính là chỗ tháo nút.
//
// Điều kiện để nhả một tiền tố, cả ba phải cùng đúng:
//   1. có một mối ngắt câu MẠNH trong đoạn đang nghe (`findLastStrongSentenceBreak`);
//   2. đoạn tới mối đó **đứng yên không đổi một ký tự nào** trong `stableMs` — tức máy nghe đã thôi sửa
//      lại nó. Đây là lớp chống thứ rủi ro thật duy nhất của cách này: partial BỊ SỬA LẠI;
//   3. tiền tố phải là một đơn vị TRỌN VẸN — không bao giờ cắt giữa một từ đang được viết dở, và không
//      bao giờ cắt ở dấu chấm của `www.esuhai.com` hay `Tp.HCM`.
//
// Bốn nấc, không phải một con số, cùng lý do với `speechRhythm` và `guidedMatch`: người chỉnh cái này
// mười phút trước buổi lễ không ngồi cân mili-giây. Mặc định là TẮT: đây là đường đi mới của mọi câu,
// nên nó phải được bật một cách cố ý, sau khi đã chạy thử.
//
// Pure module: no React, no fetch, no DOM.

export type LivePromote = 'off' | 'careful' | 'normal' | 'fast';

export const LIVE_PROMOTE_KEY = 'proyaku_online_live_promote';
export const LIVE_PROMOTE_DEFAULT: LivePromote = 'off';

/**
 * Sàn ký tự trước khi một tiền tố được coi là đáng nhả.
 *
 * Đo theo `segmentCharLimit` ở chỗ gọi nên tiếng Nhật tự động cần ít ký tự hơn tiếng Việt (đo được:
 * 1,85×). Số này cố ý thấp hơn `SEGMENT_MIN_CHARS`: mục đích của cả cơ chế là nhả SỚM, còn việc gom câu
 * thành đoạn cho đủ ý vẫn do `planParagraphCut` làm ở phía sau như cũ.
 */
export const LIVE_PROMOTE_MIN_CHARS = 12;

export const LIVE_PROMOTE_OPTIONS: readonly {
    value: LivePromote;
    label: string;
    /** đoạn phải đứng yên bao lâu mới được nhả; 0 = không nhả gì cả */
    stableMs: number;
    hint: string;
}[] = [
    {
        value: 'off',
        label: 'Tắt',
        stableMs: 0,
        hint: 'Như cũ: chờ máy nghe chốt lượt rồi mới cắt câu. Chọn cái này nếu buổi lễ đang chạy ổn.',
    },
    {
        value: 'careful',
        label: 'Thận trọng',
        stableMs: 900,
        hint: 'Chờ gần một giây cho chắc máy nghe thôi sửa chữ. Chậm hơn, nhưng gần như không bao giờ nhả nhầm bản chưa sửa xong.',
    },
    {
        value: 'normal',
        label: 'Thường',
        stableMs: 650,
        hint: 'Cân giữa nhanh và chắc. Bắt đầu thử từ nấc này.',
    },
    {
        value: 'fast',
        label: 'Nhanh',
        stableMs: 450,
        hint: 'Nhả gần như ngay khi thấy dấu chấm. Nhanh nhất, và cũng dễ nhả một câu mà máy nghe còn đang sửa dở nhất.',
    },
];

const byValue = (v: unknown): LivePromote =>
    LIVE_PROMOTE_OPTIONS.some((o) => o.value === v) ? (v as LivePromote) : LIVE_PROMOTE_DEFAULT;

export function loadLivePromote(): LivePromote {
    try {
        return byValue(localStorage.getItem(LIVE_PROMOTE_KEY));
    } catch {
        return LIVE_PROMOTE_DEFAULT; // private mode → mặc định, không bao giờ ném lỗi
    }
}

export function saveLivePromote(value: LivePromote): void {
    try {
        localStorage.setItem(LIVE_PROMOTE_KEY, byValue(value));
    } catch {
        /* private mode / quota — phiên vẫn chạy, chỉ là không nhớ được */
    }
}

/** 0 nghĩa là TẮT hẳn, không phải "nhả ngay lập tức" — chỗ gọi phải kiểm `> 0` trước. */
export const livePromoteStableMs = (value: LivePromote): number =>
    LIVE_PROMOTE_OPTIONS.find((o) => o.value === byValue(value))?.stableMs ?? 0;

export const livePromoteLabel = (value: LivePromote): string =>
    LIVE_PROMOTE_OPTIONS.find((o) => o.value === byValue(value))?.label ?? 'Tắt';

/**
 * Dấu kết câu KHÔNG BAO GIỜ nhập nhằng — bản sao của `ALWAYS_STRONG_BREAKS` trong `transcriptSegmentation`
 * (nguồn gốc ở đó; chép lại một dòng để tệp này không phải kéo theo cả module vào).
 *
 * Khác với dấu chấm ASCII ở chỗ nào, và vì sao phải phân biệt: dấu chấm ASCII còn nằm giữa `www.esuhai.com`
 * và `Tp.HCM`, nên tiền tố kết thúc bằng `.` chỉ được coi là trọn vẹn khi ký tự ngay sau nó là khoảng
 * trắng. Còn `。！？` thì không có trong tên miền hay chữ viết tắt — thấy nó là hết câu, khỏi cần xét gì
 * thêm. Đúng chỗ này là chỗ tiếng Nhật sống hay chết: tiếng Nhật viết không dấu cách, sau `。` luôn là một
 * chữ kana bình thường, nên nếu chỉ xét "ký tự sau phải là khoảng trắng" thì tiếng Nhật không bao giờ nhả
 * được câu nào.
 */
const UNAMBIGUOUS_SENTENCE_END = /[。！？!?]$/u;

export type PromoteDecision =
    | { promote: false; candidate: string }
    | { promote: true; candidate: string; cut: number };

/**
 * Quyết định thuần: có nhả tiền tố nào của `live` ra ngay bây giờ không.
 *
 * Tách khỏi lane để test được thẳng, và để ba điều kiện ở đầu tệp nằm ở MỘT chỗ đọc được.
 *
 * @param live       đoạn đang nghe được, đã trừ phần đã nhả trước đó
 * @param candidate  tiền tố đang theo dõi từ lần gọi trước ('' nếu chưa có)
 * @param candidateAt lúc `candidate` bắt đầu đứng yên
 * @param now        đồng hồ
 * @param stableMs   nấc đang chọn; 0 = tắt
 * @param minChars   sàn ký tự, đã hiệu chỉnh theo ngôn ngữ ở chỗ gọi
 * @param breakAt    hàm tìm mối ngắt câu mạnh cuối cùng (trả về chỉ số kết thúc, 0 = không có)
 * @param boundaryOk hàm kiểm biên cho dấu chấm ASCII: ký tự ngay sau tiền tố phải là khoảng trắng/dấu
 *                   câu. Chỉ được hỏi tới khi tiền tố KHÔNG kết thúc bằng `。！？!?` — xem
 *                   `UNAMBIGUOUS_SENTENCE_END`.
 */
export function decidePromotion(args: {
    live: string;
    candidate: string;
    candidateAt: number;
    now: number;
    stableMs: number;
    minChars: number;
    breakAt: (text: string) => number;
    boundaryOk: (current: string, candidate: string) => boolean;
}): PromoteDecision {
    const { live, candidate, candidateAt, now, stableMs, minChars, breakAt, boundaryOk } = args;
    if (stableMs <= 0) return { promote: false, candidate: '' };
    const text = live.trim();
    if (!text) return { promote: false, candidate: '' };

    const cut = breakAt(text);
    // Mối ngắt nằm ở CUỐI đoạn cũng được nhả: đó là câu đã nói xong mà lượt chưa chốt — chính là ca cả cơ
    // chế này sinh ra để xử lý. Chỉ `cut <= 0` mới là "chưa có câu nào xong".
    if (cut <= 0) return { promote: false, candidate: '' };

    const next = text.slice(0, cut).trim();
    if (next.length < minChars) return { promote: false, candidate: '' };
    if (!UNAMBIGUOUS_SENTENCE_END.test(next) && !boundaryOk(text, next)) {
        return { promote: false, candidate: '' };
    }

    // Đổi một ký tự là đồng hồ chạy lại từ đầu. Máy nghe sửa lại chữ trong đoạn này nghĩa là nó CHƯA
    // xong, và nhả lúc đó là nhả một câu sai ra loa hội trường.
    if (next !== candidate) return { promote: false, candidate: next };
    if (now - candidateAt < stableMs) return { promote: false, candidate: next };
    return { promote: true, candidate: next, cut };
}
```

Và tạo tệp test `tests/livePromote.test.ts` với đúng nội dung này:

```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
    decidePromotion,
    livePromoteStableMs,
    livePromoteLabel,
    LIVE_PROMOTE_DEFAULT,
    LIVE_PROMOTE_OPTIONS,
    LIVE_PROMOTE_MIN_CHARS,
} from '../src/lib/lanes/online/livePromote'
import { findLastStrongSentenceBreak, segmentCharLimit } from '../src/lib/lanes/online/transcriptSegmentation'
import { isStableDraftPrefix, stripPromotedPrefix } from '../src/lib/lanes/online/liveDraftTranslation'

// "Nhả câu sớm" — cắt câu từ dòng partial thay vì chờ máy nghe chốt lượt.
//
// Vì sao phải có: trên micro hội trường có AGC, máy nghe chốt lượt rất thưa (đo 04/08: có phiên KHÔNG chốt
// lần nào). Mọi thứ đứng sau một câu — phụ đề đậm, bản dịch tinh, giọng đọc — đều chờ cái chốt đó. Dòng
// partial thì không bao giờ đứt, nên câu cắt được từ đó.
//
// Rủi ro thật duy nhất của cách này là partial BỊ SỬA LẠI sau khi ta đã nhả. Những ca dưới đây ghim ba
// lớp chống: cửa sổ đứng yên · sàn ký tự theo ngôn ngữ · biên phải là một đơn vị trọn vẹn. Và ghim luôn
// phép trừ khi lượt thật sự chốt — chỗ mà làm sai là câu lên tường HAI LẦN.
const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const LANE = 'src/lib/lanes/online/onlineLane.ts'

/** Cùng bộ tham số mà lane dùng, để test đo đúng thứ đang chạy chứ không phải một bản mô phỏng. */
const decide = (live: string, candidate: string, candidateAt: number, now: number, stableMs = 650) =>
    decidePromotion({
        live,
        candidate,
        candidateAt,
        now,
        stableMs,
        minChars: segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, live),
        breakAt: (t) => findLastStrongSentenceBreak(t, true),
        boundaryOk: isStableDraftPrefix,
    })

describe('nấc', () => {
    it('1 · mặc định là TẮT — đường đi mới của mọi câu phải được bật cố ý', () => {
        expect(LIVE_PROMOTE_DEFAULT).toBe('off')
        expect(livePromoteStableMs('off')).toBe(0)
        expect(livePromoteLabel('off')).toBe('Tắt')
    })

    it('2 · bốn nấc, và chỉ nấc Tắt mới có cửa sổ 0', () => {
        expect(LIVE_PROMOTE_OPTIONS).toHaveLength(4)
        for (const o of LIVE_PROMOTE_OPTIONS) {
            if (o.value === 'off') expect(o.stableMs).toBe(0)
            else expect(o.stableMs).toBeGreaterThan(0)
        }
        // càng nhanh thì cửa sổ càng ngắn — thứ tự này là thứ người vận hành đọc trên màn hình
        expect(livePromoteStableMs('careful')).toBeGreaterThan(livePromoteStableMs('normal'))
        expect(livePromoteStableMs('normal')).toBeGreaterThan(livePromoteStableMs('fast'))
    })

    it('3 · nấc lạ đọc thành TẮT, không phải "nhả ngay"', () => {
        expect(livePromoteStableMs('khong-co-nac-nay' as never)).toBe(0)
    })
})

describe('ba lớp chống nhả bậy', () => {
    it('4 · cửa sổ đứng yên: đổi một chữ là đồng hồ chạy lại từ đầu', () => {
        const a = decide('Kính thưa quý vị đại biểu. Hôm', '', 0, 1000)
        expect(a.promote).toBe(false)
        expect(a.candidate).toBe('Kính thưa quý vị đại biểu.')     // bắt đầu theo dõi

        // chưa đủ lâu
        expect(decide('Kính thưa quý vị đại biểu. Hôm nay', a.candidate, 1000, 1000 + 649).promote).toBe(false)
        // đủ lâu
        expect(decide('Kính thưa quý vị đại biểu. Hôm nay', a.candidate, 1000, 1000 + 650).promote).toBe(true)
    })

    it('5 · máy nghe SỬA LẠI đoạn đầu ⇒ ứng viên đổi ⇒ không nhả', () => {
        const first = decide('Kính thưa quý vị đại biểu. Hôm', '', 0, 1000)
        // cùng một câu nhưng máy nghe vừa sửa "quý vị" thành "quý bà"
        const revised = decide('Kính thưa quý bà đại biểu. Hôm nay', first.candidate, 1000, 1000 + 5000)
        expect(revised.promote).toBe(false)
        expect(revised.candidate).not.toBe(first.candidate)   // đồng hồ chạy lại cho bản mới
    })

    it('6 · biên: không bao giờ cắt giữa một từ đang viết dở', () => {
        // dấu chấm nằm trong một số, không phải hết câu ⇒ findLastStrongSentenceBreak không nhận
        const d = decide('Doanh thu đạt 1.500 tỷ đồng trong', '', 0, 1000)
        expect(d.promote).toBe(false)
        expect(d.candidate).toBe('')
    })

    it('7 · sàn ký tự: câu quá ngắn thì không nhả, dù đã đứng yên rất lâu', () => {
        const a = decide('Vâng.', '', 0, 1000)
        expect(a.candidate).toBe('')
        expect(decide('Vâng.', 'Vâng.', 1000, 99_999).promote).toBe(false)
    })

    it('8 · sàn đi theo ngôn ngữ: tiếng Nhật cần ít ký tự hơn tiếng Việt cho cùng lượng nghĩa', () => {
        const ja = 'ただいまより式典を開始いたします。'
        const vi = 'Bây giờ chúng tôi xin phép bắt đầu buổi lễ.'
        expect(segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, ja)).toBeLessThan(segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, vi))
        const a = decide(ja + 'つ', '', 0, 1000)
        expect(a.candidate).toBe(ja)
        expect(decide(ja + 'つぎに', a.candidate, 1000, 1000 + 650).promote).toBe(true)
    })

    it('9 · dấu chấm ASCII vẫn phải có khoảng trắng theo sau — không cắt giữa tên miền', () => {
        // Đây là lý do `boundaryOk` còn được giữ lại sau khi tiếng Nhật được cho đi tắt: mối ngắt MẠNH cuối
        // cùng ở đây nằm trong "esuhai.com", đủ dài để qua sàn ký tự, và chỉ phép kiểm biên chặn được.
        const d = decide('Kính mời quý vị vào www.esuhai.com để xem', '', 0, 1000)
        expect(d.promote).toBe(false)
        expect(d.candidate).toBe('')
    })

    it('10 · nấc Tắt: không bao giờ nhả, dù mọi điều kiện khác đều đúng', () => {
        const live = 'Kính thưa quý vị đại biểu. Hôm nay'
        expect(decide(live, 'Kính thưa quý vị đại biểu.', 1000, 99_999, 0).promote).toBe(false)
    })
})

describe('phép trừ khi lượt thật sự chốt — chỗ sai là câu lên tường HAI lần', () => {
    it('11 · lượt chốt chứa đúng phần đã nhả ⇒ chỉ phần MỚI đi tiếp', () => {
        const promoted = 'Kính thưa quý vị đại biểu.'
        const commit = 'Kính thưa quý vị đại biểu. Hôm nay là một ngày đặc biệt.'
        const r = stripPromotedPrefix(commit, promoted)
        expect(r.matched).toBe(true)
        expect(r.coveredByPromoted).toBe(false)
        expect(r.text).toBe('Hôm nay là một ngày đặc biệt.')
    })

    it('12 · lượt chốt KHÔNG có gì mới ⇒ không sinh câu nào nữa', () => {
        const promoted = 'Kính thưa quý vị đại biểu.'
        const r = stripPromotedPrefix('Kính thưa quý vị đại biểu.', promoted)
        expect(r.text).toBe('')
    })

    it('13 · máy nghe sửa lại đoạn đã nhả ⇒ GIỮ bản đã sửa (lặp, chứ không nuốt chữ)', () => {
        const promoted = 'Kính thưa quý vị đại biểu.'
        const commit = 'Kính thưa quý bà đại biểu. Hôm nay là một ngày đặc biệt.'
        const r = stripPromotedPrefix(commit, promoted)
        expect(r.matched).toBe(false)
        expect(r.text).toBe(commit)   // thà lặp một câu — thấy được — còn hơn nuốt chữ, không ai thấy
    })
})

describe('nối vào lane', () => {
    it('14 · cả hai đường vào đều đi qua acceptFinalText, không đường nào có bản sao chốt chặn riêng', () => {
        const lane = read(LANE)
        expect(lane.split('acceptFinalText(').length - 1).toBe(3)   // 1 khai báo + 2 lời gọi
        expect(lane).toContain('function acceptFinalText(')
    })

    it('15 · handleFinal giữ lại promotedPrefix TRƯỚC khi resetScribeCommitState xoá nó', () => {
        const lane = read(LANE)
        const at = lane.indexOf('function handleFinal')
        const body = lane.slice(at, lane.indexOf('acceptFinalText(', at))
        // thứ tự này là cả ca: dọn trước rồi mới đọc thì phép trừ luôn chạy trên chuỗi rỗng
        expect(body.indexOf('const promotedInTurn = promotedPrefix')).toBeLessThan(body.indexOf('resetScribeCommitState(true)'))
        expect(body).toContain('stripPromotedPrefix(raw, promotedInTurn)')
    })

    it('16 · lượt chết thì phần đã nhả cũng bị quên, nếu không lượt sau bị trừ oan', () => {
        const lane = read(LANE)
        const at = lane.indexOf('function resetScribeCommitState')
        const body = lane.slice(at, lane.indexOf('\n  function ', at))
        expect(body).toContain("promotedPrefix = ''")
        expect(body).toContain("promoteCandidate = ''")
    })

    it('17 · nhả TRƯỚC khi vẽ, để dòng chữ mờ không lặp lại câu vừa nhả', () => {
        const lane = read(LANE)
        const at = lane.indexOf('function handlePartial')
        const body = lane.slice(at, lane.indexOf('\n  function ', at))
        expect(body.indexOf('maybePromote(')).toBeLessThan(body.indexOf('emitLine('))
        expect(body).toContain('stripPromotedPrefix(base, promotedPrefix)')
    })

    it('18 · bộ đếm nhịp chốt lượt vẫn nhận TOÀN BỘ đoạn, kể cả phần đã nhả', () => {
        const lane = read(LANE)
        // scheduleStableCommit đo việc của MÁY NGHE, không phải việc của màn hình
        expect(lane).toContain('scheduleStableCommit(base)')
        const at = lane.indexOf('function handlePartial')
        const body = lane.slice(at, lane.indexOf('\n  function ', at))
        expect(body.indexOf('scheduleStableCommit(base)')).toBeLessThan(body.indexOf('maybePromote('))
    })

    it('19 · số câu nhả sớm lên bảng chẩn đoán', () => {
        const lane = read(LANE)
        expect(lane).toContain('promotions: number')
        expect(lane).toContain('promotions += 1')
        expect(read('src/lib/lanes/online/components/OnlineConsole.tsx')).toContain('nhả sớm {diag.promotions} câu')
    })
})
```

---

## TASK 65 — Nối nhả câu sớm vào lane (`src/lib/lanes/online/onlineLane.ts`)

Đây là phần cần đọc kỹ nhất của cả PROMPT-14, vì nó đổi **đường đi của một câu**.

Trước: chỉ có một cửa vào. Máy nghe chốt lượt → `handleFinal` → bảy chốt chặn ma → bộ khớp kịch bản → bộ
đệm đoạn → refine → giọng đọc → lưu.

Sau: **hai** cửa vào cùng đổ vào **một** đường. `handleFinal` (máy nghe chốt lượt) và `maybePromote` (một
tiền tố đứng yên đủ lâu trong dòng chữ mờ) đều gọi vào `acceptFinalText`, và toàn bộ chốt chặn nằm trong
đó. Chia như vậy là cố ý và không thương lượng: nếu mỗi cửa có bản sao chốt chặn riêng thì chỉ cần một lần
sửa quên đồng bộ là bật "nhả câu sớm" lên trở thành âm thầm tắt các lớp bảo vệ.

Ba chỗ dễ làm sai, ghi ra đây để khỏi phải dò:

1. **`handleFinal` phải giữ lại `promotedPrefix` TRƯỚC khi gọi `resetScribeCommitState`.** Hàm dọn đó xoá
   `promotedPrefix` (đúng, vì lượt đã chết), nhưng chính cái lượt vừa chết mới là lượt cần trừ đi phần đã
   nhả. Dọn trước rồi mới đọc thì phép trừ luôn chạy trên chuỗi rỗng, và **mọi câu đã nhả sẽ lên tường lần
   thứ hai**.
2. **`maybePromote` phải chạy TRƯỚC khi vẽ dòng chữ mờ**, nếu không dòng mờ lặp lại đúng câu vừa nhả.
3. **`scheduleStableCommit` vẫn nhận TOÀN BỘ đoạn**, kể cả phần đã nhả. Nó đang đo việc của **máy nghe**,
   không phải việc của màn hình. Trừ phần đã nhả ra khỏi nó là bộ đếm nhịp chốt lượt nhìn thấy một lượt
   ngắn hơn sự thật.

**(a)** Nhập luật vừa tạo. Find and replace:

```ts
import { planParagraphCut } from './paragraphStream';
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence, isInventedNumber, isNonSpeechAnnotation } from './asrSpeechEvidence';
import { isStableDraftPrefix, joinLiveDraftSource, stripPromotedPrefix } from './liveDraftTranslation';
import { DRAFT_RATE_WINDOW_MS, decideCaptureFrame, decideDraftAdmission, getContinuationWaitMs } from './livePipelinePolicy';
import { createSpeechPauseProfile } from './speechPauseProfile';
import { createSpeechShapeMonitor } from './speechShape';
```

with

```ts
import { planParagraphCut } from './paragraphStream';
import { ASR_FINAL_MIN_VOICED_MS, ASR_PARTIAL_MIN_VOICED_MS, hasClearSpeechEvidence, isInventedNumber, isNonSpeechAnnotation } from './asrSpeechEvidence';
import { isStableDraftPrefix, joinLiveDraftSource, stripPromotedPrefix } from './liveDraftTranslation';
import { decidePromotion, livePromoteStableMs, loadLivePromote, LIVE_PROMOTE_MIN_CHARS } from './livePromote';
import { DRAFT_RATE_WINDOW_MS, decideCaptureFrame, decideDraftAdmission, getContinuationWaitMs } from './livePipelinePolicy';
import { createSpeechPauseProfile } from './speechPauseProfile';
import { createSpeechShapeMonitor } from './speechShape';
```

**(b)** Ba trường mới trên bảng chẩn đoán — một cho nhả sớm, hai cho trần 25 giây của TASK 63.
Find and replace:

```ts
  lastScriptReason: string; // why the last finalised sentence did not snap — verbatim for the operator
  // M11 — turn handling and the two-way guards.
  manualCommits: number; // turns the CLIENT closed instead of waiting for the vendor's silence
  foreignDrops: number; // finals discarded because neither signal called them Vietnamese or Japanese
  languageTurns: number; // buffers closed because the other language started speaking
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
```

with

```ts
  lastScriptReason: string; // why the last finalised sentence did not snap — verbatim for the operator
  // M11 — turn handling and the two-way guards.
  manualCommits: number; // turns the CLIENT closed instead of waiting for the vendor's silence
  /** Câu được nhả SỚM từ dòng partial, không chờ máy nghe chốt lượt. Xem `livePromote.ts`. */
  promotions: number;
  /** Lần trần 25s phải CHỜ một khe im lặng thay vì cắt ngay, và lần chờ lâu nhất. */
  forceGapWaits: number;
  forceGapWaitMaxMs: number;
  foreignDrops: number; // finals discarded because neither signal called them Vietnamese or Japanese
  languageTurns: number; // buffers closed because the other language started speaking
  vendorTags: number; // finals that arrived carrying the recogniser's own language verdict
```

**(c)** Trạng thái. `promotedPrefix` là đoạn **đầu** của lượt đang mở mà ta đã nhả đi rồi — nó vẫn nằm
nguyên trong mọi partial kế tiếp (máy nghe chưa chốt gì cả), nên phải trừ ra ở **cả** chỗ hiển thị **lẫn**
lúc lượt thật sự chốt. Khối này cũng mang hai biến đếm của TASK 63. Find and replace:

```ts
  const voicedWindow: { at: number; voicedMs: number }[] = [];
  let previousFinalTranscript = '';
  let droppedGhosts = 0;

  const recentFinals: string[] = [];

```

with

```ts
  const voicedWindow: { at: number; voicedMs: number }[] = [];
  let previousFinalTranscript = '';
  let droppedGhosts = 0;
  const droppedByReason: Record<string, number> = {};
  // NHẢ CÂU SỚM. `promotedPrefix` là đoạn ĐẦU của lượt đang mở mà ta đã nhả đi rồi — nó vẫn nằm nguyên
  // trong mọi partial kế tiếp (máy nghe chưa chốt gì cả), nên phải trừ ra ở cả chỗ hiển thị lẫn lúc lượt
  // thật sự chốt. `promoteCandidate` là tiền tố đang được theo dõi xem có đứng yên đủ lâu chưa.
  let promotedPrefix = '';
  let promoteCandidate = '';
  let promoteCandidateAt = 0;
  let promotions = 0;
  // Trần 25s giờ chờ một khe im lặng mới cắt (`planForceCommit`). Hai số này là bằng chứng nó có phải
  // chờ thật hay không — chờ lâu bất thường nghĩa là hội trường không bao giờ im, và ta muốn thấy điều đó.
  let forceGapWaits = 0;
  let forceGapWaitMaxMs = 0;

  const recentFinals: string[] = [];

```

**(d)** Lượt chết thì đoạn đã nhả cũng hết nghĩa — nó là tiền tố của **một** lượt cụ thể. Giữ lại qua một
lần nối lại socket là lượt sau bị trừ oan mất đoạn đầu, đúng kiểu nuốt chữ mà cả cơ chế này phải tránh.
Find and replace:

```ts
  /** Forget the turn. Called when a final lands, on reconnect, and at start/teardown. */
  function resetScribeCommitState(rearm: boolean): void {
    clearScribeCommitTimer();
    scribeLastPartial = '';
    scribePartialChangedAt = 0;
    scribeCommitPending = false;
```

with

```ts
  /** Forget the turn. Called when a final lands, on reconnect, and at start/teardown. */
  function resetScribeCommitState(rearm: boolean): void {
    clearScribeCommitTimer();
    // Lượt chết thì đoạn đã nhả cũng hết nghĩa: nó là tiền tố của MỘT lượt cụ thể. Giữ lại qua một lần
    // nối lại socket là lượt sau bị trừ mất đoạn đầu — chính là kiểu nuốt chữ mà cả cơ chế này phải tránh.
    // (`handleFinal` đã tự dọn trước khi gọi vào đây; chỗ này lo cho nối lại, Dừng, và teardown.)
    promotedPrefix = '';
    promoteCandidate = '';
    scribeLastPartial = '';
    scribePartialChangedAt = 0;
    scribeCommitPending = false;
```

**(e)** Hàm `maybePromote`. Nấc được đọc **lại ở từng partial**, cùng nếp với nhịp nói và độ khớp: đổi nấc
trong Cài đặt là ăn ngay, không phải Dừng rồi Bắt đầu lại — giữa buổi lễ đó là khác biệt giữa sửa được và
không. Find and replace:

```ts
    }
  }

  // ---- events ----

  function handlePartial(msg: Record<string, unknown>): void {
```

with

```ts
    }
  }

  /**
   * Nhả một câu đã xong ra khỏi dòng partial, không chờ máy nghe chốt lượt.
   *
   * Nấc đọc LẠI ở từng partial, cùng nếp với nhịp nói và độ khớp: đổi nấc trong Cài đặt là ăn ngay, không
   * phải Dừng rồi Bắt đầu lại — giữa buổi lễ đó là khác biệt giữa sửa được và không.
   *
   * `promotedPrefix` được ghi theo **chuỗi con thật của `base`**, không phải theo số ký tự đã tiêu. Máy
   * nghe sửa lại đoạn đầu thì `stripPromotedPrefix` không khớp và ta giữ nguyên bản đã sửa: lặp một câu,
   * chứ không nuốt mất chữ.
   */
  function maybePromote(base: string, detectedLanguage: string | undefined): void {
    const stableMs = livePromoteStableMs(loadLivePromote());
    if (stableMs <= 0) { promoteCandidate = ''; return; }
    const seen = stripPromotedPrefix(base, promotedPrefix);
    if (seen.coveredByPromoted) { promoteCandidate = ''; return; }
    const live = seen.text;
    const decision = decidePromotion({
      live,
      candidate: promoteCandidate,
      candidateAt: promoteCandidateAt,
      now: Date.now(),
      stableMs,
      // Cùng cái thước đã dùng cho bộ đệm đoạn: một ký tự tiếng Nhật gánh nhiều nghĩa hơn một ký tự tiếng
      // Việt (đo được 1,85×), nên sàn phải đi theo tiếng của chính đoạn đang đo.
      minChars: segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, live),
      breakAt: (t) => findLastStrongSentenceBreak(t, true),
      boundaryOk: isStableDraftPrefix,
    });
    if (decision.candidate !== promoteCandidate) {
      promoteCandidate = decision.candidate;
      promoteCandidateAt = Date.now();
    }
    if (!decision.promote) return;
    // Vị trí cắt tính trên `base`, vì `live` là một hậu tố của `base` (stripPromotedPrefix chỉ cắt đầu).
    const offset = base.length - live.length;
    promotedPrefix = base.slice(0, offset + decision.cut).trim();
    promoteCandidate = '';
    promotions += 1;
    acceptFinalText(decision.candidate, detectedLanguage);
  }

  // ---- events ----

  function handlePartial(msg: Record<string, unknown>): void {
```

**(f)** Khối lớn nhất: `handlePartial` gọi `maybePromote` rồi trừ phần đã nhả ra khỏi dòng vẽ;
`handleFinal` co lại còn đúng việc của nó; và `acceptFinalText` ra đời mang toàn bộ chốt chặn.
Find and replace:

```ts
    noteSpeechTiming();
    // M11: judge the turn upstream is still HOLDING — not segmentBuffer, whose earlier sentences are
    // already committed and would make every partial look finished.
    scheduleStableCommit((text + stash).trim());
    if (!segmentLid) segmentLid = `online-${++counter}`;
    latency.markFirstPartial(segmentLid, performance.now());
    // The wall must not show the invented stop either: while the dim text is still moving, the sentence is
    // demonstrably not over, and a full stop sitting in the middle of a live line reads as a mistake.
    const live = (text + stash).trim();
    currentInterimSource = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, live, SEGMENT_MIN_CHARS), live);
    emitLine({ lid: segmentLid, sourceText: currentInterimSource, targetText: lastInterimTarget, interim: true, corrected: false });
    scheduleDraft();
  }

  function handleFinal(msg: Record<string, unknown>): void {
    // M11: the turn upstream was holding is closed, whatever closed it — clock a fresh window.
    resetScribeCommitState(true);
    // TASK 5: correct BEFORE every guard below. The repeat guard, the script matcher, the refine call,
    // the audience wall and the saved transcript must all see the same corrected string — otherwise the
    // name is fixed on screen and still wrong in the recording.
    const transcript = applyMishearings((typeof msg.transcript === 'string' ? msg.transcript : '').trim(), activeMishearings()).text;
    if (!transcript) return;
    // M4 ghost guards (drop finals, count them).
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_FINAL_MIN_VOICED_MS)) {
      dropGhost('low-voiced', transcript);
```

with

```ts
    noteSpeechTiming();
    // M11: judge the turn upstream is still HOLDING — not segmentBuffer, whose earlier sentences are
    // already committed and would make every partial look finished.
    // Vẫn là TOÀN BỘ đoạn máy nghe đang giữ, kể cả phần ta đã nhả sớm: bộ đếm nhịp chốt lượt đang đo việc
    // của MÁY NGHE, không phải việc của màn hình.
    const base = (text + stash).trim();
    scheduleStableCommit(base);
    if (!segmentLid) segmentLid = `online-${++counter}`;
    latency.markFirstPartial(segmentLid, performance.now());
    // NHẢ CÂU SỚM — làm TRƯỚC khi vẽ, để dòng vẽ ra không lặp lại câu vừa nhả.
    maybePromote(base, typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined);
    // The wall must not show the invented stop either: while the dim text is still moving, the sentence is
    // demonstrably not over, and a full stop sitting in the middle of a live line reads as a mistake.
    const shown = stripPromotedPrefix(base, promotedPrefix);
    const live = shown.coveredByPromoted ? '' : shown.text;
    if (!live) return; // cả đoạn đang nghe đã nhả đi rồi — không còn gì mờ để vẽ
    currentInterimSource = joinSeg(stripProvisionalSentenceEnd(segmentBuffer, live, SEGMENT_MIN_CHARS), live);
    emitLine({ lid: segmentLid, sourceText: currentInterimSource, targetText: lastInterimTarget, interim: true, corrected: false });
    scheduleDraft();
  }

  function handleFinal(msg: Record<string, unknown>): void {
    // Giữ lại TRƯỚC khi dọn: `resetScribeCommitState` xoá `promotedPrefix` (đúng, vì lượt đã chết), nhưng
    // chính lượt vừa chết mới là lượt cần trừ đi phần đã nhả sớm.
    const promotedInTurn = promotedPrefix;
    // M11: the turn upstream was holding is closed, whatever closed it — clock a fresh window.
    resetScribeCommitState(true);
    // TASK 5: correct BEFORE every guard below. The repeat guard, the script matcher, the refine call,
    // the audience wall and the saved transcript must all see the same corrected string — otherwise the
    // name is fixed on screen and still wrong in the recording.
    const raw = applyMishearings((typeof msg.transcript === 'string' ? msg.transcript : '').trim(), activeMishearings()).text;
    if (!raw) return;
    // NHẢ CÂU SỚM: phần đầu của lượt này có thể đã được nhả ra từ dòng partial rồi. Trừ đi đúng phần đó.
    //
    // `stripPromotedPrefix` cắt CHỈ KHI khớp tiền tố chính xác. Máy nghe sửa lại đoạn đầu ⇒ không khớp ⇒
    // giữ nguyên bản đã sửa. Đó là lặp một câu trên tường, và lặp thì thấy được; cắt mù theo số ký tự là
    // nuốt mất chữ, và nuốt thì không ai thấy. Đổi lấy cái thấy được là cố ý.
    const rest = stripPromotedPrefix(raw, promotedInTurn);
    // Máy nghe chốt lượt mà không có gì mới so với những gì đã nhả — bình thường, và không phải một câu.
    if (rest.coveredByPromoted) return;
    const transcript = rest.text;
    if (!transcript) return;
    acceptFinalText(transcript, typeof msg.detectedLanguage === 'string' ? msg.detectedLanguage : undefined);
  }

  /**
   * Đường đi của MỘT câu đã xong, dù nó đến từ đâu.
   *
   * Hai lối vào: máy nghe chốt lượt (`handleFinal`), hoặc một tiền tố đứng yên đủ lâu trong dòng partial
   * được nhả sớm (`maybePromote`). Cố ý dùng CHUNG toàn bộ đoạn dưới đây — mọi chốt chặn ma, bộ khớp kịch
   * bản, bộ đệm đoạn, refine, giọng đọc, dòng lưu lại. Một câu nhả sớm phải đi qua đúng những cái cổng mà
   * một câu chốt bình thường đi qua, nếu không thì bật cơ chế nhả sớm lên là lặng lẽ tắt hết các lớp bảo
   * vệ đã dựng suốt sáu tháng.
   */
  function acceptFinalText(transcript: string, detectedLanguage: string | undefined): void {
    const msg: Record<string, unknown> = detectedLanguage ? { detectedLanguage } : {};
    // M4 ghost guards (drop finals, count them).
    if (!hasClearSpeechEvidence(pruneVoiced(), ASR_FINAL_MIN_VOICED_MS)) {
      dropGhost('low-voiced', transcript);
```

**(g)** Đếm lại từ 0 ở mỗi phiên mới. Find and replace:

```ts
    // M11/M12: the force-commit clock starts at session.created, not at Start.
    resetScribeCommitState(false);
    manualCommits = 0;
    foreignDrops = 0;
    languageTurns = 0;
    vendorTags = 0;
```

with

```ts
    // M11/M12: the force-commit clock starts at session.created, not at Start.
    resetScribeCommitState(false);
    manualCommits = 0;
    promotions = 0;
    foreignDrops = 0;
    languageTurns = 0;
    vendorTags = 0;
```

**(h)** Và trả ra ngoài. Find and replace:

```ts
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
      lastScriptReason,
      manualCommits,
      foreignDrops,
      languageTurns,
      vendorTags,
```

with

```ts
      scriptPosition: (scriptMatcher?.position() ?? 0) + 1,
      lastScriptReason,
      manualCommits,
      promotions,
      forceGapWaits,
      forceGapWaitMaxMs,
      foreignDrops,
      languageTurns,
      vendorTags,
```


---

## TASK 66 — Bảng chẩn đoán nói được câu "câu biến mất là tại ai"

Ba việc ở trên đều đổi chỗ trong đường chạy, và không có gì tệ hơn là đổi rồi không biết nó có ăn thua
không. Hôm nay bảy chốt chặn ma đều chỉ ghi `console.debug` rồi cộng chung vào một con số `ghosts` — người
vận hành nhìn thấy "ghosts 14" và không biết được gì thêm.

Sau TASK 66, người vận hành đọc được bốn dòng, và **mỗi dòng trả lời một câu hỏi cụ thể**:

- `chờ nhãn … lâu nhất … nhả sớm N · final A/B` — cái khựng giữa hai câu **dài bao nhiêu mili-giây**, và
  đã phải bỏ nhãn tiếng bao nhiêu lần. Đỏ khi đã chạm trần.
- `bỏ vì: …` — chốt nào của **chính máy này** đã ăn câu. Trống nghĩa là câu thiếu **không** phải do máy
  khách bỏ, và đó là một câu trả lời có giá trị.
- `nhả sớm N câu` trên dòng `cắt` — nhả câu sớm có đang chạy không. Người ta đang nói liên tục mà N vẫn 0
  nghĩa là chưa câu nào đứng yên đủ lâu: hạ xuống nấc nhanh hơn.
- `trần 25s chờ khe im N lần · lâu nhất Xs` — chỉ hiện khi trần thật sự phải chờ. Số lớn nghĩa là hội
  trường gần như không bao giờ im.

**(a)** Khai trường. Trong `src/lib/lanes/online/onlineLane.ts`, find and replace:

```ts
  secondsSinceLastEvent: number;
  voicedMsRecent: number;
  droppedGhosts: number;
  draftCalls: number;
  draftSkipped: { duplicate: number; 'rate-limit': number; 'in-flight': number };
  refineCalls: number;
```

with

```ts
  secondsSinceLastEvent: number;
  voicedMsRecent: number;
  droppedGhosts: number;
  /** Bảy chốt chặn của `dropGhost`, tách theo lý do — xem chú thích ở `dropGhost`. */
  droppedByReason: Record<string, number>;
  /**
   * Số đo của chốt "chờ bản có nhãn" trong codec. `tagWaitMaxMs` là câu trả lời bằng số cho "cái khựng
   * giữa hai câu dài bao nhiêu", `tagTimeouts` là số câu đã phải nhả sớm và mất nhãn tiếng.
   */
  asrTag: { waitLastMs: number; waitMaxMs: number; timeouts: number; plainFinals: number; taggedFinals: number };
  draftCalls: number;
  draftSkipped: { duplicate: number; 'rate-limit': number; 'in-flight': number };
  refineCalls: number;
```

**(b)** Và `dropGhost` đếm riêng từng lý do. Find and replace:

```ts

  function dropGhost(reason: string, transcript: string): void {
    droppedGhosts += 1;
    // eslint-disable-next-line no-console
    console.debug(`[onlineLane] dropped ghost (${reason}): ${transcript.slice(0, 40)}`);
  }
```

with

```ts

  function dropGhost(reason: string, transcript: string): void {
    droppedGhosts += 1;
    // Đếm RIÊNG từng lý do. Trước đây bảy chốt chặn dưới đây chỉ ghi `console.debug` rồi cộng vào một
    // con số tổng, nên trên màn hình một câu bị CHÍNH MÁY NÀY bỏ trông y hệt một câu nhà cung cấp nuốt
    // mất. Muốn phân xử "lỗi tại đâu" thì phải biết chốt nào đã bắn, và bắn bao nhiêu lần.
    droppedByReason[reason] = (droppedByReason[reason] ?? 0) + 1;
    // eslint-disable-next-line no-console
    console.debug(`[onlineLane] dropped ghost (${reason}): ${transcript.slice(0, 40)}`);
  }
```

**(c)** Trả ra ngoài. `{ ...droppedByReason }` là bản **sao**, không phải chính cái bảng đếm — trả thẳng
ra là người nhận cầm được cái ruột đang chạy. Find and replace:

```ts
      secondsSinceLastEvent: lastEventAt ? Math.max(0, (Date.now() - lastEventAt) / 1000) : 0,
      voicedMsRecent: Math.round(pruneVoiced()),
      droppedGhosts,
      draftCalls,
      draftSkipped: { ...draftSkipped },
      refineCalls,
```

with

```ts
      secondsSinceLastEvent: lastEventAt ? Math.max(0, (Date.now() - lastEventAt) / 1000) : 0,
      voicedMsRecent: Math.round(pruneVoiced()),
      droppedGhosts,
      droppedByReason: { ...droppedByReason },
      asrTag: (() => {
        const s = codec?.stats?.();
        return {
          waitLastMs: s?.tagWaitLastMs ?? -1,
          waitMaxMs: s?.tagWaitMaxMs ?? 0,
          timeouts: s?.tagTimeouts ?? 0,
          plainFinals: s?.plainFinals ?? 0,
          taggedFinals: s?.taggedFinals ?? 0,
        };
      })(),
      draftCalls,
      draftSkipped: { ...draftSkipped },
      refineCalls,
```

**(d)** Hai dòng đầu trên màn hình, trong `src/lib/lanes/online/components/OnlineConsole.tsx`.
Find and replace:

```tsx
                  <div className="font-label-caps text-label-caps text-on-surface-variant space-y-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
                    <div>reconnects {diag.reconnectAttempts} · silent {diag.silentReconnects} · sinceEvent {diag.secondsSinceLastEvent.toFixed(1)}s</div>
                    <div>voiced {diag.voicedMsRecent}ms · ghosts {diag.droppedGhosts}</div>
                    {/* These two MUST be read together. `ngưỡng đủ to` is the level a frame has to reach
                        before the machine believes sound just happened; `VU đỉnh 3s` is the loudest frame
                        of the last three seconds. Peak BELOW threshold while somebody is speaking = this
```

with

```tsx
                  <div className="font-label-caps text-label-caps text-on-surface-variant space-y-1" style={{ fontFamily: 'ui-monospace, monospace' }}>
                    <div>reconnects {diag.reconnectAttempts} · silent {diag.silentReconnects} · sinceEvent {diag.secondsSinceLastEvent.toFixed(1)}s</div>
                    <div>voiced {diag.voicedMsRecent}ms · ghosts {diag.droppedGhosts}</div>
                    {/* Bốn con số để phân xử "câu biến mất là tại ai" bằng SỐ thay vì bằng cảm giác.
                        `chờ nhãn` = bản final có nhãn tiếng về SAU bản trơn bao nhiêu ms; đó chính là cái
                        khựng giữa hai câu, và tối đa là trần 600ms của codec. `nhả sớm` = số câu đã phải
                        nhả khi hết trần, tức số lần MẤT nhãn tiếng. Đỏ khi đã chạm trần: lúc đó khựng là
                        thật và trần đang phải làm việc. */}
                    <div className={diag.asrTag.timeouts > 0 ? 'text-error' : undefined}>
                      chờ nhãn {diag.asrTag.waitLastMs < 0 ? '—' : `${diag.asrTag.waitLastMs}ms`} · lâu nhất {diag.asrTag.waitMaxMs}ms
                      {' · '}nhả sớm {diag.asrTag.timeouts} · final {diag.asrTag.plainFinals}/{diag.asrTag.taggedFinals}
                    </div>
                    {/* Chốt nào của CHÍNH MÁY NÀY đã ăn câu. Trống = không chốt nào bắn, tức câu thiếu
                        không phải do phía máy khách bỏ. */}
                    {Object.keys(diag.droppedByReason).length ? (
                      <div>bỏ vì: {Object.entries(diag.droppedByReason).map(([r, n]) => `${r} ${n}`).join(' · ')}</div>
                    ) : null}
                    {/* These two MUST be read together. `ngưỡng đủ to` is the level a frame has to reach
                        before the machine believes sound just happened; `VU đỉnh 3s` is the loudest frame
                        of the last three seconds. Peak BELOW threshold while somebody is speaking = this
```

**(e)** Và hai dòng còn lại. Find and replace:

```tsx
                    {/* M11 — turn handling. `cắt` near zero during a busy hall means the client-side
                        commit is not firing and the long stalls are back; `bỏ lạ` and `đổi tiếng` are
                        the two-way guards, and both being zero in a bilingual session is also a signal. */}
                    <div>cắt {diag.manualCommits} · bỏ tiếng lạ {diag.foreignDrops} · đổi tiếng {diag.languageTurns}</div>
                    {/* M13 + TASK 24 — the sentence-cut wait in force for the current speaker. "theo
                        người nói" = the profile has measured enough (8+ pauses) and is using this
                        speaker's own rhythm; "đặt sẵn" = a fixed number, either the original 600/800ms
```

with

```tsx
                    {/* M11 — turn handling. `cắt` near zero during a busy hall means the client-side
                        commit is not firing and the long stalls are back; `bỏ lạ` and `đổi tiếng` are
                        the two-way guards, and both being zero in a bilingual session is also a signal. */}
                    <div>cắt {diag.manualCommits} · nhả sớm {diag.promotions} câu · bỏ tiếng lạ {diag.foreignDrops} · đổi tiếng {diag.languageTurns}</div>
                    {/* Trần 25s KHÔNG còn cắt mù: nó chờ một khe im lặng (~0,22s) rồi mới cắt, vì cắt là
                        cắt TIẾNG, và cắt giữa một từ thì không bản dịch nào chữa lại được. Số ở đây lớn
                        nghĩa là hội trường gần như không bao giờ im — lúc đó số ms mới là thứ đáng nhìn. */}
                    {diag.forceGapWaits > 0 && (
                      <div>
                        trần 25s chờ khe im {diag.forceGapWaits} lần · lâu nhất {(diag.forceGapWaitMaxMs / 1000).toFixed(1)}s
                      </div>
                    )}
                    {/* M13 + TASK 24 — the sentence-cut wait in force for the current speaker. "theo
                        người nói" = the profile has measured enough (8+ pauses) and is using this
                        speaker's own rhythm; "đặt sẵn" = a fixed number, either the original 600/800ms
```

---

## TASK 67 — Mục "Nhả câu sớm" ở màn Cài đặt

Cùng hình dạng với hai mục ONLINE đã có: một khoá localStorage, Cài đặt ghi vào, lane đọc lại ở từng
partial, nên hai bên **không bao giờ lệch nhau được**.

Và cố ý **không** gọi `useOnlineLane` — cùng lý do với hai mục kia: một trang cấu hình không được phép
khởi động đồng hồ chẩn đoán, bộ phát tường phụ đề, hay lệnh tải danh mục giọng đọc.

**(a)** Tạo `src/lib/lanes/online/components/OnlineLivePromoteSettings.tsx` với đúng nội dung này:

```tsx
// src/lib/lanes/online/components/OnlineLivePromoteSettings.tsx — mục "Nhả câu sớm" ở màn Cài đặt.
//
// Đây là nấc đổi ĐƯỜNG ĐI của mọi câu, nên nó mặc định TẮT và phải được bật một cách cố ý.
//
// Vấn đề nó chữa: tới nay mọi thứ đứng sau một câu — phụ đề đậm, bản dịch tinh, giọng đọc — đều chờ máy
// nghe **chốt lượt**. Trên micro hội trường có AGC thì máy nghe chốt rất thưa (đo 04/08: có phiên không
// chốt lần nào, vì AGC nâng mọi quãng nghỉ thành tiếng ồn). Nhưng dòng chữ mờ thì chảy liên tục và không
// bao giờ đứt — nên câu có thể được cắt từ đó.
//
// Deliberately does NOT call `useOnlineLane` — same reason as the other settings sections: a config page
// must not spin up diagnostics timers, the audience publisher, or the voice-catalog fetch.

import React, { useState } from 'react'
import { LIVE_PROMOTE_OPTIONS, loadLivePromote, saveLivePromote, livePromoteLabel, type LivePromote } from '../index'
import { toast } from '../../../toast'

const OnlineLivePromoteSettings: React.FC = () => {
  const [value, setValue] = useState<LivePromote>(() => loadLivePromote())

  const choose = (v: LivePromote) => {
    setValue(v)
    saveLivePromote(v)
    const ms = LIVE_PROMOTE_OPTIONS.find((o) => o.value === v)?.stableMs ?? 0
    toast.success(
      v === 'off'
        ? 'Đã tắt nhả câu sớm — máy chờ chốt lượt như cũ'
        : `Đã bật ${livePromoteLabel(v)} — câu đứng yên ${(ms / 1000).toFixed(2)}s là nhả, không chờ chốt lượt`,
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-on-surface-variant">
        Bình thường máy phải đợi <strong>máy nghe báo hết lượt</strong> rồi mới cho câu lên tường, dịch kỹ và
        đọc thành tiếng. Micro hội trường có bộ tự chỉnh âm lượng, nên máy nghe rất lâu mới chịu báo hết
        lượt — đó là lúc chữ đứng im một nhịp rồi mới nhảy. Bật mục này thì máy{' '}
        <strong>tự cắt câu từ dòng chữ mờ đang chạy</strong>, không đợi nữa.
      </p>

      <div role="radiogroup" aria-label="Nhả câu sớm" className="space-y-2">
        {LIVE_PROMOTE_OPTIONS.map((o) => {
          const on = value === o.value
          return (
            <label
              key={o.value}
              htmlFor={`live-promote-${o.value}`}
              className={`flex items-start gap-3 rounded-DEFAULT border px-3 py-2.5 cursor-pointer transition-colors ${on ? 'border-secondary bg-surface' : 'border-outline-variant hover:border-primary'}`}
            >
              <input
                id={`live-promote-${o.value}`}
                type="radio"
                name="live-promote"
                value={o.value}
                checked={on}
                onChange={() => choose(o.value)}
                className="accent-secondary mt-1"
              />
              <span className="min-w-0">
                <span className={`font-label-caps text-label-caps ${on ? 'text-secondary' : 'text-on-surface'}`}>
                  {o.label}
                  <span className="ml-2 tabular-nums text-on-surface-variant">
                    {o.stableMs > 0 ? `đứng yên ${(o.stableMs / 1000).toFixed(2)}s` : 'không nhả sớm'}
                  </span>
                </span>
                <span className="block text-xs text-on-surface-variant leading-relaxed mt-0.5">{o.hint}</span>
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-on-surface-variant/80">
        Đang chọn: <strong>{livePromoteLabel(value)}</strong>. Máy chỉ cắt ở{' '}
        <strong>chỗ có dấu chấm hoặc dấu hỏi</strong>, và chỉ khi đoạn đó <strong>không đổi một chữ nào</strong>{' '}
        suốt quãng thời gian trên — máy nghe còn đang sửa chữ thì đồng hồ chạy lại từ đầu. Máy cũng không bao
        giờ cắt giữa một từ. <strong>Có hiệu lực ngay</strong>, kể cả đang chạy giữa buổi. Lưu trên máy này.
      </p>
      <p className="text-xs text-on-surface-variant/80">
        Muốn xem có ăn thua không: mở <strong>Chẩn đoán</strong> ở màn điều khiển, dòng{' '}
        <strong>“nhả sớm N câu”</strong>. N vẫn là 0 khi người ta đang nói liên tục nghĩa là chưa có câu nào
        đứng yên đủ lâu — hạ xuống nấc nhanh hơn.
      </p>
    </div>
  )
}

export default OnlineLivePromoteSettings
```

**(b)** Mở đường ra qua **gốc facade**, không phải đường dẫn sâu. Trong `src/lib/lanes/online/index.ts`,
find and replace:

```ts
  GUIDED_MATCH_KEY, GUIDED_MATCH_DEFAULT, GUIDED_MATCH_OPTIONS,
  loadGuidedMatch, saveGuidedMatch, guidedMatchFloor, guidedMatchLabel,
} from './guidedMatch'
// M14 — the pre-session document summariser. A plain async function, not part of the hook: it belongs to
// Chuẩn bị, runs at most once per session, and must never be reachable from anything a live session does.
export { summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS } from './prepBrief'
```

with

```ts
  GUIDED_MATCH_KEY, GUIDED_MATCH_DEFAULT, GUIDED_MATCH_OPTIONS,
  loadGuidedMatch, saveGuidedMatch, guidedMatchFloor, guidedMatchLabel,
} from './guidedMatch'
// "Nhả câu sớm": cắt câu từ dòng partial thay vì chờ máy nghe chốt lượt. Cùng hình dạng với hai nấc trên —
// Cài đặt chọn nấc, lane đọc LẠI ở từng partial. Mặc định TẮT: nó đổi đường đi của mọi câu.
export type { LivePromote } from './livePromote'
export {
  LIVE_PROMOTE_KEY, LIVE_PROMOTE_DEFAULT, LIVE_PROMOTE_OPTIONS, LIVE_PROMOTE_MIN_CHARS,
  loadLivePromote, saveLivePromote, livePromoteStableMs, livePromoteLabel, decidePromotion,
} from './livePromote'
// M14 — the pre-session document summariser. A plain async function, not part of the hook: it belongs to
// Chuẩn bị, runs at most once per session, and must never be reachable from anything a live session does.
export { summarizePrepDocs, PREP_DOCS_MAX, PREP_DOC_MAX_CHARS } from './prepBrief'
```

**(c)** Và component. Find and replace:

```ts
//   OnlineGuidedMatchSettings — the Settings "Độ khớp khi dẫn theo kịch bản" section (TASK 57): how
//   closely the machine must recognise the armed line before it releases the approved translation.
export { default as OnlineGuidedMatchSettings } from './components/OnlineGuidedMatchSettings'

```

with

```ts
//   OnlineGuidedMatchSettings — the Settings "Độ khớp khi dẫn theo kịch bản" section (TASK 57): how
//   closely the machine must recognise the armed line before it releases the approved translation.
export { default as OnlineGuidedMatchSettings } from './components/OnlineGuidedMatchSettings'
//   OnlineLivePromoteSettings — the Settings "Nhả câu sớm" section: cut sentences out of the live partial
//   instead of waiting for the recogniser to close its turn. Default OFF.
export { default as OnlineLivePromoteSettings } from './components/OnlineLivePromoteSettings'

```

**(d)** Trong `src/pages/Settings.tsx`, thêm vào dòng nhập. Find and replace:

```tsx
    loadSettings, saveSettings, exportLocalData, clearLocalData,
} from '../lib/settings';
import { toast } from '../lib/toast';
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings, OnlineGuidedMatchSettings } from '../lib/lanes/online';

// Central Settings page (Giai đoạn 1) — consolidates the scattered per-feature config into one
// professional place: Kết nối · Sự kiện · Hiển thị · Giọng đọc · Tài khoản · Dữ liệu · Giới thiệu.
```

with

```tsx
    loadSettings, saveSettings, exportLocalData, clearLocalData,
} from '../lib/settings';
import { toast } from '../lib/toast';
import { OnlineKeysSettings, OnlineMicSettings, OnlineRhythmSettings, OnlineGuidedMatchSettings, OnlineLivePromoteSettings } from '../lib/lanes/online';

// Central Settings page (Giai đoạn 1) — consolidates the scattered per-feature config into one
// professional place: Kết nối · Sự kiện · Hiển thị · Giọng đọc · Tài khoản · Dữ liệu · Giới thiệu.
```

**(e)** Và đặt mục mới **ngay sau** mục "Độ khớp khi dẫn theo kịch bản" của PROMPT-13. Find and replace:

```tsx
                    {/* CHẾ ĐỘ ONLINE — ĐỘ KHỚP KHI DẪN THEO KỊCH BẢN (TASK 57) */}
                    <Section id="gm" icon="rule" title="Chế độ ONLINE — Độ khớp khi dẫn theo kịch bản" desc="Bấm một dòng kịch bản thì máy phải nghe giống tới đâu mới đọc lên bản dịch đã duyệt. Nấc Thả cửa: bấm là nhả.">
                        <OnlineGuidedMatchSettings />
                    </Section>

                    {/* HIỂN THỊ */}
```

with

```tsx
                    {/* CHẾ ĐỘ ONLINE — ĐỘ KHỚP KHI DẪN THEO KỊCH BẢN (TASK 57) */}
                    <Section id="gm" icon="rule" title="Chế độ ONLINE — Độ khớp khi dẫn theo kịch bản" desc="Bấm một dòng kịch bản thì máy phải nghe giống tới đâu mới đọc lên bản dịch đã duyệt. Nấc Thả cửa: bấm là nhả.">
                        <OnlineGuidedMatchSettings />
                    </Section>

                    {/* CHE DO ONLINE — NHA CAU SOM */}
                    <Section id="lp" icon="bolt" title="Chế độ ONLINE — Nhả câu sớm" desc="Cắt câu ngay từ dòng chữ mờ đang chạy, không đợi máy nghe báo hết lượt. Mặc định TẮT.">
                        <OnlineLivePromoteSettings />
                    </Section>

                    {/* HIỂN THỊ */}
```


---

## TASK 68 — Một test cũ phải đổi theo, và chỉ một

`tests/mishearingWiring.test.ts` ca số 2 hôm nay ghim **cấu trúc của một hàm**: rằng trong `handleFinal`,
việc sửa nghe nhầm xảy ra trước `dropGhost('repeat'`. TASK 65 dời các chốt chặn sang `acceptFinalText`,
nên ca đó sẽ đỏ — **không phải vì bất biến bị vi phạm, mà vì nó ghim nhầm chỗ**.

Bất biến thật không đổi một chút nào: **chữ phải được sửa TRƯỚC mọi chốt chặn**. Cái đổi là giờ có **hai**
đường vào chứ không phải một. Nên ca này được viết lại để ghim đúng bất biến đó, **trên cả hai đường**, và
ghim thêm một điều mới đáng giá: `acceptFinalText` **không được** tự gọi `applyMishearings` — nó phải nhận
chữ đã sửa rồi. Ca mới chặt hơn ca cũ, không lỏng hơn.

Đây là tệp test cũ **duy nhất** PROMPT-14 đụng tới. Nếu bạn thấy tệp test nào khác đỏ thì **dừng lại và
báo**, đừng sửa test — test đỏ ngoài dự kiến nghĩa là một khối ở trên áp sai chỗ.

Find and replace:

```ts
    expect(src.slice(finalAt, nextTop)).toContain('applyMishearings(')
  })

  it('2 · trong handleFinal việc sửa xảy ra TRƯỚC mọi chốt chặn', () => {
    const src = read(LANE)
    const finalAt = src.indexOf('function handleFinal')
    const slice = src.slice(finalAt, src.indexOf('\n  function ', finalAt))
    expect(slice.indexOf('applyMishearings(')).toBeGreaterThan(-1)
    expect(slice.indexOf("dropGhost('repeat'")).toBeGreaterThan(-1)
    expect(slice.indexOf('applyMishearings(')).toBeLessThan(slice.indexOf("dropGhost('repeat'"))
  })

  it('3 · getter đọc LIVE từng lần, không chốt một lần lúc Bắt đầu', () => {
```

with

```ts
    expect(src.slice(finalAt, nextTop)).toContain('applyMishearings(')
  })

  // Ca này từng ghim cấu trúc của MỘT hàm (`handleFinal` chứa cả việc sửa lẫn các chốt chặn). Từ khi có
  // "nhả câu sớm" thì một câu tới được các chốt chặn bằng HAI đường: máy nghe chốt lượt, hoặc một tiền tố
  // đứng yên đủ lâu trong dòng partial. Các chốt dọn về `acceptFinalText` dùng chung. Bất biến không đổi —
  // chữ phải được sửa TRƯỚC mọi chốt — nên ca này ghim đúng bất biến đó, trên cả hai đường.
  it('2 · trên MỌI đường vào, việc sửa xảy ra TRƯỚC mọi chốt chặn', () => {
    const src = read(LANE)

    // Các chốt chặn nay ở một chỗ, và chỗ đó KHÔNG tự sửa: nó nhận chữ đã sửa rồi.
    const guardsAt = src.indexOf('function acceptFinalText')
    expect(guardsAt).toBeGreaterThan(-1)
    const guards = src.slice(guardsAt, src.indexOf('\n  function ', guardsAt))
    expect(guards).toContain("dropGhost('repeat'")
    expect(guards).not.toContain('applyMishearings(')

    // Đường 1 — máy nghe chốt lượt.
    const finalAt = src.indexOf('function handleFinal')
    expect(finalAt).toBeGreaterThan(-1)
    const fin = src.slice(finalAt, guardsAt)
    expect(fin.indexOf('applyMishearings(')).toBeGreaterThan(-1)
    expect(fin.indexOf('applyMishearings(')).toBeLessThan(fin.indexOf('acceptFinalText('))

    // Đường 2 — nhả sớm từ dòng partial. Chữ đưa vào `maybePromote` là chữ đã sửa của `handlePartial`.
    const partialAt = src.indexOf('function handlePartial')
    const par = src.slice(partialAt, src.indexOf('\n  function ', partialAt))
    expect(par.indexOf('maybePromote(')).toBeGreaterThan(-1)
    expect(par.indexOf('applyMishearings(')).toBeLessThan(par.indexOf('maybePromote('))
  })

  it('3 · getter đọc LIVE từng lần, không chốt một lần lúc Bắt đầu', () => {
```

---

## TASK 69 — Tài liệu facade

`docs/ONLINE-LANE-UI-API.md` là bản kê những gì làn online cho phép giao diện dùng. Thêm exports mới thì
phải kê, nếu không thì lần sau người đọc tài liệu sẽ dựng lại một cơ chế đã có.

**(a)** Danh sách export. Find and replace:

```md
  OnlineGuidedMatchSettings,                              // Settings: "Độ khớp khi dẫn theo kịch bản"
  GUIDED_MATCH_OPTIONS, GUIDED_MATCH_DEFAULT, GUIDED_MATCH_KEY,
  loadGuidedMatch, saveGuidedMatch, guidedMatchFloor, guidedMatchLabel, type GuidedMatch,
  type OnlineConfigStatus, type OnlineDirection,
  type LaneLine, type LaneStatus, type OnlineDiagnostics, type TtsGateMode, type SaveOutcome,
} from '../lib/lanes/online'
```

with

```md
  OnlineGuidedMatchSettings,                              // Settings: "Độ khớp khi dẫn theo kịch bản"
  GUIDED_MATCH_OPTIONS, GUIDED_MATCH_DEFAULT, GUIDED_MATCH_KEY,
  loadGuidedMatch, saveGuidedMatch, guidedMatchFloor, guidedMatchLabel, type GuidedMatch,
  OnlineLivePromoteSettings,                              // Settings: "Nhả câu sớm" (mặc định TẮT)
  LIVE_PROMOTE_OPTIONS, LIVE_PROMOTE_DEFAULT, LIVE_PROMOTE_KEY, LIVE_PROMOTE_MIN_CHARS,
  loadLivePromote, saveLivePromote, livePromoteStableMs, livePromoteLabel, decidePromotion,
  type LivePromote,
  type OnlineConfigStatus, type OnlineDirection,
  type LaneLine, type LaneStatus, type OnlineDiagnostics, type TtsGateMode, type SaveOutcome,
} from '../lib/lanes/online'
```

**(b)** Và hai mục mô tả, đặt ở cuối tệp. Find and replace:

```md
`sentenceMs`/`longMs` are inert and exist only to keep the option shape uniform; `rhythmUsesManualCommit`
is the predicate every caller must ask, never `rhythmCommitWindows`. Line breaking moves entirely to the
display layer: sentence-ending punctuation, then 2–3 sentences grouped by `paragraphStream`.

```

with

```md
`sentenceMs`/`longMs` are inert and exist only to keep the option shape uniform; `rhythmUsesManualCommit`
is the predicate every caller must ask, never `rhythmCommitWindows`. Line breaking moves entirely to the
display layer: sentence-ending punctuation, then 2–3 sentences grouped by `paragraphStream`.

## Nhả câu sớm — cutting sentences out of the live partial (`livePromote.ts`, lives in Settings)

**Settings → "Chế độ ONLINE — Nhả câu sớm"** (`Section id="lp"`, component `OnlineLivePromoteSettings`).
Same shape as the two knobs above: one localStorage key, re-read by the lane on EVERY partial, so a
change applies mid-session. Four steps — `off` (default) / `careful` 900ms / `normal` 650ms / `fast`
450ms.

What it changes. Until now every downstream stage — the bold subtitle, the refined translation, the
spoken voice, the saved line — waited for the recogniser to CLOSE ITS TURN. Closing a turn is the
vendor's decision, and on a hall microphone running automatic gain control it is a rare one (04/08: a
session in which the vendor closed no turn at all). The partial, by contrast, never stops. This knob cuts
finished sentences straight out of it.

`decidePromotion` is pure and takes its own dependencies, so the whole rule reads in one place. A prefix
is promoted only when all of: a strong sentence break exists (`findLastStrongSentenceBreak`); the prefix
has not changed by one character for `stableMs`; it clears a language-scaled floor
(`segmentCharLimit(LIVE_PROMOTE_MIN_CHARS, …)`); and it is a complete unit — a prefix ending in `。！？!?`
qualifies outright, an ASCII `.` additionally needs whitespace after it, which is what keeps
`www.esuhai.com` from being cut in half.

The promoted text goes through `acceptFinalText`, **the same function a vendor-committed sentence goes
through** — every ghost guard, the script matcher, the segment buffer, refine, TTS and the saved
transcript. Turning this knob on must never be a way to silently bypass those. When the turn does close,
`stripPromotedPrefix` subtracts what was already promoted, and only on an EXACT prefix match: if the
recogniser revised those words, the corrected text is kept and the sentence repeats rather than losing
words. `diag.promotions` counts sentences released this way.

## The 25s ceiling waits for a gap (`planForceCommit`)

`SCRIBE_MANUAL_FORCE_COMMIT_MS` (25s) bounds how long one turn may hold the microphone. It used to fire
the instant the timer expired, and a commit cuts the AUDIO — the 08/05 rehearsal transcript contains
`"…đặc biệt của Esuh" | "ai lên phát biểu khai mạc."`, the company name bisected, each half then
translated on its own. The recogniser's text runs several hundred ms behind the audio, so no text-level
test can make that cut safe; only the microphone can. `planForceCommit` therefore holds the ceiling until
`lastLoudAt` shows ~220ms of quiet — an ordinary gap between two words — re-checking every 120ms, with a
10s grace after which it commits regardless so the hold can never hang. `diag.forceGapWaits` /
`diag.forceGapWaitMaxMs` report it.

```

</what_to_do>

<verify>

Chạy đúng ba lệnh này, **từ trong thư mục gốc của dự án**:

```bash
npx tsc -b --noEmit      # phải im lặng hoàn toàn
npx vitest run           # phải 0 đỏ · 878 passed | 1 skipped (879) · 65 tệp
npm run build            # phải xong, không lỗi
```

Con số test đi từ **842 → 879**. Cộng thêm đúng 37 ca, ở ba tệp mới:

| Tệp test mới | Số ca | Ghim cái gì |
|---|---|---|
| `tests/asrTagWait.test.ts` | 8 | trần 600ms nhả câu đúng lúc, và bản có nhãn về muộn **không** thành câu thứ hai |
| `tests/livePromote.test.ts` | 19 | ba lớp chống nhả bậy · tiếng Nhật nhả được · `www.esuhai.com` không bị cắt · phép trừ khi lượt chốt |
| `tests/forceCommitGap.test.ts` | 10 | trần 25s chờ khe im, và cái chờ đó **luôn kết thúc** |

Không có tệp test nào bị xoá. Đúng **một** tệp test cũ bị sửa (`tests/mishearingWiring.test.ts`, TASK 68),
và số ca của nó không đổi.

**Bốn phép kiểm nhanh bằng mắt:**

```bash
grep -c "acceptFinalText(" src/lib/lanes/online/onlineLane.ts   # phải ra 3 (1 khai báo + 2 lời gọi)
grep -c "nextScribeForceCommitDelay" src/lib/lanes/online/onlineLane.ts   # phải ra 0
grep -rn "proyaku_online_live_promote" src/ | wc -l   # phải ra 1 — đúng một chỗ giữ khoá
grep -rn "LIVE_PROMOTE_DEFAULT: LivePromote = 'off'" src/lib/lanes/online/livePromote.ts   # phải có
```

Số thứ hai ra **0** là đúng, không phải hỏng: `armForceCommit` nay hỏi `planForceCommit`, và chính hàm đó
mới gọi tới `nextScribeForceCommitDelay` bên trong `scribeManualCommit.ts`.

**Rồi chạy thử thật.** Bật máy chủ, mở màn điều khiển, Bắt đầu, nói liên tục khoảng một phút:

1. Vào **Cài đặt → "Chế độ ONLINE — Nhả câu sớm"**. Mục này phải có, phải nằm **ngay dưới** mục "Độ khớp
   khi dẫn theo kịch bản", và phải đang ở nấc **Tắt**.
2. Mở **Chẩn đoán** ở màn điều khiển. Dòng `chờ nhãn …` phải có số. Nếu `nhả sớm` ở dòng đó **lớn hơn 0**
   thì đúng là cái khựng gần một giây có thật, và trần 600ms đang làm việc.
3. Chọn nấc **Thường**, **không cần Dừng**, nói tiếp. Số `nhả sớm N câu` trên dòng `cắt` phải bắt đầu tăng.
   Vẫn 0 khi đang nói liên tục nghĩa là chưa câu nào đứng yên đủ lâu — hạ xuống **Nhanh**.
4. Chọn lại **Tắt**, nói tiếp. `N` phải **đứng im**, không tăng nữa. Đây là phép thử quan trọng nhất: nó
   chứng minh nấc Tắt thật sự tắt.

</verify>

<report_back>

Báo lại đúng năm điều, ngắn gọn:

1. Ba lệnh ở phần `<verify>` ra gì — **dán nguyên văn dòng kết quả của `npx vitest run`**.
2. Có tệp test nào đỏ ngoài dự kiến không. Có thì dán tên tệp và dòng lỗi, **đừng sửa test**.
3. Bốn phép kiểm `grep` ra đúng bốn con số 3 / 0 / 1 / có chứ.
4. Bốn bước chạy thử ở trên, bước nào không đúng như mô tả.
5. Nếu có chạy thử được với người nói thật: `chờ nhãn … lâu nhất …` là bao nhiêu mili-giây, và `trần 25s
   chờ khe im` có hiện ra không. Hai số đó là thứ tôi cần để chỉnh tiếp.

**Chưa commit vội.** Báo lại trước, tôi xem số rồi mới chốt — riêng lần này có ba chỗ đổi đường chạy cùng
lúc, và tôi muốn nhìn số thật trước khi nó nằm trong nhánh.

</report_back>
