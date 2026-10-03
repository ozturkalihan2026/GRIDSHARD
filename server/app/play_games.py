"""Confidential server-side Play Games verification; never trust a device player ID."""
from __future__ import annotations

import os
import re
from urllib.parse import urlencode
from urllib.request import Request

from .production_config import environment_secret


def configuration() -> dict:
    game_id = os.environ.get("GRIDSHARD_PLAY_GAMES_ID", "").strip()
    client_id = os.environ.get("GRIDSHARD_PLAY_GAMES_SERVER_CLIENT_ID", "").strip()
    secret = environment_secret("GRIDSHARD_PLAY_GAMES_CLIENT_SECRET", os.environ)
    if game_id and not re.fullmatch(r"[0-9]{5,24}", game_id):
        raise ValueError("Play Games oyun kimliği geçersiz.")
    if client_id and not re.fullmatch(r"[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com", client_id):
        raise ValueError("Play Games sunucu istemcisi geçersiz.")
    return {"game_id": game_id, "client_id": client_id, "secret": secret,
            "configured": bool(game_id and client_id and secret)}


def verified_subject(config: dict, code: str, request_json) -> str:
    # Fixed Google endpoints: environment/clients cannot redirect secrets to another host.
    token = request_json(Request("https://oauth2.googleapis.com/token", method="POST",
        data=urlencode({"client_id": config["client_id"], "client_secret": config["secret"],
                        "code": code, "grant_type": "authorization_code", "redirect_uri": ""}).encode(),
        headers={"Content-Type": "application/x-www-form-urlencoded"}), provider="Play Games")
    access = token.get("access_token")
    if not isinstance(access, str) or not access.strip() or len(access) > 8192:
        raise ValueError("Play Games erişimi doğrulanamadı.")
    # applications.verify checks BOTH the token's game and the true player identity.
    result = request_json(Request(
        f"https://games.googleapis.com/games/v1/applications/{config['game_id']}/verify",
        headers={"Authorization": f"Bearer {access}"}, method="GET"), provider="Play Games")
    subject = result.get("player_id")
    if not isinstance(subject, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,256}", subject):
        raise ValueError("Play Games oyuncusu doğrulanamadı.")
    # Access/refresh tokens, auth codes and email are never persisted or returned.
    return subject
