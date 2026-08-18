from pathlib import Path

from app.battle_pool_presets import (
    BattlePoolPresetService,
    JsonBattlePoolPresetRepository,
)
from app.game.battle_pool import (
    default_battle_pool,
)


def test_preset_save_load_delete_roundtrip(
    tmp_path:Path,
):
    service=BattlePoolPresetService(
        JsonBattlePoolPresetRepository(
            tmp_path/"presets.json"
        )
    )
    ids=list(
        default_battle_pool()
        .module_definition_ids
    )

    saved=service.save(
        "p1",
        name="Saldırı",
        module_definition_ids=ids,
    )
    assert saved["name"]=="Saldırı"
    assert len(saved["module_definition_ids"])==18

    listed=service.list("p1")
    assert listed==[saved]

    assert service.delete(
        "p1",
        "Saldırı",
    ) is True
    assert service.list("p1")==[]


def test_preset_rename_preserves_modules(
    tmp_path:Path,
):
    service=BattlePoolPresetService(
        JsonBattlePoolPresetRepository(
            tmp_path/"rename-presets.json"
        )
    )
    ids=list(
        default_battle_pool()
        .module_definition_ids
    )

    service.save(
        "p1",
        name="Saldırı",
        module_definition_ids=ids,
    )

    renamed=service.rename(
        "p1",
        old_name="Saldırı",
        new_name="Agresif",
    )

    assert renamed["name"]=="Agresif"
    assert renamed["module_definition_ids"]==ids
    assert [
        item["name"]
        for item in service.list("p1")
    ]==["Agresif"]


def test_preset_favorite_and_last_used_metadata(
    tmp_path:Path,
):
    service=BattlePoolPresetService(
        JsonBattlePoolPresetRepository(
            tmp_path/"meta-presets.json"
        )
    )
    ids=list(
        default_battle_pool()
        .module_definition_ids
    )

    service.save(
        "p1",
        name="Saldırı",
        module_definition_ids=ids,
    )

    favorite=service.update_meta(
        "p1",
        name="Saldırı",
        favorite=True,
    )
    assert favorite["favorite"] is True

    used=service.update_meta(
        "p1",
        name="Saldırı",
        mark_used=True,
    )
    assert used["favorite"] is True
    assert isinstance(
        used["last_used_at_ms"],
        int,
    )
    assert used["last_used_at_ms"]>0


def test_legacy_list_preset_format_is_still_readable(
    tmp_path:Path,
):
    path=tmp_path/"legacy.json"
    ids=list(
        default_battle_pool()
        .module_definition_ids
    )
    import json
    path.write_text(
        json.dumps({
            "p1":{
                "Eski":ids,
            }
        }),
        encoding="utf-8",
    )

    service=BattlePoolPresetService(
        JsonBattlePoolPresetRepository(
            path
        )
    )
    preset=service.list("p1")[0]
    assert preset["name"]=="Eski"
    assert preset["favorite"] is False
    assert preset["last_used_at_ms"] is None
