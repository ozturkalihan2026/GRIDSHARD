(function (global) {
  "use strict";

  const MODULE_STATUS = Object.freeze({
    RESERVE: "reserve",
    ACTIVE: "active",
    DESTROYED: "destroyed",
  });


  function maxActiveModulesForElapsedMs(elapsedMs) {
    if (elapsedMs < 15000) return null;
    if (elapsedMs < 25000) return 4;
    if (elapsedMs < 35000) return 5;
    if (elapsedMs < 45000) return 6;
    if (elapsedMs < 55000) return 7;
    if (elapsedMs < 65000) return 8;
    if (elapsedMs < 75000) return 9;
    return 10;
  }

  const DRAG_KIND = Object.freeze({
    SHELF_MODULE: "shelf-module",
    ACTIVE_MODULE: "active-module",
  });

  class BattlePoolSelection {
    constructor({ selectableModuleIds, requiredSize = 18 }) {
      this.selectableModuleIds = [...selectableModuleIds];
      this.requiredSize = requiredSize;
      this.selected = new Set();
    }

    toggle(moduleId) {
      if (!this.selectableModuleIds.includes(moduleId)) {
        return { ok: false, reason: "Modül global oyuncu havuzunda değil." };
      }

      if (this.selected.has(moduleId)) {
        this.selected.delete(moduleId);
        return { ok: true, selected: false };
      }

      if (this.selected.size >= this.requiredSize) {
        return { ok: false, reason: `En fazla ${this.requiredSize} modül seçilebilir.` };
      }

      this.selected.add(moduleId);
      return { ok: true, selected: true };
    }

    isComplete() {
      return this.selected.size === this.requiredSize;
    }

    selectedIds() {
      return [...this.selected];
    }
  }

  class RelayBattleClient {
    constructor({ modules, unlockAtMs = 15000, circuitCredits = 0, emitCommand }) {
      this.unlockAtMs = unlockAtMs;
      this.emitCommand = emitCommand;
      this.elapsedMs = 0;
      this.circuitCredits = Math.max(0, Math.floor(circuitCredits));
      this.dragState = null;
      this.modules = new Map(
        modules.map((module) => [
          module.instanceId,
          {
            ...module,
            status: module.status || MODULE_STATUS.RESERVE,
            position: module.position || null,
          },
        ])
      );
    }

    updateElapsedMs(elapsedMs) {
      this.elapsedMs = Math.max(0, elapsedMs);
    }

    isShelfUnlocked() {
      return this.elapsedMs >= this.unlockAtMs;
    }

    maxActiveModules() {
      return maxActiveModulesForElapsedMs(this.elapsedMs);
    }

    activeModuleCount() {
      let count = 0;
      for (const module of this.modules.values()) {
        if (module.status === MODULE_STATUS.ACTIVE) count += 1;
      }
      return count;
    }

    beginDrag(moduleId) {
      const module = this.requireModule(moduleId);

      if (module.status === MODULE_STATUS.DESTROYED) {
        return { ok: false, reason: "Yok edilmiş modül sürüklenemez." };
      }

      if (
        module.status === MODULE_STATUS.RESERVE &&
        !this.isShelfUnlocked()
      ) {
        return { ok: false, reason: "Modül Rafı henüz kilitli." };
      }

      this.dragState = {
        moduleId,
        kind:
          module.status === MODULE_STATUS.ACTIVE
            ? DRAG_KIND.ACTIVE_MODULE
            : DRAG_KIND.SHELF_MODULE,
      };

      return { ok: true };
    }

    cancelDrag() {
      this.dragState = null;
    }

    dropOnCell(targetX, targetY, targetModuleId = null) {
      if (!this.dragState) {
        return { ok: false, reason: "Aktif sürükleme yok." };
      }

      const source = this.requireModule(this.dragState.moduleId);
      let command;

      if (targetModuleId && targetModuleId !== source.instanceId) {
        command = {
          kind: "replace_module",
          payload: {
            outgoing_module_id: targetModuleId,
            incoming_module_id: source.instanceId,
          },
        };
      } else if (source.status === MODULE_STATUS.RESERVE) {
        if (!this.isShelfUnlocked()) {
          return { ok: false, reason: "Modül Rafı henüz kilitli." };
        }

        command = {
          kind: "place_module",
          payload: {
            module_id: source.instanceId,
            x: targetX,
            y: targetY,
          },
        };
      } else {
        command = {
          kind: "move_module",
          payload: {
            module_id: source.instanceId,
            x: targetX,
            y: targetY,
          },
        };
      }

      this.emitCommand(command);
      this.dragState = null;
      return { ok: true, command };
    }

    dropOnShelf() {
      if (!this.dragState) {
        return { ok: false, reason: "Aktif sürükleme yok." };
      }

      const module = this.requireModule(this.dragState.moduleId);
      if (module.status !== MODULE_STATUS.ACTIVE) {
        this.dragState = null;
        return { ok: false, reason: "Yalnızca aktif modül rafa çekilebilir." };
      }

      const command = {
        kind: "remove_module",
        payload: {
          module_id: module.instanceId,
        },
      };

      this.emitCommand(command);
      this.dragState = null;
      return { ok: true, command };
    }

    applyServerModuleState(moduleState) {
      const module = this.requireModule(moduleState.instanceId);
      Object.assign(module, moduleState);
    }

    applyServerEconomyState({ circuitCredits }) {
      this.circuitCredits = Math.max(0, Math.floor(circuitCredits));
    }

    requireModule(moduleId) {
      const module = this.modules.get(moduleId);
      if (!module) {
        throw new Error(`Bilinmeyen modül: ${moduleId}`);
      }
      return module;
    }
  }

  const api = {
    RelayBattleClient,
    BattlePoolSelection,
    MODULE_STATUS,
    DRAG_KIND,
    maxActiveModulesForElapsedMs,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.RelayBattleClient = RelayBattleClient;
  global.BattlePoolSelection = BattlePoolSelection;
  global.RelayModuleStatus = MODULE_STATUS;
})(typeof globalThis !== "undefined" ? globalThis : window);
