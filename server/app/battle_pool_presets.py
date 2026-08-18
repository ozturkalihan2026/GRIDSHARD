from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json
import os
import re
import shutil
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

    def to_view(self)->dict:
        return {
            "name":self.name,
            "module_definition_ids":
                list(
                    self.module_definition_ids
                ),
        }


class JsonBattlePoolPresetRepository:
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
                        self.backup_path.name
                        + ".tmp"
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
        for name,module_ids in raw.items():
            if not isinstance(module_ids,list):
                continue
            result.append(
                BattlePoolPreset(
                    name=str(name),
                    module_definition_ids=tuple(
                        str(item)
                        for item in module_ids
                    ),
                )
            )

        result.sort(
            key=lambda item:
                item.name.casefold()
        )
        return result

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
            player[preset.name]=list(
                preset.module_definition_ids
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

            if old_name not in player:
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

            module_ids=list(
                player.pop(
                    old_name
                )
            )
            player[new_name]=module_ids
            payload[player_id]=player
            self._write_all(payload)

        return BattlePoolPreset(
            name=new_name,
            module_definition_ids=tuple(
                str(item)
                for item in module_ids
            ),
        )

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
        old_clean=self._clean_name(
            old_name
        )
        new_clean=self._clean_name(
            new_name
        )
        return (
            self.repository.rename(
                player_id,
                old_clean,
                new_clean,
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
