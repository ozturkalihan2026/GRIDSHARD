from __future__ import annotations

from collections import Counter
from statistics import mean
from typing import Any




def _event_value(
    event:Any,
    key:str,
    default:Any=None,
)->Any:
    if isinstance(event,dict):
        return event.get(
            key,
            default,
        )
    return getattr(
        event,
        key,
        default,
    )


def _event_metadata(
    event:Any,
)->dict:
    value=_event_value(
        event,
        "metadata",
        {},
    )
    return (
        value
        if isinstance(value,dict)
        else {}
    )

GATE_LABELS = {
    "north":"Kuzey",
    "east":"Doğu",
    "south":"Güney",
    "west":"Batı",
    "unknown":"Bilinmiyor",
}


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError,ValueError):
        return 0.0


def _average(
    events: list[Any],
    key: str,
) -> float:
    values=[
        _safe_float(
            _event_metadata(event).get(key,0)
        )
        for event in events
    ]
    return (
        round(mean(values),2)
        if values
        else 0.0
    )


def _generator_route_analysis(
    moves: list[Any],
) -> dict:
    visits=Counter()
    transitions=Counter()
    special_power_total=0.0
    connected_total=0.0

    for event in moves:
        from_gate=str(
            _event_metadata(event).get(
                "from_gate",
                "unknown",
            )
        )
        to_gate=str(
            _event_metadata(event).get(
                "to_gate",
                "unknown",
            )
        )

        visits[to_gate]+=1
        transitions[
            f"{from_gate}->{to_gate}"
        ]+=1

        special_power_total += (
            _safe_float(
                _event_metadata(event).get(
                    "powered_special_cell_count",
                    0,
                )
            )
        )
        connected_total += (
            _safe_float(
                _event_metadata(event).get(
                    "connected_module_count",
                    0,
                )
            )
        )

    total_moves=len(moves)
    preferred_gate=(
        visits.most_common(1)[0][0]
        if visits
        else None
    )

    return {
        "move_count":total_moves,
        "visits":dict(visits),
        "transitions":dict(transitions),
        "preferred_gate":preferred_gate,
        "preferred_gate_label":
            (
                GATE_LABELS.get(
                    preferred_gate,
                    preferred_gate,
                )
                if preferred_gate
                else None
            ),
        "average_connected_modules_after_move":
            (
                round(
                    connected_total/total_moves,
                    2,
                )
                if total_moves
                else 0.0
            ),
        "average_powered_special_cells_after_move":
            (
                round(
                    special_power_total/total_moves,
                    2,
                )
                if total_moves
                else 0.0
            ),
    }


def _build_review_candidates(
    *,
    completed: list[Any],
    route: dict,
    minimum_battles: int,
) -> list[dict]:
    count=len(completed)
    if count < minimum_battles:
        return [{
            "area":"data",
            "severity":"waiting",
            "label":"Gerçek maç verisi bekleniyor",
            "reason":
                f"İlk denge incelemesi için en az {minimum_battles} tamamlanmış manuel maç gerekli.",
            "automatic_change":False,
        }]

    duration=_average(
        completed,
        "duration_ms",
    )
    win_rate=(
        sum(
            1
            for event in completed
            if bool(
                _event_metadata(event).get(
                    "won",
                    False,
                )
            )
        )
        / count
        * 100
    )
    credits=_average(
        completed,
        "credits_spent",
    )
    generator_moves=_average(
        completed,
        "generator_moves",
    )
    damage_dealt=_average(
        completed,
        "damage_dealt",
    )
    damage_received=_average(
        completed,
        "damage_received",
    )
    shield=_average(
        completed,
        "shield_mitigated",
    )
    module_changes=_average(
        completed,
        "module_changes",
    )

    candidates=[]

    # These thresholds only identify review candidates.
    # They never mutate balance values automatically.
    if duration < 45000:
        candidates.append({
            "area":"match_duration",
            "severity":"review",
            "label":"Maç süresi kısa görünüyor",
            "reason":
                f"Ortalama manuel maç süresi {duration/1000:.1f} sn.",
            "suggestion":
                "AI baskısı, hasar temposu ve başlangıç ekonomisini birlikte incele.",
            "automatic_change":False,
        })
    elif duration > 180000:
        candidates.append({
            "area":"match_duration",
            "severity":"review",
            "label":"Maç süresi uzun görünüyor",
            "reason":
                f"Ortalama manuel maç süresi {duration/1000:.1f} sn.",
            "suggestion":
                "Hasar üretimi, hedefe erişim ve kredi akışındaki beklemeleri incele.",
            "automatic_change":False,
        })

    if win_rate >= 80:
        candidates.append({
            "area":"local_ai_pressure",
            "severity":"review",
            "label":"Yerel AI düşük baskı adayı",
            "reason":
                f"Manuel galibiyet oranı %{win_rate:.1f}.",
            "suggestion":
                "AI baskısını artırmadan önce hasar alınan anları ve oyuncu modül müdahalesini incele.",
            "automatic_change":False,
        })
    elif win_rate <= 20:
        candidates.append({
            "area":"local_ai_pressure",
            "severity":"review",
            "label":"Yerel AI yüksek baskı adayı",
            "reason":
                f"Manuel galibiyet oranı %{win_rate:.1f}.",
            "suggestion":
                "AI hasarı, ilk saldırı zamanı ve savunma erişilebilirliğini incele.",
            "automatic_change":False,
        })

    if credits <= 25:
        candidates.append({
            "area":"circuit_credit",
            "severity":"review",
            "label":"Devre Kredisi kullanımı düşük",
            "reason":
                f"Maç başına ortalama yalnızca {credits:.1f} DK harcanmış.",
            "suggestion":
                "Kredi azlığından mı yoksa müdahale ihtiyacının düşük olmasından mı kaynaklandığını incele.",
            "automatic_change":False,
        })

    if module_changes < 1:
        candidates.append({
            "area":"module_interaction",
            "severity":"review",
            "label":"Savaş içi modül müdahalesi düşük",
            "reason":
                f"Maç başına ortalama modül müdahalesi {module_changes:.1f}.",
            "suggestion":
                "15 saniye kilidi, DK maliyeti ve sürükle-bırak okunabilirliğini incele.",
            "automatic_change":False,
        })

    if (
        route["move_count"] >= count
        and route[
            "average_powered_special_cells_after_move"
        ] <= 0
    ):
        candidates.append({
            "area":"generator_route",
            "severity":"review",
            "label":"Jeneratör rotası özel hücre avantajı üretmiyor olabilir",
            "reason":
                "Jeneratör taşımalarından sonra ortalama enerjili özel hücre sayısı 0.",
            "suggestion":
                "Kapı-hücre bağlantı rotalarını ve özel hücre konumlarını incele.",
            "automatic_change":False,
        })

    if damage_received > 0 and shield <= 0:
        candidates.append({
            "area":"defense_usage",
            "severity":"observe",
            "label":"Kalkan etkisi kullanılmamış olabilir",
            "reason":
                f"Ortalama {damage_received:.1f} hasar alınmış ancak Kalkan azaltması ölçülmemiş.",
            "suggestion":
                "Bu durum zorunlu denge sorunu değildir; havuz seçimi ve savunma kullanımını gözlemle.",
            "automatic_change":False,
        })

    if not candidates:
        candidates.append({
            "area":"overall",
            "severity":"stable_candidate",
            "label":"Acil denge sorunu adayı yok",
            "reason":
                "Toplanan manuel örnekler otomatik eşiklerde belirgin bir sorun üretmedi.",
            "suggestion":
                "Daha fazla manuel maç toplamaya devam et.",
            "automatic_change":False,
        })

    return candidates




