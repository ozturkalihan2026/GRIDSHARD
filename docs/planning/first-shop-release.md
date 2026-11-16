# 2.5.0 — ilk ücretsiz teklif ve Mühendis Kasası kararı

16 Kasım 2026. ECON-01 yerel bütçe adayı; canlı katalog veya kazanılmış hak
değişikliği değildir. Miktar/fiyat ayarı BALANCE-01 ve gerçek API kabulünde
incelenir; yayımlanmış revision üzerine yazılmaz.

REWARD-02 haftalık kazanım ve seçim API katmanı dalda hazırdır;
[kabul kaydı](reward-choices-250-acceptance.md). UI-03 özgün kasa, seçim/açılış
ve Mesaj Kutusu erişimi de [ayrı kayıtta](engineer-case-ui-250-acceptance.md)
hazırdır. Genel kapanış/aktarım ve fiziksel cihaz kapıları açık; parça teklifi
henüz uygulanmadı.

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
Kozmetik fiyatları zorunlu savaş gücü bütçesine eklenmez; ayrı SHOP-03 kararıdır.

[Birlikte harcama raporu](free-economy-250-progression-report.md) ·
[Makine kararı](free-economy-250-progression-v1.json) ·
[Beş kaynak bütçesi](free-economy-250-report.md) ·
[2.5.0 uygulama planı](releases/2.5.0.md).
