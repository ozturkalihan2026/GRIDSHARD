# Görsel dönüşüm — Paket 4A: rekabet / ligler

15 Ekim 2026. Durum: **Kullanıcı onayladı; ortak kaynaklara bağlandı**.
Yedi lig görseli `client/assets/ui/leagues-v1/`; Şampiyonlar mevcut kupayı kullanır.
`competition-v4.css` ortak web/native stil bloğunun sonunda. Dinamik img yolları
HTML içindeki inert `competition-art-assets` template'iyle mevcut paketleme
izin listesine dahil. Lig kademeleri 5, GRIDSHARD tek; adlar/renkler değişmedi.
Kazanılmış kupa koleksiyonunda mevcut sunucu kimlikleri aynı altın/gümüş/bronz
görseli kullanır. Lider panosu sıra numarası gösterir; sıra kazanılmış madalya
gibi çizilmez. Profil açma, filtre ve gerçek ödül önizlemeleri korunur.
Kaynak sözdizimi, bellekte CSS derleme ve varlık/hash/alpha kontrolleri geçti.
Oyun/birim testleri koşulmadı; tarayıcı/sunucu, dist/native/AAB, dağıtım yok.
QA: `qa_reports/visual-refresh-pack04a-integration-20261015.json`.

Aşağıdaki önizleme açıklamaları tasarım/onay tarihçesidir.

## Kapsam ve onay numaraları

| No | Parça | Korunan kimlik / hedef kullanım |
| --- | --- | --- |
| 01 | Kıvılcım Ligi | Sarı altı ışınlı kıvılcım; mevcut simgenin hacimli hali |
| 02 | Voltaj Ligi | Elektrik mavisi şimşek; sarı para/akım simgesiyle karıştırılmaz |
| 03 | Reaktör Ligi | Yeşil altıgen halka, merkez ve üç bağlantı |
| 04 | Kuantum Ligi | Mor üç yörünge ve merkez |
| 05 | Nexus Ligi | Pembe baklava, dört bağlantı ve merkez |
| 06 | Şampiyonlar Ligi | Mevcut onaylı altın kupa; yeniden üretilmedi |
| 07 | Efsanevi Lig | Mercan/kırmızı üç tepeli taç ve taban |
| 08 | GRIDSHARD Ligi | Açık altın çift baklava/dört bağ; yeni marka logosu değildir |
| 09 | Sıralama ödülü sunumu | Mevcut kupa ailesinin altın/gümüş/bronz önizleme durumları; kazanılmadı işaretli |
| 10 | Lider panosu satırı | Oyuncu adı, sıra, kupa skoru; kendisi/seçili durum, gerçek profil açma yok |

Her normal ligde beş kademe işareti, GRIDSHARD'da tek kademe (işaret dizisi yok).
Kademe resme gömülmez; aynı amblem bir kez saklanıp sunum katmanı kademeyi çizer.
Siluet/lig rengi `app.js LEAGUE_EMBLEMS`, `canon.css` lig renkleri ve
`server/app/arena_canon.py` kanonundan alınır. Örnek kademe aralıkları mevcut
tabanlara/genişliklere dayanır; yeni eşik veya ödül üretilmez.

## Görsel kararlar

Keskin sandıkların dolu/hacimli, geniş pahlı, canlı renkli ve koyu indigo konturlu
dili. Simgeler zeminsiz; arkalarına kare levha, kalkan veya yeni disk konmadı.
Sis/dış parlama/fotoğrafik krom yok. Modül/çekirdek çizimi değiştirilmedi.
Son Devre atmosferi ve Rowdies/Rajdhani kullanılır; font/arka plan yeniden icat edilmedi.
Şampiyonlar ve sıralama kupaları mevcut `rating-trophy.webp` dosyasıdır.
Gümüş/bronz yalnız CSS renk sunumu; yeni kupa üretimi veya sahiplik değişimi değil.
09'un bütün örnekleri **Kazanılmadı**; koleksiyon/hesap ödülü gibi gösterilmez.

