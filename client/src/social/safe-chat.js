(function (global) {
  "use strict";

  // Hazır mesajlar: çocuk hedef kitle kararı (docs/CHILD_AUDIENCE_AUDIT.md).
  // Takım sohbetinde ve özel mesajda serbest yazı yoktur; oyuncu bu listeden
  // seçer ve sunucuya yalnız kimlik gider. Takım açıklaması da hazır
  // seçeneklerden biridir.
  //
  // Liste server/app/safe_chat.py ile aynıdır (kimlik, grup, metin ve sıra);
  // client/tests/safe-chat.test.js ikisinin eşit olduğunu denetler. Metinler
  // Türkçedir; ekranda çeviri sözlüğünden geçer.
  const MESSAGES = Object.freeze([
    ["hello", "selam", "Selam!"],
    ["welcome", "selam", "Hoş geldin!"],
    ["good_luck", "selam", "İyi oyunlar!"],
    ["see_you", "selam", "Sonra görüşürüz!"],
    ["thanks", "selam", "Teşekkürler!"],
    ["sorry", "selam", "Kusura bakma."],
    ["yes", "cevap", "Evet."],
    ["no", "cevap", "Hayır."],
    ["okay", "cevap", "Tamam."],
    ["ready", "cevap", "Hazırım!"],
    ["wait", "cevap", "Birazdan geliyorum."],
    ["later", "cevap", "Şimdi olmaz, sonra."],
    ["battle", "savas", "Savaşalım mı?"],
    ["rematch", "savas", "Rövanş yapalım mı?"],
    ["training", "savas", "Antrenman maçı yapalım mı?"],
    ["good_game", "savas", "Güzel maçtı!"],
    ["congrats", "savas", "Tebrikler!"],
    ["i_won", "savas", "Kazandım!"],
    ["i_lost", "savas", "Bu sefer olmadı."],
    ["nice_deck", "savas", "Desten çok iyi!"],
    ["which_deck", "savas", "Hangi desteyi kullanıyorsun?"],
    ["need_shards", "takim", "Modül parçasına ihtiyacım var."],
    ["sent_shards", "takim", "Parça gönderdim."],
    ["tournament_ready", "takim", "Turnuvaya hazır mıyız?"],
    ["tournament_play", "takim", "Turnuva maçlarını oynayalım!"],
    ["join_team", "takim", "Takımıma katılmak ister misin?"],
    ["great_team", "takim", "Harika takımız!"],
    ["thumbs_up", "tepki", "👍"],
    ["fire", "tepki", "🔥"],
    ["strong", "tepki", "💪"],
    ["party", "tepki", "🎉"],
    ["laugh", "tepki", "😄"],
    ["wow", "tepki", "😮"],
  ].map(([id, group, text]) => Object.freeze({ id, group, text })));

  const GROUPS = Object.freeze([
    Object.freeze({ id: "selam", label: "SELAM" }),
    Object.freeze({ id: "cevap", label: "CEVAP" }),
    Object.freeze({ id: "savas", label: "SAVAŞ" }),
    Object.freeze({ id: "takim", label: "TAKIM" }),
    Object.freeze({ id: "tepki", label: "TEPKİ" }),
  ]);

  const TEAM_DESCRIPTIONS = Object.freeze([
    ["open", "Herkese açığız."],
    ["active", "Aktif oyuncular arıyoruz."],
    ["daily", "Her gün oynuyoruz."],
    ["tournament", "Turnuva için oynuyoruz."],
    ["climbing", "Sıralamada yükseliyoruz."],
    ["newcomers", "Yeni oyunculara yardım ediyoruz."],
    ["friends", "Arkadaş takımıyız."],
    ["relaxed", "Keyfine oynuyoruz."],
  ].map(([id, text]) => Object.freeze({ id, text })));

  const messageById = new Map(MESSAGES.map((item) => [item.id, item]));
  const descriptionById = new Map(TEAM_DESCRIPTIONS.map((item) => [item.id, item]));

  // Sunucudan gelen mesajın gösterilecek metni. Kimlik bu sürümde biliniyorsa
  // metin buradan alınır; sunucu daha yeni bir kimlik gönderdiyse onun hazır
  // metni gösterilir. Kimliği olmayan kayıt (eski serbest yazı) gösterilmez.
  function messageText(message) {
    const presetId = String(message?.preset_id || "");
    if (!presetId) return "";
    return messageById.get(presetId)?.text || String(message?.text || "");
  }

  function teamDescriptionText(team) {
    const descriptionId = String(team?.description_id || "");
    if (!descriptionId) return "";
    return descriptionById.get(descriptionId)?.text || String(team?.description || "");
  }

  const GridshardSafeChat = Object.freeze({
    messages: MESSAGES,
    groups: GROUPS,
    teamDescriptions: TEAM_DESCRIPTIONS,
    messageText,
    teamDescriptionText,
  });

  global.GridshardSafeChat = GridshardSafeChat;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { GridshardSafeChat };
  }
})(typeof window !== "undefined" ? window : globalThis);
