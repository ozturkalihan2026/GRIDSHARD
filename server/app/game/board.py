from dataclasses import dataclass
from enum import Enum

from .models import Position


class BoardCellType(str, Enum):
    CORE = "core"
    GATE = "gate"
    NORMAL = "normal"
    ATTACK = "attack"
    DEFENSE = "defense"
    ENERGY = "energy"
    COOLING = "cooling"
    REPAIR = "repair"
    SIGNAL = "signal"


@dataclass(slots=True, frozen=True)
class CellBonus:
    id: str
    name_tr: str
    description_tr: str
    stat_key: str
    multiplier: float


@dataclass(slots=True, frozen=True)
class BoardCell:
    position: Position
    cell_type: BoardCellType
    placeable: bool = True
    bonus: CellBonus | None = None


@dataclass(slots=True, frozen=True)
class BoardLayout:
    id: str
    name_tr: str
    cells: tuple[BoardCell, ...]
    core_position: Position
    generator_gate_positions: tuple[Position, ...]

    def contains(self, position: Position) -> bool:
        return any(cell.position == position for cell in self.cells)

    def get_cell(self, position: Position) -> BoardCell:
        for cell in self.cells:
            if cell.position == position:
                return cell
        raise ValueError(f"Savaş alanında olmayan hücre: ({position.x}, {position.y})")

    @property
    def placeable_positions(self) -> tuple[Position, ...]:
        return tuple(cell.position for cell in self.cells if cell.placeable)


CORE_POSITION = Position(2, 2)
GENERATOR_GATE_POSITIONS = (
    Position(2, 1),
    Position(3, 2),
    Position(2, 3),
    Position(1, 2),
)

ATTACK_BONUS = CellBonus(
    id="attack_15",
    name_tr="Saldırı Hücresi",
    description_tr="Bu hücredeki saldırı modülü için +%15 saldırı etkinliği metadata'sı sağlar.",
    stat_key="attack_multiplier",
    multiplier=1.15,
)
DEFENSE_BONUS = CellBonus(
    id="defense_15",
    name_tr="Savunma Hücresi",
    description_tr="Bu hücredeki savunma modülü için +%15 dayanıklılık metadata'sı sağlar.",
    stat_key="defense_multiplier",
    multiplier=1.15,
)
ENERGY_BONUS = CellBonus(
    id="energy_15",
    name_tr="Enerji Hücresi",
    description_tr="Bu hücredeki enerji modülü için +%15 enerji etkinliği metadata'sı sağlar.",
    stat_key="energy_multiplier",
    multiplier=1.15,
)
COOLING_BONUS = CellBonus(
    id="cooling_20",
    name_tr="Soğutma Hücresi",
    description_tr="Bu hücredeki modül için ısı oluşumunu %20 azaltmaya yönelik metadata sağlar.",
    stat_key="heat_multiplier",
    multiplier=0.80,
)
REPAIR_BONUS = CellBonus(
    id="repair_20",
    name_tr="Onarım Hücresi",
    description_tr="Bu hücredeki onarım modülü için +%20 onarım etkinliği metadata'sı sağlar.",
    stat_key="repair_multiplier",
    multiplier=1.20,
)
SIGNAL_BONUS = CellBonus(
    id="signal_15",
    name_tr="Sinyal Hücresi",
    description_tr="Bu hücredeki sabotaj/destek etkileri için bekleme süresi azaltım metadata'sı sağlar.",
    stat_key="cooldown_multiplier",
    multiplier=0.85,
)

SPECIAL_CELLS: dict[Position, tuple[BoardCellType, CellBonus]] = {
    Position(2, 0): (BoardCellType.ATTACK, ATTACK_BONUS),
    Position(4, 2): (BoardCellType.DEFENSE, DEFENSE_BONUS),
    Position(2, 4): (BoardCellType.ENERGY, ENERGY_BONUS),
    Position(0, 2): (BoardCellType.COOLING, COOLING_BONUS),
    Position(1, 1): (BoardCellType.REPAIR, REPAIR_BONUS),
    Position(3, 3): (BoardCellType.SIGNAL, SIGNAL_BONUS),
}

BOARD_POSITIONS = (
    Position(1, 0), Position(2, 0), Position(3, 0),
    Position(0, 1), Position(1, 1), Position(2, 1), Position(3, 1), Position(4, 1),
    Position(0, 2), Position(1, 2), Position(2, 2), Position(3, 2), Position(4, 2),
    Position(0, 3), Position(1, 3), Position(2, 3), Position(3, 3), Position(4, 3),
    Position(1, 4), Position(2, 4), Position(3, 4),
)


def _make_cell(position: Position) -> BoardCell:
    if position == CORE_POSITION:
        return BoardCell(position, BoardCellType.CORE, placeable=False)
    if position in GENERATOR_GATE_POSITIONS:
        return BoardCell(position, BoardCellType.GATE, placeable=True)
    if position in SPECIAL_CELLS:
        cell_type, bonus = SPECIAL_CELLS[position]
        return BoardCell(position, cell_type, placeable=True, bonus=bonus)
    return BoardCell(position, BoardCellType.NORMAL, placeable=True)


ALPHA11_BOARD = BoardLayout(
    id="relay_alpha11",
    name_tr="Çekirdek Halkası",
    cells=tuple(_make_cell(position) for position in BOARD_POSITIONS),
    core_position=CORE_POSITION,
    generator_gate_positions=GENERATOR_GATE_POSITIONS,
)


def get_default_board() -> BoardLayout:
    return ALPHA11_BOARD


def get_cell_effects(position: Position) -> dict[str, float]:
    cell = ALPHA11_BOARD.get_cell(position)
    if cell.bonus is None:
        return {}
    return {cell.bonus.stat_key: cell.bonus.multiplier}


def special_cell_positions() -> tuple[Position, ...]:
    return tuple(SPECIAL_CELLS.keys())
