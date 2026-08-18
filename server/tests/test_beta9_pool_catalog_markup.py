from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta9_rich_pool_detail_markup_exists():
    html=client.get("/").text

    for element_id in (
        "battle-pool-detail-energy-generation",
        "battle-pool-detail-energy-consumption",
        "battle-pool-detail-damage",
        "battle-pool-detail-cooldown",
        "battle-pool-detail-effects",
        "battle-pool-detail-strong",
        "battle-pool-detail-weak",
        "battle-pool-detail-synergy",
    ):
        assert f'id="{element_id}"' in html
