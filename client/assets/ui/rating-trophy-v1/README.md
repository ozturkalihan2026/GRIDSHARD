# Kupa sayısı simgesi

Kaynak artık Git dışı yerel arşivdedir:
`artifacts/asset-archive-20261015/qa_reports/rating-trophy-pilot-20261015/gold-rating-trophy-v2.png`.
Export aracı bu yola otomatik döner; başka bilgisayara arşiv ayrıca taşınmalıdır.
Gerçek Imagegen promptları aynı QA klasöründeki `PROMPTS.md` dosyasında.

`tools/export-rating-trophy.js` yalnız teknik alpha-koruyan 128×128 kayıpsız
WebP türevi üretir: `rating-trophy.webp`, 19.604 bayt. Tasarımı değiştirmez.
Son web build `1763845a43c35b03`: WebP kaynakla byte-identical, PNG ustası
ve reddedilen lacivert sürüm runtime dışında.

Oyuncu/takım kupa sayıları, sosyal bilgi satırları, profil istatistiği,
takım arama/başvuru, üyeler, haftalık sıralama, maç sonu kupa kaynağı ve
son açık istekle Lider Panosu başlık/sekmesi bağlıdır. 1./2./3.'lük ödül
kupaları ve diğer takım/turnuva amblemleri korunur. Puan/ödül hesabı değişmedi.

450 istemci testi geçti, 2 JDK bağımlı test atlandı; 9 derleme testi geçti.
Tarayıcı doğrulaması tamamlanmadı: geçici fixture'ın elle açtığı sonuç paneli
görünürlükte takıldı; gerçek zafer akışı kanıtı yok. Kullanıcı yerel/görsel
denemeleri kendisi üstlendi. Yeni test başlatılmadı; bu tur eklenen geçici
E2E dosyası kaldırıldı, `client/tests/rating-trophy.test.js` birim testleri
korundu. Kullanıcının yerel sunucusu/sekmeleri üzerinde işlem yapılmaz.
Canlı dağıtım veya APK/AAB yapılmadı.
