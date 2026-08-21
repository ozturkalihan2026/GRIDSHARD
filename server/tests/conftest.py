import os
from pathlib import Path
import tempfile


# Historical gateway tests exercise service behavior directly. Authentication
# has dedicated tests that enable the production-default gate explicitly.
os.environ.setdefault("GRIDSHARD_AUTH_REQUIRED", "0")
os.environ.setdefault("GRIDSHARD_RATE_LIMIT_REQUIRED", "0")

# TestClient ve çalışan yerel geliştirme sunucusu aynı JSON dosyasını açmasın.
# Her pytest süreci kendine ait geçici kalıcılık alanı kullanır.
TEST_DATA_DIR = Path(tempfile.gettempdir()) / f"gridshard-pytest-{os.getpid()}"
os.environ.setdefault("RELAY_PLAYER_DATA_PATH", str(TEST_DATA_DIR / "players.json"))
os.environ.setdefault("RELAY_TELEMETRY_PATH", str(TEST_DATA_DIR / "telemetry.json"))
os.environ.setdefault("RELAY_BATTLE_POOL_PRESET_PATH", str(TEST_DATA_DIR / "presets.json"))
os.environ.setdefault("RELAY_BALANCE_CHANGE_DRAFT_PATH", str(TEST_DATA_DIR / "balance-drafts.json"))
os.environ.setdefault("GRIDSHARD_AUTH_IDENTITY_PATH", str(TEST_DATA_DIR / "identities.json"))
os.environ.setdefault("GRIDSHARD_AUTH_KEY_PATH", str(TEST_DATA_DIR / "auth-signing-key"))
