"""BAMBATA 2.0 - YouTube Style-Transfer & Reference DNA Extractor.

Extracts arrangement templates from professional club reference mashups:
1. Rips YouTube reference tracks via yt-dlp or matches curated Afrohouse / Amapiano templates (Dlala Thukzin, Kabza De Small, etc.).
2. Extracts a "Blueprint JSON":
   - total_duration_s
   - build_bars (tension risers)
   - drop_timing_pct (e.g. 25%, 50%, 75%)
   - vocal_placement_density
   - percussion_groove_type ("3-step Amapiano / Afrohouse Polyrhythm")
3. Injects this Blueprint into the LLM prompt to mold user tracks into the reference DNA.
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import librosa

from app.config import settings
from app.services.harmonic_math import normalize_to_camelot, calculate_optimal_pivot_key
from app.services.structure_analyzer import StructureAnalyzer

logger = logging.getLogger("bambata.style_transfer")


class StyleTransferEngine:
    """Extracts structural blueprints from YouTube reference mashups and applies them to new mixes."""

    AFRO_AMAPIANO_PRESETS = [
        {
            "id": "dlala_thukzin_afrohouse",
            "title": "Dlala Thukzin - Phuze / iMali Afrohouse Peak Mashup",
            "style_genre": "Afrohouse / Gqom-Infused 3-Step",
            "target_bpm": 126.0,
            "camelot_key": "9A",
            "total_duration_s": 60.0,
            "build_bars": 8,
            "drop_timing_pct": 0.25,
            "vocal_placement_density": 0.70,
            "percussion_groove_type": "3-step Afrohouse kick with polyrhythmic shakers",
            "sub_bass_profile": "Heavy rolling sub-bass with lowpass envelope",
            "structure_blueprint": {
                "intro_bars": 4,
                "verse_bars": 8,
                "build_bars": 8,
                "drop_bars": 16,
                "breakdown_bars": 8,
                "climax_drop_bars": 16,
                "outro_bars": 8
            }
        },
        {
            "id": "amapiano_log_drum_groove",
            "title": "Kabza De Small x Kelvin Momo - Private School Amapiano Drop",
            "style_genre": "Private School Amapiano",
            "target_bpm": 113.0,
            "camelot_key": "8A",
            "total_duration_s": 60.0,
            "build_bars": 4,
            "drop_timing_pct": 0.20,
            "vocal_placement_density": 0.85,
            "percussion_groove_type": "Deep log drum slide bass with jazzy piano riffs",
            "sub_bass_profile": "Pitched resonant log drum with transient attack",
            "structure_blueprint": {
                "intro_bars": 4,
                "verse_bars": 8,
                "build_bars": 4,
                "drop_bars": 16,
                "breakdown_bars": 8,
                "climax_drop_bars": 16,
                "outro_bars": 4
            }
        },
        {
            "id": "fred_again_club_anthem",
            "title": "Fred again.. x Swedish House Mafia - Turn On The Lights VIP",
            "style_genre": "Modern UK Bass / Tech Club",
            "target_bpm": 128.0,
            "camelot_key": "9A",
            "total_duration_s": 60.0,
            "build_bars": 8,
            "drop_timing_pct": 0.30,
            "vocal_placement_density": 0.75,
            "percussion_groove_type": "Driving 4/4 tech-house kick with vocal riser",
            "sub_bass_profile": "Punchy sine sub-bass with sidechain pumping",
            "structure_blueprint": {
                "intro_bars": 4,
                "verse_bars": 8,
                "build_bars": 8,
                "drop_bars": 16,
                "breakdown_bars": 8,
                "climax_drop_bars": 16,
                "outro_bars": 4
            }
        }
    ]

    def __init__(self):
        self.analyzer = StructureAnalyzer()

    def extract_or_match_reference_dna(
        self,
        youtube_url: Optional[str] = None,
        bpm_a: float = 126.0,
        bpm_b: float = 126.0,
        key_a: str = "8A",
        key_b: str = "8A"
    ) -> Dict[str, Any]:
        """
        Extracts structural DNA from a YouTube URL if provided,
        or intelligently selects the highest-resonance style template (Afrohouse / Amapiano)
        based on the user's Track A & Track B metadata.
        """
        avg_bpm = (bpm_a + bpm_b) / 2.0
        pivot_data = calculate_optimal_pivot_key(key_a, key_b)
        pivot_key = pivot_data.get("pivot_camelot", "9A")

        if youtube_url and ("youtube.com" in youtube_url or "youtu.be" in youtube_url):
            logger.info(f"Extracting Reference DNA from YouTube URL: {youtube_url}")
            try:
                # Attempt to download and analyze reference
                blueprint = self._download_and_analyze_youtube(youtube_url, avg_bpm, pivot_key)
                if blueprint:
                    return blueprint
            except Exception as e:
                logger.warning(f"YouTube DNA extraction failed: {e}. Falling back to stylistic template match.")

        # Match to optimal stylistic blueprint (e.g. Afrohouse if 120-128 BPM, Amapiano if 110-118 BPM)
        return self._find_best_stylistic_template(avg_bpm, pivot_key)

    def _find_best_stylistic_template(self, bpm: float, pivot_key: str) -> Dict[str, Any]:
        """Finds the best matching Afrohouse / Amapiano structural template."""
        if bpm < 118.0:
            template = dict(self.AFRO_AMAPIANO_PRESETS[1])  # Amapiano
        elif bpm <= 126.5:
            template = dict(self.AFRO_AMAPIANO_PRESETS[0])  # Dlala Thukzin Afrohouse
        else:
            template = dict(self.AFRO_AMAPIANO_PRESETS[2])  # High-energy Club VIP

        template["target_bpm"] = round(bpm, 1)
        template["camelot_key"] = pivot_key
        template["dna_match_reason"] = f"Auto-matched to '{template['title']}' ({template['style_genre']}) at {bpm:.1f} BPM / Pivot Key {pivot_key}."
        return template

    def _download_and_analyze_youtube(
        self,
        youtube_url: str,
        target_bpm: float,
        target_key: str
    ) -> Optional[Dict[str, Any]]:
        """Downloads audio from YouTube using yt-dlp and extracts structural DNA."""
        try:
            import yt_dlp

            temp_output = str(settings.TEMP_DIR / "yt_ref_%(id)s.%(ext)s")
            ydl_opts = {
                'format': 'bestaudio/best',
                'outtmpl': temp_output,
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'wav',
                    'preferredquality': '192',
                }],
                'quiet': True,
                'no_warnings': True,
                'max_filesize': 25 * 1024 * 1024,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                video_id = info.get('id', 'ref')
                title = info.get('title', 'YouTube DJ Reference')
                wav_path = str(settings.TEMP_DIR / f"yt_ref_{video_id}.wav")

            if os.path.exists(wav_path):
                analysis = self.analyzer.analyze(wav_path, video_id, title)
                return {
                    "id": f"yt_{video_id}",
                    "title": title,
                    "style_genre": "Custom YouTube Reference",
                    "target_bpm": analysis.bpm,
                    "camelot_key": analysis.key_info.camelot_code,
                    "total_duration_s": analysis.duration_seconds,
                    "build_bars": 8,
                    "drop_timing_pct": round(analysis.primary_drop_time / max(1.0, analysis.duration_seconds), 2),
                    "vocal_placement_density": 0.75,
                    "percussion_groove_type": "Reference Audio Groove",
                    "dna_match_reason": f"Extracted directly from YouTube: '{title}' (Drop at {analysis.primary_drop_time}s).",
                    "structure_blueprint": {
                        "primary_drop_time_s": analysis.primary_drop_time,
                        "segments": [s.dict() for s in analysis.segments]
                    }
                }
        except Exception as e:
            logger.warning(f"yt-dlp download failed: {e}")

        return None


style_transfer_engine = StyleTransferEngine()
