# GRIDSHARD yerel marka görselleri

27 Ekim 2026: Android launcher/round/adaptive/monochrome ve açılış ikonu,
iOS AppIcon artık onaylı `client/assets/branding/gridshard-app-icon-source.png`
reaktöründen `tools/prepare_app_icons.py` ile dışa aktarılır. Beş yoğunluktaki
30 PNG Android üretim projesiyle byte düzeyinde eşleşir. Aşağıdaki önceki
marka kaynağı notu bu ikonlar için tarihçedir. Capacitor sync aynı güncel
`native-assets/` dosyalarını kullanmaya devam eder.

Android/iOS ikonları ve açılış görselleri `D:\Projects\GRIDSHARD2.1` kaynağından
yeniden çizilmeden/yeniden kodlanmadan alınmıştır. `tools/generate_brand_assets.py`
aynı dosyaları yeniden üretmek içindir; aktarım sırasında çalıştırılmadı.

Mevcut `mobile:add:*` ve `capacitor:sync:after` kancası, portre/güvenli yedek
ayarlarını koruyarak `tools/configure-native-branding.js` ile görselleri uygular.
Yerel Android debug hedefi `.mobile-debug/android`; üretim hedefi `android`.
iOS hedefi `ios/App/App/Assets.xcassets` altındaki mevcut AppIcon/Splash kataloglarıdır.

Android'de uyarlanabilir/yuvarlak/tek renk başlatıcı ikonları ve yoğunluğa uygun
ortalanmış açılış amblemi vardır. iOS'ta 1024 px AppIcon ve 2732 px açılış görseli
vardır. Native sistem açılışı statiktir; devamındaki web yükleme ekranı kaynağın
dönen halkalarını, hareketli ışıklarını ve ilerleme/kapanış animasyonlarını oynatır.

Kalıcı application ID, imzalı yeni paket ve gerçek cihaz kontrolü ayrı yayın
kapılarıdır. Eski APK'ya kaynak dosya kopyalamak kurulu uygulamayı değiştirmez.
