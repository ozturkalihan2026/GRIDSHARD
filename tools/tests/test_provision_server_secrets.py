import tempfile
from pathlib import Path
import unittest
from tools.provision_server_secrets import ROOT, create_secrets


class SecretsTests(unittest.TestCase):
    def test_creates_matching_external_secrets_without_overwriting(self):
        with tempfile.TemporaryDirectory(prefix="gridshard-secret-fixture-") as temporary:
            target = Path(temporary) / "secrets"
            owners = []
            create_secrets(target, chown=lambda path, uid, gid: owners.append((path.name, uid, gid)))
            password = (target / "postgres_password").read_text().strip()
            self.assertEqual((target / "database_url").read_text().strip(),
                             f"postgresql://gridshard:{password}@postgres:5432/gridshard")
            self.assertEqual(len((target / "auth_signing_key").read_text().strip()), 96)
            self.assertEqual(owners, [("postgres_password", 0, 0), ("database_url", 10001, 10001), ("auth_signing_key", 10001, 10001)])
            with self.assertRaises(FileExistsError):
                create_secrets(target, chown=None)
            self.assertEqual((target / "postgres_password").read_text().strip(), password)

    def test_rejects_source_tree_and_relative_paths_before_writing(self):
        for path in (ROOT / "must-not-create-secrets", Path("secrets")):
            with self.assertRaises(ValueError):
                create_secrets(path, chown=None)
