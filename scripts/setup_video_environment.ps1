$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$VideoRepo = Join-Path $Root "third_party\LTX-Video"
$VideoEnv = Join-Path $Root ".venv-video"
$BasePython = Join-Path $Root ".venv311\Scripts\python.exe"
$LtxRevision = "4b2d053057623ddd4d0a1d3e9cd28890e9ef487f"
$Q8Revision = "f3066edea210082799ca5a2bbf9ef0321c5dd8fc"
$CudaTorchIndex = "https://download.pytorch.org/whl/cu128"

if (-not (Test-Path $BasePython)) {
    throw "Python 3.11 project interpreter not found at $BasePython"
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is required to fetch the pinned official LTX source"
}
if (-not (Get-Command nvidia-smi -ErrorAction SilentlyContinue)) {
    throw "No NVIDIA driver utility was detected. Run this only on a compatible CUDA GPU worker; the current CPU-only machine is not supported."
}
& nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits
if ($LASTEXITCODE -ne 0) {
    throw "NVIDIA GPU query failed; refusing to install the LTX video runtime."
}
$GpuMemoryMiB = [int]((& nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | Select-Object -First 1).Trim())
if ($GpuMemoryMiB -lt 12288) {
    throw "LTX inference is gated at 12 GiB VRAM; detected $([math]::Round($GpuMemoryMiB / 1024, 1)) GiB. No video dependencies were installed."
}
if (-not (Test-Path (Join-Path $VideoRepo ".git"))) {
    git clone --filter=blob:none --no-checkout https://github.com/Lightricks/LTX-Video.git $VideoRepo
}
git -C $VideoRepo fetch --depth 1 origin $LtxRevision
git -C $VideoRepo checkout --detach $LtxRevision

if (-not (Test-Path $VideoEnv)) {
    & $BasePython -m venv $VideoEnv
}
$Python = Join-Path $VideoEnv "Scripts\python.exe"
& $Python -m pip install --upgrade pip setuptools wheel ninja packaging
& $Python -m pip install torch==2.7.1 torchvision==0.22.1 torchaudio==2.7.1 --index-url $CudaTorchIndex
& $Python -c "import torch; assert torch.cuda.is_available(), 'CUDA torch build did not detect a GPU'; print(torch.__version__, torch.version.cuda, torch.cuda.get_device_name(0))"
if ($LASTEXITCODE -ne 0) {
    throw "CUDA PyTorch validation failed; refusing to install the LTX runtime."
}
& $Python -m pip install -e "${Root}[ltx-video]"
& $Python -m pip install -e $VideoRepo --no-deps
& $Python -m pip install --no-build-isolation "git+https://github.com/Lightricks/LTX-Video-Q8-Kernels.git@$Q8Revision"
if ($LASTEXITCODE -ne 0) {
    throw "Lightricks Q8 kernel build failed. Install Windows C++ Build Tools and CUDA Toolkit 12.8 matching the PyTorch CUDA build, then rerun."
}
Write-Host "Separate LTX environment is installed. Validate weights, FFmpeg and GPU memory before setting LTX_VIDEO_INFERENCE_ENABLED=true in the worker environment."
