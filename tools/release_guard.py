from __future__ import annotations

from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
EXPECTED_VERSION="2.1.0-beta.72"


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


def main()->None:
    sys.path.insert(
        0,
        str(ROOT/"server"),
    )

    from app.version import VERSION

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
