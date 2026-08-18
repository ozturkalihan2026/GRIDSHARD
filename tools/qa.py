from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "qa_reports"
REPORT_PATH = REPORT_DIR / "latest.json"


def run_step(name: str, command: list[str], *, cwd: Path) -> dict:
    started = time.time()
    result = subprocess.run(
        command,
        cwd=cwd,
        text=True,
        capture_output=True,
    )
    return {
        "name": name,
        "ok": result.returncode == 0,
        "returncode": result.returncode,
        "duration_s": round(time.time() - started, 3),
        "stdout": result.stdout[-12000:],
        "stderr": result.stderr[-12000:],
        "command": command,
    }


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def http_get(url: str, *, binary: bool = False):
    with urllib.request.urlopen(url, timeout=3) as response:
        body = response.read()
        return response.status, body if binary else body.decode("utf-8")


def smoke_server() -> dict:
    port = free_port()
    env = os.environ.copy()
    env["RELAY_WEB_TEST_RUN_ID"] = "web-test-beta.6-qa"
    env["RELAY_TELEMETRY_PATH"] = str(ROOT / "server/data/qa_telemetry.json")
    env["RELAY_PLAYER_DATA_PATH"] = str(ROOT / "server/data/qa_players.json")

    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "server.app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
            "--log-level",
            "warning",
        ],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    checks = []
    started = time.time()
    try:
        deadline = time.time() + 15
        while time.time() < deadline:
            try:
                status, _ = http_get(f"http://127.0.0.1:{port}/health")
                if status == 200:
                    break
            except Exception:
                time.sleep(0.2)
        else:
            raise RuntimeError("Uvicorn 15 saniye içinde hazır olmadı.")

        for path in (
            "/",
            "/health",
            "/favicon.ico",
            "/src/app.js",
            "/src/relay-client.js",
            "/src/styles.css",
            "/web-test/preflight",
            "/web-test/launch-readiness",
            "/web-test/operation-status",
        ):
            status, body = http_get(
                f"http://127.0.0.1:{port}{path}",
                binary=(path == "/favicon.ico"),
            )
            checks.append({"path": path, "status": status, "ok": status == 200})
            if status != 200:
                raise RuntimeError(f"HTTP smoke başarısız: {path} -> {status}")
            if path == "/" and isinstance(body, str):
                for required in ("Oyna", "Profil", "İstatistikler", "Ayarlar"):
                    if required not in body:
                        raise RuntimeError(f"Ana sayfada menü eksik: {required}")

        return {
            "name": "uvicorn_http_smoke",
            "ok": True,
            "duration_s": round(time.time() - started, 3),
            "checks": checks,
        }
    except Exception as exc:
        return {
            "name": "uvicorn_http_smoke",
            "ok": False,
            "duration_s": round(time.time() - started, 3),
            "checks": checks,
            "error": str(exc),
        }
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=2)
        for p in (ROOT / "server/data").glob("qa_*.json*"):
            p.unlink(missing_ok=True)


def main() -> int:
    REPORT_DIR.mkdir(exist_ok=True)
    steps = [
        run_step(
            "server_pytest",
            [sys.executable, "-m", "pytest", "-q"],
            cwd=ROOT / "server",
        ),
        run_step(
            "client_syntax_app",
            ["node", "--check", "src/app.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_syntax_runtime",
            ["node", "--check", "src/relay-client.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_unit_tests",
            ["node", "tests/relay-client.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_startup_menu_test",
            ["node", "tests/app-startup.test.js"],
            cwd=ROOT / "client",
        ),
    ]

    if all(step["ok"] for step in steps):
        steps.append(smoke_server())

    report = {
        "project": "Project Relay 2.0",
        "version": "2.0.0-beta.6",
        "generated_at_epoch": int(time.time()),
        "ok": all(step["ok"] for step in steps),
        "steps": steps,
        "note": (
            "Playwright gerçek tarayıcı E2E testi bu zincire zorunlu eklenmedi; "
            "çalışma ortamı tarayıcı/localhost politikasına bağlıdır. Startup VM testi, "
            "menü handler bağlama hatalarını CI-benzeri biçimde yakalar."
        ),
    }
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\nProject Relay QA")
    print("=" * 60)
    for step in steps:
        print(f"[{'OK' if step['ok'] else 'FAIL'}] {step['name']} ({step.get('duration_s', 0)} sn)")
        if not step["ok"]:
            if step.get("error"):
                print("  ", step["error"])
            if step.get("stderr"):
                print(step["stderr"][-2000:])
    print("=" * 60)
    print(f"Rapor: {REPORT_PATH}")
    print("SONUÇ:", "BAŞARILI" if report["ok"] else "BAŞARISIZ")
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
