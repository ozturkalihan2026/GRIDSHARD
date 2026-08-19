from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_beta21_review_status_markup():
    html=client.get("/").text

    assert (
        'id="human-review-decision-state"'
        in html
    )
    assert (
        '<option value="hold">Beklet</option>'
        in html
    )
    assert (
        '<option value="reject">Reddet</option>'
        in html
    )
    assert (
        '<option value="revisit">İleride değerlendir</option>'
        in html
    )
    assert "Yerel İnceleme Durumu" in html
    assert "yalnız bu tarayıcıda tutulur" in html
