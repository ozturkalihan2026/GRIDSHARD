# Project Relay 2.0 Beta — Gerçek Web Testi

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
