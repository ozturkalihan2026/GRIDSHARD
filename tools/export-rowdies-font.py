"""Lossless full-font WOFF2 export. Requires fonttools[woff]; never subset glyphs."""
import hashlib
import json
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "qa_reports/typography-pilot-20261014/Rowdies-Bold.ttf"
TARGET = ROOT / "client/assets/fonts/rowdies-700-full.woff2"
font = TTFont(SOURCE, recalcTimestamp=False)
original_cmap = font.getBestCmap()
assert font["OS/2"].usWeightClass == 700
assert all(ord(char) in original_cmap for char in "ÇĞİÖŞÜçğıöşü0123456789")
font.flavor = "woff2"
font.save(TARGET)
converted = TTFont(TARGET)
assert converted.getBestCmap() == original_cmap, "Export changed character coverage"
assert converted["OS/2"].usWeightClass == 700
assert converted["name"].getDebugName(1) == font["name"].getDebugName(1)
print(json.dumps({"source": str(SOURCE.relative_to(ROOT)),
    "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    "target": str(TARGET.relative_to(ROOT)), "bytes": TARGET.stat().st_size,
    "glyph_mapping_unchanged": True, "turkish_glyphs": "ÇĞİÖŞÜçğıöşü",
    "version": converted["name"].getDebugName(5)}, ensure_ascii=False, indent=2))
