from __future__ import annotations
from typing import Any

AREA_ORDER = (
    "usability",
    "connection",
    "battle_balance",
    "module_booster_balance",
)

LABELS = {
    "usability":"Kullanılabilirlik",
    "connection":"Bağlantı deneyimi",
    "battle_balance":"Savaş dengesi",
    "module_booster_balance":"Modül/güçlendirici dengesi",
}


def build_review_candidates(
    *,
    findings: dict[str, Any],
) -> dict[str, Any]:
    if findings.get("status") != "sufficient":
        return {
            "status":"waiting_for_real_data",
            "test_run_id":findings.get("test_run_id"),
            "candidate_count":0,
            "candidates":[],
            "auto_apply":False,
            "human_approval_required":True,
        }

    concerns = {
        item.get("area"):item
        for item in findings.get("concerns",[])
        if item.get("area")
    }
    gameplay = findings.get("gameplay_signals",{})
    candidates=[]

    for area in AREA_ORDER:
        concern=concerns.get(area)
        if not concern:
            continue

        item={
            "area":area,
            "label":LABELS[area],
            "severity":concern.get("severity","watch"),
            "reason":concern.get("reason","unknown"),
            "average":concern.get("average"),
            "low_score_count":int(concern.get("low_score_count",0)),
        }

        if area=="usability":
            item["recommended_action"]="Yerleşim/sürükle-bırak akışını ve teknik hata mesajlarını gözden geçir."
            item["technical_context"]={
                "module_shelf_uses":int(gameplay.get("module_shelf_uses",0)),
            }
        elif area=="connection":
            item["recommended_action"]="WebSocket kopma/yeniden bağlanma ve matchmaking sürelerini incele."
            item["technical_context"]={
                "completed_matches":int(gameplay.get("completed_matches",0)),
            }
        elif area=="battle_balance":
            item["recommended_action"]="Maç sonuçları, rematch davranışı ve savaş süresi ile birlikte denge incelemesi yap."
            item["technical_context"]={
                "completed_matches":int(gameplay.get("completed_matches",0)),
                "rematch_requests":int(gameplay.get("rematch_requests",0)),
            }
        else:
            item["recommended_action"]="Modül değişimi, booster kullanımı ve Devre Kredisi harcamasını birlikte incele."
            item["technical_context"]={
                "module_changes":int(gameplay.get("module_changes",0)),
                "boosters_used":int(gameplay.get("boosters_used",0)),
                "module_shelf_uses":int(gameplay.get("module_shelf_uses",0)),
                "total_circuit_credits_spent":int(gameplay.get("total_circuit_credits_spent",0)),
            }
        candidates.append(item)

    candidates.sort(
        key=lambda item:(
            0 if item["severity"]=="high" else 1,
            item["average"] if isinstance(item["average"],(int,float)) else 99,
            AREA_ORDER.index(item["area"]),
        )
    )

    return {
        "status":"review_required" if candidates else "no_priority_issue",
        "test_run_id":findings.get("test_run_id"),
        "candidate_count":len(candidates),
        "candidates":candidates,
        "auto_apply":False,
        "human_approval_required":True,
    }
