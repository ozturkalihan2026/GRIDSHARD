"""Generate/check the complete role-authored SFX bank without touching music."""
import argparse
import json
from pathlib import Path
import struct
import subprocess
import wave

from combat_sfx_synth import RATE, module_sound, core

ROOT=Path(__file__).resolve().parents[1]
ALIASES={
    'laser_pulse_v2':('laser',.24), 'pulse_cannon_fire':('pulse_cannon',.27),
    'rocket_launch':('missile_launcher',.34), 'shield_absorb':('shield',.30),
    'repair_beam':('repair',.42), 'emp':('emp',.28),
}
ROLES=('resonance','guardian','overdrive','disruptor','capacitor','phoenix','quantum')


def bank():
    profiles=json.loads(subprocess.check_output(['node','-e',
        "console.log(JSON.stringify(require('./client/src/battle/module-presentation-profiles.js')))"] ,cwd=ROOT,text=True))
    for identity,profile in profiles.items():
        yield 'modules/'+identity,module_sound(identity,profile['seconds'])
    for identity,(role,seconds) in ALIASES.items():
        yield identity,module_sound(role,seconds)
    for index,role in enumerate(ROLES):
        for kind in ('activate','shot'):
            yield f'core_{role}_{kind}',core(index,kind=='activate')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    count=0
    for identity,samples in bank():
        path=ROOT/'client/assets/audio'/f'{identity}.wav'
        frames=b''.join(struct.pack('<h',round(value*32767)) for value in samples)
        if args.check:
            with wave.open(str(path),'rb') as source:
                if ((source.getnchannels(),source.getsampwidth(),source.getframerate())!=(1,2,RATE)
                        or source.readframes(source.getnframes())!=frames):
                    raise ValueError('Stale themed source: '+identity)
        else:
            path.parent.mkdir(parents=True,exist_ok=True)
            with wave.open(str(path),'wb') as output:
                output.setnchannels(1);output.setsampwidth(2);output.setframerate(RATE)
                output.writeframes(frames)
        count+=1
    print(json.dumps(dict(theme='circuit-forge-v21',sources=count,checked=args.check,music_changed=False)))


if __name__=='__main__':
    main()
