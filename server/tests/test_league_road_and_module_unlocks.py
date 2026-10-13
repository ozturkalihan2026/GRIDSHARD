"""Devre Yolu düzenlemesi (12 Ekim 2026): kupa ölçeği, lig kademeleri, modül
açılışları, eski hesapların kupası ve açık modülleri, unvanlar ve yükseltme
maliyeti."""
import pytest

from app import matchmaking
from app.arena_canon import (
    ARENAS,
    BOTS,
    GRIDSHARD_CHEST_NODE_ID,
    GRIDSHARD_CHEST_REWARDS,
    LEAGUE_CHESTS,
    LEAGUE_FLOOR_RATING,
    LEAGUE_STAGES,
    LEGACY_MODULE_UNLOCK_TROPHIES,
    MODULES,
    RANK_STAGES,
    STARTER_IDS,
    TROPHY_SCALE_VERSION,
    arena_index_for_rating,
    league_bot_battle_pool,
    legacy_module_unlocks,
    matchmaking_band,
    matchmaking_band_lua,
    rank_stage_for_rating,
    rating_from_legacy_scale,
    rating_on_current_scale,
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
LEGENDARY_MODULES = {
    "ion_spear", "prism_shield", "disruptor", "phoenix_repair",
    "quantum_cannon", "omega_amplifier", "singularity_projector",
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
        "spark": 5400, "volt": 5800, "reactor": 6200, "quantum": 6600, "nexus": 7000,
        "champions": 7400, "legendary": 7900, "gridshard": 8600,
    }
    minimums = [stage["minimum_rating"] for stage in RANK_STAGES]
    assert minimums == sorted(set(minimums))
    # Arenalar ileride genişler ve 5400 kupada biter; ligler 3200 kupa sürer.
    widths = [arena["maximum_rating"] - arena["minimum_rating"] + 1 for arena in ARENAS]
    assert widths == [300, 300, 350, 350, 400, 450, 500, 500, 500, 550, 600, 600]
    assert [arena["minimum_rating"] for arena in ARENAS] == [
        0, 300, 600, 950, 1300, 1700, 2150, 2650, 3150, 3650, 4200, 4800,
    ]
    assert all(
        before["maximum_rating"] + 1 == after["minimum_rating"]
        for before, after in zip(ARENAS, ARENAS[1:])
    )
    assert LEAGUE_FLOOR_RATING == ARENAS[-1]["maximum_rating"] + 1 == 5400
    assert rank_stage_for_rating(5399)["id"] == "arena_12"
    assert rank_stage_for_rating(5400)["name_tr"] == "Kıvılcım Ligi I"
    assert rank_stage_for_rating(5480)["name_tr"] == "Kıvılcım Ligi II"
    assert rank_stage_for_rating(7499)["name_tr"] == "Şampiyonlar Ligi I"
    assert rank_stage_for_rating(8040)["name_tr"] == "Efsanevi Lig II"
    top = rank_stage_for_rating(9999)
    assert top["name_tr"] == "GRIDSHARD Ligi" and top["next_stage"] is None
    assert [arena_index_for_rating(rating) for rating in (0, 299, 300, 949, 950, 5399, 9000)] == [
        1, 1, 2, 3, 4, 12, 12,
    ]


def test_arena_reward_stops_keep_their_ids_and_sit_inside_their_arena():
    stops = {
        node["id"]: (arena, node)
        for arena in ARENAS for node in arena["nodes"] if node.get("rewards")
    }
    for arena, node in stops.values():
        assert arena["minimum_rating"] < node["trophies"] <= arena["maximum_rating"] + 1, node["id"]
        assert node["trophies"] % 25 == 0, node["id"]
    for arena in ARENAS:
        trophies = [node["trophies"] for node in arena["nodes"] if node.get("rewards")]
        assert trophies == sorted(trophies), arena["id"]
    # Kimlik eski kupayı taşır ve değişmez: alınmış ödül yeniden alınamaz.
    assert stops["arena_2_375"][1]["trophies"] == 375
    assert stops["arena_7_2100"][1]["trophies"] == 2650
    assert stops["arena_12_3600"][1]["trophies"] == 5400
    assert stops["arena_12_finish"][1]["trophies"] == 5400
    assert len(stops) == 78


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
    profile.rating = 8250
    profile.highest_rating = 8250
    archive_and_soft_reset_season(profile, "next-season")
    assert profile.rating == 5400
    assert profile.highest_rating == 8250
    # Arena oyuncusunun kupası sezon değişiminde değişmez.
    arena_player = PlayerProfileService().get_or_create("season-arena")
    arena_player.rating = 5399
    archive_and_soft_reset_season(arena_player, "next-season")
    assert arena_player.rating == 5399


def test_matchmaking_band_is_independent_of_the_displayed_tier():
    # Kuşak arenalarda arenanın kendisi, liglerde 200 kupadır; 7400 üstü tektir.
    assert [matchmaking_band(rating) for rating in (0, 299, 300, 949, 950, 5399)] == [0, 0, 1, 2, 3, 11]
    for arena in ARENAS:
        assert matchmaking_band(arena["minimum_rating"]) == arena["index"] - 1
        assert matchmaking_band(arena["maximum_rating"]) == arena["index"] - 1
    assert matchmaking_band(5400) == matchmaking_band(5599) == 12
    assert rank_stage_for_rating(5400)["id"] != rank_stage_for_rating(5599)["id"]
    assert matchmaking_band(5600) == 13
    assert matchmaking_band(7399) == 21
    assert matchmaking_band(7400) == matchmaking_band(9000) == 22
    # Redis betiği eşikleri aynı tablodan alır.
    lua = matchmaking_band_lua()
    assert "local arena_floors = {0, 300, 600, 950, 1300, 1700, 2150, 2650, 3150, 3650, 4200, 4800}" in lua
    assert "if rating >= 5400 then" in lua
    assert "return 12 + math.min(10, math.floor((rating - 5400) / 200))" in lua
    assert lua in matchmaking._REDIS_TRY_MATCH_LUA
    assert "stage(source.rating) == stage(candidate.rating)" in matchmaking._REDIS_TRY_MATCH_LUA
    source = open(matchmaking.__file__, encoding="utf-8").read()
    assert "3600" not in source and "/ 300" not in source


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
        module_id for module_id, item in MODULES.items() if item.get("unlock_league")
    }
    assert league_modules == LEGENDARY_MODULES
    # Efsanevi modüllerin yedisi de ilk lige girişte açılır; liglere dağıtılmaz.
    first_league = LEAGUE_STAGES[0]
    assert first_league["name_tr"] == "Kıvılcım Ligi I"
    for module_id in LEGENDARY_MODULES:
        assert unlock_stage_for_module(module_id)["id"] == first_league["id"]
        assert MODULES[module_id]["unlock_league"] == "spark"
        assert MODULES[module_id]["unlock_trophies"] == first_league["minimum_rating"]
        assert MODULES[module_id]["rarity"] == "legendary"
        assert module_id not in unlocked_module_ids(first_league["minimum_rating"] - 1)
        assert module_id in unlocked_module_ids(first_league["minimum_rating"])
    assert len(unlocked_module_ids(first_league["minimum_rating"])) == 36
    # Lig yolunda belirli bir modülün parçasını veren durak yoktur.
    assert not any(
        node["rewards"].get("module_shard_target") or node["rewards"].get("module_id")
        for stage in LEAGUE_STAGES for node in stage["nodes"]
    )
    # Efsanevi modüller arenalarda açılmaz; sonraki ligler modül açmaz.
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
    # Eski sunucunun yazdığı kayıtta bu alanlar yoktur; kupa eski ölçektedir.
    snapshot.profile["meta_progression_state"].pop("legacy_module_unlocks")
    snapshot.profile["meta_progression_state"].pop("trophy_scale_version")
    store.repository.save(snapshot)

    restored = reload(profiles, store, "veteran")
    old_rule = {
        module_id for module_id, trophies in LEGACY_MODULE_UNLOCK_TROPHIES.items() if trophies <= 950
    }
    # 950 kupa eski Arena 4'ün altıda biriydi; yeni Arena 4'te (950-1299) aynı yerdedir.
    assert restored.rating == restored.highest_rating == 1009
    assert set(restored.legacy_module_unlocks) == {"arc_cannon", "capacitor", "drone_bay", "jammer"}
    assert set(unlocked_module_ids(restored.highest_rating, restored.legacy_module_unlocks)) == old_rule

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
        moved = rating_from_legacy_scale(peak)
        assert not set(legacy) & set(unlocked_module_ids(moved))
        # Eski kuralla açık olan her modül taşımadan sonra da açıktır.
        open_before = {
            module_id for module_id, trophies in LEGACY_MODULE_UNLOCK_TROPHIES.items() if trophies <= peak
        }
        assert open_before <= set(unlocked_module_ids(moved, legacy))


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
    assert view["ion_spear"]["unlock_trophies"] == 5400
    for module_id in LEGENDARY_MODULES:
        assert view[module_id]["unlock_arena"] == 13, module_id
        assert view[module_id]["unlock_stage_id"] == "league_spark_1", module_id


