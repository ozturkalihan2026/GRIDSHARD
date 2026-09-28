"""Beta.72: Lider Görünümü seçimleri (amblem, çerçeve, isim rengi).

Her takımın ``cosmetics`` bölümüne varsayılan görünüm seçimleri yazılır.
``team_service.team_appearance`` eksik alanları zaten varsayılanla okur; göç
kayıtları güncel biçime getirir.
"""

DEFAULTS = {
    "selected_emblem_id": "shield",
    "selected_frame_id": "steel",
    "selected_name_color_id": "cyan",
}


def _cosmetics(payload):
    if not isinstance(payload, dict):
        return
    teams = payload.get("teams")
    if not isinstance(teams, dict):
        return
    for team in teams.values():
        if not isinstance(team, dict):
            continue
        cosmetics = team.get("cosmetics")
        if cosmetics is None:
            cosmetics = team["cosmetics"] = {}
        if isinstance(cosmetics, dict):
            yield cosmetics


def up(payload):
    for cosmetics in _cosmetics(payload):
        for key, value in DEFAULTS.items():
            cosmetics.setdefault(key, value)
    return payload


def down(payload):
    for cosmetics in _cosmetics(payload):
        for key in DEFAULTS:
            cosmetics.pop(key, None)
    return payload
