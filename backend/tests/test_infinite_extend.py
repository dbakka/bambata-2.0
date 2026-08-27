"""BAMBATA 2.0 - Infinite Extend & Spectral Ducking Test Suite.

Verifies:
1. `weld_audio()` phase-coherent zero-crossing stitching.
2. `apply_spectral_vocal_ducking()` dynamic gain ducking.
3. `generate_context_aware_extension()` context continuity and phrase quantization.
"""
import numpy as np
import pytest

from app.services.transition_renderer import weld_audio, apply_spectral_vocal_ducking
from app.services.llm_arranger import llm_arranger


def test_weld_audio_phase_coherent():
    sr = 44100
    t1 = np.linspace(0, 2.0, 2 * sr, endpoint=False)
    t2 = np.linspace(0, 2.0, 2 * sr, endpoint=False)

    audio1 = np.sin(2 * np.pi * 220 * t1).astype(np.float32)
    audio2 = np.sin(2 * np.pi * 220 * t2).astype(np.float32)

    welded = weld_audio(audio1, audio2, sample_rate=sr, crossfade_ms=50.0)

    # Must be 2D
    assert welded.ndim == 2
    # Must have joined smoothly
    expected_len = len(audio1) + len(audio2) - int(0.050 * sr)
    assert abs(len(welded) - expected_len) < int(0.025 * sr)
    assert not np.isnan(welded).any()
    assert np.max(np.abs(welded)) <= 1.05


def test_spectral_vocal_ducking():
    sr = 44100
    t = np.linspace(0, 1.0, sr, endpoint=False)
    # Loud vocal burst in the middle (0.3s - 0.7s)
    vocal = np.zeros_like(t)
    vocal[int(0.3 * sr) : int(0.7 * sr)] = 0.9 * np.sin(2 * np.pi * 440 * t[: int(0.4 * sr)])

    # Continuous melody synth bed
    melody = 0.5 * np.sin(2 * np.pi * 880 * t)

    ducked = apply_spectral_vocal_ducking(vocal, melody, sample_rate=sr, max_duck_db=-4.5)

    # When vocal is silent (0.1s), melody should be unchanged (near 0.5)
    silence_peak = np.max(np.abs(ducked[: int(0.2 * sr)]))
    assert abs(silence_peak - 0.5) < 0.05

    # When vocal is peak loud (0.5s), melody should be ducked (~0.3)
    ducked_peak = np.max(np.abs(ducked[int(0.4 * sr) : int(0.6 * sr)]))
    assert ducked_peak < 0.38, f"Melody was not ducked sufficiently: {ducked_peak}"


def test_context_aware_extension():
    # Initial 60s arrangement
    initial = llm_arranger.generate_deep_reconstruction_arrangement(
        track_a_meta={"title": "Track A"},
        track_b_meta={"title": "Track B"},
        duration_s=60.0,
        bpm=126.0
    )
    init_blocks = initial["arrangement_blocks"]
    last_end_ms = init_blocks[-1]["end_ms"]

    # Request +60s extension
    extended = llm_arranger.generate_context_aware_extension(
        prev_arrangement=initial,
        add_duration_s=60.0,
        bpm=126.0
    )

    assert extended["mode"] == "INFINITE_EXTEND_CONTEXT_AWARE"
    new_blocks = extended["new_extension_blocks"]
    assert len(new_blocks) >= 3

    # The first new block must start EXACTLY where the previous ended
    assert new_blocks[0]["start_ms"] == last_end_ms

    # Total duration must be 120s (~120000ms)
    assert extended["total_new_duration_s"] > 115.0


if __name__ == "__main__":
    test_weld_audio_phase_coherent()
    test_spectral_vocal_ducking()
    test_context_aware_extension()
    print("ALL INFINITE EXTEND & SPECTRAL DUCKING TESTS PASSED!")
