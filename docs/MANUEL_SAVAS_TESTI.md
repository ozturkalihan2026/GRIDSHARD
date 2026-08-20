# GRIDSHARD Beta.23 — Manuel Savaş Testi

1. `BASLAT_WEB_TEST.bat` veya `HIZLI_SAVAS_TESTI.bat` çalıştır.
2. Ana Menü → **Oyna**.
3. İstersen 18 modüllük havuzu seç; hızlı test için **Savaş Alanını Hemen Aç** kullanılabilir.
4. Savaş sayfasında **Senin Devren** ve **Rakip Devresi · Yerel AI** birlikte görünmelidir.
5. Üst HUD yalnız savaşta görünür; sayfa kaydırıldığında sabit kalmalıdır.
6. Süre sayacı ilerlemelidir.
7. Modül Rafı ilk 15 saniye kilitlidir; `15.0 sn` sonrasında otomatik **Aktif** olmalıdır.
8. Oyuncu ve AI karşılıklı hasar üretmelidir. Olay Günlüğü ve HP barları değişmelidir.
9. Rakibin normal modülleri bitmeden Jeneratör, Jeneratör bitmeden Çekirdek hedef olmamalıdır. Aynı sıra oyuncu tarafında da korunmalıdır.
10. Maç 180 saniyelik kanonik sınır içinde sonuçlandırılmalıdır.

Test sırasında ekran görüntüsü ve PowerShell çıktısı Beta.24 UX düzeltmelerinin ana girdisidir.
