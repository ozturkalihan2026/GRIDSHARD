(function (global) {
  "use strict";
  const auth = global.GridshardAuth?.session;
  const dialog = document.getElementById("review-access-dialog");
  if (!auth || !dialog) return;
  const status = document.getElementById("review-access-status");
  const password = document.getElementById("review-access-password");
  const submit = document.getElementById("review-access-submit");
  const restore = document.getElementById("review-access-restore");
  for (const button of document.querySelectorAll("[data-review-access-open]")) {
    button.addEventListener("click", () => {
      status.textContent = "Use the private credentials supplied by the developer. Google Play Games is not required.";
      restore.hidden = !auth.isReviewProfile();
      if (!dialog.open) dialog.showModal();
    });
  }
  document.getElementById("review-access-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { password.value = ""; });
  document.getElementById("review-access-form").addEventListener("submit", async(event) => {
    event.preventDefault();
    submit.disabled = restore.disabled = true;
    status.textContent = "Signing in securely…";
    try {
      await auth.completeReviewLogin(document.getElementById("review-access-username").value.trim(), password.value);
      password.value = "";
      global.location.reload();
    } catch (error) { status.textContent = error.message; }
    finally { password.value = ""; submit.disabled = restore.disabled = false; }
  });
  restore.addEventListener("click", async() => {
    submit.disabled = restore.disabled = true;
    status.textContent = "Verifying the previous profile…";
    try { await auth.returnFromReview(); global.location.reload(); }
    catch (error) { status.textContent = error.message; }
    finally { submit.disabled = restore.disabled = false; }
  });
})(globalThis);
