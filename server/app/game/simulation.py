from dataclasses import dataclass
from statistics import mean
from typing import Callable

from .engine import BattleEngine, TICK_MS
from .models import BattleState, Direction, ModuleDefinition


DefinitionTransform = Callable[[ModuleDefinition], ModuleDefinition]


@dataclass(slots=True, frozen=True)
class LayoutModule:
    instance_suffix: str
    definition_id: str
    x: int
    y: int
    direction: Direction = Direction.UP


@dataclass(slots=True, frozen=True)
class BattleLayoutSpec:
    id: str
    name_tr: str
    modules: tuple[LayoutModule, ...]


@dataclass(slots=True, frozen=True)
class SimulatedMatchResult:
    layout_a_id: str
    layout_b_id: str
    winner_layout_id: str | None
    is_draw: bool
    timed_out: bool
    elapsed_ms: int
    finish_reason: str
    player_a_summary: dict
    player_b_summary: dict


@dataclass(slots=True, frozen=True)
class SimulationReport:
    matches: tuple[SimulatedMatchResult, ...]
    wins_by_layout: dict[str, int]
    draws: int
    timeouts: int
    average_duration_ms: float


BALANCED_LAYOUT = BattleLayoutSpec(
    id="balanced",
    name_tr="Dengeli Devre",
    modules=(
        LayoutModule("core", "core", 2, 2),
        LayoutModule("gen", "generator", 2, 3),
        LayoutModule("splitter", "splitter", 2, 1, Direction.DOWN),
        LayoutModule("armor", "armor", 1, 1, Direction.RIGHT),
        LayoutModule("drone", "drone_bay", 3, 1, Direction.LEFT),
        LayoutModule("laser", "laser", 4, 1, Direction.LEFT),
    ),
)

OFFENSE_LAYOUT = BattleLayoutSpec(
    id="offense",
    name_tr="Saldırı Devresi",
    modules=(
        LayoutModule("core", "core", 2, 2),
        LayoutModule("gen", "generator", 2, 3),
        LayoutModule("splitter", "splitter", 2, 1, Direction.DOWN),
        LayoutModule("amp", "amplifier", 1, 1, Direction.RIGHT),
        LayoutModule("laser", "laser", 0, 1, Direction.RIGHT),
        LayoutModule("rail", "railgun", 3, 1, Direction.LEFT),
    ),
)

DEFENSE_LAYOUT = BattleLayoutSpec(
    id="defense",
    name_tr="Savunma Devresi",
    modules=(
        LayoutModule("core", "core", 2, 2),
        LayoutModule("gen", "generator", 2, 3),
        LayoutModule("splitter", "splitter", 2, 1, Direction.DOWN),
        LayoutModule("barrier", "barrier", 1, 1, Direction.RIGHT),
        LayoutModule("drone", "drone_bay", 3, 1, Direction.LEFT),
        LayoutModule("laser", "laser", 4, 1, Direction.LEFT),
    ),
)

SABOTAGE_LAYOUT = BattleLayoutSpec(
    id="sabotage",
    name_tr="Sabotaj Devresi",
    modules=(
        LayoutModule("core", "core", 2, 2),
        LayoutModule("gen", "generator", 2, 3),
        LayoutModule("splitter", "splitter", 2, 1, Direction.DOWN),
        LayoutModule("jammer", "jammer", 1, 1, Direction.RIGHT),
        LayoutModule("drone", "drone_bay", 3, 1, Direction.LEFT),
        LayoutModule("laser", "laser", 4, 1, Direction.LEFT),
    ),
)

BATTERY_PULSE_LAYOUT = BattleLayoutSpec(
    id="battery_pulse",
    name_tr="Batarya Darbe Devresi",
    modules=(
        LayoutModule("core", "core", 2, 2),
        LayoutModule("gen", "generator", 2, 3),
        LayoutModule("splitter", "splitter", 2, 1, Direction.DOWN),
        LayoutModule("battery", "battery", 1, 1, Direction.RIGHT),
        LayoutModule("pulse", "pulse_cannon", 0, 1, Direction.RIGHT),
        LayoutModule("laser", "laser", 3, 1, Direction.LEFT),
    ),
)

ARMOR_COUNTER_LAYOUT = BattleLayoutSpec(
    id="armor_counter",
    name_tr="Zırh Karşı Devresi",
    modules=(
        LayoutModule("core", "core", 2, 2),
        LayoutModule("gen", "generator", 2, 3),
        LayoutModule("splitter", "splitter", 2, 1, Direction.DOWN),
        LayoutModule("armor", "armor", 1, 1, Direction.RIGHT),
        LayoutModule("drone", "drone_bay", 3, 1, Direction.LEFT),
        LayoutModule("laser", "laser", 4, 1, Direction.LEFT),
    ),
)


