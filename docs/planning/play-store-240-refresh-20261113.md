# 2.4.0 mağaza görselleri ve ücretsiz dağıtım beyanları

2.4.0/code15 AAB'nin Play Console'a yüklendiği ve incelemeye gönderildiği
kullanıcı tarafından doğrulandı. Onay/yayına çıkış henüz doğrulanmadı.
Sunucudaki rc.5 değişmedi; bu çalışma yeni AAB üretimi değildir.

## Hazır görsel teslim

`deliverables/GRIDSHARD_MAGAZA_2.4.0_2026-11-13/` ve aynı adlı ZIP yereldedir.
TR/EN için sekizer 1080×1920, alfa içermeyen PNG ile açıklama taslakları vardır.
Ekranlar gerçek oyundan alınmıştır: iki yerel misafirin dostluk maçı ve gerçek
çekirdek gücü; altı menü ekranı. Üretim hesapları değiştirilmedi. Oyun sonucu,
modül envanteri veya savaş efekti görsel için uydurulmadı.

01 savaş, 02 çekirdek gücü, 03 modüller, 04 çekirdekler, 05 Devre Yolu,
06 yetenekler, 07 oyun içi kaynak sandıkları, 08 ana ekran sırasıyla yüklenir.
Ortak sanat yönü mevcut gerçek oyun varlıklarıyla korunur; ikon ve tanıtım
afişi değiştirilmez. Eski Premium kolajı yeniden yüklenmemelidir.
Telefon görselleri tablet/TV görüntüsü olarak gösterilmemelidir.

Hazırlama araçları `tools/capture-store-240.cjs`,
`tools/capture-store-240-battle.cjs`, `tools/package-store-240.cjs`.
Yalnız ayrı, sahip olunan loopback 8899 sunucusunu kullanırlar. Menü kontrolleri
taşma/eksik görsel/JS hatası içermedi; iki gerçek maçta sayfa hatası yoktur.
16 dosyanın ölçüleri ve metin sınırları doğrulandı. Piksel sonucu ayrıca
toplu önizleme ile incelendi. Bu dosyalar Console'a yüklenmiş sayılmaz.

## Console işlemi kullanıcıya devredildi

İlk denetimde 10 tek seferlik ürünün her birinde etkin `standard` satın alma
seçeneği bulundu. `gridshard.flux_260` ve `gridshard.flux_480` seçenekleri
devre dışı bırakıldı; “Etkin değil” durumu doğrulandı. Kullanıcı devamını
kendisinin yapmasını istedi. Diğer ürünlere, satıcı/reklam beyanlarına veya
mağaza girişine devam eden otomatik değişiklik yapılmamalıdır.

Kalan ürünler: `flux_1050`, `flux_120`, `credits_1000`, `credits_2200`,
`credits_4000`, `credits_9000`, `season_pass_premium`, `battle_rewards_premium`;
tam kimlikler `gridshard.` öneki taşır. Ürün silmek yerine satın alma
seçeneği devre dışı bırakılır. Eski haklar/iade kayıtları korunur.

Kullanıcının tamamlayacağı denetimler:

- Ürünler: tüm satın alma seçenekleri kapalı; uygulama ücretsiz; satışa açık
  abonelik planı yok. Ürün tablosunda etkin seçenek sayısı sıfır olmalıdır.
- Uygulama içeriği: reklam gösterilmeyen mevcut yapı için reklam beyanını
  güncelle; reklam kimliği beyanını paketin gerçek izni/kullanımıyla eşleştir.
- İçerik derecelendirmesi: gerçek para satın alma/ücretli rastgele öğe soruları
  mevcut işlevle eşleştirilir. Sohbet, oyuncu etkileşimi ve veri güvenliği
  yalnız satış kapandı diye topluca “yok” yapılamaz; diğer veri işleme sürer.
