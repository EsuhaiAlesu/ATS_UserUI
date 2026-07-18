# BƯỚC 0 — RUNBOOK DỰNG & CHỨNG MINH BACKEND HanDichThuat TRÊN MAC STUDIO M3 ULTRA (Apple Silicon / Metal-MPS, KHÔNG CUDA)

> Tài liệu vận hành cho đội kỹ thuật Esuhai. Chạy TỪ TRÊN XUỐNG, ngay trên chính Mac Studio M3 Ultra (96GB, macOS, arm64) sẽ dùng cho gala.
> Mục tiêu tối thượng: **chứng minh backend khởi động được + ra được phụ đề trên Metal**, rồi mới tối ưu; cuối cùng bàn giao một BẢNG SỐ ĐO cho tác giả frontend (Thầy) tinh chỉnh.
>
> **Sự thật quan trọng cần thành thật với nhau:** chúng ta CHƯA có mã nguồn HanDichThuat (repo `github.com/HarryDoan123/HanDichThuat` đang trả **404** — private hoặc đã gỡ). Vì vậy mọi thứ phụ thuộc repo (tên gói chính xác, cách tải model, lệnh chạy, cách code chọn device) đều được đánh dấu **[XÁC NHẬN TRONG REPO]** với một default hợp lý — KHÔNG được coi là sự thật cho tới khi đội mở repo ra kiểm chứng. Hợp đồng duy nhất ta có là `ATS_UserUI_EsuhaiAlesu/docs/API.md` + `docs/INTEGRATION.md` của chính frontend.
>
> **Quy ước nhãn dùng xuyên suốt:**
> - **[XÁC NHẬN TRONG REPO]** — chỗ phụ thuộc mã nguồn, phải mở repo xác minh, không bịa.
> - **[ĐO]** — con số phải ghi lại để bàn giao frontend.
> - **[QUYẾT ĐỊNH]** — ngã ba go/no-go cần chốt trước rehearsal 7/8.

---

## 0) Mục tiêu & Nguyên tắc

**Bối cảnh sự kiện:** Gala kỷ niệm 20 năm Esuhai — tổng duyệt **7/8/2026**, gala **8/8/2026** (còn ~3 tuần). Định hướng audit đã chốt: gala là **SUBTITLES-PRIMARY** (phụ đề làm chính) + có **phiên dịch người** + một **Mac thứ 2 warm dự phòng**. "Token cost" KHÔNG liên quan (model chạy local) — thứ cần tối ưu là **độ trễ** và **độ tin cậy**.

**Ngân sách độ trễ (phải xác nhận bằng số THẬT trên Mac, không dùng số lý thuyết):**
- partial ≤ **900 ms**
- final ≤ **1800 ms**
- spoken ≤ **2500 ms**

**Ba nguyên tắc chỉ đạo:**
1. **Subtitles-primary** — phụ đề là điều bắt buộc. TTS (đọc thành tiếng), LLM sidecar (dự đoán/ngữ cảnh), tách 2 luồng loa... đều là **lớp tối ưu thêm**, có thể cắt nếu rủi ro.
2. **Prove-it-starts-then-optimize** — con đường ngắn nhất tới "server lên + ra phụ đề trên Metal" trước, sau đó mới đụng vào tốc độ và tính năng nâng cao. **Đơn giản = an toàn hơn.**
3. **Xin quyền repo TRƯỚC** — không có repo thì không có requirements/model/lệnh chạy; toàn bộ Bước 0 đứng lại. Đây là blocker cứng, nằm trên mọi thứ.

**Điểm chạm CUDA duy nhất trong hợp đồng:** API.md §8 nói LLM sidecar (Qwen2.5-1.5B-Instruct-GGUF) chạy tiến trình riêng "với CUDA context riêng". Trên Mac KHÔNG có CUDA — bản tương đương là **build METAL** của llama.cpp. Cách STT/MT chọn device thì hợp đồng IM LẶNG → phải grep repo mới biết (Mục 5).

**Đầu ra bàn giao frontend sau Bước 0:** (1) kết quả `mps.is_available`; (2) BẢNG role → model → GPU(MPS)/CPU → cold-load ms; (3) danh sách model chính xác trong dropdown `/api/blocks`; (4) `/api/audio/devices` + `/api/audio/outputs`; (5) trả lời 3 giả định chưa xác minh.

> **Definition of done (0):** Cả đội thống nhất mục tiêu subtitles-primary, ngân sách latency, và thứ tự "chạy được trước — tối ưu sau".

---

## 1) Chuẩn bị máy & Lấy mã nguồn

### 1.1 — Cửa chặn #0: Lấy quyền truy cập repo private HanDichThuat  **[QUYẾT ĐỊNH]**

URL `github.com/HarryDoan123/HanDichThuat` hiện **404**. KHÔNG có repo thì toàn bộ Bước 0 dừng. Việc đầu tiên: xin quyền đọc repo (hoặc bản `.zip` nguồn + thư mục `models/deploy/`) từ **HarryDoan123** hoặc **HoangKha (hoangkha@esuhai.com)**. Xác nhận rõ 3 điều: (a) cách phát hành mã (git hay zip), (b) trọng số model lấy ở đâu (kèm repo / tải HuggingFace / ổ riêng), (c) file requirements/environment và lệnh chạy chính thức.

```bash
gh repo view HarryDoan123/HanDichThuat 2>&1 | head -5 || echo 'Chua co quyen — lien he HoangKha (hoangkha@esuhai.com) / HarryDoan123'
```

- **Mong đợi:** khi đã được cấp quyền, lệnh in metadata repo thay vì 404. Có trong tay: link repo chạy được + vị trí model + file requirements.
- **Nếu lỗi:** còn 404/Could not resolve → CHƯA có quyền, đây là blocker cứng, KHÔNG đi tiếp bất kỳ bước cài đặt nào. Nếu chỉ nhận được `.zip` (không phải git) → bỏ qua bước clone, giải nén vào thư mục dự án, giữ nguyên các bước còn lại.

### 1.2 — Xcode Command Line Tools (compiler cho gói build-from-source)  **[ĐO]**

`sentencepiece`, `tokenizers`, `llama-cpp-python`, PortAudio... thường phải biên dịch trên arm64 → cần clang/make/headers.

```bash
xcode-select --install 2>/dev/null; xcode-select -p
```

- **Mong đợi:** in `/Library/Developer/CommandLineTools` (hoặc đường dẫn Xcode.app). Nếu bảng cài hiện ra, bấm Install và chờ xong.
- **Nếu lỗi:** `unable to install` → tải CLT thủ công từ developer.apple.com/download, hoặc cài full Xcode rồi: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.

### 1.3 — Xác minh Homebrew là bản arm64 (`/opt/homebrew`), KHÔNG phải x86 dưới Rosetta

Bẫy kinh điển Apple Silicon: brew cài nhầm ở `/usr/local` (x86, qua Rosetta) khiến mọi thư viện native (PortAudio, ffmpeg) là x86 và không khớp Python arm64 → lỗi `mach-o, but wrong architecture`.

```bash
which brew && brew config | grep -E 'HOMEBREW_PREFIX|Rosetta|macOS|CPU' && arch
```

