from dataclasses import dataclass
from enum import Enum

from .models import Position


class BoardCellType(str, Enum):
    CORE = "core"
    GATE = "gate"
    NORMAL = "normal"


@dataclass(slots=True, frozen=True)
class BoardCell:
    position: Position
    cell_type: BoardCellType
    placeable: bool = True


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
