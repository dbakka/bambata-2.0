"""The Brain: LLM Arrangement and Camelot Transposition Router."""
import logging
from fastapi import APIRouter, HTTPException

from app.models.schemas import ArrangementRequest, ArrangementSpec
from app.services.llm_arranger import llm_arranger

logger = logging.getLogger("bambata.routers.brain")

router = APIRouter(prefix="/brain", tags=["The Brain - Arrangement"])


@router.post("/arrange", response_model=ArrangementSpec)
async def generate_mashup_arrangement(request: ArrangementRequest):
    """
    Accepts user creative goal prompt, input track keys & roles, and reference structure.
    Uses Gemini LLM and Camelot Wheel harmonic rules to compute master BPM, transpositions,
    stem routing, drop timing, and 3 candidate preview options.
    """
    try:
        arrangement = llm_arranger.generate_arrangement(request)
        return arrangement
    except Exception as e:
        logger.error(f"Error generating arrangement: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Arrangement generation failed: {str(e)}")
