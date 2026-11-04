# GRIDSHARD — geçerli oyun kuralları

4 Kasım 2026. Bu belge güncel kaynaklara giriş noktasıdır. Eski 36 kart,
Enerji/Isı, jeneratör, port döndürme, sürükleme ve laboratuvar taslakları
güncel tasarım talimatı değildir.

## Savaş omurgası

- Dikey mobil oyun; savaş gerçeği sunucu motorunda hesaplanır.
- Oyuncu savaş öncesinde bir çekirdek ve altı modül seçer. Aktif modül
  kataloğu 24 kart ve Saldırı/Savunma/Taktik sınıflarından oluşur.
- Devre 5×3 hücredir; merkez çekirdeğe ayrılır, 14 hücre modül yerleşimine uygundur.
- Oyuncu karta dokunur; yeterli Akım varsa sunucu uygun boş hücreye yerleştirir.
  Mevcut rastgele yerleşim ve hedef önceliği yeni içerikle sessizce değiştirilmez.
- Savaşın tek harcanan yerleşim kaynağı Akımdır. Ayrı enerji/ısı ekonomisi yoktur.
- Akım V8: 7 başlangıç, 12 depo, 3 saniyede +1; Saldırı modüllerinin verdiği
  100 yeni gerçek düşman CAN kaybı ile Savunma modüllerinin aldığı 50 yeni gerçek
  CAN kaybı birlikte ek +1 üretir. İstisna ve sayaç sınırları
  [V8 sözleşmesindedir](AKIM_V8_ANA_OYUN_VE_EGITIM_20261101.md).
- Temel imza yetenek satın almadan çalışır. Modül enderliği gizli bir savaş
  gücü çarpanı değildir; V7 tasarımı ve mevcut yetenek sözleşmesi korunur.

## Kaynaklar

| Alan | Esas dosyalar |
| --- | --- |
| Aktif kadro/sınıf/arena | `server/app/module_roster.py`, `server/data/module_roster_v2.json` |
| Tahta/yerleşim/motor | `server/app/game/board.py`, `server/app/game/engine.py` |
| Akım | `server/app/game/economy.py`, `server/app/game/pressure_current.py` |
| Modül imzaları ve yetenekler | `server/app/game/module_talents_v3.py`, [V7 karar verisi](NIHAI_MODUL_ENDERLIK_YETENEK_V7.json) |
| Arena/lig/bot | `server/app/arena_canon.py`, `server/data/arena_progression_v1.json`, `server/data/arena_bot_profiles_v1.json` |
| Çekirdekler | `server/app/game/core_balance.py`, [sunum sözleşmesi](CEKIRDEK_SUNUMU_V6_20261031.md) |
| Görsel aile | [Ortak sanat yönü](SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md) |

## Sürüm ve sezon sınırı

2.4.0 ilk sezonu mevcut 24 modülle açmayı hedefler; S1 istisnası ve kaynak
haftaları henüz uygulanacak işlerdir. S2 ve sonrasında yeni modülün çalışma
kodu, sanat/VFX/sesi, denge/karşı oyunu, arena ve ücretsiz edinimi hazır olmalıdır.
Planlanmış modül kaydı oynanabilir içerik değildir. Güncel iş kapsamı
[sürüm rehberindedir](GRIDSHARD_SURUM_UYGULAMA_REHBERI_20261104.md).

Yeni bir kural değişikliği ilgili kaynak, test, belge ve checklist kabulüyle
birlikte ele alınır. Eski kayıt veya eski kabul raporu yeni kararı geçersiz kılamaz.
