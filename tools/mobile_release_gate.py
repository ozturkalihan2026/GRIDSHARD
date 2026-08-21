from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "server"))

from app.mobile_release_gate import evaluate_release_gate  # noqa: E402


def _current_commit() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        text=True,
    ).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="GRIDSHARD sıralı mobil mağaza yayın kapısı")
    parser.add_argument("--stage", choices=("android", "ios"), required=True)
    parser.add_argument("--artifact", type=Path, required=True)
    parser.add_argument("--device-evidence", type=Path, required=True)
    parser.add_argument("--android-closed-test-evidence", type=Path)
    parser.add_argument("--commit-sha")
    args = parser.parse_args()

    report = evaluate_release_gate(
        stage=args.stage,
        artifact=args.artifact,
        device_evidence=args.device_evidence,
        android_closed_test_evidence=args.android_closed_test_evidence,
        commit_sha=args.commit_sha or os.environ.get("GITHUB_SHA") or _current_commit(),
        app_id=os.environ.get("GRIDSHARD_APP_ID", ""),
        api_base_url=os.environ.get("GRIDSHARD_API_BASE_URL", ""),
        cors_origins=tuple(
            item.strip()
            for item in os.environ.get("GRIDSHARD_CORS_ORIGINS", "").split(",")
            if item.strip()
        ),
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["ready"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
