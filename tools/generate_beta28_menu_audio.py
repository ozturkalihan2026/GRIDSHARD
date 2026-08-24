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
class EnsembleSpec:
    filename: str
    beats: int
    intensity: float
    lead_pattern: tuple[int, ...]


TRACKS = (
    EnsembleSpec(
        "menu_ensemble_v6.wav",
        52,
        0.72,
        (74, 77, 81, 79, 74, 70, 72, 77),
    ),
    EnsembleSpec(
        "pool_ensemble_v6.wav",
        52,
        0.88,
        (74, 81, 77, 84, 79, 86, 81, 77),
    ),
)

# Original D-minor GRIDSHARD progression. Each menu state now uses a real
# ensemble: chord pad, bass, reactor kick, clap, hi-hat, glass arpeggio and
# a restrained brass/synth lead. Beta.32 keeps Menu and Pool on one 32-second
# tempo grid, so state changes can preserve phase without rhythm flamming.
CHORDS = (
    (50, 53, 57),  # Dm
    (46, 50, 53),  # Bb
    (53, 57, 60),  # F
    (48, 52, 55),  # C
)
ARPEGGIO_STEPS = (0, 2, 1, 2, 0, 1, 2, 1)


def midi_frequency(note: int) -> float:
    frequency = 440.0 * (2.0 ** ((note - 69) / 12.0))
    # Quantizing by less than 1/32 Hz makes every sustained oscillator close
    # on the exact loop boundary without adding a silent fade at either edge.
    return round(frequency * DURATION_SECONDS) / DURATION_SECONDS


def oscillator(frequency: float, t: float, harmonics: int) -> float:
    return sum(
        math.sin(2 * math.pi * frequency * harmonic * t) / harmonic**1.45
        for harmonic in range(1, harmonics + 1)
    )


def deterministic_noise(sample_index: int) -> float:
    value = math.sin(sample_index * 12.9898 + 38.117) * 43_758.5453
    return (value - math.floor(value)) * 2 - 1


def synthesize(spec: EnsembleSpec) -> array:
    frame_count = int(SAMPLE_RATE * DURATION_SECONDS)
    beat_seconds = DURATION_SECONDS / spec.beats
    samples = array("f")

    for frame in range(frame_count):
        t = frame / SAMPLE_RATE
        beat = t / beat_seconds
        beat_index = int(beat)
        beat_phase = beat - beat_index
        eighth = beat * 2
        eighth_index = int(eighth)
        eighth_phase = eighth - eighth_index
        chord = CHORDS[(beat_index // 4) % len(CHORDS)]

        chord_pad = 0.0
        for note in chord:
            frequency = midi_frequency(note + 12)
            chord_pad += (
                math.sin(2 * math.pi * frequency * t)
                + 0.18 * math.sin(4 * math.pi * frequency * t + 0.31)
            )
        chord_pad *= 0.060 * (0.82 + 0.18 * math.sin(2 * math.pi * t / 16))

        bass_frequency = midi_frequency(chord[0])
        bass = (
            oscillator(bass_frequency, t, 2)
            * math.exp(-3.7 * beat_phase)
            * 0.165
        )

        kick_age = beat_phase * beat_seconds
        kick_frequency = 49 + 50 * math.exp(-21 * kick_age)
        reactor_kick = (
            math.sin(2 * math.pi * kick_frequency * kick_age)
            * math.exp(-17 * kick_age)
            * 0.20
        )

        noise = deterministic_noise(frame)
        clap = 0.0
        if beat_index % 4 in (1, 3) and beat_phase < 0.30:
            clap = noise * math.exp(-16 * beat_phase) * 0.075
            clap += (
                math.sin(2 * math.pi * 1_180 * t)
                * math.exp(-20 * beat_phase)
                * 0.025
            )
        hi_hat = (
            noise
            * math.exp(-33 * eighth_phase)
            * (0.032 if eighth_index % 2 else 0.045)
        )

        arp_note = chord[ARPEGGIO_STEPS[eighth_index % len(ARPEGGIO_STEPS)]] + 36
        arp_frequency = midi_frequency(arp_note)
        glass_arpeggio = (
            math.sin(2 * math.pi * arp_frequency * t + 0.17)
            + 0.27 * math.sin(2 * math.pi * arp_frequency * 2.005 * t)
        ) * math.exp(-8.8 * eighth_phase) * 0.060

        lead_note = spec.lead_pattern[(eighth_index // 2) % len(spec.lead_pattern)]
        lead_frequency = midi_frequency(lead_note)
        lead_gate = max(0.0, 1 - beat_phase * 1.6)
        synth_lead = (
            oscillator(lead_frequency, t, 3)
            * lead_gate
            * (0.034 if beat_index % 4 in (0, 2) else 0.019)
        )

        mono = spec.intensity * (
            chord_pad
            + bass
            + reactor_kick
            + clap
            + hi_hat
            + glass_arpeggio
            + synth_lead
        )
        stereo_motion = 0.075 * math.sin(2 * math.pi * t / (beat_seconds * 8))
        shimmer = glass_arpeggio * 0.17
        # The downbeat itself is the seam. There is deliberately no fade to
        # digital silence here; HTMLAudio loop playback therefore has no
        # audible empty pocket between repetitions.
        samples.append(mono * (1 - stereo_motion) + shimmer)
        samples.append(mono * (1 + stereo_motion) - shimmer)

    seam_frames = int(SAMPLE_RATE * 0.006)
    frame_count = len(samples) // 2
    for channel in (0, 1):
        target = samples[channel]
        for offset in range(seam_frames):
            progress = (offset + 1) / seam_frames
            smooth = progress * progress * (3 - 2 * progress)
            index = (frame_count - seam_frames + offset) * 2 + channel
            samples[index] = samples[index] * (1 - smooth) + target * smooth

    return samples


def write_normalized(path: Path, samples: array) -> None:
    peak = max(abs(value) for value in samples) or 1.0
    scale = TARGET_PEAK / peak
    pcm = array(
        "h",
        (
            max(-32_767, min(32_767, round(value * scale * 32_767)))
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
        print(f"[GRIDSHARD] Beta.32 dikişsiz ensemble üretildi: {output.name}")


if __name__ == "__main__":
    main()
