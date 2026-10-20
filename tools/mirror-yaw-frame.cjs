"use strict";
// Replaces a bad yaw frame with the left-right mirror of its partner frame.
// Mirroring about the screen's vertical axis maps ground heading (x, y) to
// (-x, y): yaw i <-> (8 - i) mod 16. Valid only for left-right symmetric
// machines; no screen-plane rotation is involved.
// Usage: node tools/mirror-yaw-frame.cjs <id> <targetIndex> [<targetIndex> ...]
const fs = require("node:fs"), path = require("node:path");
const { chromium } = require("../node_modules/@playwright/test");
const [,, id, ...targets] = process.argv;
if (!id || !targets.length) { console.error("kullanım: node tools/mirror-yaw-frame.cjs <id> <hedef> ..."); process.exit(2); }
const DIR = path.resolve(__dirname, "../client/assets/ui/modules-physical-v1"), name = i => path.join(DIR, `${id}-y${String(i).padStart(2, "0")}.webp`);
(async () => {
  const browser = await chromium.launch({ channel: "chrome" }), page = await browser.newPage();
  for (const t of targets.map(Number)) {
    const src = (24 - t) % 16, data = "data:image/webp;base64," + fs.readFileSync(name(src)).toString("base64");
    const out = await page.evaluate(async data => {
      const img = new Image(); img.src = data; await img.decode();
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext("2d"); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
      return c.toDataURL("image/webp", .92);
    }, data);
    fs.writeFileSync(name(t), Buffer.from(out.split(",")[1], "base64"));
    console.log(`${id}-y${String(t).padStart(2, "0")} = ayna(${id}-y${String(src).padStart(2, "0")})`);
  }
  await browser.close();
})();
