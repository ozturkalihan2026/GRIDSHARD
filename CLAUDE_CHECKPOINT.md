# Claude devir notu — 5 Ekim 2026

İş bilgisayarındaki oturumun sonu. Çalışma ağacındaki değişiklikler **commit edilmedi**; commit'i kullanıcı yapacak. Bu not ev bilgisayarında devam etmek içindir. Aynı ağaçta Codex de çalışıyor (`CODEX_CHECKPOINT.md`); o dosyaya ve Codex'in değişikliklerine dokunulmadı.

## Bu turda biten işler

Kullanıcının 5 Ekim isteğindeki 11 maddenin hepsi kodlandı:

1. Takım ekranı: takım listesi + BAŞVUR, "Takım Oluştur" sekmesi (ad, açıklama, kupa şartı, 300 DK kurma bedeli), başvuruyu geri çekme, lidere bildirim ışığı.
2. Profil → Kozmetik alt sekmeleri (Avatar, Çerçeve, Emoji, Arka Plan).
3. Alt gezinmeden girilen her ekran ilk alt sekmesinde açılır.
4. Bölüm başlıkları tek satır.
5. Açılış ekranındaki kimlik kaldırıldı; profilde ad alanının altında "Kimliğin: …".
6. Arkadaşlar: satır kayması, arama sonucunun temizlenmesi, sekme yazısı taşması, mesaj düğmesi.
7. Hesap ve Gizlilik: Play Games, Google, Apple simgeleri.
8. Modül kartları: seviye / ad / parça ayrı satırlarda; savaşta tahta ve raf kartlarında modül adı.
9. Üst bar: Akı ve Devre Kredisi (+ mağazaya götürür) Ev, Kartlar, Mağaza'da; profil barı yalnız Ev'de.
10. İlk oyun deneyimi: atlanamayan, oklu menü turu + sunucunun sahne sahne yönettiği ilk savaş.
11. Savaş performansı: yerleşim zorlamaları ve tam yeniden çizimler kaldırıldı; grafik kademeleri ve Otomatik kip.

İlk oyun deneyiminin parçaları: `server/app/game/tutorial.py` (yönetmen), `client/src/tutorial/onboarding.js` (katman + akış), `client/src/app.js` içinde `ONBOARDING_STEPS` ve `DIRECTED_BATTLE_STAGES`.

## Kalan işler

- **Gerçek cihaz testi yapılmadı.** Performans yalnız masaüstü Chrome'da işlemci yavaşlatmasıyla ölçüldü; realme 8 Pro'da doğrulanmalı (Otomatik kipin "Orta" kademede başlaması beklenir). İlk oyun deneyimi de yalnız masaüstü Chrome'da telefon boyutlarında (320×568, 360×640, 360×780, 393×873) denendi; Android WebView'da `<dialog>` katmanı, dokunuşun hedefe iletilmesi, üst güvenli alan ve geri tuşu denenmedi.
- **Yeni APK alınmadı.** `setTextZoom(100)` yerel koddadır; bütün istemci değişiklikleri için de yeni derleme gerekir.
- **Sunucu güncellenmedi.** Takım uç noktaları, eğitim yönetmeni, eşleştirmedeki `tutorial` alanı ve başlangıç Lazer parçaları sunucudadır; istemciyle birlikte yayınlanmalı. Eski sunucuda ilk savaş yönetilmez, yalnız ipucu kartları çıkar.
- **İlk oyun deneyimi için kalıcı uçtan uca test yok.** Denemeler geçici betiklerle yapıldı (depoda değil). `e2e/` altına `?e2e=1&onboarding=1` ile çalışan bir test eklenebilir.
- **Eğitim metinleri** kullanıcının gözden geçirmesini bekliyor (Türkçe ve İngilizce).
- Grafik kademesi seçimi ve otomatik düşürme için birim testi yazılmadı.
- iPhone/Safari uçtan uca projesi bu turda çalıştırılmadı (Android öykünmesi 8/8, masaüstü çalıştı).
- `docs/YOL_HARITASI.md` güncellenmedi; "eğitim atlanabilir" satırı artık geçerli değil.

## Kullanıcı onayı bekleyen kararlar

- Takım kurma bedeli **300 Devre Kredisi** ("devre kredisi isteme" böyle yorumlandı). Eğitimden çıkan oyuncunun ~240 DK'si kalır; hemen takım kuramaz.
- Her yeni hesap **2 Lazer parçasıyla** başlar (`STARTER_MODULE_SHARDS`).
- Eğitimde Lazer yükseltme (100 DK) ve haftalık turnuva kaydı (100 DK) normal bedelleriyle yapılır.
- Yönetmenli ilk savaş normal Arena maçı sayılır (kupa ve ödül verir) ve oyuncu kazanır.
- Yönetmenli savaş yalnız hiç maçı olmayan ve başlangıç destesini kullanan oyuncuya açılır. Ayarlar'dan tekrar gösterimde menü turu yeniden oynar, savaşta ipucu kartları çıkar.
- Savaş kartlarında uzun adlar kısaltıldı (ör. "Onarım Modülü" → "Onarım").
- `?e2e=1` ile açılan sayfada eğitim başlamaz; `&onboarding=1` eklenirse başlar.

## Bilinen sorunlar (bu turdan önce de vardı)

- `e2e/beta33-season.spec.js` kalıyor: istemcide olmayan `#season-equipped-title` öğesini arıyor.
- `e2e/two-client-pvp.spec.js` yalnız `GRIDSHARD_E2E_HUMAN_MATCHMAKING=1` ile başlatılan sunucuda geçer.
- `server/tests/test_worker_ownership.py` içindeki iki test `fakeredis` paketi ister.
- `server/tests/test_social_migration_audit.py` depo kökünden çalıştırılmalıdır.

## Son test durumu

- İstemci: `cd client && node --test tests/*.test.js` → 180/180.
- Araçlar: `node --test tools/tests/*.test.js` → 30/30.
- Sunucu: `cd server && python -m pytest tests -q --ignore=tests/test_social_migration_audit.py` → 1078 geçti, 2 kaldı (`fakeredis`), 37 atlandı.
- Uçtan uca: Android öykünmesi 8/8; masaüstü 11/12 (kalan: `beta33-season`).

## İlk oyun deneyimini denemek

Hiç maçı olmayan yeni hesapla ve adreste `?e2e=1` olmadan aç. Aynı tarayıcıda yeniden denemek için `localStorage` içinden `gridshard.tutorial.v1` ve `gridshard.onboarding.step.v1` silinir; yönetmenli savaş için hesabın maçı olmamalıdır. Ayarlar → "İlk Oyun Deneyimini Tekrar Göster" turu baştan başlatır.
