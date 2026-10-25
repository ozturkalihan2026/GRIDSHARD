"""Register imagegen wreck sprites to existing core canvases; no art repainting."""
from pathlib import Path
import argparse
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IDS = ("resonance", "guardian", "overdrive", "disruptor", "capacitor", "phoenix", "quantum")


def prepare(source: Path, destination: Path):
    destination.mkdir(parents=True, exist_ok=True)
    records = []
    for suffix in IDS:
        name = "core_" + suffix
        intact = Image.open(ROOT / "client/assets/ui/cores-physical-v1" / (name + ".webp")).convert("RGBA")
        wreck = Image.open(source / (name + ".png")).convert("RGBA")
        alpha = wreck.getchannel("A")
        if alpha.getextrema() != (0, 255):
            raise ValueError(f"{name}: genuine transparent sprite required")
        bounds = intact.getchannel("A").point(lambda a: 255 if a > 16 else 0).getbbox()
        crop = alpha.point(lambda a: 255 if a > 16 else 0).getbbox()
        if not bounds or not crop:
            raise ValueError(f"{name}: empty sprite")
        art = wreck.crop(crop)
        scale = min((bounds[2] - bounds[0]) / art.width, .88 * (bounds[3] - bounds[1]) / art.height)
        size = (round(art.width * scale), round(art.height * scale))
        art = art.resize(size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", intact.size, (0, 0, 0, 0))
        xy = (round((bounds[0] + bounds[2] - size[0]) / 2), bounds[3] - size[1])
        canvas.alpha_composite(art, xy)
        output = destination / (name + ".webp")
        canvas.save(output, "WEBP", quality=88, method=6)
        records.append({"id": name, "canvas": intact.size, "painted_size": size, "baseline": bounds[3], "bytes": output.stat().st_size})
    return records


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "artifacts/core-wrecks-20261023/source")
    parser.add_argument("--destination", type=Path, default=ROOT / "client/assets/ui/cores-wrecked-v1")
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.destination), indent=2))