def test_bots_only_play_modules_open_at_their_arena_and_league_bots_follow_the_player():
    for bot in BOTS:
        assert all(
            int(MODULES[module_id]["unlock_arena"]) <= int(bot["arena"])
            for module_id in bot["battle_pool_ids"]
        ), bot["id"]
        assert len(set(bot["battle_pool_ids"])) == 6
    assert all(set(bot["battle_pool_ids"]) == ARENA_ONE for bot in BOTS if bot["arena"] == 1)

    for rating in (5400, 6500, 7400, 8600):
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
    assert any(set(deck) & LEGENDARY_MODULES for deck in decks)


def test_league_bots_carry_more_legendary_modules_in_later_leagues():
    # Modüllerin hepsi ilk ligde açılsa da bot zorluğu lig lig artar.
    arena_twelve = [bot for bot in BOTS if bot["arena"] == 12]
    most = {}
    for stage in LEAGUE_STAGES:
        counts = [
            len(set(league_bot_battle_pool(bot["battle_pool_ids"], stage, f"ramp-{seed}")) & LEGENDARY_MODULES)
            for bot in arena_twelve for seed in range(30)
        ]
        assert max(counts) <= min(7, stage["league_order"]), stage["id"]
        most[stage["league"]] = max(max(counts), most.get(stage["league"], 0))
    assert most["spark"] == 1
    assert most["legendary"] > most["spark"]


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
        # İçerik şansa ve belirli bir modüle bağlı değildir: evrensel parça.
        assert set(rewards) == {"circuit_credits", "flux_shards", "universal_module_shards"}
        amounts = (rewards["circuit_credits"], rewards["flux_shards"], rewards["universal_module_shards"])
        assert all(now > before for now, before in zip(amounts, previous)), stage["league"]
        previous = amounts
    assert [node["rewards"]["universal_module_shards"] for _, node in chest_nodes] == [5, 7, 9, 12, 15, 20, 25]


