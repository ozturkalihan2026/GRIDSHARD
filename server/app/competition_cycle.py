"""Dört haftalık yarışma döngüsü.

Sezon (sezon yolu, kupa arşivi, lider panosu ödülleri) ve Takımlar Arası
Turnuva aynı takvimi kullanır. Her döngü Pazartesi 00:00 UTC'de başlar ve dört
ISO haftası (28 gün) sürer. Haftalık turnuva da Pazartesi başladığından her
döngü tam dört haftalık turnuva içerir.

Döngüler 28 Eylül 2026 Pazartesi'den (1. döngü) ileri ve geri sayılır. Döngü
kimliği başlangıç gününün tarihidir (ör. ``2026-09-28``).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone


CYCLE_WEEKS = 4
CYCLE_LENGTH = timedelta(days=7 * CYCLE_WEEKS)
CYCLE_EPOCH = datetime(2026, 9, 28, tzinfo=timezone.utc)


def _utc(moment: datetime | None) -> datetime:
    value = moment or datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _cycle(index: int) -> dict:
    starts_at = CYCLE_EPOCH + index * CYCLE_LENGTH
    return {
        "index": index,
        "number": index + 1,
        "id": starts_at.date().isoformat(),
        "starts_at": starts_at,
        "ends_at": starts_at + CYCLE_LENGTH,
    }


def competition_cycle(moment: datetime | None = None) -> dict:
    """Anı içeren döngü; ``ends_at`` bir sonraki döngünün başlangıcıdır."""
    return _cycle((_utc(moment) - CYCLE_EPOCH) // CYCLE_LENGTH)


def cycle_for_id(cycle_id: str) -> dict:
    """Kimlikten döngü; Pazartesi'ye ve döngü sınırına oturmayan tarih geçersizdir."""
    try:
        starts_at = datetime.strptime(str(cycle_id), "%Y-%m-%d").replace(tzinfo=timezone.utc)
    except ValueError as exc:
        raise ValueError("Geçersiz döngü kimliği.") from exc
    offset = starts_at - CYCLE_EPOCH
    if offset % CYCLE_LENGTH:
        raise ValueError("Geçersiz döngü kimliği.")
    return _cycle(offset // CYCLE_LENGTH)
