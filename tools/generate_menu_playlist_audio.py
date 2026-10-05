"""GRIDSHARD menü çalma listesinin parçalarını üretir.

Oyuncular eski menü döngüsünün (tools/generate_beta28_menu_audio.py) sürekli
aynı melodiyi tekrar ettiğini bildirdi: melodi 4,9 saniyelik tek cümleydi. Bu
parçalar 128 saniyelik düzenlemelerdir; her birinde giriş, birinci ana bölüm,
ara, ikinci ana bölüm ve çıkış vardır, melodi aralarda susar ve her gelişinde
farklı bir cümle çalar.

- Durgun Devre: ped, cam arpej, çan ve yumuşak lead; dingin.
- Akım Hattı: süzgeçli testere bas dizisi, elektro davul, güç akoru vuruşları
  ve kayan (portamento) lead. Armoni savaş müziğinin gerilim döngüsüdür:
  Re – Do – Si bemol – La.
- Çekirdek Odası: yarı tempolu, karanlık. Kapılı reaktör darbesi, onaltılık
  minör motor, sonar sinyali, veri akışı ve Re–Mi bemol gerilimi.

Elektronik iki parça savaş müziğinin ses sözlüğünü (bkz.
tools/generate_beta31_battle_audio.py) menü temposuna taşır. Ses yapı taşları
tools/menu_playlist_synth.py içindedir. Çıktı deterministiktir; parçalar
client/src/gridshard-audio.js içindeki GRIDSHARD_MENU_PLAYLIST ile çalınır.

Kullanım:
    python tools/generate_menu_playlist_audio.py            # üç parça
    python tools/generate_menu_playlist_audio.py akim       # tek parça
Ardından: python tools/encode_mobile_audio.py
"""

from __future__ import annotations

import argparse
import math
import random
import time
from array import array
from dataclasses import dataclass
from itertools import repeat
from operator import add, mul
from pathlib import Path

from menu_playlist_synth import (
    ACCENTS, BARS, BEATS, BREAK, DURATION_SECONDS, FRAMES, MAIN_A, MAIN_B, OUTRO,
    SAMPLE_RATE, STEP, TWO_PI, FilteredBus, Mix, add_wrapped, bass_note, bell_note,
    circular_filter, crush, cutoff_decay, frame_at, gate_curve, glass_pluck, glide_line,
    lead_note, make_blip, make_clap, make_crackle, make_hat, make_heartbeat, make_hum,
    make_impact, make_kick, make_metal_snare, make_power_down, make_riser, make_snare,
    make_zap, master, midi_frequency, oscillator, output_scale, pad_chord, ramp,
    saturated, saw_voice, seconds, section_of, shaped, shaped_table, silent,
    state_filter, step_frame, super_saw, wave_table, write_wav, write_wrapped,
)


ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "client" / "assets" / "audio"


# == Parça 1: Durgun Devre =======================================================

# Akorlar: bas kökü, ped seslendirmesi, arpej tonları (MIDI).
DURGUN_CHORDS = {
    "Dm7": {"bass": 38, "pad": (50, 57, 60, 65), "arp": (74, 81, 84, 89)},
    "Bbmaj7": {"bass": 34, "pad": (46, 53, 57, 62), "arp": (74, 77, 82, 89)},
    "Fadd9": {"bass": 41, "pad": (53, 57, 60, 67), "arp": (72, 77, 81, 84)},
    "Cadd9": {"bass": 36, "pad": (48, 55, 62, 64), "arp": (72, 76, 79, 86)},
    "Gm7": {"bass": 43, "pad": (43, 53, 58, 62), "arp": (70, 74, 79, 82)},
    "A7": {"bass": 45, "pad": (45, 52, 55, 61), "arp": (73, 76, 79, 85)},
}
PROGRESSION_A = ("Dm7", "Bbmaj7", "Fadd9", "Cadd9")
PROGRESSION_A2 = ("Dm7", "Gm7", "Bbmaj7", "Cadd9")
# Ara bölüm: son akor (La) birinci turda Si bemole kaçar, ikincide Re minöre çözülür.
PROGRESSION_B = ("Bbmaj7", "Fadd9", "Gm7", "A7")
DURGUN_HARMONY = (
    PROGRESSION_A + PROGRESSION_A
    + PROGRESSION_A + PROGRESSION_A2 + PROGRESSION_A
    + PROGRESSION_B + PROGRESSION_B
    + PROGRESSION_A + PROGRESSION_A2 + PROGRESSION_A + PROGRESSION_A2
    + PROGRESSION_A + PROGRESSION_A
)
assert len(DURGUN_HARMONY) == BARS

# Melodi cümleleri: (cümle başından vuruş, süre vuruş, MIDI). Her biri iki ölçü.
PHRASE_CALL = ((0, 1.5, 74), (1.5, 0.5, 77), (2, 2, 81), (4, 1, 79), (5, 1, 77), (6, 2, 74))
PHRASE_CALL_HARMONY = ((0, 1.5, 77), (1.5, 0.5, 81), (2, 2, 84), (4, 1, 82), (5, 1, 81), (6, 2, 77))
PHRASE_RISE = ((0, 1.5, 74), (1.5, 0.5, 77), (2, 1, 81), (3, 1, 84), (4, 1.5, 82), (5.5, 0.5, 81), (6, 2, 79))
PHRASE_ANSWER = ((0, 1.5, 72), (1.5, 0.5, 77), (2, 1.5, 81), (3.5, 0.5, 79), (4, 3, 76))
PHRASE_FALL = ((0, 1, 77), (1, 1, 81), (2, 2, 82), (4, 1, 79), (5, 1, 76), (6, 2, 72))
# Shard motifi (Re–Fa–La–Do–Si bemol) hızlı girişle.
PHRASE_SHARD = ((0, 0.5, 74), (0.5, 0.5, 77), (1, 0.5, 81), (1.5, 1.5, 84), (3, 1, 82), (4, 2, 81), (6, 1, 77), (7, 1, 79))
PHRASE_CLOSE = ((0, 1, 81), (1, 1, 79), (2, 2, 77), (4, 1.5, 76), (5.5, 0.5, 72), (6, 2, 74))
DURGUN_LEAD_PLAN = (
    (8, PHRASE_CALL), (12, PHRASE_RISE), (14, PHRASE_FALL), (18, PHRASE_ANSWER),
    (28, PHRASE_SHARD), (32, PHRASE_RISE), (34, PHRASE_FALL), (36, PHRASE_CALL),
    (38, PHRASE_ANSWER), (42, PHRASE_CLOSE),
)
DURGUN_LEAD_HARMONY_PLAN = ((36, PHRASE_CALL_HARMONY),)

