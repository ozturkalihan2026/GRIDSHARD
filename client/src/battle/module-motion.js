(function (global) {
  "use strict";

  // Presentation only. No combat mutations, timers, rAF ownership or DOM reads.
  // First ten devices share continuous aim geometry and upright view atlases.
  // Events, never local guesses, supply their targets. The board owns camera.
  const MOVING = new Set(["laser", "pulse_cannon", "missile_launcher", "repair", "cooler", "emp", "shield", "battery", "amplifier", "armor","targeting_computer","barrier","arc_cannon","capacitor","drone_bay","jammer","railgun","current_balancer","reflector","nano_medic","virus","overclock_unit","plasma_mortar","guardian_dome","quantum_repeater","chrono_relay","phase_armor","swarm_fabricator","precision_matrix","ion_spear","prism_shield","disruptor","phoenix_repair","quantum_cannon","omega_amplifier","singularity_projector"]);
  const keyFor = (player, instance) => JSON.stringify([player, instance]);
  const alive = module => module && module.status === "active" && Number(module.hp) > 0
    && module.x != null && module.y != null;
  function headingFor(source, target, fallback = "ne") {
    if (!source || !target || ![source.x, source.y, target.x, target.y].every(Number.isFinite)) return fallback;
    const dx = target.x - source.x, dy = target.y - source.y;
    if (Math.abs(dx) < .01 && Math.abs(dy) < .01) return fallback;
    return `${dy < 0 ? "n" : dy > 0 ? "s" : fallback[0]}${dx < -.01 ? "w" : dx > .01 ? "e" : fallback[1]}`;
  }

  class GridshardModuleMotion {
    constructor({ now, pointFor, draw, reduced = () => false, hidden = () => false }) {
      this.now = now;
      this.pointFor = pointFor;
      this.draw = draw;
      this.reduced = reduced;
      this.hidden = hidden;
      this.reset();
    }
    reset() {
      if (this.records) this.clear();
      this.session = null;
      this.latest = -Infinity;
      this.records = new Map();
      this.actions = new Map();
      this.aimLocks = new Map();
      this.dirty = new Set();
      this.seen = new Set();
      this.destroyedAt = new Map();
      this.geometryDirty = false;
    }
    clear() {
      const affected = new Set([...this.actions?.keys() || [], ...this.dirty || [], ...this.aimLocks?.keys() || []]);
      this.actions?.clear();
      this.aimLocks?.clear();
      for (const key of affected) {
        const record = this.records?.get(key);
        if (record) this.draw(record, { heading:record.home, phase:"rest", disabled:this.disabled(record) });
      }
      this.dirty?.clear();
      this.geometryDirty = false;
    }
    disabled(record) {
      // Waiting for the NEXT energy charge must not suppress a real shot or
      // support pulse that the server has just completed. No event = no action.
      return Boolean(record.module.overheated
        || (record.module.is_powered === false && Number(record.module.energy_required) > 0));
    }
    remember(event) {
      // Server BattleEvent has no event ID; identical tick/type/payload is a replay.
      const key = JSON.stringify([event.at_ms, event.type, event.data || {}]);
      if (this.seen.has(key)) return false;
      this.seen.add(key);
      if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value);
      return true;
    }
    get needsFrame() { return (this.actions.size > 0 || this.geometryDirty) && !this.hidden() && !this.reduced(); }
    invalidateGeometry() {
      // One wake for stationary target locks, never an unbounded retry loop
      // when a card is temporarily absent from the DOM.
      this.geometryDirty = this.actions.size > 0 || this.aimLocks.size > 0;
      for (const [key, action] of this.actions) { action.heading=null; this.dirty.add(key); }
      for (const [key, lock] of this.aimLocks) { lock.heading=null; this.dirty.add(key); }
    }
    receive(events, snapshot, { ownPlayerId, domId }) {
      if (!snapshot?.players) return;
      if (snapshot.session_id !== this.session) {
        this.reset(); this.session = snapshot.session_id;
      }
      const elapsed = Number(snapshot.elapsed_ms || 0);
      if (elapsed < this.latest) return;
      this.latest = elapsed;
      for (const event of events || []) {
        if (event.type !== "module_destroyed" || !Number.isFinite(event.at_ms)) continue;
        const data = event.data || {};
        if (!data.player_id || !data.module_id) continue;
        const key = keyFor(data.player_id, data.module_id);
        this.destroyedAt.set(key, Math.max(this.destroyedAt.get(key) ?? -Infinity, event.at_ms));
      }
      const records = new Map();
      for (const [player, state] of Object.entries(snapshot.players)) {
        for (const module of state.modules || []) {
          if (!alive(module)) continue;
          const key = keyFor(player, module.instance_id);
          // Events can arrive ahead of the ~1s snapshot. Do not keep aiming a
          // destroyed device until that older snapshot catches up. Later active
          // snapshots (rebirth/new deployment) may legitimately restore it.
          if ((this.destroyedAt.get(key) ?? -Infinity) >= elapsed) continue;
          const record = { key, player, module, domId:domId(player, module),
            definition:module.definition_id, home:player === ownPlayerId ? "ne" : "se" };
          records.set(key, record);
          const previous = this.records.get(key);
          if (!previous || this.disabled(previous) !== this.disabled(record)) this.dirty.add(key);
        }
      }
      this.records = records;
      // Retain the last real target between actions. A lost
      // target/source releases the lock; no invented retargeting or extra shot.
      for (const [key, lock] of this.aimLocks) {
        if (!records.has(key) || !records.has(lock.target)) {
          this.aimLocks.delete(key); this.dirty.add(key);
        }
      }
      for (const [key, action] of this.actions) {
        const source = records.get(key);
        if (!source || this.disabled(source) || (action.target && !records.has(action.target))) {
          this.actions.delete(key); this.dirty.add(key);
        }
      }
      if (this.hidden() || snapshot.status === "finished") { this.clear(); return; }
      const latestEvent = Math.max(elapsed, ...(events || []).map(e => Number(e.at_ms) || 0));
      const chosen = new Map();
      for (const event of events || []) {
        if (!Number.isFinite(event.at_ms) || event.at_ms < latestEvent - 500 || !this.remember(event)) continue;
        const data = event.data || {};
        let player, sourceId, targetPlayer, targetId, windup = false;
        switch (event.type) {
          case "attack_performed":
          case "sabotage_applied":
            player = data.attacker_player_id; sourceId = data.attacker_module_id;
            targetPlayer = data.target_player_id; targetId = data.target_module_id; break;
          case "attack_windup_started":
            player = data.player_id; sourceId = data.module_id;
            targetPlayer = data.target_player_id || Object.keys(snapshot.players).find(p => p !== player);
            targetId = data.target_module_id; windup = true; break;
          case "module_repaired":
          case "module_overclocked":
          case "phoenix_rebirth":
          case "module_cooled":
            player = data.player_id; sourceId = data.source_module_id;
            targetPlayer = data.target_player_id || player;
            targetId = data.target_module_id || data.module_id; break;
          case "damage_reflected":
            player=data.source_player_id; sourceId=data.source_module_id;
            targetPlayer=data.target_player_id; targetId=data.target_module_id; break;
          case "module_damaged":
            player=data.player_id; sourceId=data.module_id;
            if (!["shield","armor"].includes(records.get(keyFor(player,sourceId))?.definition)) continue;
            targetPlayer=data.source_player_id; targetId=data.source_module_id; break;
          case "module_cycle_pulse":
          case "amplifier_pulse":
            player = data.player_id; sourceId = data.module_id || data.source_module_id;
            targetPlayer=data.target_player_id || player;
            targetId=data.target_module_id || data.charged_module_ids?.[0]; break;
          case "module_contribution":
            player = data.source_player_id || data.player_id; sourceId = data.source_module_id;
            // Contributions for active attackers/support repeat their primary
            // event. Passive devices may face their real contribution receiver.
            if (["laser","pulse_cannon","missile_launcher","repair","cooler","emp","arc_cannon","drone_bay","jammer","railgun","reflector","nano_medic","virus","overclock_unit","plasma_mortar","quantum_repeater","swarm_fabricator","ion_spear","disruptor","phoenix_repair","quantum_cannon","singularity_projector"].includes(records.get(keyFor(player, sourceId))?.definition)) continue;
            targetPlayer=data.target_player_id || player;
            targetId=data.target_module_id;
            break;
          default: continue;
        }
        const key = keyFor(player, sourceId), source = records.get(key);
        if (!source || this.disabled(source)) continue;
        // Do not replace a targeted support pulse with its targetless cycle event.
        if (!targetId && MOVING.has(source.definition)) continue;
        const targetKey = targetId ? keyFor(targetPlayer, targetId) : null;
        if (targetKey && !records.has(targetKey)) continue;
        const self = targetKey === key;
        const candidate = { target:self ? null : targetKey, windup,
          aim:windup ? Math.max(100, Math.min(1200, Number(data.ready_at_ms) - event.at_ms || 150)) : 90,
          start:this.now(), stamp:event.at_ms, heading:null, phase:null };
        candidate.noAim=self;
        const lock = MOVING.has(source.definition) && this.aimLocks.get(key);
        if (lock && lock.target === candidate.target) {
          candidate.heading = lock.heading; candidate.angle = lock.angle;
          candidate.targetPoint = lock.targetPoint;
        }
        const running=this.actions.get(key);
        const previous = chosen.get(key) || (source.definition==="cooler" && running?.stamp===candidate.stamp ? running : null);
        if(source.definition === "cooler" && event.type === "module_cooled"){
          candidate.targets=[candidate.target];
          if(previous?.targets && previous.stamp===candidate.stamp){
            if(!previous.targets.includes(candidate.target) && previous.targets.length<3)previous.targets.push(candidate.target);
            chosen.set(key,previous);
            continue;
          }
        }
        // Multi-target support: one action, first real target in this tick; never
        // queue simultaneous repairs as sequential extra gameplay actions.
        if (!previous || candidate.stamp > previous.stamp || (previous.windup && !windup)) chosen.set(key, candidate);
      }
      for (const [key, action] of chosen) { this.actions.set(key, action); this.dirty.add(key); }
    }
    tick(time = this.now()) {
      this.geometryDirty = false;
      if (this.hidden()) { this.clear(); return; }
      for (const [key, action] of this.actions) {
        const source = this.records.get(key);
        let age = time - action.start;
        const sequence=action.targets?.length>1;
        if(sequence){
          const index=Math.min(action.targets.length-1,Math.max(0,Math.floor(age/240)));
          const next=action.targets[index];
          if(action.target!==next){action.target=next;action.heading=null;action.phase=null;this.dirty.add(key);}
          age-=index*240;
        }
        const target = action.target ? this.records.get(action.target) : null;
        if (!source || this.disabled(source) || (action.target && !target)) {
          this.actions.delete(key); this.dirty.add(key); continue;
        }
        const work = source.definition === "repair" ? 340 : source.definition === "cooler" ? 150 : 170;
        if (age < 0 || age > action.aim + (action.windup ? 120 : work + 150)) {
          this.actions.delete(key); this.dirty.add(key); continue;
        }
        if (!action.heading) {
          // All geometry is supplied by the owner's batched screen-coordinate
          // cache, after the persistent board render. Both boards/perspective work.
          const from = this.pointFor(source), to = target ? this.pointFor(target) : null;
          if (target && (!from || !to)) { this.dirty.add(key); continue; }
          action.heading = target ? headingFor(from, to, source.home) : source.home;
          action.angle = action.noAim ? undefined : target && (from.x !== to.x || from.y !== to.y)
            ? Math.atan2(to.y-from.y,to.x-from.x)
            : ({ne:-Math.PI/4,nw:-3*Math.PI/4,se:Math.PI/4,sw:3*Math.PI/4}[source.home]);
          action.targetPoint = to;
        }
        if (MOVING.has(source.definition) && action.target) {
          this.aimLocks.set(key, {target:action.target, heading:action.heading, angle:action.angle, targetPoint:action.targetPoint});
        }
        const reduced = this.reduced();
        const phase = age < action.aim ? "aim" : action.windup ? "recover"
          : age < action.aim + work ? "work" : "recover";
        const visualPhase = reduced ? "rest" : phase;
        const frame = !reduced && phase === "work" && source.definition === "cooler"
          ? Math.floor((age - action.aim) / 90) % 2 : 0;
        if (action.phase !== visualPhase || action.frame !== frame || this.dirty.has(key) || (!reduced && phase === "aim" && action.aimAge !== age)) {
          if (this.draw(source, { heading:action.heading, angle:action.angle, targetPoint:action.targetPoint, phase:visualPhase, frame,
            aimProgress:phase === "aim" ? Math.min(1,age/Math.max(1,action.aim)) : 1, disabled:false }) !== false) {
            action.phase = visualPhase; action.frame = frame; action.aimAge=age; this.dirty.delete(key);
          }
        }
      }
      for (const key of [...this.dirty]) {
        if (this.actions.has(key)) continue;
        const record = this.records.get(key);
        const lock = this.aimLocks.get(key);
        if (record && lock && !lock.heading) {
          const from=this.pointFor(record), to=this.pointFor(this.records.get(lock.target));
          if (!from || !to) continue;
          lock.heading=headingFor(from,to,record.home); lock.angle=Math.atan2(to.y-from.y,to.x-from.x); lock.targetPoint=to;
        }
        if (!record || this.draw(record, { heading:lock?.heading || record.home, angle:lock?.angle, targetPoint:lock?.targetPoint, phase:"rest", disabled:this.disabled(record) }) !== false) this.dirty.delete(key);
      }
    }
  }
  global.GridshardModuleMotion = GridshardModuleMotion;
  if (typeof module !== "undefined" && module.exports) module.exports = { GridshardModuleMotion, headingFor };
})(globalThis);
