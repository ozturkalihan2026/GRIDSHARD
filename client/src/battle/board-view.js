(() => {
  "use strict";

  class GridshardBattleBoardView {
    constructor(boardElement) {
      this.board = boardElement;
    }

    render(
      modules,
      {
        selectedModuleId = null,
        battleFinished = false,
        createModuleCard,
        cellDebris = [],
        debrisLabel = "Enkaz",
      }
    ) {
      for (const cell of this.board.querySelectorAll(".board-cell")) {
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

      for (const debris of cellDebris) {
        const cell = this.board.querySelector(
          `.board-cell[data-x="${debris.x}"][data-y="${debris.y}"]`
        );
        if (!cell) continue;
        const seconds = Math.max(
          1,
          Math.ceil(Number(debris.remaining_ms || 0) / 1000)
        );
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