# Çan: girişte Shard motifi (Re–La–Do–Fa), arada uzun notalı ezgi, çıkışta kısa cevap.
DURGUN_BELL_PLAN = (
    (6, ((0, 2, 74), (2, 2, 81), (4, 3, 84), (7, 1, 77))),
    (20, ((0, 2, 74), (2, 2, 77), (4, 3, 81), (7, 1, 79), (8, 2, 82), (10, 1, 81), (11, 1, 79), (12, 4, 76))),
    (24, ((0, 2, 77), (2, 2, 82), (4, 2, 81), (6, 2, 84), (8, 2, 86), (10, 2, 82), (12, 1.5, 81), (13.5, 1.5, 76), (15, 1, 73))),
    (50, ((0, 2, 81), (2, 2, 77), (4, 4, 76))),
)

ARP_PATTERN_1 = (0, 2, 1, 2, 3, 2, 1, 2)
ARP_PATTERN_2 = (0, 1, 2, 3, 2, 3, 1, 2)
ARP_PATTERN_SOFT = (0, 2, 1, 3, 2, 1, 3, 2)
# 3+3+2: vurgular sekizliklerde 0, 3 ve 6.
ARP_ACCENTS = (1.0, 0.55, 0.62, 0.92, 0.55, 0.62, 0.86, 0.55)

PAD_CUTOFF = {"intro": 950.0, "a": 1700.0, "break": 1150.0, "b": 2100.0, "outro": 1200.0}
PAD_GAIN = {"intro": 0.075, "a": 0.052, "break": 0.07, "b": 0.045, "outro": 0.065}


def durgun_pad(mix: Mix) -> None:
    for bar, chord in enumerate(DURGUN_HARMONY):
        section = section_of(bar)
        start = frame_at(bar * 4)
        gate = frame_at(bar * 4 + 4) - start
        left, right = pad_chord(DURGUN_CHORDS[chord]["pad"], gate, PAD_CUTOFF[section], seed=1000 + bar)
        gain = PAD_GAIN[section]
        add_wrapped(mix.ducked[0], start, left, gain)
        add_wrapped(mix.ducked[1], start, right, gain)
        add_wrapped(mix.reverb, start, left, gain * 0.22)
        add_wrapped(mix.reverb, start, right, gain * 0.22)


def durgun_bass(mix: Mix) -> None:
    for bar, chord in enumerate(DURGUN_HARMONY):
        root = DURGUN_CHORDS[chord]["bass"]
        section = section_of(bar)
        if section == "intro" and bar < 4:
            continue
        sustained = section in ("intro", "break") or bar >= 48
        if sustained:
            hits = ((0.0, 3.8, root, 0.62),)
        elif section == "b":
            lift = root + (12 if bar % 2 else 7)
            hits = ((0.0, 1.2, root, 1.0), (1.5, 1.0, root, 0.86), (3.0, 0.45, root, 0.9), (3.5, 0.4, lift, 0.7))
        else:
            hits = ((0.0, 1.3, root, 1.0), (1.5, 1.2, root, 0.86))
            if bar % 2:
                hits += ((3.0, 0.7, root + 12, 0.7),)
        for beat, length, note, velocity in hits:
            start = frame_at(bar * 4 + beat)
            gate = frame_at(bar * 4 + beat + length) - start
            signal = bass_note(note, gate, bright=4.5 if sustained else 8.0)
            mix.place(signal, start, gain=0.285 * velocity, duck=True)


def durgun_drums(mix: Mix) -> None:
    kick = make_kick(0.34, 11, 0.022, 0.085, 1.6, 0.42, 0.003)
    snares = [make_snare(21), make_snare(22)]
    claps = [make_clap(31), make_clap(32), make_clap(33)]
    closed = [make_hat(41, 0.028, 4500.0), make_hat(42, 0.032, 4500.0), make_hat(43, 0.026, 4500.0)]
    open_hat = make_hat(44, 0.16, 4500.0)
    feel = random.Random(7)

    def hit(sample, bar, sixteenth, gain, pan=0.0, reverb=0.0):
        # Kick dışındaki vuruşların şiddeti az oynar; makine gibi tekdüze olmasın.
        if sample is not kick:
            gain *= 0.86 + 0.28 * feel.random()
        mix.place(sample, step_frame(bar, sixteenth), gain=gain, pan=pan, reverb=reverb)

    for bar in range(BARS):
        section = section_of(bar)
        cycle_end = bar % 4 == 3
        if section == "a" or bar in range(44, 48):
            # Yarı tempo: kick 3+3+2, trampet üçüncü vuruşta.
            kicks = [0, 6] + ([12] if bar % 2 else [])
            for position in kicks:
                hit(kick, bar, position, 0.5)
                mix.kicks.append(step_frame(bar, position))
            hat_gain = 0.19 if section == "a" else 0.13
            for eighth in range(8):
                accent = (0.6, 0.9, 0.6, 1.0, 0.6, 0.9, 0.6, 1.0)[eighth]
                hit(closed[eighth % 3], bar, eighth * 2, hat_gain * accent, pan=0.28)
            if section == "a":
                hit(snares[bar % 2], bar, 8, 0.38, reverb=0.3)
                if cycle_end:
                    hit(open_hat, bar, 14, 0.12, pan=0.28, reverb=0.15)
                if bar == MAIN_A[-1]:
                    for step, level in zip((12, 13, 14, 15), (0.1, 0.14, 0.19, 0.24)):
                        hit(snares[step % 2], bar, step, level, reverb=0.25)
        elif section == "b":
            for position in (0, 6, 12):
                hit(kick, bar, position, 0.5)
                mix.kicks.append(step_frame(bar, position))
            for position in (4, 12):
                hit(claps[(bar + position) % 3], bar, position, 0.4, reverb=0.35)
            for sixteenth in range(16):
                accent = (0.9, 0.34, 0.62, 0.34)[sixteenth % 4]
                hit(closed[sixteenth % 3], bar, sixteenth, 0.18 * accent, pan=0.3)
            hit(open_hat, bar, 6, 0.09, pan=0.3, reverb=0.15)
            hit(open_hat, bar, 14, 0.11, pan=0.3, reverb=0.15)
            if cycle_end:
                long_fill = bar in (35, 43)
                steps = range(8, 16) if long_fill else range(12, 16)
                for order, step in enumerate(steps):
                    level = 0.09 + 0.17 * (order + 1) / len(steps)
                    hit(snares[step % 2], bar, step, level, reverb=0.25)


