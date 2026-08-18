from fastapi.testclient import TestClient

from app.main import (
    app,
    battle_pool_preset_repository,
)
from app.game.battle_pool import (
    default_battle_pool,
)

client=TestClient(app)


def test_preset_crud_gateway():
    player="preset-gateway"
    battle_pool_preset_repository.path.unlink(
        missing_ok=True
    )
    battle_pool_preset_repository.backup_path.unlink(
        missing_ok=True
    )

    ids=list(
        default_battle_pool()
        .module_definition_ids
    )

    saved=client.put(
        f"/profile/{player}/battle-pool-presets",
        json={
            "name":"Saldırı",
            "battle_pool_ids":ids,
        },
    )
    assert saved.status_code==200
    assert saved.json()["preset"]["name"]=="Saldırı"

    listed=client.get(
        f"/profile/{player}/battle-pool-presets"
    )
    assert listed.status_code==200
    assert len(listed.json()["presets"])==1

    deleted=client.delete(
        f"/profile/{player}/battle-pool-presets/Saldırı"
    )
    assert deleted.status_code==200
    assert deleted.json()["deleted"] is True

    battle_pool_preset_repository.path.unlink(
        missing_ok=True
    )
    battle_pool_preset_repository.backup_path.unlink(
        missing_ok=True
    )


def test_preset_rename_gateway():
    player="preset-rename-gateway"
    battle_pool_preset_repository.path.unlink(
        missing_ok=True
    )
    battle_pool_preset_repository.backup_path.unlink(
        missing_ok=True
    )

    ids=list(
        default_battle_pool()
        .module_definition_ids
    )

    created=client.put(
        f"/profile/{player}/battle-pool-presets",
        json={
            "name":"Savunma",
            "battle_pool_ids":ids,
        },
    )
    assert created.status_code==200

    renamed=client.patch(
        f"/profile/{player}/battle-pool-presets/rename",
        json={
            "old_name":"Savunma",
            "new_name":"Kale",
        },
    )
    assert renamed.status_code==200
    assert renamed.json()["preset"]["name"]=="Kale"
    assert [
        item["name"]
        for item in renamed.json()["presets"]
    ]==["Kale"]

    battle_pool_preset_repository.path.unlink(
        missing_ok=True
    )
    battle_pool_preset_repository.backup_path.unlink(
        missing_ok=True
    )


def test_preset_meta_gateway():
    player="preset-meta-gateway"
    battle_pool_preset_repository.path.unlink(
        missing_ok=True
    )
    battle_pool_preset_repository.backup_path.unlink(
        missing_ok=True
    )

    ids=list(
        default_battle_pool()
        .module_definition_ids
    )

    created=client.put(
        f"/profile/{player}/battle-pool-presets",
        json={
            "name":"Favori",
            "battle_pool_ids":ids,
        },
    )
    assert created.status_code==200

    meta=client.patch(
        f"/profile/{player}/battle-pool-presets/Favori/meta",
        json={
            "favorite":True,
            "mark_used":True,
        },
    )
    assert meta.status_code==200
    preset=meta.json()["preset"]
    assert preset["favorite"] is True
    assert preset["last_used_at_ms"] is not None

    battle_pool_preset_repository.path.unlink(
        missing_ok=True
    )
    battle_pool_preset_repository.backup_path.unlink(
        missing_ok=True
    )
