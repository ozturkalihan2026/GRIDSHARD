from __future__ import annotations

from pathlib import Path
import json
import os
import shutil
from threading import RLock
from typing import Any


class BalanceChangeDraftError(ValueError):
    pass


VALID_CHECK_STATUSES={
    "pending",
    "passed",
    "failed",
}


class JsonBalanceChangeDraftRepository:
    def __init__(
        self,
        path:str|Path,
    ):
        self.path=Path(path)
        self._lock=RLock()

    @property
    def backup_path(self)->Path:
        return self.path.with_name(
            self.path.name+".bak"
        )

    def _read_all(self)->dict:
        if not self.path.exists():
            return {}

        try:
            raw=self.path.read_text(
                encoding="utf-8"
            )
            if not raw.strip():
                return {}
            payload=json.loads(raw)
        except (
            OSError,
            json.JSONDecodeError,
        ) as exc:
            raise BalanceChangeDraftError(
                "Denge değişiklik taslağı okunamadı."
            ) from exc

        if not isinstance(payload,dict):
            raise BalanceChangeDraftError(
                "Denge değişiklik taslağı veri kökü nesne olmalıdır."
            )

        return payload

    def _write_all(
        self,
        payload:dict,
    )->None:
        with self._lock:
            try:
                self.path.parent.mkdir(
                    parents=True,
                    exist_ok=True,
                )

                if self.path.exists():
                    backup_tmp=self.backup_path.with_name(
                        self.backup_path.name+".tmp"
                    )
                    shutil.copy2(
                        self.path,
                        backup_tmp,
                    )
                    os.replace(
                        backup_tmp,
                        self.backup_path,
                    )

                temp=self.path.with_name(
                    self.path.name+".tmp"
                )
                temp.write_text(
                    json.dumps(
                        payload,
                        ensure_ascii=False,
                        indent=2,
                        sort_keys=True,
                    )+"\n",
                    encoding="utf-8",
                )
                os.replace(
                    temp,
                    self.path,
                )
            except OSError as exc:
                raise BalanceChangeDraftError(
                    "Denge değişiklik taslağı yazılamadı."
                ) from exc

    def get_player(
        self,
        player_id:str,
    )->dict:
        payload=self._read_all()
        value=payload.get(
            player_id,
            {},
        )
        return (
            dict(value)
            if isinstance(value,dict)
            else {}
        )

    def save_player(
        self,
        player_id:str,
        value:dict,
    )->dict:
        with self._lock:
            payload=self._read_all()
            payload[player_id]=dict(value)
            self._write_all(payload)
        return dict(value)

    def clear_player(
        self,
        player_id:str,
    )->None:
        with self._lock:
            payload=self._read_all()
            payload.pop(
                player_id,
                None,
            )
            self._write_all(payload)


