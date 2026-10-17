(function (global) {
  "use strict";

  // Persistent battle DOM only. Game state, localization and artwork stay in
  // their owners; this view never computes combat or restarts transient FX.
  class GridshardBattleCardStateView {
    constructor({ document, mountIcon, onTooltip = () => {} }) {
      this.document = document;
      this.mountIcon = mountIcon;
      this.onTooltip = onTooltip;
      this.views = new WeakMap();
    }
    create(model) {
      const card = this.element("div", "module-card");
      const icon = this.element("span", "module-icon");
      const name = this.element("span", "name");
      const overlay = this.element("span", "module-fx-overlay");
      overlay.setAttribute("aria-hidden", "true");
      card.append(icon, name, overlay);
      this.views.set(card, { icon, name, rows:new Map(), heat:null, tooltip:null, artwork:null });
      this.update(card, model);
      return card;
    }
    element(tag, className) {
      const element = this.document.createElement(tag);
      element.className = className;
      return element;
    }
    text(element, value) {
      const text = String(value ?? "");
      if (element.textContent === text) return;
      if (element.childNodes?.length === 1 && element.firstChild.nodeType === 3) {
        element.firstChild.nodeValue = text;
      } else element.textContent = text;
    }
    attribute(element, name, value) {
      if (value === null || value === undefined) {
        if (element.hasAttribute(name)) element.removeAttribute(name);
      } else if (element.getAttribute(name) !== String(value)) element.setAttribute(name, String(value));
    }
    data(element, name, value) {
      if (element.dataset[name] !== String(value)) element.dataset[name] = String(value);
    }
    style(element, name, value) {
      if (element.style.getPropertyValue(name) !== String(value)) element.style.setProperty(name, String(value));
    }
    toggle(element, name, on) {
      if (element.classList.contains(name) !== Boolean(on)) element.classList.toggle(name, Boolean(on));
    }
    hidden(element, hidden) {
      if (element.hidden !== hidden) element.hidden = hidden;
    }
    updateRow(card, view, rowName, badges) {
      let row = view.rows.get(rowName);
      if (!row && !badges.length) return;
      if (!row) {
        row = { element:this.element("span", rowName), badges:new Map() };
        view.rows.set(rowName, row);
        card.appendChild(row.element);
      }
      const wanted = new Set(badges.map(badge => badge.key));
      for (const [key, element] of row.badges) {
        if (wanted.has(key)) continue;
        element.remove(); row.badges.delete(key);
      }
      badges.forEach((badge, index) => {
        let element = row.badges.get(badge.key);
        if (!element) {
          element = this.element("span", badge.className);
          row.badges.set(badge.key, element);
        }
        if (element.className !== badge.className) element.className = badge.className;
        this.text(element, badge.label);
        this.attribute(element, "title", badge.title);
        this.attribute(element, "data-badge", badge.kind);
        this.attribute(element, "data-phase", badge.phase);
        if (row.element.children[index] !== element) row.element.insertBefore(element, row.element.children[index] || null);
      });
      this.hidden(row.element, !badges.length);
    }
    update(card, model) {
      const view = this.views.get(card);
      if (!view) throw new Error("Battle card must be created by its state view");
      this.data(card, "moduleId", model.id);
      this.data(card, "category", model.category || "");
      this.toggle(card, "enemy-module-card", model.enemy);
      this.toggle(card, "fixed-module", model.core && !model.enemy);
      this.toggle(card, "battle-module-card", true);
      this.toggle(card, "physical-module-card", Boolean(model.physical));
      this.toggle(card, "core-power-target", model.targeting);
      this.toggle(card, "core-charge-card", model.core && !model.enemy);
      this.toggle(card, "core-power-ready", model.core && !model.enemy && model.coreReady);
      this.attribute(card, "role", model.targeting ? "button" : null);
      this.attribute(card, "tabindex", model.targeting ? "0" : null);
      if (view.artwork !== model.artwork) {
        this.mountIcon(view.icon, model, card);
        view.artwork = model.artwork;
      }
      this.attribute(view.icon, "aria-label", model.name);
      this.text(view.name, model.shortName);
      this.attribute(view.name, "data-long", model.shortName.length >= 11 ? "true" : null);
      const ratio = Math.max(0, Math.min(1, Number(model.hp || 0) / Math.max(1, Number(model.maxHp || 1))));
      this.style(card, "--hp-ratio", ratio);
      this.style(card, "--hp-percent", `${Math.round(ratio * 100)}%`);
      this.style(card, "--battle-hp-color", ratio <= .33 ? "#ff5f6d" : ratio <= .66 ? "#f0cb52" : "#60e58a");
      this.data(card, "hpState", ratio <= 0 ? "destroyed" : ratio <= .33 ? "critical" : ratio <= .66 ? "warning" : "healthy");
      if (model.core && !model.enemy) this.style(card, "--core-charge", `${model.coreCharge}%`);
      this.data(card, "powerState", model.powerState);
      this.toggle(card, "energy-disconnected", Boolean(model.powerMessage));
      this.attribute(card, "title", model.powerMessage ? `${model.title} · ${model.powerMessage}` : model.title);
      this.attribute(card, "aria-label", model.coreLabel || model.powerMessage || null);
      if (model.powerMessage && !view.tooltip) {
        view.tooltip = this.element("span", "power-state-tooltip");
        view.tooltip.setAttribute("role", "tooltip");
        card.appendChild(view.tooltip);
        // One listener per card; never capture an old module snapshot.
        const place = () => { if (!view.tooltip.hidden) this.onTooltip(card, view.tooltip); };
        card.addEventListener("pointerenter", place);
        card.addEventListener("focusin", place);
      }
      if (view.tooltip) {
        this.hidden(view.tooltip, !model.powerMessage);
        this.text(view.tooltip, model.powerMessage || "");
      }
      const heatVisible = !model.core && (model.physical || model.heat > 0 || model.overheated);
      this.toggle(card, "has-heat-bar", heatVisible);
      if (heatVisible && !view.heat) {
        view.heat = this.element("span", "module-heat-bar");
        view.heat.setAttribute("role", "img");
        const fill = this.document.createElement("i"); fill.setAttribute("aria-hidden", "true");
        view.heat.appendChild(fill); card.appendChild(view.heat);
      }
      if (view.heat) {
        this.hidden(view.heat, !heatVisible);
        this.data(view.heat, "heatState", model.heatState);
        this.style(view.heat, "--heat-percent", `${model.overheated ? 100 : Math.round(model.heat)}%`);
        this.attribute(view.heat, "aria-label", model.heatLabel);
      }
      this.updateRow(card, view, "module-live-status-row", model.liveBadges || []);
      this.updateRow(card, view, "module-signature-row", model.signatureBadges || []);
    }
  }
  global.GridshardBattleCardStateView = GridshardBattleCardStateView;
  if (typeof module !== "undefined" && module.exports) module.exports = { GridshardBattleCardStateView };
})(globalThis);
