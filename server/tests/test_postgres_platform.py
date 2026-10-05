"""Synthetic PostgreSQL document behavior; no runtime JSON or DB opened."""

from copy import deepcopy

import pytest

from app.postgres_platform import PostgresPlatformService


class _Rows:
    def __init__(self, value=None):
        self.value = value

    def fetchone(self):
        return self.value


class _Connection:
    def __init__(self):
        self.state = None
        self.committed = None
        self.lock_count = 0

    def __enter__(self):
        self.committed = deepcopy(self.state)
        return self

    def __exit__(self, exc_type, *_args):
        if exc_type is not None:
            self.state = self.committed
        return False

    def execute(self, statement, parameters=None):
        if statement.startswith("INSERT INTO platform_document"):
            if self.state is None:
                self.state = {}
            return _Rows()
        if "FOR UPDATE" in statement:
            self.lock_count += 1
            return _Rows((deepcopy(self.state),))
        if statement.startswith("SELECT state"):
            return _Rows((deepcopy(self.state),))
        if statement.startswith("UPDATE platform_document"):
            self.state = deepcopy(parameters[0].obj)
            return _Rows()
        raise AssertionError(statement)


class _Pool:
    def __init__(self):
        self.connection_value = _Connection()

    def connection(self):
        return self.connection_value


def test_platform_operations_use_postgres_document_without_creating_a_file(tmp_path):
    pool = _Pool()
    source_path = tmp_path / "platform_state.json"
    service = PostgresPlatformService(pool, path=source_path)

    assert service.token_is_revoked("one", "token") is False
    assert service.set_block("one", "two", True) == ["two"]
    assert service.is_blocked("one", "two") is True
    assert pool.connection_value.state["accounts"]["one"]["blocked_player_ids"] == ["two"]
    assert not source_path.exists()


def test_platform_document_nested_lock_and_failure_roll_back(tmp_path):
    pool = _Pool()
    service = PostgresPlatformService(pool, path=tmp_path / "unused.json")
    with service._lock:
        service.set_block("one", "two", True)
    assert pool.connection_value.lock_count == 1
    with pytest.raises(RuntimeError):
        with service._lock:
            service.set_block("one", "three", True)
            raise RuntimeError("abort")
    assert service.is_blocked("one", "three") is False


def test_social_block_mirror_uses_complete_lists_and_preserves_account_fields(tmp_path):
    pool = _Pool()
    service = PostgresPlatformService(pool, path=tmp_path / "unused.json")
    with service._lock:
        data = service._read()
        account = service._account(data, "one")
        account["oauth_links"] = {"google": {"subject": "unchanged"}}
        service._write(data)
        service.sync_social_blocks({"one": ["two", "two", "three"], "two": []})
    assert pool.connection_value.state["accounts"]["one"]["blocked_player_ids"] == ["three", "two"]
    assert pool.connection_value.state["accounts"]["one"]["oauth_links"] == {"google": {"subject": "unchanged"}}
    service.sync_social_blocks({"one": []})
    assert service.is_blocked("one", "two") is False


def test_recovery_uses_postgres_document_and_releases_lock_before_provider_io(tmp_path, monkeypatch):
    from app import platform_services
    from app.native_oauth import pkce_challenge
    monkeypatch.setenv("GRIDSHARD_PLAY_GAMES_ID", "123456789")
    monkeypatch.setenv("GRIDSHARD_PLAY_GAMES_SERVER_CLIENT_ID", "123456789-fixture.apps.googleusercontent.com")
    monkeypatch.setenv("GRIDSHARD_PLAY_GAMES_CLIENT_SECRET", "fixture-secret")
    monkeypatch.delenv("GRIDSHARD_PLAY_GAMES_CLIENT_SECRET_FILE", raising=False)
    pool = _Pool()
    path = tmp_path / "never-written.json"
    service = PostgresPlatformService(pool, path=path)
    with service._lock:
        data = service._read()
        service._account(data, "original")["oauth_links"]["google_play_games"] = {"subject":"verified-fixture"}
        service._write(data)
    before = deepcopy(pool.connection_value.state["accounts"])
    def verified(*_args):
        assert service._lock.state.depth == 0, "No PostgreSQL lock spans Google network I/O"
        return "verified-fixture"
    monkeypatch.setattr(platform_services, "play_games_subject", verified)
    verifier = "a" * 64
    started = service.start_play_games_recovery("original", pkce_challenge(verifier))
    result = service.complete_play_games_recovery(started["state"], "fixture-code", verifier)
    assert service.consume_oauth_exchange(result["exchange"], code_verifier=verifier) == {
        "player_id":"original", "provider":"google_play_games", "recovery":True}
    assert pool.connection_value.state["accounts"] == before
    assert not path.exists()
