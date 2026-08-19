from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_root_never_returns_304_in_web_test_mode():
    first=client.get("/")
    assert first.status_code==200
    assert "no-store" in first.headers["cache-control"]
    assert first.headers["x-gridshard-cache"]=="disabled"

    etag=first.headers.get("etag")
    headers={}
    if etag:
        headers["if-none-match"]=etag

    second=client.get(
        "/",
        headers=headers,
    )
    assert second.status_code==200
    assert "GRIDSHARD" in second.text
    assert "no-store" in second.headers["cache-control"]


def test_static_js_ignores_conditional_cache_headers():
    first=client.get("/src/app.js")
    assert first.status_code==200
    etag=first.headers.get("etag")

    second=client.get(
        "/src/app.js",
        headers={
            "if-none-match":
                etag or '"forced"',
            "if-modified-since":
                first.headers.get(
                    "last-modified",
                    "Wed, 01 Jan 2020 00:00:00 GMT",
                ),
        },
    )
    assert second.status_code==200
    assert second.headers["x-gridshard-cache"]=="disabled"
