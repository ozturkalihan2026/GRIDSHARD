"use strict";
// Cuts a generated yaw sheet (cols x rows, reading order = yaw index) into
// <id>-y00.webp ... files next to the approved 8A paintings. Index 0 = east,
// clockwise on the ground in 360/N steps (4 = south/toward camera, 12 = north).
// A non-transparent sheet is keyed by its corner colour.
// Usage: node tools/slice-yaw-atlas.cjs <sheet.png> <id> [cols=4] [rows=4] [px=384]
const fs = require("node:fs"), path = require("node:path");
const sharp = require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const [,, sheet, id, colsArg = "4", rowsArg = "4", pxArg = "384"] = process.argv;
if (!sheet || !id) { console.error("kullanım: node tools/slice-yaw-atlas.cjs <sayfa.png> <id> [sütun] [satır] [px]"); process.exit(2); }
const OUT = path.resolve(__dirname, "../client/assets/ui/modules-physical-v1");
(async () => {
    const cols=Number(colsArg),rows=Number(rowsArg),px=Number(pxArg);
    if(!/^[a-z][a-z0-9_]*$/.test(id)||![cols,rows,px].every(n=>Number.isInteger(n)&&n>0)||cols*rows!==16)throw new Error("16 kare ve geçerli modül kimliği gerekli");
    const meta=await sharp(sheet).metadata();
    const sourceOpaque=!meta.hasAlpha||(await sharp(sheet).stats()).isOpaque;
    const cw = meta.width / cols, ch = meta.height / rows, cells = [];
    let components=null,source=null;
    if(process.argv.includes("--components")){
      source=await sharp(sheet).ensureAlpha().raw().toBuffer();
      const w=meta.width,h=meta.height,seen=new Uint8Array(w*h),found=[];
      for(let q=0;q<seen.length;q++){
        if(seen[q]||source[q*4+3]<140)continue;
        const stack=[q],pixels=[];seen[q]=1;let x0=w,y0=h,x1=0,y1=0;
        while(stack.length){const p=stack.pop(),x=p%w,y=Math.floor(p/w);pixels.push(p);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
          for(const a of[x>0?p-1:-1,x<w-1?p+1:-1,y>0?p-w:-1,y<h-1?p+w:-1])if(a>=0&&!seen[a]&&source[a*4+3]>=140){seen[a]=1;stack.push(a);}
        }
        if(pixels.length>1000)found.push({x0,y0,x1,y1,pixels});
      }
      if(found.length!==cols*rows)throw new Error(`Ayrı çizim sayısı ${found.length}; beklenen ${cols*rows}. Hiçbir kare yazılmadı.`);
      found.sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1));components=[];
      for(let r=0;r<rows;r++)components.push(...found.slice(r*cols,(r+1)*cols).sort((a,b)=>a.x0-b.x0));
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const left=Math.round(c*cw),top=Math.round(r*ch);
      const width=Math.round((c+1)*cw)-left,height=Math.round((r+1)*ch)-top;
      // Generated sheets may use rectangular cells: contain the full cell,
      // otherwise a square centre-crop cuts side-facing barrels and feet.
      let input=sharp(sheet).extract({left,top,width,height});
      if(components){
        const part=components[r*cols+c],pad=3,bw=part.x1-part.x0+1+pad*2,bh=part.y1-part.y0+1+pad*2;
        const raw=Buffer.alloc(bw*bh*4),keep=new Uint8Array(bw*bh);
        for(const p of part.pixels){const x=p%meta.width-part.x0+pad,y=Math.floor(p/meta.width)-part.y0+pad;
          for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)keep[(y+dy)*bw+x+dx]=1;
        }
        for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){if(!keep[y*bw+x])continue;const sx=part.x0+x-pad,sy=part.y0+y-pad;if(sx<0||sy<0||sx>=meta.width||sy>=meta.height)continue;source.copy(raw,(y*bw+x)*4,(sy*meta.width+sx)*4,(sy*meta.width+sx)*4+4);}
        input=sharp(raw,{raw:{width:bw,height:bh,channels:4}});
      }
      const d=await input.resize(px-16,px-16,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer();
      if (!components && sourceOpaque) {
        // Opaque flat background: flood-fill from the cell border only, so the dark
        // outline and enclosed dark parts (close in colour) are never removed.
        let keyOffset=0;while(keyOffset<d.length&&d[keyOffset+3]<200)keyOffset+=4;
        const k = [d[keyOffset], d[keyOffset+1], d[keyOffset+2]], dist = i => d[i+3]<8?0:Math.hypot(d[i] - k[0], d[i + 1] - k[1], d[i + 2] - k[2]);
        const bg = new Uint8Array(px * px), stack = [];
        for (let t = 0; t < px; t++) stack.push(t, (px - 1) * px + t, t * px, t * px + px - 1);
        while (stack.length) {
          const q = stack.pop(); if (bg[q] || dist(q * 4) > 10) continue;
          bg[q] = 1; const x = q % px, y = (q / px) | 0;
          if (x > 0) stack.push(q - 1); if (x < px - 1) stack.push(q + 1);
          if (y > 0) stack.push(q - px); if (y < px - 1) stack.push(q + px);
        }
        for (let q = 0; q < px * px; q++) {
          if (bg[q]) { d[q * 4 + 3] = 0; continue; }
          // anti-aliased rim: a pixel touching the removed background fades by its distance
          const x = q % px, y = (q / px) | 0;
          const rim = (x > 0 && bg[q - 1]) || (x < px - 1 && bg[q + 1]) || (y > 0 && bg[q - px]) || (y < px - 1 && bg[q + px]);
          if (rim) { const e = dist(q * 4); if (e < 24) d[q * 4 + 3] = Math.round(255 * (e - 10) / 14); }
        }
      }
      cells.push(await sharp(d,{raw:{width:px,height:px,channels:4}}).webp({quality:92}).toBuffer());
    }
  const orderArg=process.argv.find(arg=>arg.startsWith("--order="));
  const order=orderArg?orderArg.slice(8).split(",").map(Number):cells.map((_,i)=>i);
  if(order.length!==16||new Set(order).size!==16||!order.every(i=>Number.isInteger(i)&&i>=0&&i<16))throw new Error("Yön sırası 0–15 permütasyonu olmalı; hiçbir kare yazılmadı.");
  order.forEach((source, i) => fs.writeFileSync(path.join(OUT, `${id}-y${String(i).padStart(2, "0")}.webp`), cells[source]));
  console.log(`${cells.length} kare yazıldı: ${id}-y00 … ${id}-y${String(cells.length - 1).padStart(2, "0")}.webp`);
})().catch(e => { console.error(e); process.exitCode = 1; });
