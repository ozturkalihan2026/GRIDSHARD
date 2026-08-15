(function (global) {
  "use strict";

  const MODULE_STATUS = Object.freeze({
    RESERVE: "reserve",
    ACTIVE: "active",
    DESTROYED: "destroyed",
  });

  const DRAG_KIND = Object.freeze({
    SHELF_MODULE: "shelf-module",
    ACTIVE_MODULE: "active-module",
  });

  class RelayBattleClient {
    constructor({ modules, unlockAtMs = 15000, emitCommand }) {
      this.unlockAtMs = unlockAtMs;
      this.emitCommand = emitCommand;
      this.elapsedMs = 0;
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
    MODULE_STATUS,
    DRAG_KIND,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.RelayBattleClient = RelayBattleClient;
  global.RelayModuleStatus = MODULE_STATUS;
})(typeof globalThis !== "undefined" ? globalThis : window);
