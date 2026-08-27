"""BAMBATA 2.0 - Pre-Flight Track Compatibility Matrix.

Analyzes BPM and Camelot Key compatibility before expensive GPU stem separation begins:
1. BPM Rejection Rule: If relative BPM difference > 20%, rejects incompatible tempo pairing.
2. Harmonic Rejection Rule: If shortest Camelot wheel distance requires > 2 semitones of pitch shifting across both tracks combined, rejects incompatible keys.
"""
import logging
from typing import Dict, Any, Tuple
from app.services.harmonic_math import calculate_optimal_pivot_key

logger = logging.getLogger("bambata.compatibility")


def check_preflight_compatibility(
    bpm_a: float,
    bpm_b: float,
    key_a: str = "8A",
    key_b: str = "8A",
    max_bpm_diff_ratio: float = 0.20,
    max_semitone_shift: int = 2
) -> Dict[str, Any]:
    """
    Evaluates whether Track A and Track B are musically compatible.
    
    Rejection Rules:
    1. If relative BPM difference > 20% (and not a 1:2 half/double-time match), reject.
    2. If shortest Camelot distance requires > 2 semitones pitch shift, reject.
    
    Returns:
        {
            "compatible": bool,
            "bpm_diff_pct": float,
            "semitone_shift": int,
            "pivot_key": str,
            "target_bpm": float,
            "reason": str
        }
    """
    # 1. BPM Compatibility Check
    avg_bpm = (bpm_a + bpm_b) / 2.0
    bpm_diff = abs(bpm_a - bpm_b)
    bpm_diff_ratio = bpm_diff / max(bpm_a, bpm_b)
    bpm_diff_pct = round(bpm_diff_ratio * 100, 1)

    # Check half-time / double-time compatibility
    is_harmonic_tempo = False
    if abs(bpm_a * 2 - bpm_b) / max(bpm_a * 2, bpm_b) <= 0.10:
        is_harmonic_tempo = True
    elif abs(bpm_b * 2 - bpm_a) / max(bpm_b * 2, bpm_a) <= 0.10:
        is_harmonic_tempo = True

    if bpm_diff_ratio > max_bpm_diff_ratio and not is_harmonic_tempo:
        return {
            "compatible": False,
            "bpm_diff_pct": bpm_diff_pct,
            "semitone_shift": 0,
            "pivot_key": "N/A",
            "target_bpm": None,
            "reason": f"Tracks are incompatible: Tempo difference is {bpm_diff_pct}% ({bpm_a:.0f} BPM vs {bpm_b:.0f} BPM). Stretching beyond 20% causes severe audio distortion."
        }

    # 2. Harmonic Pivot Key & Semitone Shift Check
    pivot_info = calculate_optimal_pivot_key(key_a, key_b)
    shift_a = abs(pivot_info.get("semitone_shift_a", 0))
    shift_b = abs(pivot_info.get("semitone_shift_b", 0))
    max_shift = max(shift_a, shift_b)

    if max_shift > max_semitone_shift:
        return {
            "compatible": False,
            "bpm_diff_pct": bpm_diff_pct,
            "semitone_shift": max_shift,
            "pivot_key": pivot_info.get("pivot_camelot", "Unknown"),
            "target_bpm": None,
            "reason": f"Tracks are incompatible: Key mismatch ({key_a} vs {key_b}) requires {max_shift} semitones of pitch shift, exceeding the 2-semitone vocal clarity limit."
        }

    return {
        "compatible": True,
        "bpm_diff_pct": bpm_diff_pct,
        "semitone_shift": max_shift,
        "pivot_key": pivot_info.get("pivot_camelot", key_a),
        "target_bpm": round(avg_bpm, 1),
        "reason": f"Compatible! Harmonically locked to Pivot Key {pivot_info.get('pivot_camelot', key_a)} with {bpm_diff_pct}% tempo blend."
    }
