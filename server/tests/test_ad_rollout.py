"""New native capability plus explicit rollout, never verifier-only activation."""
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from app.ad_rollout import AD_PROTOCOL, AdRollout
from app import main
from app.game.engine import BattleEngine
from app.game.models import BattleState, BattleStatus
from app.store_verification import StoreVerifiers
from tests.test_beta72_store_verification import _admob, _ssv_query

PLATFORMS = {"purchase_platforms":{"google_play":True,"app_store":False},
             "ad_platforms":{"admob":True},"ad_units":{"android":"fixture-unit","ios":"fixture-ios"}}


def test_default_rollout_masks_ads_even_with_verifier_and_new_protocol():
    view = AdRollout().platform_view(PLATFORMS,player_id="fixture",protocol=AD_PROTOCOL,platform="android")
    assert view["ad_platforms"] == {"admob":False}
    assert view["ad_units"] == {} and view["ad_policy"] is None
    assert view["purchase_platforms"] == PLATFORMS["purchase_platforms"]
    assert PLATFORMS["ad_units"] != {}  # Never mutate shared verifier state.


@pytest.mark.parametrize("protocol,platform", [("","android"),("child-safe-v0","android"),(AD_PROTOCOL,"web"),(AD_PROTOCOL,"")])
def test_old_or_unknown_native_capability_stays_off(protocol,platform):
    assert not AdRollout("live").platform_view(PLATFORMS,player_id="fixture",protocol=protocol,platform=platform)["ad_platforms"]["admob"]


def test_test_rollout_requires_allowlisted_player_and_only_returns_requested_unit():
    rollout=AdRollout("test",frozenset({"tester"}))
    assert rollout.platform_view(PLATFORMS,player_id="other",protocol=AD_PROTOCOL,platform="android")["ad_units"] == {}
    view=rollout.platform_view(PLATFORMS,player_id="tester",protocol=AD_PROTOCOL,platform="android")
    assert view["ad_units"] == {"android":"fixture-unit"}
    assert view["ad_policy"] == {"protocol":AD_PROTOCOL,"mode":"test"}
    assert not rollout.platform_view({**PLATFORMS,"ad_units":{}},player_id="tester",protocol=AD_PROTOCOL,platform="android")["ad_platforms"]["admob"]


@pytest.mark.parametrize("mode,players", [("invalid",""),("test",""),("live","tester"),("disabled","tester"),("test","invalid/id")])
def test_bad_rollout_config_fails_startup(monkeypatch,mode,players):
    monkeypatch.setenv("GRIDSHARD_ADMOB_ROLLOUT_MODE",mode)
    monkeypatch.setenv("GRIDSHARD_ADMOB_TEST_PLAYER_IDS",players)
    with pytest.raises(ValueError): AdRollout.from_environment()


def test_valid_allowlist_config_deduplicates_without_exporting_it(monkeypatch):
    monkeypatch.setenv("GRIDSHARD_ADMOB_ROLLOUT_MODE","test")
    monkeypatch.setenv("GRIDSHARD_ADMOB_TEST_PLAYER_IDS"," tester, tester ")
    assert AdRollout.from_environment().test_players == frozenset({"tester"})


def test_store_and_purchase_responses_do_not_leak_activation_to_legacy_client(monkeypatch):
    verifier,_ = _admob()
    monkeypatch.setattr(main,"STORE_VERIFIERS",StoreVerifiers(admob=verifier))
    player=f"ad-test-{uuid4().hex}"
    monkeypatch.setattr(main,"AD_ROLLOUT",AdRollout("test",frozenset({player})))
    client=TestClient(main.app)
    legacy=client.get(f"/store/{player}").json()["providers"]
    assert legacy["ad_platforms"] == {"admob":False} and legacy["ad_units"] == {}
    query=f"?ad_protocol={AD_PROTOCOL}&ad_platform=android"
    new=client.get(f"/store/{player}{query}").json()["providers"]
    assert new["ad_policy"]["mode"] == "test" and new["ad_platforms"]["admob"]
    other=client.get(f"/store/other-{uuid4().hex}{query}").json()["providers"]
    assert not other["ad_platforms"]["admob"]
    monkeypatch.setattr(main,"PURCHASE_TEST_MODE",True)
    receipt=client.post(f"/store/{player}/purchases{query}",json={"product_id":"flux_120","provider":"test","transaction_id":uuid4().hex})
    assert receipt.status_code == 200
    assert receipt.json()["store"]["providers"]["ad_policy"]["mode"] == "test"
    replay=client.get(f"/store/{player}").json()["providers"]
    assert not replay["ad_platforms"]["admob"]  # No persisted client capability.


