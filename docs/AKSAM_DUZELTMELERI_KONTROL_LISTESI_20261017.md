# 17 Ekim akşamı — devam edilebilir iş listesi

Kullanıcı isteği: İşler bitirildikçe bu dosyada işaretlenecek. İşaretli madde, kod/varlık değişikliği ve ilgili otomatik kontrolün tamamlandığını belirtir; oyun içinde görsel ve işitsel son onay kullanıcıdadır. Commit, sunucu başlatma ve dağıtım bu çalışmaya dahil değildir.

## Yapılacaklar

- [x] **Kart önizlemeleri:** Tüm modül/çekirdek kartlarından temsili ışın, hedef, animasyon ve “Temsili çalışma örneği” yazısını kaldır. Yalnızca gerçek çizim ortalanarak kalsın. Kaynak: `client/src/detail-card-layout.js`, `client/src/detail-cards-v10.css`.
- [x] **Hasar bilgisinin doğruluğu:** Motorun gerçek davranışıyla teorik hasar/sn hesabını karşılaştır. Sırf bilgi kartına uydurmak için dengeyi değiştirme; doğru katmanı düzelt ve kararı aşağıda kaydet. Kaynak: `server/app/game/module_sheet.py`, `server/app/game/engine.py`, kart istatistikleri.
- [x] **İmza mekanikleri:** Tüm modüllerin mevcut gerçek imza mekaniklerini İstatistik sayfasına ekle. Yeni mekanik icat etme; katalogdaki açıklamayı kullan. Kaynak: `client/src/app.js`, sunucu modül kataloğu.
- [x] **Lazer sesi:** Rahatsız eden uzun cızırtı yerine kısa, yumuşak, özgün bir lazer sesi; diğer efektlerden de daha geride. Ortak ses sınırları ve görünürlük temizliği korunsun.
- [x] **Kırmızı can kalbi:** Onaylı görsel dilinde kırmızı kalp üret; gerçek saydamlık ve küçük WebP kullan. Merkezi can ikonuna bağla. Üretim istemini ve varlık yolunu kaydet.
- [x] **Tek sayfa yetenekler:** Modül ve çekirdek yeteneklerini normal dikey ekranda kaydırmasız sığdır. Seçimleri, kilitleri, maliyetleri ve gerçek seçim işleyişini koru; çok kısa/yatay erişilebilirlik istisnasını ayrıca belirt.
- [x] **Kalkan şeffaflığı:** Kubbe/petek görünürlüğünü azalt, şekil ve gerçek savunma davranışına dokunma. Var olan sınırlı VFX yaşam döngüsünü koru.
- [x] **Müzik/efekt dengesi:** Savaş müziği baskın, VFX arka planda. WebAudio ve HTML ses yolları aynı dengeyi kullansın; sonuç ekranına geçişte ses zıplamasın.

## İlk bulgu — henüz bu tur uygulanmış değişiklik değildir

Önceki salt okunur kontrolde seviye 3 Lazer: ham hasar 13,23; bekleme 984 ms; bilgi kartındaki 13,45/sn = 13,23 / 0,984. Motor 100 ms adımlı ve vuruşu tam sayıya yuvarlıyor. Isı/destek/savunma/enerji etkileri kapalı deneyde atışlar 0, 1000, 2000, 3000 ms'de 13 hasar veriyor. Dolayısıyla bu ikinci hasar türü değil, teorik ortalamadır. Motoru değiştirmeden bilgi sunumunu netleştirmek öncelikli yaklaşım.

## Tamamlanan işler ve doğrulama

### Kırmızı kalp — tamamlandı

Yerleşik image_gen ile mevcut yeşil kalp referans alınarak kırmızı sürüm üretildi. Merkezi detail-hp eşlemesi yeni dosyaya bağlandı. Varlık: `client/assets/ui/detail-icons-v1/hp-red.webp`, 192×192, **13.036 bayt**, gerçek alfa. İstem ve kaynak: `docs/HP_KIRMIZI_V17_PROMPT_20261017.json`. Yeniden boyutlandırma: `tools/prepare-red-hp-v17.cjs` (yalnız mekanik küçültme).

