"""Repository calls in one economy action share the same database transaction."""

from contextlib import contextmanager
from threading import local

import pytest

from app.postgres_repository import PostgresPool


class _FakeConnection:
    def __init__(self):
        self.values = []
        self.committed = []

    def append(self, value):
        self.values.append(value)


class _FakePool:
    def __init__(self):
        self.connections = []

    @contextmanager
    def connection(self):
        connection = _FakeConnection()
        self.connections.append(connection)
        try:
            yield connection
        except BaseException:
            raise
        else:
            connection.committed = list(connection.values)


def _repository_pool():
    database = object.__new__(PostgresPool)
    database.pool = _FakePool()
    database._opened = True
    database._transaction_state = local()
    return database


def test_repository_connections_share_outer_transaction():
    database = _repository_pool()
    with database.transaction() as outer:
        with database.connection() as player:
            player.append("profile")
        with database.connection() as ledger:
            ledger.append("receipt")
        assert player is ledger is outer
        assert outer.committed == []
    assert outer.committed == ["profile", "receipt"]
    assert len(database.pool.connections) == 1


def test_failed_store_action_rolls_back_both_writes_and_unbinds_connection():
    database = _repository_pool()
    with pytest.raises(RuntimeError, match="ledger failed"):
        with database.transaction():
            with database.connection() as player:
                player.append("profile")
            with database.connection() as ledger:
                ledger.append("receipt")
                raise RuntimeError("ledger failed")
    assert player.committed == []
    with database.connection() as subsequent:
        assert subsequent is not player
    assert len(database.pool.connections) == 2


def test_nested_transaction_is_rejected():
    database = _repository_pool()
    with database.transaction():
        with pytest.raises(RuntimeError, match="İç içe"):
            with database.transaction():
                pass
