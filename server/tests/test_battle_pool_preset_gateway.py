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
