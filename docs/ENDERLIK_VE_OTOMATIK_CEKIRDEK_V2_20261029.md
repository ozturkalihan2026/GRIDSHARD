# Enderlik ve otomatik çekirdek hedeflemesi — 29 Ekim 2026

Kullanıcı, çekirdeğin yararlanacak modülleri kendisinin seçmesini ve sadeleşen
24 kartın enderliklerinin/farklarının belirlenmesini istedi. Yeni atamalar aday
kataloğa ve ayrı deney ekranına uygulandı; normal oyun/APK/oyuncu kayıtlarına
geçiş yapılmadı.

## Sabit enderlik atamaları

| Enderlik | Kart sayısı | Kartın sunduğu kimlik | Kartlar |
|---|---:|---|---|
| Yaygın | 8 | Temel ve güvenilir görev | Lazer, Darbe Topu, Seri Top, Kalkan, Zırh, Bariyer, Onarım, Güçlendirici |
| Nadir | 8 | Belirli ihtiyaca uzman cevap | Ray Topu, Füze Fırlatıcı, Dron Üssü, Yansıtıcı, Muhafız Kubbe, EMP, Arındırıcı, Hız Rölesi |
| Epik | 5 | Etki penceresi, kapsam veya özel savunma etkileşimi | Ark Topu, Plazma Havanı, Kalkan Kırıcı, Tampon, Yavaşlatıcı Virüs |
| Efsanevi | 3 | Görünür özel tetikleyiciyle savaş anı | Kuantum Tekrarlayıcı, Faz Zırhı, Son Siper |

Enderlik kartın sabit özelliğidir; seviyede üst enderliğe dönüşmez. Her kartın
tek işi ve karşı hamlesi korunur. Otomatik ek CAN/hasar/hız/Akım çarpanları **1,0**;
enderlik gizli pasif veya ikinci görev eklemez. Büyüme adayında bütün enderlikler
aynı %4 CAN/hasar eğrisini kullanır; deneyde beklemeler enderlikle değişmez.
Mevcut kartların temel sayıları farklıdır; bu kural farklı kartların eşit CAN veya
eşit hasara sahip olduğu anlamına gelmez. Tek tek kartlar kendi maliyet, etki,
aralık ve kapsamlarıyla dengelenmelidir;24kart henüz bu açıdan doğrulanmadı.

Efsanevi tetikleri:

- Kuantum Tekrarlayıcı: aynı hedefte görünen dört nokta, güçlü dördüncü isabet.
- Faz Zırhı: açık sayaçla kısa süre saydam/vurulmaz faz.
- Son Siper: yıkıldığında çekirdeğin CAN kalkanını75'e tamamlama.

Bu üç kart sırasıyla4/4/3Akım maliyetlerini korur. Yüksek enderlik için ilave
Akım bedeli veya azami kopya kuralı eklenmedi. Yaygın Lazer/Kalkan/Onarım gibi
temel roller ileri arenalarda da işe yarayacak şekilde dengelenmeli.

İlk altılı tamamen Yaygın. İlk Nadir2.arenada(EMP), ilk Epik7.arenada(Ark/Tampon),
ilk Efsanevi8.arenada(Faz Zırhı) tanıtılır.12arena adı/eşiği ve kart dağılımı aynı.
Etiket ve çerçeveler çelik/mavi/mor/altın; sınıf ayrıca yazılıdır. Savaş rafına
ikinci isim satırı eklenmedi ve görsellerin alanı daraltılmadı. Enderlik açıklaması
isteğe bağlı açılır bölümdedir.

Her karta ayrıca atama gerekçesi `rarity_signature` alanıyla yazıldı. Bu, aday
kartın tasarım gerekçesidir; deneydeki mevcut10kartın sade davranışlarının hepsinin
aday24kart tanımlarıyla birebir tamamlandığı anlamına gelmez. Örneğin deneyin
Güçlendirici/Kalkan davranışları hâlâ önceki sade prototipe aittir. Arayüzde canlı
kart açıklaması gerçek deney değerlerini, arena incelemesi aday değerleri gösterir.

Sandık olasılıkları, parça/altın yükseltme maliyetleri, eski kart yatırımları ve
oyuncu sahipliği bu tur değiştirilmedi. Yeni atamaların tam oyun ekonomisine
geçişi bu tablolar tamamlanınca yapılmalı.

