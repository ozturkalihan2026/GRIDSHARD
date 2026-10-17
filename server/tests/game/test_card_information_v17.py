"""Read-only/in-memory card checks; runnable with stdlib unittest (no pytest)."""
import unittest

from app.arena_canon import module_stats
from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.engine import BattleEngine, TICK_MS
from app.game.models import BattleState, ModuleStatus, Position


class CardInformationV17Tests(unittest.TestCase):
    def test_every_playable_module_has_authoritative_signature_copy(self):
        modules = [d for d in BASIC_MODULE_DEFINITIONS.values() if d.id != "core"]
        self.assertEqual(len(modules), 36)
        for definition in modules:
            with self.subTest(module=definition.id):
                self.assertTrue(definition.signature_mechanic.strip())

    def test_all_attack_levels_label_the_ratio_as_theoretical(self):
        for definition in BASIC_MODULE_DEFINITIONS.values():
            if definition.category != "saldırı":
                continue
            for level in range(15):
                with self.subTest(module=definition.id, level=level):
                    stats = module_stats(definition, level)
                    dps = next(s for s in stats["specials"] if s["key"] == "dps")
                    self.assertEqual(dps["label_tr"], "TEORİK HASAR/SN")
                    self.assertEqual(dps["label_en"], "THEORETICAL DPS")
                    self.assertEqual(dps["unit"], "per_second")
                    self.assertTrue(dps["description_tr"])
                    self.assertTrue(dps["description_en"])
                    self.assertEqual(dps["value"], round(stats["base_damage"] * 1000 / stats["cooldown_ms"], 2))

    def test_laser_neutral_hits_still_follow_engine_rounding_and_ticks(self):
        engine = BattleEngine(BattleState(battle_id="card-information-only"))
        engine.add_player("p1")
        engine.add_player("p2")
        engine.state.player_upgrade_levels["p1"] = {"laser": 2}
        laser = engine.grant_module("p1", "laser", "laser")
        target = engine.grant_module("p2", "target", "repair")
        for module in (laser, target):
            module.status = ModuleStatus.ACTIVE
            module.position = Position(1, 1)
            module.is_powered = True
        target.hp = 10000
        stats = module_stats(BASIC_MODULE_DEFINITIONS["laser"], 2)
        self.assertEqual(stats["base_damage"], 13.23)
        self.assertEqual(stats["cooldown_ms"], 984)
        self.assertEqual(TICK_MS, 100)
        hits = []
        for elapsed in range(0, 3001, TICK_MS):
            engine.state.elapsed_ms = elapsed
            engine.state.players["p1"].energy_stock = 10000
            laser.heat = 0
            before = target.hp
            engine._process_combat_actions()
            if target.hp < before:
                hits.append((elapsed, before - target.hp))
        self.assertEqual(hits, [(0, 13), (1000, 13), (2000, 13), (3000, 13)])


if __name__ == "__main__":
    unittest.main()
