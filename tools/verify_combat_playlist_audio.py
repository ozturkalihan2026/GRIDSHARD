"""Offline codec/loudness QA for the v9 music; never starts the game."""
from __future__ import annotations

import argparse
from array import array
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import shutil
import subprocess
import sys

from audio_lufs_scan import scan_asset

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "client/assets/audio"
NAMES = tuple(f"battle_v9_{i:02d}_{name}" for i, name in enumerate(
    ("sub", "pulse", "percussion", "ostinato", "shards", "dissonance", "pressure"), 1
)) + ("matchmaking_v9_akis",)


def inspect_asset(name: str, extension: str, ffmpeg: str, ffprobe: str) -> dict:
    path = AUDIO / (f"{name}.wav" if extension == "wav" else f"mobile/{name}.{extension}")
    duration = 32 if name.startswith("matchmaking") else 30
    info = subprocess.run([ffprobe, "-v", "error", "-show_entries",
                           "stream=duration,sample_rate,channels", "-of", "json", str(path)],
                          capture_output=True, check=True, timeout=30)
    stream = json.loads(info.stdout)["streams"][0]
    decoded = subprocess.run([ffmpeg, "-v", "error", "-i", str(path), "-map", "0:a:0",
                              "-f", "s16le", "-acodec", "pcm_s16le", "-"],
                             capture_output=True, check=True, timeout=30)
    samples = array("h")
    samples.frombytes(decoded.stdout)
    if sys.byteorder == "big":
        samples.byteswap()
    frames = len(samples) // 2
    assert int(stream["sample_rate"]) == 22050 and stream["channels"] == 2
    assert abs(float(stream["duration"]) - duration) < .001
    # AAC may decode one padded packet beyond the MP4 duration. All stems
    # must have the same length within a codec; Web Audio uses decoded duration.
    assert abs(frames - duration * 22050) <= 1024
    peak = max(max(samples), -min(samples))
    assert peak < 32767, f"Clipping: {path.name}"
    result = scan_asset(ffmpeg, path)
    assert result["ok"], path.name
    result.update({"format": extension, "decoded_frames": frames, "duration": float(stream["duration"]),
                   "bytes": path.stat().st_size, "pcm_peak": peak})
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise SystemExit("ffmpeg / ffprobe required for codec QA")
    jobs = [(name, ext, ffmpeg, ffprobe) for name in NAMES for ext in ("wav", "ogg", "m4a")]
    with ThreadPoolExecutor(max_workers=2) as pool:
        rows = list(pool.map(lambda args: inspect_asset(*args), jobs))
    for extension in ("wav", "ogg", "m4a"):
        counts = {row["decoded_frames"] for row in rows if row["format"] == extension and row["asset"].startswith("battle")}
        assert len(counts) == 1, f"Stem phase drift: {extension}"
    report = {"status": "PASS", "count": len(rows), "assets": rows,
              "note": "Offline ffmpeg QA; subjective listening and device/browser playback remain user checks."}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "assets": len(rows), "report": str(args.report)}))


if __name__ == "__main__":
    main()
