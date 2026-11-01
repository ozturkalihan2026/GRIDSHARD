# Akım ve üç sınıf — V2 deney sonucu

29 Ekim 2026. Kullanıcının son kararı: **rastgele yerleşim ve mevcut tercihli hedef
türü değişmeyecek**. Saldırı/Savunma/Taktik üç sınıf yeterli. Enerji ve Isı kaldırılacak;
aynı karttan iki, aynı sınıftan üç, saldırı dışı/saldırı oranı gibi sahaya yerleştirme
kotaları olmayacak. Batarya, Kapasitör, Akım Dengeleyici ve Soğutucu'yu Akım kartına
çevirmek yerine yeni düzenden çıkarma kararı verildi.

## Bu tur somut olarak yapılanlar

Yerel deney http://127.0.0.1:8893/ V2 olarak güncellendi. Oynanabilir bölümü hâlâ
10 kartlık sadeleştirme deneyi; 24 kartın tamamı uygulanmış değildir.

- Oyuncuya görünen sınıflar Saldırı, Savunma, Taktik. Onarım da Taktik'te.
- Enerji/Isı yok; tek ekonomi Akım. Depo12, başlangıç6, dolum2,2sn/+1 aynı kaldı.
- Kopya ve sınıf kotası kaldırıldı; 14 boş yerleştirme hücresi fiziksel sınır.
  Savaş sırasında saldırı sayısı tutturma koşulu yok. Altılı farklı kartlık deste
  seçimi ayrı bir hazırlık kuralı; prototip en az bir silah gerektiriyor ve eksikse
  başlat düğmesinde nedenini söylüyor.
- Deneyin eski sırayla hücre doldurması kaldırıldı. Ana motordaki mevcut SHA256
  tohumu ve seçim formülü `board.automatic_deployment_position` içine çıkarıldı;
  ana motor ve deney aynı fonksiyonu çağırıyor. Sıra, boş hücreye göre değişen
  rastgele seçim ve ana oyunun eski davranışı korunuyor.
- Deneyin “en eski modül” saldırı hedefi kaldırıldı. `combat.selectable_targets`
  doğrudan kullanılıyor: eski hedef grupları, Bariyer önceliği ve kimlik eşitlik
  çözümü aynı. Üç sınıf etiketi bu teknik hedef profilini birleştirmiyor.
- EMP de eski tercihli hedef türünü `sabotage.select_sabotage_target` üzerinden
  seçiyor; kendiliğinden “en eski silahı sustur” kuralı artık yok.
- Ark'ın ikinci hedefi hücre komşuluğuna göre değil, mevcut hedef önceliğinde
  sıradaki modüle göre seçiliyor. Çekirdeğe arkadan sıçrama eklenmedi.
- Uzun öğretici zorunluluğu olmadan oynanıyor. Sahada hedef işareti, silah yönü,
  atış izi, destek bağları, kesinti sayacı, çekirdek etkisi ve dokunarak açıklama var.
- İstek işlenirken düğmeler beklemeyi gösteriyor; hızlı ikinci dokunuş sessizce
  kabul edilmiş gibi görünmüyor. Raf adları tek satır, kart görselleri tam.

Bu küçük deney, normal savaş motorunun bütün mekaniklerini birebir kopyalamaz.
Kalkan/Onarım/Güçlendirici gibi kartların sade deney davranışları V1'den kalmıştır;
V2 katalog taslağındaki tüm sayılar veya yeni iş tanımları uygulanmış sayılmaz.
Gerçek deney değerleri `/api/catalog`, öneriler `/api/design` çıktısındadır.

## 24 kartlık katalog ve arenalar

`docs/AKIM_UC_SINIF_ARENA_KATALOG_V2.md` ve
`server/data/current_only_design_v2.json` aynı üretilmiş aday tasarımı taşır.

- 10 Saldırı,8 Savunma,6 Taktik; mevcut18 kimliğin sade tanımı ve6 yeni tasarım.
- Yeni tasarımlar: Seri Top,Kalkan Kırıcı,Tampon,Son Siper,Arındırıcı,Hız Rölesi.
- Mevcut12 arena adı/kupa eşiği korunur. İlk arenada6 kart; her sonraki arenada
  en az bir yeni kart. Her kartın tek ana işi, görünen geri bildirimi ve karşılığı var.
- İlk dört emeklilik kullanıcı kararı. Diğer14 kartı çıkarma gerekçeleri öneri
  olarak işaretli; kullanıcı bunların adlarını tek tek kesinleştirmiş sayılmaz.
- Yeni6 kartın resmi/mekaniği henüz hazırlanmadı. Arayüzde “yeni tasarım” denir,
  mevcut kart resmi yeni kartın tamamlanmış görseli gibi kullanılmaz.
- Tasarım incelemesi deney ekranındaki “24 kartlık arena tasarımını incele”
  bölümünden de okunabilir. Bu kartlar oynanabilir rafla karıştırılmıyor.

Üretici `python -X utf8 tools/generate_current_only_design.py`: 24 benzersiz kart,
üç sınıf dağılımı,6 yeni kimlik,36 eski kimliğin18korunan/18ayrılan olarak tam
kapsanması ve12arenanın boş kalmaması doğrulanır. Canlı `arena_progression_v1.json`
ve oyuncu kayıtları bu üreticide yazılmaz.

