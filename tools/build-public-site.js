"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { site, content } = require("../public-site/content.js");

const PAGES = ["home", "support", "privacy", "terms", "delete-account"];
const ASSETS = [
  ["client/assets/branding/gridshard-emblem.webp", "assets/gridshard-emblem.webp"],
  ["client/assets/branding/gridshard-favicon-32.png", "assets/gridshard-favicon-32.png"],
  ["client/assets/branding/gridshard-favicon-192.png", "assets/gridshard-favicon-192.png"],
  ["client/favicon.ico", "favicon.ico"],
];
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");

function pagePath(language, page) {
  return `${language === "en" ? "/en" : ""}/${page === "home" ? "" : `${page}/`}`;
}

function sectionHtml(section, language, dictionary) {
  const list = (tag, items) => items ? `<${tag}>${items.map((text) => `<li>${escape(text)}</li>`).join("")}</${tag}>` : "";
  const action = section.action === "deletion" ? `<a class="button" href="${escape(deletionMail(language))}">${escape(dictionary.deletionAction)}</a>` : "";
  return `<section><h2>${escape(section.title)}</h2>${(section.paragraphs || []).map((text) => `<p>${escape(text)}</p>`).join("")}${list("ul", section.bullets)}${list("ol", section.steps)}${action}${section.link ? `<p><a href="${pagePath(language, section.link.page)}">${escape(section.link.text)}</a></p>` : ""}${section.external ? `<div class="external-links">${section.external.map((link) => `<a href="${escape(link.href)}" rel="noreferrer">${escape(link.text)}</a>`).join("")}</div>` : ""}</section>`;
}

function deletionMail(language) {
  return `mailto:${site.email}?subject=${encodeURIComponent(content[language].deletionSubject)}&body=${encodeURIComponent(content[language].deletionBody)}`;
}

function renderPage(language, page) {
  const dictionary = content[language];
  const copy = dictionary[page];
  const updated = copy.updated || site.updated;
  const other = language === "tr" ? "en" : "tr";
  const contact = `<aside class="contact"><p>${escape(dictionary.contact)}</p><a href="mailto:${site.email}">${site.email}</a></aside>`;
  const main = page === "home"
    ? `<section class="hero"><div><p class="eyebrow">${escape(copy.eyebrow)}</p><h1>${escape(copy.headline).replace("\n", "<br>")}</h1><p class="intro">${escape(copy.intro)}</p><p class="status">${escape(copy.status)}</p><p class="status-note">${escape(copy.statusNote)}</p><a class="button" href="${pagePath(language, "support")}">${escape(dictionary.nav.support)}</a></div><div class="hero-art" aria-hidden="true"><img src="/assets/gridshard-emblem.webp" width="340" height="340" alt="" fetchpriority="high"></div></section><section class="features">${copy.features.map((feature) => `<article class="card"><h2>${escape(feature.title)}</h2><p>${escape(feature.text)}</p></article>`).join("")}</section>`
    : `<article class="document"><p class="eyebrow">${escape(copy.eyebrow)}</p><h1>${escape(copy.headline)}</h1><p class="intro">${escape(copy.intro)}</p><p class="updated">${escape(dictionary.updated)}: <time datetime="${updated}">${new Intl.DateTimeFormat(dictionary.locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${updated}T00:00:00Z`))}</time></p>${contact}${copy.sections.map((section) => sectionHtml(section, language, dictionary)).join("")}</article>`;
  return `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#07142b"><title>${escape(copy.title)}</title><meta name="description" content="${escape(copy.description)}"><link rel="canonical" href="${site.origin}${pagePath(language, page)}"><link rel="alternate" hreflang="tr" href="${site.origin}${pagePath("tr", page)}"><link rel="alternate" hreflang="en" href="${site.origin}${pagePath("en", page)}"><link rel="alternate" hreflang="x-default" href="${site.origin}${pagePath("tr", page)}"><link rel="icon" href="/favicon.ico"><link rel="icon" type="image/png" sizes="32x32" href="/assets/gridshard-favicon-32.png"><link rel="apple-touch-icon" sizes="192x192" href="/assets/gridshard-favicon-192.png"><link rel="stylesheet" href="/site.css"></head>
<body><a class="skip" href="#main">${escape(dictionary.skip)}</a><header><div class="shell header-inner"><a class="brand" href="${pagePath(language, "home")}"><img src="/assets/gridshard-emblem.webp" width="40" height="40" alt="">GRIDSHARD</a><nav aria-label="${language === "tr" ? "Ana gezinme" : "Main navigation"}">${PAGES.map((item) => `<a href="${pagePath(language, item)}"${item === page ? ' aria-current="page"' : ""}>${escape(dictionary.nav[item])}</a>`).join("")}<a class="language" href="${pagePath(other, page)}" lang="${other}" hreflang="${other}">${escape(dictionary.otherLanguage)}</a></nav></div></header><main id="main" class="shell">${main}</main><footer><div class="shell footer-inner"><span>${escape(dictionary.footer)}</span><a href="mailto:${site.email}">${site.email}</a></div></footer></body></html>
`;
}

function adsText(publisherId) {
  if (!/^pub-\d{16}$/.test(publisherId)) throw new Error("AdMob publisher ID must have the form pub- followed by 16 digits.");
  if (publisherId === "pub-0000000000000000") throw new Error("An example publisher ID cannot be published.");
  return `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;
}

