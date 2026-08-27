"""Reference Media Ingestion Router (YouTube, TikTok, Instagram & Video Uploads)."""
import logging
import shutil
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import settings
from app.models.schemas import ReferenceAnalysisRequest, ReferenceAnalysisResponse
from app.services.yt_downloader import media_downloader
from app.services.structure_analyzer import structure_analyzer

logger = logging.getLogger("bambata.routers.reference")

router = APIRouter(prefix="/reference", tags=["Reference Ingestion"])


@router.post("/analyze", response_model=ReferenceAnalysisResponse)
async def analyze_reference_track(request: ReferenceAnalysisRequest):
    """
    Ingests any social link (YouTube, TikTok, Instagram Reels, X), extracts audio,
    and returns BPM, Camelot Key, energy curve, and drop points.
    """
    if not request.yt_url or ("http" not in request.yt_url and len(request.yt_url) < 5):
        raise HTTPException(status_code=400, detail="Invalid URL provided.")

    try:
        media_meta = media_downloader.extract_from_url(request.yt_url)
        analysis = structure_analyzer.analyze(
            audio_path=media_meta["file_path"],
            video_id=media_meta["video_id"],
            video_title=media_meta["title"],
        )
        return analysis

    except Exception as e:
        logger.error(f"Error analyzing reference URL: {e}", exc_info=True)
        return structure_analyzer._generate_fallback_analysis(
            video_id=str(uuid.uuid4())[:8],
            video_title=f"Social Clip ({request.yt_url[:25]}...)",
        )


@router.post("/upload-video", response_model=ReferenceAnalysisResponse)
async def analyze_uploaded_video(
    video_file: UploadFile = File(...),
):
    """
    Accepts a screen recording or video file (.mp4, .mov, .webm, .mkv, .wav, .mp3),
    extracts the audio track, and returns the drop map & energy curve.
    """
    try:
        temp_input = settings.TEMP_DIR / f"upload_{uuid.uuid4().hex[:6]}_{video_file.filename}"
        with open(temp_input, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)

        # Extract audio track from video
        media_meta = media_downloader.extract_from_video_file(
            video_file_path=str(temp_input),
            original_filename=video_file.filename or "Screen Recording",
        )

        analysis = structure_analyzer.analyze(
            audio_path=media_meta["file_path"],
            video_id=media_meta["video_id"],
            video_title=media_meta["title"],
        )
        return analysis

    except Exception as e:
        logger.error(f"Error processing video upload: {e}", exc_info=True)
        return structure_analyzer._generate_fallback_analysis(
            video_id=str(uuid.uuid4())[:8],
            video_title=f"Screen Recording ({video_file.filename or 'Video'})",
        )
