(() => {
  "use strict";

  // Shared by core/module dialogs; vertical scrolling and action buttons
  // remain native. One completed horizontal gesture advances one card, and
  // it may start anywhere on the card, including on a button or a tab.
  function bindCardSwipe(dialog, navigate) {
    if (!dialog) return;
    // Only text entry keeps its own horizontal gestures (caret, selection).
    const textEntry = "input,select,textarea,[contenteditable],[role='slider']";
    let gesture = null;
    let suppressClickUntil = 0;
    let pressedOutside = false;
    const reset = () => { gesture = null; };
    // A modal dialog receives backdrop taps itself; they land outside its box.
    const outsideCard = (event) => {
      if (event.target !== dialog) return false;
      const box = dialog.getBoundingClientRect();
      return event.clientX < box.left || event.clientX > box.right
        || event.clientY < box.top || event.clientY > box.bottom;
    };
    dialog.addEventListener("pointerdown", (event) => {
      pressedOutside = outsideCard(event);
      if (!event.isPrimary) { reset(); return; }
      if (event.button !== 0 || pressedOutside || event.target.closest(textEntry)) return;
      gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, horizontal:false};
    });
    dialog.addEventListener("pointermove", (event) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = Math.abs(event.clientX - gesture.x);
      const dy = Math.abs(event.clientY - gesture.y);
      if (!gesture.horizontal && dy > 12 && dy >= dx) { reset(); return; }
      if (!gesture.horizontal && dx > 12 && dx > dy * 1.25) {
        gesture.horizontal = true;
        // Capture only now: a tap on a button must still reach the button.
        try { dialog.setPointerCapture?.(event.pointerId); } catch (_) {}
      }
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
        return;
      }
      // Tapping the blurred card area around the dialog closes it.
      if (pressedOutside && outsideCard(event)) dialog.close();
      pressedOutside = false;
    }, true);
    for (const type of ["pointercancel", "close"]) {
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
