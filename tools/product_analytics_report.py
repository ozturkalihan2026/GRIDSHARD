"""Local aggregate report; never prints raw subjects or individual events."""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import time


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.product_analytics import aggregate_product_events, validate_product_events, SCHEMA_VERSION  # noqa: E402


def main() -> int:
    path = Path(os.environ.get("GRIDSHARD_PRODUCT_ANALYTICS_PATH") or ROOT / "server" / "data" / "product_analytics.json")
    try:
        payload = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"schema_version": SCHEMA_VERSION, "events": []}
        if not isinstance(payload, dict) or payload.get("schema_version") != SCHEMA_VERSION or not isinstance(payload.get("events"), list):
            raise ValueError("Analitik dosyası şeması geçersiz.")
        report = aggregate_product_events(validate_product_events(payload["events"]), now_ms=round(time.time() * 1000))
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as exc:
        print(f"Analitik raporu okunamadı: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