def _ai_archetype_breakdown(completed: list[Any]) -> dict[str, dict]:
    grouped: dict[str, list[Any]] = {}
    for event in completed:
        metadata = _event_metadata(event)
        archetype = str(metadata.get("ai_archetype") or "legacy").strip() or "legacy"
        grouped.setdefault(archetype, []).append(event)

    result: dict[str, dict] = {}
    for archetype, events in sorted(grouped.items()):
        wins = sum(1 for event in events if bool(_event_metadata(event).get("won", False)))
        count = len(events)
        result[archetype] = {
            "battle_count": count,
            "wins": wins,
            "losses": max(0, count - wins),
            "win_rate": round((wins / count) * 100, 1) if count else 0.0,
            "average_duration_ms": _average(events, "duration_ms"),
            "average_damage_dealt": _average(events, "damage_dealt"),
            "average_damage_received": _average(events, "damage_received"),
            "average_module_changes": _average(events, "module_changes"),
        }
    return result

def build_manual_battle_report(
    *,
    events: list[Any],
    player_id: str | None = None,
    minimum_battles: int = 3,
) -> dict:
    relevant=[
        event
        for event in events
        if (
            player_id is None
            or _event_value(event,"player_id")
            == player_id
        )
    ]

    completed=[
        event
        for event in relevant
        if _event_value(event,"event_type")
        == "local_battle_completed"
    ]
    moves=[
        event
        for event in relevant
        if _event_value(event,"event_type")
        == "generator_gate_moved"
    ]

    wins=sum(
        1
        for event in completed
        if bool(
            _event_metadata(event).get(
                "won",
                False,
            )
        )
    )
    count=len(completed)
    route=_generator_route_analysis(
        moves
    )

    candidates=_build_review_candidates(
        completed=completed,
        route=route,
        minimum_battles=minimum_battles,
    )

    return {
        "status":
            "review_ready"
            if count >= minimum_battles
            else "insufficient_manual_battles",
        "player_id":player_id,
        "minimum_battles":minimum_battles,
        "battle_count":count,
        "battles_remaining":
            max(
                0,
                minimum_battles-count,
            ),
        "wins":wins,
        "losses":max(0,count-wins),
        "win_rate":
            round(
                (wins/count)*100,
                1,
            )
            if count
            else 0.0,
        "averages":{
            "duration_ms":
                _average(
                    completed,
                    "duration_ms",
                ),
            "credits_spent":
                _average(
                    completed,
                    "credits_spent",
                ),
            "generator_moves":
                _average(
                    completed,
                    "generator_moves",
                ),
            "damage_dealt":
                _average(
                    completed,
                    "damage_dealt",
                ),
            "damage_received":
                _average(
                    completed,
                    "damage_received",
                ),
            "shield_mitigated":
                _average(
                    completed,
                    "shield_mitigated",
                ),
            "module_changes":
                _average(
                    completed,
                    "module_changes",
                ),
        },
        "generator_route":
            route,
        "ai_archetypes":
            _ai_archetype_breakdown(completed),
        "review_candidates":
            candidates,
        "balance_action":
            (
                "manual_review_required"
                if count
                >= minimum_battles
                else "collect_more_real_battles"
            ),
        "numeric_balance_changed":False,
    }
