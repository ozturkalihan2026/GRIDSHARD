# Oyuncu verisi ve ad yetkisi — Beta.71

## İlerleme

Kart parçaları, kart seviyeleri, kupa, para ve sezon ilerlemesi sunucudaki oyun işlemlerinden hesaplanır. Tarayıcı verisi veya indirilen JSON, ilerlemenin kaynağı değildir.

`GET /accounts/{player_id}/data-export`, yalnız oturum sahibine kişisel veri kopyası verir. Kopya `restorable:false` ve `personal_data_copy_not_game_save` amacı taşır. Ayrı bağlam anahtarıyla üretilen HMAC-SHA256 imzası içerik değişikliğini operatörün saptayabilmesini sağlar; imza bir ödül makbuzu veya geri yükleme yetkisi değildir. Anahtar değişirse eski imzalar da geçersiz olur.

Dışa aktarma sırasında kayıt yazılmaz. `/player-data/{player_id}/save`, `/load` ve doğrudan `DELETE /player-data/{player_id}` oyuncuya açık veri mutasyonları olarak kapalıdır (`410`). Sunucunun kalıcı kayıt yükleme/kaydetme servisleri yalnız iç oyun akışları tarafından kullanılır. Hesap silme, Ayarlar'daki açık onaylı hesap silme yolundan yapılır.

İlerleme işlemleri yalnız beklenen istek alanlarını kabul eder. Ek `rating`, `module_shards`, `module_upgrade_levels` veya benzeri alanlar yükseltme/ad/kozmetik isteklerine eklenerek sunucuya yazılamaz. Takım işlemleri de oturuma bağlı oyuncu kimliğini denetler; başka oyuncu adına kart parçası aktarımı gönderilemez. Üretim modunda kimlik denetimi kapatılamaz.

İndirilen dosyanın düzenlenmesine engel olmak mümkün değildir; değiştirilmiş dosya sunucuya oyun kaydı olarak kabul edilmez. Sunucu işletim sistemine veya veritabanına yönetici erişimi olan kişi farklı bir güvenlik sınırındadır: veri dizini yalnız servis hesabına yazılabilir olmalı, DB kimlik bilgileri/anahtarlar istemci paketine veya paylaşılmış indirme klasörüne konmamalıdır.

## Kullanıcı adı

- Ad 1–24 karakterdir. NFKC normalleştirme, harf büyüklüğü, Türkçe I varyantları ve fazla boşluk tek karşılaştırma anahtarına dönüşür; görünmez/kontrol karakterleri kabul edilmez.
- Kalıcı depoda çevrimdışı oyuncular da kontrol edilir. AI adları ayrılmıştır. JSON'da süreçler arası dosya kilidi, PostgreSQL'de transaction advisory lock, aynı adı iki hesabın eşzamanlı almasını engeller.
- Dolu ad `409`, geçersiz biçim `422` döner. Kalıcı kayıt başarısızsa bellekteki ad değiştirilmiş bırakılmaz.
- Eski yinelenen adlar otomatik değiştirilmez ve sıradan ilerleme kaydını bozmaz. Mevcut yerel veride `Kesici` adlı iki hesap vardır; hangi hesabın adının değişeceği ayrıca kararlaştırılmalıdır.

Bu paket için çalıştırmalı test yapılmadı; regresyon sözleşmeleri sonraki yetkilendirilmiş test koşusuna hazırlandı.