- **Mong đợi:** `HOMEBREW_PREFIX` = `/opt/homebrew`; `Rosetta: false`; `arch` in `arm64`. Nếu chưa có brew:
  `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- **Nếu lỗi:** prefix là `/usr/local` hoặc `Rosetta: true` → đang dùng brew x86. Cài lại brew arm64 vào `/opt/homebrew`, và đảm bảo Terminal KHÔNG bật "Open using Rosetta" (Finder → Applications → Terminal → Get Info → bỏ tick).

### 1.4 — Clone repo (hoặc giải nén zip)  **[XÁC NHẬN TRONG REPO]**

```bash
cd ~/Projects 2>/dev/null || mkdir -p ~/Projects && cd ~/Projects
# [XÁC NHẬN TRONG REPO] URL/nhánh chính xác:
git clone https://github.com/HarryDoan123/HanDichThuat.git
cd HanDichThuat
```

- **Mong đợi:** repo về máy, thấy `webui/app.py`, `models/deploy/`, file requirements.
- **Nếu lỗi:** clone 404 → quay lại 1.1. Nếu chỉ có `.zip` → giải nén vào `~/Projects/HanDichThuat` rồi tiếp tục.

> **Definition of done (1):** repo (hoặc zip nguồn) đã nằm trên Mac, `xcode-select -p` có đường dẫn, brew là arm64 tại `/opt/homebrew`.

---

## 2) Môi trường Python + PyTorch-MPS

### 2.1 — Miniforge (Conda arm64, thân thiện ML)

Miniforge (kênh conda-forge) build sẵn arm64, ít vỡ ABI hơn venv thuần khi gặp `sentencepiece`/`ctranslate2`. Có thể thay bằng venv nếu repo yêu cầu — **[XÁC NHẬN TRONG REPO]** xem có `environment.yml` hay `requirements.txt`.

```bash
brew install miniforge && conda init zsh && echo 'Mo lai Terminal sau khi init'
```

- **Nếu lỗi:** `conda: command not found` sau init → `source ~/.zshrc` hoặc mở tab mới. brew miniforge lỗi → tải installer arm64:
  `curl -L -O https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-MacOSX-arm64.sh && bash Miniforge3-MacOSX-arm64.sh`

### 2.2 — Tạo môi trường Python cô lập (Python 3.11)  **[XÁC NHẬN TRONG REPO]**

3.11 là mốc an toàn cho stack ML hiện tại (torch/transformers/ctranslate2 đều có wheel arm64). **[XÁC NHẬN TRONG REPO]** phiên bản Python đúng trong `environment.yml`/`pyproject`/README trước khi chốt. Nếu repo có `environment.yml` thì dùng nó thay vì tạo tay.

```bash
cd ~/Projects/HanDichThuat
conda create -y -n handich python=3.11 && conda activate handich
python -c 'import platform; print(platform.machine(), platform.python_version())'
```

- **Mong đợi:** in `arm64 3.11.x`. Nếu in `x86_64` → Python chạy dưới Rosetta, tạo lại env bằng conda arm64.
- **Nếu lỗi:** có `environment.yml` → `conda env create -f environment.yml` thay cho `create -n`.

### 2.3 — PyTorch bản MPS (wheel arm64 mặc định từ PyPI — TUYỆT ĐỐI KHÔNG index CUDA)

Trên Mac, wheel torch mặc định của PyPI đã kèm backend MPS (Metal). **TUYỆT ĐỐI không** thêm `--index-url .../cu121` (CUDA cho Linux/Windows, sẽ hỏng). **[XÁC NHẬN TRONG REPO]** version torch đúng theo requirements; ở đây cài bản ổn định mới nhất làm default (nên torch ≥ 2.2 để phủ nhiều op MPS hơn).

```bash
pip install --upgrade pip
pip install torch torchvision torchaudio
```

- **Nếu lỗi:** kéo về wheel CUDA hoặc `no matching distribution` → kiểm tra `which pip` phải nằm trong `~/miniforge3/envs/handich`. Nếu requirements ghim version, dùng bản đó: `pip install torch==<ver>`.

### 2.4 — Kiểm chứng MPS thực sự khả dụng + bật fallback  **[ĐO]**

Phép thử sống-còn: nếu MPS không available thì mọi model torch (Qwen3-ASR, có thể cả NLLB) rơi về CPU và chậm nhiều lần. `PYTORCH_ENABLE_MPS_FALLBACK=1` để op nào Metal chưa hỗ trợ tự rớt về CPU thay vì crash. `HIGH_WATERMARK_RATIO=0.0` gỡ trần cấp phát MPS giả (an toàn với 96GB unified).

```bash
export PYTORCH_ENABLE_MPS_FALLBACK=1
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
export TOKENIZERS_PARALLELISM=false
PYTORCH_ENABLE_MPS_FALLBACK=1 python - <<'PY'
import torch
print('torch', torch.__version__)
print('mps.is_available', torch.backends.mps.is_available())
print('mps.is_built', torch.backends.mps.is_built())
print('cuda.is_available', torch.cuda.is_available())
x = torch.rand(3, device='mps'); print('mps tensor ok:', (x*2).sum().item())
PY
```

- **Mong đợi [ĐO]:** `mps.is_available = True`, `mps.is_built = True`, `cuda.is_available = False` (đúng kỳ vọng trên Mac), in được `mps tensor ok`. **Ghi lại kết quả này để bàn giao frontend.**
- **Nếu lỗi:** `is_available False` → torch build sai (x86/CPU-only), gỡ và cài lại trong env arm64. `MPS backend out of memory` dù tensor bé → export lại watermark trong CÙNG shell.

### 2.5 — Cài phụ thuộc chính từ requirements của repo  **[XÁC NHẬN TRONG REPO]**

Nguồn sự thật cho toàn bộ gói còn lại — **[XÁC NHẬN TRONG REPO]** tên file (`requirements.txt`/`pyproject.toml`/`poetry.lock`). Cài **SAU torch** để pip không kéo bản torch khác đè lên bản MPS. Nếu file ghim torch bản CUDA, **sửa/loại dòng đó trước** khi chạy.

```bash
test -f requirements.txt && pip install -r requirements.txt || echo '[XAC NHAN TRONG REPO] khong thay requirements.txt — kiem tra pyproject.toml / setup.py / environment.yml'
```

- **Mong đợi:** cài xong không lỗi. Ghi lại mọi gói phải build-from-source (thường `sentencepiece`, `tokenizers`, `ctranslate2`, `llama-cpp-python`).
- **Nếu lỗi:** build `sentencepiece`/`tokenizers` lỗi → cần cmake + rust: `brew install cmake && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`, rồi chạy lại. Gói không có wheel arm64 → tìm version mới hơn có wheel.

> **Definition of done (2):** trong env `handich` arm64, `torch.backends.mps.is_available()==True` và requirements đã cài xong không lỗi kiến trúc.

---

## 3) Model + VOICEVOX

### 3.1 — STT Qwen3-ASR-1.7B: xác nhận runtime (transformers/torch trên MPS)  **[XÁC NHẬN TRONG REPO]**

Qwen3-ASR gần như chắc chạy qua HuggingFace transformers + torch → dùng MPS. **[XÁC NHẬN TRONG REPO]** repo dùng transformers thẳng hay wrapper (modelscope, hoặc faster-whisper cho fallback ASR). Nếu dùng faster-whisper → nó chạy trên CTranslate2 (xem caveat 3.2).

```bash
pip show transformers accelerate sentencepiece 2>/dev/null | grep -E 'Name|Version'
pip show faster-whisper 2>/dev/null | grep -E 'Name|Version' || echo 'khong dung faster-whisper (hoac chua cai)'
```

- **Mong đợi:** transformers + accelerate + sentencepiece có mặt. Ghi nhận: Qwen3-ASR dự kiến chạy **GPU (MPS)**. Xác nhận cuối bằng `POST /api/warm` ở Mục 4.
- **Nếu lỗi:** thiếu accelerate/sentencepiece → `pip install accelerate sentencepiece`. Nếu ASR fallback là whisper qua CTranslate2 → biết trước nó CPU-only trên Mac, chậm — cân nhắc whisper.cpp bản Metal.

### 3.2 — MT NLLB (600M/1.3B): CẢNH BÁO CTranslate2 KHÔNG có backend Metal → CPU-only  **[XÁC NHẬN TRONG REPO]**

Nếu repo dịch NLLB qua **CTranslate2** thì trên Mac nó **CHỈ chạy CPU** — không có Metal GPU. Đây là caveat kiến trúc THẬT, không phải lỗi cài. Với M3 Ultra CPU vẫn khá, nhưng phải **[ĐO]** độ trễ dịch dưới tải. Nếu dịch qua transformers/torch thì chạy được MPS. Phải phân biệt bằng grep repo.

```bash
pip show ctranslate2 2>/dev/null | grep -E 'Name|Version' && python -c 'import ctranslate2; print("CT2 cpu types:", ctranslate2.get_supported_compute_types("cpu"))' 2>/dev/null
# [XAC NHAN TRONG REPO]: NLLB chay qua ctranslate2 hay transformers?
grep -rniE 'ctranslate2|CTranslator|transformers.*nllb|AutoModelForSeq2Seq' --include='*.py' . | head -20
```

- **Mong đợi:** biết rõ NLLB đi đường nào. CT2 → đánh dấu **MT = CPU-only trên Mac** trong bảng bàn giao; `get_supported_compute_types('cpu')` trả `int8/int8_float32/float32` (không có `cuda`).
- **Nếu lỗi:** CT2 lỗi cài arm64 → `pip install ctranslate2 --upgrade`. Nếu độ trễ CPU quá cao khi đo → **[QUYẾT ĐỊNH]** chuyển MT sang bản transformers (MPS) hoặc dùng NLLB-600M thay 1.3B.

### 3.3 — Đặt/tải trọng số model vào `models/deploy/`  **[XÁC NHẬN TRONG REPO]**

Backend khám phá model bằng cách quét `models/deploy/` (API.md §8: dropdown options trong `GET /api/blocks` refresh từ đây mỗi lần gọi). Cách lấy trọng số **[XÁC NHẬN TRONG REPO]**: kèm repo? script tải? HuggingFace? Tên thư mục con phải khớp **từng ký tự** với chuỗi dropdown (`Qwen3-ASR-1.7B`, `NLLB-600M`, `NLLB-1.3B`, `Qwen2.5-1.5B-Instruct-GGUF`).

```bash
ls -la models/deploy/ 2>/dev/null || echo '[XAC NHAN TRONG REPO] chua co models/deploy — hoi chu backend cach lay trong so'
# Neu tai tu HuggingFace (default hop ly, ten repo/HF chinh xac PHAI xac nhan):
# pip install huggingface_hub && huggingface-cli download <org>/<model> --local-dir models/deploy/<TEN-KHOP-DROPDOWN>
```

- **Mong đợi:** `models/deploy/` chứa thư mục con đúng tên. Sau khi backend chạy, `/api/blocks` liệt kê đúng các model này.
- **Nếu lỗi:** dropdown rỗng/thiếu → sai tên thư mục hoặc sai vị trí. Model GGUF phải là 1 file `.gguf`; model transformers là cả thư mục (`config.json` + weights). **Chuẩn bị model TỪ TRƯỚC, đừng tải lần đầu tại venue/mạng gala.**

### 3.4 — TTS JA: dựng VOICEVOX engine trên `127.0.0.1:50021` (native, KHÔNG Docker)  **[XÁC NHẬN TRONG REPO]**

`POST /api/tts/voices?engine=voicevox` cần engine VOICEVOX lắng nghe :50021. Trên Mac dùng bản **NATIVE** (VOICEVOX.app hoặc `voicevox_engine` macOS-arm64) — bản Docker chính thức là image Linux/CPU, chạy qua emulation, chậm. Bản "GPU" của VOICEVOX chỉ cho NVIDIA/CUDA → trên Mac dùng bản CPU. TTS VI (vieneu on-box, gpt-sovits) đi kèm repo — **[XÁC NHẬN TRONG REPO]**.

```bash
curl -s http://127.0.0.1:50021/version || echo 'VOICEVOX chua chay — mo VOICEVOX.app hoac chay voicevox_engine (macOS arm64) tu github.com/VOICEVOX/voicevox_engine/releases'
```

- **Mong đợi:** engine chạy → `/version` trả chuỗi phiên bản; `/speakers` trả JSON danh sách giọng.
- **Nếu lỗi:** không kết nối → engine chưa chạy hoặc cổng khác. Mở VOICEVOX.app (nó tự bật engine), hoặc tải `voicevox_engine` bản CPU macOS-arm64 và chạy `./run`. Nếu chỉ smoke-test phụ đề (không TTS) → có thể hoãn bước này.

> **Definition of done (3):** `models/deploy/` có đủ thư mục model đúng tên; đã biết NLLB đi CT2(CPU) hay transformers(MPS); nếu cần TTS JA thì VOICEVOX trả `/version` ở :50021.

---

## 4) Chạy backend & Kiểm health

### 4.1 — Audio I/O: PortAudio native cho sounddevice

Backend liệt kê thiết bị qua `GET /api/audio/devices`, gần như chắc dùng `python-sounddevice` cần thư viện native PortAudio (cài qua brew arm64).

```bash
brew install portaudio
pip install sounddevice
python -c 'import sounddevice as sd; print(sd.query_devices())'
```

- **Mong đợi:** in danh sách thiết bị audio (mic, output) — chính dữ liệu mà `/api/audio/devices` sẽ trả.
- **Nếu lỗi:** `PortAudio library not found` → `brew reinstall portaudio; pip install --force-reinstall --no-binary :all: sounddevice`. Danh sách rỗng → cấp quyền Micro cho Terminal (System Settings → Privacy & Security → Microphone).

### 4.2 — Khởi động backend lần đầu + health check  **[ĐO]**

Điểm vào là `webui/app.py`, bind `http://127.0.0.1:8080` (API.md, ~dòng 1411). **[XÁC NHẬN TRONG REPO]** lệnh chạy chính thức (`python webui/app.py`? uvicorn? `run.sh`?). **NHỚ export `PYTORCH_ENABLE_MPS_FALLBACK=1`** trước khi chạy. Đây là cửa go/no-go tối thiểu: server lên + `/api/health` xanh.

