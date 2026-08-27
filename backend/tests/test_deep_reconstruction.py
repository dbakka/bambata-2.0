"""BAMBATA 2.0 - Deep Reconstruction Engine Test Suite.

Verifies:
1. Harmonic Pivot Key calculation (minimal total semitone cost).
2. DTW Syllable Warping & Onset Quantization.
3. Dual-Vocal Surgery Arrangement (No overlapping vocals).
"""
import numpy as np
import pytest

from app.services.harmonic_math import calculate_optimal_pivot_key
from app.services.vocal_warper import vocal_warper
from app.services.llm_arranger import llm_arranger


def test_harmonic_pivot_key_engine():
    # Test 8A (Am) and 10A (Bm): Pivot should be 9A (Em) or similar with minimal total shift
    res = calculate_optimal_pivot_key("8A", "10A")
    assert "pivot_key" in res
    assert res["total_semitone_shift"] <= 4
    assert res["track_a_semitones"] != 0 or res["track_b_semitones"] != 0

    # Test Same Key (8A & 8A): Zero shift
    res_same = calculate_optimal_pivot_key("8A", "8A")
    assert res_same["pivot_key"] == "8A"
    assert res_same["total_semitone_shift"] == 0
    assert res_same["track_a_semitones"] == 0
    assert res_same["track_b_semitones"] == 0


def test_dtw_vocal_warper():
    sr = 44100
    t = np.linspace(0, 4.0, int(4.0 * sr), endpoint=False)
    # Synthesize test vocal audio with syllable bursts
    vocal = np.zeros_like(t)
    for onset_sec in [0.5, 1.2, 2.0, 2.7, 3.4]:
        idx = int(onset_sec * sr)
        vocal[idx:idx+int(0.2*sr)] = np.sin(2 * np.pi * 440 * t[:int(0.2*sr)])

    warped = vocal_warper.quantize_vocal_syllables_to_grid(vocal, sr, bpm=126.0)
    assert warped.shape == vocal.shape or (warped.shape[0] == len(vocal) and warped.shape[1] == 2)
    assert not np.isnan(warped).any()


def test_dual_vocal_surgery_no_overlap():
    result = llm_arranger.generate_deep_reconstruction_arrangement(
        track_a_meta={"title": "Track A", "key": "8A"},
        track_b_meta={"title": "Track B", "key": "10A"},
        duration_s=60.0,
        bpm=126.0
    )

    assert result["mode"] == "DEEP_RECONSTRUCTION_DUAL_VOCAL"
    blocks = result["arrangement_blocks"]

    # Verify that in NO block are both Vocal A and Vocal B simultaneously active
    for blk in blocks:
        surg = blk.get("vocal_surgery", {})
        va = surg.get("vocal_a_active", False)
        vb = surg.get("vocal_b_active", False)
        assert not (va and vb), f"Collision! Both vocals active in block {blk['block_name']}"


if __name__ == "__main__":
    test_harmonic_pivot_key_engine()
    test_dtw_vocal_warper()
    test_dual_vocal_surgery_no_overlap()
    print("ALL DEEP RECONSTRUCTION TESTS PASSED!")
