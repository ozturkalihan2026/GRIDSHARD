from __future__ import annotations

import ipaddress
import os
from typing import Mapping


def _parsed_address(value: str) -> str | None:
    try:
        return str(ipaddress.ip_address(str(value or "").strip()))
    except ValueError:
        return None


def client_address(
    peer: str | None,
    headers: Mapping[str, str],
    *,
    environ: Mapping[str, str] = os.environ,
) -> str:
    """The address rate limits are keyed by.

    Production runs behind a reverse proxy on a private network, so the TCP
    peer is the proxy for every player. Only then is a forwarded address read:
    the header named by GRIDSHARD_CLIENT_IP_HEADER (set it only when the edge
    in front of the proxy writes that header, e.g. CF-Connecting-IP), else the
    last X-Forwarded-For hop, which the proxy itself appends. A direct public
    peer is never overridden by a header it sent.
    """
    peer_value = str(peer or "unknown")
    parsed_peer = _parsed_address(peer_value)
    if parsed_peer is None:
        return peer_value
    peer_ip = ipaddress.ip_address(parsed_peer)
    if not (peer_ip.is_private or peer_ip.is_loopback):
        return parsed_peer
    header_name = str(environ.get("GRIDSHARD_CLIENT_IP_HEADER", "")).strip().lower()
    candidates = []
    if header_name:
        candidates.append(headers.get(header_name, ""))
    candidates.append(str(headers.get("x-forwarded-for", "")).rsplit(",", 1)[-1])
    for candidate in candidates:
        parsed = _parsed_address(candidate)
        if parsed is not None:
            return parsed
    return parsed_peer
