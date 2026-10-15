"use strict";

// High-resolution sources are local authoring material, not game/QA payload.
// Keep the original relative paths in the ignored archive so exporters survive
// cleanup. On another computer, copy that archive or set GRIDSHARD_ART_MASTER_ROOT.
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
function resolveArtMaster(relative) {
  const candidates = [path.join(root, relative)];
  if (process.env.GRIDSHARD_ART_MASTER_ROOT) candidates.push(path.resolve(process.env.GRIDSHARD_ART_MASTER_ROOT, relative));
  candidates.push(path.join(root, "artifacts/asset-archive-20261015", relative));
  const found = candidates.find(file => fs.existsSync(file));
  if (!found) throw new Error(`Artwork master missing: ${relative}. Restore the local art archive or set GRIDSHARD_ART_MASTER_ROOT (see client/assets/ui/README.md).`);
  return found;
}
module.exports = { resolveArtMaster };
