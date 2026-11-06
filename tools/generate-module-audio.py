"""Original, deterministic, short and softly band-limited module signatures."""
import json
import struct
import subprocess
import wave
import argparse
from pathlib import Path
from combat_sfx_synth import module_sound

ROOT = Path(__file__).resolve().parents[1]
RATE = 22050
profiles = json.loads(subprocess.check_output(
    ["node", "-e", "console.log(JSON.stringify(require('./client/src/battle/module-presentation-profiles.js')))"],
    cwd=ROOT, text=True))
out = ROOT / "client/assets/audio/modules"
out.mkdir(parents=True, exist_ok=True)
parser=argparse.ArgumentParser();parser.add_argument('--only',nargs='*');args=parser.parse_args()
generated=0
for name, p in profiles.items():
    if args.only and name not in args.only:continue
    samples = module_sound(name, p["seconds"])
    with wave.open(str(out / (name + ".wav")), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(b"".join(struct.pack("<h", round(s * 32767)) for s in samples))
    generated+=1
print(f"{generated} original mono cues generated.")
