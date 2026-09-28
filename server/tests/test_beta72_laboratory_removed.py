"""Devre Laboratuvarı kaldırıldı (Beta.72 tur 8).

Kalibrasyonun hiçbir savaşa etkisi yoktu ve yeni arayüzde girişi kalmamıştı.
Eski kayıtlarda yatırılmış Akı yüklemede bir kez iade edilir.
"""

from dataclasses import replace
import importlib.util
from uuid import uuid4

from fastapi.testclient import TestClient

from app.game.models import BattleModule, BattleState
from app.game.pvp_session import PvPSessionService
from app.main import app
from app.player_data_store import (
    InMemoryPlayerDataRepository,
    PlayerDataStoreService,
    retired_laboratory_refund,
)
from app.player_profile import PlayerProfileService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService


client = TestClient(app)


def test_laboratory_endpoints_module_and_battle_fields_are_gone():
    player_id = f"lab-removed-{uuid4()}"
    assert importlib.util.find_spec("app.laboratory") is None
    assert client.get(f"/profile/{player_id}/laboratory").status_code == 404
    for path in (
        f"/profile/{player_id}/laboratory/laser/upgrade",
        f"/profile/{player_id}/laboratory/reset",
    ):
        assert client.post(path, json={"request_id": "x"}).status_code in {404, 405}
    assert "laboratory_summary" not in client.get(f"/profile/{player_id}").json()
    assert not hasattr(PvPSessionService, "set_player_calibrations")
    for name in ("player_calibrations", "laboratory_effects_enabled"):
        assert name not in BattleState.__dataclass_fields__
    for name in ("calibration_level", "calibration_applied"):
        assert name not in BattleModule.__dataclass_fields__


def test_retired_laboratory_investment_is_refunded_once_on_load():
    profiles = PlayerProfileService()
    repository = InMemoryPlayerDataRepository()
    store = PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
        repository=repository,
    )
    profile = profiles.get_or_create("lab-refund")
    profile.flux_shards = 10
    snapshot = store.save_player("lab-refund")
    assert "laboratory" not in snapshot.profile

    # Eski biçimdeki kayıt: Lazer 2. seviye (25+75), Kalkan 1. seviye (25).
    legacy = {
        **snapshot.profile,
        "laboratory": {
            "module_levels": {"laser": 2, "shield": 1, "emp": "bozuk"},
            "transactions": [],
            "receipts": {},
            "reset_count": 0,
        },
    }
    repository.save(replace(snapshot, profile=legacy))

    profiles._profiles.clear()
    store.load_player("lab-refund")
    assert profiles.get("lab-refund").flux_shards == 135

    # Blok bir sonraki kayıtta yazılmaz; iade ikinci kez işlenmez.
    resaved = store.save_player("lab-refund")
    assert "laboratory" not in resaved.profile
    profiles._profiles.clear()
    store.load_player("lab-refund")
    assert profiles.get("lab-refund").flux_shards == 135


def test_refund_helper_bounds_levels_and_ignores_invalid_values():
    assert retired_laboratory_refund({}) == 0
    assert retired_laboratory_refund({"laboratory": None}) == 0
    assert retired_laboratory_refund(
        {"laboratory": {"module_levels": {"a": 9, "b": -1, "c": None}}}
    ) == 250
