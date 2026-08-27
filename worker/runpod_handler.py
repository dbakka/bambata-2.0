"""BAMBATA 2.0 - RunPod Serverless GPU Handler."""
import base64
import json
import logging
import os
import tempfile
from pathlib import Path

import runpod
from audio_dsp import AudioDSPEngine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bambata.runpod")
dsp = AudioDSPEngine()


def handler(job):
    """
    RunPod Serverless event handler.
    Input job structure:
    {
      "input": {
        "action": "separate_stems" | "process_mashup_pipeline" | "render_final_master",
        "track_a_base64": "...",
        "track_b_base64": "...",
        "arrangement_spec": {...},
        "selected_preview_id": 1
      }
    }
    """
    job_input = job.get("input", {})
    action = job_input.get("action", "process_mashup_pipeline")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_path = Path(tmpdir)

            if action == "separate_stems":
                track_b64 = job_input.get("audio_base64")
                if not track_b64:
                    return {"error": "Missing audio_base64 in input"}

                audio_data = base64.b64decode(track_b64)
                input_file = tmp_path / "input.wav"
                with open(input_file, "wb") as f:
                    f.write(audio_data)

                stems_dir = tmp_path / "stems"
                stem_paths = dsp.separate_stems_demucs(str(input_file), str(stems_dir))

                result = {}
                for name, path in stem_paths.items():
                    with open(path, "rb") as sf_in:
                        result[name] = base64.b64encode(sf_in.read()).decode("utf-8")

                return {"status": "SUCCESS", "stems": result}

            elif action == "process_mashup_pipeline":
                track_a_b64 = job_input.get("track_a_base64")
                track_b_b64 = job_input.get("track_b_base64")
                spec = job_input.get("arrangement_spec", {})
                drop_time = spec.get("drop_timestamp", 22.5)

                file_a = tmp_path / "track_a.wav"
                file_b = tmp_path / "track_b.wav"

                with open(file_a, "wb") as f:
                    f.write(base64.b64decode(track_a_b64))
                with open(file_b, "wb") as f:
                    f.write(base64.b64decode(track_b_b64))

                stems_a = dsp.separate_stems_demucs(str(file_a), str(tmp_path / "stems_a"))
                stems_b = dsp.separate_stems_demucs(str(file_b), str(tmp_path / "stems_b"))

                # Previews
                previews = dsp.render_3_drop_previews(
                    stems_a=stems_a,
                    stems_b=stems_b,
                    drop_timestamp=drop_time,
                    output_dir=str(tmp_path / "previews")
                )

                encoded_previews = []
                for p in previews:
                    with open(p["file_path"], "rb") as f:
                        encoded_previews.append({
                            "preview_id": p["preview_id"],
                            "title": p["title"],
                            "stems": p["stems"],
                            "audio_base64": base64.b64encode(f.read()).decode("utf-8")
                        })

                return {"status": "READY_FOR_PREVIEW", "previews": encoded_previews}

            elif action == "render_final_master":
                track_a_b64 = job_input.get("track_a_base64")
                track_b_b64 = job_input.get("track_b_base64")
                selected_id = job_input.get("selected_preview_id", 1)

                file_a = tmp_path / "track_a.wav"
                file_b = tmp_path / "track_b.wav"

                with open(file_a, "wb") as f:
                    f.write(base64.b64decode(track_a_b64))
                with open(file_b, "wb") as f:
                    f.write(base64.b64decode(track_b_b64))

                stems_a = dsp.separate_stems_demucs(str(file_a), str(tmp_path / "stems_a"))
                stems_b = dsp.separate_stems_demucs(str(file_b), str(tmp_path / "stems_b"))

                out_master = tmp_path / "master.wav"
                dsp.render_full_master_mashup(
                    stems_a=stems_a,
                    stems_b=stems_b,
                    selected_preview_id=selected_id,
                    output_file_path=str(out_master)
                )

                with open(out_master, "rb") as f:
                    return {
                        "status": "COMPLETED",
                        "master_audio_base64": base64.b64encode(f.read()).decode("utf-8")
                    }

            else:
                return {"error": f"Unknown action '{action}'"}

    except Exception as e:
        logger.error(f"Error in runpod handler: {e}", exc_info=True)
        return {"error": str(e)}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
