const { test, expect, devices } = require("@playwright/test");
const { waitForParticipantReady } = require("./ui-helpers");
const {
  DEFAULT_POOL,
  initialModules,
  createAuthenticatedClient,
  api,
  connectSocket,
  closeSocket,
  sendSocket
} = require("./helpers");

test("arkadaş savaşının gerçek arayüzü 3–2–1 sayar ve yeniden bağlantıda olayları tekrarlamaz", async ({ browser, baseURL }, testInfo) => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const options = testInfo.project.name.startsWith("android") ? devices["Pixel 7"] : {};
  const playerA = await createAuthenticatedClient(browser, baseURL, `friend-a-${suffix}`, options);
  const playerB = await createAuthenticatedClient(browser, baseURL, `friend-b-${suffix}`, options);
  try {
    await Promise.all([playerA, playerB].map(client => waitForParticipantReady(client.page)));
    await api(playerA, "POST", `/social/${playerA.playerId}/requests`, {
      player_id:playerA.playerId, target_player_id:playerB.playerId, request_id:`friend:${suffix}`,
    });
    await api(playerB, "POST", `/social/${playerB.playerId}/requests/accept`, {
      player_id:playerB.playerId, requester_id:playerA.playerId, request_id:`accept:${suffix}`,
    });
    const invited = await api(playerA, "POST", `/social/${playerA.playerId}/battle-invites`, {
      player_id:playerA.playerId, opponent_id:playerB.playerId, request_id:`invite:${suffix}`,
    });
    const invite = invited.battle_invites.find(item => item.opponent_id === playerB.playerId && item.status === "pending");
    expect(invite).toBeTruthy();
    const accepted = await api(playerB, "POST", `/social/${playerB.playerId}/battle-invites/${invite.invite_id}/accept`, {
      player_id:playerB.playerId, request_id:`battle:${suffix}`,
    });
    expect(accepted.battle.match_type).toBe("friend_battle");
    expect(accepted.battle.ranked_eligible).toBe(false);

    // Observe the actual application's transport/presentation, not an extra
    // test WebSocket. No player state, snapshots or clocks are injected.
    for (const client of [playerA, playerB]) await client.page.evaluate(() => {
      window.__friendPresentation = {numbers:[],cursors:[],reconnects:0,longestTaskMs:0,messages:{}};
      const overlay = document.getElementById("battle-start-countdown");
      new MutationObserver(() => {
        if (!overlay.hidden) window.__friendPresentation.numbers.push(overlay.textContent.trim());
      }).observe(overlay, {attributes:true,childList:true,subtree:true,characterData:true});
      const original = RelayPvPClientState.prototype.applyServerEnvelope;
      RelayPvPClientState.prototype.applyServerEnvelope = function(message) {
        const result = original.call(this, message);
        window.__friendPresentation.messages[message.type] = (window.__friendPresentation.messages[message.type] || 0) + 1;
        if (message.type === "reconnect_state") window.__friendPresentation.reconnects++;
        for (const event of result.events || []) window.__friendPresentation.cursors.push(event.cursor);
        return result;
      };
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__friendPresentation.longestTaskMs = Math.max(window.__friendPresentation.longestTaskMs, entry.duration);
      }).observe({type:"longtask",buffered:false});
    });
    const launched = await Promise.all([playerA, playerB].map(client => client.page.evaluate(battle => {
      const result = window.__GRIDSHARD_TEST_API.launchSocialBattle(battle);
      // The activation path may return a socket URL containing a token; keep
      // the result inside the browser and return only its success flag.
      return Promise.resolve(result).then(value => Boolean(value.ok));
    }, accepted.battle)));
    expect(launched).toEqual([true,true]);
    for (const client of [playerA, playerB]) {
      await expect(client.page.locator("#battle-start-countdown")).toBeVisible();
      await expect(client.page.locator("#core-power-button")).toBeDisabled();
      expect(await client.page.evaluate(() => window.__GRIDSHARD_TEST_API.getOnlineBattleState().elapsedMs)).toBe(0);
    }
    await playerA.page.screenshot({path:testInfo.outputPath("friend-countdown.png")});
    for (const client of [playerA, playerB]) {
      await expect(client.page.locator("#battle-start-countdown")).toBeHidden({timeout:6000});
      const numbers = await client.page.evaluate(() => [...new Set(window.__friendPresentation.numbers)]);
      expect(numbers).toEqual(["3", "2", "1"]);
    }
    await expect.poll(() => playerA.page.evaluate(() => window.__GRIDSHARD_TEST_API.getBattleState().elapsed_ms)).toBeGreaterThan(0);
    for (const client of [playerA, playerB]) {
      await expect.poll(() => client.page.evaluate(() => window.__GRIDSHARD_TEST_API.deployModule("laser")), {timeout:12000}).toBe(true);
    }
    await expect.poll(() => playerA.page.evaluate(() => window.__friendPresentation.cursors.length)).toBeGreaterThan(4);
    const elapsedBefore = await playerA.page.evaluate(() => window.__GRIDSHARD_TEST_API.getOnlineBattleState().elapsedMs);
    const reconnectsBefore = await playerA.page.evaluate(() => window.__friendPresentation.reconnects);
    await playerA.page.evaluate(() => window.__GRIDSHARD_TEST_API.dropOnlineConnection());
    await expect.poll(() => playerA.page.evaluate(() => window.__friendPresentation.reconnects)).toBeGreaterThan(reconnectsBefore);
    await expect.poll(() => playerA.page.evaluate(() => window.__GRIDSHARD_TEST_API.getOnlineBattleState().elapsedMs)).toBeGreaterThan(elapsedBefore);
    await expect(playerA.page.locator("#battle-start-countdown")).toBeHidden();
    // Sustained real UI sample, not a synthetic event burst. Browser evidence
    // supplements (and never replaces) the native-device release gate.
    await expect.poll(() => playerA.page.evaluate(() => window.__GRIDSHARD_PERF?.current?.duration_ms || 0), {timeout:25000}).toBeGreaterThanOrEqual(15000);
    for (const client of [playerA, playerB]) {
      const evidence = await client.page.evaluate(() => ({
        ...window.__friendPresentation, state:window.__GRIDSHARD_TEST_API.getOnlineBattleState(),
        performance:window.__GRIDSHARD_PERF?.current,
      }));
      expect(new Set(evidence.cursors).size).toBe(evidence.cursors.length);
      expect(evidence.cursors.every(Number.isInteger)).toBe(true);
      expect(evidence.state.historySize).toBeLessThanOrEqual(256);
      expect(evidence.performance.freeze_count).toBe(0);
      await testInfo.attach(`friend-${client === playerA ? "a" : "b"}-presentation`, {body:JSON.stringify(evidence),contentType:"application/json"});
    }
    // Cleanup through the app's real forfeit handler; its technical drawer is
    // intentionally collapsed in the compact battle layout.
    await playerA.page.locator("#battle-forfeit-button").evaluate(button => button.click());
    for (const client of [playerA, playerB]) await expect(client.page.locator(".post-match-panel")).toBeVisible({timeout:15000});
    for (const client of [playerA, playerB]) expect(client.pageErrors).toEqual([]);
  } finally {
    for (const client of [playerA, playerB]) {
      const state = await client.page.evaluate(() => ({state:window.__GRIDSHARD_TEST_API?.getOnlineBattleState(),observed:window.__friendPresentation})).catch(() => null);
      await testInfo.attach(`friend-${client === playerA ? "a" : "b"}-final-state`, {body:JSON.stringify(state),contentType:"application/json"});
    }
    await Promise.all([playerA.context.close(),playerB.context.close()]);
  }
});

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

    // Current rules deploy cards to a server-selected empty cell; module
    // rotation and pre-placed laser fixtures are no longer supported.
    await expect.poll(() => playerA.page.evaluate(playerId => {
      const snapshots = window.__gridshardE2E.messages.filter(message => message.type === "snapshot");
      const snapshot = snapshots.at(-1)?.payload;
      if (snapshot?.status !== "running" || snapshot.countdown_remaining_ms !== 0 || snapshot.elapsed_ms <= 0) return 0;
      return snapshot.players?.[playerId]?.current || 0;
    }, playerA.playerId), { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    await sendSocket(playerA, previousSessionId, "command", "before-drop", {
      sequence: 1,
      kind: "deploy_module",
      command_payload: { definition_id: "laser" }
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
