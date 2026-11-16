# 2.5.0 — ilk ücretsiz teklif ve Mühendis Kasası kararı

17 Kasım 2026. ECON-01 yerel bütçe adayı; canlı katalog veya kazanılmış hak
değişikliği değildir. Miktar/fiyat ayarı BALANCE-01 ve gerçek API kabulünde
incelenir; yayımlanmış revision üzerine yazılmaz.

REWARD-02 haftalık kazanım ve seçim API katmanı dalda hazırdır;
[kabul kaydı](reward-choices-250-acceptance.md). UI-03 özgün kasa, seçim/açılış
ve Mesaj Kutusu erişimi de [ayrı kayıtta](engineer-case-ui-250-acceptance.md)
hazırdır. Genel kapanış/aktarım REWARD-03
[kabul kaydıyla](period-reward-closeout-250-acceptance.md) dalda hazırdır;
fiziksel cihaz kapısı açıktır. SHOP-01 sürümlü katalog ve sabit önizleme
[kabulü](shop-offers-250-acceptance.md) tamamlandı. Katalog draft kalır;
satın alma uçları/atomik cüzdan da SHOP-02
[kabul kaydıyla](shop-transactions-250-acceptance.md) dalda hazırdır.
Katalog draft. UI-02 gerçek mağaza [kabulü](shop-ui-250-acceptance.md) hazır;
COS-03 ayrı dört mağaza kozmetiği [kabulü](shop-cosmetics-250-acceptance.md)
ile kilitli önizlemede hazırdır. SHOP-03 iki setin oyun içi kredili edinimi,
sahiplik/tek ücret ve pilot fiyatı [kabul kaydıyla](shop-pilot-250-acceptance.md)
dalda hazırdır. Üç teklif de draft; yayımlama veya S2 açılışı yapılmadı.

## İki kozmetik seti — yalnız oyun içi kaynak

| Teklif | Kesin içerik | Fiyat | Uygunluk / limit |
| --- | --- | --- | --- |
| cosmetic.dockyard | Tersane Kilidi çerçevesi + Tersane Güvertesi | 1.500 Devre Kredisi | Arena2 /300 zirve kupa; hesap başına bir kez |
| cosmetic.workshop | Atölye Rafı çerçevesi + Atölye Bölmesi | 1.500 Devre Kredisi | Arena2 /300 zirve kupa; hesap başına bir kez |

Gerçek para, TL/döviz fiyatı, reklam izleme, ödeme sağlayıcısı veya yeni para
birimi yoktur. İstek fiyat/ödül/provider gönderemez; sunucunun incelenmiş
oyun içi kredi teklifi yeniden doğrulanır. Set yalnız görünüm verir; modül,
parça, XP, kupa, savaş gücü veya para geri vermez. Otomatik kuşanmaz.

Bir öğe bile zaten oyuncudaysa set yeniden ücretlendirilemez; kısmi sahiplik
için rastgele telafi veya fiyat indirimi üretilmez. Tam set edinimi ve kalıcı
makbuz tek ekonomik işlemdir. Hesap limiti UTC haftası, revision, cihaz veya
mağaza yenilemesiyle sıfırlanmaz. Aynı istek, dönem/sürüm/katalog kapandıktan
sonra da ilk makbuzu ve güncel hesabı döndürür.

İki set toplam3.000 kredi; dört haftalık iki500 kredi modül alımı/hafta
ile toplam isteğe bağlı mağaza yükü7.000 kredidir. ECON-01 Arena1 aday
28 günlük bütçesinde2 savaş/3 emir için19.274→12.274,4 savaş/6 emir için
33.072→26.072 kredi kalır (başka harcama öncesi). Yalnız iki set bu
bütçelerin yaklaşık%15,6 ve%9,1'idir. Bu senaryo hesap garantisi değildir;
kredi yükseltme/çekirdek/yetenekle aynı cüzdandan harcanır. Modül sahipliği
ve ilerleme kozmetik edinimi gerektirmez. Son savaş/ekonomi kabulü BALANCE-01'dedir.

