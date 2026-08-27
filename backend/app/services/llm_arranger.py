"""BAMBATA 2.0 - Zero-Reference Generative Arranger with Surgical Hero Vocal Isolation.

SURGICAL VOCAL ISOLATION & ANTI-CLASH DIRECTIVES:
1. Default Deck Architecture: Deck A is the sole "Hero Vocal & Harmonic Source". Deck B is the pure "Groove & Sub-Bass Anchor".
2. Absolute Zero-Tolerance for Vocal Overlap: If Track A's Hero Vocal is active in an arrangement block, Track B's vocal stem must be permanently deleted (volume set to 0.0). No exceptions.
3. Instrumental Anti-Clash Pocket: Track B provides the rhythmic instrumental backing, with 1.5kHz mid-range notch carving applied whenever Deck A's vocal is singing.
"""
import json
import logging
from typing import Dict, Any, List, Optional
from app.services.phrase_aligner import PhraseGrid
from app.services.harmonic_math import calculate_optimal_pivot_key
from app.services.cleanup_dsp import score_arrangement_blocks_with_feedback

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
        Generates arrangements enforcing:
        - Sole Hero Vocal (Deck A)
        - Absolute zero vocal overlap (Deck B Vocals = 0.0 when Deck A sings)
        - Dynamic 1.5kHz instrumental notch on Deck B melody
        """
        grid = PhraseGrid(bpm=bpm)
        key_a = track_a_meta.get("key", "8A")
        key_b = track_b_meta.get("key", "10A")
        pivot_data = calculate_optimal_pivot_key(key_a, key_b)

        prof_a = track_a_meta.get("vocal_profile", "Sustained Lead")
        prof_b = track_b_meta.get("vocal_profile", "Rhythmic Chant")
        silent_windows_a = track_a_meta.get("silent_windows", [])

        # 1. "CUT TO THE CHASE" MACRO EXECUTION
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
                "block_name": "Stage 1: Rapid 4-Bar Pre-Drop Tension",
                "start_ms": current_ms,
                "end_ms": current_ms + s1_ms,
                "bars": build_bars,
                "deck_architecture": {
                    "deck_a_role": "Hero Vocal Source (Track A Lead Riser)",
                    "deck_b_role": "Groove & Rhythm Source (Track B Snare Roll)"
                },
                "anti_clash_dsp": {
                    "hero_vocal_gating": "NoiseGate(-35dB, ratio=4.0, release=150ms)",
                    "track_b_melody_notch": "PeakFilter(1500Hz, Q=2.0, -6.0dB)",
                    "vocal_overlap_permitted": False
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
                "block_name": "Stage 2: Instant Peak Drop",
                "start_ms": current_ms,
                "end_ms": current_ms + s2_ms,
                "bars": drop_bars,
                "deck_architecture": {
                    "deck_a_role": "Track A Sole Hero Vocal & Melodic Hooks",
                    "deck_b_role": "Track B Pure Instrumental Groove (4/4 Kick & Sub-Bass)"
                },
                "anti_clash_dsp": {
                    "hero_vocal_gating": "NoiseGate(-35dB, ratio=4.0, release=150ms)",
                    "track_b_melody_notch": "PeakFilter(1500Hz, Q=2.0, -6.0dB)",
                    "vocal_overlap_permitted": False
                },
                "stem_levels_track_a": {"Vocals": 1.3, "Melody": 0.45, "Bass": 0.0, "Drums": 0.0},
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
                "mode": "SURGICAL_ANTI_CLASH_CUT_TO_THE_CHASE",
                "bpm": bpm,
                "cut_to_the_chase": True,
                "anti_clash_pipeline": {
                    "sole_hero_vocal_deck": "Deck A",
                    "noise_gating": "NoiseGate(threshold=-35dB, release=150ms)",
                    "mid_range_notch": "PeakFilter(1500Hz, Q=2.0, gain=-6.0dB)",
                    "zero_vocal_overlap": True
                },
                "pivot_key_data": pivot_data,
                "total_duration_s": round((current_ms + s3_ms) / 1000.0, 1),
                "arrangement_blocks": blocks
            }

        # 2. STANDARD 5-STAGE RECORD
        if duration_s <= 30.0:
            intro_bars, verse_bars, build_bars, drop_bars, outro_bars = 2, 4, 4, 8, 2
        elif duration_s <= 60.0:
            intro_bars, verse_bars, build_bars, drop_bars, outro_bars = 4, 8, 4, 12, 4
        elif duration_s <= 120.0:
            intro_bars, verse_bars, build_bars, drop_bars, outro_bars = 8, 16, 8, 24, 8
        else:
            intro_bars, verse_bars, build_bars, drop_bars, outro_bars = 16, 32, 8, 32, 16

        current_ms = 0
        blocks = []

        # STAGE 1: INTRO GROOVE
        s1_ms = grid.bars_to_ms(intro_bars)
        blocks.append({
            "stage_id": 1,
            "block_name": "Stage 1: Intro Groove",
            "start_ms": current_ms,
            "end_ms": current_ms + s1_ms,
            "bars": intro_bars,
            "deck_architecture": {
                "deck_a": "Gated Hero Vocal Tease",
                "deck_b": "Filtered Drum Groove"
            },
            "anti_clash_dsp": {
                "hero_vocal_gating": "NoiseGate(-35dB, ratio=4.0, release=150ms)",
                "track_b_melody_notch": "PeakFilter(1500Hz, Q=2.0, -6.0dB)",
                "vocal_overlap_permitted": False
            },
            "stem_levels_track_a": {"Vocals": 0.85, "Melody": 0.4, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 0.0, "Drums": 0.75}
        })
        current_ms += s1_ms

        # STAGE 2: MAIN VERSE
        s2_ms = grid.bars_to_ms(verse_bars)
        blocks.append({
            "stage_id": 2,
            "block_name": "Stage 2: Main Verse",
            "start_ms": current_ms,
            "end_ms": current_ms + s2_ms,
            "bars": verse_bars,
            "deck_architecture": {
                "deck_a": "Sole Hero Storytelling Vocal (Hero Mid/High)",
                "deck_b": "Driving Bassline & Solid Kick/Snare (Hero Low End)"
            },
            "anti_clash_dsp": {
                "hero_vocal_gating": "NoiseGate(-35dB, ratio=4.0, release=150ms)",
                "track_b_melody_notch": "PeakFilter(1500Hz, Q=2.0, -6.0dB)",
                "vocal_overlap_permitted": False
            },
            "stem_levels_track_a": {"Vocals": 1.25, "Melody": 0.55, "Bass": 0.0, "Drums": 0.0},
            "stem_levels_track_b": {"Vocals": 0.0, "Melody": 0.2, "Bass": 0.85, "Drums": 0.95}
        })
        current_ms += s2_ms

        # STAGE 3: BUILDUP & TENSION
        s3_ms = grid.bars_to_ms(build_bars)
        blocks.append({
            "stage_id": 3,
            "block_name": "Stage 3: Buildup & Tension",
            "start_ms": current_ms,
            "end_ms": current_ms + s3_ms,
            "bars": build_bars,
            "deck_architecture": {
                "deck_a": "Rising Hero Vocal Riser",
                "deck_b": "Accelerating Snare Roll Riser"
            },
            "anti_clash_dsp": {
                "hero_vocal_gating": "NoiseGate(-35dB, ratio=4.0, release=150ms)",
                "track_b_melody_notch": "PeakFilter(1500Hz, Q=2.0, -6.0dB)",
                "vocal_overlap_permitted": False
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
            "block_name": "Stage 4: The Hybrid Drop",
            "start_ms": current_ms,
            "end_ms": current_ms + s4_ms,
            "bars": drop_bars,
            "deck_architecture": {
                "deck_a": "Track A Sole Hero Anthem Vocals (Dominant High/Mid)",
                "deck_b": "Track B Heavy Sub-Bass & 4/4 Punchy Drums (Dominant Low End)"
            },
            "anti_clash_dsp": {
                "hero_vocal_gating": "NoiseGate(-35dB, ratio=4.0, release=150ms)",
                "track_b_melody_notch": "PeakFilter(1500Hz, Q=2.0, -6.0dB)",
                "vocal_overlap_permitted": False
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
            "mode": "SURGICAL_ANTI_CLASH_ARCHITECTURE",
            "bpm": bpm,
            "anti_clash_pipeline": {
                "sole_hero_vocal_deck": "Deck A",
                "noise_gating": "NoiseGate(threshold=-35dB, release=150ms)",
                "mid_range_notch": "PeakFilter(1500Hz, Q=2.0, gain=-6.0dB)",
                "zero_vocal_overlap": True
            },
            "default_deck_architecture": {
                "deck_a": "Track A (Left Deck) -> Sole Hero Vocal & Harmonic Source",
                "deck_b": "Track B (Right Deck) -> Pure Groove & Sub-Bass Anchor"
            },
            "pivot_key_data": pivot_data,
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
                lb["Vocals"] = 0.0  # Enforce zero secondary vocal

                block_res["stem_levels_track_a"] = la
                block_res["stem_levels_track_b"] = lb
                block_res["mutation_applied"] = "Transition Entrance Repaired (Filter Sweep + Rebalanced Entry Levels)"

            elif status == "MUTATE":
                la = dict(blk.get("stem_levels_track_a", {}))
                lb = dict(blk.get("stem_levels_track_b", {}))

                # Swap dominant melodic lead while maintaining zero vocal clash
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
