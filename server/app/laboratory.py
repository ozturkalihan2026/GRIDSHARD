from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone

from .game.catalog import (
    BASIC_MODULE_DEFINITIONS,
    PLAYER_SELECTABLE_MODULE_IDS,
)
from .game.catalog_view import build_module_catalog_view
from .game.models import ModuleDefinition


LABORATORY_MAX_LEVEL = 3
LABORATORY_LEVEL_COSTS = (25, 75, 150)
LABORATORY_EFFICIENCY_PERCENT = (0, 2, 5, 9)
LABORATORY_HISTORY_LIMIT = 50
LABORATORY_RECEIPT_LIMIT = 64


class LaboratoryError(ValueError):
    pass


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_module_id(module_definition_id: str) -> ModuleDefinition:
    if module_definition_id not in PLAYER_SELECTABLE_MODULE_IDS:
        raise LaboratoryError("Bu modül Devre Laboratuvarı kataloğunda değil.")
    return BASIC_MODULE_DEFINITIONS[module_definition_id]


def calibration_multiplier(level: int) -> float:
    safe_level = max(0, min(LABORATORY_MAX_LEVEL, int(level)))
    return 1.0 + LABORATORY_EFFICIENCY_PERCENT[safe_level] / 100.0


def calibrated_module_definition(
    definition: ModuleDefinition,
    level: int,
) -> ModuleDefinition:
    """Deneysel mod için tek kanonik kalibrasyon dönüşümü.

    Dereceli oturumlar bu fonksiyonu hiçbir zaman çağırmaz. Etkiler küçük ve
    kategori kimliğini koruyacak biçimde tutulur; denge telemetrisi oluşmadan
    kalıcı rekabet gücüne dönüşmez.
    """
    safe_level = max(0, min(LABORATORY_MAX_LEVEL, int(level)))
    if safe_level <= 0:
        return definition

    multiplier = calibration_multiplier(safe_level)
    changes: dict[str, int | float] = {
        "max_hp": max(
            definition.max_hp,
            int(round(definition.max_hp * (1.0 + safe_level / 100.0))),
        )
    }

    if definition.category == "saldırı" and definition.base_damage > 0:
        changes["base_damage"] = round(definition.base_damage * multiplier, 3)
    elif definition.category == "savunma":
        changes["max_hp"] = int(round(definition.max_hp * multiplier))
    elif definition.category == "enerji" and definition.energy_generation > 0:
        changes["energy_generation"] = round(
            definition.energy_generation * multiplier,
            3,
        )
    elif definition.category in {"destek", "sabotaj"}:
        if definition.cooldown_ms > 0:
            changes["cooldown_ms"] = max(
                100,
                int(round(definition.cooldown_ms / multiplier)),
            )
        if definition.energy_consumption > 0:
            changes["energy_consumption"] = round(
                definition.energy_consumption / multiplier,
                3,
            )

    return replace(definition, **changes)


def _stat_view(definition: ModuleDefinition, level: int) -> dict:
    calibrated = calibrated_module_definition(definition, level)
    return {
        "level": level,
        "efficiency_bonus_percent": LABORATORY_EFFICIENCY_PERCENT[level],
        "max_hp": calibrated.max_hp,
        "base_damage": calibrated.base_damage,
        "energy_generation": calibrated.energy_generation,
        "energy_consumption": calibrated.energy_consumption,
        "cooldown_ms": calibrated.cooldown_ms,
    }


def _effect_label(definition: ModuleDefinition) -> str:
    return {
        "saldırı": "Deneysel modda hasar verimliliği artar.",
        "savunma": "Deneysel modda dayanıklılık artar.",
        "enerji": "Deneysel modda enerji verimliliği artar.",
        "destek": "Deneysel modda destek çevrimi hızlanır.",
        "sabotaj": "Deneysel modda sabotaj çevrimi hızlanır.",
    }.get(
        definition.category,
        "Deneysel modda modül verimliliği artar.",
    )


def build_laboratory_view(profile) -> dict:
    catalog_by_id = {
        item["id"]: item
        for item in build_module_catalog_view()["modules"]
    }
    modules = []
    for module_definition_id in PLAYER_SELECTABLE_MODULE_IDS:
        definition = BASIC_MODULE_DEFINITIONS[module_definition_id]
        level = max(
            0,
            min(
                LABORATORY_MAX_LEVEL,
                int(profile.module_calibration_levels.get(module_definition_id, 0)),
            ),
        )
        next_level = min(LABORATORY_MAX_LEVEL, level + 1)
        modules.append({
            **catalog_by_id[module_definition_id],
            "level": level,
            "max_level": LABORATORY_MAX_LEVEL,
            "next_level": next_level if level < LABORATORY_MAX_LEVEL else None,
            "next_cost": (
                LABORATORY_LEVEL_COSTS[level]
                if level < LABORATORY_MAX_LEVEL
                else None
            ),
            "can_upgrade": (
                level < LABORATORY_MAX_LEVEL
                and profile.flux_shards >= LABORATORY_LEVEL_COSTS[level]
            ),
            "current_stats": _stat_view(definition, level),
            "next_stats": (
                _stat_view(definition, next_level)
                if level < LABORATORY_MAX_LEVEL
                else None
            ),
            "experimental_effect_tr": _effect_label(definition),
        })

    invested = sum(
        sum(LABORATORY_LEVEL_COSTS[: max(0, min(LABORATORY_MAX_LEVEL, int(level)))])
        for level in profile.module_calibration_levels.values()
    )
    return {
        "season_id": profile.engagement_view()["season_id"],
        "flux_shards": profile.flux_shards,
        "max_level": LABORATORY_MAX_LEVEL,
        "level_costs": list(LABORATORY_LEVEL_COSTS),
        "invested_flux": invested,
        "calibrated_module_count": sum(
            1 for level in profile.module_calibration_levels.values() if int(level) > 0
        ),
        "reset_is_free": True,
        "ranked_normalized": True,
        "experimental_feature_flag": "GRIDSHARD_EXPERIMENTAL_LAB_EFFECTS",
        "modules": modules,
        "transactions": list(reversed(profile.laboratory_transactions[-LABORATORY_HISTORY_LIMIT:])),
    }


