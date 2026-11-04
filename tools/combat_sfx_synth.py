"""Deterministic short game sounds: continuous phase, no hard clipping/noise bed."""
import math
import random

RATE = 22050
ATTACKS = {'pulse_cannon', 'railgun', 'drone_bay', 'arc_cannon', 'plasma_mortar',
           'quantum_repeater', 'burst_cannon', 'shield_breaker'}


def finish(values, *, rms=.105, peak=.38):
    mean = sum(values) / len(values)
    fade = min(round(RATE * .012), len(values) // 4)
    values = [(v - mean) * (0.5 - .5 * math.cos(math.pi * min(1, i / fade)))
              * (0.5 - .5 * math.cos(math.pi * min(1, (len(values) - 1 - i) / fade)))
              for i, v in enumerate(values)]
    power = math.sqrt(sum(v * v for v in values) / len(values)) or 1
    scale = min(rms / power, peak / (max(map(abs, values)) or 1))
    return [v * scale for v in values]


def attack(identity, seconds):
    seed = sum((i + 1) * ord(c) for i, c in enumerate(identity))
    rng = random.Random(240000 + seed)
    low = smooth = phase = 0.0
    frequencies = dict(pulse_cannon=175, railgun=510, drone_bay=345, arc_cannon=390,
                       plasma_mortar=160, quantum_repeater=490, burst_cannon=310, shield_breaker=270)
    values = []
    for i in range(round(RATE * seconds)):
        t = i / RATE
        p = t / seconds
        low += (rng.uniform(-1, 1) - low) * .09
        smooth += (low - smooth) * .14
        phase += 2 * math.pi * frequencies[identity] * (1.15 - .45 * p) / RATE
        body = math.sin(phase) + .18 * math.sin(2 * phase)
        if identity in {'drone_bay', 'burst_cannon', 'quantum_repeater', 'pulse_cannon'}:
            centers = {'drone_bay':(.15,.4,.65), 'burst_cannon':(.18,.44,.7),
                       'quantum_repeater':(.23,.62), 'pulse_cannon':(.2,.5)}[identity]
            envelope = sum(math.exp(-((p - center) / .085) ** 2) for center in centers)
        else:
            envelope = math.sin(math.pi * p) ** 1.3 * math.exp(-p * (3 if identity == 'railgun' else 1.5))
        if identity == 'arc_cannon':
            body = math.sin(phase + .45 * math.sin(2 * math.pi * 47 * t)) + .16 * math.sin(phase * 1.5)
        if identity == 'plasma_mortar':
            body = .8 * body + .3 * math.sin(phase * .5) + .4 * smooth
        if identity == 'shield_breaker':
            body = .8 * body + .2 * math.sin(phase * 1.5)
        values.append((body + .12 * smooth) * envelope)
    return finish(values)


def core(index, activation):
    duration = (.60,.48,.54,.56,.62,.64,.60)[index] if activation else (.25,.21,.20,.23,.24,.26,.27)[index]
    base = (270,220,310,390,350,290,320)[index]
    phase = low_phase = 0.0
    values = []
    for i in range(round(RATE * duration)):
        t = i / RATE
        p = t / duration
        frequency = base * (1.1 - .32 * p if index in (1,2,3,6) else .85 + .5 * p)
        if index == 4:
            # Accumulate note phase. Multiplying f*t jumps at note boundaries.
            frequency = base * (1,1.25,1.5,2)[min(3, int(p * 4))]
        phase += 2 * math.pi * frequency / RATE
        low_phase += 2 * math.pi * base * .5 / RATE
        body = math.sin(phase) + .18 * math.sin(2 * phase) + .12 * math.sin(low_phase)
        if index == 0: body += .22 * math.sin(phase * 1.5)
        elif index == 1: body += .22 * math.sin(phase * 3) * math.exp(-p * 8)
        elif index == 2: body *= .7 + .3 * math.sin(2 * math.pi * 13 * t) ** 2
        elif index == 3: body = math.sin(phase + .6 * math.sin(phase * .25)) + .12 * math.sin(low_phase)
        elif index == 5: body += .28 * math.sin(phase * 1.25)
        elif index == 6: body = math.sin(phase + .7 * math.sin(phase * .501)) + .2 * math.sin(phase * 1.414)
        envelope = math.sin(math.pi * p) ** 1.5 * math.exp(-p * (1 if activation else 2))
        values.append(body * envelope)
    return finish(values, rms=.13 if activation else .105, peak=.38)
