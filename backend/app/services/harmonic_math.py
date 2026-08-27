"""BAMBATA 2.0 - Harmonic Pivot Key Engine.

Calculates the optimal intermediate "Pivot Key" on the Camelot Wheel
minimizing the combined total semitone pitch shift across both tracks.
"""
import logging
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger("bambata.harmonic_math")

# Camelot Wheel Mappings (1A-12A Minor, 1B-12B Major)
CAMELOT_TO_SEMITONE_MINOR = {
    "1A": 8,   # Ab Minor / G# Minor
    "2A": 3,   # Eb Minor / D# Minor
    "3A": 10,  # Bb Minor / A# Minor
    "4A": 5,   # F Minor
    "5A": 0,   # C Minor (Root 0)
    "6A": 7,   # G Minor
    "7A": 2,   # D Minor
    "8A": 9,   # A Minor
    "9A": 4,   # E Minor
    "10A": 11, # B Minor
    "11A": 6,  # F# Minor
    "12A": 1,  # Db Minor / C# Minor
}

CAMELOT_TO_SEMITONE_MAJOR = {
    "1B": 11,  # B Major
    "2B": 6,   # F# Major
    "3B": 1,   # Db Major
    "4B": 8,   # Ab Major
    "5B": 3,   # Eb Major
    "6B": 10,  # Bb Major
    "7B": 5,   # F Major
    "8B": 0,   # C Major
    "9B": 7,   # G Major
    "10B": 2,  # D Major
    "11B": 9,  # A Major
    "12B": 4,  # E Major
}

STANDARD_TO_CAMELOT = {
    "ab minor": "1A", "g# minor": "1A", "eb minor": "2A", "d# minor": "2A",
    "bb minor": "3A", "a# minor": "3A", "f minor": "4A", "c minor": "5A",
    "g minor": "6A", "d minor": "7A", "a minor": "8A", "e minor": "9A",
    "b minor": "10A", "f# minor": "11A", "db minor": "12A", "c# minor": "12A",
    "b major": "1B", "f# major": "2B", "db major": "3B", "c# major": "3B",
    "ab major": "4B", "g# major": "4B", "eb major": "5B", "d# major": "5B",
    "bb major": "6B", "a# major": "6B", "f major": "7B", "c major": "8B",
    "g major": "9B", "d major": "10B", "a major": "11B", "e major": "12B",
}

ALL_CAMELOT_KEYS = list(CAMELOT_TO_SEMITONE_MINOR.keys()) + list(CAMELOT_TO_SEMITONE_MAJOR.keys())


def normalize_to_camelot(key_str: str) -> str:
    """Converts a standard key name (e.g. 'A Minor', '8A', 'C#m') to standard Camelot notation."""
    clean = key_str.strip().upper()
    if clean in ALL_CAMELOT_KEYS:
        return clean
    lookup = key_str.strip().lower()
    return STANDARD_TO_CAMELOT.get(lookup, "8A")


def calculate_optimal_pivot_key(key_a: str, key_b: str) -> Dict[str, Any]:
    """
    Finds the optimal Pivot Key on the Camelot Wheel that minimizes the total
    pitch-shifting distance across both Track A and Track B combined.
    """
    cam_a = normalize_to_camelot(key_a)
    cam_b = normalize_to_camelot(key_b)

    is_minor_a = cam_a.endswith("A")
    is_minor_b = cam_b.endswith("A")

    semi_a = CAMELOT_TO_SEMITONE_MINOR[cam_a] if is_minor_a else CAMELOT_TO_SEMITONE_MAJOR[cam_a]
    semi_b = CAMELOT_TO_SEMITONE_MINOR[cam_b] if is_minor_b else CAMELOT_TO_SEMITONE_MAJOR[cam_b]

    best_pivot = cam_a
    min_cost = float("inf")
    best_shift_a = 0
    best_shift_b = 0

    # Prefer minor mode if either track is minor, or test all 24 Camelot keys
    candidate_keys = ALL_CAMELOT_KEYS

    for pivot in candidate_keys:
        is_pivot_minor = pivot.endswith("A")
        semi_pivot = CAMELOT_TO_SEMITONE_MINOR[pivot] if is_pivot_minor else CAMELOT_TO_SEMITONE_MAJOR[pivot]

        # Calculate circular semitone shift distance (-6 to +6)
        shift_a = (semi_pivot - semi_a + 6) % 12 - 6
        shift_b = (semi_pivot - semi_b + 6) % 12 - 6

        # Weigh vocal shift slightly higher to preserve vocal naturalness
        cost = abs(shift_a) * 1.2 + abs(shift_b) * 1.0

        if cost < min_cost:
            min_cost = cost
            best_pivot = pivot
            best_shift_a = shift_a
            best_shift_b = shift_b

    return {
        "original_key_a": cam_a,
        "original_key_b": cam_b,
        "pivot_key": best_pivot,
        "track_a_semitones": int(best_shift_a),
        "track_b_semitones": int(best_shift_b),
        "total_semitone_shift": abs(int(best_shift_a)) + abs(int(best_shift_b)),
        "is_harmonic_lock": (cam_a == cam_b or best_pivot in [cam_a, cam_b]),
        "explanation": f"Track A ({cam_a}) transposed {best_shift_a:+d}st and Track B ({cam_b}) transposed {best_shift_b:+d}st to meet at Pivot Key {best_pivot}."
    }
