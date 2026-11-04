# 2.4.0 — ilk kasa teslimi ve Topla açılışı uygulaması

4 Kasım 2026. REWARD-06 ve UI-08 **çalışılıyor**; bu dilim yayın veya S1 açılışı değildir.
[S1 sözleşmesi](season-1-rewards-and-xp.md) · [2.4.0 briefi](releases/2.4.0.md).

## Uygulanan davranış

- `apply_fixed_contents` bütün kaynak miktarlarını ve modül/çekirdek parça hedeflerini
  cüzdanı değiştirmeden doğrular. Eksik/yanlış/uygun olmayan hedef veya negatif miktar
  kasayı tüketmez. Geçerli çekirdek parçası `core_shards_by_type` içine teslim edilir.
- `POST /profile/{player_id}/reward-inbox/{message_id}/claim?chest_delivery=open`
  aynı hesap işlemi içinde kasayı toplar ve açar. Dosyalı yerel modda dahi işlem
  önce kopya profil üzerinde hazırlanır; doğrulama hatası kısmi ödül veya kayıp mesaj yaratmaz.
- Yeni istemci `inbox-open:{message_id}` talep kimliğini kullanır. Aynı/farklı taleple
  tekrar, envanterden önceden açılmış kasa veya profil yeniden yükleme aynı açılış
  makbuzuna döner. Gerçek PostgreSQL ekonomik işlem kaydı `opened_receipt` sonucunu saklar.
- Eski istemci query parametresi olmadan yalnız toplar; stoktan açma akışı korunur.
  Yeni istemci eski sunucuyla konuşup açılış makbuzu alamazsa ödül sonucu uydurmaz;
  alınmış kasanın stok bilgisini gösterir.
- Yeni Topla akışı mevcut kasa görselini, kısa açılışı, makbuzun kaynak/kozmetik
  kartlarını ve mevcut ses ayarına bağlı ödül sesini kullanır. Azaltılmış hareket
  tercihi korunur. Topla Tümü yalnız başarıyla açılan kasaların toplu sonucunu gösterir;
  başarısız kalan mesajlar tekrar alınabilir.

## Doğrulama

- Tam Python regresyonu: **2015 geçti / 44 dış servis senaryosu atlandı**.
- Yeni kasa/çekirdek testleri ve mevcut teslim testleri: **26 geçti**;
  eşzamanlı talepler, yanlış içerikte hiçbir bakiye değişmemesi, eski toplama,
  envanterden önceden açma, yeniden yükleme ve premium çekirdek iadesi dahil.
- İstemci: **767 geçti**; tekli/toplu açılış, kısmi hata ve hesap değişimi dahil.
- Gerçek yerel Chrome üzerinde **1 tarayıcı akış testi geçti**. Bu testin sunucu
  yanıtı yalnız görsel fixture'dır; gerçek ödül teslimi diye sayılmaz. TR 393×852
  ve EN 320×568 sonuçları görüntülendi; üç kaynak satırı okunur ve yatay taşma yok.
- Ek gerçek PostgreSQL rollback/replay testi eklendi. Yerelde PostgreSQL/Redis
  ortamı sağlanmadığından bu kapı ayrıca CI/servis ortamında çalışmalıdır.

Tekrar üretim: `server/tests/test_inbox_open_delivery.py`,
`server/tests/test_postgres_persistent_operations.py`,
`client/tests/visual-polish-v9.test.js`, `e2e/casual-chest-opening.spec.js`.
Görsel yerel çıktı: `test-results/casual-chest-opening-inbox-74a75-t-without-visiting-the-shop-desktop-chromium/`.

## Açık kalan işler

S1 kaynak/kozmetik dönem profili, hak anında revision/hash ve tekil tahsis kodu
[ayrı dilimde eklendi](first-season-launch-profile.md). Tam kapanış/restore servis ve cihaz kabulü,
sarı gezinme kontrolleri ve saldırı/çekirdek
ses iyileştirmeleri ayrı açık işlerdir. Gerçek Android güncellemesi ve ses/animasyon
kabulü yapılmadı. Yeni ödül miktarı, canlı tarih/env, sürüm etiketi veya AAB değiştirilmedi.

XP emirlerinin ilk uygulaması [ayrı kabul kaydındadır](release-240-mission-acceptance.md).
