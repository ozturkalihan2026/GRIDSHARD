const { expect } = require("@playwright/test");

// Sunucunun varsayılan başlangıç destesi (arena_canon.STARTER_IDS).
const DEFAULT_POOL = [
  "laser",
  "shield",
  "repair",
  "cooler",
  "battery",
  "amplifier"
];

// Başlangıç devresi yalnız merkezdeki Çekirdektir; kartlar sunucuda rastgele
// boş hücreye yerleşir.
function initialModules(playerId) {
  return [
    { instance_id: `${playerId}-core`, definition_id: "core", x: 2, y: 1 }
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
    // Uygulama fetch sarmalayıcısının URL'den farklı bir oyuncu kimliği
    // çıkarsamasına izin vermeden, bu bağımsız tarayıcı bağlamının açıkça
    // verilen token'ı ile sunucu protokolünü test et.
    const request = globalThis.GridshardAuth?.originalFetch || globalThis.fetch;
    const response = await request(path, {
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

async function connectSocket(client, baseURL, sessionId, { resetMessages = true } = {}) {
  await client.page.evaluate(({ baseURL, sessionId, playerId, token, resetMessages }) => {
    const wsBase = baseURL.replace(/^http/, "ws");
    const previousMessages = Array.isArray(window.__gridshardE2E?.messages)
      ? window.__gridshardE2E.messages
      : [];
    window.__gridshardE2E = {
      messages: resetMessages ? [] : previousMessages,
      open: false,
      closed: false
    };
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
  }, { baseURL, sessionId, playerId: client.playerId, token: client.token, resetMessages });

  await expect.poll(() => client.page.evaluate(() => window.__gridshardE2E.open)).toBe(true);
  await expect.poll(() => client.page.evaluate(() =>
    window.__gridshardE2E.messages.some(message => message.type === "reconnect_state")
  )).toBe(true);
}

async function closeSocket(client, code = 4000, reason = "e2e-network-drop") {
  await client.page.evaluate(({ code, reason }) => {
    const socket = window.__gridshardE2ESocket;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(code, reason);
    }
  }, { code, reason });
  await expect.poll(() => client.page.evaluate(() =>
    window.__gridshardE2E?.closed === true
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
  closeSocket,
  sendSocket
};
