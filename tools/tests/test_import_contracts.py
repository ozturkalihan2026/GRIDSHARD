import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("gridshard_import_contracts", ROOT / "tools/check_imports.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


def fixture(tmp_path, monkeypatch, source):
    server = tmp_path / "server"
    package = server / "app"
    package.mkdir(parents=True)
    (package / "__init__.py").write_text("", encoding="utf-8")
    (package / "target.py").write_text("EXISTING = 1\n", encoding="utf-8")
    caller = package / "caller.py"
    caller.write_text(source, encoding="utf-8")
    monkeypatch.setattr(checker, "ROOT", tmp_path)
    monkeypatch.setattr(checker, "SERVER", server)
    return caller


def test_normal_file_module_attributes_are_not_false_import_errors(tmp_path, monkeypatch):
    caller = fixture(tmp_path, monkeypatch, "from app import target\nname=target.__name__\nfile=target.__file__\n")
    assert checker.check_imports([caller])[1] == []


def test_missing_symbol_and_fake_dunder_are_still_reported(tmp_path, monkeypatch):
    caller = fixture(tmp_path, monkeypatch, "from app.target import MISSING\nfrom app import target\nx=target.__not_real__\n")
    problems = checker.check_imports([caller])[1]
    assert len(problems) == 2
    assert any("MISSING" in problem for problem in problems)
    assert any("__not_real__" in problem for problem in problems)


def test_rechecking_a_modified_module_does_not_use_stale_ast(tmp_path, monkeypatch):
    caller = fixture(tmp_path, monkeypatch, "from app.target import EXISTING\n")
    assert checker.check_imports([caller])[1] == []
    (tmp_path / "server/app/target.py").write_text("OTHER=1\n", encoding="utf-8")
    assert len(checker.check_imports([caller])[1]) == 1


def test_retired_balance_sources_are_preserved_outside_active_package():
    archive = ROOT / "docs/archive/retired-balance-tools-20261014"
    retired = ["server/app/balance_change_drafts.py", "server/app/balance_regression.py", "server/app/balance_simulation.py",
               "tools/beta23_balance_report.py", "tools/beta24_energy_port_report.py", "tools/beta32_fix_acceptance_report.py", "tools/beta37_ai_archetype_report.py"]
    for path in retired:
        assert not (ROOT / path).exists()
        assert (archive / Path(path).name).is_file()
    assert (archive / "README.md").is_file()
