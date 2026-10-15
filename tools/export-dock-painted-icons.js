"use strict";

// Technical export only: keep Imagegen masters unchanged; preserve RGBA and
// make small lossless WebP derivatives for the native/web runtime.
const path = require("node:path");
const fs = require("node:fs");
const sharp = require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const { resolveArtMaster } = require("./resolve-art-master.js");
const directory = path.resolve(__dirname, "../client/assets/ui/dock-painted-v1");
const names = ["shop", "cards", "home", "team", "events"];

async function exportIcons() {
  fs.mkdirSync(directory, {recursive:true});
  for (const name of names) {
    const source = resolveArtMaster(`client/assets/ui/dock-painted-v1/${name}.png`);
    const output = path.join(directory, `${name}.webp`);
    const metadata = await sharp(source).metadata();
    if (!metadata.hasAlpha) throw new Error(`${name}: transparent master required`);
    const result = await sharp(source)
      .resize(256, 256, { fit:"contain", background:{ r:0, g:0, b:0, alpha:0 } })
      .webp({ lossless:true, effort:6 })
      .toFile(output);
    console.log(`${name}: ${result.width}×${result.height}, ${result.size} bytes`);
  }
}

exportIcons().catch((error) => { console.error(error.message); process.exitCode = 1; });
