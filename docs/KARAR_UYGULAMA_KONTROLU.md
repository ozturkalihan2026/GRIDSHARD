# GRIDSHARD — Karar Uygulama Kontrolü

**Kontrol paketi:** `2.0.0-beta.22`

Bu belge, daha önce alınan görsel kimlik / ekran / ses / isim kararlarının proje içindeki gerçek uygulama durumunu takip eder.

## 1. Rakiplerden çıkarılan UX dersi
- [x] Savaş alanı ana odak olmaya devam ediyor; savaş HUD'ları ikincil.
- [x] Modül HP / enerji / saldırı ve savunma bilgileri kart/ayrıntı katmanlarında gösteriliyor.
- [x] Modül + port + özel hücre + enerji hattı oynanışın ana görsel dili.
- [x] Başka oyunların UI'si birebir kopyalanmıyor.

## 2. Neon Industrial / Electric Arena kimliği
- [x] Void Navy `#070B14`
- [x] Reactor Blue `#0C1625`
- [x] Alloy Navy `#132238`
- [x] Circuit Steel `#294766`
- [x] Arc Cyan `#36D9FF`
- [x] Plasma Cyan `#67F4FF`
- [x] Reactor Gold `#F4C85A`
- [x] Ion Green `#55DF8A`
- [x] Charge Amber `#F0B84B`
- [x] Overload Red `#FF515A`
- [x] Interference Violet `#A86BFF`
- [x] Ice White `#ECF5FF`
- [x] Signal Gray `#8CA1B9`

## 3. Modül sınıf renkleri
- [x] Enerji → Cyan
- [x] Saldırı → Kırmızı/Turuncu
- [x] Savunma → Mavi
- [x] Destek → Yeşil
- [x] Sabotaj → Mor
- [x] Sınıf rengi kartın tamamını kaplamıyor; çerçeve / vurgu / kontrol / efekt dili olarak kullanılıyor.

## 4. Ekran ölçüleri
- [x] `1920×1080` ana tasarım hedefi.
- [x] `1366×768` minimum masaüstü hedefi.
- [x] `2560×1440` yüksek çözünürlük hedefi.
- [x] Savaş Havuzu üç kolon yaklaşımı korunuyor.
- [x] Savaş ekranında ana board görsel önceliği korunuyor.

## 5. Ana lobby görünümü
- [x] Dört kapılı `Shard Core` sembolü.
- [x] Arka planda gerçek 20 hücreli silik savaş alanı geometrisi.
- [x] Cyan enerji / orbit çizgileri.
- [x] Hafif pointer parallax.
- [x] Ana CTA `OYNA`.
- [x] CTA alt metni `Tek Oyunculu · Dereceli PvP`.
- [x] Sağ oyuncu kartında Sezon / Lig / RP.
- [x] Profil alt kimliği `Operatör Terminali`.
- [x] İstatistik alt kimliği `Savaş Arşivi`.
- [x] Ayarlar alt kimliği `Sistem Konsolu`.

## 6. Müzik kimliği
- [x] Menü `92–100 BPM` yönü.
- [x] Havuz `105–112 BPM` yönü.
- [x] Matchmaking `115–120 BPM` yönü.
- [x] Savaş `126–132 BPM` yönü.
- [x] Ortak 5 notalık GRIDSHARD motif ailesi: D–F–A–C–B.
- [x] Menü / Havuz / Matchmaking / Battle / Victory / Defeat için özgün prosedürel WAV prototipleri üretildi.
- [x] Hiçbir stock / üçüncü taraf müzik dosyası kullanılmadı.
- [x] Audio Director bu dosyaları state bazında bağlayabiliyor.

## 7. Ses efekti dili
- [x] Port bağlantısı.
- [x] Enerji transferi.
- [x] Lazer ateşi.
- [x] Kalkan darbesi.
- [x] EMP.
- [x] Virüs glitch.
- [x] Jeneratör kapı değişimi.
- [x] Çekirdek hasarı.
- [x] SFX cue'ları istemci runtime'a bağlandı.

## 8. İsim / marka
- [x] Kullanıcı-facing oyun adı `GRIDSHARD`.
- [x] `Devreni Kur. Çekirdeği Kır.`
- [x] `Build the Circuit. Break the Core.`
- [x] Dört kapılı kırık çekirdek `Shard Core` ana sembol.
- [x] Browser title / lobby / identity endpoint GRIDSHARD.
- [x] Backward compatibility için dahili `Relay*` sembolleri ayrı migration yapılmadan kırılmadı.

