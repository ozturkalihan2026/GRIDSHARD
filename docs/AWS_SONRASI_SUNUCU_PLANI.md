# AWS sonrası sunucu planı — 28 Ekim 2026 hatırlama kaydı

Kaynak: ChatGPT'deki **Sunucu Mimarisi Planı** sohbeti,
`6ab40e46-f3b8-83eb-896a-32c758ca4e7e`.
Cloudflare açıklamasının bulunduğu mesaj:
`b8387f54-eb01-41a5-a6de-1a37c828f874`.

Önceki planın sırası:

1. Cloudflare kalıcı DNS, HTTPS/TLS, WebSocket proxy ve güvenlik ön katmanıdır.
2. AWS kredili döneminde oyun sunucusu AWS'de çalışır.
3. AWS kredisi bittiğinde maliyet gerekçesiyle seçilen hedef **OVHcloud VPS-1**'dir.
4. İhtiyaç arttığında OVH VPS-2, daha sonra çoklu savaş sunucusu değerlendirilir.

Sohbette açık ifadeler: “Sonra AWS ücretsiz kredimiz bitiyor”,
“Yeni OVH VPS-1'i hazırlıyoruz” ve Cloudflare'ın sabit tutulması.
Oracle Always Free, ilk test ortamı için daha önce düşünülen seçenektir;
AWS sonrası ücretli hedefle karıştırılmamalıdır.

Güncel oyun adresi `play.gridshardgame.com` korunur. Taşımada yeni sunucu,
mevcut PostgreSQL verileri, gerekli sırlar ve servisler hazırlanıp doğrulandıktan
sonra Cloudflare origin yönlendirmesi değiştirilir. Üretim hesaplarını yeniden
sıfırlama kararı yoktur; bu taşıma kaydı bir sıfırlama yetkisi değildir.

Bu kayıt geçmişte seçilen sağlayıcıyı belgeler. Güncel OVH fiyatı, paket
kaynakları veya satın alma kararı olarak yorumlanmaz; taşıma başlatılmadı.
