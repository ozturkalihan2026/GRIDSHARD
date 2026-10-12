# GRIDSHARD 2.1 — 120 AI Oyuncu Havuzu

Her arenada 10 farklı arketip bulunur. Gerçek çalışma verisi `server/data/arena_bot_profiles_v1.json` dosyasındadır.

Beta.72 tur 12: yeni ısı ve enerji kurallarına göre 51 desteye Soğutucu ya da Batarya eklendi (denge simülasyonuyla; ayrıntı `CODEX_CHECKPOINT.md`). Tur 13: Kontrol ve Akım Ekonomisi botları Dengeli Kontrol / Dengeli Ekonomi davranışıyla oynar.

12 Ekim 2026 (Devre Yolu düzenlemesi): modüller ileri arenalara ve liglere dağıtıldığı için 106 deste yeniden eşlendi. Her bot yalnız kendi arenasında açık modülleri kullanır; Arena 1 botlarının hepsi aynı altı modülle oynar. Lig maçlarında Arena 12 botları, oyuncunun liginde açılmış efsanevi modüllerle güçlenir (`league_bot_battle_pool`, `server/app/arena_canon.py`).

| Arena | Bot | Ad | Arketip | Kupa | Çekirdek | Deste |
|---:|---|---|---|---:|---|---|
| 1 | bot_a01_01 | MertNova | Dengeli | 70 | Rezonans Çekirdeği | Güçlendirici, Kalkan, Soğutucu, EMP, Batarya, Lazer |
| 1 | bot_a01_02 | ElifNova | Hızlı Baskı | 87 | Rezonans Çekirdeği | Lazer, Güçlendirici, Batarya, Kalkan, EMP, Soğutucu |
| 1 | bot_a01_03 | BoraNova | Ağır Hasar | 104 | Rezonans Çekirdeği | Soğutucu, Lazer, Güçlendirici, EMP, Kalkan, Batarya |
| 1 | bot_a01_04 | NisaNova | Savunma | 121 | Rezonans Çekirdeği | Kalkan, Lazer, Güçlendirici, EMP, Batarya, Soğutucu |
| 1 | bot_a01_05 | OzanNova | Sürdürülebilirlik | 138 | Rezonans Çekirdeği | Güçlendirici, Kalkan, Batarya, Lazer, Soğutucu, EMP |
| 1 | bot_a01_06 | DerinNova | Kontrol | 155 | Rezonans Çekirdeği | EMP, Lazer, Güçlendirici, Kalkan, Batarya, Soğutucu |
| 1 | bot_a01_07 | EgeNova | Destek Zinciri | 172 | Rezonans Çekirdeği | Soğutucu, EMP, Lazer, Kalkan, Batarya, Güçlendirici |
| 1 | bot_a01_08 | LinaNova | Akım Ekonomisi | 189 | Rezonans Çekirdeği | Batarya, EMP, Soğutucu, Kalkan, Lazer, Güçlendirici |
| 1 | bot_a01_09 | ArdaNova | Alan Hasarı | 206 | Rezonans Çekirdeği | Soğutucu, Lazer, EMP, Kalkan, Batarya, Güçlendirici |
| 1 | bot_a01_10 | DuruNova | Karşı Meta | 223 | Rezonans Çekirdeği | EMP, Güçlendirici, Lazer, Soğutucu, Batarya, Kalkan |
| 2 | bot_a02_01 | EmirNova | Dengeli | 370 | Rezonans Çekirdeği | Lazer, Soğutucu, Onarım Modülü, EMP, Batarya, Zırh |
| 2 | bot_a02_02 | AdaNova | Hızlı Baskı | 387 | Rezonans Çekirdeği | Lazer, Soğutucu, Batarya, Zırh, EMP, Onarım Modülü |
| 2 | bot_a02_03 | CanNova | Ağır Hasar | 404 | Rezonans Çekirdeği | Zırh, Onarım Modülü, Soğutucu, EMP, Batarya, Lazer |
| 2 | bot_a02_04 | MinaNova | Savunma | 421 | Rezonans Çekirdeği | Zırh, Güçlendirici, Kalkan, Onarım Modülü, Batarya, Lazer |
| 2 | bot_a02_05 | KaanNova | Sürdürülebilirlik | 438 | Rezonans Çekirdeği | Güçlendirici, Zırh, Batarya, Lazer, Soğutucu, Onarım Modülü |
| 2 | bot_a02_06 | İlayNova | Kontrol | 455 | Rezonans Çekirdeği | EMP, Lazer, Güçlendirici, Zırh, Soğutucu, Onarım Modülü |
| 2 | bot_a02_07 | DenizNova | Destek Zinciri | 472 | Rezonans Çekirdeği | Onarım Modülü, Soğutucu, Lazer, Zırh, Batarya, Güçlendirici |
| 2 | bot_a02_08 | SelinNova | Akım Ekonomisi | 489 | Rezonans Çekirdeği | Batarya, Lazer, Onarım Modülü, Zırh, Güçlendirici, Soğutucu |
| 2 | bot_a02_09 | BaranNova | Alan Hasarı | 506 | Rezonans Çekirdeği | Zırh, Onarım Modülü, Batarya, Soğutucu, Kalkan, Lazer |
| 2 | bot_a02_10 | AsyaNova | Karşı Meta | 523 | Rezonans Çekirdeği | EMP, Kalkan, Lazer, Güçlendirici, Batarya, Zırh |
| 3 | bot_a03_01 | KeremNova | Dengeli | 670 | Muhafız Çekirdeği | Darbe Topu, Zırh, Soğutucu, EMP, Batarya, Füze Fırlatıcı |
| 3 | bot_a03_02 | EceNova | Hızlı Baskı | 687 | Rezonans Çekirdeği | Lazer, Soğutucu, Batarya, Füze Fırlatıcı, EMP, Darbe Topu |
| 3 | bot_a03_03 | TunaNova | Ağır Hasar | 704 | Muhafız Çekirdeği | Darbe Topu, Lazer, Soğutucu, EMP, Kalkan, Füze Fırlatıcı |
| 3 | bot_a03_04 | LaraNova | Savunma | 721 | Rezonans Çekirdeği | Kalkan, Onarım Modülü, Zırh, Darbe Topu, Batarya, Lazer |
| 3 | bot_a03_05 | YiğitNova | Sürdürülebilirlik | 738 | Muhafız Çekirdeği | Soğutucu, Zırh, Batarya, Füze Fırlatıcı, Güçlendirici, Onarım Modülü |
| 3 | bot_a03_06 | NehirNova | Kontrol | 755 | Rezonans Çekirdeği | EMP, Füze Fırlatıcı, Onarım Modülü, Batarya, Lazer, Soğutucu |
| 3 | bot_a03_07 | UmutNova | Destek Zinciri | 772 | Muhafız Çekirdeği | Soğutucu, Güçlendirici, Füze Fırlatıcı, Batarya, Darbe Topu, Onarım Modülü |
| 3 | bot_a03_08 | MayaNova | Akım Ekonomisi | 789 | Rezonans Çekirdeği | Batarya, Füze Fırlatıcı, Soğutucu, Zırh, Kalkan, Darbe Topu |
| 3 | bot_a03_09 | AtlasNova | Alan Hasarı | 806 | Muhafız Çekirdeği | Füze Fırlatıcı, Lazer, Batarya, Soğutucu, Kalkan, Darbe Topu |
| 3 | bot_a03_10 | ZeynepNova | Karşı Meta | 823 | Rezonans Çekirdeği | EMP, Zırh, Füze Fırlatıcı, Onarım Modülü, Batarya, Kalkan |
| 4 | bot_a04_01 | BerkNova | Dengeli | 970 | Rezonans Çekirdeği | Füze Fırlatıcı, Bariyer, Güçlendirici, EMP, Batarya, Darbe Topu |
| 4 | bot_a04_02 | SudeNova | Hızlı Baskı | 987 | Muhafız Çekirdeği | Lazer, Güçlendirici, Batarya, Darbe Topu, Soğutucu, Füze Fırlatıcı |
| 4 | bot_a04_03 | OnurNova | Ağır Hasar | 1004 | Rezonans Çekirdeği | Darbe Topu, Füze Fırlatıcı, Soğutucu, EMP, Zırh, Lazer |
| 4 | bot_a04_04 | İremNova | Savunma | 1021 | Muhafız Çekirdeği | Zırh, Onarım Modülü, Bariyer, Lazer, Füze Fırlatıcı, Kalkan |
| 4 | bot_a04_05 | DorukNova | Sürdürülebilirlik | 1038 | Rezonans Çekirdeği | Onarım Modülü, Kalkan, Batarya, Darbe Topu, Soğutucu, Hedefleme Bilgisayarı |
| 4 | bot_a04_06 | AlinNova | Kontrol | 1055 | Muhafız Çekirdeği | Bariyer, EMP, Darbe Topu, Onarım Modülü, Zırh, Lazer |
| 4 | bot_a04_07 | MertcanNova | Destek Zinciri | 1072 | Rezonans Çekirdeği | Güçlendirici, Hedefleme Bilgisayarı, Füze Fırlatıcı, Zırh, Batarya, Soğutucu |
| 4 | bot_a04_08 | CerenNova | Akım Ekonomisi | 1089 | Muhafız Çekirdeği | Bariyer, Füze Fırlatıcı, Soğutucu, Batarya, Kalkan, Darbe Topu |
| 4 | bot_a04_09 | RüzgarNova | Alan Hasarı | 1106 | Rezonans Çekirdeği | Füze Fırlatıcı, Darbe Topu, EMP, Soğutucu, Batarya, Lazer |
| 4 | bot_a04_10 | MelisNova | Karşı Meta | 1123 | Muhafız Çekirdeği | Hedefleme Bilgisayarı, Bariyer, Lazer, Onarım Modülü, Batarya, EMP |
| 5 | bot_a05_01 | MertVolt | Dengeli | 1270 | Aşırı Yük Çekirdeği | Ark Topu, Bariyer, Hedefleme Bilgisayarı, EMP, Batarya, Lazer |
| 5 | bot_a05_02 | ElifVolt | Hızlı Baskı | 1287 | Rezonans Çekirdeği | Lazer, Hedefleme Bilgisayarı, Kapasitör, Ark Topu, EMP, Füze Fırlatıcı |
| 5 | bot_a05_03 | BoraVolt | Ağır Hasar | 1304 | Muhafız Çekirdeği | Darbe Topu, Ark Topu, Soğutucu, EMP, Bariyer, Lazer |
| 5 | bot_a05_04 | NisaVolt | Savunma | 1321 | Aşırı Yük Çekirdeği | Kalkan, Soğutucu, Ark Topu, Füze Fırlatıcı, Batarya, Bariyer |
| 5 | bot_a05_05 | OzanVolt | Sürdürülebilirlik | 1338 | Rezonans Çekirdeği | Soğutucu, Bariyer, Kapasitör, Lazer, Güçlendirici, Onarım Modülü |
| 5 | bot_a05_06 | DerinVolt | Kontrol | 1355 | Muhafız Çekirdeği | EMP, Kapasitör, Lazer, Soğutucu, Bariyer, Ark Topu |
| 5 | bot_a05_07 | EgeVolt | Destek Zinciri | 1372 | Aşırı Yük Çekirdeği | Hedefleme Bilgisayarı, Onarım Modülü, Darbe Topu, Bariyer, Batarya, Soğutucu |
| 5 | bot_a05_08 | LinaVolt | Akım Ekonomisi | 1389 | Rezonans Çekirdeği | Batarya, Darbe Topu, Güçlendirici, Ark Topu, Kalkan, Kapasitör |
| 5 | bot_a05_09 | ArdaVolt | Alan Hasarı | 1406 | Muhafız Çekirdeği | Darbe Topu, Füze Fırlatıcı, EMP, Onarım Modülü, Soğutucu, Ark Topu |
| 5 | bot_a05_10 | DuruVolt | Karşı Meta | 1423 | Aşırı Yük Çekirdeği | EMP, Bariyer, Ark Topu, Soğutucu, Batarya, Kapasitör |
| 6 | bot_a06_01 | EmirVolt | Dengeli | 1570 | Rezonans Çekirdeği | Lazer, Bariyer, Hedefleme Bilgisayarı, EMP, Kapasitör, Füze Fırlatıcı |
| 6 | bot_a06_02 | AdaVolt | Hızlı Baskı | 1587 | Muhafız Çekirdeği | Darbe Topu, Soğutucu, Batarya, Lazer, Sinyal Bozucu, Füze Fırlatıcı |
| 6 | bot_a06_03 | CanVolt | Ağır Hasar | 1604 | Aşırı Yük Çekirdeği | Füze Fırlatıcı, Dron Üssü, Onarım Modülü, Soğutucu, Kalkan, Darbe Topu |
| 6 | bot_a06_04 | MinaVolt | Savunma | 1621 | Rezonans Çekirdeği | Zırh, Onarım Modülü, Bariyer, Lazer, Dron Üssü, Kalkan |
| 6 | bot_a06_05 | KaanVolt | Sürdürülebilirlik | 1638 | Muhafız Çekirdeği | Onarım Modülü, Bariyer, Batarya, Darbe Topu, Hedefleme Bilgisayarı, Soğutucu |
| 6 | bot_a06_06 | İlayVolt | Kontrol | 1655 | Aşırı Yük Çekirdeği | EMP, Soğutucu, Darbe Topu, Hedefleme Bilgisayarı, Bariyer, Sinyal Bozucu |
| 6 | bot_a06_07 | DenizVolt | Destek Zinciri | 1672 | Rezonans Çekirdeği | Güçlendirici, Soğutucu, Füze Fırlatıcı, Bariyer, Kapasitör, Hedefleme Bilgisayarı |
| 6 | bot_a06_08 | SelinVolt | Akım Ekonomisi | 1689 | Muhafız Çekirdeği | Kapasitör, Füze Fırlatıcı, Onarım Modülü, Batarya, Zırh, Sinyal Bozucu |
| 6 | bot_a06_09 | BaranVolt | Alan Hasarı | 1706 | Aşırı Yük Çekirdeği | Füze Fırlatıcı, Lazer, Soğutucu, Güçlendirici, Bariyer, Dron Üssü |
| 6 | bot_a06_10 | AsyaVolt | Karşı Meta | 1723 | Rezonans Çekirdeği | Batarya, Kalkan, Dron Üssü, Hedefleme Bilgisayarı, Kapasitör, Sinyal Bozucu |
| 7 | bot_a07_01 | KeremVolt | Dengeli | 1870 | Kesinti Çekirdeği | Lazer, Bariyer, Hedefleme Bilgisayarı, Sinyal Bozucu, Akım Dengeleyici, Darbe Topu |
| 7 | bot_a07_02 | EceVolt | Hızlı Baskı | 1887 | Rezonans Çekirdeği | Darbe Topu, Soğutucu, Kapasitör, Ray Topu, EMP, Dron Üssü |
| 7 | bot_a07_03 | TunaVolt | Ağır Hasar | 1904 | Muhafız Çekirdeği | Füze Fırlatıcı, Ray Topu, Hedefleme Bilgisayarı, EMP, Soğutucu, Dron Üssü |
| 7 | bot_a07_04 | LaraVolt | Savunma | 1921 | Aşırı Yük Çekirdeği | Kalkan, Hedefleme Bilgisayarı, Zırh, Dron Üssü, Akım Dengeleyici, Ray Topu |
| 7 | bot_a07_05 | YiğitVolt | Sürdürülebilirlik | 1938 | Kesinti Çekirdeği | Hedefleme Bilgisayarı, Batarya, Kapasitör, Lazer, Onarım Modülü, Soğutucu |
| 7 | bot_a07_06 | NehirVolt | Kontrol | 1955 | Rezonans Çekirdeği | EMP, Akım Dengeleyici, Lazer, Hedefleme Bilgisayarı, Zırh, Sinyal Bozucu |
| 7 | bot_a07_07 | UmutVolt | Destek Zinciri | 1972 | Muhafız Çekirdeği | Soğutucu, Onarım Modülü, Darbe Topu, Zırh, Akım Dengeleyici, Hedefleme Bilgisayarı |
| 7 | bot_a07_08 | MayaVolt | Akım Ekonomisi | 1989 | Aşırı Yük Çekirdeği | Akım Dengeleyici, Darbe Topu, Hedefleme Bilgisayarı, Soğutucu, Bariyer, Batarya |
| 7 | bot_a07_09 | AtlasVolt | Alan Hasarı | 2006 | Kesinti Çekirdeği | Darbe Topu, Ray Topu, Soğutucu, Onarım Modülü, Bariyer, Lazer |
| 7 | bot_a07_10 | ZeynepVolt | Karşı Meta | 2023 | Rezonans Çekirdeği | Sinyal Bozucu, Bariyer, Dron Üssü, Soğutucu, Akım Dengeleyici, EMP |
| 8 | bot_a08_01 | BerkVolt | Dengeli | 2170 | Rezonans Çekirdeği | Lazer, Yansıtıcı, Hedefleme Bilgisayarı, Sinyal Bozucu, Batarya, Ray Topu |
| 8 | bot_a08_02 | SudeVolt | Hızlı Baskı | 2187 | Muhafız Çekirdeği | Darbe Topu, Hedefleme Bilgisayarı, Akım Dengeleyici, Ray Topu, Soğutucu, Ark Topu |
| 8 | bot_a08_03 | OnurVolt | Ağır Hasar | 2204 | Aşırı Yük Çekirdeği | Füze Fırlatıcı, Ray Topu, Soğutucu, Sinyal Bozucu, Yansıtıcı, Dron Üssü |
| 8 | bot_a08_04 | İremVolt | Savunma | 2221 | Kesinti Çekirdeği | Zırh, Nano Sağlıkçı, Lazer, Ray Topu, Batarya, Yansıtıcı |
| 8 | bot_a08_05 | DorukVolt | Sürdürülebilirlik | 2238 | Rezonans Çekirdeği | Soğutucu, Yansıtıcı, Akım Dengeleyici, Ray Topu, Nano Sağlıkçı, Güçlendirici |
| 8 | bot_a08_06 | AlinVolt | Kontrol | 2255 | Muhafız Çekirdeği | Sinyal Bozucu, EMP, Ray Topu, Güçlendirici, Bariyer, Nano Sağlıkçı |
| 8 | bot_a08_07 | MertcanVolt | Destek Zinciri | 2272 | Aşırı Yük Çekirdeği | Onarım Modülü, Nano Sağlıkçı, Lazer, Soğutucu, Batarya, Hedefleme Bilgisayarı |
| 8 | bot_a08_08 | CerenVolt | Akım Ekonomisi | 2289 | Kesinti Çekirdeği | Batarya, Lazer, Hedefleme Bilgisayarı, Kapasitör, Yansıtıcı, Akım Dengeleyici |
| 8 | bot_a08_09 | RüzgarVolt | Alan Hasarı | 2306 | Rezonans Çekirdeği | Lazer, Dron Üssü, EMP, Nano Sağlıkçı, Kalkan, Ray Topu |
| 8 | bot_a08_10 | MelisVolt | Karşı Meta | 2323 | Muhafız Çekirdeği | Sinyal Bozucu, Yansıtıcı, Ark Topu, Nano Sağlıkçı, Batarya, EMP |
| 9 | bot_a09_01 | MertArc | Dengeli | 2470 | Kapasitör Çekirdeği | Dron Üssü, Batarya, Aşırı Hızlandırıcı, EMP, Soğutucu, Ray Topu |
| 9 | bot_a09_02 | ElifArc | Hızlı Baskı | 2487 | Rezonans Çekirdeği | Lazer, Aşırı Hızlandırıcı, Batarya, Ray Topu, Soğutucu, Dron Üssü |
| 9 | bot_a09_03 | BoraArc | Ağır Hasar | 2504 | Muhafız Çekirdeği | Darbe Topu, Dron Üssü, Aşırı Hızlandırıcı, Virüs, Yansıtıcı, Lazer |
| 9 | bot_a09_04 | NisaArc | Savunma | 2521 | Aşırı Yük Çekirdeği | Kalkan, Lazer, Batarya, Ray Topu, Kapasitör, Bariyer |
| 9 | bot_a09_05 | OzanArc | Sürdürülebilirlik | 2538 | Kesinti Çekirdeği | Aşırı Hızlandırıcı, Bariyer, Batarya, Ray Topu, Nano Sağlıkçı, Hedefleme Bilgisayarı |
| 9 | bot_a09_06 | DerinArc | Kontrol | 2555 | Kapasitör Çekirdeği | Virüs, Sinyal Bozucu, Ray Topu, Hedefleme Bilgisayarı, Kalkan, EMP |
| 9 | bot_a09_07 | EgeArc | Destek Zinciri | 2572 | Rezonans Çekirdeği | Soğutucu, Nano Sağlıkçı, Ray Topu, Kalkan, Kapasitör, Onarım Modülü |
| 9 | bot_a09_08 | LinaArc | Akım Ekonomisi | 2589 | Muhafız Çekirdeği | Kapasitör, Ray Topu, Aşırı Hızlandırıcı, Akım Dengeleyici, Soğutucu, Batarya |
| 9 | bot_a09_09 | ArdaArc | Alan Hasarı | 2606 | Aşırı Yük Çekirdeği | Ray Topu, Lazer, Sinyal Bozucu, Soğutucu, Yansıtıcı, Dron Üssü |
| 9 | bot_a09_10 | DuruArc | Karşı Meta | 2623 | Kesinti Çekirdeği | EMP, Zırh, Lazer, Onarım Modülü, Kapasitör, Virüs |
| 10 | bot_a10_01 | EmirArc | Dengeli | 2770 | Rezonans Çekirdeği | Lazer, Muhafız Kubbesi, Aşırı Hızlandırıcı, Soğutucu, Akım Dengeleyici, Plazma Havanı |
| 10 | bot_a10_02 | AdaArc | Hızlı Baskı | 2787 | Muhafız Çekirdeği | Darbe Topu, Aşırı Hızlandırıcı, Soğutucu, Plazma Havanı, Virüs, Lazer |
| 10 | bot_a10_03 | CanArc | Ağır Hasar | 2804 | Aşırı Yük Çekirdeği | Füze Fırlatıcı, Ray Topu, Aşırı Hızlandırıcı, Virüs, Soğutucu, Darbe Topu |
| 10 | bot_a10_04 | MinaArc | Savunma | 2821 | Kesinti Çekirdeği | Zırh, Lazer, Kalkan, Plazma Havanı, Akım Dengeleyici, Muhafız Kubbesi |
| 10 | bot_a10_05 | KaanArc | Sürdürülebilirlik | 2838 | Kapasitör Çekirdeği | Nano Sağlıkçı, Yansıtıcı, Batarya, Plazma Havanı, Aşırı Hızlandırıcı, Soğutucu |
| 10 | bot_a10_06 | İlayArc | Kontrol | 2855 | Rezonans Çekirdeği | Virüs, Sinyal Bozucu, Plazma Havanı, Güçlendirici, Zırh, EMP |
| 10 | bot_a10_07 | DenizArc | Destek Zinciri | 2872 | Muhafız Çekirdeği | Soğutucu, Aşırı Hızlandırıcı, Plazma Havanı, Zırh, Akım Dengeleyici, Nano Sağlıkçı |
| 10 | bot_a10_08 | SelinArc | Akım Ekonomisi | 2889 | Aşırı Yük Çekirdeği | Akım Dengeleyici, Plazma Havanı, Hedefleme Bilgisayarı, Batarya, Yansıtıcı, Kapasitör |
| 10 | bot_a10_09 | BaranArc | Alan Hasarı | 2906 | Kesinti Çekirdeği | Plazma Havanı, Darbe Topu, Soğutucu, Batarya, Muhafız Kubbesi, Ray Topu |
| 10 | bot_a10_10 | AsyaArc | Karşı Meta | 2923 | Kapasitör Çekirdeği | Virüs, Bariyer, Darbe Topu, Aşırı Hızlandırıcı, Akım Dengeleyici, EMP |
| 11 | bot_a11_01 | KeremArc | Dengeli | 3070 | Anka Çekirdeği | Lazer, Soğutucu, Aşırı Hızlandırıcı, Virüs, Batarya, Kuantum Tekrarlayıcı |
| 11 | bot_a11_02 | EceArc | Hızlı Baskı | 3087 | Rezonans Çekirdeği | Darbe Topu, Aşırı Hızlandırıcı, Akım Dengeleyici, Plazma Havanı, Soğutucu, Kuantum Tekrarlayıcı |
| 11 | bot_a11_03 | TunaArc | Ağır Hasar | 3104 | Muhafız Çekirdeği | Füze Fırlatıcı, Ray Topu, Krono Rölesi, EMP, Soğutucu, Lazer |
| 11 | bot_a11_04 | LaraArc | Savunma | 3121 | Aşırı Yük Çekirdeği | Kalkan, Krono Rölesi, Lazer, Plazma Havanı, Batarya, Muhafız Kubbesi |
| 11 | bot_a11_05 | YiğitArc | Sürdürülebilirlik | 3138 | Kesinti Çekirdeği | Krono Rölesi, Bariyer, Akım Dengeleyici, Kuantum Tekrarlayıcı, Hedefleme Bilgisayarı, Aşırı Hızlandırıcı |
| 11 | bot_a11_06 | NehirArc | Kontrol | 3155 | Kapasitör Çekirdeği | EMP, Sinyal Bozucu, Kuantum Tekrarlayıcı, Soğutucu, Muhafız Kubbesi, Virüs |
| 11 | bot_a11_07 | UmutArc | Destek Zinciri | 3172 | Anka Çekirdeği | Krono Rölesi, Güçlendirici, Kuantum Tekrarlayıcı, Muhafız Kubbesi, Batarya, Soğutucu |
| 11 | bot_a11_08 | MayaArc | Akım Ekonomisi | 3189 | Rezonans Çekirdeği | Batarya, Kuantum Tekrarlayıcı, Güçlendirici, Akım Dengeleyici, Zırh, Kapasitör |
| 11 | bot_a11_09 | AtlasArc | Alan Hasarı | 3206 | Muhafız Çekirdeği | Plazma Havanı, Lazer, Soğutucu, Aşırı Hızlandırıcı, Bariyer, Kuantum Tekrarlayıcı |
| 11 | bot_a11_10 | ZeynepArc | Karşı Meta | 3223 | Aşırı Yük Çekirdeği | EMP, Kalkan, Lazer, Nano Sağlıkçı, Batarya, Virüs |
| 12 | bot_a12_01 | BerkArc | Dengeli | 3370 | Anka Çekirdeği | Darbe Topu, Faz Zırhı, Aşırı Hızlandırıcı, Soğutucu, Kapasitör, Sürü Fabrikatörü |
| 12 | bot_a12_02 | SudeArc | Hızlı Baskı | 3387 | Kuantum Çekirdeği | Füze Fırlatıcı, Aşırı Hızlandırıcı, Batarya, Kuantum Tekrarlayıcı, Soğutucu, Lazer |
| 12 | bot_a12_03 | OnurArc | Ağır Hasar | 3404 | Rezonans Çekirdeği | Ark Topu, Plazma Havanı, Krono Rölesi, Soğutucu, Muhafız Kubbesi, Darbe Topu |
| 12 | bot_a12_04 | İremArc | Savunma | 3421 | Muhafız Çekirdeği | Lazer, Krono Rölesi, Faz Zırhı, Kuantum Tekrarlayıcı, Kapasitör, Kalkan |
| 12 | bot_a12_05 | DorukArc | Sürdürülebilirlik | 3438 | Aşırı Yük Çekirdeği | Krono Rölesi, Yansıtıcı, Batarya, Sürü Fabrikatörü, Güçlendirici, Hassasiyet Matrisi |
| 12 | bot_a12_06 | AlinArc | Kontrol | 3455 | Kesinti Çekirdeği | Virüs, EMP, Sürü Fabrikatörü, Onarım Modülü, Kalkan, Sinyal Bozucu |
| 12 | bot_a12_07 | MertcanArc | Destek Zinciri | 3472 | Kapasitör Çekirdeği | Hassasiyet Matrisi, Soğutucu, Sürü Fabrikatörü, Batarya, Kapasitör, Krono Rölesi |
| 12 | bot_a12_08 | CerenArc | Akım Ekonomisi | 3489 | Anka Çekirdeği | Kapasitör, Sürü Fabrikatörü, Soğutucu, Batarya, Bariyer, Akım Dengeleyici |
| 12 | bot_a12_09 | RüzgarArc | Alan Hasarı | 3506 | Kuantum Çekirdeği | Sürü Fabrikatörü, Darbe Topu, Batarya, Hedefleme Bilgisayarı, Soğutucu, Kuantum Tekrarlayıcı |
| 12 | bot_a12_10 | MelisArc | Karşı Meta | 3523 | Rezonans Çekirdeği | Sinyal Bozucu, Zırh, Darbe Topu, Aşırı Hızlandırıcı, Soğutucu, Virüs |
