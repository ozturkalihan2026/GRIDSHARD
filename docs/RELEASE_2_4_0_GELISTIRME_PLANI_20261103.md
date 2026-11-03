# GRIDSHARD 2.4.0 — dönem içeriği ve ödül takvimi

Durum: **geliştirme başladı**, dal `codex/release-2-4-0`.
2.3.0 / code14 kullanıcı tarafından yayımlandı olarak teyit edildi.
Bu sürümün geliştirme çıktıları henüz canlıya veya Android'e dağıtılmadı.

Hedef: iki dönem boyunca özgün ödül ve yeni modül sağlayan, içerik yetersizse
açılmayan dönem sistemi. Mağaza/seçim kasası 2.5.0, Günlük Devre Deneyi 2.6.0
olarak kalır. Ortak boyalı/hacimli lacivert–altın–turkuaz sanat yönü sürer.

## Kademeler

| Kademe | Somut teslim | Çıkış koşulu / durum |
| --- | --- | --- |
| A — kaynak ve stok | Kodla eşleşen kaynak sözleşmeleri; gerçek tarihlerden dönem ihtiyacı; ayrı mağaza stoğu; stok denetim komutu | İlk uygulama bu dalda hazır. Yerel test kanıtı kaydedilir; birleşik yayın kapısına bağlama sonraki kademede. |
| B — özgün üretim | Ekonomi baz çizgisi/simülasyonu; 9 çerçeve + 9 zemin; Yankı Rölesi ve Kor Fırlatıcı | Sanat ve mekanikler gerçek çıktıyla kabul edilir; yalnız taslak ad veya yeniden renklendirme tamamlanmış içerik sayılmaz. |
| C — haklar ve takvim | Sürümü/hash'i sabit ödül tanımları; iki dönemlik tahsis; birleşik açılış ve hak koruyan kapanış | Tekrar/eşzamanlı talep, eski haklar ve restart/restore kanıtı; stok veya kart eksikse açılış reddedilir. |
| D — oyuncuya sunum | Etkinlik/tema vitrini, kazanım ve kilit açıklamaları, TR/EN; dönem sonrası sonuç | 320/393 px, mevcut sanat ailesi ve performans; kaynakta görünen ile gerçekten kazanılan aynı. |
| E — 2.4.0 yayını | Sürüm mesajı, yeşil CI, imzalı yeni AAB ve veri koruyan sunucu geçişi | Gerçek PostgreSQL/Redis, Android/Safari, cihaz ve güncelleme uyumu; ardından kontrollü dağıtım/gözlem. |

Bunlar geliştirme kademeleridir; A/B/C tamamlandı diye ara sürüm dağıtılmaz.
Planlanan ürün yayını **2.4.0**'dır. Canlıya yönelik bağımsız acil hata
düzeltmesi gerekirse 2.3.x olarak ayrıca ele alınır. Android sürüm kodu yeni
paket üretirken Play'deki en yüksek koddan büyük seçilir; şimdi paket üretilmez.

## İlk kademenin uygulaması

- `server/data/liveops_content_sources_v1.json`: dört mevcut dönem kaynağı ve
  iki planlı kanal. JSON, yeni bir çalışma adaptörü oluşturamaz.
- `server/app/liveops_content.py`: yalnız çevrimdışı hesap; tarihli rapor
  gerçek ISO haftalarını sayar. Tarihsiz rapor açıkça kapasite tahminidir.
- `inventory_pool`: mevcut öğelerde varsayılan `competition`; mağaza stoğu
  `shop`, gelecekteki deney stoğu `daily_trial`. Mevcut dönem rezervasyonu
  başka kanalın öğesini seçemez; bilinmeyen havuz reddedilir.
- Eski/draft rezervasyon serbest stok sayılmaz. Takvimdeki kendi rezervasyonu
  bir kez karşılanmış sayılır; takvim dışındaki rezervasyon yeniden kullanılamaz.
- `--check-stock` eksik stokta veya uygulanmamış kanal talebinde hata kodu 2
  üretir. Bu **stok kapısıdır**; tüm sürümün yayıma hazır olduğunu söylemez.
  Raporda `publication_ready=false` kalır.
- Yeni statik JSON kaynak/Docker izin listelerine eklendi. Oyuncu/runtime
  dosyaları yine paket dışında kalır. Uygulanmış SQL değişmedi.

## Takvim ve üretim miktarı

Tarihler aşağıda yalnız tekrar üretilebilir test girdisidir; yayın tarihi değildir.

| İki dönemlik örnek | Haftalık turnuva | Oyuncu çerçevesi/zemin ihtiyacı | Mevcut stok sonrası yeni üretim |
| --- | --- | --- | --- |
| Pazartesi 00.00 UTC, 56 gün | 8 ayrı ISO haftası | 12 çerçeve + 12 zemin | 9 + 9 = **18** |
| Çarşamba 12.00 UTC, 56 gün | 9 ayrı ISO haftası | 13 çerçeve + 13 zemin | 10 + 10 = **20** |

Sezon yolu ve sezon sıralaması her döngüde ayrı oyuncu seti tüketir.
Takım turnuvası ayrı başlangıçla hesaplanır; iki takım dönemi için altı öğe
gerekir, mevcut stok dokuzdur. Başlangıç verilmezse tarihli raporda takım
turnuvası açılmış varsayılmaz. Ortak sınır haftası iki defa sayılmaz;
başlangıç dahil, bitiş hariçtir. ISO yıl değişimi doğru yıl/haftayı kullanır.

18 öğelik sanat kapsamı en az bütçedir. Gerçek açılış tarihleri seçildiğinde
stok tekrar hesaplanır; 20 gerekiyorsa iki özgün öğe daha üretilir veya takvim
revize edilir. Mağazanın ayrı dört öğesi bu dönem stoğunu tüketmez.

```powershell
python tools/prepare_liveops_rewards.py validate
python tools/prepare_liveops_rewards.py coverage --cycles 2
python tools/prepare_liveops_rewards.py coverage --cycles 2 --starts-at 2027-01-04T00:00:00Z --team-starts-at 2027-01-04T00:00:00Z --check-stock
python tools/prepare_liveops_rewards.py coverage --cycles 2 --extra-periods shop_collection=2
```

Son iki örnek mevcut stok/uygulama ile hazır sonucu vermez. Komutlar sezon
başlangıç ortamını, canlı veritabanını, ödül sahipliğini veya tahsisleri değiştirmez.
Sonraki somut iş B kademesinin ekonomi baz çizgisidir; sanat brief'i
[iki dönem manifestinde](planning/two-cycle-art-manifest.md) bulunur.

## İstemci geçişi için yayın koşulu

Kurulu 2.3.0 istemcisi sağlık yanıtındaki sürümü kendi sürümü veya açıkça
desteklediği 2.2.1 ile eşleştirir. Sunucunun sürüm metnini doğrudan 2.4.0
yapmak bu istemcinin başlangıcını engelleyebilir. E kademesinde değiştirilmemiş
2.3.0 istemci kaynağıyla gerçek başlangıç kanıtı gerekir; 2.2.1 köprüsü de
korunur. Sürüm/capability geçiş sözleşmesi çözülmeden etiketler değiştirilmez
ve sunucu geçişi yapılmış sayılmaz. Yeni modüllerin eski istemcide görünümü
ve güvenli güncelleme akışı ayrıca doğrulanır.
