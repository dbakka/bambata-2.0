"""BAMBATA 2.0 - Reaction Latency Compensation & Event Correlation Test Suite.

Verifies:
1. Human reaction latency compensation (-800ms offset).
2. Look-Back window (4000ms) correlating a delayed tap (e.g. 61500ms) to the transition event (60000ms).
3. Intelligent Mutator repairing the transition entrance when transition_disliked is True.
"""
import pytest
from app.services.cleanup_dsp import compensate_reaction_latency, score_arrangement_blocks_with_feedback
from app.services.llm_arranger import llm_arranger


def test_latency_compensation_offset():
    raw_taps = [1000.0, 15800.0, 61500.0]
    compensated = compensate_reaction_latency(raw_taps, offset_ms=800.0)

    assert compensated[0] == 200.0
    assert compensated[1] == 15000.0
    assert compensated[2] == 60700.0


def test_transition_event_correlation_61500ms():
    blocks = [
        {
            "stage_id": 1,
            "block_name": "Stage 1: Build Up",
            "start_ms": 45000,
            "end_ms": 60000,
            "bars": 8
        },
        {
            "stage_id": 2,
            "block_name": "Stage 2: Massive Drop",
            "start_ms": 60000,
            "end_ms": 90000,
            "bars": 16
        }
    ]

    # User taps 🧊 at 61500ms (1.5s after the 60000ms Drop transition occurred)
    negative_taps = [61500.0]

    scored = score_arrangement_blocks_with_feedback(
        blocks=blocks,
        negative_taps_ms=negative_taps,
        latency_offset_ms=800.0,
        lookback_window_ms=4000.0
    )

    drop_block = scored[1]
    fb = drop_block["feedback_score"]
    trans_fb = fb["transition_feedback"]

    # 61500 - 800 = 60700ms -> falls within [60000ms, 64000ms] lookback window of the Drop block!
    assert trans_fb["transition_disliked"] is True
    assert trans_fb["transition_cold_taps"] == 1
    assert fb["status"] == "MUTATE"


def test_intelligent_ai_transition_entrance_repair():
    initial_arrangement = {
        "arrangement_blocks": [
            {
                "stage_id": 1,
                "block_name": "Stage 1: Build Up",
                "start_ms": 0,
                "end_ms": 60000,
                "bars": 32,
                "stem_levels_track_a": {"Vocals": 0.0, "Melody": 0.5},
                "stem_levels_track_b": {"Vocals": 1.0, "Drums": 1.0}
            },
            {
                "stage_id": 2,
                "block_name": "Stage 2: Massive Drop",
                "start_ms": 60000,
                "end_ms": 90000,
                "bars": 16,
                "stem_levels_track_a": {"Vocals": 1.2, "Melody": 0.8},
                "stem_levels_track_b": {"Vocals": 0.0, "Drums": 1.0}
            }
        ]
    }

    # Simulate Cold tap at 61500ms
    negative_taps = [61500.0]

    mutated = llm_arranger.refine_arrangement_with_feedback(
        prev_arrangement=initial_arrangement,
        negative_taps_ms=negative_taps,
        bpm=126.0
    )

    blocks = mutated["arrangement_blocks"]
    drop_block = blocks[1]

    # Verify that the Drop block received transition entrance repair rather than being split
    assert "transition_repair" in drop_block
    assert drop_block["transition_repair"]["repaired"] is True
    assert "Filter Sweep" in drop_block["mutation_applied"]


if __name__ == "__main__":
    test_latency_compensation_offset()
    test_transition_event_correlation_61500ms()
    test_intelligent_ai_transition_entrance_repair()
    print("ALL REACTION LATENCY & EVENT CORRELATION TESTS PASSED!")
