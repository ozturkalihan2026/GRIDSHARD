"""GRIDSHARD marka görselleri (Beta.72 tur 18).

Mağaza ikonu, web ikonları, yükleme ekranı amblemi ve yerel Android/iOS
ikon ve açılış görselleri tek kaynaktan, belirlenimci olarak üretilir:

    python tools/generate_brand_assets.py

Görsel tamamen çizimle üretilir: yazı tipi, ağdan indirilen dosya ya da dış
görsel servisi kullanılmaz. Aynı Pillow sürümünde çıktı her çalıştırmada
aynıdır. Betik web ikonlarıyla birlikte ``native-assets/`` altında Android/iOS
kaynakları da üretir; mevcut native projelere otomatik kopyalama yapmaz.

Tasarım: devre kartı zemin üzerinde, altın reaktör halkasının içinde ortadan
çatlayıp iki parçaya ayrılan camgöbeği kristal (GRID + SHARD). Çatlaktan enerji
sızar; yatay ana hat halkanın boşluklarından kristalin uçlarına güç taşır.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BRANDING = ROOT / "client" / "assets" / "branding"
NATIVE = ROOT / "native-assets"

SEED = 72
WINDOW_BACKGROUND = (7, 20, 43)  # #07142B, capacitor.config.js ile aynı

BACKGROUND_STOPS = [
    (0.00, (24, 84, 128)),
    (0.24, (13, 50, 90)),
    (0.52, (8, 28, 58)),
    (0.82, (4, 13, 31)),
    (1.00, (2, 7, 18)),
]
CRYSTAL_STOPS = [
    (0.00, (4, 44, 92)),
    (0.20, (6, 104, 168)),
    (0.44, (18, 186, 234)),
    (0.66, (84, 234, 255)),
    (0.84, (180, 252, 255)),
    (1.00, (248, 255, 255)),
]
GOLD_STOPS = [
    (0.00, (255, 248, 216)),
    (0.16, (255, 224, 128)),
    (0.42, (250, 180, 66)),
    (0.68, (204, 114, 32)),
    (1.00, (118, 56, 12)),
]
CYAN = (72, 232, 240)
CYAN_LIGHT = (170, 255, 252)
GOLD_GLOW = (255, 158, 54)

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


def radial(size, center, radius, radius_y=None):
    """L maskesi: merkezde 0, yarıçapta ve dışında 255."""
    rx = max(1.0, radius)
    ry = max(1.0, radius_y or radius)
    gradient = Image.radial_gradient("L").resize((round(rx * 2), round(ry * 2)), Image.BICUBIC)
    # Pillow'un dairesel gradyanı kenar ortasında 181'e ulaşır.
    gradient = gradient.point(lambda v: min(255, round(v * 255 / 181)))
    out = Image.new("L", size, 255)
    out.paste(gradient, (round(center[0] - rx), round(center[1] - ry)))
    return out


def invert(mask):
    return mask.point(lambda v: 255 - v)


def scaled(mask, factor):
    return mask.point(lambda v: min(255, round(v * factor)))


def blur(mask, radius):
    return mask.filter(ImageFilter.GaussianBlur(max(0.5, radius)))


def light(size, color, alpha):
    layer = Image.new("RGBA", size, color + (0,))
    layer.putalpha(alpha)
    return layer


def painted(fill, alpha):
    layer = fill.convert("RGBA")
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


def vertical_gradient(size, top, height):
    ramp_image = Image.linear_gradient("L").resize((size[0], max(2, round(height))), Image.BICUBIC)
    out = blank(size)
    out.paste(ramp_image, (0, round(top)))
    return out


def sparkle(size, center, radius, thickness):
    mask = blank(size)
    draw = ImageDraw.Draw(mask)
    x, y = center
    draw.polygon([(x - radius, y), (x, y - thickness), (x + radius, y), (x, y + thickness)], fill=255)
    draw.polygon([(x, y - radius), (x + thickness, y), (x, y + radius), (x - thickness, y)], fill=255)
    return mask


def seeded_noise(size, seed):
    # Image.effect_noise işletim sistemine göre farklı sonuç verebilir; tohumlu
    # küçük döşeme her makinede aynı dokuyu üretir.
    rng = random.Random(seed)
    tile = Image.frombytes("L", (256, 256), bytes(rng.getrandbits(8) for _ in range(256 * 256)))
    return tile.resize(size, Image.BICUBIC)


def downsample(image, size):
    return image.resize((size, size), Image.LANCZOS)


# --- Zemin -------------------------------------------------------------------

def circuit_layer(size, center, ring_radius, seed=SEED):
    """Halkadan kenarlara uzanan devre izleri, düğümler ve enerji atımları."""
    rng = random.Random(seed)
    s = size[0]
    cx, cy = center
    unit = ring_radius
    width = max(2, round(unit * 0.016))
    lines, nodes, pulses = blank(size), blank(size), blank(size)
    draw_lines, draw_nodes, draw_pulses = ImageDraw.Draw(lines), ImageDraw.Draw(nodes), ImageDraw.Draw(pulses)

    # Ana hatlar: yatay hat halkanın boşluklarından kristale, dikey hat halkaya.
    draw_lines.line([(0, cy), (cx - unit * 0.97, cy)], fill=255, width=round(width * 1.7))
    draw_lines.line([(cx + unit * 0.97, cy), (s, cy)], fill=255, width=round(width * 1.7))
    draw_lines.line([(cx, 0), (cx, cy - unit * 1.1)], fill=255, width=round(width * 1.3))
    draw_lines.line([(cx, cy + unit * 1.1), (cx, s)], fill=255, width=round(width * 1.3))
    for x in (unit * 1.32, unit * 1.62):
        for sign in (-1, 1):
            draw_nodes.ellipse(box((cx + sign * x, cy), unit * 0.032), outline=255, width=max(2, round(width * 0.9)))
            draw_nodes.ellipse(box((cx + sign * x, cy), unit * 0.013), fill=255)

    angles = [17, 33, 56, 73, 107, 124, 147, 163, 197, 213, 236, 253, 287, 304, 327, 343]
    for angle in angles:
        rad = math.radians(angle)
        dx, dy = math.cos(rad), math.sin(rad)
        r0 = unit * rng.uniform(1.17, 1.25)
        p0 = (cx + dx * r0, cy + dy * r0)
        l1 = unit * rng.uniform(0.10, 0.24)
        p1 = (p0[0] + dx * l1, p0[1] + dy * l1)
        l2 = unit * rng.uniform(0.28, 0.72)
        if abs(dx) > abs(dy):
            p2 = (p1[0] + math.copysign(l2, dx), p1[1])
        else:
            p2 = (p1[0], p1[1] + math.copysign(l2, dy))
        draw_lines.line([p0, p1, p2], fill=255, width=width, joint="curve")
        node = unit * 0.027
        draw_nodes.ellipse(box(p2, node), outline=255, width=max(2, round(width * 0.85)))
        draw_nodes.ellipse(box(p2, node * 0.4), fill=255)
        draw_nodes.ellipse(box(p0, node * 0.5), fill=255)
        if rng.random() < 0.5:
            t = rng.uniform(0.25, 0.8)
            pulse = (p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)
            draw_pulses.ellipse(box(pulse, unit * 0.018), fill=255)

    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out = over(out, light(size, CYAN, scaled(blur(lines, unit * 0.035), 0.55)))
    out = over(out, light(size, (60, 206, 226), scaled(lines, 0.66)))
    out = over(out, light(size, CYAN_LIGHT, scaled(nodes, 0.9)))
    out = over(out, light(size, CYAN_LIGHT, blur(pulses, unit * 0.03)))
    out = over(out, light(size, (255, 255, 255), pulses))
    return out


def render_background(s, ring_radius, *, traces=True, seed=SEED):
    size = (s, s)
    center = (s / 2, s / 2)
    image = colorize(radial(size, (s * 0.5, s * 0.46), s * 0.8), BACKGROUND_STOPS).convert("RGBA")
    image = over(image, light(size, (96, 58, 196), scaled(invert(radial(size, (s * 0.05, s * 0.03), s * 0.62)), 0.32)))
    image = over(image, light(size, (18, 150, 166), scaled(invert(radial(size, (s * 0.97, s * 1.02), s * 0.56)), 0.24)))

    grid = blank(size)
    draw = ImageDraw.Draw(grid)
    cells = 14
    grid_width = max(1, round(s / 1100))
    for index in range(1, cells):
        position = round(index * s / cells)
        draw.line([(position, 0), (position, s)], fill=255, width=grid_width)
        draw.line([(0, position), (s, position)], fill=255, width=grid_width)
    grid = ImageChops.multiply(grid, invert(radial(size, center, s * 0.64)))
    image = over(image, light(size, (96, 214, 238), scaled(grid, 0.2)))

    if traces:
        image = over(image, circuit_layer(size, center, ring_radius, seed))
    image = over(image, light(size, (0, 2, 8), scaled(radial(size, center, s * 0.74), 0.58)))
    return image


# --- Amblem ------------------------------------------------------------------

CRACK = [
    (0.189, -0.663), (0.100, -0.430), (0.160, -0.300), (0.020, -0.080),
    (0.090, 0.030), (-0.070, 0.240), (-0.020, 0.330), (-0.212, 0.620),
]


def render_emblem(s, ring_radius, *, halo=1.0, particles=(1.12, 1.5, 26), seed=SEED):
    """Şeffaf zeminde amblem: halka, kristal, çatlak ışığı ve parçacıklar."""
    size = (s, s)
    cx, cy = s / 2, s / 2
    unit = ring_radius

    def at(u, v):
        return (cx + u * unit, cy + v * unit)

    image = Image.new("RGBA", size, (0, 0, 0, 0))

    # Hale ve çekirdek ışığı.
    image = over(image, light(size, (36, 190, 226), scaled(invert(radial(size, (cx, cy), unit * 1.3 * halo)), 0.56)))
    image = over(image, light(size, (130, 255, 246), scaled(invert(radial(size, at(0, -0.05), unit * 0.8 * halo)), 0.3)))

    # Dıştaki kesikli camgöbeği yaylar.
    arcs = blank(size)
    draw = ImageDraw.Draw(arcs)
    r = unit * 1.12
    for start, end in ((100, 168), (280, 348)):
        draw.arc(box((cx, cy), r), start, end, fill=255, width=max(2, round(unit * 0.012)))
    image = over(image, light(size, CYAN, scaled(blur(arcs, unit * 0.02), 0.8)))
    image = over(image, light(size, CYAN_LIGHT, scaled(arcs, 0.75)))

    # Altın reaktör halkası: iki yay, yanlarda ana hattın girdiği boşluklar.
    outer, inner = unit, unit * 0.9
    ring = blank(size)
    draw = ImageDraw.Draw(ring)
    draw.ellipse(box((cx, cy), outer), fill=255)
    draw.ellipse(box((cx, cy), inner), fill=0)
    for gap in (0, 180):
        draw.pieslice(box((cx, cy), outer + 4), gap - 9, gap + 9, fill=0)
    image = over(image, light(size, GOLD_GLOW, scaled(blur(ring, unit * 0.075), 0.95)))
    metal = colorize(vertical_gradient(size, cy - outer, outer * 2), GOLD_STOPS)
    image = over(image, painted(metal, ring))
    offset = max(2, round(unit * 0.012))
    top_left = ImageChops.subtract(ring, ImageChops.offset(ring, offset, offset))
    bottom_right = ImageChops.subtract(ring, ImageChops.offset(ring, -offset, -offset))
    image = over(image, light(size, (255, 252, 230), scaled(blur(top_left, 1.2), 0.75)))
    image = over(image, light(size, (74, 30, 4), scaled(blur(bottom_right, 1.2), 0.7)))
    ticks = blank(size)
    draw = ImageDraw.Draw(ticks)
    for angle in range(0, 360, 10):
        if min(abs((angle - gap + 180) % 360 - 180) for gap in (0, 180)) <= 12:
            continue
        rad = math.radians(angle)
        p_out = (cx + math.cos(rad) * (outer - unit * 0.004), cy + math.sin(rad) * (outer - unit * 0.004))
        p_in = (cx + math.cos(rad) * (outer - unit * 0.038), cy + math.sin(rad) * (outer - unit * 0.038))
        draw.line([p_in, p_out], fill=255, width=max(1, round(unit * 0.008)))
    image = over(image, light(size, (92, 40, 6), scaled(ImageChops.multiply(ticks, ring), 0.6)))

    # Köşegen kelepçeler (her birinde camgöbeği ışık).
    clamps, leds = blank(size), blank(size)
    draw_clamps, draw_leds = ImageDraw.Draw(clamps), ImageDraw.Draw(leds)
    for angle in (45, 135, 225, 315):
        rad = math.radians(angle)
        radial_dir = (math.cos(rad), math.sin(rad))
        tangent = (-radial_dir[1], radial_dir[0])
        mid = unit * 0.95
        half_t, half_r = unit * 0.07, unit * 0.105
        corners = []
        for sr, st in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            corners.append((
                cx + radial_dir[0] * (mid + sr * half_r) + tangent[0] * st * half_t,
                cy + radial_dir[1] * (mid + sr * half_r) + tangent[1] * st * half_t,
            ))
        draw_clamps.polygon(corners, fill=255)
        draw_leds.ellipse(box((cx + radial_dir[0] * mid, cy + radial_dir[1] * mid), unit * 0.022), fill=255)
    steel = colorize(vertical_gradient(size, cy - unit * 1.1, unit * 2.2), [
        (0.0, (118, 142, 170)), (0.5, (52, 70, 96)), (1.0, (24, 34, 52)),
    ])
    image = over(image, light(size, (0, 0, 0), scaled(blur(clamps, unit * 0.02), 0.6)))
    image = over(image, painted(steel, clamps))
    edge = ImageChops.subtract(clamps, ImageChops.offset(clamps, offset, offset))
    image = over(image, light(size, (200, 230, 255), scaled(edge, 0.55)))
    image = over(image, light(size, CYAN, blur(leds, unit * 0.03)))
    image = over(image, light(size, (230, 255, 255), leds))

    # İçteki kesikli camgöbeği halka.
    dashes = blank(size)
    draw = ImageDraw.Draw(dashes)
    for start in range(0, 360, 15):
        draw.arc(box((cx, cy), unit * 0.8), start + 2, start + 11, fill=255, width=max(2, round(unit * 0.012)))
    image = over(image, light(size, CYAN, scaled(blur(dashes, unit * 0.02), 0.7)))
    image = over(image, light(size, CYAN_LIGHT, scaled(dashes, 0.65)))

    # Halkanın boşluklarından kristalin uçlarına güç hattı.
    conduit, core_line, ports = blank(size), blank(size), blank(size)
    draw_conduit, draw_core, draw_ports = ImageDraw.Draw(conduit), ImageDraw.Draw(core_line), ImageDraw.Draw(ports)
    for sign in (-1, 1):
        start, end = at(sign * 1.02, 0), at(sign * 0.58, 0)
        draw_conduit.line([start, end], fill=255, width=max(3, round(unit * 0.05)))
        draw_core.line([start, end], fill=255, width=max(2, round(unit * 0.018)))
        draw_ports.ellipse(box(at(sign * 0.6, 0), unit * 0.034), fill=255)
        draw_ports.ellipse(box(at(sign * 0.95, 0), unit * 0.026), fill=255)
    image = over(image, light(size, CYAN, scaled(blur(conduit, unit * 0.05), 0.9)))
    image = over(image, light(size, (40, 170, 210), scaled(conduit, 0.85)))
    image = over(image, light(size, (235, 255, 255), core_line))
    image = over(image, light(size, CYAN_LIGHT, blur(ports, unit * 0.03)))
    image = over(image, light(size, (255, 255, 255), ports))

    # Kristal geometrisi.
    top, bottom, left, right = at(0, -1.02), at(0, 1.02), at(-0.54, 0), at(0.54, 0)
    hub = at(-0.03, -0.06)

    def pull(a, b, amount=0.18):
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        return (mid[0] + (hub[0] - mid[0]) * amount, mid[1] + (hub[1] - mid[1]) * amount)

    m_tl, m_tr, m_bl, m_br = pull(top, left), pull(top, right), pull(bottom, left), pull(bottom, right)
    outline = [top, right, bottom, left]
    crystal = polygon(size, outline)

    # Gölge halkaya düşer.
    shadow = ImageChops.offset(blur(crystal, unit * 0.06), round(unit * 0.05), round(unit * 0.07))
    image = over(image, light(size, (0, 3, 10), scaled(shadow, 0.6)))

    # Çatlaktan sızan enerji (kristalin arkasında; iki parça arasından görünür).
    crack = [at(u, v) for u, v in CRACK]
    split = (round(unit * 0.028), round(unit * 0.034))
    crack_mid = [(x + split[0] / 2, y + split[1] / 2) for x, y in crack]
    energy = blank(size)
    ImageDraw.Draw(energy).line(crack_mid, fill=255, width=max(3, round(unit * 0.07)), joint="curve")
    image = over(image, light(size, CYAN, scaled(blur(energy, unit * 0.2), 0.6)))
    image = over(image, light(size, (200, 255, 255), blur(energy, unit * 0.04)))

    # Kristal yüzeyleri (ışık sol üstten).
    table = ramp(CRYSTAL_STOPS)
    facets = [
        ([top, m_tl, hub], 0.8), ([m_tl, left, hub], 0.64), ([top, m_tr, hub], 0.58),
        ([m_tr, right, hub], 0.42), ([left, m_bl, hub], 0.48), ([m_bl, bottom, hub], 0.34),
        ([right, m_br, hub], 0.2), ([m_br, bottom, hub], 0.27),
        ([top, left, m_tl], 0.94), ([top, right, m_tr], 0.76), ([bottom, left, m_bl], 0.46),
        ([bottom, right, m_br], 0.22),
    ]
    gem = light(size, table[round(0.5 * 255)], crystal)
    for points, lightness in facets:
        gem = over(gem, light(size, table[round(lightness * 255)], polygon(size, points)))
    shade = ImageChops.multiply(crystal, vertical_gradient(size, top[1], bottom[1] - top[1]))
    gem = over(gem, light(size, (0, 12, 32), scaled(shade, 0.32)))
    gem = over(gem, light(size, (150, 255, 250), scaled(ImageChops.multiply(crystal, invert(radial(size, hub, unit * 0.38))), 0.32)))
    frost = blur(seeded_noise(size, seed + 2), unit * 0.008)
    gem = over(gem, light(size, (255, 255, 255), scaled(ImageChops.multiply(crystal, frost), 0.07)))
    edges = blank(size)
    draw = ImageDraw.Draw(edges)
    edge_width = max(1, round(unit * 0.007))
    for a, b in ((hub, top), (hub, left), (hub, right), (hub, bottom), (hub, m_tl), (hub, m_tr),
                 (hub, m_bl), (hub, m_br), (m_tl, top), (m_tl, left), (m_tr, top), (m_tr, right),
                 (m_bl, bottom), (m_bl, left), (m_br, bottom), (m_br, right)):
        draw.line([a, b], fill=255, width=edge_width)
    gem = over(gem, light(size, (228, 255, 255), scaled(ImageChops.multiply(edges, crystal), 0.36)))
    streak = polygon(size, [at(-0.075, -0.80), at(-0.045, -0.765), at(-0.30, -0.235), at(-0.34, -0.27)])
    gem = over(gem, light(size, (255, 255, 255), scaled(blur(streak, unit * 0.006), 0.45)))
    rim_width = max(2, round(unit * 0.016))
    lit_rim, dim_rim = blank(size), blank(size)
    ImageDraw.Draw(lit_rim).line([left, top, right], fill=255, width=rim_width, joint="curve")
    ImageDraw.Draw(dim_rim).line([right, bottom, left], fill=255, width=rim_width, joint="curve")
    grown = crystal.filter(ImageFilter.MaxFilter(5))
    gem = over(gem, light(size, (225, 255, 255), scaled(ImageChops.multiply(lit_rim, grown), 0.95)))
    gem = over(gem, light(size, (120, 230, 255), scaled(ImageChops.multiply(dim_rim, grown), 0.55)))

    # Kristal ikiye ayrılır: alt parça hafifçe aşağı sağa kayar.
    far_start = (crack[0][0] + (crack[0][0] - crack[1][0]) * 20, crack[0][1] + (crack[0][1] - crack[1][1]) * 20)
    far_end = (crack[-1][0] + (crack[-1][0] - crack[-2][0]) * 20, crack[-1][1] + (crack[-1][1] - crack[-2][1]) * 20)
    lower = polygon(size, [far_start, *crack, far_end, (s * 4, s * 4), (s * 4, -s * 3)])
    alpha = gem.getchannel("A")
    upper_piece = gem.copy()
    upper_piece.putalpha(ImageChops.multiply(alpha, invert(lower)))
    lower_piece = gem.copy()
    lower_piece.putalpha(ImageChops.multiply(alpha, lower))
    lower_piece = ImageChops.offset(lower_piece, *split)
    image = over(image, light(size, CYAN, scaled(blur(crystal, unit * 0.1), 0.6)))
    # İnce koyu dış hat: parlak halenin önünde kristalin sınırı küçük boyutta da seçilir.
    outline_mask = ImageChops.subtract(blur(crystal.filter(ImageFilter.MaxFilter(9)), unit * 0.004), crystal)
    image = over(image, light(size, (2, 16, 36), scaled(outline_mask, 0.65)))
    image = over(image, upper_piece)
    image = over(image, lower_piece)

    # Çatlağın ışığı parçaların içine saçılır ve kenarlarından taşar.
    core = blank(size)
    ImageDraw.Draw(core).line(crack_mid, fill=255, width=max(2, round(unit * 0.02)), joint="curve")
    pieces = ImageChops.lighter(upper_piece.getchannel("A"), lower_piece.getchannel("A"))
    inner_glow = ImageChops.multiply(blur(core, unit * 0.12), pieces)
    image = over(image, light(size, (90, 240, 255), scaled(inner_glow, 2.2)))
    glow_inside = ImageChops.multiply(pieces, invert(radial(size, at(0.02, 0.02), unit * 0.62)))
    image = over(image, light(size, (70, 220, 255), scaled(glow_inside, 0.22)))
    image = over(image, light(size, CYAN_LIGHT, blur(core, unit * 0.045)))
    image = over(image, light(size, (255, 255, 255), core))

    # Parıltılar.
    for point, radius in ((crack_mid[0], 0.17), (crack_mid[-1], 0.12), (top, 0.1), (right, 0.07)):
        star = sparkle(size, point, unit * radius, unit * radius * 0.13)
        image = over(image, light(size, CYAN_LIGHT, scaled(blur(star, unit * 0.02), 0.9)))
        image = over(image, light(size, (255, 255, 255), star))

    # Parlak bölgeler hafifçe taşar (bloom).
    luminance = ImageChops.multiply(image.convert("L"), image.getchannel("A"))
    bloom = blur(luminance.point(lambda v: max(0, min(255, (v - 175) * 3))), unit * 0.06)
    image = over(image, light(size, (200, 255, 255), scaled(bloom, 0.45)))

    # Parçacıklar.
    if particles:
        inner_band, outer_band, count = particles
        rng = random.Random(seed + 1)
        dots_cyan, dots_gold = blank(size), blank(size)
        draw_cyan, draw_gold = ImageDraw.Draw(dots_cyan), ImageDraw.Draw(dots_gold)
        for _ in range(count):
            angle = rng.uniform(0, math.tau)
            distance = unit * rng.uniform(inner_band, outer_band)
            point = (cx + math.cos(angle) * distance, cy + math.sin(angle) * distance)
            radius = unit * rng.uniform(0.007, 0.02)
            (draw_gold if rng.random() < 0.25 else draw_cyan).ellipse(box(point, radius), fill=round(rng.uniform(150, 255)))
        for dots, color in ((dots_cyan, CYAN_LIGHT), (dots_gold, (255, 214, 130))):
            image = over(image, light(size, color, scaled(blur(dots, unit * 0.025), 1.4)))
            image = over(image, light(size, color, dots))
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
    ring = s * 0.335
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


def generate():
    # Mağaza ve web ikonları (2x çizilip küçültülür).
    icon = render_icon(2048)
    icon_1024 = downsample(icon, 1024)
    save_png(icon_1024, BRANDING / "gridshard-store-icon-1024.png")
    save_png(downsample(icon_1024, 512), BRANDING / "gridshard-store-icon-512.png")
    save_png(downsample(icon_1024, 192), BRANDING / "gridshard-favicon-192.png")
    small = downsample(icon_1024, 32).filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))
    save_png(small, BRANDING / "gridshard-favicon-32.png")
    downsample(icon_1024, 256).save(ROOT / "client" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # Yükleme ekranı amblemi (şeffaf; halkalar CSS ile döner).
    emblem = render_emblem(1536, 1536 * 0.36)
    emblem.resize((768, 768), Image.LANCZOS).save(
        BRANDING / "gridshard-emblem.webp", format="WEBP", quality=90, method=6
    )

    # Android başlatıcı ikonları.
    android = NATIVE / "android" / "res"
    # Amblem 66 dp güvenli dairenin içinde (halka çapı ~60 dp).
    foreground = render_emblem(1728, 1728 * 0.28, halo=0.85, particles=(1.1, 1.36, 18))
    background = render_background(1728, 1728 * 0.28).convert("RGB")
    monochrome = Image.new("RGBA", (1728, 1728), (255, 255, 255, 0))
    monochrome.putalpha(emblem_silhouette(1728, 1728 * 0.28))
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
    splash_icon = render_emblem(2304, 2304 * 0.28, halo=0.72, particles=(1.05, 1.12, 10))
    for density, factor in DENSITIES.items():
        save_png(downsample(splash_icon, round(288 * factor)), android / f"drawable-{density}" / "gridshard_splash_icon.png")
    write_text(android / "drawable" / "gridshard_splash.xml", SPLASH_LAYER_LIST)

    # iOS: uygulama ikonu (saydamlık yok) ve açılış görseli (ortası kırpılır).
    ios = NATIVE / "ios"
    save_png(icon_1024, ios / "AppIcon-512@2x.png")
    splash = colorize(radial((2732, 2732), (1366, 1310), 1500), [
        (0.0, (16, 58, 98)), (0.35, (9, 32, 64)), (0.7, WINDOW_BACKGROUND), (1.0, (4, 11, 25)),
    ]).convert("RGBA")
    mark = render_emblem(2600, 760, halo=0.9, particles=(1.1, 1.4, 22)).resize((1300, 1300), Image.LANCZOS)
    splash.alpha_composite(mark, (1366 - 650, 1366 - 650))
    save_png(splash.convert("RGB"), ios / "splash-2732x2732.png")


if __name__ == "__main__":
    generate()
    print("GRIDSHARD marka görselleri üretildi.")

