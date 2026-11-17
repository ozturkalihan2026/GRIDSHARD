/* Offline real-engine replay; never imports the game or changes saved preferences. */
(() => {
  const data = window.RECOIL_DEMO;
  const $ = id => document.getElementById(id);
  let index = 0;
  let selected = 'armor';
  const presentation = new window.RecoilCannonPresentation();
  const audio = $('candidate-audio');
  let audioGeneration = 0;
  const names = { armor: 'Zırh', phase_armor: 'Faz Zırhı' };
  const directions = window.RECOIL_DIRECTIONS.frames;
  const artRoot = '../../../../client/assets/ui/module-candidates-v1/';
  for (const frame of directions) {
    const option = document.createElement('option');
    option.value = frame.id; option.textContent = frame.name_tr;
    $('direction').append(option);
    const figure = document.createElement('figure');
    const img = document.createElement('img'); img.src = artRoot + frame.file; img.alt = frame.name_tr;
    const caption = document.createElement('figcaption'); caption.textContent = frame.name_tr;
    figure.append(img, caption); $('direction-thumbnails').append(figure);
  }
  function showDirection(id) {
    const frame = directions.find(f => f.id === id);
    const scale = .7 / frame.pedestal_width;
    $('direction-art').src = artRoot + frame.file;
    $('direction-art').alt = `Geri Tepme Topu · ${frame.name_tr}`;
    // Align measured ground contact and pedestal footprint. No sprite rotation.
    Object.assign($('direction-art').style, { width: `${scale*100}%`, height: `${scale*100}%`,
      left: `${(0.5-frame.ground_pivot.x*scale)*100}%`, top: `${(.94-frame.ground_pivot.y*scale)*100}%` });
    $('direction').value = id;
    $('direction-name').textContent = `${frame.name_tr} · ${frame.angle_deg}°`;
  }
  $('direction').addEventListener('change', event => showDirection(event.target.value));
  $('next-direction').addEventListener('click', () => {
    const index = directions.findIndex(frame => frame.id === $('direction').value);
    showDirection(directions[(index+1)%directions.length].id);
  });
  showDirection('ne');

  function render(animate = false) {
    const scenario = data.scenarios[selected];
    const frame = scenario.frames[index];
    $('gun-hp').textContent = `${frame.gun_hp} / 240 CAN`;
    $('gun-meter').value = frame.gun_hp;
    $('own-shield').textContent = frame.shield_hp ? `Kalkan: ${frame.shield_hp}` : '';
    $('target-name').textContent = names[scenario.target];
    $('target-art').src = `../../../../client/assets/ui/modules-physical-${scenario.target === 'armor' ? 'v1' : 'v2'}/${scenario.target}.webp`;
    $('target-hp').textContent = `${frame.target_hp} / ${scenario.target_max_hp} CAN`;
    $('target-meter').max = scenario.target_max_hp;
    $('target-meter').value = frame.target_hp;
    $('time').textContent = `${(frame.at_ms / 1000).toFixed(1)} sn`;
    $('next').disabled = index === scenario.frames.length - 1;
    const wear = frame.events.filter(e => e.type === 'module_recoil');
    $('summary').textContent = index === 0 ? 'Başlangıç durumu. Sonraki adımla ilerle.' :
      wear.length ? `Atış ${wear.length} kez: kendi gövdesinden ${wear.reduce((sum, e) => sum + e.data.hp_loss, 0)} CAN aşındı. Bu kayıp rakip hasarı veya Akım geliri sayılmaz.` : 'Bu aralıkta aday ateşlemedi; geri tepme bedeli yok.';
    $('events').replaceChildren();
    for (const event of frame.events.filter(e => ['module_recoil', 'attack_performed', 'damage_blocked', 'damage_absorbed', 'phase_blocked'].includes(e.type))) {
      const li = document.createElement('li');
      li.textContent = `${(event.at_ms / 1000).toFixed(1)} sn · ${event.type === 'module_recoil' ? `Gövde aşınması: ${event.data.hp_loss} CAN` : event.type === 'attack_performed' ? `Gerçek atış; sonuç hasarı: ${event.data.damage ?? 0}` : event.type}`;
      $('events').append(li);
    }
    if (index === 0) presentation.reset(selected);
    const actions = presentation.consume(frame.events, { session: selected, elapsedMs: frame.at_ms, moduleIds: ['candidate'], visible: !document.hidden });
    for (const [id, enabled, css] of [['gun', actions.some(a => a.type === 'shot'), 'recoil'], ['target', actions.some(a => a.type === 'shot' && a.impact), 'impact']]) {
      $(id).classList.remove(css);
      if (animate && enabled) { void $(id).offsetWidth; $(id).classList.add(css); }
    }
  }
  $('scenario').addEventListener('change', e => { selected = e.target.value; index = 0; render(); });
  $('next').addEventListener('click', () => { index = Math.min(index + 1, data.scenarios[selected].frames.length - 1); render(true); });
  $('reset').addEventListener('click', () => { index = 0; render(); });
  function stop() { audioGeneration++; audio.pause(); audio.removeAttribute('src'); audio.load(); }
  for (const kind of ['shot', 'hit']) $(kind).addEventListener('click', async () => {
    stop();
    const generation = audioGeneration;
    audio.src = `../../../../client/assets/audio/candidates-v1/recoil_cannon-${kind}.wav`;
    try {
      await audio.play();
      if (generation === audioGeneration) $('audio-status').textContent = kind === 'shot' ? 'Atış ve piston dönüşü başlatıldı.' : 'İsabet başlatıldı.';
    } catch {
      if (generation === audioGeneration) $('audio-status').textContent = 'Ses açılamadı. Sayfayı yerel sunucu üzerinden açmayı dene.';
    }
  });
  $('stop').addEventListener('click', () => { stop(); $('audio-status').textContent = 'Ses durduruldu.'; });
  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  render();
})();
