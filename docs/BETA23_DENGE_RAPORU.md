# GRIDSHARD Beta.23 — Enerji ve Savaş Denge Raporu

## Jeneratör kararı

Kanonik Jeneratör üretimi `8 Ü/sn` değerinden `11 Ü/sn` değerine çıkarıldı.

- Temel hat kullanılabilir: `11 × 0.90 = 9.9 Ü/sn`
- Dağıtıcı hattı: `11 × 0.98 = 10.78 Ü/sn`
- Enerji Sömürücü altında temel hat: `11 × 0.70 × 0.90 = 6.93 Ü/sn`

Bu değer Lazer + Darbe Topu gibi aktif saldırı çiftlerini sürekli besler. Buna karşılık Darbe Topu + Ray Topu gibi 11 Ü/sn yüklerde Batarya/Kapasitör desteği hâlâ gereklidir. Böylece bekleme oranı azaltılırken enerji ekonomisinin stratejik rolü korunur.

## Kombinasyon taraması

Enerji tüketen katalog modüllerinin 1–6 aktif tüketici kombinasyonları tarandı. Toplam `43.795` kombinasyon değerlendirildi. Makine-okunur rapor:

`qa_reports/beta23_balance_report.json`

## Savaş regresyonu

Altı arketip kullanıldı: Dengeli, Saldırı, Savunma, Sabotaj, Batarya+Darbe ve Zırh Karşı.

- Mirrored toplam maç: `30`
- Timeout: `0`
- Draw: `2`
- Ortalama maç süresi: `52.593 sn`
- Finish reason'lar timeout değildir; maçlar engine tarafından sonuçlandırılır.
- Birden fazla arketip galibiyet alabildi; tek bir devre bütün eşleşmeleri kazanmadı.

## Hedef sırası

Kanonik hedef sırası değişmedi:

1. normal aktif modüller,
2. Jeneratör,
3. Çekirdek.

Bu sıra server combat testleriyle korunur.
