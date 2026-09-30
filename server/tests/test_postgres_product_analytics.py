"""Synthetic privacy-gated analytics persistence; no DB or JSON opened."""

from copy import deepcopy

from app.postgres_product_analytics import PostgresProductAnalyticsService


class _Rows:
    def __init__(self, row=None):
        self.row = row

    def fetchone(self):
        return self.row


class _Connection:
    def __init__(self):
        self.events = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, statement, parameters=None):
        if statement.startswith("INSERT INTO product_analytics_document"):
            if self.events is None:
                self.events = []
            return _Rows()
        if statement.startswith("SELECT events"):
            return _Rows((deepcopy(self.events),))
        if statement.startswith("UPDATE product_analytics_document"):
            self.events = deepcopy(parameters[0].obj)
            return _Rows()
        raise AssertionError(statement)


class _Pool:
    def __init__(self):
        self.value = _Connection()

    def connection(self):
        return self.value


def test_postgres_analytics_preserves_opt_out_idempotency_and_erasure(tmp_path):
    pool = _Pool()
    consent = {"player-one": True}
    source_path = tmp_path / "product_analytics.json"
    service = PostgresProductAnalyticsService(
        pool, source_path, b"test-signing-key" * 3,
        lambda player_id: consent.get(player_id, False),
        now_func=lambda: 1_700_000_000,
    )
    assert service.record("player-one", "session_started", {}, request_id="a" * 32) is True
    assert service.record("player-one", "session_started", {}, request_id="a" * 32) is False
    assert len(pool.value.events) == 1
    assert service.record("player-two", "session_started", {}) is False
    consent["player-one"] = False
    assert service.record("player-one", "session_started", {}) is False
    assert service.erase_player("player-one") == 1
    assert pool.value.events == []
    assert not source_path.exists()
