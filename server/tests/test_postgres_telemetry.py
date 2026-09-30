"""Synthetic bounded telemetry and failed-write recovery."""

from copy import deepcopy

import pytest

from app.postgres_telemetry import PostgresTelemetryRepository
from app.telemetry import InMemoryTelemetryService, TelemetryEvent


class _Rows:
    def __init__(self, row=None, rows=None):
        self.row = row
        self.rows = rows or []

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows


class _Connection:
    def __init__(self):
        self.rows = []
        self.sequence = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, statement, parameters=None):
        if statement.startswith("SELECT event_id"):
            newest = sorted(self.rows, key=lambda item: item[0], reverse=True)[:parameters[0]]
            return _Rows(rows=[row[1:] for row in newest])
        if statement.startswith("INSERT INTO telemetry_events"):
            if not any(row[1] == parameters[0] for row in self.rows):
                self.sequence += 1
                self.rows.append((self.sequence, *parameters[:5], deepcopy(parameters[5].obj)))
            return _Rows()
        if statement.startswith("SELECT sequence"):
            newest = sorted(self.rows, key=lambda item: item[0], reverse=True)
            return _Rows((newest[parameters[0]][0],) if len(newest) > parameters[0] else None)
        if statement.startswith("DELETE FROM telemetry_events WHERE"):
            self.rows = [row for row in self.rows if row[0] > parameters[0]]
            return _Rows()
        if statement == "DELETE FROM telemetry_events":
            self.rows = []
            return _Rows()
        if statement.startswith("SELECT COUNT"):
            return _Rows((len(self.rows),))
        raise AssertionError(statement)


class _Pool:
    def __init__(self):
        self.value = _Connection()

    def connection(self):
        return self.value


def _event(index):
    return TelemetryEvent(
        event_id=f"event-{index}", event_type="game_opened",
        timestamp_ms=index, player_id="player-one",
    )


def test_postgres_telemetry_appends_idempotently_and_prunes():
    repository = PostgresTelemetryRepository(_Pool(), max_events=2)
    service = InMemoryTelemetryService(repository=repository)
    assert service.record_many([_event(1), _event(2), _event(3)]) == 3
    assert [event.event_id for event in repository.load()] == ["event-2", "event-3"]
    assert service.record(_event(3)) is False
    assert repository.health()["event_count"] == 2


def test_failed_telemetry_append_does_not_claim_event_in_memory():
    class FailingRepository:
        max_events = 2

        def load(self):
            return []

        def append(self, _events):
            raise RuntimeError("database unavailable")

    service = InMemoryTelemetryService(repository=FailingRepository())
    with pytest.raises(RuntimeError, match="database unavailable"):
        service.record(_event(1))
    assert service.events() == []
