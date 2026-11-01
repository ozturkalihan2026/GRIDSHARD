"""Build a reproducible report from measured battles, never fabricated rates."""
from pathlib import Path
from statistics import median
from collections import Counter
import json,math
ROOT=Path(__file__).resolve().parents[1]
def read(name,file='summary.json'):return json.loads((ROOT/'artifacts'/name/file).read_text(encoding='utf8'))
def pct(w,n):return round(100*w/n,2) if n else None
def metrics(rows):
 times=sorted(r['seconds'] for r in rows if r['finished'])
 return {'games':len(rows),'finished':len(times),'timeouts':len(rows)-len(times),
   'median_seconds':median(times),'p90_seconds':times[math.ceil(len(times)*.9)-1],
   'max_seconds':max(times),'median_first_loss_seconds':median(r['first_loss_seconds'] for r in rows if r['first_loss_seconds'] is not None)}

if __name__=='__main__':
 before=read('strategy-v7-holdout-before');after=read('strategy-v7-holdout')
 old=read('strategy-v7-holdout-before','battles.json');new=read('strategy-v7-holdout','battles.json')
 assert len(old)==len(new)==648
 for a,b in zip(old,new):
  for key in ('policies','deck_index','decks','core','level','seed','swapped','talents'):assert a[key]==b[key],key
 assert all(r['finished'] for r in new)
 shared=read('strategy-v7-final-shared-v3');camp=read('strategy-v7-camp')
 economy=[]
 for name in ('strategy-v7-third-buffer','strategy-v7-econ-final-2500-100','strategy-v7-econ-final-3000-200','strategy-v7-econ-final-3000-100'):
  d=read(name);p=d['pairs']['attack_vs_mixed'];economy.append({'artifact':name,'regen_ms':d['passive_current_ms'],'threshold':d['damage_current_threshold'],
    'mixed_vs_attack_wins':p['right_wins'],'mixed_vs_attack_games':p['games'],'median_seconds':d['seconds_median_finished'],'timeouts':d['timeouts']})
 percore={}
 for core in after['cores']:
  subset=[r for r in new if r['core']==core and set(r['policies'].values())=={'attack','mixed'}]
  percore[core]={'mixed_wins':sum(r['winner_policy']=='mixed' for r in subset),'games':len(subset)}
 result={'kind':'paired_real_engine_bots_not_human_win_rates','ruleset':'modules_v7','protocol':2,
  'baseline':before,'final':after,'baseline_metrics':metrics(old),'final_metrics':metrics(new),
  'same_deck_control':shared,'camp_one_weapon':camp,'economy':economy,'per_core_mixed_vs_attack':percore,
  'phone_updated_this_turn':False,'core_capacitor_excluded_from_policy_comparison':'Summons random deck cards and can violate defense-only treatment; its real role is covered by core engine tests.',
  'limitations':['Three predeclared deck templates per policy; two held-out seeds; matched sides and six cores; not a sample of all decks or players.',
    'Shared-deck control is a separate experiment; initial weak mixed deck retained as a counterexample.',
    '900-second observation exceedances are not wins or forced match ends.',
    'Browser tests play a real starter battle; delayed VFX screenshot is explicitly a presentation fixture.']}
 out=ROOT/'artifacts/module-v7-rollout';(out/'final-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 lines=['# GRIDSHARD V7.1 — Uygulama ve strateji testleri','',
 '1 Kasım 2026. Kullanıcının nihai hedefi: doğru karma devre, hem yalnız Saldırı hem yalnız Savunma yerleşimine karşı avantajlı olmalı. Rastgele yerleşim ve ana hedef önceliği aynı kalır.','',
 '## Uygulanan değişiklikler','',
 'Ana 24 kartta V7 enderlik/imza ve 192 yetenek seçeneği uygulandı. Plazma İzi, gecikmeli füze yükü, paylaşılan Kuantum yankısı, üç hedefli Ark, ek kalkan sökme, bütçeli emilim→onarım, gerçek CAN kaybından yansıma, Son Siper dost kalkanı, Virüsün onarım baskısı dalı ve Arındırıcı kontrol koruması canlı motor aksiyonlarıdır. İkincil etkiler birbirini tekrar tetiklemez; kalkan/overkill/onarım döngüleri ek Akım üretmez. Kesirli süreli hasar bütçesi korunur.','',
 'Yetenek fiyat/eşik/kimlikleri ve sahiplik korunur. Değişen kartlarda eski satın alınmış eşiklere bir defalık ücretsiz yeniden seçim geçişi uygulandı: bir ücretsiz sıfırlama ve yalnız o eski eşiklerin ücretsiz tekrar seçimi. Yeni eşikler ücretli, normal sonraki sıfırlama eşik başına 25 Akı. İstek tekrarı ve kayıt yeniden yükleme test edildi. Gerçek oyuncu dosyaları açılıp değiştirilmedi.','',
 'Koleksiyon açıklamaları, iki dilde yetenekler/değerler, durum rozetleri ve gerçek olaya bağlı küçük VFX/ses güncellendi. Kuantumun 13 ek hedefi düşük kalitede tek SVG içinde görünür; aynı kaynak anahtarı hedefleri silmez. Süreli isabetler yeni silah atışı veya namlu animasyonu oluşturmaz. Çekirdeklerin ayrı V6 lider sunumu ve V5 doğrudan rolleri korunur.','',
 '## CAN için testle alınan V7.1 kararı','',
 '| Savunma CAN adayı (ilk V7’ye göre) | Karma / yalnız Saldırı | Savunma / karma gözlem aşımı | Karar |','|---|---|---|---|']
 for f in ('1.25','1.5','1.75','2'):
  d=read('strategy-v7-defhp-'+f);p=d['pairs']['attack_vs_mixed'];q=d['pairs']['defense_vs_mixed']
  lines.append(f"| ×{f} | {p['right_wins']}/{p['games']} | {q['timeouts']}/{q['games']} | {'Seçildi' if f=='1.5' else 'Seçilmedi'} |")
 lines+=['','Bu aday matrisi eski sabit oranlı karma botuyla, aynı deste/tohum/çekirdeklerde çalıştı. ×1,75 ve ×2 ek kazanım vermeden kilitlenme üretti. ×1,50 sekiz Savunmanın **açık CAN istatistiğine** uygulandı; karma sınıf kurana gizli çarpan veya oyuncuya kota eklenmedi. Son Siper ilk V7’de 280 idi; bu kararla 420 oldu (V6’daki 320’ye göre +%31,25). Diğer yedi Savunmada V6’ya göre +%50. Saldırı/Taktik CAN’ı bu denemede artırılmadı.','',
 '## Ölçüm yöntemi ve düzeltmeler','',
 'İlk bot yalnız uygun fiyatlı kartlara baktığı için pahalı silaha para biriktirmeyip savunma basabiliyordu. Bu hatalı ilk oranlar nihai sonuç sayılmadı. Politika silah için bekleyecek şekilde düzeltildi. Karma devre, normal tehdide yaklaşık %50 saldırı/%30 savunma/%20 taktik tercih eder; saldırmayan veya tek silahla kamp yapan rakibe karşı saldırı tercihini artırır. Bunlar **test botu kararları**, savaş kuralları değil. Ana oyundaki AI da gereksiz savunma biriktirmek yerine saldırı kapasitesini büyütür.','',
 'İlk karma üçüncü deste (Kuantum, Kırıcı, Faz, Son Siper, EMP, Virüs) alan hasarı karşısında sürekli kaybetti. Bu sonuç saklanmadı: üç sınıfı koymak tek başına doğru strateji değildir. Ayrı aday testinde üçüncü deste Kuantum/Dron/Zırh/Tampon/Onarım/Virüs olarak kuruldu. Aday seçiminde kullanılan 19/120 serisi tohumlar nihai doğrulamada kullanılmadı; son karşılaştırma 523/624 serisindedir.','',
 'Son kontrol: 3 strateji eşleşmesi × 3 deste çifti × 6 aynı çekirdek × 3 seviye (1/8/15) × 2 taraf × 2 tohum =648 maç. Her strateji diğer iki stratejiye karşı toplam432 maç oynadı. İki taraf aynı çekirdeği, seviyeyi ve ekonomiyi kullanır; günlük meta kapalı, yetenekler ana tabloda kapalı. Takviye Çekirdeği rastgele Saldırı çağırarak yalnız Savunma koşulunu bozabildiğinden bu politika karşılaştırmasında kullanılmadı; yedi çekirdeğin gerçek rolleri motor testlerinde kapsanır.','',
 '## Eşleştirilmiş önce / sonra — aynı desteler ve tohumlar','',
 '| Ölçüm | Önceki V6 motor | V7.1 motor |','|---|---:|---:|']
 for label,fn in [('Karma → yalnız Saldırı',lambda x:f"{x['pairs']['attack_vs_mixed']['right_wins']}/216"),('Karma → yalnız Savunma',lambda x:f"{x['pairs']['defense_vs_mixed']['right_wins']}/216"),('Biten maç',lambda x:f"{x['finished']}/648")]:lines.append(f'| {label} | {fn(before)} | {fn(after)} |')
 for key,label in [('median_seconds','Ortanca savaş (sn)'),('p90_seconds','p90 savaş (sn)'),('max_seconds','En uzun savaş (sn)'),('median_first_loss_seconds','İlk modül kaybı ortancası (sn)')]:
  lines.append(f"| {label} | {result['baseline_metrics'][key]:.2f} | {result['final_metrics'][key]:.2f} |")
 lines+=['','### Strateji başına gözlenen oran','', '| Oynama politikası | Galibiyet / maç | Gözlenen kazanma |','|---|---:|---:|']
 for key,label in [('mixed','Doğru karma'),('attack','Yalnız Saldırı'),('defense','Yalnız Savunma')]:
  s=after['policies'][key];lines.append(f"| {label} | {s['wins']}/{s['games']} | %{s['win_pct_all_games']} |")
 p=after['pairs']['attack_vs_mixed']
 lines+=['',f"Doğrudan karma–Saldırı karşılaşmasında karma **{p['right_wins']}/216 =%{pct(p['right_wins'],216)}**, yalnız Saldırı {p['left_wins']}/216. Karma–yalnız Savunma 216/216. Bu yüzdeler insan oyuncu olasılığı veya bütün deste uzayının kazanma oranı değildir; tanımlanan bot nüfusunun gözlenen sonuçlarıdır. Yalnız Saldırı genel oranının %50 üstünde kalması, yalnız Savunmayı yenmesinden kaynaklanır.",'',
 '### Aynı altı karta sahip taraflarla kontrol','',
 f"Ayrı 324 maçta taraflara aynı karma deste verildi; biri yalnız ilgili sınıfı, diğeri tümünü oynadı. Karma, yalnız Saldırıya {shared['pairs']['attack_vs_mixed']['right_wins']}/108, yalnız Savunmaya {shared['pairs']['defense_vs_mixed']['right_wins']}/108 kazandı; gözlem aşımı yok. Burada eski zayıf üçüncü karma deste de bilerek korundu. Bu, farklı kart havuzunun sonucu tek başına açıklamadığını kontrol eder.",'',
 '### Tek silah + savunma/onarım kampı','',
 f"54 ayrı stres maçında kamp botu aynı anda en fazla bir silah oynadı, kalan Akımı savunma/onarımda kullandı. Karma 54/54 kazandı, gözlem aşımı yok; ortanca {camp['seconds_median_finished']} sn. İlk sabit %50 saldırı politikasında 32/54 gözlem aşımı vardı. Sayılarla hasar baskısı veya zorunlu bitiş eklemek yerine, karma AI’nin tek silahlı kampa karşı daha fazla Saldırı kurması sağlandı. Oyuncunun bir silah sınırı yok; bu yalnız test politikasıdır.",'',
 '### Yetenekli savaşlar','',
 'SV15’te tüm sol ve tüm sağ dallar ayrı gerçek motor matrislerinde çalıştı. İlk sağ-dal grubundaki dört kamp gözlem aşımı, tehdit durumuna göre saldırı oranı seçimiyle giderildi; yeniden koşuda54/54 bitti. Eski fiyatlar, ücretsiz geçiş ve 384 tam ağaçtaki hesaplanan parametreler ayrıca test edildi. Bu 384 farklı desteyle insan maçı oynandığı anlamına gelmez.','',
 '## En son: Akım ekonomisi karşılaştırması','',
 'Her satır aynı üç deste/politika, üç çekirdek, üç seviye ve taraf değişimiyle 162 maçtır. Depo12, başlangıç6, bonus arası6 sn ve tek bonus bankası bütün satırlarda aynı. Hasar eşiği yeni gerçek CAN kaybını ölçer; tekrar onarılan CAN gelir sağlamaz.','',
 '| Pasif +1 Akım | Yeni CAN hasarı / +1 | Karma → Saldırı | Ortanca savaş (sn) | Aşım |','|---|---:|---:|---:|---:|']
 for d in economy:lines.append(f"| {d['regen_ms']/1000:g} sn | {d['threshold']} | {d['mixed_vs_attack_wins']}/{d['mixed_vs_attack_games']} | {d['median_seconds']:.2f} | {d['timeouts']} |")
 lines+=['','**Karar:** 2,5 sn / 200 yeni CAN hasarı korunuyor. 3 sn /100 hasar adayında strateji ayrımı artmadı ve bu grupta savaş ortancası uzamadı. Daha yüksek hasar gelirini karma kurmanın tek teşviki yapmak gerekmiyor; ilk etken kartların birlikte katkısı ve uygun karşı hamleydi. Bu bir “3/100 her koşulda kötüdür” iddiası değildir.','',
 '## Doğrulama, paket ve sınırlar','',
 '- 439 odaklı sunucu testi: motor, 24 kart/192 seçenek, eski ücretler, kayıt geçişi/yeniden yükleme, yedi çekirdek ve protokol/WebSocket. Tam tarihsel sunucu kümesi için yeşil iddiası yok.',
 '- 765 istemci testi ve 10 derleme testi; kaynak paketine yalnız beş açık statik sunucu JSON’unun girmesini doğrulayan3 paket sınırı testi.',
 '- 320/393 CSS piksel gerçek ilk savaş: 24 kart verisi, V7 parametreleri/dal adları, protokol2, ısı çubuğu0, yatay taşma0, JS/eksik varlık0. Süreli VFX ekranı **sunum fixture’ıdır**; gerçek yeni hasar kanıtı motor aksiyon testleri ve savaş matrislerindedir.',
 '- Tamponda kalkan silmenin onarım üretmemesi, onarım cezasının geri dönüştürülerek telafi edilememesi, küçük bütçe yuvarlama, ölen kaynağın izi, arındırma, Faz, yansıma, tekrar olay ve zayıf Tamponun büyük eski havuza daha yüksek dönüşüm yapıştıramaması test edildi.',
 '- PvP protokol2: eski istemci yeni mekaniklere sessizce bağlanmaz. İstemci+sunucu birlikte güncellenmeli. ZIP/Docker statik veri listesi ana kadro, yetenek ve sezon manifestini içerir; kişisel JSON’lar dışarıda kalır.',
 '- Üretim/Play yayını ve telefon kurulumu yapılmadı. Telefonda önceki V6 ve onun eski8891 süreci duruyor; bu çalışma onu yeniden başlatmadı. Yeni koda göre sunucu başlatılacaksa V7 istemci paketi de gerekir.',
 '- Yeni sezon adayları ana oyuna eklenmedi; sezon kartları ayrı üretim kapısında bekler.','',
 'Kanıt: `artifacts/module-v7-rollout/final-results.json`, `server-final-tests.log`, `client-tests.log`, `build-tests.log`, `browser-320.json`, `browser-393.json`; her matrisin `artifacts/strategy-v7-*/battles.json` ve `summary.json` dosyaları. Çoğaltma: `tools/probe_strategy_v7.py`, `tools/probe_camp_v7.py`, `tools/check_module_v7.cjs`, `tools/report_module_v7_rollout.py`.','',
 'Ana karar: `NIHAI_MODUL_ENDERLIK_YETENEK_V7_20261101.md`. Sonraki doğrulama, V7 istemci+sunucu ile gerçek telefon ve insan strateji seansıdır. Bot sonuçları tek başına kalıcı rekabet metasını doğrulamaz.','']
 (ROOT/'docs/V7_UYGULAMA_VE_STRATEJI_TESTLERI_20261101.md').write_text('\n'.join(lines),encoding='utf8')
 print(json.dumps({'before':result['baseline_metrics'],'after':result['final_metrics'],'holdout_pair':p,'camp':camp['pairs']['mixed_vs_camp']},ensure_ascii=False))
