# PROMPT-11 — PHẦN 2B: vá lỗi nuốt mất câu nói lặp

**Nhánh nền:** `develop` tại commit **`87016a4`** — tức **ngay sau khi PHẦN 2 đã áp và commit xong**.
**Làm phần này TRƯỚC PHẦN 3.** Nó nhỏ: **đúng 2 tệp**, **1 khối mã**, **1 ca kiểm thử viết lại**.
**Số bài kiểm thử KHÔNG đổi: vẫn 547.** Không thêm ca mới, không bớt ca nào.

---

## Gửi em

Đây **không phải phần mới**. Đây là Thầy **sửa lỗi của chính Thầy**.

Em báo lên đúng: hai câu "Vâng." nói liền nhau thì câu thứ hai biến mất. Thầy đã tự dựng phép thử
chạy thẳng vào mã, và ra đúng kết quả em đo được:

| Thứ tự tín hiệu máy nghe gửi về | Đáng lẽ | Thực tế |
|---|---|---|
| "Vâng." (bản thường) → "Vâng." (bản có nhãn) → "Vâng." → "Vâng." | 2 câu | **1 câu** |
| "Vâng." → "Vâng." (không có bản có nhãn) | 2 câu | 2 câu ✓ |
| "Vâng." → "Cảm ơn." | 2 câu | 2 câu ✓ |

Em làm đúng cả ba việc: **không tự vá** khi prompt ghi mã nguyên văn, **không tin lời máy** mà tự
dựng phép thử, và **báo lên** thay vì im lặng. Lần sau gặp kiểu này cứ làm y như vậy.

**Vì sao phải sửa gấp:** ở lễ, một người nói "Vâng." rồi "Vâng." liền, hoặc "はい。" rồi "はい。",
là chuyện xảy ra vài chục lần một buổi. Mỗi lần như thế **một câu bay sạch** — không hiện trên màn,
không có bản dịch, không có giọng đọc, và không có trong bản ghi lưu lại. Không ai biết là đã mất.

**Chỗ sai nằm ở đâu, nói cho dễ hiểu:** máy nhớ "câu vừa rồi thuộc loại nào" để nhận ra bản sao.
Nhưng khi nó **bỏ đi một bản sao**, nó quên cập nhật cái ghi nhớ đó. Thế là cặp thứ hai bị đem so
với cặp thứ nhất, và bị bỏ luôn cả cặp. **Thêm đúng một dòng ghi nhớ là xong.**

**Việc em phải làm:** áp khối mã dưới đây, viết lại ca kiểm thử số 7 cho đúng, chạy lại bộ kiểm,
commit tại chỗ. Xong thì mới sang PHẦN 3.

---

## TASK 8B — cửa lọc bản sao phải nhớ cả bản nó vừa bỏ đi

### 8B.1 `src/lib/lanes/online/asrTransport.ts`

Trong `case 'final_transcript':` / `case 'final_transcript_with_timestamps':`, find:

```ts
          // Swallow the twin — and only the twin. Three conditions, each earning its place:
          //   * same WORDS, not the same string: the two passes disagree about punctuation and width;
          //   * the OTHER kind of final from the one just emitted: a genuine repeat ("Vâng." twice) opens
          //     its own plain-then-timestamped pair, and its first half is the same kind as the one
          //     already emitted, so it is let through;
          //   * inside the window, so a sentence legitimately repeated a minute later is never lost.
          if (lastFinalKey !== null && finalKey === lastFinalKey && timestamped !== lastFinalTimestamped && now - lastFinalAt < FINAL_DEDUP_MS) {
            return null;
          }
```

and replace with:

