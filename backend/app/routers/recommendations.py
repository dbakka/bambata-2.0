"""Track Recommendation and Retention Router."""
import logging
from fastapi import APIRouter, Query

from app.models.schemas import RecommendationResponse
from app.services.yt_recommender import yt_recommender

logger = logging.getLogger("bambata.routers.recommendations")

router = APIRouter(prefix="/recommendations", tags=["Retention Recommendations"])


@router.get("", response_model=RecommendationResponse)
async def get_recommended_tracks(
    bpm: float = Query(126.0, description="Master mashup tempo"),
    camelot_key: str = Query("8A", description="Master mashup Camelot key code (e.g. 8A, 11B)"),
):
    """
    Returns 3 harmonically compatible tracks (with direct YouTube links) matching
    the mashup's BPM and key (±1 Camelot step) to drive user retention.
    """
    try:
        return yt_recommender.recommend(bpm=bpm, camelot_key=camelot_key)
    except Exception as e:
        logger.error(f"Error fetching recommendations: {e}", exc_info=True)
        return yt_recommender._get_curated_recommendations(bpm, camelot_key, ["8A", "9A", "7A", "8B"])
