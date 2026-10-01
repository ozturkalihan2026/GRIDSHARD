"""One canonical name policy for memory, JSON and PostgreSQL writes."""
from collections.abc import Iterable
import hashlib
import re
import unicodedata


class DisplayNameError(ValueError):
    def __init__(self, message: str, *, code: str = "invalid"):
        super().__init__(message)
        self.code = code


def normalize_display_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value)
    if any(unicodedata.category(char).startswith("C") for char in normalized):
        raise DisplayNameError("Oyuncu adı görünmez veya kontrol karakteri içeremez.")
    clean = " ".join(normalized.split())
    if not clean or len(clean) > 24:
        raise DisplayNameError("Oyuncu adı 1–24 karakter olmalıdır.")
    return clean


def display_name_key(value: str) -> str:
    # Fold Turkish I variants too; composed/full-width characters and extra
    # spaces must not let another account impersonate an existing name.
    value = unicodedata.normalize("NFKC", value)
    return " ".join(value.split()).translate(str.maketrans("Iİı", "iii")).casefold()


def is_automatic_player_id(value: str) -> bool:
    # Both UUID and timestamp/random fallback IDs emitted by the client.
    return re.fullmatch(r"wt-[a-z0-9_-]{6,69}", value) is not None


def default_operator_name(player_id: str, existing: Iterable[tuple[str, str]] = ()) -> str:
    """A short, stable public name; the authentication ID stays untouched."""
    if not is_automatic_player_id(player_id):
        return player_id
    names = tuple(existing)
    for attempt in range(1000):
        suffix = hashlib.sha256(f"{player_id}:{attempt}".encode("utf-8")).hexdigest()[:8].upper()
        candidate = f"Pilot-{suffix}"
        try:
            ensure_display_name_available(player_id, candidate, names)
        except DisplayNameError as exc:
            if exc.code != "taken":
                raise
        else:
            return candidate
    raise DisplayNameError("Bu oyuncu adı zaten kullanılıyor. Başka bir ad seç.", code="taken")


def ensure_display_name_available(
    player_id: str,
    name: str,
    existing: Iterable[tuple[str, str]],
    *,
    previous_name: str | None = None,
) -> None:
    # Legacy duplicates must not break unrelated progress saves. They cannot
    # be newly claimed; do not silently rename an existing player's account.
    if previous_name == name:
        return
    key = display_name_key(name)
    if any(owner != player_id and display_name_key(other) == key for owner, other in existing):
        raise DisplayNameError("Bu oyuncu adı zaten kullanılıyor. Başka bir ad seç.", code="taken")
    from .arena_canon import BOTS
    if any(str(bot["id"]) != player_id and display_name_key(bot["display_name"]) == key for bot in BOTS):
        raise DisplayNameError("Bu oyuncu adı zaten kullanılıyor. Başka bir ad seç.", code="taken")
