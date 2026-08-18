from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json
import os
import re
import shutil
import time
from threading import RLock

from .game.battle_pool import (
    validate_battle_pool,
)


PRESET_NAME_MAX_LENGTH=24


class BattlePoolPresetError(ValueError):
    pass


@dataclass(slots=True,frozen=True)
class BattlePoolPreset:
    name:str
    module_definition_ids:tuple[str,...]
    favorite:bool=False
    last_used_at_ms:int|None=None

    def to_view(self)->dict:
        return {
            "name":self.name,
            "module_definition_ids":
                list(
                    self.module_definition_ids
                ),
            "favorite":self.favorite,
            "last_used_at_ms":
                self.last_used_at_ms,
        }


class JsonBattlePoolPresetRepository:
    """
    New format per player:
    {
      "Saldırı": {
        "module_definition_ids":[...],
        "favorite":true,
        "last_used_at_ms":123
      }
    }

    Beta.13/Beta.14 list-only values are still accepted.
    """

    def __init__(
        self,
        path:str|Path,
    ):
        self.path=Path(path)
        self._lock=RLock()

    @property
    def backup_path(self)->Path:
        return self.path.with_name(
            self.path.name+".bak"
        )

    def _read_all(self)->dict:
        if not self.path.exists():
            return {}

        try:
            raw=self.path.read_text(
                encoding="utf-8"
            )
            if not raw.strip():
                return {}
            data=json.loads(raw)
        except (
            OSError,
            json.JSONDecodeError,
        ) as exc:
            raise BattlePoolPresetError(
                "Hazır Savaş Havuzu verisi okunamadı."
            ) from exc

        if not isinstance(data,dict):
            raise BattlePoolPresetError(
                "Hazır Savaş Havuzu veri kökü nesne olmalıdır."
            )
        return data

    def _write_all(
        self,
        payload:dict,
    )->None:
        with self._lock:
            try:
                self.path.parent.mkdir(
                    parents=True,
                    exist_ok=True,
                )

                if self.path.exists():
                    backup_tmp=self.backup_path.with_name(
                        self.backup_path.name+".tmp"
                    )
                    shutil.copy2(
                        self.path,
                        backup_tmp,
                    )
                    os.replace(
                        backup_tmp,
                        self.backup_path,
                    )

                tmp=self.path.with_name(
                    self.path.name+".tmp"
                )
                tmp.write_text(
                    json.dumps(
                        payload,
                        ensure_ascii=False,
                        indent=2,
                        sort_keys=True,
                    )+"\n",
                    encoding="utf-8",
                )
                os.replace(
                    tmp,
                    self.path,
                )
            except OSError as exc:
                raise BattlePoolPresetError(
                    "Hazır Savaş Havuzu verisi yazılamadı."
                ) from exc

    @staticmethod
    def _normalize_entry(
        name:str,
        raw:object,
    )->BattlePoolPreset|None:
        if isinstance(raw,list):
            return BattlePoolPreset(
                name=name,
                module_definition_ids=tuple(
                    str(item)
                    for item in raw
                ),
            )

        if not isinstance(raw,dict):
            return None

        module_ids=raw.get(
            "module_definition_ids",
            [],
        )
        if not isinstance(module_ids,list):
            return None

        last_used=raw.get(
            "last_used_at_ms"
        )
        if last_used is not None:
            try:
                last_used=int(last_used)
            except (TypeError,ValueError):
                last_used=None

        return BattlePoolPreset(
            name=name,
            module_definition_ids=tuple(
                str(item)
                for item in module_ids
            ),
            favorite=bool(
                raw.get(
                    "favorite",
                    False,
                )
            ),
            last_used_at_ms=last_used,
        )

    @staticmethod
    def _entry_payload(
        preset:BattlePoolPreset,
    )->dict:
        return {
            "module_definition_ids":
                list(
                    preset.module_definition_ids
                ),
            "favorite":
                preset.favorite,
            "last_used_at_ms":
                preset.last_used_at_ms,
        }

    def list_player(
        self,
        player_id:str,
    )->list[BattlePoolPreset]:
        payload=self._read_all()
        raw=payload.get(
            player_id,
            {},
        )
        if not isinstance(raw,dict):
            return []

        result=[]
        for name,value in raw.items():
            preset=self._normalize_entry(
                str(name),
                value,
            )
            if preset is not None:
                result.append(
                    preset
                )

        result.sort(
            key=lambda item:(
                not item.favorite,
                -(
                    item.last_used_at_ms
                    or 0
                ),
                item.name.casefold(),
            )
        )
        return result

    def get(
        self,
        player_id:str,
        name:str,
    )->BattlePoolPreset|None:
        payload=self._read_all()
        player=payload.get(
            player_id,
            {},
        )
        if not isinstance(player,dict):
            return None
        return self._normalize_entry(
            name,
            player.get(name),
        )

    def save(
        self,
        player_id:str,
        preset:BattlePoolPreset,
    )->BattlePoolPreset:
        with self._lock:
            payload=self._read_all()
            player=dict(
                payload.get(
                    player_id,
                    {},
                )
                or {}
            )

            previous=self._normalize_entry(
                preset.name,
                player.get(
                    preset.name
                ),
            )
            if previous is not None:
                preset=BattlePoolPreset(
                    name=preset.name,
                    module_definition_ids=
                        preset.module_definition_ids,
                    favorite=
                        previous.favorite,
                    last_used_at_ms=
                        previous.last_used_at_ms,
                )

            player[preset.name]=(
                self._entry_payload(
                    preset
                )
            )
            payload[player_id]=player
            self._write_all(payload)
        return preset

    def rename(
        self,
        player_id:str,
        old_name:str,
        new_name:str,
    )->BattlePoolPreset:
        with self._lock:
            payload=self._read_all()
            player=dict(
                payload.get(
                    player_id,
                    {},
                )
                or {}
            )
            old=self._normalize_entry(
                old_name,
                player.get(
                    old_name
                ),
            )
            if old is None:
                raise BattlePoolPresetError(
                    "Yeniden adlandırılacak hazır Savaş Havuzu bulunamadı."
                )

            if (
                new_name != old_name
                and new_name in player
            ):
                raise BattlePoolPresetError(
                    "Bu isimde başka bir hazır Savaş Havuzu zaten var."
                )

            player.pop(
                old_name,
                None,
            )
            renamed=BattlePoolPreset(
                name=new_name,
                module_definition_ids=
                    old.module_definition_ids,
                favorite=old.favorite,
                last_used_at_ms=
                    old.last_used_at_ms,
            )
            player[new_name]=(
                self._entry_payload(
                    renamed
                )
            )
            payload[player_id]=player
            self._write_all(payload)
        return renamed

    def update_meta(
        self,
        player_id:str,
        name:str,
        *,
        favorite:bool|None=None,
        mark_used:bool=False,
    )->BattlePoolPreset:
        with self._lock:
            payload=self._read_all()
            player=dict(
                payload.get(
                    player_id,
                    {},
                )
                or {}
            )
            current=self._normalize_entry(
                name,
                player.get(name),
            )
            if current is None:
                raise BattlePoolPresetError(
                    "Hazır Savaş Havuzu bulunamadı."
                )

            updated=BattlePoolPreset(
                name=current.name,
                module_definition_ids=
                    current.module_definition_ids,
                favorite=(
                    current.favorite
                    if favorite is None
                    else bool(favorite)
                ),
                last_used_at_ms=(
                    int(time.time()*1000)
                    if mark_used
                    else current.last_used_at_ms
                ),
            )
            player[name]=(
                self._entry_payload(
                    updated
                )
            )
            payload[player_id]=player
            self._write_all(payload)
        return updated

    def delete(
        self,
        player_id:str,
        name:str,
    )->bool:
        with self._lock:
            payload=self._read_all()
            player=dict(
                payload.get(
                    player_id,
                    {},
                )
                or {}
            )
            if name not in player:
                return False

            player.pop(name,None)
            payload[player_id]=player
            self._write_all(payload)
            return True


