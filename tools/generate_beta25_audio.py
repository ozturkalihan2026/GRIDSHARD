from __future__ import annotations

import math
import wave
from array import array
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = ROOT / "client" / "assets" / "audio"
SAMPLE_RATE = 22_050
DURATION_SECONDS = 32.0
TARGET_PEAK = 10 ** (-6 / 20)


@dataclass(frozen=True)
class TrackSpec:
    filename: str
    beats: int
    intensity: float
    bass_octave: int
    glass_octave: int
    critical: bool = False


TRACKS = (
    TrackSpec("battle_fracture_v5.wav", 68, 0.82, 1, 5),
    TrackSpec("critical_shard_v5.wav", 68, 0.72, 2, 6, critical=True),
)

# D–A–C–F is the Shard motif. The 3+3+2 gate accent is shared by every
# state so the soundtrack stays identifiable when the arrangement changes.
SHARD_MOTIF = (0, 7, 10, 3)
BASS_STEPS = (0, -2, 3, -5)
GATE_ACCENTS = (1.0, 0.54, 0.68, 0.54, 0.88, 0.54, 0.76, 0.58)


def midi_frequency(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def edge_window(sample_index: int, frame_count: int) -> float:
    edge_frames = int(SAMPLE_RATE * 0.012)
    if sample_index < edge_frames:
        return math.sin((sample_index / edge_frames) * math.pi / 2) ** 2
    remaining = frame_count - 1 - sample_index
    if remaining < edge_frames:
        return math.sin((remaining / edge_frames) * math.pi / 2) ** 2
    return 1.0


def synthesize(spec: TrackSpec) -> array:
    frame_count = int(SAMPLE_RATE * DURATION_SECONDS)
    beat_seconds = DURATION_SECONDS / spec.beats
    eighth_seconds = beat_seconds / 2.0
    root_midi = 38  # D2
    samples = array("f")

    for frame in range(frame_count):
        t = frame / SAMPLE_RATE
        beat_position = t / beat_seconds
        beat_index = int(beat_position)
        beat_phase = beat_position - beat_index
        eighth_position = t / eighth_seconds
        eighth_index = int(eighth_position)
        eighth_phase = eighth_position - eighth_index

        bass_note = root_midi + BASS_STEPS[(beat_index // 4) % 4]
        bass_frequency = midi_frequency(bass_note + 12 * (spec.bass_octave - 2))
        bass_envelope = math.exp(-3.9 * beat_phase)
        bass = (
            math.sin(2 * math.pi * bass_frequency * t)
            + 0.22 * math.sin(4 * math.pi * bass_frequency * t)
        ) * bass_envelope

        motif_note = (
            root_midi
            + 12 * (spec.glass_octave - 2)
            + SHARD_MOTIF[(eighth_index // 2) % len(SHARD_MOTIF)]
        )
        glass_frequency = midi_frequency(motif_note)
        glass_envelope = math.exp(-10.5 * eighth_phase)
        gate = GATE_ACCENTS[eighth_index % len(GATE_ACCENTS)]
        glass_phase = (
            2 * math.pi * glass_frequency * t
            + 0.42 * math.sin(2 * math.pi * glass_frequency * 2.01 * t)
        )
        glass = math.sin(glass_phase) * glass_envelope * gate

        pad_root = midi_frequency(root_midi)
        pad = (
            math.sin(2 * math.pi * pad_root * t + 0.22 * math.sin(2 * math.pi * t / 8))
            + 0.55 * math.sin(2 * math.pi * pad_root * 1.5 * t + 0.7)
        )
        relay = (
            math.sin(2 * math.pi * 1840 * t)
            * math.exp(-22 * eighth_phase)
            * (1.0 if eighth_index % 8 in (0, 3, 6) else 0.18)
        )

        pressure = 0.0
        if spec.intensity >= 0.75:
            sixteenth_phase = (eighth_phase * 2) % 1
            pressure = (
                math.sin(2 * math.pi * 93 * t)
                * math.exp(-8 * sixteenth_phase)
                * (0.55 + 0.45 * math.sin(2 * math.pi * t / 16))
            )

        fracture = 0.0
        if spec.critical:
            fracture = (
                math.sin(2 * math.pi * midi_frequency(75) * t)
                + math.sin(2 * math.pi * midi_frequency(76) * t + 0.9)
            ) * (0.4 + 0.6 * math.sin(math.pi * (t % 4) / 4) ** 2)

        mono = spec.intensity * (
            0.30 * bass
            + 0.19 * glass
            + 0.13 * pad
            + 0.055 * relay
            + 0.12 * pressure
            + 0.11 * fracture
        )
        pan = 0.07 * math.sin(2 * math.pi * t / 8)
        shimmer = 0.022 * math.sin(2 * math.pi * (glass_frequency * 1.003) * t)
        window = edge_window(frame, frame_count)
        samples.append((mono * (1 - pan) + shimmer) * window)
        samples.append((mono * (1 + pan) - shimmer) * window)

    return samples


def write_normalized(path: Path, samples: array) -> None:
    peak = max(abs(value) for value in samples) or 1.0
    scale = TARGET_PEAK / peak
    pcm = array(
        "h",
        (
            max(-32767, min(32767, round(value * scale * 32767)))
            for value in samples
        ),
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as writer:
        writer.setnchannels(2)
        writer.setsampwidth(2)
        writer.setframerate(SAMPLE_RATE)
        writer.writeframes(pcm.tobytes())


def main() -> None:
    for spec in TRACKS:
        output = AUDIO_DIR / spec.filename
        write_normalized(output, synthesize(spec))
        print(f"[GRIDSHARD] üretildi: {output.name}")


if __name__ == "__main__":
    main()
