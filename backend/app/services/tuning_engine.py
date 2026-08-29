"""BAMBATA 2.0 - Absolute Groove Key-Lock Tuning Engine.

Core Directive:
Track B (The Groove & Bass) strictly dictates the Master Key of the mashup.
Track A's Hero Vocal is extracted, analyzed, and tuned directly to match Track B's scale
using formant-preserved pyrubberband pitch shifting to eliminate dissonance and robotic artifacts.
"""
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np
from scipy import signal

from app.services.harmonic_math import (
    normalize_to_camelot,
    CAMELOT_TO_SEMITONE_MINOR,
    CAMELOT_TO_SEMITONE_MAJOR,
    ALL_CAMELOT_KEYS
)

logger = logging.getLogger("bambata.tuning_engine")

try:
    import pyrubberband as pyrb
    HAS_PYRUBBERBAND = True
except ImportError:
    HAS_PYRUBBERBAND = False


def calculate_groove_lock_semitones(key_vocal_a: str, key_groove_b: str) -> Dict[str, Any]:
    """
    Calculates the exact semitone shift required to lock Track A's vocal
    into Track B's groove key (Track B is the reference root).
    """
    cam_a = normalize_to_camelot(key_vocal_a)
    cam_b = normalize_to_camelot(key_groove_b)

    is_minor_a = cam_a.endswith("A")
    is_minor_b = cam_b.endswith("A")

    semi_a = CAMELOT_TO_SEMITONE_MINOR[cam_a] if is_minor_a else CAMELOT_TO_SEMITONE_MAJOR[cam_a]
    semi_b = CAMELOT_TO_SEMITONE_MINOR[cam_b] if is_minor_b else CAMELOT_TO_SEMITONE_MAJOR[cam_b]

    # Circular shortest semitone distance (-6 to +6)
    shift_semitones = (semi_b - semi_a + 6) % 12 - 6

    # Relative mode compatibility check (if A is minor and B is major with same root)
    is_relative = (cam_a[:-1] == cam_b[:-1]) and (is_minor_a != is_minor_b)

    return {
        "master_key": cam_b,
        "master_key_type": "Groove Anchor (Track B)",
        "vocal_source_key": cam_a,
        "shift_semitones": float(shift_semitones),
        "is_relative_scale": is_relative,
        "tuning_strategy": f"Tune Track A Vocal ({cam_a}) by {shift_semitones:+.1f} semitones -> Locked into Track B ({cam_b})."
    }


def tune_vocal_to_groove_key(
    vocal_audio: np.ndarray,
    key_vocal_a: str,
    key_groove_b: str,
    sample_rate: int = 44100
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Applies formant-preserved pitch shifting to tune Track A's vocal acapella
    directly into Track B's groove key.
    """
    tuning_meta = calculate_groove_lock_semitones(key_vocal_a, key_groove_b)
    shift = tuning_meta["shift_semitones"]

    if abs(shift) < 0.05 or len(vocal_audio) == 0:
        return vocal_audio, tuning_meta

    logger.info(f"Tuning Engine: Shifting Hero Vocal by {shift:+.1f} st to lock into Groove Key ({tuning_meta['master_key']}).")

    if HAS_PYRUBBERBAND:
        try:
            tuned = pyrb.pitch_shift(vocal_audio, sample_rate, n_steps=shift, formants=True).astype(np.float32)
            return tuned, tuning_meta
        except Exception as e:
            logger.warning(f"pyrubberband pitch shift failed: {e}. Falling back to librosa.effects.pitch_shift.")

    try:
        import librosa
        if vocal_audio.ndim == 2:
            left = librosa.effects.pitch_shift(y=vocal_audio[:, 0], sr=sample_rate, n_steps=shift)
            right = librosa.effects.pitch_shift(y=vocal_audio[:, 1], sr=sample_rate, n_steps=shift)
            tuned = np.column_stack((left, right)).astype(np.float32)
        else:
            tuned = librosa.effects.pitch_shift(y=vocal_audio, sr=sample_rate, n_steps=shift).astype(np.float32)
        return tuned, tuning_meta
    except Exception as e:
        logger.warning(f"librosa.effects.pitch_shift fallback failed: {e}. Using resample fallback.")

    ratio = 2.0 ** (shift / 12.0)
    num_samples = int(len(vocal_audio) / ratio)
    resampled = signal.resample(vocal_audio, num_samples)
    tuned = signal.resample(resampled, len(vocal_audio)).astype(np.float32)
    return tuned, tuning_meta
