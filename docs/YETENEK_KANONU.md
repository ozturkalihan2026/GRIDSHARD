# GRIDSHARD 2.1 — Yetenek Kanonu

Bu belge `server/app/game/talents.py` verisinden üretilir (Faz 3, 12 Ekim 2026). Çelişki olursa kod geçerlidir.

## Modül yetenekleri

Her modülün dört eşiği vardır; her eşikte iki daldan biri seçilir. Eşik seviyeleri enderliğe göredir: Sıradan 5 / 8 / 11 / 14, Ender 6 / 9 / 12 / 15, Destansı 7 / 10 / 13 / 15, Efsanevi 8 / 11 / 14 / 15. Bedel sırasıyla 15, 30, 45 ve 60 Akı.

| Eşik | Tür | Sol dal | Sağ dal |
|---:|---|---|---|
| 1 | Temel uzmanlık | Güç +%3 (hasar ya da sınıfın etkisi) | CAN +%5 |
| 2 | İmza yeteneği | Modüle özel yetenek (aşağıdaki tablo) | Modüle özel yetenek (aşağıdaki tablo) |
| 3 | İnce ayar | Çevrim −%4 (çevrimi olmayan Akım Dengeleyici'de etki +%4) | Enerji tüketimi −%12 |
| 4 | Ustalık | 2. eşikte seçilen imza yeteneğini güçlendirir | CAN +%8 |

### İmza yetenekleri

| Modül | Sınıf | Sol dal | Sağ dal |
|---|---|---|---|
| Lazer | Saldırı | **Yayılım Işını** — Her 30 saniyede bir 5 saniye boyunca her atış, hedefin yanındaki modüllere hasarın %30 kadarını da verir. | **Bitirici Işın** — CAN'ı %35 altındaki hedeflere %25 daha çok hasar verir. |
| Kalkan | Savunma | **Tam Blok** — Her 12 saniyede bir, gelen bir vuruşu tamamen engeller. | **Geri Tepen Kalkan** — Aldığı hasarın %15 kadarını saldıran modüle geri verir. |
| Batarya | Sistem | **Güç Dalgası** — Her 20 saniyede bir 5 saniye boyunca etkisi %40 artar. | **Akım Dönüştürücü** — Her 25 saniyede bir +1 Akım kazandırır. |
| Soğutucu | Destek | **Derin Dondurma** — Her 18 saniyede bir 5 saniye boyunca etkisi %80 artar. | **Isı Geri Kazanımı** — Her 20 saniyede bir +1 Akım kazandırır. |
| EMP | Sabotaj | **Şok Darbesi** — Sabotajı hedefe ayrıca 12 hasar verir. | **Uzun Dalga** — Her 24 saniyede bir 8 saniye boyunca etkisi %40 artar. |
| Güçlendirici | Destek | **Rezonans Dalgası** — Her 20 saniyede bir 6 saniye boyunca etkisi %50 artar. | **Son Yük** — Yok olduğunda +2 Akım kazandırır. |
| Onarım Modülü | Destek | **Acil Onarım** — Her 20 saniyede bir 5 saniye boyunca etkisi %60 artar. | **Saha Kurulumu** — Yerleştiği anda devredeki diğer modülleri 20 CAN onarır. |
| Zırh | Savunma | **Son Katman** — CAN'ı %40 altına düşünce aldığı hasar %30 azalır. | **Parçalanan Zırh** — Yok olduğunda devredeki diğer modülleri 25 CAN onarır. |
| Darbe Topu | Saldırı | **Üçüncü Darbe** — Her 3. atış %60 daha çok hasar verir. | **Zırh Kıran** — Hedefin savunma azaltımının %30 kadarını yok sayar. |
| Füze Fırlatıcı | Saldırı | **Çekirdek Avcısı** — Çekirdeğe %30 daha çok hasar verir. | **Seri Fırlatma** — Bir modülü yok ettiğinde beklemeden yeniden ateş eder. |
| Hedefleme Bilgisayarı | Destek | **Kilitlenme Modu** — Her 20 saniyede bir 6 saniye boyunca etkisi %50 artar. | **Sağlam Kurulum** — Yerleştikten sonraki 10 saniye boyunca %50 daha az hasar alır. |
| Bariyer | Savunma | **Taze Bariyer** — Yerleştikten sonraki 8 saniye boyunca %40 daha az hasar alır. | **Elektrikli Bariyer** — Aldığı hasarın %20 kadarını saldıran modüle geri verir. |
| Ark Topu | Saldırı | **Fırtına Arkı** — Her 20 saniyede bir 4 saniye boyunca her atış, hedefin yanındaki modüllere hasarın %35 kadarını da verir. | **Süper İletken** — Her 4. atış enerji harcamaz ve modülü ısıtmaz. |
| Kapasitör | Sistem | **Acil Boşalım** — Yok olduğunda +3 Akım kazandırır. | **Hızlı Dolum** — Her 18 saniyede bir 5 saniye boyunca etkisi %50 artar. |
| Dron Üssü | Saldırı | **Avcı Sürü** — CAN'ı %40 altındaki hedeflere %30 daha çok hasar verir. | **Otonom Dronlar** — Her 5. atış enerji harcamaz ve modülü ısıtmaz. |
| Sinyal Bozucu | Sabotaj | **Parazit Yükü** — Sabotajı hedefe ayrıca 10 hasar verir. | **Sinyal Hırsızı** — Her 22 saniyede bir +1 Akım kazandırır. |
| Ray Topu | Saldırı | **İlk Kurşun** — Yerleştikten sonraki ilk atışı ve her yok edişten sonraki ilk atışı %50 daha çok hasar verir. | **Çekirdek Delici** — Çekirdeğe %35 daha çok hasar verir. |
| Akım Dengeleyici | Sistem | **Akım Geri Kazanımı** — Her 20 saniyede bir +1 Akım kazandırır. | **Dengeli Tepe** — Her 20 saniyede bir 6 saniye boyunca etkisi %50 artar. |
| Yansıtıcı | Savunma | **Odaklı Yansıma** — Aldığı hasarın %25 kadarını saldıran modüle geri verir. | **Ayna Anı** — Her 10 saniyede bir, gelen bir vuruşu tamamen engeller. |
| Nano Sağlıkçı | Destek | **Nano Bulut** — Yerleştiği anda devredeki diğer modülleri 15 CAN onarır. | **Yoğun Bakım** — Her 20 saniyede bir 5 saniye boyunca etkisi %60 artar. |
| Virüs | Sabotaj | **Mutasyon** — Her 20 saniyede bir 6 saniye boyunca etkisi %50 artar. | **Zararlı Yük** — Sabotajı hedefe ayrıca 14 hasar verir. |
| Aşırı Hızlandırıcı | Destek | **Tavan Devri** — Her 16 saniyede bir 4 saniye boyunca etkisi %60 artar. | **Enerji Boşalımı** — Yok olduğunda +2 Akım kazandırır. |
| Plazma Havanı | Saldırı | **Plazma Yağmuru** — Her 25 saniyede bir 6 saniye boyunca her atış, hedefin yanındaki modüllere hasarın %30 kadarını da verir. | **Yoğun Plazma** — Her 3. atış %50 daha çok hasar verir. |
| Muhafız Kubbesi | Savunma | **Son Kubbe** — Yok olduğunda devredeki diğer modülleri 30 CAN onarır. | **Sıkışan Kubbe** — CAN'ı %50 altına düşünce aldığı hasar %25 azalır. |
| Kuantum Tekrarlayıcı | Saldırı | **Kuantum İnfaz** — CAN'ı %30 altındaki hedeflere %35 daha çok hasar verir. | **Kuantum Sıçrama** — Bir modülü yok ettiğinde beklemeden yeniden ateş eder. |
| Krono Rölesi | Destek | **Zaman Kârı** — Her 18 saniyede bir +1 Akım kazandırır. | **Derin Zaman** — Her 20 saniyede bir 5 saniye boyunca etkisi %50 artar. |
| Faz Zırhı | Savunma | **Faz Girişi** — Yerleştikten sonraki 10 saniye boyunca %50 daha az hasar alır. | **Ek Faz** — Her 9 saniyede bir, gelen bir vuruşu tamamen engeller. |
| Sürü Fabrikatörü | Saldırı | **Kendini Üreten Sürü** — Her 3. atış enerji harcamaz ve modülü ısıtmaz. | **Delici Sürü** — Hedefin savunma azaltımının %25 kadarını yok sayar. |
| Hassasiyet Matrisi | Destek | **Keskin Odak** — Her 20 saniyede bir 6 saniye boyunca etkisi %60 artar. | **Korunan Matris** — CAN'ı %50 altına düşünce aldığı hasar %30 azalır. |
| İyon Mızrağı | Saldırı | **İyon Açılışı** — Yerleştikten sonraki ilk atışı ve her yok edişten sonraki ilk atışı %60 daha çok hasar verir. | **Aşırı Yüklü Mızrak** — Her 4. atış %80 daha çok hasar verir. |
| Prizma Kalkanı | Savunma | **Prizma Kırılması** — Aldığı hasarın %18 kadarını saldıran modüle geri verir. | **Yoğun Prizma** — CAN'ı %40 altına düşünce aldığı hasar %35 azalır. |
| Kesici | Sabotaj | **Kesik Akım** — Sabotajı hedefe ayrıca 16 hasar verir. | **Geniş Kesinti** — Her 24 saniyede bir 8 saniye boyunca etkisi %40 artar. |
| Anka Onarım | Destek | **Son Kıvılcım** — Yok olduğunda devredeki diğer modülleri 30 CAN onarır. | **Anka Girişi** — Yerleştiği anda devredeki diğer modülleri 25 CAN onarır. |
| Kuantum Topu | Saldırı | **Tekil Vuruş** — Çekirdeğe %40 daha çok hasar verir. | **Kuantum Şok Dalgası** — Her 30 saniyede bir 5 saniye boyunca her atış, hedefin yanındaki modüllere hasarın %40 kadarını da verir. |
| Omega Güçlendirici | Destek | **Omega Tepe Noktası** — Her 24 saniyede bir 6 saniye boyunca etkisi %60 artar. | **Omega Akımı** — Her 20 saniyede bir +1 Akım kazandırır. |
| Tekillik Projektörü | Sabotaj | **Çöküş** — Sabotajı hedefe ayrıca 20 hasar verir. | **Olay Ufku** — Her 26 saniyede bir 8 saniye boyunca etkisi %45 artar. |

Ustalık imza yeteneğinin ana değerini bir buçuk katına çıkarır: oran ve artışlar ×1,5; dönemsel blok ve Akım kazancı 1,5 kat sık; onarım ve şok miktarı ×1,5; "her N. atış" bir atış erken; yok olunca verilen Akım +1; yeniden ateş eden yetenekte o atış %30 daha çok hasar verir.

## Çekirdek yetenekleri

Çekirdek üç eşikte (seviye 5, 9 ve 13; bedel 25, 50 ve 75 Akı) iki daldan birini seçer. Her çekirdeğin altı yeteneği birbirinden farklı bir kuraldır.

### Rezonans Çekirdeği

| Seviye | Sol dal | Sağ dal |
|---:|---|---|
| 5 | **Kararlı Frekans** — Çekirdek CAN değeri %70 ve üstündeyken enerji üretimi %10 artar. | **Hazır Rezonans** — Savaşa %25 güç dolumuyla başlar. |
| 9 | **Derin Rezonans** — Yok olan her dost modül güç dolumuna %12 ekler. | **İkinci Darbe** — Güç kullanıldıktan sonra dolum sıfırdan değil %20 dolumdan başlar. |
| 13 | **Koruyucu Yankı** — Çekirdek CAN değeri ilk kez %40 altına düştüğünde 6 saniyeliğine 60 kalkan kazanır (maçta bir kez). | **Akım Rezonansı** — Güç kullanıldığında +2 Akım kazandırır. |

### Muhafız Çekirdeği

| Seviye | Sol dal | Sağ dal |
|---:|---|---|
| 5 | **Dikenli Kabuk** — Çekirdeğe vuran her saldırı, saldıran modüle 4 hasar verir. | **Nöbet Hazırlığı** — Savaşa %20 güç dolumuyla başlar. |
| 9 | **Bariyer Tohumu** — Çekirdek CAN değeri ilk kez %50 altına düştüğünde 6 saniyeliğine 70 kalkan kazanır (maçta bir kez). | **Kalkan Matrisi** — Yok olan her dost modül güç dolumuna %15 ekler. |
| 13 | **Son Direniş** — Uzatmada Çekirdek %20 daha az hasar alır. | **Kesintisiz Nöbet** — Güç kullanıldıktan sonra dolum sıfırdan değil %25 dolumdan başlar. |

### Aşırı Yük Çekirdeği

| Seviye | Sol dal | Sağ dal |
|---:|---|---|
| 5 | **Sıcak Başlangıç** — Savaşa %30 güç dolumuyla başlar. | **Yüksek Devir** — Çekirdek CAN değeri %70 ve üstündeyken enerji üretimi %10 artar. |
| 9 | **Enerji Sıçraması** — Yok edilen her rakip modül güç dolumuna %12 ekler. | **Akım Patlaması** — Güç kullanıldığında +2 Akım kazandırır. |
| 13 | **Kırmızı Hat** — Güç kullanıldıktan sonra dolum sıfırdan değil %25 dolumdan başlar. | **Kızgın Çekirdek** — Çekirdeğe vuran her saldırı, saldıran modüle 5 hasar verir. |

### Kesinti Çekirdeği

| Seviye | Sol dal | Sağ dal |
|---:|---|---|
| 5 | **Statik Alan** — Yok olan her dost modül güç dolumuna %12 ekler. | **Pusu** — Savaşa %25 güç dolumuyla başlar. |
| 9 | **Sinyal Kırılması** — Güç kullanıldıktan sonra dolum sıfırdan değil %20 dolumdan başlar. | **Zincirleme Arıza** — Yok edilen her rakip modül güç dolumuna %10 ekler. |
| 13 | **Karartma** — Uzatmada Çekirdek %20 daha az hasar alır. | **Çalınan Akım** — Güç kullanıldığında +2 Akım kazandırır. |

### Kapasitör Çekirdeği

| Seviye | Sol dal | Sağ dal |
|---:|---|---|
| 5 | **Yedek Hücre** — Çekirdek CAN değeri %70 ve üstündeyken enerji üretimi %12 artar. | **Deşarj Kazancı** — Güç kullanıldığında +2 Akım kazandırır. |
| 9 | **Hızlı Dolum** — Savaşa %25 güç dolumuyla başlar. | **Statik Kalkan** — Çekirdek CAN değeri ilk kez %40 altına düştüğünde 6 saniyeliğine 60 kalkan kazanır (maçta bir kez). |
| 13 | **Taşma** — Güç kullanıldıktan sonra dolum sıfırdan değil %25 dolumdan başlar. | **Geri Besleme** — Yok olan her dost modül güç dolumuna %15 ekler. |

### Anka Çekirdeği

| Seviye | Sol dal | Sağ dal |
|---:|---|---|
| 5 | **Kor** — Çekirdek CAN değeri ilk kez %40 altına düştüğünde 6 saniyeliğine 60 kalkan kazanır (maçta bir kez). | **Küllerin Gücü** — Yok olan her dost modül güç dolumuna %12 ekler. |
| 9 | **Yeniden Doğuş** — Güç kullanıldıktan sonra dolum sıfırdan değil %20 dolumdan başlar. | **Sıcak Yuva** — Çekirdek CAN değeri %70 ve üstündeyken enerji üretimi %10 artar. |
| 13 | **Güneş Kanadı** — Uzatmada Çekirdek %20 daha az hasar alır. | **Erken Kıvılcım** — Savaşa %25 güç dolumuyla başlar. |

### Kuantum Çekirdeği

| Seviye | Sol dal | Sağ dal |
|---:|---|---|
| 5 | **Faz Tohumu** — Yok edilen her rakip modül güç dolumuna %10 ekler. | **Hazır Faz** — Savaşa %20 güç dolumuyla başlar. |
| 9 | **Olasılık Bükümü** — Güç kullanıldığında +2 Akım kazandırır. | **Kuantum Tepkisi** — Çekirdeğe vuran her saldırı, saldıran modüle 4 hasar verir. |
| 13 | **Tekillik** — Güç kullanıldıktan sonra dolum sıfırdan değil %25 dolumdan başlar. | **Faz Kalkanı** — Çekirdek CAN değeri ilk kez %40 altına düştüğünde 6 saniyeliğine 70 kalkan kazanır (maçta bir kez). |