def test_claiming_a_league_chest_gives_its_fixed_content_once():
    service = MetaProgressionService()
    profile = PlayerProfileService().get_or_create("league-chest")
    stage = next(s for s in LEAGUE_STAGES if s["id"] == "league_spark_5")
    node = stage["nodes"][-1]
    assert (node["description_tr"], node["trophies"]) == ("Kıvılcım Sandığı", 5800)

    profile.rating = 5799
    profile.highest_rating = 5799
    with pytest.raises(MetaProgressionError):
        service.claim_arena_reward(profile, node["id"])
    profile.rating = 5800
    credits, flux = profile.circuit_credits, profile.flux_shards
    universal = profile.universal_module_shards
    module_shards = dict(profile.module_shards)
    stock = len(profile.chest_slots)
    receipt = service.claim_arena_reward(profile, node["id"])
    assert receipt["rewards"]["universal_module_shards"] == 5
    assert receipt["module_shards"] == {} and receipt["module_definition_id"] is None
    assert profile.circuit_credits == credits + 1500
    assert profile.flux_shards == flux + 60
    assert profile.universal_module_shards == universal + 5
    assert profile.module_shards == module_shards
    # Mağaza stoğuna sandık eklenmez; içerik doğrudan verilir.
    assert len(profile.chest_slots) == stock
    assert service.claim_arena_reward(profile, node["id"])["replayed"] is True
    assert profile.circuit_credits == credits + 1500
    assert profile.universal_module_shards == universal + 5


# -- D4: GRIDSHARD Sandığı ------------------------------------------------------

