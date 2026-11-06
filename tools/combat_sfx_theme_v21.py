"""Original circuit-forge audio: weapons discharge, protection absorbs/locks,
utility restores/routes. Cores share a D/A charge, heroic release and tail.
No external samples, hard clipping, gameplay timing or music changes.
"""
import math
import random

RATE = 22050
TAU = 2 * math.pi
ATTACKS = {'laser', 'pulse_cannon', 'railgun', 'missile_launcher', 'drone_bay',
           'arc_cannon', 'plasma_mortar', 'quantum_repeater', 'burst_cannon', 'shield_breaker'}
UTILITIES = {'shield','armor','barrier','reflector','guardian_dome','phase_armor',
             'buffer_shield','last_bastion','repair','amplifier','emp','virus','cleanser','speed_relay'}


def finish(values, *, rms=.105, peak=.38):
    alpha = 1 - math.exp(-TAU * 2800 / RATE)
    smoothed, previous = [], 0
    for value in values:
        previous += alpha * (value - previous)
        smoothed.append(previous)
    power = math.sqrt(sum(v*v for v in smoothed)/len(smoothed)) or 1
    # Soft transformer-like crest control keeps the body audible without
    # flattening peaks against a hard limiter or increasing the master target.
    smoothed = [math.tanh(value/(power*1.2)) for value in smoothed]
    mean = sum(smoothed) / len(smoothed)
    fade = min(round(RATE * .010), len(smoothed) // 4)
    values = [(v - mean) * (.5 - .5 * math.cos(math.pi * min(1, i / fade)))
              * (.5 - .5 * math.cos(math.pi * min(1, (len(smoothed)-1-i) / fade)))
              for i, v in enumerate(smoothed)]
    power = math.sqrt(sum(v*v for v in values)/len(values)) or 1
    scale = min(rms/power,peak/(max(map(abs,values)) or 1))
    # A soft slew stage rounds granular transients, not waveform amplitude.
    # This bounds adjacent-sample steps without hard clipping the waveform.
    output, previous = [], 0
    for i,value in enumerate(values):
        previous += .084*math.tanh((value*scale-previous)/.084)
        fade_out = .5-.5*math.cos(math.pi*min(1,(len(values)-1-i)/fade))
        output.append(previous*fade_out)
    window = [(.5-.5*math.cos(math.pi*min(1,i/fade)))
              *(.5-.5*math.cos(math.pi*min(1,(len(output)-1-i)/fade))) for i in range(len(output))]
    dc = sum(output)/sum(window)
    return [value-dc*weight for value,weight in zip(output,window)]


def pulse(t, start, length, attack=.006, decay=3):
    u = t - start
    if not 0 <= u < length:
        return 0
    rise = .5 - .5 * math.cos(math.pi * min(1, u / attack))
    tail = .5 - .5 * math.cos(math.pi * min(1, (length-u) / min(.05, length*.3)))
    return rise * tail * math.exp(-decay * u / length)


def sweep(t, start, length, low, high, *, harmonic=.12):
    u = max(0, t-start)
    phase = TAU * (low*u + (high-low)*u*u/(2*length))
    return math.sin(phase) + harmonic*math.sin(phase*2)


def grain(identity, count):
    seed = sum((i+1)*ord(c) for i,c in enumerate(identity))
    rng = random.Random(250000+seed)
    low = mid = 0
    result = []
    for _ in range(count):
        noise = rng.uniform(-1, 1)
        low += .08*(noise-low)
        mid += .38*(noise-mid)
        result.append((low, mid-low))
    return result


def attack(identity, seconds):
    texture = grain(identity, round(RATE*seconds))
    values = []
    for i,(low,air) in enumerate(texture):
        t = i/RATE
        if identity == 'laser':
            value = (.70*sweep(t,0,seconds,860,460)+.20*sweep(t,0,seconds,530,320)) * pulse(t,0,seconds,.012,2.7)
        elif identity == 'pulse_cannon':
            value = .22*sweep(t,0,.06,380,820)*pulse(t,0,.075,.014,1)
            value += (1.1*sweep(t,.045,.18,210,95)+.65*sweep(t,.045,.17,1100,680)+.45*air)*pulse(t,.045,seconds-.045,.005,3)
        elif identity == 'railgun':
            value = .35*sweep(t,0,.035,260,1300)*pulse(t,0,.045,.010,.3)
            value += (.65*sweep(t,.032,.1,1450,700)+.8*air+.4*sweep(t,.032,.15,240,100))*pulse(t,.032,seconds-.032,.003,4)
        elif identity == 'missile_launcher':
            value = (.9*air+.5*low+.24*sweep(t,0,seconds,160,85)+.22*sweep(t,0,seconds,950,580))*pulse(t,0,seconds,.014,1.3)
        elif identity == 'drone_bay':
            value = sum((.40*sweep(t,s,.065,930+j*110,680+j*80)+.30*air)*pulse(t,s,.075,.006,3)
                        for j,s in enumerate((.015,.115,.225)))
        elif identity == 'arc_cannon':
            value = sum((.58*air+.42*sweep(t,s,.07,1180+j*180,520))*pulse(t,s,.075,.004,3)
                        for j,s in enumerate((.012,.058,.118)))
            value += .32*sweep(t,0,seconds,310,160)*pulse(t,0,seconds,.010,3)
        elif identity == 'plasma_mortar':
            value = .22*sweep(t,0,.07,360,680)*pulse(t,0,.095,.025,.6)
            value += (1.15*sweep(t,.070,.25,185,78)+.65*sweep(t,.070,.25,1000,700)+.52*air)*pulse(t,.070,seconds-.070,.010,2.6)
        elif identity == 'quantum_repeater':
            value = sum((.62*sweep(t,s,.075,1120-j*160,640+j*100)+.22*sweep(t,s,.08,510,350))*pulse(t,s,.085,.008,2.8)
                        for j,s in enumerate((.018,.115)))
        elif identity == 'burst_cannon':
            value = sum((.60*sweep(t,s,.04,300-j*20,160)+.48*air+.28*sweep(t,s,.035,1280,800))*pulse(t,s,.045,.003,3)
                        for j,s in enumerate((.004,.047,.090)))
        else:
            value = (.8*sweep(t,0,seconds,310,125)+.46*sweep(t,0,seconds,1230,790)+.25*air)*pulse(t,0,seconds,.006,3)
            value += .15*math.sin(TAU*1790*t)*pulse(t,.025,.08,.004,4)
        values.append(value)
    return finish(values, rms=.100 if identity in {'laser','drone_bay','quantum_repeater'} else .105,
                  peak=.26 if identity == 'laser' else .38)


def utility(identity, seconds):
    texture = grain(identity, round(RATE*seconds))
    values = []
    for i,(low,air) in enumerate(texture):
        t=i/RATE
        if identity in {'shield','guardian_dome','buffer_shield'}:
            start=.025 if identity=='buffer_shield' else 0
            value=(.65*sweep(t,start,seconds,510,240)+.38*sweep(t,start,seconds,1060,610)+.32*air)*pulse(t,start,seconds-start,.025,2)
            if identity=='guardian_dome':value += .45*sweep(t,0,seconds,180,135)*pulse(t,0,seconds,.035,1.2)
            if identity=='buffer_shield':value += .22*sweep(t,0,.07,550,950)*pulse(t,0,.08,.012,1)
        elif identity in {'armor','barrier','last_bastion'}:
            starts=(.006,.045) if identity!='armor' else (.006,)
            value=sum((.8*sweep(t,s,.10,190,95)+.4*sweep(t,s,.10,780,420)+.40*air)*pulse(t,s,min(.13,seconds-s),.004,3.8) for s in starts)
        elif identity == 'reflector':
            value=.5*sweep(t,0,seconds*.6,450,1150)*pulse(t,0,seconds*.7,.025,.3)
            value += (.55*sweep(t,seconds*.45,seconds*.5,1180,620)+.30*air)*pulse(t,seconds*.45,seconds*.55,.006,3)
        elif identity == 'phase_armor':
            value=(.48*sweep(t,0,seconds,1050,360)+.20*air)*pulse(t,0,seconds,.040,1.2)
        elif identity == 'repair':
            value=(.52*sweep(t,0,seconds,440,590)+.24*sweep(t,0,seconds,880,1180)+.10*air)*pulse(t,0,seconds,.030,.9)
        elif identity == 'amplifier':
            value=(.45*sweep(t,0,seconds,320,520)+.25*sweep(t,0,seconds,960,1040))*pulse(t,0,seconds,.025,1.5)
        elif identity == 'emp':
            value=(.42*air+.60*sweep(t,0,seconds,1050,160)+.3*sweep(t,0,seconds,250,70))*pulse(t,0,seconds,.008,2.6)
        elif identity == 'virus':
            value=sum((.4*sweep(t,s,.045,f,f*.72)+.12*air)*pulse(t,s,.055,.005,2.8)
                      for s,f in ((.01,780),(.065,1150),(.15,630),(.225,960)))
        elif identity == 'cleanser':
            value=(.30*air+.45*sweep(t,0,seconds,650,1100)+.18*sweep(t,0,seconds,980,1450))*pulse(t,0,seconds,.025,1.2)
        else:
            value=sum((.24*air+.36*sweep(t,s,.065,570,920))*pulse(t,s,.07,.008,2)
                      for s in (.012,.105,.17))
        values.append(value)
    support = identity in {'repair','amplifier','cleanser','speed_relay'}
    return finish(values, rms=.065 if support else .085, peak=.22 if support else .30)


def module_sound(identity, seconds):
    if identity not in ATTACKS | UTILITIES:
        raise ValueError('Author the new module sound before generating it: '+identity)
    return attack(identity,seconds) if identity in ATTACKS else utility(identity,seconds)


def core(index, activation):
    duration=(1.05,.95,.90,1.00,1.05,1.08,1.00)[index] if activation else (.30,.24,.23,.28,.27,.32,.30)[index]
    texture=grain('hero-core-'+str(index),round(RATE*duration))
    values=[]
    for i,(low,air) in enumerate(texture):
        t=i/RATE
        release=.16 if activation else .012
        charge=(.26*sweep(t,0,.18,146.83,293.66)+.18*sweep(t,0,.18,440,880))*pulse(t,0,.21,.035,.4) if activation else 0
        body=(.62*math.sin(TAU*146.83*max(0,t-release))+.40*math.sin(TAU*220*max(0,t-release))
              +.42*sweep(t,release,.18,1020,680)+.55*air)*pulse(t,release,duration-release,.007,3.2)
        tail=(.25*math.sin(TAU*587.33*t)+.28*math.sin(TAU*880*t)+.30*math.sin(TAU*1174.66*t))*pulse(t,release+.035,max(.08,duration-release-.035),.025,2.2)
        value=charge+body+tail
        if index==0:
            value += sum(.35*sweep(t,s,.16,760,510)*pulse(t,s,min(.22,duration-s),.008,3)
                         for s in ((.24,.38) if activation else (.065,.14)))
        elif index==1:
            value += sum((.46*sweep(t,s,.12,210,105)+.28*air)*pulse(t,s,min(.17,duration-s),.004,4)
                         for s in ((.18,.26) if activation else (.025,)))
        elif index==2:
            value += (.55*air+.30*sweep(t,release,duration-release,390,210))*(.7+.3*math.sin(TAU*13*t)**2)*pulse(t,release,duration-release,.015,2)
        elif index==3:
            value += .44*sweep(t,release,duration-release,1174.66,293.66)*pulse(t,release,duration-release,.012,2.1)
        elif index==4:
            value += .45*sweep(t,0,duration,440,1174.66)*pulse(t,.025,duration-.025,.08,.7)
            value += .45*sweep(t,release,.13,230,110)*pulse(t,release,min(.16,duration-release),.005,3)
        elif index==5:
            value += .40*sweep(t,release,duration-release,440,880)*pulse(t,release,duration-release,.04,1.7)
        else:
            value += .36*sweep(t,0,duration,1320,440)*pulse(t,0,duration,.045,1.3)
            value += .18*math.sin(TAU*1568*t)*pulse(t,release,min(.19,duration-release),.009,3)
        values.append(value)
    return finish(values,rms=.13 if activation else .100,peak=.38)
