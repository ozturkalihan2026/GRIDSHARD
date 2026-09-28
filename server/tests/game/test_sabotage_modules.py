from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    ModuleStatus,
    Position,
)
from app.game.sabotage import (
    DISRUPTOR_DEBUFF_ID,
    EMP_DEBUFF_ID,
    JAMMER_DEBUFF_ID,
    SABOTAGE_COOLDOWN_ID,
    VIRUS_DEBUFF_ID,
)


def add(
    engine,
    player,
    iid,
    did,
    x,
    y,
):
    module = engine.grant_module(
        player,
        iid,
        did,
    )
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def setup_engine(sabotage_id, sabotage_definition):
    engine = BattleEngine(
        BattleState(battle_id=f"sabotage-{sabotage_id}")
    )
    engine.add_player("p1")
    engine.add_player("p2")

    for player in ("p1", "p2"):
        add(engine, player, f"{player}-core", "core", 2, 1)

    sabotage = add(
        engine,
        "p1",
        sabotage_id,
        sabotage_definition,
        2,
        1,
    )

    engine._process_energy_flow()

    return engine, sabotage


def test_emp_disables_preferred_shield_target():
    engine, emp = setup_engine("emp-1", "emp")
    shield = add(
        engine,
        "p2",
        "p2-shield",
        "shield",
        3,
        1,
    )

    engine._process_energy_flow()
    engine._process_sabotage_actions()
    engine._process_energy_flow()

    assert EMP_DEBUFF_ID in shield.debuffs
    assert shield.is_powered is False
    assert emp.cooldowns_ready_at_ms[SABOTAGE_COOLDOWN_ID] > 0


def test_jammer_disables_support_module():
    engine, _ = setup_engine("jammer-1", "jammer")
    support = add(
        engine,
        "p2",
        "p2-targeting",
        "targeting_computer",
        2,
        1,
    )

    engine._process_energy_flow()
    engine._process_sabotage_actions()

    assert JAMMER_DEBUFF_ID in support.debuffs


def test_virus_deals_periodic_damage():
    engine, _ = setup_engine("virus-1", "virus")
    repair = add(
        engine,
        "p2",
        "p2-repair",
        "repair",
        2,
        1,
    )

    engine._process_energy_flow()
    engine._process_sabotage_actions()

    assert VIRUS_DEBUFF_ID in repair.debuffs

    before = repair.hp
    engine._process_virus_effects()

    assert repair.hp < before
    assert any(
        event.type == "virus_damage"
        for event in engine.state.events
    )


def test_disruptor_disables_its_target_but_not_the_embedded_bus():
    engine, _ = setup_engine(
        "disruptor-1",
        "disruptor",
    )

    battery = add(
        engine,
        "p2",
        "p2-battery",
        "battery",
        0,
        1,
    )
    laser = add(
        engine,
        "p2",
        "p2-laser",
        "laser",
        1,
        1,
    )

    shield = add(
        engine,
        "p2",
        "p2-shield",
        "shield",
        3,
        1,
    )

    engine._process_energy_flow()
    assert laser.is_powered is True

    engine._process_sabotage_actions()

    # Kesici birincil hedefi keser ve ikinci bir sisteme kısa yankı uygular;
    # gömülü enerji hattı kesilmez, üçüncü modül enerjili kalır.
    modules = (battery, laser, shield)
    affected = [module for module in modules if DISRUPTOR_DEBUFF_ID in module.debuffs]
    unaffected = [module for module in modules if DISRUPTOR_DEBUFF_ID not in module.debuffs]
    assert len(affected) == 2
    assert len(unaffected) == 1
    assert any(event.type == "sabotage_echo_applied" for event in engine.state.events)

    engine._process_energy_flow()
    assert all(module.is_powered is False for module in affected)
    assert unaffected[0].is_powered is True


def test_emp_disabled_sabotage_does_not_fire():
    engine, sabotage = setup_engine(
        "virus-1",
        "virus",
    )
    engine.add_debuff("p1", sabotage.instance_id, EMP_DEBUFF_ID, "EMP Devre Dışı", 2500)

    repair = add(
        engine,
        "p2",
        "p2-repair",
        "repair",
        2,
        1,
    )

    engine._process_energy_flow()
    assert sabotage.is_powered is False

    engine._process_sabotage_actions()

    assert VIRUS_DEBUFF_ID not in repair.debuffs


def test_sabotage_targeting_is_deterministic():
    engine, _ = setup_engine(
        "jammer-1",
        "jammer",
    )

    add(
        engine,
        "p2",
        "z-repair",
        "repair",
        3,
        1,
    )
    add(
        engine,
        "p2",
        "a-target",
        "targeting_computer",
        2,
        1,
    )

    engine._process_energy_flow()
    engine._process_sabotage_actions()

    assert JAMMER_DEBUFF_ID in (
        engine.state.players["p2"]
        .modules["a-target"]
        .debuffs
    )


def test_sabotage_never_pauses_battle():
    engine, _ = setup_engine(
        "emp-1",
        "emp",
    )
    engine.state.status = type(
        engine.state.status
    ).RUNNING

    engine._process_sabotage_actions()

    assert engine.state.status.value == "running"
