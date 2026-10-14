"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");

test("casual dock replaces five icons and renames Home to Battle without changing routes",()=>{
  const html=read("index.html");
  const dock=html.slice(html.indexOf('<nav id="app-bottom-dock"'),html.indexOf('<section id="shop-screen"'));
  assert.equal((dock.match(/dock-painted-emblem/g)||[]).length,5);
  assert.equal((dock.match(/<img /g)||[]).length,5);
  assert.equal((dock.match(/alt=""/g)||[]).length,5);
  assert.equal((dock.match(/draggable="false"/g)||[]).length,5);
  assert.equal((dock.match(/aria-hidden="true"/g)||[]).length,6); // Icons + sale badge.
  assert.ok(!dock.includes("<svg"));
  for(const screen of ["shop","modules","menu","team","events"]) assert.ok(dock.includes(`data-shell-screen="${screen}"`));
  for(const label of ["MAĞAZA","KARTLAR","SAVAŞ","TAKIM","ETKİNLİK"]) assert.ok(dock.includes(`>${label}</span>`));
  assert.ok(dock.includes('aria-label="Savaş" title="Savaş"'));
  assert.ok(!dock.includes('lobby-dock-home'));
  assert.ok(dock.includes('id="dock-shop-sale"'));
  assert.ok(dock.includes('aria-current="page"'));
  assert.equal(/<image|<filter|<animate|<script|<foreignObject/.test(dock),false);
  const css=read("src/canon.css").split("/* Painted dock assets:")[1]?.split("/* Painted shop chests:")[0];
  assert.ok(css);
  assert.match(css,/object-fit:contain;/);
  assert.match(css,/width:36px !important;/);
  assert.match(css,/width:40px !important;/);
  assert.equal(/animation:|transform:|flex-grow:|url\(/.test(css),false);
  for(const name of ["shop-chamfer-v2","cards","battle-swords-v2","team","events"]) {
    assert.ok(dock.includes(`./assets/ui/dock-casual-v1/${name}.webp`));
    assert.ok(!dock.includes(`${name}.png`),"Large master must not be a runtime asset");
    const file=fs.readFileSync(path.join(__dirname,`../assets/ui/dock-casual-v1/${name}.webp`));
    assert.equal(file.toString("ascii",0,4),"RIFF");
    assert.equal(file.toString("ascii",8,12),"WEBP");
    assert.ok(file.length < 100000,`${name}: oversized dock derivative`);
    assert.ok(fs.existsSync(path.join(__dirname,`../assets/ui/dock-casual-v1/${name}.png`)));
  }
});

test("Battle navigation labels and onboarding are localized consistently",()=>{
  require('../src/i18n-catalog.js');
  const i18n=require('../src/i18n.js');
  assert.equal(i18n.translateText('SAVAŞ','en'),'BATTLE');
  assert.equal(i18n.translateText('Savaş','en'),'Battle');
  assert.equal(i18n.translateText('Savaş ekranına dön','en'),'Back to battle');
  assert.equal(i18n.translateText('Artık hazırsın. SAVAŞ sekmesine dön.','en'),"You're ready. Go back to the BATTLE tab.");
  assert.ok(read('src/app.js').includes('body:"Artık hazırsın. SAVAŞ sekmesine dön."'));
});
