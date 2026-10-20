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
  // Approved paintings as layers: fixed base + painted heading head (8A v1).
  // Registration is measured from the art by tools/prepare-module-layers.cjs.
  const LAYERS = global.GridshardModuleLayerData || (typeof module !== "undefined" && module.exports ? require("./module-layer-data.js") : null);
  // The painted stage is a little larger than the cell and rises above it,
  // like an upright object standing on its socket. Square, bottom anchored.
  // Modules stand ~1.45 cells wide; the core is the board's centrepiece and
  // stands clearly larger (user request, 19 Oct: core > modules).
  const STAGE = Object.freeze({ left:-.35, top:-.7, size:1.7 });
  const CORE_STAGE = Object.freeze({ left:-.375, top:-.75, size:1.75 });
  // Both circuits lie on one GROUND plane seen by the fixed battle camera.
  // A device turns only about its vertical axis: the painting whose ground
  // yaw is nearest to the target's ground direction is shown, never rotated
  // in screen space (that made barrels point at the sky/floor — user, 19 Oct).
  // Plane angles: x right, y toward the camera (south). Any of the eight
  // headings that has a painting is used; missing ones fall to the nearest.
  // 16-view paintings are keyed y00..y15: y00 = east, clockwise in 22.5° steps
  // on the ground (y04 = south/toward the camera, y12 = north/away).
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const GROUND_YAW = Object.freeze({ e:0, se:Math.PI/4, s:Math.PI/2, sw:3*Math.PI/4, w:Math.PI, nw:-3*Math.PI/4, n:-Math.PI/2, ne:-Math.PI/4,
    ...Object.fromEntries(Array.from({length:16},(_,i)=>["y"+String(i).padStart(2,"0"), wrap(i*Math.PI/8)])) });
  const KEEP_HEADING = 4 * Math.PI / 180;
  const pct = v => `${Math.round(v * 100000) / 1000}%`;
  function boxStyle(img, part) {
    if (!img.style) return;
    img.style.left=pct(part.left); img.style.top=pct(part.top);
    img.style.width=pct(part.size); img.style.height=pct(part.size);
  }
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
    return build(host, id, enemy, LAYERS?.[id] || null, STAGE);
  }
  // Upright approved reactor painting for a deployed core (no heading).
  function mountCore(host, coreType) {
    const layer=LAYERS?.[coreType];
    if (!layer?.core) return false;
    return build(host, coreType, false, layer, CORE_STAGE);
  }
  function build(host, id, enemy, layer, frame) {
    const doc = host.ownerDocument;
    const rig = doc.createElement("span");
    rig.className = "module-device-rig"; rig.dataset.device = id;
    const heading = enemy ? "se" : "ne";
    rig.dataset.yaw="continuous";
    rig.dataset.renderer=layer?"layers":ATLAS_IDS.has(id)?"views8":"static";
    if (layer?.core) rig.dataset.core="true";
    const shadow=doc.createElement("span"); shadow.className="module-device-ground-shadow";
    rig.appendChild(shadow);
    const billboard=doc.createElement("span"); billboard.className="module-device-billboard";
    const window=doc.createElement("span"); window.className="module-view-window";
    let stage=null,head=null;
    if(layer){
      stage=doc.createElement("span"); stage.className="module-layer-stage";
      boxStyle(stage,{left:frame.left,top:frame.top,size:frame.size});
      if(layer.kind==="layered"){
        if (layer.base) { const base=image(doc,"module-layer-base","./"+layer.base.src); boxStyle(base,layer.base); stage.appendChild(base); }
        head=doc.createElement("img"); head.className="module-layer-head"; head.alt=""; head.draggable=false;
        head.setAttribute("aria-hidden","true"); head.decoding="async"; stage.appendChild(head); // src set by the first pose
      }else{
        const art=image(doc,"module-layer-art","./"+layer.art.src); boxStyle(art,layer.art); stage.appendChild(art);
        // Working core: coloured stone pulse over the painting (CSS, --core-accent from the card).
        if(layer.core){ const pulse=doc.createElement("span"); pulse.className="module-core-pulse"; pulse.setAttribute("aria-hidden","true");
          pulse.style.left=`${layer.emitter.x*100}%`; pulse.style.top=`${layer.emitter.y*100}%`; stage.appendChild(pulse); }
      }
      window.appendChild(stage);
    }else window.appendChild(image(doc,ATLAS_IDS.has(id)?"module-view-atlas":"module-device-icon",ATLAS_IDS.has(id)?VIEW_ROOT+id+".webp":url(id)));
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
    views.set(host, { id, rig, window, layer, stage:frame, head, headKey:"", angle:enemy ? Math.PI/4 : -Math.PI/4, pose:"", frame:-1 });
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
      if (view.layer?.kind === "layered") applyLayer(view, phase);
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
  function applyLayer(view, phase) {
    const a=view.angle;
    // Repair/Cooler have painted working poses; missing directions keep the rest pose.
    const keyFor=h=>phase === "work" && view.layer.heads[h+"-work"] ? h+"-work" : h;
    let best=null;
    for (const [h,yaw] of Object.entries(GROUND_YAW)) {
      if (!view.layer.heads[h]) continue;
      const delta=Math.abs(wrap(a-yaw));
      if (!best || delta < best.delta) best={heading:h,delta};
    }
    if (!best) return;
    const current=view.rig.dataset.heading;
    if (current && current !== best.heading && view.layer.heads[current] && Math.abs(wrap(a-GROUND_YAW[current])) <= best.delta+KEEP_HEADING) best={heading:current};
    const heading=best.heading, key=keyFor(heading);
    if (view.headKey !== key) {
      const part=view.layer.heads[key];
      boxStyle(view.head,part);
      view.head.src="./"+part.src;
      const turned=view.rig.dataset.heading && view.rig.dataset.heading !== heading;
      view.headKey=key; view.rig.dataset.heading=heading; view.rig.dataset.headPose=key;
      const yaw=GROUND_YAW[heading];
      view.rig.style?.setProperty?.("--layer-recoil-x",`${Math.round(-Math.cos(yaw)*40)/10}%`);
      view.rig.style?.setProperty?.("--layer-recoil-y",`${Math.round(-Math.sin(yaw)*20)/10}%`);
      // A turn between painted headings reads as a quick swivel, not a cut.
      if (turned && view.head.style && typeof global.setTimeout === "function") {
        view.head.style.scale=".84 1.06";
        global.clearTimeout?.(view.swivel);
        view.swivel=global.setTimeout(()=>{ view.head.style.scale=""; },70);
      }
    }
  }
  // Window-normalised muzzle/outlet of the CURRENT painting (rotated with the
  // head's lean), or null when this device is not a layered painting.
  function emitter(host) {
    const view=views.get(host);
    if (!view?.layer) return null;
    let p=view.layer.emitter;
    if (view.layer.kind === "layered") {
      const part=view.layer.heads[view.headKey];
      if (!part) return null;
      p=part.emitter;
    }
    const st=view.stage||STAGE;
    return { x:st.left+p.x*st.size, y:st.top+p.y*st.size };
  }
  function pair(host) {
    const view=views.get(host);
    const st=view?.stage||STAGE;
    return view?.layer?.pair ? view.layer.pair.map(p=>({ x:st.left+p.x*st.size, y:st.top+p.y*st.size })) : null;
  }
  function aimDevice(host, matrix, target) {
    const view=views.get(host), geometry=global.GridshardLaserAim;
    if (!view || !IDS.has(view.id) || !geometry) return null;
    const aimed=geometry.aim(matrix,target,view.angle);
    if (!aimed) return null;
    pose(host,{plane:matrix,targetPoint:target,phase:"work"});
    // A sprite's painted nozzle is not the end of a flat .9-radius rotor.
    // Resolve its registered per-view point on the camera-facing image plane.
    const registration=global.GridshardModuleViewData?.[view.id], layered=emitter(host);
    if (matrix.sprite && layered) aimed.muzzle=geometry.project(matrix.sprite,layered) || aimed.muzzle;
    else if (matrix.sprite && registration?.emitters?.[view.frame]) {
      aimed.muzzle=geometry.project(matrix.sprite,registration.emitters[view.frame]) || aimed.muzzle;
    }
    return aimed;
  }
  const aimLaser=(host,matrix,target)=>views.get(host)?.id === "laser" ? aimDevice(host,matrix,target) : null;
  global.GridshardModuleDeviceArt = Object.freeze({ idFor, markup, mount, pose, aimDevice, aimLaser, frameFor, emitter, pair, mountCore, stage:STAGE, coreStage:CORE_STAGE, groundYaw:GROUND_YAW });
  if (typeof module !== "undefined" && module.exports) module.exports = global.GridshardModuleDeviceArt;
})(globalThis);
