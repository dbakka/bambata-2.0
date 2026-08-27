"""BAMBATA 2.0 Pydantic Schemas."""
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class JobStatusEnum(str, Enum):
    QUEUED = "QUEUED"
    EXTRACTING_STEMS = "EXTRACTING_STEMS"
    TIME_STRETCHING = "TIME_STRETCHING"
    GENERATING_PREVIEWS = "GENERATING_PREVIEWS"
    READY_FOR_PREVIEW = "READY_FOR_PREVIEW"
    RENDERING_FINAL = "RENDERING_FINAL"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# Reference Ingestion Schemas
class ReferenceAnalysisRequest(BaseModel):
    yt_url: str = Field(..., description="YouTube video or shorts URL to analyze")


class StructureSegment(BaseModel):
    label: str = Field(..., description="Segment type: intro, verse, build, drop, chorus, outro")
    start_time: float
    end_time: float
    energy_score: float = Field(..., ge=0.0, le=1.0)


class EnergyPoint(BaseModel):
    timestamp: float
    energy: float


class CamelotKeyInfo(BaseModel):
    key_name: str
    camelot_code: str
    harmonic_matches: List[str] = []


class ReferenceAnalysisResponse(BaseModel):
    video_id: str
    video_title: str
    duration_seconds: float
    bpm: float
    key_info: CamelotKeyInfo
    segments: List[StructureSegment]
    energy_curve: List[EnergyPoint]
    primary_drop_time: float
    waveform_data: Optional[List[float]] = None


# The Brain (Arrangement) Schemas
class TrackMetadata(BaseModel):
    track_id: str
    name: str
    bpm: float
    key: str
    camelot: str
    role: str = Field("lead", description="lead, vocal, beat, instrumental, bass")


class ArrangementRequest(BaseModel):
    prompt: str = Field("1-minute punchy club edit with high-energy drop", description="Creative goal prompt")
    track_a: TrackMetadata
    track_b: TrackMetadata
    reference_analysis: Optional[ReferenceAnalysisResponse] = None


class StemLayerConfig(BaseModel):
    stem_type: str = Field(..., description="vocals, drums, bass, other")
    source_track: str = Field(..., description="track_a or track_b")
    volume: float = 1.0
    active_sections: List[str] = []


class PreviewSnippetPlan(BaseModel):
    preview_id: int
    title: str
    description: str
    start_time: float
    duration: float = 15.0
    stem_combination: List[str]


class ArrangementSpec(BaseModel):
    creative_summary: str
    target_bpm: float
    target_camelot_key: str
    master_track_id: str
    track_a_semitones: int
    track_b_semitones: int
    drop_timestamp: float
    master_structure: List[StructureSegment]
    stem_routing: List[StemLayerConfig]
    preview_plans: List[PreviewSnippetPlan]


# Async GPU Job & Preview Schemas
class PreviewOption(BaseModel):
    preview_id: int
    title: str
    description: str
    audio_url: str
    stem_breakdown: List[str]
    duration: float = 15.0


class MashupJobCreateResponse(BaseModel):
    job_id: str
    status: JobStatusEnum
    message: str


class MashupJobStatusResponse(BaseModel):
    job_id: str
    status: JobStatusEnum
    progress_percent: int
    current_stage_label: str
    logs: List[str]
    previews: List[PreviewOption] = []
    selected_preview_id: Optional[int] = None
    final_render_url: Optional[str] = None
    error: Optional[str] = None
    arrangement_spec: Optional[ArrangementSpec] = None


class PreviewSelectRequest(BaseModel):
    selected_preview_id: int = Field(..., ge=1, le=3)


# YouTube Retention Recommendations
class RecommendedTrack(BaseModel):
    title: str
    artist: str
    youtube_url: str
    thumbnail_url: str
    bpm: float
    camelot_key: str
    compatibility_reason: str


class RecommendationResponse(BaseModel):
    master_bpm: float
    master_camelot_key: str
    recommendations: List[RecommendedTrack]
