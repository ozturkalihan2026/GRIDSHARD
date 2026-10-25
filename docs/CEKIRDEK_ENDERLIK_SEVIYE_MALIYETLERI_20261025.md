# Modül ve çekirdek maliyet tabloları 25 Ekim 2026

Kaynak kullanıcının Seviye.docx belgesindeki üç tablodur. Kullanıcı üç tablonun
da yazılan tutarlarla uygulanmasını istedi. Sayılardaki Word biçimlendirme
boşlukları temizlendi; değerler değiştirilmedi.

Bu belge önceki çarpanlı seviye eğrisinin ve çekirdek yeteneklerini modülün
2–4. eşiklerinden türeten kuralın yerine geçer. Çekirdek yetenek tutarları
artık belgedeki bağımsız tablodan alınır.

## Ortak seviye maliyetleri

Her hücre DK / ilgili kartın parçası biçimindedir; varsa Akı ayrıca yazılır.
Modüle modül parçası, çekirdeğe kendi türünün çekirdek parçası harcanır.

| Seviye | Yaygın | Nadir | Epik | Efsanevi |
| --- | --- | --- | --- | --- |
| 1 → 2 | 100 / 2 | 300 / 2 | 600 / 2 | 1.200 / 1 |
| 2 → 3 | 200 / 4 | 500 / 4 | 900 / 2 | 1.800 / 2 |
| 3 → 4 | 400 / 10 | 800 / 10 | 1.200 / 4 | 2.400 / 4 |
| 4 → 5 | 600 / 20 | 1.200 / 20 | 2.000 / 8 | 4.000 / 6 |
| 5 → 6 | 1.000 / 40 | 1.500 / 30 | 3.000 / 12 | 6.000 / 10 |
| 6 → 7 | 1.500 / 80 | 3.000 / 60 | 6.000 / 20 | 12.000 / 15 |
| 7 → 8 | 3.000 / 160 | 5.000 / 100 | 8.000 / 30 | 16.000 / 20 + 500 Akı |
| 8 → 9 | 6.000 / 320 | 10.000 / 150 | 16.000 / 40 | 20.000 / 30 + 1.000 Akı |
| 9 → 10 | 12.000 / 480 | 20.000 / 250 | 25.000 / 50 | 30.000 / 40 + 1.500 Akı |
| 10 → 11 | 20.000 / 600 | 30.000 / 400 | 40.000 / 75 | 40.000 / 50 + 2.000 Akı |
| 11 → 12 | 25.000 / 720 | 40.000 / 500 | 50.000 / 100 | 50.000 / 60 + 2.500 Akı |
| 12 → 13 | 30.000 / 840 | 45.000 / 600 | 60.000 / 125 | 60.000 / 70 + 4.000 Akı |
| 13 → 14 | 35.000 / 960 | 50.000 / 700 | 65.000 / 150 | 70.000 / 80 + 6.000 Akı |
| 14 → 15 | 40.000 / 1200 | 55.000 / 800 | 70.000 / 200 | 80.000 / 90 + 10.000 Akı |

## Modül yetenek maliyetleri

| Enderlik | 1. yetenek | 2. yetenek | 3. yetenek | 4. yetenek |
| --- | --- | --- | --- | --- |
| Yaygın | 1.000 DK | 2.000 DK | 4.000 DK | 8.000 DK + 1.000 Akı |
| Nadir | 2.000 DK | 4.000 DK | 10.000 DK + 1.000 Akı | 20.000 DK + 2.000 Akı |
| Epik | 10.000 DK | 20.000 DK + 1.000 Akı | 30.000 DK + 2.000 Akı | 40.000 DK + 3.000 Akı |
| Efsanevi | 10.000 DK + 1.000 Akı | 20.000 DK + 2.000 Akı | 30.000 DK + 3.000 Akı | 40.000 DK + 4.000 Akı |

## Çekirdek yetenek maliyetleri

| Enderlik | 1. yetenek | 2. yetenek | 3. yetenek |
| --- | --- | --- | --- |
| Yaygın | 2.000 DK | 5.000 DK | 10.000 DK + 1.000 Akı |
| Nadir | 4.000 DK | 10.000 DK | 20.000 DK + 2.000 Akı |
| Epik | 10.000 DK | 20.000 DK + 2.000 Akı | 30.000 DK + 3.000 Akı |
| Efsanevi | 20.000 DK + 2.000 Akı | 30.000 DK + 3.000 Akı | 40.000 DK + 4.000 Akı |

Yetenek açılış seviyeleri değişmedi. Modüller: yaygın5/8/11/14, nadir6/9/12/15,
epik7/10/13/15, efsanevi8/11/14/15. Çekirdekler tüm enderliklerde5/9/13.

## Uygulama ve kayıt güvenliği

Seviye fiyatı sunucuda rarity_upgrade_cost ile modül/çekirdeğe ortak hesaplanır.
Modül ve çekirdek yetenek fiyatları TALENT_COSTS ve CORE_TALENT_COSTS ile ayrı
belirlenir. İstemci, bedelleri ve yükseltme uygunluğunu sunucu görünümünden alır.

İstek tekrarı ikinci ödeme yapmaz. DK, Akı ve parça birlikte doğrulanır;
eksik kaynakta kısmi kesinti yapılmaz. Önceki seviye ve yetenek seçimleri korunur;
eski makbuzlar yeniden fiyatlandırılmaz. Canlı oyuncu veri dosyası düzenlenmedi.

## Kaynak doğrulama

Belgeden çıkarılan56 seviye,16 modül yeteneği ve12 çekirdek yeteneği fiyatı
server/tests/fixtures/level_costs_seviye_20261025.json dosyasında bağımsız test
verisi olarak tutulur. Kaynak SHA256: `24f8f26f6f15ff7789cd66581873b94c8bd21a86218cc9e3e7d2649cf5423e63`.
Kod fiyatları bu test verisine karşı doğrulanır; oyun çalışma anında Word
dosyasını veya test verisini yüklemez.

Kanıt: artifacts/seviye-docx-20261025/.

## Son doğrulama

- 735 istemci,302 ilgili sunucu ve10 paketleme testi geçti.
- Üç tarayıcı profilinde9 fiyat/gösterge/ödül gezinme testi geçti.
- Belgedeki56 seviye ve28 yetenek fiyatı bağımsız kaynak verisine karşı doğrulandı.
  36 modül ve7 çekirdeğin14 adımlık görünümlerinde toplam602 fiyat karşılaştırıldı.
- Gerçek seviye ve yetenek satın alımlarında kesinti, eksik kaynakta atomiklik,
  eski makbuz ve seçimlerin korunması, yinelenen istekte ikinci kez kesmeme kontrol edildi.
- 320/393px genişlikte efsanevinin80.000DK+10.000Akı bedeli de taşmadan görünür.

Canlı kullanıcı dosyası düzenlenmedi. Sunucu/AAB/commit/push bu turda yapılmadı.

Ekonomi raporlama aracı da aynı yeni tablolara bağlandı; eski sabit kullanımı
kaldırıldı ve Akı maliyeti hesaba katıldı. Aracın2 testi geçti;424 aktif
Python dosyasının import kontrolünde0 sorun var.
