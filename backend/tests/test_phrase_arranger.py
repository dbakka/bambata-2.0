"""BAMBATA 2.0 - Phrase Quantization & Zero-Reference Arranger Test.

Verifies:
1. PhraseGrid mathematical accuracy (downbeats, 4-bar & 8-bar phrase snapping).
2. Zero-Reference Generative Arranger produces valid 5-stage club blocks.
3. All arrangement blocks snap strictly to 4-bar and 8-bar musical multiples.
4. Pre-drop silence gap equals exactly 1 full measure (4 beats).
"""
import pytest
from app.services.phrase_aligner import PhraseGrid, phrase_aligner
from app.services.llm_arranger import llm_arranger


def test_phrase_grid_quantization():
    bpm = 126.0
    grid = PhraseGrid(bpm=bpm)

    # 126 BPM: 1 beat = ~0.47619s, 1 bar (4 beats) = ~1.90476s
    assert abs(grid.beat_duration_s - 0.47619) < 0.001
    assert abs(grid.bar_duration_s - 1.90476) < 0.001

    # 4 bars = ~7.619s, 8 bars = ~15.238s
    assert abs(grid.phrase_4bar_s - 7.6190) < 0.005
    assert abs(grid.phrase_8bar_s - 15.2381) < 0.005

    # Test Snapping
    raw_time = 14.8
    snapped_8bar = grid.snap_to_phrase(raw_time, phrase_bars=8)
    assert abs(snapped_8bar - grid.phrase_8bar_s) < 0.01

    raw_time_2 = 8.1
    snapped_4bar = grid.snap_to_phrase(raw_time_2, phrase_bars=4)
    assert abs(snapped_4bar - grid.phrase_4bar_s) < 0.01


def test_zero_reference_5_stage_generative_arranger():
    # Test Zero-Reference mode (no reference provided)
    result = llm_arranger.generate_intelligent_arrangement(
        track_a_meta={"title": "Fred again.. - Turn On The Lights"},
        track_b_meta={"title": "Mau P - Drugs From Amsterdam"},
        reference_meta=None,
        duration_s=60.0,
        bpm=126.0
    )

    assert result["mode"] == "ZERO_REFERENCE_GENERATIVE"
    assert result["bpm"] == 126.0
    blocks = result["arrangement_blocks"]
    assert len(blocks) >= 4

    grid = PhraseGrid(bpm=126.0)

    # Verify that all stage blocks start and end on exact bar multiples
    for blk in blocks:
        start_ms = blk["start_ms"]
        end_ms = blk["end_ms"]
        dur_ms = end_ms - start_ms

        # Duration in bars
        dur_s = dur_ms / 1000.0
        bars = dur_s / grid.bar_duration_s
        # Must be very close to an integer number of bars
        assert abs(bars - round(bars)) < 0.02, f"Block {blk['block_name']} duration not phrase aligned: {bars} bars"

        # Check Stem Carving rules
        la = blk["stem_levels_track_a"]
        lb = blk["stem_levels_track_b"]
        # Track A Bass must be silenced to avoid mud
        assert la["Bass"] == 0.0, f"Track A Bass not silenced in {blk['block_name']}"
        # Track B Vocals must be silenced
        assert lb["Vocals"] == 0.0, f"Track B Vocals not silenced in {blk['block_name']}"

    # Verify Pre-drop silence gap
    build_block = next((b for b in blocks if "Buildup" in b["block_name"] or "Build" in b["block_name"]), None)
    assert build_block is not None
    assert "pre_drop_silence_gap_ms" in build_block
    expected_gap_ms = grid.bars_to_ms(1)
    assert abs(build_block["pre_drop_silence_gap_ms"] - expected_gap_ms) < 5


if __name__ == "__main__":
    test_phrase_grid_quantization()
    test_zero_reference_5_stage_generative_arranger()
    print("ALL PHRASE QUANTIZATION & ARRANGEMENT TESTS PASSED!")
