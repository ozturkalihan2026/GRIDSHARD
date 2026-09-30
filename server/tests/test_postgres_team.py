"""Synthetic team document checks; no PostgreSQL server or legacy JSON."""

from copy import deepcopy

import pytest

from app.postgres_team import PostgresTeamRepository
from app.team_service import TeamService, TeamServiceError


class _Rows:
    def __init__(self, row):
        self.row = row

    def fetchone(self):
        return self.row


class _Connection:
    def __init__(self):
        self.state = None
        self.revision = 0

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, statement, parameters=None):
        if statement.startswith("SELECT state, revision"):
            return _Rows((deepcopy(self.state), self.revision) if self.state is not None else None)
        if statement.startswith("INSERT INTO team_document"):
            if self.state is not None:
                return _Rows(None)
            self.state = deepcopy(parameters[0].obj)
            self.revision = 1
            return _Rows((1,))
        if statement.startswith("UPDATE team_document"):
            if self.state is None or self.revision != parameters[1]:
                return _Rows(None)
            self.state = deepcopy(parameters[0].obj)
            self.revision += 1
            return _Rows((self.revision,))
        raise AssertionError(statement)


class _Pool:
    def __init__(self):
        self.value = _Connection()

    def connection(self):
        return self.value


def test_team_service_keeps_idempotency_in_postgres_document():
    pool = _Pool()
    service = TeamService(PostgresTeamRepository(pool))
    first = service.create_team("player-one", "Temiz Takım", "request-one")
    repeated = service.create_team("player-one", "Temiz Takım", "request-one")
    assert first["team_id"] == repeated["team_id"]
    assert repeated["replayed"] is True
    assert len(pool.value.state["teams"]) == 1
    assert pool.value.revision == 1


def test_team_document_rejects_stale_overwrite():
    repository = PostgresTeamRepository(_Pool())
    stale = repository.load()
    current = repository.load()
    current["teams"]["team-one"] = {"team_id": "team-one"}
    repository.save(current)
    stale["teams"]["team-two"] = {"team_id": "team-two"}
    with pytest.raises(TeamServiceError, match="eşzamanlı değişti"):
        repository.save(stale)
    assert set(repository.load()["teams"]) == {"team-one"}
