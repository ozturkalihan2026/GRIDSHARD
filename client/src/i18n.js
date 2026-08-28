(function (global) {
  "use strict";

  const EN = Object.freeze({
    "GÜNCEL YAPI":"CURRENT BUILD",
    "manifest bekleniyor":"waiting for manifest",
    "Ana Menü":"Main Menu",
    "Ana Menüye Dön":"Return to Main Menu",
    "EV":"HOME",
    "Ana gezinme":"Main navigation",
    "Oyna":"Play",
    "Profil":"Profile",
    "İstatistikler":"Statistics",
    "Ayarlar":"Settings",
    "İLERLEME HATTI":"PROGRESSION LINE",
    "Oyuncu ve sezon ilerlemesi":"Player and season progression",
    "Sezon ilerlemesi":"Season progression",
    "Oyuncu kaynakları":"Player resources",
    "Ana menü sezon ilerlemesi":"Main menu season progression",
    "OPERATÖR":"OPERATOR",
    "GÜNLÜK DÖNGÜ":"DAILY LOOP",
    "SEZON SIFIR":"SEASON ZERO",
    "3 devre emri hazır":"3 circuit orders ready",
    "PROFİLDE AÇ":"OPEN IN PROFILE",
    "REKABET":"COMPETITION",
    "Turnuva":"Tournament",
    "Sezon sonrası açılacak":"Unlocks after the season",
    "YAKINDA":"COMING SOON",
    "ÖDÜLLERİ GÖR":"VIEW REWARDS",
    "10 ücretsiz kademe":"10 free tiers",
    "KOLEKSİYON":"COLLECTION",
    "Mağaza":"Store",
    "Ekonomi doğrulanınca açılacak":"Unlocks after economy validation",
    "DEVRE AR-GE":"CIRCUIT R&D",
    "Devre Laboratuvarı":"Circuit Laboratory",
    "Akı ile favori modüllerini kalibre et":"Calibrate favorite modules with Flux",
    "DEVRE AR-GE · BETA PROGRAMI":"CIRCUIT R&D · BETA PROGRAM",
    "Akı Parçalarını favori modüllerinin deneysel kalibrasyonuna yatır.":"Invest Flux Shards in experimental calibration for your favorite modules.",
    "AKI BAKİYESİ":"FLUX BALANCE",
    "Rekabet bütünlüğü korunur.":"Competitive integrity is protected.",
    "Dereceli PvP daima":"Ranked PvP always runs with",
    "çalışır; kalibrasyon gücü dereceli savaş snapshot'ına uygulanmaz.":"; calibration power is not applied to ranked battle snapshots.",
    "KATALOG":"CATALOG",
    "24 Modül":"24 Modules",
    "Seviye 0–3":"Levels 0–3",
    "KAYIT DEFTERİ":"LEDGER",
    "Akı İşlemleri":"Flux Transactions",
    "Ücretsiz Sıfırla":"Free Reset",
    "Beta boyunca sıfırlama ücretsizdir ve yatırılan Akıyı iade eder.":"Resets are free during Beta and refund invested Flux.",
    "MEVCUT":"CURRENT",
    "SONRAKİ":"NEXT",
    "Temel değerler":"Base values",
    "Kategori verimliliği":"Category efficiency",
    "İlk anlamlı yükseltme 1. sezon kademesindeki 25 Akı ile açılır.":"The first meaningful upgrade unlocks with 25 Flux from season tier 1.",
    "Henüz laboratuvar işlemi yok.":"No laboratory transactions yet.",
    "En Yüksek Kalibrasyon":"Maximum Calibration",
    "Ücretsiz Beta Sıfırlaması":"Free Beta Reset",
    "Tüm kalibrasyonlar":"All calibrations",
    "Takım":"Team",
    "TAKIM":"TEAM",
    "Yakında":"Coming soon",
    "Devreni kur · çekirdeği kır":"Build your circuit · break the core",
    "OPERATÖR TERMİNALİ":"OPERATOR TERMINAL",
    "Oyuncu kimliği, ilerleme ve savaş hazırlığı.":"Player identity, progression and battle readiness.",
    "Genel · İlerleme · Sezon · Savaş Havuzu ·":"Overview · Progression · Season · Battle Pool ·",
    "Genel · İlerleme · Savaş Havuzu ·":"Overview · Progression · Battle Pool ·",
    "SEZON SIFIR · ÜCRETSİZ ÖDÜL YOLU":"SEASON ZERO · FREE REWARD TRACK",
    "Çekirdek Uyanışı":"Core Awakening",
    "Savaş, canlı devre hamlesi ve günlük görevlerle Sezon XP kazan.":"Earn Season XP through battles, live circuit actions, and daily missions.",
    "AKI PARÇASI":"FLUX SHARDS",
    "Gelecek kozmetik ödülleri için birikir.":"Saved for future cosmetic rewards.",
    "DEVRE KREDİSİ":"CIRCUIT CREDITS",
    "Savaşta modül yerleştirmek için kullanılır.":"Used to place modules during battle.",
    "Devre Çırağı":"Circuit Apprentice",
    "Devre Öncüsü":"Circuit Vanguard",
    "Kırık Avcısı":"Shard Hunter",
    "Çekirdek Muhafızı":"Core Guardian",
    "Sezon kademe ilerlemesi":"Season tier progress",
    "GÜNLÜK GÖREVLER":"DAILY MISSIONS",
    "Günlük Görevler":"Daily Missions",
    "Bugünün Devre Emirleri":"Today's Circuit Orders",
    "Her gün UTC 00:00'da yenilenir":"Refreshes daily at 00:00 UTC",
    "Bugünün devre emirlerini tamamla, SXP ve Akı Parçası kazan.":"Complete today's circuit orders to earn SXP and Flux Shards.",
    "BUGÜN":"TODAY",
    "3 görev aktif":"3 missions active",
    "Tamamlanan görevlerin ödüllerini buradan al.":"Claim completed mission rewards here.",
    "ÖDÜL YOLU":"REWARD TRACK",
    "Ödül Yolu":"Reward Track",
    "10 Kademe":"10 Tiers",
    "10 KADEME":"10 TIERS",
    "Ücretli geçiş yok":"No paid track",
    "Sezon Ödülleri":"Season Rewards",
    "Çekirdek Uyanışı boyunca kademeleri aç ve sunucu doğrulamalı ödüllerini al.":"Unlock tiers throughout Core Awakening and claim server-verified rewards.",
    "Açılan kademelerin ödüllerini buradan al.":"Claim rewards from unlocked tiers here.",
    "Tamamlanan görev ve kademelerin ödüllerini buradan al.":"Claim completed mission and tier rewards here.",
    "Devreyi Ateşle":"Power the Circuit",
    "2 savaş tamamla.":"Complete 2 battles.",
    "Çekirdeğe Baskı":"Core Pressure",
    "Rakip devrelere toplam 1000 hasar ver.":"Deal 1000 total damage to opponent circuits.",
    "Canlı Strateji":"Live Strategy",
    "Savaşta 3 modül taşı, değiştir, takas et veya döndür.":"Move, replace, swap, or rotate modules 3 times in battle.",
    "Ödülü Al":"Claim Reward",
    "Alındı":"Claimed",
    "Devam Ediyor":"In Progress",
    "Al":"Claim",
    "Kilitli":"Locked",
    "Ödül sunucuda doğrulanıyor…":"Verifying reward on server…",
    "Ödül alındı ve profil hesabına kaydedildi.":"Reward claimed and saved to your profile.",
    "Ödül alınamadı.":"Reward could not be claimed.",
    "BAŞLANGIÇ STRATEJİNİ SEÇ":"CHOOSE YOUR STARTING STRATEGY",
    "Yerel önizleme":"Local preview",
    "Görünen Oyuncu Adı":"Display Name",
    "Görünen Adı Kaydet":"Save Display Name",
    "Web Test Kimliği hazırlanıyor…":"Preparing Web Test identity…",
    "Hesap: Hazır değil":"Account: Not ready",
    "Hesap: Sunucuda hazırlanıyor":"Account: Preparing on server",
    "Hesap: Hazır":"Account: Ready",
    "Hesap: Sunucu bağlantı hatası":"Account: Server connection error",
    "Oturum Sürekliliği: Kontrol bekliyor":"Session continuity: Waiting for check",
    "Oturum Sürekliliği: Doğrulandı":"Session continuity: Verified",
    "Oturum Sürekliliği: Kimlik uyuşmazlığı":"Session continuity: Identity mismatch",
    "Web Test Kimliği":"Web Test Identity",
    "Derece Puanı":"Rating Points",
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
    "ÜRÜN BİLGİSİ":"PRODUCT INFORMATION",
    "Hakkında":"About",
    "GRIDSHARD · Devreni kur, çekirdeği kır.":"GRIDSHARD · Build your circuit, break the core.",
    "Sürüm":"Version",
    "Yapı":"Build",
    "Alınabilir günlük görev ödülü":"Daily mission reward available",
    "Alınabilir ödül yolu ödülü":"Reward track prize available",
    "Bağlantı / Oturum Durumu":"Connection / Session Status",
    "Yeniden Dene":"Retry",
    "Savaşa Hazırlık":"Battle Preparation",
    "AI RAKİBİ":"AI OPPONENT",
    "AI Arketipi":"AI Archetype",
    "Saldırgan":"Aggressive",
    "Savunmacı":"Defensive",
    "Dengeli":"Balanced",
    "Sabotaj":"Sabotage",
    "Ekonomi":"Economy",
    "Sabotaj Odaklı":"Sabotage",
    "Ekonomi Odaklı":"Economy",
    "Savaş Havuzu Oluştur":"Build Battle Pool",
    "Sınıf başlıklarını açıp kapat. Soldan modülü incele. + ile ekle, − ile çıkar; ◆ Jeneratörün zorunlu ve kilitli olduğunu gösterir. Çıkarma işlemi seçili Savaş Havuzundaki − simgesinden yapılır.":"Expand or collapse class headings. Inspect a module on the left. Add with + and remove with −; ◆ marks the required, locked Generator. Remove modules from the selected Battle Pool with its − control.",
    "Kısa Eğitim":"Quick Tutorial",
    "Hazır Havuzları Yönet":"Manage Presets",
    "Başlangıç Devresi":"Starting Circuit",
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
    "Henüz hazır havuz yok. 18/18 seçim yaptıktan sonra ilk loadout'unu kaydet.":"No presets yet. Complete an 18/18 selection to save your first loadout.",
    "Yerleşik başlangıç havuzu":"Built-in Starting Circuit",
    "Yerleşik başlangıç havuzu silinemez.":"The built-in Starting Circuit cannot be deleted.",
    "Yerleşik başlangıç havuzu yeniden adlandırılamaz.":"The built-in Starting Circuit cannot be renamed.",
    "Favoriden çıkar":"Remove from favorites",
    "Favoriye ekle":"Add to favorites",
    "Aktif":"Active",
    "Yükle":"Load",
    "Henüz kullanılmadı":"Never used",
    "Az önce kullanıldı":"Used just now",
    "Kayıtla aynı":"Matches saved preset",
    "Değiştirildi":"Modified",
    "Yeni Hazır Havuzu Kaydet":"Save New Preset",
    "Yerleşik Hazır Havuz":"Built-in Preset",
    "Hazır Havuz Güncel":"Preset Up to Date",
    "Değişiklikleri Üzerine Kaydet":"Overwrite with Changes",
    "Kaydetmek için havuz 18/18 olmalı.":"The pool must be 18/18 before saving.",
    "Hazır havuza bir isim ver.":"Give the preset a name.",
    "Hazır havuzlar alınamadı.":"Presets could not be retrieved.",
    "Hazır havuzlar yüklenemedi.":"Presets could not be loaded.",
    "Henüz kayıtlı hazır havuz yok.":"There are no saved presets yet.",
    "Sunucu kaydı kabul etmedi.":"The server rejected the save.",
    "Hazır havuz silinemedi.":"The preset could not be deleted.",
    "Yeniden adlandırmak için hazır havuz seç.":"Select a preset to rename.",
    "Yeni hazır havuz adını yaz.":"Enter the new preset name.",
    "Hazır havuz yeniden adlandırılamadı.":"The preset could not be renamed.",
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
    "Modül port önizlemesi":"Module port preview",
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
    "Eşleştiriliyor":"Matching",
    "Eşleştirmeyi İptal Et":"Cancel Matchmaking",
    "Eşleştirmeyi iptal et":"Cancel matchmaking",
    "İptal Et":"Cancel",
    "İptal ediliyor…":"Cancelling…",
    "Önce Maç Modu Seç":"Choose a Match Mode First",
    "Geçici Güçlendiriciler":"Temporary Boosters",
    "Güçlendiriciler":"Boosters",
    "Modülü sürükle veya seçip hedef hücreye dokun.":"Drag a module or select it, then tap a target cell.",
    "Maç sonucu":"Match result",
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
    "İlk güçlendirici 30. saniyede":"First booster at 30 seconds",
    "HAZIR · 3 seçenekten 1'ini seç":"READY · Choose 1 of 3 options",
    "Hedef modül seç":"Choose a target module",
    "Uygun, parlayan modüle bırak":"Drop onto an eligible glowing module",
    "Sunucu hedefi doğruluyor…":"Server is validating the target…",
    "Maç tamamlandı":"Match complete",
    "Aşırı Yük Çipi":"Overcharge Chip",
    "Acil Onarım":"Emergency Repair",
    "Çift Port Adaptörü":"Dual Port Adapter",
    "+%25 saldırı · 15 sn":"+25% attack · 15 sec",
    "%25 anlık onarım":"25% instant repair",
    "+1 geçici port · 15 sn":"+1 temporary port · 15 sec",
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
    "Beta.34 · 10 sn AI Devralma · Oyuncu Kontrollü Portlar · Kesintisiz Ses · Tam Dil Desteği":"Beta.34 · 10 sec AI Takeover · Player-Controlled Ports · Seamless Audio · Full Language Support",
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
    "Galibiyet":"Victory",
    "Mağlubiyet":"Defeat",
    "Beraberlik":"Draw",
    "Dereceli PvP":"Ranked PvP",
    "Derecesiz AI":"Unranked AI",
    "Yerel Test":"Local Test",
    "Derece puanı değişmedi":"Rating unchanged",
    "DP hesaplanıyor":"Calculating RP",
    "XP hesaplanıyor":"Calculating XP",
    "KAYBETTİN · Savaşı bıraktın":"YOU LOST · You forfeited",
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
        .replace(/^Devrede (\d+) · Boş Hak (\d+) · Sınır (\d+)\/10 · Yeni Hak (\d+) sn$/u, "On Circuit $1 · Open Slots $2 · Limit $3/10 · New Slot in $4 sec")
        .replace(/^Devrede (\d+) · Boş Hak (\d+) · Üst Sınır (\d+)$/u, "On Circuit $1 · Open Slots $2 · Maximum $3")
        .replace(/^Yeni modül hakkı açıldı · Sınır (\d+)\/10$/u, "New module slot unlocked · Limit $1/10")
        .replace(/^(.+) · Seviye (\d+) · ([^·]+) · (\d+) Derece Puanı · (\d+) XP$/u, (_, name, level, league, rating, xp) => `${name} · Level ${level} · ${EN[league.trim()] || league.trim()} · ${rating} Rating Points · ${xp} XP`)
        .replace(/^Web Test Kimliği: (.+)$/u, "Web Test Identity: $1")
        .replace(/^(\d+) sn sonra açılır$/u, "Unlocks in $1 sec")
        .replace(/^(\d+) hazır havuz kayıtlı$/u, "$1 presets saved")
        .replace(/^(\d+) modül · (.+)$/u, (_, count, tail) => `${count} modules · ${EN[tail] || tail}`)
        .replace(/^(.+) · (\d+) modül · (.+)$/u, (_, name, count, tail) => `${name} · ${count} modules · ${EN[tail] || tail}`)
        .replace(/^(.+) kaydedildi\.$/u, "$1 saved.")
        .replace(/^(.+) yüklendi; istersen modülleri değiştirebilirsin\.$/u, "$1 loaded; you can change its modules.")
        .replace(/^(.+) silindi\.$/u, "$1 deleted.")
        .replace(/^(.+) → (.+) olarak değiştirildi\.$/u, "$1 → renamed to $2.")
        .replace(/^Aktif hazır havuz: (.+)$/u, "Active preset: $1")
        .replace(/^(Enerji|Saldırı|Savunma|Destek|Sabotaj) · (\d+) ▾$/u, (_, category, count) => `${EN[category] || category} · ${count} ▾`)
        .replace(/^(.+) \+ (Enerji|Saldırı|Savunma|Destek|Sabotaj)$/u, (_, name, category) => `${name} + ${EN[category] || category}`)
        .replace(/^(.+) ◆ (Enerji|Saldırı|Savunma|Destek|Sabotaj)$/u, (_, name, category) => `${name} ◆ ${EN[category] || category}`)
        .replace(/^KAYNAK ([\d.]+) Ü$/u, "SOURCE $1 U")
        .replace(/^AKIŞ ([\d.]+) Ü$/u, "FLOW $1 U")
        .replace(/^ENERJİ YOK$/u, "NO ENERGY")
        .replace(/^(\d+) devre emri aktif$/u, "$1 circuit orders active")
        .replace(/^(\d+) modül kalibre edildi$/u, "$1 modules calibrated")
        .replace(/^SV (\d+) \/ (\d+)$/u, "LV $1 / $2")
        .replace(/^Yatırım (\d+)$/u, "Invested $1")
        .replace(/^(\d+) Akı ile Kalibre Et$/u, "Calibrate for $1 Flux")
        .replace(/^(\d+) Akı Gerekli$/u, "$1 Flux Required")
        .replace(/^Seviye (\d+) · Lig: ([^·]+) · (\d+) RP$/u, "Level $1 · League: $2 · $3 RP")
        .replace(/^(.+) · Seviye (\d+) · Lig: ([^·]+) · (\d+) RP$/u, (_, title, level, league, rating) => `${EN[title] || title} · Level ${level} · League: ${EN[league.trim()] || league.trim()} · ${rating} RP`)
        .replace(/^Kademe (\d+) \/ (\d+)$/u, "Tier $1 / $2")
        .replace(/^(\d+) \/ (\d+) Sezon XP$/u, "$1 / $2 Season XP")
        .replace(/^KADEME (\d+)$/u, "TIER $1")
        .replace(/Akı Parçası/gu, "Flux Shards")
        .replace(/ Akı$/gu, " Flux")
        .replace(/Dereceli PvP/gu, "Ranked PvP")
        .replace(/Derecesiz AI/gu, "Unranked AI")
        .replace(/Yerel Test/gu, "Local Test")
        .replace(/Derece puanı değişmedi/gu, "Rating unchanged")
        .replace(/Savaşı bıraktın/gu, "You forfeited")
        .replace(/DK ceza/gu, "CC penalty")
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
      .replace(/^On Circuit (\d+) · Open Slots (\d+) · Limit (\d+)\/10 · New Slot in (\d+) sec$/u, "Devrede $1 · Boş Hak $2 · Sınır $3/10 · Yeni Hak $4 sn")
      .replace(/^On Circuit (\d+) · Open Slots (\d+) · Maximum (\d+)$/u, "Devrede $1 · Boş Hak $2 · Üst Sınır $3")
      .replace(/^New module slot unlocked · Limit (\d+)\/10$/u, "Yeni modül hakkı açıldı · Sınır $1/10")
      .replace(/^(.+) · Level (\d+) · ([^·]+) · (\d+) Rating Points · (\d+) XP$/u, (_, name, level, league, rating, xp) => `${name} · Seviye ${level} · ${TR[league.trim()] || league.trim()} · ${rating} Derece Puanı · ${xp} XP`)
      .replace(/^Web Test Identity: (.+)$/u, "Web Test Kimliği: $1")
      .replace(/^Unlocks in (\d+) sec$/u, "$1 sn sonra açılır")
      .replace(/^(\d+) presets saved$/u, "$1 hazır havuz kayıtlı")
      .replace(/^(\d+) modules · (.+)$/u, (_, count, tail) => `${count} modül · ${TR[tail] || tail}`)
      .replace(/^(.+) saved\.$/u, "$1 kaydedildi.")
      .replace(/^(.+) loaded; you can change its modules\.$/u, "$1 yüklendi; istersen modülleri değiştirebilirsin.")
      .replace(/^(.+) deleted\.$/u, "$1 silindi.")
      .replace(/^(.+) → renamed to (.+)\.$/u, "$1 → $2 olarak değiştirildi.")
      .replace(/^Active preset: (.+)$/u, "Aktif hazır havuz: $1")
      .replace(/^(Energy|Attack|Defense|Support|Sabotage) · (\d+) ▾$/u, (_, category, count) => `${TR[category] || category} · ${count} ▾`)
      .replace(/^(.+) \+ (Energy|Attack|Defense|Support|Sabotage)$/u, (_, name, category) => `${name} + ${TR[category] || category}`)
      .replace(/^(.+) ◆ (Energy|Attack|Defense|Support|Sabotage)$/u, (_, name, category) => `${name} ◆ ${TR[category] || category}`)
      .replace(/^SOURCE ([\d.]+) U$/u, "KAYNAK $1 Ü")
      .replace(/^FLOW ([\d.]+) U$/u, "AKIŞ $1 Ü")
      .replace(/^NO ENERGY$/u, "ENERJİ YOK")
      .replace(/^(\d+) circuit orders active$/u, "$1 devre emri aktif")
      .replace(/^Level (\d+) · League: ([^·]+) · (\d+) RP$/u, "Seviye $1 · Lig: $2 · $3 RP")
      .replace(/^(.+) · Level (\d+) · League: ([^·]+) · (\d+) RP$/u, (_, title, level, league, rating) => `${TR[title] || title} · Seviye ${level} · Lig: ${TR[league.trim()] || league.trim()} · ${rating} RP`)
      .replace(/^Tier (\d+) \/ (\d+)$/u, "Kademe $1 / $2")
      .replace(/^(\d+) \/ (\d+) Season XP$/u, "$1 / $2 Sezon XP")
      .replace(/^TIER (\d+)$/u, "KADEME $1")
      .replace(/Flux Shards/gu, "Akı Parçası")
      .replace(/ Flux$/gu, " Akı")
      .replace(/Ranked PvP/gu, "Dereceli PvP")
      .replace(/Unranked AI/gu, "Derecesiz AI")
      .replace(/Local Test/gu, "Yerel Test")
      .replace(/Rating unchanged/gu, "Derece puanı değişmedi")
      .replace(/You forfeited/gu, "Savaşı bıraktın")
      .replace(/CC penalty/gu, "DK ceza")
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
