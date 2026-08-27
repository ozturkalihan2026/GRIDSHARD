from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_main_menu_and_shared_shell_keep_the_new_ux_scope():
    response=client.get("/")
    assert response.status_code==200

    html=response.text
    assert html.count('data-open-screen="play"')==1
    assert html.count('data-open-screen="profile"')==1
    assert html.count('data-open-screen="daily"')==1
    assert html.count('data-open-screen="rewards"')==1
    assert html.count('data-open-screen="statistics"')==1
    assert html.count('data-open-screen="settings"')==1
    assert html.count('data-open-screen="laboratory"')==1
    assert "menu-action-play" in html
    assert html.count('id="main-menu-title"')==1
    assert "GRIDSHARD // CORE ARENA" not in html
    assert '<span class="lobby-subtitle">CORE ARENA</span>' in html
    assert 'class="main-menu-lead"' not in html
    assert 'data-open-screen="education"' not in html
    assert 'id="app-progress-ribbon"' in html
    assert 'class="lobby-progress-ribbon app-progress-ribbon"' in html
    assert 'id="app-bottom-dock"' in html
    assert 'class="main-scope-nav lobby-bottom-dock app-bottom-dock"' in html
    assert 'data-shell-screen="menu"' in html
    assert '<span class="menu-action-title">EV</span>' in html
    assert 'id="return-main-menu"' not in html
    assert 'id="daily-missions-screen"' in html
    assert 'id="season-rewards-screen"' in html
    assert 'id="settings-about-title">Hakkında</h3>' in html
    assert 'id="lobby-circuit-credits"' in html
    assert 'id="battle-pool-title"' not in html
    assert 'id="battle-pool-count"' in html
    assert 'id="laboratory-screen"' in html
    assert 'data-roadmap-feature="store"' not in html
    assert 'data-roadmap-feature="tournament" disabled aria-disabled="true"' in html
    assert 'data-roadmap-feature="team" disabled aria-disabled="true"' in html