class BattlePoolPresetService:
    def __init__(
        self,
        repository:JsonBattlePoolPresetRepository,
    ):
        self.repository=repository

    def _clean_name(
        self,
        name:str,
    )->str:
        clean=" ".join(
            str(name).strip().split()
        )
        if not clean:
            raise BattlePoolPresetError(
                "Hazır Savaş Havuzu adı boş olamaz."
            )
        if len(clean)>PRESET_NAME_MAX_LENGTH:
            raise BattlePoolPresetError(
                f"Hazır Savaş Havuzu adı en fazla {PRESET_NAME_MAX_LENGTH} karakter olabilir."
            )
        if not re.search(
            r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]",
            clean,
        ):
            raise BattlePoolPresetError(
                "Hazır Savaş Havuzu adı en az bir harf veya rakam içermelidir."
            )
        return clean

    def list(
        self,
        player_id:str,
    )->list[dict]:
        return [
            item.to_view()
            for item
            in self.repository.list_player(
                player_id
            )
        ]

    def save(
        self,
        player_id:str,
        *,
        name:str,
        module_definition_ids:list[str],
    )->dict:
        clean=self._clean_name(name)
        pool=validate_battle_pool(
            module_definition_ids
        )
        preset=BattlePoolPreset(
            name=clean,
            module_definition_ids=
                pool.module_definition_ids,
        )
        return self.repository.save(
            player_id,
            preset,
        ).to_view()

    def rename(
        self,
        player_id:str,
        *,
        old_name:str,
        new_name:str,
    )->dict:
        return (
            self.repository.rename(
                player_id,
                self._clean_name(
                    old_name
                ),
                self._clean_name(
                    new_name
                ),
            )
            .to_view()
        )

    def update_meta(
        self,
        player_id:str,
        *,
        name:str,
        favorite:bool|None=None,
        mark_used:bool=False,
    )->dict:
        return (
            self.repository.update_meta(
                player_id,
                self._clean_name(name),
                favorite=favorite,
                mark_used=mark_used,
            )
            .to_view()
        )

    def delete(
        self,
        player_id:str,
        name:str,
    )->bool:
        return self.repository.delete(
            player_id,
            self._clean_name(name),
        )
