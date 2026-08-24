import math
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "client" / "assets" / "audio"


def test_beta28_menu_ensemble_is_long_stereo_loop_with_headroom():
    for filename in ("menu_ensemble_v6.wav", "pool_ensemble_v6.wav"):
        path = AUDIO / filename
        assert path.exists()
        with wave.open(str(path), "rb") as reader:
            assert reader.getnchannels() == 2
            assert reader.getsampwidth() == 2
            assert reader.getframerate() == 22_050
            assert reader.getnframes() / reader.getframerate() == 32.0
            raw = reader.readframes(reader.getnframes())

        samples = struct.unpack("<" + "h" * (len(raw) // 2), raw)
        peak = max(abs(value) for value in samples)
        peak_dbfs = 20 * math.log10(peak / 32_767)
        assert -6.1 <= peak_dbfs <= -5.9
        assert abs(samples[-2] - samples[0]) < 500
        assert abs(samples[-1] - samples[1]) < 500


def test_beta28_generator_contains_a_real_multi_instrument_arrangement():
    source = (ROOT / "tools" / "generate_beta28_menu_audio.py").read_text(
        encoding="utf-8"
    )
    for layer in (
        "chord_pad",
        "bass",
        "reactor_kick",
        "clap",
        "hi_hat",
        "glass_arpeggio",
        "synth_lead",
    ):
        assert layer in source
