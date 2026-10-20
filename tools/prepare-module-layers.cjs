"use strict";
// Registers the approved 8A paintings as layered battle sprites (fixed base +
// painted heading heads). Measures opaque bounds/tips locally with Sharp.
// No browser or game startup is needed. Output: client/src/module-layer-data.js
// Usage: node tools/prepare-module-layers.cjs
const fs = require("node:fs"), path = require("node:path");
const sharp = require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const ROOT = path.resolve(__dirname, "..");
const onlyArg=process.argv.find(arg=>arg.startsWith("--only="));
const only=onlyArg?new Set(onlyArg.slice(7).split(",").filter(Boolean)):null;
const OUTPUT=path.join(ROOT,"client/src/module-layer-data.js");
const ART = "assets/ui/modules-physical-v1/", ART2 = "assets/ui/modules-physical-v2/";
// Rig recipes (widths are fractions of the square stage; sink = how far the
// head's opaque bottom drops into the base's opaque height).
const RIGS = {
  laser: { base: "turret-base", baseW: .62, headW: .96, sink: .42, work: false, lens: true },
  pulse_cannon: { base: "turret-base", baseW: .62, headW: .96, sink: .42, work: false, lens: true },
  missile_launcher: { base: "turret-base", baseW: .62, headW: .96, sink: .42, work: false },
  repair: { base: "repair-base", baseW: .58, headW: .86, sink: .50, work: true },
  cooler: { base: "cooler-base", baseW: .56, headW: .84, sink: .30, work: true },
};
// v2 turning modules: whole body turns, so no separate base; registered only
// once their 16 yaw paintings (<id>-y00 … y15, in modules-physical-v1) exist.
for (const id of ["emp", "arc_cannon", "drone_bay", "jammer", "railgun", "reflector", "virus", "plasma_mortar",
  "quantum_repeater", "swarm_fabricator", "ion_spear", "disruptor", "quantum_cannon", "singularity_projector",
  "nano_medic", "overclock_unit", "phoenix_repair"]) RIGS[id] = { baseW: .62, v2: true };
// Footprint width overrides (the bottom band is not an octagonal pedestal).
// fit:"bbox" scales by the whole silhouette width (no pedestal); bodyCut drops
// that fraction of the height from the bottom before searching the emitter tip.
Object.assign(RIGS.drone_bay, { baseW: .78, fit: "bbox" });
Object.assign(RIGS.jammer, { bodyCut: .45 });
Object.assign(RIGS.reflector, { bodyCut: .5 });
Object.assign(RIGS.railgun, { baseW: .5 });
Object.assign(RIGS.virus, { lens: true, lensColor: "green" });
for(const id of["quantum_repeater","nano_medic","ion_spear","quantum_cannon"])Object.assign(RIGS[id],{lens:true,lensColor:"cyan"});
for(const id of["plasma_mortar","overclock_unit"])Object.assign(RIGS[id],{lens:true});
Object.assign(RIGS.disruptor,{lens:true,lensColor:"pink"});
for(const id of["emp","singularity_projector"])Object.assign(RIGS[id],{emitterMode:"center"});
const SINGLES = { shield: .98, battery: .9, amplifier: .96, emp: .9, armor: .9 };
// Non-turning v2 modules: one upright painting each (were drawn small by renderer="static").
const SINGLES_V2 = { targeting_computer: .9, barrier: .94, capacitor: .9, current_balancer: .9, guardian_dome: .96,
  chrono_relay: .9, phase_armor: .9, precision_matrix: .9, prism_shield: .94, omega_amplifier: .94 };
// Ground headings seen by the battle camera (n = away from viewer, s = toward).
const TIP = { ne: [1, -.7], nw: [-1, -.7], se: [1, .35], sw: [-1, .35], n: [0, -1], s: [0, 1], e: [1, -.1], w: [-1, -.1] };
// Coil caps of the approved amplifier painting, read on a 10% grid (image space).
const PAIRS = { amplifier: [[.33, .10], [.72, .16]] };

