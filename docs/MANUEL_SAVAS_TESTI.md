# GRIDSHARD Beta.24 — Manuel Savaş Testi

1. `BASLAT_WEB_TEST.bat` veya `HIZLI_SAVAS_TESTI.bat` çalıştır.
2. Ana Menü → **Oyna**; doğrudan savaş yerine üç kolonlu hazırlık ekranı açılmalıdır.
3. Global Havuzdan 18 modülü tamamla ve **Eşleştir** düğmesine bas.
4. Savaş sayfasında **Senin Devren** ve **Rakip Devresi · Yerel AI** birlikte, tek viewport içinde görünmelidir.
5. Üst HUD yalnız savaşta görünmeli; otorite durumu sunucu snapshot akışından gelmelidir.
6. Süre sayacı ilerlemelidir.
7. Modül Rafı ilk 15 saniye kilitlidir; `15.0 sn` sonrasında otomatik **Aktif** olmalıdır.
8. Aktif modüle tıklandığında port yönü dönmeli; Jeneratör dört port göstermeli ve bağlı Onarım enerji almalıdır.
9. Oyuncu ve AI karşılıklı hasar üretmelidir. Saldırı çizgileri ile simge + Can barları görünmelidir.
10. Rakibin normal modülleri bitmeden Jeneratör, Jeneratör bitmeden Çekirdek hedef olmamalıdır. Aynı sıra oyuncu tarafında da korunmalıdır.
11. Maç 180 saniyelik kanonik sınır içinde sonuçlandırılmalıdır.
12. Sonuç modalı açılmalı; sayaç ve modül hareketleri durmalı, **Savaş Analizini Aç** bölümü açılıp kapanmalıdır.

Test sırasında ekran görüntüsü ve PowerShell çıktısı Beta.24 UX düzeltmelerinin ana girdisidir.