```bash
export PYTORCH_ENABLE_MPS_FALLBACK=1
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
# [XAC NHAN TRONG REPO] lenh chinh thuc; default hop ly:
python webui/app.py &
sleep 8
curl -s http://127.0.0.1:8080/api/health | python3 -m json.tool
curl -s http://127.0.0.1:8080/api/blocks | python3 -c 'import sys,json; d=json.load(sys.stdin); print("so blocks:", len(d.get("blocks",[])))'
```

- **Mong đợi [ĐO]:** `/api/health` trả `{"ok": true, "blocks": <N>}` (N > 0, tài liệu ví dụ 27); `/api/blocks` in số block > 0. Ghi lại số block + toàn bộ options model trong dropdown.
- **Nếu lỗi:** server không lên → đọc traceback (thường thiếu 1 gói, hoặc model chưa có trong `models/deploy/`). Cổng bận → `lsof -i :8080` rồi kill. Import lỗi MPS op → xác nhận đã export `PYTORCH_ENABLE_MPS_FALLBACK=1`. `ok:false` → traceback thường là model load lỗi trên MPS (sang Mục 5).

> **Definition of done (4):** `curl /api/health` trả `{"ok":true,"blocks":N>0}` và `/api/blocks` liệt kê được các model trong dropdown.

---

## 5) Port sang Metal (ASR/MT) — Chẩn đoán + Vá tối thiểu

> Hợp đồng IM LẶNG về cách STT/MT chọn device → **mọi kết luận ở Mục này phải dựa trên grep THẬT trên repo, không suy đoán.**

### 5.1 — Quét toàn repo tìm mọi điểm chạm CUDA / device / dtype  **[XÁC NHẬN TRONG REPO]**

Bước điều tra quan trọng nhất: trước khi sửa gì phải biết code chọn device kiểu nào. Grep tìm: `cuda` (điểm chạm cứng), `.to(device`/`device_map` (di chuyển tensor), `torch_dtype`/`.half()`/`float16`/`bfloat16`/`autocast` (bẫy fp16 MPS), `is_available` (đã có nhánh fallback chưa), `ctranslate2`/`compute_type` (NLLB có CPU-only không).

```bash
cd ~/Projects/HanDichThuat
rg -n -i "cuda|\.cuda\(\)|\.to\(device|device_map|torch_dtype|\.half\(\)|float16|bfloat16|autocast|is_available|ctranslate2|Translator\(|compute_type|\.mps|backends\.mps" --glob '!*.md' | tee /tmp/mps_audit.txt
echo '--- tong so hit ---'; wc -l /tmp/mps_audit.txt
```

- **Mong đợi [ĐO]:** file `/tmp/mps_audit.txt` liệt kê từng dòng. Ghi: (a) có dòng nào hardcode `device='cuda'`/`.cuda()` cho STT/MT không; (b) đã có nhánh `torch.cuda.is_available() → cpu` chưa; (c) NLLB nạp qua transformers (`AutoModelForSeq2SeqLM`) hay `ctranslate2`.
- **Nếu lỗi:** `rg` chưa cài → `brew install ripgrep` hoặc thay `grep -rniE`. Repo chưa lấy được → DỪNG, quay lại Mục 1.1.

### 5.2 — [QUYẾT ĐỊNH] Code hardcode CUDA sẽ CRASH hay tự fallback CPU?

Từ kết quả grep, phân nhánh:
- **(A)** Code dùng mẫu `device = 'cuda' if torch.cuda.is_available() else 'cpu'` → trên Mac tự về CPU, **KHỞI ĐỘNG ĐƯỢC ngay** (chậm nhưng an toàn) → đi tiếp 5.4-5.5 nâng lên MPS.
- **(B)** Code hardcode `.cuda()`/`device='cuda'`/`.to('cuda')` không nhánh điều kiện → **NÉM lỗi** `Torch not compiled with CUDA enabled` khi nạp model → **BẮT BUỘC vá (5.3)** trước khi chạy được.

