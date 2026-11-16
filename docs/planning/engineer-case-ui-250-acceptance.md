# 2.5.0 / UI-03 — Mühendis Kasası ekranı ve açılışı

16 Kasım 2026. `codex/develop-2.5.0`. Kullanıcı sonraki adımı ve mevcut
kasalardan farklı renk/tip istedi; açılış animasyonunu serbest bıraktı.
Bu çalışma seçim kasasının oyuncu arayüzüdür. Mağaza gezinmesi UI-02,
genel dönem kapanışı/Mesaj Kutusu aktarımı REWARD-03 ve son cihaz/yayın
kapıları ayrıca izlenir; bu ekran onların tümünü tamamlamaz.
Kasanın yerel uygulama dilimi hazırdır. Genel ekran hiyerarşisi/prototipi
UI-01 (BASE-02/03 bağımlılığı) henüz açık olduğundan üst UI-03 görevi
`in_progress` kalır; önkoşul denetimi gevşetilmez veya yapılmamış prototip
tamamlandı sayılmaz. Yerel teslim durumu ve kanıtı backlog'a ayrıca bağlandı.

## Özgün nesne ve ortak sanat dili

Petrol yeşili emaye, fildişi geniş pahlar ve bakır mekanizma. Küçük ayaklı
taşınabilir atölye çantası, kalın taşıma sapı, ön yüzde üç kollu seçici,
iki yana açılan kapaklar ve içeride üç parça yuvası. Onaylı kasalardaki
üst-sol ışık, hacim, boyalı malzeme ve basit okunur siluet sürer; mevcut
normal/lig kasasının şekli veya yalnız rengi kopyalanmadı. Seçim ve devam
eylemleri mevcut ortak fiziksel sarı düğmeyi kullanır.

Yerleşik Imagegen ile kapalı ve aynı nesnenin açık hali üretildi. İki
512×512 kayıpsız alpha WebP toplam **397.734 bayt**. PNG ustaları yerel
sanat arşivinde, çalışma kopyaları ve [son istemler](../../client/assets/ui/engineer-case-v1/README.md)
proje içinde. Web/native derlemesi HTML kaynaklarından aynı iki WebP'yi
toplar; büyük PNG veya dış URL gerektirmez.

## Oyuncu akışı

1. **Ödüller:** haftalık ilerleme/hedef, uygun maçlar, zafer gerekmemesi,
   UTC Pazartesi yenilenmesi ve kazanılmış hakkın kalıcılığı açıklanır.
   Kazanım kapalıysa yeni maçla hak kazanılacağı sözü verilmez. Eski
   haftaların pending hakları listelenir; sayfalama daha eskileri korur.
2. **Mesaj Kutusu / Ödül:** bekleyen seçimler ayrı Mühendis Kasası kartında
   görünür. Aynı hak kimliğiyle aynı seçim ekranına gider. Zarfı okuma,
   normal sandıklar için Hepsini Topla veya mesaj silme kasa seçimi yapmaz.
   Kasa ayrı SQL hakkı olarak kalır; normal sabit sandığa dönüştürülmez.
3. **Üç seçenek:** sunucunun hak doğarken sabitlediği saldırı/savunma/taktik
   modülleri, mevcut koleksiyon görseli, gerçek adı ve gerçek parça miktarı.
   Modül seçilmeden ilerlenemez. Önizleme → seçim inceleme → son onay;
   teslim öncesi seçim değiştirilebilir veya Sonra Seç/Escape/× ile çıkılır.
4. **Teslim:** yalnız `request_id` ve `option_id` gönderilir. Miktar/modül
   hedefi istemciden alınmaz. İşlem sürerken ikinci onay çalışmaz. Açık
   kasa ve ödül, hak/tanım hash'i ve seçilen hedef/miktarla eşleşen gerçek
   makbuz gelmeden gösterilmez. Profil gerçek sunucu yanıtıyla güncellenir.
5. **Açılış:** kısa kilit hareketi → iki yanal kapaklı açık nesne → mint
   aydınlanma/bakır parçacıklar → seçilen gerçek modül kartı yükselişi.
   Atla aynı teslim sonucunu anında gösterir; ikinci istek/ödül üretmez.
   Azaltılmış hareket ve düşük grafikte durağan sonuç, parçacıksız görünüm.
   Var olan `energy_transfer` efekti ortak efekt seviyesi/mute'a uyar.