Doğrulama: `node tools/audit-detail-cards.cjs` geçti; gerçek CSS paketinde 10 ikon çözüldü, boyut/alfa doğrulandı; tarayıcı/sunucu açılmadı.

### Kart önizlemeleri — tamamlandı

`detail-card-layout.js` artık demo aileleri, ışın/hedef/metin düğümleri ve bunlara ait görünürlük/close dinleyicileri oluşturmuyor. Demo CSS/keyframe'leri ve temsili platform kaldırıldı; gerçek çizim merkezde. DOM testi gerçek çizimin/seçim kontrollerinin korunduğunu ve tekrar açılışta gereksiz düğüm/dinleyici oluşmadığını doğruluyor.

### Hasar bilgisi — tamamlandı; motor dengesi değiştirilmedi

Karar: **Bilgi katmanı düzeltildi.** Hem sunucu etiketinde hem eski sunucuyla çalışan istemcide “Teorik hasar/sn” yazıyor. İstatistikte bunun ham hasar / aralık olduğu, ikinci vuruş olmadığı ve gerçek sonucun ısı/enerji/savunma/zaman adımı/yuvarlamaya göre değiştiği açıklanıyor. Matematiksel oran korunuyor; gerçek hasar, bekleme veya VFX süresi yeniden dengelenmedi.

`server/tests/game/test_card_information_v17.py` standart unittest ile geçiyor: 36 modülün imza verisi, tüm saldırı modüllerinin 15 seviyesi için teorik hesap/etiket ve gerçek Lazer motor deneyindeki 0/1000/2000/3000 ms → 13 hasar davranışı.

### İmza mekanikleri — tamamlandı

36 modülün katalogdaki `signature_mechanic` alanı İstatistikte gösteriliyor; çekirdekler de aynı paneli kullanıyor. Kilitli kartlar da bilgiyi gösterir. Yeni savaş kuralı icat edilmedi. Mevcut sayısal imza değerleri ve yeşil seviye farkları korunuyor. Gerçek render fonksiyonlarıyla modül/çekirdek panel testleri geçti.

### Lazer sesi ve müzik/efekt dengesi — tamamlandı

Yeni özgün sentez `client/assets/audio/laser_pulse_v2.wav`: 240 ms, 10.628 bayt, mono 22.050 Hz/16 bit, tepe 0,26. Gürültü tabanı yerine yumuşak giriş/çıkışlı alçalan ton kullanıldı. Kaynak: `tools/generate_battle_sfx_v15.py --only laser_pulse_v2`; diğer varlıklar yeniden üretilmedi/silinmedi. Lazer cue kazancı 0,65; HTML ve WebAudio yollarında aynı. Eski uzun `laser_burn.wav` artık lazer cue kaynağı değil.

Mix v17: savaş efekt kazancı **0,22 → 0,16** (yaklaşık −2,8 dB), müzik **2,85** olarak korundu; sınırlayıcıyı zorlayarak ses artırılmadı. Sonuç ekranındaki efekt kuyruğu aynı kısık seviyede. Kullanıcı ses ayarları, rutin ses bütçesi ve arka plan temizliği korunuyor. Otomatik testler dosya süre/tepe/ani geçiş/yüksek frekans kontrolünü, iki ses yolunda cue trim'ini ve sonuç geçişini doğruladı. Gerçek cihazda dinleme henüz yapılmadı.

### Tek sayfa yetenekler — kod düzenlemesi tamamlandı; ekran kabulü bekliyor

Modülün 8 ve çekirdeğin 6 gerçek seçeneği, kilitli açıklamalar, bedeller, seçilmiş dallar ve modül sıfırlama işlemi korunuyor. Satırlar sıkılaştırıldı; açıklama doğal sarılıyor, kendi içinde kaydırmalı kutu veya kesilmiş metin yok. Yetenek sekmesi pencere yüksekliği ekrana göre `min(680px,100dvh − 40px)`. Kısa dikey ekranlarda tekrar eden tür başlık satırları daraltılıyor; tür bilgisi erişilebilir seçim adında ve seviye rozetinin açıklamasında korunuyor. **520 px ve daha kısa yatay/çok kısa ekranlarda erişilebilirlik için kaydırma istisnası var.** Gerçek render seçim testleri ve stil sözleşmesi geçti; tarayıcı piksel/taşma ölçümü yapılmadı, kullanıcının telefon/masaüstü denemesi gerekli.