```bash
grep -nE "device *= *['\"]cuda|\.cuda\(\)|to\(['\"]cuda" /tmp/mps_audit.txt
```

- **Mong đợi [QUYẾT ĐỊNH]:** kết luận rõ nhánh (A) fallback-được hay (B) phải-vá. Ghi số dòng + file của từng điểm hardcode.
- **Nếu không chắc:** chạy thẳng `webui/app.py` và đọc traceback — dòng lỗi chỉ đúng `file:line` gọi `.cuda()`. Traceback là bằng chứng, không phải phỏng đoán.

### 5.3 — Vá tối thiểu: một helper chọn device  **[XÁC NHẬN TRONG REPO]**

Nếu ra nhánh (B), vá NHỎ NHẤT: thêm 1 hàm chọn device ưu tiên `cuda → mps → cpu`, thay các chỗ hardcode `'cuda'` bằng biến này. **KHÔNG refactor rộng.** Chỉ vá đúng `file:line` grep đã chỉ. Xử lý dtype (5.4) cùng lúc vì `.to('mps')` giữ float16 dễ ra NaN.

```python
import torch
def pick_device():
    if torch.cuda.is_available():
        return 'cuda'
    if torch.backends.mps.is_available():
        return 'mps'
    return 'cpu'
```

- **Mong đợi:** sau vá, mọi `.to('cuda')`/`.cuda()` trong đường STT+MT thành `.to(pick_device())`. Backend nạp model không còn ném lỗi CUDA.
- **Nếu lỗi:** vẫn lỗi tại một op cụ thể trên `mps` → tạm cho riêng model đó về `'cpu'` để CHỨNG MINH khởi động trước, ghi **[QUYẾT ĐỊNH]** "model X tạm CPU" rồi tối ưu sau. Ưu tiên chạy-được hơn nhanh.

### 5.4 — [QUYẾT ĐỊNH] fp32 trước, fp16/bf16 sau — bẫy dtype trên MPS

Bẫy lớn nhất khi port từ CUDA: code thường nạp `torch_dtype=torch.float16`. Trên MPS, fp16 hay ra **NaN/Inf** hoặc op chưa hỗ trợ; bf16 chỉ hỗ trợ một phần. Chiến lược: chạy **fp32 trên MPS TRƯỚC** để chứng minh ĐÚNG (transcript/dịch ra chữ hợp lý), rồi mới thử fp16 so sánh. fp32 tốn ~2x RAM nhưng 96GB thừa sức.

```bash
grep -nE "torch_dtype|float16|\.half\(\)|bfloat16" /tmp/mps_audit.txt
```

- **Mong đợi [QUYẾT ĐỊNH]:** nếu có `torch_dtype=float16` → lần chạy chứng minh đầu tiên **ép về float32** trên MPS. **[ĐO]** transcript VI/JA có ra chữ đúng không, có NaN/ô vuông/rỗng không.
- **Nếu lỗi:** fp16 cho transcript rỗng/ký tự lạ nhưng fp32 tốt → đúng là bẫy fp16 MPS: **giữ fp32 cho gala** (ổn định > tốc độ). Nếu cả fp32 cũng sai → vấn đề không ở dtype, kiểm tiền xử lý audio/tokenizer.

### 5.5 — Thực tế CTranslate2 với NLLB — không có backend Metal  **[XÁC NHẬN TRONG REPO]**

Nếu 5.1 thấy `import ctranslate2` cho NLLB: CT2 **KHÔNG có backend Metal/MPS** — trên Apple Silicon CHỈ chạy CPU (Accelerate/NEON, int8). Tin tốt: CT2 CPU int8 trên M3 Ultra khá nhanh cho model 600M, có thể ĐỦ. Cần đo (5.6). Nếu không đủ, phương án thay thế là NLLB qua transformers (MPS) — nhưng path đó **[XÁC NHẬN TRONG REPO]** repo có sẵn không, đừng tự thêm.

```bash
python3 -c "import ctranslate2; print('ct2', ctranslate2.__version__); print('cpu types', ctranslate2.get_supported_compute_types('cpu'))" 2>&1 | head
# Xac nhan KHONG co duong Metal (bao loi/khong co 'cuda' -> dung ky vong):
python3 -c "import ctranslate2; print(ctranslate2.get_supported_compute_types('cuda'))" 2>&1 | head -3
```

- **Mong đợi:** CPU types gồm `int8/int8_float32/float32`; truy vấn `cuda` báo lỗi → xác nhận NLLB qua CT2 = CPU-only trên Mac. **[ĐO]** ghi `compute_type` NLLB đang dùng.
- **Nếu lỗi:** 5.1 KHÔNG thấy ctranslate2 → NLLB nhiều khả năng chạy transformers/torch, có thể lên MPS (áp dụng 5.3-5.4).

### 5.6 — Warm từng model + XÁC MINH MPS thực sự được dùng (đừng tin log)  **[ĐO]**

Sau khi backend lên, đo thời gian warm qua REST **và** xác minh GPU thật sự chạy bằng `powermetrics` (đừng tin log "using GPU"). `POST /api/warm` dùng **QUERY PARAM**, không phải body. Warm lần đầu gồm nạp trọng số; warm lần hai mới phản ánh độ trễ thật.

```bash
# Cua so 1 — theo doi GPU trong luc warm:
sudo powermetrics --samplers gpu_power -i 1000 -n 8
# Cua so 2 — warm STT roi MT (ten model LAY Y HET tu dropdown /api/blocks):
curl -s -X POST "http://127.0.0.1:8080/api/warm?model=Qwen3-ASR-1.7B" | tee /tmp/warm_stt.json; echo
curl -s -X POST "http://127.0.0.1:8080/api/warm?model=NLLB-600M"      | tee /tmp/warm_mt.json;  echo
curl -s -X POST "http://127.0.0.1:8080/api/warm?model=NLLB-1.3B"      | python3 -m json.tool
```

- **Mong đợi [ĐO]:** mỗi lệnh trả `{ok:true, model, ms:<cold-load>}`. Ghi ms warm-1 và warm-2. Trong `powermetrics`, **GPU active residency PHẢI nhảy lên khi warm STT** (bằng chứng MPS chạy thật). Nếu warm NLLB mà GPU im lìm → khớp với CT2 CPU-only (5.5).
- **Nếu lỗi:** `model not found` → tên phải lấy y hệt dropdown, không tự gõ. GPU không nhảy khi warm STT dù đã `device='mps'` → helper chưa gắn đúng, quay lại 5.3.

### 5.7 — Dấu chân bộ nhớ trên unified 96GB  **[ĐO]**

Bộ nhớ hợp nhất: MPS chia sẻ 96GB với CPU/hệ thống. Ước tính fp16: Qwen3-ASR ~3.4GB, NLLB-1.3B ~2.6GB, GGUF ~1-2GB → còn thừa rất nhiều (fp32 gấp đôi phần torch, vẫn dư). Đo thật để loại rủi ro khi chạy 2 Mac song song ngày gala.

```bash
python3 -c "import torch; print('mps allocated GB:', round(torch.mps.current_allocated_memory()/1e9,2))" 2>/dev/null || echo 'torch.mps API can torch 2.x'
vm_stat | head; echo '---'; sysctl hw.memsize
```

- **Mong đợi [ĐO]:** ghi GB MPS giữ sau khi warm hết + RAM còn trống. Kỳ vọng tổng model < 15GB, dư > 70GB.
- **Nếu lỗi:** nuốt > 40GB bất thường → model bị nạp trùng (mỗi request nạp lại thay vì cache). Kiểm `/api/models/switch` có unload model cũ không (quy tắc "một model mỗi role").

### 5.8 — [QUYẾT ĐỊNH] Fork nút thắt MT: giữ CTranslate2-CPU hay chuyển transformers-MPS

