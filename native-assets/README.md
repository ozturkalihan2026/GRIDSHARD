# GRIDSHARD yerel marka görselleri

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