```ts
          // Swallow the twin — and only the twin. Three conditions, each earning its place:
          //   * same WORDS, not the same string: the two passes disagree about punctuation and width;
          //   * the OTHER kind of final from the one just emitted — and the memory below must be updated
          //     INSIDE this branch too, because the kind that matters next is the one just swallowed,
          //     not the one last emitted;
          //   * inside the window, so a sentence legitimately repeated a minute later is never lost.
          //
          // 04/08/2026 — measured, not reasoned. The third bullet's original wording claimed a genuine
          // repeat "is let through". Driving the codec with plain·tagged·plain·tagged of the same short
          // sentence returned ONE event, not two: the second "Vâng." produced no subtitle, no
          // translation, no voice and no line in the saved transcript, in silence. The plain half of the
          // second pair never reaches this test at all — the twin-wait above holds it — so its tagged
          // half was the only survivor, and it was compared against a flag still stuck on the FIRST
          // pair's plain half. In a ceremony "Vâng." "Vâng." and "はい。" "はい。" recur dozens of times
          // an hour, which is how often a whole sentence was disappearing.
          if (lastFinalKey !== null && finalKey === lastFinalKey && timestamped !== lastFinalTimestamped && now - lastFinalAt < FINAL_DEDUP_MS) {
            lastFinalTimestamped = timestamped;
            return null;
          }
```

`lastFinalKey` and `lastFinalAt` are deliberately NOT refreshed here: the window must keep measuring
from the last sentence actually EMITTED, so three pairs in a row still produce three events rather than
sliding the window forward on swallowed twins. That is measured too — see case 7 below.

### 8B.2 `tests/finalDedup.test.ts` — rewrite case 7, add nothing

Case 7 currently records the broken behaviour (you rewrote it and documented why — that was the right
call at the time). Put it back to the truth, and make it prove more than it did before.

Find the single `it(...)` covering "two full pairs of `Vâng.` back to back". Replace **that one `it(`
block only** — do not touch any other case, and do not add or remove an `it(`. The file must still hold
exactly **14** of them.

The rewritten case, using whichever driver helpers the file already has:

1. `plain('Vâng.')`, `timestamped('Vâng.')`, `plain('Vâng.')`, `timestamped('Vâng.')` → **two** emitted
   `conversation.item.input_audio_transcription.completed` events, and both transcripts equal `'Vâng.'`.
2. In the same case, three pairs back to back → **three** events. This is what pins the decision not to
   refresh `lastFinalAt` inside the swallow branch: refresh it and the third pair starts measuring from a
   twin instead of from a sentence.
3. In the same case, the Japanese shape `はい。` × 2 pairs → **two** events. Same bug, other language,
   and the one an Esuhai ceremony actually produces most.

Replace the Vietnamese note you left in the file with one line saying the behaviour it used to record was
a real defect, fixed on 04/08/2026 by TASK 8B, and that the prompt's original expectation was right.

---

# Khi xong PHẦN 2B

Chạy đúng ba lệnh này, **từ trong thư mục dự án**:

```
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
npx oxlint
```

Mong đợi: **547 test đậu** (không đổi so với PHẦN 2), tsc sạch, oxlint không lỗi mới.

Bốn phép kiểm tay:

1. `git diff --stat` → **đúng 2 tệp**: `src/lib/lanes/online/asrTransport.ts` và
   `tests/finalDedup.test.ts`. Không tệp nào khác.
2. `git grep -c "lastFinalTimestamped" -- src/` → **5 dòng** (trước khi vá là 4). Đúng một dòng mới,
   và nó nằm trong nhánh `return null`.
3. `git grep -c '  it(' -- tests/finalDedup.test.ts` → **14**, y như trước.
4. `git status --porcelain` → `package.json`, `package-lock.json`, `server/` **không có tệp nào** trong
   danh sách.

Commit tại chỗ với thông điệp `PROMPT-11 PART 2B — vá lỗi nuốt mất câu nói lặp`, **chưa push**, rồi báo
lại như lần trước. Xong mới sang PHẦN 3.

Nếu bất cứ chỗ nào trong tệp này không khớp với mã em đang có, **dừng lại và báo** thay vì đoán —
lần trước em làm đúng như vậy và nhờ thế mới tìm ra lỗi này.
