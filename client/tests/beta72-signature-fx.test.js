const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");
const styles = fs.readFileSync("./src/styles.css", "utf8");

require("../src/gridshard-audio.js");
const cues = global.GRIDSHARD_SFX_CUES;

// İmza efektleri motorun gerçek olaylarına bağlıdır.
for (const eventType of [
  "quantum_repeat",
  "quantum_collapse",
  "swarm_released",
  "phoenix_rebirth",
  "prism_energy_converted",
  "sabotage_echo_applied",
  "signature_secondary_hit",
  "nano_repair_pulse",
  "chrono_window_started",
  "chrono_debt_started",
  "attack_windup_started",
]) {
  assert.ok(app.includes(`"${eventType}"`), `${eventType} olayı işlenmiyor`);
}
assert.ok(app.includes("if (presentSignatureEvent(event, snapshot)) {"));
assert.ok(app.includes('startsWith("Faz Zırhı · Faz")'));
assert.ok(app.includes('source?.definition_id === "omega_amplifier"'));
assert.ok(app.includes("destructionFxPlayed.delete(`${ownerId}:${data.target_module_id}`)"));

// Arena sarsıntısı tek yoldan geçer; eski sınıflar kalmadı.
assert.ok(app.includes("function pulseArenaImpact(level=\"light\")"));
assert.ok(!app.includes("fx-module-impact") && !app.includes("fx-core-impact"));
assert.ok(!styles.includes("fx-module-impact") && !styles.includes("fx-core-impact"));
for (const level of ["light", "medium", "heavy", "core"]) {
  assert.ok(css.includes(`.duel-arena.fx-arena-pulse-${level} {`), `${level} sarsıntısı yok`);
}
assert.ok(app.includes("settingsState.settings?.vibration_enabled === false"));

// Hareket azaltma tercihinde sarsıntı yerine parlama kullanılır.
const reducedMotion = css.slice(css.lastIndexOf("@media (prefers-reduced-motion:reduce)"));
assert.ok(reducedMotion.includes("animation:gs-arena-flash"));
assert.ok(reducedMotion.includes(".module-signature-effect > i"));

// Kart imza rozetleri anlık görüntüden gelir ve kart imzasına katılır.
assert.equal((app.match(/signatureBadges:normalizeSignatureBadges\(/g) || []).length, 3);
assert.ok(app.includes("signatureBadges:module.signatureBadges,"));
assert.ok(app.includes("appendSignatureBadges(card, moduleLike.signatureBadges);"));

// Ses adları mevcut dosyalara bağlanır; Beta.71 mobil biçimleri dosya adıyla seçer.
const formats = fs.readFileSync("./src/gridshard-audio-formats.js", "utf8");
for (const cue of [
  "quantum_charge",
  "repeat_echo",
  "swarm_release",
  "phoenix_revive",
  "prism_shield",
  "phase_evade",
  "singularity_field",
  "sabotage_echo",
  "omega_link",
  "chrono_shift",
  "target_lock",
  "nano_pulse",
  "kill_confirm",
  "module_lost",
  "shield_activate",
  "warning",
  "plasma_mortar_fire",
  "quantum_repeater_fire",
  "ion_spear_fire",
  "swarm_fabricator_fire",
  "quantum_cannon_fire",
]) {
  assert.ok(cues[cue], `${cue} ipucu yok`);
  const asset = cues[cue].asset.replace("./assets/audio/", "");
  assert.ok(fs.existsSync(`./assets/audio/${asset}`), `${asset} dosyası yok`);
  assert.ok(formats.includes(`"${asset.replace(".wav", "")}"`), `${asset} mobil biçimi yok`);
}

// Rozet ve efekt yazıları opak koyu zeminde en az 7:1 kontrast verir.
function rgb(hex) {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}
function luminance(color) {
  const [r, g, b] = color.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(foreground, background) {
  const [high, low] = [luminance(rgb(foreground)), luminance(rgb(background))].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}
const signatureBlock = css.slice(css.indexOf("/* Beta.72 — imza efektleri"));
assert.ok(signatureBlock.includes("background:#06111f;"));
const inks = [
  ...signatureBlock.matchAll(/--(?:signature-color|badge-ink):(#[0-9a-fA-F]{6})/g),
].map((match) => match[1]);
assert.ok(inks.length >= 20);
for (const ink of inks) {
  assert.ok(contrast(ink, "#06111f") >= 7, `${ink} kontrastı yetersiz`);
}
