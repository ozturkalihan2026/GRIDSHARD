"""Devre Yolu düzenlemesi (12 Ekim 2026): lig kademeleri, modül açılışları,
eski hesapların açık modülleri, unvanlar ve yükseltme maliyeti."""
import pytest

from app import matchmaking
from app.arena_canon import (
    ARENAS,
    BOTS,
    GRIDSHARD_CHEST_NODE_ID,
    GRIDSHARD_CHEST_REWARDS,
    LEAGUE_CHESTS,
    LEAGUE_STAGES,
    LEGACY_MODULE_UNLOCK_TROPHIES,
    MODULES,
    RANK_STAGES,
    STARTER_IDS,
    league_bot_battle_pool,
    legacy_module_unlocks,
    matchmaking_band,
    rank_stage_for_rating,
    select_bot,
    unlock_stage_for_module,
    unlocked_module_ids,
    unlocked_reward_module_ids,
)
from app.game.tutorial import TUTORIAL_ENEMY_DECK, TUTORIAL_PLAYER_DECK, TUTORIAL_REQUIRED_CARDS
from app.meta_progression import (
    CORE_UPGRADE_SHARD_CURVE,
    MetaProgressionError,
    MetaProgressionService,
    archive_and_soft_reset_season,
    module_upgrade_cost,
)
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_profile import (
    COSMETIC_UNLOCK_SOURCES,
    OPERATOR_TITLE_STAGES,
    PlayerProfileService,
    operator_title_progression,
    operator_title_view,
)
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService

ARENA_ONE = {"laser", "shield", "battery", "cooler", "emp", "amplifier"}
LEAGUE_UNLOCKS = {
    "spark": "ion_spear",
    "volt": "prism_shield",
    "reactor": "disruptor",
    "quantum": "phoenix_repair",
    "nexus": "quantum_cannon",
    "champions": "omega_amplifier",
    "legendary": "singularity_projector",
}


def build_store():
    profiles = PlayerProfileService()
    store = PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
        repository=InMemoryPlayerDataRepository(),
    )
    return profiles, store


def reload(profiles, store, player_id):
    profiles._profiles.clear()
    store.load_player(player_id)
    return profiles.get(player_id)


# -- D1-D3: kademeler ve eşikler ------------------------------------------------

def test_league_ladder_has_five_tiers_per_league_and_a_single_gridshard_league():
    names = [stage["name_tr"] for stage in LEAGUE_STAGES]
    assert len(LEAGUE_STAGES) == 36
    for league in ("Kıvılcım Ligi", "Voltaj Ligi", "Reaktör Ligi", "Kuantum Ligi",
                   "Nexus Ligi", "Şampiyonlar Ligi", "Efsanevi Lig"):
        assert [name for name in names if name.startswith(league)] == [
            f"{league} {numeral}" for numeral in ("I", "II", "III", "IV", "V")
        ]
    assert names[-1] == "GRIDSHARD Ligi"
    assert len({stage["id"] for stage in RANK_STAGES}) == len(RANK_STAGES) == 48
    assert all(stage["name_en"] for stage in LEAGUE_STAGES)


def test_league_thresholds_follow_the_published_table():
    first_tiers = {
        stage["league"]: stage["minimum_rating"]
        for stage in LEAGUE_STAGES
        if stage["league_tier"] == 1
    }
    assert first_tiers == {
        "spark": 3600, "volt": 4100, "reactor": 4600, "quantum": 5100, "nexus": 5600,
        "champions": 6100, "legendary": 7100, "gridshard": 8600,
    }
    minimums = [stage["minimum_rating"] for stage in RANK_STAGES]
    assert minimums == sorted(set(minimums))
    assert [arena["minimum_rating"] for arena in ARENAS] == list(range(0, 3600, 300))
    assert rank_stage_for_rating(3599)["id"] == "arena_12"
    assert rank_stage_for_rating(3600)["name_tr"] == "Kıvılcım Ligi I"
    assert rank_stage_for_rating(3700)["name_tr"] == "Kıvılcım Ligi II"
    assert rank_stage_for_rating(6299)["name_tr"] == "Şampiyonlar Ligi I"
    assert rank_stage_for_rating(7400)["name_tr"] == "Efsanevi Lig II"
    top = rank_stage_for_rating(9999)
    assert top["name_tr"] == "GRIDSHARD Ligi" and top["next_stage"] is None


