GRIDSHARD

GRIDSHARD, oyuncuların savaş devam ederken kendi devrelerini kurduğu, modüllerini değiştirdiği ve rakibin stratejisine anlık karşılık verdiği gerçek zamanlı PvP devre kurma ve strateji oyunudur.

Temel Oyun Yapısı

Oyuncular savaş sırasında:

Çekirdek ve Jeneratör etrafında kendi devrelerini oluşturur.

Modülleri savaş devam ederken ekleyebilir, çıkarabilir, taşıyabilir ve değiştirebilir.

Enerji akışını ve Devre Kredisi ekonomisini yönetir.

Yaklaşık 24 modüllük global havuzdan 18 modüllük Savaş Havuzu oluşturur.

Aynı anda en fazla 10 aktif modül kullanabilir.

Özel savaş alanı hücrelerinden ve geçici güçlendiricilerden yararlanabilir.

Rakibin devresine göre savaş sırasında stratejisini değiştirebilir.

GRIDSHARD'de savaş hiçbir zaman durmaz. Oyuncunun yaptığı bütün müdahaleler gerçek zamanlı savaş devam ederken gerçekleşir.

Dağıtık Eşleştirme

`REDIS_URL` tanımlandığında eşleştirme kuyruğu Redis üzerinde çalışır. Oyuncu ekleme, en uygun rakibi seçme, kuyruktan iki oyuncuyu birlikte çıkarma, AI devralma, iptal ve süre aşımı temizliği atomik işlemlerdir. Birden fazla uygulama sunucusu aynı kuyruğu güvenle paylaşabilir; geliştirme ortamında Redis yoksa bellek içi eşleştirme korunur.

Her uygulama örneği için isteğe bağlı `GRIDSHARD_INSTANCE_ID`, tarayıcının maçın sahibi olan sunucuya bağlanabilmesi için de `GRIDSHARD_PUBLIC_WS_BASE_URL` verilebilir. Birden fazla savaş sunucusunun doğrudan adreslendiği üretim kurulumunda WebSocket taban adresi her örnek için benzersiz ve tarayıcıdan erişilebilir olmalıdır (örnek: `wss://pvp-2.example.com`). Tek sunucu veya oturum yönlendirmeli yük dengeleyici kullanımında bu değer boş bırakılabilir.

Sunucu test bağımlılıkları `server/requirements-test.txt` ile kurulur. Redis eşleştirme testleri iki ayrı sunucu örneğini, eşzamanlı insan/AI yarışını, sahiplik denetimini ve TTL temizliğini aynı paylaşılan Redis üzerinde doğrular.

Proje Hedefi

GRIDSHARD'ın amacı; kolay anlaşılabilen ancak enerji yönetimi, modül kombinasyonları, konumlandırma, ekonomi ve anlık karşı hamleler sayesinde ustalaşması zaman alan rekabetçi bir PvP deneyimi oluşturmaktır.
