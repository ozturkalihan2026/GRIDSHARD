# GRIDSHARD 2.1 — 120 AI Oyuncu Havuzu

Her arenada 10 farklı arketip bulunur. Gerçek çalışma verisi `server/data/arena_bot_profiles_v1.json` dosyasındadır.

| Arena | Bot | Ad | Arketip | Kupa | Çekirdek | Deste |
|---:|---|---|---|---:|---|---|
| 1 | bot_a01_01 | MertNova | Dengeli | 70 | Rezonans Çekirdeği | Darbe Topu, Kalkan, Onarım Modülü, EMP, Batarya, Lazer |
| 1 | bot_a01_02 | ElifNova | Hızlı Baskı | 87 | Rezonans Çekirdeği | Lazer, Onarım Modülü, Batarya, Darbe Topu, EMP, Soğutucu |
| 1 | bot_a01_03 | BoraNova | Ağır Hasar | 104 | Rezonans Çekirdeği | Darbe Topu, Lazer, Güçlendirici, EMP, Zırh, Onarım Modülü |
| 1 | bot_a01_04 | NisaNova | Savunma | 121 | Rezonans Çekirdeği | Kalkan, Güçlendirici, Zırh, Darbe Topu, Batarya, Onarım Modülü |
| 1 | bot_a01_05 | OzanNova | Sürdürülebilirlik | 138 | Rezonans Çekirdeği | Güçlendirici, Kalkan, Batarya, Lazer, Soğutucu, Onarım Modülü |
| 1 | bot_a01_06 | DerinNova | Kontrol | 155 | Rezonans Çekirdeği | EMP, Lazer, Onarım Modülü, Kalkan, Darbe Topu, Soğutucu |
| 1 | bot_a01_07 | EgeNova | Destek Zinciri | 172 | Rezonans Çekirdeği | Soğutucu, Onarım Modülü, Darbe Topu, Kalkan, Batarya, Güçlendirici |
| 1 | bot_a01_08 | LinaNova | Akım Ekonomisi | 189 | Rezonans Çekirdeği | Batarya, Darbe Topu, Soğutucu, Kalkan, Lazer, Güçlendirici |
| 1 | bot_a01_09 | ArdaNova | Alan Hasarı | 206 | Rezonans Çekirdeği | Darbe Topu, Lazer, EMP, Onarım Modülü, Zırh, Güçlendirici |
| 1 | bot_a01_10 | DuruNova | Karşı Meta | 223 | Rezonans Çekirdeği | EMP, Zırh, Lazer, Soğutucu, Batarya, Kalkan |
| 2 | bot_a02_01 | EmirNova | Dengeli | 370 | Rezonans Çekirdeği | Füze Fırlatıcı, Zırh, Onarım Modülü, EMP, Batarya, Darbe Topu |
| 2 | bot_a02_02 | AdaNova | Hızlı Baskı | 387 | Rezonans Çekirdeği | Lazer, Onarım Modülü, Batarya, Darbe Topu, EMP, Füze Fırlatıcı |
| 2 | bot_a02_03 | CanNova | Ağır Hasar | 404 | Rezonans Çekirdeği | Darbe Topu, Füze Fırlatıcı, Güçlendirici, EMP, Kalkan, Lazer |
| 2 | bot_a02_04 | MinaNova | Savunma | 421 | Rezonans Çekirdeği | Zırh, Güçlendirici, Kalkan, Füze Fırlatıcı, Batarya, Hedefleme Bilgisayarı |
| 2 | bot_a02_05 | KaanNova | Sürdürülebilirlik | 438 | Rezonans Çekirdeği | Güçlendirici, Zırh, Batarya, Lazer, Soğutucu, Hedefleme Bilgisayarı |
| 2 | bot_a02_06 | İlayNova | Kontrol | 455 | Rezonans Çekirdeği | EMP, Lazer, Güçlendirici, Zırh, Darbe Topu, Onarım Modülü |
| 2 | bot_a02_07 | DenizNova | Destek Zinciri | 472 | Rezonans Çekirdeği | Onarım Modülü, Soğutucu, Darbe Topu, Zırh, Batarya, Hedefleme Bilgisayarı |
| 2 | bot_a02_08 | SelinNova | Akım Ekonomisi | 489 | Rezonans Çekirdeği | Batarya, Darbe Topu, Hedefleme Bilgisayarı, Zırh, Füze Fırlatıcı, Soğutucu |
| 2 | bot_a02_09 | BaranNova | Alan Hasarı | 506 | Rezonans Çekirdeği | Darbe Topu, Füze Fırlatıcı, EMP, Soğutucu, Kalkan, Lazer |
| 2 | bot_a02_10 | AsyaNova | Karşı Meta | 523 | Rezonans Çekirdeği | EMP, Kalkan, Darbe Topu, Güçlendirici, Batarya, Zırh |
| 3 | bot_a03_01 | KeremNova | Dengeli | 670 | Muhafız Çekirdeği | Ark Topu, Zırh, Soğutucu, EMP, Kapasitör, Füze Fırlatıcı |
| 3 | bot_a03_02 | EceNova | Hızlı Baskı | 687 | Rezonans Çekirdeği | Lazer, Soğutucu, Batarya, Füze Fırlatıcı, EMP, Ark Topu |
| 3 | bot_a03_03 | TunaNova | Ağır Hasar | 704 | Muhafız Çekirdeği | Darbe Topu, Lazer, Hedefleme Bilgisayarı, EMP, Kalkan, Füze Fırlatıcı |
| 3 | bot_a03_04 | LaraNova | Savunma | 721 | Rezonans Çekirdeği | Kalkan, Hedefleme Bilgisayarı, Zırh, Darbe Topu, Batarya, Bariyer |
| 3 | bot_a03_05 | YiğitNova | Sürdürülebilirlik | 738 | Muhafız Çekirdeği | Hedefleme Bilgisayarı, Bariyer, Kapasitör, Füze Fırlatıcı, Güçlendirici, Onarım Modülü |
| 3 | bot_a03_06 | NehirNova | Kontrol | 755 | Rezonans Çekirdeği | EMP, Füze Fırlatıcı, Hedefleme Bilgisayarı, Kalkan, Lazer, Soğutucu |
| 3 | bot_a03_07 | UmutNova | Destek Zinciri | 772 | Muhafız Çekirdeği | Soğutucu, Güçlendirici, Ark Topu, Kalkan, Kapasitör, Onarım Modülü |
| 3 | bot_a03_08 | MayaNova | Akım Ekonomisi | 789 | Rezonans Çekirdeği | Batarya, Ark Topu, Onarım Modülü, Kapasitör, Bariyer, Darbe Topu |
| 3 | bot_a03_09 | AtlasNova | Alan Hasarı | 806 | Muhafız Çekirdeği | Ark Topu, Lazer, EMP, Güçlendirici, Kalkan, Darbe Topu |
| 3 | bot_a03_10 | ZeynepNova | Karşı Meta | 823 | Rezonans Çekirdeği | EMP, Zırh, Füze Fırlatıcı, Hedefleme Bilgisayarı, Batarya, Kalkan |
| 4 | bot_a04_01 | BerkNova | Dengeli | 970 | Rezonans Çekirdeği | Dron Üssü, Bariyer, Güçlendirici, Sinyal Bozucu, Batarya, Darbe Topu |
| 4 | bot_a04_02 | SudeNova | Hızlı Baskı | 987 | Muhafız Çekirdeği | Lazer, Güçlendirici, Kapasitör, Darbe Topu, Sinyal Bozucu, Ark Topu |
| 4 | bot_a04_03 | OnurNova | Ağır Hasar | 1004 | Rezonans Çekirdeği | Darbe Topu, Dron Üssü, Onarım Modülü, Sinyal Bozucu, Zırh, Ark Topu |
| 4 | bot_a04_04 | İremNova | Savunma | 1021 | Muhafız Çekirdeği | Zırh, Onarım Modülü, Bariyer, Lazer, Kapasitör, Kalkan |
| 4 | bot_a04_05 | DorukNova | Sürdürülebilirlik | 1038 | Rezonans Çekirdeği | Onarım Modülü, Kalkan, Batarya, Darbe Topu, Soğutucu, Hedefleme Bilgisayarı |
| 4 | bot_a04_06 | AlinNova | Kontrol | 1055 | Muhafız Çekirdeği | Sinyal Bozucu, EMP, Darbe Topu, Onarım Modülü, Zırh, Lazer |
| 4 | bot_a04_07 | MertcanNova | Destek Zinciri | 1072 | Rezonans Çekirdeği | Güçlendirici, Hedefleme Bilgisayarı, Füze Fırlatıcı, Zırh, Batarya, Soğutucu |
| 4 | bot_a04_08 | CerenNova | Akım Ekonomisi | 1089 | Muhafız Çekirdeği | Kapasitör, Füze Fırlatıcı, Soğutucu, Batarya, Kalkan, Darbe Topu |
| 4 | bot_a04_09 | RüzgarNova | Alan Hasarı | 1106 | Rezonans Çekirdeği | Füze Fırlatıcı, Darbe Topu, EMP, Hedefleme Bilgisayarı, Zırh, Dron Üssü |
| 4 | bot_a04_10 | MelisNova | Karşı Meta | 1123 | Muhafız Çekirdeği | Sinyal Bozucu, Bariyer, Lazer, Onarım Modülü, Kapasitör, EMP |
| 5 | bot_a05_01 | MertVolt | Dengeli | 1270 | Aşırı Yük Çekirdeği | Ray Topu, Bariyer, Hedefleme Bilgisayarı, EMP, Batarya, Lazer |
| 5 | bot_a05_02 | ElifVolt | Hızlı Baskı | 1287 | Rezonans Çekirdeği | Lazer, Hedefleme Bilgisayarı, Akım Dengeleyici, Ray Topu, EMP, Dron Üssü |
| 5 | bot_a05_03 | BoraVolt | Ağır Hasar | 1304 | Muhafız Çekirdeği | Darbe Topu, Dron Üssü, Soğutucu, EMP, Yansıtıcı, Lazer |
| 5 | bot_a05_04 | NisaVolt | Savunma | 1321 | Aşırı Yük Çekirdeği | Kalkan, Soğutucu, Bariyer, Ray Topu, Batarya, Yansıtıcı |
| 5 | bot_a05_05 | OzanVolt | Sürdürülebilirlik | 1338 | Rezonans Çekirdeği | Soğutucu, Bariyer, Akım Dengeleyici, Lazer, Güçlendirici, Onarım Modülü |
| 5 | bot_a05_06 | DerinVolt | Kontrol | 1355 | Muhafız Çekirdeği | EMP, Sinyal Bozucu, Lazer, Soğutucu, Bariyer, Ark Topu |
| 5 | bot_a05_07 | EgeVolt | Destek Zinciri | 1372 | Aşırı Yük Çekirdeği | Hedefleme Bilgisayarı, Onarım Modülü, Darbe Topu, Bariyer, Batarya, Soğutucu |
| 5 | bot_a05_08 | LinaVolt | Akım Ekonomisi | 1389 | Rezonans Çekirdeği | Batarya, Darbe Topu, Güçlendirici, Akım Dengeleyici, Kalkan, Kapasitör |
| 5 | bot_a05_09 | ArdaVolt | Alan Hasarı | 1406 | Muhafız Çekirdeği | Darbe Topu, Ray Topu, Sinyal Bozucu, Onarım Modülü, Zırh, Ark Topu |
| 5 | bot_a05_10 | DuruVolt | Karşı Meta | 1423 | Aşırı Yük Çekirdeği | EMP, Yansıtıcı, Dron Üssü, Soğutucu, Batarya, Sinyal Bozucu |
| 6 | bot_a06_01 | EmirVolt | Dengeli | 1570 | Rezonans Çekirdeği | Lazer, Yansıtıcı, Hedefleme Bilgisayarı, EMP, Kapasitör, Füze Fırlatıcı |
| 6 | bot_a06_02 | AdaVolt | Hızlı Baskı | 1587 | Muhafız Çekirdeği | Darbe Topu, Hedefleme Bilgisayarı, Batarya, Lazer, Virüs, Füze Fırlatıcı |
| 6 | bot_a06_03 | CanVolt | Ağır Hasar | 1604 | Aşırı Yük Çekirdeği | Füze Fırlatıcı, Ray Topu, Onarım Modülü, Virüs, Kalkan, Darbe Topu |
| 6 | bot_a06_04 | MinaVolt | Savunma | 1621 | Rezonans Çekirdeği | Zırh, Onarım Modülü, Yansıtıcı, Lazer, Kapasitör, Kalkan |
| 6 | bot_a06_05 | KaanVolt | Sürdürülebilirlik | 1638 | Muhafız Çekirdeği | Onarım Modülü, Yansıtıcı, Batarya, Darbe Topu, Hedefleme Bilgisayarı, Soğutucu |
| 6 | bot_a06_06 | İlayVolt | Kontrol | 1655 | Aşırı Yük Çekirdeği | Virüs, EMP, Darbe Topu, Aşırı Hızlandırıcı, Yansıtıcı, Sinyal Bozucu |
| 6 | bot_a06_07 | DenizVolt | Destek Zinciri | 1672 | Rezonans Çekirdeği | Güçlendirici, Soğutucu, Füze Fırlatıcı, Yansıtıcı, Kapasitör, Aşırı Hızlandırıcı |
| 6 | bot_a06_08 | SelinVolt | Akım Ekonomisi | 1689 | Muhafız Çekirdeği | Kapasitör, Füze Fırlatıcı, Onarım Modülü, Batarya, Zırh, Akım Dengeleyici |
| 6 | bot_a06_09 | BaranVolt | Alan Hasarı | 1706 | Aşırı Yük Çekirdeği | Füze Fırlatıcı, Lazer, Sinyal Bozucu, Güçlendirici, Bariyer, Ray Topu |
| 6 | bot_a06_10 | AsyaVolt | Karşı Meta | 1723 | Rezonans Çekirdeği | EMP, Kalkan, Ray Topu, Hedefleme Bilgisayarı, Kapasitör, Sinyal Bozucu |
| 7 | bot_a07_01 | KeremVolt | Dengeli | 1870 | Kesinti Çekirdeği | Lazer, Yansıtıcı, Hedefleme Bilgisayarı, Sinyal Bozucu, Akım Dengeleyici, Darbe Topu |
| 7 | bot_a07_02 | EceVolt | Hızlı Baskı | 1887 | Rezonans Çekirdeği | Darbe Topu, Hedefleme Bilgisayarı, Kapasitör, Plazma Havanı, EMP, Dron Üssü |
| 7 | bot_a07_03 | TunaVolt | Ağır Hasar | 1904 | Muhafız Çekirdeği | Füze Fırlatıcı, Ray Topu, Nano Sağlıkçı, EMP, Yansıtıcı, Plazma Havanı |
| 7 | bot_a07_04 | LaraVolt | Savunma | 1921 | Aşırı Yük Çekirdeği | Kalkan, Nano Sağlıkçı, Zırh, Plazma Havanı, Akım Dengeleyici, Bariyer |
| 7 | bot_a07_05 | YiğitVolt | Sürdürülebilirlik | 1938 | Kesinti Çekirdeği | Nano Sağlıkçı, Bariyer, Kapasitör, Lazer, Onarım Modülü, Soğutucu |
| 7 | bot_a07_06 | NehirVolt | Kontrol | 1955 | Rezonans Çekirdeği | EMP, Virüs, Lazer, Hedefleme Bilgisayarı, Zırh, Sinyal Bozucu |
| 7 | bot_a07_07 | UmutVolt | Destek Zinciri | 1972 | Muhafız Çekirdeği | Soğutucu, Nano Sağlıkçı, Darbe Topu, Zırh, Akım Dengeleyici, Hedefleme Bilgisayarı |
| 7 | bot_a07_08 | MayaVolt | Akım Ekonomisi | 1989 | Aşırı Yük Çekirdeği | Akım Dengeleyici, Darbe Topu, Aşırı Hızlandırıcı, Kapasitör, Yansıtıcı, Batarya |
| 7 | bot_a07_09 | AtlasVolt | Alan Hasarı | 2006 | Kesinti Çekirdeği | Darbe Topu, Ray Topu, Virüs, Onarım Modülü, Muhafız Kubbesi, Lazer |
| 7 | bot_a07_10 | ZeynepVolt | Karşı Meta | 2023 | Rezonans Çekirdeği | Sinyal Bozucu, Bariyer, Dron Üssü, Soğutucu, Akım Dengeleyici, Virüs |
| 8 | bot_a08_01 | BerkVolt | Dengeli | 2170 | Rezonans Çekirdeği | Lazer, Muhafız Kubbesi, Hedefleme Bilgisayarı, Virüs, Batarya, Kuantum Tekrarlayıcı |
| 8 | bot_a08_02 | SudeVolt | Hızlı Baskı | 2187 | Muhafız Çekirdeği | Darbe Topu, Hedefleme Bilgisayarı, Akım Dengeleyici, Plazma Havanı, Sinyal Bozucu, Ark Topu |
| 8 | bot_a08_03 | OnurVolt | Ağır Hasar | 2204 | Aşırı Yük Çekirdeği | Füze Fırlatıcı, Ray Topu, Nano Sağlıkçı, Sinyal Bozucu, Muhafız Kubbesi, Dron Üssü |
| 8 | bot_a08_04 | İremVolt | Savunma | 2221 | Kesinti Çekirdeği | Zırh, Nano Sağlıkçı, Bariyer, Plazma Havanı, Batarya, Yansıtıcı |
| 8 | bot_a08_05 | DorukVolt | Sürdürülebilirlik | 2238 | Rezonans Çekirdeği | Nano Sağlıkçı, Yansıtıcı, Akım Dengeleyici, Kuantum Tekrarlayıcı, Aşırı Hızlandırıcı, Güçlendirici |
| 8 | bot_a08_06 | AlinVolt | Kontrol | 2255 | Muhafız Çekirdeği | Sinyal Bozucu, EMP, Kuantum Tekrarlayıcı, Güçlendirici, Bariyer, Virüs |
| 8 | bot_a08_07 | MertcanVolt | Destek Zinciri | 2272 | Aşırı Yük Çekirdeği | Onarım Modülü, Aşırı Hızlandırıcı, Lazer, Bariyer, Batarya, Krono Rölesi |
| 8 | bot_a08_08 | CerenVolt | Akım Ekonomisi | 2289 | Kesinti Çekirdeği | Batarya, Lazer, Hedefleme Bilgisayarı, Kapasitör, Muhafız Kubbesi, Akım Dengeleyici |
| 8 | bot_a08_09 | RüzgarVolt | Alan Hasarı | 2306 | Rezonans Çekirdeği | Lazer, Dron Üssü, EMP, Nano Sağlıkçı, Kalkan, Ray Topu |
| 8 | bot_a08_10 | MelisVolt | Karşı Meta | 2323 | Muhafız Çekirdeği | Virüs, Yansıtıcı, Ark Topu, Krono Rölesi, Batarya, EMP |
| 9 | bot_a09_01 | MertArc | Dengeli | 2470 | Kapasitör Çekirdeği | Sürü Fabrikatörü, Muhafız Kubbesi, Aşırı Hızlandırıcı, EMP, Kapasitör, Ray Topu |
| 9 | bot_a09_02 | ElifArc | Hızlı Baskı | 2487 | Rezonans Çekirdeği | Lazer, Aşırı Hızlandırıcı, Batarya, Ray Topu, Virüs, Sürü Fabrikatörü |
| 9 | bot_a09_03 | BoraArc | Ağır Hasar | 2504 | Muhafız Çekirdeği | Darbe Topu, Dron Üssü, Krono Rölesi, Virüs, Yansıtıcı, Lazer |
| 9 | bot_a09_04 | NisaArc | Savunma | 2521 | Aşırı Yük Çekirdeği | Kalkan, Krono Rölesi, Faz Zırhı, Ray Topu, Kapasitör, Bariyer |
| 9 | bot_a09_05 | OzanArc | Sürdürülebilirlik | 2538 | Kesinti Çekirdeği | Krono Rölesi, Bariyer, Batarya, Plazma Havanı, Nano Sağlıkçı, Hedefleme Bilgisayarı |
| 9 | bot_a09_06 | DerinArc | Kontrol | 2555 | Kapasitör Çekirdeği | Virüs, Sinyal Bozucu, Plazma Havanı, Hedefleme Bilgisayarı, Kalkan, EMP |
| 9 | bot_a09_07 | EgeArc | Destek Zinciri | 2572 | Rezonans Çekirdeği | Soğutucu, Nano Sağlıkçı, Kuantum Tekrarlayıcı, Kalkan, Kapasitör, Onarım Modülü |
| 9 | bot_a09_08 | LinaArc | Akım Ekonomisi | 2589 | Muhafız Çekirdeği | Kapasitör, Kuantum Tekrarlayıcı, Aşırı Hızlandırıcı, Akım Dengeleyici, Bariyer, Batarya |
| 9 | bot_a09_09 | ArdaArc | Alan Hasarı | 2606 | Aşırı Yük Çekirdeği | Kuantum Tekrarlayıcı, Lazer, Sinyal Bozucu, Krono Rölesi, Yansıtıcı, İyon Mızrağı |
| 9 | bot_a09_10 | DuruArc | Karşı Meta | 2623 | Kesinti Çekirdeği | EMP, Zırh, Lazer, Onarım Modülü, Kapasitör, Virüs |
| 10 | bot_a10_01 | EmirArc | Dengeli | 2770 | Rezonans Çekirdeği | Lazer, Faz Zırhı, Aşırı Hızlandırıcı, Sinyal Bozucu, Akım Dengeleyici, Kuantum Tekrarlayıcı |
| 10 | bot_a10_02 | AdaArc | Hızlı Baskı | 2787 | Muhafız Çekirdeği | Darbe Topu, Aşırı Hızlandırıcı, Kapasitör, Plazma Havanı, Kesici, Lazer |
| 10 | bot_a10_03 | CanArc | Ağır Hasar | 2804 | Aşırı Yük Çekirdeği | Füze Fırlatıcı, Ray Topu, Krono Rölesi, Kesici, Muhafız Kubbesi, Darbe Topu |
| 10 | bot_a10_04 | MinaArc | Savunma | 2821 | Kesinti Çekirdeği | Zırh, Krono Rölesi, Kalkan, Plazma Havanı, Akım Dengeleyici, Muhafız Kubbesi |
| 10 | bot_a10_05 | KaanArc | Sürdürülebilirlik | 2838 | Kapasitör Çekirdeği | Krono Rölesi, Yansıtıcı, Kapasitör, Kuantum Tekrarlayıcı, Aşırı Hızlandırıcı, Soğutucu |
| 10 | bot_a10_06 | İlayArc | Kontrol | 2855 | Rezonans Çekirdeği | Kesici, Sinyal Bozucu, Kuantum Tekrarlayıcı, Güçlendirici, Zırh, EMP |
| 10 | bot_a10_07 | DenizArc | Destek Zinciri | 2872 | Muhafız Çekirdeği | Onarım Modülü, Aşırı Hızlandırıcı, İyon Mızrağı, Zırh, Akım Dengeleyici, Nano Sağlıkçı |
| 10 | bot_a10_08 | SelinArc | Akım Ekonomisi | 2889 | Aşırı Yük Çekirdeği | Akım Dengeleyici, İyon Mızrağı, Hedefleme Bilgisayarı, Batarya, Yansıtıcı, Kapasitör |
| 10 | bot_a10_09 | BaranArc | Alan Hasarı | 2906 | Kesinti Çekirdeği | İyon Mızrağı, Darbe Topu, EMP, Nano Sağlıkçı, Muhafız Kubbesi, Sürü Fabrikatörü |
| 10 | bot_a10_10 | AsyaArc | Karşı Meta | 2923 | Kapasitör Çekirdeği | Kesici, Bariyer, Darbe Topu, Krono Rölesi, Akım Dengeleyici, EMP |
| 11 | bot_a11_01 | KeremArc | Dengeli | 3070 | Anka Çekirdeği | Lazer, Faz Zırhı, Aşırı Hızlandırıcı, Virüs, Batarya, Kuantum Tekrarlayıcı |
| 11 | bot_a11_02 | EceArc | Hızlı Baskı | 3087 | Rezonans Çekirdeği | Darbe Topu, Aşırı Hızlandırıcı, Akım Dengeleyici, Plazma Havanı, EMP, Kuantum Topu |
| 11 | bot_a11_03 | TunaArc | Ağır Hasar | 3104 | Muhafız Çekirdeği | Füze Fırlatıcı, Ray Topu, Krono Rölesi, EMP, Yansıtıcı, Lazer |
| 11 | bot_a11_04 | LaraArc | Savunma | 3121 | Aşırı Yük Çekirdeği | Kalkan, Krono Rölesi, Faz Zırhı, Plazma Havanı, Batarya, Prizma Kalkanı |
| 11 | bot_a11_05 | YiğitArc | Sürdürülebilirlik | 3138 | Kesinti Çekirdeği | Krono Rölesi, Bariyer, Akım Dengeleyici, Kuantum Tekrarlayıcı, Hedefleme Bilgisayarı, Anka Onarım |
| 11 | bot_a11_06 | NehirArc | Kontrol | 3155 | Kapasitör Çekirdeği | EMP, Kesici, Kuantum Tekrarlayıcı, Soğutucu, Prizma Kalkanı, Virüs |
| 11 | bot_a11_07 | UmutArc | Destek Zinciri | 3172 | Anka Çekirdeği | Anka Onarım, Güçlendirici, İyon Mızrağı, Prizma Kalkanı, Batarya, Soğutucu |
| 11 | bot_a11_08 | MayaArc | Akım Ekonomisi | 3189 | Rezonans Çekirdeği | Batarya, İyon Mızrağı, Güçlendirici, Akım Dengeleyici, Zırh, Kapasitör |
| 11 | bot_a11_09 | AtlasArc | Alan Hasarı | 3206 | Muhafız Çekirdeği | İyon Mızrağı, Lazer, Sinyal Bozucu, Aşırı Hızlandırıcı, Bariyer, Kuantum Tekrarlayıcı |
| 11 | bot_a11_10 | ZeynepArc | Karşı Meta | 3223 | Aşırı Yük Çekirdeği | EMP, Kalkan, Lazer, Nano Sağlıkçı, Batarya, Virüs |
| 12 | bot_a12_01 | BerkArc | Dengeli | 3370 | Anka Çekirdeği | Darbe Topu, Prizma Kalkanı, Aşırı Hızlandırıcı, EMP, Kapasitör, İyon Mızrağı |
| 12 | bot_a12_02 | SudeArc | Hızlı Baskı | 3387 | Kuantum Çekirdeği | Füze Fırlatıcı, Aşırı Hızlandırıcı, Batarya, Kuantum Tekrarlayıcı, Virüs, Lazer |
| 12 | bot_a12_03 | OnurArc | Ağır Hasar | 3404 | Rezonans Çekirdeği | Ark Topu, Plazma Havanı, Krono Rölesi, Virüs, Muhafız Kubbesi, Darbe Topu |
| 12 | bot_a12_04 | İremArc | Savunma | 3421 | Muhafız Çekirdeği | Zırh, Krono Rölesi, Prizma Kalkanı, Kuantum Tekrarlayıcı, Kapasitör, Kalkan |
| 12 | bot_a12_05 | DorukArc | Sürdürülebilirlik | 3438 | Aşırı Yük Çekirdeği | Krono Rölesi, Yansıtıcı, Batarya, İyon Mızrağı, Güçlendirici, Hassasiyet Matrisi |
| 12 | bot_a12_06 | AlinArc | Kontrol | 3455 | Kesinti Çekirdeği | Virüs, Kesici, İyon Mızrağı, Onarım Modülü, Kalkan, Sinyal Bozucu |
| 12 | bot_a12_07 | MertcanArc | Destek Zinciri | 3472 | Kapasitör Çekirdeği | Anka Onarım, Soğutucu, Sürü Fabrikatörü, Kalkan, Kapasitör, Omega Güçlendirici |
| 12 | bot_a12_08 | CerenArc | Akım Ekonomisi | 3489 | Anka Çekirdeği | Kapasitör, Sürü Fabrikatörü, Soğutucu, Batarya, Bariyer, Akım Dengeleyici |
| 12 | bot_a12_09 | RüzgarArc | Alan Hasarı | 3506 | Kuantum Çekirdeği | Sürü Fabrikatörü, Darbe Topu, Virüs, Hedefleme Bilgisayarı, Yansıtıcı, İyon Mızrağı |
| 12 | bot_a12_10 | MelisArc | Karşı Meta | 3523 | Rezonans Çekirdeği | Sinyal Bozucu, Zırh, Darbe Topu, Aşırı Hızlandırıcı, Kapasitör, Kesici |
