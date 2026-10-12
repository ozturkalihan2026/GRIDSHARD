"""Günlük meta metinleri: oyunda olmayan bir modülün adını anmaz."""

from app.season_competition import (
    DAILY_META_DEFINITIONS,
    daily_meta_by_id,
    daily_meta_catalog_view,
)


def test_current_support_meta_effect_text():
    meta = daily_meta_by_id("current_support")

    assert meta["effect_tr"] == "Akım üretimi +%15"
    # Kural değişmedi: metin değişikliği çarpanı etkilemez.
    assert meta["modifier"] == {"category": "sistem", "stat": "current", "multiplier": 1.15}


def test_no_daily_meta_text_names_a_nonexistent_current_module():
    options = daily_meta_catalog_view()["options"]

    assert len(options) == len(DAILY_META_DEFINITIONS) == 7
    for meta in options:
        for field in ("meta_name_tr", "description_tr", "effect_tr"):
            assert "Akım modül" not in meta[field], (meta["id"], field)
