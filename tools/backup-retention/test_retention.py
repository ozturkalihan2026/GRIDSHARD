"""Policy tests are portable; file/descriptor/race tests require Linux root.

All writes/deletes target freshly generated synthetic temporary directories only.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from unittest import TestCase, main, skipUnless
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("gridshard_backup_retention", Path(__file__).with_name("retention.py"))
retention = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = retention
spec.loader.exec_module(retention)
NOW = datetime(2026, 10, 5, 12, tzinfo=timezone.utc)
IDENTITY = "12345678-1234-1234-1234-123456789abc"
INSTALLATION = hashlib.sha256(IDENTITY.encode()).hexdigest()


def record(name, age):
    return retention.Backup(name, NOW - timedelta(days=age), (1, 2), (), (), "a" * 64)


class PolicyTests(TestCase):
    def test_exact_30_day_boundary(self):
        expired, anchor = retention.plan([record("old", 30), record("fresh", 29.999)], NOW)
        self.assertEqual([item.name for item in expired], ["old"])
        self.assertEqual(anchor.name, "fresh")

    def test_no_fresh_backup_stops_instead_of_deleting_last(self):
        for items in ([], [record("old", 30)], [record("one", 31), record("two", 32)]):
            with self.assertRaisesRegex(retention.RetentionError, "no_unexpired"):
                retention.plan(items, NOW)

    def test_newest_valid_backup_is_retained(self):
        expired, anchor = retention.plan([record("older", 91), record("good", 2), record("newest", 1)], NOW)
        self.assertEqual(anchor.name, "newest")
        self.assertEqual([item.name for item in expired], ["older"])

    def test_cli_root_scope_and_no_recursive_delete(self):
        source = Path(retention.__file__).read_text(encoding="utf-8")
        self.assertNotIn('add_argument("--root"', source)
        self.assertNotIn('add_argument("--days"', source)
        self.assertNotIn("shutil.rmtree", source)
        self.assertEqual(retention.ROOT.as_posix(), "/var/backups/gridshard-production")

    def test_existing_private_backup_writer_is_allowed_only_at_final_root(self):
        owner = SimpleNamespace(st_uid=10001, st_mode=0o40700)
        retention.verify_root_component(owner, final=True)
        with self.assertRaisesRegex(retention.RetentionError, "ancestor"):
            retention.verify_root_component(owner)
        for uid, mode in ((1000, 0o40700), (10001, 0o40750), (0, 0o40777)):
            with self.assertRaises(retention.RetentionError):
                retention.verify_root_component(SimpleNamespace(st_uid=uid, st_mode=mode), final=True)


@skipUnless(os.name == "posix" and getattr(os, "geteuid", lambda:1)() == 0, "Linux root descriptor tests")
class FileTests(TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="gridshard-retention-fixture-")
        self.base = Path(self.temp.name)
        self.root = self.base / "backups"
        self.root.mkdir(mode=0o700)
        self.fd = retention.open_directory(str(self.root))
        self.verify = lambda _handle:True  # Explicit synthetic fixture; no pg_restore or DB.
        self.old = self.create("old", 31)
        self.new = self.create("new", 1)

    def tearDown(self):
        os.close(self.fd)
        self.temp.cleanup()  # Only the allocated fixture root; no production paths.

    def create(self, name, age):
        directory = self.root / name
        directory.mkdir(mode=0o700)
        data = b"PGDMP" + b"synthetic-unit-fixture"
        archive = directory / "database.dump"
        archive.write_bytes(data); archive.chmod(0o600)
        manifest = {"format":1, "installation_id":IDENTITY,
            "created_at":(NOW-timedelta(days=age)).isoformat(), "archive_sha256":hashlib.sha256(data).hexdigest()}
        marker = directory / "backup.json"
        marker.write_text(json.dumps(manifest), encoding="utf-8"); marker.chmod(0o600)
        return directory

    def manifest(self, directory, **changes):
        path = directory / "backup.json"
        data = json.loads(path.read_text()); data.update(changes)
        path.write_text(json.dumps(data)); path.chmod(0o600)

    def run_operator(self, apply=False, **kwargs):
        return retention.execute(self.fd, INSTALLATION, NOW, apply=apply,
            confirmation=retention.CONFIRMATION if apply else "", verify_archive=self.verify, **kwargs)

    def test_dry_run_changes_no_backup_or_staging(self):
        before = {str(file.relative_to(self.root)):file.read_bytes() for directory in (self.old,self.new) for file in directory.iterdir()}
        result = self.run_operator()
        self.assertEqual(result["expired_backups"], 1)
        self.assertEqual(result["deleted_backups"], 0)
        self.assertFalse((self.root/retention.STAGING).exists())
        self.assertEqual(before, {str(file.relative_to(self.root)):file.read_bytes() for directory in (self.old,self.new) for file in directory.iterdir()})

    def test_apply_requires_confirmation_before_any_write(self):
        with self.assertRaisesRegex(retention.RetentionError, "confirmation"):
            retention.execute(self.fd, INSTALLATION, NOW, apply=True, verify_archive=self.verify)
        self.assertTrue(self.old.exists())
        self.assertFalse((self.root/retention.STAGING).exists())

    def test_only_expired_two_files_are_deleted_and_recent_backup_is_unchanged(self):
        before = (self.new/"database.dump").read_bytes()
        result = self.run_operator(apply=True)
        self.assertEqual(result["deleted_backups"], 1)
        self.assertFalse(self.old.exists())
        self.assertEqual((self.new/"database.dump").read_bytes(), before)
        self.assertEqual(list((self.root/retention.STAGING).iterdir()), [])

    def test_last_backup_and_all_expired_stop(self):
        self.manifest(self.new, created_at=(NOW-timedelta(days=30)).isoformat())
        with self.assertRaisesRegex(retention.RetentionError, "no_unexpired"):
            self.run_operator(apply=True)
        self.assertTrue(self.old.exists())
        self.assertTrue(self.new.exists())

    def test_foreign_installation_hash_rejects_all_deletion(self):
        self.manifest(self.old, installation_id="22345678-1234-1234-1234-123456789abc")
        with self.assertRaisesRegex(retention.RetentionError, "different_installation"):
            self.run_operator(apply=True)
        self.assertTrue(self.old.exists())

    def test_archive_tampering_or_format_failure_stops(self):
        (self.old/"database.dump").write_bytes(b"PGDMPmodified")
        with self.assertRaisesRegex(retention.RetentionError, "digest_mismatch"):
            self.run_operator(apply=True)
        self.assertTrue(self.old.exists())
        self.assertTrue(self.new.exists())

    def test_pg_restore_list_failure_stops_before_claim(self):
        self.verify = lambda _handle:False
        with self.assertRaisesRegex(retention.RetentionError, "listing_failed"):
            self.run_operator(apply=True)
        self.assertTrue(self.old.exists())
        self.assertFalse((self.root/retention.STAGING).exists())

    def test_timezone_missing_future_or_bad_format_stops(self):
        cases = ({"created_at":"2026-10-01T12:00:00"}, {"created_at":(NOW+timedelta(seconds=1)).isoformat()},
            {"format":True}, {"format":2})
        original = (self.old/"backup.json").read_bytes()
        for changes in cases:
            (self.old/"backup.json").write_bytes(original)
            self.manifest(self.old, **changes)
            with self.assertRaises(retention.RetentionError): self.run_operator(apply=True)
            self.assertTrue(self.old.exists())

    def test_unknown_extra_file_or_partial_archive_stops(self):
        extra = self.old/"unknown.txt"
        extra.write_text("not a backup")
        with self.assertRaisesRegex(retention.RetentionError, "contents"):
            self.run_operator(apply=True)
        extra.unlink()
        (self.old/"backup.json").unlink()
        with self.assertRaisesRegex(retention.RetentionError, "contents"):
            self.run_operator(apply=True)
        self.assertTrue(self.old.exists())

    def test_file_symlink_or_hardlink_is_never_followed_or_deleted(self):
        outside = self.base/"outside"
        outside.write_text("must survive")
        target = self.old/"database.dump"
        target.unlink(); target.symlink_to(outside)
        with self.assertRaises(OSError): self.run_operator(apply=True)
        self.assertEqual(outside.read_text(), "must survive")
        target.unlink(); os.link(outside, target); outside.chmod(0o600)
        with self.assertRaisesRegex(retention.RetentionError, "links"):
            self.run_operator(apply=True)
        self.assertEqual(outside.read_text(), "must survive")

    def test_symlinked_directory_is_never_traversed(self):
        (self.root/"linked").symlink_to(self.base, target_is_directory=True)
        with self.assertRaises(OSError): self.run_operator(apply=True)
        self.assertTrue(self.new.exists())

    def test_changed_target_or_anchor_after_plan_stops(self):
        records = retention.inventory(self.fd, INSTALLATION, NOW, self.verify)
        expired, anchor = retention.plan(records, NOW)
        self.manifest(self.old, created_at=NOW.isoformat())
        with self.assertRaisesRegex(retention.RetentionError, "changed_since_plan"):
            retention.purge_one(self.fd, expired[0], anchor, INSTALLATION, NOW, self.verify)
        self.assertTrue(self.old.exists())
        self.assertFalse((self.root/retention.STAGING).exists())

    def test_retained_backup_expires_during_run_and_blocks_purge(self):
        with self.assertRaisesRegex(retention.RetentionError, "retained_backup_changed"):
            self.run_operator(apply=True, clock=lambda:NOW+timedelta(days=30))
        self.assertTrue(self.old.exists())

    def test_rename_race_keeps_unverified_target_in_private_staging(self):
        actual = os.rename
        def racing(source, destination, **kwargs):
            self.manifest(self.old, created_at=NOW.isoformat())
            actual(source, destination, **kwargs)
        with patch.object(retention.os, "rename", racing):
            with self.assertRaisesRegex(retention.RetentionError, "claimed_file_changed"):
                self.run_operator(apply=True)
        staged = self.root/retention.STAGING
        self.assertEqual(len(list(staged.iterdir())), 1)
        self.assertTrue(next(staged.iterdir()).joinpath("database.dump").exists())
        with self.assertRaisesRegex(retention.RetentionError, "incomplete_prior_purge"):
            self.run_operator(apply=True)
        self.assertTrue(self.new.exists())

    def test_partial_purge_stops_future_jobs_for_review(self):
        actual = os.unlink
        def failure(name, **kwargs):
            if name == "backup.json": raise OSError("synthetic failure")
            return actual(name, **kwargs)
        with patch.object(retention.os, "unlink", failure):
            with self.assertRaises(OSError): self.run_operator(apply=True)
        with self.assertRaisesRegex(retention.RetentionError, "incomplete_prior_purge"):
            self.run_operator(apply=True)
        self.assertTrue(self.new.exists())

    def test_unsafe_permissions_fail_closed(self):
        (self.old/"database.dump").chmod(0o644)
        with self.assertRaisesRegex(retention.RetentionError, "permissions"):
            self.run_operator(apply=True)
        self.assertTrue(self.old.exists())

    def test_root_symlink_and_writable_ancestor_fail_closed(self):
        link = self.base/"root-link"
        link.symlink_to(self.root, target_is_directory=True)
        with patch.object(retention, "ROOT", link):
            with self.assertRaises((retention.RetentionError, OSError)):
                with retention.production_root(): self.fail("must not open")


if __name__ == "__main__":
    main(verbosity=2)