## Çekirdek hedefi nasıl seçiliyor?

Oyuncu yalnız güç düğmesine ne zaman basacağını seçer. Bir modüle dokunmak bilgi
gösterir; çekirdek hedefi atamaz. API elle modül hedefi içeren güç komutunu reddeder.

- Rezonans: kendisi ve en düşük CAN oranındaki iki yaşayan dost modül.
  En fazla %18 azami CAN onarır; herkes tam canlıysa dolum korunur.
- Muhafız: kendisi; mevcut düşman saldırısının hedefi olan dost modül önce,
  sonra CAN oranı en düşük diğer dost.5sn boyunca %20 azami CAN kalkanı.
- Aşırı Yük: üç atışı da zaten yüklü silahları atlar. Çalışan silahlar önce,
  sonra eksik yüklerin sağlayacağı ek hasar potansiyeli yüksek olanlar seçilir.
  Hesap sırası: aktiflik → temel atış hasarı×eksik atış yükü → yerleşme sırası.
  İki silahın sonraki üç atışı %50 güçlü olur. Uygun silah yoksa dolum korunur.

Bu seçim anlık bir önceliktir; silahın gelecekte hayatta kalacağını garanti eden
bir tahmin değildir. Seçimde enderlik okunmaz. Eşit ihtiyaç/değerdeki Yaygın kart
da güçten yararlanır. Düşman hedef tercihi/rastgele yerleşim kuralına dokunulmadı.
İlk güç20sn,sonrakiler35sn; bunlar bu tur değiştirilmedi. Diğer dört çekirdeğin
yeni tasarımı bu tur uygulanmadı.

Aşırı Yük önce en eski iki silahı seçiyordu. Bu ikisi tam yüklüyken yeni yararlı
silahı kaçırabildiği için filtre/seçim düzeltildi. Çalışan, eksik yüklü silahlar
öncelikleniyor. Bu, enderlik lehine otomatik bir tercih değil.

## Kaynak ve doğrulama

Tek aday kaynak `server/app/game/rarity_identity.py`; katalog üreticisi ve deney
aynı atamaları kullanıyor. `tools/generate_current_only_design.py` ile
`server/data/current_only_design_v2.json` ve
`docs/AKIM_UC_SINIF_ARENA_KATALOG_V2.md` yeniden üretildi. Canlı36kart kanonu
değişmedi. Deney JSON'unda enderlik politikası ve otomatik çekirdek hedeflemesi açık.

**92 otomatik test PASS**: yeni enderlik dağılımı/imzalar, ilk altılı/arena eşiği,
aynı kartın etiketini Yaygın'dan Efsanevi'ye değiştirince seviye1/8/15'te CAN,
hasar,bekleme,Akım'ın değişmemesi; yaralı dostların otomatik seçimi; tam yüklü
silahın atlanması; uygun Yaygın silahın güçten yararlanması; elle hedefin reddi;
önceki savaş,tahta,komut ve modül regresyonları birlikte doğrulandı.

Gerçek Chrome1080×1000,375×812,320×740:10kartın enderlik etiketleri,4enderlik
açıklaması,12arenada3Efsanevi etiketinin görünmesi,yerleştirme,güç,inceleme ve
yeniden deneme PASS. Taşma0,JS hata0; raf adları tek satır ve görseller tam.
Ekran görüntüsü gözle incelendi. Fiziksel telefon/oyuncu anlaşılabilirliği testi
yapılmadı.

Yeni Aşırı Yük seçimiyle81deterministik senaryo tekrar çalıştırıldı;81'i de
çekirdek yıkımıyla bitti. Süre84,9–393sn,medyan116,5sn. Kendi çekirdeğinin gerçek
katkısı sıfır olan senaryo0. Bu10kart ve3çekirdek içindir;24kartın/Efsanevilerin
mekanik dengesini veya gerçek oyuncu tercihlerini kanıtlamaz. Gözlem tavanı900sn
oyun süresi kuralı değildir. Otomatik güç hedefi değiştiği için önceki koşunun
sonuçları bu kaynak için nihai sonuç sayılmaz.

Kanıtlar `artifacts/rarity-core-v2-20261029/`: `browser.json`,PNG'ler,
`simulation.json`,`catalog.json`,`source-manifest.json`. Son dosya kullanılan
tasarım/motor/istemci kaynaklarının SHA256'larını içerir.