Ghép số đo 5.6 + `mt_ms` (Mục 8): nếu tổng độ trễ MT nằm trong ngân sách (final ≤1800ms trừ STT+xử lý) → **GIỮ CT2 CPU int8** (đơn giản, ổn định, không đụng repo). Nếu MT là nút thắt vượt ngân sách → **[QUYẾT ĐỊNH]** thử **NLLB-600M thay 1.3B** trước, rồi mới cân nhắc path transformers-MPS (**[XÁC NHẬN TRONG REPO]** có sẵn không). Nguyên tắc audit: gala phụ-đề-primary + phiên dịch người + Mac thứ 2 ấm → ưu tiên ỔN ĐỊNH hơn ép GPU cho MT. (Đo `mt_ms` thực bằng phiên live ở Mục 8; lấy **trung vị ≥20 câu**, không lấy 1 mẫu.)

> **Definition of done (5):** grep xác định rõ đường device của STT/MT; backend nạp cả 2 model không lỗi CUDA; `powermetrics` xác nhận STT chạy MPS thật; đã chốt MT dùng model nào + trên CPU-CT2 hay MPS.

---

## 6) LLM sidecar GGUF-Metal (hoặc TẮT cho gala)

> **Sidecar là TÙY CHỌN — KHÔNG bắt buộc để có phụ đề.** API.md §8: sidecar chạy Qwen2.5-1.5B-Instruct-GGUF trong tiến trình RIÊNG "với CUDA context riêng để không làm sập nhận dạng giọng nói", chỉ phục vụ `main_context` (tóm tắt ngữ cảnh) và `predict` (dịch/đoán trước). Cả hai là feature block TÙY CHỌN trong LiveConfig — không gửi chúng thì sidecar KHÔNG bao giờ chạy.

### 6.1 — [QUYẾT ĐỊNH] Chốt kiến trúc: chứng minh LÕI trước, sidecar sau

Vì gala subtitles-primary, chốt: bước đầu chứng minh STT→MT→(TTS) trên Metal với sidecar **TẮT hoàn toàn** (`main_context`/`predict` bị BỎ khỏi LiveConfig). Chỉ đụng sidecar SAU khi lõi đã xanh và còn thời gian.

- **Nếu ai cho rằng phụ đề cần sidecar:** đọc lại API.md §8 (dòng 291) — sidecar chỉ gắn Main Context + Predictive. Nếu backend tự-start sidecar dù LiveConfig không bật 2 block đó → **[XÁC NHẬN TRONG REPO]** tìm chỗ code auto-start.

### 6.2 — Kiểm trạng thái sidecar KHÔNG khởi động nó (đọc-only)  **[ĐO]**

`GET /api/llm/status` trả `{running, ready, model, base, error}`. Trường `base` = `http://127.0.0.1:...` → sidecar là HTTP server cục bộ (giống llama-server), test được độc lập qua curl.

```bash
curl -s http://127.0.0.1:8080/api/llm/status | python3 -m json.tool
```

- **Mong đợi [ĐO]:** JSON hợp lệ, thường `{"running": false, "ready": false, "model": "Qwen2.5-1.5B-Instruct-GGUF", "base": null, "error": null}`. Ghi nguyên văn.
- **Nếu lỗi:** curl lỗi kết nối → backend chưa chạy. 404 → **[XÁC NHẬN TRONG REPO]** endpoint có thể khác tên; grep `api/llm` trong `webui/app.py`.

### 6.3 — Dò mọi giả định CUDA trong code sidecar  **[XÁC NHẬN TRONG REPO]**

Rủi ro #1. Quét code Python xác định sidecar nạp BẰNG GÌ (llama-cpp-python in-process? subprocess gọi `./llama-server`? torch?) và có ép `cuda`/`n_gpu_layers` theo NVIDIA không.

```bash
grep -rniE 'cuda|cublas|LLAMA_CUBLAS|GGML_CUDA|n_gpu_layers|\.cuda\(|device *= *["'\'']cuda|llama_cpp|llama-server|llama_server|Llama\(|subprocess|Popen' --include='*.py' . | grep -viE 'test|/\.venv/' | head -60
```

- **Mong đợi [XÁC NHẬN TRONG REPO]:** xác định (a) file khởi động sidecar, (b) cơ chế nạp (subprocess spawn binary GGUF hay dùng llama-cpp-python), (c) mọi hằng `cuda`/`n_gpu_layers` cần sửa cho Mac.
- **Nếu lỗi:** không thấy gì rõ → mở file mà `/api/llm/start` gọi (grep `llm/start` trong `app.py`) rồi lần theo hàm.

### 6.4 — Xác nhận native arm64 (Metal chỉ chạy với arm64)

```bash
echo "arch=$(uname -m)"; python3 -c 'import platform,sys; print("py-arch=", platform.machine(), "| exe=", sys.executable)'; xcode-select -p 2>/dev/null || echo 'THIEU Xcode CLT -> xcode-select --install'
```

- **Mong đợi:** `arch=arm64` và `py-arch=arm64`. Nếu `py-arch=x86_64` → Python chạy Rosetta, Metal sẽ âm thầm rơi về CPU; dùng Python arm64.

### 6.5 — Cài llama-cpp-python bản METAL (nếu repo dùng gói này)  **[XÁC NHẬN TRONG REPO]**

Nếu 6.3 cho thấy sidecar dùng llama-cpp-python, wheel mặc định thường CPU-only → build lại BẬT Metal. **LƯU Ý TÊN CỜ ĐÃ ĐỔI:** bản mới `-DGGML_METAL=on`; bản cũ `-DLLAMA_METAL=on`. Đặt SAI cờ sẽ **âm thầm build CPU-only**. Làm trong ĐÚNG venv backend.

```bash
CMAKE_ARGS="-DGGML_METAL=on" pip install --upgrade --force-reinstall --no-cache-dir llama-cpp-python
# Neu ban cu bao khong biet GGML_METAL, thu co cu:
# CMAKE_ARGS="-DLLAMA_METAL=on" pip install --upgrade --force-reinstall --no-cache-dir llama-cpp-python
python -c 'import llama_cpp; print("llama_cpp", llama_cpp.__version__)'
```

- **Mong đợi:** build + import được. Khi nạp model thấy log `ggml_metal_init` / `using Metal`.
- **Nếu lỗi:** thiếu cmake → `brew install cmake`. Chạy vẫn CPU → gần như chắc đặt sai cờ hoặc `n_gpu_layers=0` (xem 6.6).

### 6.6 — (Biến thể) Nếu sidecar là binary llama-server rời — dùng bản Metal + `-ngl`  **[XÁC NHẬN TRONG REPO]**

Nếu backend spawn binary GGUF qua subprocess, cách đơn giản nhất trên Mac là dùng llama.cpp bản Metal (`brew install llama.cpp`) và đảm bảo tham số offload `-ngl` (n-gpu-layers) đủ lớn để đẩy toàn bộ layer lên Metal. Cần **[XÁC NHẬN TRONG REPO]** đường dẫn `.gguf` (nhiều khả năng trong `models/deploy/`) và cách backend dựng dòng lệnh.

```bash
brew install llama.cpp 2>/dev/null; which llama-server llama-cli
# Test doc-lap (thay <path> bang .gguf that):
# llama-cli -m <path-to-Qwen2.5-1.5B-Instruct.gguf> -ngl 999 -p "こんにちは" -n 16 2>&1 | grep -iE 'metal|offload'
```

- **Mong đợi:** log `ggml_metal_init` / `offloaded N/N layers to GPU` với `-ngl 999`.
- **Nếu lỗi:** `offloaded 0 layers` → binary CPU-only hoặc thiếu `-ngl`. Nếu backend hardcode `-ngl 0` (logic phát hiện CUDA thất bại trên Mac) → **[XÁC NHẬN TRONG REPO]** sửa để truyền `-ngl > 0`.

### 6.7 — Start sidecar qua API + chờ ready — ĐO warm  **[ĐO]**

Dùng API backend để start (đừng chạy tay — cần chứng minh backend điều phối được). `POST /api/llm/start` dùng **QUERY PARAM**. Poll tới `ready:true`.

```bash
date +%s.%N; curl -s -X POST "http://127.0.0.1:8080/api/llm/start?model=Qwen2.5-1.5B-Instruct-GGUF" | python3 -m json.tool
for i in $(seq 1 30); do S=$(curl -s http://127.0.0.1:8080/api/llm/status); echo "$S"; echo "$S" | grep -q '"ready": *true' && { date +%s.%N; break; }; sleep 1; done
```

