"""Unit tests for Camelot Wheel harmonic calculations."""
import pytest
from app.services.camelot_wheel import (
    to_camelot,
    get_harmonic_matches,
    calculate_semitone_shift,
    find_optimal_mashup_key,
)


def test_to_camelot_mapping():
    assert to_camelot("Am") == "8A"
    assert to_camelot("A minor") == "8A"
    assert to_camelot("C") == "8B"
    assert to_camelot("C Major") == "8B"
    assert to_camelot("Fm") == "4A"
    assert to_camelot("8A") == "8A"
    assert to_camelot("11b") == "11B"


def test_harmonic_matches():
    matches_8a = get_harmonic_matches("8A")
    assert "8A" in matches_8a  # Exact
    assert "9A" in matches_8a  # +1
    assert "7A" in matches_8a  # -1
    assert "8B" in matches_8a  # Relative Major

    # Edge wrap-around test (12A -> 1A, 11A, 12B)
    matches_12a = get_harmonic_matches("12A")
    assert "12A" in matches_12a
    assert "1A" in matches_12a
    assert "11A" in matches_12a
    assert "12B" in matches_12a


def test_semitone_shifts():
    # 8A (Am: root A = 9) to 8B (C: root C = 0) -> shift +3 or -9 -> shortest is +3
    shift = calculate_semitone_shift("8A", "8B")
    assert abs(shift) <= 6

    # 8A to 8A -> 0
    assert calculate_semitone_shift("8A", "8A") == 0


def test_optimal_mashup_key():
    # Compatible keys (8A and 8B)
    target_key, shift_a, shift_b = find_optimal_mashup_key("8A", "8B")
    assert target_key in ["8A", "8B"]
    assert shift_a == 0
    assert shift_b == 0

    # Distant keys
    target_key, shift_a, shift_b = find_optimal_mashup_key("8A", "1A")
    assert target_key is not None
    assert abs(shift_a) <= 6
    assert abs(shift_b) <= 6
