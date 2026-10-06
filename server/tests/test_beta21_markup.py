from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_retired_local_review_panel_is_absent_and_real_account_choices_remain():
    html = client.get("/").text
    for old in ('id="human-review-decision-state"', "Yerel İnceleme Durumu",
                '<option value="revisit">'):
        assert old not in html
    for provider in ("google", "apple", "guest"):
        assert f'id="account-onboarding-{provider}"' in html
    # Yeni e-posta alınmaz (docs/CHILD_AUDIENCE_AUDIT.md): e-posta ile kayıt alanı yoktur.
    assert 'id="account-onboarding-email"' not in html
    assert 'id="account-onboarding-status" role="status"' in html