- **Mong đợi [ĐO]:** `{"ok":true,"running":true,"ready":true,"base":"http://127.0.0.1:PORT"}`. Ghi số giây start→ready. Model 1.5B GGUF q4 rất nhỏ, kỳ vọng vài giây; lần đầu lâu hơn do biên dịch shader Metal.
- **Nếu lỗi:** `ok:false`/`error` → thường `model not found` (sai đường dẫn GGUF, **[XÁC NHẬN TRONG REPO]**) hoặc binary CPU crash. `running:true` mà `ready` mãi false → sidecar treo khi nạp, xem log tiến trình.

### 6.8 — Smoke-test một completion qua `base` — ĐO độ trễ sinh token  **[ĐO]**

`base` có thể theo OpenAI (`/v1/chat/completions`) hoặc native llama.cpp (`/completion`) — thử OpenAI trước.

```bash
BASE=$(curl -s http://127.0.0.1:8080/api/llm/status | python3 -c 'import sys,json;print(json.load(sys.stdin).get("base") or "")'); echo "base=$BASE"
time curl -s "$BASE/v1/chat/completions" -H 'Content-Type: application/json' -d '{"model":"Qwen2.5-1.5B-Instruct-GGUF","messages":[{"role":"user","content":"Dich sang tieng Nhat: Xin chao quy cong ty"}],"max_tokens":32}' | python3 -m json.tool
```

- **Mong đợi [ĐO]:** completion có nội dung + thời gian `real` của curl. Ghi ms.
- **Nếu lỗi:** 404 tại `/v1/chat/completions` → thử `$BASE/completion` với `{"prompt":"...","n_predict":32}` (**[XÁC NHẬN TRONG REPO]** giao thức). Rất chậm (>1s câu ngắn) → kiểm offload Metal (6.6), nhiều khả năng đang CPU.

### 6.9 — [QUYẾT ĐỊNH] Go/No-Go: BẬT hay TẮT sidecar cho gala

Chốt trước tổng duyệt 7/8. Quy tắc **đơn giản = an toàn**. **TẮT** sidecar (bỏ `predict`/`main_context` khỏi LiveConfig, không `/api/llm/start`) NẾU bất kỳ: (a) chưa build Metal ổn định; (b) bật sidecar đẩy latency vượt ngân sách hoặc gây giật STT (đo tranh chấp GPU: torch/MPS + llama.cpp/Metal dùng CHUNG một GPU 96GB unified); (c) sidecar crash/không ready ổn định; (d) còn <1 tuần và lõi phụ đề đã đủ tốt. **BẬT** chỉ khi Metal offload đã xác minh (`offloaded N/N`), status ready ổn định, latency trong ngân sách.

```bash
# Neu quyet dinh TAT cho gala:
curl -s -X POST http://127.0.0.1:8080/api/llm/stop | python3 -m json.tool
curl -s http://127.0.0.1:8080/api/llm/status | python3 -m json.tool  # xac nhan running:false
```

- **Mong đợi [QUYẾT ĐỊNH]:** ghi thành văn bản "Gala 8/8 sidecar = BẬT/TẮT" + lý do + số đo. Nếu TẮT: `/api/llm/stop` trả `running:false`, frontend bỏ hẳn `predict`/`main_context`.
- **Nếu lỗi:** `/api/llm/stop` không dừng được → **[XÁC NHẬN TRONG REPO]** PID/port treo; `lsof -i :PORT` rồi kill. **Mặc định an toàn cho gala là TẮT.**

> **Definition of done (6):** hoặc sidecar chạy Metal đã xác minh (`offloaded N/N`, ready ổn định, latency trong ngân sách), hoặc **[QUYẾT ĐỊNH]** TẮT sidecar cho gala được ghi thành văn bản.

---

## 7) Kiểm ngõ âm thanh (tách VI≠JA trên Mac)

### 7.1 — Kiểm kê thiết bị vào + ra (cần ≥2 output để tách VI≠JA)

`/api/audio/devices` cho input (mic; loopback ảo macOS = BlackHole/Loopback/`.monitor`). `/api/audio/outputs` cho output routing A=VI/B=JA. Ghi index mic + 2 index output để nạp LiveConfig.

```bash
curl -s http://127.0.0.1:8080/api/audio/devices | python3 -m json.tool
curl -s http://127.0.0.1:8080/api/audio/outputs | python3 -m json.tool
```

- **Mong đợi:** `devices` có ≥1 mic (ghi `index`); `outputs.devices` có ≥2 mục để gán vi/ja khác nhau.
- **Nếu lỗi:** chỉ 1 output → sang 7.2. `devices:[]` + error → quyền Microphone chưa cấp cho tiến trình (System Settings → Privacy & Security → Microphone).

### 7.2 — [QUYẾT ĐỊNH] Nếu <2 output: BlackHole + Multi-Output Device (thao tác GUI)

macOS không có "stereo mix". Để bắt âm hệ thống/feed (không phải mic) cần input ảo; để tách 2 luồng TTS cần ≥2 output. (1) `brew install blackhole-2ch` (cần quyền admin — **[XÁC NHẬN]** đội có quyền cài, có thể vướng chính sách máy Esuhai). (2) Mở "Audio MIDI Setup". (3) Nút `+` góc dưới-trái → "Create Multi-Output Device", HOẶC dùng 2 output vật lý riêng (loa + USB DAC) để có 2 index thật. (4) Chạy lại `/api/audio/outputs`. **Với gala subtitles-primary, nếu tách 2 luồng TTS quá rủi ro → [QUYẾT ĐỊNH] bỏ TTS, chỉ phụ đề** — vẫn đạt mục tiêu chính.

```bash
brew install blackhole-2ch
open -a "Audio MIDI Setup"
```

- **Mong đợi:** sau khi tạo, `/api/audio/outputs` trả ≥2 index; `sd.query_devices()` (4.1) xuất hiện thêm `BlackHole 2ch`.
- **Nếu lỗi:** không thấy BlackHole → reboot / kiểm System Settings → Sound (cài kext có thể cần cấp phép Privacy & Security). Venue dùng mic thật/1 feed → có thể bỏ input ảo (xác nhận theo sơ đồ mic của đội AV).

### 7.3 — Test tone từng output trước khi live

`POST /api/audio/test_tone` phát beep 660Hz. Thay `3`,`4` bằng index thật. Xác nhận tai nghe/loa VI kêu ở index này, JA ở index kia.

```bash
curl -s -X POST http://127.0.0.1:8080/api/audio/test_tone -H 'Content-Type: application/json' -d '{"device":3}' | python3 -m json.tool
curl -s -X POST http://127.0.0.1:8080/api/audio/test_tone -H 'Content-Type: application/json' -d '{"device":4}' | python3 -m json.tool
```

- **Mong đợi:** `{"ok":true}` và nghe beep đúng thiết bị.
- **Nếu lỗi:** `ok:false` → index sai hoặc thiết bị bị app khác chiếm; chọn index khác.

> **Definition of done (7):** có ≥1 mic index và ≥2 output index (hoặc [QUYẾT ĐỊNH] chấp nhận 1 luồng/bỏ TTS); test_tone kêu đúng thiết bị VI và JA.

---

## 8) Bắt tay phiên live + ĐO độ trễ

> **CẢNH BÁO shape LiveConfig:** bản trong API.md §13 (`targets` = LIST `[{model,target_lang}]`, `tts` = MỘT object, có `outputs:{vi,ja}` + `device_index`) **KHÁC** bản trong GOAL brief (`targets` dạng map + `beam_size`). Backend chỉ chấp nhận MỘT dạng → snippet dưới viết theo bản API.md và ghi chú thử bản brief nếu WS đóng ngay. **Ghi lại dạng nào backend thật sự chấp nhận.**

### 8.1 — [ĐO] Snippet Python đầy đủ: WS `/api/ws/live`, xem warming→ready→listening + timing, xác nhận `on_script`

`POST /api/warm` và `/api/llm/start` là query param; WS thì gửi ĐÚNG MỘT LiveConfig JSON rồi đọc event. Script in dấu thời gian mỗi event, tính lag `speech_start→line`, và cờ `on_script` khi thấy. Sửa `device_index`/`outputs` bằng index thật ở Mục 7. Nói 1 câu VI rồi 1 câu JA. Dừng bằng Ctrl-C (hoặc `{stop:true}`).

