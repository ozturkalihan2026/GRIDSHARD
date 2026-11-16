# 2.5.0 / REWARD-02 — Mühendis Kasası kazanımı ve seçim API'si

16 Kasım 2026. Haftalık kazanım, sabit üç seçenek ve tek teslim sunucu
uygulaması hazırlandı. Ardından UI-03 seçim/açılış ve Mühendis Kasası'nın
Mesaj Kutusu erişimi [ayrı kabul kaydında](engineer-case-ui-250-acceptance.md)
uygulandı. Genel kapanış/aktarım REWARD-03, mağaza UI-02 ve son cihaz/yayın
kapıları açıktır. Bu kayıt canlı 2.5.0 paketinin yayımlandığı anlamına gelmez.

## Kazanım ve seçenekler

- UTC ISO haftası Pazartesi 00.00Z / 03.00 TR'de başlar. Turnuvanın operatör
  başlangıcına bağlı yedi günlük takvimiyle karıştırılmaz. On iki uygun,
  tamamlanmış ranked_pvp/arena_ai savaşı haftada bir hak doğurur; zafer şartı yoktur.
- Gerçek hesap katılımcısı, bitmiş sunucu sonucu ve oyuncu uygunluğu kontrol
  edilir. Pes etme, teslim olma, hareketsizlik, bot/operatör ve nötr maçlar
  ilerletmez. Aynı battle_id başka istekte/haftada yeniden sayılmaz.
- Kaynak ECON-02'nin en az2.5.0 + açık UTC yürürlük kapısını kullanır;
  yürürlük S1 sonrasıdır. Sezon arasında da işler. Günlük giriş, istemci
  sayacı, reklam veya mağaza alımı bu hakkı oluşturmaz.
- Haftanın kazanım kuralı/revision/hash'i ilk uygun savaşta sabitlenir.
  Tamamlanmamış ilerleme yeni haftaya taşınmaz. On ikinci savaşta, o anki
  kalıcı arena açılış havuzundan saldırı/savunma/taktik için birer modül seçilir.
- Seçim sunucuya ait anahtarla HMAC bağlamından türetilir; dil, deste,
  yeniden giriş, cihaz veya istemci tohumu seçenekleri değiştirmez.
  Kazanılmış paketin tam üç seçeneği ve miktarları hak kaydında saklanır.
- Seçilen hedefin enderliğine göre sıradan20 / nadir10 / destansı4 /
  efsanevi2 parça. Bir paket teslim edilir; para veya XP verilmez. Açılmamış,
  planlı veya mevcut ödül havuzu dışında bir modül seçilemez.

## Kalıcılık ve işlem sahipliği

`server/app/reward_choices.py` sunucu kaynak/uygunluk katmanıdır. DATA-01'in
`PostgresRewardEntitlements` deposunu ve değişmez hak/makbuz modelini kullanır.
Tam hak PostgreSQL'de; haftalık ilerleme, sabit kural ve görülmüş savaşlar
özel `reward_choice_state` profil alanındadır. JSON geliştirme adaptörü de
aynı hak/makbuz sözleşmesini saklar. Yeni SQL migration eklenmedi.

- Production maç defteri bitiş zamanını ve battle_id'yi dondurur. On ikinci
  maçın kasa hakkı, profil ilerlemesi ve maç sonucu aynı transaction içinde
  yazılır; hata halinde hepsi geri alınır. Kalıcı pending maç kurtarılınca
  tek hak oluşur. Sonradan eski maçları okuma kasa kazandırmaz.
- Hak tekilliği hesap + `engineer_weekly` + ISO hafta + `engineer_crate` ile
  kurulur. Ödül tanımı kimliği sabit paket içeriğinden türetilir; aynı id/revision
  farklı içerikle kullanılmaz. Aktif katalog, anahtar veya arena sonradan
  değişince kazanılmış seçenekler yeniden üretilmez.
- Teslimde hesap/hak sahipliği, içerik hash'i ve option_id doğrulanır.
  Kalıcı cüzdan callback'i zorunludur; parça ve SQL teslim makbuzu aynı
  savepoint/oyuncu transaction'ında kalır. Mevcut HTTP ekonomik işlem defteri
  request_id'yi işleme bağlar; replay güncel profil ve ilk teslim makbuzunu döndürür.
- Aynı veya başka istekle aynı seçim ilk makbuzu döndürür. Başka seçenek,
  yabancı hesap veya farklı ödülde aynı request_id ikinci teslim oluşturmaz.
  Eski tamamlanmış kasanın makbuzu kimliğiyle okunabilir.
