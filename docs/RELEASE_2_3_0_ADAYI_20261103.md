# GRIDSHARD 2.3.0 — kilitli koleksiyon yayın adayı

Kaynak dalı: `codex/release-2-3-0`. Güncel Android sürüm kodu **14**.
Kullanıcı geri düğmelerini ortak yalnız-ok tasarımıyla tamamlayıp sunucu
geçişi ve AAB teslimini açıkça istedi. Kod13 adayı tarihsel teslim olarak
korunur; yeni dağıtım kod14'tür. Son durum yeni yayın kanıtından okunur.

## Tamamlanan kapsam

- Kutup Işığı, Güneş Ocağı, Derin Akım; her temada iki oyuncu ve üç takım öğesi.
- Oyuncu/takım görünümünde üç temayı renkli gösteren ayrı önizleme penceresi.
  Önizleme kuşanma isteği göndermez, seçili görünümü veya sahipliği değiştirmez.
- “Henüz açılmadı” açıklaması; Türkçe/İngilizce adlar ve erişilebilir tema seçimi.
- Mevcut fiziksel yüzey/ışık ailesine uygun kabartma çerçeveler; ortak sanat
  yönü [ayrı belgeye](SANAT_YONU_VE_GORSEL_YAYIN_KAPISI.md) ve bütün yayınlara bağlandı.
- 2.3.0 sürüm etiketleri, yeni güncelleme mesajı ve Android code13.
- 11 gezinme geri düğmesi aynı altın SVG ok, 44×44 hedef ve bağlama uygun
  erişilebilir ada sahiptir; görünen GERİ/BACK yazısı kaldırıldı.
- 2.2.1 istemci geçiş köprüsü: `/health.server_release_version` gerçek sürüm,
  eski `release_version=2.2.1` ve `version=2.1.0-beta.72` uyumluluk alanlarıdır.
  Yeni istemci yalnız incelenmiş 2.2.1 köprüsünü kabul eder; protokol yine 2.

Yeni ödül tahsisi/yayını **sıfırdır**. Sezon/turnuva başlangıçları, cüzdan,
sandık fiyat/olasılıkları, satın alma/reklam ayarları ve yeni modlar açılmadı.

## Yerel doğrulama

| Kontrol | Sonuç |
| --- | --- |
| Sunucu regresyonu | 1.930 geçti, 44 dış servis testi yerelde atlandı |
| İstemci | 765 geçti |
| Üretim build sözleşmeleri | 10 geçti |
| Operatör araçları | 32 geçti |
| İçe aktarma | 459 dosya, sıfır sorun |
| Chrome telefon 320×568 / 393×852 | 6 geçti; tema/EN, önizleme sonrası sahiplik, takım ve sürüm mesajları |
| Değiştirilmemiş 2.2.1 kaynak istemcisi | Yeni health köprüsünü kabul etti; yanlış protokolü reddetti |
| Yeni istemci + eski gerçek API | İzole ortamda 2.3.0 arayüzü, değişmemiş 2.2.1 API'siyle gerçek bootstrap/ready/önizleme; sıfır tarayıcı hatası |
| İmzalı Android derleme | APK ve AAB üretildi; aynı upload sertifikası, 538 gömülü web dosyası doğrulandı |

İlk aday kanıtları `artifacts/release-230-20261103/`, güncel kod14 kanıtları
`artifacts/release-230-v14-20261103/`; CI ve teslimin son durumu
aynı dizindeki `FINAL_STATUS.json` kaydından okunur. Eksik PostgreSQL/Redis
yerel testleri yerine CI'ın gerçek servis/imaj işinin sonucu ayrıca gerekir.

## Teslim ve kalan yayın adımları

Güncel dosyalar `deliverables/GRIDSHARD_2.3.0_14/` altında; kod13 ve önceki 2.2.1 teslimi korunur.
İmzalı AAB üretildi diye bütün yayın kapıları geçmiş sayılmaz.

- [ ] Kod14 kaynak commit'i için bütün CI işleri başarılı. Kod13'ün önceki CI sonucu yeni kaynak yerine kullanılmaz.
- [ ] Cihaz üzerinde görsel/hesap/ödeme/ödül regresyonu ve sanat kabulü kaydedildi.
- [ ] Play iç/kapalı test güncellemesi doğrulandı; yükleme ürün sahibi tarafından yönetilir.
- [ ] Güncel üretim ortamı, yedek/restore ve istemci uyumu doğrulanarak sunucu geçişi yapıldı.
- [ ] Kontrollü üretim yayını ve gözlem tamamlandı.

Bu turun aday derlemesi üretim sunucusunu, Play Console'u veya telefondaki
uygulamayı değiştirmez. Kaynakta hazır olan bir sonraki minor altyapısı,
2.4.0 etkinlik/ödül açılışı yapılmış gibi oyuncuya sunulmaz.
