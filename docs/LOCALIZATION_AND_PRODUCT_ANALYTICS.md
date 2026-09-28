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

`GET /analytics/schema` izin verilen alanları döndürür. `POST /analytics/events` yalnız aşağıdaki olay/enum alanlarını kabul eder; fazladan alan veya serbest metin reddedilir. `battle_completed` yalnız sunucunun kesinleşmiş PvP sonucundan yazılır; istemci bunu gönderemez.

| Olay | Alanlar | Amaç |
| --- | --- | --- |
| `session_started` | yok | D1/D7 elde tutma ve giriş hunisi |
| `screen_view` | `screen`: izinli ekran kodu | Ekran hunisi |
| `matchmaking_started` | `mode`: arena/team/friend/training | Eşleştirme hunisi |
| `matchmaking_matched` | `opponent`: human/ai | Eşleşme hunisi |
| `battle_completed` | `result`: win/loss/draw; `mode`; `duration`: under_60s/60_179s/180s_plus | Kesinleşmiş savaş sonucu |
| `performance_sample` | `screen`: play; `fps`: under_20/20_29/30_44/45_59/60_plus | Seyrek ve kaba performans dağılımı |

Depodaki oyuncu alanı, ham oyuncu kimliği yerine sunucu sırrıyla HMAC türetilmiş takma kimliktir. IP adresi, e-posta, cihaz kimliği, sohbet, oyuncu adı, serbest URL ve kart/ekonomi durumu ürün olaylarına yazılmaz. Bu veri anonim **değil**, takma kimliklidir; arayüz etiketi bunu açıkça belirtir. Veri üçüncü taraf SDK'ya gönderilmez. JSON deposu `server/data/product_analytics.json` (veya `GRIDSHARD_PRODUCT_ANALYTICS_PATH`) olup Git tarafından yok sayılır.

Ham olaylar en çok **30 gün** tutulur; bakım döngüsü en geç saatlik temizler, okuma/yazma sırasında da süre aşımı uygulanır. Depo en çok 20.000 olay tutar. `python tools/product_analytics_report.py` yalnız toplu rapor üretir; 5'ten az ayrı oyuncu içeren bütün rapor ve 5'in altındaki hücreler bastırılır. D1/D7 hesabı UTC günleriyle yapılır; uygun kohort 5'in altındaysa açıklanmaz. Olay bazlı depolama, dosya kilidi ve atomik değişimle süreçler arasında korunur. Analitik yazımı başarısız olursa oyun/savaş sonucu etkilenmez.

Üretim yayını öncesi gizlilik bildirimi ve hukuki onay metni ürün sahibi tarafından gözden geçirilmelidir. Bu doküman hukuki görüş değildir. Kullanıcının isteği gereği bu turda test, oyun denemesi ve derleme çalıştırılmadı.
