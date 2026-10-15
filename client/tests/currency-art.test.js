"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src/canon.css"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
function sandbox() {
  const start = app.indexOf("  const UI_ICON_PATHS = Object.freeze({");
  const end = app.indexOf("  // Maliyet rozeti:", start);
  assert.ok(start >= 0 && end > start);
  const context = {};
  vm.runInNewContext(app.slice(start, end) + "\nObject.assign(this,{uiIconMarkup,resourceTokenVisual,resourceTokenMarkup});", context);
  return context;
}
test("currency files have one CSS mapping shared by static and dynamic views", () => {
  const context = sandbox();
  for (const [kind, count] of [["flux",1],["credit",2]]) {
    const file = `../assets/ui/currency-v1/${kind}.webp`;
    assert.equal(css.split(file).length - 1, 1);
    const data = fs.readFileSync(path.resolve(root, "src", file));
    assert.equal(data.toString("ascii",0,4), "RIFF");
    assert.equal(data.toString("ascii",8,12), "WEBP");
    assert.ok(data.length < 25000);
    assert.equal(html.split(context.resourceTokenMarkup(kind,"i")).length - 1, count);
    assert.ok(!context.resourceTokenVisual(kind).includes("<svg"));
  }
  assert.ok(!app.includes("resourceTokenSvg"));
  assert.equal(context.resourceTokenVisual("__proto__"), context.resourceTokenVisual("credit"));
});
test("shop currency headings use the real currency art, not UI plate symbols", () => {
  const context = sandbox();
  for (const kind of ["flux","credit"]) {
    assert.ok(html.includes(`data-ui-icon="${kind}:`));
    assert.equal(context.uiIconMarkup(kind,"gold"), context.resourceTokenMarkup(kind,"i"));
    assert.ok(!context.uiIconMarkup(kind).includes('class="ui-icon"'));
  }
  assert.ok(app.includes('icon.innerHTML = resourceTokenVisual(kind);'));
  assert.ok(app.includes('icon.innerHTML = resourceTokenVisual(token);'));
  assert.ok(css.includes('.paid-pack-heading > .resource-symbol.is-token { width:28px;height:28px; }'));
});
