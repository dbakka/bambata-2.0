"""BAMBATA 2.0 - Enhanced VAD Spectral Flux & Transient Gap Surgeon.

Mathematically weaves Track A's Hero Vocal into Track B's instrumental gaps:
1. Calculates RMS Energy Envelope of Track B.
2. Calculates Spectral Flux (rate of spectral change across frequency bins) to detect true drum hits / log-drum transients.
3. Computes Composite Activity: detects true percussion-free, breathable pockets in Track B.
4. Mutes Track A (0.0) during active transients and unmutates Track A (1.0) strictly in quiet pockets.
5. Applies a 10ms cosine crossfade on all boundary cuts to eliminate clicks.
"""
import logging
from typing import Tuple, Optional
import numpy as np
from scipy import signal

logger = logging.getLogger("bambata.gap_surgeon")


def compute_spectral_flux(mono_audio: np.ndarray, sample_rate: int = 44100, frame_ms: float = 25.0) -> np.ndarray:
    """Computes normalized spectral flux (spectral difference onset curve)."""
    n_fft = max(64, int((frame_ms / 1000.0) * sample_rate))
    hop_length = n_fft // 2

    # Compute short-time Fourier transform magnitudes
    freqs, times, stft = signal.stft(mono_audio, fs=sample_rate, nperseg=n_fft, noverlap=n_fft - hop_length)
    mag = np.abs(stft)

    # Spectral difference across consecutive frames (half-wave rectified)
    diff = np.diff(mag, axis=1)
    diff[diff < 0] = 0.0
    flux = np.sum(diff, axis=0)

    # Interpolate flux curve back to original audio length
    flux_full = np.interp(np.linspace(0, len(flux), len(mono_audio)), np.arange(len(flux)), flux)
    max_val = np.max(flux_full) if len(flux_full) > 0 else 1.0
    return (flux_full / max(1e-6, max_val)).astype(np.float32)


def apply_vocal_gap_mask(
    vocal_stem: np.ndarray,
    instrumental_stem: np.ndarray,
    sample_rate: int = 44100,
    frame_ms: float = 25.0,
    loudness_threshold_rms: float = 0.08,
    crossfade_ms: float = 10.0,
    spectral_flux_weight: float = 0.4
) -> np.ndarray:
    """
    Enhanced VAD Gap-Placement:
    Uses combined RMS Energy and Spectral Flux to detect genuine percussion-free,
    breathable spaces in Track B where Track A's vocal can land cleanly.

    Args:
        vocal_stem: (N, 2) or (N,) numpy float32 array of Track A vocal.
        instrumental_stem: (M, 2) or (M,) numpy float32 array of Track B instrumental.
        sample_rate: Audio sample rate (default 44100).
        frame_ms: Analysis rolling window in milliseconds.
        loudness_threshold_rms: Base RMS threshold for instrumental activity.
        crossfade_ms: Duration in ms for anti-click crossfade.
        spectral_flux_weight: Relative weight for drum transient detection.

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

    # 2. Calculate Spectral Flux Transient Curve (detects drum onsets & log drum hits)
    flux = compute_spectral_flux(inst_mono, sample_rate, frame_ms)

    # 3. Dynamic Threshold & Composite Energy Activity Curve
    max_rms = np.max(inst_rms) if len(inst_rms) > 0 else 0.0
    if max_rms > 0.01:
        rms_norm = inst_rms / max_rms
        dynamic_thresh = max(loudness_threshold_rms, np.percentile(inst_rms, 60) * 0.85)
    else:
        rms_norm = inst_rms
        dynamic_thresh = loudness_threshold_rms

    composite_activity = (1.0 - spectral_flux_weight) * (inst_rms / max(1e-5, dynamic_thresh)) + spectral_flux_weight * (flux * 1.5)

    # Binary mask: 1.0 where instrumental is quiet and transient-free (gap), 0.0 where heavy beat/synth is hitting
    raw_mask = np.where(composite_activity < 1.0, 1.0, 0.0).astype(np.float32)

    # 4. Apply 10ms Cosine Smoothing to Mask Transitions (Anti-Click Crossfade)
    fade_samples = max(2, int((crossfade_ms / 1000.0) * sample_rate))
    smoothing_kernel = np.hanning(fade_samples)
    smoothing_kernel /= np.sum(smoothing_kernel)

    smooth_mask = np.convolve(raw_mask, smoothing_kernel, mode='same')
    smooth_mask = np.clip(smooth_mask, 0.0, 1.0)[:, np.newaxis]

    # 5. Multiply Vocal Stem by Smooth Gap Mask
    surgically_masked_vocal = vocal_stem * smooth_mask

    if is_1d:
        return surgically_masked_vocal[:, 0].astype(np.float32)
    return surgically_masked_vocal.astype(np.float32)
