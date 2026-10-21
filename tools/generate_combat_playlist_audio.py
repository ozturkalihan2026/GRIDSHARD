"""Menü v8 ses ailesinden özgün eşleştirme ve yedi katmanlı savaş müziği.

Yalnız standart Python; enstrümanlar menu_playlist_synth'ten gelir. Menü
master'ları değişmez. Gerçek zamanlı sentez yok: oyuna hazır WAV/OGG/AAC girer.
Eşleştirme: 120 BPM, 16 ölçü/32 sn. Savaş: 128 BPM, 16 ölçü/30 sn.
Savaş stem'leri tek zaman ızgarasında; kuyruklar başa sarar, katman sayısı ve
PCM bütçesi büyümez. --preview-dir ile oyun kazançlarında dinleme dosyaları.
"""
from __future__ import annotations

import argparse
import json
import math
from array import array
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import menu_playlist_synth as synth

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "client/assets/audio"
RATE = synth.SAMPLE_RATE
IDS = ("sub", "pulse", "percussion", "ostinato", "shards", "dissonance", "pressure")
STEMS = tuple(f"battle_v9_{i:02d}_{name}.wav" for i, name in enumerate(IDS, 1))
MATCH = "matchmaking_v9_akis.wav"
ROOTS = (38, 38, 36, 36, 34, 34, 33, 33, 38, 38, 34, 36, 34, 36, 33, 33)
GAINS = ((.41, .10), (.35, .14), (.31, .18), (.28, .20), (.18, .24), (.15, .27), (.07, .36))
# Stable average levels leave summation headroom for the existing game mixer.
STEM_RMS = (-25.0, -27.5, -25.0, -28.0, -31.0, -31.0, -32.0)


@dataclass(frozen=True)
class Grid:
    bpm: int
    bars: int = 16

    @property
    def frames(self) -> int:
        return round(self.bars * 4 * 60 / self.bpm * RATE)

    def at(self, beat: float) -> int:
        return round(beat * 60 / self.bpm * RATE)


class Stem:
    """Fixed-size stereo bus; no menu-grid globals are modified."""

    def __init__(self, grid: Grid):
        self.grid = grid
        self.left = array("f", bytes(4 * grid.frames))
        self.right = array("f", bytes(4 * grid.frames))

    def add(self, signal, beat: float, gain: float, pan: float = 0,
            echo: float = 0, room: float = 0) -> None:
        start = self.grid.at(beat)
        self._place(signal, start, gain, pan)
        # Musical dotted-eighth echo, plus a small diffuse room. All sends
        # wrap before encoding so a loop never truncates a tail.
        for tap in range(1, 4):
            if echo:
                self._place(signal, start + self.grid.at(.75 * tap),
                            gain * echo * .45 ** (tap - 1), (-1 if tap % 2 else 1) * .48)
        for seconds, side, decay in ((.037, -.65, .5), (.061, .65, .38), (.113, -.35, .23)):
            if room:
                self._place(signal, start + round(seconds * RATE), gain * room * decay, side)

    def _place(self, signal, start: int, gain: float, pan: float) -> None:
        angle = (pan + 1) * math.pi / 4
        for bus, level in ((self.left, gain * math.cos(angle)), (self.right, gain * math.sin(angle))):
            # Sample tails are much shorter than a track, but chunking also
            # makes the helper safe for a signal longer than one loop.
            offset = 0
            while offset < len(signal):
                first = (start + offset) % self.grid.frames
                count = min(len(signal) - offset, self.grid.frames - first)
                bus[first:first + count] = array("f", (
                    value + sample * level for value, sample in
                    zip(bus[first:first + count], signal[offset:offset + count])
                ))
                offset += count

    def finish(self, rms_db: float, peak_db: float = -12) -> tuple[array, array]:
        sides = []
        for bus in (self.left, self.right):
            # DC removal; soft peak rounding without brick-wall clipping.
            mean = sum(bus) / len(bus)
            side = array("f", (math.tanh((value - mean) * 1.12) for value in bus))
            # A 3 ms endpoint correction, not a fade to silence. Correct only
            # the tiny waveform seam and keep the exact number of beats.
            count = round(.003 * RATE)
            difference = side[-1] - side[0]
            for i in range(count):
                side[-count + i] -= difference * ((i + 1) / count) ** 2
            sides.append(side)
        peak = max(max(max(s), -min(s)) for s in sides)
        rms = math.sqrt(sum(sum(v * v for v in s) for s in sides) / (2 * len(sides[0])))
        scale = min(10 ** (peak_db / 20) / max(peak, 1e-9), 10 ** (rms_db / 20) / max(rms, 1e-9))
        return tuple(array("f", (v * scale for v in side)) for side in sides)


@lru_cache(maxsize=256)
def bass(note: int, gate: int, bright: int = 6) -> tuple:
    return tuple(synth.bass_note(note, gate, bright))


