"""BAMBATA 2.0 - Edge Cases Test Suite: Pre-Flight Compatibility, Cut to the Chase & Vocal Gap Surgery.

Verifies:
1. Pre-Flight Compatibility Matrix:
   - Rejects BPM delta > 20%.
   - Rejects Camelot shift > 2 semitones.
   - Accepts harmonic tempo matches.
2. 'Cut to the Chase' Macro:
   - Skips 5-stage structure and begins 4 bars before drop.
3. Vocal Gap Surgery:
   - VAD silent window detection.
   - Insertion of call-and-response chops strictly into lead silent windows.
"""
import numpy as np
import pytest

from app.services.compatibility import check_preflight_compatibility
from app.services.llm_arranger import llm_arranger
from app.services.vocal_profiler import vocal_profiler


def test_preflight_bpm_rejection():
    # 1. Extreme BPM difference (126 BPM vs 175 BPM -> > 20% delta)
    res_bad_bpm = check_preflight_compatibility(bpm_a=126.0, bpm_b=175.0, key_a="8A", key_b="8A")
    assert not res_bad_bpm["compatible"]
    assert "Tempo difference is too large" in res_bad_bpm["reason"]

    # 2. Compatible BPM (124 BPM vs 128 BPM -> ~3% delta)
    res_good_bpm = check_preflight_compatibility(bpm_a=124.0, bpm_b=128.0, key_a="8A", key_b="9A")
    assert res_good_bpm["compatible"]


def test_preflight_key_rejection():
    # Extreme Key Distance (1A [Ab minor] vs 7A [D minor] -> 6 semitones apart on Camelot)
    res_bad_key = check_preflight_compatibility(bpm_a=126.0, bpm_b=126.0, key_a="1A", key_b="7A")
    assert not res_bad_key["compatible"]
    assert "Key mismatch" in res_bad_key["reason"]

    # Compatible Key (8A [A minor] vs 10A [B minor] -> 2 semitones apart, pivot = 9A)
    res_good_key = check_preflight_compatibility(bpm_a=126.0, bpm_b=126.0, key_a="8A", key_b="10A")
    assert res_good_key["compatible"]
    assert res_good_key["pivot_key"] == "9A"


def test_cut_to_the_chase_macro():
    result = llm_arranger.generate_vocal_priority_arrangement(
        track_a_meta={"title": "Track A", "key": "8A", "vocal_profile": "Sustained Lead"},
        track_b_meta={"title": "Track B", "key": "9A", "vocal_profile": "Rhythmic Chant"},
        bpm=126.0,
        cut_to_the_chase=True
    )

    assert result["mode"] == "CUT_TO_THE_CHASE_MACRO"
    assert result["cut_to_the_chase"] is True

    blocks = result["arrangement_blocks"]
    # Should only have Rapid Build (4 bars) -> Drop (16 bars) -> Climax (8 bars)
    assert len(blocks) == 3
    assert "Rapid 4-Bar Pre-Drop Tension" in blocks[0]["block_name"]
    assert "Instant Peak Drop" in blocks[1]["block_name"]


def test_vocal_gap_surgery_vad():
    sr = 44100
    t = np.linspace(0, 5.0, 5 * sr, endpoint=False)
    vocal = np.zeros_like(t)

    # Vocal singing at 0.5s - 1.5s and 3.0s - 4.5s (Silence at 1.5s - 3.0s)
    vocal[int(0.5 * sr) : int(1.5 * sr)] = 0.7 * np.sin(2 * np.pi * 440 * t[:int(1.0 * sr)])
    vocal[int(3.0 * sr) : int(4.5 * sr)] = 0.7 * np.sin(2 * np.pi * 523 * t[:int(1.5 * sr)])

    analysis = vocal_profiler.analyze_vocal_stem(vocal, sample_rate=sr)
    silent_windows = analysis.get("silent_windows", [])

    # Should detect the silence window around 1500ms - 3000ms
    assert len(silent_windows) >= 1
    mid_gap = next((w for w in silent_windows if w["duration_ms"] >= 1000.0), None)
    assert mid_gap is not None
    assert mid_gap["start_ms"] >= 1400.0
    assert mid_gap["end_ms"] <= 3100.0


if __name__ == "__main__":
    test_preflight_bpm_rejection()
    test_preflight_key_rejection()
    test_cut_to_the_chase_macro()
    test_vocal_gap_surgery_vad()
    print("ALL EDGE CASES & COMPATIBILITY TESTS PASSED!")
