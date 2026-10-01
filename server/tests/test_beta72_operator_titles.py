"""Beta.72 tur 19 — unvan sayfası, tek seferlik unvan ödülleri ve savaş deneyimi."""
import pytest

from app.meta_progression import MetaProgressionError, MetaProgressionService
from app.player_profile import OPERATOR_TITLE_STAGES, PlayerProfile, operator_title_view
from app.player_progression import DRAW_XP, LOSS_XP, WIN_XP


def test_every_title_has_an_id_and_a_growing_reward():
    ids = [stage["id"] for stage in OPERATOR_TITLE_STAGES]
    assert len(ids) == len(set(ids))
    rewards = [stage["reward_circuit_credits"] for stage in OPERATOR_TITLE_STAGES]
    # Başlangıç unvanının ödülü yok; sonraki unvanlar artan, küçük ödüller verir.
    assert rewards[0] == 0
    assert all(later > earlier for earlier, later in zip(rewards[1:], rewards[2:]))


def test_title_view_marks_reached_claimed_and_claimable_stages():
    view = operator_title_view(950, 12, ("devre_teknisyeni",))
    stages = {stage["id"]: stage for stage in view["stages"]}
    assert view["current"]["id"] == "iletken_ustasi"
    assert view["next"]["id"] == "cekirdek_muhafizi"
    assert stages["devre_teknisyeni"]["claimed"] is True
    assert stages["devre_teknisyeni"]["claimable"] is False
    assert stages["iletken_ustasi"]["claimable"] is True
    assert stages["cekirdek_muhafizi"]["reached"] is False
    assert stages["devre_ciragi"]["claimable"] is False
    assert (view["trophies"], view["wins"]) == (950, 12)


def test_title_reward_is_claimed_once_and_only_after_reaching_it():
    service = MetaProgressionService()
    profile = PlayerProfile(player_id="title-player", display_name="Unvan", rating=320)
    profile.lifetime_stats["wins"] = 3
    credits = profile.circuit_credits
    with pytest.raises(MetaProgressionError):
        service.claim_operator_title_reward(profile, "iletken_ustasi")
    with pytest.raises(MetaProgressionError):
        service.claim_operator_title_reward(profile, "devre_ciragi")
    receipt = service.claim_operator_title_reward(profile, "devre_teknisyeni")
    assert receipt["rewards"] == {"circuit_credits": 100}
    assert profile.circuit_credits == credits + 100
    assert service.claim_operator_title_reward(profile, "devre_teknisyeni")["replayed"] is True
    assert profile.circuit_credits == credits + 100
    titles = profile.to_view()["operator_title_progression"]["stages"]
    assert titles[1]["claimed"] is True


def test_battle_experience_is_forty_for_a_win():
    # Savaş deneyimi sezon yolu deneyimidir; premium ve reklamla ikiye katlanır.
    assert WIN_XP == 40
    assert WIN_XP > DRAW_XP > LOSS_XP > 0

