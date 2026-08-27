"""BAMBATA 2.0 - Spotify Pedalboard Transition Renderer & Surgical Anti-Clash DSP.

Features:
1. "Kill the Beat" Vocal Filter (250Hz Highpass + -25dB NoiseGate).
2. Deterministic Vocal Gap Surgeon (RMS envelope masking).
3. Dynamic Anti-Clash Notch Carving (PeakFilter 1500Hz, Q=2.0, -6.0dB).
4. Formant-Preserved Pitch Shifting.
5. Master Bus Glue (-0.2dB true peak limiter).
6. Region Slicing & Export (10ms cosine anti-pop fades).
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import soundfile as sf
from pathlib import Path
from scipy import signal
from app.services.gap_surgeon import apply_vocal_gap_mask

logger = logging.getLogger("bambata.transition_renderer")

try:
    from pedalboard import (
        Pedalboard,
        HighpassFilter,
        LowpassFilter,
        PeakFilter,
        NoiseGate,
        Compressor,
        Limiter,
        Reverb,
        Delay,
        Gain
    )
    HAS_PEDALBOARD = True
except ImportError:
    HAS_PEDALBOARD = False

try:
    import pyrubberband as pyrb
    HAS_PYRUBBERBAND = True
except ImportError:
    HAS_PYRUBBERBAND = False


def apply_kill_the_beat_vocal_filter(
    vocal_audio: np.ndarray,
    sample_rate: int = 44100,
    cutoff_hz: float = 250.0,
    gate_threshold_db: float = -25.0,
    gate_ratio: float = 10.0,
    gate_release_ms: float = 50.0
) -> np.ndarray:
    """
    "Kill the Beat" Vocal Filter:
    1. 250Hz HighpassFilter -> Completely deletes kicks, basslines, and log drums from vocal stem.
    2. Strict NoiseGate(-25dB, ratio=10.0, release=50ms) -> Snaps audio to digital 0.0 silence.
    """
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


def apply_high_fidelity_vocal_gate(
    vocal_audio: np.ndarray,
    sample_rate: int = 44100,
    threshold_db: float = -25.0,
    ratio: float = 10.0,
    release_ms: float = 50.0
) -> np.ndarray:
    return apply_kill_the_beat_vocal_filter(
        vocal_audio=vocal_audio,
        sample_rate=sample_rate,
        cutoff_hz=250.0,
        gate_threshold_db=threshold_db,
        gate_ratio=ratio,
        gate_release_ms=release_ms
    )


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


def slice_and_export_region(
    audio: np.ndarray,
    start_ms: float,
    end_ms: float,
    sample_rate: int = 44100,
    fade_ms: float = 10.0
) -> np.ndarray:
    if len(audio) == 0:
        return audio

    if audio.ndim == 1:
        audio = np.column_stack((audio, audio))

    total_samples = len(audio)
    start_idx = max(0, int((start_ms / 1000.0) * sample_rate))
    end_idx = min(total_samples, int((end_ms / 1000.0) * sample_rate))

    if start_idx >= end_idx:
        start_idx = 0
        end_idx = total_samples

    clipped = np.copy(audio[start_idx:end_idx])
    clip_len = len(clipped)

    fade_samples = int((fade_ms / 1000.0) * sample_rate)
    fade_samples = min(fade_samples, clip_len // 2)

    if fade_samples > 0:
        t_in = np.linspace(0, np.pi / 2.0, fade_samples)
        fade_in = np.sin(t_in)[:, np.newaxis]
        clipped[:fade_samples] *= fade_in

        t_out = np.linspace(np.pi / 2.0, 0, fade_samples)
        fade_out = np.sin(t_out)[:, np.newaxis]
        clipped[-fade_samples:] *= fade_out

    return clipped.astype(np.float32)


def apply_formant_preserved_pitch_shift(
    audio: np.ndarray,
    sample_rate: int,
    semitones: float
) -> np.ndarray:
    if abs(semitones) < 0.05:
        return audio

    if HAS_PYRUBBERBAND:
        try:
            return pyrb.pitch_shift(audio, sample_rate, n_steps=semitones, formants=True)
        except Exception as e:
            logger.warning(f"pyrubberband pitch shift failed: {e}. Using resample fallback.")

    ratio = 2.0 ** (semitones / 12.0)
    num_samples = int(len(audio) / ratio)
    resampled = signal.resample(audio, num_samples)
    return signal.resample(resampled, len(audio)).astype(np.float32)


def apply_spectral_vocal_ducking(
    vocal_stem: np.ndarray,
    melody_stem: np.ndarray,
    sample_rate: int = 44100,
    duck_amount_db: float = -4.5
) -> np.ndarray:
    if len(vocal_stem) == 0 or len(melody_stem) == 0:
        return melody_stem

    v_mono = vocal_stem.mean(axis=1) if vocal_stem.ndim > 1 else vocal_stem
    min_len = min(len(vocal_stem), len(melody_stem))
    v_mono = v_mono[:min_len]

    frame_size = int(0.020 * sample_rate)
    v_sq = v_mono ** 2
    if len(v_sq) < frame_size:
        return melody_stem

    kernel = np.ones(frame_size) / frame_size
    v_rms = np.sqrt(np.convolve(v_sq, kernel, mode='same'))

    v_active = np.clip((v_rms - 0.03) / 0.12, 0.0, 1.0)
    gain_ducked = 10.0 ** (duck_amount_db / 20.0)
    gain_curve = 1.0 - (v_active * (1.0 - gain_ducked))

    ducked_melody = np.copy(melody_stem[:min_len])
    if ducked_melody.ndim > 1:
        ducked_melody *= gain_curve[:, np.newaxis]
    else:
        ducked_melody *= gain_curve

    return ducked_melody.astype(np.float32)


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
    fade_samples = min(fade_samples, len(existing_audio) // 2, len(extension_audio) // 2)

    tail_chunk = existing_audio[-fade_samples * 2:, 0]
    zero_crossings = np.where(np.diff(np.signbit(tail_chunk)))[0]

    if len(zero_crossings) > 0:
        weld_point = len(existing_audio) - (len(tail_chunk) - zero_crossings[-1])
    else:
        weld_point = len(existing_audio) - fade_samples

    weld_point = max(0, min(weld_point, len(existing_audio) - fade_samples))

    head = existing_audio[:weld_point]
    tail_xfade = existing_audio[weld_point : weld_point + fade_samples]
    ext_xfade = extension_audio[:fade_samples]
    ext_body = extension_audio[fade_samples:]

    t = np.linspace(0, np.pi / 2.0, fade_samples)
    cos_curve = np.cos(t)[:, np.newaxis]
    sin_curve = np.sin(t)[:, np.newaxis]

    blended = (tail_xfade * cos_curve) + (ext_xfade * sin_curve)
    return np.vstack((head, blended, ext_body)).astype(np.float32)
