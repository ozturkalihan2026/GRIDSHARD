from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_main_menu_keeps_only_locked_scope_and_new_ux_markup():
    response=client.get("/")
    assert response.status_code==200

    html=response.text
    assert html.count('data-open-screen="play"')==1
    assert html.count('data-open-screen="profile"')==1
    assert html.count('data-open-screen="statistics"')==1
    assert html.count('data-open-screen="settings"')==1
    assert "menu-action-play" in html
    assert "GRIDSHARD // CORE ARENA" not in html
    assert '<span class="lobby-subtitle">CORE ARENA</span>' in html
    assert 'class="main-menu-lead"' not in html
    assert 'data-open-screen="education"' not in html
    assert 'class="lobby-progress-ribbon"' in html
    assert 'class="main-scope-nav lobby-bottom-dock"' in html
    assert 'data-menu-focus="daily-missions"' in html
    assert 'data-menu-focus="reward-track"' in html
    assert 'data-roadmap-feature="store" disabled aria-disabled="true"' in html
    assert 'data-roadmap-feature="tournament" disabled aria-disabled="true"' in html
    assert 'data-roadmap-feature="team" disabled aria-disabled="true"' in html