### Kalkan şeffaflığı — tamamlandı

Petek çizgisi opaklığı **0,72 → 0,28**; kubbe mesh dolgu **0,78 → 0,42**; dış çizgi **0,80 → 0,38**. Ön yay, parıltı ve ayak izi de azaltıldı. Kubbe geometrisi, isabet noktaları ve savunma kuralları değişmedi. VFX düğüm bütçesi, ortak temizlik kuyruğu ve tek çizim sahibi korundu; yeni devre kurma veya modül başına timer/rAF yok. Mevcut VFX testleri geçti.

## Oyun içi kabul — kullanıcı denemesinde kontrol edilecek

- [ ] Küçük dikey ekranda en uzun modül yetenek açıklaması ve sıfırlama satırı dahil tüm seçimler sığıyor mu? Çok kısa/yatay ekran istisnası kasıtlıdır.
- [ ] Yeni lazer sesi müziğin arkasında yeterince yumuşak mı? Gerçek cihaz dinlemesi yapılmadı.
- [ ] Kalkanın yeni şeffaflığı ve kırmızı kalp oyun zemini üzerinde uygun mu?

## Son otomatik kontrol komutları

- `node tools/audit-module-vfx-v14.cjs` — gerçek script/stil blokları ve odaklı istemci regresyonları.
- `node tools/audit-detail-cards.cjs` — CSS paketi, ikonlar, alfa/boyut. Sharp için gerekirse `GRIDSHARD_SHARP_MODULE=C:/Users/SERVER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp`.
- PowerShell: `$audioTests=(Get-ChildItem client/tests -Filter 'gridshard-audio*.test.js').FullName; node --test @audioTests`.
- PowerShell: `$env:PYTHONPATH='server'; .\\.venv\\Scripts\\python.exe -B -m unittest discover -s server/tests/game -p test_card_information_v17.py -v`.
- `git diff --check`.

Ortamda pytest yok; pytest koleksiyonları çalıştırılmış sayılmamalı. Standart unittest kontrolleri başarılı.

### Son kontrol sonucu

- `audit-module-vfx-v14.cjs`: **183/183** başarılı. 40 betik / 18 stil, sıfır CSS uyarısı; önceden mevcut 20 yinelenen çeviri anahtarı uyarısı değişmedi. Rapor: `qa_reports/module-vfx-v14-audit-20261017.json`.
- Tüm `gridshard-audio*.test.js`: **33/33** başarılı. Bu grubun iki dosyası yukarıdaki regresyon grubuna da dahildir; sayılar benzersiz test toplamı değildir.
- `test_card_information_v17.py`: **3/3** başarılı; gerçek motor deneyi tamamen bellekte yapıldı, profil/veritabanı değiştirilmedi.
- `audit-detail-cards.cjs`: **10 ikon**, gerçek CSS çözümlemesi, 192×192 boyut, saydam alfa doğrulandı.
- `git diff --check`: başarılı. Önceden değişmiş iki ilgisiz dosyada yalnız LF/CRLF dönüşüm uyarısı var.
- Kalkanın gerçek SVG fabrikasından çevrimdışı önizleme üretildi ve incelendi: `artifacts/modules-camera-v13-20261017/shield-dome-preview.webp`. Bu, oyun ekran görüntüsü değildir.
- Tarayıcı/sunucu başlatılmadı, oyun içi dinleme/taşma kabulü yapılmadı, FPS/bellek ölçülmedi; dist/native build veya commit/push yok. Üstteki 8 kod işi tamamlandı; kullanıcı kabulündeki üç kutu kasıtlı olarak açık bırakıldı.

## Devam edecek araç için

Çalışma dizini `D:\Projects\GRIDSHARD`. Mevcut yerel değişiklikleri koru. Önce bu listedeki işaretlenmemiş maddeleri ve ilgili diff'leri incele. Kullanıcı oyun içi denemeleri kendisi yapıyor; otomatik test başarısını görsel/ses onayı diye sunma. Yeni efekt için savaş devresini yeniden kurma, modül başına döngü/zamanlayıcı ekleme.
