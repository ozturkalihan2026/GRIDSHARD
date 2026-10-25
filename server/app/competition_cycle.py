"""Operator-anchored 28-day cycles. Pure calendar math does not open competitions.

The season and the later team tournament have independent explicit start anchors.
The legacy epoch is only a fallback for reading historical calendar identifiers.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from .competition_control import configured_start


CYCLE_WEEKS = 4
CYCLE_LENGTH = timedelta(days=7 * CYCLE_WEEKS)
CYCLE_EPOCH = datetime(2026, 9, 28, tzinfo=timezone.utc)


def _utc(moment: datetime | None) -> datetime:
    value = moment or datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _anchor(team=False):
    return (configured_start(team=True) if team else None) or configured_start() or CYCLE_EPOCH


def _cycle(index: int, *, team=False) -> dict:
    starts_at = _anchor(team) + index * CYCLE_LENGTH
    return {
        "index": index,
        "number": index + 1,
        "id": starts_at.date().isoformat(),
        "starts_at": starts_at,
        "ends_at": starts_at + CYCLE_LENGTH,
    }


def competition_cycle(moment: datetime | None = None, *, team=False) -> dict:
    """Anı içeren döngü; ``ends_at`` bir sonraki döngünün başlangıcıdır."""
    return _cycle((_utc(moment) - _anchor(team)) // CYCLE_LENGTH, team=team)


def cycle_for_id(cycle_id: str, *, team=False) -> dict:
    """Kimlikten döngü; Pazartesi'ye ve döngü sınırına oturmayan tarih geçersizdir."""
    try:
        starts_at = datetime.strptime(str(cycle_id), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise ValueError("Geçersiz döngü kimliği.") from exc
    # IDs retain ISO dates even when the operator starts mid-day.
    epoch = _anchor(team)
    offset = starts_at.date() - epoch.date()
    if offset.days % CYCLE_LENGTH.days:
        raise ValueError("Geçersiz döngü kimliği.")
    return _cycle(offset.days // CYCLE_LENGTH.days, team=team)
