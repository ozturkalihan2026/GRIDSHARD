"""Read-only/in-memory card checks; runnable with stdlib unittest (no pytest)."""
import unittest

from app.arena_canon import module_stats
from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.engine import BattleEngine, TICK_MS
from app.game.models import BattleState, ModuleStatus, Position


class CardInformationV17Tests(unittest.TestCase):
    def test_every_playable_module_has_authoritative_signature_copy(self):
        modules = [d for d in BASIC_MODULE_DEFINITIONS.values() if d.id != "core"]
        self.assertEqual(len(modules), 24)
        for definition in modules:
            with self.subTest(module=definition.id):
                self.assertTrue(definition.signature_mechanic.strip())

    def test_all_attack_levels_publish_positive_damage_and_interval(self):
        from math import isfinite
        for definition in BASIC_MODULE_DEFINITIONS.values():
            if definition.combat_class!='saldırı':continue
            for level in range(15):
                stats=module_stats(definition,level)
                self.assertTrue(isfinite(stats['base_damage']) and stats['base_damage']>0)
                self.assertGreater(stats['cooldown_ms'],0)
                self.assertFalse(any('energy' in k or 'heat' in k for k in stats))

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
        target.hp = 10000
        stats = module_stats(BASIC_MODULE_DEFINITIONS["laser"], 2)
        self.assertEqual(stats["base_damage"], 12.98)
        self.assertEqual(stats["cooldown_ms"], 1000)
        self.assertEqual(TICK_MS, 100)
        hits = []
        for elapsed in range(0, 3001, TICK_MS):
            engine.state.elapsed_ms = elapsed
            before = target.hp
            from app.game.battle_actions_v2 import tick
            tick(engine)
            if target.hp < before:
                hits.append((elapsed, before - target.hp))
        self.assertEqual(hits, [(0, 13), (1000, 13), (2000, 13), (3000, 13)])


if __name__ == "__main__":
    unittest.main()
