from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_favicon_is_served():
    response=client.get("/favicon.ico")
    assert response.status_code==200
    assert response.content
