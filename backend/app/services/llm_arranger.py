"""BAMBATA 2.0 - Zero-Reference Generative Arranger with YouTube Style-Transfer & Harmonic Key-Lock.

LLM HANDOFF DIRECTIVES:
1. YouTube Style-Transfer Blueprint: Molds arrangement directly to match reference DNA (e.g. Dlala Thukzin Afrohouse or Amapiano log drum drops).
2. Default Deck Architecture: Deck A is the sole "Hero Vocal & Harmonic Source". Deck B is the pure "Groove & Sub-Bass Anchor".
3. Precision Harmonic Key-Lock: Both tracks are locked into optimal Pivot Key via formant-preserved pitch shifting.
4. Enhanced VAD Gap-Placement: Do not attempt to micro-chop vocals. Output continuous blocks; Python gap_surgeon.py uses spectral flux to duck vocals around beats.
5. Absolute Zero-Tolerance for Vocal Overlap: Track B's vocal stem is 0.0 whenever Deck A's Hero Vocal is active.
"""
import json
import logging
from typing import Dict, Any, List, Optional
from app.services.phrase_aligner import PhraseGrid
from app.services.harmonic_math import calculate_optimal_pivot_key
from app.services.cleanup_dsp import score_arrangement_blocks_with_feedback
from app.services.style_transfer import style_transfer_engine

logger = logging.getLogger("bambata.llm_arranger")


