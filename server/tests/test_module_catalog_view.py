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

    assert body['category_order']==['saldırı','savunma','taktik']
    laser=by_id(body,'laser')
    assert laser['base_damage']==12 and laser['cooldown_ms']==1000
    for module in body['modules']:
        assert module['max_hp']>0 and module['current_cost']>0
        assert module['effect_lines'] and module['effect_lines_en']
        assert not any('energy' in key or 'heat' in key for key in module)
    assert all(
        item["id"] not in {"generator", "splitter", "energy_leech"}
        for item in body["modules"]
    )


def test_module_catalog_has_all_player_selectable_modules():
    body=client.get(
        "/game/module-catalog"
    ).json()

    assert len(body["modules"])==24
    assert all(
        item["id"]!="core"
        for item in body["modules"]
    )
