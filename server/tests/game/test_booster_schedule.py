from app.game.booster_schedule import BOOSTER_FIRST_OFFER_MS, BOOSTER_OFFER_INTERVAL_MS, booster_offer_due_at_ms
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState

def make_engine():
    e=BattleEngine(BattleState(battle_id="loop"))
    e.add_player("p1")
    for iid,did in (("core-1","core"),("generator-1","generator"),("laser-1","laser"),("shield-1","shield")):
        e.grant_module("p1",iid,did)
    e.set_initial_active_module("p1","core-1",2,2)
    e.set_initial_active_module("p1","generator-1",2,3)
    e.start()
    for _ in range(150): e.step()
    e.enqueue_command(BattleCommand("p1","place_module",{"module_id":"laser-1","x":3,"y":3})); e.step()
    e.enqueue_command(BattleCommand("p1","place_module",{"module_id":"shield-1","x":3,"y":2})); e.step()
    return e

def advance(e,ms):
    while e.state.elapsed_ms<ms: e.step()

def cmd(e,kind,payload):
    e.enqueue_command(BattleCommand("p1",kind,payload)); e.step()

def test_schedule_boundaries():
    assert BOOSTER_FIRST_OFFER_MS==30000
    assert BOOSTER_OFFER_INTERVAL_MS==30000
    assert [booster_offer_due_at_ms(i) for i in range(4)]==[30000,60000,90000,120000]

def test_offer_at_30():
    e=make_engine(); advance(e,30000)
    offer=e.state.players["p1"].pending_booster_offer
    assert offer is not None and len(offer.booster_ids)==4
    assert offer.created_at_ms==30000

def test_offer_wait_does_not_stack_or_pause():
    e=make_engine(); advance(e,30000)
    first=e.state.players["p1"].pending_booster_offer.id
    advance(e,130000)
    p=e.state.players["p1"]
    assert p.pending_booster_offer.id==first
    assert p.next_booster_offer_index==0
    assert e.state.status.value=="running"

def test_select_and_apply_consumes_offer():
    e=make_engine(); advance(e,30000)
    cmd(e,"select_booster",{"booster_id":"dual_port_adapter"})
    assert e.state.players["p1"].pending_booster_offer.booster_ids==("dual_port_adapter",)
    cmd(e,"apply_booster",{"booster_id":"dual_port_adapter","target_module_id":"shield-1"})
    p=e.state.players["p1"]
    assert p.pending_booster_offer is None
    assert p.next_booster_offer_index==1

def test_invalid_target_keeps_offer():
    e=make_engine(); advance(e,30000)
    cmd(e,"select_booster",{"booster_id":"overcharge_chip"})
    cmd(e,"apply_booster",{"booster_id":"overcharge_chip","target_module_id":"shield-1"})
    p=e.state.players["p1"]
    assert p.pending_booster_offer.booster_ids==("overcharge_chip",)
    assert p.next_booster_offer_index==0

def test_next_offer_at_60():
    e=make_engine(); advance(e,30000)
    cmd(e,"select_booster",{"booster_id":"dual_port_adapter"})
    cmd(e,"apply_booster",{"booster_id":"dual_port_adapter","target_module_id":"shield-1"})
    advance(e,60000)
    assert e.state.players["p1"].pending_booster_offer.created_at_ms==60000

def test_credit_flow_continues():
    e=make_engine(); advance(e,30000)
    before=e.circuit_credits("p1")
    for _ in range(20): e.step()
    assert e.circuit_credits("p1")>=before


def test_offer_rotates_across_turns():
    e=make_engine(); advance(e,30000)
    first=e.state.players["p1"].pending_booster_offer.booster_ids
    cmd(e,"select_booster",{"booster_id":first[0]})
    # choose first eligible target depending on booster
    target = "shield-1"
    if first[0] == "overcharge_chip":
        target = "laser-1"
    cmd(e,"apply_booster",{"booster_id":first[0],"target_module_id":target})
    advance(e,60000)
    second=e.state.players["p1"].pending_booster_offer.booster_ids
    assert second != first