def upgrade_calibration(
    profile,
    module_definition_id: str,
    request_id: str,
) -> dict:
    definition = _validate_module_id(module_definition_id)
    clean_request_id = str(request_id or "").strip()
    if not clean_request_id:
        raise LaboratoryError("Laboratuvar işlem kimliği zorunludur.")
    if len(clean_request_id) > 96:
        raise LaboratoryError("Laboratuvar işlem kimliği çok uzun.")

    existing = profile.laboratory_receipts.get(clean_request_id)
    if existing is not None:
        return {**existing, "replayed": True}

    current_level = int(profile.module_calibration_levels.get(module_definition_id, 0))
    if current_level >= LABORATORY_MAX_LEVEL:
        raise LaboratoryError("Bu modül en yüksek kalibrasyon seviyesinde.")

    next_level = current_level + 1
    cost = LABORATORY_LEVEL_COSTS[current_level]
    if profile.flux_shards < cost:
        raise LaboratoryError(
            f"Bu kalibrasyon için {cost} Akı gerekir; mevcut bakiye {profile.flux_shards}."
        )

    profile.flux_shards -= cost
    profile.module_calibration_levels[module_definition_id] = next_level
    transaction = {
        "id": clean_request_id,
        "kind": "calibration_upgrade",
        "module_definition_id": module_definition_id,
        "module_name_tr": definition.name_tr,
        "level": next_level,
        "flux_delta": -cost,
        "balance_after": profile.flux_shards,
        "created_at": _utc_now_iso(),
    }
    profile.laboratory_transactions.append(transaction)
    del profile.laboratory_transactions[:-LABORATORY_HISTORY_LIMIT]
    receipt = {
        "applied": True,
        "replayed": False,
        "request_id": clean_request_id,
        "module_definition_id": module_definition_id,
        "level": next_level,
        "cost": cost,
        "flux_shards": profile.flux_shards,
    }
    profile.laboratory_receipts[clean_request_id] = receipt
    while len(profile.laboratory_receipts) > LABORATORY_RECEIPT_LIMIT:
        profile.laboratory_receipts.pop(next(iter(profile.laboratory_receipts)))
    return receipt


def reset_calibrations(profile, request_id: str) -> dict:
    clean_request_id = str(request_id or "").strip()
    if not clean_request_id:
        raise LaboratoryError("Laboratuvar işlem kimliği zorunludur.")
    if len(clean_request_id) > 96:
        raise LaboratoryError("Laboratuvar işlem kimliği çok uzun.")

    existing = profile.laboratory_receipts.get(clean_request_id)
    if existing is not None:
        return {**existing, "replayed": True}

    refund = sum(
        sum(LABORATORY_LEVEL_COSTS[: max(0, min(LABORATORY_MAX_LEVEL, int(level)))])
        for level in profile.module_calibration_levels.values()
    )
    reset_modules = sum(
        1 for level in profile.module_calibration_levels.values() if int(level) > 0
    )
    profile.flux_shards += refund
    profile.module_calibration_levels = {}
    profile.laboratory_reset_count += 1
    transaction = {
        "id": clean_request_id,
        "kind": "free_beta_reset",
        "module_definition_id": None,
        "module_name_tr": "Tüm kalibrasyonlar",
        "level": 0,
        "flux_delta": refund,
        "balance_after": profile.flux_shards,
        "created_at": _utc_now_iso(),
    }
    profile.laboratory_transactions.append(transaction)
    del profile.laboratory_transactions[:-LABORATORY_HISTORY_LIMIT]
    receipt = {
        "applied": True,
        "replayed": False,
        "request_id": clean_request_id,
        "reset_module_count": reset_modules,
        "refund": refund,
        "flux_shards": profile.flux_shards,
    }
    profile.laboratory_receipts[clean_request_id] = receipt
    while len(profile.laboratory_receipts) > LABORATORY_RECEIPT_LIMIT:
        profile.laboratory_receipts.pop(next(iter(profile.laboratory_receipts)))
    return receipt
