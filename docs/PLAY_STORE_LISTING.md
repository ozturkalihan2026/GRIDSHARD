# GRIDSHARD — Google Play mağaza girişi

Play Console → Kullanıcı sayısını artırın → Play Store'daki varlığı → Mağaza girişleri → Varsayılan mağaza girişi (tr-TR) için metinler ve görsellerin kaydı. İngilizce metinler ve görseller, konsolda İngilizce (en-US) çevirisi eklenirse kullanılır.

**Durum (7 Ekim 2026):** metinler ve görseller hazırlandı; konsola yüklenmedi. Yüklemeyi ve kaydı kullanıcı yapar.

## Uyulan kurallar

7 Ekim 2026'da Google'ın iki yardım sayfası okundu: meta veri politikası (`support.google.com/googleplay/android-developer/answer/9898842`) ve önizleme öğeleri (`.../answer/9866151`). Metinleri ve görselleri bağlayanlar:

- Kısa açıklama en çok 80 karakterdir. Tek cümleyse sonuna nokta konmaz. Özel karakter, emoji, yinelenen noktalama ve vurgu için büyük harf kullanılmaz. Uygulama adı, mağazadaki ad da büyük harfli olduğu için büyük yazılabilir.
- Hiçbir metin ve görselde sıralama, ödül, indirme sayısı, fiyat ya da indirim iddiası ("en iyi", "1 numara", "yeni", "ücretsiz", "indirim") ve "hemen indir / şimdi oyna" gibi çağrı bulunmaz. Kullanıcı yorumu alıntılanmaz, anahtar kelime listesi yazılmaz.
- Tam açıklama en çok 4000 karakterdir; kısa, doğru ve yalın olmalıdır.
- Özellik grafiği 1024×500, JPEG ya da alfasız 24 bit PNG'dir. Önemli öğeler ortada durur, kenarlar kırpılabilir. Simgeye benzeyen büyük bir marka görseli, cihaz çerçevesi ve mağaza rozeti kullanılmaz.
- Ekran görüntüleri JPEG ya da alfasız 24 bit PNG'dir; kenarlar 320–3840 piksel, uzun kenar kısa kenarın en çok iki katıdır. Oyunlarda öne çıkarılma için en az üç adet 9:16 dikey (en az 1080×1920) ve oyunun kendisini gösteren görüntü gerekir. Görüntüler oyunun gerçek ekranları olmalıdır.
- Hedef kitle 13 yaş ve üzeri seçildiği için görsellerde küçük çocuklara hitap eden karakter ya da görsel yoktur (`docs/CHILD_AUDIENCE_AUDIT.md`).

## Metinler

Açıklamadaki her özellik koddan, oyunun ekranlarından ya da `docs/GRIDSHARD_2_1_KANONIK_TASARIM.md` belgesinden doğrulandı: 36 modül, 5 sınıf, 7 çekirdek, 12 arena, dört haftalık sezon, yapay zekâ rakibe düşen eşleştirme, hazır mesajlı sohbet, sandık olasılıkları, ebeveyn denetimi. Gerçek cihazda doğrulanmamış özellikler (Google Play Games ile giriş) ve kapalı olanlar (gerçek parayla satın alma, reklam) açıklamaya yazılmadı. Oyun değişirse açıklama da güncellenmelidir.

### Uygulama adı

```text
GRIDSHARD
```

### Kısa açıklama (Türkçe)

```text
Modül kartlarıyla devreni kur, gerçek zamanlı savaşta rakip çekirdeği yık
```

### Tam açıklama (Türkçe)

