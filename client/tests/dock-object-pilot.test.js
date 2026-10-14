"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");

test("dock denemesi yalnız beş gezinme amblemini değiştirir, ad/rozet ve sayfa bağlarını korur",()=>{
  const html=read("index.html");
  const dock=html.slice(html.indexOf('<nav id="app-bottom-dock"'),html.indexOf('<section id="shop-screen"'));
  assert.equal((dock.match(/dock-object-emblem/g)||[]).length,5);
  assert.equal((dock.match(/viewBox="0 0 64 64"/g)||[]).length,5);
  assert.equal((dock.match(/focusable="false"/g)||[]).length,5);
  assert.equal((dock.match(/aria-hidden="true"/g)||[]).length,6); // SVG + sale badge.
  for(const screen of ["shop","modules","menu","team","events"]) assert.ok(dock.includes(`data-shell-screen="${screen}"`));
  for(const label of ["MAĞAZA","KARTLAR","EV","TAKIM","ETKİNLİK"]) assert.ok(dock.includes(`>${label}</span>`));
  assert.ok(dock.includes('id="dock-shop-sale"'));
  assert.ok(dock.includes('aria-current="page"'));
  assert.equal(/<image|<filter|<animate|<script|<foreignObject/.test(dock),false);
  const css=read("src/canon.css").split("/* Dock-only pilot:")[1];
  assert.ok(css);
  assert.match(css,/\.de-body \{ fill:var\(--dock-tone\) !important;/);
  assert.match(css,/stroke:#051326 !important;/);
  assert.equal(/animation:|filter:|url\(/.test(css),false);
});
