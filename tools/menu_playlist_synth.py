"""Menü çalma listesi parçaları için ortak sentez ve karışım yardımcıları.

Düzenlemeler ``tools/generate_menu_playlist_audio.py`` içindedir; bu dosya
onların kullandığı ses yapı taşlarını tutar: zaman ızgarası, osilatörler,
zarflar, süzgeçler, davul ve efekt sesleri, karışım yolları, yankı/gecikme ve
WAV çıkışı.

Bütün parçalar aynı ızgarayı paylaşır: 128 saniye, 52 ölçü, 97,5 BPM. Bu,
menü ve hazırlık döngülerinin 32 saniyelik ızgarasının dört katıdır
(bkz. tools/generate_beta28_menu_audio.py). Parçalar döngüdür: nota
kuyrukları, gecikme ve yankı sondan başa sarar; dikişte sessizlik olmaz.

Yalnız standart kitaplık kullanılır ve çıktı deterministiktir.
"""

from __future__ import annotations

import math
import random
import sys
import wave
from array import array
from functools import lru_cache
from itertools import repeat
from operator import add, mul
from pathlib import Path


SAMPLE_RATE = 22_050
BARS = 52
BEATS = BARS * 4
DURATION_SECONDS = 128.0
FRAMES = int(SAMPLE_RATE * DURATION_SECONDS)
STEP = FRAMES / (BARS * 16)  # bir onaltılık
TARGET_PEAK = 10 ** (-6 / 20)
# menu_ensemble_v6.wav ölçümü: RMS -22,6 dBFS. Oyun bütün menü parçalarını
# aynı kazançla çalar; ortalama seviye bu yüzden eski döngüye eşitlenir.
TARGET_RMS = 10 ** (-22.6 / 20)
TABLE_SIZE = 4096
TABLE_MASK = TABLE_SIZE - 1
TWO_PI = 2 * math.pi

# Bölümler (ölçü numaraları, sıfırdan). Bütün parçalarda aynıdır.
INTRO = range(0, 8)
MAIN_A = range(8, 20)
BREAK = range(20, 28)
MAIN_B = range(28, 44)
OUTRO = range(44, 52)
# Kimlik ritmi 3+3+2 (ölçüde iki kez): vurgulu onaltılıklar.
ACCENTS = frozenset((0, 3, 6, 8, 11, 14))


def section_of(bar: int) -> str:
    for name, bars in (("intro", INTRO), ("a", MAIN_A), ("break", BREAK), ("b", MAIN_B)):
        if bar in bars:
            return name
    return "outro"


def frame_at(beat: float) -> int:
    return int(round(beat * FRAMES / BEATS))


def step_frame(bar: int, sixteenth: float) -> int:
    return frame_at(bar * 4 + sixteenth / 4)


def seconds(value: float) -> int:
    return int(round(value * SAMPLE_RATE))


def midi_frequency(note: float) -> float:
    return 440.0 * 2.0 ** ((note - 69) / 12.0)


def ramp(bar: float, start_bar: float, end_bar: float, start: float, end: float) -> float:
    progress = min(1.0, max(0.0, (bar - start_bar) / (end_bar - start_bar)))
    return start + (end - start) * progress


# -- Veri yolları ---------------------------------------------------------------

def silent(frames: int = FRAMES) -> array:
    return array("f", bytes(4 * frames))


def scaled(signal, gain: float):
    return map(mul, signal, repeat(gain))


def add_wrapped(bus: array, start: int, signal, gain: float) -> None:
    """Sinyali veri yoluna ekler; parça sonunu aşan kısım başa sarar."""
    if not gain:
        return
    count = len(signal)
    start %= FRAMES
    end = start + count
    if end <= FRAMES:
        bus[start:end] = array("f", map(add, bus[start:end], scaled(signal, gain)))
        return
    head = FRAMES - start
    bus[start:] = array("f", map(add, bus[start:], scaled(signal[:head], gain)))
    tail = signal[head:]
    bus[:len(tail)] = array("f", map(add, bus[:len(tail)], scaled(tail, gain)))


def write_wrapped(bus: array, start: int, values) -> None:
    count = len(values)
    start %= FRAMES
    end = start + count
    if end <= FRAMES:
        bus[start:end] = array("f", values)
        return
    head = FRAMES - start
    bus[start:] = array("f", values[:head])
    bus[:count - head] = array("f", values[head:])


