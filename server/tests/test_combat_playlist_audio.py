"""v9 delivered PCM contracts: synchronized music, safe summation and mono."""
from array import array
import hashlib
import math
from pathlib import Path
import sys
import wave

import pytest

ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "client/assets/audio"
LAYERS = ("sub", "pulse", "percussion", "ostinato", "shards", "dissonance", "pressure")
STEMS = tuple(f"battle_v9_{i:02d}_{name}.wav" for i, name in enumerate(LAYERS, 1))
MATCH = "matchmaking_v9_akis.wav"
GAINS = ((.41, .10), (.35, .14), (.31, .18), (.28, .20), (.18, .24), (.15, .27), (.07, .36))
RMS_DB = (-25, -27.5, -25, -28, -31, -31, -32, -22.6)


def samples(filename):
    with wave.open(str(AUDIO / filename), "rb") as reader:
        assert (reader.getnchannels(), reader.getsampwidth(), reader.getframerate()) == (2, 2, 22050)
        raw = array("h")
        raw.frombytes(reader.readframes(reader.getnframes()))
    if sys.byteorder == "big":
        raw.byteswap()
    return raw


@pytest.mark.parametrize("filename,duration,rms_db", list(zip((*STEMS, MATCH), (30,) * 7 + (32,), RMS_DB)))
def test_new_music_is_beat_aligned_seamless_stereo_with_headroom(filename, duration, rms_db):
    pcm = samples(filename)
    assert len(pcm) == 22050 * 2 * duration
    peak = max(max(pcm), -min(pcm)) / 32767
    rms = math.sqrt(sum(v * v for v in pcm) / len(pcm)) / 32767
    assert peak <= 10 ** ((-6 if filename == MATCH else -12) / 20)
    assert abs(20 * math.log10(rms) - rms_db) < .1
    for channel in (0, 1):
        values = pcm[channel::2]
        assert abs(values[-1] - values[0]) <= 2
        assert abs(sum(values) / len(values)) < 30
    mono_energy = sum(((a + b) / 2) ** 2 for a, b in zip(pcm[0::2], pcm[1::2]))
    stereo_energy = sum(v * v for v in pcm) / 2
    assert mono_energy / stereo_energy > .75, "No phase cancellation on a phone speaker"
    # Four-bar phrases have different orchestration; not one bar repeated.
    phrase = len(pcm) // 4
    sections = [pcm[i * phrase:(i + 1) * phrase].tobytes() for i in range(4)]
    assert len(set(sections)) >= 3


def test_battle_layers_sum_safely_at_full_volume_including_low_memory_mode():
    tracks = [samples(name) for name in STEMS]
    assert len({hashlib.sha256(t.tobytes()).hexdigest() for t in tracks}) == 7
    for low_memory in (False, True):
        mixed = array("f", bytes(4 * len(tracks[0])))
        for name, pcm, (base, pressure) in zip(LAYERS, tracks, GAINS):
            if low_memory and name not in ("sub", "pulse", "percussion", "pressure"):
                continue
            gain = .72 * 2.85 * (base + pressure) / 32767
            for i, value in enumerate(pcm):
                mixed[i] += value * gain
        assert max(max(mixed), -min(mixed)) < .70, "Headroom even before the runtime limiter"
    # Same sample rate and seven stems; shorter loops reduce, not grow, PCM.
    assert sum(len(t) for t in tracks) < 7 * 32 * 22050 * 2


def test_new_music_uses_menu_instruments_and_existing_dynamic_layer_contract():
    generator = (ROOT / "tools/generate_combat_playlist_audio.py").read_text(encoding="utf-8")
    runtime = (ROOT / "client/src/gridshard-audio.js").read_text(encoding="utf-8")
    assert "import menu_playlist_synth as synth" in generator
    for name in (*STEMS, MATCH):
        assert name in runtime
    for name in LAYERS:
        assert f'id:"{name}"' in runtime
    assert "source.loopEnd = this._buffer.duration" in runtime
    assert '"sub", "pulse", "percussion", "pressure"' in runtime
