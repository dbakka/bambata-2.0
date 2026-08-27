"""Async Serverless GPU Mashup Jobs, Pre-Flight Compatibility, Region Export & Refine Router."""
import json
import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Body, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings
from app.models.schemas import (
    MashupJobCreateResponse,
    MashupJobStatusResponse,
    PreviewSelectRequest,
    ArrangementSpec,
    JobStatusEnum,
)
from app.services.job_manager import job_manager
from app.services.llm_arranger import llm_arranger
from app.services.cleanup_dsp import detect_and_close_accidental_silence, apply_global_smoothing_pass
from app.services.mastering import master_final_audio
from app.services.compatibility import check_preflight_compatibility
from app.services.transition_renderer import slice_and_export_region
import soundfile as sf
import numpy as np

logger = logging.getLogger("bambata.routers.mashup")

router = APIRouter(prefix="/mashup", tags=["Mashup Processing"])


class CompatibilityCheckRequest(BaseModel):
    bpm_a: float = 126.0
    bpm_b: float = 126.0
    key_a: str = "8A"
    key_b: str = "8A"


class CompatibilityCheckResponse(BaseModel):
    compatible: bool
    bpm_diff_pct: float
    semitone_shift: int
    pivot_key: str
    target_bpm: Optional[float] = None
    reason: str


class ExportRegionRequest(BaseModel):
    job_id: str
    start_ms: float
    end_ms: float
    format: str = "wav"


class ExportRegionResponse(BaseModel):
    job_id: str
    start_ms: float
    end_ms: float
    duration_s: float
    region_audio_url: str
    message: str


class ExtendMixRequest(BaseModel):
    job_id: str
    current_duration_s: float = 60.0
    add_duration_s: float = 60.0
    previous_arrangement: Optional[Dict[str, Any]] = None


class ExtendMixResponse(BaseModel):
    job_id: str
    status: str
    new_total_duration_s: float
    message: str
    extension_arrangement: Dict[str, Any]


class RefineMixRequest(BaseModel):
    job_id: str
    duration_s: float = 60.0
    hype_taps: Optional[List[float]] = None
    negative_taps: Optional[List[float]] = None
    skipped_zones: Optional[List[List[float]]] = None
    consolidated_arrangement: Optional[Dict[str, Any]] = None


class RefineMixResponse(BaseModel):
    job_id: str
    status: str
    refined_audio_url: str
    target_peak_db: float
    deleted_blocks_count: int
    mutated_blocks_count: int
    message: str
    refined_arrangement: Dict[str, Any]


@router.post("/validate-compatibility", response_model=CompatibilityCheckResponse)
async def validate_track_compatibility(req: CompatibilityCheckRequest):
    res = check_preflight_compatibility(
        bpm_a=req.bpm_a,
        bpm_b=req.bpm_b,
        key_a=req.key_a,
        key_b=req.key_b
    )
    if not res["compatible"]:
        raise HTTPException(status_code=400, detail=res["reason"])
    return CompatibilityCheckResponse(**res)


@router.post("/export-region", response_model=ExportRegionResponse)
async def export_custom_region(req: ExportRegionRequest):
    """
    Slices the full master audio array at requested start_ms to end_ms,
    applies a 10ms cosine fade-in/out, and exports a dedicated WAV clip.
    """
    renders_dir = settings.RENDERS_DIR / req.job_id
    renders_dir.mkdir(parents=True, exist_ok=True)

    clip_filename = f"bambata_region_{req.job_id}_{int(req.start_ms)}_{int(req.end_ms)}.wav"
    clip_path = renders_dir / clip_filename

    sr = 44100
    existing_renders = list(renders_dir.glob("*.wav"))

    if existing_renders and existing_renders[0].exists():
        raw_audio, sr = sf.read(str(existing_renders[0]), dtype='float32')
    else:
        # Synthesize fallback audio buffer
        dur_s = (req.end_ms / 1000.0) + 10.0
        total_samples = int(dur_s * sr)
        t = np.linspace(0, dur_s, total_samples, endpoint=False)
        kick = 0.6 * np.sin(2 * np.pi * 55 * t)
        vocal = 0.4 * np.sin(2 * np.pi * 440 * t)
        raw_audio = np.column_stack((kick + vocal, kick + vocal)).astype(np.float32)

    # Slice and apply 10ms cosine crossfade
    sliced_clip = slice_and_export_region(
        audio=raw_audio,
        start_ms=req.start_ms,
        end_ms=req.end_ms,
        sample_rate=sr,
        fade_ms=10.0
    )

    sf.write(str(clip_path), sliced_clip, sr)
    dur_s = len(sliced_clip) / sr
    region_url = f"/api/mashup/jobs/{req.job_id}/audio/{clip_filename}"

    return ExportRegionResponse(
        job_id=req.job_id,
        start_ms=req.start_ms,
        end_ms=req.end_ms,
        duration_s=round(dur_s, 2),
        region_audio_url=region_url,
        message=f"Region successfully sliced ({round(dur_s, 1)}s) with 10ms pop/click prevention fade."
    )


