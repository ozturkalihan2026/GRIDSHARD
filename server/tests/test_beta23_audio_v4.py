from pathlib import Path
import struct
import wave

ROOT=Path(__file__).resolve().parents[2]
AUDIO=ROOT/'client/assets/audio'

TRACKS=(
    'menu_pulse_v4.wav',
    'pool_pulse_v4.wav',
    'battle_pulse_v4.wav',
    'critical_core_layer_v4.wav',
)


def test_audio_v4_tracks_are_long_stereo_and_loop_boundary_is_small():
    for name in TRACKS:
        path=AUDIO/name
        assert path.exists(), name
        with wave.open(str(path),'rb') as reader:
            assert reader.getnchannels()==2
            assert reader.getsampwidth()==2
            duration=reader.getnframes()/reader.getframerate()
            assert duration>=31.5
            raw=reader.readframes(reader.getnframes())

        samples=struct.unpack('<'+'h'*(len(raw)//2),raw)
        first_l,first_r=samples[0],samples[1]
        last_l,last_r=samples[-2],samples[-1]
        # Seam must be far below a full-scale discontinuity.
        assert abs(last_l-first_l) < 3500, name
        assert abs(last_r-first_r) < 3500, name
