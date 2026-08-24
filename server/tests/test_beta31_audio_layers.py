from pathlib import Path
import hashlib
import math
import struct
import wave


ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "client" / "assets" / "audio"
STEMS = tuple(
    f"battle_tension_v7_{index:02d}_{name}.wav"
    for index, name in enumerate(
        ("sub", "pulse", "percussion", "ostinato", "shards", "dissonance", "pressure"),
        start=1,
    )
)


def test_beta31_has_seven_unique_synchronized_battle_stems_with_headroom():
    hashes = set()
    for name in STEMS:
        path = AUDIO / name
        assert path.exists(), name
        hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())
        with wave.open(str(path), "rb") as reader:
            assert reader.getnchannels() == 2
            assert reader.getsampwidth() == 2
            assert reader.getframerate() == 22_050
            assert reader.getnframes() / reader.getframerate() == 32.0
            raw = reader.readframes(reader.getnframes())
        values = struct.unpack("<" + "h" * (len(raw) // 2), raw)
        peak = max(abs(value) for value in values)
        peak_dbfs = 20 * math.log10(peak / 32767)
        assert -21.0 <= peak_dbfs <= -10.0, (name, peak_dbfs)
        assert peak > 0

    assert len(hashes) == 7


def test_beta31_runtime_starts_and_pressure_mixes_all_seven_stems():
    source = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(
        encoding="utf-8"
    )
    assert 'version:"shardglass-seven-layer-v7"' in source
    assert "GRIDSHARD_BATTLE_LAYERS.length" in source
    assert "_applyBattleLayerMix" in source
    assert "_transitionToBattleLayers" in source
    for name in STEMS:
        assert name in source