function outputPlan(root, publisherId) {
  const files = new Map();
  for (const language of Object.keys(content)) {
    for (const page of PAGES) files.set(`${pagePath(language, page).slice(1)}index.html`, Buffer.from(renderPage(language, page)));
  }
  files.set("site.css", fs.readFileSync(path.join(root, "public-site/site.css")));
  for (const [source, target] of ASSETS) {
    const sourcePath = path.join(root, source);
    if (fs.lstatSync(sourcePath).isSymbolicLink()) throw new Error(`Symbolic-link source rejected: ${source}`);
    files.set(target, fs.readFileSync(sourcePath));
  }
  // Preserve plain mailto links and the script-free CSP at the Cloudflare edge.
  // https://developers.cloudflare.com/web-analytics/get-started/#sites-proxied-through-cloudflare
  files.set("_headers", Buffer.from(`/*
  Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cache-Control: public, max-age=300, no-transform
/app-ads.txt
  Content-Type: text/plain; charset=utf-8
`));
  files.set("_redirects", Buffer.from("/privacy /privacy/ 301\n/terms /terms/ 301\n/delete-account /delete-account/ 301\n/support /support/ 301\n/en /en/ 301\n/en/privacy /en/privacy/ 301\n/en/terms /en/terms/ 301\n/en/delete-account /en/delete-account/ 301\n/en/support /en/support/ 301\n"));
  files.set("404.html", Buffer.from(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GRIDSHARD — 404</title><link rel="stylesheet" href="/site.css"></head><body><main class="shell document"><h1>404</h1><p>Sayfa bulunamadı / Page not found.</p><p><a href="/">Türkçe</a> · <a href="/en/">English</a></p></main></body></html>\n`));
  files.set("robots.txt", Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`));
  files.set("sitemap.xml", Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(content).flatMap((language) => PAGES.map((page) => `<url><loc>${site.origin}${pagePath(language, page)}</loc></url>`)).join("")}</urlset>\n`));
  // Never emit a fake ID or a placeholder that could be mistaken for verified advertising.
  if (publisherId) files.set("app-ads.txt", Buffer.from(adsText(publisherId)));
  return files;
}

function inspectExisting(directory, expected, prefix = "") {
  if (!fs.existsSync(directory)) return;
  if (fs.lstatSync(directory).isSymbolicLink()) throw new Error("Symbolic-link output directory rejected.");
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symbolic-link output rejected: ${relative}`);
    if (entry.isDirectory()) inspectExisting(path.join(directory, entry.name), expected, `${relative}/`);
    else if (!expected.has(relative)) throw new Error(`Unexpected existing file; nothing was overwritten: ${relative}`);
  }
}

function buildPublicSite({ root = path.resolve(__dirname, ".."), publisherId } = {}) {
  const output = path.join(root, "build/public-site");
  for (const relative of ["build", "build/public-site"]) {
    const candidate = path.join(root, relative);
    if (fs.existsSync(candidate) && fs.lstatSync(candidate).isSymbolicLink()) throw new Error("Output must not pass through a symbolic link.");
  }
  if (publisherId === undefined) {
    const adsPath = path.join(root, "public-site/app-ads.txt");
    if (fs.existsSync(adsPath)) {
      if (fs.lstatSync(adsPath).isSymbolicLink()) throw new Error("Symbolic-link app-ads.txt source rejected.");
      const supplied = fs.readFileSync(adsPath, "utf8").trim();
      const match = /^google\.com, (pub-\d{16}), DIRECT, f08c47fec0942fa0$/.exec(supplied);
      if (!match) throw new Error("The public app-ads.txt line is invalid.");
      publisherId = match[1];
    } else publisherId = "";
  }
  const files = outputPlan(root, publisherId);
  inspectExisting(output, files);
  for (const [relative, bytes] of files) {
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
  }
  const manifest = {
    site: site.origin, contact: site.email, updated: site.updated,
    appAdsConfigured: Boolean(publisherId),
    // A working URL or an approved duration does not prove operational retention.
    privacyRetentionVerified: Boolean(site.retention?.backupVerified && site.retention?.supportVerified),
    retentionEvidence: { backupVerified: site.retention.backupVerified, supportVerified: site.retention.supportVerified },
    approvedRetention: { backupDays: site.retention.backupDays, supportDaysAfterClosure: site.retention.supportDaysAfterClosure },
    files: [...files].map(([file, bytes]) => ({ file, size: bytes.length, sha256: digest(bytes) })),
    pending: [...(site.retention.backupVerified ? [] : ["Production backup retention activation and target-age review"]), ...(site.retention.supportVerified ? [] : ["Support email retention permission, dry-run, activation and trigger verification"]), "Final public privacy deployment and live-copy verification", "Live game server and payment/ad consent/provider validation", ...(publisherId ? [] : ["AdMob public publisher ID and app-ads.txt verification"])],
  };
  fs.writeFileSync(path.join(root, "build/public-site-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { output, manifest };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--publisher-id")) throw new Error("Usage: node tools/build-public-site.js [--publisher-id pub-XXXXXXXXXXXXXXXX]");
  const result = buildPublicSite({ publisherId: args[1] });
  console.log(`Public site: ${result.manifest.files.length} allowlisted files. app-ads.txt: ${result.manifest.appAdsConfigured ? "configured (not remotely verified)" : "omitted; waiting for the real AdMob publisher ID"}.`);
  console.log(result.output);
}

module.exports = { buildPublicSite, outputPlan, renderPage, pagePath, adsText, ASSETS, PAGES };
