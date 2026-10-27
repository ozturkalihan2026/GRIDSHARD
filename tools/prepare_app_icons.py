"""Export the approved store artwork to web and native icon sizes, without redrawing it."""
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "client/assets/branding/gridshard-app-icon-source.png"
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


def export_icons(root=ROOT):
    source = Image.open(SOURCE).convert("RGB")
    if source.width != source.height:
        raise ValueError("The approved app icon must be square")
    branding = root / "client/assets/branding"
    branding.mkdir(parents=True, exist_ok=True)

    def sized(size):
        return source.resize((size, size), Image.Resampling.LANCZOS)

    for size in (512, 1024):
        sized(size).save(branding / f"gridshard-store-icon-{size}.png")
    for size in (32, 192):
        sized(size).save(branding / f"gridshard-favicon-{size}.png")
    sized(256).save(root / "client/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # The complete approved painting fits within the adaptive icon's central
    # 72dp layer. Its reactor stays inside Android's 66dp safe circle.
    background_color = source.getpixel((0, 0))
    for density, factor in DENSITIES.items():
        target = root / "native-assets/android/res" / f"mipmap-{density}"
        target.mkdir(parents=True, exist_ok=True)
        legacy_size, adaptive_size = round(48 * factor), round(108 * factor)
        legacy = sized(legacy_size).convert("RGBA")
        legacy.save(target / "ic_launcher.png")
        mask = Image.new("L", legacy.size)
        ImageDraw.Draw(mask).ellipse((0, 0, legacy_size - 1, legacy_size - 1), fill=255)
        legacy.putalpha(mask)
        legacy.save(target / "ic_launcher_round.png")
        Image.new("RGB", (adaptive_size, adaptive_size), background_color).save(target / "ic_launcher_background.png")
        foreground = Image.new("RGBA", (adaptive_size, adaptive_size))
        artwork_size = round(72 * factor)
        offset = (adaptive_size - artwork_size) // 2
        artwork = sized(artwork_size)
        foreground.paste(artwork, (offset, offset))
        foreground.save(target / "ic_launcher_foreground.png")
        # Themed icon uses the reactor's bright painted surfaces, not the old
        # crystal emblem or the opaque square's alpha channel.
        mono_mask = artwork.convert("L").point(lambda value: 255 if value >= 135 else 0)
        mono = Image.new("RGBA", foreground.size)
        mark = Image.new("RGBA", artwork.size, "white")
        mark.putalpha(mono_mask)
        mono.alpha_composite(mark, (offset, offset))
        mono.save(target / "ic_launcher_monochrome.png")

        splash_target = root / "native-assets/android/res" / f"drawable-{density}"
        splash_target.mkdir(parents=True, exist_ok=True)
        splash_size, mark_size = round(288 * factor), round(192 * factor)
        splash = Image.new("RGBA", (splash_size, splash_size))
        splash.paste(sized(mark_size), ((splash_size-mark_size)//2, (splash_size-mark_size)//2))
        splash.save(splash_target / "gridshard_splash_icon.png")

    ios = root / "native-assets/ios"
    ios.mkdir(parents=True, exist_ok=True)
    sized(1024).save(ios / "AppIcon-512@2x.png")


if __name__ == "__main__":
    export_icons()