class BalanceChangeDraftService:
    def __init__(
        self,
        repository:JsonBalanceChangeDraftRepository,
    ):
        self.repository=repository

    def view(
        self,
        *,
        player_id:str,
        plan:dict,
    )->dict:
        stored=self.repository.get_player(
            player_id
        )
        items_by_area={
            str(item.get("area")):
                dict(item)
            for item
            in stored.get(
                "items",
                [],
            )
            if item.get("area")
        }

        plan_items=[]
        for item in plan.get(
            "items",
            [],
        ):
            area=str(
                item.get("area")
            )
            current=items_by_area.get(
                area,
                {},
            )
            merged={
                **dict(item),
                "before_value":
                    current.get(
                        "before_value"
                    ),
                "proposed_value":
                    current.get(
                        "proposed_value"
                    ),
                "approved":bool(
                    current.get(
                        "approved",
                        False,
                    )
                ),
                "simulation_status":
                    current.get(
                        "simulation_status",
                        "pending",
                    ),
                "regression_status":
                    current.get(
                        "regression_status",
                        "pending",
                    ),
            }
            merged["ready_for_apply"]=bool(
                merged["approved"]
                and merged["simulation_status"]
                    == "passed"
                and merged["regression_status"]
                    == "passed"
                and merged["proposed_value"]
                    is not None
            )
            merged["human_review_ready"]=bool(
                (
                    merged["simulation_status"]
                    == "passed"
                    and merged["regression_status"]
                    == "passed"
                    and merged["approved"]
                    and merged["proposed_value"]
                    is not None
                )
                or (
                    area in {
                        "generator_route",
                        "defense_usage",
                    }
                    and merged["regression_status"]
                    == "passed"
                )
            )
            plan_items.append(
                merged
            )

        return {
            "status":plan.get(
                "status"
            ),
            "review_ready":bool(
                plan.get(
                    "review_ready"
                )
            ),
            "items":plan_items,
            "automatic_apply":False,
            "apply_endpoint_available":False,
            "numeric_balance_changed":False,
        }

    def update_item(
        self,
        *,
        player_id:str,
        plan:dict,
        area:str,
        before_value:Any,
        proposed_value:Any,
        approved:bool,
        simulation_status:str,
        regression_status:str,
    )->dict:
        if not plan.get(
            "review_ready"
        ):
            raise BalanceChangeDraftError(
                "Denge taslağı yalnız review_ready gerçek maç raporunda düzenlenebilir."
            )

        allowed={
            str(item.get("area"))
            for item
            in plan.get(
                "items",
                [],
            )
        }
        if area not in allowed:
            raise BalanceChangeDraftError(
                "Bu denge alanı mevcut review-ready planında bulunmuyor."
            )

        if simulation_status not in VALID_CHECK_STATUSES:
            raise BalanceChangeDraftError(
                "Geçersiz simülasyon durumu."
            )
        if regression_status not in VALID_CHECK_STATUSES:
            raise BalanceChangeDraftError(
                "Geçersiz regresyon durumu."
            )

        if proposed_value is None:
            approved=False

        stored=self.repository.get_player(
            player_id
        )
        items=[
            dict(item)
            for item
            in stored.get(
                "items",
                [],
            )
            if item.get("area")
            and item.get("area") != area
        ]
        items.append({
            "area":area,
            "before_value":before_value,
            "proposed_value":proposed_value,
            "approved":bool(approved),
            "simulation_status":
                simulation_status,
            "regression_status":
                regression_status,
        })

        self.repository.save_player(
            player_id,
            {
                "items":items,
            },
        )

        return self.view(
            player_id=player_id,
            plan=plan,
        )

    def clear(
        self,
        player_id:str,
    )->None:
        self.repository.clear_player(
            player_id
        )



def build_human_review_queue(
    draft:dict,
)->dict:
    numeric=[]
    structural=[]

    for item in draft.get(
        "items",
        [],
    ):
        area=str(
            item.get(
                "area",
                "",
            )
        )

        if (
            area in {
                "generator_route",
                "defense_usage",
            }
            and item.get(
                "regression_status"
            ) == "passed"
        ):
            structural.append({
                "area":area,
                "reason":
                    item.get(
                        "reason"
                    ),
                "suggestion":
                    item.get(
                        "suggestion"
                    ),
                "regression_status":
                    "passed",
                "numeric_change":
                    False,
                "human_review_ready":
                    True,
            })
            continue

        if (
            item.get(
                "approved"
            )
            and item.get(
                "simulation_status"
            ) == "passed"
            and item.get(
                "regression_status"
            ) == "passed"
            and item.get(
                "proposed_value"
            ) is not None
        ):
            numeric.append({
                "area":area,
                "reason":
                    item.get(
                        "reason"
                    ),
                "before_value":
                    item.get(
                        "before_value"
                    ),
                "proposed_value":
                    item.get(
                        "proposed_value"
                    ),
                "simulation_status":
                    "passed",
                "regression_status":
                    "passed",
                "numeric_change":
                    True,
                "human_review_ready":
                    True,
            })

    return {
        "review_ready":bool(
            draft.get(
                "review_ready"
            )
        ),
        "numeric_candidates":
            numeric,
        "structural_candidates":
            structural,
        "candidate_count":
            len(numeric)
            + len(structural),
        "human_decision_required":
            True,
        "automatic_apply":
            False,
        "apply_endpoint_available":
            False,
        "numeric_balance_changed":
            False,
    }