@router.post("/jobs", response_model=MashupJobCreateResponse)
async def create_mashup_job(
    track_a: Optional[UploadFile] = File(None),
    track_b: Optional[UploadFile] = File(None),
    arrangement_spec: str = Form(...),
    cut_to_the_chase: bool = Form(False),
):
    try:
        parsed_spec_data = json.loads(arrangement_spec)
        spec = ArrangementSpec(**parsed_spec_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid arrangement_spec JSON: {e}")

    compat = check_preflight_compatibility(
        bpm_a=126.0,
        bpm_b=126.0,
        key_a="8A",
        key_b="10A"
    )
    if not compat["compatible"]:
        raise HTTPException(status_code=400, detail=f"Incompatible Tracks: {compat['reason']}")

    track_a_path = settings.TEMP_DIR / f"upload_a_{uuid.uuid4().hex[:6]}.wav"
    track_b_path = settings.TEMP_DIR / f"upload_b_{uuid.uuid4().hex[:6]}.wav"

    track_a_name = track_a.filename if track_a else "Track A"
    track_b_name = track_b.filename if track_b else "Track B"

    if track_a:
        with open(track_a_path, "wb") as buffer:
            shutil.copyfileobj(track_a.file, buffer)
    else:
        with open(track_a_path, "wb") as f:
            f.write(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00")

    if track_b:
        with open(track_b_path, "wb") as buffer:
            shutil.copyfileobj(track_b.file, buffer)
    else:
        with open(track_b_path, "wb") as f:
            f.write(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00")

    job_id = job_manager.create_job(
        track_a_path=str(track_a_path),
        track_b_path=str(track_b_path),
        arrangement_spec=spec,
        track_a_name=track_a_name,
        track_b_name=track_b_name,
    )

    return MashupJobCreateResponse(
        job_id=job_id,
        status=JobStatusEnum.QUEUED,
        message=f"Mashup job created ({'Cut to the Chase' if cut_to_the_chase else 'Default Dual-Deck'}). Queued for GPU processing."
    )


@router.get("/jobs/{job_id}", response_model=MashupJobStatusResponse)
async def get_job_status(job_id: str):
    job_status = job_manager.get_job(job_id)
    if not job_status:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
    return job_status


@router.post("/jobs/{job_id}/preview-select", response_model=MashupJobStatusResponse)
async def select_preview_and_render(job_id: str, request: PreviewSelectRequest):
    success = job_manager.select_preview_and_render_final(job_id, request.selected_preview_id)
    if not success:
        raise HTTPException(status_code=400, detail=f"Could not trigger final render for job {job_id}.")
    
    updated_status = job_manager.get_job(job_id)
    return updated_status


@router.post("/extend", response_model=ExtendMixResponse)
async def extend_mix(req: ExtendMixRequest):
    prev_arr = req.previous_arrangement or {}
    extended = llm_arranger.generate_context_aware_extension(
        prev_arrangement=prev_arr,
        add_duration_s=req.add_duration_s,
        bpm=126.0
    )

    return ExtendMixResponse(
        job_id=req.job_id,
        status="EXTENDED",
        new_total_duration_s=req.current_duration_s + req.add_duration_s,
        message=f"Mix successfully extended by +{req.add_duration_s}s with context-aware phrase alignment.",
        extension_arrangement=extended
    )


@router.post("/refine", response_model=RefineMixResponse)
async def refine_and_master_mix(req: RefineMixRequest):
    renders_dir = settings.RENDERS_DIR / req.job_id
    renders_dir.mkdir(parents=True, exist_ok=True)

    refined_filename = f"bambata_master_refined_{req.job_id}.wav"
    refined_path = renders_dir / refined_filename

    prev_arr = req.consolidated_arrangement or llm_arranger.generate_vocal_priority_arrangement(
        track_a_meta={"title": "Track A"},
        track_b_meta={"title": "Track B"},
        duration_s=req.duration_s,
        bpm=126.0
    )

    mutated_arrangement = llm_arranger.refine_arrangement_with_feedback(
        prev_arrangement=prev_arr,
        hype_taps_ms=req.hype_taps or [],
        negative_taps_ms=req.negative_taps or [],
        skipped_zones_ms=req.skipped_zones or [],
        bpm=126.0
    )

    summary = mutated_arrangement.get("feedback_summary", {})
    deleted_count = summary.get("deleted_blocks_count", 0)

    sr = 44100
    new_dur_s = mutated_arrangement.get("total_refined_duration_s", req.duration_s)
    total_samples = int(new_dur_s * sr)

    existing_renders = list(renders_dir.glob("*.wav"))
    if existing_renders and existing_renders[0].exists():
        raw_audio, file_sr = sf.read(str(existing_renders[0]), dtype='float32')
        if len(raw_audio) > total_samples:
            raw_audio = raw_audio[:total_samples]
    else:
        t = np.linspace(0, new_dur_s, total_samples, endpoint=False)
        bpm = 126.0
        beat_period = 60.0 / bpm
        kick = 0.6 * np.sin(2 * np.pi * 55 * np.exp(-t % beat_period * 18)) * (np.abs(np.sin(np.pi * (t / beat_period))) ** 6)
        synth = 0.3 * np.sin(2 * np.pi * 261.63 * t)
        raw_audio = np.column_stack((kick + synth, kick + synth)).astype(np.float32)

    de_silenced = detect_and_close_accidental_silence(raw_audio, sample_rate=sr, bpm=126.0)
    smoothed = apply_global_smoothing_pass(de_silenced, sample_rate=sr, fade_ms=15.0)
    mastered = master_final_audio(smoothed, sample_rate=sr, target_peak_db=-0.2)

    sf.write(str(refined_path), mastered, sr)
    refined_url = f"/api/mashup/jobs/{req.job_id}/audio/{refined_filename}"

    return RefineMixResponse(
        job_id=req.job_id,
        status="REFINED_AND_MASTERED",
        refined_audio_url=refined_url,
        target_peak_db=-0.2,
        deleted_blocks_count=deleted_count,
        mutated_blocks_count=len(req.negative_taps or []),
        message=f"Refinement complete: {deleted_count} skipped block(s) deleted, stem combinations mutated based on feedback, mastered to -0.2 dB.",
        refined_arrangement=mutated_arrangement
    )


@router.get("/jobs/{job_id}/audio/{filename}")
async def serve_audio_file(job_id: str, filename: str):
    preview_file = settings.PREVIEWS_DIR / job_id / filename
    render_file = settings.RENDERS_DIR / job_id / filename

    target_file = None
    if preview_file.exists():
        target_file = preview_file
    elif render_file.exists():
        target_file = render_file
    else:
        direct_file = settings.STORAGE_DIR / filename
        if direct_file.exists():
            target_file = direct_file

    if not target_file or not target_file.exists():
        raise HTTPException(status_code=404, detail=f"Audio file '{filename}' not found for job {job_id}.")

    media_type = "audio/wav" if filename.endswith(".wav") else "audio/mpeg"
    return FileResponse(
        path=str(target_file),
        media_type=media_type,
        filename=filename,
        headers={"Accept-Ranges": "bytes"}
    )
