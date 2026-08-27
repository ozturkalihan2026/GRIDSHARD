from __future__ import annotations

import json
import os
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "qa_reports"
REPORT_PATH = REPORT_DIR / "latest.json"
NODE_EXECUTABLE = os.environ.get("GRIDSHARD_NODE") or shutil.which("node") or "node"


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


def http_post(url: str):
    request = urllib.request.Request(
        url,
        data=b"",
        method="POST",
    )
    with urllib.request.urlopen(
        request,
        timeout=5,
    ) as response:
        return response.status


def smoke_server() -> dict:
    port = free_port()
    env = os.environ.copy()
    env["RELAY_WEB_TEST_RUN_ID"] = "web-test-beta.34-qa"
    env["RELAY_TELEMETRY_PATH"] = str(ROOT / "server/data/qa_telemetry.json")
    env["RELAY_PLAYER_DATA_PATH"] = str(ROOT / "server/data/qa_players.json")
    env["RELAY_BATTLE_POOL_PRESET_PATH"] = str(
        ROOT / "server/data/qa_battle_pool_presets.json"
    )
    env["RELAY_BALANCE_CHANGE_DRAFT_PATH"] = str(
        ROOT / "server/data/qa_balance_change_drafts.json"
    )

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
            "/src/i18n.js",
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

        audit_urls = [
            (
                f"http://127.0.0.1:{port}"
                + (
                    "/web-test/audit/operation-snapshot"
                    if index % 2 == 0
                    else "/web-test/audit/stability-snapshot"
                )
            )
            for index in range(24)
        ]

        with ThreadPoolExecutor(
            max_workers=12
        ) as executor:
            audit_statuses = list(
                executor.map(
                    http_post,
                    audit_urls,
                )
            )

        if any(
            status != 200
            for status
            in audit_statuses
        ):
            raise RuntimeError(
                "Eşzamanlı telemetri audit smoke testinde 200 dışı yanıt oluştu."
            )

        checks.append({
            "path":
                "concurrent_audit_snapshots",
            "status":200,
            "ok":True,
            "requests":
                len(audit_statuses),
        })

        status, body = http_get(
            f"http://127.0.0.1:{port}"
            "/telemetry/manual-battle-report"
            "?player_id=qa-smoke"
        )
        if status != 200:
            raise RuntimeError(
                "Manuel savaş raporu smoke testi 200 dönmedi."
            )
        manual_report = json.loads(body)
        checks.append({
            "path":
                "/telemetry/manual-battle-report"
                "?player_id=qa-smoke",
            "status":status,
            "ok":
                isinstance(
                    manual_report,
                    dict,
                )
                and "battle_count"
                in manual_report,
        })
        if not checks[-1]["ok"]:
            raise RuntimeError(
                "Manuel savaş raporu smoke cevabı geçersiz."
            )

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
    # Temiz kaynak paketinde .pytest_cache bulunmaz. Pytest --basetemp hedefi
    # alt klasörü oluşturabilir ancak Windows'ta eksik üst klasörü oluşturmaz.
    (ROOT / ".pytest_cache").mkdir(exist_ok=True)
    steps = [
        run_step(
            "release_guard",
            [
                sys.executable,
                "tools/release_guard.py",
            ],
            cwd=ROOT,
        ),
        run_step(
            "server_pytest",
            [
                sys.executable,
                "-m",
                "pytest",
                "-q",
                "-p",
                "no:cacheprovider",
                "--basetemp",
                str(ROOT / ".pytest_cache" / "qa"),
            ],
            cwd=ROOT / "server",
        ),
        run_step(
            "client_syntax_app",
            [NODE_EXECUTABLE, "--check", "src/app.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_syntax_runtime",
            [NODE_EXECUTABLE, "--check", "src/relay-client.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_syntax_audio",
            [NODE_EXECUTABLE, "--check", "src/gridshard-audio.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_syntax_i18n",
            [NODE_EXECUTABLE, "--check", "src/i18n.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_audio_tests",
            [NODE_EXECUTABLE, "tests/gridshard-audio.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_audio_browser_lifecycle",
            [NODE_EXECUTABLE, "tests/gridshard-audio-browser-lifecycle.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_audio_webaudio_loop",
            [NODE_EXECUTABLE, "tests/gridshard-audio-webaudio-loop.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_beta34_experience",
            [NODE_EXECUTABLE, "tests/beta34-experience.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_beta35_experience",
            [NODE_EXECUTABLE, "tests/beta35-experience.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_beta36_experience",
            [NODE_EXECUTABLE, "tests/beta36-experience.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_beta37_experience",
            [NODE_EXECUTABLE, "tests/beta37-experience.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_unit_tests",
            [NODE_EXECUTABLE, "tests/relay-client.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_i18n_tests",
            [NODE_EXECUTABLE, "tests/i18n.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_startup_menu_test",
            [NODE_EXECUTABLE, "tests/app-startup.test.js"],
            cwd=ROOT / "client",
        ),
        run_step(
            "client_component_tests",
            [NODE_EXECUTABLE, "--test", "tests/frontend-components.test.js"],
            cwd=ROOT / "client",
        ),
    ]

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "audio_bs1770_optional_scan",
                [
                    sys.executable,
                    "tools/audio_lufs_scan.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "beta25_energy_port_regression",
                [
                    sys.executable,
                    "tools/beta24_energy_port_report.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "beta33_acceptance_report",
                [
                    sys.executable,
                    "tools/beta33_acceptance_report.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "beta34_acceptance_report",
                [
                    sys.executable,
                    "tools/beta34_acceptance_report.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "beta35_acceptance_report",
                [
                    sys.executable,
                    "tools/beta35_acceptance_report.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "beta36_acceptance_report",
                [
                    sys.executable,
                    "tools/beta36_acceptance_report.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "beta37_balance_report",
                [
                    sys.executable,
                    "tools/beta37_balance_report.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "beta37_acceptance_report",
                [
                    sys.executable,
                    "tools/beta37_acceptance_report.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "browser_e2e_evidence_summary",
                [
                    sys.executable,
                    "tools/browser_e2e_evidence.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "browser_e2e_history",
                [
                    sys.executable,
                    "tools/browser_e2e_history.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "ux_interaction_matrix",
                [
                    sys.executable,
                    "tools/ux_interaction_matrix.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(
            run_step(
                "ux_performance_observation",
                [
                    sys.executable,
                    "tools/ux_performance_thresholds.py",
                ],
                cwd=ROOT,
            )
        )

    if all(step["ok"] for step in steps):
        steps.append(smoke_server())

    imported_windows_e2e_path=(
        ROOT
        / "qa_reports"
        / "imported_browser_e2e.json"
    )
    if imported_windows_e2e_path.exists():
        try:
            imported_windows_e2e=json.loads(
                imported_windows_e2e_path
                .read_text(
                    encoding="utf-8"
                )
            )
        except Exception as exc:
            imported_windows_e2e={
                "status":"INVALID",
                "verified_passed":False,
                "reason":str(exc),
            }
    else:
        imported_windows_e2e={
            "status":"NOT_IMPORTED",
            "verified_passed":False,
            "reason":
                "Gerçek Windows/Chrome E2E kanıt paketi henüz içe aktarılmadı.",
        }

    report = {
        "project": "GRIDSHARD 2.0",
        "version": "2.0.0-beta.37",
        "generated_at_epoch": int(time.time()),
        "ok": all(step["ok"] for step in steps),
        "steps": steps,
        "external_windows_browser_e2e":
            imported_windows_e2e,
        "note": (
            "Gerçek tarayıcı E2E ayrı tools/browser_e2e.py koşucusudur; "
            "PASSED yalnız eksiksiz artifact + başarılı checks ile kabul edilir. "
            "Windows kanıt içe aktarımı latest.json içinde ayrı external_windows_browser_e2e alanında raporlanır. "
            "Zorunlu QA: server, client, audio lifecycle, teknik raporlar, startup ve HTTP smoke."
        ),
    }
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\nGRIDSHARD QA")
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
