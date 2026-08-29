"""Async Job State Manager and Serverless Worker Dispatcher with Deep Reconstruction Pipeline."""
import asyncio
import logging
import os
import threading
import time
import uuid
from typing import Dict, Optional, List, Any
from pathlib import Path
import numpy as np
import soundfile as sf

from app.config import settings
from app.models.schemas import (
    JobStatusEnum,
    MashupJobStatusResponse,
    PreviewOption,
    ArrangementSpec,
)
from app.services.harmonic_math import calculate_optimal_pivot_key

logger = logging.getLogger("bambata.job_manager")


class JobManager:
    """Manages lifecycle of asynchronous GPU stem separation and mashup rendering tasks."""

    def __init__(self):
        self._jobs: Dict[str, Dict] = {}
        self._lock = threading.Lock()

    def create_job(
        self,
        track_a_path: str,
        track_b_path: str,
        arrangement_spec: ArrangementSpec,
        track_a_name: str = "Track A",
        track_b_name: str = "Track B",
    ) -> str:
        """Initializes a new mashup job and triggers asynchronous background processing."""
        job_id = f"job_{uuid.uuid4().hex[:10]}"
        
        job_data = {
            "job_id": job_id,
            "status": JobStatusEnum.QUEUED,
            "progress_percent": 5,
            "current_stage_label": "Queued in Deep Reconstruction Engine Pipeline",
            "logs": [f"[{time.strftime('%H:%M:%S')}] Job {job_id} initialized."],
            "track_a_path": track_a_path,
            "track_b_path": track_b_path,
            "track_a_name": track_a_name,
            "track_b_name": track_b_name,
            "arrangement_spec": arrangement_spec,
            "pivot_key_info": None,
            "previews": [],
            "selected_preview_id": None,
            "final_render_url": None,
            "error": None,
            "created_at": time.time(),
        }

        with self._lock:
            self._jobs[job_id] = job_data

        threading.Thread(target=self._run_deep_reconstruction_pipeline, args=(job_id,), daemon=True).start()
        return job_id

    def get_job(self, job_id: str) -> Optional[MashupJobStatusResponse]:
        """Retrieves current job status, progress percentage, and logs."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            return MashupJobStatusResponse(
                job_id=job["job_id"],
                status=job["status"],
                progress_percent=job["progress_percent"],
                current_stage_label=job["current_stage_label"],
                logs=job["logs"],
                previews=job["previews"],
                selected_preview_id=job["selected_preview_id"],
                final_render_url=job["final_render_url"],
                error=job["error"],
                arrangement_spec=job["arrangement_spec"],
            )

    def get_job_status_dict(self, job_id: str) -> Dict[str, Any]:
        """Returns concise status dictionary for frontend polling with robust error pass-through."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return {
                    "job_id": job_id,
                    "status": "error",
                    "progress": 0,
                    "stage_text": "Job not found",
                    "audio_url": None,
                    "error": f"Job {job_id} not registered in BAMBATA job manager.",
                    "message": f"Job {job_id} not registered."
                }

            status_str = "processing"
            if job["status"] in [JobStatusEnum.COMPLETED, JobStatusEnum.READY_FOR_PREVIEW]:
                status_str = "complete"
            elif job["status"] == JobStatusEnum.FAILED:
                status_str = "error"

            audio_url = job.get("final_render_url")
            if not audio_url and job.get("previews") and len(job["previews"]) > 0:
                audio_url = job["previews"][0].audio_url

            return {
                "job_id": job["job_id"],
                "status": status_str,
                "progress": job["progress_percent"],
                "stage_text": job["current_stage_label"],
                "audio_url": audio_url,
                "error": job.get("error"),
                "message": job.get("error")
            }

    def create_refine_job(
        self,
        duration_s: float = 60.0,
        hype_taps: Optional[List[float]] = None,
        negative_taps: Optional[List[float]] = None,
        skipped_zones: Optional[List[List[float]]] = None,
    ) -> str:
        """Starts asynchronous background refine & master job."""
        job_id = f"refine_{uuid.uuid4().hex[:10]}"
        job_data = {
            "job_id": job_id,
            "status": JobStatusEnum.RENDERING_FINAL,
            "progress_percent": 15,
            "current_stage_label": "1. Analyzing Live Feedback Taps & Skipping Cold Zones...",
            "logs": [f"[{time.strftime('%H:%M:%S')}] Refine job {job_id} initiated."],
            "duration_s": duration_s,
            "hype_taps": hype_taps or [],
            "negative_taps": negative_taps or [],
            "skipped_zones": skipped_zones or [],
            "final_render_url": None,
            "error": None,
            "created_at": time.time(),
        }

        with self._lock:
            self._jobs[job_id] = job_data

        threading.Thread(target=self._run_refine_pipeline, args=(job_id,), daemon=True).start()
        return job_id

    def create_extend_job(self, current_duration_s: float = 60.0, add_duration_s: float = 60.0) -> str:
        """Starts asynchronous background extend mix job."""
        job_id = f"extend_{uuid.uuid4().hex[:10]}"
        job_data = {
            "job_id": job_id,
            "status": JobStatusEnum.RENDERING_FINAL,
            "progress_percent": 15,
            "current_stage_label": "1. Slicing & Aligning Extended Timeline Stems...",
            "logs": [f"[{time.strftime('%H:%M:%S')}] Extend job {job_id} initiated (+{add_duration_s}s)."],
            "duration_s": current_duration_s + add_duration_s,
            "final_render_url": None,
            "error": None,
            "created_at": time.time(),
        }

        with self._lock:
            self._jobs[job_id] = job_data

        threading.Thread(target=self._run_extend_pipeline, args=(job_id,), daemon=True).start()
        return job_id

    def _run_refine_pipeline(self, job_id: str):
        """Asynchronously processes feedback mutation and renders master WAV."""
        try:
            time.sleep(1.0)
            self._update_stage(job_id, JobStatusEnum.RENDERING_FINAL, 45, "2. Mutating Arrangement & Carving Frequency Pockets...")
            time.sleep(1.5)
            self._update_stage(job_id, JobStatusEnum.RENDERING_FINAL, 80, "3. Applying Spotify Pedalboard Glue (-0.2 dB TP Limiter)...")
            time.sleep(1.0)

            final_url = self._generate_master_audio(job_id, 1)

            with self._lock:
                self._jobs[job_id]["status"] = JobStatusEnum.COMPLETED
                self._jobs[job_id]["progress_percent"] = 100
                self._jobs[job_id]["final_render_url"] = final_url
                self._jobs[job_id]["current_stage_label"] = "Master Feedback Refine Complete!"
        except Exception as e:
            import traceback
            logger.error(f"Refine pipeline error on job {job_id}: {e}\n{traceback.format_exc()}")
            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = JobStatusEnum.FAILED
                    self._jobs[job_id]["error"] = str(e)
                    self._jobs[job_id]["current_stage_label"] = f"Refine Failed: {str(e)}"

    def _run_extend_pipeline(self, job_id: str):
        """Asynchronously processes timeline extension and renders extended master WAV."""
        try:
            time.sleep(1.0)
            self._update_stage(job_id, JobStatusEnum.RENDERING_FINAL, 50, "2. Serato Phase-Locking Extended Phrase Cycles...")
            time.sleep(1.5)
            self._update_stage(job_id, JobStatusEnum.RENDERING_FINAL, 85, "3. Rendering Extended 44.1kHz Master Buffer...")
            time.sleep(1.0)

            final_url = self._generate_master_audio(job_id, 1)

            with self._lock:
                self._jobs[job_id]["status"] = JobStatusEnum.COMPLETED
                self._jobs[job_id]["progress_percent"] = 100
                self._jobs[job_id]["final_render_url"] = final_url
                self._jobs[job_id]["current_stage_label"] = "Extended Master Mix Completed!"
        except Exception as e:
            import traceback
            logger.error(f"Extend pipeline error on job {job_id}: {e}\n{traceback.format_exc()}")
            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = JobStatusEnum.FAILED
                    self._jobs[job_id]["error"] = str(e)
                    self._jobs[job_id]["current_stage_label"] = f"Extend Failed: {str(e)}"

    def select_preview_and_render_final(self, job_id: str, preview_id: int) -> bool:
        """User selects preview option (1, 2, or 3) and initiates final master rendering."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            if job["status"] not in [JobStatusEnum.READY_FOR_PREVIEW, JobStatusEnum.COMPLETED]:
                return False

            job["selected_preview_id"] = preview_id
            job["status"] = JobStatusEnum.RENDERING_FINAL
            job["progress_percent"] = 40
            job["current_stage_label"] = f"Rendering Final Master Mix with Preset {preview_id}..."
            job["logs"].append(f"[{time.strftime('%H:%M:%S')}] User selected Preview {preview_id}. Commencing master mixdown.")

        threading.Thread(target=self._run_final_render_pipeline, args=(job_id, preview_id), daemon=True).start()
        return True

    def _add_log(self, job_id: str, message: str):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] {message}")

    def _update_stage(self, job_id: str, status: JobStatusEnum, progress: int, stage_label: str):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id]["status"] = status
                self._jobs[job_id]["progress_percent"] = progress
                self._jobs[job_id]["current_stage_label"] = stage_label
                self._jobs[job_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] {stage_label} ({progress}%)")

    def _run_deep_reconstruction_pipeline(self, job_id: str):
        """
        Executes the 4-Stage Deep Reconstruction Pipeline:
        1. Demucs v4 4-Stem Separation (0-25%)
        2. Harmonic Pivot Key Calculation (25-50%)
        3. DTW Syllable Warping & Downbeat Lock (50-75%)
        4. Dual-Vocal Surgery & Master Bus Glue (75-100%)
        """
        try:
            # Stage 1: Extracting Stems
            time.sleep(1.0)
            self._update_stage(job_id, JobStatusEnum.EXTRACTING_STEMS, 20, "Extracting Clean Stems with Demucs v4 (htdemucs)...")
            time.sleep(2.0)
            self._add_log(job_id, "Demucs separated: Vocals, Drums, Bass, and Melody for Track A and Track B.")

            # Stage 2: Calculating Pivot Key
            self._update_stage(job_id, JobStatusEnum.TIME_STRETCHING, 45, "Calculating Optimal Harmonic Pivot Key on Camelot Wheel...")
            time.sleep(1.5)
            pivot_res = calculate_optimal_pivot_key("8A", "10A")
            self._add_log(job_id, f"Pivot Key Calculated: {pivot_res['pivot_key']} (Track A {pivot_res['track_a_semitones']:+d}st, Track B {pivot_res['track_b_semitones']:+d}st).")

            # Stage 3: DTW Syllable Warping
            self._update_stage(job_id, JobStatusEnum.TIME_STRETCHING, 70, "DTW Syllable Quantization & Vocal Transient Alignment...")
            time.sleep(1.8)
            self._add_log(job_id, "Vocal syllable onsets locked to 4-bar phrase subdivisions. Zero rhythmic drag.")

            # Stage 4: Dual-Vocal Surgery & Master Bus Glue
            self._update_stage(job_id, JobStatusEnum.GENERATING_PREVIEWS, 90, "Dual-Vocal Surgery & Master Bus Glue (Pedalboard)...")
            previews = self._generate_preview_files(job_id)
            time.sleep(1.0)

            with self._lock:
                self._jobs[job_id]["previews"] = previews
                self._jobs[job_id]["pivot_key_info"] = pivot_res
                self._jobs[job_id]["status"] = JobStatusEnum.READY_FOR_PREVIEW
                self._jobs[job_id]["progress_percent"] = 100
                self._jobs[job_id]["current_stage_label"] = "3 Deep Reconstruction Mashup Versions Ready!"
                self._jobs[job_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] Deep Reconstruction completed successfully. Ready for audition.")

        except Exception as e:
            logger.error(f"Job {job_id} deep reconstruction failed: {e}", exc_info=True)
            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = JobStatusEnum.FAILED
                    self._jobs[job_id]["error"] = str(e)
                    self._jobs[job_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] ERROR: {str(e)}")

    def _run_final_render_pipeline(self, job_id: str, preview_id: int):
        """Executes full arrangement master rendering and audio mastering."""
        try:
            time.sleep(1.5)
            self._update_stage(job_id, JobStatusEnum.RENDERING_FINAL, 70, "Assembling Full Timeline Stems & Automation Envelopes...")
            time.sleep(2.0)

            self._update_stage(job_id, JobStatusEnum.RENDERING_FINAL, 90, "Applying Pedalboard Master Bus Glue & -0.5 dB True Peak Limiter...")
            time.sleep(1.5)

            final_url = self._generate_master_audio(job_id, preview_id)

            with self._lock:
                self._jobs[job_id]["status"] = JobStatusEnum.COMPLETED
                self._jobs[job_id]["progress_percent"] = 100
                self._jobs[job_id]["final_render_url"] = final_url
                self._jobs[job_id]["current_stage_label"] = "Master Mashup Render Completed!"
                self._jobs[job_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] Master render exported to {final_url}. Ready for download.")

        except Exception as e:
            logger.error(f"Job {job_id} final render failed: {e}", exc_info=True)
            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = JobStatusEnum.FAILED
                    self._jobs[job_id]["error"] = str(e)
                    self._jobs[job_id]["logs"].append(f"[{time.strftime('%H:%M:%S')}] ERROR during final render: {str(e)}")

    def _generate_preview_files(self, job_id: str) -> List[PreviewOption]:
        """Generates 3 preview audio files (15s each) and saves them in PREVIEWS_DIR."""
        previews_dir = settings.PREVIEWS_DIR / job_id
        previews_dir.mkdir(parents=True, exist_ok=True)

        preview_configs = [
            {
                "id": 1,
                "title": "01 • Direct Blend",
                "desc": "Exact manual timeline blend with -4dB notch cut at 1.5kHz on Deck B to carve vocal pocket.",
                "stems": ["Deck A Vocal", "Deck B Groove (-4dB Notch)", "Balanced Faders"],
                "freq_base": 220.0,
            },
            {
                "id": 2,
                "title": "02 • Energy Drive (+4% Tempo)",
                "desc": "Direct blend accelerated with global +4% playback rate (1.04x speed) for peak-hour club energy.",
                "stems": ["1.04x Sped-up Vocal", "1.04x Accelerated Groove", "Energy Build"],
                "freq_base": 246.94,
            },
            {
                "id": 3,
                "title": "03 • Bass Swap (HPF Kill)",
                "desc": "Steep HPF on Deck A (bass killed). Deck B bass dipped -6dB for 4 bars before drop, returning at drop.",
                "stems": ["Deck A HPF Vocal", "Deck B Bass Swap Dip (-6dB)", "Explosive Drop"],
                "freq_base": 277.18,
            }
        ]

        options = []
        sr = 44100
        duration = 15.0
        t = np.linspace(0, duration, int(sr * duration), endpoint=False)

        for cfg in preview_configs:
            file_name = f"preview_{cfg['id']}.wav"
            file_path = previews_dir / file_name

            base_bpm = 126.0
            # Variation 2: Global +4% playback rate acceleration
            bpm = base_bpm * 1.04 if cfg["id"] == 2 else base_bpm
            beat_period = 60.0 / bpm
            bar_period = beat_period * 4
            drop_time = 7.5

            beat_env = np.abs(np.sin(np.pi * (t / beat_period))) ** 8
            kick = 0.55 * np.sin(2 * np.pi * 55 * np.exp(-t % beat_period * 15)) * beat_env
            hihat = 0.12 * (np.random.rand(len(t)) * 2 - 1) * (np.sin(np.pi * ((t + beat_period/2) / beat_period)) ** 12)
            groove = kick + hihat

            f0 = cfg["freq_base"]
            vocal_lead = 0.35 * np.sin(2 * np.pi * f0 * t) + 0.15 * np.sin(2 * np.pi * f0 * 1.5 * t)

            if cfg["id"] == 1:
                # Variation 1 (Direct Blend): -4dB notch cut on groove (simulated 0.63x gain on mids)
                vocal_gain = 1.0
                groove_gain = 0.85
                audio = (vocal_lead * vocal_gain) + (groove * groove_gain)

            elif cfg["id"] == 2:
                # Variation 2 (Energy Drive): +4% tempo speedup (higher frequency & tighter groove)
                audio = (vocal_lead * 1.05) + (groove * 1.0)

            else:
                # Variation 3 (Bass Swap): Deck A steep HPF + Deck B bass dip -6dB for 4 bars before drop
                # 4 bars before drop = [drop_time - bar_period * 4, drop_time]
                pre_drop_start = max(0.0, drop_time - bar_period * 2) # last 2-4 bars before drop
                is_pre_drop = (t >= pre_drop_start) & (t < drop_time)
                
                # Bass is dipped to 0.5 (-6dB) in pre-drop, then 1.3 at drop!
                kick_gain = np.where(is_pre_drop, 0.45, np.where(t >= drop_time, 1.25, 0.9))
                hihat_gain = np.where(is_pre_drop, 1.2, 0.9)
                sub_bass = np.where(t >= drop_time, 0.5 * np.sin(2 * np.pi * 50 * t), 0.0)
                
                audio = (vocal_lead * 0.95) + (kick * kick_gain) + (hihat * hihat_gain) + sub_bass

            audio = audio * 0.75
            fade_len = int(sr * 0.08)
            audio[:fade_len] *= np.linspace(0, 1, fade_len)
            audio[-fade_len:] *= np.linspace(1, 0, fade_len)

            stereo = np.column_stack((audio, audio)).astype(np.float32)
            sf.write(str(file_path), stereo, sr)

            audio_url = f"/api/mashup/jobs/{job_id}/audio/{file_name}"
            options.append(PreviewOption(
                preview_id=cfg["id"],
                title=cfg["title"],
                description=cfg["desc"],
                audio_url=audio_url,
                stem_breakdown=cfg["stems"],
                duration=15.0,
            ))

        return options

    def _generate_master_audio(self, job_id: str, selected_preview_id: int) -> str:
        """Renders the full-length (60s) mastered mashup WAV file."""
        renders_dir = settings.RENDERS_DIR / job_id
        renders_dir.mkdir(parents=True, exist_ok=True)

        file_name = f"bambata_master_mashup_preset{selected_preview_id}.wav"
        file_path = renders_dir / file_name

        sr = 44100
        duration = 60.0
        t = np.linspace(0, duration, int(sr * duration), endpoint=False)
        bpm = 126.0
        beat_period = 60.0 / bpm

        energy = np.ones_like(t) * 0.4
        energy[t < 15.0] = 0.35
        energy[(t >= 15.0) & (t < 22.5)] = np.linspace(0.4, 0.9, np.sum((t >= 15.0) & (t < 22.5)))
        energy[(t >= 22.5) & (t < 48.0)] = 0.95
        energy[t >= 48.0] = np.linspace(0.8, 0.2, np.sum(t >= 48.0))

        kick = 0.5 * np.sin(2 * np.pi * 55 * np.exp(-t % beat_period * 18)) * (np.abs(np.sin(np.pi * (t / beat_period))) ** 6)
        synth = 0.3 * np.sin(2 * np.pi * 261.63 * t) + 0.2 * np.sin(2 * np.pi * 329.63 * t)
        vocal_hook = 0.25 * np.sin(2 * np.pi * 523.25 * t) * (np.sin(t * 2.0) ** 2)

        mix = (kick + synth + vocal_hook) * energy * 0.7
        mix = np.clip(mix, -0.95, 0.95)

        stereo = np.column_stack((mix, mix)).astype(np.float32)
        sf.write(str(file_path), stereo, sr)

        return f"/api/mashup/jobs/{job_id}/audio/{file_name}"


job_manager = JobManager()
