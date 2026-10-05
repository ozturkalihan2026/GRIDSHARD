"""Bounded Linux backup retention operator. Dry-run by default; no recursive deletion.

Only the CLI's fixed production root is eligible. Verification lists archives,
never restores them, and reads only the live installation identifier.
"""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess
from uuid import UUID

ROOT = Path("/var/backups/gridshard-production")
LOCK = Path("/run/gridshard-backup-retention/operator.lock")
STAGING = ".retention-staging"
CONFIRMATION = "DELETE_VERIFIED_GRIDSHARD_BACKUPS_AFTER_30_DAYS"
DAYS = 30
MAX_BACKUPS = 100
MAX_ARCHIVE_BYTES = 10 * 1024 ** 3
BACKUP_UIDS = {0, 10001}
FILES = {"backup.json", "database.dump"}
NAME = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]{0,159}\Z")


class RetentionError(RuntimeError):
    """Codes contain no personal data, metadata contents or upstream errors."""


def fingerprint(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_nlink,
            info.st_mode, info.st_uid, info.st_gid, info.st_mtime_ns, info.st_ctime_ns)


def same_directory(info):
    return (info.st_dev, info.st_ino)


def secure_info(info, *, directory=False, root_owned=False, manifest=False):
    kind = stat.S_ISDIR if directory else stat.S_ISREG
    modes = {0o700} if directory else ({0o600, 0o644} if manifest else {0o600})
    if (not kind(info.st_mode) or stat.S_IMODE(info.st_mode) not in modes
        or info.st_uid not in ({0} if root_owned else BACKUP_UIDS)
        or (not directory and info.st_nlink != 1)):
        raise RetentionError("unsafe_type_owner_permissions_or_links")


def open_directory(path, *, parent=None):
    return os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=parent)


def verify_root_component(info, *, final=False):
    if final:
        # Existing backup maintenance writes as UID10001; keep its private root intact.
        secure_info(info, directory=True)
    elif info.st_uid != 0 or stat.S_IMODE(info.st_mode) & 0o022:
        raise RetentionError("untrusted_backup_root_ancestor")


@contextmanager
def production_root():
    # Walk by file descriptor: symlinked ancestors and writable ancestors fail closed.
    fd = open_directory("/")
    try:
        for index, part in enumerate(ROOT.parts[1:]):
            child = open_directory(part, parent=fd)
            os.close(fd)
            fd = child
            info = os.fstat(fd)
            verify_root_component(info, final=index == len(ROOT.parts) - 2)
        yield fd
    finally:
        os.close(fd)


@contextmanager
def exclusive_run():
    import fcntl
    directory = open_directory(str(LOCK.parent))
    try:
        secure_info(os.fstat(directory), directory=True, root_owned=True)
        fd = os.open(LOCK.name, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600, dir_fd=directory)
        try:
            secure_info(os.fstat(fd), root_owned=True)
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as exc:
                raise RetentionError("another_retention_run_is_active") from exc
            yield
        finally:
            os.close(fd)
    finally:
        os.close(directory)


def docker(*args, **kwargs):
    # Do not inherit a remote DOCKER_HOST or run a shell with archive metadata.
    return subprocess.run(["/usr/bin/docker", "--host", "unix:///var/run/docker.sock", *args],
                          stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=30, **kwargs)


def live_installation_hash():
    code = """import hashlib,os,sys
sys.path.insert(0,'/app/server')
import psycopg
from app.production_config import environment_secret
url=environment_secret('DATABASE_URL',os.environ)
with psycopg.connect(url,options='-c default_transaction_read_only=on',autocommit=True) as connection:
    row=connection.execute('SELECT installation_id FROM server_installation WHERE singleton=TRUE').fetchone()
    print(hashlib.sha256(str(row[0]).encode()).hexdigest())
"""
    result = docker("exec", "-i", "gridshard-production-relay-web-1", "python", "-", input=code.encode())
    value = result.stdout.decode("ascii", errors="replace").strip()
    if result.returncode or not re.fullmatch(r"[0-9a-f]{64}", value):
        raise RetentionError("live_installation_read_only_check_failed")
    return value


