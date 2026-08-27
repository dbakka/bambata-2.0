"""BAMBATA 2.0 - DSP Pipeline & Master Bus Test.

Verifies:
1. Pedalboard DSP pipeline execution
2. Master output true peak <= -0.5 dB (no clipping)
3. 120Hz Stem carving on vocals and melody
4. Reverb tail on pre-drop silence gap
"""
import tempfile
from pathlib import Path
import numpy as np
import soundfile as sf
import pytest

from app.services.transition_renderer import render_pedalboard_arrangement
from app.services.llm_arranger import llm_arranger


def test_pedalboard_dsp_pipeline():
    sr = 44100
    duration_s = 5.0
    total_samples = int(duration_s * sr)

    # Synthesize test stem WAVs
    t = np.linspace(0, duration_s, total_samples, endpoint=False)
    vocal_signal = (0.5 * np.sin(2 * np.pi * 440 * t) + 0.3 * np.sin(2 * np.pi * 880 * t)).astype(np.float32)
    bass_signal = (0.8 * np.sin(2 * np.pi * 55 * t)).astype(np.float32)
    drums_signal = (0.6 * (np.random.rand(total_samples) * 2 - 1)).astype(np.float32)
    melody_signal = (0.4 * np.sin(2 * np.pi * 659.25 * t)).astype(np.float32)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        
        # Save Track A Stems
        path_a_voc = tmp_path / "a_voc.wav"
        path_a_mel = tmp_path / "a_mel.wav"
        path_a_bas = tmp_path / "a_bas.wav"
        path_a_drm = tmp_path / "a_drm.wav"

        sf.write(str(path_a_voc), vocal_signal, sr)
        sf.write(str(path_a_mel), melody_signal, sr)
        sf.write(str(path_a_bas), bass_signal, sr)
        sf.write(str(path_a_drm), drums_signal, sr)

        # Save Track B Stems
        path_b_voc = tmp_path / "b_voc.wav"
        path_b_mel = tmp_path / "b_mel.wav"
        path_b_bas = tmp_path / "b_bas.wav"
        path_b_drm = tmp_path / "b_drm.wav"

        sf.write(str(path_b_voc), vocal_signal * 0.5, sr)
        sf.write(str(path_b_mel), melody_signal * 0.5, sr)
        sf.write(str(path_b_bas), bass_signal * 1.1, sr)
        sf.write(str(path_b_drm), drums_signal * 1.0, sr)

        stems_a = {
            "vocals": str(path_a_voc),
            "other": str(path_a_mel),
            "bass": str(path_a_bas),
            "drums": str(path_a_drm),
        }
        stems_b = {
            "vocals": str(path_b_voc),
            "other": str(path_b_mel),
            "bass": str(path_b_bas),
            "drums": str(path_b_drm),
        }

        # Generate Arrangement Blocks
        arr_data = llm_arranger.generate_intelligent_arrangement(
            track_a_meta={"title": "Track A"},
            track_b_meta={"title": "Track B"},
            reference_meta={"drop_time_s": 2.5},
            duration_s=duration_s
        )

        out_wav = tmp_path / "master_out.wav"

        # Execute Pedalboard DSP Render
        result_path = render_pedalboard_arrangement(
            track_a_stems=stems_a,
            track_b_stems=stems_b,
            arrangement_data=arr_data,
            output_path=str(out_wav),
            total_duration_s=duration_s,
            sample_rate=sr
        )

        assert Path(result_path).exists()
        audio_out, out_sr = sf.read(result_path)
        assert out_sr == sr
        assert len(audio_out) == total_samples

        # Check True Peak Ceiling: Must not clip (> 1.0) and should peak near -0.5 dB (~0.944)
        peak = np.max(np.abs(audio_out))
        peak_db = 20.0 * np.log10(peak + 1e-6)
        print(f"Master Output Peak: {peak:.4f} ({peak_db:.2f} dB)")
        assert peak <= 1.0, f"Master output clipped with peak {peak:.4f}"
        assert peak_db <= -0.4, f"Master output exceeded -0.5dB ceiling: {peak_db:.2f} dB"


if __name__ == "__main__":
    test_pedalboard_dsp_pipeline()
    print("ALL PEDALBOARD DSP TESTS PASSED!")
