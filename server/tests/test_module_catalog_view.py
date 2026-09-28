from fastapi.testclient import TestClient

from app.main import app

client=TestClient(app)


def by_id(body, module_id):
    return next(
        item
        for item in body["modules"]
        if item["id"]==module_id
    )


def test_module_catalog_exposes_real_engine_values():
    response=client.get(
        "/game/module-catalog"
    )
    assert response.status_code==200
    body=response.json()

    assert body["category_order"]==[
        "enerji",
        "saldırı",
        "savunma",
        "destek",
        "sabotaj",
    ]

    laser=by_id(body,"laser")
    assert laser["base_damage"]==12.0
    assert laser["cooldown_ms"]==1000
    assert laser["energy_consumption"]==0.0
    assert laser["action_energy_cost"]==1.2
    assert any(
        "12" in line
        for line in laser["effect_lines"]
    )

    shield=by_id(body,"shield")
    assert any(
        "%35" in line
        for line in shield["effect_lines"]
    )

    emp=by_id(body,"emp")
    assert any(
        "2.5 sn" in line
        for line in emp["effect_lines"]
    )

    assert all(
        item["id"] not in {"generator", "splitter", "energy_leech"}
        for item in body["modules"]
    )


def test_module_catalog_has_all_player_selectable_modules():
    body=client.get(
        "/game/module-catalog"
    ).json()

    assert len(body["modules"])==36
    assert all(
        item["id"]!="core"
        for item in body["modules"]
    )
