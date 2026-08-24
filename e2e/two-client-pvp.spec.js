const { test, expect } = require("@playwright/test");
const {
  DEFAULT_POOL,
  initialModules,
  createAuthenticatedClient,
  api,
  connectSocket,
  closeSocket,
  sendSocket
} = require("./helpers");

test("iki bağımsız tarayıcı istemcisi sunucu-otoriteli PvP sonucunu birlikte görür", async ({ browser, baseURL }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const playerA = await createAuthenticatedClient(browser, baseURL, `e2e-a-${suffix}`);
  const playerB = await createAuthenticatedClient(browser, baseURL, `e2e-b-${suffix}`);

  try {
    const queued = await api(playerA, "POST", "/matchmaking/join", { player_id: playerA.playerId });
    expect(queued.matched).toBe(false);
    const matched = await api(playerB, "POST", "/matchmaking/join", { player_id: playerB.playerId });
    expect(matched.matched).toBe(true);
    expect(matched.players.sort()).toEqual([playerA.playerId, playerB.playerId].sort());

    const sessionId = matched.session_id;
    await Promise.all([
      api(playerA, "POST", `/pvp/sessions/${sessionId}/setup`, {
        player_id: playerA.playerId,
        battle_pool_ids: DEFAULT_POOL,
        initial_modules: initialModules(playerA.playerId)
      }),
      api(playerB, "POST", `/pvp/sessions/${sessionId}/setup`, {
        player_id: playerB.playerId,
        battle_pool_ids: DEFAULT_POOL,
        initial_modules: initialModules(playerB.playerId)
      })
    ]);

    await Promise.all([
      connectSocket(playerA, baseURL, sessionId),
      connectSocket(playerB, baseURL, sessionId)
    ]);
    await api(playerA, "POST", `/pvp/sessions/${sessionId}/ready`, { player_id: playerA.playerId, ready: true });
    await api(playerB, "POST", `/pvp/sessions/${sessionId}/ready`, { player_id: playerB.playerId, ready: true });

    await sendSocket(playerA, sessionId, "command", "forfeit-a", {
      sequence: 1,
      kind: "forfeit_battle",
      command_payload: {}
    });

    for (const client of [playerA, playerB]) {
      await expect.poll(() => client.page.evaluate(() =>
        window.__gridshardE2E.messages.some(message => message.type === "match_finished")
      ), { timeout: 15_000 }).toBe(true);
    }

    const resultA = await api(playerA, "GET", `/pvp/sessions/${sessionId}/result?player_id=${playerA.playerId}`);
    const resultB = await api(playerB, "GET", `/pvp/sessions/${sessionId}/result?player_id=${playerB.playerId}`);
    expect(resultA.finish_reason).toBe("player_forfeit");
    expect(resultB.finish_reason).toBe("player_forfeit");
    expect(resultA.winner_player_id).toBe(playerB.playerId);
    expect(resultB.winner_player_id).toBe(playerB.playerId);
    expect(resultA.result_summary[playerB.playerId].circuit_credits).toBeUndefined();
    expect(resultB.result_summary[playerA.playerId].circuit_credits).toBeUndefined();
  } finally {
    await Promise.all([playerA.context.close(), playerB.context.close()]);
  }
});

test("aktif PvP bağlantısı kaldığı yerden sürer ve rematch yeni oturum açar", async ({ browser, baseURL }) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const playerA = await createAuthenticatedClient(browser, baseURL, `resilience-a-${suffix}`);
  const playerB = await createAuthenticatedClient(browser, baseURL, `resilience-b-${suffix}`);

  try {
    await api(playerA, "POST", "/matchmaking/join", { player_id: playerA.playerId });
    const matched = await api(playerB, "POST", "/matchmaking/join", { player_id: playerB.playerId });
    const previousSessionId = matched.session_id;

    await Promise.all([
      api(playerA, "POST", `/pvp/sessions/${previousSessionId}/setup`, {
        player_id: playerA.playerId,
        battle_pool_ids: DEFAULT_POOL,
        initial_modules: initialModules(playerA.playerId)
      }),
      api(playerB, "POST", `/pvp/sessions/${previousSessionId}/setup`, {
        player_id: playerB.playerId,
        battle_pool_ids: DEFAULT_POOL,
        initial_modules: initialModules(playerB.playerId)
      })
    ]);
    await Promise.all([
      connectSocket(playerA, baseURL, previousSessionId),
      connectSocket(playerB, baseURL, previousSessionId)
    ]);
    await api(playerA, "POST", `/pvp/sessions/${previousSessionId}/ready`, { player_id: playerA.playerId, ready: true });
    await api(playerB, "POST", `/pvp/sessions/${previousSessionId}/ready`, { player_id: playerB.playerId, ready: true });

    await sendSocket(playerA, previousSessionId, "command", "before-drop", {
      sequence: 1,
      kind: "rotate_module",
      command_payload: { module_id: `${playerA.playerId}-laser` }
    });
    await expect.poll(() => playerA.page.evaluate(() =>
      window.__gridshardE2E.messages.some(message =>
        message.type === "command_accepted" && message.payload?.sequence === 1
      )
    )).toBe(true);

    await closeSocket(playerA);
    await connectSocket(playerA, baseURL, previousSessionId);
    const reconnect = await playerA.page.evaluate(() =>
      window.__gridshardE2E.messages.find(message => message.type === "reconnect_state")
    );
    expect(reconnect.payload.last_command_sequence).toBe(1);
    expect(reconnect.payload.snapshot.status).toBe("running");
    expect(reconnect.payload.snapshot.session_id).toBe(previousSessionId);
    expect(reconnect.payload.final_result).toBeNull();

    await sendSocket(playerA, previousSessionId, "command", "after-drop", {
      sequence: 2,
      kind: "forfeit_battle",
      command_payload: {}
    });
    for (const client of [playerA, playerB]) {
      await expect.poll(() => client.page.evaluate(() =>
        window.__gridshardE2E.messages.some(message => message.type === "match_finished")
      ), { timeout: 15_000 }).toBe(true);
    }

    const oldResult = await api(
      playerA,
      "GET",
      `/pvp/sessions/${previousSessionId}/result?player_id=${playerA.playerId}`
    );
    expect(oldResult.finish_reason).toBe("player_forfeit");

    const requeued = await api(playerA, "POST", "/matchmaking/join", {
      player_id: playerA.playerId
    });
    expect(requeued.matched).toBe(false);
    const rematched = await api(playerB, "POST", "/matchmaking/join", {
      player_id: playerB.playerId
    });
    expect(rematched.matched).toBe(true);
    expect(rematched.session_id).not.toBe(previousSessionId);
    expect(rematched.players.sort()).toEqual(
      [playerA.playerId, playerB.playerId].sort()
    );

    const newLobby = await api(
      playerA,
      "GET",
      `/pvp/sessions/${rematched.session_id}/lobby`
    );
    expect(newLobby.status).toBe("waiting");
    expect(newLobby.players.every(player => !player.setup_submitted && !player.ready)).toBe(true);
  } finally {
    await Promise.all([playerA.context.close(), playerB.context.close()]);
  }
});
