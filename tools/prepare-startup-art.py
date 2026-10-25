"""Technical WebP export of approved imagegen artwork; never repaints assets."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts/startup-circuit-20261023/source"
TARGET = ROOT / "client/assets/branding/startup-circuit-v1"


def main():
    TARGET.mkdir(parents=True, exist_ok=True)
    for source, name, size in [("circuit-scene.png", "circuit-scene.webp", (1024, 1536)),
                               ("reactor-logo.png", "reactor-logo.webp", (384, 384))]:
        target = TARGET / name
        with Image.open(SOURCE / source) as image:
            image = image.convert("RGBA" if name.startswith("reactor") else "RGB")
            image.thumbnail(size, Image.Resampling.LANCZOS)
            image.save(target, "WEBP", quality=88, method=6)
            print(name, image.size, target.stat().st_size)


if __name__ == "__main__":
    main()
