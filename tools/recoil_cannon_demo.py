"""Export real engine frames for the offline CARD-01 workbench. No live registry."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
from app.game.engine import BattleEngine
from app.game.models import BattleModule, BattleState, ModuleStatus, TimedModuleEffect
from app.game.board import get_default_board
from app.game.recoil_cannon import definition, stats, tree

OUTPUT = ROOT / 'docs/planning/prototypes/recoil-cannon/demo-data.js'


def scenario(kind):
    engine = BattleEngine(BattleState(battle_id='card01-demo-' + kind))
    for side in ('a', 'b'):
        engine.add_player(side)
        engine.grant_module(side, side + '-core', 'core')
        engine.set_initial_active_module(side, side + '-core', 2, 1)
    engine.start()
    gun = BattleModule.create('candidate', definition())
    enemy = engine.grant_module('b', 'target', 'phase_armor' if kind == 'phase' else 'armor')
    engine.state.players['a'].modules[gun.instance_id] = gun
    for side, module in (('a', gun), ('b', enemy)):
        used = {m.position for m in engine.state.players[side].modules.values() if m.status == ModuleStatus.ACTIVE}
        module.position = next(p for p in get_default_board().placeable_positions if p not in used)
        module.status = ModuleStatus.ACTIVE
    if kind == 'emp':
        gun.debuffs['emp_disabled'] = TimedModuleEffect('emp_disabled', 'EMP', 3500, {})
    if kind == 'low-hp':
        from app.game.battle_actions_v2 import shield
        gun.hp = 5
        shield(engine, 'a', gun, gun, 100)

    frames = []
    cursor = len(engine.state.events)
    wanted = {0, 100, 1000, 3000, 3100, 3500, 3600, 6000, 6100, 6500}
    while engine.state.elapsed_ms <= 6500:
        if engine.state.elapsed_ms in wanted:
            events = [dict(type=e.type, at_ms=e.at_ms, data=e.data) for e in engine.state.events[cursor:]]
            cursor = len(engine.state.events)
            frames.append(dict(at_ms=engine.state.elapsed_ms, gun_hp=gun.hp, target_hp=enemy.hp,
                               shield_hp=gun.persistent_effects.get('v2_shield_guard').data['shield_hp'] if 'v2_shield_guard' in gun.persistent_effects else 0,
                               events=events))
        engine.step()
    return dict(target=enemy.definition.id, target_max_hp=enemy.definition.max_hp, frames=frames)


def main():
    payload = dict(schema=1, candidate=True, engine_step_ms=100, stats=stats(), talents=tree(),
                   scenarios={kind: scenario(kind) for kind in ('armor', 'phase', 'emp', 'low-hp')})
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text('window.RECOIL_DEMO = ' + json.dumps(payload, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    print(f'Exported {sum(len(s["frames"]) for s in payload["scenarios"].values())} real-engine frames: {OUTPUT}')


if __name__ == '__main__':
    main()
