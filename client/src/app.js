(() => {
  "use strict";

  const moduleDefinitions = [
    ["core-1", "Çekirdek", 300, 0, "çekirdek", "Ana hedef ve devre merkezi", "active", { x: 2, y: 2 }],
    ["generator-1", "Jeneratör", 150, 0, "enerji", "Ana enerji kaynağı", "active", { x: 2, y: 3 }],
    ["laser-1", "Lazer", 100, 90, "saldırı", "Sürekli tek hedef hasarı", "reserve", null],
    ["shield-1", "Kalkan", 140, 100, "savunma", "Aktif hasar emme", "reserve", null],
    ["battery-1", "Batarya", 120, 70, "enerji", "Enerji rezervi", "reserve", null],
    ["amplifier-1", "Güçlendirici", 90, 85, "destek", "Saldırı hattını güçlendirme", "reserve", null],
    ["cooler-1", "Soğutucu", 100, 65, "destek", "Isı kontrolü", "reserve", null],
    ["repair-1", "Onarım Modülü", 100, 80, "destek", "Can onarımı", "reserve", null],
    ["splitter-1", "Dağıtıcı", 85, 60, "enerji", "Enerji hattını dallandırma", "reserve", null],
    ["pulse-cannon-1", "Darbe Topu", 115, 120, "saldırı", "Yüksek ani hasar", "reserve", null],
    ["armor-1", "Zırh", 180, 95, "savunma", "Pasif dayanıklılık", "reserve", null],
    ["emp-1", "EMP", 80, 110, "sabotaj", "Geçici sistem bozma", "reserve", null],
  ].map(([instanceId, nameTr, hp, circuitCreditCost, category, strategicRole, status, position]) => ({
    instanceId,
    nameTr,
    hp,
    maxHp: hp,
    circuitCreditCost,
    category,
    strategicRole,
    status,
    position,
  }));

  const commandLog = [];
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

  const BOARD_SIZE = 5;
  const startedAt = performance.now();
  let previousCapacity = null;
  let mockServerCredits = 200;
  let mockServerPassiveSeconds = 0;

  function createBoard() {
    board.innerHTML = "";
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        const cell = document.createElement("div");
        cell.className = "board-cell";
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);

        cell.addEventListener("dragover", (event) => {
          event.preventDefault();
          cell.classList.add("drag-over");
        });

        cell.addEventListener("dragleave", () => {
          cell.classList.remove("drag-over");
        });

        cell.addEventListener("drop", (event) => {
          event.preventDefault();
          cell.classList.remove("drag-over");

          const targetCard = cell.querySelector(".module-card");
          const targetModuleId = targetCard?.dataset.moduleId || null;

          const result = client.dropOnCell(
            Number(cell.dataset.x),
            Number(cell.dataset.y),
            targetModuleId
          );

          if (!result.ok) {
            logClientMessage(result.reason);
          }
        });

        board.appendChild(cell);
      }
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

    if (Math.floor(elapsedMs / 250) !== Math.floor((elapsedMs - 16) / 250)) {
      renderShelf();
      renderBoard();
    }

    requestAnimationFrame(updateClock);
  }

  createBoard();
  render();
  renderCapacity();
  renderCredits();
  requestAnimationFrame(updateClock);
})();
