# GRIDSHARD — Modül yetenekleri V7.1, 1 Kasım 2026

Aktif 24 modül için geçerlidir. Kaynak `server/app/game/module_talents_v3.py`; eşik ve fiyat kaynağı `server/app/game/talents.py`. `python tools/document_module_talents_v3.py` ile yeniden üretilir.

Her eşikte iki daldan biri seçilir. Kartların mevcut görevi geliştirilir; yetenekler rastgele yerleşimi, öncelikli hedefleri ve kartın Akım bedelini değiştirmez. Savaşın tek ekonomisi Akımdır. Enerji/Isı ya da emekli kartlar geri gelmez. Çekirdek dalları bu değişikliğin kapsamında değildir.

| Eşik | Sol dal | Sağ dal |
|---|---|---|
| Temel | Mevcut işin gücü +%3 | Azami CAN +%5 |
| İmza | Aşağıdaki karta özel sol uzmanlık | Karta özel sağ uzmanlık |
| İnce ayar | Atış/eylem aralığı −%4; pasif kartlarda işin gücü +%4 | Azami CAN +%5 |
| Ustalık | Mevcut işin gücü +%6 | Azami CAN +%8 |

İşin gücü: saldırıda hasar; diğer kartlarda blok, zırh, yansıma, dost koruması, faz süresi, kalkan CAN, onarım, atış bonusu, kesinti süresi, yavaşlatma veya hız yükü. Bariyer’de alınan onarım artar. Arındırıcı’da arındırma dolumu kısalır; tek seferde yine bir olumsuz etki silinir. Ustalık bağımsızdır; imza seçilmemişken de yarar sağlar.

Önce imza dalının sabit değer/dağılım değişimleri, sonra temel/ince ayar/ustalık çarpanları uygulanır. +%3, +3 yüzde puan değildir. Örneğin %60 blok ×1,03=%61,8. Süre ve oranlar seviyeyle büyümez; mutlak miktarlar seviye eğrisini bir kez alır. Ayrıntılı karar ve testler: `NIHAI_MODUL_ENDERLIK_YETENEK_V7_20261101.md` ve `V7_UYGULAMA_VE_STRATEJI_TESTLERI_20261101.md`.

## Aynen korunan maliyetler

Her hücre **Devre Kredisi / Akı** biçimindedir. Normal ücret ve seçili eşik başına **25 Akı** sıfırlama değişmedi. V7 geçişinde davranışı değişen kartlarda önceden ücretli seçilmiş eşikler için bir defalık ücretsiz yeniden seçim vardır: ücretsiz sıfırlama + yalnız eski satın alınmış eşiklerin ücretsiz tekrar seçimi. Yeni eşikler ücretlidir; hak tekrar girişte yenilenmez. Eski bedeller iade edilmez.

| Enderlik | Açıldığı seviyeler | Temel | İmza | İnce ayar | Ustalık |
|---|---|---|---|---|---|
| Yaygın | 5 / 8 / 11 / 14 | 1.000 / 0 | 2.000 / 0 | 4.000 / 0 | 8.000 / 1.000 |
| Nadir | 6 / 9 / 12 / 15 | 2.000 / 0 | 4.000 / 0 | 10.000 / 1.000 | 20.000 / 2.000 |
| Epik | 7 / 10 / 13 / 15 | 10.000 / 0 | 20.000 / 1.000 | 30.000 / 2.000 | 40.000 / 3.000 |
| Efsanevi | 8 / 11 / 14 / 15 | 10.000 / 1.000 | 20.000 / 2.000 | 30.000 / 3.000 | 40.000 / 4.000 |

## Kartlara özel imza seçenekleri

