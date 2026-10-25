const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test('painted platforms keep live 5x3 sockets, real power buses and touch geometry',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});await waitForParticipantReady(page);
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  // Transport enters BATTLE before the first snapshot can open the countdown.
  // Its initially hidden overlay is not evidence that deployment is ready.
  await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:30000});
  // A fast desktop can observe the shelf before the first authoritative
  // snapshot starts its countdown. Wait for an actual battle tick, not just
  // transport-open/local initial UI, before sending this visual test's setup.
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getBattleState().elapsed_ms),{timeout:30000}).toBeGreaterThan(0);
  await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:6000});
  await page.evaluate(()=>window.__platformOriginalCells=[...document.querySelectorAll('.vertical-circuit-arena .board-cell')]);
  await page.evaluate(()=>{
    window.__deploymentFlights=[];
    window.__deploymentObserver=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes){
        if(node.classList?.contains('battle-deployment-flight'))window.__deploymentFlights.push(node);
      }
    });
    window.__deploymentObserver.observe(document.body,{childList:true});
  });
  for(const id of ['laser','battery','shield']) {
    await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:14000}).toBe(true);
    await expect(page.locator(`#board [data-device="${id}"]`)).toBeVisible({timeout:14000});
  }
  await expect.poll(()=>page.evaluate(()=>window.__deploymentFlights.length)).toBe(3);
  await expect(page.locator('.battle-deployment-flight')).toHaveCount(0);
  expect(await page.evaluate(()=>window.__deploymentFlights.every(f=>!f.isConnected))).toBe(true);
  await page.evaluate(()=>window.__deploymentObserver.disconnect());
  await page.evaluate(async()=>Promise.all(['battle-native-v6/island-player','battle-native-v6/island-enemy'].map(async name=>{
    const image=new Image();image.src=`./assets/ui/${name}.webp`;await image.decode();
  })));
  const waves=[];
  for(const effect of ['heal','attack','sabotage','defense','energy','hybrid']){
    expect(await page.evaluate(effect=>window.__GRIDSHARD_TEST_API.previewCoreActivation(effect),effect)).toBe(true);
    await expect(page.locator('#board')).toHaveAttribute('data-core-wave-effect',effect);
    await expect.poll(()=>page.locator('#board').evaluate(board=>+getComputedStyle(board,'::after').opacity),{timeout:700}).toBeGreaterThan(.15);
    const wave=await page.locator('#board').evaluate(board=>{
      const s=getComputedStyle(board,'::after');return {content:s.content,display:s.display,animation:s.animationName,z:+s.zIndex};
    });
    expect(wave.content).not.toBe('none');expect(wave.display).toBe('block');
    expect(wave.animation).toBe('gs-beta49-core-wave');expect(wave.z).toBe(70);
    waves.push({effect,...wave});
    if(effect==='hybrid')await page.screenshot({path:info.outputPath('core-power-wave.png')});
    await expect(page.locator('#board')).not.toHaveClass(/core-wave/,{timeout:2000});
  }
  expect(await page.locator('#board').evaluate(board=>getComputedStyle(board,'::after').content)).toBe('none');
  await info.attach('core-activation-waves',{body:JSON.stringify(waves),contentType:'application/json'});
  const checks=[];
  for(const [width,height] of [[320,568],[393,852],[1280,720],[1920,853]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const layout=await page.evaluate(()=>{
      const arena=document.querySelector('.vertical-circuit-arena').getBoundingClientRect();
      const cells=[...document.querySelectorAll('.vertical-circuit-arena .board-cell')];
      const sockets=cells.map(cell=>{
        const s=getComputedStyle(cell),r=cell.getBoundingClientRect();
        const well=getComputedStyle(cell,'::before');
        const grid=cell.parentElement,x=+cell.dataset.x,y=+cell.dataset.y;
        const gs=getComputedStyle(grid),gapX=parseFloat(gs.columnGap),gapY=parseFloat(gs.rowGap);
        const sizeX=parseFloat(s.width),sizeY=parseFloat(s.height);
        const host=cell.querySelector('.physical-module-card > .module-icon.has-module-device');
        const hs=host&&getComputedStyle(host);
        const shadow=host?.querySelector('.module-device-ground-shadow')?.getBoundingClientRect();
        const heat=cell.querySelector('.module-heat-bar:not([hidden])')?.getBoundingClientRect();
        const health=cell.querySelector('.core-health-bar:not([hidden]),.module-health-bar:not([hidden])')?.getBoundingClientRect();
        const points=host?[...host.querySelectorAll('.sprite-plane-point')].map(p=>{
          const r=p.getBoundingClientRect();return{x:r.left,y:r.top};
        }):[];
        const foot=points.length===4?GridshardLaserAim.project(GridshardLaserAim.plane(points),{x:.5,y:1}):null;
        return {x:+cell.dataset.x,y:+cell.dataset.y,art:s.backgroundImage,animation:s.animationName,
          // Layout coordinates are pre-camera, matching the painting's measured
          // floor. Screen-space BCR centres are wrong under perspective.
          registrationError:Math.max(Math.abs(cell.offsetLeft-x*(sizeX+gapX)),
            Math.abs(cell.offsetTop-y*(sizeY+gapY))),
          renderedSize:[r.width,r.height],
          sprite:!host?null:{square:Math.abs(parseFloat(hs.width)-parseFloat(hs.height))<1,
            centered:Math.abs(host.offsetLeft+host.offsetWidth/2-host.parentElement.clientWidth/2)<1,
            horizontalSeatError:Math.abs(shadow.left+shadow.width/2-r.left-r.width/2),
            footToMeters:(heat || health).top-foot.y,
            shadowTouchesFoot:Math.abs(shadow.bottom-foot.y)<1,
            hostBottom:parseFloat(hs.bottom),core:host.parentElement.dataset.core==='true'},
          filter:s.filter,pointer:s.pointerEvents,images:cell.querySelectorAll(':scope > img').length,
          well:well.clipPath,wellDisplay:well.display,wellOpacity:well.opacity,slab:well.backgroundImage,
          retiredWell:getComputedStyle(cell,'::after').content,
          fits:r.left>=arena.left-1&&r.right<=arena.right+1&&r.top>=arena.top-1&&r.bottom<=arena.bottom+1};
      });
      const boards=['board','enemy-board'].map(id=>{
        const el=document.getElementById(id),s=getComputedStyle(el),r=el.getBoundingClientRect();
        const ground=el.parentElement.querySelector('.circuit-terrain'),g=getComputedStyle(ground);
        const painting=getComputedStyle(ground,'::before');
        return {cols:s.gridTemplateColumns.split(' ').length,rows:s.gridTemplateRows.split(' ').length,
          count:el.querySelectorAll('.board-cell').length,light:s.getPropertyValue('--circuit-light').trim(),
          art:painting.backgroundImage,oldFrame:s.borderImageSource,groundZ:+g.zIndex,boardZ:+s.zIndex,
          groundTransform:g.transform,boardTransform:s.transform,groundOrigin:g.transformOrigin,boardOrigin:s.transformOrigin,
          gapError:Math.max(Math.abs(parseFloat(s.columnGap)-el.clientWidth*7/728),
            Math.abs(parseFloat(s.rowGap)-el.clientHeight*7/404)),
          frameOpening:{left:parseFloat(painting.left)+parseFloat(painting.width)*264/1254,
            right:parseFloat(painting.left)+parseFloat(painting.width)*992/1254,
            top:parseFloat(painting.top)+parseFloat(painting.height)*260/1254,
            bottom:parseFloat(painting.top)+parseFloat(painting.height)*664/1254,
            floorWidth:el.clientWidth,floorHeight:el.clientHeight},
          cableZ:[...el.querySelectorAll('.board-cable-layer,.board-cable-current-layer')].map(layer=>+getComputedStyle(layer).zIndex),
          artZ:+getComputedStyle(el.querySelector('.has-module-device')).zIndex,
          meterZ:+getComputedStyle(el.querySelector('.core-health-bar')).zIndex,
          top:r.top,bottom:r.bottom};
      });
      const target=document.querySelector('#board .board-cell[data-x="4"][data-y="2"]');
      const r=target.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      const name=document.getElementById('player-battle-name').getBoundingClientRect();
      const currentBar=document.getElementById('battle-current-bar').getBoundingClientRect();
      const shelf=document.querySelector('.shelf-panel').getBoundingClientRect();
      const vs=document.querySelector('.duel-vs').getBoundingClientRect();
      const upperRim=document.querySelector('[data-circuit-rim="bottom"]').getBoundingClientRect();
      const lowerRim=document.querySelector('[data-circuit-rim="top"]').getBoundingClientRect();
      const enemyGround=document.querySelector('.duel-enemy-side .circuit-terrain').getBoundingClientRect();
      const playerGround=document.querySelector('.duel-player-side .circuit-terrain').getBoundingClientRect();
      const footer=document.querySelector('.duel-player-identity').getBoundingClientRect();
      const enemyIdentity=document.querySelector('.duel-enemy-identity').getBoundingClientRect();
      const arenaEl=document.querySelector('.vertical-circuit-arena'),sceneStyle=getComputedStyle(arenaEl);
      const baseGap=Math.max(8,Math.min(10,arenaEl.clientWidth*.02));
      const baseBetween=Math.max(24,Math.min(30,arenaEl.clientHeight*.04));
      const zoom=parseFloat(sceneStyle.getPropertyValue('--gs-camera-zoom'));
      const yScale=Math.cos(parseFloat(sceneStyle.getPropertyValue('--gs-camera-tilt'))*Math.PI/180)*zoom;
      const headerHeight=arenaEl.querySelector('.duel-enemy-identity').offsetHeight;
      const footerHeight=arenaEl.querySelector('.duel-player-identity').offsetHeight;
      const beforeSize=Math.max(12,Math.min(84,
        ((arenaEl.clientHeight-headerHeight-footerHeight-50-baseBetween)/(3.6*yScale)-2*baseGap)/3,
        (arenaEl.clientWidth*.9/zoom-4*baseGap)/5));
      const liveBuses=[...document.querySelectorAll('.vertical-circuit-arena .circuit-cable-current[visibility="visible"]')].map(path=>{
        const s=getComputedStyle(path);
        return {width:parseFloat(s.strokeWidth),opacity:+s.opacity,display:s.display,length:path.getTotalLength()};
      });
      const coreHealth=[...document.querySelectorAll('.vertical-circuit-arena .core-health-bar')].map(bar=>{
        const rect=bar.getBoundingClientRect();
        return {visible:!bar.hidden&&rect.width>15&&rect.height>1,
          realHP:+bar.getAttribute('aria-valuenow')>0&&+bar.getAttribute('aria-valuemax')>0};
      });
      return {boards,sockets,sameCells:cells.every((cell,i)=>cell===window.__platformOriginalCells[i]),
        coreCentred:[...document.querySelectorAll('.vertical-circuit-arena .module-card[data-core="true"]')].every(card=>{
          const cell=card.closest('.board-cell');return cell.dataset.x==='2'&&cell.dataset.y==='1';
        }),
        vsError:Math.abs(vs.top+vs.height/2-(upperRim.top+lowerRim.top)/2),
        vsInGap:vs.top+vs.height/2>upperRim.top&&vs.top+vs.height/2<lowerRim.top,
        playerRimFits:playerGround.bottom+playerGround.height*.48<=footer.top-3,
        coreHealth,
        circuitScale:parseFloat(sceneStyle.getPropertyValue('--gs-battle-card-size'))/beforeSize,
        equipmentScale:parseFloat(sceneStyle.getPropertyValue('--gs-equipment-size'))/(beforeSize*.92),
        enemyHeaderClear:enemyIdentity.top>=arena.top&&enemyIdentity.bottom+3<=enemyGround.top-.32*enemyGround.height,
        liveBuses,
        playerNameInsideCurrent:name.left>=currentBar.left&&name.right<=currentBar.right
          &&name.top>=currentBar.top&&name.bottom<=currentBar.bottom,
        currentFillTransition:getComputedStyle(document.getElementById('battle-current-fill')).transitionDuration,
        currentFill:(()=>{
          const fill=document.getElementById('battle-current-fill'),r=fill.getBoundingClientRect(),s=getComputedStyle(fill);
          return {width:r.width,height:r.height,display:s.display,background:s.backgroundImage,
            transform:s.transform,target:fill.style.transform,balance:+document.getElementById('battle-current-bar').getAttribute('aria-valuenow')};
        })(),
        targetable:hit?.closest('.board-cell')===target,
        hit:{tag:hit?.tagName,classes:hit?.getAttribute('class'),cell:hit?.closest('.board-cell')?.dataset,
          point:[r.left+r.width/2,r.top+r.height/2]},
        environment:getComputedStyle(document.querySelector('.arena-panel')).backgroundImage,
        rootBackground:getComputedStyle(document.body).backgroundImage,
        arenaShadow:getComputedStyle(document.querySelector('.arena-panel')).boxShadow,
        enemyExtension:getComputedStyle(document.querySelector('.duel-enemy-side > .circuit-terrain'),'::after').backgroundImage,
        legacyGrid:getComputedStyle(document.querySelector('.vertical-circuit-arena'),'::after').content,
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        animatedBus:document.getAnimations().some(a=>a.effect?.target?.closest?.('.board-cable-layer,.board-cable-current-layer'))};
    });
    checks.push({width,height,...layout});
    await info.attach(`layout-${width}`,{body:JSON.stringify(layout,null,2),contentType:'application/json'});
    await page.screenshot({path:info.outputPath(`platform-${width}.png`)});
    expect(layout.sameCells).toBe(true);expect(layout.overflow).toBe(false);expect(layout.targetable,JSON.stringify({width,height,hit:layout.hit})).toBe(true);
    expect(layout.playerNameInsideCurrent).toBe(true);
    expect(layout.currentFillTransition).toBe('0.55s');
    expect(layout.currentFill.height).toBeGreaterThan(5);
    expect(layout.currentFill.background).toContain('linear-gradient');
    expect(parseFloat(layout.currentFill.target.slice(7))).toBeCloseTo(layout.currentFill.balance/12,5);
    expect(layout.vsError).toBeLessThan(1);
    expect(layout.vsInGap).toBe(true);
    expect(layout.playerRimFits).toBe(true);
    expect(layout.circuitScale).toBeCloseTo(1.10,3);
    expect(layout.equipmentScale/(1.15*1.10)).toBeCloseTo(1.10,3);
    expect(layout.enemyHeaderClear).toBe(true);
    expect(layout.liveBuses.length).toBeGreaterThan(0);
    expect(layout.liveBuses.every(bus=>bus.width>=3&&bus.opacity===1&&bus.display!=='none'&&bus.length>0)).toBe(true);
    expect(layout.coreCentred).toBe(true);
    expect(layout.boards.map(b=>[b.cols,b.rows,b.count])).toEqual([[5,3,15],[5,3,15]]);
    expect(layout.boards[1].bottom).toBeLessThan(layout.boards[0].top);
    expect(layout.boards.map(b=>b.light)).toEqual(['#73fff0','#ff583d']);
    expect(layout.boards[0].art).toContain('island-player.webp');
    expect(layout.boards[1].art).toContain('island-enemy.webp');
    expect(layout.boards.every(b=>b.oldFrame==='none'&&b.groundZ<b.boardZ)).toBe(true);
    expect(layout.boards.every(b=>b.groundTransform===b.boardTransform&&b.groundOrigin===b.boardOrigin)).toBe(true);
    expect(layout.boards.every(b=>b.gapError<.1)).toBe(true);
    for(const axis of[0,1])expect(Math.max(...layout.sockets.map(s=>s.renderedSize[axis]))-Math.min(...layout.sockets.map(s=>s.renderedSize[axis]))).toBeLessThan(.2);
    expect(layout.sockets.every(s=>s.registrationError<=1)).toBe(true);
    expect(layout.sockets.every(s=>!s.sprite||(s.sprite.square&&s.sprite.centered
      &&s.sprite.horizontalSeatError<1&&s.sprite.shadowTouchesFoot&&s.sprite.hostBottom===(s.sprite.core?8:13)
      &&s.sprite.footToMeters>=.5&&s.sprite.footToMeters<2))).toBe(true);
    expect(layout.coreHealth).toHaveLength(2);
    expect(layout.coreHealth.every(bar=>bar.visible&&bar.realHP)).toBe(true);
    expect(layout.boards.every(b=>b.cableZ.length===2&&b.cableZ[0]<b.artZ
      &&b.cableZ[1]<b.meterZ&&b.meterZ<b.artZ)).toBe(true);
    expect(layout.boards.every(b=>Math.abs(b.frameOpening.left)<1
      &&Math.abs(b.frameOpening.right-b.frameOpening.floorWidth)<1
      &&Math.abs(b.frameOpening.top)<1
      &&Math.abs(b.frameOpening.bottom-b.frameOpening.floorHeight)<1)).toBe(true);
    expect(layout.environment).toContain('circuit-walls.svg');
    expect(layout.rootBackground).toBe('none');expect(layout.arenaShadow).toBe('none');
    expect(layout.enemyExtension).toContain('island-enemy.webp');
    expect(layout.legacyGrid).toBe('none');
    expect(layout.sockets.every(s=>!s.art.includes('url(') && s.animation==='none' && s.filter==='none' && s.pointer!=='none' && s.images===0 && s.fits)).toBe(true);
    expect(layout.sockets.every(s=>s.wellDisplay==='none'&&s.retiredWell==='none')).toBe(true);
    expect(layout.animatedBus).toBe(false);
    await page.screenshot({path:info.outputPath(`platform-${width}.png`)});
  }
  // Exhaustive presentation audit: every current module in every socket on
  // BOTH sides. Probe cards use the real persistent renderer and styles, then
  // are removed without changing authoritative match/module state.
  await page.setViewportSize({width:393,height:852});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
  const matrix=await page.evaluate(()=>{
    const data=GridshardModuleLayerData,modules=Object.entries(data).filter(([,d])=>!d.core);
    const coreId=Object.keys(data).find(id=>data[id].core),results=[];
    const model=(id,core,enemy)=>({id:'socket-audit',artwork:id,name:id,shortName:id,title:id,
      hp:75,maxHp:100,heat:50,heatState:'normal',heatLabel:'50%',physical:true,core,enemy,
      liveBadges:[],signatureBadges:[]});
    for(const boardId of['board','enemy-board']){
      const enemy=boardId==='enemy-board';
      const view=new GridshardBattleCardStateView({document,mountIcon:(host,m)=>{
        if(m.core)GridshardModuleDeviceArt.mountCore(host,m.artwork);
        else GridshardModuleDeviceArt.mount(host,{definitionId:m.artwork},enemy);
      }});
      const reactor=view.create(model(coreId,true,enemy));
      const device=view.create(model(modules[0][0],false,enemy));
      function measure(card,layer){
        const stage=card.querySelector('.module-layer-stage').getBoundingClientRect();
        const bounds=layer.core?layer.bounds:layer.socketBounds;
        const points=[...card.querySelectorAll('.sprite-plane-point')].map(p=>{const r=p.getBoundingClientRect();return{x:r.left,y:r.top};});
        const plane=GridshardLaserAim.plane(points),floor=GridshardLaserAim.project(plane,{x:.5,y:1});
        const registration=card.querySelector('.module-layer-stage').style;
        const size=parseFloat(registration.width)/100,left=parseFloat(registration.left)/100,top=parseFloat(registration.top)/100;
        const box=layer.core?{left:.5-bounds.width/2,right:.5+bounds.width/2,top:1-bounds.height,bottom:1}:bounds;
        const ink=[[box.left,box.top],[box.right,box.top],[box.left,box.bottom],[box.right,box.bottom]]
          .map(([x,y])=>GridshardLaserAim.project(plane,{x:left+size*x,y:top+size*y}));
        const foot=(layer.core?[box.left,box.right]:[bounds.footMin,bounds.footMax])
          .map(x=>GridshardLaserAim.project(plane,{x:left+size*x,y:top+size*box.bottom}));
        const cell=card.parentElement.getBoundingClientRect();
        const groundStyle=getComputedStyle(card.parentElement.parentElement);
        // An articulated tip may enter the empty edge of a gutter, but never
        // reach its 6px cable jacket. Check the actual reserved cable corridor.
        const sideClearance=Math.max(0,parseFloat(groundStyle.columnGap)
          *parseFloat(groundStyle.getPropertyValue('--gs-camera-zoom'))/2-3.1);
        const health=card.querySelector('.core-health-bar,.module-health-bar').getBoundingClientRect();
        const heat=card.querySelector('.module-heat-bar');
        const hr=heat&&!heat.hidden?heat.getBoundingClientRect():null;
        return {extent:Math.max(bounds.width,bounds.height)*stage.width,
          overflow:[cell.left-Math.min(...ink.map(p=>p.x)),Math.max(...ink.map(p=>p.x))-cell.right,
            cell.top-Math.min(...ink.map(p=>p.y)),Math.max(...ink.map(p=>p.y))-cell.bottom],
          healthClear:health.top>=floor.y+.5&&health.width>10&&health.height>1
            &&health.top>=cell.top&&health.bottom<=cell.bottom-1,
          heatClear:!hr||(hr.top>=floor.y+.5&&hr.width>10&&hr.height>1
            &&hr.top>=cell.top&&hr.bottom<=cell.bottom-1),
          seatGap:(hr || health).top-floor.y,
          // A standing device rises above the ground socket; its horizontal
          // footprint and base stay in that socket, with both meters inside.
          fits:foot.every(p=>p.x>=cell.left-sideClearance&&p.x<=cell.right+sideClearance)
            &&ink.every(p=>p.y>=cell.top-cell.height*.8&&p.y<=(hr || health).top-.5),
          healthThicker:!hr||health.height>hr.height,
          square:Math.abs(stage.width-stage.height)<.2};
      }
      for(const cell of document.querySelectorAll(`#${boardId} .board-cell`)){
        const previous=[...cell.children].map(el=>[el,el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')]);
        // A hidden-but-laid-out original card would create a second grid/flex
        // item and falsely shift the probe; a real socket holds ONE card.
        for(const [el] of previous)el.style.setProperty('display','none','important');
        cell.appendChild(reactor);
        const reference=measure(reactor,data[coreId]);reactor.remove();
        cell.appendChild(device);
        for(const [id,layer] of modules){
          view.update(device,model(id,false,enemy));
          const current=measure(device,layer);
          results.push({side:boardId,x:+cell.dataset.x,y:+cell.dataset.y,id,
            ratio:current.extent/reference.extent,coreExtent:reference.extent,moduleExtent:current.extent,
            bars:reference.healthClear&&current.healthClear&&current.heatClear&&current.healthThicker,
            fits:reference.fits&&current.fits,
            overflow:{core:reference.overflow,module:current.overflow},
            square:reference.square&&current.square});
          results.at(-1).seated=current.seatGap>=.5&&current.seatGap<2
            &&reference.seatGap>=.5&&reference.seatGap<2;
        }
        device.remove();
        for(const [el,value,priority] of previous){
          if(value)el.style.setProperty('display',value,priority);else el.style.removeProperty('display');
        }
      }
    }
    return results;
  });
  await info.attach('all-36-modules-all-30-sockets',{body:JSON.stringify(matrix,null,2),contentType:'application/json'});
  expect(matrix).toHaveLength(1080);
  for(const entry of matrix){
    expect(entry.ratio,JSON.stringify(entry)).toBeCloseTo(.85,3);
    expect(entry.bars,JSON.stringify(entry)).toBe(true);
    expect(entry.seated,JSON.stringify(entry)).toBe(true);
    expect(entry.fits,JSON.stringify(entry)).toBe(true);
    expect(entry.square,JSON.stringify(entry)).toBe(true);
  }
  const extents=matrix.map(m=>m.moduleExtent);
  expect(Math.max(...extents)-Math.min(...extents)).toBeLessThan(.2);
  // Fill both boards through the real renderer. A standing lower-row sprite
  // must appear in front of any overlapping neighbouring meter. Hit testing includes the
  // artwork here (temporarily) so a hidden bar cannot pass on geometry alone.
  const crowded=await page.evaluate(async()=>{
    const saved=[],cards=[],core=Object.keys(GridshardModuleLayerData).find(id=>GridshardModuleLayerData[id].core);
    const ids=['laser','battery','shield','cooler'];
    const view=new GridshardBattleCardStateView({document,mountIcon:(host,m)=>m.core
      ?GridshardModuleDeviceArt.mountCore(host,m.artwork)
      :GridshardModuleDeviceArt.mount(host,{definitionId:m.artwork},m.enemy)});
    for(const cell of document.querySelectorAll('.vertical-circuit-arena .board-cell')){
      saved.push([cell,[...cell.children].map(el=>[el,el.style.getPropertyValue('display'),el.style.getPropertyPriority('display')])]);
      for(const [el] of saved.at(-1)[1])el.style.setProperty('display','none','important');
      const isCore=cell.dataset.x==='2'&&cell.dataset.y==='1',enemy=cell.closest('#enemy-board')!==null;
      const id=isCore?core:ids[(+cell.dataset.x+ +cell.dataset.y)%ids.length];
      const card=view.create({id:'crowded-probe',artwork:id,name:id,shortName:id,title:id,
        hp:75,maxHp:100,heat:50,heatState:'normal',heatLabel:'50%',physical:true,core:isCore,enemy,
        liveBadges:[],signatureBadges:[]});
      cell.appendChild(card);cards.push(card);
    }
    await Promise.all(cards.flatMap(card=>[...card.querySelectorAll('img')].map(img=>img.decode())));
    for(const card of cards)for(const el of card.querySelectorAll('img,.core-health-bar,.module-health-bar,.module-heat-bar'))el.style.setProperty('pointer-events','auto','important');
    const alphaCache=new WeakMap();
    function alphaAt(img,x,y){
      let data=alphaCache.get(img);
      if(!data){
        const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const context=canvas.getContext('2d');context.drawImage(img,0,0);
        data=context.getImageData(0,0,canvas.width,canvas.height);alphaCache.set(img,data);
      }
      const r=img.getBoundingClientRect();
      const px=Math.max(0,Math.min(data.width-1,Math.floor((x-r.left)/r.width*data.width)));
      const py=Math.max(0,Math.min(data.height-1,Math.floor((y-r.top)/r.height*data.height)));
      return data.data[(py*data.width+px)*4+3];
    }
    const frames=[],originalQuality=document.body.dataset.graphics;
    for(const quality of ['dusuk','orta','yuksek']){
      document.body.dataset.graphics=quality;
      for(const card of cards){
        card.classList.add('fx-feedback-energy');
        const frame=card.querySelector('.module-fx-overlay'),style=getComputedStyle(frame);
        const animated=style.animationName==='gs-module-fx-overlay'&&style.animationIterationCount==='1';
        frame.style.setProperty('pointer-events','auto','important');
        // Freeze the real pulse at full visibility to probe its actual outline.
        frame.style.setProperty('opacity','1','important');
        const r=frame.getBoundingClientRect(),points=[];
        for(const f of [.2,.5,.8])points.push([r.left+2,r.top+r.height*f],
          [r.right-2,r.top+r.height*f],[r.left+r.width*f,r.top+2],[r.left+r.width*f,r.bottom-2]);
        const samples=points.map(([x,y])=>{
          const stack=document.elementsFromPoint(x,y),index=stack.indexOf(frame);
          const opaque=stack.flatMap((el,i)=>el instanceof HTMLImageElement&&alphaAt(el,x,y)>=8?[i]:[]);
          return {opaque:opaque.length,behindArt:index>=0&&opaque.every(i=>i<index)};
        });
        frames.push({quality,animated,display:style.display,z:+style.zIndex,
          samples,properOrder:samples.every(s=>s.behindArt)});
      }
    }
    document.body.dataset.graphics=originalQuality;
    const result=cards.flatMap(card=>[...card.querySelectorAll('.core-health-bar,.module-health-bar,.module-heat-bar')].filter(bar=>!bar.hidden).map(bar=>{
      const r=bar.getBoundingClientRect(),cell=card.parentElement.getBoundingClientRect();
      const samples=[.1,.3,.5,.7,.9].map(fraction=>{
        const x=r.left+r.width*fraction,y=r.top+r.height/2;
        const stack=document.elementsFromPoint(x,y),index=stack.findIndex(el=>el===bar||bar.contains(el));
        const opaque=stack.flatMap((el,i)=>el instanceof HTMLImageElement&&alphaAt(el,x,y)>=8
          ?[{index:i,foreign:!card.contains(el),kind:el.className}]:[]);
        return {index,opaque,foreign:opaque.filter(img=>img.foreign).length,
          properOrder:index>=0&&opaque.every(img=>img.foreign?img.index<index:img.index>index)};
      });
      return {side:card.closest('.board').id,x:card.parentElement.dataset.x,y:card.parentElement.dataset.y,
        kind:bar.className,inside:r.top>=cell.top&&r.bottom<=cell.bottom,
        // Alpha matters: a transparent sprite rectangle does not hide a bar.
        // Opaque foreign art MUST be in front; own art must leave its HUD clear.
        properOrder:samples.every(s=>s.properOrder),samples};
    }));
    for(const card of cards)card.remove();
    for(const [cell,children] of saved)for(const [el,value,priority] of children){
      if(value)el.style.setProperty('display',value,priority);else el.style.removeProperty('display');
    }
    return {bars:result,frames};
  });
  await info.attach('crowded-board-meters',{body:JSON.stringify(crowded,null,2),contentType:'application/json'});
  expect(crowded.bars).toHaveLength(58);
  expect(crowded.bars.flatMap(bar=>bar.samples).some(sample=>sample.foreign>0)).toBe(true);
  for(const bar of crowded.bars){expect(bar.inside,JSON.stringify(bar)).toBe(true);expect(bar.properOrder,JSON.stringify(bar)).toBe(true);}
  expect(crowded.frames).toHaveLength(90);
  expect(crowded.frames.flatMap(frame=>frame.samples).some(sample=>sample.opaque>0)).toBe(true);
  for(const frame of crowded.frames){
    expect(frame.animated&&frame.display==='block'&&frame.z===0,JSON.stringify(frame)).toBe(true);
    expect(frame.properOrder,JSON.stringify(frame)).toBe(true);
  }
  await info.attach('platform-layout',{body:JSON.stringify(checks,null,2),contentType:'application/json'});
  expect(errors).toEqual([]);
});
