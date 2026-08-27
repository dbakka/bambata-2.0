"""Camelot Wheel and Harmonic Mixing Calculation Engine."""
from typing import Dict, List, Tuple
import re

# Standard Camelot Wheel mapping
# Format: (Key Name, Mode) -> Camelot Code
CAMELOT_MAP: Dict[str, str] = {
    # Minor Keys (A)
    "Abm": "1A", "G#m": "1A", "Ab minor": "1A", "G# minor": "1A",
    "Ebm": "2A", "D#m": "2A", "Eb minor": "2A", "D# minor": "2A",
    "Bbm": "3A", "A#m": "3A", "Bb minor": "3A", "A# minor": "3A",
    "Fm": "4A", "F minor": "4A",
    "Cm": "5A", "C minor": "5A",
    "Gm": "6A", "G minor": "6A",
    "Dm": "7A", "D minor": "7A",
    "Am": "8A", "A minor": "8A",
    "Em": "9A", "E minor": "9A",
    "Bm": "10A", "B minor": "10A",
    "F#m": "11A", "Gbm": "11A", "F# minor": "11A", "Gb minor": "11A",
    "C#m": "12A", "Dbm": "12A", "C# minor": "12A", "Db minor": "12A",

    # Major Keys (B)
    "B": "1B", "B Major": "1B", "Bmaj": "1B",
    "F#": "2B", "Gb": "2B", "F# Major": "2B", "Gb Major": "2B", "F#maj": "2B", "Gbmaj": "2B",
    "Db": "3B", "C#": "3B", "Db Major": "3B", "C# Major": "3B", "Dbmaj": "3B", "C#maj": "3B",
    "Ab": "4B", "G#": "4B", "Ab Major": "4B", "G# Major": "4B", "Abmaj": "4B", "G#maj": "4B",
    "Eb": "5B", "D#": "5B", "Eb Major": "5B", "D# Major": "5B", "Ebmaj": "5B", "D#maj": "5B",
    "Bb": "6B", "A#": "6B", "Bb Major": "6B", "A# Major": "6B", "Bbmaj": "6B", "A#maj": "6B",
    "F": "7B", "F Major": "7B", "Fmaj": "7B",
    "C": "8B", "C Major": "8B", "Cmaj": "8B",
    "G": "9B", "G Major": "9B", "Gmaj": "9B",
    "D": "10B", "D Major": "10B", "Dmaj": "10B",
    "A": "11B", "A Major": "11B", "Amaj": "11B",
    "E": "12B", "E Major": "12B", "Emaj": "12B",
}

# Reverse mapping: Camelot Code -> Standard Key Representation
CAMELOT_TO_STANDARD: Dict[str, str] = {
    "1A": "G# minor", "1B": "B Major",
    "2A": "D# minor", "2B": "F# Major",
    "3A": "A# minor", "3B": "C# Major",
    "4A": "F minor",  "4B": "Ab Major",
    "5A": "C minor",  "5B": "Eb Major",
    "6A": "G minor",  "6B": "Bb Major",
    "7A": "D minor",  "7B": "F Major",
    "8A": "A minor",  "8B": "C Major",
    "9A": "E minor",  "9B": "G Major",
    "10A": "B minor", "10B": "D Major",
    "11A": "F# minor","11B": "A Major",
    "12A": "C# minor","12B": "E Major",
}

# Chromatic scale semitone offsets from C (0 to 11)
NOTE_PITCH_CLASS: Dict[str, int] = {
    "C": 0, "B#": 0,
    "C#": 1, "Db": 1,
    "D": 2,
    "D#": 3, "Eb": 3,
    "E": 4, "Fb": 4,
    "F": 5, "E#": 5,
    "F#": 6, "Gb": 6,
    "G": 7,
    "G#": 8, "Ab": 8,
    "A": 9,
    "A#": 10, "Bb": 10,
    "B": 11, "Cb": 11,
}