@lru_cache(maxsize=256)
def pulse(note: int, gate: int, brightness: int) -> tuple:
    voice = synth.shaped(synth.saw_voice(note, gate + synth.seconds(.03), seed=91),
                         synth.seconds(.003), synth.seconds(.03))
    filtered = synth.state_filter(voice, synth.cutoff_decay(len(voice), 280, brightness, .055), .72)
    return tuple(synth.saturated(filtered, 1.2))


def chord(root: int) -> tuple[int, ...]:
    # A7 resolves to D minor. C and Bb are major; D is minor.
    third = 3 if root == 38 else 4
    seventh = 10 if root in (38, 33) else 11
    return root + 12, root + 12 + third, root + 19, root + 12 + seventh


def drums(grid: Grid, *, waiting: bool = False) -> Stem:
    stem = Stem(grid)
    kick = synth.make_kick(.30, 71, .018, .075, 2.0, .22, .0025)
    snare = synth.make_metal_snare(83)
    clap = synth.make_clap(92)
    hats = [synth.make_hat(104 + i, .026 + .003 * i, 4600) for i in range(3)]
    open_hat = synth.make_hat(114, .10, 4000)
    for bar in range(grid.bars):
        quiet = waiting and bar < 4 or not waiting and bar in (8, 9)
        kicks = (0, 2.5) if quiet else (0, 1.5, 2, 3.5)
        for b in kicks:
            stem.add(kick, bar * 4 + b, .70 if waiting else .88)
        if not quiet:
            for b in (1, 3):
                stem.add(snare, bar * 4 + b, .30 if waiting else .46, room=.18)
                stem.add(clap, bar * 4 + b + .018, .10 if waiting else .17, pan=-.15)
        for step in range(0, 16, 4 if quiet else 2):
            accent = .65 if step % 4 == 0 else 1
            stem.add(hats[step % 3], bar * 4 + step / 4, .18 * accent, pan=.28)
        if bar % 4 == 3:
            stem.add(open_hat, bar * 4 + 3.5, .16, pan=.32)
            if not waiting or bar >= 8:
                for index, step in enumerate((14, 15, 15.5)):
                    stem.add(snare, bar * 4 + step / 4, .09 + index * .04, pan=-.16 + index * .16)
    return stem


