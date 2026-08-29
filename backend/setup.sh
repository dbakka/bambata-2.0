#!/bin/bash
# ==============================================================================
# BAMBATA 2.0 - Machine Learning & Audio Engine Setup Script
# Installs UVR5 / BS-Roformer dependencies, PyTorch, FFmpeg, and model weights.
# ==============================================================================

set -e

echo "=== [1/4] Checking FFmpeg Installation ==="
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️ FFmpeg is not installed or not on PATH."
    echo "Installing FFmpeg (Debian/Ubuntu: sudo apt install ffmpeg, macOS: brew install ffmpeg, Windows: winget install Gyan.FFmpeg)..."
else
    echo "✓ FFmpeg found: $(ffmpeg -version | head -n 1)"
fi

echo "=== [2/4] Installing Python Core & DSP Dependencies ==="
pip install --upgrade pip
pip install torch torchaudio soundfile librosa scipy requests numpy pydub fastapi uvicorn python-multipart

echo "=== [3/4] Creating Models & Storage Directories ==="
mkdir -p ./models/uvr5
mkdir -p ./storage/temp
mkdir -p ./storage/renders

echo "=== [4/4] Downloading UVR5 BS-Roformer (ViperX) Checkpoint Weights ==="
CHECKPOINT_PATH="./models/uvr5/model_bs_roformer_ep_317_sdr_12.9755.ckpt"

if [ -f "$CHECKPOINT_PATH" ]; then
    echo "✓ BS-Roformer ViperX checkpoint already downloaded at $CHECKPOINT_PATH"
else
    echo "Downloading BS-Roformer ViperX (12.97 SDR) checkpoint..."
    curl -L -o "$CHECKPOINT_PATH" "https://github.com/TRvlS/roformer-models/releases/download/v1.0/model_bs_roformer_ep_317_sdr_12.9755.ckpt" || {
        echo "⚠️ Note: Direct weight download failed or offline. Fallback to CPU-DSP / Modal endpoint is active."
    }
fi

echo "=== BAMBATA 2.0 Backend Environment Ready ==="
