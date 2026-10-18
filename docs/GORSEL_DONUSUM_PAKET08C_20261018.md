# Paket 8C — 16 modül + 7 çekirdek

18 Ekim 2026. Yerleşik image_gen kullanıldı; harici API/ücretli 3B hizmeti kullanılmadı.

## Son durum — 3B bağlantısı

Kullanıcı yeni 23 çizimi onayladı. 26 modül ve 7 çekirdeğin gerçek geometrileri
oluşturulup ortak çiziciye bağlandı. Kart/menü görselleri ve düşük grafik yedekleri
de onaylı WebP dosyalarını kullanır. 197/197 test geçti.

Geometriler çizimlerin renk ve ana parçalarını referans alır; ince detay/malzeme
eşleşmesi henüz bitmiş sayılmaz. Gerçek oyun testi kullanıcıdadır.
Güncel takip: MODUL_36_3B_KONTROL_LISTESI_20261018.md.
Aşağıdaki liste çizim üretimi sırasında tutulmuş tarihsel kayıttır.

## Çizim aşaması kaydı

- [x] Paket 8B'deki 10 çizimin kullanıcı onayı kaydedildi.
- [x] Kalan 16 modül, görevine ve sınıf rengine uygun ayrı fiziksel cihaz olarak çizildi.
- [x] 7 çekirdek, mevcut kimlik renkleriyle farklı fiziksel reaktör olarak çizildi.
- [x] 23 PNG aslı çalışma alanında saklandı; alfa doğrulandı.
- [x] 384×384 şeffaf WebP kopyaları hazırlandı.
- [x] İki toplu önizleme incelendi: 16 modül ve 7 çekirdek.
- [x] Önceki 10 ile toplam 33 WebP, Git'e dahil edilebilen client/assets/ui altına kopyalandı.
- [ ] Yeni 23 çizimin kullanıcı görsel onayı.
- [ ] 26 modül ve 7 çekirdeğin referansa uygun gerçek 3B geometrisi.
- [ ] Başlık/taban ayrımı, pivot ve gerçek efekt çıkışları.
- [ ] Olay temelli hareket kuralları, çoklu hedef ve pasif cihaz davranışları.
- [ ] Ortak canvas, önbellek, iptal/temizlik ve düşük grafik yedek görünümü.
- [ ] Oyun bağlantısı, testler ve kullanıcının yerel görsel kabulü.

**Bu paket çizim aşamasıdır; gerçek 3B dönüşüm ve oyun bağlantısı tamamlanmadı.**
Yeni üretimler otomatik olarak onaylı sayılmadı. Kullanıcının daha önce belirlediği
“görselleri görüp onayladıktan sonra bağlama” sırası korunuyor.

## Dosyalar

- PNG asılları: artifacts/visual-refresh-pack08c-20261018/masters/
- Modül önizlemesi: artifacts/visual-refresh-pack08c-20261018/modules-preview.webp
- Çekirdek önizlemesi: artifacts/visual-refresh-pack08c-20261018/cores-preview.webp
- 26 modül WebP: client/assets/ui/modules-physical-v2/
- 7 çekirdek WebP: client/assets/ui/cores-physical-v1/
- Promptların TAM metni ve üretim kaynakları: GORSEL_DONUSUM_PAKET08C_PROMPTLAR_20261018.json
- Alfa/boyut raporu: artifacts/visual-refresh-pack08c-20261018/asset-checks.json
- Projeye kopyalama raporu: qa_reports/pack08bc-art-staging-20261018.json

23 yeni WebP: 923.026 bayt. Önceden onaylanan 10 ile 33 dosya: 1.300.560 bayt.
PNG asılları artifacts altında tutulur; büyük asılların Git'e eklenmesi gerekmez.
Yeniden hazırlama: tools/prepare-pack08c-preview.cjs; projeye kopyalama:
tools/stage-pack08bc-art.cjs. İkinci araç farklı mevcut dosyayı ezmez.

## Dönüşüm kabul ölçütleri

- Aynı renk yeterli değil: çizimdeki siluet, parça sayısı, oran, gümüş kenarlar ve malzemeler korunmalı.
- Kamera tepeden 30°; gövde dik durmalı. Ekran düzleminde resmi döndürmek 3B dönüşüm sayılmaz.
- 180° saldırı başlıkları, hedefe çalışan 360° destekler ve sabit pasifler önceki dönüş matrisini kullanır.
- Nano Sağlıkçı iki eşzamanlı çıkışa ihtiyaç duyar; hasar/onarım sırasını görsel için değiştirme.
- Dronların yönü ile üretim istasyonunun yönünü ayır; sekme/yankı hasarı boş başlık hareketi yaratmasın.
- Çekirdeklerin tamamı sabit reaktördür. Sürekli tarama/boş dönüş yapılmaz.
- Oyun isimleri, kimlikleri, denge değerleri bu çizim aşamasında değiştirilmedi.
- Yeni görüntüler henüz çalışma zamanında kullanılmıyor; mevcut ilk 10 model aynı kaldı.

## Yeni 23 varlık takibi

| Varlık | Kimlik | Çizim | 3B model | Oyun bağlantısı |
|---|---|---|---|---|
| Virüs | virus | Çizim hazır | Bekliyor | Bekliyor |
| Aşırı Hızlandırıcı | overclock_unit | Çizim hazır | Bekliyor | Bekliyor |
| Plazma Havanı | plasma_mortar | Çizim hazır | Bekliyor | Bekliyor |
| Muhafız Kubbesi | guardian_dome | Çizim hazır | Bekliyor | Bekliyor |
| Kuantum Tekrarlayıcı | quantum_repeater | Çizim hazır | Bekliyor | Bekliyor |
| Krono Rölesi | chrono_relay | Çizim hazır | Bekliyor | Bekliyor |
| Faz Zırhı | phase_armor | Çizim hazır | Bekliyor | Bekliyor |
| Sürü Fabrikatörü | swarm_fabricator | Çizim hazır | Bekliyor | Bekliyor |
| Hassasiyet Matrisi | precision_matrix | Çizim hazır | Bekliyor | Bekliyor |
| İyon Mızrağı | ion_spear | Çizim hazır | Bekliyor | Bekliyor |
| Prizma Kalkanı | prism_shield | Çizim hazır | Bekliyor | Bekliyor |
| Kesici | disruptor | Çizim hazır | Bekliyor | Bekliyor |
| Anka Onarım | phoenix_repair | Çizim hazır | Bekliyor | Bekliyor |
| Kuantum Topu | quantum_cannon | Çizim hazır | Bekliyor | Bekliyor |
| Omega Güçlendirici | omega_amplifier | Çizim hazır | Bekliyor | Bekliyor |
| Tekillik Projektörü | singularity_projector | Çizim hazır | Bekliyor | Bekliyor |
| Rezonans Çekirdeği | core_resonance | Çizim hazır | Bekliyor | Bekliyor |
| Muhafız Çekirdeği | core_guardian | Çizim hazır | Bekliyor | Bekliyor |
| Aşırı Yük Çekirdeği | core_overdrive | Çizim hazır | Bekliyor | Bekliyor |
| Kesinti Çekirdeği | core_disruptor | Çizim hazır | Bekliyor | Bekliyor |
| Kapasitör Çekirdeği | core_capacitor | Çizim hazır | Bekliyor | Bekliyor |
| Anka Çekirdeği | core_phoenix | Çizim hazır | Bekliyor | Bekliyor |
| Kuantum Çekirdeği | core_quantum | Çizim hazır | Bekliyor | Bekliyor |

