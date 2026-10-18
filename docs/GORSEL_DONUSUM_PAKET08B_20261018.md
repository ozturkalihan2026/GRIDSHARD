# Paket 8B — sonraki 10 fiziksel modül

18 Ekim güncellemesi: Kullanıcı bu paketteki 10 çizimi açıkça onayladı.
Yeni kapsam: kalan 16 modül + 7 çekirdek çizimi, ardından 26 modül ve
7 çekirdeğin dönüşümü. Aşağıdaki onay bekleniyor ifadeleri tarihçedir.

Güncel ek karar: Hedefleme Bilgisayarı gerçek 3B modeli v2 olarak geliştirildi.
Kullanıcının açık isteğiyle **Lazer** gerçek 3B denemesi oyuna bağlandı;
karşı devreye bakan 180° dönüş kullanır, yeni açı atlası üretilmez.
8B'nin diğer cihazları henüz bağlı değildir. Aşağıdaki eski “yeniden bağlanmaz”
ve 16-yön hedefi bu yeni kararın öncesine aittir. Güncel kontrol listesi:
`MODUL_GERCEK_3B_PILOT_20261018.md`.

18 Ekim 2026. Durum: 10 tasarım önizlemesi hazır; görsel onayı bekliyor.
16 yön pilotu denendi, yön tutarlılığı nedeniyle kabul edilmedi. Oyuna bağlı değil.

Sonraki kullanıcı talimatıyla gerçek 3B denemesine geçildi. Hedefleme
Bilgisayarı referanstan yerelde modellenerek ayrı başlıklı GLB ve bağımsız
360° görüntüleyici hazırlandı. Bu sade geometrik denemedir; nihai sanat
eşleşmesi ve oyun bağlantısı değildir. `MODUL_GERCEK_3B_PILOT_20261018.md`.

Kullanıcı uygun olmayan adları fiziksel cihaz tasarımına göre değiştirmeye ve
bu pakette 8 yerine 16 yön kullanmaya izin verdi. Görsel önizleme onay kapısı
korunur. Mevcut modül kimlikleri ve motor davranışları değişmez.

## Kapsam

Kanon sırası `client/src/canon-data.js` içindeki 11–20. modüllerdir:
Hedefleme Bilgisayarı, Bariyer, Ark Topu, Kapasitör, Dron Üssü,
Sinyal Bozucu, Ray Topu, Akım Dengeleyici, Yansıtıcı, Nano Sağlıkçı.
Nano Sağlıkçı için fiziksel çift çıkışlı cihazla daha uyumlu ad önerisi:
**Nano Onarım İstasyonu** (`nano_medic`, iki modüle dağıtılmış onarım).
Bu ad henüz oyun metinlerine uygulanmadı.

## Kamera ve dönüş kararı

- Kamera tepeden 30°; zeminle 60°. Gövde dik kalır.
- Güncel ilk 10 cihaz 8 yönlü 2.5D kullanır; eski 8A dört-yön/üstten-Lazer
  paragrafları tarihçedir. Güncel kaynak: MODUL_KAMERA_VFX_20261017.md.
- 8B hedefi 16 gerçek farklı görünüş, 22,5° aralık, 4×4 atlas. Aynı resmin
  ekran düzleminde çevrilmesi veya yansıtılması farklı görünüş sayılmaz.
- Kesintisiz hacimli 360° için gerçek geometri ve materyal/kaplama gerekir.
  Mevcut WebP dosyaları gizli arka yüzleri içermez. Eski WebGL Lazer pilotu
  geometriyi döndürebiliyor ancak sanat dili reddedilmişti; yeniden bağlanmaz.
- Önce tek cihazda 16 yön denemesi: yön sırası, sabit kamera, kaide/pivot,
  boyut, değişmeyen geometri ve çıkış ucu kaydı kontrol edilir. Görselde
  tekrarlanan/yanlış yönler varsa üretim adedi tamamlanmış sayılmaz.
- Onay sonrası mevcut ortak savaş saati ve kalıcı DOM kullanılır; modül
  başına canvas, yeni RAF/zamanlayıcı veya devreyi tekrar kurma yok.

## Kontrol listesi

- [x] Kanon sırası ve gerçek imza mekanikleri okundu.
- [x] Mevcut 8 yön ve eski gerçek 3D pilotu incelendi.
- [x] On ayrı fiziksel tasarım üretildi ve incelendi.
- [x] Numaralı büyük/küçük önizleme kaydedildi.
- [x] Bir modülde 16 yön pilotu üretildi ve gözle değerlendirildi (iki deneme; yön sırası hatalı, kabul edilmedi).
- [ ] Kullanıcı tasarımları / ad önerisini onayladı.
- [ ] Onaylı tasarımların 16 yön atlasları hazırlandı.
- [ ] Hedef/pivot/VFX uçları kaydedildi, ortak sisteme bağlandı.
- [ ] Statik kontroller ve kullanıcının oyun içi kabulü tamamlandı.

Üretim: yerleşik image_gen; PNG ustaları ve önizlemeler Git dışı
`artifacts/visual-refresh-pack08b-20261018/` altında saklanır.
Promptlar ve üretim sonuçları aynı adlı JSON kaydında tutulur.

## Teslim / kontroller

- Önizleme: `artifacts/visual-refresh-pack08b-20261018/pack08b-preview.webp`.
- Çevrimdışı liste: aynı klasörde `index.html`; her cihaz büyük + 48px/32px.
- On ana PNG değişmeden `masters/` içinde; 384px gerçek alpha WebP türevleri
  toplam **377.534 bayt**. Kaynak alpha 0–255 kontrolü geçti.
- Mekanik hazırlama: `tools/prepare-pack08b-preview.cjs`; yeniden çizim/boyama
  yapmaz. Kayıt: `GORSEL_DONUSUM_PAKET08B_PROMPTLAR_20261018.json`.
- Hedefleme Bilgisayarı 16 yön denemeleri `pilot/` içinde saklandı. İlk sırada
  açı farkları yeterli değil, 15. hücre arka çeyrekte olması gerekirken ön
  yüzü gösteriyor. İkinci düzeltmede de devam etti. 16 hücre, 16 doğru açı
  anlamına gelmediğinden bunlar savaş atlası olarak kullanılmadı.
- Tekli tasarımlar onaylanınca açıları kontrollü alt gruplar/tekil karelerle
  üretip 22,5° sırasını, ortak kamerayı, kaide sabitliğini ve emitter kaydını
  doğrulamak gerekiyor. Bütün modüller 16 yöne geçti diye raporlanmayacak.
- Gerçek 3B alternatifi mevcut motorun WebGL pilotuyla teknik olarak mümkün;
  fakat onaylı çizimleri koruyan hacimli modeller ve materyaller henüz yok.
  Tek resme CSS rotate vermek arka yüz/derinlik oluşturmaz.
- Oyunun kaynaklarına, motor kurallarına, mevcut V18 düzenlemelerine,
  sunucu/tarayıcı/dağıtım dosyalarına dokunulmadı. Görsel oyun kabulü yapılmadı.
