"""BAMBATA 2.0 - Silence Detection, Reaction Latency Compensation & Feedback Correlation DSP.

Features:
1. Reaction Latency Compensation: Subtracts 800ms human delay from all live user feedback taps.
2. Event Correlation: 4000ms look-back window matching taps to block start transitions vs mid-block vibe ratings.
3. Silence cleanup & 15ms cosine smoothing pass.
"""
import logging
from typing import List, Dict, Any, Tuple
import numpy as np
from scipy import signal
from app.services.phrase_aligner import PhraseGrid

logger = logging.getLogger("bambata.cleanup_dsp")


def compensate_reaction_latency(taps_ms: List[float], offset_ms: float = 800.0) -> List[float]:
    """
    Subtracts human reaction latency (default 800ms) from every tap timestamp.
    """
    if not taps_ms:
        return []
    return [max(0.0, float(t) - offset_ms) for t in taps_ms]


def score_arrangement_blocks_with_feedback(
    blocks: List[Dict[str, Any]],
    hype_taps_ms: List[float] = None,
    negative_taps_ms: List[float] = None,
    skipped_zones_ms: List[List[float]] = None,
    latency_offset_ms: float = 800.0,
    lookback_window_ms: float = 4000.0
) -> List[Dict[str, Any]]:
    """
    Correlates latency-compensated user taps to musical phrase events & block transitions.
    
    1. Subtracts 800ms from every tap.
    2. Look-Back Window (4000ms): If a compensated tap lands within 4000ms (2 bars) of a block's
       `start_ms` or major stem entrance, flags the block's transition specifically.
    3. Mid-block taps are assigned to the block as general vibe ratings.
    """
    # 1. Compensate Reaction Latency (-800ms)
    comp_hype = compensate_reaction_latency(hype_taps_ms or [], offset_ms=latency_offset_ms)
    comp_negative = compensate_reaction_latency(negative_taps_ms or [], offset_ms=latency_offset_ms)
    skipped_zones = skipped_zones_ms or []

    scored_blocks = []

    for blk in blocks:
        s_ms = float(blk.get("start_ms", 0))
        e_ms = float(blk.get("end_ms", s_ms + 15000))
        transition_window_end = min(e_ms, s_ms + lookback_window_ms)

        # Transition-Specific Taps (Within 4000ms lookback window after start_ms)
        h_trans = sum(1 for t in comp_hype if s_ms <= t <= transition_window_end)
        c_trans = sum(1 for t in comp_negative if s_ms <= t <= transition_window_end)

        # Mid-Block Vibe Taps (Beyond transition window)
        h_vibe = sum(1 for t in comp_hype if transition_window_end < t <= e_ms)
        c_vibe = sum(1 for t in comp_negative if transition_window_end < t <= e_ms)

        total_h = h_trans + h_vibe
        total_c = c_trans + c_vibe

        # Skipped Zone Check (-5)
        skip_count = 0
        is_fully_skipped = False
        for z in skipped_zones:
            if len(z) >= 2:
                z_start, z_end = z[0], z[1]
                if max(s_ms, z_start) < min(e_ms, z_end):
                    skip_count += 1
                    overlap_dur = min(e_ms, z_end) - max(s_ms, z_start)
                    blk_dur = max(1.0, e_ms - s_ms)
                    if (overlap_dur / blk_dur) >= 0.6:
                        is_fully_skipped = True

        composite_score = (total_h * 1) - (total_c * 1) - (skip_count * 5)
        transition_disliked = (c_trans >= 1 and c_trans > h_trans)
        transition_hyped = (h_trans >= 1 and h_trans > c_trans)

        block_copy = dict(blk)
        block_copy["feedback_score"] = {
            "hype_count": total_h,
            "cold_count": total_c,
            "skip_count": skip_count,
            "composite_score": composite_score,
            "transition_feedback": {
                "transition_disliked": transition_disliked,
                "transition_hyped": transition_hyped,
                "transition_cold_taps": c_trans,
                "transition_hype_taps": h_trans,
                "lookback_window_ms": lookback_window_ms
            },
            "vibe_feedback": {
                "mid_block_cold": c_vibe,
                "mid_block_hype": h_vibe
            },
            "is_fully_skipped": is_fully_skipped,
            "status": "KEEP" if composite_score >= 0 and not transition_disliked else (
                "DELETE" if is_fully_skipped or composite_score <= -5 else "MUTATE"
            )
        }
        scored_blocks.append(block_copy)

    return scored_blocks