- Hafta/sezon/yürürlük kapanması kazanılmış hakkı silmez. Kaynak filtresi
  bulunan sayfalı pending sorgusu yalnız Mühendis Kasalarını döndürür;
  liste sınırı veya başka ödül türleri kalan hakkı gizlemez/silmez.
- Tarihsel modül emekliliğinde mevcut 1:1 parça eşdeğerliği uygulanır;
  yeni kasa aktif katalogdan doğar. Arena/zirve kupası sonradan değişince
  kazanılmış parçayı tekrar arena şartına bağlayarak iptal etmez.

## API sözleşmesi

| Uç | İşlev |
| --- | --- |
| `GET /profile/{player_id}/reward-choices?limit=20&after=…` | Mevcut ISO hafta, ilerleme/hedef, kazanılmış hak kimliği, eski pending haklar ve sayfa anahtarı |
| `GET /profile/{player_id}/reward-choices/{entitlement_id}` | Üç sabit seçenek, pending/claimed durumu ve ilk teslim makbuzu |
| `POST /profile/{player_id}/reward-choices/{entitlement_id}/claim` | Yalnız request_id + attack/defense/tactical option_id; seçili parçayı bir kez teslim |

Gövdeye miktar, modül hedefi, seed, yeni seçenek veya oyuncu kimliği eklenemez.
Mevcut Bearer oturumu profil yolunun sahibiyle eşleşmelidir. Başka profil
403, o hesaba ait olmayan kasa404, geçersiz gövde/seçenek422 ve ekonomik
request_id çatışması409 ile reddedilir. Tam özel hak/anahtar profil görünümüne girmez.

## Yerel kanıt ve sınırlar

Son tam sunucu kontrolü **2121 PASS / 79 SKIP**; son odaklı HTTP/haftalık ve
ek emir kapanış kontrolü **18 PASS**. Ayrı gerçek PostgreSQL16.14 kümesinde
yeni seçim kasası, ortak hak deposu ve ücretsiz ekonomi işlemleri **25 PASS**.
Standart koşudaki dış servis atlamaları bu ayrı kabulün yerine sayılmaz.
Loglar: `.audit-runtime/reward-choices-server-final.log` ve
`.audit-runtime/reward-choices-postgres-final.log`. Geçici küme durduruldu.
Katalog/ekonomi/takvim/paket araç sözleşmeleri **59 PASS**; bağlı rapor,
checklist, takvim ve sürüm briefleri yeniden üretildi ve `--check` ile doğrulandı.
515 dosyalık import taraması ve diff kontrolü temizdir. Eski19 SQL baytları,
S1 yayımlanmış içerikleri, aktif24 kadro ve gerçek2.4.0 sürümü korunur.

Unit/HTTP kontrolleri haftalık sınır, ISO yıl devri, kaybeden oyuncu,
uygunluk, üç sınıf/arena, miktar, parametre enjeksiyonu, sahiplik,
seçenek değiştirme, JSON restart/boş hedef restore ve sayfalamayı kapsar.

Gerçek PostgreSQL kabulü on ikinci maçtaki hata/kurtarma, paralel farklı
istekler, yarışan iki seçenek, cüzdan callback'i sonrası rollback, kalıcı
HTTP makbuzu, kaynak filtresi, kapanış sonrası erişim ve gerçek dump/restore
ile pending/claimed hakları kapsar. Yalnız yeni loopback kümesi ve sentetik
hesaplar kullanıldı; üretim PostgreSQL17/uzak CI veya cihaz kabulü varsayılmaz.

Bu çalışma ayrıca sezon kapanışında yalnız sezonluk satırlar okunurken
gereksiz boş günlük satır üretilmesini düzeltti; ekonomi kapanış regresyonu
eklendi. SQL hak saklama ve eski kasa/premium iade yolları değiştirilmedi.

Sıradaki UI, API'deki aynı sabit seçenek ve gerçek makbuzu göstermeli;
yeni rastgele çekiliş veya sahte açılış sonucu üretmemelidir. Eski pending
hakkın görünürlüğü, erişilebilirlik ve Mesaj Kutusu sunumu tamamlanmadan
UI-02/03 veya REWARD-03 hazır sayılmaz.

[İlk kasa kararı](first-shop-release.md) · [Kalıcılık](reward-persistence-migration.md) ·
[Ekonomi](free-economy-250-acceptance.md) · [2.5.0](releases/2.5.0.md) ·
[Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#reward-02).
