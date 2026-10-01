"""Create NEW production secrets outside the checkout on a Linux host.

Never prints credentials, reads existing secrets or overwrites an installation.
Run once as root; bind individual files using Compose secrets, not the directory.
"""
import argparse
import os
from pathlib import Path
import secrets
import sys

ROOT = Path(__file__).resolve().parents[1]


def create_secrets(directory: Path, *, chown=os.chown if hasattr(os, "chown") else None):
    directory = Path(directory)
    if not directory.is_absolute() or directory.resolve().is_relative_to(ROOT):
        raise ValueError("Sırlar mutlak, kaynak ağacı dışındaki yeni bir dizine yazılmalıdır.")
    if not directory.parent.is_dir():
        raise ValueError("Sır dizininin üst dizini önceden oluşturulmalıdır.")
    directory.mkdir(mode=0o700, exist_ok=False)
    password = secrets.token_hex(32)
    values = {
        "postgres_password": password,
        "database_url": f"postgresql://gridshard:{password}@postgres:5432/gridshard",
        "auth_signing_key": secrets.token_hex(48),
    }
    for name, value in values.items():
        path = directory / name
        with path.open("x", encoding="utf-8") as handle:
            os.chmod(path, 0o600)
            handle.write(value + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        if chown is not None:
            # postgres entrypoint reads its password as root; API/maintenance
            # read their mounted files as the unprivileged 10001 identity.
            chown(path, 0 if name == "postgres_password" else 10001,
                  0 if name == "postgres_password" else 10001)


def main():
    parser = argparse.ArgumentParser(description="Linux sunucuda yeni, paket dışı GRIDSHARD sır dosyaları oluşturur.")
    parser.add_argument("--directory", type=Path, required=True)
    args = parser.parse_args()
    if sys.platform != "linux" or os.geteuid() != 0:
        print("Bu araç yalnız Linux sunucuda root olarak çalışır.", file=sys.stderr)
        return 2
    try:
        create_secrets(args.directory)
    except (OSError, ValueError):
        print("Sırlar oluşturulamadı. Yeni dış hedefi ve izinleri kontrol edin; kısmi dosyaların üzerine yazılmaz.", file=sys.stderr)
        return 2
    print("Üç yeni sır dosyası hazırlandı. İçerikleri konsola veya kaynak paketine eklemeyin.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
