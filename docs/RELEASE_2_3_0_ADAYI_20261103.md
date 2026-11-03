# GRIDSHARD 2.3.0 — kilitli koleksiyon yayını ve teslimi

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
- 2.3.0 sürüm etiketleri, yeni güncelleme mesajı ve Android code14.
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
| Chrome telefon 320×568 / 393×852 | 8 geçti; ortak geri düğmeleri/işlevleri, tema/EN, önizleme sonrası sahiplik, takım ve sürüm mesajları |
| Değiştirilmemiş 2.2.1 kaynak istemcisi | Yeni health köprüsünü kabul etti; yanlış protokolü reddetti |
| Yeni istemci + eski gerçek API | İzole ortamda 2.3.0 arayüzü, değişmemiş 2.2.1 API'siyle gerçek bootstrap/ready/önizleme; sıfır tarayıcı hatası |
| İmzalı Android derleme | APK ve AAB üretildi; aynı upload sertifikası, 538 gömülü web dosyası doğrulandı |

İlk aday kanıtları `artifacts/release-230-20261103/`, güncel kod14 kanıtları
`artifacts/release-230-v14-20261103/`; CI ve teslimin son durumu
aynı dizindeki `FINAL_STATUS.json` kaydından okunur. Eksik PostgreSQL/Redis
yerel testleri yerine CI'ın gerçek servis/imaj işinin sonucu ayrıca gerekir.

## Teslim ve kalan yayın adımları

Güncel teslim `deliverables/GRIDSHARD_2.3.0_14/`; AAB/APK code14 ve 2.3.0.
İmza/R8 ve bağımsız kaynak derlemesiyle 538 gömülü dosya doğrulandı.
Kod13 ve önceki 2.2.1 dosyaları korunur.

- [x] Kod14 kaynak cef0939 için CI41678519606 bütün işleri başarılı.
- [x] Güncel ortam ve 14 uygulanmış migration checksum'u geçiş öncesi eşleşti.
- [x] 52 profil/kozmetik sahipliği ve bütün tablo içerikleriyle izole restore geçti.
- [x] Yalnız API 2.3.0'a geçirildi; ortam/secret/kalıcı volümler korundu.
- [x] HTTPS normal konuk auth/bootstrap, kilitli önizleme, sürüm notları ve ok düğmeleri geçti.
- [x] Sunucu sağlıklı, restart0; drill kaynakları yok; yedekler korunuyor.
- [ ] Fiziksel cihazda Play üzerinden güncelleme/hesap/ödeme/ödül regresyonu doğrulandı.
- [x] Kullanıcı sunucu geçişini ve AAB'nin kullanıcılara sunulduğunu teyit etti; Play Console API denetimi yapılmadı.

Kaynak: `cef09390d01480d0152dabd22bbc60c53a14f9a2`.
[CI](https://github.com/ozturkalihan2026/GRIDSHARD/actions/runs/41678519606).
Kanıtlar `artifacts/release-230-v14-20261103/server/`, `public-smoke.json`
ve `FINAL_STATUS.json`. Play/cihaz adımları sunucu geçişinden ayrı izlenir.
Yeni konuk smoke hesabı dışında mevcut hesaplarda işlem yapılmadı.
2.4.0 ödül/takvim açılışı bu yayınla yapılmış sayılmaz.

3 Kasım kullanıcı [yayın teyidi](planning/release-230-user-confirmation-20261103.md) ile RELEASE-00 kapandı; fiziksel cihaz sonucu ayrıca bildirilmedi. Aktif geliştirme 2.4.0'dır.
