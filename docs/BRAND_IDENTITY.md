# GRIDSHARD — Brand Identity Foundation

**Identity package:** `2.0.0-beta.22`  
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

GRIDSHARD; neon-cyberpunk kadar parlak ve renkli değildir, askeri arayüz kadar gri de değildir. Ana kimlik **Neon Industrial / Electric Arena** yaklaşımıdır.

---

## 2. Ana renk tokenları

| Token | Kullanım | HEX |
|---|---|---|
| `--gs-void-navy` | Ana arka plan | `#070B14` |
| `--gs-reactor-blue` | İkinci arka plan | `#0C1625` |
| `--gs-alloy-navy` | Panel yüzeyi | `#132238` |
| `--gs-circuit-steel` | Çizgi / panel kenarı | `#294766` |
| `--gs-arc-cyan` | Ana vurgu / enerji | `#36D9FF` |
| `--gs-plasma-cyan` | Enerji parlama | `#67F4FF` |
| `--gs-reactor-gold` | Seçim / önemli CTA | `#F4C85A` |
| `--gs-ion-green` | Sağlık / pozitif | `#55DF8A` |
| `--gs-charge-amber` | Uyarı | `#F0B84B` |
| `--gs-overload-red` | Kritik / hasar | `#FF515A` |
| `--gs-interference-violet` | Sabotaj | `#A86BFF` |
| `--gs-ice-white` | Ana metin | `#ECF5FF` |
| `--gs-signal-gray` | İkincil metin | `#8CA1B9` |

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

## 8. Dosya / kodlama ilkesi

Yeni kullanıcı-facing marka alanlarında `GRIDSHARD` kullanılacaktır.

Backward compatibility nedeniyle aşağıdaki dahili isimler bu foundation paketinde topluca rename edilmez:
- `RelayBattleClient`
- mevcut API route isimleri
- mevcut internal test fixture isimleri
- kalıcı veri şemalarının güvenli olmayan alanları

Dahili rename, ayrı migration paketi olmadan yapılmaz.


---

## 9. Beta.15 uygulama tamamlama

Ana lobby kararı artık yalnız doküman değildir:

- arka planda 5×4 = 20 hücreli silik arena geometrisi render edilir,
- Shard Core ve grid pointer hareketine çok hafif parallax verir,
- OYNA alt metni `Tek Oyunculu · Dereceli PvP`,
- oyuncu kartında `Sezon / Lig / RP`,
- alt ekran kimlikleri `Operatör Terminali / Savaş Arşivi / Sistem Konsolu`.

Parallax dekoratiftir; savaş input'una veya mobil erişilebilirliğe bağımlılık oluşturmaz.
