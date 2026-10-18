(function(root){
  "use strict";
  const NS="http://www.w3.org/2000/svg";
  const weaponTimes={laser:0,pulse_cannon:340,missile_launcher:500};
  const alive=m=>m && m.status==="active" && Number(m.hp)>0 && m.x!=null && m.y!=null;
  const operational=m=>alive(m) && m.is_powered!==false && !m.overheated;
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
    constructor({doc,layer,anchor,boardRect,rigFor,domId,now,schedule,sound,quality=()=>"orta",reduced=()=>false,hidden=()=>false,load=()=>0}){
      Object.assign(this,{doc,layer,anchor,boardRect,rigFor,domId,now,schedule,sound,quality,reduced,hidden,load});
      this.effects=new Map();this.ambient=new Map();this.seen=new Set();this.destroyed=new Map();this.coolingCycles=new Map();this.liveIds=null;this.generation=0;this.session=null;this.latest=-Infinity;
    }
    svg(tag,attrs={},parent){const n=this.doc.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(parent)parent.appendChild(n);return n;}
    clearEffects(){this.generation++;this.coolingCycles.clear();for(const e of this.effects.values())e.node.remove();this.effects.clear();for(const e of this.ambient.values())e.remove();this.ambient.clear();}
    reset(){this.clearEffects();this.seen.clear();this.destroyed.clear();this.liveIds=null;this.session=null;this.latest=-Infinity;}
    forget(id){for(const[k,e]of this.effects)if(e.refs.includes(id)){e.node.remove();this.effects.delete(k);}this.ambient.get(id)?.remove();this.ambient.delete(id);}
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
      const rect=this.boardRect(targetId);if(!rect)return null;
      const dome={x:rect.left+rect.width*.5,y:rect.top+rect.height*.76,rx:rect.width*.51,ry:rect.height*1.1,baseRy:rect.height*.23};
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
        this.impact(target.emitter,"dampen",[targetId]);destination=target.emitter;
      }
      const from=source.emitter,key=`weapon:${sourceId}`,refs=[sourceId,targetId];
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
      const from=source.emitter,to=target.center;
      if(type==="cool"){this.coolingMist(from,to,sourceId,targetId);return;}
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
    syncAmbient(id,module){
      if(!["amplifier","battery"].includes(module.definition_id)||!operational(module)||this.hidden()||this.quality()==="dusuk"){
        this.ambient.get(id)?.remove();this.ambient.delete(id);return;
      }
      const rig=this.rigFor(id);if(!rig)return;
      let svg=this.ambient.get(id);
      if(svg?.parentElement?.parentElement!==rig){svg?.remove();svg=this.svg("svg",{viewBox:"0 0 128 128","aria-hidden":"true"});svg.classList.add("module-vfx-ambient");
        this.svg("path",{class:"vfx-ambient-electric"},svg);rig.querySelector(".module-device-billboard")?.appendChild(svg);this.ambient.set(id,svg);}
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
      for(const[id,cycle]of this.coolingCycles)if(!records.has(id)||this.now()-cycle.started>1200)this.coolingCycles.delete(id);
      for(const id of this.ambient.keys())if(!records.has(id)){this.ambient.get(id).remove();this.ambient.delete(id);}
      for(const[k,e]of this.effects)if(e.refs.some(id=>!records.has(id))){e.node.remove();this.effects.delete(k);}
      const find=(player,id)=>snapshot.players[player]?.modules?.find(m=>m.instance_id===id&&records.has(this.domId(player,m)));
      const fresh=Math.max(elapsed,...(events||[]).map(e=>Number(e.at_ms)||0));
      for(const e of events||[]){
        const d=e.data||{},tag=JSON.stringify([e.type,e.at_ms,d]);
        if(this.seen.has(tag)||!Number.isFinite(e.at_ms)||e.at_ms<fresh-500)continue;
        this.seen.add(tag);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
        if(e.type==="module_destroyed"){const m=find(d.player_id,d.module_id);if(m)this.forget(this.domId(d.player_id,m));continue;}
        const player=d.source_player_id||d.player_id||d.attacker_player_id;
        // A completed server event remains real even if it consumed the last
        // charge/energy. Operational state gates ambient effects, not that event.
        const source=find(player,d.source_module_id||d.attacker_module_id||d.module_id);if(!alive(source))continue;
        const sourceId=this.domId(player,source),targetPlayer=d.target_player_id||player;
        const target=find(targetPlayer,d.target_module_id),targetId=target&&this.domId(targetPlayer,target);
        if(e.type==="module_contribution"&&d.contribution_kind==="damage_prevented"&&Number(d.value)>0&&source.definition_id==="armor"){
          const a=this.anchor(sourceId);if(a)this.impact(a.emitter,"dampen",[sourceId]);
        }else if(e.type==="module_contribution"&&d.contribution_kind==="damage_prevented"&&Number(d.value)>0&&source.definition_id==="shield"){
          this.dome(sourceId,500);
        }else if(e.type==="module_repaired"&&source.definition_id==="repair"&&Number(d.repair)>0&&alive(target)){
          this.support("repair",sourceId,targetId);this.sound("repair_beam");
        }else if(e.type==="module_cooled"&&source.definition_id==="cooler"&&Number(d.heat_before)>Number(d.heat_after)&&alive(target)){
          let cycle=this.coolingCycles.get(sourceId);
          if(!cycle||cycle.stamp!==e.at_ms){cycle={stamp:e.at_ms,started:this.now(),targets:[],generation:this.generation};this.coolingCycles.set(sourceId,cycle);}
          if(cycle.targets.includes(targetId)||cycle.targets.length>=3)continue;
          const index=cycle.targets.length;cycle.targets.push(targetId);
          const due=this.now()+index*240;
          const emit=()=>{
            if(this.coolingCycles.get(sourceId)!==cycle||cycle.generation!==this.generation||this.hidden()||this.now()-due>150||!this.liveIds?.has(sourceId)||!this.liveIds.has(targetId))return;
            this.support("cool",sourceId,targetId);
            if(index===0)this.sound("cooling_air");
          };
          if(index===0)emit();else this.schedule(index*240,emit);
        }else if(e.type==="sabotage_applied"&&source.definition_id==="emp"&&Number(d.duration_ms)>0&&alive(target)){
          this.support("emp",sourceId,targetId);this.sound("emp");
        }else if(e.type==="amplifier_pulse"&&source.definition_id==="amplifier"){
          let count=0;for(const id of (d.charged_module_ids||[]).slice(0,15)){const m=find(player,id);if(alive(m)){this.support("boost",sourceId,this.domId(player,m));count++;}}
          if(count)this.sound("energy_transfer");
        }else if(e.type==="module_cycle_pulse"&&source.definition_id==="battery")this.sound("energy_transfer");
      }
    }
    static syncArt(rig){
      const svg=rig.querySelector?.(".module-vfx-ambient");if(!svg||svg.dataset.view===rig.dataset.view)return;
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
