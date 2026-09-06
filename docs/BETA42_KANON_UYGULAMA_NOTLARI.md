# GRIDSHARD 2.1 — Beta.42 Kanon Uygulama Notları

## Kapsam

Bu paket, savaş, meta ilerleme ve arena eşleştirmesini üç kanonik belgeye bağlar. Eski port/Jeneratör/özel hücre/laboratuvar normalizasyonu kuralları yeni arena savaşını yönetmez. Eski alanlar yalnız kayıt ve protokol uyumluluğu için kalabilir.

## İlk denge değerleri

- Akım: savaş başında 6, üst sınır 12, her 2,5 saniyede +1.
- Modül Akım maliyeti: 2–5.
- Enerji: Seviye 1 Çekirdek 10/sn ve 100 depo; seviye başına üretim ×1,04, depo +3.
- Enerji Baskısı: %101, %121, %141 ve %161 eşiklerinde kademeli hız/hasar/destek kaybı.
- Modül parçası: 2, 4, 8, 12, 20, 30, 45, 65, 90, 120, 160, 210, 270, 340.
- Yükseltme DK'sı: hedef seviye ×100 × nadirlik çarpanı.

Bu değerler oyuncuyu ilk saniyelerde bekletmeden iki-üç kart oynatır; 12 sınırı pahalı kartların sınırsız stoklanmasını önler. Son değer değildir; kullanıcı oynanış testi ve Beta.42H telemetrisiyle kalibre edilir.

## Uygulama varsayımları

- Kanonik tabloda tanımlanan 36 kimlik, kartın açılış/maliyet/nadirlik/CAN/hasar değerinde tek kaynaktır.
- Eski motorda doğrudan davranış eşleniği olmayan 15 yeni kart, V1'de belgelenmiş mevcut mekanik ailelerinden açıkça eşlenmiş davranış kullanır. Kimliği ve ilerlemesi kendine aittir; ayrı mekanik varyantları sonraki içerik paketinde ayrıştırılabilir.
- Liglere özel ikinci bir bot tablosu verilmediği için Arena 12 botları liglerde kimlik ve desteleri değiştirilmeden kullanılır; yalnız maçtaki kupa değeri oyuncunun kademesine eşlenir.
- AI gücü, kupa ana ölçüt kalacak şekilde oyuncunun ortalama deste seviyesi ve seçili Çekirdek seviyesiyle ikincil olarak eşlenir.
- Eski `coins` kayıt alanı ekranda kullanılmaz; ilk 2.1 veri geçişinde bir kez DK'ya aktarılır ve sonra yalnız uyumluluk alanıdır.

## Kabul durumu

Kaynak sözdizimi ve kanonik veri bütünlüğü denetlendi: 36 modül, 12 arena, arena başına 10 olmak üzere 120 benzersiz bot ve bot başına altı kart. Kullanıcının isteği gereği uygulama çalıştırılmadı ve oynanış/denge testi yapılmadı.