6. **Yeniden bağlantı:** teslim yanıtı kaybolursa önce hak detayı okunur;
   teslim edilmişse ilk makbuz gösterilir ve profil yeniden yüklenir.
   Teslim edilmemiş/bilinmiyorsa aynı seçim ve request_id tekrar kullanılır.
   Bekleyen talep hesap+hak kapsamında yerelde saklanır; sayfa yenilense de
   değişmez. Yerel kayıt kazanım kanıtı değildir; sunucu tekillik sahibidir.
7. **Sonradan erişim:** haftanın teslim makbuzu ayrı düğmeden tekrar
   okunabilir. Açılışı yeniden izlemek seçim/claim isteği göndermez. Eski
   pending haklar güncel hafta/sezonun kapısından bağımsız görünür.

## Yerleşim, erişilebilirlik ve kapsam

`client/src/rewards/choice-view.js` yalnız arayüz durumunu yönetir;
`choice-view.css` kasa ailesi ve kısa animasyonu taşır. `app.js` mevcut
kimlik doğrulamalı süre sınırlı istek, profil, modül sanatı ve ses sistemine
bağlar. Dil değişince etiketler yenilenir; seçenekler yeniden çekilmez.

Native dialog başlık/fokus çevrimi, 44px dokunma hedefi, klavye ile seçim,
`aria-pressed`, ilerleme öğesi, canlı teslim durumu ve görünür fokus kullanılır.
Küçük ekranda dialog/sayfa dikey kayar; yatay taşma yoktur. Kapalı Mesaj
Kutusu yoklamaları seçim kartını yeniden kurmaz. Toplu normal sandık açılışı
ve özet, mevcut makbuz akışında kalır; seçim kasaları tek tek seçilir.

## Kabul

Yerel gerçek API + Android Chrome öykünmesi TR/EN × 320/393 px;
sunucuda sentetik iki haftalık gerçek hak, gerçek parça teslimi. Önce
tamamlanmamış ilerleme, seçim/son onay/sonuç ve Mesaj Kutusu incelendi.
Yanıtı teslimden sonra düşürme, teslimden önce ağ hatası, sayfa yenileme,
aynı talebi tekrar kullanma, çift dokunma, Escape, makbuzu tekrar okuma,
liste hatası/sayfalama, Atla, düşük grafik ve hareket azaltma senaryoları
`e2e/engineer-case.spec.js` içinde. Normal dört kasa, hata ve toplu özet
`e2e/casual-chest-opening.spec.js` ile korunur.

- Ortak tarayıcı regresyonu **13 PASS**: yedi Mühendis Kasası senaryosu,
  iki mevcut kasa açılışı ve dört ücretsiz ekonomi görünümü. Son animasyon,
  klavye ve mute ekleriyle kasanın yedi senaryosu ayrıca **7 PASS**.
  TR/EN×320/393, kapalı/seçili/son onay/teslim ve hata/restore durumları;
  normal ve azaltılmış hareket/düşük grafik görsel çıktıları incelendi.
- Tam istemci koşusu **786 PASS**, derleme sözleşmeleri **14 PASS** ve
  katalog/ekonomi/takvim/paket araç sözleşmeleri **59 PASS**. Önceki ekonomi
  işinin maç sonu Akı kartı için iki eski sabit ikon sayımı güncellendi;
  başlangıç ve kapalı Mesaj Kutusu test modellerine yeni görünüm bağı eklendi.
- Gerçek web derlemesi iki kasa varlığını ve yeni UI kod/stilini topladı;
  test API'si ve PNG ustaları pakete girmedi. Bu bir2.5 AAB veya canlı yayın
  değildir; kaynak sürümü hâlâ2.4.0.
- Loglar `.audit-runtime/engineer-case-browser-final.log`,
  `engineer-case-browser-confirm.log`, `engineer-case-client-final.log`,
  `engineer-case-build-contracts.log`, `engineer-case-tools-final.log` ve
  `engineer-case-web-build.log`. Son kasa da toplandıktan sonraki haftalık
  durum için `engineer-case-empty-final.log` ayrı odaklı kontrolüdür.

Önceki REWARD-02 sunucu/gerçek PG kabulü [ayrı kayıttadır](reward-choices-250-acceptance.md).
Bu tur sunucu hak şemasını, S1'i, aktif24 kadroyu veya gerçek2.4.0 sürümünü
değiştirmez. Canlı sunucu, Console, son imzalı2.5 AAB, fiziksel Android
cihaz veya hoparlör/kulaklık kabulü yapılmadı. Geçiş S1 kapanış/ödül
kabulü sonrası; bu çalışma yeni sezon açmaz.

[2.5.0 briefi](releases/2.5.0.md) ·
[Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#ui-03) ·
[Sanat yönü](../SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md).
