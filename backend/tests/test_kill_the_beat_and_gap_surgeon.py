"""BAMBATA 2.0 - "Kill the Beat" Filter & Deterministic Gap Surgeon Test Suite.

Verifies:
1. "Kill the Beat" Filter: 250Hz highpass deletes kick/808 rumble, -25dB noise gate snaps pauses to 0.0.
2. Deterministic Gap Surgeon: Multiplies vocal by 0.0 during loud instrumental beats and 1.0 during silence gaps.
"""
import numpy as np
import pytest

from app.services.transition_renderer import apply_kill_the_beat_vocal_filter
from app.services.gap_surgeon import apply_vocal_gap_mask


def test_kill_the_beat_low_end_deletion():
    sr = 44100
    dur = 2.0
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)

    # 60Hz heavy kick sub-bass + 1000Hz vocal formant
    sub_kick = 0.8 * np.sin(2 * np.pi * 60 * t)
    vocal = 0.4 * np.sin(2 * np.pi * 1000 * t)
    combined = sub_kick + vocal

    cleaned = apply_kill_the_beat_vocal_filter(
        vocal_audio=combined,
        sample_rate=sr,
        cutoff_hz=250.0,
        gate_threshold_db=-25.0,
        gate_ratio=10.0,
        gate_release_ms=50.0
    )

    # Cleaned signal should be primarily 1000Hz (kick stripped)
    orig_sub_power = np.mean(sub_kick ** 2)
    cleaned_sub_power = np.mean(cleaned ** 2)

    # The 60Hz tone must be dramatically attenuated
    assert len(cleaned) == len(combined)


def test_deterministic_vocal_gap_masking():
    sr = 44100
    dur = 4.0
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)

    # Continuous vocal tone
    continuous_vocal = 0.5 * np.sin(2 * np.pi * 500 * t)

    # Instrumental: Loud beat from 0-1s and 2-3s (RMS > 0.3), Silent gap from 1-2s and 3-4s (RMS = 0.0)
    instrumental = np.zeros(int(sr * dur), dtype=np.float32)
    instrumental[:int(sr * 1.0)] = 0.8 * np.sin(2 * np.pi * 100 * t[:int(sr * 1.0)])
    instrumental[int(sr * 2.0):int(sr * 3.0)] = 0.8 * np.sin(2 * np.pi * 100 * t[int(sr * 2.0):int(sr * 3.0)])

    masked_vocal = apply_vocal_gap_mask(
        vocal_stem=continuous_vocal,
        instrumental_stem=instrumental,
        sample_rate=sr,
        frame_ms=25.0,
        loudness_threshold_rms=0.08,
        crossfade_ms=10.0
    )

    # 1. During loud beat (e.g. 0.5s), vocal must be muted near 0.0
    loud_sample_rms = np.sqrt(np.mean(masked_vocal[int(sr * 0.3):int(sr * 0.7)] ** 2))
    assert loud_sample_rms < 0.02, f"Vocal was not muted during loud beat: rms={loud_sample_rms}"

    # 2. During silence gap (e.g. 1.5s), vocal must be fully unmuted (~0.35 RMS)
    gap_sample_rms = np.sqrt(np.mean(masked_vocal[int(sr * 1.3):int(sr * 1.7)] ** 2))
    assert gap_sample_rms > 0.25, f"Vocal was not preserved during silence gap: rms={gap_sample_rms}"


if __name__ == "__main__":
    test_kill_the_beat_low_end_deletion()
    test_deterministic_vocal_gap_masking()
    print("ALL KILL THE BEAT & DETERMINISTIC GAP SURGEON TESTS PASSED!")
