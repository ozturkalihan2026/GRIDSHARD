# GRIDSHARD geliştirme kontrol noktası

Güncelleme tarihi: 13 Eylül 2026

Bu dosya yalnız en son çalışma paketini içerir. Kullanıcı `checkpoint'ten devam et` dediğinde önce bu dosya, ardından `git status --short` okunmalıdır.

## Tamamlanan paket — Beta.54

1. `[x]` Savaş sonrası sandık dağılımını gözden geçir
   - Savaş galibiyetlerinde dağılım Bronz `%65`, Gümüş `%23`, Altın `%9`, Elmas `%3` olarak ayarlandı.
   - Bronz Sandık en sık ödül olarak kaldı; üst kademelerin görünme sıklığı önceki `%28` toplamından `%35` toplamına çıkarıldı.
2. `[x]` Sandık içeriklerini yavaş ilerlemeye göre dengele
   - Devre Kredisi ve Akı aralıkları sandık kademesine göre yeniden ölçeklendi: Bronz `45–75 DK / 2–4 Akı`, Gümüş `90–145 / 3–6`, Altın `175–280 / 5–9`, Elmas `320–480 / 8–13`.
   - Modül parçası çıkma olasılığı sırasıyla `%14`, `%15`, `%16`, `%20`; miktarlar her sandık içinde `Yaygın > Nadir > Epik > Efsanevi` olacak şekilde azaltıldı.
   - Mağaza sandıklarına da aynı nadirlik başına azalan parça miktarı uygulandı ve para/Akı miktarları düşürüldü.
   - Çekirdek parçası yalnız Elmas Sandıkta, `%6` olasılıkla ve `1` adet çıkıyor.
3. `[x]` Devre Yolu sandık adlarını standartlaştır
   - Eski süre ve teknik tür adları hem yetkili ilerleme verisinden hem Arena ödül kanonu belgesinden kaldırıldı.
   - Devre Yolu artık yalnız `Bronz Sandık`, `Gümüş Sandık` ve `Altın Sandık` adlarını gösteriyor; Elmas türü de ortak sandık tanımında `Elmas Sandık` olarak korunuyor.

## Doğrulama

- Beta.54 ve ilgili sandık/ilerleme sunucu testleri: `43 passed`.
- İstemci regresyon paketi: `38/38` test dosyası, iç sayaçta `176 client tests passed`.
- Geniş sunucu paketi: `575 passed`, `1 skipped`; mevcut 5x3 tahta, 36 modül ve Beta.43 sürümüyle çelişen `115` eski beklenti testi başarısız. Beta.54 sandık testleri başarısızlar arasında değil.
- Değiştirilen dosyalarda `git diff --check` temiz; yalnız çalışma ağacının CRLF dönüşüm uyarıları var.

## Devam notu

- Çalışma dizini: `D:\Projects\GRIDSHARD`
- Kullanıcı çalışma zamanı verileri korunmalıdır; toplu geri alma veya `git reset --hard` yapılmamalıdır.
