"""Validated public endpoints and file-mounted secrets; never log secret values."""

from pathlib import Path
from urllib.parse import urlsplit


def environment_secret(name, environ):
    inline = environ.get(name, "").strip()
    filename = environ.get(name + "_FILE", "").strip()
    if inline and filename:
        raise RuntimeError(f"{name} ve {name}_FILE birlikte ayarlanamaz.")
    if not filename:
        return inline
    path = Path(filename)
    if not path.is_absolute():
        raise RuntimeError(f"{name}_FILE mutlak yol olmalıdır.")
    try:
        with path.open("rb") as handle:
            raw = handle.read(8193)
        if len(raw) > 8192:
            raise ValueError("oversized")
        value = raw.decode("utf-8").strip()
        if not value or "\x00" in value:
            raise ValueError("empty or invalid")
    except (OSError, UnicodeError, ValueError) as exc:
        raise RuntimeError(f"{name}_FILE okunamadı veya geçersiz.") from exc
    return value


def production_endpoints(environ):
    values = []
    for name, scheme in (("GRIDSHARD_PUBLIC_WEB_URL", "https"),
                         ("GRIDSHARD_PUBLIC_WS_BASE_URL", "wss")):
        value = environ.get(name, "").strip()
        try:
            parsed = urlsplit(value)
            valid = (parsed.scheme == scheme and parsed.hostname and
                     not parsed.username and not parsed.password and
                     not parsed.query and not parsed.fragment and
                     parsed.path in {"", "/"} and parsed.port in {None, 443})
        except ValueError:
            valid = False
        if not valid:
            raise RuntimeError(f"{name} açık ve güvenli {scheme} kök adresi olmalıdır.")
        values.append((value.rstrip("/"), parsed.hostname.lower()))
    if values[0][1] != values[1][1]:
        raise RuntimeError("HTTPS ve WSS adresleri aynı sunucuya ait olmalıdır.")
    origins = tuple(value.strip() for value in environ.get("GRIDSHARD_CORS_ORIGINS", "").split(",") if value.strip())
    for origin in origins:
        if origin in {"capacitor://localhost", "http://localhost", "https://localhost", values[0][0]}:
            continue
        raise RuntimeError("Üretim CORS yalnız uygulamanın açık web/native origin adreslerini kabul eder.")
    return values[0][0], values[1][0], values[0][1]
