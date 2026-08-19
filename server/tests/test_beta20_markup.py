from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta20_review_console_v2_markup():
    html=client.get("/").text
    assert 'id="human-review-decision-note"' in html
    assert 'id="human-review-note-save"' in html
    assert 'id="human-review-note-clear"' in html
    assert "yalnız bu tarayıcıda tutulur" in html
