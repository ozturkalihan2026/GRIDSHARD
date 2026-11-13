# S1 — sezon ve etkinlik stok/kaynak denetimi

Üreten: `python tools/prepare_first_season.py --audit-write`. Doğrulama: `python tools/prepare_first_season.py --audit-check`.

**2.4.0 ilk sezon stoğu yeterli.** Bu çevrimdışı tahsis denetimidir; sezon açmaz, kozmetik vermez ve Android/yayın kabulünün yerine geçmez.

30.11.2026 03:00–28.12.2026 03:00 TR; takım dönemi ayrı kapıyla 30.11.2026 03:00 TR başlar. Sezon ve takım dönemi aynı 28 günü kapsar; ayrılmış üç takım ödülü korunur.

| Kaynak | Dönem | Tür | Ayrılmış içerik |
| --- | --- | --- | --- |
| season_leaderboard | gridshard_2026_11_30 | Tekil kozmetik seti | solar_frame, solar_banner |
| season_road | gridshard_2026_11_30 | Tekil kozmetik seti | aurora_frame, aurora_banner |
| team_tournament | 2026-11-30 | Tekil kozmetik seti | aurora_sigil, aurora_team_frame, aurora_team_name |
| weekly_tournament | 2026-W49 | Sabit kaynak | 1–3. sıra: kredi, akı ve mevcut modül parçası |
| weekly_tournament | 2026-W50 | Sabit kaynak | 1–3. sıra: kredi, akı ve mevcut modül parçası |
| weekly_tournament | 2026-W51 | Sabit kaynak | 1–3. sıra: kredi, akı ve mevcut modül parçası |
| weekly_tournament | 2026-W52 | Tekil kozmetik seti | abyss_frame, abyss_banner |

İlk sezon için 6 oyuncu + 3 takım kozmetiği; 7 ayrı kaynak/dönem tahsisi, aynı öğeyi farklı dönemlere yeniden ayırma yok. Üç kaynak haftası açıkça tanımlıdır; eksik kozmetiğin yerine sessizce kaynak konmaz.

Kaynak haftalarının toplamı: 7140 kredi, 525 akı, 234 sıradan modül parçası. Bunlar önceki ekonomi bütçesindeki tahsislerdir; ek ödül değildir.

| Stok profili | Gereken kozmetik | Takvime ayrılmış | Serbest onaylı stok | Üretilip incelenecek |
| --- | ---: | ---: | ---: | ---: |
| İlk sezon (kaynak haftaları dahil) | 9 | 9 | 6 | 0 |
| Eski tam kozmetik / iki çevrim | 30 | 0 | 15 | 18 |
| S1 sonrası iki çevrim / tam kozmetik | 30 | 0 | 6 | 24 |

Serbest stok yalnız kendi havuzunda ve aynı kozmetik alanında sayılır; fazla takım çerçevesi oyuncu çerçevesi açığını kapatmaz. Mağaza ve günlük deney adaptörleri planlı/kapalıdır; onların stoğu sezon stoğu gibi kullanılamaz. Gelecek çevrim raporu bir yayın izni değildir; gelecek sürümün onaylı kaynak/kozmetik profili ve yeni içerikleri hazırlanırken yeniden çalıştırılır.

Tüm ödül sıraları botlara giderse mevcut paket hash ile dondurulup planın sonuna bir kez eklenir; yeni sanat stoğu veya onaylı gelecek dönem tahsisi olarak sayılmaz. Botlara teslim edilmez.

Eksik kaynak/dönem, değiştirilmiş sabit ödül, yanlış takım takvimi, yinelenen tasarım veya yetersiz stok kontrolü başarısız yapar. Kaynak dosyalarının satır sonları normalize edilmiş SHA256 özetleri eşlik eden JSON raporundadır. Canlı profil taslak ve Android kabulü kapalı kalır.
