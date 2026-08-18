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
