"""BAMBATA 2.0 - Vocal Profiler, Characteristic Classifier & VAD Silent Window Extractor.

Features:
1. Vocal Profile Classifier (Sustained Lead vs Rhythmic Chant vs Atmospheric).
2. Voice Activity Detection (VAD) using librosa.effects.split(top_db=30):
   - Computes `silent_windows` (start & end times in ms) where Track A's vocal is silent.
   - Passes silent windows to LLM Arranger to insert chopped call-and-response phrases from Track B.
"""
import logging
from typing import Dict, Any, Tuple, List
import numpy as np
import soundfile as sf

logger = logging.getLogger("bambata.vocal_profiler")


class VocalProfiler:
    """Classifies vocal stems and calculates Voice Activity Detection (VAD) silent windows."""

    def extract_vocal_silent_windows(
        self,
        vocal_audio: np.ndarray,
        sample_rate: int = 44100,
        top_db: float = 30.0,
        min_silence_duration_ms: float = 300.0
    ) -> List[Dict[str, float]]:
        """
        Runs Voice Activity Detection (VAD) to find silent intervals in the vocal stem.
        Returns a list of silent windows: [{'start_ms': 1200.0, 'end_ms': 3400.0, 'duration_ms': 2200.0}, ...]
        """
        if len(vocal_audio) == 0:
            return []

        mono = vocal_audio.mean(axis=1) if vocal_audio.ndim > 1 else vocal_audio
        total_duration_ms = (len(mono) / sample_rate) * 1000.0

        try:
            import librosa
            # Non-silent intervals
            non_silent_intervals = librosa.effects.split(mono, top_db=top_db, frame_length=2048, hop_length=512)

            silent_windows = []
            prev_end_sample = 0

            for start_sample, end_sample in non_silent_intervals:
                if start_sample > prev_end_sample:
                    silence_dur_ms = ((start_sample - prev_end_sample) / sample_rate) * 1000.0
                    if silence_dur_ms >= min_silence_duration_ms:
                        silent_windows.append({
                            "start_ms": round((prev_end_sample / sample_rate) * 1000.0, 1),
                            "end_ms": round((start_sample / sample_rate) * 1000.0, 1),
                            "duration_ms": round(silence_dur_ms, 1)
                        })
                prev_end_sample = end_sample

            # Tail silence
            if prev_end_sample < len(mono):
                tail_dur_ms = ((len(mono) - prev_end_sample) / sample_rate) * 1000.0
                if tail_dur_ms >= min_silence_duration_ms:
                    silent_windows.append({
                        "start_ms": round((prev_end_sample / sample_rate) * 1000.0, 1),
                        "end_ms": round(total_duration_ms, 1),
                        "duration_ms": round(tail_dur_ms, 1)
                    })

            return silent_windows

        except Exception as e:
            logger.warning(f"VAD split fallback: {e}")
            # Fallback estimation using RMS threshold
            frame_len = int(0.05 * sample_rate)
            num_frames = len(mono) // frame_len
            silence_windows = []
            in_silence = False
            start_f = 0

            for f in range(num_frames):
                chunk = mono[f * frame_len : (f + 1) * frame_len]
                rms = np.sqrt(np.mean(chunk ** 2))
                is_silent = rms < 0.02

                if is_silent and not in_silence:
                    in_silence = True
                    start_f = f
                elif not is_silent and in_silence:
                    in_silence = False
                    dur_ms = (f - start_f) * 50.0
                    if dur_ms >= min_silence_duration_ms:
                        silence_windows.append({
                            "start_ms": round(start_f * 50.0, 1),
                            "end_ms": round(f * 50.0, 1),
                            "duration_ms": round(dur_ms, 1)
                        })

            return silence_windows

    def analyze_vocal_stem(self, vocal_audio: np.ndarray, sample_rate: int = 44100) -> Dict[str, Any]:
        """
        Analyzes vocal audio data and returns vocal profile metadata + silent windows.
        """
        if len(vocal_audio) == 0:
            return {
                "profile": "Atmospheric",
                "transient_density": 0.0,
                "pitch_variance": 0.0,
                "energy_rms": 0.0,
                "silent_windows": [],
                "description": "Silent or Ambient Vocal Bed"
            }

        mono = vocal_audio.mean(axis=1) if vocal_audio.ndim > 1 else vocal_audio
        duration_s = len(mono) / sample_rate
        rms = float(np.sqrt(np.mean(mono ** 2)))

        try:
            import librosa

            onset_frames = librosa.onset.onset_detect(
                y=mono,
                sr=sample_rate,
                hop_length=512,
                backtrack=False
            )
            num_onsets = len(onset_frames)
            transient_density = float(num_onsets / max(0.1, duration_s))

            pitches, magnitudes = librosa.piptrack(y=mono, sr=sample_rate, hop_length=1024, threshold=0.1)
            valid_pitches = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if 80 < pitch < 1200:
                    valid_pitches.append(pitch)

            pitch_variance = float(np.std(valid_pitches)) if len(valid_pitches) > 10 else 10.0

        except Exception as e:
            logger.warning(f"librosa vocal profiling fallback: {e}")
            zcr = np.mean(np.abs(np.diff(np.signbit(mono))))
            transient_density = float(zcr * 20.0)
            pitch_variance = 25.0

        # Classification
        if rms < 0.05 or (transient_density < 1.0 and pitch_variance < 20.0):
            profile = "Atmospheric"
            desc = "Ambient background vocal bed, low transient density, high spatial texture"
        elif transient_density >= 2.2 and pitch_variance < 35.0:
            profile = "Rhythmic Chant"
            desc = "Percussive, punchy vocal chants and chop hooks with high transient repetition"
        else:
            profile = "Sustained Lead"
            desc = "Melodic lead singing with expressive pitch contour and sustained phrasing"

        # Extract VAD silent gaps
        silent_windows = self.extract_vocal_silent_windows(mono, sample_rate)

        return {
            "profile": profile,
            "transient_density": round(transient_density, 2),
            "pitch_variance": round(pitch_variance, 2),
            "energy_rms": round(rms, 4),
            "silent_windows": silent_windows,
            "description": desc
        }

    def analyze_vocal_file(self, file_path: str) -> Dict[str, Any]:
        try:
            audio, sr = sf.read(file_path, dtype='float32')
            return self.analyze_vocal_stem(audio, sr)
        except Exception as e:
            logger.error(f"Failed to profile vocal file {file_path}: {e}")
            return {
                "profile": "Sustained Lead",
                "transient_density": 1.8,
                "pitch_variance": 40.0,
                "energy_rms": 0.25,
                "silent_windows": [],
                "description": "Default Lead Vocal Profile"
            }


vocal_profiler = VocalProfiler()
