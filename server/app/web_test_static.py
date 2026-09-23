import hashlib
import json
from pathlib import Path
import re

from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse


IMMUTABLE_BUNDLE = re.compile(r"bundles/gridshard-([0-9a-f]{16})\.(js|css)\Z")


def client_directory(project_root: Path, *, production: bool, override: str = "") -> Path:
    if override.strip():
        configured = Path(override.strip())
        return (project_root / configured).resolve()
    return project_root / ("dist" if production else "client")


class NoCacheStaticFiles(StaticFiles):
    def file_response(self, full_path, stat_result, scope, status_code=200):
        response=FileResponse(
            full_path,
            status_code=status_code,
            stat_result=stat_result,
        )
        response.headers["Cache-Control"]="no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"]="no-cache"
        response.headers["Expires"]="0"
        response.headers["X-GRIDSHARD-Cache"]="disabled"
        return response


class ProductionStaticFiles(StaticFiles):
    """Only verified content-addressed bundles may be cached immutably."""

    def __init__(self, *, directory: str, html: bool = True):
        root = Path(directory).resolve()
        try:
            manifest = json.loads((root / "client-build-manifest.json").read_text(encoding="utf-8"))
            if (
                manifest.get("schema_version") != 1
                or manifest.get("project") != "GRIDSHARD"
                or manifest.get("platform") != "web"
            ):
                raise ValueError("Web derleme manifesti geçersiz.")
            bundles = manifest["immutable"]
            if not isinstance(bundles, dict) or len(bundles) != 2:
                raise ValueError("JS ve CSS derleme çıktıları eksik.")
            immutable_paths: set[Path] = set()
            extensions: set[str] = set()
            for relative, metadata in bundles.items():
                match = IMMUTABLE_BUNDLE.fullmatch(relative)
                if not match:
                    raise ValueError("İçerik özetli dosya adı bekleniyor.")
                file = (root / relative).resolve()
                if not file.is_relative_to(root):
                    raise ValueError("Derleme çıktısı istemci dizini dışında.")
                content = file.read_bytes()
                checksum = hashlib.sha256(content).hexdigest()
                if (
                    checksum != metadata["sha256"]
                    or checksum[:16] != match.group(1)
                    or len(content) != metadata["bytes"]
                ):
                    raise ValueError("Derleme dosyası içerik özeti eşleşmiyor.")
                extensions.add(match.group(2))
                immutable_paths.add(file)
            if extensions != {"js", "css"}:
                raise ValueError("JS ve CSS derleme çıktıları birlikte gerekli.")
            for name in ("index.html", "runtime-config.js"):
                if not (root / name).is_file():
                    raise ValueError(f"Eksik istemci dosyası: {name}")
        except (OSError, ValueError, KeyError, TypeError, AttributeError) as exc:
            raise RuntimeError(
                "Üretim istemci paketi hazır değil. Önce 'pnpm build:web' çalıştırın "
                "ve GRIDSHARD_CLIENT_DIR ile web dist dizinini seçin."
            ) from exc
        self.immutable_paths = frozenset(immutable_paths)
        super().__init__(directory=str(root), html=html)

    def file_response(self, full_path, stat_result, scope, status_code=200):
        response = super().file_response(full_path, stat_result, scope, status_code)
        file = Path(full_path).resolve()
        if file in self.immutable_paths:
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            response.headers["X-GRIDSHARD-Cache"] = "content-hash"
        elif file.name in {"index.html", "runtime-config.js", "client-build-manifest.json"}:
            response.headers["Cache-Control"] = "no-store"
            response.headers["X-GRIDSHARD-Cache"] = "release-config"
        else:
            # Stable audio/icon filenames must be revalidated after a release.
            response.headers["Cache-Control"] = "no-cache"
            response.headers["X-GRIDSHARD-Cache"] = "revalidate"
        return response
