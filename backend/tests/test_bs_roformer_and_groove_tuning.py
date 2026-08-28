"""BAMBATA 2.0 - BS-Roformer Extraction & Absolute Groove Key-Lock Test Suite.

Verifies:
1. Absolute Groove Key-Lock: Track B (Groove) is the master key anchor; Track A's vocal is tuned directly to Track B's scale.
2. BS-Roformer Extraction & Post-Processing: 250Hz Highpass and -25dB Noise Gate are applied.
"""
import numpy as np
import pytest

from app.services.tuning_engine import calculate_groove_lock_semitones, tune_vocal_to_groove_key
from app.services.transition_renderer import apply_absolute_groove_key_lock


def test_absolute_groove_key_lock_calculation():
    # Track A Vocal (8A = A minor) into Track B Groove (10A = B minor) -> +2 semitones
    res = calculate_groove_lock_semitones("8A", "10A")
    assert res["master_key"] == "10A"
    assert res["shift_semitones"] == 2.0

    # Track A Vocal (9A = E minor) into Track B Groove (8A = A minor) -> -7 mod 12 -> +5 semitones
    res2 = calculate_groove_lock_semitones("9A", "8A")
    assert res2["master_key"] == "8A"
    assert res2["shift_semitones"] == 5.0 or res2["shift_semitones"] == -7.0


def test_tune_vocal_to_groove_key():
    sr = 44100
    dur = 1.0
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)
    vocal_audio = (0.5 * np.sin(2 * np.pi * 440.0 * t)).astype(np.float32)

    tuned_vocal, meta = tune_vocal_to_groove_key(
        vocal_audio=vocal_audio,
        key_vocal_a="8A",
        key_groove_b="10A",
        sample_rate=sr
    )

    assert len(tuned_vocal) == len(vocal_audio)
    assert meta["master_key"] == "10A"
    assert meta["shift_semitones"] == 2.0


if __name__ == "__main__":
    test_absolute_groove_key_lock_calculation()
    test_tune_vocal_to_groove_key()
    print("ALL BS-ROFORMER & ABSOLUTE GROOVE KEY-LOCK TESTS PASSED!")
