# BAMBATA 2.0 - Serverless GPU Worker

This directory contains the asynchronous audio DSP worker responsible for:
1. **Demucs v4 (`htdemucs`) Stem Separation** (vocals, drums, bass, other)
2. **Phase-Vocoder Time-Stretching & Pitch-Shifting** (`pyrubberband` / `rubberband-cli`)
3. **Drop Preview Generation** (3 x 15-second snippet variations around the drop)
4. **Master Multi-Stem Mixdown** with dynamic EQ & -14 LUFS true-peak limiter.

---

## 1. Modal Deployment (Recommended)

Modal allows on-demand serverless execution on NVIDIA A10G / T4 GPUs with **0 idle cost**.

### Prerequisites:
```bash
pip install modal
modal setup
```

### Run Locally / Test on Modal Cloud:
```bash
modal run modal_app.py
```

### Deploy to Production:
```bash
modal deploy modal_app.py
```

---

## 2. RunPod Serverless Deployment

RunPod allows containerized GPU execution with auto-scaling to zero.

### Build and Push Docker Image:
```bash
docker build -t your-dockerhub-username/bambata-gpu-worker:latest .
docker push your-dockerhub-username/bambata-gpu-worker:latest
```

### Create RunPod Serverless Endpoint:
1. Go to **RunPod Console > Serverless > New Endpoint**.
2. Select your container image (`your-dockerhub-username/bambata-gpu-worker:latest`).
3. Select GPU type: **NVIDIA RTX 4090**, **A4000**, or **A10G**.
4. Set Container Disk: `20 GB` (to store pre-cached Demucs weights).
5. Copy your **Endpoint ID** and **API Key** into `backend/.env`.

---

## 3. Local DSP Verification

You can test the audio DSP pipeline locally (using CPU/GPU):
```bash
python test_dsp.py
```
