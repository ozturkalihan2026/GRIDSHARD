# Güncel durum — 2.4.0/15 test paketi; sürüm, mağaza ışığı ve sade başlangıç, 6 Kasım 2026

- **7 Kasım son UI isteği:** Mesaj/Kartlar/Takım/Turnuva/Ayarlar/Kozmetik
  dahil ortak alt sekmelerin seçili metin alt çizgisi kaldırıldı; turkuaz
  yüzey/kenar, bildirim ve klavye odağı korundu. Oyuncu/takım koleksiyon
  önizleme düğmesi ortak gs-action-button pahını, sakin altın yüzeyi
  (#d7b66b) ve koyu yazıyı (#302514) kullanır; hak/mağaza davranışı değişmedi.
  İki tarayıcıdaki4 UI akışı PASS;393/320 görselleri test-results altında.
  Kanıt qa_reports/release240-tabs-e2e.log. Telefona son UI güncellemesi
  kurulum öncesi savaş/bağlantı durumuna göre ayrıca doğrulanmalı.
- **Git/CI ilerlemesi:** b61e3e62 ana2.4 hazırlığı ve4f48e630 ekonomi kaynak
  özeti düzeltmesi uzak dalda. İlk CI ekonomi raporunda takvim hash’i,
  Docker build’de eksik client-version.js/ana package.json ve iki tarihsel
  ses testinin v19/eski pulse tepe beklentisini yakaladı. Kaynak özeti
  güncellendi; Docker girdileri tamamlandı, ses testleri v21 sözleşmesine
  alındı. Yerel781 istemci ve17 ilgili Python testi geçti. Son UI/CI düzeltmesi
  aynı dala ek commit ile gönderilecek; son uzak CI sonucu ayrıca izlenir.
  Bu işler üretim yayını veya fiziksel ses kabulü değildir.
- **Git teslimi:** Kullanıcı bütün biriken 2.4.0 çalışmalarını commit/push
  etmeyi istedi. Dal codex/s1-bots-tournament-rewards; yayın/merge talebi yok.
  Kaynak ve plan kontrolleri geçti. Commit/push ve uzak CI sonucu Git/GitHub
  kayıtlarından doğrulanmalı; Git teslimi canlı yayın veya Android ses kabulü
  sayılmaz. Sonraki bilgisayarda önce bu dalın uzak ucunu kontrol et.
- **Son kullanıcı kararı — yayın ritmi:** 2.4.0 yayınlanana kadar bütün hata
  düzeltmeleri/UI iyileştirmeleri aynı2.4.0 üzerinde birikir. Her düzeltmede
  2.4.1 açma; test paketini gerektiğinde yenile. Play’e yeni yükleme olursa
  versionCode gerektiği kadar ilerler; görünen sürüm2.4.0 kalır. Sunucu geçişi
  ve son imzalı AAB üretimi/dağıtımı yayın zamanında, kabul kapılarıyla yapılır.
  Genel2.4–2.9 takvimi değişmedi:2.4 hedef23 Kasım, S1 hedef30 Kasım03.00 TR.
  Yeni fikirler uygun sürüme/backlog’a eklenebilir; tarihler kendiliğinden kaymaz.
  Yayın sonrası ayrı hata düzeltme yayını2.4.1; minor/major kuralı korunur.
  Güncel telefondaki APK son üretim AAB’si veya yayın kanıtı değildir.
  Kararın tek kaynağı release_calendar_v1.json içindeki development_policy;
  takvimler, sürüm rehberi ve2.4 brief’ine araçlarla yansıtılır.
- Kullanıcı eski açılış sürüm etiketini bildirdi, hediye sandık için mağazada
  Kartlar ile aynı yeşil ışığı istedi ve açılış/kayıttaki REVIEW / DEMO SIGN-IN
  girişinin kaldırılmasını istedi. Üçü son test APK’sına dahil edildi.
- İstemci canonical kimliği package.json:2.4.0, gridshard.androidVersionCode15.
  tools/client-version.js açılış/ayarlar etiketlerini doğrular; uyuşmazlık
  derlemeyi son başarılı çıktıya dokunmadan durdurur. Native debug sürümü
  configure-native-orientation ile aynı kaynaktan otomatik yazılır. Boot
  expectedVersion ve telemetri artık eski 2.3.0 sabiti yerine etiketi okur.
- Sunucu VERSION ve son üretim yapılandırması2.3.0/14 olarak ayrı kaldı.
  Kaynak release_guard incelenmiş client compatibility üzerinden2.4.0’ı
  doğrular. İmzalı üretim derlemesinden önce android-production yapılandırması
  aynı2.4.0/15 kimliğine hazırlanmalı; yeni üretim kontrolü uyuşmazlığı reddeder.
- Mağaza hediyesi sunucu durumuna göre yeşil ışık yakar; bakmak silmez,
  sunucu onaylı alım söndürür. Soğuma/erişilemeyen hediye bildirim üretmez.
  İndirim rozeti bağımsız korunur. TR/EN erişilebilir etiketler eklendi.
  İki tarayıcıda gerçek geçici hesapla alım ve reload kabulü PASS:
  qa_reports/shop-gift-light-e2e.log.
- Açılış ve ilk kayıt düğmeleri ve kullanılmayan başlangıç stili kaldırıldı.
  İnceleme erişimi Ayarlar → Hesap ve Gizlilik ve oturum kurtarmada kaldı;
  sunucu demo hesabı kapatılmadı. Google ücretli içeriğe inceleme erişimi
  ister, açılış düğmesi zorunlu değildir. docs/PLAY_REVIEW_ACCESS.md içindeki
  yeni500 karakter altı İngilizce tarif Play Console App access’e yayın öncesi
  konmalı. Console değişmedi. Bu, yeni bir izin talebi değil kalan yayın işi.
- tools/check-play-review-access.js artık gerçek misafir → günlük meta →
  duyuru → Ayarlar yoluyla giriş ve asıl hesaba dönüşü doğrular. Sezon öncesi
  premium kapalı olduğu için aktif sezon kabulü mevcut yalnız-loopback S1
  fixture’da yapıldı. Canlı taslak açılmadı. Dört viewport PASS; kanıt
  qa_reports/release240-review-entry-e2e.log. Yenileme bekleme ve tek seferlik
  duyuru adımları test akışına dahil edildi; gizli alanlar loglanmadı.
- 781 istemci,13 build,8 ön duyuru araç testi PASS;492 import/0 sorun.
  İki tarayıcıda dar/masaüstü başlangıç yerleşimi PASS. Son diff-check temiz.
  Sesin önceki99 Python/araç ve codec/miks sonuçları aşağıda; bu turda ses
  değişmedi, aynı44 OGG son native pakette hash doğrulamasından geçti.
- **Son APK telefona kuruldu:** com.gridshard.localdebug / GRIDSHARD S1 TEST,
  2.4.0/15; aynı imza ve adb install -r, hesap silinmedi. Webhash
  b7bb715fe124efdd; APK SHA256
  59bc114c151cee54cd729a726b606ecff684609a88dd5c3533a952ea581718ea.
  Build/audit PASS582 dosya. qa_reports/native-s1-20261106/apk-v21-ready.json
  güncel son paketi gösterir. Dosya .mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk.
- Native son kanıt native-240-final-content-proof.json: iki sürüm etiketi,
  kaldırılmış iki giriş, Ayarlar’da kalan giriş, aynı hesap ve24 modül,44
  ses hash’i PASS. Son kontrolde play ekranı açık olduğundan yeniden yükleme
  veya navigasyon yapılmadı. Önceki7077c5f581ab7cea paketinde görünür2.4.0
  açılış/ayarlar screenshot ve proof’u var; temiz son başlangıç tarayıcıda
  doğrulandı. Kullanıcının savaşı bitmeden yeni native reload/install yapma.
- Yerel8897 API ve retained runtime korunur; USB reverse gerekir. Canlı
  2.3.0/Play yayını ve üretim hesapları değişmedi. Kullanıcı commit/push ve
  uzak CI aşamasına geçilmesini istedi. Fiziksel ses beğenisi bekleniyor;
  android_acceptance=false ve canlı S1 taslağı korunur.
- Sonraki adım: kullanıcının v21 müzik/çekirdek/modül geri bildirimi;
  ardından kalan yayın kapıları/commit-push/uzak CI. Ayrıntı
  docs/planning/native-s1-test-20261106.md ve release-240-s1-acceptance.md.

---

# Önceki durum — ilk v21 ses paketi telefonda doğrulandı, 6 Kasım 2026

- Kullanıcı v20 seslerini artık duyduğunu doğruladı; müzik geride kaldı,
  çekirdek ana kahraman gibi duyulmadı. Bütün modüller için görevlerine göre
  daha iyi ortak tema istedi. Son “devam et” bu çalışmayı sürdürdü.
- Yeni aday: docs/planning/audio-direction-circuit-forge-v21.md.
  24 modül: silah boşalması, savunma emilme/kilit, destek onarım/yönlendirme.
  Yedi çekirdek: D/A ortak enerji toplanması, güçlü boşalma ve kısa kristal
  kuyruk; her güç kendi dokusunu taşır. Aktivatör0.90–1.08s, atış0.23–0.32s.
- tools/combat_sfx_theme_v21.py yeni asıl sentez; combat_sfx_synth.py sabit
  API facade. generate_combat_theme.py 44 WAV üretir/--check ile doğrular:
  24 modül+14 core+6 canlı eski yönlendirme. 88 OGG/AAC türevi güncel.
  Yeni modül adı yazılmamışsa üretim reddedilir; rastgele ses ödünç alınmaz.
- v21 müzik2.35/SFX0.70 (v20:1.65/0.90); kullanıcı sliderları, menü/result
  müziği ve bütün müzik dosyaları korunur. Modül trimleri göreve göre ayrıdır.
  Core0.78/0.58; destek daha geride. Üç rutin ses/420ms korunur.
- Güçlendirici artık enerji-transfer UI dosyasını paylaşmaz. Kalkan/Zırh
  kendi koruma seslerini kullanır. attackWasDefended hedefin defense_type
  adına değil gerçek hasar engellenmesine bakar; onarım/virüs isabetinde
  sahte destek sesi ve overkill’de sahte blok üretilmez. İlgili testler var.
- Yumuşak crest/slew denetimi, düşük geçiren süzme, sıfır sınırlar ve DC
  düzeltmesi; sert kırpma yok. 25 kaynak/generator/hero-hiyerarşi testi PASS.
- Son:781 istemci,99 Python/araç (tools+değişmeyen müzik PCM),11 build PASS.
  İki tarayıcı38 actual codec yönlendirmesi, fallback/mute/voice-budget ve
  yoğun miks PASS: tepe0.78226268,0 kırpılan örnek.492 import PASS;105 ses
  manifesti PASS. Rapor ve iki matris güncel; cihaz beğenisi henüz false.
- Yeni APK build/audit PASS,582 web dosyası; hash9bbe2b39a6c8c44f.
  Dosya .mobile-debug/android/app/build/outputs/apk/debug/app-debug.apk.
  **V21 TELEFONA KURULDU.** Kullanıcı USB’yi bağladı; aynı pakete
  adb install -r Success, veri silinmedi. Geçici USB kesilmesi sonrası
  reverse8897 ve native WebView kontrolü tamamlandı: mix v21, 44 OGG
  SHA-256 eşitliği, aynı yerel hesap ve24 açık modül PASS; Rezonans seçili.
  Kanıt qa_reports/native-s1-20261106/native-v21-install-proof.json.
  Hazır paket kanıtı qa_reports/native-s1-20261106/apk-v21-ready.json.
- Kapanmış telefon API’si aynı retained runtime ile PID13628/8897 olarak
  açıldı, health200. Runtime .mobile-debug/runtime-s1-20261106 silinmedi,
  hesap seed edilmedi. Yeniden işlemden önce süreç kimliğini doğrula.
- Sonraki adım: Kullanıcı GRIDSHARD S1 TEST içinde yeni savaşta müzik,
  Rezonans gücü ve modül seslerini dinleyerek geri bildirim verecek.
  Paket ve dosya doğrulaması fiziksel kalite kabulü değildir;
  Android_acceptance true yapma. Yeniden kurulum gerekmiyor.
- QA önizlemesi qa_reports/audio-v21-theme-preview.wav: eski/yeni Rezonans,
  Plazma,Ark,Tekrarlayıcı,Kalkan,Zırh,Onarım,Güçlendirici. Kullanıcıya
  sohbette dinlenebilir olarak gösterildi; zaman listesi aynı adlıJSON.
  V20 baseline70 dosya qa_reports/audio-v21-baseline içinde korundu.
- Tüm bu dal hâlâ commit/push edilmedi; canlı2.3.0 ve Play AAB değişmedi.
  S1 bot/ödül/sekme işleri aşağıdaki önceki kayıtta. Yayın kapıları açık,
  gerçek fiziksel kabulden sonra commit/push/uzak CI sırası değerlendirilir.

---

# Önceki durum — v20 ses APK’sı telefonda, 6 Kasım 2026

- Kullanıcı “devam et” dedi; önceki duraklama sona erdi. Dal
  `codex/s1-bots-tournament-rewards`; bu turun tüm işleri hâlâ commit/push
  edilmedi. Canlı2.3.0 ve Play AAB değişmedi.
- V19 fiziksel reddi: Rezonans aktivasyon ve Plazma/Ark/Tekrarlayıcı
  duyulmadı; yalnız müzik duyuldu. Müziksiz gerçek efekt testi çok kısık
  duyuldu. Önceki PASS yazılım/decode kabulüydü, fiziksel kalite kabulü değil.
- v20 tamamlandı: fazı sürekli orta bant katmanıyla23 WAV,46 OGG/AAC türevi
  üretildi. Savaş müziği2.85→1.65, SFX0.42→0.90; coreactivate0.78,
  coreshot0.58; yeni saldırı cue0.70. Mevcut Lazer/destek/EMP trimleri,
  menü/result müziği, kullanıcı ayarı ve üç rutin ses/420ms korunur.
- `tools/tests/test_combat_audio_generation.py`:23 kaynak/telefon bandı
  testi; 600Hz üç kademeli filtrede kalan RMS oranı≥0.20, yumuşak sınırlar,
  RMS/tepe/örnek adımı sınırı. Quantum presence1000Hz; core880+index×60Hz.
- 779 istemci,11 build,85 odaklı Python (üretici+gerçek core motoru) PASS;
  490 import kontrolü ve105 mobil ses hash kontrolü PASS. İki tarayıcıda
  gerçek OGG/AAC, mute/arka plan/bütçe ve yoğun miks PASS: yaklaşık0.609305
  tepe,0 kırpılan örnek. Kanıt qa_reports/audio-v20-mix-evidence.json.
- Rapor üreticisi ve iki audio matrisi/JSON yeni ölçümlerle güncel.
  Eski0.782059/v19 sonucu kullanılmıyor. `device_listening_verified=false`.
- APK offline build/audit PASS,582 web dosyası, hook/secret yok. Bağlı
  telefonda savaş yokken aynı `com.gridshard.localdebug` paketi veri silmeden
  güncellendi; adı GRIDSHARD S1 TEST. Web hash291b3fcd28a2b17e.
- Native WebView’de v20, gerçek beş codec dosyasının SHA-256 eşitliği,
  aynı yerel hesap ve24 açık modül PASS; Rezonans seçili. Kanıt
  qa_reports/native-s1-20261106/native-v20-install-proof.json.
- Telefon API25020/8897 açık; retained runtime ve24 modül açık aynı hesap
  korunur. Sırf bu istemci ses düzeltmesi için API yeniden başlatılmadı.
  USB reverse8897 gerekir. Asıl uygulama/canlı hesap değişmedi.
- Kullanıcıya yeni savaşta Rezonans ve Plazma/Ark/Tekrarlayıcı duyulabilirliği
  soruldu; yanıt bekleniyor. Fiziksel ses/dokunma kabulü tamamlanmadan
  `android_acceptance=true` yapma. Sonraki adım bu geri bildirim, gerekirse
  düzeltme; ardından commit/push ve uzak CI. RELEASE-01 açık.
- S1 bot/ödül/sekme kapsamı ve önceki tam2108 Python/araç,25 PG kayıtları
  aşağıdadır. Yeni ses kodundan sonra bütün sunucu paketini tekrar koşturmak
  yerine ilgili85 test çalıştırıldı; eski geniş sonuçları v20 tam koşusu diye
  sunma. Ayrıntı docs/planning/native-s1-test-20261106.md.

---

# Önceki duraklama — fiziksel ses geri bildirimi, 6 Kasım 2026

Kullanıcı çıkacağı için açıkça durmamızı istedi. “Devam et” dediğinde aşağıdaki
ses düzeltmesinden sürdür; yeni iş/derleme/kurulum şimdi yapılmadı. Bu dalın
değişiklikleri henüz commit/push edilmedi. Canlı sunucu ve Play paketi değişmedi.

## Son kullanıcı geri bildirimi ve gerçek cihaz bulgusu

- Kullanıcı Rezonans çekirdeğini etkinleştirirken ses duymadı; Plazma Topu,
  Ark Topu ve Tekrarlayıcı atış/isabet sesleri de duyulmadı. Eski ses/müzik
  karşılaştırmasında **yalnız müzik** duyduğunu söyledi.
- Gerçek Android WebView'de beş örnek decode ve playback=true; ses dosyaları
  eksik değil. Gerçek uygulama yöneticisi soundVolume1, musicVolume0.7,
  mute=false; bağlam running ve görünür/odaklı. AnalyserNode ile Rezonans
  efekt çıkışında 0.223, Plazma'da0.164 tepe ölçüldü. Bunlar kullanıcı
  tarafından duyulma kabulü değildir.
- Müzik birkaç saniyeliğine kapatılıp dört efekt gerçek uygulama kanalında
  çalındığında kullanıcı **“Çok kısık duydum”** dedi. Müzik tercihi geri
  yüklendi. Root bulgusu: çok düşük algılanan efekt seviyesi / müzik baskısı;
  sentezlerin özellikle bas bölgesinde yoğunlaşması telefon hoparlöründe
  sorunu büyütüyor. Hiçbir fiziksel ses kabulü PASS sayılmadı.
- Telefon medya sesi değişmeden okundu:49/150, muted=false, çıkış speaker.
  Kullanıcının sistem sesini değiştirmedik. Sahip olunan test uygulaması
  zaman zaman kapalıydı; kullanıcı daha sonra açık bıraktı. Uygulama çökmesi
  kanıtlanmadı, kullanıcı kapatmasıyla karıştırma.

## Yarım kalan ses düzeltmesi — henüz kodlanmış mobil türev / APK yok

- `client/src/gridshard-audio.js`: mix v20; battleMusicGain2.85→1.65,
  battleSfxGain0.42→0.90; core activate gain0.52→0.78,
  core shot0.32→0.58. Menü/result müzik, kullanıcı sliderları, limiter,
  compressor ve üç rutin ses/420ms bütçesi korunur.
- `client/src/battle/module-presentation-profiles.js`: saldırı cue gain0.70;
  lazerin mevcut özel cue gain0.65 ve pasif/destek/EMP trimleri korunur.
- `tools/combat_sfx_synth.py`: fazı sürekli, telefon için orta frekans
  katmanı eklendi; ham RMS ve peak hedefleri korunur, gürültü/click eklenmez.
  Core presence880+index×60Hz; saldırılar880–1400Hz, .65/.06 harmonikler.
- Sekiz saldırı modül WAV'ı, 14 çekirdek WAV'ı ve `pulse_cannon_fire.wav`
  jeneratörlerle yeniden üretildi. Son core en büyük örnek adımı0.08658
  (mevcut<0.09 hedefinde). Bütün kaynakların son testleri henüz çalışmadı.
- **Mobil OGG/AAC türevleri ve manifest şu anda eski kaynak hash'lerini
  taşıyor.** Bu ara durumda build/check'in uyumsuzluğu reddetmesi beklenir.
  Kaynakları geri alma; önce encode et, sonra ölçüm/denetim yap.
- ffmpeg bulundu: `C:/Users/S-A/AppData/Local/Microsoft/WinGet/Packages/
  Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/` altında; sonraki turda
  `Get-ChildItem ... -Recurse -Filter ffmpeg.exe` ile tam yolu al ve
  `python tools/encode_mobile_audio.py --ffmpeg <tam-yol>` çalıştır.
- Bazı istemci testleri v20/battle0.495 hedefiyle güncellendi
  (`gridshard-audio-result`, audio/browser-lifecycle sürüm kontrolleri).
  Sadece sabit sayı testiyle yetinme: hoparlör bandı, gerçek decode/miks,
  yoğun savaşta kırpma ve gerçek sunucu olay→ses bağlantısını doğrula.
- `tools/report_combat_audio.py` ve üretilen iki md/JSON henüz eski.
  Özellikle eski “genel kanal yükseltilmedi” ve 0.782059 tepe anlatımı v20
  için geçerli değildir. Gerçek yeni ölçümden güncelle; cihaz kabulü false.
- Sırada: kaynak/codec üretimi → anlamlı ses testleri + offline miks tepe
  kabulü → mevcut ayrı S1 TEST APK’sını yeniden derle/denetle → kullanıcı
  savaşta değilken veri koruyarak güncelle → fiziksel kullanıcı dinleme.
  Telefondaki mevcut paket **hâlâ v19**, web hash eb7152c64351e435.

## Yerel tanı ve korunacak test durumu

- `qa_reports/native-s1-20261106/` içinde native-audio-probe.json,
  native-audio-baseline.json, native-real-output.json ve tanı cjs dosyaları.
  Gizli oturum anahtarı çıktıya yazılmadı. Kanıtlar Git'e girmez.
- WebView'de geçici `window.__qaCoreAudio` tanı gözlemcisi vardır; triggerCue,
  core receive ve publishPlaybackState sarmalandı. Ses davranışını değiştirmez;
  yeni APK/yeniden açılışta kaybolur. Olası eski appDirector işaretçisini
  yeniden açılmış WebView'de varsayma. Son test müzik tercihini geri yükledi.
- Telefon API PID25020 / port8897 / retained runtime ve 24 açık modüllü
  aynı yerel hesap korunur. Durumu aşağıdaki kayıtta. Yalnız sahip olunan
  süreci komut satırıyla doğrulayarak yönet; canlı/asıl oyuna dokunma.
- Önceki 2108 Python/araç +25 PG, 779 istemci ve11 build PASS kayıtları
  **bu yeni ses değişikliklerinden öncedir**; v20 test sonucu diye sunma.

---

# Önceki durum — S1 botları, ödül planı ve telefon testi, 6 Kasım 2026

- Çalışma dalı `codex/s1-bots-tournament-rewards`, taban `49b2eca`.
  Bu turun kodu henüz commit/push edilmedi. Canlı 2.3.0 ve Play AAB değişmedi;
  önceki 5 Kasım bakım duyurusu dağıtımı aşağıdaki tarihsel kayıttadır.
- Kullanıcı kararı: 240 bot bütün turnuva ve lider panolarında bulunur;
  gerçek sıra korunur, botlar ödül alamaz. Bütün ödül sıraları bot ise bütün
  paket aynı içerikle kalıcı ödül planının sonuna bir kez eklenir. İnsan
  ikinciyse ikinci ödülünü alır; bot atlayarak birinciliğe taşınmaz.
- `server/data/bot_nicknames_v1.json`: 240 tek kelimelik benzersiz ad,
  Uç hariç; 12×20 takım. Kimlikler ve arena kurallarına uyan mevcut 24
  modüllü desteler korunur. Botlar yalnız yayımlanmış S1 istisnasıyla katılır;
  owner sıralama dışında, botlar ödül kuyruğunda ayrıca engellenir.
- Kapanışlar ve hash'li özgün paketler `team_document.tournaments.
  _competition_rewards_v1` içinde saklanır. `deferred` kuyruğu artan sıra ile
  `planned/after_reviewed_calendar` olarak eklenir; aynı dönem çoğalmaz.
  Gelecek takvime tahsis ayrı incelenmiş yayın işidir, kendiliğinden tarih
  açmaz veya aynı kozmetiği ikinci kez rezerve etmez.
- Haftalık ve takım turnuvasına ÖDÜLLER sekmesi eklendi. Yetkili dönem kasası
  mevcut sanatla önizlenir; cüzdan/envanter/hak değişmez. Arkadaşlar'ın beş
  sekmesindeki alt çizgi kaldırıldı; seçim/odak/rozetler korunur. İlk 12
  dışında kalan kendi takım sırası da görünür.
- Aday profil artık yedi dönem, altı oyuncu + üç Kutup Işığı takım öğesi.
  Takım ayrı başlangıçla en erken 7 Aralık 03.00 TR hedeflidir. Eksik dönem
  içeriğiyle takım açılmaz. S1 içinde başlayan ilk takım dönemi sezon devrinde
  silinmez. Kaynak profil draft, android_acceptance=false; canlı ayar açılmadı.
- Kod/kurallar ve güncel checklist/takvim/duyurular:
  `docs/planning/release-240-bot-competition.md`.
  Kaynak paketi, Docker COPY/izin listeleri ve CI PG/tarayıcı kapsamı yeni
  bot dosyasına bağlandı. Ekonomi tutarları değişmedi; kaynak hash'leri yenilendi.
- Yerel tam kontrol: 2108 Python/araç PASS / 52 dış servis SKIP;
  gerçek PostgreSQL ile ayrıca 25 odaklı test PASS (karma ikincilik,
  kapanış/erteleme rollback + reload ve gerçek S1 yedek/restore). 779 istemci, 11 build, 490 import kontrolü,
  plan/guard ve 10 gerçek HTTP eski istemci senaryosu geçti. Eski 2.3.0
  System duyurusu izole gerçek eski API ile tekrar geçti. Uzak CI çalıştırılmadı.
- Üç tarayıcıda TR/EN 320/393: beş arkadaş sekmesi ve iki turnuva ÖDÜLLER
  görünümü geçti. Son üçlü koşu tüm lider panolarındaki botları da doğrular.
  Gerçek PG kapanış ve teslimin birlikte rollback/reload kabulü geçti.
- Telefon: ayrı `com.gridshard.localdebug`, ad GRIDSHARD S1 TEST, Android16.
  Veri silmeden güncellendi. Normal WebView girişi, korunan aynı yerel hesap,
  40 sezon kademesi ve üç açılmamış test kasası PASS. Web hash
  `eb7152c64351e435`; 582 web dosyalı APK denetimi PASS, hook/secret yok.
- Son kullanıcı isteğiyle o yerel hesaba 24 modülün tamamı açıldı. Kupa,
  cüzdan, seviyeler ve seçili deste değişmedi; gerçek Kartlar ekranında 24
  modül doğrulandı ve açık bırakıldı. Kullanıcı sesleri deniyor. Dinleme ve
  kendi dokunma kabulü henüz onaylanmadı; android_acceptance true yapma.
- Telefon API 127.0.0.1:8897, USB reverse8897; yalnız test sunucusu PID25020
  (yeniden kullanmadan `server-process.json` ve komut satırını doğrula).
  Retained runtime `.mobile-debug/runtime-s1-20261106`; silme/prepare ile
  yeniden seed etme. `GRIDSHARD_E2E_S1_ACCEPTANCE=1`, `GRIDSHARD_E2E_S1_BOTS=1`;
  yalnız bu süreçte tarih12 Aralık. Native düzenek ve kanıtlar:
  `docs/planning/native-s1-test-20261106.md`, `qa_reports/native-s1-20261106/`.
- QA süreç hatası düzeltildi: tarayıcı teardown PID kaydı artık port başına;
  8899 testleri 8897 telefon sunucusunu kapatmıyor. Telefon test ederken bu
  sunucuyu kapatma veya yeni kod için savaş ortasında yeniden başlatma.
- Sonraki adım: kullanıcı fiziksel ses/Topla/arayüz geri bildirimi, commit/push
  ve uzak CI; ardından yayın kapıları. 2.4.0 paket hedefi23 Kasım, S1/ilk haftalık
  30 Kasım03.00TR. Canlıya bütün geliştirme kaynağını erken dağıtma.

---

# Güncel durum — bakım ön duyurusu canlıda, 5 Kasım 2026

- Ev bilgisayarından küçük 2.3.0 Sistem mesajı yaması dağıtıldı. Kayıt:
  `docs/planning/release-230-prerelease-deployment-20261105.md`.
  Duyuru kaynağı main `c720f22`; yalnız üç dosya alındı, bütün 2.4/S1 kodu dağıtılmadı.
  Bu operasyonun kayıt dalı `codex/legacy-230-system-mail`; uygulama kodu değişmedi.
- Canlı ana kaynak ilk LF manifestinden farklı hash taşıdı; içerik birebir aynı,
  yalnız CRLF satır sonları farklıydı. Canlı baytlar korunarak yama yeniden
  hazırlandı ve eski 2.3.0 uygulaması/gerçek API ile tekrar sınandı.
- İmaj `gridshard-production:2.3.0-mail-20261105`; kimliği
  `sha256:060346eabfb7c05919a0ae6cbdbdb98fb785f7a0aff8fe6dec2b1c741f05ba39`.
  Server 2.3.0, legacy alias 2.2.1, protokol 2; Android code14/AAB değişmedi.
- Aktif savaş/WebSocket/bekleyen sonuç yokken yalnız API durdu. Gerçek yedek,
  boş PostgreSQL restore ve bütün tablo karşılaştırması geçti. 55 mevcut profil
  ve korunan tablolar geçişte birebir aynı; ortam/secret/birimler korundu.
  Duruş-yedek-restore-açılış 22,4 sn. Healthy/restart0; prova kaynakları kaldırıldı.
- Yedek `/var/backups/gridshard-production/20261105-before-legacy-mail-c720f22`;
  operasyon `/opt/gridshard/operations/legacy-mail-20261105-c720f22`.
  Yeni Compose katmanı bu operasyonun `overlay.json` dosyasıdır. Sonraki
  dağıtımda mevcut katmanları yeniden keşfet; eski komutu varsayma.
- Gerçek HTTPS eski istemci: tek yeni konuk hesabı, normal auth/bootstrap,
  Sistem mesajı ve okundu/yeniden açılış PASS; mevcut oyuncu hesabı kullanılmadı.
  TR/EN 320/393 dört birleşim, aynı dağıtılan hash'lerle yerelde gerçek Ayarlar
  dil seçimi üzerinden ayrıca PASS. Canlı dil değiştirme görsellerinin tamamı
  kabul değildir; ikinci canlı hesap oluşturulmadı. Ayrıntı raporda.
- Son HTTPS kontrolü 5 Kasım 18.39 TR: 200, PostgreSQL/Redis hazır, savaş0.
  Operasyon/kapsayıcı son kontrolünden sonraki isteğe bağlı ek SSH denemesi
  zaman aşımına uğradı; sonraki sunucu işinde erişimi yeniden doğrula.
- `preview-2-4-0-season-one` artık mevcut uygulamada Sistem'de görünür.
  Bakım hedefi 23 Kasım 22.00–24 Kasım 00.00 TR. Ayrı turnuva popup'ı henüz
  görünmez; 2.4.0 sunucusu/AAB sonrasındaki kendi kapısı geçerli. S1/ilk haftalık
  turnuva hedefi 30 Kasım 03.00 TR; sezon ve takım başlangıcı açılmadı.
- Sırada 2.4.0/S1'in ertelenmiş fiziksel Android yükseltme/hesap dönüşü,
  hoparlör/kulaklık ve genel yayın kabulleri var. RELEASE-01 açık; bakım
  duyurusu diye tam geliştirme sunucusunu şimdi dağıtma. Takvim değişmedi.

---

# Önceki devir — S1 kabulü ve iki aşamalı duyuru, 5 Kasım 2026

- Dal `codex/s1-release-acceptance`; taban `afad546` (PR #2 sonrası main).
  Kullanıcı bu turdaki hazırlığı iş bilgisayarında, canlı ön duyuru dağıtımını
  **ev bilgisayarında** yapmamızı istedi. Bu bilgisayarda canlı sunucuya bağlanılmadı.
- Son kullanıcı eki **UI-09**: Gelen/Giden İstek sekmelerindeki sarılan metnin
  üstüne taşan alt çizgi kaldırıldı. Seçili turkuaz yüzey/kenar, odak ve rozet
  korunur. Üç tarayıcıda TR/EN 320/393 geçti; 2.4.0 paketi/takvim/checklist bağlı.
- Üretim kodu referansı `619c90a7527146ebc0ee2652fa81cfc9ccdf2bfe`;
  [PR #3](https://github.com/ozturkalihan2026/GRIDSHARD/pull/3),
  [CI 42019478488](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/42019478488).
  **Bütün işler PASS**: sunucu 2024/50 SKIP, araçlar 61/4 platform SKIP;
  gerçek PG/Redis 83 ve imaj restart/restore; istemci 779, build 11;
  Chromium/Android genel 78 + S1 8 + performans 2 + gerçek PvP 3;
  Safari genel 35 + S1 4 + performans 1; kaynak paketi üretildi.
  Sonraki kayıt commit’i belge ve WebKit’in mevcut 150 sn proje test bütçesine
  uyumdur; üretim kodu bu referansla aynıdır. Önceki başarısız koşular kabul değildir.
- Ödül önizlemesi okundu yanıtında kartın yeniden kurulması, gecikmiş odak
  kaydırması ve hover ile kapanıyordu. Rozet alanları liste imzasından çıkarıldı;
  gerçek ödül değişimi hâlâ listeyi yeniler. Sabit panel görünür sandıkla kayar,
  görünümden çıkınca kapanır; hover/odak seçimi değiştirmez, açık tıklama değiştirir.
  Regresyon gerçek okunma yanıtını pin sonrasına bırakıp aynı paneli, rozetin
  sönmesini, kaydırmayı ve görünümden çıkışta kapanmayı birlikte sınar.
- [S1 matrisi](docs/planning/release-240-s1-acceptance.md): REWARD-06 ve
  SEASON-01 yazılım kabulü done; SEASON-00 ve UI-08 branch_ready. Gerçek yerel
  PostgreSQL ile 68 test geçti; 80 hak kapanış/rollback/reload ve gerçek
  pg_dump/pg_restore ile korundu. 22 haftalık/ilk 10 kasası sabit bütçeyle açıldı.
- `first_season_launch_v1.json`: reward_budget, unique_cosmetics,
  rollover_restore, old_clients true; android_acceptance false; status draft.
  Altı dönem/altı oyuncu öğesi/234 ek sıradan parça, hash’li aday pakette sabit.
  Yetkili kozmetik kataloğu ve canlı sezon yayımlanmadı; takım ayrıca kapalı.
- Yeni `e2e/s1-acceptance.spec.js`: gerçek yerel API makbuzları; üç tarayıcıda
  TR/EN 320/393 boyutlarının 12 birleşimi, ayrıca azaltılmış hareket geçti.
  Önizlemenin alt dock’u kapatması düzeltildi. Fiziksel Android ve hoparlör/
  kulaklık kullanıcı isteğiyle ertelendi; emülasyonla kapatılmayacak.
- [İki duyuru ve evden dağıtım](docs/planning/release-230-prerelease-system-mail.md):
  `preview-2-4-0-season-one` yalnız 2.3.0 Sistem mesajında bakım ön haberi.
  **23 Kasım 22.00 → 24 Kasım 00.00 TR**, yaklaşık 2 saat;
  UTC 23 Kasım 19.00–21.00. AAB değiştirmeyen üç dosyalık eski sunucu paketi hazır.
- `preview-2-4-0-tournament-launch` ayrı popup+Sistem kampanyasıdır. 2.4.0
  sunucusu ve yeni AAB sonrasında; min_server_version 2.4.0, yayın başlangıcı
  23 Kasım 19.00 UTC. S1/ilk haftalık turnuva **30 Kasım 03.00 TR**, haftalık
  katılım/kupa/ödüller, ilk 10, kozmetikler ve ayrı takım başlangıcı anlatılır.
  Eski haberin okunması/onayı yeni pencerenin onayını tüketmez. İkisi aynı kimlik değildir.
- Bakım penceresi takvim/backlog/katalogda bağlı ve doğrulanır. Genel sonraki
  sürüm popup standardı korunur; 2.4.0 turnuva penceresi tek başına önceki ön
  duyuru yayın kapısını karşılamaz. Tarih kayarsa iki dil ve kanonik takvim birlikte değişir.
- Yerel: 2089 Python PASS / 50 dış servis SKIP, 779 istemci PASS, build 11 PASS;
  yeni turnuva popup’ı üç tarayıcıda TR/EN 320/393; eski 2.3.0’ın değiştirilmemiş
  arayüzü ve gerçek eski API ile System mesajı/okunma kalıcılığı geçti.
  Yerel son S1 matrisinde Windows WebKit EN393 toplam 120 sn sınırını bir kez
  aştı; proje bütçesiyle tekrarsız geçti. Uzak 12 S1 birleşimi tekrarsız PASS.
  Kanıt: `qa_reports/s1-ci-42019478488.json`; eski CI kayıtları aşağıda tarihseldir.
- Evde önce bu dalı güncelle. `tools/prepare_legacy_announcement.py` ile
  `qa_reports/legacy-230-announcement-handoff` üret; `tools/verify_legacy_announcement.py --browser`
  ile doğrula. `qa_reports` Git ile taşınmaz, komutlarla aynı paket yeniden üretilir.
  Canlı main SHA-256, manifestteki incelenmiş 2.3.0 tabanıyla eşleşmiyorsa
  üzerine yazma; gerçek tabandan aynı küçük yamayı yeniden hazırlayıp test et.
  Bütün 2.4/S1 geliştirme sunucusunu bakım duyurusu diye erkenden dağıtma.
- Paket etiketi 2.3.0/code14, canlı ortam/AAB/başlangıç ayarları değişmedi.
  RELEASE-01 ve fiziksel cihaz/yayın kapıları açıktır; yeni sanat veya ekonomi
  baz çizgisini baştan üretmek sıradaki iş değildir.

---

# Önceki kabul — 5 Kasım 2026

- COMM-01 ve COMPAT-01 yazılım kabulü done. Dal `codex/prerelease-announcements`.
  Uygulama kaynağı `0cbe34cc8113dccdd7e62f0022a870ad19eec3e6`; CI 41919146605 bütün işler PASS.
  Sonraki commit yalnız kabul/checklist/checkpoint belgeleridir.
- Duyuru ilk uygun ana ekranda bir kez; Tamam hesapta kalıcı, offline outbox
  ve Sistem mesajı ayrı. Sürüm sonrası aynı kimlikte sezon metni; eski onay
  yeniden açılmaz. Patch/minor/major sürüm kapısı ön duyuruyu zorunlu tutar.
- AUDIO-03 / 2.5.0 ve AUDIO-04 / 2.7.0 yalnız üretim planıdır; todo kalır.
  Hedefler 21 Aralık / 15 Şubat, sayılar 1 menü+1 savaş / 1 menü+2 savaş.
- Kabul: `docs/planning/prerelease-announcement-acceptance-20261105.md`. Yerel 2072 Python PASS / 48 dış servis SKIP,
  779 istemci; son kaynak CI gerçek PG/Redis/imaj/Chromium/Android/WebKit/kaynak
  paketini geçti. Oyun grafik uyumu 4 saniyelik pencerelerle korunur;
  Safari referansı Apple Silicon'dır; performans yayın eşikleri değişmedi.
- Canlı 2.3.0/code14, AAB, sezon açılışı ve fiziksel cihaz/ses dinlemesi
  yapılmadı. Sırada S1 kaynak/ödül/görsel/cihaz yayın matrisinin kalan kabulleri
  var; yeni sanat üretimi ya da BASE-01 tekrarı değildir.
- Aşağıdaki eski CI bekleme kayıtları tarihsel kayıttır; güncel kaynak üstteki
  kabul ve `artifacts/prerelease-20261104/FINAL_STATUS.json` ile doğrulanır.

---

# Ön duyuru standardı ve müzik planı — 4 Kasım 2026

- Yeni dal: `codex/prerelease-announcements`; önceki sürüm dalındaki takılı
  CI'ın concurrency grubundan bağımsızdır. Uygulama/Play etiketleri 2.3.0/code14.
- COMM-01 dalda hazır. `release_announcements_v1.json` tek TR/EN kaynaktır:
  2.4.0 öncesi sürüm duyurusu; aynı kimlikle sürüm sonrası S1 öncesi metin.
  Önceden Tamam diyen yeniden görmez. Sistem mesajı ayrıca okunabilir.
- Onay hesapta kalıcıdır; cihazdaki hesaba özel outbox ağ hatasında Tamam'ı
  kaydeder ve sonraki inbox yenilemesinde eşitler. Okuma/silme onaydan ayrıdır.
  Yükleme/savaş/başka modal sırasında açılmaz; eski API'de alan yoksa devam eder.
- 2.3.0 sonrası patch/minor/major sürümlerde release_guard incelenmiş ön
  duyuru ister. Taslak/denetim: `tools/release_announcements.py`; yayın penceresi,
  hedef takvim ve iki dil doğrulanır. Ön duyuru, gerçek güncelleme notu değildir.
- AUDIO-03 / 2.5.0: en az bir yeni menü + bir savaş bestesi; merak/umut ve
  kontrollü rekabet. AUDIO-04 / 2.7.0: bir menü + iki özgün savaş bestesi;
  gizem, keşif gerilimi ve cesaret. Bu iki iş planlandı, müzik üretilmedi.
  Ortak sanat/ses yönü, mevcut codec/miks/tercih hattı ve master kararı korunur.
- Ayrıntı: `docs/planning/prerelease-announcements-and-music.md`; checklist,
  takvim ve 2.4/2.5/2.7 briefleri bağlı olarak üretildi. Tarihler değişmedi.
- Yerel testler `artifacts/prerelease-20261104/`: tam Python ve istemci,
  build, 320/393 TR/EN + reload/offline, gerçek PG rollback/cache kaybı geçti.
  CI kaynak/sonuç dosyaları aynı klasördedir; yeni commit CI sonucu beklenecek.
  Fiziksel Android, canlı sunucu, AAB veya sezon açılışı yapılmadı.
- İlk yeni CI'da sunucu/istemci/PG-imaj geçti; Safari savaş bütçesi kaldı.
  Bağımsız boş sayfa rAF kanıtı Intel Mac havuzunun oyunsuz durumda bile
  34 ms sınırını aştığını gösterdi. Grafik uyumu denemesi geri alındı;
  oyun kodunun 4 saniyelik kademesi, manuel ayar ve yayın bütçesi korunur.
  macOS 15 Apple Silicon havuzunda aynı test tekrar çalışacak.
  Testte savaş kareleri atılmaz; bağımsız zamanlama kanıtı ayrıca kaydedilir.
- Bu istemci kodu kurulmadan eski native 2.3.0 popup gösteremez; sunucu
  dağıtılınca Sistem mesajını okuyabilir. 2.4.0 istemcisinde sezon öncesi
  metin, aynı onay kimliğiyle desteklenir. Kaynak hazırlığı canlı yayın sayılmaz.

---

# COMPAT-01 ara CI kaydı — 4 Kasım 2026, 20.29 Türkiye saati

- Uygulama kaynağı `0c90cc9037983ee21b9ff206cfe9051ceb05b61a`,
  `codex/release-2-4-0` dalına push edildi. Görev hâlâ `branch_ready`.
- CI: https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/41873986873
  Sunucu, istemci, gerçek PG/Redis/üretim imajı ve Chromium/Android PASS.
- Safari ARM Mac kapasitesinden dolayı önce hiç başlamadı; desteklenen
  `macos-15-intel` havuzuna taşındı. Bu son kaynakta Intel Mac işi
  `126728333059`, tarayıcı kurulumunda tanımlı 10 dakika sınırını aştı.
  Normal ve force-cancel istekleri kabul edildi; GitHub işi kapatmadığından
  tek işi yeniden çalıştırma isteğini `already running` ile reddediyor.
  GitHub bağlayıcısında Actions yazma izni yok; mevcut Git oturumu API'si
  dispatch/cancel işlemlerinde kullanıldı. Kimlik bilgisi dosyaya yazılmadı.
- Sıradaki adım: iş kapandığında aynı kaynaktaki Safari işini ve bağımlı
  kaynak paketleme kontrolünü yeniden çalıştır; bütün CI işleri geçince
  COMPAT-01'i done yap, checklist/sürüm belgelerini üret ve kayıt commit'ini push et.
- Yerel son kaynak kanıtı: `artifacts/compat-240-20261104/http-proof-mac-source/proof.json`.
  Temiz commit, 10 gerçek HTTP + üç UI açılışı PASS. Python 2057 PASS / 47
  dış servis SKIP; client 778, build 11, yerel PG 77 PASS / 1 Redis SKIP;
  6 mobil akış + 2 saklı kimlik kontrolü PASS. Son durum `FINAL_STATUS.json`.
- Canlı 2.3.0/code14, sezon başlangıcı, AWS/env, AAB ve 8891 değişmedi.
  Fiziksel Android/Play/ses dinlemesi yayın kapısında kalır.

---

# COMPAT-01 — 4 Kasım 2026 ev bilgisayarındaki uygulama

- Dal codex/release-2-4-0. Kurulu2.3/2.2.1 ve yeni istemci yazılım uyumu
  uygulandı. Kabul docs/planning/release-240-client-compatibility.md; en son
  durum artifacts/compat-240-20261104/FINAL_STATUS.json'dan okunur.
- Gerçek sağlık derlemesi **runtime_release_version**. server_release_version
  artık2.3.0 alias; release_version2.2.1, versionbeta72 sabit. Operatör gerçek
  sürümü yeni alandan okumalı. API/minimum/incelenmiş minor hatları/yetenekler
  ayrıca denetlenir. Yeni eksik sözleşme eski alana düşmez; proto/kalıcılık geçmez.
- client/tests/fixtures/installed altında iki TAM değiştirilmemiş eski relay
  executable ve Git/SHA-256 kökeni; bunlar aktif test girdisidir, eski PASS
  raporu değildir. .gitattributes baytları korur, üretim bundle'a girmezler.
- Gerçek loopback HTTP: eski2.2.1/2.3→yeniAPI ve yeni→yeni/iki eskiAPI;
  web+native-origin emülasyonuyla10senaryo PASS. Auth/bootstrap/yüklemede
  aynı kimlik/korunan takım rotası gerçekHTTP; SecureStorage bellekte emüle.
- Yeni UI üç API'de Chrome'da açıldı, JS/varlık hatası0. İki telefonda6E2E
  PASS: geleceksürüm/minimumTR-EN/protokol hazır olma/503retry. Fiziksel
  Android/Keystore/TLS/Play yükseltmesi kanıtı değildir; bu kabul kullanıcı
  isteğiyle ertelenmiş genel RELEASE-01 kapısında kalır.
- Gelecek2.4 karşılaştırması için yalnız izole sağlık kimliği ve test
  expectedVersion parametresi2.4 simüle edildi. Gerçek handler'lar çalıştı;
  paket etiketleri hâlâ2.3/code14. AWS/env/S1 başlangıcı/AAB/8891 değişmedi.
- Tam yerel Python/istemci son sayıları ve CI kaydı FINAL_STATUS.json'dadır.
  CI'a aynı gerçekHTTP kaynağı ve yeni browser testleri eklendi. Branch_ready
  yerel kabulü anlatır; yeni commit CI sonucu ayrıca kaydedilecektir.
- Sonraki iş: SEASON-00/REWARD-06/SEASON-01 gerçek PG/Redis rollback/reload,
  genel CI/yayın kabulleri ve ertelenen cihaz doğrulamaları. BASE-01 done;
  sıradaki iş tekrar ekonomi baz çizgisi veya yeni sanat üretimi değildir.

---

# GRIDSHARD — güncel çalışma durumu

4 Kasım 2026. Başlangıç: [belge dizini](docs/README.md).

## Ev bilgisayarına devir — 4 Kasım 2026

- Kullanıcı iş bilgisayarındaki birikmiş 2.4.0 çalışmalarının commit/push edilmesini,
  sıradaki işin ev bilgisayarında yapılmasını istedi. Bu kaydı içeren commit;
  S1 planı/profili, sabit kasa açılışı, günlük/sezonluk emirler ve sarı gezinme/ses
  uygulamalarını birlikte taşır. Aşağıdaki eski "commit/push edilmedi" notları
  ilgili dilimin kayıt anını anlatır.
- Evde önce yerel değişiklikleri `git status` ile kontrol et; temiz `main` üzerinde
  `git pull --ff-only` ile bu kaydı al. Yerel değişiklikleri silme veya üzerine yazma.
- Sıradaki iş **COMPAT-01**: değiştirilmemiş 2.3 ve 2.2.1 istemcileriyle yeni
  sağlık/başlangıç/protokol, eski API, minimum/capability uyumu ve native
  yönlendirme/güvenli güncelleme kabulü. Kanıt dosyası:
  `docs/planning/release-240-client-compatibility.md`. Bu işe iş bilgisayarında başlanmadı.
- Fiziksel Android hoparlör/kulaklık dinlemesi kullanıcı isteğiyle ertelendi.
  Gerçek PG/Redis ve CI/cihaz yayın kabulleri açık; yerel testleri bunların yerine sayma.
  Canlı ortam, sezon açılışı, AAB ve 2.3.0 paket etiketi değiştirilmedi.

## Depo ve yayın

- İş bilgisayarı: `D:/Projects/GRIDSHARD`; mevcut dal `main`.
- Kullanıcı yerel/uzak eşitlemesini bildirdi; önce `git status` ile güncel durumu kontrol et.
- Son teyit edilen yayın 2.3.0/code14. Play yayını kullanıcı beyanıdır;
  ayrıca fiziksel cihaz kabulü bildirilmedi. [Teyit](docs/planning/release-230-user-confirmation-20261103.md).
- Aktif hedef 2.4.0; kasa teslimi/açılışı ve ek günlük/sezonluk emirler geliştirme kodunda. Canlı veri,
  AWS, sezon açılış ayarı ve AAB değiştirilmedi.

## Güncel karar ve çalışma sırası

- [Bağlı sürüm rehberi](docs/GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md),
  [2.4.0 briefi](docs/planning/releases/2.4.0.md),
  [checklist](docs/GRIDSHARD_GELISIM_CHECKLIST_20261103.md).
- 2.4.0: mevcut 24 modülle S1; 40 kademe/kaynak bütçesi, açık kaynak haftaları,
  tekil kozmetik tahsisi, kazanılmış hakların kapanış/restore koruması ve eski istemci uyumu.
- Zorunlu sunum işleri: UI-07 bütün geri/ileri gezinme kontrollerinde son sarı tasarım;
  AUDIO-01 saldırı VFX ses kapsamı/cızırtı; AUDIO-02 çekirdek aktivasyon/etki sesleri.
  Yerel uygulamaları ve ölçümleri tamamlandı; aşağıdaki kabul kaydı esas alınır.
- BASE-01 raporu tamamlandı: [ekonomi baz çizgisi](docs/planning/economy-baseline.md).
  SEASON-00 kalan yayın kabulleri, COMPAT-01 ve yayın doğrulaması sıradadır.
  Gelecek sezon sanatını ilk iş diye başlatma.
- Hedef yayın 23 Kasım, S1 30 Kasım 03.00 TR. Ek yük için 6 Kasım kapasite kontrolü;
  riskte tarih yeniden karara bağlanır, kalite işleri sessizce çıkarılmaz.
- S2+ yeni hazır modül gerektirir. Planlı kayıt hazır içerik değildir; eski koleksiyon
  başka dönem/mağazada tekrar sunulmaz. Takım açılışı kişisel sezondan bağımsızdır.

## Kaynaklar ve doğrulama

- [Backlog](docs/planning/gridshard_development_backlog_v1.json): görev durumu/bağımlılık/kabul/kanıt.
- [Takvim](docs/planning/release_calendar_v1.json): tarihler, alt paketler, çalışma aralıkları.
- `python tools/development_checklist.py --write`, `python tools/release_calendar.py --write`,
  `python tools/release_delivery_plan.py --write`; ardından her biri için `--check`.
- 71 görev, 28 alt paket, altı brief; yeni özellikler plan yazıldığı için tamamlanmaz.
- Geçerli oyun: [oyun kanonu](docs/OYUN_KANONU.md), Akım V8, modül V7 ve mevcut kaynak/testler.
  Sanat yönü: [ortak kabul](docs/SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md).
- Eski checkpoint, devir kayıtları, emekli test gövdeleri ve eski raporlar Git geçmişindedir.
  Geçmiş PASS sayılarını yeni commit'in kanıtı olarak kullanma.

## 4 Kasım temizlik doğrulaması

- Eski karar/test arşivleri ve tarihsel QA raporları kaldırıldı; geçerli regresyonlar korundu.
  Salt eski raporu okuyan test, yeni eksik/atlanmış kanıtın PASS olamadığı izole testlere çevrildi.
- Bu tur: sunucu/araç Python testleri **1994 geçti, 44 dış servis senaryosu atlandı**;
  istemci **765**, JS derleme/site/araç **38** geçti. Üretim web derlemesi,
  462 dosyalık import denetimi, üç plan kontrolü ve yerel belge bağlantıları geçti.
- Font TTF aslı `native-assets/fonts/Rowdies-Bold.ttf` altında korundu;
  eski önizleme testi kaldırıldı, aktif gömülü font testleri korundu.

## BASE-01 sonucu

- `python tools/report_economy_baseline.py --write` / `--check`: kaynaklardan
  40 kademe, 28 giriş günü, dört sandık, on ürün ve altı 1/28 gün senaryosu üretir.
- 40. kademe 12.240 XP; altı görev 135 XP/75 Akı günlük. Dört maç/gün ve tüm
  görev varsayımında ücretsiz oyuncu 28 kademeye, iki premium birlikte 33'e ulaşır.
  XP/fiyat değişmedi; erişilebilirlik kararı SEASON-00 kabulüne taşındı.
- Baz çizgisi S1 sabit bütçesini modeller. Sonraki API incelemesinde servis
  katmanına ek olarak eski API'nin rastgele kademe sandığı verdiği doğrulandı.
  Yayınlanacak S1 profili ek sandık sayısını sıfırlar; eski kazanılmış ek sandık
  hakları korunur. Rapor eski API'nin toplam geliri diye okunmamalıdır.
- S1 önerisi: mevcut 40 kademe kaynakları; ücretsiz 40'ta aurora çifti, sıralama
  1.'sine solar çifti, son hafta 1.'sine abyss çifti. İlk üç hafta laser/shield/
  pulse_cannon için ilk üçe 36/24/18 parça; toplam ek tavan 234 sıradan parça.
  Bunlar yalnız bütçe önerisi; runtime tahsis/yayın değişmedi. Takım ayrıca kapalı.
- BASE-01 doğrulaması: ekonomi/bütçe/plan ve mevcut sezon/ödül teslimi için
  56 odaklı test geçti; baz çizgisi --check, üç plan kontrolü ve 464 dosyalık
  import denetimi geçti. BASE-01 done; SEASON-00 ve sunum envanterleri açık.

## S1 kullanıcı açıklaması — kasa ve XP

- [S1 sözleşmesi](docs/planning/season-1-rewards-and-xp.md), kaynak
  [XP planı](docs/planning/season-1-engagement-v1.json); `tools/plan_season_xp.py --write/--check`.
- Kullanıcı XP açığını bilerek istiyor: 12.240 eşiğini düşürme. Mevcut altı
  günlük emir korunur; 4 ve 6 Arena savaşı için ayrı +15 XP, 12 sezonluk emir
  toplam 1.800 XP önerisi. Yeni emirler kaynak para/parça vermez.
- Ücretsiz, %50 zafer, tüm ilgili emirler varsayımı: 6 maç+1 reklam/gün 27. gün;
  8 maç/reklamsız 25. gün biter. 6 maç/reklamsız 39. kademede kalır.
  Giriş tek başına XP vermez; aktif gün için uygun bitmiş savaş gerekir.
- REWARD-06 sabit kasa çekirdek teslimi; UI-08 Topla → aynı kasa al/aç →
  animasyon/ses/makbuz sonucu. Bunlar 2.4 zorunlu işleri; UI-03 2.5 seçim kasasıdır.
- Haftalık/takım/ilk 10 kasaları mevcut ödül türlerini sabit içerikle taşır;
  her kasaya her tür veya her sıraya yeni kozmetik vaat edilmez. Mevcut giriş
  25 çekirdek parçası korunur; yarışmaya ek çekirdek miktarı bütçelenmeden açılmaz.
- REWARD-06/UI-08 ve SEASON-01 ilk dilimleri kodlandı. RELEASE-01 bağımlılıklarıdır. Ek yük 6 Kasım kontrolüne
  girer. Tarihler otomatik kaydırılmadı; eski kazanılmış haklar korunacak.

## İlk uygulama dilimi — kasa teslimi/açılışı

- [Kod sözleşmesi ve kanıt](docs/planning/release-240-fixed-crate-contract.md).
  REWARD-06/UI-08 in_progress; tüm kabul koşulları bitmiş sayılmaz.
- Sabit kasa core_type_id/core_shards desteği ve tüm içerik mutasyondan önce
  doğrulama. Topla `?chest_delivery=open` ile aynı işlemi al/aç; eski query'siz
  toplama korunur. Yeni istek kimliği `inbox-open:{message_id}`; açılmış kasa
  makbuzu tekrar/restore halinde yeniden kullanılır, ikinci grant yoktur.
- UI açılış/ödül sesi/tekli ve toplu makbuz sonucu; kısmi hatada yalnız başarılar
  gösterilir. 2015 Python PASS/44 dış servis SKIP, 767 istemci PASS; 26 odaklı
  teslim testi. Yerel Chrome TR393/EN320 görsel fixture kontrolü PASS.
- Gerçek PG rollback testi eklendi, servis ortamı olmadan atlanır. Android kabulü
  bekliyor. Sıradaki ana iş S1 profile/tekil tahsis/kapanış ve sarı gezinme/ses envanteridir.

## SEASON-01 ilk uygulaması — günlük/sezonluk emirler

- [Kabul kaydı](docs/planning/release-240-mission-acceptance.md). Görev in_progress;
  yeni emirler artık kodda, tüm 2.4.0 kapıları kapanmış değildir.
- `server/app/season_missions.py` revision 1: 4/6 uygun savaşa ayrı +15 XP;
  12 sezonluk emir toplam 1.800 XP. Eski altı emir ve 12.240 XP eşiği korunur.
- Motorun bitmiş Arena AI/dereceli PvP sonuçları; sunucu tarafında maç tekilliği,
  aktif UTC günü ve kabul edilmiş çekirdek kullanımı. Yeni emir XP'si premiumla çarpılmaz.
- Özel meta JSON durumunda kayıt/restore; gün devrinde kazanılmış ek günlük XP,
  sezon devrinde kazanılmış bütün yeni emir XP'si önce kapanan sezona işlenir.
  Ayrıntılı eski emir defteri özel arşivde kalır. Tam sezon yolu teslimi SEASON-00'dadır.
- Yeni dönemli talep API'si `engagement/season-missions/{id}/claim`; eski talep
  gövdeleri korunur. Sekiz günlük/12 sezonluk kart, TR/EN, klavye sekme geçişi.
- Gerçek PG rollback/replay testi eklendi; yerel servis olmadan SKIP. Android
  güncelleme/hesap değiştirme ve bütün sezon yolu hakları kabulü açık.
- Son kaynak doğrulaması: **2031 Python PASS / 46 dış servis SKIP**, **770 istemci PASS**,
  **iki Chrome akışı PASS**. TR393/EN320 görüntülendi; 469 dosya/0 import sorunu,
  web derlemesi ve beş plan/bütçe kontrolü geçti.
- Değişiklikler henüz commit/push edilmedi. Canlı sunucu, env, AAB ve sürüm etiketi değişmedi.

## SEASON-00 ilk uygulaması — S1 profili ve kapanış

- [S1 profil/kapanış sözleşmesi](docs/planning/first-season-launch-profile.md).
  `server/data/first_season_launch_v1.json` draft; beş yayın kabulü false.
  Gerçek kozmetik kataloğu hâlâ 15 öğe / 0 rezervasyon / 0 yayın.
- Hazırlık komutu `python tools/prepare_first_season.py --check` / `--preview`;
  dosya yazmadan altı aday dönemi, altı tekil oyuncu öğesini ve 234 ek sıradan
  parçayı doğrular. Kaynak paketine profil dahil; CI kontrolü eklendi.
- Açık `resource_only` haftaları: W49 Lazer, W50 Kalkan, W51 Darbe Topu;
  ilk üçe 36/24/18, mevcut Kredi/Akı. W52 birinciye Derin Akım; sezon yolu
  40'a Kutup Işığı, liderlik birinciye Güneş Ocağı. Takım ayrı kapalı kalır.
- Kazanılmış kademe gerçek hedef/miktar/revision/hash ile özel kayda alınır.
  Kapanış önce emir XP'sini işler, sonra alınmamış sabit hakları mesaj kutusuna
  aktarır. Başarısız kapanış bütün profil üzerinde geri alınır. Premium kökeni
  eski sezonun iade/restore defterine bağlı kalır; tarihsel ek sandık hakkı korunur.
- S2 yeni hazır modül ve yayınlı dönem ödülü yokken waiting_for_content;
  yeni sezon XP/premium/turnuva açılmaz. Eski mesajlar açılabilir. Eski istek
  tekrarı ilk makbuzun dönemini kullanır; yeni sezon stoğu üretmez.
- Haftalık ilk kapanış tüm katılımcılara özel sıra tanığı yazar ve ilk üçün
  paketlerini birlikte sabitler. Yeniden kayıt ve kazanan hesapların silinmesi
  sonraki oyuncuyu yeni kazanan yapmaz. Eski kısmi dağıtımlar otomatik yeniden hesaplanmaz.
- Son doğrulama: **2052 Python PASS / 47 dış servis SKIP**, **770 istemci PASS**,
  **3 Chrome akışı PASS**, 474 dosya / 0 import sorunu; web derlemesi ve kaynak
  sürüm kontrolü geçti. Yeni gerçek PG kapanış rollback/reload testi servis yokken SKIP.
- SEASON-00 in_progress. Gerçek PG/Redis, değiştirilmemiş eski istemci ve Android
  kabulü açık. Bu dilimi izleyen sunum işi aşağıdaki sarı gezinme ve ses uygulamasıdır.
  Bu değişiklikler commit/push edilmedi; canlı env/tarih ve AAB değiştirilmedi.

## UI-07 / AUDIO-01 / AUDIO-02 — yerel uygulama

- Kullanıcı bağlı Android cihaz yerine **yerel kontrollerle ilerlenmesini** istedi.
  Fiziksel hoparlör/kulaklık dinlemesini tamamlanmış sayma; yayın kapısı ayrı kalır.
- [Gezinme matrisi](docs/planning/release-240-navigation-matrix.md): 11 statik geri,
  iki ileri kontrol sahibi; 44×44 sarı yüzey, eski mavi pseudo yüzey/dot kaldırıldı.
  Basılı/klavye odağı/devre dışı durumlar; ödül/rehber TR/EN 320×568 ve 393×852.
  Profil/pano, etkinlik, takım yönetimi ve boş sohbet gerçek dönüşleri yerelde
  test edilir. Mesaj gönderilmez. Her profil penceresinin dört dil/boyut birleşimi
  için ayrı görsel yayın kabulü açık; native geri yöneticisi değiştirilmedi.
- [Modül matrisi](docs/planning/release-240-module-audio-matrix.md),
  [çekirdek matrisi](docs/planning/release-240-core-audio-matrix.md),
  [PCM/hash ölçümleri](docs/planning/release-240-audio-measurements.json).
  Sekiz saldırı WAV’ı ve yedi çekirdeğin 14 WAV’ı sürekli faz/yumuşak uçlarla
  üretildi; genel SFX/müzik kazançları ve rutin 3 ses/420 ms bütçesi korundu.
  Gerçek çekirdek sesi görsel ankraja bağlı kalmaz; tekrar snapshot çift ses vermez.
  Takviye için olmayan atış mekaniği üretilmez.
- `modules/` OGG/AAC alt klasörü ve içerik hash kontrolü; WebAudio diğer codec’i
  WAV’dan önce dener. Üretim web paketi 105 kaynak WAV’ı çıkarır. Gerçek Chromium
  ve Android öykünmesinde 24 cue başlatıldı; OGG hatasında AAC ile çalıştı.
  Dört saniyelik yoğun müzik/savaş render’ı: tepe **0,782059**, kırpılan örnek **0**.
  Windows yerel WebKit AudioContext sunmaz; ses senaryosu burada SKIP, macOS CI
  kapısı etkin. Bu fiziksel iPhone/Android ses kabulü değildir.
- Yerel doğrulama: **774 istemci testi**, **11 paketleme testi**, **2052 Python
  PASS / 47 dış servis SKIP**; son eklenen üretici tekrar üretilebilirlik testi ve
  odaklı eski ses sözleşmesi **4 PASS**. Python taraması **477 dosya / 0 sorun**.
  Son kaynakla tamamlanan tarayıcı senaryoları **14 PASS / 1 yerel WebKit ses SKIP**
  (üç profil; son takım/sohbet kontrolleri ayrı odaklı koşuda doğrulandı).
  Darbe Topu üretici isim çakışması giderildi; master aynı hash ile yeniden üretildi.
  Web derlemesi ve kaynak sürüm koruması geçti; paket etiketi hâlâ **2.3.0**.
- Checklist’te üç sunum işi `branch_ready`: dalda hazır, canlıda yok. Gerçek cihaz,
  dış servis/CI, eski istemci ve S1 yayın kabulü ayrıca tamamlanacak. COMPAT-01
  aktif sürümde sıradaki başlanabilir iş; commit/push, canlı env/tarih ve AAB yok.
