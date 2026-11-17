"""Original candidate SFX in the existing circuit-forge mix; no sample copying."""
from hashlib import sha256
import json
import math
from pathlib import Path
import struct
import wave

from combat_sfx_theme_v21 import RATE, finish, grain, pulse, sweep

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'client/assets/audio/candidates-v1'


def synth(kind):
    seconds=.44 if kind=='shot' else .19
    texture=grain('recoil_cannon_'+kind,round(RATE*seconds));raw=[]
    for i,(low,air) in enumerate(texture):
        t=i/RATE
        if kind=='shot':
            # Broad audible body plus mid-band metal; never sub-bass alone.
            value=(.9*sweep(t,0,.23,205,78)+.48*sweep(t,0,.19,1250,580)+.42*air+.18*low)*pulse(t,0,.26,.005,2.8)
            # A distinct short piston return follows the single discharge.
            value+=(.40*sweep(t,.16,.11,620,210)+.32*air)*pulse(t,.16,.12,.007,3)
            value+=(.24*sweep(t,.30,.08,880,450)+.12*air)*pulse(t,.30,.09,.006,4)
        else:
            value=(.62*sweep(t,0,.16,760,260)+.30*sweep(t,0,.14,200,110)+.35*air)*pulse(t,0,seconds,.004,3.3)
        raw.append(value)
    return finish(raw,rms=.105 if kind=='shot' else .080,peak=.38 if kind=='shot' else .30)


def main():
    OUTPUT.mkdir(parents=True,exist_ok=True);rows=[]
    for kind in ('shot','hit'):
        samples=synth(kind);name='recoil_cannon-'+kind+'.wav';target=OUTPUT/name
        with wave.open(str(target),'wb') as stream:
            stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(RATE)
            stream.writeframes(b''.join(struct.pack('<h',round(v*32767)) for v in samples))
        peak=max(map(abs,samples));rms=math.sqrt(sum(v*v for v in samples)/len(samples))
        assert .04<rms<.12 and peak<.4 and abs(sum(samples)/len(samples))<.0001
        rows.append(dict(file=name,rate=RATE,channels=1,seconds=round(len(samples)/RATE,3),
                         rms=round(rms,5),peak=round(peak,5),sha256=sha256(target.read_bytes()).hexdigest()))
    assert rows[0]['sha256']!=rows[1]['sha256']
    (OUTPUT/'recoil_cannon-audit.json').write_text(json.dumps(dict(candidate=True,original_synthesis=True,
        runtime_registered=False,cues=rows),indent=2)+'\n',encoding='utf-8')
    print(json.dumps(rows))


if __name__=='__main__':main()