def test_gridshard_chest_is_the_last_stop_and_its_cosmetics_come_from_nowhere_else():
    last_stage = RANK_STAGES[-1]
    assert [node["id"] for node in last_stage["nodes"]] == [GRIDSHARD_CHEST_NODE_ID]
    # Lig 8600'de başlar; sandık ligin içinde, 10000 kupadadır.
    assert last_stage["minimum_rating"] == 8600
    assert last_stage["nodes"][0]["trophies"] == 10000
    efsane = next(n for s in LEAGUE_STAGES for n in s["nodes"] if n.get("league_chest") == "legendary")
    assert efsane["trophies"] == 8600
    for kind, field in (("avatar", "avatar_id"), ("avatar_frame", "avatar_frame_id"),
                        ("profile_background", "profile_background_id"), ("battle_emoji", "emoji_id")):
        assert COSMETIC_UNLOCK_SOURCES[kind][GRIDSHARD_CHEST_REWARDS[field]] == [{"kind": "gridshard_chest"}]

    service = MetaProgressionService()
    profile = PlayerProfileService().get_or_create("apex")
    profile.rating = 9999
    profile.highest_rating = 9999
    with pytest.raises(MetaProgressionError):
        service.claim_arena_reward(profile, GRIDSHARD_CHEST_NODE_ID)
    assert "gridshard_apex" not in profile.unlocked_avatar_ids

    profile.rating = 10000
    credits, flux = profile.circuit_credits, profile.flux_shards
    universal = profile.universal_module_shards
    module_shards = dict(profile.module_shards)
    receipt = service.claim_arena_reward(profile, GRIDSHARD_CHEST_NODE_ID)
    assert receipt["rewards"]["avatar_id"] == "gridshard_apex"
    # Rastgele modül parçası yerine 40 evrensel parça.
    assert GRIDSHARD_CHEST_REWARDS["universal_module_shards"] == 40
    assert "module_shards" not in GRIDSHARD_CHEST_REWARDS
    assert profile.universal_module_shards == universal + 40
    assert profile.module_shards == module_shards
    assert profile.circuit_credits == credits + GRIDSHARD_CHEST_REWARDS["circuit_credits"]
    assert profile.flux_shards == flux + GRIDSHARD_CHEST_REWARDS["flux_shards"]
    assert "gridshard_apex" in profile.unlocked_avatar_ids
    assert "gridshard_apex" in profile.unlocked_avatar_frame_ids
    assert "gridshard_apex" in profile.unlocked_profile_background_ids
    assert "gridshard_apex" in profile.unlocked_battle_emoji_ids
    assert service.claim_arena_reward(profile, GRIDSHARD_CHEST_NODE_ID)["replayed"] is True
    assert profile.circuit_credits == credits + GRIDSHARD_CHEST_REWARDS["circuit_credits"]
    assert profile.universal_module_shards == universal + 40
    assert profile.unlocked_avatar_ids.count("gridshard_apex") == 1


# -- D8: unvanlar ---------------------------------------------------------------

def test_titles_follow_their_stage_and_ask_for_realistic_win_counts():
    table = [(s["title_tr"], s["required_trophies"], s["required_wins"]) for s in OPERATOR_TITLE_STAGES]
    assert table == [
        ("Devre Çırağı", 0, 0),
        ("Devre Teknisyeni", 300, 20),
        ("İletken Ustası", 950, 60),
        ("Çekirdek Muhafızı", 2150, 130),
        ("Arena Mimarı", 4200, 220),
        ("Lig Öncüsü", 5400, 280),
        ("Nexus Stratejisti", 7000, 450),
        ("Şampiyon Operatör", 7400, 550),
        ("Efsane Mühendisi", 7900, 750),
        ("GRIDSHARD Efsanesi", 10000, 1000),
    ]
    # Kupa koşulu bir aşamanın başlangıcıdır: Arena 2, 4, 7, 11 ve beş lig.
    assert [rank_stage_for_rating(trophies)["name_tr"] for _, trophies, _ in table[1:]] == [
        "Röle Sokakları", "İletken Dökümhane", "Darbe Surları", "Shard Nexus",
        "Kıvılcım Ligi I", "Nexus Ligi I", "Şampiyonlar Ligi I", "Efsanevi Lig I", "GRIDSHARD Ligi",
    ]
    # Son unvan ligin girişini değil zirvesini (GRIDSHARD Sandığı'nın kupasını) ister.
    for _, trophies, _ in table[1:-1]:
        assert rank_stage_for_rating(trophies)["minimum_rating"] == trophies
    wins = [required_wins for _, _, required_wins in table]
    assert wins == sorted(set(wins))
    # Galibiyet koşulu sayılmaya değer kalır: en üst unvan için kupa koşulu,
    # hiç kaybetmeyen oyuncunun (galibiyet başına en çok 33 kupa) vardığı
    # galibiyet sayısından çok fazlasını ister.
    assert table[-1][2] > table[-1][1] / 33


