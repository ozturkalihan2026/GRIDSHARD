"""Original, deterministic, short and softly band-limited module signatures."""
import json
import math
import random
import struct
import subprocess
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RATE = 22050
profiles = json.loads(subprocess.check_output(
    ["node", "-e", "console.log(JSON.stringify(require('./client/src/battle/module-presentation-profiles.js')))"],
    cwd=ROOT, text=True))
out = ROOT / "client/assets/audio/modules"
out.mkdir(parents=True, exist_ok=True)
for index, (name, p) in enumerate(profiles.items()):
    rng = random.Random(191019 + index)
    duration, hz = p["seconds"], p["hz"]
    low = smooth = phase = 0.0
    samples = []
    for i in range(round(RATE * duration)):
        t = i / RATE
        progress = t / duration
        env = math.sin(math.pi * progress) ** 1.7
        low += (rng.uniform(-1, 1) - low) * .08
        smooth += (low - smooth) * .15
        phase += 2 * math.pi * hz * (1.20 - .52 * progress) / RATE
        body = math.sin(phase) * .14 + math.sin(phase * 1.5) * .025
        if p["shape"] == "mist":
            value = smooth * .65
        elif p["shape"] in ("rocket", "plasma", "orb", "quantum"):
            value = body * .6 + smooth * .8
        elif p["shape"] in ("drone", "swarm", "double", "packets"):
            value = (body * .55 + smooth * .30) * (.55 + .45 * math.cos(t * 2 * math.pi * (8 + index % 4)))
        elif p["shape"] in ("arc", "fracture", "waves", "vortex"):
            value = body * .45 + smooth * .45
        else:
            value = body * .6 + smooth * .12
        samples.append(max(-.22, min(.22, value * env)))
    with wave.open(str(out / (name + ".wav")), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(b"".join(struct.pack("<h", round(s * 32767)) for s in samples))
print(f"{len(profiles)} original mono cues generated.")
