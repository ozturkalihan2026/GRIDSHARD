"use strict";
// Alpha-preserving technical export; approved artwork is not redrawn or cropped.
const fs = require("node:fs");
const path = require("node:path");
const sharp = require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const { resolveArtMaster } = require("./resolve-art-master.js");
const directory = path.resolve(__dirname, "../client/assets/ui/currency-v1");
(async () => {
  fs.mkdirSync(directory, { recursive:true });
  for (const name of ["flux", "credit"]) {
    const source = resolveArtMaster(`qa_reports/currency-visual-pilot-20261015/${name}-v1.png`);
    if (!(await sharp(source).metadata()).hasAlpha) throw new Error(`${name}: transparent master required`);
    const output = path.join(directory, `${name}.webp`);
    const result = await sharp(source).resize(128, 128, {fit:"contain", background:{r:0,g:0,b:0,alpha:0}})
      .webp({lossless:true, effort:6}).toFile(output);
    if (!(await sharp(output).metadata()).hasAlpha) throw new Error(`${name}: export lost alpha`);
    console.log(`${name}: ${result.width}x${result.height}, ${result.size} bytes (lossless WebP + alpha)`);
  }
})().catch(error => {console.error(error); process.exitCode=1;});
