from __future__ import annotations

import json
from pathlib import Path
import re
import shutil
import subprocess

ROOT=Path(__file__).resolve().parents[1]
AUDIO=ROOT/"client/assets/audio"
OUTPUT=ROOT/"docs/AUDIO_BS1770_SCAN.json"


def scan_asset(
    ffmpeg:str,
    path:Path,
)->dict:
    result=subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-nostats",
            "-i",
            str(path),
            "-filter_complex",
            "ebur128=peak=true",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    text=result.stdout+"\n"+result.stderr

    integrated_matches=re.findall(
        r"I:\s*(-?\d+(?:\.\d+)?)\s*LUFS",
        text,
    )
    lra_matches=re.findall(
        r"LRA:\s*(-?\d+(?:\.\d+)?)\s*LU",
        text,
    )
    peak_matches=re.findall(
        r"Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS",
        text,
    )

    return {
        "asset":path.name,
        "ok":
            result.returncode==0
            and bool(
                integrated_matches
            ),
        "integrated_lufs":
            (
                float(
                    integrated_matches[-1]
                )
                if integrated_matches
                else None
            ),
        "loudness_range_lu":
            (
                float(
                    lra_matches[-1]
                )
                if lra_matches
                else None
            ),
        "true_peak_dbfs":
            (
                float(
                    peak_matches[-1]
                )
                if peak_matches
                else None
            ),
        "returncode":
            result.returncode,
    }


def main()->int:
    ffmpeg=shutil.which(
        "ffmpeg"
    )

    if not ffmpeg:
        payload={
            "version":
                "2.0.0-beta.23",
            "available":False,
            "status":
                "SKIPPED",
            "reason":
                "ffmpeg bulunamadı",
            "standard":
                "EBU R128 / ITU-R BS.1770 compatible ffmpeg ebur128 filter",
            "mastering_target_selected":
                False,
            "mastering_target_reference":
                "docs/AUDIO_MASTERING_TARGET_DECISION.json",
            "automatic_gain_change":
                False,
            "final_mastering_complete":
                False,
            "assets":[],
        }
    else:
        filters=subprocess.run(
            [
                ffmpeg,
                "-hide_banner",
                "-filters",
            ],
            capture_output=True,
            text=True,
            timeout=15,
        )
        has_ebur128=(
            "ebur128"
            in (
                filters.stdout
                + filters.stderr
            )
        )

        if not has_ebur128:
            payload={
                "version":
                    "2.0.0-beta.23",
                "available":
                    False,
                "status":
                    "SKIPPED",
                "reason":
                    "ffmpeg ebur128 filtresi yok",
                "standard":
                    "EBU R128 / ITU-R BS.1770",
                "mastering_target_selected":
                    False,
                "mastering_target_reference":
                    "docs/AUDIO_MASTERING_TARGET_DECISION.json",
                "automatic_gain_change":
                    False,
                "final_mastering_complete":
                    False,
                "assets":[],
            }
        else:
            assets=[
                scan_asset(
                    ffmpeg,
                    path,
                )
                for path
                in sorted(
                    AUDIO.glob(
                        "*.wav"
                    )
                )
            ]
            payload={
                "version":
                    "2.0.0-beta.23",
                "available":True,
                "status":
                    (
                        "MEASURED"
                        if all(
                            item["ok"]
                            for item
                            in assets
                        )
                        else "PARTIAL"
                    ),
                "tool":
                    ffmpeg,
                "standard":
                    "ffmpeg ebur128; EBU R128 / ITU-R BS.1770 family measurement",
                "note":
                    "Bu ölçüm final mastering uygulandığı anlamına gelmez.",
                "mastering_target_selected":
                    False,
                "mastering_target_reference":
                    "docs/AUDIO_MASTERING_TARGET_DECISION.json",
                "automatic_gain_change":
                    False,
                "final_mastering_complete":
                    False,
                "assets":
                    assets,
            }

    OUTPUT.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        )+"\n",
        encoding="utf-8",
    )

    print(
        "Audio BS.1770 scan:",
        payload["status"],
    )
    return 0


if __name__=="__main__":
    raise SystemExit(main())
