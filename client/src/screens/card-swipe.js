(() => {
  "use strict";

  // Shared by core/module dialogs; vertical scrolling and action buttons
  // remain native. One completed horizontal gesture advances one card.
  function bindCardSwipe(dialog, navigate) {
    if (!dialog) return;
    const controls = "button,input,select,textarea,a,[contenteditable],[role='slider']";
    let gesture = null;
    let suppressClickUntil = 0;
    const reset = () => { gesture = null; };
    dialog.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary) { reset(); return; }
      if (event.button !== 0 || event.target.closest(controls)) return;
      gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, horizontal:false};
      dialog.setPointerCapture?.(event.pointerId);
    });
    dialog.addEventListener("pointermove", (event) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = Math.abs(event.clientX - gesture.x);
      const dy = Math.abs(event.clientY - gesture.y);
      if (!gesture.horizontal && dy > 12 && dy >= dx) { reset(); return; }
      if (dx > 12 && dx > dy * 1.25) gesture.horizontal = true;
      if (gesture.horizontal) event.preventDefault();
    });
    dialog.addEventListener("pointerup", (event) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      const advance = Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.25;
      reset();
      if (advance) {
        suppressClickUntil = Date.now() + 350;
        navigate(dx < 0 ? 1 : -1);
      }
    });
    dialog.addEventListener("click", (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
    for (const type of ["pointercancel", "lostpointercapture", "close"]) {
      dialog.addEventListener(type, reset);
    }
    dialog.addEventListener("keydown", (event) => {
      if (!dialog.open || event.altKey || event.ctrlKey || event.metaKey
          || event.target.closest("input,textarea,select,[contenteditable]")) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      navigate(event.key === "ArrowRight" ? 1 : -1);
    });
  }
  globalThis.GridshardCardSwipe = {bind:bindCardSwipe};
})();
