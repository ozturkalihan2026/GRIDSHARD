from __future__ import annotations

import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

from tools.package_release import ROOT, STATIC_SERVER_DATA_FILES, release_files, is_release_input, assert_canonical_migration_bytes


class ReleaseDataBoundaryTests(unittest.TestCase):
    def test_content_source_contract_ships_without_admitting_runtime_data(self) -> None:
        for relative in ("server/data/liveops_content_sources_v1.json", "server/data/first_season_launch_v1.json"):
            self.assertIn(relative, STATIC_SERVER_DATA_FILES)
            self.assertTrue(is_release_input(relative))
            self.assertIn("COPY " + relative + " /app/server/data/", (ROOT / "Dockerfile").read_text())
            for name in (".dockerignore", ".gitignore"):
                self.assertIn("!" + relative, (ROOT / name).read_text())
        self.assertFalse(is_release_input("server/data/liveops_player_entitlements.json"))

    def test_source_package_rejects_checkout_line_ending_changes_to_migrations(self) -> None:
        with tempfile.TemporaryDirectory(prefix="gridshard-migration-bytes-") as temporary:
            root = Path(temporary)
            sql = root / "server/migrations/001_example.sql"
            sql.parent.mkdir(parents=True)
            with patch("tools.package_release.ROOT", root), patch("tools.package_release.subprocess.check_output", return_value=b"SELECT 1;\n"):
                sql.write_bytes(b"SELECT 1;\r\n")
                with self.assertRaisesRegex(ValueError, "Migration bytes differ"):
                    assert_canonical_migration_bytes([sql])
                sql.write_bytes(b"SELECT 1;\n")
                assert_canonical_migration_bytes([sql])

    def test_versioned_system_updates_ship_in_source_and_production_image(self) -> None:
        relative = "server/data/game_updates.json"
        self.assertIn(relative, STATIC_SERVER_DATA_FILES)
        self.assertTrue(is_release_input(relative))
        self.assertIn("COPY " + relative + " /app/server/data/", (ROOT / "Dockerfile").read_text())
        self.assertIn("!" + relative, (ROOT / ".dockerignore").read_text())

    def test_secrets_and_generated_test_outputs_are_excluded_even_if_tracked(self) -> None:
        for path in ("qa_reports/startup-phone.png", "artifacts/app-debug.apk", "deliverables/GRIDSHARD_MAGAZA_2026-11-01.zip",
                     ".mobile-debug/old-identities.json", "deploy/.env.production",
                     "android/signing.jks", "nested/auth.key", "nested/app.p12",
                     "nested/google-services.json", "nested/project-firebase-adminsdk-secret.json",
                     "deploy/google_oauth_client_secret", "deploy/apple_oauth_client_secret", "deploy/play_games_client_secret",
                     "deploy/google_play_service_account.json", "deploy/google_play_wif_config", "deploy/google_play_wif_config.json",
                     "nested/client_secret_123.apps.googleusercontent.com.json", "nested/AuthKey_ABC.p8"):
            self.assertFalse(is_release_input(path), path)
        for path in ("QA_REPORTS/phone.png", "SECRETS/value.txt", "deploy/AUTH_SIGNING_KEY",
                     "deploy/database_url", "deploy/postgres_password", "nested/CERT.PEM",
                     "nested/GOOGLESERVICE-INFO.PLIST", "RELEASE_MANIFEST.JSON"):
            self.assertFalse(is_release_input(path), path)
        for path in ("deploy/Caddyfile", "deploy/Caddyfile.cloudflare", "docker-compose.cloudflare.yml", "deploy/Dockerfile.maintenance",
                     "tools/server_backup.py", "server/migrations/014_economic_operations.sql",
                     "docker-compose.oauth-google.yml", "docker-compose.oauth-apple.yml"):
            self.assertTrue(is_release_input(path), path)

    def test_only_static_arena_data_enters_source_release(self) -> None:
        data_files = {
            path.relative_to(ROOT).as_posix()
            for path in release_files()
            if path.relative_to(ROOT).as_posix().startswith("server/data/")
        }
        self.assertEqual(data_files, STATIC_SERVER_DATA_FILES)

    def test_external_paths_and_tracked_links_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory(prefix="gridshard-release-boundary-") as temporary:
            root = Path(temporary) / "checkout"
            root.mkdir()
            outside = Path(temporary) / "outside.txt"
            outside.write_text("disposable test fixture", encoding="utf-8")
            with patch("tools.package_release.ROOT", root):
                with patch("tools.package_release.subprocess.check_output", return_value=b"../outside.txt\0"):
                    with self.assertRaisesRegex(ValueError, "regular checkout path"):
                        release_files()
                with patch("tools.package_release.subprocess.check_output", return_value=b"linked.txt\0"):
                    # Windows may not grant symlink creation; exercise the
                    # admission guard without requiring that privilege.
                    with patch.object(Path, "is_symlink", return_value=True):
                        with self.assertRaisesRegex(ValueError, "regular checkout path"):
                            release_files()


if __name__ == "__main__":
    unittest.main()