```python
cat > handich_live_probe.py <<'PYEOF'
#!/usr/bin/env python3
# Buoc 0 - kiem chung WS /api/ws/live tren Mac (Metal/MPS). Cai: python3 -m pip install websockets
import asyncio, json, time
import websockets

WS = "ws://127.0.0.1:8080/api/ws/live"
# [XAC NHAN] ten model tu GET /api/blocks; device_index tu /api/audio/devices; outputs tu /api/audio/outputs
CONFIG = {
    "device": "mic",
    "device_index": 1,                 # <-- thay bang index mic that
    "single_auto": {"model": "Qwen3-ASR-1.7B", "mt_model": "NLLB-600M"},
    "targets": [
        {"model": "NLLB-600M", "target_lang": "vi"},
        {"model": "NLLB-600M", "target_lang": "ja"},
    ],
    # "tts": {"engine": "vieneu", "voice": ""},   # bo comment de bat TTS sau khi phu de chay
    "outputs": {"vi": 3, "ja": 4},     # <-- thay bang output index that
    "post_correct": True,
    "record": False,
}

def ms(t0): return f"{int((time.time()-t0)*1000):>6}ms"

async def main():
    t0 = time.time(); speech_t = None
    seen = {"on_script": False, "timings": [], "ready_ms": None}
    async with websockets.connect(WS, max_size=None, ping_interval=20) as ws:
        await ws.send(json.dumps(CONFIG))
        print(f"[{ms(t0)}] >> da gui LiveConfig")
        async for raw in ws:
            evt = json.loads(raw); t = evt.get("type"); now = time.time()
            if t == "warming":
                print(f"[{ms(t0)}] warming {evt.get('step')}/{evt.get('steps')} {evt.get('detail','')}")
            elif t == "ready":
                seen["ready_ms"] = int((now-t0)*1000)
                print(f"[{ms(t0)}] READY (warmup {seen['ready_ms']} ms)")
            elif t == "listening":
                print(f"[{ms(t0)}] LISTENING mode={evt.get('mode')} -- noi 1 cau VI roi 1 cau JA")
            elif t == "speech_start":
                speech_t = now; print(f"[{ms(t0)}] speech_start")
            elif t == "transcript":
                print(f"[{ms(t0)}] transcript[{evt.get('lang')}]: {evt.get('text')}")
            elif t == "line":
                lag = int((now-speech_t)*1000) if speech_t else -1
                print(f"[{ms(t0)}] LINE[{evt.get('lang')}] (+{lag}ms tu speech_start): {evt.get('text')}")
            elif t == "line_update":
                print(f"[{ms(t0)}] line_update[{evt.get('lang')}] corrected={evt.get('corrected')}: {evt.get('text')}")
            elif t == "timing":
                seen["timings"].append(evt)
                print(f"[{ms(t0)}] TIMING stt={evt.get('stt_ms')} mt={evt.get('mt_ms')} proc={evt.get('proc_ms')}")
            elif t == "on_script":
                seen["on_script"] = True
                print(f"[{ms(t0)}] on_script lid={evt.get('lid')} score={evt.get('score')}  <== GIA DINH #1 XAC NHAN (ghi lai khoang score)")
            elif t in ("say","speaking","spoken","said"):
                print(f"[{ms(t0)}] TTS {t} lang={evt.get('lang')}")
            elif t == "error":
                print(f"[{ms(t0)}] ERROR: {evt.get('error')}")
            else:
                print(f"[{ms(t0)}] {t}: {evt}")

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: print("\n-- Ctrl-C: thoat --")
PYEOF
python3 -m pip install --quiet websockets
python3 handich_live_probe.py
```

- **Mong đợi [ĐO]:** chuỗi `warming (step/steps)` → `READY (warmup Nms)` → `LISTENING`. Khi nói: `transcript` → `LINE[vi]`/`LINE[ja]` text hợp lý → `TIMING` với `stt_ms/mt_ms/proc_ms`. Ghi: warmup ms, và có/không thấy `on_script` (+ giá trị `score`).
- **Nếu lỗi:** WS đóng ngay sau gửi config → shape LiveConfig sai; thử biến thể GOAL brief (`targets` dạng map + `beam_size`) và ghi lại cái nào chạy. Không `LINE` nào → STT không nghe (kiểm `level`/`speech_start`; sai `device_index` hoặc mic câm). `error` nhắc CUDA → quay lại Mục 5.

### 8.2 — [ĐO] Tính E2E từ event `timing` và đối chiếu ngân sách 900/1800/2500ms

Cách đo thực tế: (a) **partial** ≈ lag `speech_start→LINE` đầu tiên (script đã in `+Nms`); (b) **final** ≈ `stt_ms+proc_ms+mt_ms` (hoặc lag tới `line_update corrected=true`); (c) **spoken** ≈ lag tới event `spoken`/`said` khi bật TTS. Chạy **≥5 câu mỗi chiều** (lý tưởng ≥20 để lấy trung vị MT ở 5.8), ghi min/median/max. token cost KHÔNG quan tâm — chỉ latency + ổn định.

- **Mong đợi [ĐO]:** bảng partial/final/spoken median cho VI→JA và JA→VI. Đánh dấu câu vượt ngân sách.
- **Nếu lỗi:** final > 1800ms đều đặn với NLLB-1.3B → chuyển NLLB-600M. Spoken vượt xa → tách TTS khỏi phiên chính hoặc dựa người phiên dịch (đúng định hướng gala).

> **Definition of done (8):** phiên live chạy qua `warming→ready→listening`, ra được `LINE` phụ đề đúng chữ cho cả VI và JA, và có bảng partial/final(/spoken) median đối chiếu ngân sách.

---

## 9) Xác nhận 3 giả định frontend

> Ba giả định này gate các tính năng thật; chỉ kiểm chứng được SAU khi backend lên.

### 9.1 — Giả định #1: `on_script` có emit thật không? `score` nghĩa/khoảng gì?  **[ĐO]**

API.md §5 CÓ tài liệu `on_script {lid, score}` = "Line matched the loaded event script" — nên ở mức tài liệu giả định #1 gần như CÓ. Việc còn lại: xác nhận nó **EMIT lúc runtime** và ý nghĩa/khoảng của `score` (tài liệu không nói). Snippet 8.1 đã bắt event này và in `score`.

- **Mong đợi [ĐO]:** ghi có/không thấy `on_script` khi chạy live, và giá trị `score` quan sát được (khoảng 0–1? điểm khớp?).
- **Nếu không thấy:** cần nạp một event script trước (cấu hình khớp câu kịch bản) — **[XÁC NHẬN TRONG REPO]** cách nạp script.

### 9.2 — Giả định #2: có block TEXT-SOURCE cho pretranslate không?  **[XÁC NHẬN TRONG REPO]**

Giả định: có block nhận TEXT thô (param kiểu text/textarea, output text, KHÔNG input audio) để `POST /api/run` dịch một dòng rời. API.md không liệt kê tường minh.

```bash
curl -s http://127.0.0.1:8080/api/blocks | python3 -c "import sys,json; b=json.load(sys.stdin)['blocks']; [print(x['type'],'|',x.get('category'),'| in:',[i['type'] for i in x.get('inputs',[])],'| out:',[o['type'] for o in x.get('outputs',[])],'| text_params:',[p['name'] for p in x.get('params',[]) if p.get('type') in ('text','textarea')]) for x in b]"
```

- **Mong đợi:** tìm dòng có `out: ['text']`, KHÔNG có `in: ['audio']`, có `text_params:[...]` → đó là khối text-source. **Ghi type + tên param text.** Đồng thời đọc `options` của block STT/MT để biết tên model chính xác (dropdown).
- **Nếu không khớp:** giả định #2 SAI → backend không dịch dòng text rời qua `/api/run`; tính năng pretranslate của frontend phải tắt hoặc chờ backend thêm. Ghi rõ.

### 9.3 — Giả định #3: một phiên đẩy được CẢ VI + JA TTS không? shape tts?  **[XÁC NHẬN TRONG REPO]**

API.md §9 + LiveConfig §13 chỉ tài liệu hóa **MỘT** khối `tts` (`{engine, voice}` hoặc `{engine, speaker_id}`) → khả năng một phiên đẩy CẢ VI lẫn JA bằng 2 engine khác nhau là **NGHI NGỜ**. Liệt kê voice từng engine; cũng xác nhận engine nào nạp được trên Mac.

```bash
for e in vieneu voicevox gpt-sovits; do echo "== $e =="; curl -s "http://127.0.0.1:8080/api/tts/voices?engine=$e" | python3 -m json.tool; done
```

