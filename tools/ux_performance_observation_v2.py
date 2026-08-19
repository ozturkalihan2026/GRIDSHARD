from __future__ import annotations
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/"qa_reports"
MATRIX=QA/"ux_interaction_matrix.json"
HISTORY=QA/"windows_e2e_history.json"
OUTPUT=QA/"ux_performance_observation.json"

BANDS={
    "average_frame_gap_ms":{"attention":33,"high_attention":50},
    "max_frame_gap_ms":{"attention":100,"high_attention":250},
}

def load(path,default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def classify(value,band):
    if value>=band["high_attention"]:
        return "HIGH_ATTENTION"
    if value>=band["attention"]:
        return "ATTENTION"
    return "OBSERVE"

def main():
    matrix=load(MATRIX,{})
    history=load(HISTORY,{"runs":[]})
    if matrix.get("status")!="MEASURED":
        payload={
            "version":"2.0.0-beta.22",
            "status":"NOT_MEASURED",
            "performance_pass":None,
            "history_run_count":len(history.get("runs",[])),
            "observation_bands":BANDS,
            "categories":{},
            "trend":"NOT_AVAILABLE",
            "note":"Gerçek PASSED browser ölçümü yok; performans PASS/FAIL üretilmedi.",
        }
    else:
        categories={}
        for category,value in matrix.get("categories",{}).items():
            avg=float(value.get("average_frame_gap_ms",0) or 0)
            mx=float(value.get("max_frame_gap_ms",0) or 0)
            categories[category]={
                **value,
                "average_frame_gap_observation":
                    classify(avg,BANDS["average_frame_gap_ms"]),
                "max_frame_gap_observation":
                    classify(mx,BANDS["max_frame_gap_ms"]),
            }
        run_count=len(history.get("runs",[]))
        payload={
            "version":"2.0.0-beta.22",
            "status":"OBSERVED",
            "performance_pass":None,
            "history_run_count":run_count,
            "source":matrix.get("source"),
            "evidence_status":matrix.get("evidence_status"),
            "pause_violation_count":matrix.get("pause_violation_count"),
            "observation_bands":BANDS,
            "categories":categories,
            "trend":"HISTORY_AVAILABLE" if run_count>=2 else "INSUFFICIENT_HISTORY",
            "note":"Beta.22 eşikleri gözlem bandıdır; release PASS/FAIL kapısı değildir.",
        }
    OUTPUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("UX performance observation:",payload["status"])
    return 0

if __name__=="__main__":
    raise SystemExit(main())