- Satıcı beyanı hesap genelindedir. Yalnız ücretsiz indirme değil, mevcut
  ticari faaliyet ve gelir amacı esas alınır. Gerçek faaliyet değişirse
  beyan da güncellenir. Kullanıcı kendi beyanını Console'da tamamlar.
- Her dilin ana mağaza girişinde 8 telefon görselini yenile. Diğer cihaz
  kategorileri ve özel mağaza girişlerinde eski ücretli görselleri kontrol et.
  Açıklamayı ancak satış/reklam kapalı gerçek durumuyla birlikte yayımla.
- Yeni değişiklikler Yayın özeti üzerinden incelenip gerekirse gönderilir;
  mevcut 2.4.0 incelemesi iptal edilmiş sayılmaz. Başarılı gönderim ve onay
  ayrı ayrı doğrulanmadan tamamlandı diye kaydedilmez.

## Hedef kitle ve adres görünürlüğü takibi

Kullanıcı Uygulama içeriği listesini paylaşıp hedef kitle anketinin de
gözden geçirilmesini istedi. `docs/CHILD_AUDIENCE_AUDIT.md` içindeki 6 Ekim
gece kaydı, kullanıcının son yaş kararını **13 yaş ve üzeri** olarak bildirir;
eski sabah önerisi 9–12 yaş içerdiğinden güncel karar diye kullanılmamalıdır.
Mevcut Console yaş seçimi bu turda görülmedi. Ücretsiz/reklamsız modele geçiş
tek başına hedef yaşı değiştirmez. Tasarım kararı değişmediyse 13–15, 16–17,
18+ grupları esas alınır; çocuk grupları yalnız gerçek tasarımla uyumluysa seçilir.

Veri güvenliği “veri toplanmıyor” yapılamaz: oyuncu kimliği ve oyun verileri
işlenir; isteğe bağlı ürün analitiği 18+ yaş/izin kontrolüne tabidir. Form,
halen dağıtılan sürümlerin toplam veri uygulamalarını kapsar. 2.4.0 incelemesi
sürerken eski sürümün satın alma verilerini topluca yok sayma. Resmi kurum,
sağlık ve finansal hizmet beyanları yalnız gerçek işlev değişirse değişir;
oyun içi kaynaklar tek başına finansal yatırım/hizmet değildir.

Kullanıcı ev adresinin herkese görünmesini kaldırmak istedi. Google'ın
kimlik doğrulamasında tuttuğu yasal adres ile mağazadaki herkese açık gösterim
ayrıdır. Ücretli uygulama/IAP sunan merchant hesaplarında tam adres Google
Payments profilinden yayımlanabilir. Satıcı değilim beyanı veya IAP kapatma,
geçmişte merchant olan hesabın adresinin hemen gizleneceğini kanıtlamaz.
Doğrulama adresini boşaltma, yanlış adres yazma veya Google Payments profilini
kapatma işlemi önerilmedi/yapılmadı. Kullanıcı hesap ayrıntılarındaki alanları
inceleyecek; görünürlük sürerse Play desteğinden mevcut kişisel hesabın artık
gelir elde etmeyen durumuna göre public address/merchant gösterimi için
yönlendirme istenecek. Adresin kendisi depoya kaydedilmez.

## Birincil kaynaklar

- [Google Play: satıcı beyanı](https://support.google.com/googleplay/android-developer/answer/17594752)
- [Google Play: reklam beyanı](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
- [Google Play: ürünleri devre dışı bırakma](https://support.google.com/googleplay/android-developer/answer/1153481?hl=en)
- [Google Play: hedef kitle](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en)
- [Google Play: veri güvenliği](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play: kişisel hesapta adres gösterimi](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [Google Play: yasal adres ve merchant hesabı](https://support.google.com/googleplay/android-developer/answer/13634081?hl=en)

Satıcı beyanı kimlik/ödeme/vergi geçmişini silme işlemi değildir. Bu belge,
mağaza ve ürün durumunu kaydeder; kişisel hukuki veya vergisel sonuçlara dair
bir garanti oluşturmaz.
