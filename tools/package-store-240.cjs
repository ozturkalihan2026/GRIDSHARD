const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/S-A/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),proof=path.join(root,'artifacts/store-240-20261113'),out=path.join(root,'deliverables/GRIDSHARD_MAGAZA_2.4.0_2026-11-13');
const shots=['01-circuit-battle','02-core-power','03-module-classes','04-core-collection','05-circuit-road','06-module-talents','07-shop','08-home'];
const copy={
 'tr-TR':{short:'Desteni kur, çekirdeğini yönet ve gerçek zamanlı devre savaşlarında yarış.',full:`GRIDSHARD, dikey ekranda oynanan gerçek zamanlı bir devre savaşı oyunudur. Altı modül kartından oluşan desteni ve çekirdeğini seç. Modüllerini doğru anda devreye al, savunmanı kur ve rakibinin çekirdeğini yok et.

Üç sınıf, birlikte çalışan bir devre
Saldırı ateş eder, Savunma korur, Taktik onarım, güçlendirme ve rakibi bozma gibi avantajlar sağlar. Üç sınıftaki 24 modülle farklı desteler kur. Modüllerini oyun içinde kazandığın parçalarla yükselt ve yeteneklerini oyun tarzına göre belirle.

Savaş durmaz
Yeterli Akımın olduğunda bir karta dokun; uygun boş hücre otomatik seçilir. Hücreleri veya her atışı tek tek yönetmen gerekmez. Saldırı ve savunmayı birlikte kullan, kaynaklarını ve kartlarının zamanlamasını yönet.

Çekirdeğin savaşın merkezinde
7 çekirdek farklı savaş güçleri sunar. Gücü dolduğunda dokun; çekirdeğin türüne göre özel hamleni kullan. Çekirdek seçimin ve destenin birlikte çalışması savaşın gidişini değiştirebilir.

Koleksiyonunu oyun oynayarak geliştir
Devre Yolu'nda kupalar kazan; modüller, çekirdekler ve ödüller aç. Görevlerini takip et, oyun içi kaynaklarınla sandıklar aç. Sandık içerikleri ve olasılıkları açılıştan önce gösterilir. Sezonlar ve turnuvalar oyun içindeki takvime göre açılır; başlangıçları Etkinlikler ve mesaj kutusundan takip edebilirsin.

Birlikte oyna
Takım kur veya bir takıma katıl, modül parçalarını paylaş. Arkadaşlarınla dostluk maçı yap. Kupa sayına uygun rakiplerle eşleş; uygun insan rakip bulunamadığında yapay zekâ rakiplere karşı oyna.

Bilmen gerekenler
• Oyun ücretsizdir. Gerçek parayla satın alma ve reklam gösterimi bulunmaz.
• İnternet bağlantısı gerekir.
• Misafir olarak başlayabilirsin.
• Türkçe ve İngilizce dil seçenekleri bulunur.
• Hazır savaş mesajları ve ebeveyn denetimleri bulunur.

Destek: gridshardgame@gmail.com
Site: https://gridshardgame.com`},
 'en-US':{short:'Build your deck, command your core and compete in real-time circuit battles.',full:`GRIDSHARD is a real-time circuit battle game built for portrait play. Choose a six-module deck and your core. Deploy at the right moment, protect your circuit and destroy the opposing core.

Three classes, one connected strategy
Attack modules fire, Defense modules protect, and Tactics modules repair, strengthen or disrupt. Build different decks with 24 modules across three classes. Upgrade modules with shards earned by playing and choose talents that fit your style.

The battle keeps moving
Tap a card when you have enough Current; a suitable empty cell is selected automatically. You do not need to choose every cell or manage every shot. Combine attack and defense while managing resources and timing.

Your core is at the heart of the battle
Seven cores offer different battle powers. Activate your core when its charge is ready. Find a core and deck combination that supports your strategy.

Grow your collection by playing
Earn trophies on Circuit Road to unlock modules, cores and rewards. Follow your missions and open chests with resources earned in the game. Chest contents and odds are shown before opening. Seasons and tournaments open according to the in-game schedule; follow announcements in Events and your inbox.

Play together
Create or join a team and share module shards. Challenge friends to friendly battles. Match with opponents near your trophy level; when a suitable human opponent is unavailable, play against AI opponents.

Good to know
• Free to play, with no real-money purchases or ads.
• An internet connection is required.
• Guest play is available.
• Turkish and English are supported.
• Preset battle messages and parental controls are available.

Support: gridshardgame@gmail.com
Website: https://gridshardgame.com`}}
;(async()=>{
 if(fs.existsSync(out))throw Error('Store delivery already exists; do not overwrite');fs.mkdirSync(out,{recursive:true});
 const files=[];
 for(const language of ['tr-TR','en-US']){
  const menu=JSON.parse(fs.readFileSync(path.join(proof,language+'-menus.json'),'utf8'));const battle=JSON.parse(fs.readFileSync(path.join(proof,language+'-battle.json'),'utf8'));
  if(menu.errors.length||menu.missing.length||menu.checks.length!==6||battle.status!=='passed'||battle.page_errors.length)throw Error('Invalid capture evidence '+language);
  const dir=path.join(out,language,'screenshots');fs.mkdirSync(dir,{recursive:true});
  for(const name of shots){const dest=path.join(dir,name+'.png');await sharp(path.join(proof,language,name+'.png')).removeAlpha().png().toFile(dest);const meta=await sharp(dest).metadata();if(meta.width!==1080||meta.height!==1920||meta.hasAlpha)throw Error('Invalid image '+dest);}
  for(const [name,body,limit] of [['app-name','GRIDSHARD',30],['short-description',copy[language].short,80],['full-description',copy[language].full,4000]]){if([...body].length>limit)throw Error('Text too long');fs.writeFileSync(path.join(out,language,name+'.txt'),body+'\n');}
 }
 const readme=`# GRIDSHARD 2.4.0 — mağaza görselleri\n\nTürkçe ve İngilizce için ayrı ayrı 8 adet 1080×1920 PNG telefon görseli.\nYükleme sırası dosya adlarındaki 01–08 sırasıdır. Görüntüler güncel oyundan alınmıştır; sahte arayüz, değiştirilmiş oyun sonucu veya üretilmiş savaş sahnesi yoktur. 01–02 gerçek yerel dostluk maçı ve çekirdek etkinleştirmesidir. Diğerleri gerçek menülerdir. Üretim oyuncularına dokunulmadı.\n\nEski mağaza paketindeki07-shop-collage.png Premium satın alma alanı içerir; bunu yeniden yüklemeyin. Yeni 07-shop.png yalnız oyun içi kaynak sandıklarını gösterir. Ortak sanat yönü oyun içindeki gerçek varlıklardan korunur. Mevcut onaylı ikon ve tanıtım afişi bu işlemde değiştirilmez.\n\nMetinlerdeki reklamsız/gerçek para alımsız beyanı, tüm 10 Play satın alma seçeneği kapatıldıktan ve 2.4.0 onaylanıp dağıtıldıktan sonra geçerli durumla birlikte yayımlanmalıdır. Günlük giriş/sezon ödüllerini sezon öncesi aktif gibi tanıtan ifade yoktur.\n\nPlay Console: Kullanıcı sayısını artırın → Mağazada bulunma → Mağaza girişleri → Ana mağaza girişi. Her dilin Telefon ekran görüntüleri alanında eskileri yeni 8 dosyayla değiştirin.7 inç/10 inç tablet, Chromebook, TV gibi diğer alanlardaki eski Premium görsellerini ayrıca kontrol edin; bu telefon dosyaları tablet görüntüsü değildir. Açıklama dosyaları aynı dil klasöründedir.\n\nBu dosyalar hazırlanmıştır; Console'a yüklenmemiştir.\n`;
 fs.writeFileSync(path.join(out,'README.md'),readme);
 let html='<!doctype html><html lang="tr"><meta charset="utf-8"><title>GRIDSHARD 2.4.0 mağaza önizlemesi</title><style>body{background:#071427;color:#edf6fc;font:16px system-ui;padding:24px}section{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}img{width:100%}figure{margin:0}a{color:#69e5d3}@media(max-width:700px){section{grid-template-columns:repeat(2,1fr)}}</style><h1>GRIDSHARD · 2.4.0</h1><p>Yeni telefon görselleri · Henüz Console’a yüklenmedi</p>';
 for(const language of ['tr-TR','en-US'])html+=`<h2>${language}</h2><section>`+shots.map(n=>`<figure><a href="${language}/screenshots/${n}.png"><img src="${language}/screenshots/${n}.png"></a><figcaption>${n}</figcaption></figure>`).join('')+'</section>';
 fs.writeFileSync(path.join(out,'index.html'),html+'</html>');
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
 for(const file of walk(out)){const data=fs.readFileSync(file),entry={path:path.relative(out,file).replaceAll('\\','/'),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};if(file.endsWith('.png')){const m=await sharp(file).metadata();Object.assign(entry,{width:m.width,height:m.height,alpha:m.hasAlpha})}files.push(entry)}
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({version:'2.4.0',source_commit:'825cbe27c10407a729aeb50393f4979fdba96152',uploaded:false,languages:['tr-TR','en-US'],screenshots_per_language:8,authentic_gameplay:true,gameplay_modified:false,files},null,2));console.log(JSON.stringify({directory:out,phone_screenshots:16,text_limits:'passed',image_dimensions:'1080x1920',paid_shop_collage_included:false}));
})().catch(e=>{console.error(e.stack);process.exitCode=1});
