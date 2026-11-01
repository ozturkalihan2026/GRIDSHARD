"""The approved joint economy is used by real sessions, with private counters."""
from app.game.engine import BattleEngine
from app.game.economy import DEFAULT_CIRCUIT_CREDIT_CONFIG as MAIN
from app.game.models import BattleState
from app.game.battle_actions_v2 import hit
from app.game.pvp_session import PvPSessionService
from test_main_current_only_v2 import place


def test_main_engine_uses_approved_7_12_3s_100_50_without_bonus_wait():
 e=BattleEngine(BattleState('main-current-v8'));p=e.add_player('a')
 assert e.circuit_credit_config is MAIN
 assert (p.circuit_credits,MAIN.maximum_current,MAIN.current_regen_interval_ms)==(7,12,3000)
 assert (MAIN.damage_current_threshold,MAIN.defense_current_threshold)==(100,50)
 assert MAIN.allow_core_current_rewards
 assert not hasattr(MAIN,"damage_current_min_interval_ms")
 for _ in range(30):e._apply_passive_circuit_credit_income()
 assert p.circuit_credits==8


def test_main_actual_damage_needs_attack_and_hp_loss_on_a_defense_card():
 e=BattleEngine(BattleState('main-current-v8-hit'))
 for s in ('a','b'):
  e.add_player(s);e.grant_module(s,s+'-core','core');e.set_initial_active_module(s,s+'-core',2,1)
 e.start();a=place(e,'a','laser');b=place(e,'b','barrier');d=place(e,'a','barrier')
 hit(e,'a',a,'b',b,100);assert e.state.players['a'].circuit_credits==7
 e.apply_damage('a',d.instance_id,50,source_player_id='b',source_module_id='b-core')
 assert e.state.players['a'].circuit_credits==8


def test_approved_snapshot_exposes_both_counters_only_to_the_owner():
 service=PvPSessionService();session=service.create_session('current-private-v8')
 for s in ('a','b'):service.join(session.session_id,s)
 p=session.engine.state.players['a'];p.damage_current_progress=70;p.defense_current_progress=20
 own=service.snapshot(session.session_id,'a')['players']['a']
 other=service.snapshot(session.session_id,'b')['players']['a']
 assert own['current_bonus']['damage']==70 and own['current_bonus']['defense']==20
 assert own['current_bonus']['mode']=='attack_defense_hp'
 assert own['current_bonus']['passive_interval_ms']==3000
 assert 'current_bonus' not in other and 'damage_current_progress' not in other


def test_all_bot_decks_can_participate_in_the_approved_economy():
 from app.game.ai_archetypes import AI_ARCHETYPES
 from app.module_roster import MODULE_SPECS
 from app.arena_canon import BOTS
 for deck in [s.battle_pool_ids for s in AI_ARCHETYPES.values()]+[tuple(b['battle_pool_ids']) for b in BOTS]:
  classes={MODULE_SPECS[k]['category'] for k in deck}
  assert {'saldırı','savunma'}<=classes


def test_live_ai_rebuilds_an_attack_and_defense_foundation_without_player_quotas():
 from app.game.ai import enqueue_ai_actions
 from app.game.models import ModuleStatus
 from app.game.ai_archetypes import get_ai_archetype
 e=BattleEngine(BattleState('ai-current-v8'))
 for s in ('a','b'):
  e.add_player(s);e.set_battle_pool(s,get_ai_archetype('aggressive').battle_pool_ids)
  e.grant_module(s,s+'-core','core');e.set_initial_active_module(s,s+'-core',2,1)
 e.start()
 for _ in range(5):
  e.state.players['a'].circuit_credits=12
  enqueue_ai_actions(e,'a','b','aggressive');e.step()
 active={u.definition.combat_class for u in e.state.players['a'].modules.values() if u.status==ModuleStatus.ACTIVE}
 assert {'saldırı','savunma'}<=active
