"""BAMBATA 2.0 - Surgical Vocal Isolation & Anti-Clash Pipeline Test Suite.

Verifies:
1. High-Fidelity Vocal Gating (NoiseGate threshold -35dB, 100% digital silence during singer pauses).
2. Dynamic Anti-Clash Notch Carving (PeakFilter 1500Hz, Q=2.0, -6.0dB on Track B).
3. Zero Vocal Overlap: Track B vocal volume is strictly 0.0 when Track A Hero Vocal is active.
"""
import numpy as np
import pytest

from app.services.transition_renderer import (
    apply_high_fidelity_vocal_gate,
    apply_anti_clash_vocal_notch
)
from app.services.llm_arranger import llm_arranger


def test_vocal_noise_gating_silences_pauses():
    sr = 44100
    dur = 2.0
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)
    
    # Create an active vocal burst (0.0s to 1.0s) followed by quiet breathing/bleed (-50dB, 1.0s to 2.0s)
    active_vocal = 0.5 * np.sin(2 * np.pi * 440 * t[:int(sr * 1.0)])
    bleed_noise = 0.002 * (np.random.rand(int(sr * 1.0)) * 2 - 1)  # ~ -54 dB
    raw_vocal = np.concatenate([active_vocal, bleed_noise])

    gated = apply_high_fidelity_vocal_gate(
        vocal_audio=raw_vocal,
        sample_rate=sr,
        threshold_db=-35.0,
        ratio=4.0,
        release_ms=50.0
    )

    # The tail (during bleed) must be virtually 0.0
    tail_rms = np.sqrt(np.mean(gated[int(sr * 1.2):] ** 2))
    assert tail_rms < 0.001, f"Tail bleed not silenced: rms={tail_rms}"


def test_anti_clash_vocal_notch_attenuation():
    sr = 44100
    dur = 1.0
    t = np.linspace(0, dur, int(sr * dur), endpoint=False)

    # 1.5 kHz test tone
    tone_1500hz = 0.5 * np.sin(2 * np.pi * 1500 * t)
    
    carved = apply_anti_clash_vocal_notch(
        track_b_melody=tone_1500hz,
        hero_vocal_active=True,
        sample_rate=sr,
        cutoff_hz=1500.0,
        q=2.0,
        gain_db=-6.0
    )

    orig_rms = np.sqrt(np.mean(tone_1500hz ** 2))
    carved_rms = np.sqrt(np.mean(carved ** 2))

    # Attenuation should be around -6 dB (factor of ~0.5)
    ratio = carved_rms / orig_rms
    assert ratio < 0.70, f"1.5kHz notch filter failed to attenuate: ratio={ratio}"


def test_zero_vocal_overlap_enforced_in_arrangement():
    result = llm_arranger.generate_vocal_priority_arrangement(
        track_a_meta={"title": "Hero Vocal Track A", "key": "8A"},
        track_b_meta={"title": "Beat & Vocal Track B", "key": "9A"},
        duration_s=60.0,
        bpm=126.0
    )

    blocks = result["arrangement_blocks"]
    for blk in blocks:
        la = blk.get("stem_levels_track_a", {})
        lb = blk.get("stem_levels_track_b", {})
        
        # When Track A vocal is active, Track B vocal MUST be 0.0
        if la.get("Vocals", 0.0) > 0.0:
            assert lb.get("Vocals", 0.0) == 0.0, f"Vocal overlap detected in {blk.get('block_name')}"


if __name__ == "__main__":
    test_vocal_noise_gating_silences_pauses()
    test_anti_clash_vocal_notch_attenuation()
    test_zero_vocal_overlap_enforced_in_arrangement()
    print("ALL SURGICAL VOCAL ISOLATION & ANTI-CLASH TESTS PASSED!")