def detect_and_close_accidental_silence(
    audio: np.ndarray,
    sample_rate: int = 44100,
    bpm: float = 126.0,
    valid_silence_intervals_s: List[Tuple[float, float]] = None,
    silence_threshold_db: float = -45.0,
    min_silence_duration_s: float = 0.35
) -> np.ndarray:
    if len(audio) == 0:
        return audio

    if audio.ndim == 1:
        audio = np.column_stack((audio, audio))

    mono = np.abs(audio.mean(axis=1))
    frame_len = int(0.050 * sample_rate)
    num_frames = len(mono) // frame_len
    if num_frames == 0:
        return audio

    frame_energies = []
    for f in range(num_frames):
        chunk = mono[f * frame_len : (f + 1) * frame_len]
        rms = np.sqrt(np.mean(chunk ** 2)) + 1e-9
        db = 20.0 * np.log10(rms)
        frame_energies.append(db)

    silence_frames = np.array(frame_energies) < silence_threshold_db
    min_frames = int(min_silence_duration_s / 0.050)

    cuts = []
    in_silence = False
    start_f = 0

    for f, is_silent in enumerate(silence_frames):
        if is_silent and not in_silence:
            in_silence = True
            start_f = f
        elif not is_silent and in_silence:
            in_silence = False
            dur_frames = f - start_f
            if dur_frames >= min_frames:
                start_s = start_f * 0.050
                end_s = f * 0.050

                is_intentional = False
                if valid_silence_intervals_s:
                    for v_start, v_end in valid_silence_intervals_s:
                        if abs(start_s - v_start) < 1.0 or (start_s >= v_start and end_s <= v_end):
                            is_intentional = True
                            break

                if not is_intentional:
                    cuts.append((int(start_s * sample_rate), int(end_s * sample_rate)))

    if not cuts:
        return audio

    cleaned_slices = []
    last_idx = 0
    fade_samples = int(0.015 * sample_rate)

    for cut_start, cut_end in cuts:
        if cut_start > last_idx:
            chunk = audio[last_idx:cut_start]
            if len(chunk) > fade_samples:
                chunk[-fade_samples:] *= np.linspace(1, 0, fade_samples)[:, np.newaxis]
            cleaned_slices.append(chunk)
        last_idx = cut_end

    if last_idx < len(audio):
        cleaned_slices.append(audio[last_idx:])

    if not cleaned_slices:
        return audio

    return np.vstack(cleaned_slices).astype(np.float32)


def apply_global_smoothing_pass(
    audio: np.ndarray,
    sample_rate: int = 44100,
    fade_ms: float = 15.0
) -> np.ndarray:
    if len(audio) == 0:
        return audio

    if audio.ndim == 1:
        audio = np.column_stack((audio, audio))

    fade_samples = int((fade_ms / 1000.0) * sample_rate)
    fade_samples = min(fade_samples, len(audio) // 2)

    t_in = np.linspace(0, np.pi / 2.0, fade_samples)
    fade_in_curve = np.sin(t_in)[:, np.newaxis]

    t_out = np.linspace(np.pi / 2.0, 0, fade_samples)
    fade_out_curve = np.sin(t_out)[:, np.newaxis]

    smoothed = np.copy(audio)
    smoothed[:fade_samples] *= fade_in_curve
    smoothed[-fade_samples:] *= fade_out_curve

    return smoothed.astype(np.float32)
