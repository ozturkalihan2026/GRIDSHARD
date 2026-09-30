"""Synthetic clean-install preset storage; no JSON or PostgreSQL server."""

from copy import deepcopy

from app.battle_pool_presets import BattlePoolPreset
from app.postgres_battle_pool_presets import PostgresBattlePoolPresetRepository


class _Rows:
    def __init__(self, row=None):
        self.row = row

    def fetchone(self):
        return self.row


class _Connection:
    def __init__(self):
        self.states = {}

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, statement, parameters=None):
        if statement.startswith("INSERT INTO battle_pool_presets"):
            self.states.setdefault(parameters[0], {})
            return _Rows()
        if statement.startswith("SELECT state FROM battle_pool_presets"):
            state = self.states.get(parameters[0])
            return _Rows((deepcopy(state),) if state is not None else None)
        if statement.startswith("UPDATE battle_pool_presets"):
            self.states[parameters[1]] = deepcopy(parameters[0].obj)
            return _Rows()
        raise AssertionError(statement)


class _Pool:
    def __init__(self):
        self.value = _Connection()

    def connection(self):
        return self.value


def test_postgres_presets_are_isolated_and_keep_metadata():
    repository = PostgresBattlePoolPresetRepository(_Pool())
    first = BattlePoolPreset(name="Hızlı", module_definition_ids=("laser",))
    repository.save("player-one", first)
    assert repository.get("player-two", "Hızlı") is None

    repository.update_meta("player-one", "Hızlı", favorite=True, mark_used=True)
    repository.save("player-one", BattlePoolPreset(
        name="Hızlı", module_definition_ids=("shield",),
    ))
    restored = repository.get("player-one", "Hızlı")
    assert restored.module_definition_ids == ("shield",)
    assert restored.favorite is True
    assert restored.use_count == 1

    renamed = repository.rename("player-one", "Hızlı", "Savunma")
    assert renamed.name == "Savunma"
    assert repository.get("player-one", "Hızlı") is None
    assert repository.delete("player-one", "Savunma") is True
    assert repository.delete("player-one", "Savunma") is False
