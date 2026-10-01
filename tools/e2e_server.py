from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import threading
import tempfile
import time
from urllib.parse import urlsplit

import uvicorn


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
PID_PATH = ROOT / "qa_reports" / "e2e-server.pid.json"


def main() -> None:
    base = urlsplit(os.environ.get("GRIDSHARD_E2E_BASE_URL", "http://127.0.0.1:8879"))
    if base.scheme != "http" or base.hostname not in {"localhost", "127.0.0.1"}:
        raise RuntimeError("The owned E2E server only listens on localhost HTTP")
    # Every browser run gets fresh identities and every runtime store. Never
    # inherit a developer's database, Redis or server/data file paths.
    isolated = tempfile.TemporaryDirectory(prefix="gridshard-browser-e2e-")
    test_root = Path(isolated.name)
    for variable in tuple(os.environ):
        if variable in {"DATABASE_URL", "DATABASE_URL_FILE", "REDIS_URL", "REDIS_URL_FILE"} or variable.endswith("_PATH") and variable.startswith(("GRIDSHARD_", "RELAY_")):
            os.environ.pop(variable, None)
    os.environ.update({"GRIDSHARD_RUNTIME_MODE": "development", "GRIDSHARD_RUNTIME_DATA_DIR": str(test_root),
                       "GRIDSHARD_AUTH_REQUIRED": "1", "GRIDSHARD_RATE_LIMIT_REQUIRED": "0",
                       "GRIDSHARD_AUTH_SIGNING_KEY": "e2e-only-signing-key-change-in-production",
                       "GRIDSHARD_MATCHMAKING_AI_ONLY": "0" if os.environ.get("GRIDSHARD_E2E_HUMAN_MATCHMAKING") == "1" else "1",
                       "GRIDSHARD_PUSH_ENABLED": "0", "GRIDSHARD_PURCHASE_TEST_MODE": "0", "GRIDSHARD_AD_TEST_MODE": "0"})
    os.environ.pop("GRIDSHARD_AUTH_SIGNING_KEY_FILE", None)
    PID_PATH.parent.mkdir(parents=True, exist_ok=True)
    PID_PATH.write_text(
        json.dumps({"pid": os.getpid(), "started_at_ms": int(time.time() * 1000)}),
        encoding="utf-8",
    )
    config = uvicorn.Config("app.main:app", host="127.0.0.1", port=base.port or 8879, access_log=False)
    server = uvicorn.Server(config)
    default_handle_exit = server.handle_exit

    def handle_exit(sig, frame) -> None:
        default_handle_exit(sig, frame)
        timer = threading.Timer(3.0, os._exit, args=(0,))
        timer.daemon = True
        timer.start()

    server.handle_exit = handle_exit

    def exit_watchdog() -> None:
        while not server.started and not server.should_exit:
            time.sleep(0.1)
        while (
            not server.should_exit
            and any(listener.is_serving() for listener in server.servers)
        ):
            time.sleep(0.1)
        time.sleep(3.0)
        os._exit(0)

    threading.Thread(target=exit_watchdog, daemon=True).start()
    try:
        server.run()
    finally:
        PID_PATH.unlink(missing_ok=True)
        isolated.cleanup()
        # Windows'ta AnyIO/Psycopg yardımcı thread'leri Uvicorn kapandıktan
        # sonra yorumlayıcıyı canlı tutabiliyor. Bu süreç yalnız E2E sunucusudur.
        os._exit(0)


if __name__ == "__main__":
    main()
