import hashlib
import json

import pytest
from starlette.applications import Starlette
from starlette.routing import Mount
from starlette.testclient import TestClient

from app.web_test_static import NoCacheStaticFiles, ProductionStaticFiles, client_directory


def release(tmp_path):
    (tmp_path / "bundles").mkdir()
    immutable = {}
    for extension, content in (("js", b"window.ready=true;"), ("css", b"body{color:red}")):
        checksum = hashlib.sha256(content).hexdigest()
        name = f"bundles/gridshard-{checksum[:16]}.{extension}"
        (tmp_path / name).write_bytes(content)
        immutable[name] = {"sha256": checksum, "bytes": len(content)}
    manifest = {"schema_version": 1, "project": "GRIDSHARD", "platform": "web", "immutable": immutable}
    (tmp_path / "client-build-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    (tmp_path / "index.html").write_text("<!doctype html><title>GRIDSHARD</title>", encoding="utf-8")
    (tmp_path / "runtime-config.js").write_text('globalThis.GRIDSHARD_API_BASE_URL="";', encoding="utf-8")
    (tmp_path / "icon.svg").write_text("<svg/>", encoding="utf-8")
    return manifest


def test_only_verified_bundles_are_immutable_with_conditional_get(tmp_path):
    manifest = release(tmp_path)
    static = ProductionStaticFiles(directory=str(tmp_path))
    with TestClient(Starlette(routes=[Mount("/", app=static)])) as client:
        for name in manifest["immutable"]:
            response = client.get(f"/{name}")
            assert response.status_code == 200
            assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
            cached = client.get(f"/{name}", headers={"If-None-Match": response.headers["etag"]})
            assert cached.status_code == 304
            assert "immutable" in cached.headers["cache-control"]
        for name in ("", "index.html", "runtime-config.js", "client-build-manifest.json"):
            assert client.get(f"/{name}").headers["cache-control"] == "no-store"
        assert client.get("/icon.svg").headers["cache-control"] == "no-cache"
        assert client.get("/src/app.js").status_code == 404


@pytest.mark.parametrize("problem", ["missing", "tampered", "mobile", "traversal"])
def test_unbuilt_or_inconsistent_release_cannot_start(tmp_path, problem):
    manifest = release(tmp_path)
    manifest_file = tmp_path / "client-build-manifest.json"
    if problem == "missing":
        manifest_file.unlink()
    elif problem == "tampered":
        (tmp_path / next(iter(manifest["immutable"]))).write_text("modified", encoding="utf-8")
    else:
        if problem == "mobile":
            manifest["platform"] = "mobile"
        else:
            metadata = manifest["immutable"].pop(next(iter(manifest["immutable"])))
            manifest["immutable"]["../private.js"] = metadata
        manifest_file.write_text(json.dumps(manifest), encoding="utf-8")
    with pytest.raises(RuntimeError, match="pnpm build:web"):
        ProductionStaticFiles(directory=str(tmp_path))


def test_development_source_directory_keeps_no_store(tmp_path):
    (tmp_path / "index.html").write_text("development", encoding="utf-8")
    with TestClient(Starlette(routes=[Mount("/", app=NoCacheStaticFiles(directory=str(tmp_path), html=True))])) as client:
        assert "no-store" in client.get("/").headers["cache-control"]
    assert client_directory(tmp_path, production=False) == tmp_path / "client"
    assert client_directory(tmp_path, production=True) == tmp_path / "dist"
    assert client_directory(tmp_path, production=True, override="release") == (tmp_path / "release").resolve()
