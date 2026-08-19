from pathlib import Path
import subprocess
import sys


def test_release_guard_accepts_beta17_source_tree():
    root=Path(__file__).resolve().parents[2]
    result=subprocess.run(
        [
            sys.executable,
            "tools/release_guard.py",
        ],
        cwd=root,
        text=True,
        capture_output=True,
    )

    assert result.returncode==0
    assert (
        "Kaynak bütünlüğü doğrulandı"
        in result.stdout
    )
    assert "dict telemetri uyumlu" in result.stdout
