from dataclasses import dataclass
from enum import Enum
import hashlib

from .models import Position


class BoardCellType(str, Enum):
    CORE = "core"
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


def automatic_deployment_position(*, battle_id: str, player_id: str, definition_id: str,
                                  instance_id: str, tick: int,
                                  candidates: list[Position]) -> Position:
    """The established authoritative random-placement rule, shared by viewers."""
    if not candidates:
        raise ValueError("Yerleştirme için boş hücre gerekli.")
    seed = f"{battle_id}:{player_id}:{definition_id}:{instance_id}:{tick}"
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    return candidates[int.from_bytes(digest[:8], "big") % len(candidates)]


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