DEFAULT_SIMULATION_LAYOUTS = (
    BALANCED_LAYOUT,
    OFFENSE_LAYOUT,
    DEFENSE_LAYOUT,
    SABOTAGE_LAYOUT,
)


def _install_layout(
    engine: BattleEngine,
    player_id: str,
    layout: BattleLayoutSpec,
    definition_transform: DefinitionTransform | None = None,
) -> None:
    for module in layout.modules:
        instance_id = f"{player_id}-{module.instance_suffix}"
        installed = engine.grant_module(
            player_id,
            instance_id,
            module.definition_id,
        )
        if definition_transform is not None:
            installed.definition = definition_transform(installed.definition)
            installed.hp = installed.definition.max_hp
        engine.set_initial_active_module(
            player_id,
            instance_id,
            module.x,
            module.y,
            module.direction,
        )


def run_match(
    layout_a: BattleLayoutSpec,
    layout_b: BattleLayoutSpec,
    *,
    max_ticks: int = 1800,
    definition_transform: DefinitionTransform | None = None,
) -> SimulatedMatchResult:
    engine = BattleEngine(
        BattleState(
            battle_id=f"sim-{layout_a.id}-vs-{layout_b.id}"
        )
    )
    engine.add_player("a")
    engine.add_player("b")
    _install_layout(engine, "a", layout_a, definition_transform)
    _install_layout(engine, "b", layout_b, definition_transform)
    engine.start()

    for _ in range(max_ticks):
        if engine.state.status.value == "finished":
            break
        engine.step()

    timed_out = engine.state.status.value != "finished"

    winner_layout_id = None
    is_draw = False
    finish_reason = "timeout"

    if not timed_out:
        is_draw = engine.state.is_draw
        finish_reason = engine.state.finish_reason or "finished"

        if engine.state.winner_player_id == "a":
            winner_layout_id = layout_a.id
        elif engine.state.winner_player_id == "b":
            winner_layout_id = layout_b.id

    summaries = engine.state.result_summary if not timed_out else {}
    player_a_summary = summaries.get("a", {})
    player_b_summary = summaries.get("b", {})

    return SimulatedMatchResult(
        layout_a_id=layout_a.id,
        layout_b_id=layout_b.id,
        winner_layout_id=winner_layout_id,
        is_draw=is_draw,
        timed_out=timed_out,
        elapsed_ms=engine.state.elapsed_ms,
        finish_reason=finish_reason,
        player_a_summary=player_a_summary,
        player_b_summary=player_b_summary,
    )


def run_mirrored_pair(
    first: BattleLayoutSpec,
    second: BattleLayoutSpec,
    *,
    max_ticks: int = 1800,
    definition_transform: DefinitionTransform | None = None,
) -> tuple[SimulatedMatchResult, SimulatedMatchResult]:
    return (
        run_match(first, second, max_ticks=max_ticks, definition_transform=definition_transform),
        run_match(second, first, max_ticks=max_ticks, definition_transform=definition_transform),
    )


def run_round_robin(
    layouts: tuple[BattleLayoutSpec, ...] = DEFAULT_SIMULATION_LAYOUTS,
    *,
    max_ticks: int = 1800,
    mirrored: bool = True,
    definition_transform: DefinitionTransform | None = None,
) -> SimulationReport:
    matches: list[SimulatedMatchResult] = []

    for index, first in enumerate(layouts):
        for second in layouts[index + 1:]:
            matches.append(
                run_match(
                    first,
                    second,
                    max_ticks=max_ticks,
                    definition_transform=definition_transform,
                )
            )
            if mirrored:
                matches.append(
                    run_match(
                        second,
                        first,
                        max_ticks=max_ticks,
                        definition_transform=definition_transform,
                    )
                )

    wins_by_layout = {
        layout.id: 0
        for layout in layouts
    }
    draws = 0
    timeouts = 0

    for match in matches:
        if match.timed_out:
            timeouts += 1
        elif match.is_draw:
            draws += 1
        elif match.winner_layout_id is not None:
            wins_by_layout[match.winner_layout_id] += 1

    average_duration_ms = (
        mean(match.elapsed_ms for match in matches)
        if matches
        else 0.0
    )

    return SimulationReport(
        matches=tuple(matches),
        wins_by_layout=wins_by_layout,
        draws=draws,
        timeouts=timeouts,
        average_duration_ms=average_duration_ms,
    )