def durgun_arp(mix: Mix) -> None:
    lead_bars = {bar + offset for bar, _ in DURGUN_LEAD_PLAN for offset in (0, 1)}
    feel = random.Random(9)
    for bar, chord in enumerate(DURGUN_HARMONY):
        tones = DURGUN_CHORDS[chord]["arp"]
        section = section_of(bar)
        if section == "intro" and bar < 4:
            continue
        sparse = section == "intro" or bar >= 48
        if sparse:
            steps = [(beat, tones[(0, 2, 3, 2)[beat]], 0.5, 900) for beat in range(4)]
        elif section == "break":
            steps = [(eighth / 2, tones[ARP_PATTERN_SOFT[eighth]], 0.46 * ARP_ACCENTS[eighth], 620) for eighth in range(8)]
        else:
            pattern = ARP_PATTERN_2 if section == "b" else ARP_PATTERN_1
            steps = [(eighth / 2, tones[pattern[eighth]], ARP_ACCENTS[eighth], 420) for eighth in range(8)]
        # Melodi çalarken arpej geri çekilir.
        gain = 0.3 * (0.62 if bar in lead_bars else 1.0)
        for index, (beat, note, velocity, length) in enumerate(steps):
            mix.place(
                glass_pluck(note, length), frame_at(bar * 4 + beat),
                gain=gain * velocity * (0.88 + 0.24 * feel.random()), pan=-0.35 if index % 2 else -0.1,
                reverb=0.5 if sparse or section == "break" else 0.3, delay=0.45,
            )


def durgun_melodies(mix: Mix) -> None:
    for bar, phrase in DURGUN_LEAD_PLAN:
        for beat, length, note in phrase:
            start = frame_at(bar * 4 + beat)
            gate = frame_at(bar * 4 + beat + length * 0.94) - start
            mix.place(lead_note(note, gate), start, gain=0.18, pan=0.06, reverb=0.3, delay=0.32)
    for bar, phrase in DURGUN_LEAD_HARMONY_PLAN:
        for beat, length, note in phrase:
            start = frame_at(bar * 4 + beat)
            gate = frame_at(bar * 4 + beat + length * 0.94) - start
            mix.place(lead_note(note, gate), start, gain=0.08, pan=-0.3, reverb=0.35, delay=0.25)
    for bar, phrase in DURGUN_BELL_PLAN:
        for beat, length, note in phrase:
            gate_ms = int(round(length * DURATION_SECONDS / BEATS * 1000))
            mix.place(bell_note(note, gate_ms), frame_at(bar * 4 + beat), gain=0.135, pan=-0.18, reverb=0.6, delay=0.3)


def durgun_effects(mix: Mix) -> None:
    bar_frames = frame_at(4)
    for index, target_bar in enumerate((MAIN_A[0], MAIN_B[0])):
        riser = make_riser(bar_frames, 51 + index)
        mix.place(riser, frame_at(target_bar * 4) - bar_frames, gain=0.13, reverb=0.4)
        mix.place(make_impact(61 + index), frame_at(target_bar * 4), gain=0.26, reverb=0.12)
    mix.place(make_impact(63), frame_at(BREAK[0] * 4), gain=0.18, reverb=0.15)
    mix.place(make_impact(64), frame_at(OUTRO[0] * 4), gain=0.15, reverb=0.12)


# == Elektronik parçaların ortak armonisi ==========================================

# Kök (bas, MIDI), akor tonları (orta), bas dizisinin renk notası (kökten yarım ses).
CHORD = {
    "D": {"root": 38, "tones": (62, 65, 69), "colour": 10},   # Re minör
    "C": {"root": 36, "tones": (60, 64, 67), "colour": 10},   # Do majör
    "Bb": {"root": 34, "tones": (58, 62, 65), "colour": 9},   # Si bemol majör
    "A": {"root": 33, "tones": (57, 61, 64), "colour": 10},   # La majör (çeken)
    "Eb": {"root": 39, "tones": (63, 66, 70), "colour": 10},  # Mi bemol (Frigyen gerilimi)
}
TENSION = ("D", "C", "Bb", "A")  # savaş müziğinin gerilim döngüsü


def electro_kick() -> list:
    return make_kick(0.3, 71, 0.018, 0.075, 2.0, 0.5, 0.0025)


# == Parça 2: Akım Hattı ==========================================================

AKIM_HARMONY = (
    ("D",) * 4 + TENSION
    + TENSION * 3
    + ("Bb", "Bb", "C", "C", "D", "D", "A", "A")
    + TENSION + TENSION + ("D", "D", "Bb", "C") + TENSION
    + TENSION + ("D",) * 4
)
assert len(AKIM_HARMONY) == BARS

ROOT_NOTE, OCTAVE, FIFTH, COLOUR = "R", "O", "F", "C"
BASS_DRIVE = (ROOT_NOTE, ROOT_NOTE, OCTAVE, ROOT_NOTE, ROOT_NOTE, OCTAVE, ROOT_NOTE, OCTAVE,
              ROOT_NOTE, ROOT_NOTE, OCTAVE, ROOT_NOTE, ROOT_NOTE, OCTAVE, COLOUR, OCTAVE)
BASS_TURN = (ROOT_NOTE, OCTAVE, ROOT_NOTE, ROOT_NOTE, OCTAVE, ROOT_NOTE, FIFTH, OCTAVE,
             ROOT_NOTE, OCTAVE, ROOT_NOTE, ROOT_NOTE, OCTAVE, COLOUR, FIFTH, OCTAVE)

# Lead cümleleri: (cümle başından onaltılık, süre onaltılık, MIDI). Ritim 3+3+2.
K_CALL = ((0, 3, 74), (3, 3, 77), (6, 2, 81), (8, 3, 79), (11, 3, 77), (14, 2, 74),
          (16, 3, 76), (19, 3, 79), (22, 2, 76), (24, 6, 72))
