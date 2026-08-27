# BAMBATA 2.0 - Serverless GPU Worker Dockerfile (RunPod & Standalone CUDA)
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

# Prevent interactive prompts during apt install
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Install system audio DSP tools and Python 3.10
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3-pip \
    python3.10-dev \
    ffmpeg \
    rubberband-cli \
    libsndfile1 \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Symlink python to python3
RUN ln -sf /usr/bin/python3.10 /usr/bin/python

WORKDIR /app

# Install PyTorch with CUDA 12.1 support
RUN pip3 install --no-cache-dir \
    torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# Copy worker requirements and install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Pre-download Demucs v4 (htdemucs) weights in container build phase
RUN python3 -c "import demucs.pretrained; demucs.pretrained.get_model('htdemucs')"

# Copy application source code
COPY audio_dsp.py .
COPY runpod_handler.py .

# RunPod Serverless Handler Execution
CMD ["python3", "-u", "runpod_handler.py"]
