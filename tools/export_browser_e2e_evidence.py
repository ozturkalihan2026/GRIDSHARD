from __future__ import annotations

from pathlib import Path
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/"qa_reports"
REPORT=QA/"browser_e2e.json"
SUMMARY=QA/"browser_e2e_evidence_summary.json"
ARTIFACTS=QA/"browser_e2e_artifacts"
OUTPUT=QA/"gridshard-windows-browser-e2e-evidence.zip"


def main()->int:
    if not REPORT.exists():
        print(
            "browser_e2e.json yok; önce gerçek tarayıcı E2E çalıştırılmalıdır."
        )
        return 2

    report=json.loads(
        REPORT.read_text(
            encoding="utf-8"
        )
    )

    if report.get("skipped"):
        print(
            "Browser E2E SKIPPED; gerçek PASSED kanıt paketi oluşturulmadı."
        )
        return 2

    if report.get("ok") is not True:
        print(
            "Browser E2E başarılı değil; kanıt paketi PASSED olarak dışa aktarılamaz."
        )
        return 2

    required=[
        "01-main-menu.png",
        "02-loadout-ready.png",
        "03-battle-started.png",
        "04-battle-result.png",
        "console.json",
        "network.json",
        "checks.json",
    ]

    missing=[
        name
        for name
        in required
        if not (
            ARTIFACTS/name
        ).exists()
    ]

    if missing:
        print(
            "Eksik artifactler:",
            ", ".join(missing),
        )
        return 2

    if OUTPUT.exists():
        OUTPUT.unlink()

    with zipfile.ZipFile(
        OUTPUT,
        "w",
        zipfile.ZIP_DEFLATED,
    ) as archive:
        archive.write(
            REPORT,
            "browser_e2e.json",
        )
        if SUMMARY.exists():
            archive.write(
                SUMMARY,
                "browser_e2e_evidence_summary.json",
            )
        for name in required:
            archive.write(
                ARTIFACTS/name,
                f"browser_e2e_artifacts/{name}",
            )

    print(
        "Windows Browser E2E kanıt ZIP'i:",
        OUTPUT,
    )
    return 0


if __name__=="__main__":
    raise SystemExit(main())
