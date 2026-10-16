(function (global) {
  "use strict";

  // Presentation only: never generate rewards or synthesize missing thresholds.
  function roadProgress(nodes, floor, ceiling, rating, terminal = false) {
    const valid = (Array.isArray(nodes) ? nodes : []).filter((node) =>
      node && typeof node === "object" && Object.keys(node.rewards || {}).length && Number.isFinite(Number(node.trophies))
    );
    const end = terminal ? Math.max(floor, ...valid.map((node) => Number(node.trophies))) : ceiling;
    const stops = [...new Set(valid.map((node) => Number(node.trophies)))]
      .filter((value) => value > floor && value <= end).sort((a, b) => a - b);
    return {
      ceiling:end,
      completed:stops.filter((value) => rating >= value).length,
      stops:stops.map((value, index) => ({
        trophies:value,
        fill:Math.max(0, Math.min(100, (rating - (stops[index - 1] ?? floor))
          / (value - (stops[index - 1] ?? floor)) * 100)),
      })),
    };
  }

  // Reward/invitation read markers are device-local and player-scoped. Notices
  // retain the existing server seen endpoint. Neither path claims a reward.
  function createReadStore({ read, write, playerId }) {
    const profiles = new Map();
    function current() {
      const id = String(playerId() || "");
      if (!profiles.has(id)) {
        let values = [];
        try { values = JSON.parse(read("gridshard.inbox.read.v1:" + encodeURIComponent(id)) || "[]"); } catch (_) {}
        profiles.set(id, new Set(Array.isArray(values) ? values.filter((value) => typeof value === "string").slice(-2000) : []));
      }
      return { id, values:profiles.get(id) };
    }
    return {
      has(key) { return Boolean(key && current().values.has(key)); },
      mark(key) {
        if (!key) return;
        const { id, values } = current();
        values.delete(key);
        values.add(key);
        while (values.size > 2000) values.delete(values.values().next().value);
        write("gridshard.inbox.read.v1:" + encodeURIComponent(id), JSON.stringify([...values]));
      },
    };
  }

  global.GridshardHomeInterface = Object.freeze({ roadProgress, createReadStore });
  if (typeof module === "object" && module.exports) module.exports = global.GridshardHomeInterface;
})(typeof globalThis !== "undefined" ? globalThis : this);
