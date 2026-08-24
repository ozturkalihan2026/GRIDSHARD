from pathlib import Path
import math
import struct
import wave


ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "client" / "assets" / "audio"
TRACKS = (
    "battle_fracture_v5.wav",
    "critical_shard_v5.wav",
)


def test_shardglass_battle_tracks_are_original_long_stereo_loops():
    for name in TRACKS:
        path = AUDIO / name
        assert path.exists(), name
        with wave.open(str(path), "rb") as reader:
            assert reader.getnchannels() == 2
            assert reader.getsampwidth() == 2
            assert reader.getframerate() == 22_050
            duration = reader.getnframes() / reader.getframerate()
            assert duration == 32.0
            raw = reader.readframes(reader.getnframes())

        samples = struct.unpack("<" + "h" * (len(raw) // 2), raw)
        peak = max(abs(value) for value in samples)
        peak_dbfs = 20 * math.log10(peak / 32767)
        assert -6.1 <= peak_dbfs <= -5.9
        assert abs(samples[-2] - samples[0]) < 500
        assert abs(samples[-1] - samples[1]) < 500


def test_beta25_audio_runtime_uses_shardglass_mix():
    source = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(
        encoding="utf-8"
    )
    assert 'version:"shardglass-seven-layer-v7"' in source
    assert "GRIDSHARD_BATTLE_LAYERS" in source
    for name in (
        "menu_ensemble_v6.wav",
        "pool_ensemble_v6.wav",
        "battle_tension_v7_01_sub.wav",
        "battle_tension_v7_07_pressure.wav",
    ):
        assert name in source
