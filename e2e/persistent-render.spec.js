const {test, expect} = require("@playwright/test");
const {waitForParticipantReady} = require("./ui-helpers");

test("özdeş meta verisi kartları korur; deste, modül, çekirdek ve dil değişimi cache'i yeniler", async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));
  // Test-only private seam in the local fixture's response. No new mutation API
  // is shipped, and no live/player account or existing browser session is used.
  await page.route("**/src/app.js", async route => {
    const response = await route.fetch();
    const source = await response.text();
    const closing = source.lastIndexOf("\n})();");
    expect(closing).toBeGreaterThan(0);
    const seam = `
      globalThis.__renderAudit = {
        home:renderHomeHub, modules:renderModuleCollection, cores:renderCoreCollection,
        meta:()=>metaProgressionState,
        setMeta:value=>{metaProgressionState=value;},
        deck:()=>deckEditorSlots, setDeck:value=>{deckEditorSlots=value;},
      };
    `;
    await route.fulfill({response, body:source.slice(0, closing) + seam + source.slice(closing)});
  });
  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
  const result = await page.evaluate(() => {
    const audit = __renderAudit;
    const clone = value => JSON.parse(JSON.stringify(value));
    const first = id => document.getElementById(id).firstElementChild;
    const render = () => {audit.home();audit.modules();audit.cores();};
    const original = clone(audit.meta());
    const originalDeck = [...audit.deck()];
    render();
    const ids = ["home-active-deck", "module-collection-grid", "core-collection-list"];
    const before = ids.map(first);
    if (before.some(node=>!node)) throw new Error("cache fixture needs rendered cards");
    for (let i=0;i<20;i++) {audit.setMeta(clone(original));render();}
    const stable = ids.every((id, index) => first(id) === before[index]);

    const changedModule = clone(original);
    changedModule.module_collection[0].level += 1;
    audit.setMeta(changedModule);render();
    const moduleUpdated = first(ids[1]) !== before[1];
    const unaffectedCores = first(ids[2]) === before[2];

    const changedCore = clone(changedModule);
    changedCore.cores.types[0].level += 1;
    audit.setMeta(changedCore);render();
    const coreUpdated = first(ids[2]) !== before[2];
    const deckBefore = first(ids[0]);
    audit.setDeck([...originalDeck].reverse());render();
    const deckUpdated = first(ids[0]) !== deckBefore;

    const languageBefore = ids.map(first);
    GridshardI18n.apply("en");render();
    const languageUpdated = ids.every((id, index) => first(id) !== languageBefore[index]);
    audit.setMeta(original);audit.setDeck(originalDeck);GridshardI18n.apply("tr");render();
    return {stable,moduleUpdated,unaffectedCores,coreUpdated,deckUpdated,languageUpdated};
  });
  expect(result).toEqual({stable:true,moduleUpdated:true,unaffectedCores:true,coreUpdated:true,deckUpdated:true,languageUpdated:true});
});