## 9. Beta.15 loadout UX
- [x] Global modül kartında `+` = ekle.
- [x] Seçili modül kartında `−` = çıkar.
- [x] Zorunlu Jeneratörde `◆` = kilitli / çıkarılamaz.
- [x] Hazır Savaş Havuzları select yerine oyun odaklı kart galerisi olarak gösteriliyor.
- [x] Favori preset desteği.
- [x] Son kullanılan zaman bilgisi.
- [x] Karttan tek tıkla yükleme.
- [x] Rename / overwrite / delete korunuyor.

## 10. Review-ready simülasyon
- [x] Gerçek manuel rapor review-ready değilse simülasyon endpoint'i bloke.
- [x] Simülasyon yalnız kalıcı draft içindeki before/proposed değerleri kullanıyor.
- [x] Yerel AI baskısı, DK üretimi ve modül müdahale kilidi için izole adapterlar var.
- [x] Desteklenmeyen alan simülasyonu kanonik değeri değiştirmeden başarısız işaretleniyor.
- [x] Simülasyon sonucu draft `simulation_status` alanına yazılıyor.
- [x] Regresyon `passed` olmadan `ready_for_apply` oluşmuyor.
- [x] Otomatik apply endpoint'i yok.
- [x] Kanonik denge değerleri bu pakette değiştirilmedi.


## 11. Beta.16 güvenlik ve runtime entegrasyonu
- [x] GRIDSHARD özgün müzik/SFX assetleri Ayarlar ekranındaki gerçek volume/mute tercihlerine bağlandı.
- [x] Ses ve Müzik mute tercihleri sunucuda kalıcıdır.
- [x] Favori / son kullanılan hazır havuzlar Oyna ekranındaki Hızlı Loadout bölümünde görünür.
- [x] Hızlı Loadout kartından Tek Oyunculu veya PvP hazırlığına geçilebilir.
- [x] Review-ready + simulation passed denge taslağı için ikinci güvenlik katmanı olan gerçek BattleEngine regresyon koşucusu eklendi.
- [x] Devre Kredisi ve modül müdahale kilidi gerçek BattleEngine instance'larında before/proposed olarak karşılaştırılabilir.
- [x] Engine adaptörü olmayan alan güvenlik amacıyla regression failed durumunda kalır.
- [x] Regresyon koşucusu kanonik değerleri değiştirmez.
- [x] Otomatik apply endpoint'i yoktur.


## 12. Beta.17 kapsam tamamlama
- [x] PowerShell'deki `manual-battle-report 500 / dict.player_id` hatası kök neden bazında doğrulandı.
- [x] Teslim Beta.16 ZIP'inde düzeltmenin mevcut olduğu, çalıştırılan klasörün eski/karışık kaynak taşıdığı tespit edildi.
- [x] `release_guard.py` ile karışık kaynak sunucu başlamadan bloke edilir.
- [x] Canlı QA doğrudan manuel savaş raporu endpoint'ini test eder.
- [x] Jeneratör dört kapı arasında gerçek BattleEngine komutlarıyla regresyon testine alınır.
- [x] Her Jeneratör kapısında Core bağlantısı ve en az bir özel hücre yönü doğrulanır.
- [x] Kalkanın powered durumda gerçek combat çözümünde hasar azaltması yapması yapısal regresyonla doğrulanır.
- [x] Yerel AI baskısı server-engine'e zorla sokulmak yerine ayrı `server_side_local_ai` test adapterına taşındı.
- [x] Audio assetleri müzik `-6 dBFS`, SFX `-3 dBFS` peak hedeflerine normalize edildi.
- [x] `450 ms` music crossfade eklendi.
- [x] `critical_core_layer.wav` ve `%33` Çekirdek eşiği runtime'a bağlandı.
- [x] Ayarlarda müzik ve SFX önizleme butonları eklendi.
- [x] Hızlı Loadout için Tümü / Favoriler filtresi eklendi.
- [x] Son Kullanılan ve Aktif rozetleri eklendi.
- [x] Aktif loadout savaş öncesi 18/18 / değiştirildi / son kullanım özetiyle görünür.
- [x] Yalnız güvenlik kapılarını geçen denge adayları `İnsan Değerlendirme Kuyruğu`nda listelenir.
- [x] Otomatik denge apply yine yoktur.


