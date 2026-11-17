(function (root) {
  'use strict';
  // No catalog registration. The real event owner uses this only with the
  // matching compiled module profile; the offline workbench uses it directly.
  // Server events remain authoritative; this class never changes HP or economy.
  class RecoilCannonPresentation {
    constructor() { this.reset(null); }
    reset(session) { this.session = session; this.seen = new Set(); this.latest = -Infinity; }
    consume(events, { session, elapsedMs, moduleIds, visible = true, finished = false }) {
      if (session !== this.session || elapsedMs < this.latest) this.reset(session);
      this.latest = elapsedMs;
      const ids = new Set(moduleIds);
      const actions = [];
      for (const event of events) {
        const key = JSON.stringify([event.type, event.at_ms, event.data]);
        if (this.seen.has(key)) continue;
        this.seen.add(key);
        if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value);
        if (!visible || finished || !Number.isFinite(event.at_ms) || event.at_ms > elapsedMs || event.at_ms < elapsedMs - 500) continue;
        const d = event.data || {};
        if (event.type === 'module_recoil' && d.definition_id === 'recoil_cannon' && ids.has(d.module_id) && d.counts_as_enemy_damage === false && Number(d.hp_loss) > 0) {
          actions.push({ type: 'wear', playerId: d.player_id, moduleId: d.module_id, hpLoss: Number(d.hp_loss), atMs: event.at_ms });
        } else if (event.type === 'attack_performed' && ids.has(d.attacker_module_id) && (!d.damage_kind || d.damage_kind === 'direct')) {
          actions.push({ type: 'shot', moduleId: d.attacker_module_id, targetPlayerId: d.target_player_id,
            targetModuleId: d.target_module_id, atMs: event.at_ms, travelMs: 360, impact: Number(d.damage) > 0 });
        }
      }
      return actions;
    }
  }
  root.RecoilCannonPresentation = RecoilCannonPresentation;
  if (typeof module !== 'undefined' && module.exports) module.exports = { RecoilCannonPresentation };
})(typeof globalThis !== 'undefined' ? globalThis : this);
