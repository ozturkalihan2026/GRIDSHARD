const { expect } = require("@playwright/test");

const DEFAULT_POOL = [
  "generator",
  "battery",
  "splitter",
  "capacitor",
  "laser",
  "pulse_cannon",
  "railgun",
  "missile_launcher",
  "drone_bay",
  "arc_cannon",
  "shield",
  "armor",
  "reflector",
  "barrier",
  "repair",
  "cooler",
  "amplifier",
  "targeting_computer"
];

function initialModules(playerId) {
  return [
    { instance_id: `${playerId}-core`, definition_id: "core", x: 2, y: 2, direction: "up" },
    { instance_id: `${playerId}-generator`, definition_id: "generator", x: 2, y: 3, direction: "up" },
    { instance_id: `${playerId}-splitter`, definition_id: "splitter", x: 2, y: 1, direction: "down" },
    { instance_id: `${playerId}-laser`, definition_id: "laser", x: 1, y: 1, direction: "right" }
  ];
}

async function createAuthenticatedClient(browser, baseURL, playerId) {
  const context = await browser.newContext();
  const deviceSecret = `e2e-secret-${playerId}-0123456789`;
  await context.addInitScript(({ id, secret }) => {
    localStorage.setItem("project-relay.web-test.participant-id", id);
    localStorage.setItem("gridshard.auth.device-secret", secret);
  }, { id: playerId, secret: deviceSecret });
  const page = await context.newPage();

  await page.goto(`${baseURL}/?e2e=1`, { waitUntil: "domcontentloaded" });
  const token = await page.evaluate(async id => {
    await GridshardAuth.session.ensureAuthenticated(id);
    return GridshardAuth.session.accessTokenFor(id);
  }, playerId);

  expect(token).toBeTruthy();
  return { context, page, playerId, token };
}

async function api(client, method, path, body) {
  const result = await client.page.evaluate(async ({ method, path, body, token }) => {
    const response = await fetch(path, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "content-type": "application/json" })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let payload = null;
    try { payload = await response.json(); } catch (_) { /* no body */ }
    return { status: response.status, payload };
  }, { method, path, body, token: client.token });

  expect(result.status, `${method} ${path}: ${JSON.stringify(result.payload)}`).toBeLessThan(400);
  return result.payload;
}

async function connectSocket(client, baseURL, sessionId) {
  await client.page.evaluate(({ baseURL, sessionId, playerId, token }) => {
    const wsBase = baseURL.replace(/^http/, "ws");
    window.__gridshardE2E = { messages: [], open: false, closed: false };
    const socket = new WebSocket(
      `${wsBase}/ws/pvp/${encodeURIComponent(sessionId)}` +
      `?player_id=${encodeURIComponent(playerId)}&access_token=${encodeURIComponent(token)}`
    );
    socket.addEventListener("open", () => { window.__gridshardE2E.open = true; });
    socket.addEventListener("message", event => {
      window.__gridshardE2E.messages.push(JSON.parse(event.data));
    });
    socket.addEventListener("close", () => { window.__gridshardE2E.closed = true; });
    window.__gridshardE2ESocket = socket;
  }, { baseURL, sessionId, playerId: client.playerId, token: client.token });

  await expect.poll(() => client.page.evaluate(() => window.__gridshardE2E.open)).toBe(true);
  await expect.poll(() => client.page.evaluate(() =>
    window.__gridshardE2E.messages.some(message => message.type === "reconnect_state")
  )).toBe(true);
}

async function sendSocket(client, sessionId, type, requestId, payload) {
  await client.page.evaluate(({ sessionId, playerId, type, requestId, payload }) => {
    window.__gridshardE2ESocket.send(JSON.stringify({
      version: 1,
      type,
      session_id: sessionId,
      player_id: playerId,
      request_id: requestId,
      payload
    }));
  }, { sessionId, playerId: client.playerId, type, requestId, payload });
}

module.exports = {
  DEFAULT_POOL,
  initialModules,
  createAuthenticatedClient,
  api,
  connectSocket,
  sendSocket
};
