from __future__ import annotations

import math
import wave
from array import array
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "client" / "assets" / "audio"
SAMPLE_RATE = 44_100
TARGET_PEAK = 10 ** (-3 / 20)

SPECS = {
    "laser_fire.wav": (0.52, "laser"),
    "pulse_cannon_fire.wav": (0.72, "pulse"),
    "railgun_fire.wav": (0.62, "railgun"),
    "missile_fire.wav": (0.82, "missile"),
    "drone_fire.wav": (0.70, "drone"),
    "arc_cannon_fire.wav": (0.56, "arc"),
}


def deterministic_noise(sample_index: int, salt: float = 0.0) -> float:
    value = math.sin(sample_index * 12.9898 + 78.233 + salt) * 43_758.5453
    return (value - math.floor(value)) * 2 - 1


def strike(t: float, at: float, decay: float) -> float:
    age = t - at
    return math.exp(-decay * age) if age >= 0 else 0.0


def edge_window(t: float, duration: float) -> float:
    fade_in = min(1.0, t / 0.008)
    fade_out = min(1.0, max(0.0, (duration - t) / 0.045))
    return fade_in * fade_out


def laser(t: float, frame: int) -> float:
    charge = min(1.0, t / 0.15)
    charge_tone = math.sin(2 * math.pi * (720 + 1_650 * charge) * t)
    discharge = strike(t, 0.15, 11.5)
    electric = (
        math.sin(2 * math.pi * 2_850 * t)
        + 0.45 * math.sin(2 * math.pi * 5_740 * t + 0.4)
        + 0.20 * deterministic_noise(frame, 2.0)
    )
    return charge_tone * charge * (1 - charge) * 0.55 + electric * discharge


def pulse(t: float, frame: int) -> float:
    pressure = math.sin(2 * math.pi * 112 * t) * math.exp(-2.8 * t)
    first = strike(t, 0.12, 13.0)
    second = strike(t, 0.29, 9.5)
    body = (
        math.sin(2 * math.pi * 76 * t)
        + 0.52 * math.sin(2 * math.pi * 152 * t)
        + 0.16 * deterministic_noise(frame, 5.0)
    )
    return pressure * 0.35 + body * (first + 0.72 * second)


def railgun(t: float, frame: int) -> float:
    charge_age = min(t, 0.22)
    charge_frequency = 360 + 7_800 * (charge_age / 0.22) ** 2
    charge = (
        math.sin(2 * math.pi * charge_frequency * t)
        * min(1.0, t / 0.04)
        * max(0.0, 1 - t / 0.24)
    )
    crack = strike(t, 0.22, 19.0)
    metallic = (
        deterministic_noise(frame, 11.0) * 0.72
        + math.sin(2 * math.pi * 3_600 * t)
        + 0.38 * math.sin(2 * math.pi * 7_240 * t)
    )
    tail = math.sin(2 * math.pi * 94 * t) * strike(t, 0.225, 6.8)
    return charge * 0.52 + metallic * crack + tail * 0.55


def missile(t: float, frame: int) -> float:
    ignition = strike(t, 0.055, 34.0)
    engine_age = max(0.0, t - 0.10)
    engine = 0.0
    if t >= 0.10:
        flutter = 0.72 + 0.28 * math.sin(2 * math.pi * 24 * engine_age)
        engine = (
            deterministic_noise(frame, 17.0) * 0.52
            + math.sin(2 * math.pi * (138 - 54 * min(1.0, engine_age)) * t)
        ) * math.exp(-2.7 * engine_age) * flutter
    click = (
        math.sin(2 * math.pi * 1_450 * t)
        + deterministic_noise(frame, 19.0) * 0.25
    ) * ignition
    return click * 0.65 + engine


def drone(t: float, frame: int) -> float:
    servo = math.sin(2 * math.pi * 410 * t) * math.exp(-3.3 * t) * 0.22
    salvo = 0.0
    for index, at in enumerate((0.09, 0.25, 0.41)):
        hit = strike(t, at, 22.0)
        salvo += hit * (
            math.sin(2 * math.pi * (1_180 + index * 230) * t)
            + 0.34 * deterministic_noise(frame, 23.0 + index)
        )
    return servo + salvo * 0.72


def arc(t: float, frame: int) -> float:
    charge = math.sin(2 * math.pi * (530 + 2_900 * min(1.0, t / 0.13)) * t)
    charge *= min(1.0, t / 0.025) * max(0.0, 1 - t / 0.15)
    discharge = strike(t, 0.13, 12.5)
    jitter = 2_150 + 790 * math.sin(2 * math.pi * 37 * t)
    crackle = (
        math.sin(2 * math.pi * jitter * t)
        + 0.58 * math.sin(2 * math.pi * jitter * 1.97 * t + 0.6)
        + 0.42 * deterministic_noise(frame, 31.0)
    )
    return charge * 0.46 + crackle * discharge


SYNTHS = {
    "laser": laser,
    "pulse": pulse,
    "railgun": railgun,
    "missile": missile,
    "drone": drone,
    "arc": arc,
}


def synthesize(duration: float, identity: str) -> array:
    frame_count = int(duration * SAMPLE_RATE)
    synth = SYNTHS[identity]
    samples = array("f")
    for frame in range(frame_count):
        t = frame / SAMPLE_RATE
        samples.append(synth(t, frame) * edge_window(t, duration))
    return samples


def write_normalized(path: Path, samples: array) -> None:
    peak = max(abs(value) for value in samples) or 1.0
    scale = TARGET_PEAK / peak
    pcm = array(
        "h",
        (
            max(-32_767, min(32_767, round(value * scale * 32_767)))
            for value in samples
        ),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as writer:
        writer.setnchannels(1)
        writer.setsampwidth(2)
        writer.setframerate(SAMPLE_RATE)
        writer.writeframes(pcm.tobytes())


def main() -> None:
    for filename, (duration, identity) in SPECS.items():
        write_normalized(
            AUDIO_DIR / filename,
            synthesize(duration, identity),
        )
        print(f"[GRIDSHARD Beta.27] üretildi: {filename} · {identity}")


if __name__ == "__main__":
    main()