def test_every_league_tier_gives_rewards_and_league_ends_give_the_league_chest():
    for stage in LEAGUE_STAGES:
        assert stage["nodes"], stage["id"]
        following = next(
            (item["minimum_rating"] for item in LEAGUE_STAGES if item["index"] == stage["index"] + 1),
            None,
        )
        for node in stage["nodes"]:
            assert node["trophies"] >= stage["minimum_rating"], node["id"]
            if following is not None:
                assert node["trophies"] <= following, node["id"]
        if stage["league"] != "gridshard" and stage["league_tier"] == 5:
            last = stage["nodes"][-1]
            assert last["league_chest"] == stage["league"], stage["id"]
            assert last["is_main_reward"] is True
            assert last["trophies"] == following
        elif stage["league"] != "gridshard":
            assert all("league_chest" not in node for node in stage["nodes"]), stage["id"]
    node_ids = [node["id"] for stage in RANK_STAGES for node in stage.get("nodes", ())]
    assert len(node_ids) == len(set(node_ids))
    arena_node_ids = {node["id"] for arena in ARENAS for node in arena["nodes"]}
    assert not arena_node_ids & set(node_ids)


def test_season_change_still_returns_league_players_to_the_first_league_tier():
    profile = PlayerProfileService().get_or_create("season-reset")
    profile.rating = 7250
    profile.highest_rating = 7250
    archive_and_soft_reset_season(profile, "next-season")
    assert profile.rating == 3600
    assert profile.highest_rating == 7250


def test_matchmaking_band_is_independent_of_the_displayed_tier():
    # Kuşak eski aşamalardır: arenalarda 300, liglerde 200 kupa, 5600 üstü tek.
    assert [matchmaking_band(rating) for rating in (0, 299, 300, 3599)] == [0, 0, 1, 11]
    assert matchmaking_band(3600) == matchmaking_band(3799) == 12
    assert rank_stage_for_rating(3600)["id"] != rank_stage_for_rating(3799)["id"]
    assert matchmaking_band(3800) == 13
    assert matchmaking_band(5600) == matchmaking_band(9000) == 22
    # Redis betiği aynı sabitleri taşır.
    source = open(matchmaking.__file__, encoding="utf-8").read()
    assert "if rating < 3600 then return math.floor(rating / 300) end" in source
    assert "return 12 + math.min(10, math.floor((rating - 3600) / 200))" in source


# -- D5-D7: modül açılışları ----------------------------------------------------

def test_arena_one_opens_exactly_the_six_starter_modules():
    assert set(unlocked_module_ids(0)) == ARENA_ONE
    assert set(unlocked_module_ids(299)) == ARENA_ONE
    assert set(STARTER_IDS) == ARENA_ONE and len(STARTER_IDS) == 6


def test_arenas_open_two_or_three_modules_and_leagues_open_only_on_entry():
    per_arena = {}
    for module_id, item in MODULES.items():
        per_arena.setdefault(int(item["unlock_arena"]), []).append(module_id)
    assert len(per_arena[1]) == 6
    assert all(len(per_arena[arena]) in (2, 3) for arena in range(2, 13))
    assert sum(len(per_arena[arena]) for arena in range(1, 13)) == 29
    league_modules = {
        item["unlock_league"]: module_id
        for module_id, item in MODULES.items()
        if item.get("unlock_league")
    }
    assert league_modules == LEAGUE_UNLOCKS
    for league, module_id in LEAGUE_UNLOCKS.items():
        stage = unlock_stage_for_module(module_id)
        assert stage["league"] == league and stage["league_tier"] == 1
        assert MODULES[module_id]["unlock_trophies"] == stage["minimum_rating"]
        assert MODULES[module_id]["rarity"] == "legendary"
        assert module_id not in unlocked_module_ids(stage["minimum_rating"] - 1)
        assert module_id in unlocked_module_ids(stage["minimum_rating"])
        targeted = [
            node for node in stage["nodes"]
            if node["rewards"].get("module_shard_target") == module_id
        ]
        assert len(targeted) == 1
    # Efsanevi modüller arenalarda açılmaz; GRIDSHARD Ligi modül açmaz.
    assert all(
        item["rarity"] != "legendary"
        for item in MODULES.values()
        if int(item["unlock_arena"]) <= 12
    )
    assert len(unlocked_module_ids(8599)) == len(unlocked_module_ids(8600)) == 36