K_PULL = ((0, 3, 77), (3, 3, 82), (6, 2, 81), (8, 3, 77), (11, 3, 74), (14, 2, 77),
          (16, 3, 76), (19, 3, 73), (22, 2, 76), (24, 6, 81))
K_SHARD = ((0, 1, 74), (1, 1, 77), (2, 1, 81), (3, 3, 84), (6, 2, 86), (8, 3, 84), (11, 3, 81), (14, 2, 79),
           (16, 3, 79), (19, 3, 76), (22, 2, 79), (24, 6, 84))
K_HIGH = ((0, 3, 82), (3, 3, 86), (6, 2, 82), (8, 3, 81), (11, 3, 77), (14, 2, 81),
          (16, 3, 81), (19, 3, 85), (22, 2, 81), (24, 6, 76))
K_HOLD = ((0, 3, 74), (3, 3, 77), (6, 2, 81), (8, 3, 79), (11, 3, 77), (14, 2, 74),
          (16, 3, 77), (19, 3, 74), (22, 2, 72), (24, 6, 74))
K_LIFT = ((0, 3, 74), (3, 3, 77), (6, 2, 82), (8, 6, 81), (14, 2, 77),
          (16, 3, 79), (19, 3, 76), (22, 2, 79), (24, 6, 84))
K_CLOSE = ((0, 3, 82), (3, 3, 81), (6, 2, 77), (8, 3, 74), (11, 3, 77), (14, 2, 74),
           (16, 3, 73), (19, 3, 76), (22, 2, 79), (24, 8, 81))
AKIM_LEAD_PLAN = (
    (12, K_CALL), (14, K_PULL), (18, K_HIGH),
    (28, K_SHARD), (30, K_PULL), (34, K_HIGH), (36, K_HOLD), (38, K_LIFT), (42, K_CLOSE),
)
GATE_332 = (1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0)


def akim_openness(bar: int) -> float:
    """Bas süzgecinin açıklığı (0 kapalı, 1 açık): girişte açılır, çıkışta kapanır."""
    section = section_of(bar)
    if section == "intro":
        return ramp(bar, 0, 7, 0.04, 0.6)
    if section == "a":
        return 0.7
    if section == "break":
        return ramp(bar, 24, 27, 0.08, 0.75)
    if section == "b":
        return 0.85 if bar < 36 else 1.0
    return ramp(bar, 44, 51, 0.8, 0.03)


def akim_bass(mix: Mix) -> None:
    """Onaltılık testere bas dizisi; her notada süzgeç açılıp kapanır."""
    bus = FilteredBus(140.0)
    gate = int(STEP * 0.8)
    release = seconds(0.016)
    for bar, name in enumerate(AKIM_HARMONY):
        section = section_of(bar)
        if section == "break" and bar < 24:
            continue
        chord = CHORD[name]
        openness = akim_openness(bar)
        pattern = BASS_TURN if bar % 2 and section in ("a", "b") else BASS_DRIVE
        level = {"intro": 0.9, "a": 1.0, "break": 0.7, "b": 1.0, "outro": 0.85}[section]
        for index, symbol in enumerate(pattern):
            # Dört ölçüde bir son iki adım boş: davul dolgusuna yer.
            if bar % 4 == 3 and index >= 14 and section in ("a", "b"):
                continue
            offset = {ROOT_NOTE: 0, OCTAVE: 12, FIFTH: 7, COLOUR: chord["colour"]}[symbol]
            accent = index in ACCENTS
            # Dizi kökün bir oktav üstünde çalar (küçük hoparlörde duyulur); alt kökü `akim_sub` tutar.
            voice = shaped(saw_voice(chord["root"] + 12 + offset, gate + release, seed=bar * 16 + index), seconds(0.002), release)
            sweep = cutoff_decay(
                len(voice), 130.0 + 480.0 * openness,
                (1100.0 + 2300.0 * openness) * (1.0 if accent else 0.42), 0.07,
            )
            bus.note(step_frame(bar, index), voice, level * (1.0 if accent else 0.72), sweep)
    mix.centre(bus.render(damping=0.4, drive=1.5), 0.3)


def akim_sub(mix: Mix) -> None:
    """Bas dizisinin altındaki kesintisiz kök: kulaklıkta ağırlık verir."""
    table = wave_table("saw", 3)
    for bar, name in enumerate(AKIM_HARMONY):
        section = section_of(bar)
        if section == "intro" and bar < 4:
            continue
        start = step_frame(bar, 0)
        frames = step_frame(bar + 1, 0) - start + seconds(0.05)
        voice = shaped(oscillator(table, midi_frequency(CHORD[name]["root"]), frames), seconds(0.03), seconds(0.08))
        mix.place(voice, start, gain=0.1 if section in ("a", "b") else 0.12, duck=True)


def akim_stabs(mix: Mix) -> None:
    """Güç akoru vuruşları: süper testere, kısa süzgeç zarfı."""
    bus = FilteredBus(600.0)
    gate = int(STEP * 1.1)
    release = seconds(0.13)
    for bar, name in enumerate(AKIM_HARMONY):
        section = section_of(bar)
        if section == "break" or (section == "intro" and bar < 4) or bar >= 48:
            continue
        hits = (3, 6, 11, 14) if section == "b" else (3, 11)
        if section == "intro":
            hits = (3,)
        level = {"intro": 0.5, "a": 0.85, "b": 1.0, "outro": 0.6}[section]
        root = CHORD[name]["root"]
        notes = [root + 24, root + 31, root + 36]
        if section == "b":
            notes.append(CHORD[name]["tones"][1])  # üçlü: dolgunluk
        for hit in hits:
            chord = [0.0] * (gate + release)
            for note in notes:
                chord = list(map(add, chord, super_saw(note, gate + release, seed=bar * 16 + hit)))
            total = len(chord)
            chord = [value * math.exp(-index / (total / 2.2)) for index, value in enumerate(chord)]
            shaped(chord, seconds(0.003), seconds(0.03))
            accent = 1.0 if hit in (3, 11) else 0.7
            bus.note(step_frame(bar, hit), chord, level * accent / len(notes), cutoff_decay(total, 700.0, 2400.0, 0.14))
    mix.spread(bus.render(damping=0.62), 0, 1.05, 0.6, reverb=0.22, delay=0.38)


