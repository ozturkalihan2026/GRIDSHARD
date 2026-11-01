"""Original deterministic core sounds; no normal weapon/music sample is reused."""
from pathlib import Path
import math,random,struct,wave

ROOT=Path(__file__).resolve().parents[1]
RATE=22050
ROLES=('resonance','guardian','overdrive','disruptor','capacitor','phoenix','quantum')
FREQUENCIES=(174,116,146,233,261,196,138)

def render(index,activation):
    duration=(1.15,.95,1.05,1.2,1.1,1.25,1.2)[index] if activation else (.52,.32,.36,.48,.4,.5,.54)[index]
    rng=random.Random(61031+index*17+int(activation));phase=filtered=0.;values=[]
    for i in range(round(RATE*duration)):
        t=i/RATE;p=t/duration
        envelope=min(1,t/.018)*min(1,(duration-t)/.075)*math.sin(math.pi*p)**.6
        base=FREQUENCIES[index]
        glide=(.7+1.4*p) if index in (0,4,5) else (1.9-1.15*p)
        phase+=2*math.pi*base*glide/RATE
        filtered+=(rng.uniform(-1,1)-filtered)*.12
        low=math.sin(phase*.5)*.14
        if index==0:body=math.sin(phase)*.22+math.sin(phase*1.5)*.12+math.sin(phase*2)*.05
        elif index==1:body=math.sin(phase)*.25+math.sin(phase*3)*math.exp(-p*6)*.13
        elif index==2:body=(math.sin(phase)*.13+filtered*.7)*(.65+.35*math.sin(2*math.pi*15*t))
        elif index==3:body=math.sin(phase+math.sin(phase*.25)*2)*.25+filtered*.16
        elif index==4:
            note=(1,1.25,1.5,2)[min(3,int(p*4))]
            body=math.sin(2*math.pi*base*note*t)*.22+math.sin(phase*2)*.07
        elif index==5:body=math.sin(phase)*.17+math.sin(phase*1.25)*.12+filtered*.3
        else:body=math.sin(phase+math.sin(phase*.501)*3)*.20+math.sin(phase*1.414)*.12
        values.append((body+low)*envelope*(1 if activation else .82))
    peak=max(abs(v) for v in values) or 1
    # Keep headroom for music/normal shots; the dedicated mix cue adds presence.
    values=[v*min(1,.52/peak) for v in values]
    return values

if __name__=='__main__':
    out=ROOT/'client/assets/audio'
    for index,role in enumerate(ROLES):
        for kind in ('activate','shot'):
            samples=render(index,kind=='activate')
            with wave.open(str(out/f'core_{role}_{kind}.wav'),'wb') as w:
                w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE)
                w.writeframes(b''.join(struct.pack('<h',round(v*32767)) for v in samples))
    print('14 original core WAVs generated, mono 22050 Hz, bounded peaks.')
