"""Menü çalma listesi parçaları (tools/generate_menu_playlist_audio.py)."""

import math
import re
import sys
import wave
from array import array
from operator import mul, sub
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
AUDIO = ROOT / "client" / "assets" / "audio"
TRACKS = (
    "menu_v8_01_durgun_devre.wav",
    "menu_v8_02_akim_hatti.wav",
    "menu_v8_03_cekirdek_odasi.wav",
)
# Menü ↔ Hazırlık geçişi fazı 32 saniyelik ızgarada korur
# (GRIDSHARD_CONTINUOUS_LOOP_SECONDS).
GRID_SECONDS = 32
# Eski menü döngüsünün ortalama seviyesi; oyun bütün parçaları aynı kazançla çalar.
SHARED_RMS_DBFS = -22.6


def dbfs(value: float) -> float:
    return 20 * math.log10(value / 32_767)


def energy(samples) -> int:
    return sum(map(mul, samples, samples))


@pytest.mark.parametrize("filename", TRACKS)
def test_menu_playlist_track_is_a_long_stereo_loop_at_the_shared_level(filename):
    with wave.open(str(AUDIO / filename), "rb") as reader:
        assert reader.getnchannels() == 2
        assert reader.getsampwidth() == 2
        assert reader.getframerate() == 22_050
        seconds = reader.getnframes() / reader.getframerate()
        samples = array("h")
        samples.frombytes(reader.readframes(reader.getnframes()))
    if sys.byteorder == "big":
        samples.byteswap()

    assert seconds == 128.0
    assert seconds % GRID_SECONDS == 0

    peak = max(max(samples), -min(samples))
    assert dbfs(peak) <= -6.0  # GRIDSHARD_AUDIO_MIX.musicPeakDbfs
    rms = math.sqrt(energy(samples) / len(samples))
    assert abs(dbfs(rms) - SHARED_RMS_DBFS) <= 0.1

    # Döngü dikişi: son örnek ilk örneğe sıçramadan bağlanır.
    assert abs(samples[-2] - samples[0]) < 500
    assert abs(samples[-1] - samples[1]) < 500

    # Parça, dört kez yinelenen 32 saniyelik bir döngü değildir: hiçbir çeyreği
    # bir diğerinin tekrarı olamaz (aynıysa oran 0, ilgisizse 1 dolayındadır).
    quarter = len(samples) // 4
    quarters = [samples[index * quarter:(index + 1) * quarter:5] for index in range(4)]
    for first in range(4):
        for second in range(first + 1, 4):
            difference = array("i", map(sub, quarters[first], quarters[second]))
            ratio = energy(difference) / (energy(quarters[first]) + energy(quarters[second]))
            assert ratio > 0.5, (filename, first, second, ratio)


def test_menu_playlist_lists_exactly_the_generated_tracks():
    runtime = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(encoding="utf-8")
    playlist = re.search(
        r"const GRIDSHARD_MENU_PLAYLIST = Object\.freeze\(\[(.*?)\]\);", runtime, re.S
    ).group(1)
    assert tuple(re.findall(r'"\./assets/audio/([a-z0-9_]+\.wav)"', playlist)) == TRACKS

    generator = (ROOT / "tools" / "generate_menu_playlist_audio.py").read_text(encoding="utf-8")
    assert tuple(re.findall(r'"(menu_v8_[a-z0-9_]+\.wav)"', generator)) == TRACKS
