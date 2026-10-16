"use strict";
// Approved 5A/5B artwork, shared by road, inbox, leaderboard, stock and reveal.
// Presentation only: no requests, purchases, grants, timers or account writes.
(function(root) {
  const entries = Object.freeze({
  "league_spark": {
    "closed": "./assets/ui/reward-chests-v1/leagues/spark.webp",
    "open": "./assets/ui/reward-chests-v1/leagues/spark-open.webp",
    "color": "#ffd24a",
    "rgb": "255,210,74",
    "league": "spark"
  },
  "league_volt": {
    "closed": "./assets/ui/reward-chests-v1/leagues/volt.webp",
    "open": "./assets/ui/reward-chests-v1/leagues/volt-open.webp",
    "color": "#5ad1ff",
    "rgb": "90,209,255",
    "league": "volt"
  },
  "league_reactor": {
    "closed": "./assets/ui/reward-chests-v1/leagues/reactor.webp",
    "open": "./assets/ui/reward-chests-v1/leagues/reactor-open.webp",
    "color": "#6dffa0",
    "rgb": "109,255,160",
    "league": "reactor"
  },
  "league_quantum": {
    "closed": "./assets/ui/reward-chests-v1/leagues/quantum.webp",
    "open": "./assets/ui/reward-chests-v1/leagues/quantum-open.webp",
    "color": "#b58cff",
    "rgb": "181,140,255",
    "league": "quantum"
  },
  "league_nexus": {
    "closed": "./assets/ui/reward-chests-v1/leagues/nexus.webp",
    "open": "./assets/ui/reward-chests-v1/leagues/nexus-open.webp",
    "color": "#ff8ad1",
    "rgb": "255,138,209",
    "league": "nexus"
  },
  "league_champions": {
    "closed": "./assets/ui/reward-chests-v1/leagues/champions.webp",
    "open": "./assets/ui/reward-chests-v1/leagues/champions-open.webp",
    "color": "#ffb347",
    "rgb": "255,179,71",
    "league": "champions"
  },
  "league_legendary": {
    "closed": "./assets/ui/reward-chests-v1/leagues/legendary.webp",
    "open": "./assets/ui/reward-chests-v1/leagues/legendary-open.webp",
    "color": "#ff7a6b",
    "rgb": "255,122,107",
    "league": "legendary"
  },
  "league_gridshard": {
    "closed": "./assets/ui/reward-chests-v1/leagues/gridshard.webp",
    "open": "./assets/ui/reward-chests-v1/leagues/gridshard-open.webp",
    "color": "#fff0a8",
    "rgb": "255,240,168",
    "league": "gridshard"
  },
  "rank_crown": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_crown.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_crown-open.webp",
    "color": "#ffd24a",
    "rgb": "255,210,74",
    "league": ""
  },
  "rank_prism": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_prism.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_prism-open.webp",
    "color": "#8ad9ff",
    "rgb": "138,217,255",
    "league": ""
  },
  "rank_reactor": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_reactor.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_reactor-open.webp",
    "color": "#ffad66",
    "rgb": "255,173,102",
    "league": ""
  },
  "rank_frequency": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_frequency.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_frequency-open.webp",
    "color": "#b58cff",
    "rgb": "181,140,255",
    "league": ""
  },
  "rank_circuit": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_circuit.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_circuit-open.webp",
    "color": "#63e4bb",
    "rgb": "99,228,187",
    "league": ""
  },
  "rank_current": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_current.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_current-open.webp",
    "color": "#ffe06b",
    "rgb": "255,224,107",
    "league": ""
  },
  "rank_neuron": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_neuron.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_neuron-open.webp",
    "color": "#ff81cb",
    "rgb": "255,129,203",
    "league": ""
  },
  "rank_relay": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_relay.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_relay-open.webp",
    "color": "#6ab3ff",
    "rgb": "106,179,255",
    "league": ""
  },
  "rank_conductor": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_conductor.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_conductor-open.webp",
    "color": "#67ece0",
    "rgb": "103,236,224",
    "league": ""
  },
  "rank_spark": {
    "closed": "./assets/ui/reward-chests-v1/ranks/rank_spark.webp",
    "open": "./assets/ui/reward-chests-v1/ranks/rank_spark-open.webp",
    "color": "#ffba58",
    "rgb": "255,186,88",
    "league": ""
  }
});
  Object.values(entries).forEach(Object.freeze);
  // Tournament variants reuse approved physical artwork, not a new reward.
  const aliases = Object.freeze({
    weekly_circuit_crown:"league_champions", weekly_prism:"rank_prism", weekly_pulse:"rank_frequency",
    team_reactor_crown:"league_reactor", team_prism_relay:"league_nexus", team_signal_cache:"rank_relay",
  });
  function has(id) { return Object.hasOwn(entries, String(id || "")) || Object.hasOwn(aliases, String(id || "")); }
  function markup(id, { open = false, reveal = false, large = false } = {}) {
    if (!has(id)) return "";
    const art = entries[Object.hasOwn(aliases, id) ? aliases[id] : id];
    const league = id.startsWith("league_") ? art.league : "";
    const classes = "chest-visual reward-chest-art"
      + (league ? " league-chest league-chest-painted" : "")
      + (large ? " chest-visual-large" : "") + (open ? " is-open" : "");
    const image = (state) => '<img class="casual-chest-' + state + '" src="' + art[state]
      + '" width="384" height="384" alt="" aria-hidden="true" draggable="false" decoding="async">';
    const images = reveal ? image("closed") + image("open") : image(open ? "open" : "closed");
    const effects = reveal ? '<span class="casual-chest-burst"></span>' : "";
    const particles = reveal ? '<span class="casual-chest-particles">' + "<i></i>".repeat(6) + "</span>" : "";
    return '<span class="' + classes + '" data-reward-chest="' + id + '"'
      + (league ? ' data-league-chest="' + league + '"' : "")
      + ' aria-hidden="true"><span class="casual-chest-stage" style="--casual-glow:' + art.rgb
      + ';--casual-highlight:' + art.color + '">' + effects + images + particles + "</span></span>";
  }
  root.GRIDSHARD_REWARD_CHEST_ART = Object.freeze({ entries, aliases, has, markup });
})(typeof globalThis === "undefined" ? window : globalThis);
