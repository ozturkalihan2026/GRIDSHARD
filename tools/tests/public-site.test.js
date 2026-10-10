"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { outputPlan, renderPage, pagePath, adsText, ASSETS, PAGES } = require("../build-public-site.js");
const { site, content } = require("../../public-site/content.js");
const root = path.resolve(__dirname, "../..");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

test("fallback preview binds loopback and serves only allowlisted static files", async () => {
  const { startPreviewServer } = require("../check-public-site.js");
  const { server, origin } = await startPreviewServer();
  try {
    assert.equal(server.address().address, "127.0.0.1");
    for (const route of ["/terms/", "/en/terms/"]) {
      const response = await fetch(`${origin}${route}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
      assert.equal((await response.text()).match(/<section\b/g).length, 14);
    }
    for (const route of ["/.env", "/public-site-manifest.json", "/server/app/main.py"]) {
      assert.equal((await fetch(`${origin}${route}`)).status, 404);
    }
    const ads = await fetch(`${origin}/app-ads.txt`);
    assert.equal(await ads.text(), adsText("pub-4974825529326987"));
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("public Terms preserve all 14 approved clauses in both languages, not operator notes", () => {
  const draft = fs.readFileSync(path.join(root, "docs/TERMS_OF_SERVICE_DRAFT_20261009.md"), "utf8").replace(/\r\n/g, "\n");
  const files = outputPlan(root, "pub-4974825529326987");
  const markers = ["## Türkçe metin — yayın öncesi taslak", "## English text — pre-publication draft", "## Hazırlama dayanakları"];
  for (const [index, language] of ["tr", "en"].entries()) {
    const body = draft.slice(draft.indexOf(markers[index]) + markers[index].length, draft.indexOf(markers[index + 1]));
    const headings = [...body.matchAll(/^### (\d+)\. (.+)$/gm)];
    const sections = content[language].terms.sections;
    assert.equal(headings.length, 14);
    assert.equal(sections.length, 14);
    headings.forEach((heading, sectionIndex) => {
      const paragraphs = body.slice(heading.index + heading[0].length, headings[sectionIndex + 1]?.index ?? body.length).trim().split(/\n\s*\n/).map((paragraph) => paragraph.replace(/\[([^\]]+)\]\((?:https:\/\/|mailto:)[^\s)]+\)/g, "$1").replace(/\s+/g, " ").trim());
      assert.equal(sections[sectionIndex].title, `${heading[1]}. ${heading[2]}`);
      assert.deepEqual(sections[sectionIndex].paragraphs, paragraphs);
    });
    const html = renderPage(language, "terms");
    const route = pagePath(language, "terms");
    assert.ok(files.has(`${route.slice(1)}index.html`));
    assert.ok(html.includes(`rel="canonical" href="${site.origin}${route}"`));
    assert.ok(html.includes(`href="${route}" aria-current="page"`));
    assert.ok(files.get("sitemap.xml").toString().includes(`${site.origin}${route}`));
    assert.equal((html.match(/<section\b/g) || []).length, 14);
    assert.doesNotMatch(html, /Yayıncı incelemesi ve yayın kapıları|Hazırlama dayanakları|Kodun tam politika|CODEX_CHECKPOINT|server\/app|docs\/|TODO|APK\/AAB/);
    assert.doesNotMatch(html, /öMağazada|ayrı zelliğin/);
  }
  assert.match(files.get("_redirects").toString(), /^\/terms \/terms\/ 301$/m);
  assert.match(files.get("_redirects").toString(), /^\/en\/terms \/en\/terms\/ 301$/m);
});

test("Terms accurately disclose pre-release purchase availability and preserve agreed refund safeguards", () => {
  const tr = renderPage("tr", "terms");
  const en = renderPage("en", "terms");
  assert.match(tr, /GRIDSHARD genel kullanıma henüz açılmamıştır/);
  assert.match(en, /GRIDSHARD has not yet launched publicly/);
  assert.match(tr, /sürüme, test kanalına ve ülkeye göre değişebilir/);
  assert.match(en, /vary by version, test track and country/);
  assert.match(tr, /test kanalına katılmak tek başına alımları ücretsiz yapmaz/);
  assert.match(en, /joining a test track alone does not make purchases free/);
  assert.match(tr, /ödeme alınmayacağı/);
  assert.match(en, /you will not be charged/);
  assert.doesNotMatch(tr, /Ücretli satın almalar şu anda etkin değildir/);
  assert.doesNotMatch(en, /Paid purchases are not currently enabled/);
  for (const language of ["tr", "en"]) {
    assert.equal(content[language].terms.updated, "2026-10-10");
    assert.match(renderPage(language, "terms"), /<time datetime="2026-10-10">/);
    assert.ok(renderPage(language, "privacy").includes(`<time datetime="${site.updated}">`), "Unchanged policies keep their previous update date.");
  }
  assert.match(tr, /yeni satın alma yapmak zorunda değilsin/);
  assert.match(en, /not required to make another purchase/);
  assert.match(tr, /normal ücretsiz maçlara girişini engellemez/);
  assert.match(en, /does not close your account or block normal free matches/);
  assert.match(tr, /Diğer para birimine kesinti uygulanmaz/);
  assert.match(en, /No deduction is made from another currency/);
  assert.match(tr, /Bizden kaynaklandığı doğrulanan/);
  assert.match(en, /confirmed to be our responsibility/);
  assert.match(tr, /kalan açık bildirilir/);
  assert.match(en, /any remaining shortfall/);
  assert.match(tr, /otomatik yenilenmezler/i);
  assert.match(en, /do not renew automatically/);
  for (const html of [tr, en]) assert.doesNotMatch(html, /99[,.]99|199[,.]99/);
  assert.match(renderPage("tr", "privacy"), /ücretli satın almaların etkin olduğu anlamına gelmez/);
  assert.match(renderPage("en", "privacy"), /does not mean that paid purchases are enabled/);
});

test("both languages have every public route and a matching language switch", () => {
  for (const language of ["tr", "en"]) {
    for (const page of PAGES) {
      const html = renderPage(language, page);
      assert.match(html, new RegExp(`<html lang="${language}">`));
      assert.ok(html.includes(content[language][page].title));
      assert.ok(html.includes(`href="${pagePath(language === "tr" ? "en" : "tr", page)}" lang=`));
      assert.match(html, /<h1>/);
      assert.match(html, /gridshardgame@gmail\.com/);
    }
  }
});

test("the static site has no game code, credentials, login form or tracking script", () => {
  const files = outputPlan(root, "pub-4974825529326987");
  assert.equal(files.size, 21);
  for (const [file, bytes] of files) {
    assert.doesNotMatch(file, /(?:^|\/)(?:\.env|server|src|node_modules|data|README|content\.js)(?:\/|$)/);
    if (file.endsWith(".html")) {
      assert.doesNotMatch(bytes.toString(), /<script\b|<form\b|localStorage|sessionStorage|Bearer\s|G-[A-Z0-9]+|ca-app-pub-/);
    }
  }
  assert.match(files.get("_headers").toString(), /default-src 'none'/);
  assert.match(files.get("_headers").toString(), /frame-ancestors 'none'/);
  assert.ok(files.has("404.html"), "No implicit single-page app fallback for missing files.");
});

test("only a real correctly shaped public publisher ID generates app-ads.txt", () => {
  assert.equal(adsText("pub-4974825529326987"), "google.com, pub-4974825529326987, DIRECT, f08c47fec0942fa0\n");
  for (const invalid of ["pub-0000000000000000", "pub-example", "ca-app-pub-4974825529326987~1", "4974825529326987", "pub-4974825529326987\nmalicious"]) {
    assert.throws(() => adsText(invalid));
  }
  assert.equal(outputPlan(root, "").has("app-ads.txt"), false);
  assert.equal(fs.readFileSync(path.join(root, "public-site/app-ads.txt"), "utf8").trim(), adsText("pub-4974825529326987").trim());
});

test("public responses opt out of edge transformations and retain plain script-free mailto links", () => {
  const files = outputPlan(root, "pub-4974825529326987");
  const headers = files.get("_headers").toString();
  const globalHeaders = headers.split("/app-ads.txt")[0];
  assert.match(globalHeaders, /^\/\*\r?\n/);
  assert.match(globalHeaders, /Cache-Control: public, max-age=300, no-transform/);
  assert.match(globalHeaders, /Content-Security-Policy: default-src 'none'/);
  assert.doesNotMatch(headers, /script-src|unsafe-inline|unsafe-eval/);
  assert.equal((headers.match(/Cache-Control:/g) || []).length, 1, "Overlapping rules must not duplicate cache directives.");
  for (const language of ["tr", "en"]) {
    for (const page of PAGES) {
      const html = renderPage(language, page);
      assert.match(html, /href="mailto:gridshardgame@gmail\.com/);
      assert.doesNotMatch(html, /__cf_email__|data-cfemail|email-protection|<script\b/);
    }
  }
});

test("deletion instructions work without login or app reinstall and do not request secrets", () => {
  for (const language of ["tr", "en"]) {
    const html = renderPage(language, "delete-account");
    assert.match(html, /mailto:gridshardgame@gmail\.com\?subject=/);
    assert.match(html, /&amp;body=/);
    const subject = decodeURIComponent(html.match(/\?subject=([^&]+)/)[1]);
    assert.equal(subject, content[language].deletionSubject);
    assert.ok(html.includes(content[language]["delete-account"].intro));
    assert.doesNotMatch(html, /<input|<form|fetch\(/);
  }
  assert.match(renderPage("tr", "delete-account"), /Şifre, oturum belirteci/);
  assert.match(renderPage("en", "delete-account"), /Do not send passwords/);
});

test("original branding assets are copied without alteration", () => {
  const files = outputPlan(root, "");
  for (const [source, target] of ASSETS) {
    assert.equal(hash(files.get(target)), hash(fs.readFileSync(path.join(root, source))));
  }
  assert.match(files.get("site.css").toString(), /prefers-reduced-motion/);
});

test("pre-release state and unfinished production policy are disclosed", () => {
  assert.match(renderPage("tr", "home"), /Google Play yayını hazırlanıyor/);
  assert.match(renderPage("en", "home"), /Preparing for Google Play/);
  assert.match(renderPage("tr", "privacy"), /en fazla 30 gün/);
  assert.match(renderPage("tr", "privacy"), /varsayılan olarak kapalıdır/);
  assert.match(renderPage("tr", "privacy"), /genel yayın öncesinde ayrıca doğrulanacaktır/);
  assert.match(renderPage("en", "privacy"), /checked separately before public launch/);
});

test("both privacy translations name the deployed AWS provider, not the former planned Oracle server", () => {
  for (const language of ["tr", "en"]) {
    const html = renderPage(language, "privacy");
    assert.match(html, /Amazon Web Services \/ AWS/);
    assert.match(html, /https:\/\/aws\.amazon\.com\/privacy\//);
    assert.doesNotMatch(html, /Oracle|oracle\.com/);
  }
  assert.match(renderPage("tr", "privacy"), /genel yayın öncesinde/);
  assert.match(renderPage("en", "privacy"), /before public launch/);
});

test("both privacy translations identify the user-confirmed publisher without claiming completed public launch", () => {
  assert.equal(site.publisher, "Alihan ÖZTÜRK");
  for (const language of ["tr", "en"]) {
    const html = renderPage(language, "privacy");
    assert.ok(html.includes(site.publisher));
    assert.match(html, /mailto:gridshardgame@gmail\.com/);
  }
  assert.match(renderPage("tr", "privacy"), /mağaza onayı veya tamamlanmış genel yayın hazırlığı iddiası değildir/);
  assert.match(renderPage("en", "privacy"), /does not claim store approval or completed public-release preparation/);
});

test("both verified scoped retention jobs disclose their safety limits and untested live expiry", () => {
  assert.deepEqual(site.retention, {
    backupDays: 30, supportDaysAfterClosure: 90, backupVerified: true, supportVerified: true,
  });
  const tr = renderPage("tr", "privacy");
  const en = renderPage("en", "privacy");
  assert.match(tr, /Üretim yedekleri için belirlenen süre oluşturulmalarından itibaren 30 gündür/);
  assert.match(tr, /Destek yazışmaları için belirlenen süre kaydedilen kapanıştan itibaren 90 gündür/);
  assert.match(tr, /görev etkinleştirilmiş ve ilk çalışması doğrulanmıştır/);
  assert.match(tr, /30 gün hedefi aşılabilir/);
  assert.match(tr, /Bu görev yeni yedek oluşturmaz/);
  assert.match(en, /production backup period is 30 days from creation/);
  assert.match(en, /support correspondence period is 90 days after the recorded closure/);
  assert.match(en, /first run has been verified/);
  assert.match(en, /30-day target may be exceeded/);
  assert.match(en, /does not create backups or delete copies in other locations/);
  assert.match(tr, /boş kapsamda ilk çalışması doğrulanmıştır/);
  assert.match(tr, /henüz gerçek bir 90 günlük silme gözlenmemiştir/);
  assert.match(tr, /Yeni yanıt gelirse talep yeniden açılır/);
  assert.match(tr, /Etiketlenmemiş eski talepler ve Gmail dışındaki kopyalar/);
  assert.match(tr, /Gmail Çöp Kutusu kopyaları dahil/);
  assert.match(tr, /90 gün hedefi aşılabilir/);
  assert.match(en, /first empty-scope run has been verified/);
  assert.match(en, /no real 90-day deletion has yet been observed/);
  assert.match(en, /A new reply reopens the request/);
  assert.match(en, /Unlabeled older requests and copies outside Gmail/);
  assert.match(en, /including relevant Gmail Trash copies/);
  assert.match(en, /90-day target may be exceeded/);
  assert.doesNotMatch(tr, /devreye alındığı henüz doğrulanmamıştır/);
  assert.doesNotMatch(en, /Activation of the support email deletion process has not yet been verified/);
  assert.doesNotMatch(en, /do not claim that automated backup/);
});

test("both privacy translations describe the limits the game enforces for all players, without claiming legal compliance", () => {
  assert.equal(site.updated, "2026-10-09");
  const tr = renderPage("tr", "privacy");
  const en = renderPage("en", "privacy");
  // Preset-only chat and the public name filter.
  assert.match(tr, /Takım sohbetinde ve özel mesajda serbest yazı yoktur/);
  assert.match(en, /Team chat and private messages have no free-text entry/);
  assert.match(tr, /adına gerçek adını, okulunu veya telefon numaranı yazma/);
  assert.match(en, /do not put your real name, school or phone number in a name/);
  // Parental controls.
  assert.match(tr, /Ebeveyn Denetimi bölümünden/);
  assert.match(tr, /Şifrenin kendisi saklanmaz/);
  assert.match(en, /Parental Controls; turning them back on requires the same passcode/);
  assert.match(en, /The passcode itself is not stored/);
  // Sign-in providers are not asked for an email; no new email or phone is taken.
  assert.match(tr, /yalnız sağlayıcının verdiği hesap kimliği saklanır/);
  assert.match(tr, /Oyun yeni e-posta adresi veya telefon numarası almaz/);
  assert.match(en, /only the account identifier supplied by the provider is stored/);
  assert.match(en, /does not take new email addresses or phone numbers/);
  // Embedded typefaces and child-directed ad requests.
  assert.match(tr, /üçüncü taraf bir yazı tipi hizmetine istek göndermez/);
  assert.match(en, /does not contact a third-party font service at startup/);
  assert.match(tr, /çocuklara yönelik, genel izleyiciye uygun ve kişiselleştirilmemiş/);
  assert.match(en, /child-directed, suitable for general audiences and non-personalised/);
  // Age is asked in one place only: before optional analytics can be turned on.
  assert.match(tr, /Oyun oynamak için yaş sorulmaz/);
  assert.match(en, /You are not asked for your age to play/);
  assert.match(tr, /önce doğum yılın sorulur; yıl saklanmaz/);
  assert.match(en, /first asked for your year of birth; the year is not stored/);
  assert.match(tr, /18 yaşından küçükler için analitik açılmaz/);
  assert.match(en, /Analytics is not turned on for players under 18/);
  assert.match(tr, /Bu bölüm teknik uygulamayı anlatır/);
  assert.match(en, /This section describes the technical implementation/);
  for (const html of [tr, en]) assert.doesNotMatch(html, /COPPA|GDPR|uyumludur|is compliant|complies with/);
});

test("the privacy statements above still match the code they describe", () => {
  const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
  // Sign-in asks Google only for the account identity and never stores an email.
  const platform = read("server", "app", "platform_services.py");
  assert.ok(platform.includes('params["scope"] = "openid"'));
  assert.doesNotMatch(platform, /openid email|"name email"/);
  assert.doesNotMatch(platform, /account\["contacts"\]\["email"\] = \{\s*"value": email/);
  // New email/phone linking is rejected; chat accepts preset identifiers only.
  const gateway = read("server", "app", "main.py");
  assert.ok(gateway.includes("CONTACT_BINDING_CLOSED_MESSAGE"));
  assert.ok(gateway.includes("_require_social_open(player_id, request.recipient_id.strip())"));
  assert.ok(read("server", "app", "safe_chat.py").includes("def require_preset_message"));
  assert.ok(read("server", "app", "text_safety.py").includes("def public_name_rejection"));
  // Analytics needs an adult answer to the birth-year question; the year itself is never stored.
  const settings = read("server", "app", "player_settings.py");
  assert.ok(settings.includes("ANALYTICS_MINIMUM_AGE = 18"));
  assert.ok(settings.includes('and settings.get("analytics_age_gate") == ANALYTICS_AGE_ADULT'));
  assert.doesNotMatch(settings.slice(settings.indexOf("class PlayerSettings:"), settings.indexOf("class PlayerSettingsError")), /birth/);
  assert.ok(gateway.includes("and analytics_enabled(snapshot.settings)"));
  // The parental passcode is stored as a salted digest only.
  assert.ok(platform.includes('"pin_hash": self._parental_pin_hash(pin, salt)'));
  // The client loads no external typeface or script.
  const client = read("client", "index.html");
  assert.doesNotMatch(client, /fonts\.(?:googleapis|gstatic)\.com/);
  // Ad requests are child-directed and non-personalised; the advertising ID permission is removed.
  const ads = read("client", "src", "native-store.js");
  assert.match(ads, /tagForChildDirectedTreatment: true/);
  assert.match(ads, /maxAdContentRating: "General"/);
  assert.match(ads, /npa:true/);
  assert.match(read("android", "app", "src", "main", "AndroidManifest.xml"), /com\.google\.android\.gms\.permission\.AD_ID" tools:node="remove"/);
});
