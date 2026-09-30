from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class RuntimeModeGuardTests(unittest.TestCase):
    def _import_main(self, mode: str, overrides: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env["GRIDSHARD_RUNTIME_MODE"] = mode
        env.pop("DATABASE_URL", None)
        env.pop("REDIS_URL", None)
        env.pop("GRIDSHARD_AUTH_SIGNING_KEY", None)
        env.update(overrides or {})
        return subprocess.run(
            [sys.executable, "-c", "import server.app.main"],
            cwd=ROOT,
            env=env,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_unknown_mode_does_not_fall_back_to_development(self) -> None:
        result = self._import_main("prod")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("GRIDSHARD_RUNTIME_MODE yalnız", result.stderr)

    def test_production_requires_postgres(self) -> None:
        result = self._import_main("production")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("DATABASE_URL zorunludur", result.stderr)

    def test_production_rejects_compose_example_database_password(self) -> None:
        result = self._import_main("production", {
            "DATABASE_URL": "postgresql://gridshard:gridshard-local-only@postgres:5432/gridshard",
            "REDIS_URL": "redis://127.0.0.1:6379/0",
            "GRIDSHARD_AUTH_SIGNING_KEY": "test-only-signing-key-more-than-32-characters",
            "GRIDSHARD_RUNTIME_DATA_DIR": "D:/dedicated-gridshard-runtime",
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("örnek PostgreSQL parolası", result.stderr)

    def test_production_requires_dedicated_runtime_directory(self) -> None:
        result = self._import_main("production", {
            "DATABASE_URL": "postgresql://unused:unused@127.0.0.1:5432/unused",
            "REDIS_URL": "redis://127.0.0.1:6379/0",
            "GRIDSHARD_AUTH_SIGNING_KEY": "test-only-signing-key-more-than-32-characters",
            "GRIDSHARD_RUNTIME_DATA_DIR": "",
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("GRIDSHARD_RUNTIME_DATA_DIR zorunludur", result.stderr)


if __name__ == "__main__":
    unittest.main()
