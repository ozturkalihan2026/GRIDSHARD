# Paket 5A / 5B — lig ve ilk 10 sandıkları

16 Ekim 2026 güncel durum: **İki grup kullanıcı onaylı, açık eşleriyle bağlı.**
18 çizim/36 runtime dosyası, eksik 4B/5C yüzeyleri tamamlandı. Güncel envanter,
QA ve teslim sınırı `GORSEL_DONUSUM_PAKET04B_05C_BAGLANTI_20261016.md`.
Aşağıdaki 15 Ekim önizleme/onay kapısı açıklamaları tarihçedir.

## 5A — sekiz lig sandığı

| No | Mevcut lig kimliği | Sandık | Biçim ayrımı |
| --- | --- | --- | --- |
| 01 | spark | Kıvılcım | Alçak yatay gövde, turuncu düz/pahlı kapak |
| 02 | volt | Voltaj | Dik gövde, şevron/eğimli mavi kapak |
| 03 | reactor | Reaktör | Geniş altıgen zümrüt gövde, üç kollu kilit |
| 04 | quantum | Kuantum | Mor çokgen gövde, sivri kapak ve kısa ayaklar |
| 05 | nexus | Nexus | Daralan pembe gövde, dört yüzlü kapak |
| 06 | champions | Şampiyonlar | Kupa kulplu geniş kapak, turuncu/altın |
| 07 | legendary | Efsane | Üç tepeli kırmızı taç kapağı, basamaklı taban |
| 08 | gridshard | GRIDSHARD | Fildişi/lacivert kasa, katmanlı baklava kapak |

GRIDSHARD son sandığı mevcut 10000 kupa durağında kalacak. Yeni eşik,
ödül miktarı, ekonomi veya kazanım koşulu tanımlanmadı.

## 5B — lider panosu ilk 10

Mevcut `server/app/season_competition.py` görsel kimlikleri korunur.

| Sıra | Görsel kimliği | Ad | Biçim ayrımı |
| --- | --- | --- | --- |
| 1 | rank_crown | Taç Kasası | Geniş lacivert/altın kraliyet kasası |
| 2 | rank_prism | Prizma Kasası | Yüksek buz mavisi prizma kapağı |
| 3 | rank_reactor | Reaktör Kasası | Bakır/turkuaz, düz endüstriyel gövde |
| 4 | rank_frequency | Frekans Kasası | Alçak geniş mor gövde, basamaklı kapak |
| 5 | rank_circuit | Devre Kasası | Mint piramit kapak, çapraz temas şeridi |
| 6 | rank_current | Akım Kasası | Sarı/lacivert kama gövde ve eğimli kapak |
| 7 | rank_neuron | Nöron Kasası | Pembe çokgen kapsül ve yan tutamaklar |
| 8 | rank_relay | Röle Kasası | Uzun mavi gövde, çift iri mandal |
| 9 | rank_conductor | İletken Kasası | Dik turkuaz kutu, bakır U şeritler |
| 10 | rank_spark | Kıvılcım Kasası | Küçük turuncu beşik kapak, indigo kıvılcım |

Sıra rakamları resme gömülmedi. Ödül içerikleri/sahipliği/teslim zamanı aynı.
Lig Reaktör ve sıralama Reaktör gibi adaşlar aynı çizimin renk varyantı değildir.
Mağazadaki dört onaylı sandık ve dock sandığı değiştirilmedi.

## Görsel üretim ve saklama

- Built-in **Imagegen** ile 18 ayrı üretim; mevcut keskin `gold.webp` yalnız
  stil referansı. Zeminsiz alpha, geniş pahlar, canlı yüzeyler, koyu kontur.
- Taç Kasası ilk masterında sol ayak resim sınırına değdiği için Imagegen ile
  yalnız kadraj revizyonu yapıldı. Eski master korundu, seçili master `r2`.
- Büyük PNG'ler ve 192px kayıpsız WebP önizlemeler:
  `artifacts/visual-refresh-pack05-20261015/{5a,5b}/{masters,webp}/`.
  **Git dışıdır; diğer bilgisayara ayrıca taşı.**
- `generated-paths-5a.json` / `generated-paths-5b.json` kaynak eşlemeleri,
  `assets-5a.json` / `assets-5b.json` boyut/hash listeleri aynı arşivde.
- Promptlar `GORSEL_DONUSUM_PAKET05_SANDIK_PROMPTLAR_20261015.json`;
  son kadraj `GORSEL_DONUSUM_PAKET05_SANDIK_REVIZYON_20261015.json`.
- Sohbet önizlemeleri `gridshard-pack05a.html` / `gridshard-pack05b.html`;
  thread visualizations dizininde ve taşınabilir kopyaları arşivde. Her biri
  kendi resimlerini ve üç fontunu gömer; ağ çağrısı yok.

Büyük seçilebilir görünüm 100–180px, küçük örnekler 32/48px. Tasarım seçimi
yalnız yerel sunumdur; oyun hesabına, sandık kazanımına veya onaya yazılmaz.

## Kontrol ve sonraki sınır

18 dosyanın alpha/benzersizlik/kadrajı, kaynak bağlantıları ve önizlemelerin
HTML/CSS/JS, seçim/durum geri yüklemesi kontrol edildi. Önizlemeler ayrı ayrı
1MB altında. QA: `qa_reports/visual-refresh-pack05-previews-20261015.json`.
Görseller incelendi; tarayıcıyla oyun/yerleşim ve birim testleri koşulmadı.
Yeni tarayıcı, sunucu, dist/native/AAB, dağıtım, commit/push yok.

**Önce 5A/5B kullanıcı onayı.** Sonra seçilen kapalı çizimlere birebir eşleşen
açık varyantlar hazırlanıp mevcut renkli açılış efekti ve receipt akışına
bağlanacak. Zamanlayıcıyla ödül verme yok. Profil/sosyal 5C, kozmetik alt
grupları ve 4'ün haftalık/takım etkinlik çevreleri henüz bekliyor; bunları
tamamlandı sayma. Modül/çekirdek çizimleri yine en son pakettedir.
