"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "src/canon.css"), "utf8");
const feedback = css.slice(css.indexOf("/* === Görsel geri bildirim düzeltmeleri"));

function dateView(locale) {
  const context = { document:{ createElement:(tag) => ({ tag, append(...children) { this.children = children; } }) },
    uiLocale:() => locale, localizedUiText:(text) => text };
  vm.runInNewContext(app.slice(app.indexOf("  function createInboxCardMeta("), app.indexOf("  function createInboxInvitationCard(")) + "\nthis.meta = createInboxCardMeta;", context);
  return context.meta;
}

test("all message card types include a real date or an explicit unknown marker", () => {
  for (const locale of ["tr-TR", "en-US"]) {
    const meta = dateView(locale);
    const card = meta({ created_at:"2026-10-13T18:16:00+00:00" }, "Açıklama");
    const stamp = card.children[1];
    assert.equal(stamp.tag, "time");
    assert.equal(stamp.dateTime, "2026-10-13T18:16:00.000Z");
    assert.ok(stamp.textContent.includes("2026"));
    for (const item of [{}, { created_at:"invalid" }]) {
      const missing = meta(item, "Metin").children[1];
      assert.equal(missing.textContent, "Tarih kaydı yok");
      assert.equal(missing.dateTime, undefined);
    }
  }
  assert.ok(app.includes("createInboxCardMeta(item, detailText)"));
  assert.ok(app.includes("createInboxCardMeta(notice,"));
  assert.ok(app.includes("createInboxCardMeta(message,"));
});

test("System is rightmost, contains notifications, and only viewed notifications are marked seen", () => {
  const dialog = html.slice(html.indexOf('<dialog id="reward-inbox-dialog"'), html.indexOf('</dialog>', html.indexOf('<dialog id="reward-inbox-dialog"')));
  const tabs = [...dialog.matchAll(/data-inbox-tab="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(tabs, ["battle", "purchase", "reward", "system"]);
  assert.match(dialog, /id="inbox-panel-system"[^>]*hidden>[\s\S]*?id="reward-inbox-notices"/);
  assert.ok(app.includes('activeInboxTab === "system" ? rewardInboxState?.notices || [] : []'));
  assert.ok(app.includes('const tabs = ["battle", "purchase", "reward", "system"];'));
});

test("sale notice is inside the odds dialog and enabled price chips stay light", () => {
  const store = html.slice(html.indexOf('<section id="shop-screen"'), html.indexOf('<dialog id="reward-ad-dialog"'));
  assert.ok(!store.includes('id="chest-store-sale"'));
  const odds = html.slice(html.indexOf('<dialog id="chest-odds-dialog"'), html.indexOf('<section id="modules-screen"'));
  assert.ok(odds.includes('id="chest-store-sale"'));
  assert.match(feedback, /\.chest-store-buy:not\(:disabled\) \.cost-chip > b \{ color:#f5f9ff !important;/);
});

test("art and name reserve separate vertical space and popover shares panel surfaces", () => {
  assert.match(feedback, /font-size:\.875rem !important/);
  assert.match(feedback, /padding:52px 0 5px !important/);
  assert.match(feedback, /min-height:104px !important/);
  assert.match(feedback, /#module-quick-actions,\s*#core-quick-actions \{[^}]*background:var\(--gs3-slab\)/);
  assert.ok(!/module-detail-close|core-detail-close/.test(feedback));
});

test("single/bulk delete is category-scoped, recoverable, and stale reads cannot restore deleted rows", () => {
  assert.ok(html.includes('id="inbox-delete-all"'));
  assert.ok(html.includes('id="inbox-delete-undo"'));
  assert.ok(html.includes('id="inbox-delete-confirm-dialog"'));
  assert.ok(html.includes('id="inbox-delete-cancel"'));
  assert.ok(app.includes('remove.className = "inbox-message-delete"'));
  assert.ok(app.includes('all_in_category:all, restore'));
  assert.ok(app.includes('lastInboxDismiss.playerId !== participantPlayerId'));
  assert.ok(app.includes('version !== inboxMutationVersion || inboxDismissBusy || playerId !== participantPlayerId'));
  const controls = app.slice(app.indexOf("  function renderInboxDismissControls("), app.indexOf("  async function dismissInboxMessages("));
  assert.match(controls, /\["purchase", "system"\]\.includes\(activeInboxTab\)/);
  const bindings = app.slice(app.indexOf('  document.getElementById("inbox-delete-all")?.addEventListener'), app.indexOf('  for (const tab of document.querySelectorAll("[data-inbox-tab]"))'));
  assert.ok(!bindings.includes("window.confirm"));
  assert.ok(bindings.includes("pending.playerId !== participantPlayerId"));
  assert.ok(bindings.includes("dismissInboxMessages(pending.category"));
});
