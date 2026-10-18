# Soğutucu soğuk hava efekti — 18 Ekim 2026

- [x] Üç kesikli çizgi / üçgen koni kaldırıldı.
- [x] Gerçek çıkış ağzından hedefe yönelen, genişleyip dağılan saydam buz mavisi/beyaz hava bulutları eklendi. Hafif ortak sis hacmi, çıkış ile hedef arasındaki akışı bağlar; uçta çevreye açılır. Devreyi örten opak bir kaplama yoktur.
- [x] Yalnız gerçek `module_cooled` olayı ve gerçek soğutulan hedefler kullanılır. Alanı kaplayan görsel, yeni bir alan soğutma kuralı değildir; motor, ses ve sayılar değiştirilmedi.
- [x] Yüksek/orta/düşük grafikte en fazla 5/4/2 bulut; hareket azaltmada bir kısa statik bulut. SVG kökü başına en fazla 19 düğüm. Bulanıklık/gürültü filtresi, sprite dosyası, modül başına timer/rAF veya devre yeniden kurulumu yok.
- [x] Hareket yerel CSS transform/opacity ile; 980 ms kök ömrü mevcut ortak VFX kuyruğuyla temizlenir (hareket azaltmada 200 ms). Aynı kaynak/hedef olayı eski kökü değiştirir; eski temizlik yeni efekti silemez. Ölüm/oturum/arka plan temizliği ve kök bütçesi korunur.
- [ ] Oyun içinde kullanıcı görsel onayı. Tarayıcı/sunucu veya gerçek cihaz testi bu turda başlatılmadı.

Kaynaklar: `client/src/battle/module-vfx.js`, `client/src/module-vfx-v14.css`.
Kontroller: `client/tests/module-vfx.test.js` içinde yön, düğüm sayısı, kalite, hareket azaltma, ortak kuyruk, eski temizliğin yeniyi silmemesi ve durum temizliği.

Son kontrol: `node --test client/tests/module-vfx.test.js` **17/17**, `node tools/audit-module-vfx-v14.cjs` **185/185** başarılı. Gerçek 40 betik / 18 stil hedef sözdizimi denetlendi; CSS uyarısı yok, önceden var olan 20 yinelenen çeviri anahtarı uyarısı değişmedi. `git diff --check` başarılı (yalnız LF/CRLF dönüşüm uyarıları). Denetim aracının dosya adı/rapor tarihi tarihsel olarak 20261017 kalmıştır; bu tekrar çalışma 18 Ekim'dedir. Görsel onay, FPS/bellek ölçümü yapılmış sayılmaz.