class LLMArranger:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    def generate_vocal_priority_arrangement(
        self,
        track_a_meta: Dict[str, Any],
        track_b_meta: Dict[str, Any],
        reference_meta: Optional[Dict[str, Any]] = None,
        duration_s: float = 60.0,
        bpm: float = 126.0,
        cut_to_the_chase: bool = False
    ) -> Dict[str, Any]:
        """
        Generates continuous arrangement blocks guided by YouTube Style-Transfer Blueprint.
        """
        grid = PhraseGrid(bpm=bpm)
        key_a = track_a_meta.get("key", "8A")
        key_b = track_b_meta.get("key", "10A")
        pivot_data = calculate_optimal_pivot_key(key_a, key_b)

        # 1. Fetch or Match YouTube Style-Transfer Reference DNA
        yt_url = reference_meta.get("youtube_url") if reference_meta else None
        style_dna = style_transfer_engine.extract_or_match_reference_dna(
            youtube_url=yt_url,
            bpm_a=track_a_meta.get("bpm", bpm),
            bpm_b=track_b_meta.get("bpm", bpm),
            key_a=key_a,
            key_b=key_b
        )

        # 2. "CUT TO THE CHASE" MACRO EXECUTION
        if cut_to_the_chase:
            logger.info("Executing 'Cut to the Chase' macro: jumping straight to 4-bar pre-drop build + main drop.")
            build_bars = 4
            drop_bars = 16
            climax_bars = 8

            current_ms = 0
            blocks = []

            # 4-Bar Rapid Buildup
            s1_ms = grid.bars_to_ms(build_bars)
            blocks.append({
                "stage_id": 1,
                "block_name": f"Stage 1: Rapid 4-Bar Pre-Drop Tension ({style_dna.get('style_genre', 'Club VIP')})",
                "start_ms": current_ms,
                "end_ms": current_ms + s1_ms,
                "bars": build_bars,
                "deck_architecture": {
                    "deck_a_role": "Hero Vocal Source (Track A Lead Riser)",
                    "deck_b_role": "Groove & Rhythm Source (Track B Snare Roll)"
                },
                "dsp_directives": {
                    "harmonic_key_lock": f"Locked to Pivot Key {pivot_data['pivot_camelot']}",
                    "kill_the_beat_filter": "Highpass(250Hz) + NoiseGate(-25dB, release=50ms)",
                    "gap_surgeon": "Enhanced VAD Spectral Flux active"
                },
                "pre_drop_silence_gap_ms": grid.bars_to_ms(1),
                "stem_levels_track_a": {"Vocals": 0.95, "Melody": 0.4, "Bass": 0.0, "Drums": 0.0},
                "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 0.0, "Drums": 1.0}
            })
            current_ms += s1_ms

            # The Instant Club Drop
            s2_ms = grid.bars_to_ms(drop_bars)
            blocks.append({
                "stage_id": 2,
                "block_name": f"Stage 2: Instant Peak Drop ({style_dna.get('title', 'Peak Drop')})",
                "start_ms": current_ms,
                "end_ms": current_ms + s2_ms,
                "bars": drop_bars,
                "deck_architecture": {
                    "deck_a_role": "Track A Continuous Hero Vocal",
                    "deck_b_role": f"Track B {style_dna.get('percussion_groove_type', '4/4 Kick & Sub-Bass')}"
                },
                "dsp_directives": {
                    "harmonic_key_lock": f"Locked to Pivot Key {pivot_data['pivot_camelot']}",
                    "kill_the_beat_filter": "Highpass(250Hz) + NoiseGate(-25dB, release=50ms)",
                    "gap_surgeon": "Enhanced VAD Spectral Flux active"
                },
                "stem_levels_track_a": {"Vocals": 1.35, "Melody": 0.45, "Bass": 0.0, "Drums": 0.0},
                "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 1.0, "Drums": 1.0}
            })
            current_ms += s2_ms

            # Climax Outro
            s3_ms = grid.bars_to_ms(climax_bars)
            blocks.append({
                "stage_id": 3,
                "block_name": "Stage 3: Climax Outro",
                "start_ms": current_ms,
                "end_ms": current_ms + s3_ms,
                "bars": climax_bars,
                "deck_architecture": {
                    "deck_a_role": "Track A Fading Vocal Echo",
                    "deck_b_role": "Track B Outro Drum Groove"
                },
                "stem_levels_track_a": {"Vocals": 0.8, "Melody": 0.0, "Bass": 0.0, "Drums": 0.0},
                "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.0, "Bass": 0.7, "Drums": 0.9}
            })

            return {
                "mode": "STYLE_TRANSFER_CUT_TO_THE_CHASE",
                "bpm": bpm,
                "cut_to_the_chase": True,
                "style_transfer_dna": style_dna,
                "precision_harmonic_key_lock": pivot_data,
                "dsp_pipeline": {
                    "harmonic_key_lock": f"Locked to Pivot Key {pivot_data['pivot_camelot']} (Track A: {pivot_data['shift_a_semitones']:+.1f}st, Track B: {pivot_data['shift_b_semitones']:+.1f}st)",
                    "vocal_filter": "HighpassFilter(250Hz) + NoiseGate(-25dB, ratio=10.0, release=50ms)",
                    "gap_surgeon": "apply_vocal_gap_mask(Spectral Flux + 10ms crossfade)",
                    "anti_clash_notch": "PeakFilter(1500Hz, Q=2.0, -6dB)"
                },
                "total_duration_s": round((current_ms + s3_ms) / 1000.0, 1),
                "arrangement_blocks": blocks
            }

        # 3. STANDARD STYLE-TRANSFER BLUEPRINT RECORD (Afrohouse / Amapiano / Club)
        b_struct = style_dna.get("structure_blueprint", {})
        intro_bars = b_struct.get("intro_bars", 4)
        verse_bars = b_struct.get("verse_bars", 8)
        build_bars = b_struct.get("build_bars", style_dna.get("build_bars", 8))
        drop_bars = b_struct.get("drop_bars", 16)
        outro_bars = b_struct.get("outro_bars", 4)

        current_ms = 0
        blocks = []

        # STAGE 1: INTRO GROOVE
        s1_ms = grid.bars_to_ms(intro_bars)
        blocks.append({
            "stage_id": 1,
            "block_name": f"Stage 1: Intro Groove ({style_dna.get('style_genre', 'Afrohouse')})",
            "start_ms": current_ms,
            "end_ms": current_ms + s1_ms,
            "bars": intro_bars,
            "deck_architecture": {
                "deck_a": "Gated Hero Vocal Tease",
                "deck_b": f"Filtered {style_dna.get('percussion_groove_type', 'Drum Groove')}"
            },
            "stem_levels_track_a": {"Vocals": 0.85, "Melody": 0.4, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 0.0, "Drums": 0.75}
        })
        current_ms += s1_ms

        # STAGE 2: MAIN VERSE
        s2_ms = grid.bars_to_ms(verse_bars)
        blocks.append({
            "stage_id": 2,
            "block_name": "Stage 2: Main Storytelling Verse",
            "start_ms": current_ms,
            "end_ms": current_ms + s2_ms,
            "bars": verse_bars,
            "deck_architecture": {
                "deck_a": "Sole Hero Storytelling Vocal (Continuous Block)",
                "deck_b": f"{style_dna.get('sub_bass_profile', 'Driving Bassline')} & Percussion"
            },
            "dsp_directives": {
                "gap_surgeon": "Enhanced VAD Spectral Flux weaves vocal into Track B silence gaps"
            },
            "stem_levels_track_a": {"Vocals": 1.25, "Melody": 0.55, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 0.85, "Drums": 0.95}
        })
        current_ms += s2_ms

        # STAGE 3: BUILDUP & TENSION
        s3_ms = grid.bars_to_ms(build_bars)
        blocks.append({
            "stage_id": 3,
            "block_name": f"Stage 3: {build_bars}-Bar Tension Riser ({style_dna.get('title', 'Buildup')})",
            "start_ms": current_ms,
            "end_ms": current_ms + s3_ms,
            "bars": build_bars,
            "deck_architecture": {
                "deck_a": "Rising Hero Vocal Riser",
                "deck_b": "Accelerating Percussion & Snare Roll"
            },
            "pre_drop_silence_gap_ms": grid.bars_to_ms(1),
            "stem_levels_track_a": {"Vocals": 1.15, "Melody": 0.3, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 0.0, "Drums": 1.0}
        })
        current_ms += s3_ms

        # STAGE 4: THE HYBRID DROP
        s4_ms = grid.bars_to_ms(drop_bars)
        blocks.append({
            "stage_id": 4,
            "block_name": f"Stage 4: The Peak Drop ({style_dna.get('style_genre', 'Club Drop')})",
            "start_ms": current_ms,
            "end_ms": current_ms + s4_ms,
            "bars": drop_bars,
            "deck_architecture": {
                "deck_a": "Track A Hero Vocal Hook",
                "deck_b": f"Track B {style_dna.get('percussion_groove_type', 'Drop Rhythm')} & {style_dna.get('sub_bass_profile', 'Sub-Bass')}"
            },
            "dsp_directives": {
                "gap_surgeon": "Enhanced VAD Spectral Flux active with 10ms cosine crossfades"
            },
            "stem_levels_track_a": {"Vocals": 1.35, "Melody": 0.35, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 1.0, "Drums": 1.0}
        })
        current_ms += s4_ms

        # STAGE 5: OUTRO
        s5_ms = grid.bars_to_ms(outro_bars)
        blocks.append({
            "stage_id": 5,
            "block_name": "Stage 5: Outro Mix-Out",
            "start_ms": current_ms,
            "end_ms": current_ms + s5_ms,
            "bars": outro_bars,
            "deck_architecture": {
                "deck_a": "Track A Fading Vocal Echo",
                "deck_b": "Track B Outro Beat"
            },
            "stem_levels_track_a": {"Vocals": 0.4, "Melody": 0.0, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.0, "Bass": 0.6, "Drums": 0.85}
        })

        return {
            "mode": "STYLE_TRANSFER_HARMONIC_KEY_LOCK_PIPELINE",
            "bpm": bpm,
            "style_transfer_dna": style_dna,
            "precision_harmonic_key_lock": pivot_data,
            "default_deck_architecture": {
                "deck_a": "Track A (Left Deck) -> Sole Hero Vocal & Harmonic Source",
                "deck_b": "Track B (Right Deck) -> Pure Groove & Sub-Bass Anchor"
            },
            "total_duration_s": round((current_ms + s5_ms) / 1000.0, 1),
            "arrangement_blocks": blocks
        }

    def refine_arrangement_with_feedback(
        self,
        prev_arrangement: Dict[str, Any],
        hype_taps_ms: List[float] = None,
        negative_taps_ms: List[float] = None,
        skipped_zones_ms: List[List[float]] = None,
        bpm: float = 126.0
    ) -> Dict[str, Any]:
        grid = PhraseGrid(bpm=bpm)
        raw_blocks = prev_arrangement.get("arrangement_blocks", [])

        scored_blocks = score_arrangement_blocks_with_feedback(
            blocks=raw_blocks,
            hype_taps_ms=hype_taps_ms,
            negative_taps_ms=negative_taps_ms,
            skipped_zones_ms=skipped_zones_ms,
            latency_offset_ms=800.0,
            lookback_window_ms=4000.0
        )

        mutated_blocks = []
        current_ms = 0

        for blk in scored_blocks:
            fb = blk.get("feedback_score", {})
            status = fb.get("status", "KEEP")
            trans_fb = fb.get("transition_feedback", {})
            transition_disliked = trans_fb.get("transition_disliked", False)

            if status == "DELETE":
                logger.info(f"Refine: Deleting skipped block '{blk.get('block_name')}'")
                continue

            bars = blk.get("bars", 4)
            block_dur_ms = grid.bars_to_ms(bars)

            block_res = dict(blk)
            block_res["start_ms"] = current_ms
            block_res["end_ms"] = current_ms + block_dur_ms

            if transition_disliked:
                block_res["transition_repair"] = {
                    "repaired": True,
                    "pre_transition_filter_sweep": "Lowpass 1800Hz -> 20kHz 4-Bar Ramp",
                    "pre_drop_silence_gap_ms": grid.bars_to_ms(1),
                    "entry_smoothing": "15ms Cosine Crossfade applied on boundary"
                }

                la = dict(blk.get("stem_levels_track_a", {}))
                lb = dict(blk.get("stem_levels_track_b", {}))

                if la.get("Vocals", 0) > 0.8:
                    la["Vocals"] = 0.95
                    lb["Melody"] = 0.15
                lb["Vocals"] = 0.0

                block_res["stem_levels_track_a"] = la
                block_res["stem_levels_track_b"] = lb
                block_res["mutation_applied"] = "Transition Entrance Repaired (Filter Sweep + Rebalanced Entry Levels)"

            elif status == "MUTATE":
                la = dict(blk.get("stem_levels_track_a", {}))
                lb = dict(blk.get("stem_levels_track_b", {}))

                if la.get("Vocals", 0) > 0.5:
                    la["Vocals"] = 0.0
                    lb["Vocals"] = 1.2
                    la["Melody"] = 0.2
                    lb["Melody"] = 0.8
                else:
                    la["Vocals"] = 1.25
                    lb["Vocals"] = 0.0
                    la["Melody"] = 0.8
                    lb["Melody"] = 0.2

                block_res["stem_levels_track_a"] = la
                block_res["stem_levels_track_b"] = lb
                block_res["mutation_applied"] = "Active Stem Swap (Zero Vocal Overlap Enforced)"

            mutated_blocks.append(block_res)
            current_ms += block_dur_ms

        return {
            "mode": "EVENT_CORRELATED_MUTATION",
            "bpm": bpm,
            "latency_compensation_offset_ms": 800.0,
            "lookback_window_ms": 4000.0,
            "total_refined_duration_s": round(current_ms / 1000.0, 2),
            "feedback_summary": {
                "total_hype_taps": len(hype_taps_ms or []),
                "total_negative_taps": len(negative_taps_ms or []),
                "total_skipped_zones": len(skipped_zones_ms or []),
                "deleted_blocks_count": len(raw_blocks) - len(mutated_blocks)
            },
            "arrangement_blocks": mutated_blocks
        }

    def generate_context_aware_extension(
        self,
        prev_arrangement: Dict[str, Any],
        add_duration_s: float = 60.0,
        bpm: float = 126.0
    ) -> Dict[str, Any]:
        grid = PhraseGrid(bpm=bpm)
        prev_blocks = prev_arrangement.get("arrangement_blocks", [])

        start_ms = prev_blocks[-1]["end_ms"] if len(prev_blocks) > 0 else 0
        last_stage_id = prev_blocks[-1].get("stage_id", 4) if len(prev_blocks) > 0 else 4

        verse_bars, build_bars, drop_bars = 8, 8, 16
        extended_blocks = []
        current_ms = start_ms

        s1_ms = grid.bars_to_ms(verse_bars)
        extended_blocks.append({
            "stage_id": last_stage_id + 1,
            "block_name": f"Stage {last_stage_id + 1}: Deconstructed Groove Verse",
            "start_ms": current_ms,
            "end_ms": current_ms + s1_ms,
            "bars": verse_bars,
            "deck_architecture": {
                "deck_a": "Track A Hero Vocal",
                "deck_b": "Track B Groove Bassline"
            },
            "stem_levels_track_a": {"Vocals": 1.2, "Melody": 0.5, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.25, "Bass": 0.9, "Drums": 0.9}
        })
        current_ms += s1_ms

        s2_ms = grid.bars_to_ms(build_bars)
        extended_blocks.append({
            "stage_id": last_stage_id + 2,
            "block_name": f"Stage {last_stage_id + 2}: Climax Buildup & Snare Roll",
            "start_ms": current_ms,
            "end_ms": current_ms + s2_ms,
            "bars": build_bars,
            "deck_architecture": {
                "deck_a": "Track A Vocal Pitch Riser",
                "deck_b": "Track B Snare Roll Build"
            },
            "pre_drop_silence_gap_ms": grid.bars_to_ms(1),
            "stem_levels_track_a": {"Vocals": 1.25, "Melody": 0.25, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 0.0, "Drums": 1.0}
        })
        current_ms += s2_ms

        s3_ms = grid.bars_to_ms(drop_bars)
        extended_blocks.append({
            "stage_id": last_stage_id + 3,
            "block_name": f"Stage {last_stage_id + 3}: Mega Dual Drop Climax",
            "start_ms": current_ms,
            "end_ms": current_ms + s3_ms,
            "bars": drop_bars,
            "deck_architecture": {
                "deck_a": "Track A Peak Hero Lead Hook",
                "deck_b": "Track B Mega Sub-Bass & 4/4 Punch"
            },
            "stem_levels_track_a": {"Vocals": 1.35, "Melody": 0.45, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 1.0, "Drums": 1.0}
        })
        current_ms += s3_ms

        return {
            "mode": "INFINITE_EXTEND_CONTEXT_AWARE",
            "bpm": bpm,
            "extension_start_ms": start_ms,
            "total_new_duration_s": (current_ms / 1000.0),
            "all_blocks": prev_blocks + extended_blocks,
            "new_extension_blocks": extended_blocks
        }

    def generate_deep_reconstruction_arrangement(
        self,
        track_a_meta: Dict[str, Any],
        track_b_meta: Dict[str, Any],
        reference_meta: Optional[Dict[str, Any]] = None,
        duration_s: float = 60.0,
        bpm: float = 126.0,
        cut_to_the_chase: bool = False
    ) -> Dict[str, Any]:
        return self.generate_vocal_priority_arrangement(
            track_a_meta=track_a_meta,
            track_b_meta=track_b_meta,
            reference_meta=reference_meta,
            duration_s=duration_s,
            bpm=bpm,
            cut_to_the_chase=cut_to_the_chase
        )

    def generate_intelligent_arrangement(
        self,
        track_a_meta: Dict[str, Any],
        track_b_meta: Dict[str, Any],
        reference_meta: Optional[Dict[str, Any]] = None,
        duration_s: float = 60.0,
        bpm: float = 126.0,
        cut_to_the_chase: bool = False
    ) -> Dict[str, Any]:
        return self.generate_vocal_priority_arrangement(
            track_a_meta=track_a_meta,
            track_b_meta=track_b_meta,
            reference_meta=reference_meta,
            duration_s=duration_s,
            bpm=bpm,
            cut_to_the_chase=cut_to_the_chase
        )


llm_arranger = LLMArranger()
