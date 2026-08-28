const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { Builder, By, until } = require("selenium-webdriver");

const targets = {
  "android-chrome": {
    browserName: "chrome",
    deviceName: "Samsung Galaxy S23 Ultra",
    osVersion: "13.0"
  },
  "iphone-safari": {
    browserName: "safari",
    deviceName: "iPhone 16",
    osVersion: "18"
  }
};

const targetName = process.env.REAL_DEVICE_TARGET;
const target = targets[targetName];
const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const localIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER;
const baseURL = process.env.GRIDSHARD_REAL_DEVICE_URL || "http://localhost:8879";

if (!target) throw new Error(`REAL_DEVICE_TARGET geçersiz: ${targetName || "boş"}`);
if (!username || !accessKey) throw new Error("BrowserStack kullanıcı adı ve erişim anahtarı zorunludur.");
if (!localIdentifier) throw new Error("BROWSERSTACK_LOCAL_IDENTIFIER zorunludur.");

const options = {
  userName: username,
  accessKey,
  deviceName: target.deviceName,
  osVersion: target.osVersion,
  realMobile: "true",
  deviceOrientation: "portrait",
  local: "true",
  localIdentifier,
  projectName: "GRIDSHARD",
  buildName: process.env.BROWSERSTACK_BUILD_NAME || process.env.GITHUB_SHA || "local-real-device",
  sessionName: `GRIDSHARD ${targetName} gerçek cihaz E2E`,
  debug: true,
  networkLogs: true,
  video: true
};

const capabilities = {
  browserName: target.browserName,
  "bstack:options": options
};

function evidencePath() {
  return path.join(process.cwd(), "qa_reports", "device_evidence", `${targetName}.json`);
}

function writeEvidence({ passed, sessionId, error = null }) {
  const output = evidencePath();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify({
    schema_version: 1,
    target: targetName,
    device_kind: "real",
    device_name: target.deviceName,
    os_version: target.osVersion,
    browser_name: target.browserName,
    commit_sha: process.env.GITHUB_SHA || null,
    run_id: process.env.GITHUB_RUN_ID || null,
    browserstack_session_id: sessionId || null,
    passed,
    error,
    recorded_at: new Date().toISOString()
  }, null, 2)}\n`, "utf8");
}

async function waitFor(driver, predicate, timeout = 20_000) {
  await driver.wait(async () => Boolean(await driver.executeScript(predicate)), timeout);
}

(async () => {
  let driver;
  let sessionId = null;
  try {
    driver = await new Builder()
      .usingServer(`https://${encodeURIComponent(username)}:${encodeURIComponent(accessKey)}@hub-cloud.browserstack.com/wd/hub`)
      .withCapabilities(capabilities)
      .build();
    sessionId = (await driver.getSession()).getId();

    await driver.get(`${baseURL}/?e2e=1`);
    await driver.executeScript("localStorage.setItem('gridshard.tutorial.v1', 'complete')");
    await driver.navigate().refresh();
    await waitFor(
      driver,
      "return document.querySelector('#participant-bootstrap-status')?.dataset.status === 'ready'",
      30_000);
    const playButton = await driver.wait(until.elementLocated(By.css(".menu-action-play")), 20_000);
    await playButton.click();
    await driver.wait(until.elementsLocated(By.css("#battle-pool-selection .pool-choice")), 20_000);

    await driver.findElement(By.css("#battle-pool-preset-open")).click();
    await driver.wait(until.elementLocated(By.css('.preset-card[data-preset-name="Başlangıç Devresi"] button')), 20_000).click();
    await waitFor(
      driver,
      "return /18\\s*\\/\\s*18/.test(document.querySelector('#battle-pool-count')?.textContent || '')"
    );
    await driver.findElement(By.css("#battle-pool-preset-close")).click();
    await driver.findElement(By.css("#battle-pool-confirm")).click();

    await waitFor(
      driver,
      "return document.body.dataset.onlineStatus === 'battle'",
      40_000);
    await waitFor(driver, "return document.body.dataset.opponentType === 'ai'");
    const layout = await driver.executeScript(`
      const board = document.querySelector('#board').getBoundingClientRect();
      return {
        innerHeight: window.innerHeight,
        scrollHeight: document.body.scrollHeight,
        scrollTop: window.scrollY,
        boardBottom: board.bottom
      };
    `);
    assert.ok(layout.scrollHeight <= layout.innerHeight + 1, `Dikey taşma: ${JSON.stringify(layout)}`);
    assert.equal(layout.scrollTop, 0);
    assert.ok(layout.boardBottom <= layout.innerHeight + 1, `Tahta ekran dışında: ${JSON.stringify(layout)}`);

    await driver.findElement(By.css("[data-mobile-battle-panel=shelf]")).click();
    await waitFor(driver, `
      const card = document.querySelector('#module-shelf .module-card');
      const capacity = document.querySelector('#capacity-indicator')?.textContent || '';
      return card && !card.classList.contains('locked') && capacity.includes('Sınır 5/10');
    `, 35_000);
    const before = (await driver.findElements(By.css("#module-shelf .module-card"))).length;
    await driver.findElement(By.css("#module-shelf .module-card")).click();
    await waitFor(driver, "return document.body.dataset.mobileBattlePanel === 'player'");
    await driver.findElement(By.css('#board .tap-drop-target[data-x="2"][data-y="4"][data-occupied=false]')).click();
    await driver.wait(async () =>
      (await driver.findElements(By.css("#module-shelf .module-card"))).length === before - 1,
    15_000);

    await driver.findElement(By.css("#battle-forfeit-button")).click();
    await driver.wait(until.elementIsVisible(
      await driver.findElement(By.css(".post-match-panel"))),
    15_000);

    await driver.executeScript(`browserstack_executor: ${JSON.stringify({
      action: "setSessionStatus",
      arguments: { status: "passed", reason: "Mobil savaş ve dokunmatik seç-yerleştir akışı geçti." }
    })}`);
    writeEvidence({ passed: true, sessionId });
  } catch (error) {
    writeEvidence({ passed: false, sessionId, error: String(error?.stack || error) });
    if (driver) {
      await driver.executeScript(`browserstack_executor: ${JSON.stringify({
        action: "setSessionStatus",
        arguments: { status: "failed", reason: String(error?.message || error).slice(0, 250) }
      })}`).catch(() => {});
    }
    throw error;
  } finally {
    if (driver) await driver.quit().catch(() => {});
  }
})();
