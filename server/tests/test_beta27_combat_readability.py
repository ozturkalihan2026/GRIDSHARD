import hashlib
import math
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
AUDIO_DIR = ROOT / "client" / "assets" / "audio"
WEAPON_FILES = (
    "laser_fire.wav",
    "pulse_cannon_fire.wav",
    "railgun_fire.wav",
    "missile_fire.wav",
    "drone_fire.wav",
    "arc_cannon_fire.wav",
)


def test_server_power_truth_reaches_both_player_and_enemy_cards():
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    relay = (ROOT / "client" / "src" / "relay-client.js").read_text(
        encoding="utf-8"
    )
    css = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")

    assert "serverModule.energy_received" in relay
    assert "serverModule.energy_required" in relay
    assert "module.energy_received" in app
    assert "module.energy_required" in app
    assert "appendEnergyFlowIndicator" in app
    assert '"energy-flow-indicator"' in app
    assert '"energy-flow-badge"' in app
    assert "received.toFixed(1)" in app
    assert "@keyframes gs-energy-current" in css
    assert '.module-card.energy-disconnected::after' in css


def test_every_attack_travels_to_exact_target_and_emits_impact_feedback():
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    css = (ROOT / "client" / "src" / "styles.css").read_text(encoding="utf-8")

    for weapon in (
        "laser",
        "pulse_cannon",
        "railgun",
        "missile_launcher",
        "drone_bay",
        "arc_cannon",
    ):
        assert weapon in app
    assert "const x2=" in app
    assert "const y2=" in app
    assert "emitDuelImpactEffect" in app
    assert "impact.dataset.targetModuleId" in app
    assert "presentation.travelMs" in app
    assert 'impact.style.left=`${x}px`' in app
    assert 'impact.style.top=`${y}px`' in app
    assert "duel-shot-projectile" in app
    assert "duel-hit-impact" in app
    assert "@keyframes gs-projectile-travel" in css
    assert "@keyframes gs-hit-flash" in css
    assert "@keyframes gs-hit-ring" in css
    assert "@keyframes gs-hit-spark" in css


def test_six_weapon_cues_are_original_distinct_and_mix_safe():
    audio = (ROOT / "client" / "src" / "gridshard-audio.js").read_text(
        encoding="utf-8"
    )
    app = (ROOT / "client" / "src" / "app.js").read_text(encoding="utf-8")
    hashes = set()

    for filename in WEAPON_FILES:
        path = AUDIO_DIR / filename
        assert path.exists()
        assert filename in audio
        hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())

        with wave.open(str(path), "rb") as reader:
            assert reader.getnchannels() == 1
            assert reader.getframerate() == 44_100
            duration = reader.getnframes() / reader.getframerate()
            raw = reader.readframes(reader.getnframes())

        assert 0.45 <= duration <= 0.85
        values = struct.unpack("<" + "h" * (len(raw) // 2), raw)
        peak = max(abs(value) for value in values)
        peak_dbfs = 20 * math.log10(peak / 32_767)
        assert -3.2 <= peak_dbfs <= -2.8

    assert len(hashes) == len(WEAPON_FILES)
    for cue in (
        "laser_fire",
        "pulse_cannon_fire",
        "railgun_fire",
        "missile_fire",
        "drone_fire",
        "arc_cannon_fire",
    ):
        assert cue in audio
        assert cue in app


def test_beta27_generator_is_reproducible_and_launcher_repairs_partial_venv():
    generator = (ROOT / "tools" / "generate_beta27_combat_audio.py").read_text(
        encoding="utf-8"
    )
    launcher = (ROOT / "BASLAT_WEB_TEST.bat").read_text(encoding="utf-8")

    assert "deterministic_noise" in generator
    assert "TARGET_PEAK = 10 ** (-3 / 20)" in generator
    assert 'if exist ".venv\\pyvenv.cfg"' in launcher
