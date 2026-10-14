"use strict";
// Isolated real-DOM component benchmark. Not an Android/full-battle FPS test.
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const assert = require("node:assert/strict");
const {chromium} = require("@playwright/test");
const ROOT = path.resolve(__dirname,"..");
const BASE = "7f82db77fcc7a974ba60508d7a3c9536335f95f1";
const assertOnly = process.argv.includes("--assert-only");

async function main() {
  const browser = await chromium.launch(process.env.CI ? {} : {channel:"chrome",headless:true});
  try {
    const page = await browser.newPage({viewport:{width:393,height:852}});
    await page.setContent('<style>.board{display:grid;grid-template-columns:repeat(5,52px)}.module-card{width:48px;height:48px}.module-icon svg{width:28px;height:28px}</style><main></main>');
    if (!assertOnly) {
      await page.addScriptTag({content:execFileSync("git",["show",BASE+":client/src/battle/board-view.js"],{cwd:ROOT,encoding:"utf8"})});
      await page.evaluate(() => {globalThis.PreviousBoardView=globalThis.GridshardBattleBoardView;});
    }
    for(const file of ["battle/board-view.js","battle/module-card-state-view.js","battle/module-card-view.js"]) {
      await page.addScriptTag({path:path.join(ROOT,"client/src",file)});
    }
    const cdp = await page.context().newCDPSession(page);
    const results=[];
    for(const rate of assertOnly ? [1] : [1,2,4]) {
      await cdp.send("Emulation.setCPUThrottlingRate",{rate});
      for(let repeat=0;repeat<(assertOnly?1:3);repeat++) {
        for(const mode of assertOnly ? ["persistent"] : repeat%2 ? ["persistent","rebuild"] : ["rebuild","persistent"]) {
          const result=await page.evaluate(({mode,iterations}) => {
            const host=document.querySelector("main");host.replaceChildren();
            const board=document.createElement("div");board.className="board";
            for(let y=0;y<3;y++)for(let x=0;x<5;x++) {
              const cell=document.createElement("div");cell.className="board-cell";cell.dataset.x=String(x);cell.dataset.y=String(y);board.appendChild(cell);
            }
            host.appendChild(board);
            let createdCards=0,mounts=0;
            const cardView=new GridshardBattleCardStateView({document,mountIcon:icon=>{
              mounts++;icon.innerHTML=GridshardModuleCardView.emblemFor({nameTr:"Lazer"});
            }});
            const model=m=>({id:m.instanceId,category:"saldırı",name:"Lazer",shortName:"Lazer",artwork:"laser",title:"Lazer",hp:m.hp,maxHp:100,
              heat:m.heat,heatState:"high",heatLabel:"Isı %"+m.heat,powerState:"flowing",powerMessage:"",core:false,enemy:false,
              liveBadges:[{key:"heat",className:"module-live-status heat-high",label:"♨",title:"Isı %"+m.heat}],
              signatureBadges:[{key:"repeat:0",kind:"repeat",className:"module-signature-badge",label:"↻"+(m.hp%4)+"/4",title:"Tekrar"}]});
            const options={moduleSignature:m=>[m.instanceId,m.hp,m.heat].join("|"),
              createModuleCard:m=>{createdCards++;return cardView.create(model(m));},
              updateModuleCard:(card,m)=>cardView.update(card,model(m))};
            const View=mode==="persistent"?GridshardBattleBoardView:PreviousBoardView;
            const view=new View(board);
            const modules=Array.from({length:14},(_,i)=>({instanceId:"laser-"+i,status:"active",position:{x:i%5,y:Math.floor(i/5)},hp:100,heat:70}));
            view.render(modules,options);
            const first=board.querySelector(".module-card"),svg=first.querySelector("svg");
            const observer=new MutationObserver(()=>{});observer.observe(board,{childList:true,subtree:true});
            const start=performance.now();
            for(let tick=1;tick<=iterations;tick++) {
              for(const module of modules){module.hp=20+tick%80;module.heat=70+tick%25;}
              view.render(modules,options);
            }
            const scriptMs=performance.now()-start;
            const records=observer.takeRecords();observer.disconnect();
            const card=board.querySelector(".module-card");
            return {mode,iterations,modules:modules.length,scriptMs:Math.round(scriptMs*10)/10,createdCards,mounts,
              sameCard:card===first,sameSvg:card.querySelector("svg")===svg,
              addedNodes:records.reduce((n,r)=>n+r.addedNodes.length,0),removedNodes:records.reduce((n,r)=>n+r.removedNodes.length,0)};
          },{mode,iterations:assertOnly?20:100});
          if(mode==="persistent") {
            assert.equal(result.createdCards,result.modules);assert.equal(result.mounts,result.modules);
            assert.ok(result.sameCard&&result.sameSvg);assert.equal(result.addedNodes,0);assert.equal(result.removedNodes,0);
          }else{assert.equal(result.createdCards,result.modules*(result.iterations+1));assert.equal(result.sameCard,false);}
          results.push({rate,repeat,...result});
        }
      }
    }
    console.log(JSON.stringify({baseline:BASE,measuredAt:new Date().toISOString(),node:process.version,browser:browser.version(),platform:process.platform,
      kind:"real-DOM card-update component; script time only, not FPS",results},null,2));
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
