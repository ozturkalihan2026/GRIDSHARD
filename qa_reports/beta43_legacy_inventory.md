# Beta.43 legacy envanteri

Tarih: 10 Eylül 2026

Bu kayıt yalnız aktif referans taramasıdır. Kullanıcı çalışma zamanı verileri,
kanonik belgeler ve güncel QA kanıtları temizlik hedefi değildir.

## Temizlenen ilk küçük grup

- `server/app/game/economy.py`: hiçbir savaş komutu tarafından okunmayan
  `CircuitCreditConfig.rotate_cost` alanı kaldırıldı.
- `server/app/balance_regression.py`: kaldırılan `rotate_cost` alanını kopyalayan
  tarihsel yapılandırma satırı kaldırıldı.
- `client/src/i18n.js`: güncel görev metninde bulunmayan “döndür” çeviri
  sözleşmesi kaldırıldı.

## Korunacak aktif davranışlar

- Sürükle-bırak, taşıma, takas ve değiştirme güncel kullanıcı kararıdır;
  `client/src/app.js`, `client/src/battle/board-view.js` ve ilgili istemci
  stilleri temizlik hedefi değildir.
- Güçlendiriciler güncel savaş davranışıdır. `server/app/game/boosters.py`,
  `server/app/game/booster_schedule.py`, savaş motoru ve istemcideki üçlü/dönen
  teklif akışı korunmalıdır.
- `client/src/app.js::CIRCUIT_CABLE_DIRECTIONS` modül yönü değildir; hücreler
  arasındaki dört komşu kabloyu çizen güncel görsel algoritmadır.
- `gridshard-audio.js` içindeki `GRIDSHARD_AUDIO_DIRECTION` ses geçiş yönüdür;
  kaldırılmış modül yönü kanonuyla ilişkili değildir.
- CSS `rotate(...)` ve `flex-direction` kullanımları görsel dönüşüm/yerleşimdir;
  modül döndürme mekaniği değildir.

## Göç nedeniyle şimdilik korunacak üretim kodu

- `server/app/game/catalog.py` içindeki tarihsel `generator` tanımı,
  `server/app/game/battle_pool.py` eski kayıt göçü ve alias sözleşmeleri tamamen
  sürümlenmeden silinmemelidir.
- `server/app/game/combat.py`, `engine.py`, `pvp_session.py`, `player_statistics.py`
  ve `telemetry.py` içindeki Jeneratör kontrolleri eski kayıt/maç özeti
  uyumluluğudur; zorunlu başlangıç modülü anlamına gelmez.
- `server/app/game/topology.py` bütün hücrelerin gömülü kablolarla beslendiğini
  ve portların gücü kısıtlamadığını açıkça sabitler; bu yorum güncel kanonu
  koruduğu için tutulmalıdır.

## Tarihsel test borcu

- `server/tests` altında `Direction` kullanan testler kaldırılmış üretim API'sini
  bekler ve güncel tam koleksiyonu toplama aşamasında durdurur. Bunlar topluca
  silinmemeli; davranış halen geçerliyse yönsüz `Position` kurulumuna taşınmalı,
  yalnız port/döndürme davranışını sınayanlar tarihsel klasöre ayrılmalıdır.
- `test_balance_regression.py` ve `test_balance_regression_gateway.py` içindeki
  saniyelik pasif kredi beklentileri güncel 2500 ms Akım yenileme sözleşmesiyle
  çelişir. Bu testler ilk `rotate_cost` temizliğinden bağımsız olarak 3 hata
  üretmektedir ve sonraki temizlik grubunda güncel Akım modeline taşınmalıdır.

## Sonraki güvenli grup

1. `Direction` kullanan testleri “hala geçerli oyun davranışı” ve “yalnız eski
   port/yön davranışı” olarak dosya bazında ayır.
2. Geçerli savaş, destek, sabotaj ve sonuç testlerini yönsüz kurulum yardımcısına
   geçir.
3. Güncel Akım yenileme regresyonunu 2500 ms aralığı ve azami 12 Akım üzerinden
   yeniden yaz.
4. Ancak güncel eşdeğer kanıtlar geçtikten sonra yalnız eski port/yön test
   dosyalarını kaldırma adayı olarak işaretle.
