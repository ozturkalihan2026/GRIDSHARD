(() => {
  "use strict";

  class GridshardBattleBoardView {
    constructor(boardElement) {
      this.board = boardElement;
    }

    render(modules, { selectedModuleId = null, battleFinished = false, createModuleCard }) {
      for (const cell of this.board.querySelectorAll(".board-cell")) {
        cell.innerHTML = "";
        cell.dataset.occupied = "false";
        cell.classList.toggle(
          "tap-drop-target",
          Boolean(selectedModuleId)
            && !cell.classList.contains("core-cell")
            && !battleFinished
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
