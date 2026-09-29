"""Statik modüller arası içe aktarma denetimi (kod çalıştırılmaz).

pyflakes her dosyayı tek başına denetler; bir modülden kaldırılan ama başka
modülün oradan aldığı ad (Beta.72 tur 10: `trophy_delta`) sunucu açılışında
ImportError verir. Bu araç o sınıf hatayı çalıştırmadan yakalar.

server/app, server/tests, server/json_migrations ve tools altındaki her
`from <modül> import <ad>` için adın hedef modülün üst düzeyinde tanımlı
olduğunu denetler. Testlerde modül takma adıyla yapılan öznitelik erişimleri
(`gateway.x`, `monkeypatch.setattr(gateway, "x", ...)`) de denetlenir.
"""
import ast
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server"
SEARCH_ROOTS = [SERVER / "app", SERVER / "tests", SERVER / "json_migrations", ROOT / "tools"]

_cache = {}


def module_file(modname):
    parts = modname.split(".")
    base = SERVER.joinpath(*parts)
    if base.with_suffix(".py").exists():
        return base.with_suffix(".py")
    if (base / "__init__.py").exists():
        return base / "__init__.py"
    return None


def add_targets(target, names):
    if isinstance(target, ast.Name):
        names.add(target.id)
    elif isinstance(target, (ast.Tuple, ast.List)):
        for item in target.elts:
            add_targets(item, names)


def collect(node, names, stars):
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        names.add(node.name)
    elif isinstance(node, ast.Assign):
        for target in node.targets:
            add_targets(target, names)
    elif isinstance(node, (ast.AnnAssign, ast.AugAssign)):
        add_targets(node.target, names)
    elif isinstance(node, ast.Import):
        for alias in node.names:
            names.add((alias.asname or alias.name).split(".")[0])
    elif isinstance(node, ast.ImportFrom):
        for alias in node.names:
            if alias.name == "*":
                stars.append(node)
            else:
                names.add(alias.asname or alias.name)
    elif isinstance(node, (ast.If, ast.Try, ast.With, ast.For, ast.While)):
        for field in ("body", "orelse", "finalbody"):
            for child in getattr(node, field, []) or []:
                collect(child, names, stars)
        for handler in getattr(node, "handlers", []) or []:
            for child in handler.body:
                collect(child, names, stars)


def top_level(path):
    if path in _cache:
        return _cache[path]
    tree = ast.parse(path.read_text(encoding="utf-8"))
    names, stars = set(), []
    for node in tree.body:
        collect(node, names, stars)
    _cache[path] = (names, stars)
    return names, stars


def package_of(path):
    rel = path.relative_to(SERVER).with_suffix("")
    parts = list(rel.parts)
    if parts[-1] == "__init__":
        parts = parts[:-1]
    else:
        parts = parts[:-1]
    return ".".join(parts)


def resolve(path, node):
    if node.level:
        package = package_of(path).split(".")
        if node.level > 1:
            package = package[: len(package) - (node.level - 1)]
        base = ".".join(package)
        return f"{base}.{node.module}" if node.module else base
    return node.module


problems = []
files = [p for root in SEARCH_ROOTS if root.exists() for p in root.rglob("*.py") if "__pycache__" not in p.parts]
for path in files:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except SyntaxError as exc:
        problems.append(f"{path}: sözdizimi {exc}")
        continue
    aliases = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            modname = resolve(path, node) if (node.level or (node.module or "").startswith("app")) else None
            if not modname or not modname.startswith("app"):
                continue
            target = module_file(modname)
            if target is None:
                problems.append(f"{path.relative_to(ROOT)}:{node.lineno}: modül yok: {modname}")
                continue
            names, stars = top_level(target)
            for alias in node.names:
                if alias.name == "*":
                    continue
                if alias.name in names or module_file(f"{modname}.{alias.name}") is not None:
                    if module_file(f"{modname}.{alias.name}") is not None:
                        aliases[alias.asname or alias.name] = f"{modname}.{alias.name}"
                    continue
                problems.append(
                    f"{path.relative_to(ROOT)}:{node.lineno}: '{alias.name}' {modname} içinde tanımlı değil"
                )
        elif isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.startswith("app") and alias.asname:
                    aliases[alias.asname] = alias.name
    # Modül takma adıyla öznitelik erişimi (ör. gateway.telemetry_service).
    for node in ast.walk(tree):
        if isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name) and node.value.id in aliases:
            modname = aliases[node.value.id]
            target = module_file(modname)
            if target is None:
                continue
            names, _stars = top_level(target)
            if node.attr not in names and module_file(f"{modname}.{node.attr}") is None:
                problems.append(
                    f"{path.relative_to(ROOT)}:{node.lineno}: {node.value.id}.{node.attr} ({modname}) tanımlı değil"
                )
    source = path.read_text(encoding="utf-8")
    for match in re.finditer(r'monkeypatch\.setattr\(\s*([A-Za-z_]\w*)\s*,\s*"([A-Za-z_]\w*)"', source):
        alias, attr = match.groups()
        if alias not in aliases:
            continue
        target = module_file(aliases[alias])
        names, _stars = top_level(target)
        if attr not in names:
            line = source[: match.start()].count("\n") + 1
            problems.append(f"{path.relative_to(ROOT)}:{line}: monkeypatch {alias}.{attr} tanımlı değil")

for item in sorted(set(problems)):
    print(item)
print(f"{len(files)} dosya, {len(set(problems))} sorun")
sys.exit(1 if problems else 0)