def test_last_title_belongs_to_players_who_reached_the_gridshard_league():
    assert operator_title_progression(9999, 5000)["current"]["title_tr"] == "Efsane Mühendisi"
    assert operator_title_progression(10000, 999)["current"]["title_tr"] == "Efsane Mühendisi"
    assert operator_title_progression(10000, 1000)["current"]["title_tr"] == "GRIDSHARD Efsanesi"


def test_title_follows_peak_trophies_so_a_season_reset_does_not_take_it_away():
    profile = PlayerProfileService().get_or_create("peak-title")
    profile.rating = 10000
    profile.highest_rating = 10000
    profile.lifetime_stats["wins"] = 1000
    assert profile.to_view()["operator_title"] == "GRIDSHARD Efsanesi"
    archive_and_soft_reset_season(profile, "after-apex")
    assert profile.rating == 5400
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
    profile.rating = 5400
    profile.highest_rating = 5400
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


# -- Lige girişte açılan modüllerin maç sonucunda bildirilmesi ---------------------

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


def test_match_result_reports_the_modules_opened_by_entering_the_first_league_once():
    from app.player_progression import PlayerProgressionService

    profiles = PlayerProfileService()
    progression = PlayerProgressionService(profiles)
    for player_id in ("a", "b"):
        profile = profiles.get_or_create(player_id)
        profile.rating = 5390
        profile.highest_rating = 5390

    progression.process_finished_battle(finished_ranked_battle("into-spark"))
    first = progression.battle_results("into-spark")
    assert first["a"]["rating_after"] >= 5400
    assert first["a"]["rank_after"]["name_tr"] == "Kıvılcım Ligi I"
    assert set(first["a"]["newly_unlocked_module_ids"]) == LEGENDARY_MODULES
    assert len(first["a"]["newly_unlocked_module_ids"]) == 7
    assert first["b"]["newly_unlocked_module_ids"] == []

    # Aynı ligde kazanılan sonraki maç yeni modül bildirmez.
    progression.process_finished_battle(finished_ranked_battle("inside-spark"))
    assert progression.battle_results("inside-spark")["a"]["newly_unlocked_module_ids"] == []

    # Ligden düşüp yeniden çıkan oyuncuya modüller ikinci kez tanıtılmaz.
    winner = profiles.get("a")
    winner.rating = 5390
    progression.process_finished_battle(finished_ranked_battle("back-into-spark"))
    again = progression.battle_results("back-into-spark")["a"]
    assert again["rating_after"] >= 5400
    assert again["newly_unlocked_module_ids"] == []


# -- Eski kayıtların kupasının yeni ölçeğe taşınması --------------------------------

