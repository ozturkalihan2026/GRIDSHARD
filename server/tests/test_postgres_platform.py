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
