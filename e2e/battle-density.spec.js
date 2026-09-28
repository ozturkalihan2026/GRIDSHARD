const { test, expect } = require("@playwright/test");
const { waitForParticipantReady, closeActiveBattle } = require("./ui-helpers");

test("10+10 aktif modül dikey savaş alanında üç masaüstü viewportunda taşmadan okunur", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));

  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForParticipantReady(page);
  await expect(page.locator("#home-battle-button")).toBeEnabled();
  await page.locator("#home-battle-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-online-status", "battle", {
    timeout: 40_000
  });

  for (const viewport of [
    { width: 1366, height: 630 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(200);
    const layout = await page.evaluate(() => {
      document.querySelectorAll(".density-fixture-card").forEach(card => card.remove());
      for (const boardId of ["board", "enemy-board"]) {
        const board = document.getElementById(boardId);
        const source = board?.querySelector(".module-card");
        if (!board || !source) throw new Error(`${boardId} için modül kartı bulunamadı`);
        const emptyCells = [...board.querySelectorAll(".board-cell")]
          .filter(cell => !cell.querySelector(".module-card"));
        let count = board.querySelectorAll(".module-card").length;
        for (const cell of emptyCells) {
          if (count >= 10) break;
          const clone = source.cloneNode(true);
          clone.classList.add("density-fixture-card");
          clone.dataset.moduleId = `${boardId}-density-${count}`;
          clone.removeAttribute("draggable");
          cell.appendChild(clone);
          count += 1;
        }
      }
      const tolerance = 1;
      const bodyFits =
        document.documentElement.scrollWidth <= window.innerWidth + tolerance &&
        document.documentElement.scrollHeight <= window.innerHeight + tolerance;
      const cards = [...document.querySelectorAll("#board .module-card, #enemy-board .module-card")];
      const cardsFitCells = cards.every(card => {
        const cell = card.closest(".board-cell");
        if (!cell) return false;
        const cardBox = card.getBoundingClientRect();
        const cellBox = cell.getBoundingClientRect();
        return cardBox.left >= cellBox.left - tolerance &&
          cardBox.top >= cellBox.top - tolerance &&
          cardBox.right <= cellBox.right + tolerance &&
          cardBox.bottom <= cellBox.bottom + tolerance;
      });
      const boardBoxes = ["board", "enemy-board"].map(id =>
        document.getElementById(id).getBoundingClientRect()
      );
      const boardsSeparated = boardBoxes[1].bottom <= boardBoxes[0].top + tolerance;
      return { bodyFits, cardsFitCells, boardsSeparated, cardCount: cards.length };
    });
    expect(layout).toEqual({
      bodyFits: true,
      cardsFitCells: true,
      boardsSeparated: true,
      cardCount: 20
    });
  }
  expect(errors).toEqual([]);
  await closeActiveBattle(page);
});
