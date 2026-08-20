from pathlib import Path
import math
import struct
import wave


ROOT=Path(__file__).resolve().parents[2]
AUDIO=ROOT/"client/assets/audio"

MUSIC={
    "menu_pulse.wav",
    "pool_pulse.wav",
    "matchmaking_rise.wav",
    "battle_pulse.wav",
    "victory_sting.wav",
    "defeat_sting.wav",
    "critical_core_layer.wav",
    "menu_pulse_v4.wav",
    "pool_pulse_v4.wav",
    "battle_pulse_v4.wav",
    "critical_core_layer_v4.wav",
}


def peak_dbfs(path:Path)->float:
    with wave.open(str(path),"rb") as reader:
        assert reader.getsampwidth()==2
        raw=reader.readframes(
            reader.getnframes()
        )

    values=struct.unpack(
        "<"+"h"*(len(raw)//2),
        raw,
    )
    peak=max(
        abs(value)
        for value in values
    )
    return 20*math.log10(
        peak/32767
    )


def test_audio_mix_v2_assets_are_normalized_with_headroom():
    assert (
        AUDIO/"critical_core_layer.wav"
    ).exists()

    for path in AUDIO.glob("*.wav"):
        db=peak_dbfs(path)
        if path.name in MUSIC:
            assert -6.2 <= db <= -5.8, (
                path.name,
                db,
            )
        else:
            assert -3.2 <= db <= -2.8, (
                path.name,
                db,
            )
