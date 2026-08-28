"""BAMBATA 2.0 - YouTube Style-Transfer & Precision Harmonic Key-Lock Test Suite.

Verifies:
1. YouTube Style-Transfer Engine: extracts/matches Afrohouse & Amapiano structural templates (e.g. Dlala Thukzin 3-Stage Drop).
2. Precision Harmonic Key-Lock: transposes both stems into optimal Camelot Pivot Key.
3. Enhanced VAD Spectral Flux Gap Surgeon: detects percussion-free pockets and mutes vocals during drum transient onsets.
"""
import numpy as np
import pytest

from app.services.style_transfer import style_transfer_engine
from app.services.transition_renderer import apply_precision_harmonic_key_lock
from app.services.gap_surgeon import apply_vocal_gap_mask, compute_spectral_flux


def test_youtube_style_transfer_preset_matching():
    # Afrohouse 126 BPM match (Dlala Thukzin style)
    dna_afro = style_transfer_engine.extract_or_match_reference_dna(
        bpm_a=126.0,
        bpm_b=126.0,
        key_a="8A",
        key_b="10A"
    )
    assert dna_afro["style_genre"] == "Afrohouse / Gqom-Infused 3-Step"
    assert dna_afro["build_bars"] == 8
    assert dna_afro["drop_timing_pct"] == 0.25
    assert dna_afro["camelot_key"] == "9A"

    # Amapiano 113 BPM match (Kabza De Small style)
    dna_piano = style_transfer_engine.extract_or_match_reference_dna(
        bpm_a=113.0,
        bpm_b=113.0,
        key_a="8A",
        key_b="9A"
    )
    assert dna_piano["style_genre"] == "Private School Amapiano"
    assert dna_piano["build_bars"] == 4
    assert dna_piano["drop_timing_pct"] == 0.20


def test_precision_harmonic_key_lock():
    sr = 44100
    dur = 1.0
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)

    # Track A in 8A (A minor), Track B in 10A (B minor)
    stems_a = {
        "Vocals": (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32),
        "Melody": (0.3 * np.sin(2 * np.pi * 880 * t)).astype(np.float32),
        "Drums": (0.8 * np.sin(2 * np.pi * 60 * t)).astype(np.float32)
    }
    stems_b = {
        "Vocals": np.zeros_like(t, dtype=np.float32),
        "Melody": (0.4 * np.sin(2 * np.pi * 493.88 * t)).astype(np.float32),
        "Drums": (0.9 * np.sin(2 * np.pi * 60 * t)).astype(np.float32)
    }

    locked_a, locked_b, pivot = apply_precision_harmonic_key_lock(
        track_a_stems=stems_a,
        track_b_stems=stems_b,
        key_a="8A",
        key_b="10A",
        sample_rate=sr
    )

    assert pivot["pivot_camelot"] == "9A"
    assert len(locked_a["Vocals"]) == len(stems_a["Vocals"])
    assert len(locked_b["Melody"]) == len(stems_b["Melody"])
    # Drums should not be pitch shifted
    np.testing.assert_array_almost_equal(locked_a["Drums"], stems_a["Drums"])


def test_enhanced_vad_spectral_flux_gap_surgeon():
    sr = 44100
    dur = 4.0
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)

    # Continuous vocal tone (500Hz)
    vocal = (0.5 * np.sin(2 * np.pi * 500 * t)).astype(np.float32)

    # Instrumental with heavy drum transients (kicks and noise bursts from 0-1s and 2-3s)
    instrumental = np.zeros(int(sr * dur), dtype=np.float32)
    instrumental[:int(sr * 1.0)] = 0.8 * np.sin(2 * np.pi * 80 * t[:int(sr * 1.0)])
    instrumental[int(sr * 2.0):int(sr * 3.0)] = 0.8 * np.sin(2 * np.pi * 80 * t[int(sr * 2.0):int(sr * 3.0)])

    # Spectral flux calculation test
    flux = compute_spectral_flux(instrumental, sr)
    assert len(flux) == len(instrumental)
    assert np.max(flux) <= 1.01

    # Apply enhanced VAD gap surgery
    masked_vocal = apply_vocal_gap_mask(
        vocal_stem=vocal,
        instrumental_stem=instrumental,
        sample_rate=sr,
        frame_ms=25.0,
        loudness_threshold_rms=0.08,
        crossfade_ms=10.0,
        spectral_flux_weight=0.4
    )

    # 1. During drum hits (e.g. 0.5s), vocal must be ducked/muted
    hit_rms = np.sqrt(np.mean(masked_vocal[int(sr * 0.3):int(sr * 0.7)] ** 2))
    assert hit_rms < 0.02, f"Vocal was not muted during beat transient: {hit_rms}"

    # 2. During silence gap (e.g. 1.5s), vocal must be preserved unmuted
    gap_rms = np.sqrt(np.mean(masked_vocal[int(sr * 1.3):int(sr * 1.7)] ** 2))
    assert gap_rms > 0.25, f"Vocal was not unmuted in silence gap: {gap_rms}"


if __name__ == "__main__":
    test_youtube_style_transfer_preset_matching()
    test_precision_harmonic_key_lock()
    test_enhanced_vad_spectral_flux_gap_surgeon()
    print("ALL YOUTUBE STYLE-TRANSFER & HARMONIC KEY-LOCK TESTS PASSED!")
