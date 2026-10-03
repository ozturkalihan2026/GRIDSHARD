"use strict";
const fs = require("node:fs");
const path = require("node:path");
const SDK = "com.google.android.gms:play-services-games-v2:22.1.0";

function playGamesConfig(environment) {
  const gameId = (environment.GRIDSHARD_PLAY_GAMES_ID || "").trim();
  const clientId = (environment.GRIDSHARD_PLAY_GAMES_SERVER_CLIENT_ID || "").trim();
  if (Boolean(gameId) !== Boolean(clientId) || (gameId && (!/^[0-9]{5,24}$/.test(gameId)
      || !/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId)))) {
    throw new Error("Play Games public oyun/sunucu kimlikleri birlikte ve geçerli olmalı.");
  }
  return {gameId, clientId};
}

function playGamesManifest(source, enabled) {
  let applications = 0;
  const output = source.replace(/(<application\b[^>]*>)([\s\S]*?)(<\/application>)/g, (_, open, body, close) => {
    applications++;
    const application = 'com.gridshard.nativeui.GridshardApplication';
    const existing = open.match(/android:name\s*=\s*["']([^"']+)["']/);
    if (existing && existing[1] !== application) throw new Error("Mevcut Android Application sınıfı korunmalı; otomatik değiştirilmez.");
    if (!existing) open = open.replace(/>$/, ` android:name="${application}">`);
    body = body.replace(/<meta-data\b[^>]*?\/>|<meta-data\b[^>]*>[\s\S]*?<\/meta-data>/g, tag =>
      /android:name=["']com\.google\.android\.gms\.games\.(APP_ID|SUPPRESS_GAME_PROFILE_CREATION)["']/.test(tag) ? "" : tag);
    body = body.trimEnd();
    if (enabled) body += '\n        <meta-data android:name="com.google.android.gms.games.APP_ID" android:value="@string/gridshard_play_games_id" />\n        <meta-data android:name="com.google.android.gms.games.SUPPRESS_GAME_PROFILE_CREATION" android:value="true" />';
    // Normalize managed metadata so repeated sync is byte-identical.
    body = body.replace(/\n[ \t]*\n+/g, "\n");
    return `${open}${body}\n${close}`;
  });
  if (applications !== 1) throw new Error("Tek Android application gerekli.");
  return output;
}

function playGamesGradle(source) {
  const marker = '// GRIDSHARD Play Games SDK (managed)';
  const managed = `${marker}\ndependencies { implementation '${SDK}' }\n`;
  if (source.includes(marker)) return source.replace(/\/\/ GRIDSHARD Play Games SDK \(managed\)\r?\n[^\r\n]+\r?\n/, managed);
  if (source.includes('play-services-games')) throw new Error("Yönetilmeyen Play Games SDK bağımlılığı bulundu.");
  return source.trimEnd() + "\n\n" + managed;
}

function configureNativePlayGames(nativeRoot, repositoryRoot, environment = process.env) {
  const {gameId, clientId} = playGamesConfig(environment);
  const directory = path.join(nativeRoot, 'app/src/main/java/com/gridshard/nativeui');
  fs.mkdirSync(directory, {recursive:true});
  for (const name of ['GridshardApplication.java', 'GridshardPlayGames.java']) {
    fs.copyFileSync(path.join(repositoryRoot, 'tools/native-templates', name), path.join(directory, name));
  }
  const manifest = path.join(nativeRoot, 'app/src/main/AndroidManifest.xml');
  fs.writeFileSync(manifest, playGamesManifest(fs.readFileSync(manifest, 'utf8'), Boolean(gameId)));
  const gradle = path.join(nativeRoot, 'app/build.gradle');
  fs.writeFileSync(gradle, playGamesGradle(fs.readFileSync(gradle, 'utf8')));
  fs.writeFileSync(path.join(nativeRoot, 'app/src/main/res/values/gridshard_play_games.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n<string name="gridshard_play_games_id" translatable="false">${gameId}</string>\n<string name="gridshard_play_games_server_client_id" translatable="false">${clientId}</string>\n</resources>\n`);
}
module.exports = {SDK, playGamesConfig, playGamesManifest, playGamesGradle, configureNativePlayGames};