def test_legacy_trophies_keep_their_stage_and_their_share_of_it():
    # Arena: aynı arena, arenanın aynı oranı (yukarı yuvarlanır).
    assert [rating_from_legacy_scale(rating) for rating in (0, 150, 299, 300, 599, 600, 900, 950)] == [
        0, 150, 299, 300, 599, 600, 950, 1009,
    ]
    assert rating_from_legacy_scale(2200) == 2817   # Arena 8'in üçte biri
    assert rating_from_legacy_scale(3500) == 5200   # Arena 12'nin üçte ikisi
    assert rating_from_legacy_scale(3599) == 5398
    for legacy in range(0, 3600):
        moved = rating_from_legacy_scale(legacy)
        assert arena_index_for_rating(moved) == legacy // 300 + 1, legacy
        assert moved < LEAGUE_FLOOR_RATING
    # Lig: eski beş lig (200'er kupa) yeni beş lige, Şampiyonlar I-V yeni
    # Şampiyonlar Ligi'ne, Efsanevi Lig (5600+) yeni Efsanevi Lig'e gider.
    assert rating_from_legacy_scale(3600) == 5400
    assert rank_stage_for_rating(rating_from_legacy_scale(3799))["league"] == "spark"
    assert rating_from_legacy_scale(3800) == 5800
    assert rating_from_legacy_scale(4400) == 7000
    assert rank_stage_for_rating(rating_from_legacy_scale(4599))["league"] == "nexus"
    assert rating_from_legacy_scale(4600) == 7400
    assert rank_stage_for_rating(rating_from_legacy_scale(5599))["name_tr"] == "Şampiyonlar Ligi V"
    assert rating_from_legacy_scale(5600) == 7900
    assert rating_from_legacy_scale(6299) == 8599
    assert rank_stage_for_rating(rating_from_legacy_scale(6300))["name_tr"] == "GRIDSHARD Ligi"
    # Sıralama korunur.
    moved = [rating_from_legacy_scale(rating) for rating in range(0, 7000)]
    assert moved == sorted(moved)
    assert len(set(moved[:3600])) == 3600
    # Ölçek sürümü yazılmış kayıt bir daha taşınmaz.
    assert rating_on_current_scale(2200, None) == rating_on_current_scale(2200, 1) == 2817
    assert rating_on_current_scale(2200, TROPHY_SCALE_VERSION) == 2200


def test_moved_trophies_never_fall_behind_a_reward_stop_already_reached():
    old_width = 300
    for arena in ARENAS:
        old_floor = (arena["index"] - 1) * old_width
        for node in arena["nodes"]:
            if not node.get("rewards"):
                continue
            # Durağın kimliği eski kupasını taşır; arena sonu durağı eski arena sonundaydı.
            suffix = node["id"].rsplit("_", 1)[1]
            legacy_trophies = old_floor + old_width if suffix == "finish" else int(suffix)
            assert old_floor < legacy_trophies <= old_floor + old_width, node["id"]
            for reached in (legacy_trophies, legacy_trophies + 1, legacy_trophies + 24):
                assert rating_from_legacy_scale(reached) >= node["trophies"], (node["id"], reached)


def test_record_from_the_old_trophy_scale_is_moved_once_on_load():
    profiles, store = build_store()
    profile = profiles.get_or_create("old-scale")
    profile.rating = 2000
    profile.highest_rating = 2200
    profile.arena_reward_claims = ("arena_7_1850", "arena_7_1900")
    profile.season_archives.append({
        "season_id": "gridshard_2026_09", "final_rating": 1900,
        "final_rank": {"id": "arena_7", "name_tr": "Darbe Surları"},
        "season_xp": 120, "claimed_tiers": [], "archived_at": "2026-09-28T00:00:00Z",
    })
    store.save_player("old-scale")
    snapshot = store.repository.load("old-scale")
    assert snapshot.profile["meta_progression_state"]["trophy_scale_version"] == TROPHY_SCALE_VERSION
    # Canlıdaki (12 Ekim 2026 öncesi) kayıt: ölçek sürümü ve eski açılış alanı yok.
    snapshot.profile["meta_progression_state"].pop("trophy_scale_version")
    snapshot.profile["meta_progression_state"].pop("legacy_module_unlocks")
    store.repository.save(snapshot)

    restored = reload(profiles, store, "old-scale")
    # 2000 kupa eski Arena 7'nin üçte ikisi, 2200 eski Arena 8'in üçte biriydi.
    assert restored.rating == 2484
    assert restored.highest_rating == 2817
    assert rank_stage_for_rating(restored.rating)["id"] == "arena_7"
    assert rank_stage_for_rating(restored.highest_rating)["id"] == "arena_8"
    # 1900 kupa eski Arena 7'nin üçte biriydi.
    assert restored.season_archives[-1]["final_rating"] == 2317
    assert restored.season_archives[-1]["final_rank"]["id"] == "arena_7"
    assert restored.season_archives[-1]["season_xp"] == 120
    # Alınmış ödüller alınmış kalır; ulaşılmış duraklar ulaşılmış kalır.
    assert restored.arena_reward_claims == ("arena_7_1850", "arena_7_1900")
    road = {
        node["id"]: node
        for arena in MetaProgressionService().arena_path(restored) for node in arena["nodes"]
    }
    assert road["arena_7_1850"]["claimed"] and not road["arena_7_1850"]["claimable"]
    assert road["arena_7_2100"]["claimable"] and road["arena_8_2200"]["claimable"]
    assert not road["arena_8_2275"]["claimable"]
    # Eski kuralla açık olan modüller açık kalır.
    old_rule = {
        module_id for module_id, trophies in LEGACY_MODULE_UNLOCK_TROPHIES.items() if trophies <= 2200
    }
    assert old_rule <= set(unlocked_module_ids(restored.highest_rating, restored.legacy_module_unlocks))

    # Taşınan kayıt yeni ölçekle yazılır ve ikinci yüklemede değişmez.
    store.save_player("old-scale")
    saved = store.repository.load("old-scale").profile
    assert saved["rating"] == 2484
    assert saved["meta_progression_state"]["highest_rating"] == 2817
    assert saved["meta_progression_state"]["trophy_scale_version"] == TROPHY_SCALE_VERSION
    again = reload(profiles, store, "old-scale")
    assert (again.rating, again.highest_rating) == (2484, 2817)
    assert again.season_archives[-1]["final_rating"] == 2317