def akim_pad(mix: Mix) -> None:
    """Ara bölüm: 3+3+2 kapılı süper testere akorları; süzgeç sekiz ölçüde açılır."""
    bus = silent()
    for bar in BREAK:
        tones = CHORD[AKIM_HARMONY[bar]]["tones"]
        start = step_frame(bar, 0)
        frames = step_frame(bar + 1, 0) - start + seconds(0.12)
        chord = [0.0] * frames
        for note in tones + (tones[0] + 12,):
            chord = list(map(add, chord, super_saw(note, frames, seed=900 + bar)))
        add_wrapped(bus, start, shaped(chord, seconds(0.02), seconds(0.12)), 0.25)
    cutoffs = array("f", repeat(400.0, FRAMES))
    first, last = step_frame(BREAK[0], 0), step_frame(BREAK[-1] + 1, 0)
    span = last - first
    cutoffs[first:last] = array("f", (380.0 + 2400.0 * (index / span) ** 1.6 for index in range(span)))
    filtered = state_filter(bus, cutoffs, 0.7)
    gate = gate_curve(GATE_332, BREAK, floor=0.06)
    mix.spread(list(map(mul, filtered, gate)), 0, 0.5, 0.7, reverb=0.3, delay=0.2)


def akim_lead(mix: Mix) -> None:
    for bar, phrase in AKIM_LEAD_PLAN:
        events = [
            (step_frame(bar, start), int(STEP * length * 0.92), note)
            for start, length, note in phrase
        ]
        start, line = glide_line(events, glide_ms=34.0)
        mix.spread(line, start, 0.24, 0.35, reverb=0.2, delay=0.34)


def akim_shards(mix: Mix) -> None:
    """Camsı üst arpej: arada onaltılık, ikinci ana bölümde sekizlik doku."""
    feel = random.Random(15)
    contour = (2, 1, 3, 0, 3, 2, 1, 2, 3, 1, 2, 0, 3, 2, 3, 1)
    for bar, name in enumerate(AKIM_HARMONY):
        section = section_of(bar)
        if section not in ("break", "b"):
            continue
        tones = CHORD[name]["tones"]
        ladder = (tones[0] + 12, tones[1] + 12, tones[2] + 12, tones[0] + 24)
        steps = range(16) if section == "break" else range(0, 16, 2)
        level = 0.24 if section == "break" else 0.15
        for index in steps:
            accent = 1.0 if index in ACCENTS else 0.6
            mix.place(
                glass_pluck(ladder[contour[index]], 300), step_frame(bar, index),
                gain=level * accent * (0.85 + 0.3 * feel.random()),
                pan=-0.5 if index % 4 < 2 else 0.5, reverb=0.3, delay=0.45,
            )


def akim_drums(mix: Mix) -> None:
    kick = electro_kick()
    snares = [make_metal_snare(81), make_metal_snare(82)]
    claps = [make_clap(83), make_clap(84)]
    closed = [make_hat(85, 0.022), make_hat(86, 0.026), make_hat(87, 0.02)]
    open_hat = make_hat(88, 0.13, 4600.0)
    blip = make_blip(1568.0, 0.02)
    zap = make_zap(2600.0, 160.0, 0.2)
    feel = random.Random(17)

    def hit(sample, bar, sixteenth, gain, pan=0.0, reverb=0.0, delay=0.0):
        if sample is not kick:
            gain *= 0.86 + 0.28 * feel.random()
        mix.place(sample, step_frame(bar, sixteenth), gain=gain, pan=pan, reverb=reverb, delay=delay)

    def kick_at(bar, sixteenth, gain=0.42):
        hit(kick, bar, sixteenth, gain)
        mix.kicks.append(step_frame(bar, sixteenth))

    def roll(bar, steps, low, high):
        for order, step in enumerate(steps):
            hit(snares[order % 2], bar, step, low + (high - low) * (order + 1) / len(steps), reverb=0.2)

    for bar in range(BARS):
        section = section_of(bar)
        if section == "intro":
            if bar >= 4:
                level = ramp(bar, 4, 7, 0.05, 0.14)
                for sixteenth in range(16):
                    hit(closed[sixteenth % 3], bar, sixteenth, level * (0.9, 0.35, 0.65, 0.35)[sixteenth % 4], pan=0.3)
            if bar == 7:
                roll(bar, range(8, 16), 0.05, 0.26)
                hit(zap, bar, 14, 0.16, pan=-0.3, reverb=0.3, delay=0.3)
        elif section in ("a", "b") or (section == "outro" and bar < 48):
            full = section in ("a", "b")
            # Elektro kalıp: kick 1, 2-ve-sonrası ve 3-ve; trampet 2 ve 4.
            for position in (0, 6, 10):
                kick_at(bar, position)
            if section == "b" and bar % 2:
                kick_at(bar, 15, 0.3)
            if full:
                for position in (4, 12):
                    hit(snares[bar % 2], bar, position, 0.4, reverb=0.22)
                    if section == "b":
                        hit(claps[bar % 2], bar, position, 0.26, reverb=0.3)
            hat_level = 0.21 if section == "b" else 0.19 if section == "a" else 0.13
            for sixteenth in range(16):
                hit(closed[sixteenth % 3], bar, sixteenth, hat_level * (0.5, 0.32, 0.95, 0.32)[sixteenth % 4], pan=0.3)
            if full:
                hit(open_hat, bar, 14, 0.11, pan=0.3, reverb=0.12)
                if section == "b":
                    hit(open_hat, bar, 6, 0.08, pan=0.3, reverb=0.12)
                    for position in (7, 15):
                        hit(blip, bar, position, 0.07, pan=-0.45, delay=0.5)
                if bar % 4 == 3:
                    roll(bar, range(12, 16) if bar % 8 == 3 else range(10, 16), 0.1, 0.3)
                    hit(zap, bar, 14, 0.14, pan=-0.3, reverb=0.3, delay=0.3)
                    if section == "b":
                        for thirty_second in (14.0, 14.5, 15.0, 15.5):
                            hit(closed[0], bar, thirty_second, 0.13, pan=0.3)
        elif section == "outro":
            level = ramp(bar, 48, 51, 0.11, 0.03)
            for sixteenth in range(16):
                hit(closed[sixteenth % 3], bar, sixteenth, level * (0.9, 0.35, 0.65, 0.35)[sixteenth % 4], pan=0.3)
        elif section == "break":
            if bar >= 24:
                for eighth in range(8):
                    hit(closed[eighth % 3], bar, eighth * 2, 0.07, pan=0.3)
            if bar == 26:
                roll(bar, range(0, 16, 2), 0.05, 0.14)
            if bar == 27:
                roll(bar, range(0, 8), 0.14, 0.22)
                roll(bar, [8 + index / 2 for index in range(16)], 0.2, 0.32)