## 13. Beta.19 E2E / UX / mastering hazırlığı
- [x] Windows için `TARAYICI_E2E_TEST.bat` eklendi.
- [x] Browser E2E ana menü, hazır loadout, savaş başlangıcı ve sonuç ekranı screenshot artifactleri üretir.
- [x] Browser console mesajları JSON artifact olarak saklanır.
- [x] Browser network response listesi JSON artifact olarak saklanır.
- [x] E2E kontrol sonuçları ayrı `checks.json` dosyasına yazılır.
- [x] Browser ortamı engelliyse SKIPPED nedeni `environment.txt` ile artifact klasörüne yazılır.
- [x] Yerel savaş requestAnimationFrame akışında frame count ve max frame gap ölçülür.
- [x] UI click müdahaleleri savaş sırasında `battle_ui_interaction` telemetrisi üretir.
- [x] Maç sonunda `battle_ux_timing_summary` telemetrisi üretilir.
- [x] UI müdahalesi sırasında savaş zamanının ilerlemeye devam etmesi Browser E2E kontratına eklendi.
- [x] İnsan Denge İnceleme Konsolu simulation/regression kanıtlarını açılır ayrıntı kartlarında gösterir.
- [x] Kanıt endpoint'i tekrar simüle/regresyon eder fakat kanonik değeri değiştirmez.
- [x] Audio mastering hazırlık raporunda crest factor ve RMS proxy metrikleri bulunur.
- [x] RMS proxy'nin LUFS olmadığı açıkça dokümante edildi.
- [x] Critical Core layer low/medium/high pressure kademelerine ayrıldı.
- [x] Otomatik denge apply yoktur.


## 14. Beta.20 Windows E2E / UX profil / Review V2
- [x] Browser E2E PASSED / SKIPPED / FAILED durumları tek kanıt özetinde kesin ayrılır.
- [x] SKIPPED sonucu otomatik olarak PASSED sayılmaz.
- [x] Screenshot / console / network / checks / UX timing kanıtları tek `browser_e2e_evidence_summary.json` raporunda birleştirilir.
- [x] Windows `TARAYICI_E2E_TEST.bat` gerçek E2E ardından kanıt özetini otomatik üretir.
- [x] Savaş UX kategorileri: `module_place`, `module_move`, `generator_gate`, `booster`, `technical_drawer`, `other_ui`.
- [x] Her kategori toplamları `window.__GRIDSHARD_BATTLE_UX` ve maç sonu timing telemetrisinde görünür.
- [x] Review Konsolu V2 simulation önce/öneri ve regression senaryo sayısını karşılaştırmalı gösterir.
- [x] Kullanıcı karar notu yalnız `localStorage` içinde tutulur.
- [x] Yerel karar notu sunucuya gönderilmez ve denge uygulamaz.
- [x] Opsiyonel ffmpeg `ebur128` taraması gerçek LUFS/LRA/True Peak ölçümü yapabilir.
- [x] ffmpeg/ebur128 yoksa LUFS uydurulmaz; rapor SKIPPED olur.
- [x] Final mastering tamamlanmış sayılmaz.
- [x] Otomatik denge apply yoktur.


## 15. Beta.21 Windows E2E import / UX matrix / review decision
- [x] Windows/Chrome Browser E2E kanıt ZIP veya klasörü içe aktarılabilir.
- [x] İçe aktarım screenshot PNG imzasını doğrular.
- [x] Zorunlu screenshot / console / network / checks artifactleri eksiksiz olmalıdır.
- [x] Her artifact için SHA-256 kaydı üretilir.
- [x] Browser checks'in tamamı `ok=true` olmalıdır.
- [x] Console error veya HTTP 4xx/5xx bulunan paket `VERIFIED_PASSED` olamaz.
- [x] SKIPPED kaynak sonuç PASSED'a dönüştürülmez.
- [x] `qa_reports/latest.json` dış Windows E2E durumunu ayrı alanda gösterir.
- [x] Windows E2E gerçek PASSED olduğunda taşınabilir kanıt ZIP'i üretilebilir.
- [x] UX profili kategori bazlı matrix'e dönüştürüldü.
- [x] Matrix her kategori için count, average/max frame gap ve average/max battle-clock delta tutar.
- [x] UX matrix yalnız gerçek PASSED browser kanıtından ölçülmüş sayılır.
- [x] Review durumları `Beklet / Reddet / İleride değerlendir` olarak yerel taslağa eklendi.
- [x] Review durumu ve not yalnız localStorage'da tutulur.
- [x] Review durumu canonical denge değişikliği değildir.
- [x] BS.1770 ölçümü mastering hedefinden ayrı teknik referans olarak tutulur.
- [x] Mastering target Beta.21'de seçilmemiştir.
- [x] Otomatik denge apply yoktur.


## 16. Beta.22 manuel savaş / E2E geçmiş / Review V3
- [x] Hızlı Yerel AI savaş alanı erişimi.
- [x] 18/18 otomatik test havuzu.
- [x] Windows E2E history yalnız VERIFIED_PASSED importlardan.
- [x] UX eşikleri ölçüm yoksa PASS/FAIL üretmez.
- [x] Review V3 aday bazlı yerel karar taslakları.
- [x] Mastering hedefi seçilmeden audio gain değişmez.
- [x] Otomatik denge apply yok.
