(function (global) {
  "use strict";
  // Single source for package 8A. Stable IDs, never localized names, select art.
  // All paths are also declared in the inert HTML build allowlist.
  const ROOT = "./assets/ui/modules-physical-v1/";
  const VIEW_ROOT = "./assets/ui/modules-views-v3/";
  const NAMES = Object.freeze({
    "Lazer":"laser", "Kalkan":"shield", "Soğutucu":"cooler", "Batarya":"battery",
    "Güçlendirici":"amplifier", "EMP":"emp", "Onarım":"repair", "Onarım Modülü":"repair",
    "Zırh":"armor", "Sönümleyici":"armor", "Darbe Topu":"pulse_cannon", "Füze Fırlatıcı":"missile_launcher",
  });
  const ATLAS_IDS = new Set(Object.values(NAMES));
  const IDS = new Set([...ATLAS_IDS,"targeting_computer","barrier","arc_cannon","capacitor","drone_bay","jammer","railgun","current_balancer","reflector","nano_medic","virus","overclock_unit","plasma_mortar","guardian_dome","quantum_repeater","chrono_relay","phase_armor","swarm_fabricator","precision_matrix","ion_spear","prism_shield","disruptor","phoenix_repair","quantum_cannon","omega_amplifier","singularity_projector"]);
  const DIRECTIONS = new Set(["ne", "nw", "se", "sw"]);
  const views = new WeakMap();
  // Numeric yaw remains continuous. Illustrated volume is sampled at 45°:
  // E, SE, S, SW, W, NW, N, NE. Never rotate an upright painting in screen Z.
  const frameFor = angle => ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  function idFor(model) {
    const id = model?.definition_id || model?.definitionId || model?.id;
    if (IDS.has(id)) return id;
    // An explicit, different definition must NOT inherit another module's art.
    if (model?.definition_id || model?.definitionId) return null;
    return NAMES[model?.nameTr || model?.name_tr] || null;
  }
  const url = name => (ATLAS_IDS.has(name) ? ROOT : "./assets/ui/modules-physical-v2/") + name + ".webp";
  function image(doc, className, src) {
    const img = doc.createElement("img");
    img.className = className; img.alt = ""; img.draggable = false;
    img.setAttribute("aria-hidden", "true"); img.decoding = "async"; img.src = src;
    return img;
  }
  function markup(model) {
    const id = idFor(model);
    return id ? `<img class="module-emblem module-device-icon" src="${url(id)}" alt="" aria-hidden="true" draggable="false" decoding="async">` : null;
  }
  function mount(host, model, enemy = false) {
    const id = idFor(model);
    if (!id) return false;
    const doc = host.ownerDocument;
    const rig = doc.createElement("span");
    rig.className = "module-device-rig"; rig.dataset.device = id;
    const heading = enemy ? "se" : "ne";
    rig.dataset.yaw="continuous";
    rig.dataset.renderer=ATLAS_IDS.has(id)?"views8":"static";
    const shadow=doc.createElement("span"); shadow.className="module-device-ground-shadow";
    rig.appendChild(shadow);
    const billboard=doc.createElement("span"); billboard.className="module-device-billboard";
    const window=doc.createElement("span"); window.className="module-view-window";
    window.appendChild(image(doc,ATLAS_IDS.has(id)?"module-view-atlas":"module-device-icon",ATLAS_IDS.has(id)?VIEW_ROOT+id+".webp":url(id)));
    billboard.appendChild(window);
    rig.appendChild(billboard);
    for (const point of ["tl","tr","br","bl"]) {
      const marker=doc.createElement("span"); marker.className="laser-plane-point"; marker.dataset.corner=point;
      marker.setAttribute("aria-hidden","true"); rig.appendChild(marker);
      const spriteMarker=doc.createElement("span"); spriteMarker.className="sprite-plane-point"; spriteMarker.dataset.corner=point;
      spriteMarker.setAttribute("aria-hidden","true"); billboard.appendChild(spriteMarker);
    }
    host.replaceChildren(rig);
    host.classList.add("has-module-device");
    views.set(host, { id, rig, window, angle:enemy ? Math.PI/4 : -Math.PI/4, pose:"", frame:-1 });
    pose(host, { heading, phase:"rest", disabled:false });
    return true;
  }
  function pose(host, { heading = "ne", angle, targetPoint, plane, phase = "rest", frame = 0, aimProgress = 1, disabled = false }) {
    const view = views.get(host);
    if (!view) return false;
    if (!DIRECTIONS.has(heading)) heading = "ne";
    if (IDS.has(view.id)) {
      const geometry=global.GridshardLaserAim;
      if (geometry && plane && (targetPoint || Number.isFinite(angle))) {
        const pivot=geometry.project(plane,geometry.PIVOT);
        const target=targetPoint || {x:pivot.x+Math.cos(angle)*1000,y:pivot.y+Math.sin(angle)*1000};
        const aimed=geometry.aim(plane,target,view.angle);
        if (aimed) {
          if (phase === "aim") {
            if (view.lastPhase !== "aim") view.turnStart=view.angle;
            const progress=Math.max(0,Math.min(1,Number.isFinite(aimProgress)?aimProgress:1));
            view.angle=view.turnStart+(geometry.nearestAngle(view.turnStart,aimed.angle)-view.turnStart)*progress;
          } else view.angle=aimed.angle;
        }
      }
      view.lastPhase=phase;
      const yawFrame=frameFor(view.angle);
      if (view.frame !== yawFrame) {
        view.window.style?.setProperty("--view-x",`${-(yawFrame % 4)*100}%`);
        view.window.style?.setProperty("--view-y",`${-Math.floor(yawFrame / 4)*100}%`);
        view.rig.dataset.view=String(yawFrame); view.frame=yawFrame;
        global.GridshardModuleVfx?.syncArt?.(view.rig);
      }
      const key=`${view.angle}:${phase}:${frame}:${Boolean(disabled)}`;
      if (view.pose === key) return true;
      view.pose=key;
      view.rig.dataset.phase=phase; view.rig.dataset.frame=String(frame); view.rig.dataset.disabled=String(Boolean(disabled));
      return true;
    }
    return true;
  }
  function aimDevice(host, matrix, target) {
    const view=views.get(host), geometry=global.GridshardLaserAim;
    if (!view || !IDS.has(view.id) || !geometry) return null;
    const aimed=geometry.aim(matrix,target,view.angle);
    if (!aimed) return null;
    pose(host,{plane:matrix,targetPoint:target,phase:"work"});
    // A sprite's painted nozzle is not the end of a flat .9-radius rotor.
    // Resolve its registered per-view point on the camera-facing image plane.
    const registration=global.GridshardModuleViewData?.[view.id];
    if (matrix.sprite && registration?.emitters?.[view.frame]) {
      aimed.muzzle=geometry.project(matrix.sprite,registration.emitters[view.frame]) || aimed.muzzle;
    }
    return aimed;
  }
  const aimLaser=(host,matrix,target)=>views.get(host)?.id === "laser" ? aimDevice(host,matrix,target) : null;
  global.GridshardModuleDeviceArt = Object.freeze({ idFor, markup, mount, pose, aimDevice, aimLaser, frameFor });
  if (typeof module !== "undefined" && module.exports) module.exports = global.GridshardModuleDeviceArt;
})(globalThis);
