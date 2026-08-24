from __future__ import annotations

import math
import wave
from array import array
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "client" / "assets" / "audio"
SAMPLE_RATE = 22_050
DURATION_SECONDS = 32.0
BPM = 128
TARGET = 0.245
BEAT_SECONDS = 60.0 / BPM
ROOTS = (38, 36, 34, 33)  # D, C, Bb, A — özgün GRIDSHARD gerilim döngüsü
NAMES = (
    "battle_tension_v7_01_sub.wav",
    "battle_tension_v7_02_pulse.wav",
    "battle_tension_v7_03_percussion.wav",
    "battle_tension_v7_04_ostinato.wav",
    "battle_tension_v7_05_shards.wav",
    "battle_tension_v7_06_dissonance.wav",
    "battle_tension_v7_07_pressure.wav",
)


def midi(note: int) -> float:
    return 440.0 * 2.0 ** ((note - 69) / 12.0)


def noise(frame: int, salt: int = 0) -> float:
    value = (frame * 1_103_515_245 + 12_345 + salt * 97_531) & 0x7FFFFFFF
    return value / 1_073_741_823.5 - 1.0


def edge(frame: int, count: int) -> float:
    width = int(SAMPLE_RATE * 0.035)
    if frame < width:
        return math.sin(frame / width * math.pi / 2) ** 2
    tail = count - frame - 1
    if tail < width:
        return math.sin(tail / width * math.pi / 2) ** 2
    return 1.0


def tone(frequency: float, t: float, harmonics: int = 1) -> float:
    return sum(
        math.sin(2 * math.pi * frequency * harmonic * t) / harmonic**1.35
        for harmonic in range(1, harmonics + 1)
    )


def stem_sample(stem: int, frame: int, t: float) -> tuple[float, float]:
    beat = t / BEAT_SECONDS
    beat_index = int(beat)
    beat_phase = beat - beat_index
    eighth = beat * 2
    eighth_index = int(eighth)
    eighth_phase = eighth - eighth_index
    sixteenth = beat * 4
    sixteenth_index = int(sixteenth)
    sixteenth_phase = sixteenth - sixteenth_index
    root = ROOTS[(beat_index // 8) % len(ROOTS)]
    left = right = 0.0

    if stem == 0:  # sub: nabız gibi duran düşük frekans omurgası
        envelope = .48 + .52 * math.exp(-4.8 * beat_phase)
        value = tone(midi(root), t, 2) * envelope * .58
        left, right = value * .98, value * 1.02
    elif stem == 1:  # pulse: kapılı reaktör darbesi
        gate = math.exp(-7.5 * sixteenth_phase)
        accent = 1.0 if sixteenth_index % 4 in (0, 3) else .58
        value = tone(midi(root + 12), t, 4) * gate * accent * .34
        pan = .13 * math.sin(2 * math.pi * t / (BEAT_SECONDS * 8))
        left, right = value * (1 - pan), value * (1 + pan)
    elif stem == 2:  # percussion: kick, metal snare ve sekizlik sayaç
        age = beat_phase * BEAT_SECONDS
        kick = math.sin(2 * math.pi * (48 + 62 * math.exp(-18 * age)) * age)
        kick *= math.exp(-15 * age) * .72
        snare = 0.0
        if beat_index % 4 in (1, 3):
            snare = noise(frame, 3) * math.exp(-17 * beat_phase) * .32
        hat = noise(frame, 7) * math.exp(-38 * eighth_phase) * (.13 if eighth_index % 2 else .19)
        left = kick + snare * .82 + hat * 1.08
        right = kick + snare * 1.08 + hat * .82
    elif stem == 3:  # ostinato: minör onaltılık motor
        pattern = (0, 7, 3, 10, 0, 7, 12, 10)
        note = root + 24 + pattern[sixteenth_index % len(pattern)]
        envelope = math.exp(-9.5 * sixteenth_phase)
        value = tone(midi(note), t, 3) * envelope * .31
        if sixteenth_index % 2:
            left, right = value * .72, value
        else:
            left, right = value, value * .72
    elif stem == 4:  # shards: üst frekansta cam kırığı benzeri karşı ritim
        pattern = (15, 12, 19, 10, 22, 15, 17, 12)
        note = root + 24 + pattern[eighth_index % len(pattern)]
        envelope = math.exp(-12 * eighth_phase)
        base = midi(note)
        value = (
            math.sin(2 * math.pi * base * t)
            + .34 * math.sin(2 * math.pi * base * 2.006 * t + .4)
        ) * envelope * .29
        pan = .46 if eighth_index % 2 else -.46
        left, right = value * (1 - pan), value * (1 + pan)
    elif stem == 5:  # dissonance: minör ikili ve tritonlu uzun gerilim yatağı
        swell = .68 + .32 * math.sin(2 * math.pi * t / 8 - math.pi / 2)
        frequencies = (midi(root + 12), midi(root + 13), midi(root + 18))
        value = sum(
            math.sin(2 * math.pi * frequency * t + index * .47)
            for index, frequency in enumerate(frequencies)
        ) * swell * .18
        drift = .12 * math.sin(2 * math.pi * t / 13)
        left, right = value * (1 - drift), value * (1 + drift)
    else:  # pressure: miks tarafından tehdit yükseldikçe açılan siren/kalp katmanı
        cycle = (t % 8.0) / 8.0
        siren_frequency = midi(root + 18) * (1 + .055 * cycle)
        siren = tone(siren_frequency, t, 2) * (cycle**1.7) * .23
        heartbeat = 0.0
        if beat_index % 4 in (0, 1):
            heartbeat = math.sin(2 * math.pi * 72 * t) * math.exp(-13 * beat_phase) * .42
        metallic = noise(frame, 19) * math.exp(-28 * sixteenth_phase) * .05
        left = siren * .88 + heartbeat + metallic
        right = siren * 1.12 + heartbeat + metallic * .74

    return left, right


def render(stem: int) -> array:
    count = int(SAMPLE_RATE * DURATION_SECONDS)
    pcm = array("h")
    for frame in range(count):
        t = frame / SAMPLE_RATE
        left, right = stem_sample(stem, frame, t)
        window = edge(frame, count)
        pcm.append(max(-32767, min(32767, round(left * TARGET * window * 32767))))
        pcm.append(max(-32767, min(32767, round(right * TARGET * window * 32767))))
    return pcm


def main() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    for stem, name in enumerate(NAMES):
        path = AUDIO_DIR / name
        with wave.open(str(path), "wb") as writer:
            writer.setnchannels(2)
            writer.setsampwidth(2)
            writer.setframerate(SAMPLE_RATE)
            writer.writeframes(render(stem).tobytes())
        print(f"[GRIDSHARD] Beta.31 savaş katmanı üretildi: {name}")


if __name__ == "__main__":
    main()
