from __future__ import annotations

import math
import wave
from array import array
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "client" / "assets" / "audio" / "victory_sting.wav"
SAMPLE_RATE = 44_100
BPM = 144
BEAT_SECONDS = 60 / BPM
BEATS = 24
DURATION_SECONDS = BEATS * BEAT_SECONDS
TARGET_PEAK = 10 ** (-6 / 20)

# Original GRIDSHARD celebration motif in D major. The progression deliberately
# rises from the battle soundscape into bright brass, glass arpeggios and a
# final reactor-sized chord instead of behaving like a short notification.
CHORDS = (
    (50, 54, 57),  # D
    (47, 50, 54),  # B minor
    (43, 47, 50),  # G
    (45, 49, 52),  # A
    (50, 54, 57),  # D
    (50, 54, 57),  # final D
)
MELODY = (
    74, 78, 81, 86, 81, 78, 81, 86,
    83, 81, 78, 74, 78, 81, 83, 86,
    79, 83, 86, 91, 86, 83, 81, 79,
    81, 85, 88, 93, 88, 85, 83, 81,
    86, 88, 90, 93, 90, 88, 86, 81,
    86, 90, 93, 98, 93, 90, 86, 86,
)


def midi_frequency(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def oscillator(frequency: float, time_seconds: float, harmonics: int = 1) -> float:
    value = 0.0
    for harmonic in range(1, harmonics + 1):
        value += math.sin(2 * math.pi * frequency * harmonic * time_seconds) / (
            harmonic ** 1.35
        )
    return value


def smooth_attack_decay(phase: float, attack: float, decay: float) -> float:
    attack_gain = min(1.0, phase / max(attack, 1e-6))
    return attack_gain * math.exp(-decay * max(0.0, phase - attack))


def deterministic_noise(sample_index: int) -> float:
    # A stable, dependency-free noise source for claps and hi-hats.
    value = math.sin(sample_index * 12.9898 + 78.233) * 43_758.5453
    return (value - math.floor(value)) * 2 - 1


def synthesize() -> array:
    frame_count = int(DURATION_SECONDS * SAMPLE_RATE)
    samples = array("f")

    for frame in range(frame_count):
        t = frame / SAMPLE_RATE
        beat = t / BEAT_SECONDS
        beat_index = min(BEATS - 1, int(beat))
        beat_phase = beat - beat_index
        eighth = beat * 2
        eighth_index = min(len(MELODY) - 1, int(eighth))
        eighth_phase = eighth - eighth_index
        chord = CHORDS[min(len(CHORDS) - 1, beat_index // 4)]

        # Warm major-chord lift underneath the celebration.
        pad = 0.0
        for note in chord:
            frequency = midi_frequency(note + 12)
            pad += (
                math.sin(2 * math.pi * frequency * t)
                + 0.22 * math.sin(4 * math.pi * frequency * t + 0.35)
            )
        pad *= 0.075 * (0.7 + 0.3 * math.sin(math.pi * min(1.0, t / 1.2)))

        # Bouncy bass and a four-on-the-floor reactor kick keep it moving.
        bass_frequency = midi_frequency(chord[0])
        bass = oscillator(bass_frequency, t, 2) * math.exp(-4.2 * beat_phase) * 0.20
        kick_age = beat_phase * BEAT_SECONDS
        kick_frequency = 54 + 58 * math.exp(-22 * kick_age)
        kick = (
            math.sin(2 * math.pi * kick_frequency * kick_age)
            * math.exp(-18 * kick_age)
            * 0.34
        )

        # Claps on two and four, with bright eighth-note hats.
        noise = deterministic_noise(frame)
        clap = 0.0
        if beat_index % 4 in (1, 3) and beat_phase < 0.34:
            clap = noise * math.exp(-15 * beat_phase) * 0.16
            clap += math.sin(2 * math.pi * 1_350 * t) * math.exp(-19 * beat_phase) * 0.05
        hat = (
            noise
            * math.exp(-32 * eighth_phase)
            * (0.065 if eighth_index % 2 else 0.09)
        )

        # The rising lead is part brass fanfare, part GRIDSHARD glass shimmer.
        lead_frequency = midi_frequency(MELODY[eighth_index])
        lead_envelope = smooth_attack_decay(eighth_phase, 0.045, 4.6)
        brass = oscillator(lead_frequency, t, 4) * lead_envelope * 0.115
        glass = (
            math.sin(2 * math.pi * lead_frequency * 2 * t + 0.22)
            + 0.32 * math.sin(2 * math.pi * lead_frequency * 4.01 * t)
        ) * math.exp(-8.5 * eighth_phase) * 0.075

        # Extra upward sparkle and a broad final hit make the win unmistakable.
        lift = 0.0
        if beat_index >= 16:
            lift = (
                math.sin(2 * math.pi * midi_frequency(MELODY[eighth_index] + 12) * t)
                * math.exp(-7 * eighth_phase)
                * 0.055
            )
        final = 0.0
        if beat >= 20:
            final_phase = (beat - 20) * BEAT_SECONDS
            final_envelope = smooth_attack_decay(final_phase, 0.04, 0.48)
            final = sum(
                oscillator(midi_frequency(note + 24), t, 3)
                for note in CHORDS[-1]
            ) * final_envelope * 0.085

        mono = pad + bass + kick + clap + hat + brass + glass + lift + final
        stereo_motion = 0.09 * math.sin(2 * math.pi * t / (BEAT_SECONDS * 4))
        shimmer = glass * 0.18

        fade_in = min(1.0, t / 0.025)
        fade_out = min(1.0, max(0.0, (DURATION_SECONDS - t) / 0.65))
        edge = fade_in * fade_out
        samples.append((mono * (1 - stereo_motion) + shimmer) * edge)
        samples.append((mono * (1 + stereo_motion) - shimmer) * edge)

    return samples


def write_normalized(samples: array) -> None:
    peak = max(abs(value) for value in samples) or 1.0
    scale = TARGET_PEAK / peak
    pcm = array(
        "h",
        (
            max(-32_767, min(32_767, round(value * scale * 32_767)))
            for value in samples
        ),
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "wb") as writer:
        writer.setnchannels(2)
        writer.setsampwidth(2)
        writer.setframerate(SAMPLE_RATE)
        writer.writeframes(pcm.tobytes())


def main() -> None:
    write_normalized(synthesize())
    print(
        f"[GRIDSHARD] kutlama parçası üretildi: {OUTPUT.name} "
        f"({DURATION_SECONDS:.1f} sn · {BPM} BPM)"
    )


if __name__ == "__main__":
    main()
