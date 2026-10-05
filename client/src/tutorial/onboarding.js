(() => {
  "use strict";

  // İlk oyun deneyimi (Ekim 2026). Oyuna yeni giren oyuncu atlama seçeneği
  // olmadan, hareketli okla adım adım yönlendirilir: mağaza, kartlar, takım,
  // etkinlikler ve yönetmenli ilk savaş.
  //
  //  - GridshardGuideOverlay: hedefi karartmanın içinde açan, okla gösteren
  //    ve bilgi kartını yerleştiren katman. Katman bir <dialog> öğesidir;
  //    engelleyen adımlarda en üst katmanda (showModal) durur, bütün dokunuşu
  //    kendisi alır ve yalnız hedefe gelen dokunuşu hedefe iletir. Böylece
  //    oyuncu adım dışına çıkamaz; uygulamanın kendi pencerelerinin içindeki
  //    düğmeler de gösterilebilir.
  //  - GridshardOnboardingFlow: adımları sırayla yürüten akış. Adımın işi
  //    bağlamdan (`done`) izlenir; oyuncu işi yapınca akış kendiliğinden
  //    ilerler. İlerleme saklanır, uygulama yeniden açılınca kalınan adımdan
  //    sürer.

  const HOLE_PADDING = 6;
  const SCREEN_MARGIN = 8;
  const ARROW_SPACE = 44;
  const CARD_GAP = 8;

  function openModalDialogs(doc, except) {
    const dialogs = [...(doc?.querySelectorAll?.("dialog[open]") || [])];
    return dialogs.filter((dialog) => {
      if (dialog === except) return false;
      try {
        return dialog.matches(":modal");
      } catch (_) {
        return true;
      }
    });
  }

  class GridshardGuideOverlay {
    constructor({ document: doc = globalThis.document, window: win = globalThis } = {}) {
      this.document = doc;
      this.window = win;
      this.root = null;
      this.view = null;
      this.modal = false;
      this.stackedOver = new Set();
      this.emphasized = [];
      this.cardHeight = 0;
      this.layoutKey = "";
      this.scrolledKey = "";
    }

    build() {
      if (this.root || !this.document?.body) return Boolean(this.root);
      const doc = this.document;
      const root = doc.createElement("dialog");
      root.className = "guide-overlay";
      root.setAttribute("aria-labelledby", "guide-title");
      root.innerHTML = `
        <div class="guide-hole" hidden></div>
        <div class="guide-arrow" aria-hidden="true" hidden>
          <svg viewBox="0 0 40 44" focusable="false"><path d="M20 42 4 20h10V2h12v18h10Z"/></svg>
        </div>
        <section class="guide-card">
          <div class="guide-progress" aria-hidden="true"><i></i></div>
          <h2 id="guide-title" class="guide-title"></h2>
          <div class="guide-body" aria-live="polite"></div>
          <div class="guide-actions">
            <span class="guide-hint" aria-hidden="true"></span>
            <button type="button" class="guide-next"></button>
          </div>
        </section>`;
      this.root = root;
      this.hole = root.querySelector(".guide-hole");
      this.arrow = root.querySelector(".guide-arrow");
      this.card = root.querySelector(".guide-card");
      this.progress = root.querySelector(".guide-progress > i");
      this.title = root.querySelector(".guide-title");
      this.body = root.querySelector(".guide-body");
      this.hint = root.querySelector(".guide-hint");
      this.next = root.querySelector(".guide-next");
      // Geri tuşu / Esc eğitimi kapatmaz.
      root.addEventListener("cancel", (event) => event.preventDefault());
      root.addEventListener("click", (event) => this.handleClick(event));
      doc.body.appendChild(root);
      return true;
    }

    get visible() {
      return Boolean(this.root?.open);
    }

    handleClick(event) {
      const view = this.view;
      if (!view) return;
      const element = event.target;
      if (element?.closest?.(".guide-next")) {
        if (view.mode === "next") view.onNext?.();
        return;
      }
      if (view.mode === "tap" && this.insideHole(event.clientX, event.clientY)) {
        if (typeof view.onTargetTap === "function") view.onTargetTap();
        else if (view.target && !view.target.disabled) view.target.click();
        // Dokunuş ekranı değiştirdiyse akış bir sonraki adımı hemen göstersin.
        this.afterTap?.();
        return;
      }
      if (element?.closest?.(".guide-card")) return;
      this.nudge();
    }

    insideHole(x, y) {
      const rect = this.holeRect;
      return Boolean(rect)
        && x >= rect.left && x <= rect.left + rect.width
        && y >= rect.top && y <= rect.top + rect.height;
    }

    // Yanlış yere dokunuldu: ok ve hedef kısa bir an parlar.
    nudge() {
      const root = this.root;
      if (!root) return;
      root.classList.remove("is-nudged");
      this.window.requestAnimationFrame?.(() => root.classList.add("is-nudged"));
      this.window.clearTimeout?.(this.nudgeTimer);
      this.nudgeTimer = this.window.setTimeout?.(() => root.classList.remove("is-nudged"), 520);
    }

    render(view) {
      if (!this.build()) return;
      const changed = !this.view || this.view.key !== view.key || this.view.mode !== view.mode;
      this.view = view;
      const root = this.root;
      const blocking = view.blocking !== false;
      root.dataset.mode = view.mode;
      root.dataset.tone = view.tone || "menu";
      root.dataset.shade = view.shade || (view.mode === "wait" ? "none" : "full");
      root.dataset.blocking = String(blocking);
      root.dataset.place = view.place || "auto";
      if (changed) {
        this.title.textContent = view.title || "";
        const lines = Array.isArray(view.body) ? view.body : [view.body];
        this.body.replaceChildren(...lines.filter(Boolean).map((line) => {
          const paragraph = this.document.createElement("p");
          paragraph.textContent = line;
          return paragraph;
        }));
        this.next.hidden = view.mode !== "next";
        this.next.textContent = view.nextLabel || "İLERİ";
        this.hint.textContent = view.mode === "tap" ? (view.hint || "Gösterilen yere dokun") : "";
        this.hint.hidden = view.mode !== "tap";
        this.progress.style.width = `${Math.round(Math.max(0, Math.min(1, Number(view.progress) || 0)) * 100)}%`;
        this.setEmphasis(view.emphasize || []);
        this.layoutKey = "";
        this.cardHeight = 0;
      }
      this.stack(blocking);
      if (changed) this.scrollTargetIntoView(view);
      this.sync();
      this.track();
    }

    // Menülerde hedef kayabilir (liste yüklenir, panel kayar); katman kare
    // kare izler. Savaşta yalnız akışın çağrılarıyla (saniyede birkaç kez)
    // yenilenir; her karede yerleşim ölçülmez.
    track() {
      const win = this.window;
      if (this.tracking || typeof win.requestAnimationFrame !== "function") return;
      const tick = () => {
        this.tracking = false;
        if (!this.root?.open || !this.view || this.view.tone === "battle") return;
        this.sync();
        this.tracking = true;
        win.requestAnimationFrame(tick);
      };
      this.tracking = true;
      win.requestAnimationFrame(tick);
    }

    setEmphasis(elements) {
      for (const element of this.emphasized) element.removeAttribute?.("data-guide-emphasis");
      this.emphasized = elements.filter(Boolean);
      for (const element of this.emphasized) element.setAttribute("data-guide-emphasis", "true");
    }

    // Engelleyen adımda katman en üstte durur. Sonradan açılan uygulama
    // penceresi (ör. sandık) üstüne çıkmışsa katman yeniden öne alınır.
    stack(blocking) {
      const root = this.root;
      if (!blocking) {
        if (root.open && this.modal) root.close();
        if (!root.open) root.show?.();
        this.modal = false;
        return;
      }
      const others = openModalDialogs(this.document, root);
      // Kapanan pencere yeniden açılırsa yine öne geçer; izi tutulmaz.
      for (const dialog of [...this.stackedOver]) {
        if (!others.includes(dialog)) this.stackedOver.delete(dialog);
      }
      const stale = !root.open || !this.modal || others.some((dialog) => !this.stackedOver.has(dialog));
      if (!stale) return;
      if (root.open) root.close();
      if (typeof root.showModal === "function") root.showModal();
      else root.setAttribute("open", "");
      this.modal = true;
      this.stackedOver = new Set(others);
    }

    scrollTargetIntoView(view) {
      const target = view.target;
      if (!target?.getBoundingClientRect || view.tone === "battle") return;
      const rect = target.getBoundingClientRect();
      const height = Number(this.window.innerHeight) || 0;
      if (!height || (rect.top >= 96 && rect.bottom <= height - 96)) return;
      target.scrollIntoView?.({ block: "center", inline: "nearest" });
    }

    // Hedefin yerini ölçer ve deliği, oku, kartı yerleştirir. Ölçümler önce
    // okunur, sonra yazılır; değişmeyen yerleşim yeniden yazılmaz.
    sync() {
      const view = this.view;
      if (!view || !this.root?.open) return;
      const win = this.window;
      const width = Number(win.innerWidth) || 0;
      const height = Number(win.innerHeight) || 0;
      let rect = null;
      const target = view.target;
      if (target?.isConnected !== false && target?.getBoundingClientRect) {
        const box = target.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) rect = box;
      }
      if (!this.cardHeight) this.cardHeight = this.card.offsetHeight || 0;
      const cardHeight = this.cardHeight;

      let hole = null;
      if (rect) {
        const left = Math.max(2, rect.left - HOLE_PADDING);
        const top = Math.max(2, rect.top - HOLE_PADDING);
        hole = {
          left,
          top,
          width: Math.min(width - 2, rect.right + HOLE_PADDING) - left,
          height: Math.min(height - 2, rect.bottom + HOLE_PADDING) - top,
        };
      }
      this.holeRect = hole;

      const overlaps = (top, bottom, otherTop, otherBottom) => top < otherBottom && bottom > otherTop;
      const holeBottom = hole ? hole.top + hole.height : 0;
      let cardTop = null;
      // Savaşta kart üstte sabit durur; tahtalar görünür kalır.
      if (view.place === "top") {
        cardTop = SCREEN_MARGIN;
        if (hole && overlaps(cardTop, cardTop + cardHeight + CARD_GAP, hole.top, holeBottom)) cardTop = null;
      }
      if (cardTop === null) {
        if (!hole) {
          cardTop = Math.round(height * 0.36 - cardHeight / 2);
        } else {
          const below = height - holeBottom;
          const above = hole.top;
          const need = cardHeight + ARROW_SPACE + CARD_GAP;
          const preferAbove = hole.top + hole.height / 2 > height / 2;
          const side = (preferAbove ? above >= need : below < need && above >= need) ? "above"
            : below >= need ? "below"
            : above > below ? "above" : "below";
          cardTop = side === "below"
            ? holeBottom + ARROW_SPACE
            : hole.top - ARROW_SPACE - cardHeight;
        }
      }
      cardTop = Math.max(SCREEN_MARGIN, Math.min(height - cardHeight - SCREEN_MARGIN, cardTop));
      // Ok hedefin boş kalan yanında durur; karta ya da ekran dışına taşacaksa gösterilmez.
      let arrowSide = "";
      if (hole && view.mode !== "wait") {
        const cardBottom = cardTop + cardHeight;
        if (hole.top >= ARROW_SPACE && !overlaps(hole.top - ARROW_SPACE, hole.top, cardTop, cardBottom)) {
          arrowSide = "above";
        } else if (
          holeBottom + ARROW_SPACE <= height
          && !overlaps(holeBottom, holeBottom + ARROW_SPACE, cardTop, cardBottom)
        ) {
          arrowSide = "below";
        }
      }

      const key = [
        hole ? `${Math.round(hole.left)},${Math.round(hole.top)},${Math.round(hole.width)},${Math.round(hole.height)}` : "-",
        Math.round(cardTop), arrowSide, width, height,
      ].join("|");
      if (key === this.layoutKey) return;
      this.layoutKey = key;

      this.root.dataset.target = String(Boolean(hole));
      this.hole.hidden = !hole;
      if (hole) {
        this.hole.style.left = `${hole.left}px`;
        this.hole.style.top = `${hole.top}px`;
        this.hole.style.width = `${hole.width}px`;
        this.hole.style.height = `${hole.height}px`;
      }
      this.card.style.top = `${Math.round(cardTop)}px`;
      this.arrow.hidden = !arrowSide;
      if (arrowSide && hole) {
        const centre = Math.max(28, Math.min(width - 28, hole.left + hole.width / 2));
        this.arrow.dataset.side = arrowSide;
        this.arrow.style.left = `${Math.round(centre)}px`;
        this.arrow.style.top = `${Math.round(arrowSide === "below" ? hole.top + hole.height + 2 : hole.top - ARROW_SPACE + 2)}px`;
      }
    }

    hide() {
      this.setEmphasis([]);
      this.view = null;
      this.layoutKey = "";
      const root = this.root;
      if (!root) return;
      if (root.open) root.close();
      this.modal = false;
      this.stackedOver = new Set();
    }
  }

  class GridshardOnboardingFlow {
    constructor({
      steps,
      overlay,
      storage = globalThis.localStorage,
      completeKey,
      progressKey,
      now = () => Date.now(),
      stuckAfterMs = 9000,
      onFinish = null,
    }) {
      this.steps = steps;
      this.overlay = overlay;
      this.storage = storage;
      this.completeKey = completeKey;
      this.progressKey = progressKey;
      this.now = now;
      this.stuckAfterMs = stuckAfterMs;
      this.onFinish = onFinish;
      this.active = false;
      this.index = 0;
      this.entered = false;
      this.stepStart = null;
      this.context = {};
      this.stuckSince = null;
    }

    read(key) {
      try { return this.storage?.getItem(key) ?? null; } catch (_) { return null; }
    }

    write(key, value) {
      try {
        if (value === null) this.storage?.removeItem(key);
        else this.storage?.setItem(key, value);
      } catch (_) {}
    }

    isCompleted() {
      return this.read(this.completeKey) === "complete";
    }

    // Ayarlar'dan yeniden gösterme: tamamlandı izi ve ilerleme silinir.
    reset() {
      this.write(this.completeKey, null);
      this.write(this.progressKey, null);
      this.stop();
    }

    start({ force = false } = {}) {
      if (this.active) return true;
      if (!force && this.isCompleted()) return false;
      const saved = this.read(this.progressKey);
      const index = this.steps.findIndex((step) => step.id === saved);
      this.index = index >= 0 ? index : 0;
      this.active = true;
      this.entered = false;
      this.stuckSince = null;
      return true;
    }

    stop() {
      this.active = false;
      this.entered = false;
      this.overlay?.hide();
    }

    finish() {
      this.stop();
      this.write(this.completeKey, "complete");
      this.write(this.progressKey, null);
      this.onFinish?.();
      return true;
    }

    currentStep() {
      return this.active ? this.steps[this.index] || null : null;
    }

    advance() {
      const step = this.currentStep();
      step?.onLeave?.(this.context);
      this.index += 1;
      this.entered = false;
      this.stuckSince = null;
      const next = this.steps[this.index];
      if (next) this.write(this.progressKey, next.id);
    }

    // "İLERİ" düğmesi.
    next() {
      const step = this.currentStep();
      if (!step) return;
      step.onNext?.(this.context);
      this.advance();
      this.update(this.context);
    }

    update(context = {}) {
      if (!this.active) return;
      this.context = context;
      let step = null;
      // Tamamlanmış ya da gerekmeyen adımlar görünmeden geçilir.
      for (let guard = 0; guard <= this.steps.length; guard += 1) {
        step = this.currentStep();
        if (!step) {
          this.finish();
          return;
        }
        if (!this.entered) {
          this.entered = true;
          this.stepStart = { ...context };
          step.onEnter?.(context);
        }
        if (step.skip?.(context, this.stepStart) || step.done?.(context, this.stepStart)) {
          this.advance();
          continue;
        }
        break;
      }
      const view = (step.when ? step.when(context) : true) ? this.present(step, context) : null;
      if (!view) {
        this.stuckSince = null;
        this.overlay?.hide();
        return;
      }
      // Uygulamanın başka bir penceresi açıksa (ör. günlük meta) eğitim kenara çekilir.
      const modals = context.modals || [];
      if (
        modals.length
        && !view.overDialogs
        && !(view.target && modals.some((modal) => modal.contains(view.target)))
      ) {
        this.stuckSince = null;
        this.overlay?.hide();
        return;
      }
      const guarded = this.guardStuck(view);
      if (guarded) this.overlay?.render(guarded);
      else this.overlay?.hide();
    }

    // Takılma sigortası: gösterilecek hedef uzun süre bulunamazsa ya da
    // dokunulamazsa oyuncu kilitlenmez. Adım "İLERİ" ile geçilebilir olur;
    // geçilmesi anlamsız adımda (`stuck:"release"`) katman kalkar ve oyuncu
    // ekranı serbestçe kullanır.
    guardStuck(view) {
      const waiting = view.mode === "tap" && (!view.target || view.target.disabled);
      if (!waiting) {
        this.stuckSince = null;
        return view;
      }
      const now = this.now();
      if (this.stuckSince === null) this.stuckSince = now;
      if (now - this.stuckSince < this.stuckAfterMs) return view;
      if (view.stuck === "release") return null;
      return { ...view, mode: "next", key: `${view.key}:stuck`, onNext: () => this.next() };
    }

    // Adımların ağırlığı farklı olabilir (ör. bütün savaş tek adımdır).
    progressFor(part) {
      let total = 0;
      let before = 0;
      this.steps.forEach((step, index) => {
        const weight = Number(step.weight) || 1;
        total += weight;
        if (index < this.index) before += weight;
      });
      const current = Number(this.steps[this.index]?.weight) || 1;
      return (before + part * current) / Math.max(1, total);
    }

    present(step, context) {
      const custom = typeof step.present === "function" ? step.present(context, this.stepStart) : null;
      if (typeof step.present === "function" && !custom) return null;
      const source = custom || step;
      const resolve = (value) => (typeof value === "function" ? value(context, this.stepStart) : value);
      let target = resolve(source.target);
      if (typeof target === "string") target = globalThis.document?.querySelector(target) || null;
      const emphasize = (resolve(source.emphasize) || []).map((item) => (
        typeof item === "string" ? globalThis.document?.querySelector(item) : item
      )).filter(Boolean);
      const part = Math.max(0, Math.min(1, Number(resolve(source.part)) || 0));
      return {
        key: `${step.id}:${resolve(source.key) || ""}`,
        target: target || null,
        emphasize,
        mode: resolve(source.mode) || (typeof step.done === "function" ? "tap" : "next"),
        title: resolve(source.title) || "",
        body: resolve(source.body) || "",
        hint: resolve(source.hint) || "",
        nextLabel: resolve(source.nextLabel) || "",
        tone: resolve(source.tone) || "menu",
        shade: resolve(source.shade) || "",
        blocking: resolve(source.blocking) !== false,
        place: resolve(source.place) || "",
        stuck: resolve(source.stuck) || "next",
        overDialogs: Boolean(resolve(source.overDialogs)),
        progress: this.progressFor(part),
        onNext: typeof source.onNext === "function" && custom
          ? () => source.onNext(context)
          : () => this.next(),
        onTargetTap: typeof source.onTargetTap === "function" ? () => source.onTargetTap(context) : null,
      };
    }
  }

  globalThis.GridshardGuideOverlay = GridshardGuideOverlay;
  globalThis.GridshardOnboardingFlow = GridshardOnboardingFlow;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { GridshardGuideOverlay, GridshardOnboardingFlow };
  }
})();
