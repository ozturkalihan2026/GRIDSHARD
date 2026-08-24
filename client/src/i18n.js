(function (global) {
  "use strict";

  const EN = Object.freeze({
    "GÜNCEL YAPI":"CURRENT BUILD",
    "manifest bekleniyor":"waiting for manifest",
    "Ana Menü":"Main Menu",
    "Ana Menüye Dön":"Return to Main Menu",
    "Oyna":"Play",
    "Profil":"Profile",
    "İstatistikler":"Statistics",
    "Ayarlar":"Settings",
    "OPERATÖR TERMİNALİ":"OPERATOR TERMINAL",
    "Oyuncu kimliği, ilerleme ve savaş hazırlığı.":"Player identity, progression and battle readiness.",
    "Genel · İlerleme · Savaş Havuzu ·":"Overview · Progression · Battle Pool ·",
    "Yerel önizleme":"Local preview",
    "Görünen Oyuncu Adı":"Display Name",
    "Görünen Adı Kaydet":"Save Display Name",
    "Web Test Kimliği hazırlanıyor…":"Preparing Web Test identity…",
    "Hesap: Hazır değil":"Account: Not ready",
    "Oturum Sürekliliği: Kontrol bekliyor":"Session continuity: Waiting for check",
    "Hesap Hazırlığını Yeniden Dene":"Retry Account Setup",
    "SAVAŞ ARŞİVİ":"BATTLE ARCHIVE",
    "Maç geçmişinin temel performans özeti.":"Core performance summary of match history.",
    "Savaş geçmişin, kaynak kullanımın ve en sık kullandığın modüller.":"Your battle history, resource usage, and most-used modules.",
    "Sunucu otoriteli maç sonuçları ·":"Server-authoritative match results ·",
    "Savaş istatistikleri":"Battle statistics",
    "Toplam Maç":"Total Matches",
    "Galibiyet Oranı":"Win Rate",
    "Sunucu onaylı sonuçlar":"Server-verified results",
    "Ortalama Savaş":"Average Battle",
    "Tamamlanan maç süresi":"Completed match duration",
    "Toplam Hasar":"Total Damage",
    "Rakip devrelere verilen":"Dealt to opponent circuits",
    "Modül Değişimi":"Module Replacements",
    "Savaş içi devre hamlesi":"In-battle circuit action",
    "Güçlendirici Kullanımı":"Booster Usage",
    "Aktifleştirilen geçici etki":"Temporary effects activated",
    "DEVRE ALIŞKANLIĞI":"CIRCUIT HABITS",
    "En Çok Kullanılan Modüller":"Most-Used Modules",
    "Maçta en az bir kez aktif olan modüller":"Modules active at least once in a match",
    "Henüz tamamlanmış maç verisi yok.":"No completed match data yet.",
    "maçta kullanıldı":"matches used",
    "Modül":"Module",
    "dk":"min",
    "sn":"sec",
    "SİSTEM KONSOLU":"SYSTEM CONSOLE",
    "Oyun deneyimini cihazına göre düzenle.":"Adjust the game experience for your device.",
    "Ses · Müzik · Titreşim · Grafik · Dil ·":"Sound · Music · Vibration · Graphics · Language ·",
    "Ses":"Sound",
    "Sesi Sessize Al":"Mute Sound",
    "Müzik":"Music",
    "Müziği Sessize Al":"Mute Music",
    "Titreşim":"Vibration",
    "Grafik":"Graphics",
    "Dil":"Language",
    "Düşük":"Low",
    "Orta":"Medium",
    "Yüksek":"High",
    "Türkçe":"Turkish",
    "Müziği Önizle":"Preview Music",
    "SFX Önizle":"Preview SFX",
    "Ayarları Kaydet":"Save Settings",
    "Henüz kaydedilmedi":"Not saved yet",
    "Kalıcılık: Henüz doğrulanmadı":"Persistence: Not verified yet",
    "Bağlantı / Oturum Durumu":"Connection / Session Status",
    "Yeniden Dene":"Retry",
    "Savaşa Hazırlık":"Battle Preparation",
    "Sınıf başlıklarını açıp kapat. Soldan modülü incele. + ile ekle, − ile çıkar; ◆ Jeneratörün zorunlu ve kilitli olduğunu gösterir. Çıkarma işlemi seçili Savaş Havuzundaki − simgesinden yapılır.":"Expand or collapse class headings. Inspect a module on the left. Add with + and remove with −; ◆ marks the required, locked Generator. Remove modules from the selected Battle Pool with its − control.",
    "Kısa Eğitim":"Quick Tutorial",
    "Hazır Havuzları Yönet":"Manage Presets",
    "Hazır Savaş Havuzları ve Kayıt Yönetimi":"Battle Pool Presets and Save Management",
    "Havuzlarını geniş çalışma alanında yükle, kaydet, yeniden adlandır veya sil.":"Load, save, rename or delete your pools in the expanded workspace.",
    "Hazır havuz yönetimini kapat":"Close preset management",
    "Kapat":"Close",
    "Hazır Savaş Havuzları":"Battle Pool Presets",
    "Favori veya son kullandığın loadout'u tek tıkla yükle.":"Load your favorite or most recent loadout with one click.",
    "Yeni Hazır Havuz":"New Preset",
    "Hazır havuz seç...":"Select a preset...",
    "Yeni / Güncel Havuz":"New / Current Pool",
    "Örn. Saldırı":"e.g. Assault",
    "Hazır Havuz Kaydet":"Save Preset",
    "Yeniden Adlandır":"Rename",
    "Yeni hazır havuz adı":"New preset name",
    "Adı Değiştir":"Rename",
    "Aktif hazır havuz: Yok":"Active preset: None",
    "Serbest seçim":"Custom selection",
    "Aktif Hazır Havuzu Sil":"Delete Active Preset",
    "Kayıtlı havuzlar yükleniyor...":"Loading saved pools...",
    "Başlangıç Devresi · 4 Aktif":"Starting Circuit · 4 Active",
    "Çekirdek ve Jeneratör sabittir. Savaş Havuzundan diğer iki başlangıç modülünü seç.":"Core and Generator are fixed. Choose the other two starting modules from the Battle Pool.",
    "Sabit başlangıç modülleri":"Fixed starting modules",
    "Çekirdek · sabit":"Core · fixed",
    "Jeneratör · sabit":"Generator · fixed",
    "Oyuncunun seçtiği başlangıç modülleri":"Player-selected starting modules",
    "2 / 2 oyuncu modülü seçili":"2 / 2 player modules selected",
    "Global Modüller":"Global Modules",
    "Global modül listesi":"Global module list",
    "Seçilen Savaş Havuzu":"Selected Battle Pool",
    "18 modül tamamlandığında eşleştirme açılır.":"Matchmaking unlocks when all 18 modules are selected.",
    "Sınıf":"Class",
    "Can":"Health",
    "Devre Kredisi":"Circuit Credits",
    "Port":"Port",
    "Enerji Üretimi":"Energy Generation",
    "Enerji Tüketimi":"Energy Consumption",
    "Temel Hasar":"Base Damage",
    "Bekleme":"Cooldown",
    "Ne işe yarar?":"What does it do?",
    "Güçlü Olduğu":"Strong Against",
    "Zayıf Olduğu":"Weak Against",
    "Uyumlu Olduğu":"Synergizes With",
    "Sayısal değerler sunucu savaş motoru kataloğundan yükleniyor.":"Numeric values are loading from the server battle-engine catalog.",
    "Savaş":"Battle",
    "Eşleştirmeyi İptal Et":"Cancel Matchmaking",
    "Geçici Güçlendiriciler":"Temporary Boosters",
    "Seçim bekleniyor":"Waiting for selection",
    "Güçlendiriciyi seç, ardından aktif hedef modülü seç. Savaş durmaz.":"Choose a booster, then an active target module. The battle does not pause.",
    "Beta / Bağlantı Teknik Durumu":"Beta / Connection Technical Status",
    "Savaş Ayarları":"Battle Settings",
    "Ses ve müzik seviyeleri kayıtlı Ayarlar tercihlerinden gelir. Bu panel açıldığında savaş durmaz.":"Sound and music levels use your saved Settings preferences. Opening this panel does not pause battle.",
    "Savaşı Bırak":"Forfeit Battle",
    "Aktif Modül: Başlangıç":"Active Modules: Starting layout",
    "Savaş Alanı":"Battle Arena",
    "Savaş devam ediyor":"Battle in progress",
    "Senin Devren":"Your Circuit",
    "Rakip Devresi · Yerel AI":"Opponent Circuit · Local AI",
    "Oyuncu Savaş Alanı":"Player Battle Arena",
    "Rakip Savaş Alanı":"Opponent Battle Arena",
    "Modül Rafı":"Module Shelf",
    "Kilitli":"Locked",
    "Modül müdahalesi 15. saniyede açılır.":"Module interaction unlocks at 15 seconds.",
    "Devrem":"My Circuit",
    "Rakip":"Opponent",
    "Mobil savaş görünümü":"Mobile battle view",
    "Yerleştirmek için bir modül seç":"Select a module to place",
    "Döndür":"Rotate",
    "Rafa Al":"Return to Shelf",
    "Seçimi Kaldır":"Clear Selection",
    "Çekirdek":"Core",
    "Jeneratör":"Generator",
    "Kapı":"Gate",
    "Özel Hücre":"Special Cell",
    "sabit ana hedef":"fixed primary target",
    "sabit başlangıç enerji kaynağı":"fixed starting energy source",
    "çekirdeğe doğrudan bağlantı":"direct connection to the Core",
    "hücre bonusu sağlar":"provides a cell bonus",
    "Yerel AI Baskısı":"Local AI Pressure",
    "Kalkan Etkisi":"Shield Effect",
    "Modül Müdahalesi":"Module Interaction",
    "Kapılar arasında taşınabilir":"can move between Gates",
    "15. sn sonra":"after 15 sec",
    "SAVAŞ TAMAMLANDI":"BATTLE COMPLETE",
    "Sonuç hazırlanıyor":"Preparing result",
    "Maç Sonucu":"Match Result",
    "Sonuç bekleniyor":"Waiting for result",
    "Savaş Analizini Aç":"Open Battle Analysis",
    "Süre":"Duration",
    "Bitiş Nedeni":"Finish Reason",
    "Verilen Hasar":"Damage Dealt",
    "Kalan Çekirdek":"Core Remaining",
    "Ayakta Modül":"Surviving Modules",
    "Kalan Toplam HP":"Total HP Remaining",
    "Hazırlık Ekranına Dön":"Return to Preparation",
    "Tekrar Maç":"Rematch",
    "Teknik Tanılama":"Technical Diagnostics",
    "Yalnızca teknik durum":"Technical status only",
    "Profil veya savaş içeriği içermez.":"Does not contain profile or battle content.",
    "Tanılama Özeti Oluştur":"Create Diagnostic Summary",
    "Tanılama özeti":"Diagnostic summary",
    "Eğitimi kapat":"Close tutorial",
    "Atla":"Skip",
    "Devreni kur":"Build your circuit",
    "Geri":"Back",
    "Uygula":"Apply",
    "İleri":"Next",
    "Olay Günlüğü":"Event Log",
    "Savaş ve istemci komutları burada zaman sırasıyla gösterilir; savaş kararı sunucu otoritesindedir.":"Battle and client commands appear here in time order; the server is authoritative.",
    "Enerji":"Energy",
    "Saldırı":"Attack",
    "Savunma":"Defense",
    "Destek":"Support",
    "Sabotaj":"Sabotage",
    "Batarya":"Battery",
    "Dağıtıcı":"Distributor",
    "Kapasitör":"Capacitor",
    "Lazer":"Laser",
    "Darbe Topu":"Pulse Cannon",
    "Ray Topu":"Railgun",
    "Füze Fırlatıcı":"Missile Launcher",
    "Dron Üssü":"Drone Bay",
    "Ark Topu":"Arc Cannon",
    "Kalkan":"Shield",
    "Zırh":"Armor",
    "Yansıtıcı":"Reflector",
    "Bariyer":"Barrier",
    "Onarım Modülü":"Repair Module",
    "Soğutucu":"Cooler",
    "Güçlendirici":"Amplifier",
    "Hedefleme Bilgisayarı":"Targeting Computer",
    "Aşırı Hızlandırıcı":"Overclock Unit",
    "Sinyal Bozucu":"Jammer",
    "Virüs":"Virus",
    "Enerji Sömürücü":"Energy Leech",
    "Kesici":"Disruptor",
    "Beta.32 Fix.1 · 10 sn AI Devralma · Sabit Port/Simgeler · Belirgin Güçlendiriciler":"Beta.32 Fix.1 · 10 sec AI Takeover · Stable Ports/Icons · Prominent Boosters",
    "Savaş alanına giriş başarılı · Yerel AI aktif · Modül Rafı 15. saniyede açılır":"Battle arena entered · Local AI active · Module Shelf unlocks at 15 seconds",
    "Sunucudan yükleniyor...":"Loading from server...",
    "Sunucu verisi":"Server data",
    "Sunucu yükleme hatası":"Server loading error",
    "Havuza ekle":"Add to pool",
    "Savaş Havuzuna eklendi":"Added to Battle Pool",
    "Havuzdan çıkar":"Remove from pool",
    "Zorunlu modül · çıkarılamaz":"Required module · cannot be removed",
    "Seçim 1":"Selection 1",
    "Seçim 2":"Selection 2",
    "0 / 2 · önce Savaş Havuzunu tamamla":"0 / 2 · complete the Battle Pool first",
    "2 / 2 oyuncu modülü seçili · değişiklikler sınırsız":"2 / 2 player modules selected · changes are unlimited",
    "Başlangıç devresi için zorunlu":"Required for the starting circuit",
    "Ana enerji kaynağı":"Primary energy source",
    "Doğrudan hasar yok":"No direct damage",
    "Bekleme yok":"No cooldown",
    "Devreye sürekli enerji sağlar. Savaş sırasında yalnızca dört Çekirdek kapısı arasında taşınabilir.":"Continuously supplies energy to the circuit. During battle it can move only between the four Core gates.",
    "Saniyede 11 enerji üretir. Bir Çekirdek kapısında başlar ve savaş sırasında dört kapı arasında taşınabilir.":"Generates 11 energy per second. It starts at a Core gate and can move between all four gates during battle.",
    "Enerji Sömürücü etkisinde üretim temel olarak %70 seviyesine düşer.":"Under Energy Leech, its base generation drops to 70%.",
    "Belirgin karşı üstünlük yok":"No notable advantage",
    "Belirgin zayıflık yok":"No notable weakness",
    "Tanımlı özel sinerji yok":"No defined special synergy",
    "Sayısal değerler aktif sunucu savaş motoru kataloğundan doğrulandı.":"Numeric values verified against the active server battle-engine catalog.",
    "Hazır devreyle başla":"Start with a ready circuit",
    "Dengeli 18 modüllük Başlangıç Devresi ilk maçın için hazır. Tek dokunuşla yükleyebilirsin.":"A balanced 18-module Starting Circuit is ready for your first match. Load it with one click.",
    "Havuz 18/18 olduğunda savaş düğmesi açılır.":"The Battle button unlocks when the pool reaches 18/18.",
    "Başlangıç Devresini Yükle":"Load Starting Circuit",
    "Eğitimi kapat":"Close tutorial",
    "Gümüş":"Silver",
    "Savaşı başlat":"Start Battle",
    "Önce çevrimiçi rakip aranır; 10 saniye içinde bulunamazsa sunucudaki AI oyuncu aynı maç protokolünü devralır.":"An online opponent is searched first. If none is found within 10 seconds, the server AI takes over through the same match protocol.",
    "Çekirdek ve jeneratör sabittir; diğer iki başlangıç modülünü sen seçersin.":"Core and Generator are fixed; you choose the other two starting modules.",
    "Dokun, sonra yerleştir":"Tap, then place",
    "15. saniyede Modül Rafını aç. Bir modüle dokun, boş hücreyi seç; Döndür ve Rafa Al düğmeleriyle düzenle.":"Open the Module Shelf at 15 seconds. Tap a module, choose an empty cell, then use Rotate and Return to Shelf to adjust it.",
    "Masaüstünde sürükle-bırak da kullanılmaya devam eder.":"Drag and drop remains available on desktop.",
    "Tamamla":"Finish",
    "Uygulanıyor...":"Applying...",
    "Bu adım henüz tamamlanmadı.":"This step is not complete yet.",
    "AI Rakip":"AI Opponent",
    "Saldırı Hücresi":"Attack Cell",
    "Savunma Hücresi":"Defense Cell",
    "Onarım Hücresi":"Repair Cell",
    "Soğutma Hücresi":"Cooling Cell",
    "Sinyal Hücresi":"Signal Cell",
    "Enerji Hücresi":"Energy Cell",
    "Rakip Çekirdek":"Opponent Core",
    "GALİBİYET":"VICTORY",
    "DEVRE ÜSTÜNLÜĞÜ SENİN":"CIRCUIT SUPERIORITY IS YOURS",
    "MAĞLUBİYET":"DEFEAT",
    "DEVREN SAVAŞ DIŞI KALDI":"YOUR CIRCUIT WAS KNOCKED OUT",
    "BERABERLİK":"DRAW",
    "İKİ DEVRE DE AYAKTA KALDI":"BOTH CIRCUITS SURVIVED",
    "Çekirdek yok edildi":"Core destroyed",
    "Savaştan çekilme":"Battle forfeited",
    "Süre sonu üstünlüğü":"Time-limit advantage",
    "Süre sonu beraberliği":"Time-limit draw",
    "Çifte çekirdek yıkımı":"Double Core destruction",
    "Eşzamanlı çekirdek yıkımı":"Simultaneous Core destruction",
    "Savaş tamamlandı":"Battle complete",
    "Maç tamamlandı · Galibiyet":"Match complete · Victory",
    "Maç tamamlandı · Mağlubiyet":"Match complete · Defeat",
    "Maç tamamlandı · Beraberlik":"Match complete · Draw",
    "Maç tamamlandı · Savaşı bıraktın":"Match complete · You forfeited",
    "KAZANDIN · Rakip Çekirdek yok edildi":"YOU WON · Opponent Core destroyed",
    "KAYBETTİN · Çekirdeğin yok edildi":"YOU LOST · Your Core was destroyed",
  });

  const TR = Object.freeze(
    Object.fromEntries(
      Object.entries(EN).map(([turkish, english]) => [english, turkish])
    )
  );
  let activeLanguage = "tr";
  let observer = null;

  function translatePatterns(value, language) {
    if (language === "en") {
      return value
        .replace(/^(Enerji|Saldırı|Savunma|Destek|Sabotaj) · (\d+) ▾$/u, (_, category, count) => `${EN[category] || category} · ${count} ▾`)
        .replace(/^(.+) \+ (Enerji|Saldırı|Savunma|Destek|Sabotaj)$/u, (_, name, category) => `${name} + ${EN[category] || category}`)
        .replace(/^(.+) ◆ (Enerji|Saldırı|Savunma|Destek|Sabotaj)$/u, (_, name, category) => `${name} ◆ ${EN[category] || category}`)
        .replace(/^Seviye (\d+) · Lig: ([^·]+) · (\d+) RP$/u, "Level $1 · League: $2 · $3 RP")
        .replace(/^Maç (\d+) · Galibiyet (\d+) · Mağlubiyet (\d+) · Beraberlik (\d+) · Galibiyet %(\d+)$/u, "Matches $1 · Wins $2 · Losses $3 · Draws $4 · Win rate $5%")
        .replace(/^Devre Kredisi: (.+)$/u, "Circuit Credits: $1")
        .replace(/Çekirdek/gu, "Core")
        .replace(/Jeneratör/gu, "Generator")
        .replace(/Modül (\d+)/gu, "Modules $1")
        .replace(/^Hücre (\d+),(\d+)$/u, "Cell $1,$2")
        .replace(/^(.+) sabit başlangıç modülüdür\.$/u, "$1 is a fixed starting module.")
        .replace(/^Modül müdahalesi ([\d.]+) sn sonra açılacak\.$/u, "Module interaction unlocks in $1 sec.")
        .replace(/Gümüş/gu, "Silver")
        .replace(/Core yok edildi/gu, "Core destroyed")
        .replace(/([\d.]+) sn\b/gu, "$1 sec");
    }
    return value
      .replace(/^(Energy|Attack|Defense|Support|Sabotage) · (\d+) ▾$/u, (_, category, count) => `${TR[category] || category} · ${count} ▾`)
      .replace(/^(.+) \+ (Energy|Attack|Defense|Support|Sabotage)$/u, (_, name, category) => `${name} + ${TR[category] || category}`)
      .replace(/^(.+) ◆ (Energy|Attack|Defense|Support|Sabotage)$/u, (_, name, category) => `${name} ◆ ${TR[category] || category}`)
      .replace(/^Level (\d+) · League: ([^·]+) · (\d+) RP$/u, "Seviye $1 · Lig: $2 · $3 RP")
      .replace(/^Matches (\d+) · Wins (\d+) · Losses (\d+) · Draws (\d+) · Win rate (\d+)%$/u, "Maç $1 · Galibiyet $2 · Mağlubiyet $3 · Beraberlik $4 · Galibiyet %$5")
      .replace(/^Circuit Credits: (.+)$/u, "Devre Kredisi: $1")
      .replace(/Core/gu, "Çekirdek")
      .replace(/Generator/gu, "Jeneratör")
      .replace(/Modules (\d+)/gu, "Modül $1")
      .replace(/^Cell (\d+),(\d+)$/u, "Hücre $1,$2")
      .replace(/^(.+) is a fixed starting module\.$/u, "$1 sabit başlangıç modülüdür.")
      .replace(/^Module interaction unlocks in ([\d.]+) sec\.$/u, "Modül müdahalesi $1 sn sonra açılacak.")
      .replace(/Silver/gu, "Gümüş");
  }

  function translateText(value, language = activeLanguage) {
    const normalized = language === "en" ? "en" : "tr";
    const direct = normalized === "en" ? EN[value] : TR[value];
    return translatePatterns(direct || value, normalized);
  }

  function translateTextNode(node) {
    const raw = node.nodeValue || "";
    const leading = raw.match(/^\s*/u)?.[0] || "";
    const trailing = raw.match(/\s*$/u)?.[0] || "";
    const value = raw.trim();
    if (!value) return;
    const translated = translateText(value);
    if (translated !== value) {
      node.nodeValue = `${leading}${translated}${trailing}`;
    }
  }

  function translateElement(root) {
    if (!root || typeof document === "undefined") return;
    if (root.nodeType === 3) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;

    if (root.nodeType === 1) {
      const elements = [root, ...root.querySelectorAll("[aria-label],[title],[placeholder]")];
      for (const element of elements) {
        for (const attribute of ["aria-label", "title", "placeholder"]) {
          const value = element.getAttribute(attribute);
          if (!value) continue;
          const translated = translateText(value);
          if (translated !== value) element.setAttribute(attribute, translated);
        }
      }
    }

    const walker = document.createTreeWalker(root, 4);
    let node = walker.nextNode();
    while (node) {
      translateTextNode(node);
      node = walker.nextNode();
    }
  }

  function apply(language) {
    activeLanguage = language === "en" ? "en" : "tr";
    if (typeof document === "undefined") return activeLanguage;
    document.documentElement.lang = activeLanguage;
    translateElement(document.body);

    if (!observer && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "characterData") translateTextNode(record.target);
          if (record.type === "attributes") translateElement(record.target);
          for (const node of record.addedNodes || []) translateElement(node);
        }
      });
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["aria-label", "title", "placeholder"],
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    return activeLanguage;
  }

  const api = Object.freeze({ EN, apply, translateText });
  global.GridshardI18n = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