## Önizleme davranışı

- 10 parça levhasında büyük amblem ve 28/40px örnekler.
- Devre Yolu sekmesi amblemin mevcut başlık yapısındaki bağlamını gösterir.
  Altındaki üç satır açıkça **durum örnekleri** olarak etiketlidir; gerçek
  ödül miktarını/durak sayısını/sırasını temsil etmez. Lig sandığı 4B yer tutucusu,
  mevcut Altın Sandık yalnız boyut bağlamıdır; onunla lig sandığını değiştirme.
- Lider Panosu sekmesinde Genel/Lig örnek kapsamı ve yerel satır seçimi.
  Oyuncular/skorlar maket veridir; hiçbir gerçek hesap, arama veya ağ çağrısı yok.
- Tweak amblem boyutu, örnek lig/kademe/aşama durumunu değiştirir.
  Kilitli/mevcut/açılmış durumu yalnız renkle anlatılmaz; yazılı durum etiketi var.
  Seçim yeniden yüklenebilir; durum yüklemek oyun işlemi veya onay sayılmaz.

## Üretim ve saklama

Built-in **Imagegen**, yedi ayrı çağrı; her birinde mevcut lig simgesi şekil
referansı, onaylı keskin Altın Sandık yalnız stil referansıdır. PNG masterlar
yeniden boyanmadı/kırpılmadı; teknik olarak 192px kayıpsız WebP'ye küçültüldü.
Her türev gerçek alpha (0–255 aralığı) doğrulamasından geçti.

- Git dışı arşiv: `artifacts/visual-refresh-pack04a-20261015/`.
- `masters/`: yedi PNG; `webp/`: yedi hafif türev (toplam 192.908 bayt).
- `references/`: eski kod-native şekillerin teknik PNG referansları.
- `generated-paths.json`: asıl üretim dosyası eşlemesi; `export-assets.cjs`
  yalnız alpha koruyan teknik ölçekleme yapar.
- Prompt/referans kaydı: `GORSEL_DONUSUM_PAKET04A_PROMPTLAR_20261015.json`.
- `gridshard-pack04a.html`: bütün resim/fontlar gömülü taşınabilir sohbet kopyası.
  Ana thread visualizations dizininde aynı içerik bulunur. Arşivi ayrıca taşı.

## Kontroller ve sınır

1MB altında fragment, 10 parça/13 resim/3 font, benzersiz kimlikler, panel
eşleşmeleri, dengeli HTML, CSS/JS chrome109/safari15 dönüşümü kontrol edildi.
Yalıtılmış kademe/kapsam/satır seçimi/durum geri yükleme kontrolü geçti.
Tarayıcıyla görsel çizim veya oyun/birim testleri yapılmadı; kullanıcıda.
Yeni tarayıcı/sunucu, canlı dağıtım, native/AAB, commit/push yok.

Onaydan sonra `leagueEmblemMarkup` ortak kaynak eşlemesi üzerinden Devre Yolu
başlıklarına ve uygun rekabet kullanımlarına bağlanacak. Mevcut lig sandıklarının
üzerindeki küçük kod-native amblemler 4B'de aynı kimlikle eşlenecek; o aşamada
iki farklı aile bırakılmamalı. Lider panosu/profil/ödül sorguları ve sıralama
kuralları değişmez. Ödül sahipliği sunucudan gelir, önizleme onu taklit etmez.

4A onayı alındı. Kullanıcı lig sandıkları ve lider panosu ilk 10 sandığını
Paket 5'e ekledi: 5A sekiz lig, 5B on farklı sıralama kasası; her grup ayrı
önizleme/onay kapısı. 5C profil/sosyal devamı ayrıca ele alınır.
Haftalık/takım etkinliği çevreleri henüz tamamlanmış sayılmaz.
Günlük meta, bütün modül/çekirdek ailesi ve diğer paketler kapsam dışındadır.
