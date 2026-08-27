"""Verification script for BAMBATA 2.0 DSP Audio Pipeline."""
import os
import tempfile
from pathlib import Path
import numpy as np
import soundfile as sf

from audio_dsp import AudioDSPEngine


def create_mock_track(filename: str, duration: float = 30.0, freq: float = 440.0, sample_rate: int = 44100):
    """Generates a synthetic stereo WAV track for pipeline validation."""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    # Beat rhythmic modulation
    beat = np.abs(np.sin(np.pi * 2.1 * t)) ** 4
    audio = 0.5 * np.sin(2 * np.pi * freq * t) * (0.3 + 0.7 * beat)
    stereo = np.column_stack((audio, audio)).astype(np.float32)
    sf.write(filename, stereo, sample_rate)
    return filename


def test_dsp_pipeline():
    print("=== Testing BAMBATA 2.0 Audio DSP Engine ===")
    dsp = AudioDSPEngine(sample_rate=44100)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        track_a_path = str(tmp / "track_a.wav")
        track_b_path = str(tmp / "track_b.wav")

        create_mock_track(track_a_path, duration=30.0, freq=330.0)
        create_mock_track(track_b_path, duration=30.0, freq=220.0)

        print("[1/4] Testing stem separation (filterbank / Demucs fallback)...")
        stems_a = dsp.separate_stems_demucs(track_a_path, str(tmp / "stems_a"))
        stems_b = dsp.separate_stems_demucs(track_b_path, str(tmp / "stems_b"))
        assert "vocals" in stems_a and "drums" in stems_a
        assert "bass" in stems_b and "drums" in stems_b
        print("  -> Stem separation successful!")

        print("[2/4] Testing pitch shift & time stretch...")
        shifted_file = str(tmp / "shifted.wav")
        dsp.time_and_pitch_shift(stems_a["vocals"], shifted_file, tempo_ratio=1.05, semitones=2)
        assert Path(shifted_file).exists()
        print("  -> Pitch/time modification successful!")

        print("[3/4] Testing 3 x 15s Drop Preview rendering...")
        previews = dsp.render_3_drop_previews(
            stems_a=stems_a,
            stems_b=stems_b,
            drop_timestamp=15.0,
            output_dir=str(tmp / "previews")
        )
        assert len(previews) == 3
        for p in previews:
            assert Path(p["file_path"]).exists()
            assert sf.info(p["file_path"]).duration >= 14.9
        print("  -> 3 Preview drop snippets generated successfully!")

        print("[4/4] Testing master mashup mixdown & limiter...")
        master_out = str(tmp / "master_mashup.wav")
        dsp.render_full_master_mashup(
            stems_a=stems_a,
            stems_b=stems_b,
            selected_preview_id=1,
            output_file_path=master_out,
            duration_seconds=30.0
        )
        assert Path(master_out).exists()
        info = sf.info(master_out)
        print(f"  -> Master render output: duration={info.duration:.1f}s, channels={info.channels}, samplerate={info.samplerate}Hz")
        print("=== ALL DSP TESTS PASSED! ===")


if __name__ == "__main__":
    test_dsp_pipeline()
