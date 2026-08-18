from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .game.economy import (
    DEFAULT_CIRCUIT_CREDIT_CONFIG,
)
from .game.engine import (
    BATTLE_TIME_LIMIT_MS,
    MODULE_INTERACTION_UNLOCK_MS,
)


class BalanceSimulationError(ValueError):
    pass


@dataclass(slots=True,frozen=True)
class BalanceSimulationResult:
    area:str
    status:str
    before_value:float
    proposed_value:float
    metrics_before:dict
    metrics_proposed:dict
    notes:tuple[str,...]

    def to_dict(self)->dict:
        return {
            "area":self.area,
            "status":self.status,
            "before_value":
                self.before_value,
            "proposed_value":
                self.proposed_value,
            "metrics_before":
                self.metrics_before,
            "metrics_proposed":
                self.metrics_proposed,
            "notes":list(self.notes),
            "isolated":True,
            "canonical_values_changed":False,
        }


def _number(value:Any,label:str)->float:
    try:
        result=float(value)
    except (TypeError,ValueError) as exc:
        raise BalanceSimulationError(
            f"{label} sayısal olmalıdır."
        ) from exc

    if result < 0:
        raise BalanceSimulationError(
            f"{label} negatif olamaz."
        )
    return result


def _simulate_local_ai_pressure(
    before:float,
    proposed:float,
)->BalanceSimulationResult:
    # Local test AI attacks once every 2 seconds.
    window_seconds=60
    attacks=window_seconds//2
    return BalanceSimulationResult(
        area="local_ai_pressure",
        status="passed",
        before_value=before,
        proposed_value=proposed,
        metrics_before={
            "window_seconds":window_seconds,
            "attack_count":attacks,
            "raw_damage":round(
                before*attacks,
                2,
            ),
        },
        metrics_proposed={
            "window_seconds":window_seconds,
            "attack_count":attacks,
            "raw_damage":round(
                proposed*attacks,
                2,
            ),
        },
        notes=(
            "Bu dry-run yalnız Yerel AI ham baskı değerini karşılaştırır.",
            "Kanonik savaş motoru veya istemci sabiti değiştirilmez.",
        ),
    )


def _simulate_circuit_credit(
    before:float,
    proposed:float,
)->BalanceSimulationResult:
    window_seconds=60
    starting=(
        DEFAULT_CIRCUIT_CREDIT_CONFIG
        .starting_credits
    )
    return BalanceSimulationResult(
        area="circuit_credit",
        status="passed",
        before_value=before,
        proposed_value=proposed,
        metrics_before={
            "window_seconds":window_seconds,
            "starting_credits":starting,
            "credits_generated":
                round(
                    before*window_seconds,
                    2,
                ),
            "ending_credits_no_spend":
                round(
                    starting
                    + before*window_seconds,
                    2,
                ),
        },
        metrics_proposed={
            "window_seconds":window_seconds,
            "starting_credits":starting,
            "credits_generated":
                round(
                    proposed*window_seconds,
                    2,
                ),
            "ending_credits_no_spend":
                round(
                    starting
                    + proposed*window_seconds,
                    2,
                ),
        },
        notes=(
            "Bu dry-run pasif DK üretim hızını 60 saniyelik pencerede karşılaştırır.",
            "Harcama davranışı ve modül seçimi ayrıca regresyon testinde değerlendirilmelidir.",
        ),
    )


def _simulate_module_interaction(
    before:float,
    proposed:float,
)->BalanceSimulationResult:
    battle_seconds=(
        BATTLE_TIME_LIMIT_MS
        / 1000
    )
    return BalanceSimulationResult(
        area="module_interaction",
        status="passed",
        before_value=before,
        proposed_value=proposed,
        metrics_before={
            "unlock_second":before,
            "battle_time_available_after_unlock":
                max(
                    0,
                    round(
                        battle_seconds-before,
                        2,
                    ),
                ),
        },
        metrics_proposed={
            "unlock_second":proposed,
            "battle_time_available_after_unlock":
                max(
                    0,
                    round(
                        battle_seconds-proposed,
                        2,
                    ),
                ),
        },
        notes=(
            "Bu dry-run savaş içi modül müdahalesi kilidinin zaman etkisini karşılaştırır.",
            f"Mevcut motor kilidi {MODULE_INTERACTION_UNLOCK_MS/1000:g} saniyedir.",
        ),
    )


def run_balance_simulation(
    *,
    area:str,
    before_value:Any,
    proposed_value:Any,
)->dict:
    before=_number(
        before_value,
        "Mevcut değer",
    )
    proposed=_number(
        proposed_value,
        "Önerilen değer",
    )

    adapters={
        "local_ai_pressure":
            _simulate_local_ai_pressure,
        "circuit_credit":
            _simulate_circuit_credit,
        "module_interaction":
            _simulate_module_interaction,
    }

    adapter=adapters.get(area)
    if adapter is None:
        raise BalanceSimulationError(
            "Bu review alanı için izole sayısal simülasyon adaptörü henüz yok. Kanonik değer değiştirilmedi."
        )

    return adapter(
        before,
        proposed,
    ).to_dict()
