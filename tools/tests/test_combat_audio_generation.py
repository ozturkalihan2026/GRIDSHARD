"""Keep the active pulse master reproducible through its shipping generator."""
import importlib.util
from pathlib import Path
import struct
import wave
import array
import math
import pytest


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


@pytest.mark.parametrize('identity', [
    'modules/'+name for name in ('pulse_cannon','railgun','drone_bay','arc_cannon',
        'plasma_mortar','quantum_repeater','burst_cannon','shield_breaker')
] + ['core_'+role+'_'+kind for role in ('resonance','guardian','overdrive','disruptor',
    'capacitor','phoenix','quantum') for kind in ('activate','shot')])
def test_combat_signatures_retain_phone_band_energy_without_louder_master(identity):
    """The former bass-only cues could pass decode/peak tests but be inaudible.

    A repeatable high-pass proxy measures retained midrange, not an SPL or
    physical listening verdict. RMS/peak and click boundaries stay bounded.
    """
    root=Path(__file__).resolve().parents[2]
    with wave.open(str(root/'client/assets/audio'/f'{identity}.wav'),'rb') as reader:
        rate=reader.getframerate()
        samples=[v/32768 for v in array.array('h',reader.readframes(reader.getnframes()))]
    energy=sum(v*v for v in samples)
    filtered=samples[:]
    coefficient=math.exp(-2*math.pi*600/rate)
    for _ in range(3):
        output=[]
        previous_input=previous_output=0
        for value in filtered:
            previous_output=coefficient*(previous_output+value-previous_input)
            previous_input=value
            output.append(previous_output)
        filtered=output
    assert math.sqrt(sum(v*v for v in filtered)/energy) >= .20
    assert .075 <= math.sqrt(energy/len(samples)) <= .14
    assert max(map(abs,samples)) <= .381
    assert max(abs(b-a) for a,b in zip(samples,samples[1:])) < .09
    assert samples[0] == samples[-1] == 0


def test_hero_activations_have_space_and_energy_above_routine_module_events(monkeypatch):
    root=Path(__file__).resolve().parents[2]
    monkeypatch.syspath_prepend(str(root/'tools'))
    from generate_combat_theme import bank
    sounds=dict(bank())
    module_energy=max(sum(x*x for x in samples)/22050*.65**2
                      for identity,samples in sounds.items() if identity.startswith('modules/'))
    for identity,samples in sounds.items():
        if identity.startswith('core_') and identity.endswith('_activate'):
            assert .85 <= len(samples)/22050 <= 1.1
            assert sum(x*x for x in samples)/22050*(.78*1.4)**2 > module_energy*4


def test_new_modules_need_an_authored_sound_instead_of_a_generic_fallback(monkeypatch):
    root=Path(__file__).resolve().parents[2]
    monkeypatch.syspath_prepend(str(root/'tools'))
    from combat_sfx_synth import module_sound
    with pytest.raises(ValueError,match='Author the new module sound'):
        module_sound('not_yet_authored',.25)