class Mix:
    """Kuru çıkış, kick'e göre kısılan çıkış ve efekt gönderimleri."""

    def __init__(self) -> None:
        self.dry = (silent(), silent())
        self.ducked = (silent(), silent())
        self.reverb = silent()
        self.delay = silent()
        self.kicks: list[int] = []

    def place(self, signal, start: int, gain: float = 1.0, pan: float = 0.0,
              duck: bool = False, reverb: float = 0.0, delay: float = 0.0) -> None:
        angle = (pan + 1.0) * math.pi / 4.0
        target = self.ducked if duck else self.dry
        add_wrapped(target[0], start, signal, gain * math.cos(angle))
        add_wrapped(target[1], start, signal, gain * math.sin(angle))
        add_wrapped(self.reverb, start, signal, gain * reverb)
        add_wrapped(self.delay, start, signal, gain * delay)

    def centre(self, signal, gain: float, duck: bool = True,
               reverb: float = 0.0, delay: float = 0.0) -> None:
        """Parça boyu süren tek kanallı sinyali ortaya yerleştirir."""
        self.place(signal, 0, gain=gain, duck=duck, reverb=reverb, delay=delay)

    def spread(self, signal, start: int, gain: float, width: float,
               reverb: float = 0.0, delay: float = 0.0, duck: bool = False) -> None:
        """Sinyali ortaya koyar ve stereo genişlik ekler.

        Kısa gecikmeli bir kopya sola artı, sağa eksi eklenir. Tek hoparlörde
        (sol + sağ) kopya sıfırlanır; ses incelmez.
        """
        target = self.ducked if duck else self.dry
        level = gain * math.sqrt(0.5)
        side = start + seconds(0.011)
        for channel, sign in ((target[0], 1.0), (target[1], -1.0)):
            add_wrapped(channel, start, signal, level)
            add_wrapped(channel, side, signal, sign * level * width)
        add_wrapped(self.reverb, start, signal, gain * reverb)
        add_wrapped(self.delay, start, signal, gain * delay)


# -- Osilatörler ve zarflar -------------------------------------------------------

@lru_cache(maxsize=None)
def harmonic_table(kind: str, harmonics: int, cutoff: float) -> tuple:
    """Bant sınırlı tek periyot. `cutoff` harmonik numarası cinsinden alçak geçiren."""
    table = [0.0] * TABLE_SIZE
    for number in range(1, harmonics + 1):
        rolloff = 1.0 / math.sqrt(1.0 + (number / cutoff) ** 4)
        if kind == "pad":
            amplitude = rolloff / number
        elif kind == "bass":
            amplitude = rolloff / number ** 1.05
        else:  # lead: tek harmonikler baskın, çiftler hafif
            amplitude = rolloff * (1.0 if number % 2 else 0.32) / number ** 1.35
        if amplitude < 1e-4:
            continue
        step = TWO_PI * number / TABLE_SIZE
        table = [value + amplitude * math.sin(step * index) for index, value in enumerate(table)]
    peak = max(abs(value) for value in table)
    return tuple(value / peak for value in table)


def table_for(kind: str, frequency: float, cutoff_hz: float, limit: int = 64) -> tuple:
    harmonics = max(1, min(limit, int(0.45 * SAMPLE_RATE / frequency)))
    return harmonic_table(kind, harmonics, max(1.0, round(cutoff_hz / frequency * 4) / 4))


@lru_cache(maxsize=None)
def wave_table(shape: str, harmonics: int) -> tuple:
    """Süzülmemiş testere ("saw") ya da kare ("square") dalga, bant sınırlı."""
    table = [0.0] * TABLE_SIZE
    for number in range(1, harmonics + 1):
        if shape == "square" and number % 2 == 0:
            continue
        step = TWO_PI * number / TABLE_SIZE
        table = [value + math.sin(step * index) / number for index, value in enumerate(table)]
    peak = max(abs(value) for value in table)
    return tuple(value / peak for value in table)


def shaped_table(shape: str, frequency: float, limit: int = 72) -> tuple:
    return wave_table(shape, max(1, min(limit, int(0.45 * SAMPLE_RATE / frequency))))