def test_leaderboard_reads_cold_records_on_the_current_trophy_scale(monkeypatch):
    # Güncellemeden beri oturum açmamış oyuncunun kaydı eski ölçekte durur;
    # lider panosu saklı kayıtları doğrudan okur ve aynı taşımayı uygular.
    from app import main as gateway

    profiles, store = build_store()
    ratings = {"cold-old": 2200, "cold-new": 2500, "cold-old-league": 3700, "cold-last-season": 3700}
    for player_id, rating in ratings.items():
        profile = profiles.get_or_create(player_id)
        profile.rating = rating
        profile.highest_rating = rating
        store.save_player(player_id)
    for player_id in ("cold-old", "cold-old-league", "cold-last-season"):
        snapshot = store.repository.load(player_id)
        meta = snapshot.profile["meta_progression_state"]
        meta.pop("trophy_scale_version")
        if player_id == "cold-last-season":
            meta["active_season_id"] = "gridshard_2026_09"
        store.repository.save(snapshot)
    monkeypatch.setattr(gateway, "player_data_repository", store.repository)

    rows = {row["player_id"]: row["rating"] for row in gateway._leaderboard_profile_rows()}
    assert rows["cold-old"] == 2817
    assert rows["cold-new"] == 2500
    # Eski Kıvılcım Ligi'nin ortası (3700) yeni Kıvılcım Ligi'nin ortasıdır.
    assert rows["cold-old-league"] == 5600
    # Sezonu geride kalmış lig oyuncusu lig tabanında görünür.
    assert rows["cold-last-season"] == LEAGUE_FLOOR_RATING


def test_team_tournament_roster_from_the_old_scale_is_read_on_the_current_scale():
    from app.team_service import InMemoryTeamRepository, TeamService

    repository = InMemoryTeamRepository()
    service = TeamService(repository)
    team_id = service.create_team("captain", "Akım Birliği", "create-once")["team_id"]
    roster = [{"player_id": "captain", "display_name": "Kaptan", "rating": 2200}]
    record = service.register_tournament(team_id, "2026-10-26", registered_by="captain", roster=roster)
    assert record["trophy_scale_version"] == TROPHY_SCALE_VERSION
    assert service.tournament_state("2026-10-26")["registrations"][team_id]["roster"][0]["rating"] == 2200

    # Güncellemeden önce alınmış kayıt: ölçek sürümü yok, kupa eski ölçekte.
    payload = repository.load()
    payload["tournaments"]["2026-10-26"]["registrations"][team_id].pop("trophy_scale_version")
    repository.save(payload)
    state = service.tournament_state("2026-10-26")
    assert state["registrations"][team_id]["roster"][0]["rating"] == 2817
    # Okuma kaydı değiştirmez; kadro yenilenince güncel ölçekle yazılır.
    stored = repository.load()["tournaments"]["2026-10-26"]["registrations"][team_id]
    assert stored["roster"][0]["rating"] == 2200


def test_new_account_is_born_on_the_current_trophy_scale():
    profiles, store = build_store()
    profile = profiles.get_or_create("born-new")
    profile.rating = 2200
    profile.highest_rating = 2200
    store.save_player("born-new")
    restored = reload(profiles, store, "born-new")
    assert (restored.rating, restored.highest_rating) == (2200, 2200)
