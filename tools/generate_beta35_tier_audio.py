from __future__ import annotations

import math
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client" / "assets" / "audio" / "tier_up.wav"
SAMPLE_RATE = 44_100
DURATION_SECONDS = 1.45


def envelope(time_s: float, start: float, duration: float) -> float:
    local = time_s - start
    if local < 0 or local >= duration:
        return 0.0
    attack = min(1.0, local / 0.025)
    release = min(1.0, (duration - local) / 0.24)
    return attack * release


def synth_sample(time_s: float, pan: float) -> float:
    value = 0.0
    notes = (
        (0.00, 523.25, 0.54, 0.22),
        (0.15, 659.25, 0.58, 0.20),
        (0.31, 783.99, 0.62, 0.21),
        (0.49, 1046.50, 0.78, 0.25),
        (0.60, 1318.51, 0.72, 0.16),
    )
    for index, (start, frequency, duration, gain) in enumerate(notes):
        env = envelope(time_s, start, duration)
        phase = 2 * math.pi * frequency * max(0.0, time_s - start)
        shimmer = math.sin(phase) + 0.34 * math.sin(phase * 2.01)
        stereo = 1.0 + pan * (0.07 if index % 2 else -0.07)
        value += shimmer * env * gain * stereo

    seal_env = envelope(time_s, 0.52, 0.88)
    value += math.sin(2 * math.pi * 261.63 * time_s) * seal_env * 0.13
    value += math.sin(2 * math.pi * 1567.98 * time_s) * seal_env * 0.045
    return max(-0.70, min(0.70, value))


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frame_count = round(SAMPLE_RATE * DURATION_SECONDS)
    with wave.open(str(OUTPUT), "wb") as writer:
        writer.setnchannels(2)
        writer.setsampwidth(2)
        writer.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for index in range(frame_count):
            time_s = index / SAMPLE_RATE
            left = int(synth_sample(time_s, -1.0) * 32767)
            right = int(synth_sample(time_s, 1.0) * 32767)
            frames.extend(struct.pack("<hh", left, right))
        writer.writeframes(frames)


if __name__ == "__main__":
    main()
