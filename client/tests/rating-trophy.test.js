"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
function node(tag){return {tag,attributes:{},children:[],classes:new Set(),
  get classList(){return {add:value=>this.classes.add(value)};},
  setAttribute(name,value){this.attributes[name]=value;},
  replaceChildren(...children){this.children=children;}};}
function helpers(){
  const context={document:{createElement:node,createTextNode:text=>({tag:"#text",textContent:text})},
    uiLocale:()=>"tr-TR",localizedUiText:text=>text};
  const begin=source.indexOf("  function createRatingTrophyIcon()"),end=source.indexOf("  function createTeamMemberRow(",begin);
  vm.runInNewContext(source.slice(begin,end)+";this.api={renderTrophyValue,renderTrophyCaption};",context);
  return context.api;
}
test("kupa miktarı ve yerel sayı biçimi korunur; görsel dekoratiftir",()=>{
  const {renderTrophyValue}=helpers();
  for(const [value,expected]of [[5800,"5.800"],[0,"0"],[-42,"-42"],["—","—"]]){
    const target=node("strong");renderTrophyValue(target,value);
    const [number,icon]=target.children;
    assert.equal(number.textContent,expected);
    assert.equal(target.attributes["aria-label"],`${expected} Kupa`);
    assert.equal(icon.tag,"img");assert.equal(icon.alt,"");assert.equal(icon.draggable,false);
    assert.equal(icon.attributes["aria-hidden"],"true");
    assert.equal(icon.src,"./assets/ui/rating-trophy-v1/rating-trophy.webp");
  }
});
test("kupa bilgi satırına oyuncu metni HTML olarak eklenmez",()=>{
  const {renderTrophyCaption}=helpers(),target=node("small");
  const payload='<img src=x onerror="bad()">';
  renderTrophyCaption(target,payload,5800,"ÇEVRİMİÇİ",true);
  assert.equal(target.children[0].tag,"#text");
  assert.equal(target.children[0].textContent,`${payload} · `);
  assert.ok(target.children[1].classes.has("trophy-icon-first"));
  assert.equal(target.children[2].textContent," · ÇEVRİMİÇİ");
});
test("bütün bağlantılar aynı WebP'yi kullanır; sıralama ödül kupaları ayrı kalır",()=>{
  const asset=fs.readFileSync(path.join(__dirname,"../assets/ui/rating-trophy-v1/rating-trophy.webp"));
  assert.equal(asset.toString("ascii",0,4),"RIFF");assert.equal(asset.toString("ascii",8,12),"WEBP");
  assert.ok(source.includes('renderTrophyValue(points, row.trophies_earned || row.points)'));
  assert.ok(source.includes('localizedMessage("team.directory_members"'));
  const start=source.indexOf("  const PROFILE_HONOR_ICONS = Object.freeze({");
  const end=source.indexOf("  function deckDisplayName(",start);
  assert.ok(start>0 && end>start);
  assert.equal(source.slice(start,end).includes("rating-trophy-v1"),false);
});
