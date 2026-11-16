# Geri Tepme Topu — 2.5.0 / S2 saldırı modülü brief'i

16 Kasım 2026 kullanıcı kararı: yeni modül destek değil, saldırı veya savunma
olacak. Bu üretim adayında **saldırı** seçildi. Önceki destek tasarımı Yankı
Rölesi'nin yerini **Geri Tepme Topu / Recoil Cannon (`recoil_cannon`)** alır.
Aktif 24 modüle henüz eklenmedi; planned kaydı hazır oyun kodu değildir.
S2 başlangıcı ayrıca onaylanacak; 28 Aralık yalnız koşullu hedeftir.

## Oyuncuya davranış ve ayrışma

Kendi hedefini mevcut saldırı önceliğiyle seçip güçlü tek atış yapar. Her
gerçek atış gövdeyi aşındıran sabit bir geri tepme CAN bedeli taşır. Bir dost
silahı güçlendirmez, atışını kopyalamaz, kalkan/onarım veya aura üretmez.
Farkı Darbe Topu'nun hazırlığı, Seri Top'un küçük mermi dizisi, Ray Topu'nun
zırh delmesi veya Kuantum'un yankı yayılımı değildir: **yüksek doğrudan atış
karşılığında kendi dayanıklılığını tüketir**. Onarım faydalı olabilir ama
modülün çalışması için destede bir destek kartı şart değildir.

İlk sayısal prototip adayı: **4 Akım, 240 CAN, 50 doğrudan hasar, 3 sn
çevrim, atış başına 16 kendi CAN kaybı**; nadir / Arena 3. Değerler denge
başlangıcıdır; çalışma kataloğu veya kesin oyuncu vaadi değildir. Mevcut
altılı destelerle ölçülmeden yayımlanmaz; HP/hasar/recoil aynı seviye
çarpanını bir kez kullanır, Akım ve çevrim seviyeyle büyümez.

## Motor ve muhasebe sözleşmesi

- [ ] Rastgele uygun boş hücre, mevcut ana hedef türü/eşitlik sırası korunur;
  manuel nişan, komşuluk, yeni sınıf kotası veya zorunlu yerleşim eklenmez.
- [ ] Tek doğrudan mermi mevcut hasar yolunu kullanır: Faz, Zırh, blok,
  Kubbe ve CAN kalkanları sırayla işler; zırh/kalkan delme veya saf hasar yok.
- [ ] Geri tepme yalnız sunucuda gerçekten ateşlenen atış için bir kez
  uygulanır. EMP ile ateşlenmeyen çevrim, boşa çıkan intent veya tekrarlanan
  snapshot/event ikinci bedel doğurmaz. Uçuşa çıkmış geçerli atış Faz ile
  engellense de geri tepme bedeli iade edilmez.
- [ ] Geri tepme, kaynağın kendi CAN'ından doğrudan düşer; kendi kalkanı,
  zırhı veya Yansıtıcıyla atlatılmaz. Kaynak en az 1 CAN'da kalır; kendi
  kendini yok ederek ölüm/onarım zinciri üretmez. Rakip normal yoldan öldürebilir.
- [ ] Kendi CAN kaybı V8'in saldırı/savunma Akım gelirine, rakibin hasar/imha
  emrine, yansıma veya yeni saldırı zincirine yazılmaz. Rakibe verilen gerçek
  CAN kaybı mevcut kurala göre yalnız bir kez sayılır.
- [ ] Aynı adımda önce ölen kaynak yeni atış oluşturmaz. Ateşlenen mermi ve
  sonradan yok olan hedef mevcut mermi sözleşmesine uyar; bedelsiz hedef
  atlama, ek mermi veya ikinci ödül yoktur. Restart/snapshot tekrarları aynı kalır.
- [ ] Yetenek ağacı dört mevcut eşik/iki dal ve mevcut maliyet sözleşmesini
  kullanır; iş gücü/CAN/çevrim temel dalları korunur. İmza adayı hasarı
  artırma ile geri tepmeyi azaltma arasında seçimdir; alt sınır/tavan ve
  birleşik çarpanlar denge raporunda açıkça kaydedilir.
- [ ] Yeni Isı/Enerji kaynağı veya sayaç yoktur; yalnız mevcut Akım ve CAN.

## Karşı oyun, sanat ve ses

EMP ateşi durdurur. Kalkan/Zırh/Faz gelen hasarı mevcut kuralla karşılar;
rakip, aşınmış gövdeyi normal saldırısıyla daha kolay yok edebilir. Kesintisiz
yüksek hasar, uzun savaşta düşük dayanıklılık riskini taşır. Onarımın sonsuz
avantaj oluşturmadığı ve eski destelerin cevapsız kalmadığı ölçülecek.

Geniş tek namlu, iri geri tepme kızağı ve iki kalın piston; geri kaçıp yerine
oturan boyalı metal gövde. Silüet Darbe/Seri/Ray Topu'ndan ayrılır. İnce neon
HUD kullanılmaz. İsabet ve kendi CAN aşınması ayrı okunur; kendine verilen
hasar rakibe vurmuş gibi gösterilmez. Kısa ağır atış + mekanik piston cevabı
için özgün SFX üretilecek, mevcut bir ses yeni adla kopyalanmayacak.

## Üretim ve yayın kapısı

1. Yukarıdaki sayılarla motor prototipi; EMP/Faz/kalkan/1 CAN sınırı/tekrar
   event/kaynak ve hedef ölümü/onarım kombinasyonu/V8 muhasebe regresyonları.
2. Altılı eski destelere karşı seviye/arena ve AI/insan ayrımlı denge;
   karşı oyun, ekonomik edinim ve parça darboğazının ECON-01 ile ölçülmesi.
3. Kart, küçük ikon, sahne VFX, özgün ses, TR/EN yetenek/kilit açıklamaları;
   320/393 px ve yoğun savaşta okunurluk kabulü.
4. Arena 3 ve ücretsiz edinim; sezon sonunda kart kaldırılmaz, mevcut
   oyuncunun stoğu veya ilerlemesi sıfırlanmaz.
5. Runtime/sanat/karşı oyun/denge/arena/ücretsiz edinim kapıları ve Android/CI
   kabulü tamamlanmadan planned statüsü veya aktif 24'lük katalog değişmez.

[2.5.0 tasarım/üretim planı](release-250-design-and-production.md) ·
[Ücretsiz ekonomi](free-economy-250-report.md) ·
[Ortak savaş kanonu](../NIHAI_MODUL_ENDERLIK_YETENEK_V7_20261101.md).