```text
GRIDSHARD, dikey ekranda oynanan gerçek zamanlı bir devre savaşı oyunudur. Altı modül kartından oluşan desteni ve çekirdeğini seç, savaş sürerken modüllerini devre tahtana yerleştir ve rakibinin çekirdeğini devre dışı bırak.

Savaş nasıl işler

Her oyuncunun 15 hücrelik bir devre tahtası vardır; ortasında çekirdek durur. Savaş boyunca Akım birikir. Yeterli Akımın olduğunda destendeki bir karta dokunursun, modül tahtandaki boş bir hücreye yerleşir ve çalışmaya başlar. Savaş sen karar verirken durmaz: saldırı modülleri ateş eder, savunma modülleri korur, destek modülleri onarır ve güçlendirir, sabotaj modülleri rakibin düzenini bozar. Çekirdeğinin gücü dolduğunda tek dokunuşla bütün devreni etkileyen özel gücünü kullanırsın. Çekirdeği önce tükenen taraf kaybeder.

Desteni kur

• Beş sınıfta 36 modül: Saldırı, Savunma, Destek, Sistem ve Sabotaj.
• Her biri farklı bir özel güce sahip 7 çekirdek.
• Modüllerini parçalarla yükselt, yeteneklerini kendi tarzına göre seç.
• Enderlik gizli güç vermez: ender kartlar farklı kurallarla oynar ve başka taktiklere kapı açar.

Arenalarda yüksel

• 12 arenalık Devre Yolu: kupa kazandıkça modüller, çekirdekler ve ödüller açılır.
• Arenaların ardından ligler ve dört haftalık sezonlar gelir.
• Günlük görevler, günlük giriş ödülleri ve sezon ödül yolu ilerlemeni hızlandırır.
• Kupa sayına yakın oyuncularla eşleşirsin; uygun rakip bulunamazsa yapay zekâ rakiple oynarsın.

Birlikte oyna

• Takım kur ya da bir takıma katıl, takım arkadaşlarınla modül parçası paylaş.
• Haftalık turnuvada ve takımlar arası turnuvada sıralamaya gir.
• Arkadaşlarınla kupa kaybetmeden dostluk maçı yap.
• Sohbette yalnız hazır mesajlar kullanılır.

Bilmen gerekenler

• Oyun internet bağlantısı gerektirir.
• Hesap oluşturmadan misafir olarak oynayabilirsin.
• Oyun dili Türkçe ve İngilizcedir.
• Mağazadaki sandıkların içeriği ve olasılıkları satın almadan önce gösterilir.
• Ebeveynler, Ayarlar ekranından belirledikleri şifreyle sohbeti ve arkadaşlık isteklerini kapatabilir.

Destek: gridshardgame@gmail.com
Site: https://gridshardgame.com
```

### Kısa açıklama (İngilizce)

```text
Build your circuit with module cards and break the rival core in real time
```

### Tam açıklama (İngilizce)

```text
GRIDSHARD is a real-time circuit battle game played in portrait. Choose a deck of six module cards and a core, place your modules on your circuit board while the battle runs, and shut down your opponent's core.

How a battle works

Each player has a 15-cell circuit board with a core at its center. Current builds up throughout the battle. When you have enough Current, tap a card in your deck: the module lands on an empty cell of your board and starts working. The battle never waits for your decision. Attack modules fire, defense modules protect, support modules repair and boost, and sabotage modules disrupt your opponent. When your core is charged, one tap releases its special power across your whole circuit. The player whose core runs out first loses.

Build your deck

• 36 modules in five classes: Attack, Defense, Support, System and Sabotage.
• 7 cores, each with a different special power.
• Upgrade modules with shards and pick talents that suit your play style.
• Rarity adds no hidden power: rarer cards play by different rules and open up different tactics.

Climb the arenas

• A 12-arena Circuit Road: winning trophies unlocks modules, cores and rewards.
• Leagues and four-week seasons follow the arenas.
• Daily missions, daily login rewards and the season reward track speed up your progress.
• You are matched with players near your trophy count; if no suitable opponent is found, you play against an AI opponent.

Play together

• Create or join a team and share module shards with teammates.
• Compete in the weekly tournament and the team tournament.
• Play friendly matches with friends without risking trophies.
• Chat uses preset messages only.

Good to know

• An internet connection is required.
• You can play as a guest without creating an account.
• The game is available in Turkish and English.
• Chest contents and odds are shown in the shop before you buy.
• Parents can turn off chat and friend requests in Settings with a passcode they set.

Support: gridshardgame@gmail.com
Website: https://gridshardgame.com
```

## Görseller

Dosyalar `artifacts/play-store-listing-20261007/` altındadır (git'te izlenmez; 7 Ekim'de iş bilgisayarında üretildi). Türkçe set `tr-TR/`, İngilizce set `en-US/` klasöründedir; açıklama metinlerinin kopyaları da aynı klasörlerdedir.

