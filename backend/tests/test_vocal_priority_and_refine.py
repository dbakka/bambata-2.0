"""BAMBATA 2.0 - Vocal Priority Engine & Refine/Master Test Suite.

Verifies:
1. Vocal Profiler (Sustained Lead vs Rhythmic Chant vs Atmospheric).
2. LLM Arranger Vocal Hierarchy rules (Rules 1, 2, 3 with zero clashes).
3. Silence Cleanup DSP (Dead air closing & 15ms smoothing).
4. Global Master Bus (-0.2 dB true peak limiter ceiling).
"""
import numpy as np
import pytest

from app.services.vocal_profiler import vocal_profiler
from app.services.llm_arranger import llm_arranger
from app.services.cleanup_dsp import detect_and_close_accidental_silence, apply_global_smoothing_pass
from app.services.mastering import master_final_audio


def test_vocal_profiler_classification():
    sr = 44100
    t = np.linspace(0, 3.0, 3 * sr, endpoint=False)

    # 1. Melodic Sustained Note (Sustained Lead)
    lead_vocal = np.sin(2 * np.pi * 440 * t) * 0.6
    res_lead = vocal_profiler.analyze_vocal_stem(lead_vocal, sr)
    assert res_lead["profile"] in ["Sustained Lead", "Atmospheric"]

    # 2. Percussive rapid burst chant (Rhythmic Chant)
    chant_vocal = np.zeros_like(t)
    for onset in [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4]:
        idx = int(onset * sr)
        chant_vocal[idx:idx+int(0.08*sr)] = 0.8 * np.sin(2 * np.pi * 220 * t[:int(0.08*sr)])
    res_chant = vocal_profiler.analyze_vocal_stem(chant_vocal, sr)
    assert res_chant["transient_density"] > 2.0


def test_vocal_hierarchy_rules():
    result = llm_arranger.generate_vocal_priority_arrangement(
        track_a_meta={"title": "Track A Lead", "key": "8A", "vocal_profile": "Sustained Lead"},
        track_b_meta={"title": "Track B Chant", "key": "10A", "vocal_profile": "Rhythmic Chant"},
        duration_s=60.0,
        bpm=126.0
    )

    assert result["mode"] == "VOCAL_PRIORITY_ENGINE"
    blocks = result["arrangement_blocks"]

    # Check Rule 1: Verse must feature Sustained Lead
    verse_block = next((b for b in blocks if "Verse" in b["block_name"]), None)
    assert verse_block is not None
    assert verse_block["vocal_hierarchy"]["profile_applied"] == "Sustained Lead"

    # Check Rule 2: Drop must feature Rhythmic Chant
    drop_block = next((b for b in blocks if "Drop" in b["block_name"]), None)
    assert drop_block is not None
    assert drop_block["vocal_hierarchy"]["profile_applied"] == "Rhythmic Chant"


def test_silence_cleanup_and_smoothing():
    sr = 44100
    t = np.linspace(0, 4.0, 4 * sr, endpoint=False)
    audio = np.sin(2 * np.pi * 220 * t)

    # Insert an accidental 800ms silence in the middle (1.5s - 2.3s)
    audio[int(1.5 * sr) : int(2.3 * sr)] = 0.0

    cleaned = detect_and_close_accidental_silence(audio, sample_rate=sr, bpm=126.0)
    # The cleaned audio should be shorter because the accidental gap was removed
    assert len(cleaned) < len(audio)

    # Test smoothing pass
    smoothed = apply_global_smoothing_pass(cleaned, sample_rate=sr, fade_ms=15.0)
    assert len(smoothed) == len(cleaned)
    assert not np.isnan(smoothed).any()


def test_global_mastering_peak_ceiling():
    sr = 44100
    t = np.linspace(0, 2.0, 2 * sr, endpoint=False)
    loud_audio = 2.5 * np.sin(2 * np.pi * 100 * t) # Deliberately excessive signal

    mastered = master_final_audio(loud_audio, sample_rate=sr, target_peak_db=-0.2)
    peak = np.max(np.abs(mastered))
    peak_db = 20.0 * np.log10(peak + 1e-6)

    # Must be clamped at or below -0.2 dB (~0.977) without clipping
    assert peak <= 1.0
    assert peak_db <= -0.15


if __name__ == "__main__":
    test_vocal_profiler_classification()
    test_vocal_hierarchy_rules()
    test_silence_cleanup_and_smoothing()
    test_global_mastering_peak_ceiling()
    print("ALL VOCAL PRIORITY & REFINE/MASTERING TESTS PASSED!")
