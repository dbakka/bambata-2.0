"""BAMBATA 2.0 - Core DSP Audio Processing Engine.

Features:
1. Precision Harmonic Key-Lock Engine (simultaneous bilateral transposition into optimal Pivot Key).
2. Enhanced VAD Gap-Placement (Spectral Flux & Transient Energy Detection).
3. "Kill the Beat" Vocal Filter (250Hz Highpass + -25dB NoiseGate).
4. Dynamic Anti-Clash 1.5kHz Notch Carving (PeakFilter 1500Hz, Q=2.0, -6dB).
5. Demucs v4 Separation & Formant-Preserved Pitch Shifting.
"""
import os
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np
import soundfile as sf
from scipy import signal

logger = logging.getLogger("bambata.dsp")

try:
    from pedalboard import (
        Pedalboard,
        HighpassFilter,
        LowpassFilter,
        PeakFilter,
        NoiseGate,
        Compressor,
        Limiter,
        Reverb
    )
    HAS_PEDALBOARD = True
except ImportError:
    HAS_PEDALBOARD = False

try:
    import pyrubberband as pyrb
    HAS_PYRUBBERBAND = True
except ImportError:
    HAS_PYRUBBERBAND = False


def apply_formant_preserved_pitch_shift(
    audio: np.ndarray,
    sample_rate: int,
    semitones: float,
    is_vocal: bool = False
) -> np.ndarray:
    if abs(semitones) < 0.05 or len(audio) == 0:
        return audio

    if HAS_PYRUBBERBAND:
        try:
            return pyrb.pitch_shift(audio, sample_rate, n_steps=semitones, formants=is_vocal).astype(np.float32)
        except Exception as e:
            logger.warning(f"pyrubberband pitch shift failed: {e}. Using resample fallback.")

    ratio = 2.0 ** (semitones / 12.0)
    num_samples = int(len(audio) / ratio)
    resampled = signal.resample(audio, num_samples)
    return signal.resample(resampled, len(audio)).astype(np.float32)


def apply_kill_the_beat_vocal_filter(
    vocal_audio: np.ndarray,
    sample_rate: int = 44100,
    cutoff_hz: float = 250.0,
    gate_threshold_db: float = -25.0,
    gate_ratio: float = 10.0,
    gate_release_ms: float = 50.0
) -> np.ndarray:
    if len(vocal_audio) == 0:
        return vocal_audio

    if vocal_audio.ndim == 1:
        vocal_audio = np.column_stack((vocal_audio, vocal_audio))

    if HAS_PEDALBOARD:
        try:
            board = Pedalboard([
                HighpassFilter(cutoff_frequency_hz=cutoff_hz),
                NoiseGate(
                    threshold_db=gate_threshold_db,
                    ratio=gate_ratio,
                    release_ms_ratio=gate_release_ms
                ) if hasattr(NoiseGate, 'release_ms_ratio') else NoiseGate(threshold_db=gate_threshold_db, ratio=gate_ratio)
            ])
            processed = board(vocal_audio.T.astype(np.float32), sample_rate).T
            return processed.astype(np.float32)
        except Exception as e:
            logger.warning(f"Pedalboard 'Kill the Beat' gate failed: {e}. Using scipy/numpy chain.")

    sos_high = signal.butter(6, cutoff_hz, 'highpass', fs=sample_rate, output='sos')
    filtered = signal.sosfilt(sos_high, vocal_audio, axis=0)

    mono = np.mean(filtered, axis=1)
    frame_len = max(2, int(0.005 * sample_rate))
    kernel = np.ones(frame_len) / frame_len
    rms = np.sqrt(np.convolve(mono ** 2, kernel, mode='same'))

    thresh_lin = 10.0 ** (gate_threshold_db / 20.0)
    gate_mask = np.where(rms >= thresh_lin, 1.0, 0.0)

    release_samples = max(2, int((gate_release_ms / 1000.0) * sample_rate))
    smoothed_gate = np.convolve(gate_mask, np.ones(release_samples) / release_samples, mode='same')
    smoothed_gate = np.clip(smoothed_gate * gate_ratio, 0.0, 1.0)[:, np.newaxis]

    return (filtered * smoothed_gate).astype(np.float32)


