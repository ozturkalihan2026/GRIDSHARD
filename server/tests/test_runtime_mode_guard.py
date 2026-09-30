from __future__ import annotations

import os
import subprocess
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class RuntimeModeGuardTests(unittest.TestCase):
    def _import_main(self, mode: str) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env["GRIDSHARD_RUNTIME_MODE"] = mode
        env.pop("DATABASE_URL", None)
        env.pop("REDIS_URL", None)
        env.pop("GRIDSHARD_AUTH_SIGNING_KEY", None)
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


if __name__ == "__main__":
    unittest.main()
