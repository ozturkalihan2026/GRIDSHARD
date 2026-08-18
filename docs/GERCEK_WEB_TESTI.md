# GRIDSHARD 2.0 Beta — Gerçek Web Testi

Bu paket gerçek insan Web testini yürütmek ve teknik sonuçlarını toplamak için hazırlanmıştır.

## Windows

Proje klasöründe:

`BASLAT_WEB_TEST.bat`

Tarayıcı:

`http://127.0.0.1:8000/`

## Test akışı

1. Sunucu ve istemci aynı origin altında açılır.
2. Sağlık, preflight ve launch-readiness kontrolleri tamamlanır.
3. Aktif test koşusu otomatik ve idempotent biçimde başlatılır.
4. Test çalışırken her 10 saniyede agregat operasyon ve stabilite snapshot'ları alınır.
5. Oyun normal biçimde kullanılır; savaş motoru hiçbir oyuncu müdahalesinde durmaz.
6. Test tamamlandığında teknik durum alanındaki **Gerçek Test Koşusunu Bitir** düğmesine basılır.
7. Son operasyon/stabilite snapshot'ları kaydedilir ve koşu kapatılır.
8. `/web-test/test-run/report` test sonrası teknik raporu yayınlar.

## Ana menü kapsamı

- Oyna
- Profil
- İstatistikler
- Ayarlar

Eğitim alanı bu Beta test kapsamı dışında kalmaya devam eder.

## Önemli not

Teknik rapor gerçek insan testinin tamamlandığını kendiliğinden iddia etmez. İnsan kullanıcı gözlemleri, kullanılabilirlik sorunları ve oyun dengesi geri bildirimleri ayrıca değerlendirilmelidir.


## Geri bildirim

Test koşusu **Gerçek Test Koşusunu Bitir** düğmesiyle kapatıldıktan sonra aynı teknik alanda Beta geri bildirim formu açılır.

Formda 1–5 arası şu başlıklar değerlendirilir:

- Kullanılabilirlik
- Bağlantı deneyimi
- Savaş dengesi
- Modül / güçlendirici dengesi

İsteğe bağlı kısa not en fazla 500 karakterdir.

Geri bildirim aktif `test_run_id` ile ilişkilendirilir. Oyuncunun Profil adı veya diğer Profil alanları geri bildirim kaydına eklenmez. `/web-test/feedback/summary` yalnızca agregat puan ortalamalarını ve düşük puan sayılarını yayınlar.


## Beta bulguları

`/web-test/findings` gerçek geri bildirim özetini aynı test koşusunun teknik kullanım sinyalleriyle birlikte raporlar.

Minimum 3 gerçek geri bildirim oluşmadan sonuç `insufficient_data` olarak kalır ve sistem denge sorunu varmış gibi otomatik sonuç üretmez.

Yeterli örnek olduğunda şu alanlar birlikte okunur:

- Kullanılabilirlik ve bağlantı geri bildirim puanları
- Savaş dengesi puanı + tamamlanan maç / rematch sinyalleri
- Modül/güçlendirici dengesi puanı + modül değişimi / booster / raf / Devre Kredisi kullanım sinyalleri

Bu katman hiçbir denge değerini otomatik değiştirmez. Bulgular insan incelemesi gerektirir.


## İnceleme adayları

`/web-test/review-candidates` yalnızca `/web-test/findings` sonucu `sufficient` olduğunda düzeltme adayları üretir.

Öncelik sırası:
1. Ortalama puanı 3 altında olan yüksek önem alanları
2. Düşük puan bulunan izleme alanları
3. Aynı önem düzeyinde daha düşük ortalama puan

Sistem hiçbir değişikliği otomatik uygulamaz. Her aday insan onayı gerektirir.


## Oynanabilir Beta 5

Sunucuyu açtıktan sonra ana menüden **Oyna** seç.

### Tek bilgisayarda hızlı test

1. **Tek Oyunculu Test Maçı** düğmesine bas.
2. Savaş saati sıfırdan başlar.
3. İlk 15 saniye başlangıç devresi çalışır; savaş durmaz.
4. 15. saniyede Modül Rafı açılır.
5. Modülleri rafa / savaş alanına sürükleyerek devreyi canlı değiştir.
6. Devre Kredisi yeterliyse değişiklik otomatik uygulanır.
7. Yerel AI sana saldırır; senin saldırı modüllerin de rakibe otomatik saldırır.
8. Rakip Çekirdeği yok edilirse kazanırsın; kendi Çekirdeğin yok edilirse kaybedersin.
9. **Tekrar Maç** ile maçı tamamen sıfırlayabilirsin.

### Online PvP

**Online PvP** seçeneği mevcut server-authoritative eşleştirme akışını korur. Gerçek eşleşme için ikinci bir oyuncu/istemci gerekir.
