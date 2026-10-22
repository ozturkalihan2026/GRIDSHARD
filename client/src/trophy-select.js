(function(global) {
  "use strict";
  // Keep the existing select/value as the form owner. Native <option> cannot
  // display the approved trophy image consistently across Android and Safari.
  class GridshardTrophySelect {
    constructor(select, {formatNumber = String, trophyLabel = () => "Kupa"} = {}) {
      this.select = select;
      this.formatNumber = formatNumber;
      this.trophyLabel = trophyLabel;
      const doc = select.ownerDocument;
      this.root = doc.createElement("div"); this.root.className = "team-trophy-select";
      this.button = doc.createElement("button"); this.button.type = "button";
      this.button.id = `${select.id}-button`;
      this.button.setAttribute("role", "combobox");
      this.button.setAttribute("aria-label", "Başvuru şartı");
      this.button.setAttribute("aria-haspopup", "listbox");
      this.button.setAttribute("aria-controls", `${select.id}-options`);
      this.button.setAttribute("aria-expanded", "false");
      this.list = doc.createElement("div"); this.list.id = `${select.id}-options`;
      this.list.className = "team-trophy-options"; this.list.hidden = true;
      this.list.setAttribute("role", "listbox"); this.list.setAttribute("aria-labelledby", this.button.id);
      this.root.append(this.button, this.list); select.after(this.root); select.hidden = true;
      this.button.addEventListener("click", () => this.list.hidden ? this.open() : this.close());
      this.root.addEventListener("keydown", event => this.key(event));
      select.addEventListener("change", () => this.update());
      doc.addEventListener("pointerdown", event => { if (!this.root.contains(event.target)) this.close(false); });
      this.root.addEventListener("focusout", event => { if (!this.root.contains(event.relatedTarget)) this.close(false); });
      this.update();
    }
    content(host, option) {
      const doc = this.select.ownerDocument;
      const label = doc.createElement("span");
      label.textContent = Number(option.value) > 0 ? this.formatNumber(Number(option.value)) : option.textContent;
      host.replaceChildren(label);
      if (Number(option.value) > 0) {
        const icon = doc.createElement("img"); icon.className = "trophy-value-icon";
        icon.src = "./assets/ui/rating-trophy-v1/rating-trophy.webp";
        icon.alt = this.trophyLabel(); icon.width = 24; icon.height = 24; icon.draggable = false;
        host.appendChild(icon);
      }
    }
    update() {
      const options = [...this.select.options];
      const signature = JSON.stringify(options.map(option => [option.value, option.textContent, option.disabled]));
      if (signature !== this.signature) {
        this.signature = signature;
        this.list.replaceChildren();
        for (const option of options) {
          const button = this.select.ownerDocument.createElement("button");
          button.type = "button"; button.className = "team-trophy-option";
          button.setAttribute("role", "option"); button.tabIndex = -1;
          button.dataset.value = option.value; button.disabled = option.disabled;
          this.content(button, option);
          button.addEventListener("click", () => {
            this.select.value = option.value;
            this.select.dispatchEvent(new Event("change", {bubbles:true}));
            this.close();
          });
          this.list.appendChild(button);
        }
      }
      const chosen = options.find(option => option.value === this.select.value) || options[0];
      if (chosen) this.content(this.button, chosen);
      this.button.disabled = this.select.disabled;
      for (const option of this.list.children) option.setAttribute("aria-selected", String(option.dataset.value === this.select.value));
    }
    open(last = false) {
      this.list.hidden = false; this.button.setAttribute("aria-expanded", "true");
      const options = [...this.list.children].filter(option => !option.disabled);
      const chosen = options.find(option => option.dataset.value === this.select.value);
      (last ? options.at(-1) : chosen || options[0])?.focus();
    }
    close(focus = true) {
      if (this.list.hidden) return;
      this.list.hidden = true; this.button.setAttribute("aria-expanded", "false");
      if (focus) this.button.focus();
    }
    key(event) {
      if (event.key === "Tab") { this.close(false); return; }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.close(); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      if (this.list.hidden) { this.open(event.key === "End"); return; }
      const options = [...this.list.children].filter(option => !option.disabled);
      const current = options.indexOf(this.select.ownerDocument.activeElement);
      const index = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[index]?.focus();
    }
  }
  global.GridshardTrophySelect = GridshardTrophySelect;
})(globalThis);
