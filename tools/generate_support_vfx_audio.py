"""Short original support sounds. No music/weapon masters are modified."""
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RATE = 22050


def render(kind, duration):
    rng = random.Random(14017)
    result = []
    filtered = 0.0
    for i in range(round(RATE * duration)):
        t = i / RATE
        envelope = min(1.0, t / 0.02) * min(1.0, (duration - t) / 0.08)
        if kind == "cooling_air":
            filtered += (rng.uniform(-1.0, 1.0) - filtered) * 0.22
            # Broadband airflow plus a quiet fan motor/blade cadence, not a chime.
            blades = 0.8 + 0.2 * math.sin(2 * math.pi * 42 * t)
            value = filtered * 0.8 * blades + math.sin(2 * math.pi * 115 * t) * 0.055
        else:
            phase = 2 * math.pi * (520 * t + 180 * t * t)
            value = (math.sin(phase) * 0.19 + math.sin(phase * 2.01) * 0.055) * (0.8 + 0.2 * math.sin(t * 2 * math.pi * 24))
        result.append(max(-0.5, min(0.5, value * envelope)))
    return result


if __name__ == "__main__":
    for name, seconds in [("cooling_air", 0.46), ("repair_beam", 0.42)]:
        output = ROOT / "client" / "assets" / "audio" / (name + ".wav")
        with wave.open(str(output), "wb") as audio:
            audio.setnchannels(1)
            audio.setsampwidth(2)
            audio.setframerate(RATE)
            audio.writeframes(b"".join(struct.pack("<h", round(sample * 32767)) for sample in render(name, seconds)))
        print(f"{name}: {output.stat().st_size} bytes")