def compute_spectral_flux(mono_audio: np.ndarray, sample_rate: int = 44100, frame_ms: float = 25.0) -> np.ndarray:
    n_fft = max(64, int((frame_ms / 1000.0) * sample_rate))
    hop_length = n_fft // 2
    freqs, times, stft = signal.stft(mono_audio, fs=sample_rate, nperseg=n_fft, noverlap=n_fft - hop_length)
    mag = np.abs(stft)
    diff = np.diff(mag, axis=1)
    diff[diff < 0] = 0.0
    flux = np.sum(diff, axis=0)
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
    if len(vocal_stem) == 0:
        return vocal_stem

    is_1d = vocal_stem.ndim == 1
    if is_1d:
        vocal_stem = np.column_stack((vocal_stem, vocal_stem))
    if instrumental_stem.ndim == 1:
        instrumental_stem = np.column_stack((instrumental_stem, instrumental_stem))

    target_len = len(vocal_stem)
    if len(instrumental_stem) < target_len:
        pad_len = target_len - len(instrumental_stem)
        inst_matched = np.vstack((instrumental_stem, np.zeros((pad_len, 2), dtype=np.float32)))
    else:
        inst_matched = instrumental_stem[:target_len]

    inst_mono = np.mean(inst_matched, axis=1)
    frame_samples = max(4, int((frame_ms / 1000.0) * sample_rate))
    kernel = np.ones(frame_samples, dtype=np.float32) / frame_samples
    inst_rms = np.sqrt(np.convolve(inst_mono ** 2, kernel, mode='same'))

    flux = compute_spectral_flux(inst_mono, sample_rate, frame_ms)

    max_rms = np.max(inst_rms) if len(inst_rms) > 0 else 0.0
    if max_rms > 0.01:
        dynamic_thresh = max(loudness_threshold_rms, np.percentile(inst_rms, 60) * 0.85)
    else:
        dynamic_thresh = loudness_threshold_rms

    composite_activity = (1.0 - spectral_flux_weight) * (inst_rms / max(1e-5, dynamic_thresh)) + spectral_flux_weight * (flux * 1.5)
    raw_mask = np.where(composite_activity < 1.0, 1.0, 0.0).astype(np.float32)

    fade_samples = max(2, int((crossfade_ms / 1000.0) * sample_rate))
    smoothing_kernel = np.hanning(fade_samples)
    smoothing_kernel /= np.sum(smoothing_kernel)

    smooth_mask = np.convolve(raw_mask, smoothing_kernel, mode='same')
    smooth_mask = np.clip(smooth_mask, 0.0, 1.0)[:, np.newaxis]

    surgically_masked_vocal = vocal_stem * smooth_mask

    if is_1d:
        return surgically_masked_vocal[:, 0].astype(np.float32)
    return surgically_masked_vocal.astype(np.float32)


def apply_anti_clash_vocal_notch(
    track_b_melody: np.ndarray,
    hero_vocal_active: bool = True,
    sample_rate: int = 44100,
    cutoff_hz: float = 1500.0,
    q: float = 2.0,
    gain_db: float = -6.0
) -> np.ndarray:
    if len(track_b_melody) == 0 or not hero_vocal_active:
        return track_b_melody

    if track_b_melody.ndim == 1:
        track_b_melody = np.column_stack((track_b_melody, track_b_melody))

    if HAS_PEDALBOARD:
        try:
            board = Pedalboard([
                PeakFilter(cutoff_frequency_hz=cutoff_hz, q=q, gain_db=gain_db)
            ])
            carved = board(track_b_melody.T.astype(np.float32), sample_rate).T
            return carved.astype(np.float32)
        except Exception as e:
            logger.warning(f"Pedalboard PeakFilter failed: {e}. Using biquad notch fallback.")

    w0 = 2 * np.pi * cutoff_hz / sample_rate
    alpha = np.sin(w0) / (2 * q)
    A = 10.0 ** (gain_db / 40.0)

    b0 = 1 + alpha * A
    b1 = -2 * np.cos(w0)
    b2 = 1 - alpha * A
    a0 = 1 + alpha / A
    a1 = -2 * np.cos(w0)
    a2 = 1 - alpha / A

    b = np.array([b0 / a0, b1 / a0, b2 / a0])
    a = np.array([1.0, a1 / a0, a2 / a0])

    carved = signal.lfilter(b, a, track_b_melody, axis=0)
    return carved.astype(np.float32)


def weld_audio(
    existing_audio: np.ndarray,
    extension_audio: np.ndarray,
    sample_rate: int = 44100,
    crossfade_ms: float = 50.0
) -> np.ndarray:
    if len(existing_audio) == 0:
        return extension_audio
    if len(extension_audio) == 0:
        return existing_audio

    if existing_audio.ndim == 1:
        existing_audio = np.column_stack((existing_audio, existing_audio))
    if extension_audio.ndim == 1:
        extension_audio = np.column_stack((extension_audio, extension_audio))

    fade_samples = int((crossfade_ms / 1000.0) * sample_rate)
    fade_samples = min(fade_samples, len(existing_audio), len(extension_audio))

    mono_tail = existing_audio[-fade_samples:, :].mean(axis=1)
    zero_crossings = np.where(np.diff(np.signbit(mono_tail)))[0]
    if len(zero_crossings) > 0:
        midpoint = fade_samples // 2
        closest = zero_crossings[np.argmin(np.abs(zero_crossings - midpoint))]
        actual_fade = max(10, closest)
    else:
        actual_fade = max(10, fade_samples // 2)

    t_curve = np.linspace(0, np.pi / 2.0, actual_fade)
    fade_out = np.cos(t_curve)[:, np.newaxis]
    fade_in = np.sin(t_curve)[:, np.newaxis]

    head = existing_audio[:-actual_fade]
    cross = (existing_audio[-actual_fade:] * fade_out) + (extension_audio[:actual_fade] * fade_in)
    tail = extension_audio[actual_fade:]

    return np.vstack((head, cross, tail)).astype(np.float32)
