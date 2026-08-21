const { test, expect } = require("@playwright/test");
const {
  DEFAULT_POOL,
  initialModules,
  createAuthenticatedClient,
  api,
  connectSocket,
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
