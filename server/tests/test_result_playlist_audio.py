"""Finite menu-family result cues must ship as healthy, current mobile assets."""
import hashlib
import json
from pathlib import Path
import struct
import wave

import pytest

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "client/assets/audio"


@pytest.mark.parametrize("name,seconds", [("victory_v9_devre", 10), ("defeat_v9_devre", 6)])
def test_result_audio_duration_level_tail_and_mobile_sources(name, seconds):
    source = AUDIO / f"{name}.wav"
    with wave.open(str(source), "rb") as reader:
        assert reader.getnchannels() == 2
        assert reader.getsampwidth() == 2
        assert reader.getframerate() == 22050
        assert reader.getnframes() == seconds * 22050
        samples = [sample[0] for sample in struct.iter_unpack("<h", reader.readframes(reader.getnframes()))]
    assert samples[:2] == samples[-2:] == [0, 0]
    assert 4000 < max(abs(sample) for sample in samples) < 30000
    manifest = json.loads((AUDIO / "mobile/manifest.json").read_text(encoding="utf8"))
    assert manifest["sources"][name]["sha256"] == hashlib.sha256(source.read_bytes()).hexdigest()
    for extension in ("ogg", "m4a"):
        assert (AUDIO / f"mobile/{name}.{extension}").stat().st_size > 1000
    assert f"./assets/audio/{name}.wav" in (ROOT / "client/src/gridshard-audio.js").read_text(encoding="utf8")
