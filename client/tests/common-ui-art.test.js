"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const app=fs.readFileSync(path.join(root,"src/app.js"),"utf8");
const css=fs.readFileSync(path.join(root,"src/canon.css"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const names=["settings","message","friends","profile","gift","calendar","statistics","cosmetics","info","menu"];
function helpers(){
  const start=app.indexOf("  const UI_ICON_PATHS = Object.freeze({");
  const end=app.indexOf("  // Maliyet rozeti:",start);
  assert.ok(start>=0&&end>start);
  const ctx={};
  vm.runInNewContext(app.slice(start,end)+"\nObject.assign(this,{UI_ART_ICONS,UI_ICON_PATHS,uiIconMarkup});",ctx);
  return ctx;
}
test("all ten approved UI icons are lightweight WebP files with one CSS source",()=>{
  let total=0;
  for(const name of names){
    const file=`../assets/ui/common-icons-v1/${name}.webp`;
    assert.equal(css.split(file).length-1,1);
    const bytes=fs.readFileSync(path.resolve(root,"src",file));
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WEBP");
    assert.ok(bytes.length<25000);total+=bytes.length;
    assert.ok(css.includes(`.ui-art[data-ui-art="${name}"] { --ui-art-image:var(--ui-art-${name}); }`));
  }
  assert.equal(total,173662);
});
test("legacy and canonical icon names share the approved art without old plates or injected attributes",()=>{
  const ctx=helpers();
  for(const [alias,name] of Object.entries(ctx.UI_ART_ICONS)){
    assert.ok(names.includes(name));
    const markup=ctx.uiIconMarkup(alias,'blue" onclick="bad()');
    assert.ok(markup.includes('class="ui-icon is-artwork"'));
    assert.ok(markup.includes(`data-ui-art="${name}"`));
    assert.ok(!markup.includes("<svg")&&!markup.includes("onclick"));
    assert.equal(ctx.UI_ICON_PATHS[alias],undefined);
  }
  assert.ok(ctx.uiIconMarkup("__proto__").includes('data-icon="star"'));
  assert.ok(ctx.uiIconMarkup("shield","blue").includes("<svg"));
  assert.ok(ctx.uiIconMarkup("flux").includes('class="currency-art"'));
});
test("independent message/menu/settings/profile and empty-state icons also use the common source",()=>{
  for(const name of ["settings","message","menu","profile"]) assert.ok(html.includes(`data-ui-art="${name}"`));
  assert.equal((html.match(/class="lobby-menu-icon ui-art"/g)||[]).length,2);
  assert.ok(!html.includes('<svg class="reward-inbox-icon"')&&!html.includes('<svg class="lobby-menu-icon"'));
  assert.ok(app.includes('empty.appendChild(createUiIcon("people", "green"));'));
  assert.ok(css.includes('background:var(--ui-art-info) center / contain no-repeat;'));
  assert.ok(!html.includes('title="Ayarlar">⚙'));
  // Selected cosmetic avatars and their IDs are deliberately not replaced.
  assert.ok(app.includes('element.textContent = avatar.glyph;'));
});
test("profile bar message and menu icons have no button plate but keep hit targets, badge and focus",()=>{
  const final=css.slice(css.indexOf("/* Kullanıcı ek onayı:"));
  assert.ok(final.includes('.app-progress-ribbon #reward-inbox-button'));
  assert.ok(final.includes('.app-progress-ribbon #lobby-menu-button[aria-expanded="true"]'));
  for(const rule of ['border:0 !important;','background:transparent !important;','box-shadow:none !important;','outline:2px solid #72f5e7 !important;']) assert.ok(final.includes(rule));
  assert.ok(!/\b(?:width|height|min-width|min-height):/.test(final));
  assert.ok(html.includes('id="reward-inbox-notification" hidden'));
});