| Öğe | Dosya | Biçim |
|---|---|---|
| Uygulama simgesi | `client/assets/branding/gridshard-store-icon-512.png` (depoda) | 512×512, PNG, 234 KB |
| Özellik grafiği | `feature-graphic-1024x500.png` | 1024×500, 24 bit PNG |
| Telefon ekran görüntüleri | `phone/01…08-*.png` | 1080×1920 (9:16), 24 bit PNG, her biri 1,5 MB altında |

Ekran görüntülerinin sırası ve isteğe bağlı alternatif metinleri (en çok 140 karakter):

| Sıra | Ekran | Alternatif metin (Türkçe) | Alternatif metin (İngilizce) |
|---|---|---|---|
| 1 | Savaş | İki devre tahtasında modüller karşılıklı ateş ediyor; altta altı kartlık deste ve Akım göstergesi | Modules fire across two circuit boards; the six-card deck and Current meter sit below |
| 2 | Çekirdek gücü | Çekirdek gücü kullanılmış savaş anı; oyuncunun devresi güçlenmiş | A battle moment with the core power active on the player's circuit |
| 3 | Kartlar | Altı kartlık savaş destesi ve seviyeleriyle modül koleksiyonu | The six-card battle deck and the module collection with levels |
| 4 | Çekirdekler | Seçili savaş çekirdeği ve açılmış çekirdekler | The selected battle core and the unlocked cores |
| 5 | Devre Yolu | Arena 7'de kupa eşiklerine bağlı modül parçası, Devre Kredisi ve Akı ödülleri | Arena 7 rewards tied to trophy milestones: module shards, Circuit Credits and Flux |
| 6 | Maç sonucu | Zafer ekranı ve iki oyuncunun modül bazında hasar dökümü | Victory screen with each player's damage by module |
| 7 | Takım sohbeti | Hazır mesajlarla yazışan takım üyeleri ve mesaj seçici | Team members chatting with preset messages and the message picker |
| 8 | Ana ekran | Oyuncu adı, kupa sayısı, arena ilerlemesi, seçili deste ve Savaş düğmesi | Player name, trophies, arena progress, selected deck and the Battle button |

Özellik grafiğinin alternatif metni: "GRIDSHARD yazısı ve sloganı; iki yanda savaş ve kartlar ekranı" / "The GRIDSHARD wordmark and tagline between the battle and cards screens".

### Nasıl üretildi

- Ekran görüntüleri oyunun kendi ekranlarıdır; üstlerine yazı, çerçeve ya da süsleme eklenmedi. Yalıtılmış bir yerel sunucuda (geçici veri klasörü, yalnız yapay zekâ eşleşmesi, reklam ve ödeme kapalı) kurulu Chrome ile 360×640 CSS pikseli ve 3 kat çözünürlükte çekildi. Canlı sunucuya ve gerçek oyuncu verisine dokunulmadı.
- Hesap, takım üyeleri ve takım adı bu çekim için oluşturulmuş örnek veridir (Arena 7, 1846 kupa; Türkçe sette "Kıvılcım" ve "Akım Birliği", İngilizce sette "Sparkline" ve "Arc Union"). Savaşlar gerçekten oynandı; rakip, oyunun yapay zekâ rakibidir.
- Görüntüler çalışma ağacındaki arayüzden alındı (Play'deki v3 paketinden sonraki arayüz düzeltmelerini içerir). Seçilen ekranlar o düzeltmelerin dokunduğu ekranlar (mağaza, Kartlar'daki Bilgi / Seç kutusu, takım isteği, analitik sorusu) değildir; bu, değişiklik listesinden çıkarımdır, v3 paketiyle yan yana karşılaştırılmadı.
- Gerçek para fiyatı ya da indirim yazısı gösteren ekranlar (mağaza, sezon ödülleri) bilerek sete alınmadı.
- Özellik grafiği oyunun yazı tipleriyle (Orbitron, Rajdhani), marka renkleriyle ve iki ekran görüntüsüyle kuruldu. Slogan tanıtım sitesindekiyle aynıdır.
- Çekim betikleri geçicidir ve depoda değildir; kopyaları `artifacts/play-store-listing-20261007/tools/` altındadır.
- **Sınır:** görüntüler masaüstü Chrome'un telefon boyutundaki görünümündendir, gerçek cihazdan değil.

## Yapay zekayla üretilmiş öğe beyanı

