from types import SimpleNamespace
from copy import deepcopy

from app.game import pvp_session


def event(data, kind="module_damaged"):
    return SimpleNamespace(type=kind, at_ms=100, data=data)


def test_scalar_event_has_independent_outer_dict_without_deepcopy(monkeypatch):
    monkeypatch.setattr(pvp_session, "deepcopy", lambda _: (_ for _ in ()).throw(AssertionError("unneeded deepcopy")))
    source={"player_id":"a","damage":10}
    result=pvp_session.PvPSessionService()._event_for_viewer(event(source),"a")
    result["data"]["damage"]=20
    assert source["damage"]==10


def test_nested_event_is_still_independent_and_source_is_not_mutated():
    source={"player_id":"a","nested":{"values":[1,2]}}
    original=deepcopy(source)
    result=pvp_session.PvPSessionService()._event_for_viewer(event(source),"a")
    result["data"]["nested"]["values"].append(3)
    assert source==original


def test_unknown_mutable_payload_does_not_enter_scalar_fast_path():
    source = {"player_id":"a", "extra":SimpleNamespace(values=[1, 2])}
    result = pvp_session.PvPSessionService()._event_for_viewer(event(source), "a")
    result["data"]["extra"].values.append(3)
    assert source["extra"].values == [1, 2]


def test_hidden_private_event_is_filtered_before_copying(monkeypatch):
    monkeypatch.setattr(pvp_session, "deepcopy", lambda _: (_ for _ in ()).throw(AssertionError("private event copied")))
    kind=next(iter(pvp_session.OWNER_ONLY_EVENT_TYPES))
    assert pvp_session.PvPSessionService()._event_for_viewer(event({"player_id":"a","secret":{"values":[1]}},kind),"b") is None


def test_core_private_fields_are_filtered_without_mutating_scalar_source():
    source={"player_id":"a","request_id":"private","charge":99,"target":"x"}
    result=pvp_session.PvPSessionService()._event_for_viewer(event(source,"core_power_used"),"b")
    assert "charge" not in result["data"] and "request_id" not in result["data"]
    assert source["charge"]==99 and source["request_id"]=="private"