def archive_is_readable(handle):
    result = subprocess.run(["/usr/bin/docker", "--host", "unix:///var/run/docker.sock",
        "exec", "-i", "gridshard-production-postgres-1", "pg_restore", "--list"],
        stdin=handle, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
    return result.returncode == 0


@dataclass(frozen=True)
class Backup:
    name: str
    created: datetime
    directory: tuple
    manifest: tuple
    archive: tuple
    digest: str


def read_backup(root_fd, name, installation, now, verify_archive=archive_is_readable):
    if not NAME.fullmatch(name):
        raise RetentionError("unexpected_backup_name")
    directory = open_directory(name, parent=root_fd)
    try:
        start = os.fstat(directory)
        secure_info(start, directory=True)
        if start.st_dev != os.fstat(root_fd).st_dev or set(os.listdir(directory)) != FILES:
            raise RetentionError("unexpected_contents_or_mount")
        manifest_fd = os.open("backup.json", os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        with os.fdopen(manifest_fd, "rb") as handle:
            info = os.fstat(handle.fileno())
            secure_info(info, manifest=True)
            if info.st_size > 262144:
                raise RetentionError("manifest_limit")
            manifest = json.loads(handle.read(262145))
            if fingerprint(info) != fingerprint(os.fstat(handle.fileno())):
                raise RetentionError("manifest_changed")
            manifest_stamp = fingerprint(info)
        if not isinstance(manifest, dict) or type(manifest.get("format")) is not int or manifest["format"] != 1:
            raise RetentionError("unsupported_backup_format")
        identity = str(UUID(manifest["installation_id"]))
        if hashlib.sha256(identity.encode()).hexdigest() != installation:
            raise RetentionError("different_installation")
        created = datetime.fromisoformat(manifest["created_at"].replace("Z", "+00:00"))
        if created.tzinfo is None or created > now:
            raise RetentionError("invalid_creation_time")
        expected = manifest["archive_sha256"]
        if not isinstance(expected, str) or not re.fullmatch(r"[0-9a-f]{64}", expected):
            raise RetentionError("invalid_archive_digest")
        archive_fd = os.open("database.dump", os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory)
        with os.fdopen(archive_fd, "rb") as handle:
            info = os.fstat(handle.fileno())
            secure_info(info)
            if info.st_size < 5 or info.st_size > MAX_ARCHIVE_BYTES or handle.read(5) != b"PGDMP":
                raise RetentionError("invalid_archive_format_or_size")
            handle.seek(0)
            digest = hashlib.file_digest(handle, "sha256").hexdigest()
            if digest != expected:
                raise RetentionError("archive_digest_mismatch")
            handle.seek(0)
            if not verify_archive(handle):
                raise RetentionError("archive_listing_failed")
            if fingerprint(info) != fingerprint(os.fstat(handle.fileno())):
                raise RetentionError("archive_changed")
            archive_stamp = fingerprint(info)
        if fingerprint(start) != fingerprint(os.fstat(directory)):
            raise RetentionError("directory_changed")
        if same_directory(start) != same_directory(os.stat(name, dir_fd=root_fd, follow_symlinks=False)):
            raise RetentionError("directory_replaced")
        return Backup(name, created, fingerprint(start), manifest_stamp, archive_stamp, digest)
    finally:
        os.close(directory)


def inventory(root_fd, installation, now, verify_archive=archive_is_readable):
    names = os.listdir(root_fd)
    if STAGING in names:
        staged = open_directory(STAGING, parent=root_fd)
        try:
            secure_info(os.fstat(staged), directory=True, root_owned=True)
            if os.listdir(staged):
                raise RetentionError("incomplete_prior_purge_requires_operator_review")
        finally:
            os.close(staged)
        names.remove(STAGING)
    if not names or len(names) > MAX_BACKUPS:
        raise RetentionError("backup_count_or_limit")
    backups = [read_backup(root_fd, name, installation, now, verify_archive) for name in sorted(names)]
    return backups


def plan(backups, now):
    cutoff = now - timedelta(days=DAYS)
    expired = [entry for entry in backups if entry.created <= cutoff]
    fresh = [entry for entry in backups if entry.created > cutoff]
    if not fresh:
        raise RetentionError("no_unexpired_valid_backup_stop_and_arrange_safe_backup")
    anchor = max(fresh, key=lambda entry:entry.created)
    return expired, anchor


def recheck(root_fd, entry, installation, now, verify_archive):
    if read_backup(root_fd, entry.name, installation, now, verify_archive) != entry:
        raise RetentionError("backup_changed_since_plan")


def purge_one(root_fd, entry, anchor, installation, now, verify_archive=archive_is_readable):
    # Revalidate both the exact target and the retained backup BEFORE moving anything.
    recheck(root_fd, anchor, installation, now, verify_archive)
    if anchor.created <= now - timedelta(days=DAYS) or entry.created > now - timedelta(days=DAYS):
        raise RetentionError("expiry_or_retained_backup_changed")
    recheck(root_fd, entry, installation, now, verify_archive)
    try:
        os.mkdir(STAGING, 0o700, dir_fd=root_fd)
    except FileExistsError:
        pass
    staged = open_directory(STAGING, parent=root_fd)
    try:
        secure_info(os.fstat(staged), directory=True, root_owned=True)
        if os.listdir(staged):
            raise RetentionError("incomplete_prior_purge_requires_operator_review")
        claimed = "purge-" + secrets.token_hex(16)
        os.rename(entry.name, claimed, src_dir_fd=root_fd, dst_dir_fd=staged)
        # Pin the renamed directory and verify again inside private root-owned staging.
        target = open_directory(claimed, parent=staged)
        try:
            if fingerprint(os.fstat(target))[:-1] != entry.directory[:-1] or set(os.listdir(target)) != FILES:
                raise RetentionError("claimed_backup_changed")
            expected = {"backup.json":entry.manifest, "database.dump":entry.archive}
            for name, stamp in expected.items():
                if fingerprint(os.stat(name, dir_fd=target, follow_symlinks=False)) != stamp:
                    raise RetentionError("claimed_file_changed")
            # Never rmtree, traverse children, or follow a link. Only these two verified names.
            for name in ("database.dump", "backup.json"):
                if fingerprint(os.stat(name, dir_fd=target, follow_symlinks=False)) != expected[name]:
                    raise RetentionError("claimed_file_changed")
                os.unlink(name, dir_fd=target)
            if os.listdir(target):
                raise RetentionError("unexpected_post_purge_contents")
        finally:
            os.close(target)
        os.rmdir(claimed, dir_fd=staged)
        os.fsync(staged)
        os.fsync(root_fd)
    finally:
        os.close(staged)


def execute(root_fd, installation, now, *, apply=False, confirmation="", verify_archive=archive_is_readable, clock=None):
    if apply and confirmation != CONFIRMATION:
        raise RetentionError("explicit_deletion_confirmation_required")
    records = inventory(root_fd, installation, now, verify_archive)
    expired, anchor = plan(records, now)
    result = {"ok":True, "dry_run":not apply, "retention_days":DAYS, "valid_backups":len(records),
              "expired_backups":len(expired), "deleted_backups":0, "retained_backups":len(records),
              "youngest_backup_age_days":round((now-anchor.created).total_seconds()/86400, 4)}
    if apply:
        expected_names = {entry.name for entry in records}
        for entry in sorted(expired, key=lambda item:item.created):
            if set(os.listdir(root_fd)) - {STAGING} != expected_names:
                raise RetentionError("backup_inventory_changed_since_plan")
            purge_one(root_fd, entry, anchor, installation, clock() if clock else now, verify_archive)
            result["deleted_backups"] += 1
            result["retained_backups"] -= 1
            expected_names.remove(entry.name)
    return result


def main():
    parser = argparse.ArgumentParser(description="GRIDSHARD fixed-root 30-day backup retention; default dry-run")
    parser.add_argument("--installation-sha256", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--confirmation", default="")
    args = parser.parse_args()
    try:
        if os.name != "posix" or os.geteuid() != 0:
            raise RetentionError("linux_root_operator_required")
        if not re.fullmatch(r"[0-9a-f]{64}", args.installation_sha256):
            raise RetentionError("invalid_installation_hash")
        if args.apply and args.confirmation != CONFIRMATION:
            raise RetentionError("explicit_deletion_confirmation_required")
        if live_installation_hash() != args.installation_sha256:
            raise RetentionError("live_installation_mismatch")
        with exclusive_run(), production_root() as root_fd:
            result = execute(root_fd, args.installation_sha256, datetime.now(timezone.utc),
                             apply=args.apply, confirmation=args.confirmation,
                             clock=lambda:datetime.now(timezone.utc))
        print(json.dumps(result, sort_keys=True))
        return 0
    except (RetentionError, OSError, ValueError, TypeError, KeyError, subprocess.SubprocessError) as error:
        code = str(error) if isinstance(error, RetentionError) else "validation_or_system_failure_details_suppressed"
        print(json.dumps({"ok":False, "error":code, "operator_attention_required":True}, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