def compose(grid: Grid, layer: str, *, waiting: bool = False) -> Stem:
    if layer == "percussion":
        return drums(grid, waiting=waiting)
    stem = Stem(grid)
    for bar, root in enumerate(ROOTS):
        beat = bar * 4
        airy = (waiting and bar < 4) or (not waiting and bar in (8, 9))
        lift = bar >= 10
        if layer == "sub":
            for start, length, octave in ((0, 1.30, 0), (1.5, .38, 0), (2, .85, 0), (3.25, .52, 12)):
                stem.add(bass(root + octave, grid.at(length), 4), beat + start, .44 if airy else .58)
        elif layer == "pulse":
            steps = (0, 3, 6, 8, 11, 14) if airy else range(16)
            pattern = (0, 0, 12, 0, 7, 12, 0, 12, 0, 7, 12, 0, 0, 12, 7, 12)
            for step in steps:
                if bar % 4 == 3 and step > 13:
                    continue
                accent = step in (0, 3, 6, 8, 11, 14)
                level = .40 if accent else .20
                stem.add(pulse(root + 12 + pattern[(step + (2 if lift else 0)) % 16],
                               grid.at(.16), 1250 if airy else 2200), beat + step / 4, level,
                         pan=-.08 if step % 2 else .08, echo=.08)
        elif layer == "ostinato":
            if airy:
                continue  # breathe instead of a continuous eight-note alarm
            offsets = (0, 7, 3 if root == 38 else 4, 10, 12, 7, 10, 3 if root == 38 else 4)
            for step in (0, 3, 6, 8, 11, 14):
                pitch = root + 24 + offsets[(step // 2 + bar) % len(offsets)]
                stem.add(pulse(pitch, grid.at(.24), 2500 if lift else 1800), beat + step / 4,
                         .27 if step in (0, 8) else .18, pan=(-.3 if step % 2 else .3), echo=.25, room=.18)
            # New call/answer melody, with the menu's soft lead and rests.
            if bar % 4 in (1, 3):
                third = 3 if root == 38 else 4
                contour = ((0, .7, 12), (1, .45, 7), (1.75, .8, third), (3, .65, 7))
                if lift:
                    contour = ((.5, .45, third), (1.25, .5, 7), (2, 1.3, 12))
                for offset, length, interval in contour:
                    stem.add(synth.lead_note(root + 24 + interval, grid.at(length)), beat + offset,
                             .16, pan=-.10, echo=.26, room=.25)
        elif layer == "shards":
            tones = chord(root)
            for index, offset in enumerate((.5, 1.25, 2.5, 3.25) if lift else (1.5, 3.25)):
                note = tones[(index + bar) % len(tones)] + 12
                stem.add(synth.glass_pluck(note, 420), beat + offset, .35,
                         pan=(-.45 if index % 2 else .45), echo=.36, room=.25)
            if bar in (3, 7, 11, 15):
                stem.add(synth.bell_note(root + 31, 350), beat + 2.5, .18, pan=.2, room=.35)
        elif layer == "dissonance":
            # The old sustained tritone is replaced by menu-style pad colour.
            # Pressure adds maj7 / minor9 tension without a constant siren.
            notes = chord(root)
            left, right = synth.pad_chord(notes, grid.at(3.7), 1250 if lift else 950, 1300 + bar)
            stem.add(left, beat, .055, pan=-.55, room=.32)
            stem.add(right, beat, .055, pan=.55, room=.32)
            if bar in (6, 7, 14, 15):
                stem.add(synth.glass_pluck(root + 37, 620), beat + 3, .14, pan=-.2, echo=.25)
        elif layer == "pressure":
            heartbeat = synth.make_heartbeat(synth.make_kick(.25, 31, .02, .07, 1.7, .06, .003))
            for offset in (0, .4, 2, 2.4):
                stem.add(heartbeat, beat + offset, .5 if offset % 1 == 0 else .25)
            for offset in (1.5, 3.5):
                stem.add(synth.make_blip(synth.midi_frequency(root + 36), .045), beat + offset,
                         .24, pan=.25, echo=.18)
            if bar % 4 == 3:
                signal = synth.make_riser(grid.at(1), 700 + bar)
                stem.add(signal, beat + 3, .06, pan=-.15)
        else:
            raise ValueError(layer)
    return stem


def metrics(sides: tuple[array, array]) -> dict:
    peak = max(max(max(s), -min(s)) for s in sides)
    rms = math.sqrt(sum(sum(v * v for v in s) for s in sides) / (2 * len(sides[0])))
    mono = math.sqrt(sum(((a + b) / 2) ** 2 for a, b in zip(*sides)) / len(sides[0]))
    return {"seconds": len(sides[0]) / RATE,
            "peak_dbfs": round(20 * math.log10(max(peak, 1e-12)), 3),
            "rms_dbfs": round(20 * math.log10(max(rms, 1e-12)), 3),
            "mono_loss_db": round(20 * math.log10(max(mono, 1e-12) / rms), 3),
            "seam_delta": max(abs(s[-1] - s[0]) for s in sides)}


def write(path: Path, sides: tuple[array, array]) -> None:
    synth.write_wav(path, *sides, scale=1)
    print(f"{path.name}: {json.dumps(metrics(sides))}", flush=True)


def render_all(output: Path, previews: Path | None) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    battle = []
    report = {"instruments": "menu_playlist_synth", "battle_bpm": 128,
              "matchmaking_bpm": 120, "files": {}}
    grid = Grid(128)
    for filename, name, level in zip(STEMS, IDS, STEM_RMS):
        print(f"Rendering {name}...", flush=True)
        sides = compose(grid, name).finish(level)
        write(output / filename, sides)
        battle.append(sides)
        report["files"][filename] = metrics(sides)
    waiting = Stem(Grid(120))
    for name, level in (("sub", .75), ("pulse", .60), ("percussion", .62), ("shards", .50), ("dissonance", .70)):
        part = compose(waiting.grid, name, waiting=True)
        for target, source in ((waiting.left, part.left), (waiting.right, part.right)):
            for i, value in enumerate(source):
                target[i] += value * level
    match_sides = waiting.finish(-22.6, -6)
    write(output / MATCH, match_sides)
    report["files"][MATCH] = metrics(match_sides)
    if previews:
        previews.mkdir(parents=True, exist_ok=True)
        write(previews / "Eslesme-Akis.wav", match_sides)
    # At default musicVolume .70, with unchanged bus / per-stem gains. Check
    # maximum volume too, before the runtime limiter, including low-memory mode.
    for label, pressure, count in (("normal", .32, 5), ("pressure", .8, 6), ("critical", 1, 7), ("low_memory", 1, 7)):
        mixed = [array("f", bytes(4 * grid.frames)), array("f", bytes(4 * grid.frames))]
        for i in range(count):
            if label == "low_memory" and IDS[i] not in ("sub", "pulse", "percussion", "pressure"):
                continue
            gain = .72 * 2.85 * (GAINS[i][0] + GAINS[i][1] * pressure)
            for target, source in zip(mixed, battle[i]):
                for j, value in enumerate(source):
                    target[j] += value * gain
        report[label] = metrics(tuple(mixed))
        if previews and label in ("normal", "critical"):
            sides = tuple(array("f", (v * .70 for v in side)) for side in mixed)
            write(previews / ("Savas-Devre-Hucumu.wav" if label == "normal" else "Savas-Kritik-Katmanlar.wav"), sides)
    if previews:
        (previews / "audio-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=AUDIO)
    parser.add_argument("--preview-dir", type=Path)
    args = parser.parse_args()
    render_all(args.output_dir, args.preview_dir)


if __name__ == "__main__":
    main()
