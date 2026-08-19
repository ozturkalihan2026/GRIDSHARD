from __future__ import annotations

from typing import Any


LOCAL_AI_ATTACK_START_MS=5_000
LOCAL_AI_ATTACK_INTERVAL_MS=2_000
LOCAL_AI_CURRENT_RAW_DAMAGE=8
LOCAL_AI_CURRENT_SHIELDED_DAMAGE=5
LOCAL_AI_REVIEW_WINDOW_MS=60_000


class LocalAiRegressionError(ValueError):
    pass


def _number(
    value:Any,
    label:str,
)->float:
    try:
        result=float(value)
    except (TypeError,ValueError) as exc:
        raise LocalAiRegressionError(
            f"{label} sayısal olmalıdır."
        ) from exc

    if result <= 0:
        raise LocalAiRegressionError(
            f"{label} sıfırdan büyük olmalıdır."
        )
    return result


def run_local_ai_pressure_regression(
    *,
    before_value:Any,
    proposed_value:Any,
)->dict:
    before=_number(
        before_value,
        "Mevcut Yerel AI ham hasarı",
    )
    proposed=_number(
        proposed_value,
        "Önerilen Yerel AI ham hasarı",
    )

    if proposed > 40:
        raise LocalAiRegressionError(
            "Önerilen Yerel AI ham hasarı güvenli test sınırı olan 40'ı aşıyor."
        )

    attack_count=max(
        0,
        (
            LOCAL_AI_REVIEW_WINDOW_MS
            - LOCAL_AI_ATTACK_START_MS
        )
        // LOCAL_AI_ATTACK_INTERVAL_MS
        + 1,
    )

    shield_ratio=(
        LOCAL_AI_CURRENT_SHIELDED_DAMAGE
        / LOCAL_AI_CURRENT_RAW_DAMAGE
    )

    before_shielded=round(
        before*shield_ratio,
        2,
    )
    proposed_shielded=round(
        proposed*shield_ratio,
        2,
    )

    return {
        "area":"local_ai_pressure",
        "status":"passed",
        "adapter":"server_side_local_ai",
        "current_runtime_reference":{
            "attack_start_ms":
                LOCAL_AI_ATTACK_START_MS,
            "attack_interval_ms":
                LOCAL_AI_ATTACK_INTERVAL_MS,
            "raw_damage":
                LOCAL_AI_CURRENT_RAW_DAMAGE,
            "shielded_damage":
                LOCAL_AI_CURRENT_SHIELDED_DAMAGE,
        },
        "review_window_ms":
            LOCAL_AI_REVIEW_WINDOW_MS,
        "attack_count":
            attack_count,
        "before":{
            "raw_damage_per_hit":
                before,
            "shielded_damage_per_hit":
                before_shielded,
            "raw_pressure":
                round(
                    before*attack_count,
                    2,
                ),
            "shielded_pressure":
                round(
                    before_shielded
                    * attack_count,
                    2,
                ),
        },
        "proposed":{
            "raw_damage_per_hit":
                proposed,
            "shielded_damage_per_hit":
                proposed_shielded,
            "raw_pressure":
                round(
                    proposed*attack_count,
                    2,
                ),
            "shielded_pressure":
                round(
                    proposed_shielded
                    * attack_count,
                    2,
                ),
        },
        "canonical_values_changed":False,
        "automatic_apply":False,
        "apply_endpoint_available":False,
    }
