# GRIDSHARD 2.4.0 — mevcut içerikle ilk sezon

**13 Kasım güncellemesi:** Zorunlu yama nedeniyle paket/geçiş hedefi
**13 Kasım 22.00 → 14 Kasım 00.00 TR** olarak öne alındı. S1–S6 ve haftalık
turnuva hedefleri aynı. [Ev bilgisayarı geçiş planı](planning/release-240-expedited-handoff-20261113.md)
güncel işlemleri ve açık kabul kapılarını içerir. Aşağıdaki 3–4 Kasım efor
tahminleri tarihsel planlama bağlamıdır; tamamlanma/yayın kanıtı değildir.

**4 Kasım kullanıcı açıklaması:** XP açığı bilinçlidir; 12.240 son kademe eşiği
korunur. Günlük/sezonluk emirler (SEASON-01), mesaj kutusu Topla kasa açılışı
(UI-08) ve sabit kasa çekirdek teslimi (REWARD-06) 2.4.0 zorunlu kapsamıdır.
[S1 ödül ve XP sözleşmesi](planning/season-1-rewards-and-xp.md) miktarları,
senaryoları, akışı ve kalıcılık kabulünü ayrıntılandırır. Bu ek işler önceki
14–17 aktif gün tahminine dahildir diye varsayılmaz; 6 Kasım kapasite kontrolünde
yeniden ölçülür. Yayın/sezon hedefleri otomatik kaydırılmadı.

**4 Kasım ayrıntılandırması:** Güncel [2.4.0 uygulama briefi](planning/releases/2.4.0.md)
haftalık sıra, uygulama adımları, dosya bağlantıları ve checklist görevlerini birlikte
gösterir. Bütün sürümler için [bağlı rehber](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md).
Önceki yayın/sezon hedefleri korunur; aşağıdaki üç kalite işi zorunlu kapsama eklenmiştir.

- **UI-07:** Ödüllerdeki bütün alt sayfalar dahil sistemdeki geri ve ileri gezinme
  düğmeleri son sarı geri düğmesiyle aynı yüzey, kenar, gölge ve boyutu kullanır.
  İleri düğmesinde yalnız ok yönü değişir. Mavi/sarı CSS çakışmaları temizlenir;
  tüm ekranlar ve durumlar envanterden kontrol edilir.
- **AUDIO-01:** Saldırı modülü → olay → VFX → cue → dosya/mobil türev matrisi;
  eksik tetikleme/duyulurluk ve cızırtının nedenini bulma, düzeltme ve miks kabulü.
- **AUDIO-02:** Bütün aktif çekirdeklerde aktivasyon ve uygun atış/etki sesleri;
  saldırı sesleriyle birlikte miks, yoğun savaş ve gerçek Android dinleme kabulü.

Bu işler henüz uygulanmadı. RELEASE-01 bu üç işin kabulünü bekler. İlk kapsamın
12–15 aktif gün tahminine ek iş yükü geldi; yeni ön tahmin 14–17 gündür. 6 Kasım
kontrolünde gerçek efor ölçülür; 16 Kasım kapsam kapanışı ile 23 Kasım hedefini
riske atıyorsa tarih yeniden karara bağlanır. Bu metin tarih kaydırma kararı değildir.

3 Kasım 2026 kullanıcı kararı: mevcut 24 modülle ilk sezonun açılması önceliklidir.
Yeni modüller ve geniş kozmetik üretimi sonraki paketlere bölündü. Dal
`main`; canlı 2.3.0. Bu belge sezonu veya ödül dağıtımını açmaz.

**Çalışma hedefi: 13 Kasım 2026 akşamı sunucu geçişi/AAB hazırlığı; 30 Kasım 2026 03.00 TR sezon
başlangıcı.** Tahmin 12–15 aktif geliştirici günü; kapasite ve test/Play
koşulları [tarihli planda](GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md).
Bu belge önceki “iki yeni modül + 18 yeni öğe önce tamamlansın” kapsamını değiştirir.

## Kademeler

| Kademe | İçerik | Çıkış koşulu |
| --- | --- | --- |
| A — mevcut temel | Kaynak/stok katmanı ve gerçek ISO takvimi | Önceki 1.987 yerel test geçti. Eski tam-koleksiyon raporu yeni kaynak haftası profili değildir. |
| B — ilk sezon | BASE-01 bütçesi; SEASON-00: 40 kademe, üç ana kozmetik seti, diğer haftalarda sabit kaynak paketleri | Yalnız S1'e 24 modül istisnası; kaynak/kozmetik dönem türleri açık. Bunlar henüz kodlanmadı. |
| C — güvenli teslim | Tek teslim, kayıt, dönem kapanışı, premium kökeni ve kazanılmış hak koruma | Tekrar/eşzamanlı talep, geç dönüş, restart/restore; kaynak yokluğu eski kozmetiğe düşmez. |
| D — istemci ve sunum | COMPAT-01: değiştirilmemiş 2.3/2.2.1 istemci; TR/EN mobil önizleme, tarih ve gerçek ödül | Sağlık sürümü artırılarak eski kurulum bozulmaz. Ortak sanat yönü ve performans korunur. |
| E — yayın ve açılış | Sürüm mesajı, CI, imzalı AAB, Play cihaz testi, veri koruyan geçiş | 13 Kasım 22.00–00.00 TR geçiş hedefi; sezon açılışına kadar gözlem; 30 Kasım başlangıç ancak bütün kapılar geçildiyse. |

## Stok ve modül ayrımı

- Mevcut altı oyuncu öğesi: Kutup Işığı sezon yolu, Güneş Ocağı sıralama,
  Derin Akım son hafta önerisi. Başka haftaya/döneme tekrar tahsis edilmez.
- Mevcut dokuz takım öğesi üç takım dönemine yeter; takım başlangıcı bağımsız
  ve gerçek katılım koşulludur. Kişisel sezon takım açılışını beklemez.
- S1'in diğer üç haftası açık kaynak ödülü türüdür; sadece eksik kozmetiği
  görmezden gelmek için gerekli adet düşürülmez. Mevcut kod bunu henüz desteklemiyor.
- 18 öğelik sanat brief'i altışar grupta 2.5/S2, 2.6/S3, 2.7/S4'e dağıtıldı.
- Yankı Rölesi 2.5/S2; Kor Fırlatıcı 2.6/S3. S2'den itibaren yeni hazır
  modül koşulu korunur; S1 istisnası genel kuralı sıfırlamaz.
- Mağaza/seçim kasası 2.5; günlük deney 2.6; PvE 2.7. Lisans/kupon gibi
  yeni ödüller zorunlu kapsam ile ikincil kapsam ayrımıyla tarihlendi.

Bugünkü `coverage --cycles 2` eski her-hafta-kozmetik varsayımıyla 18/20 ek
oyuncu öğesi isteyebilir. Yeni profil uygulanmadan bu rapor açılışa hazır
diye yorumlanmaz. Üretimde tarih ayarı veya yeni AAB bu planlama turunda yapılmadı.

## Sonraki somut iş

BASE-01 kaynak/40 kademe bütçesi ve SEASON-00 ilk sezon sözleşmesi;
ardından sabit kaynak haftaları, kapanışta hak koruma ve COMPAT-01.
Günlük iş takvimi ve daha sonraki sürümler
[ödül portföyü ve sürüm takviminde](GRIDSHARD_ODUL_PORTFOYU_VE_SURUM_TAKVIMI_20261103.md).
