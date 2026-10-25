import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("economy_income_model", ROOT / "tools/economy_income_model.py")
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)


def test_economy_report_prices_match_all_word_rows_including_flux():
    source = json.loads((ROOT / "server/tests/fixtures/level_costs_seviye_20261025.json").read_text(encoding="utf-8"))
    for rarity, steps in source["costs"].items():
        for level in range(1, 16):
            expected = tuple(sum(s[k] for s in steps[:level-1]) for k in ("circuit_credits", "shards", "flux_shards"))
            assert model.module_cost(rarity, level) == expected
    assert model.module_cost("legendary", 15)[2] == 27500


def test_report_reads_current_core_rarities_without_retired_curves(capsys):
    model.report(model.canon.GRIDSHARD_SUMMIT_RATING, 10, .55)
    output = capsys.readouterr().out
    assert "tek başına Akı" in output
    for core in model.meta.CORE_TYPES:
        assert core["name_tr"] in output