def oscillator(table: tuple, frequency: float, frames: int, phase: float = 0.0) -> list:
    step = frequency * TABLE_SIZE / SAMPLE_RATE
    start = phase * TABLE_SIZE
    return [table[int(start + step * index) & TABLE_MASK] for index in range(frames)]


def envelope(gate: int, attack: int, decay: int, sustain: float, release: int) -> list:
    gate = max(gate, attack + 1)
    shape = [index / attack for index in range(attack)]
    decay_frames = min(decay, gate - attack)
    shape += [sustain + (1.0 - sustain) * math.exp(-4.5 * index / decay) for index in range(decay_frames)]
    level = shape[-1]
    shape += [level] * (gate - attack - decay_frames)
    shape += [level * (1.0 - index / release) ** 2 for index in range(release)]
    return shape


def shaped(signal: list, attack: int, release: int) -> list:
    """Kısa giriş ve çıkış rampası; aradaki seviye sabit."""
    attack = min(attack, len(signal) // 2)
    release = min(release, len(signal) - attack)
    signal[:attack] = [value * index / attack for index, value in enumerate(signal[:attack])]
    start = len(signal) - release
    signal[start:] = [value * (1.0 - index / release) ** 1.5 for index, value in enumerate(signal[start:])]
    return signal


def fade_out(signal: list, frames: int) -> list:
    frames = min(frames, len(signal))
    start = len(signal) - frames
    for index in range(frames):
        signal[start + index] *= 1.0 - (index + 1) / frames
    return signal


# -- Süzgeçler ----------------------------------------------------------------

def lowpass(signal, cutoff_hz: float) -> list:
    coefficient = 1.0 - math.exp(-TWO_PI * cutoff_hz / SAMPLE_RATE)
    state = 0.0
    output = []
    append = output.append
    for value in signal:
        state += coefficient * (value - state)
        append(state)
    return output


def highpass(signal, cutoff_hz: float) -> list:
    return [value - low for value, low in zip(signal, lowpass(signal, cutoff_hz))]


def state_filter(signal, cutoffs, damping: float) -> list:
    """Durum değişkenli alçak geçiren (Chamberlin). Kesim frekansı örnek örnek değişebilir."""
    scale = TWO_PI / SAMPLE_RATE
    low = mid = 0.0
    output = []
    append = output.append
    for value, cutoff in zip(signal, cutoffs):
        coefficient = cutoff * scale
        mid += coefficient * (value - low - damping * mid)
        low += coefficient * mid
        append(low)
    return output


def circular_filter(signal: array, cutoffs: array, damping: float) -> list:
    """Süzgeç durumu dikişte sürekli olsun diye parça sonu önden verilir."""
    preroll = seconds(0.4)
    return state_filter(signal[-preroll:] + signal, cutoffs[-preroll:] + cutoffs, damping)[preroll:]


class FilteredBus:
    """Notalar tek kanalda toplanır; her nota kesim frekansı zarfını da yazar.

    Kanal sonra tek geçişte süzülür: klasik analog dizi sesi (zarflı süzgeç).
    """

    def __init__(self, rest_cutoff: float) -> None:
        self.signal = silent()
        self.cutoff = array("f", repeat(rest_cutoff, FRAMES))

    def note(self, start: int, signal, gain: float, cutoff_envelope) -> None:
        add_wrapped(self.signal, start, signal, gain)
        write_wrapped(self.cutoff, start, cutoff_envelope)

    def render(self, damping: float, drive: float = 0.0) -> list:
        output = circular_filter(self.signal, self.cutoff, damping)
        return saturated(output, drive) if drive else output


def saturated(signal, drive: float) -> list:
    """Yumuşak doygunluk; tepe seviyesi 1'de kalır."""
    ceiling = math.tanh(drive)
    return [math.tanh(value * drive) / ceiling for value in signal]


def cutoff_decay(frames: int, floor: float, amount: float, decay_seconds: float) -> list:
    rate = decay_seconds * SAMPLE_RATE
    return [min(3000.0, floor + amount * math.exp(-index / rate)) for index in range(frames)]


def noise(frames: int, seed: int) -> list:
    generator = random.Random(seed)
    return [generator.random() * 2.0 - 1.0 for _ in range(frames)]


def crush(signal, levels: int, hold: int) -> list:
    """Bit ve örnekleme hızı düşürme: 'dijital veri' rengi."""
    output = []
    held = 0.0
    for index, value in enumerate(signal):
        if index % hold == 0:
            held = round(value * levels) / levels
        output.append(held)
    return output


# -- Sesler -------------------------------------------------------------------

def pad_chord(notes, gate: int, cutoff_hz: float, seed: int) -> tuple[list, list]:
    """Üç sesli (orta, sol, sağ) hafif akortsuz testere; yavaş giriş, uzun kuyruk."""
    attack = seconds(0.32)
    release = seconds(1.15)
    total = gate + release
    generator = random.Random(seed)
    left = [0.0] * total
    right = [0.0] * total
    for note in notes:
        frequency = midi_frequency(note)
        table = table_for("pad", frequency, cutoff_hz)
        centre = oscillator(table, frequency, total, generator.random())
        high = oscillator(table, frequency * 2 ** (8 / 1200), total, generator.random())
        low = oscillator(table, frequency * 2 ** (-7 / 1200), total, generator.random())
        left = [a + 0.62 * c + h for a, c, h in zip(left, centre, high)]
        right = [a + 0.62 * c + l for a, c, l in zip(right, centre, low)]
    for side in (left, right):
        side[:attack] = [value * (index / attack) ** 1.5 for index, value in enumerate(side[:attack])]
        side[gate:] = [value * (1.0 - index / release) ** 2 for index, value in enumerate(side[gate:])]
    return left, right


def bass_note(note: int, gate: int, bright: float = 8.0) -> list:
    frequency = midi_frequency(note)
    table = table_for("bass", frequency, frequency * bright, limit=20)
    shape = envelope(gate, seconds(0.005), seconds(0.2), 0.62, seconds(0.07))
    voice = oscillator(table, frequency, len(shape))
    return [value * level for value, level in zip(voice, shape)]


@lru_cache(maxsize=None)
def glass_pluck(note: int, length_ms: int) -> tuple:
    """İki operatörlü FM: camsı kısa vuruş. Yüksek notalarda indeks düşer (örtüşme olmasın)."""
    frequency = midi_frequency(note)
    frames = seconds(length_ms / 1000)
    step = TWO_PI * frequency / SAMPLE_RATE
    index_peak = min(2.6, max(0.4, (0.45 * SAMPLE_RATE / frequency - 1.0) / 2.0 - 1.0))
    index_decay = seconds(0.075)
    amp_decay = frames / 5.5
    signal = [
        math.sin(step * i + index_peak * math.exp(-i / index_decay) * math.sin(2.0 * step * i))
        * math.exp(-i / amp_decay)
        for i in range(frames)
    ]
    attack = seconds(0.002)
    signal[:attack] = [value * index / attack for index, value in enumerate(signal[:attack])]
    return tuple(fade_out(signal, seconds(0.02)))


def lead_note(note: int, gate: int) -> list:
    """Yumuşak kare/üçgen karışımı; nota tutulunca hafif vibrato."""
    frequency = midi_frequency(note)
    table = table_for("lead", frequency, 4500.0, limit=24)
    shape = envelope(gate, seconds(0.018), seconds(0.28), 0.72, seconds(0.2))
    step = frequency * TABLE_SIZE / SAMPLE_RATE
    vibrato_step = TWO_PI * 5.3 / SAMPLE_RATE
    onset = seconds(0.2)
    slope = seconds(0.3)
    phase = 0.0
    output = []
    append = output.append
    for index, level in enumerate(shape):
        depth = 0.0055 * min(1.0, max(0.0, (index - onset) / slope))
        phase += step * (1.0 + depth * math.sin(vibrato_step * index))
        append(table[int(phase) & TABLE_MASK] * level)
    return output


BELL_PARTIALS = ((1.0, 1.0, 1.7), (2.0, 0.34, 1.0), (3.01, 0.16, 0.62), (4.2, 0.09, 0.36), (5.43, 0.05, 0.22))


@lru_cache(maxsize=None)
def bell_note(note: int, gate_ms: int) -> tuple:
    """Hafif uyumsuz üst seslerle çan/elektrikli piyano arası ses."""
    frequency = midi_frequency(note)
    frames = seconds(gate_ms / 1000 + 1.6)
    signal = [0.0] * frames
    for ratio, amplitude, decay in BELL_PARTIALS:
        if frequency * ratio > 0.45 * SAMPLE_RATE:
            continue
        step = TWO_PI * frequency * ratio / SAMPLE_RATE
        decay_frames = seconds(decay * (0.6 + gate_ms / 2500))
        signal = [
            value + amplitude * math.sin(step * index) * math.exp(-index / decay_frames)
            for index, value in enumerate(signal)
        ]
    attack = seconds(0.004)
    signal[:attack] = [value * index / attack for index, value in enumerate(signal[:attack])]
    return tuple(fade_out(signal, seconds(0.25)))


def saw_voice(note: float, frames: int, detune_cents: float = 7.0, seed: int = 0) -> list:
    """İki hafif akortsuz testere: kalın, elektrikli ton."""
    frequency = midi_frequency(note)
    table = shaped_table("saw", frequency)
    generator = random.Random(seed * 131 + int(note * 10))
    first = oscillator(table, frequency, frames, generator.random())
    second = oscillator(table, frequency * 2 ** (detune_cents / 1200), frames, generator.random())
    return [0.5 * (a + b) for a, b in zip(first, second)]


def super_saw(note: float, frames: int, seed: int) -> list:
    frequency = midi_frequency(note)
    table = shaped_table("saw", frequency)
    generator = random.Random(seed * 977 + int(note * 10))
    voices = [
        oscillator(table, frequency * 2 ** (cents / 1200), frames, generator.random())
        for cents in (-13.0, 0.0, 12.0)
    ]
    return [(a + b + c) / 3.0 for a, b, c in zip(*voices)]


LEAD_TABLES = {count: wave_table("saw", count) for count in range(5, 19)}


def glide_line(events, glide_ms: float, duty_centre: float = 0.4, release_ms: float = 60.0) -> tuple[int, list]:
    """Tek sesli, notadan notaya kayan darbe genişliği modülasyonlu lead.

    `events`: (başlangıç karesi, süre karesi, MIDI) sıralı liste. Dönen: (başlangıç, sinyal).
    """
    first = events[0][0]
    tail = seconds(0.2)
    total = max(start + gate for start, gate, _ in events) - first + tail
    target = [midi_frequency(events[0][2])] * total
    held = [0.0] * total
    for start, gate, note in events:
        offset = start - first
        target[offset:] = [midi_frequency(note)] * (total - offset)
        held[offset:offset + gate] = [1.0] * gate
    slew = 1.0 - math.exp(-1.0 / (glide_ms / 1000 * SAMPLE_RATE))
    attack = 1.0 - math.exp(-1.0 / (0.004 * SAMPLE_RATE))
    release = 1.0 - math.exp(-1.0 / (release_ms / 1000 * SAMPLE_RATE))
    phase_scale = TABLE_SIZE / SAMPLE_RATE
    vibrato_step = TWO_PI * 5.6 / SAMPLE_RATE
    duty_step = TWO_PI * 0.31 / SAMPLE_RATE
    frequency = target[0]
    level = 0.0
    phase = 0.0
    output = []
    append = output.append
    for index in range(total):
        frequency += (target[index] - frequency) * slew
        gate = held[index]
        level += (gate - level) * (attack if gate > level else release)
        phase += frequency * (1.0 + 0.004 * math.sin(vibrato_step * index)) * phase_scale
        table = LEAD_TABLES[max(5, min(18, int(9900.0 / frequency)))]
        position = int(phase)
        duty = int((duty_centre + 0.09 * math.sin(duty_step * (first + index))) * TABLE_SIZE)
        append((table[position & TABLE_MASK] - table[(position + duty) & TABLE_MASK]) * level * 0.5)
    return first, fade_out(output, seconds(0.02))


# -- Davul ve efekt sesleri -----------------------------------------------------

def make_kick(length: float, seed: int, sweep: float, decay: float, drive: float,
              click: float, click_decay: float) -> list:
    """Hızla alçalan sinüs gövde (doygun) ve kısa gürültü tıkı."""
    frames = seconds(length)
    tick = noise(frames, seed)
    phase = 0.0
    output = []
    for index in range(frames):
        t = index / SAMPLE_RATE
        phase += TWO_PI * (50.0 + 150.0 * math.exp(-t / sweep)) / SAMPLE_RATE
        body = math.tanh(drive * math.sin(phase) * math.exp(-t / decay)) / math.tanh(drive)
        output.append(body + tick[index] * click * math.exp(-t / click_decay))
    return fade_out(output, seconds(0.03))


def make_heartbeat(kick: list) -> list:
    """Kick'in boğuk hali: kalp atışı."""
    return fade_out(lowpass(kick, 380.0), seconds(0.05))


def make_snare(seed: int) -> list:
    frames = seconds(0.26)
    hiss = highpass(noise(frames, seed), 1500.0)
    output = []
    for index in range(frames):
        t = index / SAMPLE_RATE
        body = math.sin(TWO_PI * (172.0 + 40.0 * math.exp(-t / 0.02)) * t) * math.exp(-t / 0.07)
        output.append(0.55 * body + 0.75 * hiss[index] * math.exp(-t / 0.085))
    return fade_out(output, seconds(0.03))


def make_metal_snare(seed: int) -> list:
    """Gövde + gürültü + uyumsuz metal üst sesler (savaş müziğindeki metal trampet)."""
    frames = seconds(0.24)
    hiss = highpass(noise(frames, seed), 1300.0)
    output = []
    for index in range(frames):
        t = index / SAMPLE_RATE
        body = math.sin(TWO_PI * (190.0 + 60.0 * math.exp(-t / 0.015)) * t) * math.exp(-t / 0.055)
        metal = sum(
            math.sin(TWO_PI * partial * t) * math.exp(-t / decay)
            for partial, decay in ((411.0, 0.05), (589.0, 0.04), (837.0, 0.032), (1213.0, 0.026))
        )
        output.append(0.5 * body + 0.8 * hiss[index] * math.exp(-t / 0.075) + 0.16 * metal)
    return fade_out(output, seconds(0.03))


def make_clap(seed: int) -> list:
    frames = seconds(0.3)
    band = lowpass(highpass(noise(frames, seed), 900.0), 4500.0)
    output = []
    for index in range(frames):
        t = index / SAMPLE_RATE
        bursts = sum(math.exp(-(t - offset) / 0.007) for offset in (0.0, 0.011, 0.022) if t >= offset)
        tail = math.exp(-(t - 0.03) / 0.085) if t >= 0.03 else 0.0
        output.append(band[index] * (0.5 * bursts + tail))
    return fade_out(output, seconds(0.03))


def make_hat(seed: int, decay: float, cutoff: float = 5200.0) -> list:
    frames = seconds(decay * 6)
    hiss = highpass(highpass(noise(frames, seed), cutoff), cutoff)
    return fade_out(
        [value * math.exp(-index / (decay * SAMPLE_RATE)) for index, value in enumerate(hiss)],
        seconds(0.004),
    )


def make_blip(frequency: float, decay: float) -> list:
    """Kısa sinüs sinyali: sonar / veri vuruşu."""
    frames = seconds(decay * 6)
    step = TWO_PI * frequency / SAMPLE_RATE
    signal = [
        math.sin(step * index * (1.0 + 0.02 * math.exp(-index / (0.01 * SAMPLE_RATE))))
        * math.exp(-index / (decay * SAMPLE_RATE))
        for index in range(frames)
    ]
    attack = seconds(0.002)
    signal[:attack] = [value * index / attack for index, value in enumerate(signal[:attack])]
    return fade_out(signal, seconds(0.01))


def make_zap(start_hz: float, end_hz: float, length: float) -> list:
    """Hızla düşen perde: elektrik boşalması."""
    frames = seconds(length)
    phase = 0.0
    output = []
    for index in range(frames):
        t = index / SAMPLE_RATE
        phase += TWO_PI * (end_hz + (start_hz - end_hz) * math.exp(-t / (length * 0.22))) / SAMPLE_RATE
        output.append(math.sin(phase + 0.9 * math.sin(phase * 0.5)) * math.exp(-t / (length * 0.4)))
    return fade_out(output, seconds(0.01))


def make_power_down(length: float) -> list:
    """Bölüm sonu: sönerek alçalan testere (güç kesilmesi)."""
    frames = seconds(length)
    table = wave_table("saw", 12)
    phase = 0.0
    output = []
    for index in range(frames):
        progress = index / frames
        phase += (620.0 * (1.0 - progress) ** 2.2 + 38.0) * TABLE_SIZE / SAMPLE_RATE
        output.append(table[int(phase) & TABLE_MASK] * (1.0 - progress) ** 0.7)
    return fade_out(lowpass(output, 2600.0), seconds(0.02))


def make_riser(frames: int, seed: int) -> list:
    """Bölüm öncesi yükselen gürültü: alçak geçiren açılır, seviye artar."""
    source = noise(frames, seed)
    state = 0.0
    output = []
    for index, value in enumerate(source):
        progress = index / frames
        coefficient = 1.0 - math.exp(-TWO_PI * (250.0 + 5200.0 * progress ** 2) / SAMPLE_RATE)
        state += coefficient * (value - state)
        output.append(state * progress ** 2.2)
    return fade_out(output, seconds(0.012))


def make_impact(seed: int) -> list:
    """Bölüm başı: alçak vuruş ve sönen gürültü."""
    frames = seconds(1.6)
    wash = lowpass(highpass(noise(frames, seed), 1800.0), 7000.0)
    output = []
    for index in range(frames):
        t = index / SAMPLE_RATE
        boom = math.sin(TWO_PI * (44.0 + 30.0 * math.exp(-t / 0.05)) * t) * math.exp(-t / 0.42)
        output.append(0.9 * boom + 0.3 * wash[index] * math.exp(-t / 0.45))
    return fade_out(output, seconds(0.1))


def make_crackle(frames: int, seed: int, rate: float) -> list:
    """Seyrek, süzülmüş kıvılcımlar: ark sesi."""
    generator = random.Random(seed)
    spikes = [0.0] * frames
    position = 0
    while True:
        position += int(generator.expovariate(rate) * SAMPLE_RATE) + 1
        if position >= frames:
            break
        size = generator.random() ** 2
        for offset in range(min(generator.randint(1, 5), frames - position)):
            spikes[position + offset] = (generator.random() * 2.0 - 1.0) * size
    band = lowpass(highpass(spikes, 1700.0), 5200.0)
    peak = max(abs(value) for value in band) or 1.0
    return [value / peak for value in band]


def make_hum(frames: int, seed: int) -> list:
    """Şebeke uğultusu (100/200/300 Hz), yavaş dalgalanır."""
    generator = random.Random(seed)
    wobble_step = TWO_PI * (0.11 + 0.05 * generator.random()) / SAMPLE_RATE
    steps = [TWO_PI * hz / SAMPLE_RATE for hz in (100.0, 200.0, 300.0, 400.0)]
    return [
        (math.sin(steps[0] * i) + 0.55 * math.sin(steps[1] * i + 0.4)
         + 0.4 * math.sin(steps[2] * i + 1.1) + 0.22 * math.sin(steps[3] * i + 2.0))
        * (0.62 + 0.38 * math.sin(wobble_step * i)) / 2.2
        for i in range(frames)
    ]


def gate_curve(pattern, bars, floor: float = 0.0) -> array:
    """Onaltılık adımlarla açılıp kapanan kapı; verilen ölçüler dışında tam açık."""
    curve = array("f", repeat(1.0, FRAMES))
    for bar in bars:
        for index, level in enumerate(pattern):
            start = step_frame(bar, index)
            end = step_frame(bar, index + 1)
            curve[start:end] = array("f", repeat(max(floor, level), end - start))
    # Kenarlar tık yapmasın.
    return array("f", lowpass(curve, 140.0))


# -- Karışım ve çıkış -----------------------------------------------------------

def comb(source, delay: int, feedback: float, damp: float):
    buffer = [0.0] * delay
    index = 0
    store = 0.0
    keep = 1.0 - damp
    for sample in source:
        delayed = buffer[index]
        store = delayed * keep + store * damp
        buffer[index] = sample + store * feedback
        index += 1
        if index == delay:
            index = 0
        yield delayed


def allpass(source, delay: int, feedback: float = 0.5):
    buffer = [0.0] * delay
    index = 0
    for sample in source:
        delayed = buffer[index]
        buffer[index] = sample + delayed * feedback
        index += 1
        if index == delay:
            index = 0
        yield delayed - sample


COMB_DELAYS = (558, 594, 638, 678, 711, 745)
ALLPASS_DELAYS = (278, 220, 170)


def reverb(send: array, spread: int) -> array:
    """Freeverb benzeri yankı. Parça sonu baştan önce verilir ki kuyruk dikişi aşsın."""
    preroll = seconds(5.0)
    # Alt frekanslar yankıyı bulandırmasın.
    source = array("f", highpass(send[-preroll:] + send, 260.0))
    total = None
    for delay in COMB_DELAYS:
        voice = array("f", comb(source, delay + spread, 0.86, 0.32))
        total = voice if total is None else array("f", map(add, total, voice))
    stream = iter(total)
    for delay in ALLPASS_DELAYS:
        stream = allpass(stream, delay + spread)
    return array("f", stream)[preroll:]


def rotated(signal: array, frames: int) -> array:
    return signal[-frames:] + signal[:-frames]


def ping_pong(send: array) -> tuple[array, array]:
    """Noktalı sekizlik gecikme; yansımalar sol ve sağ arasında gidip gelir."""
    step = frame_at(0.75)
    sides = [silent(), silent()]
    for tap in range(1, 6):
        echo = rotated(send, step * tap)
        side = tap % 2
        sides[side] = array("f", map(add, sides[side], scaled(echo, 0.46 ** tap)))
    return sides[1], sides[0]


def duck_curve(kicks: list[int], depth: float, recovery: float) -> array:
    """Kick vurduğunda ped ve bas kısa süre kısılır (yan zincir etkisi)."""
    curve = array("f", repeat(1.0, FRAMES))
    length = seconds(0.3)
    attack = seconds(0.004)
    shape = [
        1.0 - depth * (index / attack if index < attack else math.exp(-(index - attack) / (recovery * SAMPLE_RATE)))
        for index in range(length)
    ]
    for kick in kicks:
        end = min(FRAMES, kick + length)
        curve[kick:end] = array("f", map(min, curve[kick:end], shape))
    return curve


def master(mix: Mix, *, duck_depth: float, duck_recovery: float, reverb_return: float,
           echo_return: float, drive: float) -> tuple[array, array]:
    """Gecikme, yankı ve yan zinciri uygular; iki kanalı yumuşak sınırlayıcıdan geçirir."""
    curve = duck_curve(mix.kicks, duck_depth, duck_recovery)
    echo_left, echo_right = ping_pong(mix.delay)
    # Yansımalar da yankıya girer; uzay tek parça duyulur.
    send = array("f", map(add, mix.reverb, scaled(array("f", map(add, echo_left, echo_right)), 0.25)))
    wet = (reverb(send, 0), reverb(send, 11))
    sums = []
    for side, echo in enumerate((echo_left, echo_right)):
        ducked = map(mul, mix.ducked[side], curve)
        effects = map(add, scaled(echo, echo_return), scaled(wet[side], reverb_return))
        sums.append(array("f", map(add, map(add, mix.dry[side], ducked), effects)))
    # Yumuşak sınırlama: kick tepeleri kırpılmadan yuvarlanır, gövde yerinde
    # kalır. `drive` sınırlayıcıya giren tepe seviyesidir.
    peak = max(max(max(side), -min(side)) for side in sums) or 1.0
    gain = drive / peak
    left, right = (array("f", (math.tanh(value * gain) for value in side)) for side in sums)
    return left, right


def output_scale(left: array, right: array) -> float:
    """Eski menü döngüsüyle aynı ortalama seviye (RMS); tepe en çok -6 dBFS."""
    peak = max(max(left), -min(left), max(right), -min(right)) or 1.0
    mean_square = (sum(map(mul, left, left)) + sum(map(mul, right, right))) / (2 * len(left))
    return min(TARGET_PEAK / peak, TARGET_RMS / math.sqrt(mean_square or 1.0))


def write_wav(path: Path, left, right, scale: float) -> None:
    frames = len(left)
    pcm = array("h", bytes(4 * frames))
    pcm[0::2] = array("h", (int(round(value * scale * 32_767)) for value in left))
    pcm[1::2] = array("h", (int(round(value * scale * 32_767)) for value in right))
    if sys.byteorder == "big":
        pcm.byteswap()
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as writer:
        writer.setnchannels(2)
        writer.setsampwidth(2)
        writer.setframerate(SAMPLE_RATE)
        writer.writeframes(pcm.tobytes())