def akim_effects(mix: Mix) -> None:
    bar_frames = step_frame(1, 0)
    for seed, target in ((91, MAIN_A[0]), (92, MAIN_B[0])):
        mix.place(make_riser(bar_frames, seed), step_frame(target, 0) - bar_frames, gain=0.15, reverb=0.3)
        mix.place(make_impact(seed + 10), step_frame(target, 0), gain=0.26, reverb=0.1)
    down = make_power_down(0.55)
    mix.place(down, step_frame(BREAK[0], 0) - len(down), gain=0.16, reverb=0.3, delay=0.3)
    mix.place(make_impact(95), step_frame(BREAK[0], 0), gain=0.16, reverb=0.15)
    # Elektrik: girişte, arada ve çıkışta uğultu ve kıvılcım.
    for seed, bars, level in ((96, range(0, 8), 1.0), (97, range(20, 26), 0.8), (98, range(48, 52), 0.9)):
        start = step_frame(bars[0], 0)
        frames = step_frame(bars[-1] + 1, 0) - start
        mix.place(shaped(make_crackle(frames, seed, 7.0), seconds(0.5), seconds(0.8)), start,
                  gain=0.075 * level, pan=0.4, reverb=0.25, delay=0.2)
        mix.place(shaped(make_hum(frames, seed), seconds(1.2), seconds(1.5)), start, gain=0.022 * level, pan=-0.3)


# == Parça 3: Çekirdek Odası =====================================================

PHRYGIAN = ("D", "D", "Eb", "D")
CEKIRDEK_HARMONY = (
    ("D",) * 8
    + PHRYGIAN + PHRYGIAN + TENSION
    + ("D",) * 8
    + PHRYGIAN + TENSION + PHRYGIAN + TENSION
    + PHRYGIAN + ("D",) * 4
)
assert len(CEKIRDEK_HARMONY) == BARS
# Savaş müziğinin onaltılık minör motoru (kökten yarım ses); her kökte paralel minör.
MOTOR = (0, 7, 3, 10, 0, 7, 12, 10)
# Savaş müziğindeki gerilim kümesi: küçük ikili ve triton.
CLUSTER = (12, 13, 18, 24)
# Siren cümleleri (dört ölçü; onaltılık): kökte uzun nota, üst komşuya kayış.
SIREN_FALL = ((0, 10, 74), (10, 6, 75), (16, 10, 72), (26, 6, 74), (32, 10, 70), (42, 6, 72), (48, 6, 76), (54, 10, 69))
SIREN_RISE = ((0, 10, 77), (10, 6, 79), (16, 10, 75), (26, 6, 77), (32, 10, 73), (42, 6, 75), (48, 5, 72), (53, 5, 76), (58, 6, 81))
CEKIRDEK_LEAD_PLAN = ((32, SIREN_FALL), (40, SIREN_RISE))
DATA_SCALE = (62, 65, 67, 69, 72, 74, 77, 79, 81, 84)  # Re minör pentatonik


def cekirdek_bass(mix: Mix) -> None:
    """Uzun, doygun alt bas; süzgeç ölçü içinde yavaşça nefes alır."""
    bus = silent()
    cutoffs = array("f", repeat(200.0, FRAMES))
    for bar, name in enumerate(CEKIRDEK_HARMONY):
        section = section_of(bar)
        if section == "intro" and bar < 2:
            continue
        root = CHORD[name]["root"]
        start = step_frame(bar, 0)
        frames = step_frame(bar + 1, 0) - start
        hits = ((0, 16),) if section in ("intro", "break") or bar >= 48 else ((0, 10), (10, 6))
        level = {"intro": 0.7, "a": 0.85, "break": 0.6, "b": 1.0, "outro": 0.65}[section]
        for offset, length in hits:
            gate = int(STEP * length * 0.96)
            voice = shaped(saw_voice(root, gate, detune_cents=9.0, seed=bar), seconds(0.012), seconds(0.06))
            add_wrapped(bus, step_frame(bar, offset), voice, level)
        depth = {"intro": 0.35, "a": 0.8, "break": 0.3, "b": 1.0, "outro": 0.5}[section]
        wobble = TWO_PI * 2.0 / frames
        write_wrapped(cutoffs, start, [
            200.0 + depth * 650.0 * (0.5 - 0.5 * math.cos(wobble * index)) for index in range(frames)
        ])
    mix.centre(saturated(circular_filter(bus, cutoffs, 0.45), 2.2), 0.2)


def cekirdek_pulse(mix: Mix) -> None:
    """Kapılı reaktör darbesi: kare dalga, her onaltılıkta söner; vuruşun 1. ve 4. onaltılığı vurgulu."""
    bus = FilteredBus(500.0)
    gate = int(STEP * 0.95)
    for bar, name in enumerate(CEKIRDEK_HARMONY):
        section = section_of(bar)
        if section == "break":
            continue
        level = {"intro": ramp(bar, 0, 7, 0.25, 0.7), "a": 0.9, "b": 1.0, "outro": ramp(bar, 44, 51, 0.8, 0.25)}[section]
        frequency = midi_frequency(CHORD[name]["root"] + 12)
        table = shaped_table("square", frequency, 40)
        for sixteenth in range(16):
            accent = sixteenth % 4 in (0, 3)
            voice = oscillator(table, frequency, gate)
            decay = gate / (3.2 if accent else 4.6)
            voice = [value * math.exp(-index / decay) for index, value in enumerate(voice)]
            shaped(voice, seconds(0.0015), seconds(0.006))
            bus.note(step_frame(bar, sixteenth), voice, level * (1.0 if accent else 0.55),
                     cutoff_decay(gate, 520.0, 2200.0 if accent else 1100.0, 0.04))
    mix.place(bus.render(damping=0.42, drive=1.2), 0, gain=0.38, pan=-0.1, duck=True, reverb=0.08)


