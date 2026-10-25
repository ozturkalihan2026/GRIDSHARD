(function(root){
  "use strict";
  const NS="http://www.w3.org/2000/svg";
  const profiles=root.GridshardModulePresentation || (typeof module!=="undefined"&&module.exports?require("./module-presentation-profiles.js"):{});
  const weaponTimes=Object.fromEntries(Object.values(profiles).filter(p=>p.travel!==null).map(p=>[p.id,p.travel]));
  const alive=m=>m && m.status==="active" && Number(m.hp)>0 && m.x!=null && m.y!=null;
  const operational=m=>alive(m) && m.is_powered!==false && !m.overheated;
  // v15: the first ten modules use the approved crafted WAVs (not the
  // synthesized module_* blips) and the canvas effect set.
  const CRAFTED_CUES=Object.freeze({repair:"repair_beam",cooler:"cooling_air",emp:"emp",amplifier:"amplifier_charge",battery:"battery_charge"});
  const FIRST_TEN=new Set(["laser","shield","cooler","battery","amplifier","emp","repair","armor","pulse_cannon","missile_launcher"]);
  function ellipseHit(from,to,ellipse){
    const dx=to.x-from.x,dy=to.y-from.y,rx=ellipse.rx,ry=ellipse.ry;
    if(!(rx>0&&ry>0))return to;
    const x=from.x-ellipse.x,y=from.y-ellipse.y;
    const a=dx*dx/(rx*rx)+dy*dy/(ry*ry),b=2*(x*dx/(rx*rx)+y*dy/(ry*ry)),c=x*x/(rx*rx)+y*y/(ry*ry)-1;
    const d=b*b-4*a*c;if(!(a>0)||d<0||c<=0)return to;
    const t=(-b-Math.sqrt(d))/(2*a);
    return t>=0&&t<=1?{x:from.x+dx*t,y:from.y+dy*t}:to;
  }
  // The raised cap and its shallow front footprint have different vertical
  // radii. Hit the same two half-ellipses drawn below, not a flat full ring.
  function domeHit(from,to,dome){
    const dx=to.x-from.x,dy=to.y-from.y,x=from.x-dome.x,y=from.y-dome.y;
    const startRy=y<=0?dome.ry:dome.baseRy;
    if(!(dome.rx>0&&dome.ry>0&&dome.baseRy>0)||x*x/(dome.rx*dome.rx)+y*y/(startRy*startRy)<=1)return to;
    let first=Infinity;
    for(const upper of [true,false]){
      const ry=upper?dome.ry:dome.baseRy,rx=dome.rx;
      const a=dx*dx/(rx*rx)+dy*dy/(ry*ry),b=2*(x*dx/(rx*rx)+y*dy/(ry*ry)),c=x*x/(rx*rx)+y*y/(ry*ry)-1;
      const d=b*b-4*a*c;if(!(a>0)||d<0)continue;
      for(const t of [(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)]){
        const hitY=y+dy*t;
        if(t>=0&&t<=1&&(upper?hitY<=1e-7:hitY>=-1e-7))first=Math.min(first,t);
      }
    }
    return Number.isFinite(first)?{x:from.x+dx*first,y:from.y+dy*first}:to;
  }
  class GridshardModuleVfx {
    static travelFor(definition){return Number.isFinite(weaponTimes[definition])?weaponTimes[definition]:null;}
    constructor({doc,layer,anchor,boardRect,rigFor,domId,now,schedule,sound,quality=()=>"orta",reduced=()=>false,hidden=()=>false,load=()=>0,fx=null}){
      Object.assign(this,{doc,layer,anchor,boardRect,rigFor,domId,now,schedule,sound,quality,reduced,hidden,load,fx});
      this.effects=new Map();this.ambient=new Map();this.seen=new Set();this.destroyed=new Map();this.coolingCycles=new Map();this.cueTimes=new Map();this.signatureTimes=new Map();this.liveIds=null;this.generation=0;this.session=null;this.latest=-Infinity;
      this.strikes=new Map();
    }
    svg(tag,attrs={},parent){const n=this.doc.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(parent)parent.appendChild(n);return n;}
    useFx(id){return Boolean(this.fx)&&FIRST_TEN.has(id)&&!this.reduced()&&this.quality()!=="dusuk"&&this.load()<2;}
    scale(a){return Math.max(.55,Math.min(1.15,(a?.size||48)/64));}
    pan(point){const w=this.layer()?.clientWidth||0;return w>0&&point?Math.max(-1,Math.min(1,point.x/w*2-1))*.6:0;}
    strike(id,delay=0){
      const generation=this.generation,due=this.now()+delay,entry={rig:this.strikes.get(id)?.rig};
      this.strikes.set(id,entry);
      const run=()=>{
        if(this.strikes.get(id)!==entry)return;
        if(generation!==this.generation||this.hidden()||this.now()-due>300||(this.liveIds&&!this.liveIds.has(id))){this.clearStrike(id);return;}
        const rig=this.rigFor(id);if(!rig){this.clearStrike(id);return;}
        if(entry.rig&&entry.rig!==rig)entry.rig.classList.remove("is-struck");
        entry.rig=rig;
        // Coalesce overlapping hits and extend their expiry. Restarting via
        // offsetWidth forced a full layout between every damage event.
        if(!rig.classList.contains("is-struck"))rig.classList.add("is-struck");
        this.schedule(230,()=>{if(this.strikes.get(id)===entry)this.clearStrike(id);});
      };
      if(delay>0)this.schedule(delay,run);else run();
    }
    clearStrike(id){this.strikes.get(id)?.rig?.classList.remove("is-struck");this.strikes.delete(id);}
    clearEffects(){this.fx?.clear();this.generation++;this.coolingCycles.clear();this.signatureTimes.clear();for(const id of this.strikes.keys())this.clearStrike(id);for(const e of this.effects.values())e.node.remove();this.effects.clear();for(const e of this.ambient.values())e.remove();this.ambient.clear();}
    reset(){this.clearEffects();this.cueTimes.clear();this.seen.clear();this.destroyed.clear();this.liveIds=null;this.session=null;this.latest=-Infinity;}
    cue(id,at=null){
      const p=profiles[id];if(!p||this.hidden()||this.now()-(this.cueTimes.get(id)??-Infinity)<320)return;
      this.cueTimes.set(id,this.now());this.sound(CRAFTED_CUES[id]||p.cue,{pan:this.pan(at)});
    }
    forget(id){this.clearStrike(id);for(const[k,e]of this.effects)if(e.refs.includes(id)){e.node.remove();this.effects.delete(k);}this.ambient.get(id)?.remove();this.ambient.delete(id);}
    put(key,node,duration,refs=[]){
      if(this.hidden()||!this.layer())return null;
      this.effects.get(key)?.node.remove();this.effects.delete(key);
      const cap=this.quality()==="dusuk"?8:this.quality()==="orta"?16:24;
      if(this.effects.size>=cap||this.load()>=2)return null;
      node.style.setProperty("--module-vfx-ms",`${duration}ms`);this.layer().appendChild(node);
      const entry={node,refs,generation:this.generation};this.effects.set(key,entry);
      this.schedule(duration,()=>{if(this.effects.get(key)===entry){node.remove();this.effects.delete(key);}});
      return entry;
    }
    after(delay,entry,key,run){const generation=this.generation,due=this.now()+delay;this.schedule(delay,()=>{
      if(generation!==this.generation||this.effects.get(key)!==entry||this.hidden()||this.now()-due>300)return;run();
    });}
    surface(type,points){
      const pad=24,left=Math.min(...points.map(p=>p.x))-pad,top=Math.min(...points.map(p=>p.y))-pad;
      const width=Math.max(...points.map(p=>p.x))-left+pad,height=Math.max(...points.map(p=>p.y))-top+pad;
      const svg=this.svg("svg",{viewBox:`${left} ${top} ${width} ${height}`,width,height,"aria-hidden":"true"});
      svg.classList.add("module-vfx",`module-vfx-${type}`);svg.style.left=`${left}px`;svg.style.top=`${top}px`;return svg;
    }
    line(svg,from,to,cls="vfx-ray",zig=false){
      let d=`M${from.x} ${from.y}`;
      if(zig){const dx=to.x-from.x,dy=to.y-from.y,n=Math.max(1,Math.hypot(dx,dy));for(let i=1;i<8;i++){const k=i%2?3:-3;d+=`L${from.x+dx*i/8-dy/n*k} ${from.y+dy*i/8+dx/n*k}`;}}
      d+=`L${to.x} ${to.y}`;return this.svg("path",{d,class:cls},svg);
    }
    impact(point,type,refs=[]){
      const svg=this.surface(type,[{x:point.x-20,y:point.y-20},{x:point.x+20,y:point.y+20}]);
      this.svg("circle",{cx:point.x,cy:point.y,r:8,class:"vfx-impact-ring"},svg);
      const rays=Array.from({length:this.reduced()?4:8},(_,i)=>{const a=i*Math.PI/4;return `M${point.x+Math.cos(a)*6} ${point.y+Math.sin(a)*6}l${Math.cos(a)*13} ${Math.sin(a)*13}`;}).join("");
      this.svg("path",{d:rays,class:"vfx-impact-rays"},svg);
      svg.style.setProperty("--impact-x",`${point.x}px`);svg.style.setProperty("--impact-y",`${point.y}px`);
      this.put(`impact:${refs.join(":")}`,svg,this.reduced()?120:320,refs);
    }
    dome(targetId,duration){
      const anchor=this.anchor(targetId);if(!anchor)return null;
      // Protect the individual device, never cover the entire PCB.
      const size=Math.max(24,Math.min(96,anchor.size||64));
      const dome={x:anchor.center.x,y:anchor.center.y+size*.18,rx:size*.46,ry:size*.64,baseRy:size*.14};
      const {x,y,rx,ry,baseRy}=dome;
      const silhouette=`M${x-rx} ${y}A${rx} ${ry} 0 0 1 ${x+rx} ${y}A${rx} ${baseRy} 0 0 1 ${x-rx} ${y}Z`;
      const svg=this.surface("shield",[{x:x-rx,y:y-ry},{x:x+rx,y:y+baseRy}]);
      const defs=this.svg("defs",{},svg),patternId=`vfx-hex-${++GridshardModuleVfx.serial}`;
      // One tessellated pattern path regardless of board size, never a node per hex.
      const p=this.svg("pattern",{id:patternId,width:30,height:17.32,patternUnits:"userSpaceOnUse"},defs);
      this.svg("path",{d:"M0 8.66L5 0H15L20 8.66 15 17.32H5ZM20 8.66H30M0 8.66H-10",class:"vfx-hex"},p);
      const gradientId=patternId+"-shade",gradient=this.svg("radialGradient",{id:gradientId,cx:"32%",cy:"23%",r:"80%"},defs);
      this.svg("stop",{offset:0,"stop-color":"#d4fbff","stop-opacity":.12},gradient);
      this.svg("stop",{offset:.55,"stop-color":"#28bcff","stop-opacity":.025},gradient);
      this.svg("stop",{offset:1,"stop-color":"#147cff","stop-opacity":.15},gradient);
      this.svg("ellipse",{cx:x,cy:y,rx,ry:baseRy,class:"vfx-dome-footprint"},svg);
      this.svg("path",{d:silhouette,fill:`url(#${gradientId})`,class:"vfx-dome-body"},svg);
      this.svg("path",{d:silhouette,fill:`url(#${patternId})`,class:"vfx-shield-dome"},svg);
      // Sparse curved ribs sell the height; the lower arc anchors it to the PCB.
      this.svg("path",{d:`M${x} ${y-ry}C${x-rx*.52} ${y-ry*.8} ${x-rx*.52} ${y} ${x} ${y+baseRy}M${x} ${y-ry}C${x+rx*.52} ${y-ry*.8} ${x+rx*.52} ${y} ${x} ${y+baseRy}`,class:"vfx-dome-ribs"},svg);
      this.svg("path",{d:`M${x-rx} ${y}A${rx} ${baseRy} 0 0 0 ${x+rx} ${y}`,class:"vfx-dome-front"},svg);
      this.svg("path",{d:`M${x-rx*.88} ${y-ry*.38}Q${x-rx*.65} ${y-ry} ${x} ${y-ry*.96}`,class:"vfx-dome-highlight"},svg);
      return this.put(`shield:${targetId}`,svg,duration,[targetId]) ? dome : null;
    }
    attack(sourceId,targetId,definition,defended=false){
      if(GridshardModuleVfx.travelFor(definition)===null)return null;
      const travel=weaponTimes[definition];if(this.hidden())return travel;
      if(this.liveIds&&(!this.liveIds.has(sourceId)||!this.liveIds.has(targetId)))return travel;
      const target=this.anchor(targetId),source=target&&this.anchor(sourceId,target.center);
      if(!source||!target)return travel;
      let destination=target.center;
      if(defended&&target.definition==="shield"){
        const dome=this.dome(targetId,travel+500);if(dome)destination=domeHit(source.emitter,destination,dome);
      }
      if(defended&&target.definition==="armor"){
        if(this.useFx("armor"))this.fx.dampen(target.emitter,{k:this.scale(target)});
        else this.impact(target.emitter,"dampen",[targetId]);
        destination=target.emitter;
      }
      const from=source.emitter,key=`weapon:${sourceId}`,refs=[sourceId,targetId];
      if(this.useFx(definition)&&["laser","pulse_cannon","missile_launcher"].includes(definition)){
        const k=this.scale(target),blocked=defended;
        if(definition==="laser")this.fx.laser(from,destination,{k,blocked});
        else if(definition==="pulse_cannon")this.fx.pulse(from,destination,travel,{k,blocked});
        else this.fx.missiles(from,destination,travel,{k,blocked});
        if(defended&&target.definition==="shield")this.fx.later(travel,()=>this.fx.shieldHit(destination,{k}));
        if(!defended)this.strike(targetId,travel);
        return travel;
      }
      if(!["laser","pulse_cannon","missile_launcher"].includes(definition)){
        this.signature(definition,sourceId,targetId,true,from,destination);
        return travel;
      }
      if(definition==="laser"){
        const svg=this.surface("laser",[from,destination]);
        this.line(svg,from,destination,"vfx-ray-halo");this.line(svg,from,destination);this.line(svg,from,destination,"vfx-ray-core");
        this.put(key,svg,this.reduced()?220:1000,refs);this.impact(destination,defended?"blocked":"laser-hit",refs);return travel;
      }
      const node=this.doc.createElement("span"),dx=destination.x-from.x,dy=destination.y-from.y,distance=Math.hypot(dx,dy);
      node.classList.add("module-vfx","module-vfx-projectile-track");node.dataset.weapon=definition;
      node.style.left=`${from.x}px`;node.style.top=`${from.y}px`;node.style.width=`${distance}px`;
      node.style.transform=`rotate(${Math.atan2(dy,dx)}rad)`;node.style.setProperty("--projectile-distance",`${distance}px`);node.style.setProperty("--travel-ms",`${travel}ms`);
      const projectile=this.svg("svg",{viewBox:"0 0 30 14",width:30,height:14,"aria-hidden":"true"},node);projectile.classList.add("vfx-flying-projectile");
      if(definition==="missile_launcher"){
        this.svg("path",{d:"M0 7 8 3 8 11Z",fill:"#ffc83b"},projectile);
        this.svg("path",{d:"M8 4 19 4 28 7 19 10 8 10Z",fill:"#e4f8ff",stroke:"#17314a","stroke-width":1.5},projectile);
        this.svg("path",{d:"M19 4 28 7 19 10Z",fill:"#ff354b"},projectile);
        this.svg("path",{d:"M9 4 6 1 13 4M9 10 6 13 13 10",fill:"#52d6ef",stroke:"#17314a"},projectile);
      }else{
        this.svg("path",{d:"M0 7H13",stroke:"#f9851b","stroke-width":5,opacity:.5},projectile);
        this.svg("circle",{cx:20,cy:7,r:5,fill:"#ffde70",stroke:"#b84c20","stroke-width":2},projectile);
      }
      // Shared deferred queue is drained by the HUD, not exactly at arrival.
      // Keep the token through its 300ms lateness budget so expiry cannot run
      // before an on-time impact in the same (insertion-ordered) flush batch.
      const entry=this.put(key,node,travel+400,refs);
      if(entry){
        let hit=false;const due=this.now()+travel;
        const arrive=()=>{if(hit||this.hidden()||this.now()-due>300||this.effects.get(key)!==entry)return;hit=true;projectile.style.visibility="hidden";this.impact(destination,defended?"blocked":"explosion",refs);};
        // Browser animation completion gives an exact visual collision. The
        // shared sweep is a reduced-motion/WebView fallback, not a new timer.
        projectile.addEventListener?.("animationend",arrive,{once:true});
        this.after(travel,entry,key,arrive);
      }
      return travel;
    }
    coolingMist(from,to,sourceId,targetId){
      const key=`support:cool:${sourceId}:${targetId}`,cap=this.quality()==="dusuk"?8:this.quality()==="orta"?16:24;
      if(this.effects.size>=cap&&!this.effects.has(key))return;
      const dx=to.x-from.x,dy=to.y-from.y,distance=Math.max(1,Math.hypot(dx,dy));
      const spread=Math.min(34,Math.max(18,distance*.14));
      // Local fan coordinates rotate with the real outlet/target. Bounds also
      // include the cloud's final expansion, not just the connecting line.
      const tip={x:from.x+dx*1.15,y:from.y+dy*1.15},pad=spread+28;
      const svg=this.surface("cool",[{x:from.x-pad,y:from.y-pad},{x:from.x+pad,y:from.y+pad},
        {x:tip.x-pad,y:tip.y-pad},{x:tip.x+pad,y:tip.y+pad}]);
      const defs=this.svg("defs",{},svg),id=`vfx-cold-${++GridshardModuleVfx.serial}`;
      const gradient=this.svg("radialGradient",{id,cx:"45%",cy:"45%",r:"58%"},defs);
      for(const[offset,color,opacity]of[[0,"#efffff",.42],[.38,"#c9f7ff",.3],[.72,"#85dce9",.12],[1,"#78d4ed",0]])
        this.svg("stop",{offset,"stop-color":color,"stop-opacity":opacity},gradient);
      const fan=this.svg("g",{transform:`translate(${from.x} ${from.y}) rotate(${Math.atan2(dy,dx)*180/Math.PI})`},svg);
      this.svg("path",{d:`M0 -3C${distance*.25} -6 ${distance*.45} ${-spread*.7} ${distance*.8} ${-spread}
        C${distance*1.08} ${-spread} ${distance*1.18} ${-spread*.35} ${distance*1.15} 0
        C${distance*1.18} ${spread*.55} ${distance} ${spread} ${distance*.8} ${spread}
        C${distance*.45} ${spread*.7} ${distance*.25} 6 0 3Z`,fill:`url(#${id})`,class:"vfx-cold-plume"},fan);
      // At most five soft lobed clouds, not one particle per frame/cell.
      // Gradients replace expensive blur/noise filters. CSS owns travel only;
      // the existing shared effect queue owns expiry, replay and cancellation.
      const count=this.reduced()?1:this.quality()==="dusuk"?2:this.quality()==="orta"?4:5;
      for(let i=0;i<count;i++){
        const end=distance*(.82+.07*i),side=(i%2?1:-1)*spread*(.18+.08*i);
        const cloud=this.svg("g",{class:"vfx-cold-cloud",transform:`translate(${end*.65} ${side*.65}) scale(1.1)`},fan);
        cloud.style.setProperty("--mist-dx",`${end}px`);cloud.style.setProperty("--mist-dy",`${side}px`);
        cloud.style.setProperty("--mist-delay",`${i*65}ms`);
        this.svg("path",{d:"M-19 3C-27-2-22-11-14-10C-16-21-2-24 4-16C13-24 25-15 21-7C33-5 31 9 20 11C18 22 4 23-2 16C-12 24-25 17-21 9C-28 9-28 4-19 3Z",fill:`url(#${id})`},cloud);
      }
      this.put(key,svg,this.reduced()?200:980,[sourceId,targetId]);
    }
    support(type,sourceId,targetId){
      if(this.hidden()||this.load()>=2)return;
      const target=this.anchor(targetId),source=target&&this.anchor(sourceId,target.center);if(!source||!target)return;
      const from=source.emitter,to=target.center,fxId={repair:"repair",emp:"emp",boost:"amplifier",cool:"cooler"}[type];
      // The approved mist already paints this complete effect. Do not also
      // enqueue the older canvas plume (27 callbacks + 36 extra particles per
      // target); that rendered the same cooling event twice at higher tiers.
      if(type==="cool"){this.coolingMist(from,to,sourceId,targetId);return;}
      if(fxId&&this.useFx(fxId)){
        const k=this.scale(target);
        if(type==="repair")this.fx.repair(from,to,{k});
        else if(type==="emp")this.fx.emp(from,to,{k});
        else this.fx.boost(source.pair||[from],to,{k});
        return;
      }
      const pair=source.pair||[from,from],svg=this.surface(type,[from,to,...pair]);
      if(type==="emp"){
        const join={x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2};
        for(const p of pair)this.line(svg,p,join,"vfx-eye-arc",true);this.line(svg,join,to,"vfx-electric",true);
      }else{
        if(type==="boost")for(const p of pair)this.line(svg,p,to,"vfx-ray",false);
        else this.line(svg,from,to,"vfx-ray",false);
        this.svg("circle",{cx:to.x,cy:to.y,r:8,class:"vfx-support-pulse"},svg);
      }
      this.put(`support:${type}:${sourceId}:${targetId}`,svg,this.reduced()?160:560,[sourceId,targetId]);
    }
    signature(id,sourceId,targetId,attack=false,fromOverride=null,toOverride=null){
      const p=profiles[id];if(!p||this.hidden()||this.load()>=2)return;
      const key=`${attack?"weapon":"signature"}:${sourceId}${attack?"":":"+targetId}`;
      if(!attack&&this.now()-(this.signatureTimes.get(key)??-Infinity)<220)return;
      if(this.signatureTimes.size>=128)this.signatureTimes.delete(this.signatureTimes.keys().next().value);
      this.signatureTimes.set(key,this.now());
      const target=this.anchor(targetId||sourceId),source=target&&this.anchor(sourceId,attack?target.center:null);
      if(!source||!target)return;
      const from=fromOverride||source.emitter,to=toOverride||target.center,refs=[sourceId,...(targetId?[targetId]:[])];
      const svg=this.surface("signature",[from,{x:to.x-20,y:to.y-20},{x:to.x+20,y:to.y+20}]);
      svg.dataset.module=id;svg.dataset.shape=p.shape;svg.style.setProperty("--vfx-color",p.color);
      const shape=p.shape,travel=Math.max(80,p.travel||220);
      let detail=svg;
      const path=d=>this.svg("path",{d,class:"vfx-signature-stroke"},detail);
      const ring=(r,cls="vfx-signature-stroke")=>this.svg("circle",{cx:to.x,cy:to.y,r,class:cls},detail);
      const polygon=(n,r,offset=0)=>"M"+Array.from({length:n},(_,i)=>{const a=offset+i*Math.PI*2/n;return `${to.x+Math.cos(a)*r} ${to.y+Math.sin(a)*r}`;}).join("L")+"Z";
      if(attack){
        if(["arc","rail","spear","double"].includes(shape)){
          this.line(svg,from,to,shape==="arc"?"vfx-electric":"vfx-signature-stroke",shape==="arc");
          if(shape==="double")this.line(svg,{x:from.x+4,y:from.y},{x:to.x+4,y:to.y},"vfx-signature-stroke");
          if(shape==="spear")path(polygon(4,9,Math.PI/4));
        }else{
          const dx=to.x-from.x,dy=to.y-from.y;
          const count=shape==="swarm"?3:1;
          for(let i=0;i<count;i++){
            const g=this.svg("g",{class:"vfx-signature-flight"},svg);
            g.style.setProperty("--flight-x",dx+"px");g.style.setProperty("--flight-y",dy+"px");
            g.style.setProperty("--travel-ms",travel+"ms");
            if(["drone","swarm"].includes(shape)){
              const x=from.x+(i-1)*6,y=from.y+(i-1)*4;
              this.svg("path",{d:`M${x-7} ${y}l7 -5 7 5 -7 5Z M${x-10} ${y-3}v6 M${x+10} ${y-3}v6`,class:"vfx-signature-stroke"},g);
            }else{
              this.svg("circle",{cx:from.x,cy:from.y,r:shape==="plasma"?7:6,fill:p.color},g);
              this.svg("circle",{cx:from.x-2,cy:from.y-2,r:2,fill:"#f4ffff"},g);
            }
          }
        }
      }else if(targetId&&targetId!==sourceId){
        if(["waves","fracture","vortex"].includes(shape))this.line(svg,from,to,"vfx-signature-stroke",shape==="fracture");
        else if(shape==="packets"){
          for(let i=1;i<=4;i++){const x=from.x+(to.x-from.x)*i/5,y=from.y+(to.y-from.y)*i/5;
            path(`M${x-3} ${y-3}h6v6h-6Z`);}
        }else this.line(svg,from,to,"vfx-signature-transfer");
      }
      // Finite, small glyphs identify the actual mechanic without obscuring cells.
      if(attack){
        detail=this.svg("g",{class:"vfx-signature-contact"},svg);
        detail.style.setProperty("--contact-delay",travel+"ms");
      }
      if(shape==="bars"){
        for(const y of[-10,0,10])path(`M${to.x-14} ${to.y+y}h28`);
        path(`M${to.x-16} ${to.y-15}v30M${to.x+16} ${to.y-15}v30`);
      }else if(shape==="packets"){
        for(const [x,y] of[[-9,-7],[4,-2],[-3,8]])path(`M${to.x+x} ${to.y+y}h5v5h-5Z`);
      }else if(shape==="fracture"){
        path(`M${to.x-15} ${to.y-12}l10 6 -4 12M${to.x+15} ${to.y+12}l-10 -6 4 -12`);
      }else if(shape==="waves"){
        for(const r of[6,11,17])path(`M${to.x-r} ${to.y-6}q${-r*.4} 6 0 12M${to.x+r} ${to.y-6}q${r*.4} 6 0 12`);
      }else if(["hex","prism","triad","mirror","phase","plates"].includes(shape)){
        path(polygon(shape==="triad"?3:shape==="prism"?4:6,16,Math.PI/6));
        if(shape==="phase")path(polygon(6,11,Math.PI/6));
        if(shape==="plates")path(`M${to.x-13} ${to.y-5}h26M${to.x-13} ${to.y+5}h26`);
        if(shape==="mirror")path(`M${to.x-9} ${to.y+8}l18 -16M${to.x-3} ${to.y+10}l12 -11`);
      }else if(shape==="reticle"){
        ring(11);path(`M${to.x-19} ${to.y}h11m16 0h11M${to.x} ${to.y-19}v11m0 16v11`);
        if(id==="precision_matrix")for(const [x,y]of[[-4,3],[4,3],[0,-4]])this.svg("circle",{cx:to.x+x,cy:to.y+y,r:2,fill:p.color},detail);
      }else if(shape==="clock"){
        ring(15);path(`M${to.x} ${to.y-10}v10l7 4`);
      }else if(["heal","phoenix"].includes(shape)){
        path(`M${to.x-9} ${to.y}h18M${to.x} ${to.y-9}v18`);
        if(shape==="phoenix")path(`M${to.x-18} ${to.y+9}l-5 -20 15 9M${to.x+18} ${to.y+9}l5 -20 -15 9`);
      }else if(shape==="chevrons"){
        for(const y of[-7,2,11])path(`M${to.x-9} ${to.y+y}l9 -7 9 7`);
      }else if(shape==="charge"){
        path(`M${to.x+3} ${to.y-15}l-12 17h9l-3 13 13 -20h-10Z`);
        if(id==="capacitor")path(`M${to.x-15} ${to.y-12}v24M${to.x+15} ${to.y-12}v24`);
      }else if(shape==="coil"){
        const count=id==="omega_amplifier"?3:2;
        for(let i=0;i<count;i++){
          const a=i*Math.PI*2/count;
          this.svg("circle",{cx:to.x+Math.cos(a)*11,cy:to.y+Math.sin(a)*11,r:5,class:"vfx-signature-stroke"},detail);
        }ring(4);
      }else if(shape==="vortex"){
        for(let i=0;i<3;i++){const r=6+i*5;path(`M${to.x-r} ${to.y}a${r} ${r} 0 1 1 ${r} ${r}`);}
      }else{
        ring(9);if(["coil","waves","quantum"].includes(shape))ring(16);
      }
      this.put(key,svg,this.reduced()?180:travel+280,refs);
    }
    syncAmbient(id,module){
      const shield=module.definition_id==="shield";
      if(!["amplifier","battery","shield"].includes(module.definition_id)||!operational(module)||this.hidden()||(!shield&&this.quality()==="dusuk")){
        this.ambient.get(id)?.remove();this.ambient.delete(id);return;
      }
      const rig=this.rigFor(id);if(!rig)return;
      // Layered paintings rise above the socket. A shell on the old 1x1
      // billboard surrounded only the feet and disappeared behind the body.
      // Share the painting's registered stage; never measure/rebuild per frame.
      const host=(shield&&rig.querySelector(".module-layer-stage"))||rig.querySelector(".module-device-billboard");
      if(!host){this.ambient.get(id)?.remove();this.ambient.delete(id);return;}
      let svg=this.ambient.get(id);
      if(svg?.parentElement!==host){svg?.remove();svg=this.svg("svg",{viewBox:"0 0 128 128","aria-hidden":"true"});svg.classList.add("module-vfx-ambient");
        if(shield){
          svg.dataset.kind="shield";
          this.svg("path",{d:"M-3 108A67 100 0 0 1 131 108Q64 137-3 108Z",class:"vfx-shield-shell"},svg);
          this.svg("path",{d:"M8 62Q20 4 67 9M-3 108Q64 133 131 108M64 8Q30 62 64 122Q98 62 64 8",class:"vfx-shield-shell-rim"},svg);
          this.svg("path",{d:"M32 40l10-6 10 6v12l-10 6-10-6ZM64 60l10-6 10 6v12l-10 6-10-6ZM37 82l10-6 10 6v12l-10 6-10-6Z",class:"vfx-shield-shell-hex"},svg);
        }else this.svg("path",{class:"vfx-ambient-electric"},svg);
        host.appendChild(svg);this.ambient.set(id,svg);}
      GridshardModuleVfx.syncArt(rig);
    }
    receive(events,snapshot){
      if(!snapshot?.players)return;
      if(this.session!==snapshot.session_id){this.reset();this.session=snapshot.session_id;}
      const elapsed=Number(snapshot.elapsed_ms||0);if(elapsed<this.latest)return;this.latest=elapsed;
      if(this.hidden()||snapshot.status==="finished"){this.liveIds=new Set();this.clearEffects();return;}
      for(const e of events||[])if(e.type==="module_destroyed"&&Number.isFinite(e.at_ms)&&e.data?.player_id&&e.data?.module_id){
        const key=JSON.stringify([e.data.player_id,e.data.module_id]);this.destroyed.set(key,Math.max(this.destroyed.get(key)??-Infinity,e.at_ms));
      }
      const records=new Map();
      for(const[player,state]of Object.entries(snapshot.players))for(const m of state.modules||[]){
        const id=this.domId(player,m),deadAt=this.destroyed.get(JSON.stringify([player,m.instance_id]))??-Infinity;
        if(alive(m)&&deadAt<elapsed){records.set(id,m);this.syncAmbient(id,m);}else this.forget(id);
      }
      this.liveIds=new Set(records.keys());
      for(const id of this.strikes.keys())if(!records.has(id))this.clearStrike(id);
      for(const[id,cycle]of this.coolingCycles)if(!records.has(id)||this.now()-cycle.started>1200)this.coolingCycles.delete(id);
      for(const id of this.ambient.keys())if(!records.has(id)){this.ambient.get(id).remove();this.ambient.delete(id);}
      for(const[k,e]of this.effects)if(e.refs.some(id=>!records.has(id))){e.node.remove();this.effects.delete(k);}
      const find=(player,id)=>snapshot.players[player]?.modules?.find(m=>m.instance_id===id&&records.has(this.domId(player,m)));
      const fresh=Math.max(elapsed,...(events||[]).map(e=>Number(e.at_ms)||0));
      for(const e of events||[]){
        const d=e.data||{},tag=JSON.stringify([e.type,e.at_ms,d]);
        if(this.seen.has(tag)||!Number.isFinite(e.at_ms)||e.at_ms<fresh-500)continue;
        this.seen.add(tag);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
        if(e.type==="module_destroyed"){
          // The destroyed device is no longer a live record; resolve it from the snapshot.
          const m=find(d.player_id,d.module_id)||snapshot.players[d.player_id]?.modules?.find(x=>x.instance_id===d.module_id);
          if(m){const id=this.domId(d.player_id,m),a=this.fx&&!this.reduced()&&this.quality()!=="dusuk"&&this.anchor(id);
            if(a)this.fx.destroy(a.center,{k:this.scale(a)});this.forget(id);}
          continue;
        }
        const player=d.source_player_id||d.player_id||d.attacker_player_id;
        // A completed server event remains real even if it consumed the last
        // charge/energy. Operational state gates ambient effects, not that event.
        const source=find(player,d.source_module_id||d.attacker_module_id||d.module_id);if(!alive(source))continue;
        const sourceId=this.domId(player,source),targetPlayer=d.target_player_id||player;
        const target=find(targetPlayer,d.target_module_id),targetId=target&&this.domId(targetPlayer,target);
        if(e.type==="module_contribution"&&d.contribution_kind==="damage_prevented"&&Number(d.value)>0&&source.definition_id==="armor"){
          const a=this.anchor(sourceId);if(a){if(this.useFx("armor"))this.fx.dampen(a.emitter,{k:this.scale(a)});else this.impact(a.emitter,"dampen",[sourceId]);}
        }else if(e.type==="module_contribution"&&d.contribution_kind==="damage_prevented"&&Number(d.value)>0&&source.definition_id==="shield"){
          const dome=this.dome(sourceId,500);if(dome&&this.useFx("shield"))this.fx.shieldHit({x:dome.x,y:dome.y-dome.ry*.55},{k:this.scale(this.anchor(sourceId))});
        }else if(e.type==="module_repaired"&&source.definition_id==="repair"&&Number(d.repair)>0&&alive(target)){
          this.support("repair",sourceId,targetId);this.cue("repair",this.anchor(sourceId)?.center);
        }else if(e.type==="module_cooled"&&source.definition_id==="cooler"&&Number(d.heat_before)>Number(d.heat_after)&&alive(target)){
          let cycle=this.coolingCycles.get(sourceId);
          if(!cycle||cycle.stamp!==e.at_ms){cycle={stamp:e.at_ms,started:this.now(),targets:[],generation:this.generation};this.coolingCycles.set(sourceId,cycle);}
          if(cycle.targets.includes(targetId)||cycle.targets.length>=3)continue;
          const index=cycle.targets.length;cycle.targets.push(targetId);
          const due=this.now()+index*240;
          const emit=()=>{
            if(this.coolingCycles.get(sourceId)!==cycle||cycle.generation!==this.generation||this.hidden()||this.now()-due>150||!this.liveIds?.has(sourceId)||!this.liveIds.has(targetId))return;
            this.support("cool",sourceId,targetId);
            if(index===0)this.cue("cooler",this.anchor(sourceId)?.center);
          };
          if(index===0)emit();else this.schedule(index*240,emit);
        }else if(e.type==="sabotage_applied"&&source.definition_id==="emp"&&Number(d.duration_ms)>0&&alive(target)){
          this.support("emp",sourceId,targetId);this.cue("emp",this.anchor(targetId)?.center);
        }else if(e.type==="amplifier_pulse"&&source.definition_id==="amplifier"){
          let count=0;for(const id of (d.charged_module_ids||[]).slice(0,15)){const m=find(player,id);if(alive(m)){this.support("boost",sourceId,this.domId(player,m));count++;}}
          if(count)this.cue("amplifier",this.anchor(sourceId)?.center);
        }else if(e.type==="module_cycle_pulse"&&source.definition_id==="battery"){
          const a=this.useFx("battery")&&this.anchor(sourceId);
          if(a)this.fx.battery(a.center,{k:this.scale(a)});else this.signature("battery",sourceId,sourceId);
          this.cue("battery",a?.center);
        }else if(profiles[source.definition_id] && !FIRST_TEN.has(source.definition_id) && (
          (e.type==="module_cycle_pulse"&&profiles[source.definition_id].travel===null) || e.type==="module_overclocked" || e.type==="phoenix_rebirth" ||
          e.type==="damage_reflected" || (e.type==="module_repaired"&&Number(d.repair)>0) ||
          (e.type==="sabotage_applied"&&Number(d.duration_ms)>0) ||
          (e.type==="module_contribution"&&Number(d.value)>0&&profiles[source.definition_id].travel===null)
        )){
          this.signature(source.definition_id,sourceId,targetId||sourceId);this.cue(source.definition_id);
        }
      }
    }
    static syncArt(rig){
      const svg=rig.querySelector?.(".module-vfx-ambient");if(!svg||svg.dataset.kind==="shield"||svg.dataset.view===rig.dataset.view)return;
      const id=rig.dataset.device,frame=Number(rig.dataset.view||0),pair=root.GridshardModuleViewData?.[id]?.pairs?.[frame];
      let d="M22 88 14 77 24 69 17 58M105 86 115 73 105 64 114 52";
      if(id==="amplifier"&&pair){const[a,b]=pair.map(p=>({x:p.x*128,y:p.y*128}));d=`M${a.x} ${a.y}L${(a.x+b.x)/2-4} ${(a.y+b.y)/2+3}L${(a.x+b.x)/2+4} ${(a.y+b.y)/2-3}L${b.x} ${b.y}`;}
      svg.querySelector("path")?.setAttribute("d",d);svg.dataset.view=rig.dataset.view;
    }
  }
  GridshardModuleVfx.serial=0;
  root.GridshardModuleVfx=GridshardModuleVfx;
  if(typeof module!=="undefined"&&module.exports)module.exports={GridshardModuleVfx,ellipseHit,domeHit};
})(globalThis);