def test_arena_road_only_targets_modules_open_in_that_arena():
    for arena in ARENAS:
        for node in arena["nodes"]:
            target = node["rewards"].get("module_shard_target")
            if target:
                assert int(MODULES[target]["unlock_arena"]) <= int(arena["index"]), node["id"]


def test_new_account_sees_six_open_modules_before_and_after_a_save():
    profiles, store = build_store()
    profile = profiles.get_or_create("fresh")
    service = MetaProgressionService()

    def open_ids(target):
        return {
            item["definition_id"]
            for item in service.view(target)["module_collection"]
            if item["unlocked"]
        }

    assert profile.legacy_module_unlocks == ()
    assert open_ids(profile) == ARENA_ONE
    store.save_player("fresh")
    restored = reload(profiles, store, "fresh")
    assert restored.legacy_module_unlocks == ()
    assert open_ids(restored) == ARENA_ONE
    assert service.view(restored)["statistics"]["unlocked_modules"] == 6


def test_record_from_before_the_change_keeps_every_module_it_had_open():
    profiles, store = build_store()
    profile = profiles.get_or_create("veteran")
    profile.rating = 950
    profile.highest_rating = 950
    store.save_player("veteran")
    snapshot = store.repository.load("veteran")
    # Eski sunucunun yazdığı kayıtta bu alan yoktur.
    snapshot.profile["meta_progression_state"].pop("legacy_module_unlocks")
    store.repository.save(snapshot)

    restored = reload(profiles, store, "veteran")
    old_rule = {
        module_id for module_id, trophies in LEGACY_MODULE_UNLOCK_TROPHIES.items() if trophies <= 950
    }
    assert set(restored.legacy_module_unlocks) == {"arc_cannon", "capacitor", "drone_bay", "jammer"}
    assert set(unlocked_module_ids(950, restored.legacy_module_unlocks)) == old_rule

    # Kupa düşse de sezon değişse de kayıt bir kez yazıldıktan sonra değişmez.
    restored.rating = 300
    archive_and_soft_reset_season(restored, "another-season")
    store.save_player("veteran")
    again = reload(profiles, store, "veteran")
    assert set(again.legacy_module_unlocks) == {"arc_cannon", "capacitor", "drone_bay", "jammer"}
    view = {
        item["definition_id"]: item
        for item in MetaProgressionService().view(again)["module_collection"]
    }
    assert view["jammer"]["unlocked"] is True
    assert view["railgun"]["unlocked"] is False
    assert "jammer" in unlocked_reward_module_ids(
        again.rating, again.highest_rating, (), again.legacy_module_unlocks
    )


def test_legacy_unlock_table_covers_every_module_and_never_reports_open_modules():
    assert set(LEGACY_MODULE_UNLOCK_TROPHIES) == set(MODULES)
    assert legacy_module_unlocks(0) == ("repair", "armor", "pulse_cannon")
    assert legacy_module_unlocks(8600) == ()
    for peak in range(0, 9000, 150):
        legacy = legacy_module_unlocks(peak)
        assert not set(legacy) & set(unlocked_module_ids(peak))


def test_module_view_names_the_stage_that_opens_the_card():
    profile = PlayerProfileService().get_or_create("stage-names")
    view = {
        item["definition_id"]: item
        for item in MetaProgressionService().view(profile)["module_collection"]
    }
    assert view["repair"]["unlock_arena"] == 2
    assert view["repair"]["unlock_stage_kind"] == "arena"
    assert view["repair"]["unlock_stage_id"] == "arena_2"
    assert view["ion_spear"]["unlock_arena"] == 13
    assert view["ion_spear"]["unlock_stage_kind"] == "league"
    assert view["ion_spear"]["unlock_stage_id"] == "league_spark_1"
    assert view["ion_spear"]["unlock_stage_name_tr"] == "Kıvılcım Ligi"
    assert view["ion_spear"]["unlock_stage_name_en"] == "Spark League"
    assert view["ion_spear"]["unlock_trophies"] == 3600


