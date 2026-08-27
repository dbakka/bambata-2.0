"""BAMBATA 2.0 - FastAPI Application Gateway."""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import (
    reference_router,
    brain_router,
    mashup_router,
    recommendations_router,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("bambata.main")

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered DJ mashup engine reverse-engineering YouTube references, Camelot key transpositions, and serverless GPU stem processing.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(reference_router, prefix=settings.API_V1_STR)
app.include_router(brain_router, prefix=settings.API_V1_STR)
app.include_router(mashup_router, prefix=settings.API_V1_STR)
app.include_router(recommendations_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "endpoints": {
            "docs": "/docs",
            "reference_analyze": f"{settings.API_V1_STR}/reference/analyze",
            "brain_arrange": f"{settings.API_V1_STR}/brain/arrange",
            "mashup_jobs": f"{settings.API_V1_STR}/mashup/jobs",
            "recommendations": f"{settings.API_V1_STR}/recommendations",
        }
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "gemini_api_configured": bool(settings.GEMINI_API_KEY),
        "youtube_api_configured": bool(settings.YOUTUBE_API_KEY),
        "modal_configured": bool(settings.MODAL_TOKEN_ID),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
