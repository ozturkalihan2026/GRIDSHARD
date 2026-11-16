# Yerelleştirme ve ürün analitiği sözleşmesi

## Türkçe / İngilizce

- Varsayılan dil Türkçedir; hesap ayarındaki `language` (`tr` veya `en`) sunucuda saklanır. Dil değişimi sayfayı yeniden açmadan uygulanır.
- Mevcut arayüz sözlüğü `client/src/i18n.js`, yeni ekran sözlüğü ve değişkenli mesaj anahtarları `client/src/i18n-catalog.js` içindedir. Yeni kullanıcı metinleri düz yazı olarak eklenmemeli; katalog anahtarı kullanılmalıdır. Eski doğrudan metinleri çevirmek için DOM gözlemcisi korunur.
- Değişkenli metinlerde `GridshardI18n.t(key, params, language)` kullanılır. `{count}` içeren mesajlar `Intl.PluralRules` ile tekil/çoğul seçer. Sayılar `formatNumber`, tarihler `formatDate` ile oyuncunun diline göre biçimlenir. Oyuncu adları, takım adları ve sohbet içeriği çevrilmez.
- Beta.78 kaynak aktarımında eski sözlük ile değişkenli mesaj kataloğu yeniden birlikte yüklenir. Devre Yolu'nda yalnız `description_tr` taşıyan ödül düğümleri, İngilizce görünümde miktar ve hedef kart adını korumak için ödül verisinden kurulur. Diğer sunucu metinlerinin tamamının `*_en` eşleniği henüz garanti edilmez; yeni metinler iki dilli alan veya katalog anahtarıyla eklenmelidir.
- Hedef sürümdeki sabit HTTP hata `code` sözleşmesi kaynak Beta.72 istemcisine henüz eksiksiz taşınmadı; bazı rotalar yalnız Türkçe `detail` döndürür. Bu alan ve savaş komutu reddinin kod-temelli yerelleştirmesi kontrol noktasında açık iştir. Yeni hata türü eklenirken dil bağımsız kod ile TR/EN anahtar birlikte tanımlanmalıdır.
- `client/tests/beta78-i18n-bridge.test.js` iki sözlüğün Devre Yolu mesajlarını ve sayı biçimini birlikte çözmesini denetlemek için eklendi. Kullanıcının önceki sınırı gereği test/derleme çalıştırılmadı.

## Ürün analitiği: veri ve mahremiyet

Oyun/operasyon telemetrisi ile ürün analitiği ayrı depolardır. Ürün analitiği varsayılan olarak **kapalıdır**. Oyuncu Ayarlar ekranındaki kutuyu açıp sunucu ayarı kaydedildikten sonra olay kabul edilir. İstemcideki kapı tek başına yeterli değildir: sunucu her olayda kayıtlı onayı yeniden kontrol eder. Kapatma işlemi sunucudaki oyuncuya ait bütün ham olayları siler. Hesap silme de aynı temizliği yapar. Oyuncu kendi kayıtlarını `GET /analytics/my-events` ile alabilir, `DELETE /analytics/my-events` ile ayrıca silebilir; hesap veri dışa aktarımına da eklenir. Bu uçlar Bearer kimliği gerektirir.

`GET /analytics/schema` izin verilen alanları döndürür. `POST /analytics/events` yalnız aşağıdaki olay/enum alanlarını kabul eder; fazladan alan veya serbest metin reddedilir. `battle_completed` sunucunun kesinleşmiş savaş sonucundan yazılır; eğitim/arkadaş/takım/arena eşlemeleri içerir, yalnız insan PvP değildir. İstemci bunu gönderemez.

| Olay | Alanlar | Amaç |
| --- | --- | --- |
| `session_started` | yok | D1/D7 elde tutma ve giriş hunisi |
| `screen_view` | `screen`: izinli ekran kodu | Ekran hunisi |
| `matchmaking_started` | `mode`: arena/team/friend/training | Eşleştirme hunisi |
| `matchmaking_matched` | `opponent`: human/ai | Eşleşme hunisi |
| `battle_completed` | `result`: win/loss/draw; `mode`; `duration`: under_60s/60_179s/180s_plus | Kesinleşmiş savaş sonucu |
| `performance_sample` | `screen`: play; `fps`: under_20/20_29/30_44/45_59/60_plus | Seyrek ve kaba performans dağılımı |

Depodaki oyuncu alanı, ham oyuncu kimliği yerine sunucu sırrıyla HMAC türetilmiş takma kimliktir. IP adresi, e-posta, cihaz kimliği, sohbet, oyuncu adı, serbest URL ve kart/ekonomi durumu ürün olaylarına yazılmaz. Bu veri anonim **değil**, takma kimliklidir; arayüz etiketi bunu açıkça belirtir. Veri üçüncü taraf SDK'ya gönderilmez. JSON deposu `server/data/product_analytics.json` (veya `GRIDSHARD_PRODUCT_ANALYTICS_PATH`) olup Git tarafından yok sayılır.

Ham olaylar **30 günlük** pencereye süzülür; bakım döngüsü saatlik denetler, okuma/yazma sırasında da süre aşımı uygulanır. Depo en çok 20.000 olay tutar; kapasite sınırı daha erken kayıt kaybına yol açabilir. Servis kesintisinde fiziksel silmenin saat garantisi yoktur. `python tools/product_analytics_report.py` yerel JSON'dan toplu rapor üretir; üretim PG deposunu okumaz. 5'ten az ayrı oyuncu içeren rapor ve huni/sonuç/FPS alt grupları bastırılır. Mevcut D1/D7 hesabı UTC'de elde kalan ilk session gününden başlar; yalnız uygun payda için beş oyuncu kontrolü vardır, küçük dönen/tamamlayıcı grupların bastırması eksiktir. Bu çıktı yeni oyuncu kohortu sayılmaz; D28 ve sıralı huni henüz yoktur. JSON'da dosya kilidi/atomik değişim, PG'de satır kilidi kullanılır. Analitik yazımı başarısız olursa oyun/savaş sonucu etkilenmez.

16 Kasım 2026 kaynak denetimi, uygun kohort ve ilk maç/deste değişimi sözleşmesi [measurement-baseline.md](planning/measurement-baseline.md) içindedir. BASE-02 plan teslimidir; eksik ölçüm/rapor uygulaması ANALYT-01'de açık tutulur. Bu denetimde mevcut sunucu testleri 19 PASS, istemci yaş kapısı testi 1 PASS verdi; PG bağlantı testi sentetiktir, canlı ölçüm yapılmadı.

Üretim yayını öncesi gizlilik bildirimi ve hukuki onay metni ürün sahibi tarafından gözden geçirilmelidir. Bu doküman hukuki görüş değildir. Kullanıcının isteği gereği bu turda test, oyun denemesi ve derleme çalıştırılmadı.
