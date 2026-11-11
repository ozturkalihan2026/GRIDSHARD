# Ses yönü — Devre Ocağı / v21 aday bankası

6 Kasım 2026 kullanıcı geri bildirimi: v20 ile efektler duyulur oldu; müzik
geride kaldı, çekirdek oyunun ana kahramanı gibi duyulmadı. Kullanıcı bütün
modüllerin görevlerine uygun, daha iyi ve ortak temalı sesler istedi.

Bu çalışma mevcut boyalı, hacimli ve fiziksel oyun nesnelerinin işitsel
karşılığıdır. Görsel sanat yönü veya müzik besteleri değiştirilmez.
Uygulanan banka adaydır; oyuncunun hoparlör/kulaklık beğenisi ayrı kabuldür.

## Ortak dil ve hiyerarşi

Sesin temel dili kısa mekanik gövde, kontrollü elektrik/enerji ve sıcak
kristal rezonanstır. Her modül aynı bipin farklı perdesi olmaz. Savunma
ateş etmez, destek patlamaz; gerçek görevini duyurur. Sürekli gürültü
tabakası, uzun tiz çınlama ve sahte atış ritmi üretilmez. Sesler yalnız
mevcut sunucu olaylarında başlar; süre veya ses örneği oyunun hasarını,
atış hızını veya güç zamanlamasını değiştirmez.

Çekirdek ana ses karakteridir: enerji toplanması → gövdeli boşalma → kısa
kristal kuyruk. Ortak D/A açık beşlisi mevcut Re merkezli müzikle akrabadır;
uzun yeni melodi olarak müziğin üstüne bindirilmez. Yedi güç aynı aileden
gelir ama kendi işlevini ayırır. Aktivasyonlar yaklaşık0,90–1,08 saniye,
tekrar eden atışlar yaklaşık0,23–0,32 saniyedir.

| Çekirdek | İmza |
| --- | --- |
| Rezonans | Gövdeli boşalmadan yayılan dalga halkaları |
| Muhafız | Kale kilidi, ağır plaka ve koruyucu rezonans |
| Aşırı Yük | Kısa sıcak türbin/alev basıncı |
| Bozucu | Aşağı inen imha mührü; gerçek imha vuruşu ayrı olayda |
| Takviye | Açılan portal ve yerleşen mekanik kilit |
| Anka | İçe çekilen enerji, ardından yükselen sıcak alev |
| Kuantum | Katlanan alan ve kısa parçalanmış kristal iz |

## Modül görevleri

| Modül | Ses davranışı |
| --- | --- |
| Lazer | Tek, temiz ve kısa enerji kesişi |
| Darbe Topu | Bobin yüklenmesi ve tok basınç darbesi |
| Manyetik Ray | Kısa ray yükselişi ve odaklı delici vuruş |
| Füzeatar | Motor ateşlenmesi ve sonlu hava yarılması |
| Dron Yuvası | Üç küçük servo/taret darbesi |
| Ark Topu | Kısa, düzensiz dallanan elektrik çatlağı |
| Plazma Havan | Yüklenme nefesi, ağır sıcak enerji gövdesi |
| Kuantum Tekrarlayıcı | Birbirine bağlı çift faz darbesi |
| Seri Top | Hızlı, kuru mekanik salvo |
| Kalkan Kırıcı | Odaklı basınç ve kısa kırılan yüzey izi |
| Kalkan | Yuvarlatılmış enerji emilmesi |
| Zırh | Kısa ve yoğun plaka teması |
| Bariyer | Üst üste oturan iki plaka |
| Yansıtıcı | İçe toplama ve geri yönlenen enerji |
| Muhafız Kubbesi | Daha geniş ve ağır koruma açılışı |
| Faz Zırhı | İçe çekilip kaybolan faz izi |
| Tampon Kalkan | Küçük dolum ve emilme geçişi |
| Son Siper | Son korumayı kilitleyen çift mekanik darbe |
| Onarım | Sıcak, yumuşak yükselen enerji akışı |
| Güçlendirici | Kısa gerilen akım bobini |
| EMP | Yuvarlak güç düşüşü ve elektrik sönümü |
| Virüs | Düzensiz kısa dijital paketler |
| Arındırıcı | Dışa doğru temizleyen, açık ve kısa iz |
| Hız Rölesi | Sıklaşan küçük akış geçişleri |

## Miks ve uygulama

11 Kasım dinleme geri bildirimiyle savaş müzik çarpanı2,35’ten2,15’e
(yaklaşık%9) indirildi; efekt çarpanı0,70 kaldı. Son kullanıcı kararı: menü müziği varsayılanı%5; savaş ve sonuç müziği ayrı kanalda%50 başlar.
Kaydedilmiş menü tercihleri korunur; eski kayıtta savaş alanı yoksa%50 kullanılır.
Efekt, menü ve savaş kaydırıcılarının yüzde değerleri anında gösterilir.
İki kompakt kanal kartında üç kaydırıcı vardır; önizleme düğmeleri kaldırıldı.
Bir kanalı sıfırlamak diğerini susturmaz; ortak müzik sessiz anahtarı ikisini kapatır.
Menü/sonuç besteleri ve müzik ana kazancı değişmedi. Çekirdek trimleri0,78/0,58; modüllerin
trimleri görevlerine göre ayrılır. Destek üretimi silahların önüne geçmez.
Üç rutin başlangıç/420ms ve mevcut öncelik/tekrar kuralları korunur.

Kaynak `tools/combat_sfx_theme_v21.py`; ortak API
`tools/combat_sfx_synth.py`. `python tools/generate_combat_theme.py` 24 modül,
14 çekirdek ve altı mevcut yönlendirme kaynağını üretir. `--check` tekrar
üretilebilirliği denetler. Henüz yazılmamış yeni modül sessizce başka ses
ödünç alamaz; kendi sesi yazılana kadar üretim reddedilir.

Ham WAV’larda düşük geçiren süzme, yumuşak crest/slew denetimi, sıfır sınırlar
ve DC düzeltmesi vardır. Sert genlik kırpma yoktur. OGG/AAC manifesti her
kaynağın hash’ine bağlıdır. Gerçek mobil codec testi yalnız dosya varlığını
değil çözümleme ve ses başlatmayı da denetler; bu bir beğeni kabulü değildir.

V20 kaynakları yerel `qa_reports/audio-v21-baseline/` altında karşılaştırma
için korundu. Kısa önizleme `qa_reports/audio-v21-theme-preview.wav`:
eski/yeni Rezonans, ardından saldırı/savunma/destek örnekleri. QA dosyaları
Git’e girmez. Yeni APK kurulduktan sonra müzik/efekt dengesi, çekirdeğin
karakteri, modül ayrımı ve cızırtı kullanıcıyla tekrar değerlendirilir.
