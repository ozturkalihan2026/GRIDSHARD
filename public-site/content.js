"use strict";

// Public copy only. Never import game profiles, environment files or credentials.
const site = {
  origin: "https://gridshardgame.com",
  email: "gridshardgame@gmail.com",
  publisher: "Alihan ÖZTÜRK",
  updated: "2026-10-05",
  // Approved durations are not evidence that the operating processes are active.
  // Both scoped operators and first runs verified 2026-10-05; not a live-site or future expiry guarantee.
  retention: { backupDays: 30, supportDaysAfterClosure: 90, backupVerified: true, supportVerified: true },
};

const content = {
  tr: {
    locale: "tr-TR", language: "Türkçe", otherLanguage: "English",
    skip: "İçeriğe geç", nav: { home: "Oyun", support: "Destek", privacy: "Gizlilik", "delete-account": "Hesap silme" },
    footer: "GRIDSHARD · Devreni kur. Stratejini konuştur.",
    updated: "Son güncelleme", contact: "Destek e-postası", emailAction: "E-posta ile iletişime geç",
    deletionAction: "Hesap silme e-postasını hazırla",
    deletionSubject: "GRIDSHARD hesap silme talebi",
    deletionBody: "Merhaba, GRIDSHARD hesabımın ve ilişkili kişisel verilerimin silinmesini istiyorum.\n\nOyuncu adı:\nOyuncu kimliği (biliyorsam):\nHesaba bağlı e-posta (varsa):\n\nHesap sahipliğini güvenli şekilde doğrulamak için yönlendirme bekliyorum.",
    home: {
      title: "GRIDSHARD — Devreni kur. Stratejini konuştur.",
      description: "Modüllerini birleştir, devreni kur ve rakibinin çekirdeğini devre dışı bırak. GRIDSHARD oyun tanıtımı, destek ve gizlilik bilgileri.",
      eyebrow: "DEVRE TABANLI STRATEJİ", headline: "Devreni kur.\nStratejini konuştur.",
      intro: "Saldırı, savunma ve destek modüllerini bir araya getir. Akımını yönet, devrenin dengesini kur ve rakibinin çekirdeğini devre dışı bırak.",
      status: "Google Play yayını hazırlanıyor", statusNote: "İndirme bağlantısı yayımlandığında burada yer alacak. Bu sayfa oyun sunucusu değildir.",
      features: [
        { title: "Senin devren, senin kararın", text: "Modül seçimin ve akım ekonomin savaşın gidişatını belirler." },
        { title: "Çekirdeğe kadar mücadele", text: "Rakibinin modüllerini devre dışı bırak ve çekirdeğine ulaş." },
        { title: "Birlikte daha güçlü", text: "Takımını kur, modül parçalarını paylaş ve turnuvalarda birlikte mücadele et." },
      ],
    },
    support: {
      title: "GRIDSHARD Destek", description: "GRIDSHARD destek iletişimi, hata bildirimi ve hesap yardımı.",
      eyebrow: "BİZE ULAŞ", headline: "Destek", intro: "Oyun, hesap veya satın alma hakkında bize yazabilirsin.",
      sections: [
        { title: "Yardım isterken", bullets: ["Oyuncu adını ve biliyorsan oyuncu kimliğini belirt.", "Sorunu, ne zaman oluştuğunu ve cihaz/uygulama sürümünü yaz.", "Ekran görüntüsü göndereceksen kişisel bilgilerini ve oturum bilgilerini gizle."] },
        { title: "Satın alma hakkında", paragraphs: ["Satın alma desteği için ürün adı ve mağaza sipariş numarası yeterlidir. Kart numarası, banka bilgisi veya mağaza şifresi gönderme. Mağazanın iade süreci ve hesap silme işlemi birbirinden ayrıdır."] },
        { title: "Hesap silme", paragraphs: ["Uygulamayı kaldırmış olsan da hesap silme talebi gönderebilirsin. Ayrıntılar ve e-posta bağlantısı hesap silme sayfasında yer alır."], link: { page: "delete-account", text: "Hesap silme adımlarını aç" } },
      ],
    },
    privacy: {
      title: "GRIDSHARD Gizlilik Politikası", description: "GRIDSHARD hesap, oyun ilerlemesi, isteğe bağlı analitik ve veri silme uygulamaları.",
      eyebrow: "VERİLERİN HAKKINDA", headline: "Gizlilik Politikası",
      intro: `Bu politika GRIDSHARD oyunu, bu tanıtım sitesi ve destek iletişimi hakkındadır. Geliştirici ve yayıncı: ${site.publisher}. Gizlilik soruları ve veri talepleri için gridshardgame@gmail.com adresine ulaşabilirsin.`,
      sections: [
        { title: "Tanıtım sitesi", paragraphs: ["Bu statik sitede oyun hesabına giriş, reklam, analiz SDK’sı veya veri toplayan bir form bulunmaz. Site kendi çerezini veya yerel depolama kaydını oluşturmaz. E-posta bağlantısı e-posta uygulamanı açar; mesajı gönderene kadar bu sayfa destek talebi toplamaz.", "Siteyi sunmak ve kötüye kullanımı önlemek için Cloudflare bağlantı IP’si, istek zamanı, adresi ve tarayıcı/ağ bilgilerini kendi hizmeti kapsamında işleyebilir. Destek adresine gönderdiğin mesajlar Google’ın e-posta hizmetinde işlenir."], external: [{ text: "Cloudflare gizlilik açıklaması", href: "https://www.cloudflare.com/privacypolicy/" }, { text: "Google gizlilik politikası", href: "https://policies.google.com/privacy" }] },
        { title: "Oyunda işlenen bilgiler", bullets: ["Hesap ve oturum: oyuncu kimliği, görünen ad, oturum/cihaz kaydı ve hesaba bağlamayı seçtiğin doğrulanmış iletişim bilgileri.", "Oyun ilerlemesi: kartlar, modüller, çekirdekler, kupalar, para birimleri, desteler, ödüller, ayarlar ve maç sonuçları.", "Sosyal özellikler: arkadaşlıklar, takım üyeliği, sohbet/mesajlar, davetler ve kötüye kullanım bildirimleri.", "Etkin bir mağaza veya reklam bağlantısında: satın alma/ödüllü reklam işleminin doğrulanması için işlem ve ürün kimlikleri. Ödeme kartı bilgilerinin işlenmesi mağazaya aittir; oyuna kart numaranı vermen gerekmez.", "Bildirimleri açtığında: ilgili cihazın push bildirim kaydı."] },
        { title: "Kullanım ve görünürlük", paragraphs: ["Bu bilgiler hesabını ve ilerlemeni korumak, maçları ve ödülleri yürütmek, sosyal özellikleri sağlamak, işlemleri doğrulamak ve kötüye kullanımı önlemek için kullanılır. Görünen adın, seçili kozmetiklerin, açık profilindeki istatistiklerin ve sıralama bilgilerin diğer oyunculara görünebilir. Takım sohbeti takım üyelerine, özel mesajlar ilgili alıcıya görünür. Hesap ayarların ve oturum sırların açık profilin parçası değildir."] },
        { title: "İsteğe bağlı ürün analitiği", paragraphs: ["Ürün analitiği varsayılan olarak kapalıdır. Ayarlar’da izin verirsen oturum, ekran, eşleştirme, savaş sonucu ve kaba performans kategorileri kaydedilir. Bu kayıtlarda ham oyuncu kimliği yerine takma kimlik kullanılır; veri anonim değildir. Oyuncu adı, e-posta, IP adresi ve sohbet içeriği ürün analitiği olaylarına yazılmaz.", "Ham ürün analitiği en fazla 30 gün tutulur. İzni kapattığında sana ait ham ürün analitiği kayıtları silinir. Bu izin, reklam sağlayıcısının ayrı gizlilik/izin seçeneklerinin yerine geçmez. Oyun işletimi ve hata teşhisi için gereken telemetri bu isteğe bağlı analitikten ayrıdır."] },
        { title: "Hizmet sağlayıcıları", paragraphs: ["Kullanılan özelliğe göre Cloudflare (site/ağ güvenliği), Google (destek e-postası, Google ile giriş, Google Play, AdMob ve Android bildirimleri), Apple (etkin iOS özellikleri) ve Amazon Web Services / AWS (oyun sunucusu ve kalıcı oyun kayıtlarının barındırılması) hizmetleri veri işleyebilir. Bu hizmetler verileri farklı ülkelerde işleyebilir. Henüz etkinleştirilmemiş bir özellik için burada adının geçmesi, o özelliğin bu sitede çalıştığı anlamına gelmez.", "Mobil reklam kullanıma açıldığında AdMob, cihaz/ağ bilgileri ve izin/cihaz ayarlarına bağlı reklam tanımlayıcıları işleyebilir. Gerekli reklam açıklamaları ve izin seçenekleri uygulama içinde ayrıca sunulmalıdır; bu web sayfası tek başına reklam izni almaz. Gerçek ödeme ve reklam bağlantıları yayın hazırlığındadır."], external: [{ text: "Google iş ortakları veri kullanımı", href: "https://policies.google.com/technologies/partner-sites" }, { text: "AWS gizlilik açıklaması", href: "https://aws.amazon.com/privacy/" }] },
        { title: "Saklama ve silme", paragraphs: [
          "Hesap ve ilerleme kayıtları hesabı ve seçtiğin oyun işlevlerini sağlamak için tutulur; hesap silme işlemi kişisel profil, kimlik/oturum, ilgili sosyal kayıtlar, push kayıtları ve ürün analitiğini temizler. Diğer oyuncuların sonuçlarını bozmayacak kişisel olmayan toplu sonuçlar korunabilir; silinen oyuncuyla ilgili kimlik alanları kaldırılır veya redakte edilir.",
          "Oyun/hata telemetrisi sayı sınırıyla tutulur (mevcut sınır son 50.000 olaydır); hesaba bağlı telemetri hesap silme kapsamındadır. Destek yazışmalarını talebin çözümü ve gerekiyorsa uyuşmazlığın ele alınması için kullanırız. Cloudflare, Google ve diğer sağlayıcıların kendi kayıtları onların saklama politikalarına tabidir.",
          `Üretim yedekleri için belirlenen süre oluşturulmalarından itibaren ${site.retention.backupDays} gündür. Doğrulanmış üretim yedeklerini 30 gün dolduktan sonraki günlük çalışmada kalıcı silen görev etkinleştirilmiş ve ilk çalışması doğrulanmıştır. Daha yeni, süresi dolmamış sağlam yedek yoksa veya doğrulama başarısızsa silme durur; güvenli yedek/bakım incelemesi gerekir ve bu durumda 30 gün hedefi aşılabilir. Bu görev yeni yedek oluşturmaz veya başka konumlardaki kopyaları silmez.`,
          `Destek yazışmaları için belirlenen süre kaydedilen kapanıştan itibaren ${site.retention.supportDaysAfterClosure} gündür. Çözülüp kapatılan destek talepleri yayıncı tarafından işaretlenir; destek hesabındaki günlük görev kapanış zamanını ve o andaki mesaj kimliklerini kaydeder. Bu tarihten 90 gün dolduktan sonraki günlük çalışmada yalnız kayıtlı mesajlar, ilgili Gmail Çöp Kutusu kopyaları dahil, kalıcı silinir. Yeni yanıt gelirse talep yeniden açılır ve tekrar kapatılana kadar silinmez. Görev etkinleştirilmiş ve boş kapsamda ilk çalışması doğrulanmıştır; henüz gerçek bir 90 günlük silme gözlenmemiştir. Etiketlenmemiş eski talepler ve Gmail dışındaki kopyalar bu görev tarafından otomatik temizlenmez. Hata veya işlem limitinin aşılması halinde operatör incelemesi gerekir; 90 gün hedefi aşılabilir.`,
          "Saklama işlemlerinin etkinliği tek başına genel yayın hazırlığını tamamlamaz. Hedef yaş grubu, kullanılan özellikler ve gerekli mağaza açıklamaları genel yayın öncesinde ayrıca doğrulanacaktır. Oyun sunucusu kurulmuş olsa da oyun henüz genel yayına açılmamıştır. Bu metin, mağaza onayı veya tamamlanmış genel yayın hazırlığı iddiası değildir.",
        ] },
        { title: "Tercihlerin ve taleplerin", paragraphs: ["Ayarlar’da ürün analitiği iznini kapatabilir ve hesabına ait veri kopyasını alabilirsin. Hesap silme talebini uygulama içinden veya uygulamaya erişmeden e-posta ile iletebilirsin. Veri erişimi, düzeltme ve gizlilik sorularını destek adresine gönderebilirsin. Başkasının hesabına işlem yapılmaması için gerekli asgari hesap sahipliği doğrulaması istenebilir."], link: { page: "delete-account", text: "Hesap ve veri silme adımları" } },
        { title: "Güncellemeler", paragraphs: ["Yeni bir özellik veya sağlayıcı veri işleme biçimini değiştirdiğinde bu politika ve ilgili uygulama açıklamaları güncellenir. Gerekli olduğunda ayrı uygulama içi açıklama veya izin istenir. Hedef yaş grubu ve ülke gereksinimleri yayın öncesinde ayrıca değerlendirilecektir."] },
      ],
    },
    "delete-account": {
      title: "GRIDSHARD Hesap ve Veri Silme", description: "GRIDSHARD hesabını uygulama içinden veya uygulamayı kaldırdıktan sonra e-posta ile silme talebi gönder.",
      eyebrow: "HESABIN SENİN KONTROLÜNDE", headline: "Hesap ve veri silme",
      intro: "GRIDSHARD hesabını ve ilişkili kişisel verilerini silmek için aşağıdaki yollardan birini kullanabilirsin. Uygulamayı yeniden kurman gerekmez.",
      sections: [
        { title: "Uygulama içinden", steps: ["Profil → Ayarlar bölümünü aç.", "Hesap alanındaki onay kutusuna gösterilen “SIL oyuncu-kimliğin” metnini gir.", "“Hesabı ve verileri sil” düğmesiyle işlemi onayla. Silme kalıcıdır; kartlar, kupalar ve ilerleme geri yüklenemez."] },
        { title: "Uygulamaya erişmeden", steps: ["gridshardgame@gmail.com adresine “GRIDSHARD hesap silme talebi” konulu e-posta gönder. Aşağıdaki düğme e-posta taslağını açar; ayrıca e-posta adresini elle kullanabilirsin.", "Oyuncu adını, biliyorsan oyuncu kimliğini ve varsa hesaba bağlı e-posta adresini belirt. Oyuncu kimliğini bilmiyorsan bunu yaz; bu tek başına başvurunu engellemez.", "Hesap sahipliğini doğrulamak için yönlendirmemizi bekle. Başkasının hesabının silinmesini önlemek için gerekli asgari doğrulama yapılır."], action: "deletion" },
        { title: "Göndermemen gereken bilgiler", paragraphs: ["Şifre, oturum belirteci, cihaz kurtarma sırrı, tam ödeme kartı bilgisi veya kimlik belgesi gönderme. Bu statik sayfa silme işlemini doğrudan yapmaz; talebi destek e-postasına iletmeni sağlar."] },
        { title: "Silme kapsamı", paragraphs: ["Hesap profili ve ilerlemesi, oturum/kimlik kayıtları, ilişkili arkadaşlık ve mesaj kayıtları, takım üyeliği, push kayıtları, hesaba bağlı telemetri ve isteğe bağlı ürün analitiği silme kapsamındadır. Diğer oyuncuların maç sonuçları gibi kişisel olmayan toplu kayıtlar korunabilir; hesabını tanımlayan alanlar kaldırılır veya redakte edilir.", "Hesap silme, Google Play/Apple hesabını silmez ve satın alma iadesi başlatmaz. Mağaza ve diğer sağlayıcılar kendi işlem kayıtlarını kendi politikaları kapsamında saklayabilir. Destek yazışmaları ve üretim yedekleriyle ilgili yayın öncesi açıklamalar gizlilik politikasında bulunur."], link: { page: "privacy", text: "Gizlilik ve saklama açıklamalarını oku" } },
      ],
    },
  },
  en: {
    locale: "en-GB", language: "English", otherLanguage: "Türkçe",
    skip: "Skip to content", nav: { home: "Game", support: "Support", privacy: "Privacy", "delete-account": "Delete account" },
    footer: "GRIDSHARD · Build your circuit. Make your strategy count.",
    updated: "Last updated", contact: "Support email", emailAction: "Contact us by email",
    deletionAction: "Prepare an account deletion email",
    deletionSubject: "GRIDSHARD account deletion request",
    deletionBody: "Hello, I would like my GRIDSHARD account and associated personal data to be deleted.\n\nPlayer name:\nPlayer ID (if known):\nLinked email address (if any):\n\nPlease advise how to safely verify account ownership.",
    home: {
      title: "GRIDSHARD — Build your circuit. Make your strategy count.",
      description: "Combine your modules, build your circuit and disable your opponent’s core. GRIDSHARD game information, support and privacy.",
      eyebrow: "CIRCUIT-BASED STRATEGY", headline: "Build your circuit.\nMake your strategy count.",
      intro: "Combine attack, defence and support modules. Manage your power, balance your circuit and disable your opponent’s core.",
      status: "Preparing for Google Play", statusNote: "A download link will appear here once the game is published. This page is not the game server.",
      features: [
        { title: "Your circuit, your decisions", text: "Your module choices and power economy shape each battle." },
        { title: "Fight your way to the core", text: "Disable your opponent’s modules and reach their core." },
        { title: "Stronger together", text: "Create a team, share module fragments and compete in tournaments together." },
      ],
    },
    support: {
      title: "GRIDSHARD Support", description: "GRIDSHARD support contact, bug reports and account help.",
      eyebrow: "GET IN TOUCH", headline: "Support", intro: "Contact us about the game, your account or a purchase.",
      sections: [
        { title: "When asking for help", bullets: ["Include your player name and player ID, if known.", "Describe the issue, when it occurred and your device/app version.", "Remove personal information and session credentials from any screenshots."] },
        { title: "Purchase help", paragraphs: ["For purchase help, include the product name and store order number. Do not send card details, banking information or your store password. Store refunds and game account deletion are separate processes."] },
        { title: "Account deletion", paragraphs: ["You can request account deletion even after uninstalling the app. Instructions and an email link are available on the account deletion page."], link: { page: "delete-account", text: "Open account deletion instructions" } },
      ],
    },
    privacy: {
      title: "GRIDSHARD Privacy Policy", description: "GRIDSHARD account, game progress, optional analytics and data deletion practices.",
      eyebrow: "ABOUT YOUR DATA", headline: "Privacy Policy",
      intro: `This policy covers the GRIDSHARD game, this informational website and support communications. Developer and publisher: ${site.publisher}. Contact gridshardgame@gmail.com for privacy questions or data requests.`,
      sections: [
        { title: "This website", paragraphs: ["This static website has no game login, advertising, analytics SDK or data collection form. It does not create its own cookies or local storage entries. Email links open your email application; this page does not collect a support request until you send an email.", "To deliver the site and prevent abuse, Cloudflare may process connection IP addresses, request times, requested addresses and browser/network information under its service policies. Messages sent to the support address are processed through Google’s email service."], external: [{ text: "Cloudflare privacy policy", href: "https://www.cloudflare.com/privacypolicy/" }, { text: "Google privacy policy", href: "https://policies.google.com/privacy" }] },
        { title: "Information processed by the game", bullets: ["Account and sessions: player ID, display name, session/device records and verified contact information you choose to link.", "Game progress: cards, modules, cores, trophies, currencies, decks, rewards, settings and match results.", "Social features: friends, team membership, chats/messages, invitations and abuse reports.", "When store or advertising integrations are active: transaction and product identifiers used to verify purchases/rewarded ads. Payment card processing belongs to the store; you do not need to provide your card number to the game.", "When you enable notifications: the relevant device’s push notification registration."] },
        { title: "Use and visibility", paragraphs: ["This information is used to maintain your account and progress, run matches and rewards, provide social features, verify transactions and prevent abuse. Other players may see your display name, selected cosmetics, public profile statistics and rankings. Team chats are visible to team members; private messages are visible to their recipients. Account settings and session secrets are not part of your public profile."] },
        { title: "Optional product analytics", paragraphs: ["Product analytics is off by default. If you enable it in Settings, session, screen, matchmaking, battle result and coarse performance categories are recorded. Records use a pseudonymous identifier rather than your raw player ID; they are not anonymous. Player names, emails, IP addresses and chat content are not written to product analytics events.", "Raw product analytics is retained for up to 30 days. Disabling consent deletes your raw product analytics records. This setting does not replace separate advertising privacy/consent choices. Telemetry needed to operate and diagnose the game is separate from this optional analytics."] },
        { title: "Service providers", paragraphs: ["Depending on the feature used, providers may include Cloudflare (site/network security), Google (support email, Google sign-in, Google Play, AdMob and Android notifications), Apple (enabled iOS features) and Amazon Web Services / AWS (hosting the game server and persistent game records). Providers may process data in different countries. Naming a not-yet-enabled feature here does not mean it runs on this website.", "When mobile advertising is enabled, AdMob may process device/network information and advertising identifiers according to consent and device settings. Necessary advertising disclosures and privacy choices must also be provided inside the app; this web page does not obtain advertising consent. Live payment and advertising integrations are being prepared for release."], external: [{ text: "Google partner data use", href: "https://policies.google.com/technologies/partner-sites" }, { text: "AWS privacy notice", href: "https://aws.amazon.com/privacy/" }] },
        { title: "Retention and deletion", paragraphs: [
          "Account and progress records are retained to provide your account and chosen game features. Account deletion removes your personal profile, identity/session records, related social records, push registrations and product analytics. Non-personal aggregate results needed to preserve other players’ results may remain; identifying fields relating to the deleted player are removed or redacted.",
          "Game/diagnostic telemetry is count-limited (currently the most recent 50,000 events); account-linked telemetry is covered by account deletion. Support correspondence is used to resolve your request and, where necessary, address a dispute. Cloudflare, Google and other providers’ own records are subject to their retention policies.",
          `The selected production backup period is ${site.retention.backupDays} days from creation. The daily job that permanently deletes verified production backups on the next run after 30 days is active, and its first run has been verified. Deletion stops if no newer, unexpired valid backup exists or validation fails; safe backup/maintenance review is then required, and the 30-day target may be exceeded. This job does not create backups or delete copies in other locations.`,
          `The selected support correspondence period is ${site.retention.supportDaysAfterClosure} days after the recorded closure. The publisher marks resolved, closed support requests; the daily job in the support mailbox records the closure time and the message IDs present then. Only those recorded messages, including relevant Gmail Trash copies, are permanently deleted on the next daily run after 90 days. A new reply reopens the request and prevents deletion until it closes again. The job is active and its first empty-scope run has been verified; no real 90-day deletion has yet been observed. Unlabeled older requests and copies outside Gmail are not automatically cleaned by this job. Errors or processing limits require operator review, and the 90-day target may be exceeded.`,
          "Active retention processes alone do not complete public-release preparation. Target age groups, enabled features and required store disclosures will be checked separately before public launch. Although the game server is deployed, the game has not launched publicly. This text does not claim store approval or completed public-release preparation.",
        ] },
        { title: "Your choices and requests", paragraphs: ["Settings lets you disable optional analytics and obtain a copy of your account data. Request account deletion in the app or by email without access to the app. Send access, correction or privacy questions to our support address. Minimal account ownership verification may be requested to prevent changes to another person’s account."], link: { page: "delete-account", text: "Account and data deletion instructions" } },
        { title: "Updates", paragraphs: ["When a feature or provider changes data processing, this policy and relevant app disclosures will be updated. Separate in-app disclosure or consent will be requested when required. Target age groups and country requirements will be reviewed before release."] },
      ],
    },
    "delete-account": {
      title: "GRIDSHARD Account and Data Deletion", description: "Request GRIDSHARD account deletion in the app or by email after uninstalling.",
      eyebrow: "YOUR ACCOUNT, YOUR CONTROL", headline: "Account and data deletion",
      intro: "Use either method below to request deletion of your GRIDSHARD account and associated personal data. You do not need to reinstall the app.",
      sections: [
        { title: "Inside the app", steps: ["Open Profile → Settings.", "In the account section, enter the displayed confirmation text: “SIL your-player-id”.", "Confirm with “Delete account and data”. Deletion is permanent; cards, trophies and progress cannot be restored."] },
        { title: "Without access to the app", steps: ["Email gridshardgame@gmail.com with the subject “GRIDSHARD account deletion request”. The button below opens a draft; you may also use the address manually.", "Include your player name, player ID if known, and any linked email address. If you do not know your ID, say so; this alone does not prevent a request.", "Wait for our account ownership verification instructions. Minimal verification is required to prevent someone else’s account from being deleted."], action: "deletion" },
        { title: "Information you should not send", paragraphs: ["Do not send passwords, session tokens, device recovery secrets, full payment card details or identity documents. This static page does not directly delete an account; it provides a way to send your request to support."] },
        { title: "Deletion scope", paragraphs: ["Deletion covers the account profile and progress, identity/session records, related friendships and messages, team membership, push registrations, account-linked telemetry and optional product analytics. Non-personal aggregate records, such as other players’ match results, may remain; fields identifying your account are removed or redacted.", "Deleting a game account does not delete your Google Play/Apple account or initiate a purchase refund. Stores and other providers may retain their own transaction records under their policies. Pre-release explanations about support correspondence and production backups are included in the privacy policy."], link: { page: "privacy", text: "Read privacy and retention details" } },
      ],
    },
  },
};

module.exports = { site, content };
