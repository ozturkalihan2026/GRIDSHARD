import math
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
VICTORY = ROOT / "client" / "assets" / "audio" / "victory_sting.wav"


def test_victory_music_is_a_full_upbeat_stereo_celebration():
    with wave.open(str(VICTORY), "rb") as reader:
        assert reader.getnchannels() == 2
        assert reader.getframerate() == 44_100
        duration = reader.getnframes() / reader.getframerate()
        raw = reader.readframes(reader.getnframes())

    assert 9.5 <= duration <= 10.5
    values = struct.unpack("<" + "h" * (len(raw) // 2), raw)
    peak = max(abs(value) for value in values)
    peak_dbfs = 20 * math.log10(peak / 32_767)
    assert -6.2 <= peak_dbfs <= -5.8

    generator = (ROOT / "tools" / "generate_victory_audio.py").read_text(
        encoding="utf-8"
    )
    assert "BPM = 144" in generator
    assert "CHORDS" in generator
    assert "MELODY" in generator
