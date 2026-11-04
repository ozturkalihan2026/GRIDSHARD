"""Original deterministic core sounds; no normal weapon/music sample is reused."""
from pathlib import Path
import struct,wave
from combat_sfx_synth import RATE, core

ROOT=Path(__file__).resolve().parents[1]
ROLES=('resonance','guardian','overdrive','disruptor','capacitor','phoenix','quantum')

def render(index,activation):
    return core(index, activation)

if __name__=='__main__':
    out=ROOT/'client/assets/audio'
    for index,role in enumerate(ROLES):
        for kind in ('activate','shot'):
            samples=render(index,kind=='activate')
            with wave.open(str(out/f'core_{role}_{kind}.wav'),'wb') as w:
                w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE)
                w.writeframes(b''.join(struct.pack('<h',round(v*32767)) for v in samples))
    print('14 original core WAVs generated, mono 22050 Hz, bounded peaks.')
