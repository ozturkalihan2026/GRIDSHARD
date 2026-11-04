"""Keep the active pulse master reproducible through its shipping generator."""
import importlib.util
from pathlib import Path
import struct
import wave


def test_pulse_generator_reproduces_the_committed_master(monkeypatch):
    root = Path(__file__).resolve().parents[2]
    monkeypatch.syspath_prepend(str(root / 'tools'))
    spec = importlib.util.spec_from_file_location('battle_sfx_v15', root / 'tools/generate_battle_sfx_v15.py')
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)
    expected = b''.join(struct.pack('<h', value) for value in generator.render('pulse_cannon_fire', .27))
    with wave.open(str(root / 'client/assets/audio/pulse_cannon_fire.wav'), 'rb') as reader:
        assert reader.getframerate() == generator.RATE
        assert reader.getsampwidth() == 2
        assert reader.getnchannels() == 1
        assert reader.readframes(reader.getnframes()) == expected
