from fastapi.testclient import TestClient

from app.game.battle_pool import default_battle_pool
from app.main import (
    app,
    player_profile_service,
)
from app.player_profile import (
    PlayerProfileService,
)


client = TestClient(app)


def reset():
    player_profile_service._profiles.clear()


def test_default_profile_has_progression_and_no_cosmetic_sections():
    service = PlayerProfileService()
    profile = service.get_or_create(
        "a",
        display_name="Oyuncu A",
    )

    view = profile.to_view()

    assert view["level"] == 1
    assert view["rating"] == 1000
    assert view["league_name_tr"] == "Gümüş"
    assert len(view["preferred_battle_pool_ids"]) == 18
    assert view["profile_sections"] == [
        "Genel",
        "İlerleme",
        "Savaş Havuzu",
    ]
    assert "Kozmetik" not in view["profile_sections"]


def test_experience_updates_level_deterministically():
    service = PlayerProfileService()
    service.add_experience("a", 2500)

    profile = service.get("a")

    assert profile.level == 3
    assert profile.experience == 2500
    assert profile.experience_into_level == 500
    assert profile.experience_to_next_level == 500


def test_rating_maps_to_turkish_league_names():
    service = PlayerProfileService()

    expected = (
        (800, "Bronz"),
        (1000, "Gümüş"),
        (1200, "Altın"),
        (1400, "Platin"),
        (1600, "Elmas"),
    )

    for rating, league in expected:
        service.set_rating("a", rating)
        assert service.get("a").league_name_tr == league


def test_profile_endpoint_creates_viewer_profile():
    reset()

    response = client.get("/profile/alihan")

    assert response.status_code == 200
    body = response.json()
    assert body["player_id"] == "alihan"
    assert body["display_name"] == "alihan"
    assert len(body["preferred_battle_pool_ids"]) == 18


def test_display_name_endpoint_validates_length():
    reset()

    response = client.put(
        "/profile/a/display-name",
        json={"display_name": "A" * 25},
    )

    assert response.status_code == 422


def test_profile_battle_pool_endpoint_uses_same_18_module_validation():
    reset()
    pool = list(
        default_battle_pool().module_definition_ids
    )

    response = client.put(
        "/profile/a/battle-pool",
        json={"battle_pool_ids": pool},
    )

    assert response.status_code == 200
    assert (
        response.json()["preferred_battle_pool_ids"]
        == pool
    )


def test_profile_battle_pool_rejects_short_pool():
    reset()
    pool = list(
        default_battle_pool().module_definition_ids
    )[:-1]

    response = client.put(
        "/profile/a/battle-pool",
        json={"battle_pool_ids": pool},
    )

    assert response.status_code == 422