## Doğrulama

**84 otomatik test PASS.** Deney, API, arena tasarımı, mevcut tahta/komut/savaş ve
stratejik modül regresyonları birlikte çalıştırıldı. Özellikle:

- Aynı girdilerde sekiz ardışık yerleşim ana motor ve deneyde aynı hücreyi seçti.
  Eski formülün üç sabit test vektörü ayrıca korundu.
- Saldırı/Savunma/Taktik'te aynı karttan14 tane yerleşebiliyor; 15'inciyi fiziksel
  tahta reddediyor. Test bu sınır kontrolü için Akım verir; doğal dolum testi ayrı.
- Eski savunma/sabotaj/destek/saldırı öncelik sırası, Bariyer ve EMP'nin tercihli
  savunma hedefi korunuyor. Ana oyun için eski kota testleri de hâlâ geçiyor;
  normal üründe dönüşüm yapılmış gibi sunulmuyor.

Gerçek Chrome'da1080×1000,375×812,320×740: kurulum,12arena taslağını açma,
yerleştirme,duraklat/sürdür,çekirdek gücü,modüle dokunup açıklama,yeni deneme PASS.
Yatay taşma0,JavaScript hatası0. Raf adları tek satır ve alan içinde; görseller tam.
Ayrı mobil ölçü testinde doğal Akım dolumuyla hiç silah yerleştirmeden **üç Kalkan**
aynı anda sahaya kondu; üçüncü kopya/sınıf/oran kotasıyla reddedilmedi.

81 deterministik senaryo:3seviye×3deste×3rakipdeste×3çekirdek çifti. Eşleşmeler
Rezonans/Muhafız,Muhafız/AşırıYük,AşırıYük/Rezonans; dokuz çekirdek çiftinin tümü
değil. Yerleşimler V2 kurallarıyla her senaryo için sabit tohumdan üretildi.
Her senaryonun gözlem tavanı900oyun saniyesi; oyunda zorunlu süre yok.

Son kaynakta81/81 savaş çekirdek yıkımıyla bitti: **85–296,5sn, medyan116,5sn**.
İlk modül kaybı20–70,5sn. Senaryo başına yok edilen silahların yaşam medyanları
5,1–100,2sn; hayatta kalanlar bu ölçüme dahil değil. Bazı silahlar hâlâ kısa yaşıyor;
bu sonuç “dayanıklılık sorunu çözüldü” diye yorumlanamaz. Gerçekleşmiş katkısı sıfır
olan kendi çekirdek senaryosu0; en kalabalık kendi devresi14modüle ulaştı.

V1'deki36uzun kilitlenme bu test setinde görülmedi; fakat hedef/yerleşim/kota
kuralları ve tohumlar farklı olduğu için bu, tek bir değişkenin etkisini kanıtlayan
karşılaştırma değildir. Bot galibiyet oranı oyuncu dengesi veya oyunun eğlenceli/
anlaşılır olduğuna kanıt sayılmaz. Gerçek oyuncuya metin okutulmadan hedefi ve
kartın katkısını açıklatmak hâlâ yapılması gereken ayrı testtir.

## Kalan uygulama

Ana oyunun enerji/ısı akışı,36kartlık kataloğu,öğreticisi,arenalara/liglere verilen
ödüller ve eski desteler bu tur topluca dönüştürülmedi. Normal motora yapılan bu
turun değişikliği yalnız aynı rastgele seçim formülünü ortak fonksiyona taşımaktır.
Kurulu telefon APK'sı değişmedi; yeni V2 fiziksel telefonda test edilmedi.

Sıradaki uygulama; tasarlanan başlangıç altılısını tek cümlelik iş tanımlarıyla
tamamlamak, ardından her arena paketini ayrı oynayıp test etmek. Her yeni kartın
gerçek görseli/efekt/istatistik eşlemesi olmadan kartı tamamlanmış sayma.14aynı
kart,yoğun onarım ve sürekli kontrol testleri kotasız yapılacak. Sayısal sorunlar
yerleştirme yasakları veya zamanla artan hasarla çözülmeyecek.

Eski sahiplik/seviye/yetenek ve satın alma geçmişi silinmedi. Katalogdan ayrılan
kartlar için geçiş/lig ödülü eşlemesi ana oyunu değiştirmeden önce tamamlanmalı.
Godot göçü bu tur yapılmadı; deney mevcut Canvas2D çizicisinde çalışıyor.

Kanıtlar `artifacts/current-only-v2-20261029/`: `browser.json`, `three-shields.png`,
üç ölçünün PNG/durumları,`catalog.json`,`simulation.json`. Ara EMP hedefi henüz
düzeltilmemiş koşu `simulation-before-emp-target-parity.json`; nihai sonuç değildir.

```powershell
# server klasöründe
python -X utf8 -m pytest tests/game/test_simple_lab.py tests/test_simple_lab_api.py tests/test_current_only_design.py tests/game/test_strategic_battle_window.py tests/game/test_module_ecosystem.py tests/game/test_board_layout.py tests/game/test_dynamic_modules.py tests/game/test_combat_actions.py tests/game/test_composition_category_alias.py -q -p no:cacheprovider
# proje kökünde
node tools/check_simple_lab.cjs
python -X utf8 tools/probe_simple_lab.py --output artifacts/current-only-v2-20261029/simulation.json
```
