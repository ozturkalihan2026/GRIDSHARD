# GRIDSHARD — Brand Identity Foundation

**Identity package:** `2.0.0-beta.25`
**Game name:** `GRIDSHARD`  
**Tagline (TR):** `Devreni Kur. Çekirdeği Kır.`  
**Tagline (EN):** `Build the Circuit. Break the Core.`

---

## 1. Marka özü

GRIDSHARD; canlı devre yönetimi, dört kapılı çekirdek, modül sınıfları, enerji akışı ve kesintisiz savaş fikrini tek görsel sistemde birleştirir.

Hedef duygu:

- yüksek teknoloji,
- elektrik / enerji,
- rekabetçi arena,
- taktik laboratuvar,
- kontrollü endüstriyel sertlik.

GRIDSHARD; neon-cyberpunk kadar parlak ve renkli değildir, askeri arayüz kadar gri de değildir. Beta.25 ile ana kimlik **Shardglass Relay** yaklaşımıdır: obsidyen cam yüzey, mint enerji akışı, dört kapılı geometri ve diyagonal kırık dikişi.

### 1.1 Referans araştırması ve ayrışma kararı

| Referans | Alınan ders | GRIDSHARD ayrışması |
|---|---|---|
| Backpack Battles | Hazırlıkta yerleşim kararını savaştan net ayırmak; otomatik savaş öncesi havuzu okunur tutmak | Çanta/fantezi estetiği yerine gerçek zamanlı devre, port ve enerji topolojisi |
| FTL: Faster Than Light | Güç/alt sistem durumunu tek bakışta göstermek | Gemi kesiti yerine iki taraflı dört kapılı Çekirdek arenası ve savaş sırasında modül müdahalesi |
| Into the Breach | Küçük gridde yüksek bilgi yoğunluğunu sade tehdit işaretleriyle taşımak | Tur bazlı tam bilgi yerine kesintisiz 10 Hz sunucu otoriteli savaş |
| Opus Magnum | Bağlantı ve mekanik hareketi görsel dilin parçası yapmak | Alşimik makine yerine kırık cam röleleri, enerji portları ve sınıf renkleri |

Resmî kaynaklar:

- https://game.shochiku.co.jp/games/backpack-battles/
- https://ftlgame.subsetgames.com/ftl.html
- https://www.subsetgames.com/itb.html
- https://www.zachtronics.com/opus-magnum/

Karar: referansların hiçbir renk paleti, ekran kompozisyonu veya müzik teması kopyalanmaz. GRIDSHARD kimliği dört sabit imzayla tanınır: **Shard Core**, **mint flux**, **diyagonal kırık dikişi** ve **3+3+2 kapı ritmi**.

---

## 2. Ana renk tokenları

| Token | Kullanım | HEX |
|---|---|---|
| `--gs-void-navy` | Ana arka plan | `#050914` |
| `--gs-reactor-blue` | İkinci arka plan | `#0A1530` |
| `--gs-alloy-navy` | Panel yüzeyi | `#111D35` |
| `--gs-circuit-steel` | Çizgi / panel kenarı | `#25395B` |
| `--gs-arc-cyan` | Ana vurgu / mint enerji | `#35E5D2` |
| `--gs-plasma-cyan` | Enerji parlama | `#79FFE9` |
| `--gs-reactor-gold` | Seçim / önemli CTA | `#FFCC66` |
| `--gs-ion-green` | Sağlık / pozitif | `#A8FF78` |
| `--gs-charge-amber` | Uyarı | `#FFB84D` |
| `--gs-overload-red` | Kritik / hasar | `#FF5F72` |
| `--gs-interference-violet` | Sabotaj | `#B87CFF` |
| `--gs-ice-white` | Ana metin | `#F3F7FF` |
| `--gs-signal-gray` | İkincil metin | `#8FA3BF` |

Renk dağılım hedefi: `%72` void/reactor arka plan, `%18` alloy panel, `%6` mint flux, `%3` semantik sınıf rengi, en fazla `%1` reactor-gold CTA.

---

## 3. Modül sınıf renkleri

- **Enerji:** Arc / Plasma Cyan
- **Saldırı:** Overload Red + sıcak turuncu vurgu
- **Savunma:** soğuk mavi / shield blue
- **Destek:** Ion Green
- **Sabotaj:** Interference Violet

Kural: kartın tamamı sınıf rengine boyanmaz. Sınıf rengi; üst şerit, port ışığı, küçük simge/işaret, seçim çerçevesi ve efekt için kullanılır.

---

## 4. GRIDSHARD sembolü

Ana sembol: **dört kapılı kırık çekirdek**.

