"""Kanonik WAV seslerinden mobil OGG Vorbis ve AAC (m4a) türevleri üretir.

Kanonik kaynak ``client/assets/audio/*.wav`` olarak kalır. Türevler
``client/assets/audio/mobile/`` altına yazılır; istemci yalnız
``client/src/gridshard-audio-formats.js`` manifestinde listelenen türevleri
kullanır ve çözümleme başarısız olursa WAV'a düşer.

Kullanım:
    python tools/encode_mobile_audio.py            # eksik/eski türevleri üret
    python tools/encode_mobile_audio.py --force    # hepsini yeniden üret
    python tools/encode_mobile_audio.py --check    # manifest/kaynak uyumunu denetle

ffmpeg PATH üzerinde değilse ``--ffmpeg`` veya ``GRIDSHARD_FFMPEG`` ile verilir.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "client" / "assets" / "audio"
OUTPUT = AUDIO / "mobile"
MANIFEST = OUTPUT / "manifest.json"
RUNTIME_MANIFEST = ROOT / "client" / "src" / "gridshard-audio-formats.js"
MANIFEST_VERSION = 1

# 5 sn ve üzeri parçalar müzik/sting sayılır; kısa SFX daha düşük bit hızı alır.
MUSIC_MIN_SECONDS = 5.0


def encoder_args(extension: str, channels: int, music: bool) -> list[str]:
    if extension == "ogg":
        quality = "4" if music else "3"
        return ["-c:a", "libvorbis", "-q:a", quality]
    if extension == "m4a":
        per_channel = 64 if music else 48
        # ffmpeg MP4 edit list AAC priming gecikmesini işaretler; Safari/WebKit
        # bunu uygulayarak 32 sn döngülerin dikişini korur.
        return [
            "-c:a", "aac",
            "-b:a", f"{per_channel * max(1, channels)}k",
            "-movflags", "+faststart",
        ]
    raise ValueError(extension)


FORMATS = ("ogg", "m4a")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def wav_info(path: Path) -> tuple[int, float]:
    with wave.open(str(path), "rb") as reader:
        return reader.getnchannels(), reader.getnframes() / reader.getframerate()


def resolve_ffmpeg(explicit: str | None) -> str:
    candidate = explicit or os.environ.get("GRIDSHARD_FFMPEG") or shutil.which("ffmpeg")
    if not candidate:
        raise SystemExit(
            "ffmpeg bulunamadı. Kurup PATH'e ekleyin veya --ffmpeg / "
            "GRIDSHARD_FFMPEG ile yolunu verin."
        )
    return candidate


def encode(ffmpeg: str, source: Path, target: Path, extension: str) -> None:
    channels, duration = wav_info(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(f"{target.stem}.tmp{target.suffix}")
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(source),
        "-map_metadata", "-1",
        *encoder_args(extension, channels, duration >= MUSIC_MIN_SECONDS),
        str(temporary),
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=120)
    if result.returncode != 0 or not temporary.exists() or temporary.stat().st_size == 0:
        temporary.unlink(missing_ok=True)
        raise SystemExit(f"{source.name} → {extension} kodlanamadı:\n{result.stderr.strip()}")
    temporary.replace(target)


def write_runtime_manifest(formats: dict[str, list[str]]) -> None:
    lines = [
        "// tools/encode_mobile_audio.py tarafından üretilir; elle düzenlemeyin.",
        "// Listelenen adlar ./assets/audio/mobile/<ad>.<biçim> olarak bulunur.",
        "globalThis.GRIDSHARD_AUDIO_ENCODINGS = Object.freeze({",
        f"  version: {MANIFEST_VERSION},",
        "  formats: Object.freeze({",
    ]
    for extension in FORMATS:
        names = ", ".join(json.dumps(name) for name in formats.get(extension, []))
        lines.append(f"    {extension}: Object.freeze([{names}]),")
    lines += ["  }),", "});", ""]
    RUNTIME_MANIFEST.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def build(ffmpeg: str, force: bool) -> int:
    previous = {}
    if MANIFEST.exists():
        previous = json.loads(MANIFEST.read_text(encoding="utf-8")).get("sources", {})

    sources: dict[str, dict] = {}
    formats: dict[str, list[str]] = {extension: [] for extension in FORMATS}
    wav_bytes = 0
    encoded_bytes = {extension: 0 for extension in FORMATS}

    for source in sorted(AUDIO.glob("*.wav")):
        name = source.stem
        digest = sha256(source)
        wav_bytes += source.stat().st_size
        entry = {"sha256": digest, "wav_bytes": source.stat().st_size}
        for extension in FORMATS:
            target = OUTPUT / f"{name}.{extension}"
            stale = previous.get(name, {}).get("sha256") != digest
            if force or stale or not target.exists():
                encode(ffmpeg, source, target, extension)
                print(f"kodlandı: {target.relative_to(ROOT).as_posix()}")
            entry[f"{extension}_bytes"] = target.stat().st_size
            encoded_bytes[extension] += target.stat().st_size
            formats[extension].append(name)
        sources[name] = entry

    # Kanonik WAV'ı silinmiş türevler istemciye sunulmamalı.
    for orphan in OUTPUT.glob("*.*"):
        if orphan.name != MANIFEST.name and orphan.stem not in sources:
            orphan.unlink()
            print(f"silindi (kaynağı yok): {orphan.relative_to(ROOT).as_posix()}")

    MANIFEST.write_text(
        json.dumps(
            {"version": MANIFEST_VERSION, "formats": list(FORMATS), "sources": sources},
            ensure_ascii=False,
            indent=2,
        ) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    write_runtime_manifest(formats)

    megabyte = 1024 * 1024
    print(f"WAV toplamı: {wav_bytes / megabyte:.1f} MB")
    for extension in FORMATS:
        print(f"{extension} toplamı: {encoded_bytes[extension] / megabyte:.1f} MB")
    return 0


def check() -> int:
    if not MANIFEST.exists():
        print("Mobil ses türevi yok; istemci kanonik WAV kullanır.")
        return 0
    recorded = json.loads(MANIFEST.read_text(encoding="utf-8")).get("sources", {})
    problems = []
    actual = {path.stem: path for path in AUDIO.glob("*.wav")}
    for name, path in sorted(actual.items()):
        entry = recorded.get(name)
        if not entry:
            problems.append(f"{name}: türevi yok")
            continue
        if entry.get("sha256") != sha256(path):
            problems.append(f"{name}: WAV değişmiş, türev eski")
        for extension in FORMATS:
            if not (OUTPUT / f"{name}.{extension}").exists():
                problems.append(f"{name}.{extension}: dosya eksik")
    for name in sorted(set(recorded) - set(actual)):
        problems.append(f"{name}: kaynak WAV yok")
    for problem in problems:
        print(problem)
    if problems:
        print("Yeniden üretmek için: python tools/encode_mobile_audio.py")
        return 1
    print(f"{len(actual)} ses için mobil türevler güncel.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--ffmpeg")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        return check()
    return build(resolve_ffmpeg(args.ffmpeg), args.force)


if __name__ == "__main__":
    sys.exit(main())