def test_signed_callback_and_reward_replay_are_scoped_and_fail_closed(monkeypatch):
    verifier,key=_admob()
    monkeypatch.setattr(main,"STORE_VERIFIERS",StoreVerifiers(admob=verifier))
    monkeypatch.setattr(main,"AD_TEST_MODE",False)
    player=f"ad-ssv-{uuid4().hex}"
    battle=f"ad-battle-{uuid4().hex}"
    monkeypatch.setattr(main,"AD_ROLLOUT",AdRollout("test",frozenset({player})))
    state=BattleState(battle_id=battle,match_type="arena_ai",ranked_eligible=True)
    engine=BattleEngine(state)
    for p in (player,"fixture-opponent"): engine.add_player(p)
    state.status=BattleStatus.FINISHED; state.winner_player_id=player
    state.loser_player_id="fixture-opponent"; state.finish_reason="core_destroyed"; state.finished_at_ms=120000
    main.player_progression_service.process_finished_battle(state)
    profile=main.player_profile_service.get_or_create(player)
    credits=profile.circuit_credits
    client=TestClient(main.app)
    claim=f"/profile/{player}/battles/{battle}/ad-reward"
    body={"request_id":"fixture-ad","provider":"admob","ad_protocol":AD_PROTOCOL,"ad_platform":"android"}
    assert client.post(claim,json=body).status_code == 422  # No SSV, no grant.
    assert client.get("/ads/admob/ssv?user_id=fake&signature=fake").status_code == 403
    query=_ssv_query(key,user_id=player,custom_data=battle,transaction_id=uuid4().hex)
    assert client.get("/ads/admob/ssv?"+query).status_code == 200
    assert client.get("/ads/admob/ssv?"+query).status_code == 200
    assert len(profile.verified_ad_views) == 1
    assert client.post(claim,json={"request_id":"legacy","provider":"admob"}).status_code == 422
    first=client.post(claim,json=body)
    assert first.status_code == 200, first.text
    after=profile.circuit_credits
    assert after > credits
    assert client.post(claim,json=body).status_code == 200
    assert profile.circuit_credits == after
    assert client.get("/ads/admob/ssv?"+_ssv_query(key,user_id="not-allowlisted",custom_data=battle)).json()["ignored"]


def test_signature_only_callback_never_opens_a_player_transaction(monkeypatch):
    verifier,key=_admob()
    monkeypatch.setattr(main,"STORE_VERIFIERS",StoreVerifiers(admob=verifier))
    monkeypatch.setattr(main,"AD_ROLLOUT",AdRollout())

    def forbidden_transaction(*args, **kwargs):
        raise AssertionError("Disabled rollout must not access a player transaction")

    monkeypatch.setattr(main,"_persistent_operation",forbidden_transaction)
    client=TestClient(main.app)
    assert client.get("/ads/admob/ssv?user_id=probe&signature=fake").status_code == 403
    response=client.get("/ads/admob/ssv?"+_ssv_query(key,user_id="non-player-probe",custom_data="non-battle-probe",reward_item="Savaş ödülü artırımı"))
    assert response.status_code == 200
    assert response.json() == {"ok":True,"ignored":True}


def test_ssv_rejection_logs_only_fixed_reason_not_callback_data(monkeypatch,caplog):
    verifier,key=_admob()
    monkeypatch.setattr(main,"STORE_VERIFIERS",StoreVerifiers(admob=verifier))
    monkeypatch.setattr(main,"AD_ROLLOUT",AdRollout())
    query=_ssv_query(key,user_id="private-player-marker",custom_data="private-battle-marker")
    response=TestClient(main.app).get("/ads/admob/ssv?"+query.replace("private-battle-marker","tampered"))
    assert response.status_code==403
    messages=[record.getMessage() for record in caplog.records if record.name==main.__name__]
    assert messages==["admob_ssv_rejected reason=invalid_signature"]
    assert all("private-player-marker" not in message and "private-battle-marker" not in message and "signature=" not in message for message in messages)


@pytest.mark.parametrize("mode", ["disabled", "test", "live"])
def test_panel_probe_never_accesses_economy_even_in_live_mode(monkeypatch, mode):
    verifier, key = _admob()
    monkeypatch.setattr(main, "STORE_VERIFIERS", StoreVerifiers(admob=verifier))
    monkeypatch.setattr(main, "AD_ROLLOUT", AdRollout(mode))
    def forbidden(*args, **kwargs):
        raise AssertionError("Configuration probe must never access player data")
    monkeypatch.setattr(main, "_persistent_operation", forbidden)
    client = TestClient(main.app)
    for user, data in verifier.CONFIGURATION_PROBES:
        query = _ssv_query(key,user_id=user,custom_data=data,ad_unit="synthetic-panel-unit")
        for _ in range(2):
            response = client.get("/ads/admob/ssv?" + query)
            assert response.status_code == 200
            assert response.json() == {"ok":True,"ignored":True}
        assert client.get("/ads/admob/ssv?" + query.replace("synthetic", "tampered")).status_code == 403
