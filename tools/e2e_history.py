from __future__ import annotations

from pathlib import Path
import hashlib
import json
import time

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/"qa_reports"
IMPORTED=QA/"imported_browser_e2e.json"
HISTORY=QA/"windows_e2e_history.json"


def load(path:Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def evidence_fingerprint(imported:dict)->str:
    hashes=(
        imported.get("artifact_integrity",{})
        .get("sha256",{})
    )
    normalized=json.dumps(
        hashes,
        sort_keys=True,
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(
        normalized
    ).hexdigest()


def main()->int:
    imported=load(IMPORTED,None)
    history=load(
        HISTORY,
        {
            "version":"2.0.0-beta.26",
            "runs":[],
        },
    )
    history["version"]="2.0.0-beta.26"

    if not isinstance(imported,dict):
        history["last_action"]="NO_IMPORTED_EVIDENCE"
    elif (
        imported.get("status")!="VERIFIED_PASSED"
        or imported.get("verified_passed") is not True
        or imported.get("artifact_integrity",{}).get("complete") is not True
    ):
        history["last_action"]="NOT_ADDED_UNVERIFIED"
    else:
        fingerprint=evidence_fingerprint(
            imported
        )
        duplicate=any(
            run.get("fingerprint")==fingerprint
            for run in history.get("runs",[])
        )
        if duplicate:
            history["last_action"]="DUPLICATE_SKIPPED"
        else:
            history.setdefault("runs",[]).append({
                "run_id":
                    imported.get("run_id")
                    or f"windows-{int(time.time())}",
                "imported_at_epoch":
                    int(time.time()),
                "browser":
                    imported.get("browser"),
                "fingerprint":
                    fingerprint,
                "artifact_integrity":
                    imported.get("artifact_integrity"),
                "checks":
                    imported.get("checks",[]),
                "status":
                    "VERIFIED_PASSED",
            })
            history["last_action"]="ADDED"

    history["verified_run_count"]=len(
        history.get("runs",[])
    )

    HISTORY.parent.mkdir(
        parents=True,
        exist_ok=True,
    )
    HISTORY.write_text(
        json.dumps(
            history,
            ensure_ascii=False,
            indent=2,
        )+"\n",
        encoding="utf-8",
    )
    print(
        "Windows E2E history:",
        history["last_action"],
    )
    return 0


if __name__=="__main__":
    raise SystemExit(main())