def cekirdek_motor(mix: Mix) -> None:
    """Onaltılık minör motor: savaş müziğindeki dizi, menü temposunda; süzgeç yavaşça açılıp kapanır."""
    bus = FilteredBus(600.0)
    gate = int(STEP * 0.7)
    release = seconds(0.03)
    sweep_period = step_frame(8, 0)
    for bar, name in enumerate(CEKIRDEK_HARMONY):
        section = section_of(bar)
        active = section == "b" or bar in range(12, 20) or bar in range(44, 48)
        if not active:
            continue
        level = 1.0 if section == "b" else 0.7
        root = CHORD[name]["root"] + 24
        for sixteenth in range(16):
            start = step_frame(bar, sixteenth)
            voice = shaped(saw_voice(root + MOTOR[sixteenth % 8], gate + release, detune_cents=5.0, seed=bar + sixteenth),
                           seconds(0.002), release)
            voice = [value * math.exp(-index / (gate * 1.3)) for index, value in enumerate(voice)]
            openness = 0.5 - 0.5 * math.cos(TWO_PI * start / sweep_period)
            accent = sixteenth in ACCENTS
            bus.note(start, voice, level * (1.0 if accent else 0.68),
                     cutoff_decay(len(voice), 480.0 + 700.0 * openness, 500.0 + 1500.0 * openness, 0.05))
    mix.spread(bus.render(damping=0.5), 0, 0.42, 0.5, reverb=0.15, delay=0.3)


def cekirdek_cluster(mix: Mix) -> None:
    """Ara bölümün gerilim yatağı: küçük ikili ve triton; süzgeç açılır, hafif titreşir."""
    bus = silent()
    start = step_frame(BREAK[0], 0)
    frames = step_frame(BREAK[-1] + 1, 0) - start
    root = CHORD["D"]["root"]
    for index, offset in enumerate(CLUSTER):
        voice = super_saw(root + offset, frames, seed=700 + index)
        add_wrapped(bus, start, voice, (0.3, 0.22, 0.22, 0.14)[index])
    cutoffs = array("f", repeat(300.0, FRAMES))
    cutoffs[start:start + frames] = array("f", (300.0 + 1500.0 * (index / frames) ** 1.8 for index in range(frames)))
    filtered = state_filter(bus, cutoffs, 0.75)
    tremolo = TWO_PI * 4.0 / SAMPLE_RATE
    swell = [
        value * (0.82 + 0.18 * math.sin(tremolo * index))
        for index, value in enumerate(filtered[start:start + frames])
    ]
    mix.spread(shaped(swell, seconds(2.5), seconds(0.25)), start, 0.46, 0.7, reverb=0.35)


def cekirdek_lead(mix: Mix) -> None:
    for bar, phrase in CEKIRDEK_LEAD_PLAN:
        events = [
            (step_frame(bar, start), int(STEP * length * 0.97), note)
            for start, length, note in phrase
        ]
        start, line = glide_line(events, glide_ms=120.0, duty_centre=0.3, release_ms=140.0)
        mix.spread(line, start, 0.27, 0.35, reverb=0.3, delay=0.4)


def cekirdek_signals(mix: Mix) -> None:
    """Sonar sinyali ve veri akışı: melodi yerine doku; tekrar eden bir ezgi kurmaz."""
    ping = make_blip(880.0, 0.11)
    answer = make_blip(1174.7, 0.09)
    for bar in range(BARS):
        section = section_of(bar)
        if bar % 2 == 0 and section != "b":
            mix.place(ping, step_frame(bar, 4), gain=0.2, pan=0.35, reverb=0.4, delay=0.6)
        if bar % 4 == 2 and section in ("a", "break", "outro"):
            mix.place(answer, step_frame(bar, 11), gain=0.14, pan=-0.4, reverb=0.4, delay=0.6)
    walker = random.Random(33)
    position = 4
    blips = {}
    for bar in range(BARS):
        section = section_of(bar)
        if section == "intro" or (section == "a" and bar < 12) or bar >= 48:
            continue
        level = {"a": 0.15, "break": 0.17, "b": 0.13, "outro": 0.1}[section]
        for sixteenth in range(16):
            # Rastgele yürüyüş: nota bir öncekinin yakınında kalır.
            position = max(0, min(len(DATA_SCALE) - 1, position + walker.choice((-2, -1, -1, 0, 1, 1, 2))))
            if walker.random() < 0.42:
                continue
            note = DATA_SCALE[position]
            if note not in blips:
                blips[note] = crush(glass_pluck(note, 140), 10, 3)
            mix.place(blips[note], step_frame(bar, sixteenth), gain=level * (0.7 + 0.6 * walker.random()),
                      pan=walker.uniform(-0.75, 0.75), reverb=0.2, delay=0.35)


