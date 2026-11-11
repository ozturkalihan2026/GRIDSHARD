# Yankı Rölesi — S2 mekanik ve üretim brief'i

11 Kasım 2026. CARD-01 / 2.5.0, S2 28 Aralık 2026. Durum: tasarım önerisi; modül mevcut aktif 24'lünün içinde değildir. Planlı `echo_relay` kaydı çalışma kodu sayılmaz.

## Oyuncuya davranış

Taktik destek modülü, tek bir dost silahın sonraki doğrudan atışına zayıf bir ikinci vuruş ekler. Güçlendirici'nin sürekli hasar desteğinden farkı, okunabilir tek yük ve iki ayrı isabettir. Normal otomatik yerleşim ve silah hedef önceliği değişmez. Arena 3 ve ücretsiz edinim kapısı korunur.

İlk prototip önerisi: 3 Akım, 125 CAN, en erken 6 saniyede bir tek yük, sonraki uygun atışın temel hasarının %30'u kadar bir yankı ve yaklaşık 150 ms görsel ayrım. Bunlar denge testi başlangıcıdır; kesin katalog/ekonomi değerleri veya oyuncuya vaat değildir.

## Motor sözleşmesi

- [ ] Mevcut destek hedefleme davranışı koddan çıkarılıp karşılaştırılır; uygun dost silah seçimi deterministik kalır. Yeni bir genel hedef önceliği eklenmez.
- [ ] Aynı silahta en fazla bir yankı yükü. İkinci röle ek yük biriktirmez; kaynak röle yok olursa kullanılmamış yük kaldırılır.
- [ ] Yük yalnız gerçek uygun doğrudan atışta bir kez tüketilir; kopyalanan vuruş yeniden yankı üretemez.
- [ ] Yankı aynı saldırı kimliğine bağlı ayrı event kimliği taşır; aynı event tekrar işlenince ikinci kez hasar/ödül üretilmez.
- [ ] İlk vuruş hedefi yok ederse yok olmuş hedefe hasar yazılmaz, başka hedefe bedelsiz atlanmaz. Hedef kaybı davranışı test edilir.
- [ ] Zincir/alan/süreli hasar, modül doğurma ve çekirdek gücü kopyalanmaz. İlk prototip uygun silah listesi açık yazılır; uyumsuz modül sessizce destekleniyor sayılmaz.
- [ ] Kalkan, zırh, yansıma ve ölüm mevcut hasar yolundan geçer; mevcut tek vuruş kalkan davranışı korunur. Yankı başka bir çekirdek/onarım/enerji olayını sahte biçimde tetiklemez.
- [ ] AI/insan maçlarının mevcut kupa/XP/kredi politikası korunur; modül kullanımına ayrı bütçesiz ödül eklenmez.

## Sanat ve ses

Boyalı, alçak ikiz bobinli röle; tek geniş fiziksel bağlantı. Turkuaz ışık işlevi gösterir, ince neon HUD kullanılmaz. Küçük rafta Güçlendirici/Hız Rölesi ile karışmayan silüet gerekir. Dost silah üzerinde tek yük, tetiklenince kısa ikinci mermi izi. Ses görevi destek yükleme + kısa gecikmeli kristal cevap; çekirdeğin kahraman imzasını ve savaş müziğini bastırmaz. Yeni modül için özgün ses yazılır, mevcut modülün dosyası yeni adla kopyalanmaz.

## Teslim sırası ve kabul

1. Sayısal prototip ve eski altılı destelere karşı senaryolar; kalkan, alan/zincir, hedef/source kaybı, iki röle ve tekrar event testleri.
2. Mevcut roster/spec/motor/snapshot/AI deste sözleşmelerine bağlama; kayıt geri yükleme ve eski istemci uyumu.
3. Kart çizimi, küçük ikon, sahne VFX, ses, TR/EN metin ve kilitli bilgi görünümü.
4. Ücretsiz kazanım ve arena 3 uygunluğu; sezon bitince kartı kaldırmama; ücretli özel güç oluşturmama.
5. Denge raporu: seviye/arena ve AI/insan ayrımı, eski destelerle karşı oyun, örneklem sınırı. Sayısal kabul olmadan başlangıç değerleri kesinleşmez.
6. `season_module_releases` kapıları, yeni ödül profili, stok, Android ve CI kabulü. Bunlardan önce modül planned kalır.

Bu brief'in hazırlanması CARD-01'in tamamlanması değildir; sonraki somut iş motor prototipidir.
