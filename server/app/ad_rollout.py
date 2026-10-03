"""Explicit ad rollout; verifier availability alone never enables old clients.

The protocol is a compatibility declaration, not device attestation or consent.
Authentication and signed SSV verification remain independent requirements.
"""
from dataclasses import dataclass
import os
import re

AD_PROTOCOL = "child-safe-v1"


@dataclass(frozen=True)
class AdRollout:
    mode: str = "disabled"
    test_players: frozenset[str] = frozenset()

    @classmethod
    def from_environment(cls) -> "AdRollout":
        mode = os.environ.get("GRIDSHARD_ADMOB_ROLLOUT_MODE", "disabled").strip()
        players = frozenset(p.strip() for p in os.environ.get("GRIDSHARD_ADMOB_TEST_PLAYER_IDS", "").split(",") if p.strip())
        if mode not in {"disabled", "test", "live"}:
            raise ValueError("AdMob rollout mode must be disabled, test or live.")
        if any(not re.fullmatch(r"[A-Za-z0-9_.-]{1,96}", p) for p in players):
            raise ValueError("Invalid AdMob test player configuration.")
        if (mode == "test" and not players) or (mode != "test" and players):
            raise ValueError("AdMob test mode requires an explicit, test-only player allowlist.")
        return cls(mode, players)

    def permits_player(self, player_id: str) -> bool:
        return self.mode == "live" or (self.mode == "test" and player_id in self.test_players)

    def eligible(self, player_id: str, protocol: str, platform: str) -> bool:
        return protocol == AD_PROTOCOL and platform in {"android", "ios"} and self.permits_player(player_id)

    def platform_view(self, platforms: dict, *, player_id: str, protocol: str = "", platform: str = "") -> dict:
        enabled = bool(platforms.get("ad_platforms", {}).get("admob")) and self.eligible(player_id, protocol, platform)
        units = platforms.get("ad_units", {})
        enabled = enabled and bool(units.get(platform))
        return {
            **platforms,
            "ad_platforms": {"admob": enabled},
            "ad_units": {platform: units[platform]} if enabled else {},
            "ad_policy": {"protocol": AD_PROTOCOL, "mode": self.mode} if enabled else None,
        }