Mağaza girişi ekranının sonunda iki seçenekli bir beyan vardır: "Öğeleri etiketleme" ve "Öğeleri yapay zekayla oluşturulmuş veya düzenlenmiş olarak etiketle" (ikincisinde öğeler sonraki adımda tek tek işaretlenir).

**Okunan kaynaklar (7 Ekim 2026):**

- Google'ın yardım sayfası "Declaring AI-generated content in Play Console" (`support.google.com/googleplay/android-developer/answer/17262077`): beyan geliştiricinin kendi değerlendirmesine dayanır; her görsel ve video ayrı değerlendirilir; kutu, geliştiricinin **düzenlemelerin kapsamında gördüğü** öğeler için işaretlenir; işaretlenen öğe Play Store'da yapay zekâ etiketiyle gösterilir; işaret sonradan kaldırılabilir. Sayfa hangi durumların kapsamda olduğunu tanımlamaz.
- AB Yapay Zekâ Tüzüğü, madde 50/4 ve madde 3/60 (`artificialintelligenceact.eu` üzerinden; 2 Ağustos 2026'dan beri uygulanır): içeriği kullanan taraf için açıklama yükümlülüğü iki durumdadır. Biri "deep fake", yani gerçek kişi, nesne, yer ya da olaya benzeyen ve gerçekmiş gibi görünen yapay görüntü, ses ya da videodur. Diğeri, kamuyu ilgilendiren konularda bilgilendirme amacıyla yayımlanan yapay metindir; insan gözden geçirmiş ve yayın sorumluluğunu üstlenmişse bu yükümlülük uygulanmaz.
- Başka ülkelerin kuralları okunmadı.

**Öğelerin nasıl üretildiği (olgular):**

| Öğe | Nasıl üretildi | Görsel üreten bir yapay zekâ modelinin çıktısı mı |
|---|---|---|
| Uygulama simgesi | `tools/generate_brand_assets.py` çizim betiğinin çıktısı (Pillow; dış görsel servisi yok, her çalıştırmada aynı sonuç; depodaki dosya `D:\Projects\GRIDSHARD2.1` içindekiyle bayt bayt aynı). Betik 30 Eylül'de bir yapay zekâ kodlama aracının iş paketinde yazıldı (Beta.72 tur 18); motif, o tarihte kullanımdan kalkan ImageGen simgesini izler. Konsoldaki simge alanı 7 Ekim'e kadar boştu; kullanıcının paylaştığı ekrandaki küçük resim bu dosyayla uyumlu. | Hayır |
| Özellik grafiği | Claude'un yazdığı HTML/CSS düzeninin Chrome'da çizilmiş hali: oyunun yazı tipleri, marka renkleri ve iki gerçek ekran görüntüsü. | Hayır |
| Ekran görüntüleri | Çalışan oyunun ekranları; çekimi bir betik yaptı, görüntüye dokunulmadı. | Hayır |
| Kısa ve tam açıklama | Claude yazdı, özellikleri koddan doğruladı; kullanıcı gözden geçirip konsola girdi. | Metin; yapay zekâ taslağı |

İstemcide marka klasöründeki altı dosya dışında hazır resim yoktur; ekranlarda görünen her şey kodla çizilir.

**Değerlendirme (hukuki görüş değildir):** görsellerin hiçbiri bir üretken modelin çıktısı ya da yapay zekâyla değiştirilmiş bir fotoğraf/video değildir ve hiçbiri "deep fake" tanımına girmez. Açıklama metni tanıtım metnidir, kamuyu ilgilendiren bir bilgilendirme değildir ve insan gözden geçirmiştir. Bu okumayla hiçbir öğe düzenlemelerin zorunlu etiket kapsamında görünmüyor; önerilen seçenek **"Öğeleri etiketleme"**. Kapsam değerlendirmesi geliştiricinin beyanıdır; karar kullanıcınındır. Daha açık olmak istenirse simge ve özellik grafiği gönüllü olarak etiketlenebilir (ikisini de yapay zekâ araçları üretti); o zaman mağazada bu öğelerde yapay zekâ etiketi görünür. Ekran görüntüleri her iki durumda da etiketlenmez.

**Kullanıcının seçimi:** henüz görülmedi.

İleride mağazaya bir üretken modelle yapılmış görsel ya da video (ör. tanıtım videosu, yapay zekâyla üretilmiş illüstrasyon) yüklenirse bu değerlendirme o öğe için yeniden yapılmalıdır.