async function main() {
  const measure = async (name, dir = ART, lensColor = "orange") => {
    const file = path.join(ROOT, "client", dir, name + ".webp");
    if (!fs.existsSync(file)) return null;
      const n = 256;
      const d = await sharp(file).resize(n,n,{fit:"fill",kernel:"cubic"}).ensureAlpha().raw().toBuffer();
      let x0 = n, y0 = n, x1 = 0, y1 = 0; const pts = [], lens = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const o = (y * n + x) * 4; if (d[o + 3] > 140) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); pts.push([x / n, y / n]);
        // glowing orange/yellow lens (the real muzzle when it faces the camera)
        const isLens=lensColor==="pink"?d[o]>200&&d[o+1]<160&&d[o+2]>180:lensColor==="cyan"?d[o]<110&&d[o+1]>165&&d[o+2]>180:lensColor === "green" ? d[o] < 190 && d[o+1] > 180 && d[o+2] < 100 : d[o] > 225 && d[o + 1] > 110 && d[o + 1] < 215 && d[o + 2] < 90;
        if(isLens)lens.push([x/n,y/n]);
      } }
      return { x0: x0 / n, y0: y0 / n, x1: (x1 + 1) / n, y1: (y1 + 1) / n, pts: pts.filter((_, i) => i % 3 === 0), lens };
  };
  const r4 = v => Math.round(v * 10000) / 10000;
  const box = (info, width, bottom) => { // place opaque width=`width`, opaque bottom at `bottom`, centred
    const s = width / (info.x1 - info.x0);
    return { s, left: .5 - (info.x0 + (info.x1 - info.x0) / 2) * s, top: bottom - info.y1 * s };
  };
  const out = only && fs.existsSync(OUTPUT) ? {...require(OUTPUT)} : {};
  for (const [id, rig] of Object.entries(RIGS)) {
    if(only&&!only.has(id))continue;
    // 16 full-turret yaw paintings (generated at the battle camera) replace the
    // fixed base + four diagonal heads when present: <id>-y00.webp … y15.
    const yaw = [];
    for (let i = 0; i < 16; i++) { const info = await measure(`${id}-y${String(i).padStart(2, "0")}`,ART,rig.lensColor); if (!info) break; yaw.push(info); }
    if (yaw.length === 16) { out[id] = registerYaw16(id, yaw, rig); continue; }
    if (!rig.base) continue;
    const base = await measure(rig.base), b = box(base, rig.baseW, 1);
    const baseTop = b.top + base.y0 * b.s, floor = baseTop + (1 - baseTop) * rig.sink;
    const entry = { kind: "layered", base: { src: ART + rig.base + ".webp", left: r4(b.left), top: r4(b.top), size: r4(b.s) }, heads: {} };
    for (const dir of Object.keys(TIP)) for (const work of rig.work ? [false, true] : [false]) {
      const name = `${id}-${dir}${work ? "-work" : ""}`, info = await measure(name);
      if (!info) continue;
      const h = box(info, rig.headW, floor);
      let tip = info.pts[0], best = -1e9;
      for (const p of info.pts) { const v = p[0] * TIP[dir][0] + p[1] * TIP[dir][1]; if (v > best) { best = v; tip = p; } }
      // pull the measured silhouette tip slightly back onto the lens/nozzle
      const emitter = { x: r4(h.left + tip[0] * h.s - TIP[dir][0] * .05), y: r4(h.top + tip[1] * h.s + .03) };
      const pivot = { x: r4(.5), y: r4(floor - (info.y1 - info.y0) * h.s * .28) };
      entry.heads[dir + (work ? "-work" : "")] = { src: ART + name + ".webp", left: r4(h.left), top: r4(h.top), size: r4(h.s), emitter, pivot };
    }
    out[id] = entry;
  }
  for (const [id, width, dir] of [...Object.entries(SINGLES).map(e => [...e, ART]), ...Object.entries(SINGLES_V2).map(e => [...e, ART2])]) {
    if(only&&!only.has(id))continue;
    if (out[id]) continue; // a 16-yaw rig (e.g. emp once painted) wins over the single
    const info = await measure(id, dir); if (!info) continue;
    const s = box(info, width, 1);
    out[id] = { kind: "single", art: { src: dir + id + ".webp", left: r4(s.left), top: r4(s.top), size: r4(s.s) },
      emitter: { x: .5, y: r4(s.top + (info.y0 + (info.y1 - info.y0) * .35) * s.s) } };
    if (PAIRS[id]) out[id].pair = PAIRS[id].map(([x, y]) => ({ x: r4(s.left + x * s.s), y: r4(s.top + y * s.s) }));
  }
  // Each frame is registered on its PEDESTAL (bottom band of opaque pixels), not
  // its bbox, so the turret never slides while turning; one common scale.
  function registerYaw16(id, frames, rig) {
    const ped = frames.map(f => {
      const band = f.pts.filter(p => p[1] > f.y1 - (f.y1 - f.y0) * .18);
      const xs = band.map(p => p[0]);
      return rig.fit === "bbox" ? { cx: (f.x0 + f.x1) / 2, w: f.x1 - f.x0 } : { cx: (Math.min(...xs) + Math.max(...xs)) / 2, w: Math.max(...xs) - Math.min(...xs) };
    });
    const widths = ped.map(p => p.w).sort((a, b) => a - b), s = rig.baseW / widths[8];
    const entry = { kind: "layered", heads: {} };
    frames.forEach((f, i) => {
      const yaw = i * Math.PI / 8, dir = [Math.cos(yaw), Math.sin(yaw) * .5]; // ground direction seen from 60° above
      const body = f.pts.filter(p => p[1] < f.y1 - (f.y1 - f.y0) * (rig.bodyCut ?? .3)); // the muzzle is never the pedestal
      let tip = body[0], best = -1e9;
      for (const p of body) { const v = p[0] * dir[0] + p[1] * dir[1]; if (v > best) { best = v; tip = p; } }
      // A visible glowing lens (laser, pulse) wins: centroid of the lens pixels furthest along the heading.
      const lens = f.lens.filter(p => p[1] < f.y1 - (f.y1 - f.y0) * .3);
      // Only headings with a camera-facing component can show their lens (E..S..W).
      if (rig.lens && lens.length > 12 && Math.sin(yaw) > -0.05) {
        const proj = p => p[0] * dir[0] + p[1] * dir[1], far = Math.max(...lens.map(proj));
        const front = lens.filter(p => proj(p) > far - .06);
        tip = [front.reduce((a, p) => a + p[0], 0) / front.length, front.reduce((a, p) => a + p[1], 0) / front.length];
        tip.lens = true;
      }
      const left = .5 - ped[i].cx * s, top = 1 - f.y1 * s;
      if(rig.emitterMode==="center"){
        tip=[(f.x0+f.x1)/2,f.y0+(f.y1-f.y0)*.38];tip.lens=true;
      }
      entry.heads["y" + String(i).padStart(2, "0")] = { src: ART + `${id}-y${String(i).padStart(2, "0")}.webp`,
        left: r4(left), top: r4(top), size: r4(s),
        emitter: tip.lens ? { x: r4(left + tip[0] * s), y: r4(top + tip[1] * s) } : { x: r4(left + tip[0] * s - dir[0] * .04), y: r4(top + tip[1] * s - dir[1] * .04) },
        pivot: { x: .5, y: r4(top + (f.y1 - (f.y1 - f.y0) * .3) * s) } };
    });
    return entry;
  }
  // Cores: approved reactor paintings, one upright image each (no heading).
  const CORE_ART = "assets/ui/cores-physical-v1/";
  for (const file of fs.readdirSync(path.join(ROOT, "client", CORE_ART)).filter(f => f.endsWith(".webp"))) {
    const id = file.replace(".webp", "");
    if(only&&!only.has(id))continue;
    const info = await measure(id, CORE_ART), s = box(info, .94, 1);
    out[id] = { kind: "single", core: true, art: { src: CORE_ART + file, left: r4(s.left), top: r4(s.top), size: r4(s.s) },
      emitter: { x: .5, y: r4(s.top + (info.y0 + (info.y1 - info.y0) * .45) * s.s) } };
  }
  const js = "/* Generated by tools/prepare-module-layers.cjs — do not edit by hand. */\n" +
    "globalThis.GridshardModuleLayerData = Object.freeze(" + JSON.stringify(out, null, 1) + ");\n" +
    "if (typeof module !== \"undefined\" && module.exports) module.exports = globalThis.GridshardModuleLayerData;\n";
  fs.writeFileSync(OUTPUT, js);
  console.log(Object.entries(out).map(([k, v]) => k + ":" + (v.heads ? Object.keys(v.heads).length + " baş" : "tek")).join(" "));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
