"use strict";

// Public copy only. Never import game profiles, environment files or credentials.
const terms = require("./terms.js");
const site = {
  origin: "https://gridshardgame.com",
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.gridshardgame.app",
  email: "gridshardgame@gmail.com",
  publisher: "Alihan ÖZTÜRK",
  updated: "2026-11-14",
  // Approved durations are not evidence that the operating processes are active.
  // Both scoped operators and first runs verified 2026-10-05; not a live-site or future expiry guarantee.
  retention: { backupDays: 30, supportDaysAfterClosure: 90, backupVerified: true, supportVerified: true },
};

const content = {
  tr: {
    locale: "tr-TR", language: "Türkçe", otherLanguage: "English",
    skip: "İçeriğe geç", nav: { home: "Oyun", support: "Destek", privacy: "Gizlilik", terms: "Kullanım şartları", "delete-account": "Hesap silme" },
    footer: "GRIDSHARD · Devreni kur. Stratejini konuştur.",
    updated: "Son güncelleme", contact: "Destek e-postası", emailAction: "E-posta ile iletişime geç",
    deletionAction: "Hesap silme e-postasını hazırla",
    deletionSubject: "GRIDSHARD hesap silme talebi",
    deletionBody: "Merhaba, GRIDSHARD hesabımın ve ilişkili kişisel verilerimin silinmesini istiyorum.\n\nOyuncu adı:\nOyuncu kimliği (biliyorsam):\nHesaba bağlı e-posta (varsa):\n\nHesap sahipliğini güvenli şekilde doğrulamak için yönlendirme bekliyorum.",
    home: {
      title: "GRIDSHARD — Devreni kur. Stratejini konuştur.",
      description: "Modüllerini birleştir, devreni kur ve rakibinin çekirdeğini devre dışı bırak. GRIDSHARD oyun tanıtımı, destek ve gizlilik bilgileri.",
      eyebrow: "DEVRE TABANLI STRATEJİ", headline: "Devreni kur.\nStratejini konuştur.",
      intro: "Altı modüllük desteni ve çekirdeğini seç. Saldırı, Savunma ve Taktik kartlarını doğru anda kullan; gerçek zamanlı devre savaşlarında stratejini konuştur.",
      status: "Google Play’de · Ücretsiz", statusNote: "2.4.0 güncellemesi Google Play incelemesinde. Google Play’de sunulan sürümü mağazadan takip edebilirsin.",
      downloadAction: "Google Play'den indir",
      features: [
        {
          "title": "6 modülle başla, koleksiyonunu büyüt",
          "text": "Yeni oyuncular ilk 6 modülle başlar. Toplam 24 modülün diğer 18’i Devre Yolu’ndaki kupa eşiklerinde açılır; hepsi başlangıçta açık değildir."
        },
        {
          "title": "Çekirdeğin, savaşın merkezinde",
          "text": "7 farklı çekirdekten oyun tarzına uygun olanı seç. Gücün dolduğunda etkinleştir; modüllerinle birlikte savaşın gidişini değiştir."
        },
        {
          "title": "Takımınla birlikte ilerle",
          "text": "Takım kur, modül parçalarını paylaş ve arkadaşlarınla dostluk maçı yap. Sezon ve turnuvaların başlangıçlarını oyun içi takvimden takip et."
        }
      ],
      release: {
        "eyebrow": "YAKLAŞAN SEZON",
        "title": "İlk sezon için hazırlanıyoruz",
        "text": "S1 ile haftalık ve takım turnuvalarının planlanan başlangıcı 30 Kasım 2026, 03.00 Türkiye saati. Sezon dört hafta sürer; planlanan bitiş 28 Aralık, 03.00’tür. Günlük giriş ve sezon ödülleri sezonla açılır.",
        "note": "2.4.0’da gerçek parayla satın alma ve reklam gösterimi sunulmaz. Sandıklar oyun içi kaynaklarla açılır. Eski bir işlemle ilgili destek ve iade hakların korunur."
      },
      gallery: {
        "title": "Gerçek oyun ekranlarından",
        "intro": "Güncel savaş alanı, çekirdek gücü ve koleksiyon ekranları. Görseller 2.4.0’dan alınmıştır.",
        "items": [
          {
            "id": "battle",
            "title": "Gerçek zamanlı devre savaşı",
            "alt": "Kırmızı ve mavi devrelerin gerçek bir dostluk maçında karşılıklı ateş ettiği GRIDSHARD savaş ekranı"
          },
          {
            "id": "core",
            "title": "Çekirdek gücünü etkinleştir",
            "alt": "Rezonans çekirdeğinin gerçek savaşta kullanılan altın renkli güç etkisi"
          },
          {
            "id": "modules",
            "title": "Devre Yolu’nda modülleri aç",
            "alt": "Altı başlangıç modülü ve ilerlemeyle açılacak kilitli kartları gösteren koleksiyon"
          },
          {
            "id": "shop",
            "title": "Oynayarak kaynak kazan",
            "alt": "Hediye sandığı ve oyun içi kaynaklarla açılan sandıkları gösteren mağaza"
          }
        ]
      },
    },
    support: {
      title: "GRIDSHARD Destek", description: "GRIDSHARD destek iletişimi, hata bildirimi ve hesap yardımı.",
      eyebrow: "BİZE ULAŞ", headline: "Destek", intro: "Oyun, hesap veya satın alma hakkında bize yazabilirsin.",
      sections: [
        { title: "Yardım isterken", bullets: ["Oyuncu adını ve biliyorsan oyuncu kimliğini belirt.", "Sorunu, ne zaman oluştuğunu ve cihaz/uygulama sürümünü yaz.", "Ekran görüntüsü göndereceksen kişisel bilgilerini ve oturum bilgilerini gizle."] },
        { title: "Oyun içi kaynaklar ve geçmiş işlemler", paragraphs: ["2.4.0 sürümünde gerçek parayla satın alma veya reklam gösterimi sunulmaz. Oyun içi kaynak, sandık veya ödül sorunu için oyuncu kimliğini, ürün/ödül adını ve zamanı belirt. Geçmiş bir mağaza işlemi için ürün adı ve mağaza sipariş numarasıyla destek isteyebilirsin; kart numarası, banka bilgisi, satın alma jetonu veya mağaza şifresi gönderme. Geçmiş işlemlere ait iade hakları korunur."] },
        { title: "Hesap silme", paragraphs: ["Uygulamayı kaldırmış olsan da hesap silme talebi gönderebilirsin. Ayrıntılar ve e-posta bağlantısı hesap silme sayfasında yer alır."], link: { page: "delete-account", text: "Hesap silme adımlarını aç" } },
      ],
    },
    terms: terms.tr,
    privacy: {
      title: "GRIDSHARD Gizlilik Politikası", description: "GRIDSHARD hesap, oyun ilerlemesi, isteğe bağlı analitik ve veri silme uygulamaları.",
      eyebrow: "VERİLERİN HAKKINDA", headline: "Gizlilik Politikası",
      intro: `Bu politika GRIDSHARD oyunu, bu tanıtım sitesi ve destek iletişimi hakkındadır. Geliştirici ve yayıncı: ${site.publisher}. Gizlilik soruları ve veri talepleri için gridshardgame@gmail.com adresine ulaşabilirsin.`,
      sections: [
        { title: "Tanıtım sitesi", paragraphs: ["Bu statik sitede oyun hesabına giriş, reklam, analiz SDK’sı veya veri toplayan bir form bulunmaz. Site kendi çerezini veya yerel depolama kaydını oluşturmaz. E-posta bağlantısı e-posta uygulamanı açar; mesajı gönderene kadar bu sayfa destek talebi toplamaz.", "Siteyi sunmak ve kötüye kullanımı önlemek için Cloudflare bağlantı IP’si, istek zamanı, adresi ve tarayıcı/ağ bilgilerini kendi hizmeti kapsamında işleyebilir. Destek adresine gönderdiğin mesajlar Google’ın e-posta hizmetinde işlenir."], external: [{ text: "Cloudflare gizlilik açıklaması", href: "https://www.cloudflare.com/privacypolicy/" }, { text: "Google gizlilik politikası", href: "https://policies.google.com/privacy" }] },
        { title: "Oyunda işlenen bilgiler", bullets: ["Hesap ve oturum: oyuncu kimliği, görünen ad ve oturum/cihaz kaydı. Google, Apple veya Play Games ile giriş yaparsan yalnız sağlayıcının verdiği hesap kimliği saklanır; e-posta adresin, adın ve profil bilgilerin istenmez. Oyun yeni e-posta adresi veya telefon numarası almaz. Daha önce hesabına bağlanmış doğrulanmış bir e-posta ya da telefon varsa (Google veya Apple’ın o dönemde bildirdiği e-posta dahil) hesap kurtarma için saklanmaya devam eder.", "Oyun ilerlemesi: kartlar, modüller, çekirdekler, kupalar, para birimleri, desteler, ödüller, ayarlar ve maç sonuçları.", "Sosyal özellikler: arkadaşlıklar, takım üyeliği, hazır mesaj listesinden seçtiğin sohbet ve özel mesajlar, davetler, engellemeler ve kötüye kullanım bildirimleri (bildirime yazdığın kısa açıklama dahil).", "Ebeveyn denetimi: sosyal özelliklerin bu hesapta kapalı olup olmadığı ve bunun için belirlenen 4 haneli şifrenin geri döndürülemeyen özeti. Şifrenin kendisi saklanmaz.", "2.4.0 sürümünde yeni gerçek para satın alma ve ödüllü reklam akışları sunulmaz. Önceki işlemlerle ilgili teslimat, iade, güvenlik veya destek kayıtları varsa bu amaçlarla işlenmeye devam edebilir. Ödeme kartı bilgilerinin işlenmesi mağazaya aittir; oyun kart numaranı istemez.", "Bildirimleri açtığında: ilgili cihazın push bildirim kaydı."] },
        { title: "Kullanım ve görünürlük", paragraphs: ["Bu bilgiler hesabını ve ilerlemeni korumak, maçları ve ödülleri yürütmek, sosyal özellikleri sağlamak, işlemleri doğrulamak ve kötüye kullanımı önlemek için kullanılır. Görünen adın, seçili kozmetiklerin, açık profilindeki istatistiklerin ve sıralama bilgilerin diğer oyunculara görünebilir. Takım sohbeti takım üyelerine, özel mesajlar ilgili alıcıya görünür. Hesap ayarların ve oturum sırların açık profilin parçası değildir.", "Takım sohbetinde ve özel mesajda serbest yazı yoktur; yalnız oyunun hazır mesaj listesinden seçim yapılır. Bu kuraldan önce yazılmış serbest metinli mesajlar hiçbir oyuncuya gösterilmez; kayıtları diğer mesaj kayıtlarıyla aynı saklama ve silme kurallarına tabidir. Oyuncu adı ve takım adı serbest yazılır; iletişim bilgisi veya kaba söz içeren adlar reddedilir. Bu süzgeç her uygunsuz adı yakalamaz; adına gerçek adını, okulunu veya telefon numaranı yazma.", "Bir ebeveyn ya da veli, Ayarlar → Hesap ve Gizlilik → Ebeveyn Denetimi bölümünden bu hesabın takım sohbetini, özel mesajlarını, arkadaşlık isteklerini ve davet kodlarını 4 haneli bir şifreyle kapatabilir; yeniden açmak aynı şifreyi ister. Ayar hesaba bağlıdır; yeni bir hesapta yeniden yapılması gerekir."] },
        { title: "İsteğe bağlı ürün analitiği", paragraphs: ["Ürün analitiği varsayılan olarak kapalıdır. Ayarlar’da açmak istersen önce doğum yılın sorulur; yıl saklanmaz, hesabında yalnız yanıtının sonucu ve sorunun sorulduğu yıl tutulur. 18 yaşından küçükler için analitik açılmaz. Açıldığında oturum, ekran, eşleştirme, savaş sonucu ve kaba performans kategorileri kaydedilir. Bu kayıtlarda ham oyuncu kimliği yerine takma kimlik kullanılır; veri anonim değildir. Oyuncu adı, e-posta, IP adresi ve sohbet içeriği ürün analitiği olaylarına yazılmaz.", "Ham ürün analitiği en fazla 30 gün tutulur. İzni kapattığında sana ait ham ürün analitiği kayıtları silinir. Oyun işletimi ve hata teşhisi için gereken telemetri bu isteğe bağlı analitikten ayrıdır. Reklam ve satışın kapalı olması oyun hesabının veya işletim kayıtlarının tutulmadığı anlamına gelmez."] },
        { title: "Hizmet sağlayıcıları", paragraphs: ["Kullanılan özelliğe göre Cloudflare (site/ağ güvenliği), Google (destek e-postası, Google ile giriş, Play Games, Google Play, AdMob ve Android bildirimleri), Apple (etkin iOS özellikleri) ve Amazon Web Services / AWS (oyun sunucusu ve kalıcı oyun kayıtlarının barındırılması) hizmetleri veri işleyebilir. Bu hizmetler verileri farklı ülkelerde işleyebilir. Henüz etkinleştirilmemiş bir özellik için burada adının geçmesi, o özelliğin bu sitede çalıştığı anlamına gelmez. Oyun yazı tiplerini kendi paketinden yükler; açılışta üçüncü taraf bir yazı tipi hizmetine istek göndermez.", "2.4.0 sürümünde reklam gösterimi ve ödüllü reklam başlatma akışı kapalıdır; reklam göstermek için AdMob başlatılmaz. Android uygulaması reklam kimliği iznini istemez. Önceki sürümlerde veya geçmiş işlemlerde kullanılan sağlayıcıların kayıtları kendi saklama kurallarına tabi olabilir. Bu politika tek başına reklam izni almaz veya bir satın alma akışını etkinleştirmez."], external: [{ text: "Google iş ortakları veri kullanımı", href: "https://policies.google.com/technologies/partner-sites" }, { text: "AWS gizlilik açıklaması", href: "https://aws.amazon.com/privacy/" }] },
        { title: "Saklama ve silme", paragraphs: [
          "Hesap ve ilerleme kayıtları hesabı ve seçtiğin oyun işlevlerini sağlamak için tutulur; hesap silme işlemi kişisel profil, kimlik/oturum, ilgili sosyal kayıtlar, push kayıtları ve ürün analitiğini temizler. Diğer oyuncuların sonuçlarını bozmayacak kişisel olmayan toplu sonuçlar korunabilir; silinen oyuncuyla ilgili kimlik alanları kaldırılır veya redakte edilir.",
          "Oyun/hata telemetrisi sayı sınırıyla tutulur (mevcut sınır son 50.000 olaydır); hesaba bağlı telemetri hesap silme kapsamındadır. Destek yazışmalarını talebin çözümü ve gerekiyorsa uyuşmazlığın ele alınması için kullanırız. Cloudflare, Google ve diğer sağlayıcıların kendi kayıtları onların saklama politikalarına tabidir.",
          `Üretim yedekleri için belirlenen süre oluşturulmalarından itibaren ${site.retention.backupDays} gündür. Doğrulanmış üretim yedeklerini 30 gün dolduktan sonraki günlük çalışmada kalıcı silen görev etkinleştirilmiş ve ilk çalışması doğrulanmıştır. Daha yeni, süresi dolmamış sağlam yedek yoksa veya doğrulama başarısızsa silme durur; güvenli yedek/bakım incelemesi gerekir ve bu durumda 30 gün hedefi aşılabilir. Bu görev yeni yedek oluşturmaz veya başka konumlardaki kopyaları silmez.`,
          `Destek yazışmaları için belirlenen süre kaydedilen kapanıştan itibaren ${site.retention.supportDaysAfterClosure} gündür. Çözülüp kapatılan destek talepleri yayıncı tarafından işaretlenir; destek hesabındaki günlük görev kapanış zamanını ve o andaki mesaj kimliklerini kaydeder. Bu tarihten 90 gün dolduktan sonraki günlük çalışmada yalnız kayıtlı mesajlar, ilgili Gmail Çöp Kutusu kopyaları dahil, kalıcı silinir. Yeni yanıt gelirse talep yeniden açılır ve tekrar kapatılana kadar silinmez. Görev etkinleştirilmiş ve boş kapsamda ilk çalışması doğrulanmıştır; henüz gerçek bir 90 günlük silme gözlenmemiştir. Etiketlenmemiş eski talepler ve Gmail dışındaki kopyalar bu görev tarafından otomatik temizlenmez. Hata veya işlem limitinin aşılması halinde operatör incelemesi gerekir; 90 gün hedefi aşılabilir.`,
          "GRIDSHARD Google Play’de sunulmaktadır; güncellemelerin mağaza incelemesi ve dağıtım durumu değişebilir. Gizlilik açıklamaları kullandığın sürümün gerçek işlevleriyle birlikte değerlendirilir. Hesap silme ve veri talepleri, yeni bir sezonun başlamasını veya bir güncellemenin onaylanmasını beklemez.",
        ] },
        { title: "Genç oyuncular ve ebeveynler", paragraphs: ["GRIDSHARD’ın hedef kitlesi 13 yaş ve üzeridir. Oyun oynamak için yaş sorulmaz: sohbette serbest yazı yoktur, yeni e-posta veya telefon alınmaz ve giriş sağlayıcılarından e-posta istenmez. Yaşın sorulduğu tek yer isteğe bağlı ürün analitiğidir: kapalı gelir, açmak isteyene doğum yılı sorulur ve 18 yaşından küçükler için açılmaz. 2.4.0’da reklam gösterimi sunulmaz.", "Bu bölüm teknik uygulamayı anlatır. Ebeveyn ya da veli olarak çocuğunun hesabındaki verilerin kopyasını ya da silinmesini istemek için destek adresine yazabilirsin; başkasının hesabına işlem yapılmaması için gerekli asgari hesap sahipliği doğrulaması istenir. Ülkeye göre gereken veli veya yasal temsilci yetkilendirmeleri ayrıca geçerlidir."] },
        { title: "Tercihlerin ve taleplerin", paragraphs: ["Ayarlar’da ürün analitiği iznini kapatabilir ve hesabına ait veri kopyasını alabilirsin. Hesap silme talebini uygulama içinden veya uygulamaya erişmeden e-posta ile iletebilirsin. Veri erişimi, düzeltme ve gizlilik sorularını destek adresine gönderebilirsin. Başkasının hesabına işlem yapılmaması için gerekli asgari hesap sahipliği doğrulaması istenebilir.", "Hesabını silmeden verilerinin bir kısmının silinmesini de isteyebilirsin. Ürün analitiği kayıtların, Ayarlar → Hesap ve Gizlilik bölümünde analitik iznini kapattığında silinir. Diğer veriler için (örneğin hesabına bağlı eski bir e-posta adresi ya da telefon numarası, mesaj kayıtların veya yazdığın şikâyet açıklamaları) gridshardgame@gmail.com adresine “GRIDSHARD veri silme talebi” konulu bir e-posta gönder ve oyuncu kimliğini yaz. Oyuncu kimliğin, ilerlemen ve oturum kayıtların hesabın çalışması için gereklidir; bunlar yalnız hesap silinerek kaldırılır."], link: { page: "delete-account", text: "Hesap ve veri silme adımları" } },
        { title: "Güncellemeler", paragraphs: ["Yeni bir özellik veya sağlayıcı veri işleme biçimini değiştirdiğinde bu politika ve ilgili uygulama açıklamaları güncellenir. Gerekli olduğunda ayrı uygulama içi açıklama veya izin istenir. Hedef kitle, özellikler ve mağaza beyanları gerçek kullanım durumuyla eşleştirilir."] },
      ],
    },
    "delete-account": {
      title: "GRIDSHARD Hesap ve Veri Silme", description: "GRIDSHARD hesabını uygulama içinden veya uygulamayı kaldırdıktan sonra e-posta ile silme talebi gönder.",
      eyebrow: "HESABIN SENİN KONTROLÜNDE", headline: "Hesap ve veri silme",
      intro: "GRIDSHARD hesabını ve ilişkili kişisel verilerini silmek için aşağıdaki yollardan birini kullanabilirsin. Uygulamayı yeniden kurman gerekmez.",
      sections: [
        { title: "Uygulama içinden", steps: ["Ana ekrandaki menüden Ayarlar → Hesap ve Gizlilik bölümünü aç.", "Hesap silme alanında ekranda gösterilen onay metnini aynen gir.", "“Hesabı ve verileri sil” düğmesiyle işlemi onayla. Silme kalıcıdır; kartlar, kupalar ve ilerleme geri yüklenemez."] },
        { title: "Uygulamaya erişmeden", steps: ["gridshardgame@gmail.com adresine “GRIDSHARD hesap silme talebi” konulu e-posta gönder. Aşağıdaki düğme e-posta taslağını açar; ayrıca e-posta adresini elle kullanabilirsin.", "Oyuncu adını, biliyorsan oyuncu kimliğini ve varsa hesaba bağlı e-posta adresini belirt. Oyuncu kimliğini bilmiyorsan bunu yaz; bu tek başına başvurunu engellemez.", "Hesap sahipliğini doğrulamak için yönlendirmemizi bekle. Başkasının hesabının silinmesini önlemek için gerekli asgari doğrulama yapılır."], action: "deletion" },
        { title: "Göndermemen gereken bilgiler", paragraphs: ["Şifre, oturum belirteci, cihaz kurtarma sırrı, tam ödeme kartı bilgisi veya kimlik belgesi gönderme. Bu statik sayfa silme işlemini doğrudan yapmaz; talebi destek e-postasına iletmeni sağlar."] },
        { title: "Silme kapsamı", paragraphs: ["Hesap profili ve ilerlemesi, oturum/kimlik kayıtları, ilişkili arkadaşlık ve mesaj kayıtları, takım üyeliği, push kayıtları, hesaba bağlı telemetri ve isteğe bağlı ürün analitiği silme kapsamındadır. Diğer oyuncuların maç sonuçları gibi kişisel olmayan toplu kayıtlar korunabilir; hesabını tanımlayan alanlar kaldırılır veya redakte edilir.", "Hesap silme, Google Play/Apple hesabını silmez ve geçmiş bir satın almanın iadesini başlatmaz. Mağaza ve diğer sağlayıcılar kendi işlem kayıtlarını kendi politikaları kapsamında saklayabilir. Destek yazışmaları ve üretim yedeklerinin saklama açıklamaları gizlilik politikasında bulunur."], link: { page: "privacy", text: "Gizlilik ve saklama açıklamalarını oku" } },
      ],
    },
  },
  en: {
    locale: "en-GB", language: "English", otherLanguage: "Türkçe",
    skip: "Skip to content", nav: { home: "Game", support: "Support", privacy: "Privacy", terms: "Terms", "delete-account": "Delete account" },
    footer: "GRIDSHARD · Build your circuit. Make your strategy count.",
    updated: "Last updated", contact: "Support email", emailAction: "Contact us by email",
    deletionAction: "Prepare an account deletion email",
    deletionSubject: "GRIDSHARD account deletion request",
    deletionBody: "Hello, I would like my GRIDSHARD account and associated personal data to be deleted.\n\nPlayer name:\nPlayer ID (if known):\nLinked email address (if any):\n\nPlease advise how to safely verify account ownership.",
    home: {
      title: "GRIDSHARD — Build your circuit. Make your strategy count.",
      description: "Combine your modules, build your circuit and disable your opponent’s core. GRIDSHARD game information, support and privacy.",
      eyebrow: "CIRCUIT-BASED STRATEGY", headline: "Build your circuit.\nMake your strategy count.",
      intro: "Choose a six-module deck and your core. Time your Attack, Defense and Tactics cards and make your strategy count in real-time circuit battles.",
      status: "On Google Play · Free to play", statusNote: "The 2.4.0 update is under Google Play review. Check the store for the currently available version.",
      downloadAction: "Get it on Google Play",
      features: [
        {
          "title": "Start with 6 modules, grow your collection",
          "text": "New players start with the first 6 modules. The other 18 of the 24-module roster unlock at trophy milestones on Circuit Road; the full roster is not unlocked at the start."
        },
        {
          "title": "Your core, at the heart of the battle",
          "text": "Choose your style from 7 different cores. Activate your power when charged and combine it with your modules to change the battle."
        },
        {
          "title": "Progress together",
          "text": "Create a team, share module shards and challenge friends to friendly battles. Follow the in-game calendar for season and tournament openings."
        }
      ],
      release: {
        "eyebrow": "UPCOMING SEASON",
        "title": "Getting ready for the first season",
        "text": "S1 and both weekly and team tournaments are scheduled to start on 30 November 2026 at 03:00 Türkiye time (UTC+03:00). The four-week season is scheduled to end on 28 December at 03:00. Daily login and season rewards open with the season.",
        "note": "Version 2.4.0 does not offer real-money purchases or display ads. Chests use in-game resources. Support and refund rights for earlier transactions remain available."
      },
      gallery: {
        "title": "Captured from the real game",
        "intro": "The current battlefield, core power and collection screens. These images were captured from version 2.4.0.",
        "items": [
          {
            "id": "battle",
            "title": "Real-time circuit battles",
            "alt": "Actual GRIDSHARD friendly battle showing red and blue circuits exchanging fire"
          },
          {
            "id": "core",
            "title": "Activate your core power",
            "alt": "Golden Resonance core power effects activated during an actual battle"
          },
          {
            "id": "modules",
            "title": "Unlock modules on Circuit Road",
            "alt": "Collection showing six starter modules and locked cards unlocked through progression"
          },
          {
            "id": "shop",
            "title": "Earn resources by playing",
            "alt": "Shop showing a gift chest and chests opened with in-game resources"
          }
        ]
      },
    },
    support: {
      title: "GRIDSHARD Support", description: "GRIDSHARD support contact, bug reports and account help.",
      eyebrow: "GET IN TOUCH", headline: "Support", intro: "Contact us about the game, your account or a purchase.",
      sections: [
        { title: "When asking for help", bullets: ["Include your player name and player ID, if known.", "Describe the issue, when it occurred and your device/app version.", "Remove personal information and session credentials from any screenshots."] },
        { title: "In-game resources and earlier transactions", paragraphs: ["Version 2.4.0 does not offer real-money purchases or display ads. For an in-game resource, chest or reward issue, include your player ID, the item or reward name and the time. For an earlier store transaction, contact support with the product name and store order number. Do not send card numbers, bank details, purchase tokens or store passwords. Refund rights for earlier transactions remain available."] },
        { title: "Account deletion", paragraphs: ["You can request account deletion even after uninstalling the app. Instructions and an email link are available on the account deletion page."], link: { page: "delete-account", text: "Open account deletion instructions" } },
      ],
    },
    terms: terms.en,
    privacy: {
      title: "GRIDSHARD Privacy Policy", description: "GRIDSHARD account, game progress, optional analytics and data deletion practices.",
      eyebrow: "ABOUT YOUR DATA", headline: "Privacy Policy",
      intro: `This policy covers the GRIDSHARD game, this informational website and support communications. Developer and publisher: ${site.publisher}. Contact gridshardgame@gmail.com for privacy questions or data requests.`,
      sections: [
        { title: "This website", paragraphs: ["This static website has no game login, advertising, analytics SDK or data collection form. It does not create its own cookies or local storage entries. Email links open your email application; this page does not collect a support request until you send an email.", "To deliver the site and prevent abuse, Cloudflare may process connection IP addresses, request times, requested addresses and browser/network information under its service policies. Messages sent to the support address are processed through Google’s email service."], external: [{ text: "Cloudflare privacy policy", href: "https://www.cloudflare.com/privacypolicy/" }, { text: "Google privacy policy", href: "https://policies.google.com/privacy" }] },
        { title: "Information processed by the game", bullets: ["Account and sessions: player ID, display name and session/device records. If you sign in with Google, Apple or Play Games, only the account identifier supplied by the provider is stored; your email address, name and profile details are not requested. The game does not take new email addresses or phone numbers. If a verified email or phone was linked to your account earlier (including an email reported by Google or Apple at that time), it continues to be stored for account recovery.", "Game progress: cards, modules, cores, trophies, currencies, decks, rewards, settings and match results.", "Social features: friends, team membership, the chat and private messages you pick from the preset message list, invitations, blocks and abuse reports (including the short explanation you write in a report).", "Parental controls: whether social features are turned off for this account and a non-reversible digest of the 4-digit passcode set for it. The passcode itself is not stored.", "Version 2.4.0 does not offer new real-money purchases or rewarded-ad flows. Earlier transaction records may still be processed for delivery, refunds, security or support. Payment-card information is handled by the store; the game does not ask for your card number.", "When you enable notifications: the relevant device’s push notification registration."] },
        { title: "Use and visibility", paragraphs: ["This information is used to maintain your account and progress, run matches and rewards, provide social features, verify transactions and prevent abuse. Other players may see your display name, selected cosmetics, public profile statistics and rankings. Team chats are visible to team members; private messages are visible to their recipients. Account settings and session secrets are not part of your public profile.", "Team chat and private messages have no free-text entry; players can only pick from the game’s preset message list. Free-text messages written before this rule are not shown to any player; their records follow the same retention and deletion rules as other message records. Player names and team names are typed freely; names containing contact details or profanity are rejected. This filter does not catch every unsuitable name; do not put your real name, school or phone number in a name.", "A parent or guardian can turn off this account’s team chat, private messages, friend requests and invite codes with a 4-digit passcode under Settings → Account and Privacy → Parental Controls; turning them back on requires the same passcode. The setting belongs to the account and must be set again on a new account."] },
        { title: "Optional product analytics", paragraphs: ["Product analytics is off by default. If you want to turn it on in Settings, you are first asked for your year of birth; the year is not stored, and only the outcome of your answer and the year you were asked are kept on your account. Analytics is not turned on for players under 18. Once it is on, session, screen, matchmaking, battle result and coarse performance categories are recorded. Records use a pseudonymous identifier rather than your raw player ID; they are not anonymous. Player names, emails, IP addresses and chat content are not written to product analytics events.", "Raw product analytics is retained for up to 30 days. Turning off consent deletes your raw product analytics records. Telemetry needed to operate the game and diagnose faults is separate from this optional analytics. Disabling ads and sales does not mean that game accounts or operational records are not processed."] },
        { title: "Service providers", paragraphs: ["Depending on the feature used, providers may include Cloudflare (site/network security), Google (support email, Google sign-in, Play Games, Google Play, AdMob and Android notifications), Apple (enabled iOS features) and Amazon Web Services / AWS (hosting the game server and persistent game records). Providers may process data in different countries. Naming a not-yet-enabled feature here does not mean it runs on this website. The game loads its typefaces from its own package; it does not contact a third-party font service at startup.", "Ad display and rewarded-ad launch flows are disabled in version 2.4.0; AdMob is not initialised to display ads. The Android app does not request advertising ID permission. Providers used by previous versions or earlier transactions may retain their records under their own policies. This policy alone does not obtain advertising consent or activate a purchase flow."], external: [{ text: "Google partner data use", href: "https://policies.google.com/technologies/partner-sites" }, { text: "AWS privacy notice", href: "https://aws.amazon.com/privacy/" }] },
        { title: "Retention and deletion", paragraphs: [
          "Account and progress records are retained to provide your account and chosen game features. Account deletion removes your personal profile, identity/session records, related social records, push registrations and product analytics. Non-personal aggregate results needed to preserve other players’ results may remain; identifying fields relating to the deleted player are removed or redacted.",
          "Game/diagnostic telemetry is count-limited (currently the most recent 50,000 events); account-linked telemetry is covered by account deletion. Support correspondence is used to resolve your request and, where necessary, address a dispute. Cloudflare, Google and other providers’ own records are subject to their retention policies.",
          `The selected production backup period is ${site.retention.backupDays} days from creation. The daily job that permanently deletes verified production backups on the next run after 30 days is active, and its first run has been verified. Deletion stops if no newer, unexpired valid backup exists or validation fails; safe backup/maintenance review is then required, and the 30-day target may be exceeded. This job does not create backups or delete copies in other locations.`,
          `The selected support correspondence period is ${site.retention.supportDaysAfterClosure} days after the recorded closure. The publisher marks resolved, closed support requests; the daily job in the support mailbox records the closure time and the message IDs present then. Only those recorded messages, including relevant Gmail Trash copies, are permanently deleted on the next daily run after 90 days. A new reply reopens the request and prevents deletion until it closes again. The job is active and its first empty-scope run has been verified; no real 90-day deletion has yet been observed. Unlabeled older requests and copies outside Gmail are not automatically cleaned by this job. Errors or processing limits require operator review, and the 90-day target may be exceeded.`,
          "GRIDSHARD is available on Google Play; store review and rollout status may vary between updates. Read these privacy disclosures together with the actual features of your version. Account deletion and data requests do not depend on a new season starting or an update being approved.",
        ] },
        { title: "Younger players and parents", paragraphs: ["GRIDSHARD targets players aged 13 and over. No age is requested to play: chat does not allow free text, no new email addresses or phone numbers are taken, and sign-in providers are not asked for email addresses. Age is requested only for optional product analytics: it is off by default, enabling it asks for birth year, and it cannot be enabled for users under 18. Version 2.4.0 does not display ads.", "This section describes the technical implementation. A parent or guardian may contact support to request a copy or deletion of a child’s account data. Minimum account-ownership verification is required to avoid acting on someone else’s account. Any parental or legal-representative authorisation required in your country still applies."] },
        { title: "Your choices and requests", paragraphs: ["Settings lets you disable optional analytics and obtain a copy of your account data. Request account deletion in the app or by email without access to the app. Send access, correction or privacy questions to our support address. Minimal account ownership verification may be requested to prevent changes to another person’s account.", "You can also ask for part of your data to be deleted without deleting your account. Your product analytics records are deleted when you turn off analytics consent under Settings → Account and Privacy. For other data (for example an old email address or phone number bound to your account, your message records or the report descriptions you wrote), email gridshardgame@gmail.com with the subject “GRIDSHARD data deletion request” and include your player ID. Your player ID, progress and session records are needed for the account to work; they are removed only by deleting the account."], link: { page: "delete-account", text: "Account and data deletion instructions" } },
        { title: "Updates", paragraphs: ["This policy and the relevant app disclosures are updated when a new feature or provider changes data processing. Separate in-app disclosure or consent is requested where needed. Target audience, features and store declarations must reflect actual use."] },
      ],
    },
    "delete-account": {
      title: "GRIDSHARD Account and Data Deletion", description: "Request GRIDSHARD account deletion in the app or by email after uninstalling.",
      eyebrow: "YOUR ACCOUNT, YOUR CONTROL", headline: "Account and data deletion",
      intro: "Use either method below to request deletion of your GRIDSHARD account and associated personal data. You do not need to reinstall the app.",
      sections: [
        { title: "Inside the app", steps: ["Open Settings → Account and Privacy from the menu on the home screen.", "In the account-deletion section, enter the confirmation text exactly as shown on screen.", "Confirm with “Delete account and data”. Deletion is permanent; cards, trophies and progress cannot be restored."] },
        { title: "Without access to the app", steps: ["Email gridshardgame@gmail.com with the subject “GRIDSHARD account deletion request”. The button below opens a draft; you may also use the address manually.", "Include your player name, player ID if known, and any linked email address. If you do not know your ID, say so; this alone does not prevent a request.", "Wait for our account ownership verification instructions. Minimal verification is required to prevent someone else’s account from being deleted."], action: "deletion" },
        { title: "Information you should not send", paragraphs: ["Do not send passwords, session tokens, device recovery secrets, full payment card details or identity documents. This static page does not directly delete an account; it provides a way to send your request to support."] },
        { title: "Deletion scope", paragraphs: ["Deletion covers the account profile and progress, identity/session records, related friendships and messages, team membership, push registrations, account-linked telemetry and optional product analytics. Non-personal aggregate records, such as other players’ match results, may remain; fields identifying your account are removed or redacted.", "Deleting a game account does not delete your Google Play/Apple account or initiate a refund for an earlier purchase. Stores and other providers may retain transaction records under their own policies. Retention information for support correspondence and production backups is available in the privacy policy."], link: { page: "privacy", text: "Read privacy and retention details" } },
      ],
    },
  },
};

module.exports = { site, content };
