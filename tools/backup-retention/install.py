"""Install/activate only the approved retention operator; never restart game services.

Run from a pinned-SSH uploaded private staging directory. Installation never
overwrites existing targets; resume can repair only the explicitly pinned prior
operator while its job/timer are inactive. Activation follows dry-run verification.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import stat
import subprocess

LIB = Path("/usr/local/lib/gridshard-backup-retention")
CONF = Path("/etc/gridshard-backup-retention.conf")
SERVICE = "gridshard-backup-retention.service"
TIMER = "gridshard-backup-retention.timer"
UNIT_ROOT = Path("/etc/systemd/system")
RUNTIME = Path("/run/gridshard-backup-retention")
SOURCES = ("retention.py", SERVICE, TIMER, "retention-approved.conf")


def run(*args, timeout=60):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError("operator_command_failed_details_suppressed")
    return result.stdout.strip()


def directory(path, mode, create=False):
    if create:
        try: path.mkdir(mode=mode)
        except FileExistsError: pass
    info = path.lstat()
    if (not stat.S_ISDIR(info.st_mode) or info.st_uid != 0
        or stat.S_IMODE(info.st_mode) != mode or path.resolve() != path):
        raise RuntimeError("untrusted_operator_directory")


def staged_files(stage, hashes):
    if (not stage.is_absolute() or stage.parent != Path("/tmp")
        or not re.fullmatch(r"gridshard-retention-install\.[A-Za-z0-9]{8}", stage.name)
        or stage.resolve() != stage or not stat.S_ISDIR(stage.lstat().st_mode)
        or stat.S_IMODE(stage.lstat().st_mode) != 0o700):
        raise RuntimeError("invalid_private_staging_directory")
    content = {}
    for name, expected in zip(SOURCES, hashes):
        path = stage/name
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_size > 262144:
            raise RuntimeError("invalid_staged_file")
        value = path.read_bytes()
        if hashlib.sha256(value).hexdigest() != expected:
            raise RuntimeError("staged_source_digest_mismatch")
        content[name] = value
    match = re.fullmatch(rb"GRIDSHARD_BACKUP_INSTALLATION_SHA256=([0-9a-f]{64})\r?\n"
        rb"GRIDSHARD_BACKUP_RETENTION_CONFIRMATION=DELETE_VERIFIED_GRIDSHARD_BACKUPS_AFTER_30_DAYS\r?\n?",
        content["retention-approved.conf"])
    if not match:
        raise RuntimeError("configuration_scope_or_confirmation_invalid")
    return content, match[1].decode()


def copy_new(path, content, mode):
    # O_EXCL avoids overwriting any old operator or unrelated target after preflight.
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    with os.fdopen(fd, "wb") as handle:
        handle.write(content); handle.flush(); os.fsync(handle.fileno())
    info = path.lstat()
    if info.st_uid != 0 or stat.S_IMODE(info.st_mode) != mode or path.read_bytes() != content:
        raise RuntimeError("installed_file_validation_failed")


def live_services():
    names = ("gridshard-production-relay-web-1", "gridshard-production-caddy-1",
             "gridshard-production-postgres-1", "gridshard-production-redis-1")
    result = {}
    for name in names:
        values = run("/usr/bin/docker", "--host", "unix:///var/run/docker.sock", "inspect", "--format",
            "{{.Id}} {{.RestartCount}} {{.State.Running}} {{.State.StartedAt}} {{.Image}}", name).split()
        if len(values) != 5 or values[2] != "true":
            raise RuntimeError("existing_game_service_not_running")
        result[name] = {"id":values[0], "restart_count":int(values[1]), "running":True,
                        "started_at":values[3], "image":values[4]}
    return result


def properties(unit):
    text = run("/usr/bin/systemctl", "show", unit, "--no-pager", "-p", "ActiveState", "-p", "SubState",
        "-p", "Result", "-p", "ExecMainStatus", "-p", "UnitFileState", "-p", "NextElapseUSecRealtime")
    return dict(line.split("=", 1) for line in text.splitlines() if "=" in line)


def operator_result():
    text = run("/usr/bin/journalctl", "-u", SERVICE, "-n", "30", "--no-pager", "-o", "cat")
    messages = []
    for line in text.splitlines():
        try: value = json.loads(line)
        except ValueError: continue
        if isinstance(value, dict) and "retention_days" in value: messages.append(value)
    if not messages or messages[-1].get("ok") is not True or messages[-1].get("dry_run") is not False:
        raise RuntimeError("successful_active_operator_receipt_missing")
    return messages[-1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=("install", "resume", "activate", "verify"))
    parser.add_argument("--stage", required=True)
    parser.add_argument("--hashes", nargs=4, required=True)
    parser.add_argument("--previous-operator-sha256")
    args = parser.parse_args()
    try:
        if os.geteuid() != 0: raise RuntimeError("root_operator_required")
        stage = Path(args.stage)
        content, installation = staged_files(stage, args.hashes)
        before = live_services()
        result = {"phase":args.phase}
        targets = ((LIB/"retention.py", "retention.py", 0o500),
            (UNIT_ROOT/SERVICE, SERVICE, 0o644), (UNIT_ROOT/TIMER, TIMER, 0o644),
            (CONF, "retention-approved.conf", 0o600))
        if args.phase in {"install", "resume"}:
            directory(UNIT_ROOT, 0o755)
            if args.phase == "install":
                if any(path.exists() or path.is_symlink() for path, _, _ in targets) or LIB.exists() or LIB.is_symlink():
                    raise RuntimeError("existing_retention_targets_require_review_no_overwrite")
                directory(LIB, 0o700, create=True)
                for path, name, mode in targets: copy_new(path, content[name], mode)
            else:
                directory(LIB, 0o700)
                for path, name, mode in targets:
                    info = path.lstat()
                    if (not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_nlink != 1
                        or stat.S_IMODE(info.st_mode) != mode):
                        raise RuntimeError("existing_operator_permissions_changed")
                    existing = path.read_bytes()
                    if existing == content[name]: continue
                    if (name != "retention.py" or not args.previous_operator_sha256
                        or hashlib.sha256(existing).hexdigest() != args.previous_operator_sha256):
                        raise RuntimeError("existing_retention_targets_require_review_no_overwrite")
                    state = subprocess.run(["/usr/bin/systemctl", "is-active", SERVICE], capture_output=True, text=True)
                    enabled = subprocess.run(["/usr/bin/systemctl", "is-enabled", TIMER], capture_output=True, text=True)
                    if state.stdout.strip() in {"active", "activating"} or enabled.returncode == 0:
                        raise RuntimeError("refuse_operator_repair_while_timer_or_service_active")
                    candidate = LIB/("retention.py.pending-"+secrets.token_hex(16))
                    copy_new(candidate, content[name], mode)
                    os.replace(candidate, path)
                    result["repaired_known_owned_operator"] = True
            directory(RUNTIME, 0o700, create=True)
            output = run("/usr/bin/python3", "-B", str(LIB/"retention.py"), "--installation-sha256", installation)
            result["dry_run"] = json.loads(output)
            if result["dry_run"].get("ok") is not True or result["dry_run"].get("dry_run") is not True:
                raise RuntimeError("dry_run_failed")
            run("/usr/bin/systemd-analyze", "verify", str(UNIT_ROOT/SERVICE), str(UNIT_ROOT/TIMER))
            result["calendar"] = run("/usr/bin/systemd-analyze", "calendar", "*-*-* 04:00:00 Europe/Istanbul")
        else:
            for path, name, mode in targets:
                info = path.lstat()
                if (not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_nlink != 1
                    or stat.S_IMODE(info.st_mode) != mode or path.read_bytes() != content[name]):
                    raise RuntimeError("installed_operator_or_scope_changed")
            if args.phase == "activate":
                run("/usr/bin/systemctl", "daemon-reload")
                run("/usr/bin/systemctl", "start", SERVICE)
                props = properties(SERVICE)
                if props.get("Result") != "success" or props.get("ExecMainStatus") != "0":
                    raise RuntimeError("first_retention_job_failed_timer_not_enabled")
                result["first_run"] = operator_result()
                run("/usr/bin/systemctl", "enable", "--now", TIMER)
            else:
                result["latest_run"] = operator_result()
            result["service"] = properties(SERVICE)
            result["timer"] = properties(TIMER)
            if result["timer"].get("ActiveState") != "active" or result["timer"].get("UnitFileState") != "enabled":
                raise RuntimeError("timer_not_active_and_enabled")
        after = live_services()
        result["game_services_unchanged"] = before == after
        if before != after: raise RuntimeError("game_service_baseline_changed_operator_review_required")
        result["game_service_baseline"] = after
        result["installed_hashes"] = {name:hashlib.sha256(content[name]).hexdigest() for name in SOURCES}
        result["ok"] = True
        print(json.dumps(result, sort_keys=True))
        return 0
    except (RuntimeError, OSError, ValueError, subprocess.SubprocessError) as error:
        code = str(error) if isinstance(error, RuntimeError) else "installer_failure_details_suppressed"
        print(json.dumps({"ok":False, "error":code, "operator_attention_required":True}))
        return 2


if __name__ == "__main__": raise SystemExit(main())