def cekirdek_drums(mix: Mix) -> None:
    kick = electro_kick()
    heartbeat = make_heartbeat(kick)
    snares = [make_metal_snare(51), make_metal_snare(52)]
    clap = make_clap(53)
    closed = [make_hat(54, 0.02), make_hat(55, 0.024), make_hat(56, 0.018)]
    glitch = crush(make_hat(57, 0.03, 3800.0), 6, 3)
    open_hat = make_hat(58, 0.12, 4600.0)
    rim = make_blip(1975.5, 0.012)
    feel = random.Random(19)

    def hit(sample, bar, sixteenth, gain, pan=0.0, reverb=0.0, delay=0.0):
        if sample is not kick and sample is not heartbeat:
            gain *= 0.86 + 0.28 * feel.random()
        mix.place(sample, step_frame(bar, sixteenth), gain=gain, pan=pan, reverb=reverb, delay=delay)

    def kick_at(bar, sixteenth, gain=0.45):
        hit(kick, bar, sixteenth, gain)
        mix.kicks.append(step_frame(bar, sixteenth))

    for bar in range(BARS):
        section = section_of(bar)
        if section in ("a", "b") or bar in range(44, 48):
            full = section in ("a", "b")
            for position in (0, 10):
                kick_at(bar, position)
            if section == "b" or bar % 2:
                kick_at(bar, 7, 0.32)
            if full:
                # Yarı tempo: trampet üçüncü vuruşta.
                hit(snares[bar % 2], bar, 8, 0.46, reverb=0.3)
                if section == "b":
                    hit(clap, bar, 8, 0.2, reverb=0.3)
                    hit(open_hat, bar, 4, 0.07, pan=0.3, reverb=0.1)
                    hit(open_hat, bar, 12, 0.08, pan=0.3, reverb=0.1)
                    if bar % 4 == 3:
                        hit(snares[0], bar, 15, 0.2, reverb=0.25)
                for position in (3, 13):
                    hit(rim, bar, position, 0.06, pan=-0.4, delay=0.4)
            hat_level = 0.19 if section == "b" else 0.16 if section == "a" else 0.1
            for sixteenth in range(16):
                hit(closed[sixteenth % 3], bar, sixteenth, hat_level * (0.45, 0.3, 0.9, 0.3)[sixteenth % 4], pan=0.28)
            if full and bar % 2:
                for thirty_second in (14.0, 14.5, 15.0, 15.5):
                    hit(glitch, bar, thirty_second, 0.1, pan=-0.2)
        elif section == "intro" and bar >= 4:
            for eighth in range(8):
                hit(closed[eighth % 3], bar, eighth * 2, ramp(bar, 4, 7, 0.03, 0.08), pan=0.28)
            if bar == 7:
                for order, step in enumerate(range(10, 16)):
                    hit(snares[order % 2], bar, step, 0.08 + 0.03 * order, reverb=0.25)
        else:
            # Ara, son dört ve ilk dört ölçü: kalp atışı (savaş müziğindeki baskı
            # katmanı). Döngü dikişinin iki yanında kesintisiz sürer.
            for position, level in ((0, 0.42), (3, 0.3)):
                hit(heartbeat, bar, position, level)
            if bar == BREAK[-1]:
                for order, step in enumerate([index / 2 for index in range(16, 32)]):
                    hit(snares[order % 2], bar, step, 0.07 + 0.015 * order, reverb=0.25)


def cekirdek_effects(mix: Mix) -> None:
    bar_frames = step_frame(1, 0)
    for seed, target, level in ((41, MAIN_A[0], 0.8), (42, MAIN_B[0], 1.0)):
        mix.place(make_riser(bar_frames, seed), step_frame(target, 0) - bar_frames, gain=0.14 * level, reverb=0.3)
        mix.place(make_impact(seed + 10), step_frame(target, 0), gain=0.28, reverb=0.1)
    down = make_power_down(0.9)
    mix.place(down, step_frame(BREAK[0], 0) - len(down), gain=0.2, reverb=0.35, delay=0.3)
    mix.place(make_impact(45), step_frame(BREAK[0], 0), gain=0.2, reverb=0.15)
    mix.place(make_zap(2200.0, 140.0, 0.25), step_frame(MAIN_B[0] - 1, 14), gain=0.14, pan=-0.3, reverb=0.3, delay=0.3)
    for seed, bars, level in ((46, range(0, 8), 1.0), (47, range(20, 28), 1.0), (48, range(44, 52), 0.8)):
        start = step_frame(bars[0], 0)
        frames = step_frame(bars[-1] + 1, 0) - start
        mix.place(shaped(make_crackle(frames, seed, 6.0), seconds(0.5), seconds(0.8)), start,
                  gain=0.11 * level, pan=-0.4, reverb=0.3, delay=0.25)
        mix.place(shaped(make_hum(frames, seed), seconds(1.2), seconds(1.5)), start, gain=0.03 * level, pan=0.3)


# == Çıkış ====================================================================

@dataclass(frozen=True)
class Track:
    key: str
    filename: str
    title: str
    steps: tuple
    # Kick vurduğunda ped ve basın kısılma derinliği ve toparlanma süresi (sn).
    duck_depth: float
    duck_recovery: float
    reverb_return: float
    echo_return: float
    # Sınırlayıcıya giren tepe seviyesi; büyüdükçe kick daha çok yuvarlanır.
    drive: float = 1.35


TRACKS = (
    Track(
        "durgun", "menu_v8_01_durgun_devre.wav", "Durgun Devre",
        (durgun_pad, durgun_bass, durgun_drums, durgun_arp, durgun_melodies, durgun_effects),
        duck_depth=0.42, duck_recovery=0.085, reverb_return=0.06, echo_return=0.8,
    ),
    Track(
        "akim", "menu_v8_02_akim_hatti.wav", "Akım Hattı",
        (akim_bass, akim_sub, akim_stabs, akim_pad, akim_lead, akim_shards, akim_drums, akim_effects),
        duck_depth=0.5, duck_recovery=0.08, reverb_return=0.065, echo_return=0.85,
    ),
    Track(
        "cekirdek", "menu_v8_03_cekirdek_odasi.wav", "Çekirdek Odası",
        (cekirdek_bass, cekirdek_pulse, cekirdek_motor, cekirdek_cluster, cekirdek_lead,
         cekirdek_signals, cekirdek_drums, cekirdek_effects),
        duck_depth=0.55, duck_recovery=0.08, reverb_return=0.05, echo_return=0.8,
    ),
)


def render(track: Track) -> tuple[array, array]:
    mix = Mix()
    for step in track.steps:
        step(mix)
    return master(
        mix, duck_depth=track.duck_depth, duck_recovery=track.duck_recovery,
        reverb_return=track.reverb_return, echo_return=track.echo_return, drive=track.drive,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    keys = [track.key for track in TRACKS]
    parser.add_argument("tracks", nargs="*", metavar="parça",
                        help=f"Üretilecek parçalar: {', '.join(keys)} (varsayılan: hepsi).")
    parser.add_argument("--output-dir", type=Path, default=AUDIO_DIR)
    args = parser.parse_args()
    unknown = sorted(set(args.tracks) - set(keys))
    if unknown:
        parser.error(f"Bilinmeyen parça: {', '.join(unknown)}")
    for track in TRACKS:
        if args.tracks and track.key not in args.tracks:
            continue
        started = time.time()
        left, right = render(track)
        output = args.output_dir / track.filename
        write_wav(output, left, right, output_scale(left, right))
        # ASCII: konsol kod sayfası ne olursa olsun üretim yarıda kesilmesin.
        print(f"[GRIDSHARD] {output.name}: {time.time() - started:.0f} sn", flush=True)


if __name__ == "__main__":
    main()
