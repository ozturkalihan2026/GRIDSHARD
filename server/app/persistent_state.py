"""One synchronous unit of work for the single-worker production profile cache.

Repositories share the outer PostgreSQL transaction. Cached player objects are
refreshed before mutation, isolated from concurrent handlers, and restored after
rollback. Never hold this scope across await or external provider requests.
"""

from contextlib import contextmanager
from copy import deepcopy
from threading import RLock, local


class PersistentState:
    def __init__(self):
        self.lock = RLock()
        self._local = local()

    @property
    def active(self):
        return getattr(self._local, "active", None) is not None

    def touch(self, player_id):
        active = getattr(self._local, "active", None)
        if active is None or not player_id or player_id in active["players"]:
            return
        player_id = str(player_id)
        store = active["store"]
        caches = active["caches"]
        active["players"][player_id] = [deepcopy(cache.get(player_id)) for cache in caches]
        active["connection"].execute(
            "SELECT player_id FROM player_data WHERE player_id = %s FOR UPDATE", (player_id,),
        )
        exists = store.repository.load(player_id) is not None
        if exists:
            store.load_player(player_id)
        active["baselines"][player_id] = [deepcopy(cache.get(player_id)) for cache in caches] if exists else None

    def saved(self, player_id):
        active = getattr(self._local, "active", None)
        if active is not None and str(player_id) in active["players"]:
            active["baselines"][str(player_id)] = [deepcopy(cache.get(str(player_id))) for cache in active["caches"]]

    def require_touched(self, player_id):
        active = getattr(self._local, "active", None)
        if active is not None and str(player_id) not in active["players"]:
            raise RuntimeError("Kalıcı oyuncu mutasyonu işlem başlangıcında kaydedilmelidir.")

    @contextmanager
    def operation(self, *, pool, store, platform, teams, social_lock, player_ids=(), safety_check=None):
        with self.lock:
            if safety_check is not None:
                safety_check()
            if getattr(self._local, "active", None) is not None:
                for player_id in sorted(set(filter(None, player_ids))):
                    self.touch(player_id)
                yield
                return
            caches = [store.profile_service._profiles, store.statistics_service._statistics,
                      store.settings_service._settings]
            active = {"store": store, "players": {}, "baselines": {}, "caches": caches}
            try:
                # Global process -> social -> platform -> name index -> team ->
                # players. All domain helpers join, rather than commit inside.
                with social_lock, pool.transaction() as connection, platform._lock, teams._lock:
                    active["connection"] = connection
                    self._local.active = active
                    connection.execute("SELECT pg_advisory_xact_lock(71407101)")
                    connection.execute(
                        "SELECT singleton FROM team_document WHERE singleton = TRUE FOR UPDATE"
                    )
                    for player_id in sorted(set(filter(None, player_ids))):
                        self.touch(player_id)
                    yield
                    # Read models can legitimately roll over season/day state.
                    # Persist those changes too; never materialize an unknown
                    # target or recreate a profile deleted inside this scope.
                    for player_id, baseline in active["baselines"].items():
                        current = [cache.get(player_id) for cache in caches]
                        if baseline is not None and current[0] is not None and current != baseline:
                            store.save_player(player_id)
                    if safety_check is not None:
                        safety_check()
            except BaseException:
                # Run only after the transaction has rolled back, and while the
                # process cache lock is still held. No partially granted state.
                for player_id, previous in active["players"].items():
                    if store.repository.load(player_id) is not None:
                        store.load_player(player_id)
                    else:
                        for cache, value in zip(caches, previous):
                            if value is None:
                                cache.pop(player_id, None)
                            else:
                                cache[player_id] = value
                raise
            finally:
                self._local.active = None
