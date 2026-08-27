"""BAMBATA 2.0 - Default Deck Architecture Test Suite.

Verifies:
1. Track A (Left Deck): Primary "Vocal & Harmonic Source".
2. Track B (Right Deck): Primary "Groove & Rhythm Source".
3. Conflict Resolution: Deck B Bass (1.0) silences Deck A Bass (0.0) to prevent low-end mud.
"""
import pytest
from app.services.llm_arranger import llm_arranger


def test_default_deck_roles_assignment():
    result = llm_arranger.generate_vocal_priority_arrangement(
        track_a_meta={"title": "Vocal Track A", "key": "8A"},
        track_b_meta={"title": "Groove Track B", "key": "9A"},
        duration_s=60.0,
        bpm=126.0
    )

    assert result["mode"] == "DEFAULT_DECK_ARCHITECTURE"
    assert "Left Deck" in result["default_deck_architecture"]["deck_a"]
    assert "Right Deck" in result["default_deck_architecture"]["deck_b"]

    blocks = result["arrangement_blocks"]
    
    # Check Drop block (Stage 4)
    drop_block = next(b for b in blocks if "Drop" in b["block_name"])

    # Deck A must have dominant vocal
    assert drop_block["stem_levels_track_a"]["Vocals"] >= 1.2
    assert drop_block["stem_levels_track_a"]["Bass"] == 0.0
    assert drop_block["stem_levels_track_a"]["Drums"] == 0.0

    # Deck B must have dominant bass and drums
    assert drop_block["stem_levels_track_b"]["Bass"] == 1.0
    assert drop_block["stem_levels_track_b"]["Drums"] == 1.0


def test_cut_to_the_chase_with_default_decks():
    result = llm_arranger.generate_vocal_priority_arrangement(
        track_a_meta={"title": "Vocal Track A", "key": "8A"},
        track_b_meta={"title": "Groove Track B", "key": "9A"},
        duration_s=60.0,
        bpm=126.0,
        cut_to_the_chase=True
    )

    assert result["mode"] == "DEFAULT_DECK_CUT_TO_THE_CHASE"
    blocks = result["arrangement_blocks"]
    drop_block = blocks[1]

    # Deck A = Vocals / Deck B = Sub-Bass
    assert drop_block["stem_levels_track_a"]["Vocals"] >= 1.2
    assert drop_block["stem_levels_track_b"]["Bass"] == 1.0


if __name__ == "__main__":
    test_default_deck_roles_assignment()
    test_cut_to_the_chase_with_default_decks()
    print("ALL DEFAULT DECK ARCHITECTURE TESTS PASSED!")
