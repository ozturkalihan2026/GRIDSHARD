(() => {
  "use strict";

  const moduleDefinitions = [
    ["core-1","Çekirdek",300,0,"çekirdek","Ana hedef ve devre merkezi","active",{x:2,y:2}],
    ["generator-1","Jeneratör",150,0,"enerji","Ana enerji kaynağı","active",{x:2,y:3}],
    ["battery-1","Batarya",120,70,"enerji","Enerji rezervi","reserve",null],
    ["splitter-1","Dağıtıcı",85,60,"enerji","Enerji hattını dallandırma","reserve",null],
    ["capacitor-1","Kapasitör",90,75,"enerji","Kısa süreli güç boşaltımı","reserve",null],
    ["laser-1","Lazer",100,90,"saldırı","Sürekli tek hedef hasarı","reserve",null],
    ["pulse-cannon-1","Darbe Topu",115,120,"saldırı","Yüksek ani hasar","reserve",null],
    ["railgun-1","Ray Topu",95,135,"saldırı","Yüksek delici hasar","reserve",null],
    ["missile-launcher-1","Füze Fırlatıcı",105,125,"saldırı","Gecikmeli yüksek alan baskısı","reserve",null],
    ["drone-bay-1","Dron Üssü",110,115,"saldırı","Dağıtık ve sürekli baskı","reserve",null],
    ["arc-cannon-1","Ark Topu",100,130,"saldırı","Zincirleme çoklu hedef hasarı","reserve",null],
    ["shield-1","Kalkan",140,100,"savunma","Aktif hasar emme","reserve",null],
    ["armor-1","Zırh",180,95,"savunma","Pasif dayanıklılık","reserve",null],
    ["reflector-1","Yansıtıcı",110,115,"savunma","Enerji saldırısını geri çevirme","reserve",null],
    ["barrier-1","Bariyer",165,105,"savunma","Bağlantı hattını koruma","reserve",null],
    ["repair-1","Onarım Modülü",100,80,"destek","Can onarımı","reserve",null],
    ["cooler-1","Soğutucu",100,65,"destek","Isı kontrolü","reserve",null],
    ["amplifier-1","Güçlendirici",90,85,"destek","Saldırı hattını güçlendirme","reserve",null],
    ["targeting-computer-1","Hedefleme Bilgisayarı",85,90,"destek","Hedefleme desteği","reserve",null],
    ["overclock-unit-1","Aşırı Hızlandırıcı",80,105,"destek","Yüksek performans ve ısı riski","reserve",null],
    ["emp-1","EMP",80,110,"sabotaj","Geçici sistem bozma","reserve",null],
    ["jammer-1","Sinyal Bozucu",85,100,"sabotaj","Destek hatlarını bozma","reserve",null],
    ["virus-1","Virüs",70,115,"sabotaj","Zamanla yayılan sistem zayıflatması","reserve",null],
    ["energy-leech-1","Enerji Sömürücü",75,120,"sabotaj","Enerji ekonomisini baskılama","reserve",null],
    ["disruptor-1","Kesici",80,125,"sabotaj","Kritik bağlantıyı geçici kesme","reserve",null],
  ].map(([instanceId,nameTr,hp,circuitCreditCost,category,strategicRole,status,position]) => ({
    instanceId,nameTr,hp,maxHp:hp,circuitCreditCost,category,strategicRole,status,position,
  }));

  const commandLog = [];
  const BOOSTER_FIRST_OFFER_MS = 85000;
  const BOOSTER_OFFER_INTERVAL_MS = 10000;
  let nextBoosterOfferIndex = 0;
  let boosterOfferOpen = false;

  const BOOSTER_OPTIONS = [
    { id:"overcharge_chip", nameTr:"Aşırı Yük Çipi", descriptionTr:"+%25 saldırı · 15 sn", targetCategories:["saldırı"] },
    { id:"emergency_repair", nameTr:"Acil Onarım", descriptionTr:"%25 anlık onarım", targetCategories:[] },
    { id:"dual_port_adapter", nameTr:"Çift Port Adaptörü", descriptionTr:"+1 geçici port · 15 sn", targetCategories:[] },
  ];
  let selectedBoosterId = null;
  const selectablePoolModules = moduleDefinitions.filter(
    (module) => module.instanceId !== "core-1"
  );
  const battlePoolSelection = new BattlePoolSelection({
    selectableModuleIds: selectablePoolModules.map((module) => module.instanceId),
    requiredSize: 18,
  });

  const client = new RelayBattleClient({
    modules: moduleDefinitions,
    unlockAtMs: 15000,
    circuitCredits: 200,
    emitCommand(command) {
      commandLog.push({
        atMs: client.elapsedMs,
        ...command,
      });
      renderLog();
      applyMockServerCommand(command);
    },
  });

  const board = document.getElementById("board");
  const shelf = document.getElementById("module-shelf");
  const timeEl = document.getElementById("battle-time");
  const creditEl = document.getElementById("credit-indicator");
  const capacityEl = document.getElementById("capacity-indicator");
  const lockLabel = document.getElementById("shelf-lock-label");
  const shelfHelp = document.getElementById("shelf-help");
  const logEl = document.getElementById("event-log");
  const boosterOptionsEl = document.getElementById("booster-options");
  const boosterStatusEl = document.getElementById("booster-status");
  const poolSelectionEl = document.getElementById("battle-pool-selection");
  const poolCountEl = document.getElementById("battle-pool-count");
  const poolConfirmEl = document.getElementById("battle-pool-confirm");

  const BOARD_CELLS = [
    [1,0],[2,0],[3,0],
    [0,1],[1,1],[2,1],[3,1],[4,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],
    [0,3],[1,3],[2,3],[3,3],[4,3],
    [1,4],[2,4],[3,4],
  ];
  const CORE_POSITION = { x: 2, y: 2 };
  const GATE_KEYS = new Set(["2,1","3,2","2,3","1,2"]);
const SPECIAL_CELL_INFO = {
  "2,0": { css: "attack-cell", label: "Saldırı Hücresi", bonus: "+%15 saldırı" },
  "4,2": { css: "defense-cell", label: "Savunma Hücresi", bonus: "+%15 dayanıklılık" },
  "2,4": { css: "energy-cell", label: "Enerji Hücresi", bonus: "+%15 enerji etkinliği" },
  "0,2": { css: "cooling-cell", label: "Soğutma Hücresi", bonus: "-%20 ısı oluşumu" },
  "1,1": { css: "repair-cell", label: "Onarım Hücresi", bonus: "+%20 onarım" },
  "3,3": { css: "signal-cell", label: "Sinyal Hücresi", bonus: "-%15 bekleme süresi" },
};
  const startedAt = performance.now();
  let previousCapacity = null;
  let mockServerCredits = 200;
  let mockServerPassiveSeconds = 0;

  function renderBattlePoolSelection() {
    poolSelectionEl.innerHTML = "";

    for (const module of selectablePoolModules) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pool-choice";
      button.textContent = `${module.nameTr} · ${module.category}`;

      if (battlePoolSelection.selected.has(module.instanceId)) {
        button.classList.add("selected");
      }

      button.addEventListener("click", () => {
        const result = battlePoolSelection.toggle(module.instanceId);
        if (!result.ok) logClientMessage(result.reason);
        renderBattlePoolSelection();
      });

      poolSelectionEl.appendChild(button);
    }

    poolCountEl.textContent =
      `${battlePoolSelection.selected.size} / ${battlePoolSelection.requiredSize}`;
    poolConfirmEl.disabled = !battlePoolSelection.isComplete();
  }

  function boosterOfferDueAtMs(index) {
    return BOOSTER_FIRST_OFFER_MS + index * BOOSTER_OFFER_INTERVAL_MS;
  }

  function updateBoosterOfferAvailability() {
    if (!boosterOfferOpen && client.elapsedMs >= boosterOfferDueAtMs(nextBoosterOfferIndex)) {
      boosterOfferOpen = true;
      selectedBoosterId = null;
      boosterStatusEl.textContent = "3 seçenekten 1'ini seç";
      renderBoosterOptions();
    }
  }

  function renderBoosterOptions() {
    boosterOptionsEl.innerHTML = "";
    for (const booster of BOOSTER_OPTIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "booster-option";
      button.textContent = `${booster.nameTr} · ${booster.descriptionTr}`;
      button.disabled = !boosterOfferOpen;
      if (selectedBoosterId === booster.id) button.classList.add("selected");
      button.addEventListener("click", () => {
        if (!boosterOfferOpen) return;
        selectedBoosterId = booster.id;
        boosterStatusEl.textContent = selectedBoosterId ? "Hedef modül seç" : "Seçim bekleniyor";
        renderBoosterOptions();
        renderBoard();
      });
      boosterOptionsEl.appendChild(button);
    }
  }

  function tryApplySelectedBooster(module) {
    if (!selectedBoosterId) return false;
    const booster = BOOSTER_OPTIONS.find(item => item.id === selectedBoosterId);
    if (!booster) return false;
    if (booster.targetCategories.length && !booster.targetCategories.includes(module.category)) {
      logClientMessage(`${booster.nameTr}, ${module.nameTr} modülüne uygulanamaz.`);
      return true;
    }
    commandLog.push({
      atMs: client.elapsedMs,
      kind: "apply_booster",
      payload: { booster_id: booster.id, target_module_id: module.instanceId },
    });
    selectedBoosterId = null;
    boosterOfferOpen = false;
    nextBoosterOfferIndex += 1;
    boosterStatusEl.textContent =
      `${((boosterOfferDueAtMs(nextBoosterOfferIndex) - client.elapsedMs) / 1000).toFixed(1)} sn sonra yeni hak`;
    renderLog();
    renderBoosterOptions();
    renderBoard();
    return true;
  }

  function createBoard() {
    board.innerHTML = "";

    for (const [x, y] of BOARD_CELLS) {
      const cell = document.createElement("div");
      cell.className = "board-cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      cell.style.gridColumn = String(x + 1);
      cell.style.gridRow = String(y + 1);

      const key = `${x},${y}`;
      if (x === CORE_POSITION.x && y === CORE_POSITION.y) {
        cell.classList.add("core-cell");
      } else if (GATE_KEYS.has(key)) {
        cell.classList.add("gate-cell");
      } else if (SPECIAL_CELL_INFO[key]) {
        const special = SPECIAL_CELL_INFO[key];
        cell.classList.add("special-cell", special.css);
        cell.title = `${special.label}: ${special.bonus}`;
        cell.dataset.specialLabel = special.label;
        cell.dataset.specialBonus = special.bonus;
      }

      cell.addEventListener("dragover", (event) => {
        if (cell.classList.contains("core-cell")) return;
        event.preventDefault();
        cell.classList.add("drag-over");
      });

      cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));

      cell.addEventListener("drop", (event) => {
        if (cell.classList.contains("core-cell")) return;
        event.preventDefault();
        cell.classList.remove("drag-over");

        const targetCard = cell.querySelector(".module-card");
        const targetModuleId = targetCard?.dataset.moduleId || null;

        const result = client.dropOnCell(
          Number(cell.dataset.x),
          Number(cell.dataset.y),
          targetModuleId
        );

        if (!result.ok) logClientMessage(result.reason);
      });

      board.appendChild(cell);
    }
  }

  function render() {
    renderShelf();
    renderBoard();
    renderLockState();
  }

  function renderShelf() {
    shelf.innerHTML = "";
    const unlocked = client.isShelfUnlocked();

    for (const module of client.modules.values()) {
      if (module.status !== "reserve") continue;

      const card = createModuleCard(module);
      if (!unlocked) {
        card.classList.add("locked");
      }
      shelf.appendChild(card);
    }

    shelf.addEventListener("dragover", (event) => event.preventDefault());
    shelf.ondrop = (event) => {
      event.preventDefault();
      const result = client.dropOnShelf();
      if (!result.ok) {
        logClientMessage(result.reason);
      }
    };
  }

  function renderBoard() {
    for (const cell of board.querySelectorAll(".board-cell")) {
      cell.innerHTML = "";
    }

    for (const module of client.modules.values()) {
      if (module.status !== "active" || !module.position) continue;
      const selector =
        `.board-cell[data-x="${module.position.x}"][data-y="${module.position.y}"]`;
      const cell = board.querySelector(selector);
      if (!cell) continue;
      cell.appendChild(createModuleCard(module));
    }
  }

  function createModuleCard(module) {
    const card = document.createElement("div");
    card.className = "module-card";
    card.draggable = true;
    card.dataset.moduleId = module.instanceId;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = module.nameTr;

    const meta = document.createElement("span");
    meta.className = "meta";
    const costText = module.circuitCreditCost > 0
      ? ` · ${module.circuitCreditCost} DK`
      : "";
    meta.textContent = `Can ${module.hp}/${module.maxHp}${costText}`;

    card.append(name, meta);

    if (selectedBoosterId && module.status === "active") {
      card.classList.add("booster-target");
    }
    card.addEventListener("click", () => {
      tryApplySelectedBooster(module);
    });

    card.addEventListener("dragstart", (event) => {
      const result = client.beginDrag(module.instanceId);
      if (!result.ok) {
        event.preventDefault();
        logClientMessage(result.reason);
        return;
      }

      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", module.instanceId);
    });

    card.addEventListener("dragend", () => {
      client.cancelDrag();
    });

    return card;
  }

  function applyMockServerCommand(command) {
    // Alpha.6: Bu katman yalnızca UI demosu için sahte sunucu cevabıdır.
    // Gerçek Devre Kredisi otoritesi Python savaş motorundadır.
    const moduleCost = (moduleId) =>
      client.requireModule(moduleId).circuitCreditCost || 0;

    let cost = 0;
    if (command.kind === "place_module") {
      cost = moduleCost(command.payload.module_id);
    } else if (command.kind === "move_module") {
      cost = 10;
    } else if (command.kind === "replace_module") {
      cost = moduleCost(command.payload.incoming_module_id);
    }

    if (mockServerCredits < cost) {
      logClientMessage(
        `Yetersiz Devre Kredisi: gerekli ${cost} DK, mevcut ${mockServerCredits} DK.`
      );
      flashInsufficientCredits();
      return;
    }

    mockServerCredits -= cost;
    client.applyServerEconomyState({ circuitCredits: mockServerCredits });

    if (command.kind === "place_module") {
      const module = client.requireModule(command.payload.module_id);
      client.applyServerModuleState({
        instanceId: module.instanceId,
        status: "active",
        position: { x: command.payload.x, y: command.payload.y },
      });
    } else if (command.kind === "move_module") {
      const module = client.requireModule(command.payload.module_id);
      client.applyServerModuleState({
        instanceId: module.instanceId,
        position: { x: command.payload.x, y: command.payload.y },
      });
    } else if (command.kind === "remove_module") {
      const module = client.requireModule(command.payload.module_id);
      client.applyServerModuleState({
        instanceId: module.instanceId,
        status: "reserve",
        position: null,
      });
    } else if (command.kind === "replace_module") {
      const outgoing = client.requireModule(command.payload.outgoing_module_id);
      const incoming = client.requireModule(command.payload.incoming_module_id);
      const position = outgoing.position;
      client.applyServerModuleState({
        instanceId: outgoing.instanceId,
        status: "reserve",
        position: null,
      });
      client.applyServerModuleState({
        instanceId: incoming.instanceId,
        status: "active",
        position,
      });
    }

    render();
    renderCredits();
  }

  function updateMockServerPassiveCredits(elapsedMs) {
    const passiveSeconds = Math.floor(elapsedMs / 1000);
    if (passiveSeconds <= mockServerPassiveSeconds) return;

    const gainedSeconds = passiveSeconds - mockServerPassiveSeconds;
    mockServerCredits += gainedSeconds * 10;
    mockServerPassiveSeconds = passiveSeconds;
    client.applyServerEconomyState({ circuitCredits: mockServerCredits });
  }

  function renderCredits() {
    creditEl.textContent = `Devre Kredisi: ${client.circuitCredits} DK`;
  }

  function flashInsufficientCredits() {
    creditEl.classList.add("credit-insufficient");
    window.setTimeout(() => {
      creditEl.classList.remove("credit-insufficient");
    }, 700);
  }


  function renderCapacity() {
    const limit = client.maxActiveModules();
    const active = client.activeModuleCount();

    if (limit === null) {
      capacityEl.textContent = `Aktif Modül: ${active} / Başlangıç`;
      capacityEl.classList.remove("capacity-opened");
      previousCapacity = null;
      return;
    }

    capacityEl.textContent = `Aktif Modül: ${active} / ${limit}`;

    if (previousCapacity !== null && limit > previousCapacity) {
      capacityEl.classList.add("capacity-opened");
      logClientMessage(`Aktif modül kapasitesi ${limit} oldu.`);
      window.setTimeout(() => {
        capacityEl.classList.remove("capacity-opened");
      }, 900);
    }

    previousCapacity = limit;
  }

  function renderLockState() {
    const unlocked = client.isShelfUnlocked();
    lockLabel.dataset.active = String(unlocked);
    lockLabel.textContent = unlocked ? "Aktif" : "Kilitli";

    if (unlocked) {
      shelfHelp.textContent = "Modülleri sürükleyerek savaş alanına müdahale edebilirsin.";
    } else {
      const remaining = Math.max(0, 15000 - client.elapsedMs);
      shelfHelp.textContent =
        `Modül müdahalesi ${(remaining / 1000).toFixed(1)} sn sonra açılacak.`;
    }
  }

  function renderLog() {
    logEl.textContent = commandLog
      .slice(-12)
      .map((entry) => JSON.stringify(entry))
      .join("\n");
  }

  function logClientMessage(message) {
    commandLog.push({
      atMs: client.elapsedMs,
      kind: "client_notice",
      payload: { message },
    });
    renderLog();
  }

  function updateClock(now) {
    const elapsedMs = now - startedAt;
    client.updateElapsedMs(elapsedMs);
    updateMockServerPassiveCredits(elapsedMs);

    const seconds = elapsedMs / 1000;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds - minutes * 60;
    timeEl.textContent =
      `${String(minutes).padStart(2, "0")}:${secs.toFixed(1).padStart(4, "0")}`;

    renderLockState();
    renderCapacity();
    renderCredits();
    updateBoosterOfferAvailability();

    if (Math.floor(elapsedMs / 250) !== Math.floor((elapsedMs - 16) / 250)) {
      renderShelf();
      renderBoard();
    }

    requestAnimationFrame(updateClock);
  }

  poolConfirmEl.addEventListener("click", () => {
    if (!battlePoolSelection.isComplete()) return;
    commandLog.push({
      atMs: client.elapsedMs,
      kind: "set_battle_pool",
      payload: { module_instance_ids: battlePoolSelection.selectedIds() },
    });
    renderLog();
  });

  renderBattlePoolSelection();
  renderBoosterOptions();
  createBoard();
  render();
  renderCapacity();
  renderCredits();
  requestAnimationFrame(updateClock);
})();
