"""Presentation-only regression contracts; no database/server fixture."""
from app.reward_delivery import public_chest


def test_visual_identity_is_public_but_contents_and_provenance_stay_private():
    source = {"chest_id": "visual-fixture", "definition_id": "core_24h",
              "fixed_reward": {"chest_visual_id": "rank_prism", "flux_shards": 130},
              "premium_origin": {"purchase_key": "private"}, "team_reward": {"grant_id": "private"}}
    result = public_chest(source)
    assert result["chest_visual_id"] == "rank_prism"
    assert not {"fixed_reward", "premium_origin", "team_reward", "flux_shards"} & result.keys()
    assert "chest_visual_id" not in source


def test_regular_chest_payload_is_unchanged_and_copied():
    source = {"chest_id": "standard", "definition_id": "field_3h", "metadata": {"a": 1}}
    result = public_chest(source)
    assert result == source
    result["metadata"]["a"] = 2
    assert source["metadata"]["a"] == 1
