// Public allowlist only: no accounts, traces, runtime databases, credentials or logs.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||'C:/Users/S-A/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),proof=path.join(root,'artifacts/store-final-20261101');
const out=path.join(root,'deliverables/GRIDSHARD_MAGAZA_2026-11-01');
const shots=['01-circuit-battle','02-core-power','03-module-classes','04-core-collection','05-circuit-road','06-module-talents','07-shop-collage','08-home'];
const banner='C:/Users/S-A/.codex/generated_images/01a17e1e-a7f2-72f0-916e-bb574e0de13c/exec-e596dad4-959e-4540-920d-0437a7065bc5.png';
const write=(name,text)=>fs.writeFileSync(path.join(out,name),text+'\n','utf8');
async function collage(lang,dest){
  const tr=lang==='tr-TR',parts=path.join(proof,lang+'-shop-parts');
  const pieces=[
    {file:path.join(parts,'chests.png'),crop:{left:0,top:0,width:960,height:1490},width:484,left:40,top:196},
    {file:path.join(parts,'odds.png'),width:460,left:580,top:196},
    {file:path.join(parts,'premium-screen.png'),crop:{left:70,top:445,width:940,height:930},width:720,left:180,top:1140},
  ];
  const title=tr?'MAĞAZA':'SHOP',sub=tr?'Sandıklar · Ödül listesi · Premium':'Chests · Reward list · Premium';
  const svg=Buffer.from(`<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#173d61"/><stop offset="1" stop-color="#061326"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#bg)"/><path d="M40 162H1040M40 1080H1040" stroke="#4bd2cb" stroke-width="2" opacity=".5"/><text x="540" y="82" text-anchor="middle" fill="#fff1c1" font-family="Arial" font-weight="800" font-size="54">${title}</text><text x="540" y="132" text-anchor="middle" fill="#c5e8f2" font-family="Arial" font-size="29">${sub}</text><text x="540" y="1120" text-anchor="middle" fill="#69e5d3" font-family="Arial" font-weight="700" font-size="28">${tr?'SEZON VE SAVAŞ PREMIUM':'SEASON AND BATTLE PREMIUM'}</text><text x="540" y="1891" text-anchor="middle" fill="#9ebdcd" font-family="Arial" font-size="23">${tr?'Gerçek oyun ekranlarından hazırlanmıştır.':'Composed from actual game screens.'}</text></svg>`);
  const layers=[];
  for(const p of pieces){let s=sharp(p.file);if(p.crop)s=s.extract(p.crop);layers.push({input:await s.resize({width:p.width}).png().toBuffer(),left:p.left,top:p.top});}
  await sharp(svg).composite(layers).removeAlpha().png().toFile(dest);
}
async function main(){
  if(fs.existsSync(path.join(out,'manifest.json'))&&!process.argv.includes('--refresh'))throw new Error('Final package exists; use an explicit refresh only before delivery.');
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'ortak'),{recursive:true});
  await sharp(banner).resize(1024,500,{fit:'fill'}).removeAlpha().png().toFile(path.join(out,'ortak/feature-graphic-1024x500.png'));
  fs.copyFileSync(path.join(root,'artifacts/store-2.1.1-20261022/app-icon-512.png'),path.join(out,'ortak/app-icon-512.png'));
  for(const lang of ['tr-TR','en-US']){
    const evidence=JSON.parse(fs.readFileSync(path.join(proof,lang+'-capture.json'),'utf8'));
    if(evidence.status!=='passed')throw new Error('Missing authentic capture evidence '+lang);
    fs.mkdirSync(path.join(out,lang,'screenshots'),{recursive:true});
    for(const [source,target] of [['app-name.txt','app-name.txt'],['short-'+lang+'.txt','short-description.txt'],['full-'+lang+'.txt','full-description.txt'],['release-notes-'+lang+'.txt','release-notes.txt']])fs.copyFileSync(path.join(root,'artifacts/play-store-audit-20261101/proposed-text',source),path.join(out,lang,target));
    for(const name of shots){const target=path.join(out,lang,'screenshots',name+'.png');if(name==='07-shop-collage')await collage(lang,target);else await sharp(path.join(proof,lang,name+'.png')).removeAlpha().png().toFile(target);}
  }
  fs.copyFileSync(path.join(root,'artifacts/play-store-audit-20261101/proposed-text/release-notes-console.txt'),path.join(out,'SURUM_NOTLARI_PLAY_CONSOLE.txt'));
  write('README.md',`# GRIDSHARD — mağaza teslimi, 1 Kasım 2026

Bu paket yeni 24 modüllü / 3 sınıflı Akım V8 sürümü içindir. Google Play'e yüklenmedi. Yeni sunucu ve uyumlu Android sürümüyle birlikte yayımlanmalıdır. Yayın adayı 2.2.0 / Android sürüm kodu 11 olarak hazırlanmıştır.

## Dosyaların karşılığı

- tr-TR ve en-US: uygulama adı, kısa açıklama, tam açıklama ve sürüm notları; her dilin kendi gerçek arayüzünde çekilmiş 8 telefon görseli.
- ortak/app-icon-512.png: mevcut onaylı 512×512 ikon korunmuştur.
- ortak/feature-graphic-1024x500.png: yeni 1024×500 tanıtım afişi; bataryalar kaldırıldı, atış yalnız karşı platforma gider, boşta silahlar Onarım/Güçlendirici ile değiştirildi.
- SURUM_NOTLARI_PLAY_CONSOLE.txt: Play Console için dil etiketli yeni sürüm notları.
- index.html: çevrimdışı görsel ve metin önizlemesi. Mağazaya yükleme dosyası değildir.
- manifest.json: ölçü, metin sınırı, SHA-256 ve görsel kaynağı kaydı.

## Telefon görselleri — yükleme sırası

1. Devre savaşı
2. Gerçek çekirdek gücü
3. Saldırı / Savunma / Taktik kartları
4. Çekirdek koleksiyonu
5. Devre Yolu
6. Modül yetenekleri
7. Mağaza kolajı: gerçek sandık, ödül listesi ve premium ekranlarından kesitler
8. Ana ekran ve savaş destesi

Tüm telefon görselleri 1080×1920, opak PNG'dir. 7. görsel kullanıcının istediği kolajdır; arayüz içerikleri yeniden çizilmedi veya yapay zekâyla üretilmedi. Diğerleri değiştirilmemiş gerçek oyun çekimleridir. Çekimler yalıtılmış test sunucusunda yeni misafir hesapları ve gerçek yapay zekâ savaşıyla alındı. Gerçek oyuncu hesabı, cüzdan eklemesi veya sahte oyun durumu kullanılmadı. Ekrandaki TL tutarları çekim anındaki oyun içi katalog değerleridir.

## Metin özeti

24 modül, üç sınıf, 7 çekirdek, 12 arena. Başlangıç 7 / depo 12 Akım; pasif +1/3 sn. Saldırının 100 gerçek hasarı VE Savunma modüllerinin 50 yeni CAN kaybı birlikte ek +1 Akım getirir. Enerji/Isı kaldırılmıştır. Sezonluk yeni modüller henüz yayımlanmış özellik gibi vaat edilmedi.

## Üretim kaydı

Afiş yerleşik image_gen aracıyla düzenlendi; istemler GORSEL_URETIM_KAYDI.md içinde. İkon yeniden üretilmedi. Kolaj yalnız gerçek ekran kesitlerinin teknik yerleşimidir. Bu klasöre hesap verisi, sunucu günlüğü, anahtar veya test izi alınmadı.
`);
  let html='<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GRIDSHARD mağaza paketi</title><style>body{margin:0;background:#071427;color:#d9edf5;font:16px/1.6 system-ui}main{max-width:1260px;margin:auto;padding:32px}h1,h2{color:#ffe29a}a{color:#72ead8}.banner{width:100%;max-width:1024px;border-radius:16px}.icon{width:100px;vertical-align:middle;margin-right:20px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0}figure img{width:100%;border-radius:12px}figcaption{font-size:13px;color:#a9c6d5}pre{white-space:pre-wrap;background:#10283e;padding:24px;border-radius:16px}@media(max-width:760px){.grid{grid-template-columns:repeat(2,1fr)}}</style><main><h1><img class="icon" src="ortak/app-icon-512.png">GRIDSHARD · mağaza teslimi</h1><p>1 Kasım 2026 · Türkçe / English · Henüz yayımlanmadı</p><img class="banner" src="ortak/feature-graphic-1024x500.png">';
  for(const lang of ['tr-TR','en-US']){html+=`<h2>${lang}</h2><div class="grid">`+shots.map(n=>`<figure><a href="${lang}/screenshots/${n}.png"><img src="${lang}/screenshots/${n}.png"></a><figcaption>${n}</figcaption></figure>`).join('')+'</div>';for(const name of ['short-description','full-description','release-notes']){const text=fs.readFileSync(path.join(out,lang,name+'.txt'),'utf8').replaceAll('&','&amp;').replaceAll('<','&lt;');html+=`<h3>${name}</h3><pre>${text}</pre>`;}}
  html+='</main></html>';write('index.html',html);
  const files=[];
  function list(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(dir,e.name)):[path.join(dir,e.name)]);}
  for(const file of list(out).filter(f=>path.basename(f)!=='manifest.json')){const relative=path.relative(out,file).replaceAll('\\','/'),bytes=fs.readFileSync(file);const item={path:relative,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
    if(file.endsWith('.png')){const m=await sharp(file).metadata();Object.assign(item,{width:m.width,height:m.height,alpha:m.hasAlpha});if(relative.includes('screenshots/')&&(m.width!==1080||m.height!==1920||m.hasAlpha))throw new Error('Invalid screenshot '+relative);if(relative.includes('feature-graphic')&&(m.width!==1024||m.height!==500||m.hasAlpha))throw new Error('Invalid banner');if(relative.includes('app-icon')&&(m.width!==512||m.height!==512||bytes.length>1024*1024))throw new Error('Invalid icon');}
    if(/(app-name|short-description|full-description|release-notes)\.txt$/.test(file)){const limit=relative.endsWith('app-name.txt')?30:relative.endsWith('short-description.txt')?80:relative.endsWith('full-description.txt')?4000:500;const chars=[...bytes.toString('utf8').trim()].length;Object.assign(item,{characters:chars,limit});if(chars>limit)throw new Error('Text too long '+relative);}
    files.push(item);
  }
  const manifest={release_version:'2.2.0',android_version_code:11,prepared_at:'2026-11-01',published:false,release:'2.2.0 / Android versionCode 11',languages:['tr-TR','en-US'],phone_screenshots_per_language:8,artwork_tool:'built-in image_gen',capture:'Actual isolated local game, 360x640 at DPR 3; actual server combat and core effect',collage:'07 only: deterministic layout of real shop screen crops',checks:{png_dimensions:'passed',text_limits:'passed',capture_javascript_errors:0,capture_missing_images:0,capture_horizontal_overflow:0},files};
  write('manifest.json',JSON.stringify(manifest,null,2));console.log('Package validated: 16 phone images, approved icon, new banner, TR/EN copy and release notes. '+out);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
