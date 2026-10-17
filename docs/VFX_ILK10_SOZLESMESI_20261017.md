# İlk 10 modül — VFX ve ses hazırlığı

> Güncel uygulama kaydı: `MODUL_KAMERA_VFX_20261017.md`. Bu belgedeki
> "henüz bağlanmadı" ifadeleri ilk okuma aşamasını anlatır; yeni VFX/ses
> bağlantıları v14'te eklendi. Bağımsız kol/fan eklem geometrisi hâlâ ayrı iştir.

Kullanıcının `C:/Users/SERVER/Desktop/VFX.txt` dosyası 17 Ekim'de okundu.
Bu dosya bir tasarım önerisidir; aşağıdaki notlar VFX uygulandığı anlamına gelmez.
Bu turdaki uygulama: 360° yönelme/kamera ve sezon teslimi; yeni efekt/ses üretimi ayrı iş.

| Modül | İstenen görünür etki | Güvenilir tetik / bağlantı |
|---|---|---|
| Kalkan | Kendi devresi üzerinde petek kubbe; gelen saldırı kubbede söner | Gerçek blok/savunma olayı; kapalı/yok edilmiş kalkan koruyor gibi gösterilmez |
| Lazer | Hedefe kırmızı ışın; öneri 1 sn görünürlük | `attack_performed`; sunucunun seviye/yetenek kaynaklı aralığı korunur, hazırlık atış değildir |
| Soğutucu | Hedefe yönelip soğuk hava üfler | `module_cooled`, gerçek kaynak/hedef |
| Onarım | Kol yükselir, uçtan hedefe yeşil onarım ışını | `module_repaired`, kendine onarımda başka hedef uydurulmaz |
| Güçlendirici | İki yeşil alan arasında elektrik; gerçek alıcılara sarı ışın | `amplifier_pulse` / doğrulanmış katkılar; çoklu hedefte tek mekanik çevrim |
| Sönümleyici | Üst mavi alanda gelen saldırıyı sönümleme | Gerçek hasar azaltma/engelleme katkısı |
| Batarya | Gövde çevresinde elektriklenme | Güçlü/çalışır durum; görünmez sekmede ve düşük grafikte sürekli animasyon yok |
| EMP | İki mor göz birleşir, hedefe mor elektrik ışını | `sabotage_applied`, kaynak/hedef ve gerçek etki süresi |
| Darbe Topu | Namlu ucundan mermi, gerçek hedefte patlama | `attack_performed`; görsel çarpışma hasarı ikinci kez uygulamaz |
| Füze Fırlatıcı | Roket uçlarından gerçek hedefe füze | `attack_performed`; imha/oturum değişiminde gecikmeli efekt iptal |

## Hareket / ses sınırları

- Sabit kaide, dönen üst parça, CAN/ısı çubukları birbirinden bağımsızdır.
- Onarım kolunun eklem animasyonu, fanın ayrı rotoru ve EMP gözleri gibi alt
  parçalar VFX üretimi sırasında ayrıca ayrıştırılmalıdır; bütün cihazı sallamak
  bu hareketlerin tamamlandığı anlamına gelmez.
- Lazer ışını önerilen 1 sn sürse bile mekanik ateş hızı 1 sn'ye sabitlenmez.
  Yeni atış/hedef/ölüm geldiğinde eski ışın kesilir veya güncellenir; üst üste
  sınırsız ışın ve ses birikmez.
- Sesler mevcut ses izinleri, efekt ses düzeyi, görünürlük ve aynı anda çalma
  sınırlarına uyar. Hazırlık, atış ve çarpma ayrı ses olayıdır; yeni ses
  dosyaları bu turda üretilmedi veya bağlanmadı.
- Her cihaz için ayrı zamanlayıcı/rAF açılmaz; mevcut savaş sunum saati,
  efekt bütçesi ve temizleme kuyruğu kullanılır.
