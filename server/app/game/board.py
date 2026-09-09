from dataclasses import dataclass
from enum import Enum

from .models import Position


class BoardCellType(str, Enum):
    CORE = "core"
    NORMAL = "normal"


@dataclass(slots=True, frozen=True)
class BoardCell:
    position: Position
    cell_type: BoardCellType
    placeable: bool = True
    allowed_categories: tuple[str, ...] = ()
    allowed_definition_ids: tuple[str, ...] = ()


@dataclass(slots=True, frozen=True)
class BoardLayout:
    id: str
    name_tr: str
    cells: tuple[BoardCell, ...]
    core_position: Position

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


CORE_POSITION = Position(2, 1)
BOARD_WIDTH = 5
BOARD_HEIGHT = 3


def get_default_board() -> BoardLayout:
    return CANONICAL_BOARD


def get_cell_effects(position: Position) -> dict[str, float]:
    CANONICAL_BOARD.get_cell(position)
    return {}


def special_cell_positions() -> tuple[Position, ...]:
    return ()


CANONICAL_BOARD = BoardLayout(
    id="gridshard_5x3",
    name_tr="Devre Tahtası",
    core_position=CORE_POSITION,
    cells=tuple(
        BoardCell(
            Position(x, y),
            BoardCellType.CORE
            if (x, y) == (CORE_POSITION.x, CORE_POSITION.y)
            else BoardCellType.NORMAL,
            placeable=(x, y) != (CORE_POSITION.x, CORE_POSITION.y),
        )
        for y in range(BOARD_HEIGHT)
        for x in range(BOARD_WIDTH)
    ),
)
