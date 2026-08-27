"""BAMBATA 2.0 - Region Export & Single Hero Vocal Pipeline Test Suite.

Verifies:
1. Region Slicing: Clean extraction of start_ms to end_ms with 10ms cosine fades.
2. Single Hero Vocal Pipeline: Track A is the sole Hero Vocal scheduled into Track B instrumental gaps.
"""
import numpy as np
import pytest

from app.services.transition_renderer import slice_and_export_region
from app.services.llm_arranger import llm_arranger


def test_region_slicing_with_fades():
    sr = 44100
    # 10-second test tone
    t = np.linspace(0, 10.0, 10 * sr, endpoint=False)
    audio = np.sin(2 * np.pi * 440 * t)

    # Slice region from 2000ms (2.0s) to 6000ms (6.0s) -> 4 seconds
    clipped = slice_and_export_region(
        audio=audio,
        start_ms=2000.0,
        end_ms=6000.0,
        sample_rate=sr,
        fade_ms=10.0
    )

    expected_samples = 4 * sr
    assert len(clipped) == expected_samples

    # Check that head starts smoothly from 0.0 (fade-in)
    assert abs(clipped[0, 0]) < 0.05
    # Check that tail ends smoothly near 0.0 (fade-out)
    assert abs(clipped[-1, 0]) < 0.05


def test_hero_vocal_pipeline():
    result = llm_arranger.generate_vocal_priority_arrangement(
        track_a_meta={"title": "Hero Vocal A", "key": "8A", "silent_windows": [{"start_ms": 1000, "end_ms": 3000}]},
        track_b_meta={"title": "Instrumental Groove B", "key": "9A"},
        duration_s=60.0,
        bpm=126.0
    )

    blocks = result["arrangement_blocks"]
    
    # Check Verse & Drop: Deck A is Hero Vocal
    drop_block = next(b for b in blocks if "Drop" in b["block_name"])
    assert drop_block["stem_levels_track_a"]["Vocals"] >= 1.25
    assert drop_block["stem_levels_track_b"]["Vocals"] == 0.0
    assert drop_block["stem_levels_track_b"]["Bass"] == 1.0


if __name__ == "__main__":
    test_region_slicing_with_fades()
    test_hero_vocal_pipeline()
    print("ALL REGION EXPORT & HERO VOCAL PIPELINE TESTS PASSED!")
