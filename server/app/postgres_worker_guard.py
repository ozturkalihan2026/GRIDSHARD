"""Database-wide single simulation worker guard on a dedicated connection.

It must not use transaction-pooling proxies: this is a session advisory lock.
The connection stays borrowed until shutdown, never returned with a held lock.
"""

WORKER_LOCK_ID = 7142662901390354522


class PostgresWorkerGuard:
    def __init__(self, pool):
        self.pool = pool
        self.connection = None

    @property
    def held(self):
        return self.connection is not None and not self.connection.closed

    def acquire(self):
        if self.held:
            raise RuntimeError("Worker kilidi zaten alındı.")
        connection = self.pool.pool.getconn(timeout=5)
        try:
            acquired = connection.execute("SELECT pg_try_advisory_lock(%s)", (WORKER_LOCK_ID,)).fetchone()[0]
            connection.commit()
            if not acquired:
                raise RuntimeError("Bu veritabanında başka bir savaş worker'ı çalışıyor; yalnız tek worker desteklenir.")
            self.connection = connection
        except BaseException:
            # A commit/network failure can leave a session lock acquired. Closing
            # the dedicated session is the only safe way to return this borrower.
            connection.close()
            self.pool.pool.putconn(connection)
            raise

    def check(self):
        if not self.held:
            raise RuntimeError("Worker veritabanı kilidi kaybedildi.")
        try:
            self.connection.execute("SELECT 1").fetchone()
            self.connection.commit()
        except BaseException:
            self.connection.close()
            raise

    def release(self):
        connection, self.connection = self.connection, None
        if connection is None:
            return
        try:
            if not connection.closed:
                connection.execute("SELECT pg_advisory_unlock(%s)", (WORKER_LOCK_ID,)).fetchone()
                connection.commit()
        finally:
            # Do not hand an uncertain session lock to another borrower.
            connection.close()
            self.pool.pool.putconn(connection)
