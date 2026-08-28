from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa_reports" / "beta37_corelight_contrast_report.json"

PALETTE = {
    "void": "#07142B",
    "reactor": "#0D2342",
    "alloy": "#12305A",
    "surface_3": "#163A66",
    "ice_white": "#F5FAFF",
    "signal": "#B9CEE6",
    "arc_cyan": "#48F4E0",
    "reactor_gold": "#FFD56A",
}


def _channel(value: int) -> float:
    c = value / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    value = hex_color.lstrip("#")
    r, g, b = (int(value[index:index + 2], 16) for index in (0, 2, 4))
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)


def contrast(foreground: str, background: str) -> float:
    high, low = sorted((luminance(foreground), luminance(background)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def main() -> int:
    pairs = []
    for background_name in ("void", "reactor", "alloy", "surface_3"):
        for foreground_name in ("ice_white", "signal", "arc_cyan", "reactor_gold"):
            ratio = contrast(PALETTE[foreground_name], PALETTE[background_name])
            pairs.append({
                "foreground": foreground_name,
                "background": background_name,
                "ratio": round(ratio, 2),
                "wcag_aa_standard_text": ratio >= 4.5,
                "wcag_large_or_non_text_3_to_1": ratio >= 3.0,
            })

    report = {
        "version": "2.0.0-beta.38-hotfix-v4",
        "purpose": "Corelight Arena v2 palette contrast smoke audit.",
        "reference_thresholds": {
            "standard_game_ui_text": 4.5,
            "large_text_or_essential_non_text": 3.0,
        },
        "palette": PALETTE,
        "pairs": pairs,
        "all_primary_pairs_pass_4_5": all(item["wcag_aa_standard_text"] for item in pairs),
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
