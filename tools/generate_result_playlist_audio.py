"""Original finite victory/defeat cues using the menu v8 / battle v9 voices.

No realtime synthesis: render 10s / 6s stereo WAVs, then encode mobile audio.
Unlike battle loops these phrases never wrap their note or reverb tails.
"""
from __future__ import annotations

import argparse
from array import array
from pathlib import Path

import menu_playlist_synth as synth
from generate_combat_playlist_audio import Grid, Stem, write

ROOT = Path(__file__).resolve().parents[1]


class ResultStem(Stem):
    def _place(self, signal, start, gain, pan):
        # The base instrument/room sends are shared; the final chord decays
        # naturally at the end rather than appearing at the start of the cue.
        import math
        angle = (pan + 1) * math.pi / 4
        for bus, level in ((self.left, gain * math.cos(angle)), (self.right, gain * math.sin(angle))):
            first = max(0, start)
            count = min(len(signal) - max(0, -start), len(bus) - first)
            if count > 0:
                offset = max(0, -start)
                bus[first:first + count] = array("f", (
                    value + sample * level for value, sample in
                    zip(bus[first:first + count], signal[offset:offset + count])
                ))


def render(victory: bool):
    # Five bars at 120 = 10 seconds; three bars at 120 = 6 seconds.
    grid = Grid(120, 5 if victory else 3)
    stem = ResultStem(grid)
    root = 38  # D2, the common menu/battle tonal centre.
    chords = ((38, 41, 45), (34, 38, 41), (36, 40, 43), (38, 42, 45)) if victory else ((38, 41, 45), (34, 38, 41), (38, 41, 45))
    for index, notes in enumerate(chords):
        beat = index * 4
        left, right = synth.pad_chord(tuple(note + 12 for note in notes), grid.at(3.6), 1500 if victory else 850, 410 + index)
        stem.add(left, beat, .09, pan=-.5, room=.3)
        stem.add(right, beat, .09, pan=.5, room=.3)
        stem.add(synth.bass_note(notes[0], grid.at(2.6), 6), beat, .33)
        for offset, note in enumerate(notes):
            stem.add(synth.glass_pluck(note + 24, 520), beat + offset * .5, .30, pan=(offset - 1) * .28, echo=.25, room=.22)
    melody = ((0, 62), (.5, 65), (1.5, 69), (3, 74), (5, 72), (6, 69), (8, 70), (9, 74), (10.5, 77), (12, 74)) if victory else ((0, 69), (1.5, 65), (3, 62), (5, 60), (7, 57), (8, 62))
    for beat, note in melody:
        stem.add(synth.lead_note(note, grid.at(1.1 if victory else 1.5)), beat, .23 if victory else .19, echo=.22, room=.3)
    kick = synth.make_kick(.30, 71, .018, .075, 2.0, .22, .0025)
    for beat in ((0, 2, 4, 6, 8, 10, 12) if victory else (0, 4)):
        stem.add(kick, beat, .50 if victory else .25)
    if victory:
        snare = synth.make_metal_snare(83)
        for beat in (1, 3, 5, 7, 9, 11):
            stem.add(snare, beat, .16, room=.15)
        stem.add(synth.bell_note(86, 850), 12, .17, room=.3)
    # Render at the same perceived level as the menu family, then taper the
    # phrase's tail. No new sustained sound starts in the final bar.
    sides = stem.finish(-20.5, -5.5)
    attack, release = synth.seconds(.015), synth.seconds(1.25)
    for side in sides:
        for i in range(attack):
            side[i] *= i / attack
        for i in range(release):
            side[-release + i] *= (1 - i / (release - 1)) ** 1.5
    return sides


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=ROOT / "client/assets/audio")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for won, name in ((True, "victory_v9_devre.wav"), (False, "defeat_v9_devre.wav")):
        sides = render(won)
        write(args.output_dir / name, sides)


if __name__ == "__main__":
    main()
