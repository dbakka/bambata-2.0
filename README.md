# BAMBATA 2.0 // AI-Powered DJ Mashup Web Application

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-000000.svg?logo=next.js&logoColor=white)](https://nextjs.org)
[![Modal](https://img.shields.io/badge/GPU%20Workers-Modal.com-green.svg)](https://modal.com)
[![Demucs](https://img.shields.io/badge/Stem%20Separation-Demucs%20v4-blue.svg)](https://github.com/facebookresearch/demucs)
[![Gemini](https://img.shields.io/badge/Brain-Google%20Gemini-blueviolet.svg)](https://deepmind.google/technologies/gemini/)

BAMBATA 2.0 reverse-engineers reference mashups from YouTube, separates 4-way audio stems on serverless GPUs, arranges audio dynamically using an LLM reasoning engine (Gemini), renders rapid 15-second drop preview auditions, and drives retention through harmonic YouTube track recommendations.

---

## ⚡ Core Workflows & System Architecture

```
                                  [ User / DJ ]
                                        │
                                        ▼
                   ┌──────────────────────────────────────────┐
                   │  Next.js 14 Web Studio (React + Tailwind)│
                   └────────────────────┬─────────────────────┘
                                        │ (HTTP / WebSocket)
                                        ▼
                   ┌──────────────────────────────────────────┐
                   │        FastAPI Gateway & Orchestrator    │
                   ├──────────────────────────────────────────┤
                   │ 1. Reference Ingestion: yt-dlp + allin1   │
                   │ 2. The Brain: Gemini 2.5 + Camelot Wheel │
                   │ 3. Job Manager & Polling Queue           │
                   │ 4. YouTube Data API Retention Recommender│
                   └────────────────────┬─────────────────────┘
                                        │ (Serverless RPC)
                                        ▼
                   ┌──────────────────────────────────────────┐
                   │ Modal / RunPod Serverless GPU Worker     │
                   ├──────────────────────────────────────────┤
                   │ • Demucs v4 (htdemucs) 4-Stem Separation │
                   │ • pyrubberband Phase-Vocoder Time/Pitch  │
                   │ • 3 x 15s Drop Preview Snippet Generator │
                   │ • 60s Multi-Stem Master Mixdown Engine   │
                   └──────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```
BAMBATA 2.0/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entrypoint & CORS
│   │   ├── config.py                # Environment & directory management
│   │   ├── models/schemas.py        # Pydantic schemas (Reference, Brain, Job, Recommendations)
│   │   ├── routers/
│   │   │   ├── reference.py         # POST /api/reference/analyze
│   │   │   ├── brain.py             # POST /api/brain/arrange
│   │   │   ├── mashup.py            # POST /api/mashup/jobs & status polling
│   │   │   └── recommendations.py   # GET /api/recommendations (YouTube Data API)
│   │   └── services/
│   │       ├── yt_downloader.py     # yt-dlp audio stream extractor
│   │       ├── structure_analyzer.py# allin1 & librosa drop/energy detector
│   │       ├── camelot_wheel.py     # Camelot Wheel transposition engine
│   │       ├── llm_arranger.py      # Gemini LLM arrangement engine
│   │       ├── job_manager.py       # Async state tracker & mock DSP runner
│   │       └── yt_recommender.py    # YouTube Data API retention matcher
│   ├── tests/                       # Pytest unit & integration tests
│   └── requirements.txt
├── worker/
│   ├── modal_app.py                 # Modal Serverless GPU app (A10G/T4)
│   ├── audio_dsp.py                 # Demucs v4 stem separation & pyrubberband DSP
│   ├── Dockerfile                   # RunPod Serverless container definition
│   ├── runpod_handler.py            # RunPod API handler
│   ├── test_dsp.py                  # Standalone audio DSP verification script
│   └── README.md                    # Worker deployment guide
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Studio layout & dark theme
│   │   ├── page.tsx                 # 4-stage interactive DJ Studio wizard
│   │   └── globals.css              # Dark neon DJ UI & VU meters
│   ├── components/
│   │   ├── Header.tsx               # Navigation & live GPU status
│   │   ├── ReferenceIngestion.tsx   # YouTube URL + Energy Curve visualizer
│   │   ├── CreativeBrainInput.tsx   # Goal prompt & Camelot wheel indicator
│   │   ├── TrackUploader.tsx        # Dual track upload & role assigner
│   │   ├── AsyncProcessingView.tsx  # Live progress ring & worker logs stream
│   │   ├── PreviewSelector.tsx      # 3 x 15s Drop audition deck & waveform player
│   │   ├── MasterMashupPlayer.tsx   # Master mix player & 24-bit WAV download
│   │   └── RecommendationCarousel.tsx # Retention loop with direct YT links
│   ├── lib/
│   │   ├── api.ts                   # Backend API client with offline fallback
│   │   ├── mockData.ts              # High-fidelity mock structures & blueprints
│   │   └── types.ts                 # TypeScript interfaces
│   └── package.json
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Start the FastAPI Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env

# Run FastAPI Server
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger docs: `http://localhost:8000/docs`

### 2. Run the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Deploy the GPU Worker to Modal
```bash
cd worker
pip install modal
modal setup
modal deploy modal_app.py
```

---

## 🎛️ Key Features & Algorithms

1. **Camelot Wheel Transposition**:
   - Matches keys harmonically (e.g. `8A` A minor with `9A`, `7A`, `8B`).
   - Automatically computes shortest semitone pitch shifts (`calculate_semitone_shift`) to prevent vocal chipmunk distortion.
2. **Music Structure & Drop Detection**:
   - Identifies Intro, Verse, Build, Drop, and Outro sections along with continuous normalized RMS energy curves.
3. **Async 15s Drop Auditions**:
   - The GPU worker renders 3 different drop variations (Vocal Drop, Bass Swap, Stutter Build) so the producer can choose the tightest mix before final 60s rendering.
4. **YouTube Retention Recommendations**:
   - Queries the YouTube Data API v3 for 3 follow-up tracks matching the mashup's key & tempo (+/- 1 Camelot step) to maximize user retention.
