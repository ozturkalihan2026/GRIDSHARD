from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import threading
import time

import uvicorn


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
PID_PATH = ROOT / "qa_reports" / "e2e-server.pid.json"


def main() -> None:
    PID_PATH.parent.mkdir(parents=True, exist_ok=True)
    PID_PATH.write_text(
        json.dumps({"pid": os.getpid(), "started_at_ms": int(time.time() * 1000)}),
        encoding="utf-8",
    )
    config = uvicorn.Config("app.main:app", host="127.0.0.1", port=8879)
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
        # Windows'ta AnyIO/Psycopg yardımcı thread'leri Uvicorn kapandıktan
        # sonra yorumlayıcıyı canlı tutabiliyor. Bu süreç yalnız E2E sunucusudur.
        os._exit(0)


if __name__ == "__main__":
    main()
