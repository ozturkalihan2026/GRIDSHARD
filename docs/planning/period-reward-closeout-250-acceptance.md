# REWARD-03 — Dönem kapanışında kazanılmış hakların korunması

16 Kasım 2026 · 2.5.0 geliştirme dalında hazır · canlıya alınmadı

## Sonuç ve değişiklik

Sezon sıfırlanmadan önce tamamlanan emirler işlenir, açılan son yol kademeleri
dondurulur ve alınmamış sabit ödüller tekil mesaj kimliğiyle aktarılır.
`server/app/period_reward_closeout.py` bu hazırlığı profilin kopyasında yapar.
`archive_and_soft_reset_season` ancak hazırlık/doğrulama başarılı olursa
arşivi ve sıfırlanmış profili birlikte yayımlar; kalıcı commit mevcut hesap
kilidi/transaction sahibindedir. Yeni HTTP ucu veya istemci sayacı yoktur.

Bulunan boşluk: daha önce kuyruğa girmiş mesajın kimliği eşleştiğinde
`queue_chest` aktarımı tamamlanmış sayıyordu; mesajın gerçek sabit paketi
kazanılmış kayıtla uyuşmasa da eski sezon sıfırlanabiliyordu. Hata testte
önce yeniden üretildi. Yeni kapanış denetimi aşağıdakileri doğrular:

- Her alınmamış kademe için tek mesaj; doğru alan, kaynak ve durum.
- Gerçek chest_id/definition, sabit kaynaklar ve hedefler, içerik hash'i,
  kazanım hash'i, revision ve premium kaynak bağı.
- Eski API'nin ayrıca borçlandığı rastgele sandıklar sabit ödülle karışmaz;
  kendi kaynak/definition/premium bağı ve donmuş tanım hash'i doğrulanır.
- Daha önce tarihsel anlık açılış makbuzuyla karşılanmış ek sandık tekrar
  üretilmez. Toplanmış/açılmış mesaj tanıkları ve eski makbuzlar korunur.

Uyuşmazlıkta sessizce yeni paket yazılmaz veya eski hak silinmez; kapanış
hata verir ve giriş profili aynı kalır. Operasyon onarımı doğrulanmış kaynağa
dayanmalıdır; bu iş otomatik veri onarma veya ödül kataloğunu yeniden çekme
yetkisi eklemez. Yeni kalıcı alan, SQL migration veya ödül bütçesi yoktur.

## Kaynaklar ve sınırlar

| Kaynak / durum | Korunan davranış ve kanıt |
| --- | --- |
| Sezon yolu | Sadece kazanılmış ve alınmamış kademeler; son tamamlanan emrin açtığı kademe de donduktan sonra taşınır. Alınmış kademe yeniden kuyruğa girmez. |
| Geç dönen oyuncu | Yerel testte60 gün sonra giriş ve profil yükleme/yeniden başlatma; eski hedef/miktar/hash kalır. Yeni katalogdan yeniden ödül seçilmez. |
| Dolu Mesaj Kutusu | Alan başına20 görünüm sınırı devam eder. Yeni mesajlar eski hakkı saklayabilir; kayıt silinmez, görünenler toplandıkça eski hak erişilir. |
| Premium geçmişi | Yeni satış açılmaz. İade edilmiş hak gizli/suspend kalır, kaynak bağı korunur; doğrulanmış iade geri dönüşünde eski paket tek kez açılabilir. Legacy ek sandık sayısı ayrı korunur. |
| Mühendis Kasası | Sezon kapanışı seçim yapmaz veya hakkı sıfırlamaz. Alınmamış ve önceden teslim edilmiş seçimler korunur; kazanım kapısı kapansa ve60 gün geçse de eski makbuz/tek seçim sözleşmesi geçerli. PG kayıtları kendi015 hak deposunda kalır. |
| Sıralama/haftalık/takım | Mevcut değişmez competition closure ve mesaj/makbuz tanıkları korunur. Bu kaynaklar yeni sezon yolu paketine çevrilmez; sıralama, bot ödül kuralı ve takvim değiştirilmez. Mevcut kapanış testleri tam sunucu koşusunda geçti. |
| Kayıt hatası | PostgreSQL'de profil/arşiv/mesaj kaydından sonra hata enjekte edildi; bütün değişiklikler rollback, yeniden yükleme ve tekrar kapanışta tek arşiv/tek hak. |
| Eşzamanlılık | İzole PG'de aynı hesap satır kilidi altında8 kapanış isteği; tek arşiv ve5 tekil hak. Üretimin kilit/sonuç bariyeri yerine ayrı bir mekanizma eklenmedi. |
| Yedek/geri yükleme | Gerçek pg_dump/pg_restore sonrası kapalı sezonun alınmamış paketleri, önceki açılış makbuzu ve tam profil aynı. Açılmış ödül ikinci kez verilmez; kalan paket orijinal hash ile açılır. |

## Yerel kabul

| Koşu | Sonuç | Kapsam |
| --- | --- | --- |
| `python -m pytest server/tests -q -p no:cacheprovider` |2133 PASS /79 SKIP | Runtime değişikliğinden sonra Windows tam sunucu regresyonu; PG/isteğe bağlı ortam testleri atlanmıştı. |
| `python -m pytest server/tests/test_period_reward_closeout.py -q -p no:cacheprovider` |14 PASS | Son eklenen çakışma, görev→kademe, geç dönüş/dolu kutu, iade/legacy, alınmış/alınmamış seçim testleri. |
| Linux Python3.12 + PostgreSQL17, aşağıdaki dört dosya |23 PASS /0 SKIP |4 yeni gerçek PG kapanış testi, hak/seçim/backup regresyonları; araç ve sunucu PG17 sürümü eşleşir. |

İzole PG koşusu:

```text
tests/test_postgres_period_reward_closeout.py
tests/test_postgres_reward_choices.py
tests/test_postgres_reward_entitlements.py
tests/test_server_backup.py
```

PG koşusu mevcut `gridshard-ci240-20261113-py312:latest` test imajında, kaynak
depo salt okunur bağlanarak ve yalnız geçici localhost `gridshard_test` /
fixture veritabanlarıyla çalıştı. Sonuçta mevcut FastAPI/Starlette httpx
deprecation uyarısı1 adet; başarısız test yok. İlk Windows denemesinde PG16
dump aracı PG17 sunucuyla uyumlu değildi; kabul bu koşudan alınmadı, eşleşen
Linux/PG17 araç koşusundan alındı. İlk test kurulum hataları son kabul değildir.

Tam sunucu koşusu son iki ek saf test ve dört PG testinin tamamını toplamadı;
bu ekler sonradan yukarıdaki odaklı koşularda ayrıca doğrulandı. Sayılar
birbirine eklenerek benzersiz test sayısı veya CI sonucu olarak sunulmaz.

## Yayın sınırı

REWARD-03 dalda hazırdır; güncel checklist ve2.5 sürüm briefine bağlanır.
Gerçek kaynak sürümü2.4.0, yayımlanmış S1 katalogları ve mevcut SQL dosyaları
korunur. Canlı oyuncu/veritabanı, sezon saati, AAB, Play Console veya sunucu
dağıtımı bu kabulde değiştirilmedi.2.5 canlı geçişi S1 kapanış ve ödül kabulü
sonrasıdır; en erken22 Aralık03.00TR, kesin pencere henüz belirlenmedi.

Sonraki uygulama SHOP-01: sabit revision/oyuncu-hafta hedefi,500 kredi,
iki alım sınırı ve atomik kaynak/limit/teslim sözleşmeli ücretsiz teklif.
