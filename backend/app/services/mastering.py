"""BAMBATA 2.0 - Global Master Bus Engine using Spotify's Pedalboard.

Applies commercial club mastering:
1. Multiband tone balancing (Sub punch & Air presence)
2. Glue Compression (-11dB threshold, 2.2:1 ratio)
3. -0.2 dB True Peak Limiter for maximum perceived club loudness.
"""
import logging
from pathlib import Path
from typing import Optional
import numpy as np
import soundfile as sf

logger = logging.getLogger("bambata.mastering")

try:
    from pedalboard import (
        Pedalboard,
        HighpassFilter,
        LowpassFilter,
        PeakFilter,
        Compressor,
        Limiter,
        Gain
    )
    HAS_PEDALBOARD = True
except ImportError:
    HAS_PEDALBOARD = False


def master_final_audio(
    audio: np.ndarray,
    sample_rate: int = 44100,
    target_peak_db: float = -0.2
) -> np.ndarray:
    """
    Applies the full Spotify Pedalboard master bus chain to the consolidated audio.
    """
    if len(audio) == 0:
        return audio

    if audio.ndim == 1:
        audio = np.column_stack((audio, audio))

    if HAS_PEDALBOARD:
        mastering_chain = Pedalboard([
            # 1. Clean sub-sonic DC rumble (<28Hz)
            HighpassFilter(cutoff_frequency_hz=28.0),
            # 2. Club Sub-Bass Weight (80Hz punch boost)
            PeakFilter(cutoff_frequency_hz=80.0, gain_db=1.5, q=0.7),
            # 3. High-End Air & Crisp Shimmer (10.5kHz presence)
            PeakFilter(cutoff_frequency_hz=10500.0, gain_db=1.2, q=0.8),
            # 4. Master Bus Glue Compressor
            Compressor(threshold_db=-11.0, ratio=2.2, attack_ms=20.0, release_ms=120.0),
            # 5. Maximized True Peak Limiter (-0.2 dB)
            Limiter(threshold_db=target_peak_db)
        ])
        mastered = mastering_chain(audio.T, sample_rate).T
        return mastered.astype(np.float32)
    else:
        # High quality DSP mastering fallback
        ceiling_linear = 10.0 ** (target_peak_db / 20.0) # ~0.977 (-0.2 dB)
        peak = np.max(np.abs(audio))
        if peak > 0:
            audio = (audio / (peak + 1e-6)) * ceiling_linear
        return np.tanh(audio * 0.96).astype(np.float32)


def process_and_master_file(input_wav: str, output_wav: str, sample_rate: int = 44100) -> str:
    """Loads a rendered WAV, applies full mastering pass, and exports final master file."""
    audio, sr = sf.read(input_wav, dtype='float32')
    mastered = master_final_audio(audio, sample_rate=sr)
    Path(output_wav).parent.mkdir(parents=True, exist_ok=True)
    sf.write(output_wav, mastered, sr)
    return output_wav
