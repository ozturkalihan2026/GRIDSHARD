"""PostgreSQL persistence for the existing privacy-gated analytics service."""

from __future__ import annotations

from contextlib import contextmanager

from psycopg.types.json import Jsonb

from .product_analytics import (
    ProductAnalyticsService, ProductAnalyticsStorageError, validate_product_events,
)


class PostgresProductAnalyticsService(ProductAnalyticsService):
    def __init__(self, pool, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pool = pool
        self._active_connection = None

    @contextmanager
    def _file_lock(self):
        with self.pool.connection() as connection:
            connection.execute(
                "INSERT INTO product_analytics_document (singleton) VALUES (TRUE) "
                "ON CONFLICT (singleton) DO NOTHING"
            )
            connection.execute(
                "SELECT events FROM product_analytics_document WHERE singleton = TRUE FOR UPDATE"
            )
            self._active_connection = connection
            try:
                yield
            finally:
                self._active_connection = None

    def _connection(self):
        if self._active_connection is None:
            raise ProductAnalyticsStorageError("Analitik işlemi transaction dışında çağrılamaz.")
        return self._active_connection

    def _read(self) -> list[dict]:
        row = self._connection().execute(
            "SELECT events FROM product_analytics_document WHERE singleton = TRUE"
        ).fetchone()
        if row is None or not isinstance(row[0], list):
            raise ProductAnalyticsStorageError("Ürün analitiği veritabanı şeması geçersiz.")
        return validate_product_events(row[0])

    def _write(self, events: list[dict]) -> None:
        self._connection().execute(
            "UPDATE product_analytics_document SET events = %s, updated_at = NOW() "
            "WHERE singleton = TRUE",
            (Jsonb(events),),
        )
