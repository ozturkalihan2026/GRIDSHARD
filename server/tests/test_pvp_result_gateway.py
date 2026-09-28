from fastapi.testclient import TestClient

from app.main import (
    app,
    pvp_service,
    pvp_websocket_adapter,
)


client=TestClient(app)


def destroy_core(engine, player_id):
    # Savaş yalnız bir Çekirdek yok olunca biter.
    for module in engine.state.players[player_id].modules.values():
        if module.definition.id == "core":
            module.hp = 0


def reset():
    pvp_service._sessions.clear()
    pvp_websocket_adapter.registry.connections.clear()


def test_result_endpoint_returns_terminal_server_result():
    reset()
    session=pvp_service.create_session("result")
    for p in ("a","b"):
        pvp_service.join("result",p)
        session.engine.grant_module(p,f"{p}-core","core")
        session.engine.set_initial_active_module(
            p,f"{p}-core",2,1
        )
    pvp_service.start("result")
    destroy_core(session.engine, "b")
    session.engine.step()

    response=client.get(
        "/pvp/sessions/result/result",
        params={"player_id":"a"},
    )

    assert response.status_code==200
    body=response.json()
    assert body["status"]=="finished"
    assert body["finish_reason"] is not None
    assert body["result_summary"]


def test_result_endpoint_rejects_running_match():
    reset()
    session=pvp_service.create_session("running")
    pvp_service.join("running","a")
    pvp_service.join("running","b")
    pvp_service.start("running")

    response=client.get(
        "/pvp/sessions/running/result",
        params={"player_id":"a"},
    )

    assert response.status_code==409
