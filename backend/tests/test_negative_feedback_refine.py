"""BAMBATA 2.0 - Negative Feedback & AI Mutation Refine Test Suite.

Verifies:
1. Composite block scoring: +1 Hype, -1 Cold, -5 Skipped Zone.
2. Directive 1: Active stem mutation/swap on negative tap score.
3. Directive 2: Skipped block deletion and spliced timeline re-quantization.
"""
import pytest
from app.services.cleanup_dsp import score_arrangement_blocks_with_feedback
from app.services.llm_arranger import llm_arranger
from app.services.phrase_aligner import PhraseGrid


def test_composite_block_scoring():
    blocks = [
        {"block_name": "Stage 1: Intro", "start_ms": 0, "end_ms": 7619},
        {"block_name": "Stage 2: Verse", "start_ms": 7619, "end_ms": 22857},
        {"block_name": "Stage 3: Build", "start_ms": 22857, "end_ms": 30476},
        {"block_name": "Stage 4: Drop", "start_ms": 30476, "end_ms": 60952},
    ]

    hype_taps = [35000.0, 42000.0]        # 2 Hype taps during Stage 4 Drop
    negative_taps = [10000.0, 15000.0]    # 2 Cold taps during Stage 2 Verse
    skipped_zones = [[20000.0, 31000.0]]  # User skipped through Stage 3 Build

    scored = score_arrangement_blocks_with_feedback(
        blocks=blocks,
        hype_taps_ms=hype_taps,
        negative_taps_ms=negative_taps,
        skipped_zones_ms=skipped_zones
    )

    assert len(scored) == 4

    # Stage 1: Neutral (0)
    assert scored[0]["feedback_score"]["composite_score"] == 0

    # Stage 2: 2 Cold taps (-2) -> MUTATE
    assert scored[1]["feedback_score"]["composite_score"] == -2
    assert scored[1]["feedback_score"]["status"] == "MUTATE"

    # Stage 3: Skipped zone (-5) -> DELETE
    assert scored[2]["feedback_score"]["composite_score"] <= -5
    assert scored[2]["feedback_score"]["status"] == "DELETE"

    # Stage 4: 2 Hype taps (+2) -> KEEP
    assert scored[3]["feedback_score"]["composite_score"] == 2
    assert scored[3]["feedback_score"]["status"] == "KEEP"


def test_ai_mutation_and_deletion_directives():
    initial_arrangement = {
        "arrangement_blocks": [
            {
                "stage_id": 1,
                "block_name": "Stage 1: Intro",
                "start_ms": 0,
                "end_ms": 7619,
                "bars": 4,
                "stem_levels_track_a": {"Vocals": 0.8, "Melody": 0.4},
                "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2}
            },
            {
                "stage_id": 2,
                "block_name": "Stage 2: Verse",
                "start_ms": 7619,
                "end_ms": 22857,
                "bars": 8,
                "stem_levels_track_a": {"Vocals": 1.1, "Melody": 0.6},
                "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.3}
            },
            {
                "stage_id": 3,
                "block_name": "Stage 3: Bad Build",
                "start_ms": 22857,
                "end_ms": 30476,
                "bars": 4,
                "stem_levels_track_a": {"Vocals": 0.0, "Melody": 0.0},
                "stem_levels_track_b": {"Vocals": 1.0, "Melody": 0.2}
            },
            {
                "stage_id": 4,
                "block_name": "Stage 4: Drop",
                "start_ms": 30476,
                "end_ms": 60952,
                "bars": 16,
                "stem_levels_track_a": {"Vocals": 0.0, "Melody": 0.3},
                "stem_levels_track_b": {"Vocals": 1.3, "Melody": 0.2}
            }
        ]
    }

    # Cold taps on Verse (Stage 2) and Skip across Stage 3
    negative_taps = [12000.0, 14000.0]
    skipped_zones = [[21000.0, 30500.0]]

    mutated = llm_arranger.refine_arrangement_with_feedback(
        prev_arrangement=initial_arrangement,
        negative_taps_ms=negative_taps,
        skipped_zones_ms=skipped_zones,
        bpm=126.0
    )

    blocks = mutated["arrangement_blocks"]

    # Directive 2: Stage 3 must be DELETED entirely
    assert len(blocks) == 3
    stage_names = [b["block_name"] for b in blocks]
    assert "Stage 3: Bad Build" not in stage_names

    # Directive 1: Verse (Stage 2) must have mutated stems
    verse_blk = next(b for b in blocks if "Verse" in b["block_name"])
    assert "mutation_applied" in verse_blk
    # Vocals should have swapped from Track A to Track B
    assert verse_blk["stem_levels_track_a"]["Vocals"] == 0.0
    assert verse_blk["stem_levels_track_b"]["Vocals"] > 0.5

    # Check that spliced blocks snap to 4-bar phrase boundaries
    grid = PhraseGrid(bpm=126.0)
    for blk in blocks:
        dur_s = (blk["end_ms"] - blk["start_ms"]) / 1000.0
        bars = dur_s / grid.bar_duration_s
        assert abs(bars - round(bars)) < 0.02


if __name__ == "__main__":
    test_composite_block_scoring()
    test_ai_mutation_and_deletion_directives()
    print("ALL NEGATIVE FEEDBACK & AI MUTATION TESTS PASSED!")
