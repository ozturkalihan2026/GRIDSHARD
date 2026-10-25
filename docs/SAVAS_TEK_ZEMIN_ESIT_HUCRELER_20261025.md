# Tek zemin ve üç sırada eşit hücre — 25 Ekim 2026

Sorun: eski kaide resminin kendi hücreleri eşit değildi. Üstüne çizilen ikinci
CSS zemin bu farkı kapatıyor, ancak kullanıcının istediği yerleşik devreyi
gizliyordu. İkinci zemin ve hücre yüzeyleri kaldırıldı. Resmin kendisi düzeltildi.

## Sonuç ve kayıt

- İki tarafta da tek 5×3 zemin. 1254×1254 kaynakta tüm hücreler 140×130 piksel;
  alt sıra dahil. Aralarındaki gerçek kanal 7 piksel. Kayıt açıklığı
  x264..992, y260..664: 728×404 piksel.
- Yerleşik çizimin her hücresi dışa aktarımda bu ölçülere normalize edildi.
  Resmin dışındaki gümüş köşeler, renkli çerçeve ve kaide korunur.
- Canlı hücreler eşit şeffaf hitbox'lardır. CSS satır/sütun boşlukları
  aynı kaydın 7/404 ve 7/728 oranlarıyla hesaplanır. Resim ve hitbox aynı
  kamera düzlemini paylaşır; ek CSS karo/resim yüzeyi yoktur.
- Modül/çekirdek birim ölçeği değiştirilmedi. Modüller çekirdeğin 0.85'i;
  tüm hücrelerde aynı. Can 5px, ısı 4px; ikisi de hücre içinde cihaz ayağının
  altında. Enerji, gerçek hücre aralıklarından ölçülen mevcut en kısa rotayı kullanır.
- Yeni sürekli animasyon, timer, kare başına ölçüm veya görüntü birleştirme yok.
- Oyuncu WebP 139020, rakip 128778 bayt; toplam 267798 bayt.

## Üretim / son istem yönlendirmeleri

Yerleşik imagegen kullanıldı; CLI/API kullanılmadı. Düzenleme hedefi kabul
edilmiş turkuaz kaideydi. İlk iki denemede alt sıra kısa kaldığından kullanılmadı.
Son turkuaz düzenlemede verilen yönlendirme:

> Precise correction to this exact cyan floating circuit island sprite.
> The bottom row is squashed. Enlarge the bottom row downward by roughly
> 40 pixels / 50%, keeping top and middle row heights. Move the front cyan
> rim, gold sockets and front silver corners down by the same amount; shorten
> the tops of the underlying pillars. All 15 plates must have identical width
> and height in a single 5×3 native grid. Preserve the visual language,
> transparent background, no devices, text or bars. Expand the floor/front
> as necessary instead of preserving the too-short opening.

Rakip varyantın son yönlendirmesi:

> Precise color variant of the chosen blue source. Preserve all geometry,
> 15 equal floor plates, dividers, silver corners, gold couplings, pillars,
> framing and alpha. Replace cyan/turquoise rim and glowing seams with
> ruby/crimson/red-orange. Keep the neutral dark slate floor and silver/gold
> details. No extra floor or objects.

Son birkaç piksellik el çizimi farkı, `tools/prepare-native-circuits.cjs`
ile mevcut boyalı hücreler tek varlığa kaydedilirken giderildi. Yeni doku
çizilmez; kaynakta mevcut 15 hücre 140×130'a ölçeklenir ve aynı resme işlenir.

Kaynaklar `$CODEX_HOME/generated_images/01a0302f-786b-7613-9af9-d49cd1a9ee49/`:

- Oyuncu: `exec-457b67cd-ae4b-4d78-8e90-f1c6db2287d5.png`
- Rakip: `exec-57d70157-f530-4d2d-8a71-cb8211dc9006.png`

Proje kaynak kopyaları: `artifacts/battle-native-20261025/source/`.
Kayıtlı PNG master'lar ve 30 hücrenin sınırları: aynı klasörde
`island-*-registered.png` ve `registration-audit.json`.
Aktif varlıklar: `client/assets/ui/battle-native-v6/island-{player,enemy}.webp`.
Eski kaide resimleri/üreticisi `artifacts/battle-native-20261025/retired/`
arşivine alındı. Mevcut `battle-approved-v5/circuit-walls.svg` yan duvar
çizimi kullanılmaya devam eder.

## Doğrulama

729/729 istemci, 10/10 derleme ve üç tarayıcı profilinde 6/6 görsel test geçti.
Toplam 3240 modül yerleşimi, 174 dolu-tahta göstergesi ve 18 özel güç
dalgası kontrol edildi. Tarayıcı doğrulama çıktıları
`artifacts/battle-native-verified-20261025/` içinde tutulur. Kontroller:
her iki tarafta 30 hücrenin eşitliği, gerçek zemin kaydı, tüm 36 modülün her
hücrede 0.85 ölçeği, can/ısı barı ve enerji izi görünürlüğü, özel güç dalgası.
Tarayıcı emülasyonu gerçek telefon FPS ölçümü yerine geçmez.
