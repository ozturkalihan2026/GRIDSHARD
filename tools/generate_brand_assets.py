"""GRIDSHARD marka görselleri (görsel tur 6, 13 Ekim 2026).

Mağaza ikonu, web ikonları, yükleme ekranı amblemi ve yerel Android/iOS
ikon ve açılış görselleri tek kaynaktan, belirlenimci olarak üretilir:

    python tools/generate_brand_assets.py
    python tools/generate_brand_assets.py --preview <klasör>   # depoya dokunmadan dene

Görsel tamamen çizimle üretilir: yazı tipi, ağdan indirilen dosya ya da dış
görsel servisi kullanılmaz. Aynı Pillow sürümünde çıktı her çalıştırmada
aynıdır. Betik web ikonlarıyla birlikte ``native-assets/`` altında Android/iOS
kaynakları da üretir; mevcut native projelere otomatik kopyalama yapmaz.

Tasarım (motif Beta.72 tur 18 ile aynı): altın reaktör halkasının içinde ortadan
çatlayıp iki parçaya ayrılan camgöbeği kristal (GRID + SHARD); çatlaktan enerji
çıkar, yatay ana hat halkanın boşluklarından kristale güç taşır.

Çizim dili oyunun yeni görsel dilidir (sandıklar, kaynak simgeleri, modül ve
Çekirdek amblemleri): dolu gövde, aydınlık ve gölge yüz, koyu kontur, altta
kalınlık veren dudak. Işıma, bulanıklık ve parçacık yoktur; zemin desenli düz
renktir.
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BRANDING = ROOT / "client" / "assets" / "branding"
NATIVE = ROOT / "native-assets"

SEED = 72
WINDOW_BACKGROUND = (7, 20, 43)  # #07142B, capacitor.config.js ile aynı

# Oyunun kontur rengi (canon.css, --gs3-ink).
INK = (10, 16, 36)
# Zemin: ev ekranındaki desenli mavi (canon.css, #14427c -> #0a2452).
BACKGROUND_STOPS = [
    (0.00, (27, 84, 150)),
    (0.52, (16, 56, 112)),
    (1.00, (10, 36, 82)),
]
GOLD = {"light": (255, 232, 148), "main": (247, 186, 60), "dark": (206, 124, 26)}
STEEL = {"light": (222, 232, 248), "main": (159, 176, 207), "dark": (100, 118, 158)}
CONDUIT = {"light": (176, 248, 238), "main": (67, 207, 194), "dark": (22, 142, 136)}
CRYSTAL = {
    "top_left": (206, 250, 255),
    "top_right": (112, 228, 246),
    "bottom_left": (56, 188, 228),
    "bottom_right": (30, 138, 198),
    "table_light": (236, 254, 255),
    "table_dark": (150, 238, 250),
}
BOLT = {"light": (255, 255, 236), "main": (255, 240, 150)}

# Android yoğunlukları: dp → piksel çarpanı.
DENSITIES = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}


# --- Yardımcılar -------------------------------------------------------------

def ramp(stops):
    table = []
    for index in range(256):
        t = index / 255
        for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
            if t <= p1:
                k = 0.0 if p1 == p0 else (t - p0) / (p1 - p0)
                table.append(tuple(round(a + (b - a) * k) for a, b in zip(c0, c1)))
                break
        else:
            table.append(stops[-1][1])
    return table


def colorize(gray, stops):
    table = ramp(stops)
    return Image.merge("RGB", [gray.point([color[i] for color in table]) for i in range(3)])


def scaled(mask, factor):
    return mask.point(lambda v: min(255, round(v * factor)))


def light(size, color, alpha):
    layer = Image.new("RGBA", size, color + (0,))
    layer.putalpha(alpha)
    return layer


def over(base, top):
    return Image.alpha_composite(base, top)


def blank(size, value=0):
    return Image.new("L", size, value)


def polygon(size, points):
    mask = blank(size)
    ImageDraw.Draw(mask).polygon([tuple(p) for p in points], fill=255)
    return mask


def box(center, radius):
    return (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius)


def union(*masks):
    out = masks[0]
    for mask in masks[1:]:
        out = ImageChops.lighter(out, mask)
    return out


def grow(mask, radius):
    """Maskeyi her yöne yaklaşık `radius` piksel genişletir (yuvarlak köşeli kontur için)."""
    radius = max(1.0, radius)
    soft = mask.filter(ImageFilter.GaussianBlur(radius * 0.62))
    return soft.point(lambda v: 255 if v >= 26 else 0)


def bevel(mask, offset):
    """Düz pah: sol üst kenarda aydınlık, sağ alt kenarda gölge şerit."""
    offset = max(1, round(offset))
    lit = ImageChops.subtract(mask, ImageChops.offset(mask, offset, offset))
    shade = ImageChops.subtract(mask, ImageChops.offset(mask, -offset, -offset))
    return lit, shade


def sparkle(size, center, radius, thickness):
    mask = blank(size)
    draw = ImageDraw.Draw(mask)
    x, y = center
    draw.polygon([(x - radius, y), (x, y - thickness), (x + radius, y), (x, y + thickness)], fill=255)
    draw.polygon([(x, y - radius), (x + thickness, y), (x, y + radius), (x - thickness, y)], fill=255)
    return mask


def tapered(size, points, width):
    """Kırık çizgiyi iki ucu sivri, ortası kalın bir şimşek çokgenine çevirir."""
    left, right = [], []
    last = len(points) - 1
    for index, (x, y) in enumerate(points):
        ax, ay = points[max(0, index - 1)]
        bx, by = points[min(last, index + 1)]
        dx, dy = bx - ax, by - ay
        length = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / length, dx / length
        t = index / last
        half = width * (0.08 + 0.92 * math.sin(math.pi * t) ** 0.7) / 2
        left.append((x + nx * half, y + ny * half))
        right.append((x - nx * half, y - ny * half))
    return polygon(size, left + right[::-1])


def downsample(image, size):
    return image.resize((size, size), Image.LANCZOS)


# --- Zemin -------------------------------------------------------------------

def zigzag(size, period):
    """Oyunun zeminindeki baklava dilimli desen: yatay zikzak şeritler."""
    s = size[0]
    mask = blank(size)
    draw = ImageDraw.Draw(mask)
    half = period / 2
    band = period / 4
    columns = int(s / half) + 3
    y = -period
    while y < s + period:
        upper = [((i - 1) * half, y + (half if i % 2 else 0)) for i in range(columns)]
        lower = [(x, py + band) for x, py in reversed(upper)]
        draw.polygon(upper + lower, fill=255)
        y += period
    return mask


def render_background(s, ring_radius, *, traces=True, seed=SEED):
    """Desenli düz zemin; amblemin arkasında iki kademeli düz ışık dairesi ve ışınlar."""
    size = (s, s)
    center = (s / 2, s / 2)
    image = colorize(Image.linear_gradient("L").resize(size, Image.BICUBIC), BACKGROUND_STOPS).convert("RGBA")
    image = over(image, light(size, (255, 255, 255), scaled(zigzag(size, s / 8), 0.045)))
    if traces:
        rays = blank(size)
        draw = ImageDraw.Draw(rays)
        reach = s * 1.5
        for index in range(12):
            start = math.radians(index * 30 - 7.5)
            end = math.radians(index * 30 + 7.5)
            draw.polygon([
                center,
                (center[0] + math.cos(start) * reach, center[1] + math.sin(start) * reach),
                (center[0] + math.cos(end) * reach, center[1] + math.sin(end) * reach),
            ], fill=255)
        image = over(image, light(size, (126, 196, 255), scaled(rays, 0.07)))
    for radius, alpha in ((1.62, 0.16), (1.3, 0.2)):
        disc = blank(size)
        ImageDraw.Draw(disc).ellipse(box(center, ring_radius * radius), fill=255)
        image = over(image, light(size, (92, 170, 246), scaled(disc, alpha)))
    return image


# --- Amblem ------------------------------------------------------------------

CRACK = [
    (0.189, -0.663), (0.100, -0.430), (0.160, -0.300), (0.020, -0.080),
    (0.090, 0.030), (-0.070, 0.240), (-0.020, 0.330), (-0.212, 0.620),
]


def render_emblem(s, ring_radius, *, halo=1.0, particles=None, seed=SEED):
    """Şeffaf zeminde amblem: halka, kelepçeler, güç hattı, iki parçalı kristal ve çatlak.

    `halo` ve `particles` eski imzayla uyum içindir; yeni çizimde ışıma ve parçacık yoktur.
    """
    size = (s, s)
    cx, cy = s / 2, s / 2
    unit = ring_radius
    stroke = unit * 0.05          # kontur kalınlığı
    lip = round(unit * 0.075)     # alttaki dudak (kalınlık)
    edge = unit * 0.035           # pah şeridi

    def at(u, v):
        return (cx + u * unit, cy + v * unit)

    layers = []  # (maske, [(renk, maske), ...]) — çizim sırasıyla

    # Güç hattı: halkanın yan boşluklarından kristale girer.
    conduit = blank(size)
    draw = ImageDraw.Draw(conduit)
    for sign in (-1, 1):
        draw.rounded_rectangle(
            (*at(min(sign * 1.3, sign * 0.3), -0.06), *at(max(sign * 1.3, sign * 0.3), 0.06)),
            radius=round(unit * 0.05), fill=255,
        )
        draw.ellipse(box(at(sign * 1.3, 0), unit * 0.105), fill=255)
    conduit_lit, conduit_shade = bevel(conduit, edge * 0.7)
    ports = blank(size)
    draw = ImageDraw.Draw(ports)
    for sign in (-1, 1):
        draw.ellipse(box(at(sign * 1.3, 0), unit * 0.04), fill=255)
    layers.append((conduit, [
        (CONDUIT["main"], conduit), (CONDUIT["light"], conduit_lit),
        (CONDUIT["dark"], conduit_shade), (INK, ports),
    ]))

    # Altın reaktör halkası: iki yay, yanlarda ana hattın girdiği boşluklar.
    outer, inner = unit, unit * 0.79
    ring = blank(size)
    draw = ImageDraw.Draw(ring)
    draw.ellipse(box((cx, cy), outer), fill=255)
    draw.ellipse(box((cx, cy), inner), fill=0)
    for gap in (0, 180):
        draw.pieslice(box((cx, cy), outer + 4), gap - 12, gap + 12, fill=0)
    ring_lit, ring_shade = bevel(ring, edge)
    groove = blank(size)
    draw = ImageDraw.Draw(groove)
    groove_radius = (outer + inner) / 2
    for start, end in ((18, 162), (198, 342)):
        draw.arc(box((cx, cy), groove_radius), start, end, fill=255, width=max(2, round(unit * 0.022)))
    layers.append((ring, [
        (GOLD["main"], ring), (GOLD["light"], ring_lit), (GOLD["dark"], ring_shade),
        (GOLD["dark"], ImageChops.multiply(groove, ring)),
    ]))

    # Köşegen kelepçeler: çelik blok, ortasında perçin.
    clamps, rivets = blank(size), blank(size)
    draw_clamps, draw_rivets = ImageDraw.Draw(clamps), ImageDraw.Draw(rivets)
    for angle in (45, 135, 225, 315):
        rad = math.radians(angle)
        radial_dir = (math.cos(rad), math.sin(rad))
        tangent = (-radial_dir[1], radial_dir[0])
        mid = (outer + inner) / 2
        half_t, half_r = unit * 0.1, unit * 0.165
        corners = []
        for sr, st in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            corners.append((
                cx + radial_dir[0] * (mid + sr * half_r) + tangent[0] * st * half_t,
                cy + radial_dir[1] * (mid + sr * half_r) + tangent[1] * st * half_t,
            ))
        draw_clamps.polygon(corners, fill=255)
        draw_rivets.ellipse(box((cx + radial_dir[0] * mid, cy + radial_dir[1] * mid), unit * 0.042), fill=255)
    clamps_lit, clamps_shade = bevel(clamps, edge * 0.8)
    layers.append((clamps, [
        (STEEL["main"], clamps), (STEEL["light"], clamps_lit), (STEEL["dark"], clamps_shade),
        (INK, grow(rivets, stroke * 0.55)), (CONDUIT["main"], rivets),
    ]))

    # Çatlaktaki enerji: kristali boydan boya geçen açık sarı şimşek (parçaların üstünde çizilir).
    crack = [at(u, v) for u, v in CRACK]
    bolt = tapered(size, crack, unit * 0.135)
    bolt_core = tapered(size, crack, unit * 0.05)

    # Kristal: dört yüzlü baklava, ortasında tabla; çatlak boyunca iki parçaya ayrılır.
    top, bottom, left, right = at(0, -1.02), at(0, 1.02), at(-0.54, 0), at(0.54, 0)
    hub = at(0, 0)
    table = [at(0, -0.46), at(0.245, 0), at(0, 0.46), at(-0.245, 0)]
    gem = Image.new("RGBA", size, (0, 0, 0, 0))
    for color, points in (
        (CRYSTAL["top_left"], [top, left, hub]),
        (CRYSTAL["top_right"], [top, right, hub]),
        (CRYSTAL["bottom_left"], [left, bottom, hub]),
        (CRYSTAL["bottom_right"], [right, bottom, hub]),
        (CRYSTAL["table_dark"], table),
        (CRYSTAL["table_light"], [table[0], table[3], table[2]]),
    ):
        gem = over(gem, light(size, color, polygon(size, points)))
    crystal = polygon(size, [top, right, bottom, left])
    far_start = (crack[0][0] + (crack[0][0] - crack[1][0]) * 20, crack[0][1] + (crack[0][1] - crack[1][1]) * 20)
    far_end = (crack[-1][0] + (crack[-1][0] - crack[-2][0]) * 20, crack[-1][1] + (crack[-1][1] - crack[-2][1]) * 20)
    lower_side = polygon(size, [far_start, *crack, far_end, (s * 4, s * 4), (s * 4, -s * 3)])
    split = (round(unit * 0.03), round(unit * 0.016))
    pieces = []
    for side, shift in ((ImageChops.invert(lower_side), (-split[0], -split[1])), (lower_side, split)):
        mask = ImageChops.offset(ImageChops.multiply(crystal, side), *shift)
        art = ImageChops.offset(gem, *shift)
        art.putalpha(ImageChops.multiply(art.getchannel("A"), mask))
        pieces.append((mask, art))

    # Parıltılar: çatlağın üst ucunda ve halkanın sol üstünde.
    stars = union(
        sparkle(size, at(0.36, -0.86), unit * 0.2, unit * 0.045),
        sparkle(size, at(-0.72, -0.9), unit * 0.12, unit * 0.03),
    )

    image = Image.new("RGBA", size, (0, 0, 0, 0))
    silhouette = union(*(mask for mask, _ in layers), *(mask for mask, _ in pieces), bolt)
    body = grow(silhouette, stroke)
    # Dudak: gövdenin koyu kopyası aşağıda durur, nesneye kalınlık verir.
    image = over(image, light(size, INK, union(body, ImageChops.offset(body, 0, lip))))
    for mask, fills in layers:
        image = over(image, light(size, INK, grow(mask, stroke)))
        for color, fill in fills:
            image = over(image, light(size, color, fill))
    for mask, art in pieces:
        image = over(image, light(size, INK, grow(mask, stroke)))
        image = over(image, art)
    image = over(image, light(size, INK, grow(bolt, stroke * 0.8)))
    image = over(image, light(size, BOLT["main"], bolt))
    image = over(image, light(size, BOLT["light"], bolt_core))
    image = over(image, light(size, INK, grow(stars, stroke * 0.6)))
    image = over(image, light(size, (255, 255, 255), stars))
    return image


def emblem_silhouette(s, ring_radius):
    """Android 13 tema ikonu için tek renk siluet (halka, kristal, güç hattı)."""
    size = (s, s)
    cx, cy = s / 2, s / 2
    unit = ring_radius

    def at(u, v):
        return (cx + u * unit, cy + v * unit)

    mask = blank(size)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(box((cx, cy), unit), fill=255)
    draw.ellipse(box((cx, cy), unit * 0.86), fill=0)
    for gap in (0, 180):
        draw.pieslice(box((cx, cy), unit + 4), gap - 9, gap + 9, fill=0)
    for sign in (-1, 1):
        draw.line([at(sign * 1.02, 0), at(sign * 0.58, 0)], fill=255, width=max(3, round(unit * 0.07)))
    draw.polygon([at(0, -1.02), at(0.54, 0), at(0, 1.02), at(-0.54, 0)], fill=255)
    draw.line([at(u, v) for u, v in CRACK], fill=0, width=max(3, round(unit * 0.06)), joint="curve")
    return mask


# --- Çıktılar ----------------------------------------------------------------

def render_icon(s):
    ring = s * 0.3
    return over(render_background(s, ring), render_emblem(s, ring)).convert("RGB")


def rounded(image, radius_share, inset_share=0.0):
    s = image.size[0]
    mask = blank((s * 4, s * 4))
    inset = round(s * 4 * inset_share)
    ImageDraw.Draw(mask).rounded_rectangle(
        (inset, inset, s * 4 - inset - 1, s * 4 - inset - 1), radius=round(s * 4 * radius_share), fill=255
    )
    out = image.convert("RGBA")
    out.putalpha(mask.resize((s, s), Image.LANCZOS))
    return out


def circular(image):
    s = image.size[0]
    mask = blank((s * 4, s * 4))
    ImageDraw.Draw(mask).ellipse((0, 0, s * 4 - 1, s * 4 - 1), fill=255)
    out = image.convert("RGBA")
    out.putalpha(mask.resize((s, s), Image.LANCZOS))
    return out


def save_png(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def write_text(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    # İçerik aynıysa dosyaya dokunulmaz (yalnız satır sonu farkı değişiklik sayılmasın).
    if path.exists() and path.read_text(encoding="utf-8").split() == text.split():
        return
    path.write_text(text, encoding="utf-8", newline="\n")


ADAPTIVE_ICON = """<?xml version="1.0" encoding="utf-8"?>
<!-- GRIDSHARD marka görselleri (tools/generate_brand_assets.py). -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
"""

SPLASH_LAYER_LIST = """<?xml version="1.0" encoding="utf-8"?>
<!-- Android 12 öncesi açılış ekranı: koyu zemin, ortada amblem (bozulmadan).
     tools/generate_brand_assets.py üretir, configure-native-fullscreen.js kopyalar. -->
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/gridshard_window_background"/>
    <item>
        <bitmap android:gravity="center" android:src="@drawable/gridshard_splash_icon"/>
    </item>