# Canonical root pitch class for each Camelot code
CAMELOT_ROOT_PITCH: Dict[str, int] = {
    "1A": 8,   # G#m
    "1B": 11,  # B
    "2A": 3,   # D#m
    "2B": 6,   # F#
    "3A": 10,  # A#m
    "3B": 1,   # C#
    "4A": 5,   # Fm
    "4B": 8,   # Ab
    "5A": 0,   # Cm
    "5B": 3,   # Eb
    "6A": 7,   # Gm
    "6B": 10,  # Bb
    "7A": 2,   # Dm
    "7B": 5,   # F
    "8A": 9,   # Am
    "8B": 0,   # C
    "9A": 4,   # Em
    "9B": 7,   # G
    "10A": 11, # Bm
    "10B": 2,  # D
    "11A": 6,  # F#m
    "11B": 9,  # A
    "12A": 1,  # C#m
    "12B": 4,  # E
}


def normalize_key_string(key_input: str) -> str:
    """Cleans and standardizes a key input string."""
    cleaned = key_input.strip()
    # Check direct Camelot code like 8A, 11B
    camelot_match = re.match(r"^([1-9]|1[0-2])([a-bA-B])$", cleaned)
    if camelot_match:
        num, letter = camelot_match.groups()
        return f"{num}{letter.upper()}"
    return cleaned


def to_camelot(key_input: str) -> str:
    """Converts a standard key or Camelot string to canonical Camelot code."""
    normalized = normalize_key_string(key_input)
    if normalized in CAMELOT_TO_STANDARD:
        return normalized
    if normalized in CAMELOT_MAP:
        return CAMELOT_MAP[normalized]
    
    # Try case-insensitive lookup
    for k, v in CAMELOT_MAP.items():
        if k.lower() == normalized.lower():
            return v
            
    # Default fallback
    return "8A"


def get_harmonic_matches(camelot_code: str) -> List[str]:
    """
    Returns harmonic mix candidates for a given Camelot key:
    1. Same Key (e.g. 8A)
    2. +1 step clockwise (e.g. 9A - Energy Boost)
    3. -1 step counter-clockwise (e.g. 7A - Energy Drop)
    4. Relative Major/Minor (e.g. 8B - Mood Shift)
    """
    code = to_camelot(camelot_code)
    num = int(code[:-1])
    letter = code[-1]
    other_letter = "B" if letter == "A" else "A"

    plus_1 = 1 if num == 12 else num + 1
    minus_1 = 12 if num == 1 else num - 1

    return [
        f"{num}{letter}",          # Exact Match
        f"{plus_1}{letter}",       # Energy Boost (+1)
        f"{minus_1}{letter}",      # Energy Chill (-1)
        f"{num}{other_letter}",    # Relative Major/Minor
    ]


def calculate_semitone_shift(source_camelot: str, target_camelot: str) -> int:
    """
    Calculates the minimum semitone pitch shift (-6 to +6) to transpose
    source track root note to target track root note.
    """
    src_code = to_camelot(source_camelot)
    tgt_code = to_camelot(target_camelot)

    src_pitch = CAMELOT_ROOT_PITCH.get(src_code, 0)
    tgt_pitch = CAMELOT_ROOT_PITCH.get(tgt_code, 0)

    diff = (tgt_pitch - src_pitch) % 12
    if diff > 6:
        diff -= 12
    return diff


def find_optimal_mashup_key(key_a: str, key_b: str) -> Tuple[str, int, int]:
    """
    Determines the best harmonic target key and required semitone shifts for Track A and Track B.
    Minimizes pitch shifting distortion (preferring shifts <= 2 semitones).
    
    Returns:
        (target_camelot_code, track_a_semitones, track_b_semitones)
    """
    cam_a = to_camelot(key_a)
    cam_b = to_camelot(key_b)

    matches_a = get_harmonic_matches(cam_a)
    
    # If B is already in A's harmonic wheel, zero shift needed or slight shift
    if cam_b in matches_a:
        return cam_a, 0, 0

    # Otherwise, calculate shift to align B to A, or both to a shared harmonic center
    shift_b_to_a = calculate_semitone_shift(cam_b, cam_a)
    if abs(shift_b_to_a) <= 2:
        return cam_a, 0, shift_b_to_a

    shift_a_to_b = calculate_semitone_shift(cam_a, cam_b)
    if abs(shift_a_to_b) <= 2:
        return cam_b, shift_a_to_b, 0

    # Default to track A as master, shifting B
    return cam_a, 0, shift_b_to_a
