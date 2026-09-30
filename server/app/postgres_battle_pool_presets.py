"""Per-player PostgreSQL preset repository for clean installations."""

from __future__ import annotations

import time

from psycopg.types.json import Jsonb

from .battle_pool_presets import (
    BattlePoolPreset, BattlePoolPresetError, JsonBattlePoolPresetRepository,
)


class PostgresBattlePoolPresetRepository:
    _normalize_entry = staticmethod(JsonBattlePoolPresetRepository._normalize_entry)
    _entry_payload = staticmethod(JsonBattlePoolPresetRepository._entry_payload)

    def __init__(self, pool):
        self.pool = pool

    def _player(self, connection, player_id: str, *, lock: bool) -> dict:
        if lock:
            connection.execute(
                "INSERT INTO battle_pool_presets (player_id) VALUES (%s) "
                "ON CONFLICT (player_id) DO NOTHING", (player_id,),
            )
        row = connection.execute(
            "SELECT state FROM battle_pool_presets WHERE player_id = %s" +
            (" FOR UPDATE" if lock else ""), (player_id,),
        ).fetchone()
        if row is None:
            return {}
        if not isinstance(row[0], dict):
            raise BattlePoolPresetError("Hazır Savaş Havuzu veritabanı durumu geçersiz.")
        return dict(row[0])

    def _write(self, connection, player_id: str, state: dict) -> None:
        connection.execute(
            "UPDATE battle_pool_presets SET state = %s, updated_at = NOW() WHERE player_id = %s",
            (Jsonb(state), player_id),
        )

    def list_player(self, player_id: str) -> list[BattlePoolPreset]:
        with self.pool.connection() as connection:
            state = self._player(connection, player_id, lock=False)
        result = [
            preset for name, raw in state.items()
            if (preset := self._normalize_entry(str(name), raw)) is not None
        ]
        result.sort(key=lambda item: (
            not item.favorite, -(item.last_used_at_ms or 0), item.name.casefold(),
        ))
        return result

    def get(self, player_id: str, name: str) -> BattlePoolPreset | None:
        with self.pool.connection() as connection:
            state = self._player(connection, player_id, lock=False)
        return self._normalize_entry(name, state.get(name))

    def save(self, player_id: str, preset: BattlePoolPreset) -> BattlePoolPreset:
        with self.pool.connection() as connection:
            state = self._player(connection, player_id, lock=True)
            previous = self._normalize_entry(preset.name, state.get(preset.name))
            if previous is not None:
                preset = BattlePoolPreset(
                    name=preset.name,
                    module_definition_ids=preset.module_definition_ids,
                    favorite=previous.favorite,
                    last_used_at_ms=previous.last_used_at_ms,
                    use_count=previous.use_count,
                )
            state[preset.name] = self._entry_payload(preset)
            self._write(connection, player_id, state)
        return preset

    def rename(self, player_id: str, old_name: str, new_name: str) -> BattlePoolPreset:
        with self.pool.connection() as connection:
            state = self._player(connection, player_id, lock=True)
            old = self._normalize_entry(old_name, state.get(old_name))
            if old is None:
                raise BattlePoolPresetError("Yeniden adlandırılacak hazır Savaş Havuzu bulunamadı.")
            if new_name != old_name and new_name in state:
                raise BattlePoolPresetError("Bu isimde başka bir hazır Savaş Havuzu zaten var.")
            state.pop(old_name, None)
            renamed = BattlePoolPreset(
                name=new_name,
                module_definition_ids=old.module_definition_ids,
                favorite=old.favorite,
                last_used_at_ms=old.last_used_at_ms,
                use_count=old.use_count,
            )
            state[new_name] = self._entry_payload(renamed)
            self._write(connection, player_id, state)
        return renamed

    def update_meta(
        self, player_id: str, name: str, *, favorite: bool | None = None,
        mark_used: bool = False,
    ) -> BattlePoolPreset:
        with self.pool.connection() as connection:
            state = self._player(connection, player_id, lock=True)
            current = self._normalize_entry(name, state.get(name))
            if current is None:
                raise BattlePoolPresetError("Hazır Savaş Havuzu bulunamadı.")
            updated = BattlePoolPreset(
                name=current.name,
                module_definition_ids=current.module_definition_ids,
                favorite=current.favorite if favorite is None else bool(favorite),
                last_used_at_ms=int(time.time() * 1000) if mark_used else current.last_used_at_ms,
                use_count=current.use_count + 1 if mark_used else current.use_count,
            )
            state[name] = self._entry_payload(updated)
            self._write(connection, player_id, state)
        return updated

    def delete(self, player_id: str, name: str) -> bool:
        with self.pool.connection() as connection:
            state = self._player(connection, player_id, lock=True)
            if name not in state:
                return False
            state.pop(name)
            self._write(connection, player_id, state)
        return True