- **Mong đợi:** `vieneu` trả voices VI (on-box); `voicevox` trả voices JA CHỈ KHI engine chạy ở :50021 (Mục 3.4); `gpt-sovits` cần clip tham chiếu trong `data/voices/`. Ghi engine nào có voices.
- **Nếu chỉ 1 engine nạp được / LiveConfig chỉ nhận 1 khối tts:** giả định #3 coi như **KHÔNG hỗ trợ đa-ngôn-ngữ 1 phiên** → đừng thiết kế frontend phụ thuộc vào nó. Với gala phụ-đề-primary thì bỏ TTS phía yếu.

> **Definition of done (9):** ghi được kết luận rõ ràng cho cả 3 giả định (#1 emit + khoảng score; #2 type + tên param hoặc "không có"; #3 có/không đa-ngôn-ngữ 1 phiên).

---

## 10) MẪU BÁO CÁO gửi lại cho Thầy

Chạy lệnh tạo file mẫu, điền số từ các Mục trên, gửi lại. Đây là đầu ra cuối của Bước 0 — dữ liệu Thầy cần để tinh chỉnh frontend.

```bash
cat > handich_buoc0_ketqua.md <<'EOF'
# HanDichThuat - Bước 0 kết quả (Mac Studio M3 Ultra)
Ngày đo: ____   Người đo: ____

## Môi trường
- macOS / chip: ____ (arm64? y/n)
- Python version: ____   | Kiến trúc Python (arm64/x86_64): ____
- torch version: ____   | MPS built: __ | MPS available: __ | CUDA available (phai la False): __

## Server
- /api/health ok: __   | blocks (N): __

## Warm model [ĐO] (ms) + GPU hay CPU
- Qwen3-ASR-1.7B: ____ ms  | GPU(MPS)/CPU: ____  (powermetrics GPU nhay? y/n)
- NLLB-600M: ____ ms       | GPU(MPS)/CPU: ____
- NLLB-1.3B: ____ ms       | GPU(MPS)/CPU: ____
- Warmup live tới READY: ____ ms
- MPS allocated sau khi warm het: ____ GB | RAM con trong: ____ GB

## Đường device STT/MT (từ grep repo)
- STT nạp qua: transformers/torch | khác: ____
- NLLB nạp qua: ctranslate2 (CPU-only) | transformers (MPS): ____  | compute_type: ____
- Có hardcode .cuda() cần vá? y/n: __ | file:line: ____

## Latency [ĐO] (median, ms) — VI→JA / JA→VI
- partial (speech_start→LINE): ____ / ____   (budget ≤900)
- final  (stt+proc+mt / corrected): ____ / ____ (budget ≤1800)
- spoken (→spoken/said): ____ / ____          (budget ≤2500)
- stt_ms / proc_ms / mt_ms mẫu: ____ / ____ / ____

## Audio
- mic index: ____ | so output: __ | output index VI/JA: ____ / ____
- test_tone kêu đúng thiết bị? y/n: __

## TTS engine nạp được (y/n)
- vieneu(VI): __ | voicevox(JA, :50021 chạy?): __ | gpt-sovits: __
- Một phiên đẩy được CẢ VI+JA? (giả định #3): __ | ghi chú: ____

## Giả định xác minh
- #1 on_script có emit? y/n: __ | score nghĩa/khoảng: ____
- #2 khối text-source (type + tên param text): ____ | có/không: __
- #3 TTS đa ngôn ngữ 1 phiên: có/không: __

## LLM sidecar (Metal)
- start được? y/n: __ | ready ổn định? __ | offloaded N/N? __ | completion ms: ____
- lỗi CUDA? ____ | [QUYẾT ĐỊNH] gala BẬT/TẮT: ____

## LiveConfig shape backend CHẤP NHẬN
- Bản API.md (targets là list) chạy? __ | bản GOAL (targets map+beam) chạy? __

## Traceback / lỗi (dán nguyên văn)
____
EOF
echo 'Đã tạo handich_buoc0_ketqua.md — điền rồi gửi cho Thầy.'
```

- **Mong đợi:** file mẫu được tạo; đội điền đủ số và gửi lại.
- **Nếu thiếu mục nào** (vd chưa chạy được live): vẫn gửi phần đã có + traceback nguyên văn — dữ liệu một phần vẫn giúp Thầy quyết định.

> **Definition of done (10):** file `handich_buoc0_ketqua.md` đã điền và gửi cho Thầy, kèm 2 file công cụ đội tự chạy (`handich_live_probe.py`, `handich_buoc0_ketqua.md`).

---

## PHỤ LỤC — Danh mục rủi ro (đọc trước khi bắt đầu)

1. **Blocker cứng:** repo `HanDichThuat` đang 404. Không có repo → không có requirements/model/lệnh chạy; mọi **[XÁC NHẬN TRONG REPO]** không chốt được. Lấy quyền từ HarryDoan123 / hoangkha@esuhai.com trước.
2. **MPS thiếu op:** một số op torch chưa có trên Metal → crash nếu không đặt `PYTORCH_ENABLE_MPS_FALLBACK=1`. Phải export trong MỌI script chạy backend (op rơi về CPU, chậm hơn nhưng không sập).
3. **CTranslate2 KHÔNG có backend Metal:** nếu NLLB đi CT2 thì MT chạy CPU-only trên Mac (giới hạn kiến trúc, không phải lỗi). Đo latency; nếu chậm thì [QUYẾT ĐỊNH] chuyển transformers-MPS hoặc dùng 600M.
4. **fp16 trên MPS hay ra NaN/transcript rỗng** — bẫy phổ biến nhất khi port từ CUDA. Chứng minh bằng fp32 trước rồi mới hạ fp16.
5. **Điểm chạm CUDA (API.md §8):** GGUF sidecar phải build METAL (`-DGGML_METAL=on`, bản cũ `-DLLAMA_METAL=on`). Đặt sai cờ **âm thầm build CPU-only**. Không bao giờ cố cài bản CUDA.
6. **Bẫy Rosetta:** brew phải arm64 (`/opt/homebrew`), Terminal không "Open using Rosetta", Python phải arm64. Trộn x86/arm64 → `wrong architecture` ở PortAudio/sentencepiece/ctranslate2, và MPS âm thầm biến mất.
7. **Đừng tin log "using GPU":** xác minh MPS bằng `powermetrics gpu_power`. GPU im khi warm nghĩa là vẫn CPU.
8. **`/api/warm` và `/api/llm/start` là QUERY PARAM**, không phải JSON body — gửi body sẽ "thành công giả" hoặc lỗi khó hiểu.
9. **Shape LiveConfig** API.md (targets=list, tts=1 object) KHÁC GOAL brief (targets=map, beam_size) — backend chỉ nhận một dạng; là nguồn lỗi "WS đóng ngay". Thử và ghi lại dạng chạy được.
10. **Quyền Microphone (TCC):** phải cấp cho tiến trình chạy server, nếu không `/api/audio/devices` rỗng và live câm mà không báo lỗi rõ.
11. **macOS không có "stereo mix":** bắt âm hệ thống/tách VI≠JA cần BlackHole + Multi-Output Device (GUI) + quyền admin — có thể vướng chính sách máy Esuhai.
12. **Tranh chấp một GPU:** torch/MPS (STT+MT) và llama.cpp/Metal (sidecar) dùng CHUNG một GPU 96GB unified. Rủi ro không phải OOM mà là spike latency/giật — đo `proc_ms` với sidecar on vs off.
13. **`models/deploy/` có thể trống trên Mac** → `/api/blocks` dropdown rỗng → mọi bước sau vô nghĩa. Xác nhận model đã có TRƯỚC khi đo, chuẩn bị từ trước, đừng tải lần đầu tại venue/mạng gala.
14. **build-from-source:** sentencepiece/tokenizers/llama-cpp-python thường cần Xcode CLT + cmake + đôi khi Rust.
15. **Lần chạy Metal đầu tiên biên dịch shader** (vài giây) → completion đầu chậm bất thường. Warm trước rồi mới [ĐO].

**Con đường ngắn nhất tới "khởi động + phụ đề trên Metal":** Mục 2 (MPS) → 4 (health) → 9.2 lệnh blocks (tên model) → 7.1 (devices) → 5.6 (warm) → 8.1 (live probe, TẮT tts trước). TTS / sidecar / tách-output là lớp tối ưu thêm sau khi phụ đề đã chạy.