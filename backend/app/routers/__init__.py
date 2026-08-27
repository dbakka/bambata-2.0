from app.routers.reference import router as reference_router
from app.routers.brain import router as brain_router
from app.routers.mashup import router as mashup_router
from app.routers.recommendations import router as recommendations_router

__all__ = [
    "reference_router",
    "brain_router",
    "mashup_router",
    "recommendations_router",
]
