# Görsel geri bildirim ve mesaj silme — 13–14 Ekim 2026

Bu çalışma önceki profesyonel rötuş üzerindeki kullanıcı geri bildirimlerini uygular. Başka araçların mevcut marka/savaş değişiklikleri korunmuştur. Modül bilgi penceresine kapatma düğmesi eklenmemiştir.

## Arayüz düzeltmeleri

- Modül/çekirdek bilgi başlığında ad ve enderlik rozeti için ayrı alan bırakılır. Amblem aşağıda kalır; ad 14 px ve en fazla iki satırdır.
- Bronz/Gümüş sandıkların etkin fiyat etiketindeki koyu yazı açık renge çevrilir. Fiyat ve tek düğme önceliği değişmez.
- Aylık %40 indirim duyurusu mağaza başlığından Ödül Listesi penceresine taşınır. Etkin indirim gününün dinamik metni korunur.
- Bilgi/Seç/Çıkar küçük paneli aynı levha yüzeyi, ince kenar, daha sakin gölge ve tutarlı düğmeler kullanır.
- Mesaj Kutusu sekmeleri soldan sağa Savaş, Satın Alım, Ödül, Sistem şeklindedir. Oyun bildirimleri yalnız Sistem içinde görünür.
- Her mesaj kartında kayıtlı oluşturulma/ödül zamanı `<time>` olarak gösterilir. Yerel saat ve TR/EN biçimi kullanılır. Tarihi saklanmamış eski kayıtlarda bugünün tarihi uydurulmaz; “Tarih kaydı yok” yazılır. Yeni arkadaş savaşı davetlerinde oluşturulma zamanı saklanır.

## Silme davranışı

Kullanıcı kararı: **Toplanmamış sandıkları koru; bilgilendirme mesajlarını sil.**

- Satın Alım ve Sistem mesajlarında tek tek SİL vardır.
- SEKMEDEKİLERİ SİL, o sekmedeki tüm bilgilendirme mesajlarını temizler; yalnız görünür ilk 20 mesajla sınırlı değildir. Oyun içi onay penceresinde VAZGEÇ veya MESAJLARI SİL seçilir.
- GERİ AL, mevcut oturumdaki son başarılı silme işlemini geri çevirir. Daha önce ayrı silinmiş mesajları yanlışlıkla geri getirmez.
- Silinen mesajların görünürlük kimlikleri oyuncu kaydında kalıcı saklanır. Mesaj/ödül/satın alma makbuzları ve cüzdan silinmez; ödeme, iade ve tekrar teslim korumaları değişmez.
- Toplanmamış sandıklar ve savaş davetleri silinmez. Ödül/Savaş sekmelerinde toplu silme kapalıdır; sandıkların TOPLA işlemi korunur.
- Sunucu yalnız imzalı hesabın kendi satın alım/sistem mesajlarını kabul eder. Yanlış kategori/kimlik reddedilir. Eklenen meta alanı eski kayıtlarda boş varsayılır; SQL şema değişikliği gerekmez.
- Eski okundu/yenileme cevaplarının silinen kartları geri getirmesine karşı istemcide işlem sürümü ve oyuncu kontrolü vardır.

## Doğrulama

- Genel istemci koşusu: **419/419 geçti**. Önceki koşudaki beta50 metin beklentisi hatası bu son çalışma ağacında artık oluşmuyor; başka savaş değişiklikleri bu çalışmanın kapsamına alınmadı.
- İlgili sunucu dosyaları: **38/38 geçti**. Tek/toplu silme, geri alma, eski silmelerin korunması, kalıcı yükleme, kategori/oyuncu yetkisi, ödül teslimi, oyuncu verisi ve yeniden başlatma testleri.
- Paketleme regresyonları: **9/9 geçti**. Geçersiz girdi testi bilerek derleyici hata çıktısı üretir; test başarılıdır.
- JS sözdizimi ve `git diff --check` geçti. CSS chrome109/safari15 hedeflerinde bellekte derlendi: **0 uyarı**.
- Yalıtılmış, yalnız loopback üzerinden çalışan yerel test sunucusunda: tek sil/geri al, toplu sil/onay/vazgeç/geri al, son işlem kapsamı, Sistem sekmesi, ödül korunması ve tarih gösterimi arayüzden doğrulandı. Gerçek hesap, ödeme veya canlı veri kullanılmadı.
- 393×852 ve 320×568 yerleşimlerinde yatay taşma yok. 320×568 uzun modül adında enderlik rozeti ile amblem arasında 18 px boşluk ölçüldü.
- Görseller ve ölçümler: `artifacts/ui-feedback-20261013/`. `screens/inbox-delete-undo-393x852.jpg` son silme ekranını gösterir.

## Yayın durumu

Commit/push, sunucu/site yayını, APK/AAB üretimi veya Play Console işlemi yapılmadı. Silme özelliği yeni istemci ve sunucu kodunu birlikte gerektirir. Gerçek telefon kontrolü kullanıcıya aittir. Önizleme için açılan geçici sunucu/sekmeler çalışma sonunda kapatılır; kullanıcının geliştirme sunucularına dokunulmaz.
