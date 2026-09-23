"use strict";

// Asset conversion, not a game/test runner. Keep original WAV masters untouched.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const mixes = require("../client/src/audio-mix.js");
require("../client/src/gridshard-audio.js");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "client/assets/audio");
const destination = path.join(source, "mobile");
const ffmpeg = process.env.GRIDSHARD_FFMPEG || "ffmpeg";
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const filename = (asset) => {
  const name = /^\.\/assets\/audio\/([a-z0-9_]+)\.wav$/.exec(asset)?.[1];
  if (!name) throw new Error(`Unexpected audio cue: ${asset}`);
  return name;
};
const execute = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });

function waveInfo(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WAVE") throw new Error(`Not PCM WAV: ${file}`);
  let rate, blockSize, sampleRate, channels, dataSize;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      channels = bytes.readUInt16LE(offset + 10);
      sampleRate = bytes.readUInt32LE(offset + 12);
      rate = bytes.readUInt32LE(offset + 16);
      blockSize = bytes.readUInt16LE(offset + 20);
    }
    if (id === "data") dataSize = length;
    offset += 8 + length + (length % 2);
  }
  if (!rate || !blockSize || !dataSize) throw new Error(`Incomplete WAV: ${file}`);
  return { seconds: dataSize / rate, sample_rate: sampleRate, channels, frames: dataSize / blockSize, bytes: bytes.length, sha256: digest(bytes) };
}

function main() {
  const ffmpegVersion = execFileSync(ffmpeg, ["-version"], { windowsHide: true, encoding: "utf8" }).split(/\r?\n/)[0];
  const staging = fs.mkdtempSync(path.join(root, ".audio-convert-"));
  try {
    const stems = global.GRIDSHARD_BATTLE_LAYERS.map((layer) => path.join(source, `${filename(layer.asset)}.wav`));
    const stemInfo = stems.map(waveInfo);
    if (stemInfo.some((info) => info.seconds !== 32 || info.sample_rate !== 22050 || info.channels !== 2)) {
      throw new Error("Battle stems must share the 32-second, stereo 22050 Hz clock.");
    }
    const rendered = new Map();
    for (const [state, mix] of Object.entries(mixes)) {
      const name = filename(mix.asset);
      const file = path.join(staging, `${name}.wav`);
      const filter = mix.gains.map((gain, index) => `[${index}:a]volume=${gain}[s${index}]`).join(";")
        + ";" + stems.map((_, index) => `[s${index}]`).join("")
        + `amix=inputs=${stems.length}:normalize=0:duration=shortest[out]`;
      execute([...stems.flatMap((file) => ["-i", file]), "-filter_complex", filter, "-map", "[out]", "-ar", "22050", "-c:a", "pcm_s16le", "-map_metadata", "-1", file]);
      rendered.set(name, { file, state, gains: mix.gains });
    }
    const cues = new Set([
      ...Object.values(global.GRIDSHARD_MUSIC_ASSETS),
      ...global.GRIDSHARD_BATTLE_LAYERS.map((layer) => layer.asset),
      ...Object.values(global.GRIDSHARD_SFX_CUES).map((cue) => cue.asset),
    ].map(filename));
    const manifest = { schema_version: 1, mix_version: global.GRIDSHARD_AUDIO_MIX.version, encoder: ffmpegVersion, assets: {} };
    for (const name of [...cues].sort()) {
      const master = rendered.get(name)?.file || path.join(source, `${name}.wav`);
      const info = waveInfo(master);
      const formats = {};
      for (const extension of ["ogg", "m4a"]) {
        const output = path.join(staging, `${name}.${extension}`);
        const codec = extension === "ogg"
          ? ["-c:a", "libvorbis", "-q:a", "4"]
          : ["-c:a", "aac", "-profile:a", "aac_low", "-b:a", info.channels === 1 ? "64k" : "96k", "-movflags", "+faststart"];
        execute(["-i", master, "-vn", "-map_metadata", "-1", ...codec, output]);
        const bytes = fs.readFileSync(output);
        formats[extension] = { file: `${name}.${extension}`, bytes: bytes.length, sha256: digest(bytes) };
      }
      manifest.assets[name] = { source: info, ...(rendered.has(name) ? { mix: rendered.get(name).state, gains: rendered.get(name).gains } : {}), formats };
      console.log(`Converted: ${name} → OGG / AAC`);
    }
    // Commit only fully rendered assets. WAV masters and unrelated files remain.
    fs.mkdirSync(destination, { recursive: true });
    if (fs.lstatSync(destination).isSymbolicLink()) throw new Error("Audio output cannot be a symbolic link.");
    for (const asset of Object.values(manifest.assets)) {
      for (const format of Object.values(asset.formats)) fs.copyFileSync(path.join(staging, format.file), path.join(destination, format.file));
    }
    fs.writeFileSync(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    const totals = Object.values(manifest.assets).reduce((sum, asset) => ({
      wav: sum.wav + asset.source.bytes, ogg: sum.ogg + asset.formats.ogg.bytes, aac: sum.aac + asset.formats.m4a.bytes,
    }), { wav: 0, ogg: 0, aac: 0 });
    console.log(JSON.stringify({ assets: cues.size, bytes: totals }));
  } finally {
    const resolved = fs.realpathSync(staging);
    if (path.dirname(resolved) !== fs.realpathSync(root) || !path.basename(resolved).startsWith(".audio-convert-")) throw new Error("Unexpected temporary audio directory.");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

try { main(); } catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
}
