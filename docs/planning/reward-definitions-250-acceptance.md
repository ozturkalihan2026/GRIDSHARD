# 2.5.0 / REWARD-01 — sürümlü ödül tanımları ilk uygulaması

16 Kasım 2026. Kod `codex/develop-2.5.0` dalında; üretim dağıtımı veya
2.5.0 para artışlarının devreye alınması yapılmadı.

## Uygulanan

- `server/app/reward_definitions.py`: fixed/choice/random şeması, kalıcı
  kimlik+revision, minimum sunucu sürümü ve kanonik içerik hash'i. Katalog
  aynı kimlik/revision tekrarını ve yanlış tür/hedef/miktarı reddeder.
- `server/data/reward_definitions_v1.json`: mevcut dört normal sandığın
  incelenmiş eski tablosu ve beş kaynak planına ait 88 sabit para bileşeni.
  Para bileşeni tüm ödülün yerine geçmez: XP/parça/kozmetik mevcut ayrı
  sözleşmelerde kalır. Yeni para bileşenleri en az2.5.0 sunucusu gerektirir.
- Normal hediye, savaş, posta ve anlık/mağaza sandıkları kazanıldığında
  `reward_definition_snapshot` taşır. Açılış miktarları ve olasılıkları
  güncel değişken tablo yerine bu özel snapshot'tan okunur. Rastgele
  sonucun mevcut tohum ve açılış anındaki uygun parça havuzu davranışı korunur;
  bu değişiklik bir seçim kasası veya sabit sonuç vaat etmez.
- Sürüm alanı olmayan eski stok, açıkça eski revision1 tablosuyla açılır.
  Gelecekteki tablo değişikliği eski hakkın para/olasılık tanımını değiştirmez.
- Snapshot kendi içinde yeterlidir; gelecekte aktif katalog değiştirilse de
  doğrulanmış kazanım belgesi yeni katalogdan yeniden oluşturulmaz.
- Bozuk hash, başka sandığa ait snapshot veya yanlış tür açılıştan önce
  reddedilir; cüzdan, parça ve sandık kaydı korunur. Açılış makbuzu tanım
  kimliği/revision/hash taşır; aynı istek eski sonucu döndürür.
- Snapshot yalnız özel envanter/posta verisidir; istemcinin public_chest
  görünümüne veya hediye/mağaza cevabına tam tanım eklenmez.
- Sabit S1 kasasının mevcut fixed_reward/fixed_reward_hash ve premium
  köken sözleşmesi korunur. Aktif24 modül ve yayımlanmış S1 dosyaları değişmez.
- `tools/prepare_reward_definitions.py --check` çalışma kataloğunu plana ve
  kaynaklara karşı doğrular. Yayımlanabilir sürümdeki aynı revision üzerine
  yeni miktar/olasılık yazmayı reddeder; eski kayıt korunup yeni revision gerekir.
  Docker, kaynak paket izin listesi ve CI kontrolü yeni statik dosyayı içerir.

## Kabul ve veri sınırı

Yeni testler revision seçimi, katalog değişiminden bağımsız eski snapshot,
üç sabit seçenek, sahte seçenek/miktar, yeni para tanımının2.4 kapısı,
bozuk/mismatched sandık, çift açılış, gizlilik, gerçek JSON yeniden başlatma
ve boş hedefe dosya geri yüklemeyi kapsar. Yeni para miktarı mevcut2.4
profilinin ödülünü artırmadı; para satırları derlenmiş ve sürüm kapısındadır.

Mevcut özel sandık/posta JSON nesnesine isteğe bağlı alan eklenir; yeni SQL
tablosu, uygulanmış migration değişikliği veya canlı veri dönüşümü yoktur.
Yeni snapshot, mevcut kayıt taşıyıcısıyla saklanır. PostgreSQL'deki yeni
seçim-hak tablosu/yarış/rollback kabulü bu dosya ile tamamlanmış sayılmaz.

## Açık kalan işler

- DATA-01/REWARD-02: oyuncuya bağlı kalıcı seçim hakkı, atomik seçenek/cüzdan
  teslimi, eşzamanlı talep ve SQL/restore kabulü. `snapshot_contents` yalnız
  içeriği çözer; tek başına seçim hakkı vermez veya cüzdanı değiştirmez.
- ECON-02: günlük/sezonluk emir, giriş, yol ve maç sonucunun yeni miktarlarını
  doğru dönem/revision kapılarıyla gerçek işlemlere bağlamak. Katalogda
  miktarın bulunması o ödülün şimdiden verildiği anlamına gelmez.
- Yeni rastgele revision gelirse UI mevcut stok ile yeni sandığın gerçek
  olasılıklarını ayıracak; bu dilimde bütün normal sandık oranları aynıdır.
- Son2.5.0 AAB, fiziksel cihaz, gerçek PostgreSQL/Redis ve üretim kabulü açık.

## Yerel test kaydı

- Tam sunucu regresyonu: **2073 PASS,53 SKIP**,164,47sn. Bu Windows ortamında
  atlanan testler tamamlanmış veya gerçek PostgreSQL/Redis kabulü sayılmaz.
- Son eklenen snapshot taşıma korumasından sonra ilgili sandık/sezon/
  kayıt/katalog/paket testleri: **131 PASS**. Bunlar önceki toplamla toplanmaz.
- Son araç/katalog/paket/ekonomi/bağlı plan sözleşmeleri **39 PASS**;
  katalog, checklist, takvim, brief, ekonomi, XP, duyuru ve stok --check PASS.
- Dosya restart/boş hedef restore ve yeni2.5 tanımının2.4'te kullanılamaması
  testle doğrulandı. Mevcut normal sandık miktarları ve oranları değişmedi.
- Log: `.audit-runtime/reward-definitions-server-regression.log`. Yerel
  loglar Git ile taşınmaz; test dosyaları yeniden çalıştırılabilir.

[Sürüm briefi](releases/2.5.0.md) · [Ücretsiz ekonomi](free-economy-250-report.md)
· [Checklist](../GRIDSHARD_GELISIM_CHECKLIST_20261103.md#reward-01).