def test_bots_only_play_modules_open_at_their_arena_and_league_bots_follow_the_player():
    for bot in BOTS:
        assert all(
            int(MODULES[module_id]["unlock_arena"]) <= int(bot["arena"])
            for module_id in bot["battle_pool_ids"]
        ), bot["id"]
        assert len(set(bot["battle_pool_ids"])) == 6
    assert all(set(bot["battle_pool_ids"]) == ARENA_ONE for bot in BOTS if bot["arena"] == 1)

    for rating in (3600, 4700, 6100, 8600):
        open_now = set(unlocked_module_ids(rating))
        for seed in range(12):
            bot = select_bot(rating, f"match-{seed}")
            assert len(set(bot["battle_pool_ids"])) == 6
            assert set(bot["battle_pool_ids"]) <= open_now
            assert bot["match_rating"] == rating
    arena_twelve = [bot for bot in BOTS if bot["arena"] == 12][0]
    decks = {
        tuple(league_bot_battle_pool(arena_twelve["battle_pool_ids"], rank_stage_for_rating(8600), f"s{seed}"))
        for seed in range(40)
    }
    assert any(set(deck) & set(LEAGUE_UNLOCKS.values()) for deck in decks)


def test_tutorial_only_uses_modules_open_in_arena_one():
    assert set(TUTORIAL_REQUIRED_CARDS) <= ARENA_ONE
    assert set(TUTORIAL_PLAYER_DECK) == ARENA_ONE
    assert set(TUTORIAL_ENEMY_DECK) == ARENA_ONE


# -- Lig sandıkları -------------------------------------------------------------

def test_league_chests_differ_from_every_other_chest_in_name_and_content():
    from app.meta_progression import CHEST_DEFINITIONS

    other_names = {definition["name_tr"] for definition in CHEST_DEFINITIONS.values()}
    chest_nodes = [
        (stage, node)
        for stage in LEAGUE_STAGES
        for node in stage["nodes"]
        if node.get("league_chest") and stage["league"] != "gridshard"
    ]
    assert [stage["league"] for stage, _ in chest_nodes] == list(LEAGUE_CHESTS)
    names = [node["description_tr"] for _, node in chest_nodes]
    assert len(set(names)) == 7 and not set(names) & other_names
    assert all(node["description_en"] for _, node in chest_nodes)
    # Lig yolunda mağaza sandığı (Bronz, Gümüş, Altın, Elmas) hiç verilmez.
    assert not any(
        node["rewards"].get("chest_id") for stage in LEAGUE_STAGES for node in stage["nodes"]
    )
    previous = (0, 0, 0)
    for stage, node in chest_nodes:
        rewards = node["rewards"]
        target = rewards["module_shard_target"]
        # İçerik şansa bağlı değildir: ligin kendi efsanevi modülünün parçaları.
        assert MODULES[target]["unlock_league"] == stage["league"]
        assert MODULES[target]["rarity"] == "legendary"
        amounts = (rewards["circuit_credits"], rewards["flux_shards"], rewards["module_shards"])
        assert all(now > before for now, before in zip(amounts, previous)), stage["league"]
        previous = amounts
        assert set(rewards) == {"circuit_credits", "flux_shards", "module_shards", "module_shard_target"}