</layer-list>
"""


def generate(root=ROOT):
    global BRANDING, NATIVE
    BRANDING = root / "client" / "assets" / "branding"
    NATIVE = root / "native-assets"
    # Mağaza ve web ikonları (2x çizilip küçültülür).
    icon = render_icon(2048)
    icon_1024 = downsample(icon, 1024)
    save_png(icon_1024, BRANDING / "gridshard-store-icon-1024.png")
    save_png(downsample(icon_1024, 512), BRANDING / "gridshard-store-icon-512.png")
    save_png(downsample(icon_1024, 192), BRANDING / "gridshard-favicon-192.png")
    small = downsample(icon_1024, 32).filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))
    save_png(small, BRANDING / "gridshard-favicon-32.png")
    (root / "client").mkdir(parents=True, exist_ok=True)
    downsample(icon_1024, 256).save(root / "client" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # Yükleme ekranı amblemi (şeffaf; halkalar CSS ile döner).
    emblem = render_emblem(1536, 1536 * 0.33)
    BRANDING.mkdir(parents=True, exist_ok=True)
    emblem.resize((768, 768), Image.LANCZOS).save(
        BRANDING / "gridshard-emblem.webp", format="WEBP", quality=92, method=6
    )

    # Android başlatıcı ikonları.
    android = NATIVE / "android" / "res"
    # Amblem 66 dp güvenli dairenin içinde (halka çapı ~60 dp).
    foreground = render_emblem(1728, 1728 * 0.25)
    background = render_background(1728, 1728 * 0.25).convert("RGB")
    monochrome = Image.new("RGBA", (1728, 1728), (255, 255, 255, 0))
    monochrome.putalpha(emblem_silhouette(1728, 1728 * 0.25))
    for density, factor in DENSITIES.items():
        folder = android / f"mipmap-{density}"
        legacy = downsample(icon_1024, round(48 * factor))
        save_png(rounded(legacy, 0.2, 0.04), folder / "ic_launcher.png")
        save_png(circular(legacy), folder / "ic_launcher_round.png")
        adaptive = round(108 * factor)
        save_png(downsample(foreground, adaptive), folder / "ic_launcher_foreground.png")
        save_png(downsample(background, adaptive), folder / "ic_launcher_background.png")
        save_png(downsample(monochrome, adaptive), folder / "ic_launcher_monochrome.png")
    write_text(android / "mipmap-anydpi-v26" / "ic_launcher.xml", ADAPTIVE_ICON)
    write_text(android / "mipmap-anydpi-v26" / "ic_launcher_round.xml", ADAPTIVE_ICON)

    # Android açılış amblemi: 288 dp tuval, amblem 192 dp dairenin içinde.
    splash_icon = render_emblem(2304, 2304 * 0.25)
    for density, factor in DENSITIES.items():
        save_png(downsample(splash_icon, round(288 * factor)), android / f"drawable-{density}" / "gridshard_splash_icon.png")
    write_text(android / "drawable" / "gridshard_splash.xml", SPLASH_LAYER_LIST)

    # iOS: uygulama ikonu (saydamlık yok) ve açılış görseli (ortası kırpılır).
    ios = NATIVE / "ios"
    save_png(icon_1024, ios / "AppIcon-512@2x.png")
    # Zemin yerel pencere rengidir (capacitor.config.js); açılıştan web yükleme ekranına geçişte sıçramaz.
    splash = Image.new("RGBA", (2732, 2732), WINDOW_BACKGROUND + (255,))
    mark = render_emblem(2600, 760).resize((1300, 1300), Image.LANCZOS)
    splash.alpha_composite(mark, (1366 - 650, 1366 - 650))
    save_png(splash.convert("RGB"), ios / "splash-2732x2732.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GRIDSHARD marka görsellerini üretir.")
    parser.add_argument("--preview", type=Path, help="çıktıları depo yerine bu klasöre yaz")
    arguments = parser.parse_args()
    generate(arguments.preview.resolve() if arguments.preview else ROOT)
    print("GRIDSHARD marka görselleri üretildi.")

