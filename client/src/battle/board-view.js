(() => {
  "use strict";

  // Hücre bazlı kısmi güncelleme: `moduleSignature` verildiğinde görünümü
  // değişmeyen hücreye dokunulmaz. Her anlık görüntüde tüm tahtayı yeniden
  // kurmak düşük donanımlı telefonlarda stil/düzen maliyetiyle kareleri
  // düşürüyordu ve kart animasyonlarını baştan başlatıyordu.
  class GridshardBattleBoardView {
    constructor(boardElement) {
      this.board = boardElement;
      this.cellSignatures = new WeakMap();
    }

    render(
      modules,
      {
        selectedModuleId = null,
        battleFinished = false,
        createModuleCard,
        cellDebris = [],
        debrisLabel = "Enkaz",
        moduleSignature = null,
        onCardPlaced = null,
        force = false,
      }
    ) {
      const debrisByCell = new Map();
      for (const debris of cellDebris) {
        debrisByCell.set(`${Number(debris.x)},${Number(debris.y)}`, debris);
      }
      const moduleByCell = new Map();
      for (const module of modules) {
        if (module.status !== "active" || !module.position) continue;
        moduleByCell.set(`${Number(module.position.x)},${Number(module.position.y)}`, module);
      }

      const dataCells = [];
      for (const cell of this.board.querySelectorAll(".board-cell")) {
        const x = cell.dataset?.x;
        const y = cell.dataset?.y;
        if (x === undefined || y === undefined) {
          // Konumu bilinmeyen hücre (eski çağıran): her seferinde temizlenir.
          this.resetCell(cell, selectedModuleId, battleFinished);
          continue;
        }
        dataCells.push([`${Number(x)},${Number(y)}`, cell]);
      }

      if (!dataCells.length) {
        // Hücre konumu taşımayan tahta: seçiciyle yerleştir (geriye uyumluluk).
        this.renderBySelector(modules, { createModuleCard, cellDebris, debrisLabel });
        return;
      }

      for (const [key, cell] of dataCells) {
        const debris = debrisByCell.get(key) || null;
        const module = moduleByCell.get(key) || null;
        const tapDropTarget = Boolean(selectedModuleId)
          && !cell.classList.contains("core-cell")
          && !battleFinished;
        const seconds = debris
          ? Math.max(1, Math.ceil(Number(debris.remaining_ms || 0) / 1000))
          : 0;
        const signature = typeof moduleSignature === "function"
          ? `${tapDropTarget ? 1 : 0}|${seconds}|${debrisLabel}|${module ? moduleSignature(module) : ""}`
          : null;
        if (!force && signature !== null && this.cellSignatures.get(cell) === signature) {
          continue;
        }
        this.cellSignatures.set(cell, signature);
        this.resetCell(cell, selectedModuleId, battleFinished);
        if (debris) this.appendDebris(cell, seconds, debrisLabel);
        if (module) {
          cell.dataset.occupied = "true";
          cell.appendChild(createModuleCard(module));
          if (typeof onCardPlaced === "function") onCardPlaced(module, cell);
        }
      }
    }

    resetCell(cell, selectedModuleId, battleFinished) {
      cell.innerHTML = "";
      cell.dataset.occupied = "false";
      cell.dataset.debris = "false";
      cell.classList.remove("debris-cell");
      cell.classList.toggle(
        "tap-drop-target",
        Boolean(selectedModuleId)
          && !cell.classList.contains("core-cell")
          && !battleFinished
      );
    }

    appendDebris(cell, seconds, debrisLabel) {
      cell.dataset.debris = "true";
      cell.classList.add("debris-cell");
      cell.classList.remove("tap-drop-target");
      const marker = document.createElement("span");
      marker.className = "cell-debris";
      marker.setAttribute("role", "status");
      marker.setAttribute("aria-label", `${debrisLabel}: ${seconds}`);
      const shards = document.createElement("span");
      shards.className = "cell-debris-shards";
      shards.setAttribute("aria-hidden", "true");
      const countdown = document.createElement("strong");
      countdown.textContent = `${seconds} sn`;
      marker.append(shards, countdown);
      cell.appendChild(marker);
    }

    renderBySelector(modules, { createModuleCard, cellDebris, debrisLabel }) {
      for (const debris of cellDebris) {
        const cell = this.board.querySelector(
          `.board-cell[data-x="${debris.x}"][data-y="${debris.y}"]`
        );
        if (!cell) continue;
        this.appendDebris(
          cell,
          Math.max(1, Math.ceil(Number(debris.remaining_ms || 0) / 1000)),
          debrisLabel
        );
      }
      for (const module of modules) {
        if (module.status !== "active" || !module.position) continue;
        const cell = this.board.querySelector(
          `.board-cell[data-x="${module.position.x}"][data-y="${module.position.y}"]`
        );
        if (!cell) continue;
        cell.dataset.occupied = "true";
        cell.appendChild(createModuleCard(module));
      }
    }
  }

  globalThis.GridshardBattleBoardView = GridshardBattleBoardView;
})();