def test_claiming_a_league_chest_gives_its_fixed_content_once():
    service = MetaProgressionService()
    profile = PlayerProfileService().get_or_create("league-chest")
    stage = next(s for s in LEAGUE_STAGES if s["id"] == "league_spark_5")
    node = stage["nodes"][-1]
    assert (node["description_tr"], node["trophies"]) == ("Kıvılcım Sandığı", 4100)

    profile.rating = 4099
    profile.highest_rating = 4099
    with pytest.raises(MetaProgressionError):
        service.claim_arena_reward(profile, node["id"])
    profile.rating = 4100
    credits, flux = profile.circuit_credits, profile.flux_shards
    shards = profile.module_shards.get("ion_spear", 0)
    stock = len(profile.chest_slots)
    receipt = service.claim_arena_reward(profile, node["id"])
    assert receipt["module_shards"] == {"ion_spear": 6}
    assert profile.circuit_credits == credits + 1500
    assert profile.flux_shards == flux + 60
    assert profile.module_shards["ion_spear"] == shards + 6
    # Mağaza stoğuna sandık eklenmez; içerik doğrudan verilir.
    assert len(profile.chest_slots) == stock
    assert service.claim_arena_reward(profile, node["id"])["replayed"] is True
    assert profile.circuit_credits == credits + 1500


# -- D4: GRIDSHARD Sandığı ------------------------------------------------------

def test_gridshard_chest_is_the_last_stop_and_its_cosmetics_come_from_nowhere_else():
    last_stage = RANK_STAGES[-1]
    assert [node["id"] for node in last_stage["nodes"]] == [GRIDSHARD_CHEST_NODE_ID]
    assert last_stage["nodes"][0]["trophies"] == 8600
    for kind, field in (("avatar", "avatar_id"), ("avatar_frame", "avatar_frame_id"),
                        ("profile_background", "profile_background_id"), ("battle_emoji", "emoji_id")):
        assert COSMETIC_UNLOCK_SOURCES[kind][GRIDSHARD_CHEST_REWARDS[field]] == [{"kind": "gridshard_chest"}]

    service = MetaProgressionService()
    profile = PlayerProfileService().get_or_create("apex")
    profile.rating = 8599
    profile.highest_rating = 8599
    with pytest.raises(MetaProgressionError):
        service.claim_arena_reward(profile, GRIDSHARD_CHEST_NODE_ID)
    assert "gridshard_apex" not in profile.unlocked_avatar_ids

    profile.rating = 8600
    credits, flux = profile.circuit_credits, profile.flux_shards
    receipt = service.claim_arena_reward(profile, GRIDSHARD_CHEST_NODE_ID)
    assert receipt["rewards"]["avatar_id"] == "gridshard_apex"
    assert profile.circuit_credits == credits + GRIDSHARD_CHEST_REWARDS["circuit_credits"]
    assert profile.flux_shards == flux + GRIDSHARD_CHEST_REWARDS["flux_shards"]
    assert "gridshard_apex" in profile.unlocked_avatar_ids
    assert "gridshard_apex" in profile.unlocked_avatar_frame_ids
    assert "gridshard_apex" in profile.unlocked_profile_background_ids
    assert "gridshard_apex" in profile.unlocked_battle_emoji_ids
    assert service.claim_arena_reward(profile, GRIDSHARD_CHEST_NODE_ID)["replayed"] is True
    assert profile.circuit_credits == credits + GRIDSHARD_CHEST_REWARDS["circuit_credits"]
    assert profile.unlocked_avatar_ids.count("gridshard_apex") == 1


# -- D8: unvanlar ---------------------------------------------------------------

def test_titles_keep_trophy_steps_and_ask_for_realistic_win_counts():
    table = [(s["title_tr"], s["required_trophies"], s["required_wins"]) for s in OPERATOR_TITLE_STAGES]
    assert table == [
        ("Devre Çırağı", 0, 0),
        ("Devre Teknisyeni", 300, 20),
        ("İletken Ustası", 900, 60),
        ("Çekirdek Muhafızı", 1800, 130),
        ("Arena Mimarı", 3000, 220),
        ("Lig Öncüsü", 3600, 280),
        ("Nexus Stratejisti", 5600, 450),
        ("Şampiyon Operatör", 6100, 550),
        ("Efsane Mühendisi", 7100, 750),
        ("GRIDSHARD Efsanesi", 8600, 1000),
    ]
    for _, trophies, wins in table[1:]:
        # Hiç kaybetmeyen oyuncu galibiyet başına en çok 33 kupa alır.
        assert wins > trophies / 33


