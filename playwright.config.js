const { defineConfig, devices } = require("@playwright/test");

const baseURL = process.env.GRIDSHARD_E2E_BASE_URL || "http://127.0.0.1:8879";
const bundledPython = process.env.GRIDSHARD_PYTHON || "python";
const localChrome = process.env.CI ? {} : { channel: "chrome" };

module.exports = defineConfig({
  testDir: "./e2e",
  globalTeardown: require.resolve("./tools/playwright-global-teardown.js"),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
    // Aynı yerel IP'den çalışan E2E projeleri seri ilerler. HTTP rate-limit'in
    // kendisi sunucu testlerinde doğrulanır; tarayıcı matrisi ortak IP kotasıyla
    // ilgisiz kullanıcı akışlarını 429 ile kirletmemelidir.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "qa_reports/playwright-results.json" }]
  ],
  use: {
    baseURL,
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: process.env.CI ? "retain-on-failure" : "off"
  },
  webServer: process.env.GRIDSHARD_E2E_EXTERNAL_SERVER ? undefined : {
    command: `\"${bundledPython}\" ../tools/e2e_server.py`,
    cwd: "./server",
    url: `${baseURL}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: process.env.CI ? "pipe" : "ignore",
    stderr: process.env.CI ? "pipe" : "ignore",
    env: {
      ...process.env,
      GRIDSHARD_PYTHON: process.env.GRIDSHARD_PYTHON || bundledPython,
      GRIDSHARD_AUTH_REQUIRED: "1",
      GRIDSHARD_RATE_LIMIT_REQUIRED: "0",
      GRIDSHARD_AUTH_SIGNING_KEY:
        process.env.GRIDSHARD_AUTH_SIGNING_KEY || "e2e-only-signing-key-change-in-production",
      RELAY_WEB_TEST_RUN_ID: "gridshard-playwright-e2e",
      RELAY_PLAYER_DATA_PATH:
        process.env.RELAY_PLAYER_DATA_PATH || "data/e2e_playwright_players.json",
      RELAY_TELEMETRY_PATH:
        process.env.RELAY_TELEMETRY_PATH || "data/e2e_playwright_telemetry.json"
    }
  },
  projects: [
    {
      name: "desktop-chromium",
      testMatch: /(two-client-pvp|menu-navigation|battle-density|battle-module-swap|beta32-booster-viewport|beta33-season|beta381-battle-events)\.spec\.js/,
      use: { ...devices["Desktop Chrome"], ...localChrome }
    },
    {
      name: "android-chrome-emulated",
      testMatch: /mobile-battle\.spec\.js/,
      use: { ...devices["Pixel 7"], ...localChrome }
    },
    {
      name: "iphone-safari-emulated",
      testMatch: /mobile-battle\.spec\.js/,
      use: { ...devices["iPhone 15"] }
    }
  ]
});
