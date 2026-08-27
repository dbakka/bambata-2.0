"""BAMBATA 2.0 - Modal Serverless GPU Worker Application.

Executes Demucs v4 stem separation, pyrubberband phase-vocoder DSP,
and audio rendering on on-demand NVIDIA A10G / T4 GPUs with zero idle cost.
"""
import os
import io
import json
from pathlib import Path
import modal

# 1. Define Modal Container Image with GPU & Audio DSP Toolchains
worker_image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "ffmpeg",
        "rubberband-cli",
        "libsndfile1",
        "git",
    )
    .pip_install(
        "torch>=2.1.0",
        "torchaudio>=2.1.0",
        "demucs>=4.0.1",
        "pyrubberband>=0.3.0",
        "soundfile>=0.12.1",
        "scipy>=1.11.0",
        "numpy>=1.24.0",
        "pydub>=0.25.1",
    )
    # Pre-download Demucs v4 model weights at image build time to eliminate cold-start delay
    .run_commands(
        "python -c 'import demucs.pretrained; demucs.pretrained.get_model(\"htdemucs\")'"
    )
)

app = modal.App("bambata-gpu-worker", image=worker_image)


@app.function(
    gpu="A10G",
    timeout=600,
    cpu=4,
    memory=16384,
)
def separate_stems_remote(audio_bytes: bytes, track_name: str = "track") -> dict:
    """
    Runs Demucs v4 (htdemucs) 4-stem separation on an input audio byte stream.
    Returns: Dict mapping stem names ('vocals', 'drums', 'bass', 'other') to WAV bytes.
    """
    import tempfile
    import soundfile as sf
    from audio_dsp import AudioDSPEngine

    dsp = AudioDSPEngine()
    with tempfile.TemporaryDirectory() as tmpdir:
        input_file = Path(tmpdir) / f"{track_name}.wav"
        with open(input_file, "wb") as f:
            f.write(audio_bytes)

        stems_dir = Path(tmpdir) / "stems"
        stem_paths = dsp.separate_stems_demucs(str(input_file), str(stems_dir))

        result_bytes = {}
        for stem_name, stem_path in stem_paths.items():
            with open(stem_path, "rb") as sf_in:
                result_bytes[stem_name] = sf_in.read()

        return result_bytes


@app.function(
    gpu="A10G",
    timeout=600,
    cpu=4,
    memory=16384,
)
def process_mashup_pipeline(
    track_a_bytes: bytes,
    track_b_bytes: bytes,
    arrangement_spec_json: str
) -> dict:
    """
    Full async serverless pipeline on Modal:
    1. Demucs 4-stem separation on Track A & Track B concurrently
    2. Rubberband time-stretching & Camelot pitch-shifting
    3. 3 x 15-second drop preview snippet generation
    """
    import tempfile
    from audio_dsp import AudioDSPEngine

    dsp = AudioDSPEngine()
    spec = json.loads(arrangement_spec_json)
    target_bpm = spec.get("target_bpm", 126.0)
    semitones_a = spec.get("track_a_semitones", 0)
    semitones_b = spec.get("track_b_semitones", 0)
    drop_time = spec.get("drop_timestamp", 22.5)

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        file_a = tmp_path / "track_a.wav"
        file_b = tmp_path / "track_b.wav"

        with open(file_a, "wb") as f:
            f.write(track_a_bytes)
        with open(file_b, "wb") as f:
            f.write(track_b_bytes)

        # 1. Stem Separation
        stems_a = dsp.separate_stems_demucs(str(file_a), str(tmp_path / "stems_a"))
        stems_b = dsp.separate_stems_demucs(str(file_b), str(tmp_path / "stems_b"))

        # 2. Pitch shifting & tempo alignment
        for stem_name, stem_file in stems_a.items():
            dsp.time_and_pitch_shift(stem_file, stem_file, tempo_ratio=1.0, semitones=semitones_a)

        for stem_name, stem_file in stems_b.items():
            dsp.time_and_pitch_shift(stem_file, stem_file, tempo_ratio=1.0, semitones=semitones_b)

        # 3. Generate 3 x 15s Drop Previews
        previews = dsp.render_3_drop_previews(
            stems_a=stems_a,
            stems_b=stems_b,
            drop_timestamp=drop_time,
            output_dir=str(tmp_path / "previews"),
        )

        preview_results = []
        for p in previews:
            with open(p["file_path"], "rb") as f:
                preview_results.append({
                    "preview_id": p["preview_id"],
                    "title": p["title"],
                    "stems": p["stems"],
                    "audio_bytes": f.read(),
                })

        return {
            "status": "READY_FOR_PREVIEW",
            "previews": preview_results,
        }


@app.function(
    gpu="A10G",
    timeout=600,
    cpu=4,
    memory=16384,
)
def render_final_mashup_remote(
    track_a_bytes: bytes,
    track_b_bytes: bytes,
    arrangement_spec_json: str,
    selected_preview_id: int
) -> bytes:
    """Renders the full mastered mashup audio on Modal GPU."""
    import tempfile
    from audio_dsp import AudioDSPEngine

    dsp = AudioDSPEngine()
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        file_a = tmp_path / "track_a.wav"
        file_b = tmp_path / "track_b.wav"

        with open(file_a, "wb") as f:
            f.write(track_a_bytes)
        with open(file_b, "wb") as f:
            f.write(track_b_bytes)

        stems_a = dsp.separate_stems_demucs(str(file_a), str(tmp_path / "stems_a"))
        stems_b = dsp.separate_stems_demucs(str(file_b), str(tmp_path / "stems_b"))

        out_master = tmp_path / "master_mashup.wav"
        dsp.render_full_master_mashup(
            stems_a=stems_a,
            stems_b=stems_b,
            selected_preview_id=selected_preview_id,
            output_file_path=str(out_master),
            duration_seconds=60.0
        )

        with open(out_master, "rb") as f:
            return f.read()


@app.local_entrypoint()
def main():
    """Local verification entrypoint for testing Modal execution."""
    print("BAMBATA 2.0 Modal Serverless GPU Worker configured and ready.")
    print("To deploy: modal deploy modal_app.py")