def test_last_title_belongs_to_players_who_reached_the_gridshard_league():
    assert operator_title_progression(8599, 5000)["current"]["title_tr"] == "Efsane Mühendisi"
    assert operator_title_progression(8600, 999)["current"]["title_tr"] == "Efsane Mühendisi"
    assert operator_title_progression(8600, 1000)["current"]["title_tr"] == "GRIDSHARD Efsanesi"


def test_title_follows_peak_trophies_so_a_season_reset_does_not_take_it_away():
    profile = PlayerProfileService().get_or_create("peak-title")
    profile.rating = 8600
    profile.highest_rating = 8600
    profile.lifetime_stats["wins"] = 1000
    assert profile.to_view()["operator_title"] == "GRIDSHARD Efsanesi"
    archive_and_soft_reset_season(profile, "after-apex")
    assert profile.rating == 3600
    assert profile.to_view()["operator_title"] == "GRIDSHARD Efsanesi"


def test_title_claimed_under_the_old_win_counts_stays_with_the_player():
    # Eski kural: 900 kupa ve 10 galibiyet. Ödülünü almış oyuncu unvanı korur.
    kept = operator_title_view(950, 12, ("devre_teknisyeni", "iletken_ustasi"))
    assert kept["current"]["id"] == "iletken_ustasi"
    assert operator_title_view(950, 12, ())["current"]["id"] == "devre_ciragi"
    # Son unvan bunun dışındadır.
    old_top = operator_title_view(4300, 120, ("gridshard_efsanesi",))
    assert old_top["current"]["id"] != "gridshard_efsanesi"


# -- D9: yükseltme maliyeti -----------------------------------------------------

def totals(module_id):
    steps = [module_upgrade_cost(module_id, level) for level in range(14)]
    return (
        sum(step["circuit_credits"] for step in steps),
        sum(step["shards"] for step in steps),
        sum(step["flux_shards"] for step in steps),
    )


def test_upgrade_cost_totals_match_the_published_table():
    assert totals("laser") == (100_000, 962, 0)        # sıradan
    assert totals("emp") == (150_000, 726, 0)          # ender
    assert totals("railgun") == (200_000, 486, 0)      # destansı
    assert totals("ion_spear") == (300_000, 292, 500)  # efsanevi
    assert module_upgrade_cost("laser", 0) == {
        "next_level": 1, "circuit_credits": 100, "shards": 2, "flux_shards": 0,
    }
    assert module_upgrade_cost("ion_spear", 6) == {
        "next_level": 7, "circuit_credits": 6600, "shards": 14, "flux_shards": 20,
    }
    assert module_upgrade_cost("ion_spear", 13)["flux_shards"] == 120


def test_rarer_modules_need_fewer_pieces_and_more_credits_at_every_level():
    samples = {"common": "laser", "rare": "emp", "epic": "railgun", "legendary": "ion_spear"}
    assert {rarity: MODULES[module_id]["rarity"] for rarity, module_id in samples.items()} == {
        rarity: rarity for rarity in samples
    }
    for level in range(14):
        costs = [module_upgrade_cost(samples[r], level) for r in ("common", "rare", "epic", "legendary")]
        credits = [cost["circuit_credits"] for cost in costs]
        shards = [cost["shards"] for cost in costs]
        assert credits == sorted(set(credits)), level
        assert shards == sorted(shards, reverse=True), level
        if level:
            previous = module_upgrade_cost("laser", level - 1)
            assert costs[0]["circuit_credits"] > previous["circuit_credits"]
            assert costs[0]["shards"] > previous["shards"]


def test_legendary_upgrade_spends_flux_and_is_refused_without_it():
    service = MetaProgressionService()
    profile = PlayerProfileService().get_or_create("legendary-upgrade")
    profile.rating = 3600
    profile.highest_rating = 3600
    profile.module_upgrade_levels["ion_spear"] = 6
    profile.module_shards["ion_spear"] = 14
    profile.circuit_credits = 6600
    profile.flux_shards = 19
    with pytest.raises(MetaProgressionError, match="20 Akı"):
        service.upgrade_module(profile, "ion_spear", "need-flux")
    assert (profile.circuit_credits, profile.flux_shards) == (6600, 19)

    profile.flux_shards = 25
    receipt = service.upgrade_module(profile, "ion_spear", "with-flux")
    assert receipt["level_after"] == 7
    assert receipt["flux_shards_spent"] == 20
    assert (profile.circuit_credits, profile.flux_shards) == (0, 5)
    assert profile.module_shards["ion_spear"] == 0
    # Aynı istek yinelenirse yeniden harcanmaz.
    assert service.upgrade_module(profile, "ion_spear", "with-flux") == receipt
    assert profile.flux_shards == 5