İki setin28 Aralık–25 Ocak, modül teklifinin28 Aralık–4 Ocak UTC penceresi
yalnız incelenebilir kaynak taslağıdır. Gerçek2.5/S2 tarihi veya otomatik
yayın kararı değildir; kaynakta bütün teklifler draft kalır.

## Parça teklifi

- 500 Devre Kredisi, oyuncu başına UTC haftasında en fazla iki alım.
- Tek garantili modül hedefi; açık arena havuzundan sunucu seçer ve teklif
  kimliği/revisionında sabitler. Oyuncu hedefi, parçayı ve fiyatı alımdan önce görür.
  Hedef oyuncu/UTC haftası için sabittir; deste veya cihaz değiştirmek yeniden
  hedef seçtirmez. Teklif hedefi deste filtresiyle daraltılmaz.
- Hedefin enderliğine göre sıradan 12 / nadir 6 / destansı 3 / efsanevi 1 parça.
- Kredi düşümü, limit ve parça teslimi aynı ekonomik işlemde tamamlanır.
  İstek veya cihaz değişimi yeni alım/limit sıfırlaması yaratmaz. Fiyat,
  uygunluk ve yayın penceresi istemciden alınmaz.
- Haftanın süresi, kalan limit, arena kilidi ve eksik bakiye TR/EN açıklanır.
  Yeniden çekiliş, gerçek para, dönüşüm döngüsü veya mecburi kozmetik alımı yoktur.

## Mühendis Kasası

- Bir UTC haftasında tamamlanan 12 uygun ranked_pvp/arena_ai savaşı bir hak
  kazandırır. Zafer gerekmez; pes etme, nötr/antrenman/arkadaş, bot ve
  operatör maçları sayılmaz. Tekrar battle_id ikinci ilerleme üretmez.
- Haftada en fazla bir hak; sezon arasında da kazanılır. Sırf giriş yapmak
  veya reklam izlemek bu hakkı üretmez. Eksik hafta sonraki haftaya taşınmaz.
- Hak doğarken saldırı/savunma/taktik için birer açık modül hedefi ve miktarı
  sabitlenir. Özel seed sunucuya aittir; yeniden bağlantı seçenekleri değiştirmez.
- Seçilen tek hedef için sıradan 20 / nadir 10 / destansı 4 / efsanevi 2 parça.
  Üç seçenek birden verilmez. Para veya XP eklenmez; günlük/sezonluk emir
  para artışlarının üzerine ayrı günlük/haftalık para desteği konmaz.
- DATA-01'deki hak snapshot'ı ve makbuzu kullanılır. Kapanış, süre bitimi,
  dolu Mesaj Kutusu veya sezon değişimi kazanılmış hakkı silmez. REWARD-02/03
  ile sahiplik, sabit seçenek, tek teslim, rollback/restore ve görünürlük tamamlanır.

## Ücretsiz yeni modül ve denge

Geri Tepme Topu için sahiplik adayı Arena 3 / 600 zirve kupasında 1. seviyede
ücretsiz açılmadır. Parça teklifi veya seçim kasası kart sahipliğinin ön koşulu
değildir. Nadir kartın 1→5 maliyeti mevcut tablodan 36 hedef parça ve 2.800
kredidir. Modül hâlâ planned; bu karar runtime/sanat/denge kapılarını kapatmaz.

Altılı deste, çekirdek ve ilk yetenekler aynı cüzdandan harcanır. Sezon arası
ve daha yüksek arenada parça havuzunun genişlemesi ayrı incelenir. Sekiz
sentetik kimlikteki örnekler gerçek kullanıcı verisi veya başarı garantisi değildir.
Kozmetik fiyatları zorunlu savaş gücü bütçesine eklenmez; yukarıdaki ayrı pilot kararıdır.

[Birlikte harcama raporu](free-economy-250-progression-report.md) ·
[Makine kararı](free-economy-250-progression-v1.json) ·
[Beş kaynak bütçesi](free-economy-250-report.md) ·
[2.5.0 uygulama planı](releases/2.5.0.md).
