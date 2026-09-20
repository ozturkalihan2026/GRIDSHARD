from app.season_competition import LEADERBOARD_PRIZES


def test_top_ten_rewards_include_distinct_animated_and_profile_cosmetics():
    assert len(LEADERBOARD_PRIZES) == 10
    assert LEADERBOARD_PRIZES[3]["profile_background_id"] == "rank_frequency"
    assert LEADERBOARD_PRIZES[4]["emoji_id"] == "core_burst"
    assert LEADERBOARD_PRIZES[5]["emoji_id"] == "glitch_wave"
    assert LEADERBOARD_PRIZES[6]["avatar_frame_id"] == "frequency_cyan"
    assert LEADERBOARD_PRIZES[7]["profile_background_id"] == "rank_relay"
    assert LEADERBOARD_PRIZES[8]["emoji_id"] == "overload_flash"
    assert LEADERBOARD_PRIZES[9]["avatar_id"] == "rank_spark"
    assert len({prize["chest_visual_id"] for prize in LEADERBOARD_PRIZES}) == 10
