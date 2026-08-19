from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile
import zipfile


ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/"qa_reports/imported_browser_e2e.json"

REQUIRED_SCREENSHOTS=[
    "01-main-menu.png",
    "02-loadout-ready.png",
    "03-battle-started.png",
    "04-battle-result.png",
]
REQUIRED_JSON=[
    "console.json",
    "network.json",
    "checks.json",
]


class ImportErrorEvidence(ValueError):
    pass


def sha256(path:Path)->str:
    digest=hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(
            lambda:handle.read(
                1024*1024
            ),
            b"",
        ):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path:Path):
    try:
        return json.loads(
            path.read_text(
                encoding="utf-8"
            )
        )
    except Exception as exc:
        raise ImportErrorEvidence(
            f"JSON okunamadı: {path.name}: {exc}"
        ) from exc


def png_valid(path:Path)->bool:
    try:
        with path.open("rb") as handle:
            return (
                handle.read(8)
                == b"\x89PNG\r\n\x1a\n"
            )
    except OSError:
        return False


def resolve_source(
    source:Path,
)->tuple[Path,Path|None]:
    if source.is_dir():
        return source,None

    if (
        source.is_file()
        and source.suffix.lower()
        == ".zip"
    ):
        temp=Path(
            tempfile.mkdtemp(
                prefix=
                    "gridshard-e2e-import-"
            )
        )
        with zipfile.ZipFile(
            source
        ) as archive:
            archive.extractall(temp)

        candidates=[
            path
            for path
            in temp.rglob(
                "browser_e2e.json"
            )
        ]
        if not candidates:
            shutil.rmtree(
                temp,
                ignore_errors=True,
            )
            raise ImportErrorEvidence(
                "ZIP içinde browser_e2e.json bulunamadı."
            )
        return (
            candidates[0].parent,
            temp,
        )

    raise ImportErrorEvidence(
        "Kaynak bir klasör veya ZIP olmalıdır."
    )


def main()->int:
    parser=argparse.ArgumentParser(
        description=
            "GRIDSHARD Windows Browser E2E kanıt paketini doğrula ve QA için içe aktar."
    )
    parser.add_argument(
        "--source",
        required=True,
        help=
            "browser_e2e.json ve browser_e2e_artifacts içeren klasör veya ZIP",
    )
    args=parser.parse_args()

    source=Path(
        args.source
    ).expanduser().resolve()

    temp=None
    try:
        base,temp=resolve_source(
            source
        )

        report_path=base/"browser_e2e.json"
        if not report_path.exists():
            raise ImportErrorEvidence(
                "browser_e2e.json bulunamadı."
            )

        report=read_json(
            report_path
        )

        artifact_dir=base/"browser_e2e_artifacts"
        if not artifact_dir.exists():
            # ZIP/Windows export may put artifacts beside report directory.
            alt=base.parent/"browser_e2e_artifacts"
            artifact_dir=(
                alt
                if alt.exists()
                else artifact_dir
            )

        missing=[]
        invalid=[]
        hashes={}

        for name in (
            REQUIRED_SCREENSHOTS
            + REQUIRED_JSON
        ):
            path=artifact_dir/name
            if not path.exists():
                missing.append(name)
                continue

            hashes[name]=sha256(path)

            if (
                name.endswith(".png")
                and not png_valid(path)
            ):
                invalid.append(
                    f"{name}:invalid_png"
                )

        checks=[]
        console=[]
        network=[]

        if not missing:
            checks=read_json(
                artifact_dir
                / "checks.json"
            )
            console=read_json(
                artifact_dir
                / "console.json"
            )
            network=read_json(
                artifact_dir
                / "network.json"
            )

        checks_all_ok=bool(
            checks
        ) and all(
            item.get("ok")
            is True
            for item
            in checks
        )

        console_error_count=sum(
            1
            for item
            in console
            if item.get(
                "type"
            )=="error"
        )
        network_error_count=sum(
            1
            for item
            in network
            if int(
                item.get(
                    "status",
                    0,
                )
                or 0
            )>=400
        )

        source_status=(
            "SKIPPED"
            if report.get(
                "skipped"
            )
            else (
                "PASSED"
                if report.get(
                    "ok"
                ) is True
                else "FAILED"
            )
        )

        complete=(
            not missing
            and not invalid
            and checks_all_ok
            and console_error_count==0
            and network_error_count==0
        )

        verified_passed=(
            source_status
            == "PASSED"
            and complete
        )

        status=(
            "VERIFIED_PASSED"
            if verified_passed
            else (
                "SKIPPED"
                if source_status
                == "SKIPPED"
                else "REJECTED"
            )
        )

        payload={
            "version":
                "2.0.0-beta.22",
            "status":status,
            "verified_passed":
                verified_passed,
            "source_status":
                source_status,
            "source":
                str(source),
            "artifact_integrity":{
                "complete":
                    complete,
                "missing":
                    missing,
                "invalid":
                    invalid,
                "sha256":
                    hashes,
                "checks_all_ok":
                    checks_all_ok,
                "console_error_count":
                    console_error_count,
                "network_error_count":
                    network_error_count,
            },
            "browser":
                report.get(
                    "browser"
                ),
            "reason":
                report.get(
                    "reason"
                ),
            "checks":
                checks,
            "automatic_pass_from_skip":
                False,
            "canonical_balance_changed":
                False,
        }

        OUTPUT.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        OUTPUT.write_text(
            json.dumps(
                payload,
                ensure_ascii=False,
                indent=2,
            )+"\n",
            encoding="utf-8",
        )

        print(
            "GRIDSHARD Windows E2E import:",
            status,
        )
        print(
            "Rapor:",
            OUTPUT,
        )

        return (
            0
            if status
            in {
                "VERIFIED_PASSED",
                "SKIPPED",
            }
            else 2
        )

    except ImportErrorEvidence as exc:
        payload={
            "version":
                "2.0.0-beta.22",
            "status":
                "REJECTED",
            "verified_passed":
                False,
            "source":
                str(source),
            "reason":
                str(exc),
            "automatic_pass_from_skip":
                False,
            "canonical_balance_changed":
                False,
        }
        OUTPUT.parent.mkdir(
            parents=True,
            exist_ok=True,
        )
        OUTPUT.write_text(
            json.dumps(
                payload,
                ensure_ascii=False,
                indent=2,
            )+"\n",
            encoding="utf-8",
        )
        print(
            "GRIDSHARD Windows E2E import: REJECTED"
        )
        print(exc)
        return 2
    finally:
        if temp is not None:
            shutil.rmtree(
                temp,
                ignore_errors=True,
            )


if __name__=="__main__":
    raise SystemExit(main())