Geometrik dil:
- merkezi kare/çekirdek,
- dört yönde açık kapı,
- çekirdeği ikiye bölen diyagonal kırık,
- cyan enerji ışığı,
- kritik durumda gold/red vurgu.

Sembolün kısa adı: `Shard Core`.

Metin logosu:
- `GRIDSHARD`
- sıkı harf aralığı,
- büyük harf,
- teknik ama okunaklı,
- kırık çekirdek sembolü ile birlikte kullanılır.

---

## 5. Ekran ölçü standardı

**Ana tasarım hedefi:** `1920×1080`

Desteklenen responsive aralık:
- zorunlu kısa masaüstü kabul görünümü: `1366×630`
- minimum hedef: `1366×768`
- ideal: `1920×1080`
- yüksek çözünürlük: `2560×1440`

Yerleşim kuralları:

### Ana Menü
- yaklaşık `%65` görsel / arena kimliği
- yaklaşık `%35` menü / operatör bilgisi
- `OYNA` en güçlü CTA

### Savaş Havuzu
- `%27` Global Modüller
- `%43` Modül İnceleme
- `%30` Seçilmiş Savaş Havuzu

### Savaş
- `%70–75` ana savaş alanı
- kalan alan HUD / olay / sonuç / araçlar

### Profil / İstatistikler / Ayarlar
Aynı oyunun farklı terminalleri gibi görünür; web formu hissi oluşturmaz.

---

## 6. Ekran isimleri ve ton

Kullanıcıya görünen başlıklar:
- Oyna
- Profil
- İstatistikler
- Ayarlar

Alt kimlik:
- Profil → `Operatör Terminali`
- İstatistikler → `Savaş Arşivi`
- Ayarlar → `Sistem Konsolu`
- Savaş Havuzu → `Loadout Grid`
- Savaş → `Core Arena`

---

## 7. Görsel hareket dili

- Enerji: cyan çizgi / pulse
- Seçim: Reactor Gold
- Hasar: Overload Red
- Kalkan: soğuk mavi pulse
- Sabotaj: Violet glitch
- Kritik HP: kırmızı glow + soluklaşma
- Çekirdek hasarı: kısa ekran / çekirdek titreşimi, ağır ses darbesi

Animasyonlar 150–550 ms aralığında kısa tutulur. UI hareketi savaş okunabilirliğini engellemez.

---

## 8. Özgün ses imzası — Shard Pulse

Beta.25 müzik dili başka oyunların soundtrack düzenini kullanmaz. Ortak kimlik öğeleri:

- `3+3+2` sekizlik kapı vurgusu,
- `D–A–C–F` dört notalı Shard motifi,
- manyetik alt bas, camsı kısa transient, dar bant elektrik rölesi,
- menüden savaşa aynı motifin yoğunluk ve oktav değişimiyle dönüşmesi,
- 1200 ms state crossfade; savaş hiçbir ses geçişinde durmaz.

Çalışma zamanı katmanları:

- `menu_shardglass_v5.wav` — 32 sn / 52 vuruş,
- `pool_flux_v5.wav` — 32 sn / 60 vuruş,
- `battle_fracture_v5.wav` — 32 sn / 68 vuruş,
- `critical_shard_v5.wav` — kritik Çekirdek üst katmanı.

Dosyalar deterministik olarak `tools/generate_beta25_audio.py` ile üretilebilir. Bu paket kimlik ve miks prototipidir; platform LUFS/True Peak hedefi ayrı insan kararı olmadan “final mastering” sayılmaz.

---

## 9. Dosya / kodlama ilkesi

Yeni kullanıcı-facing marka alanlarında `GRIDSHARD` kullanılacaktır.

Backward compatibility nedeniyle aşağıdaki dahili isimler bu foundation paketinde topluca rename edilmez:
- `RelayBattleClient`
- mevcut API route isimleri
- mevcut internal test fixture isimleri
- kalıcı veri şemalarının güvenli olmayan alanları

Dahili rename, ayrı migration paketi olmadan yapılmaz.


---

## 10. Beta.15 uygulama tamamlama

Ana lobby kararı artık yalnız doküman değildir:

- arka planda 5×4 = 20 hücreli silik arena geometrisi render edilir,
- Shard Core ve grid pointer hareketine çok hafif parallax verir,
- OYNA alt metni `Tek Oyunculu · Dereceli PvP`,
- oyuncu kartında `Sezon / Lig / RP`,
- alt ekran kimlikleri `Operatör Terminali / Savaş Arşivi / Sistem Konsolu`.

Parallax dekoratiftir; savaş input'una veya mobil erişilebilirliğe bağımlılık oluşturmaz.