def test_existing_module_levels_are_untouched_by_the_new_table():
    profiles, store = build_store()
    profile = profiles.get_or_create("leveled")
    profile.module_upgrade_levels["laser"] = 9
    store.save_player("leveled")
    restored = reload(profiles, store, "leveled")
    view = next(
        item for item in MetaProgressionService().view(restored)["module_collection"]
        if item["definition_id"] == "laser"
    )
    assert view["level"] == 9
    assert view["next_upgrade_cost"] == {
        "next_level": 10, "circuit_credits": 7000, "shards": 92, "flux_shards": 0,
    }


def test_core_upgrade_needs_reachable_piece_counts_and_more_flux():
    assert sum(CORE_UPGRADE_SHARD_CURVE) == 109 and len(CORE_UPGRADE_SHARD_CURVE) == 14
    service = MetaProgressionService()
    profile = PlayerProfileService().get_or_create("core-cost")
    core = next(c for c in service.view(profile)["cores"]["types"] if c["id"] == "core_resonance")
    assert core["next_upgrade_cost"] == {"flux_shards": 50, "shards": 1}
    profile.core_upgrade_levels["core_resonance"] = 13
    core = next(c for c in service.view(profile)["cores"]["types"] if c["id"] == "core_resonance")
    assert core["next_upgrade_cost"] == {"flux_shards": 700, "shards": 22}


# -- Lige girişte açılan modülün maç sonucunda bildirilmesi -----------------------

def finished_ranked_battle(battle_id, winner="a"):
    from app.game.engine import BattleEngine
    from app.game.models import BattleState, BattleStatus

    state = BattleState(battle_id=battle_id, match_type="ranked_pvp", ranked_eligible=True)
    engine = BattleEngine(state)
    for player_id in ("a", "b"):
        engine.add_player(player_id)
    state.status = BattleStatus.FINISHED
    state.winner_player_id = winner
    state.loser_player_id = "b" if winner == "a" else "a"
    state.finish_reason = "core_destroyed"
    state.finished_at_ms = 120_000
    state.result_summary = {"a": {"damage_dealt": 900}, "b": {"damage_dealt": 450}}
    return state


def test_match_result_reports_the_module_opened_by_entering_a_league_once():
    from app.player_progression import PlayerProgressionService

    profiles = PlayerProfileService()
    progression = PlayerProgressionService(profiles)
    for player_id in ("a", "b"):
        profile = profiles.get_or_create(player_id)
        profile.rating = 3590
        profile.highest_rating = 3590

    progression.process_finished_battle(finished_ranked_battle("into-spark"))
    first = progression.battle_results("into-spark")
    assert first["a"]["rating_after"] >= 3600
    assert first["a"]["rank_after"]["name_tr"] == "Kıvılcım Ligi I"
    assert first["a"]["newly_unlocked_module_ids"] == ["ion_spear"]
    assert first["b"]["newly_unlocked_module_ids"] == []

    # Aynı ligde kazanılan sonraki maç yeni modül bildirmez.
    progression.process_finished_battle(finished_ranked_battle("inside-spark"))
    assert progression.battle_results("inside-spark")["a"]["newly_unlocked_module_ids"] == []

    # Ligden düşüp yeniden çıkan oyuncuya modül ikinci kez tanıtılmaz.
    winner = profiles.get("a")
    winner.rating = 3590
    progression.process_finished_battle(finished_ranked_battle("back-into-spark"))
    again = progression.battle_results("back-into-spark")["a"]
    assert again["rating_after"] >= 3600
    assert again["newly_unlocked_module_ids"] == []
