# CARD-01 — ücretsiz edinim ve kalıcı koleksiyon altyapısı

17 Kasım 2026 · dalda hazır altyapı; CARD-01 bütünü **in_progress**.
Kaynak kayıt `planned`, gerçek24 modüllük katalog ve S1 aynı kalır.

Geri Tepme Topu'nun taban kartı, tamamlanmış yayın kabulünden sonra Arena3 /
600 zirve kupada ücretsiz seviye1 açılır. Eski hesap eşiği daha önce geçtiyse
yeni bir ödül durağı, sezon yolu, sandık, alım veya giriş serisi istemez.
Giriş seviyesi mevcut iç temsilde0 yükseltmedir; savaşta240 CAN/50 hasar ve
atış başına16 kendi CAN ile oynanır. Maç içi4 Akım bedeli normal kalır.
İlk6 modül kuralı değişmez; yeni hesapta600 zirveye kadar kart kilitlidir.

## Gerçek kod yolu

- `season_module_releases.validate_free_acquisition`: arena zirvesi, başlangıç
  seviyesi1, kalıcı hak,0 Devre Kredisi ve0 Akı. Tam alan kümesi ve türleri
  doğrulanır; ücret, süreli kiralama, premium şartı veya ek gizli alan reddedilir.
- `published_module_progression`: açılışta arena metadata'sını birikimli
  yayın geçmişinden kurar. Yalnız published, benzersiz sezon numarası/kimliği,
  tamamı gerçek `True` yayın kontrolleri ve uyumlu runtime kimliği/sınıfı
  birlikte kabul edilir. Yeni motor kaydı tek başına planned kart açamaz;
  JSON'daki onay bayrakları da eksik motor kartı yaratamaz. Eski katalog
  kaldırılamaz, ücretli güç veya sezon sonunda kart silme politikası açılamaz.
- `arena_canon.MODULES` bu fonksiyonu gerçekten çağırır. Bugünkü kaynakta
  onaylı ek kart olmadığından sonuç boştur. Bozuk published/roster eşleşmesi
  servis açılışında reddedilir; yarım kart sessizce ödül havuzuna girmez.
- `MetaProgressionService` yeni kartın ücretsiz edinimini yapılandırılmış
  `acquisition` alanında döndürür; eski24 kartın yanıt şekli değişmez.
- Mevcut peak-rating koleksiyon/deste/ödül yolları kullanılır. Yeni bir
  cüzdan, hak tablosu, ücretli geçiş veya ikinci defa toplanan ödül yaratılmaz.
  Mevcut parça/kredi/Akı yükseltme ve nadir yetenek ücretleri korunur.
- Geri Tepme Topu yetenekleri `module_talents_v3` içinde ayrı sahip kaynağına
  yönlendirilir; ortak eşik/maliyet korunur. Ad ve açıklamalar TR/EN'dir.
  Bu adapter, kartı MODULE_SPECS'e kendi kendine kaydetmez.

## Doğrulanan durumlar

Gerçek koleksiyon, PvP kurulum kapısı, motor komutu, ödül teslimi,
profil kalıcılığı ve sezon kapatma fonksiyonları kullanıldı. Gelecekte
onaylanmış25. kart testte yalnız `monkeypatch` ile belleğe eklenir; testten
sonra bütün kayıtlar geri alınır. Üretime ait yayın bayrağı değiştirilmedi.

-599 zirvede koleksiyon kilitli, PvP kurulumu ve hedefli parça ödülü reddedilir.
  Yanlış ödül hedefi cüzdanın herhangi bir bölümünü değiştirmeden reddedilir.
-600 zirvede0 kredi/0 Akı/0 parçayla seviye1 kart oynanabilir. Yalnız maçın
  Akım bakiyesi4 azalır; profil cüzdanından bedel alınmaz.
- Mevcut veteranın düşük güncel kupa/yüksek zirve hesabında anında açılır;
  preferred deste kilitli kartın parçalarını havuza sokamaz.
- Kupa0'a düştüğünde ve sezon kapanıp dinlenme dönemine geçtiğinde sahiplik,
 23 parça, yükseltme6 ve seçili nadir yetenek korunur. Tekrar kapanış iadesizdir;
  save/load sonrası bakiye/zirve/yetenek aynıdır.
- Gerçek ücretsiz parça teslimi ve kayda geri yükleme çalışır. Yükseltme ve
  yetenek aynı request ID ile tekrar edilince ikinci bedel kesilmez.
- Eksik motor, farklı kimlik/sınıf, planlı durum, eksik sanat onayı,
  yinelenen yayın ve ücretli/kiralık model açılışı engeller.

Windows odaklı edinim+yayın+arena+migration+aday motor koşusu **94 PASS**.
Linux'ta bunlar, eski ana oyun/V7 ve S1 açılış-kapanış/ödül hakları birlikte
**163 PASS /1 PostgreSQL SKIP**. İzole veritabanı URL'si tanımlı değildi;
PostgreSQL scheduled-closeout rollback testi çalıştırılmış sayılmaz.

```
python -m pytest server/tests/test_season_module_acquisition.py server/tests/test_season_module_releases_v2.py server/tests/test_league_road_and_module_unlocks.py server/tests/test_catalog_migration_v2.py server/tests/game/test_recoil_cannon.py -q
```

## Açık kalan kabul

Bu katman motor/roster ve dönem yayınına bağlanmaya hazırdır; canlı25. kart
açılışı yapılmadı. Gerçek savaş renderer/ankraj/VFX/AudioDirector bağlantısı
[ayrı kabul kaydında](recoil-cannon-battle-integration.md) hazırdır. Geniş denge,
tam TR/EN ekran ve fiziksel cihaz/yayın kabulü bitmeden planned kaydı yükseltilmez.
S1 kapanışı ve ödül teslimi geçiş koşulu, S2'nin ayrıca onaylanması ve kaynak
sürüm2.4.0 kararı değişmez. Gerçek para veya reklam eklenmedi.
