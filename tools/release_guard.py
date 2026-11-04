from __future__ import annotations

from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
EXPECTED_VERSION="2.3.0"


def fail(message:str)->None:
    print(
        f"[GRIDSHARD][KAYNAK HATASI] {message}",
        file=sys.stderr,
    )
    print(
        "[GRIDSHARD] Eski klasörün üzerine karışık kopyalama yapmayın. "
        "ZIP'i boş bir klasöre çıkarıp BASLAT_WEB_TEST.bat dosyasını oradan çalıştırın.",
        file=sys.stderr,
    )
    raise SystemExit(2)


def require_prerelease_notice(version, catalog):
    from app.release_announcements import version_key
    if version_key(version) > (2, 3, 0) and not any(
        entry['target_version'] == version and entry['status'] == 'published'
        for entry in catalog['announcements']
    ):
        fail("Bu sürümün incelenmiş iki dilli ön duyurusu eksik.")


def main()->None:
    sys.path.insert(
        0,
        str(ROOT/"server"),
    )

    from app.version import VERSION
    # Import validates unique version IDs and requires notes for this release.
    from app.release_updates import INBOX_UPDATE_NOTICES
    from app.release_announcements import CATALOG
    require_prerelease_notice(VERSION, CATALOG)
    if VERSION == "2.3.0":
        from app.cosmetic_releases import REGISTRY
        if len(REGISTRY.items) != 15 or REGISTRY.releases or REGISTRY.used or REGISTRY.document.get("require_fresh_from"):
            fail("2.3.0 yalnız 15 kilitli kozmetiği önizler; dönem tahsisi/yayını boş kalmalı.")

    if VERSION != EXPECTED_VERSION:
        fail(
            f"Beklenen sürüm {EXPECTED_VERSION}, çalışan kaynak {VERSION}."
        )

    html=(
        ROOT/"client/index.html"
    ).read_text(
        encoding="utf-8"
    )
    if EXPECTED_VERSION not in html:
        fail(
            "UI build etiketi sunucu sürümüyle eşleşmiyor."
        )

    print(
        "[GRIDSHARD] Kaynak bütünlüğü doğrulandı: "
        f"{EXPECTED_VERSION}."
    )


if __name__=="__main__":
    main()
