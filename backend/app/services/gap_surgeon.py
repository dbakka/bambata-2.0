"""BAMBATA 2.0 - Deterministic Vocal Gap Surgeon.

Mathematically weaves Track A's Hero Vocal into Track B's instrumental gaps:
1. Calculates a rolling RMS energy envelope of Track B's instrumental.
2. Generates a binary mask: mutes Track A (0.0) during heavy transients/kicks/synths.
3. Unmutes Track A (1.0) strictly in silence pockets and breath pauses.
4. Applies a 10ms cosine crossfade on all mute/unmute boundaries to eliminate clicks.
"""
import logging
from typing import Tuple, Optional
import numpy as np
from scipy import signal

logger = logging.getLogger("bambata.gap_surgeon")


def apply_vocal_gap_mask(
    vocal_stem: np.ndarray,
    instrumental_stem: np.ndarray,
    sample_rate: int = 44100,
    frame_ms: float = 25.0,
    loudness_threshold_rms: float = 0.08,
    crossfade_ms: float = 10.0
) -> np.ndarray:
    """
    Applies deterministic gap surgery to vocal_stem based on instrumental_stem energy.

    Args:
        vocal_stem: (N, 2) or (N,) numpy float32 array of Track A vocal.
        instrumental_stem: (M, 2) or (M,) numpy float32 array of Track B instrumental.
        sample_rate: Audio sample rate (default 44100).
        frame_ms: RMS rolling window in milliseconds.
        loudness_threshold_rms: RMS threshold above which instrumental is considered 'loud/active'.
        crossfade_ms: Duration in ms to smooth boundary cuts.

    Returns:
        Surgically masked vocal array with 0.0 during instrumental transients and 10ms click-free fades.
    """
    if len(vocal_stem) == 0:
        return vocal_stem

    is_1d = vocal_stem.ndim == 1
    if is_1d:
        vocal_stem = np.column_stack((vocal_stem, vocal_stem))
    if instrumental_stem.ndim == 1:
        instrumental_stem = np.column_stack((instrumental_stem, instrumental_stem))

    # Match lengths
    target_len = len(vocal_stem)
    if len(instrumental_stem) < target_len:
        pad_len = target_len - len(instrumental_stem)
        inst_matched = np.vstack((instrumental_stem, np.zeros((pad_len, 2), dtype=np.float32)))
    else:
        inst_matched = instrumental_stem[:target_len]

    # 1. Calculate Mono Instrumental RMS Envelope
    inst_mono = np.mean(inst_matched, axis=1)
    frame_samples = max(4, int((frame_ms / 1000.0) * sample_rate))
    kernel = np.ones(frame_samples, dtype=np.float32) / frame_samples
    inst_rms = np.sqrt(np.convolve(inst_mono ** 2, kernel, mode='same'))

    # 2. Dynamic threshold calculation (relative to 65th percentile if active)
    max_rms = np.max(inst_rms) if len(inst_rms) > 0 else 0.0
    if max_rms > 0.01:
        dynamic_thresh = max(loudness_threshold_rms, np.percentile(inst_rms, 60) * 0.85)
    else:
        dynamic_thresh = loudness_threshold_rms

    # Binary mask: 1.0 where instrumental is quiet (gap), 0.0 where instrumental is loud (beat)
    raw_mask = np.where(inst_rms < dynamic_thresh, 1.0, 0.0).astype(np.float32)

    # 3. Apply 10ms Cosine Smoothing to Mask Transitions (Anti-Click Crossfade)
    fade_samples = max(2, int((crossfade_ms / 1000.0) * sample_rate))
    smoothing_kernel = np.hanning(fade_samples)
    smoothing_kernel /= np.sum(smoothing_kernel)

    smooth_mask = np.convolve(raw_mask, smoothing_kernel, mode='same')
    smooth_mask = np.clip(smooth_mask, 0.0, 1.0)[:, np.newaxis]

    # 4. Multiply Vocal Stem by Smooth Gap Mask
    surgically_masked_vocal = vocal_stem * smooth_mask

    if is_1d:
        return surgically_masked_vocal[:, 0].astype(np.float32)
    return surgically_masked_vocal.astype(np.float32)