| Modül | Sol dal | Sağ dal |
|---|---|---|
| Lazer | **Yoğun Işın** — Ana hasar +%8. | **Seri Işın** — Atış çevrimi −%8. |
| Darbe Topu | **Ağır Darbe** — Ana hasar +%10. | **Hazır Namlu** — Hazırlık 0,6 → 0,4 sn; toplam çevrim aynı. |
| Ray Topu | **Derin Delme** — Zırh azaltımını yok sayma %40 → %55. | **Hızlı Ray** — Atış çevrimi −%8; delme aynı. |
| Füze Fırlatıcı | **Ağır Başlık** — Takip patlaması oranı %20 → %35; ana hasar ve gecikme aynı. | **Hızlı Kilit** — Hazırlık 0,7 → 0,45 sn; takip patlaması 0,6 → 0,3 sn. Toplam çevrim değişmez. |
| Dron Üssü | **İkinci Kol** — İkinci hedef oranı %25 → %40; ana hasar aynı. | **Yoğun Sürü** — Ana hasar +%10; ikinci hedef oranı %25 → %10. Tek hedefte uzmanlaşır. |
| Ark Topu | **Geniş Zincir** — İkinci/üçüncü oran %45/%20 → %55/%25. | **Yoğun Ark** — Ana hasar +%10; üçüncü sıçrama kalkar, ikinci %45 kalır. |
| Plazma Havanı | **Kalıcı İz** — İz saniyede %5 → %8; iki yayılım %30/%30 → %20/%20. Toplam iz %24. | **Geniş Yayılım** — Yayılım %30/%30 → %40/%40; iz saniyede %5 → %3. Toplam iz %9. |
| Kuantum Tekrarlayıcı | **Yoğun Dördüncü** — Dördüncü temel hasar 24 → 30; toplam yankı %60 → %40. Hedef başına %20 aynı. | **Yaygın Yankı** — Dördüncü temel hasar 24 → 22; toplam yankı %60 → %80. Hedef başına %20 aynı. |
| Seri Top | **Sıkı Seri** — Mermiler arası süre 0,2 → 0,15 sn; üç mermi ve çevrim aynı. | **Ağır Mermi** — Her merminin hasarı +%10. |
| Kalkan Kırıcı | **Derin Kırıcı** — Ek kalkan silme bütçesi %50 → %75; CAN hasarı aynı. | **Ağır Kırıcı** — Ana hasar +%10; ek kalkan oranı %50 kalır. |
| Kalkan | **Güçlü Blok** — Blok oranı %60 → %68. | **Hızlı Blok** — Blok dolum çevrimi −%15. |
| Zırh | **Kalın Plaka** — Azaltım %25 → %30. | **Sağlam Gövde** — Azami CAN +%12. |
| Bariyer | **Derin Siper** — Azami CAN +%12. | **Takviyeli Siper** — Kendi gelen saldırı hasarını %6 azaltır; hedef sırası aynı. |
| Yansıtıcı | **Güçlü Yansıma** — Gerçek CAN kaybından dönüş %30 → %40. | **Hızlı Ayna** — Yansıma dolum çevrimi −%15. |
| Muhafız Kubbe | **Güçlü Kubbe** — Engelleme %35 → %42. | **Hızlı Kubbe** — Koruma dolum çevrimi −%15. |
| Faz Zırhı | **Uzun Faz** — Faz penceresi 1 → 1,2 sn. | **Sık Faz** — Faz çevrimi 6 → 5,4 sn. |
| Tampon | **Yoğun Tampon** — Havuz 60 → 75; dönüşüm %40 → %30. Havuz başına en çok 22,5 onarım. | **Onaran Tampon** — Havuz 60 → 50; dönüşüm %40 → %60. Havuz başına en çok 30 onarım. |
| Son Siper | **Çekirdek Mirası** — Çekirdek kalkanı 75 → 90; dost toplamı 40 → 25. Toplam 115 aynı. | **Devre Mirası** — Çekirdek kalkanı 75 → 60; dost toplamı 40 → 60. Toplam 120. |
| Onarım | **Yoğun Onarım** — Toplam onarım +%20; süre ve darbe sayısı aynı. | **İlk Yardım** — Toplam onarımın ilk darbeye düşen payı 1/3 → %50; diğer iki darbe %25/%25. Toplam, süre ve çevrim aynı. |
| Güçlendirici | **Güçlü Yük** — Sonraki atış bonusu %25 → %30. | **Sık Yükleme** — Yükleme çevrimi −%12. |
| EMP | **Uzun Kesinti** — Kesinti 1 → 1,2 sn; toparlanma 3 sn kalır. | **Hızlı Darbe** — EMP çevrimi −%10; kesinti ve toparlanma aynı. |
| Yavaşlatıcı Virüs | **Yoğun Yavaşlık** — Aralık uzatma %25 → %30; süre aynı. | **Onarım Bozucu** — Aralık uzatma %25 → %15; aynı 4 sn boyunca hedefin aldığı onarım −%25. Kalkanı azaltmaz. |
| Arındırıcı | **Sık Arındırma** — Arındırma çevrimi −%15; bir etki siler. | **Temiz Koruma** — Başarılı arındırmadan sonra aynı hedefte 2 sn tek kontrol koruması: sonraki EMP/Virüsün süresi −%30. İmha/hasar yüklerini engellemez; birikmez. |
| Hız Rölesi | **Güçlü Hız Yükü** — Bekleme kısaltması %20 → %25. | **Sık Röle** — Yükleme çevrimi −%12. |

## Kayıt ve uygulama

Eski eşik (`0`–`3`) ve dal (`power`/`resilience`) kimlikleri korunur. Arşivdeki geçerli ücretli seçimler yalnız halen aktif kartlara, ek ücret alınmadan ve mevcut yeni seçimlerin üzerine yazılmadan bir kez bağlanır. Sonraki sıfırlama kalıcıdır. Emekli kartların kayıtları özel arşivde kalır; işlem fişleri değişmez.

Kart ekranının istatistikleri ile savaş aynı hesaplanan parametreleri kullanır. Yetersiz cüzdan, seviye kilidi ve yinelenen istekler sunucuda denetlenir. Bu kodu geliştirmek gerçek oyuncu verilerinin veya telefondaki uygulamanın güncellendiği anlamına gelmez.
