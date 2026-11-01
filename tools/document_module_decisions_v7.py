"""Render and audit the V7 design contract. Never writes runtime/game data."""
from pathlib import Path
from copy import deepcopy
from collections import Counter
from itertools import product
import ast
import json

ROOT=Path(__file__).resolve().parents[1]
SPEC=ROOT/'docs/NIHAI_MODUL_ENDERLIK_YETENEK_V7.json'
DOC=ROOT/'docs/NIHAI_MODUL_ENDERLIK_YETENEK_V7_20261101.md'
OUT=ROOT/'artifacts/module-decisions-v7'
R={'common':'Yaygın','rare':'Nadir','epic':'Destansı (Epik)','legendary':'Efsanevi'}

def effective(m,picks,level):
    """Design math only; does not emulate hit order, AI, or engine time steps."""
    s=deepcopy(m['current_live']);p=s.pop('parameters');s.update(p);s.update(m['base_changes'])
    signature=next((c for c in m['talents'][1]['choices'] if c['id']==picks[1]),None)
    if signature:
        change=signature['changes'];s.update(change.get('set',{}))
        for key,value in change.get('multiply',{}).items():s[key]=s.get(key,1)*value
    for i,pick in enumerate(picks):
        if i==1 or pick is None:continue
        c=next(c for c in m['talents'][i]['choices'] if c['id']==pick)
        change=c['changes']
        for key,value in change.get('multiply',{}).items():s[key]=s.get(key,1)*value
        if 'job_multiplier' in change:
            keys=['damage','charged_damage'] if m['primary_field']=='damage' else ['core_shield_hp','ally_shield_total'] if m['id']=='last_bastion' else [m['primary_field']]
            for key in keys:
                if key in s or key=='healing_received_multiplier':s[key]=s.get(key,1)*change['job_multiplier']
    scale=1.04**(level-1)
    for key in ('hp','damage','charged_damage','shield_hp','core_shield_hp','ally_shield_total','heal'):
        if key in s:s[key]*=scale
    return s

def audit(d):
    live=json.loads((ROOT/'server/data/module_roster_v2.json').read_text(encoding='utf8'))
    modules=d['modules'];by_id={m['id']:m for m in modules}
    assert len(modules)==len(by_id)==24
    assert set(by_id)=={m['id'] for m in live['modules']}
    assert Counter(m['category'] for m in modules)=={'saldırı':10,'savunma':8,'taktik':6}
    assert Counter(m['rarity'] for m in modules)=={'common':8,'rare':8,'epic':5,'legendary':3}
    constants={}
    tree=ast.parse((ROOT/'server/app/game/talents.py').read_text(encoding='utf8'))
    for node in tree.body:
        if isinstance(node,ast.Assign) and len(node.targets)==1 and isinstance(node.targets[0],ast.Name) and node.targets[0].id in {'TALENT_LEVELS','TALENT_COSTS'}:
            constants[node.targets[0].id]=ast.literal_eval(node.value)
    for spec in live['modules']:
        m=by_id[spec['id']]
        assert (m['rarity'],m['category'],m['arena'])==(spec['rarity'],spec['category'],spec['unlock_arena'])
        actual={'current_cost':spec['current_cost'],'hp':spec['max_hp'],'damage':spec['base_damage'],'period_ms':spec['cooldown_ms'],'parameters':spec['parameters']}
        expected=deepcopy(m['current_live'])
        if live.get('combat_ruleset')=='modules_v7':
            for key,value in m['base_changes'].items():
                if key in {'hp','damage','period_ms','current_cost'}:expected[key]=value
                else:expected['parameters'][key]=value
        assert expected==actual,'Live values differ from the explicit decision contract.'
        assert 'current_cost' not in m['base_changes']
        assert len(m['talents'])==4
        for i,t in enumerate(m['talents']):
            assert t['tier']==str(i) and t['level']==constants['TALENT_LEVELS'][m['rarity']][i]
            assert (t['circuit_credits_cost'],t['flux_cost'])==constants['TALENT_COSTS'][m['rarity']][i]
            assert [c['id'] for c in t['choices']]==['power','resilience']
            assert all(c['name_tr'] and c['description_tr'] and c['changes'] for c in t['choices'])
        for c in m['talents'][1]['choices']:
            assert set(c['changes'])<={'set','multiply'}
            assert not ({'current_cost','target_priority','rarity','arena'} & (set(c['changes'].get('set',{}))|set(c['changes'].get('multiply',{}))))
    caps=d['safety_caps'];rows=[];valid=0
    for m in modules:
        maxes={};mines={}
        # 16 complete trees × 3 levels are intentional arithmetic stress checks,
        # not a claim that all talents are unlocked at levels 1/8.
        for level in (1,8,15):
            for picks in product(('power','resilience'),repeat=4):
                s=effective(m,picks,level)
                assert s['hp']>0 and s['damage']>=0
                assert s['current_cost']==m['current_live']['current_cost']
                for field,cap in [('reduction','ordinary_armor_reduction'),('block_ratio','periodic_block_ratio'),('guard_ratio','dome_guard_ratio'),('reflect_ratio','reflection_ratio'),('interval_penalty','virus_interval_penalty'),('healing_received_penalty','virus_heal_penalty'),('shot_bonus','amplifier_bonus'),('next_interval_reduction','speed_reduction'),('absorb_ratio','buffer_absorb_ratio'),('heal_conversion_ratio','buffer_conversion_ratio'),('echo_per_target_ratio','quantum_echo_per_target_ratio'),('echo_total_ratio','quantum_echo_total_ratio')]:
                    if field in s:assert 0<=s[field]<=caps[cap]+1e-9,(m['id'],field,s[field])
                if m['id']=='phase_armor':
                    assert s['phase_ms']<=caps['phase_duration_ms']
                    assert s['phase_ms']/s['period_ms']<=caps['phase_max_duty_ratio']
                if m['id']=='emp':
                    assert s['duration_ms']<=caps['emp_duration_ms'] and s['recovery_ms']>=caps['emp_recovery_ms_min']
                if m['id']=='plasma_mortar':assert s['dot_ticks']*s['dot_per_tick_ratio']<=caps['plasma_dot_total_ratio']+1e-9
                if m['id']=='buffer_shield':
                    assert s['shield_hp']*s['heal_conversion_ratio']<=s['shield_hp']
                for k,v in s.items():
                    if isinstance(v,(int,float)):
                        maxes[k]=max(maxes.get(k,v),v);mines[k]=min(mines.get(k,v),v)
        # Only legal unlocked partial/full choices, including choosing no talent.
        for level in (1,8,15):
            options=[(None,'power','resilience') if level>=t['level'] else (None,) for t in m['talents']]
            valid+=len(list(product(*options)))
        rows.append({'id':m['id'],'arithmetic_min':mines,'arithmetic_max':maxes})
    q=by_id['quantum_repeater'];b=by_id['buffer_shield'];pl=by_id['plasma_mortar']
    examples=[]
    for picks in ((None,)*4,(None,'power',None,None),(None,'resilience',None,None)):
        qs=effective(q,picks,1);bs=effective(b,picks,1);ps=effective(pl,picks,1)
        examples.append({'signature':picks[1] or 'none',
          'quantum_max_full_board_cycle_damage_before_defense':3*qs['damage']+qs['charged_damage']*(1+qs['echo_total_ratio']),
          'buffer_pool_plus_max_conversion':bs['shield_hp']*(1+bs['heal_conversion_ratio']),
          'plasma_max_volley_damage_before_defense':ps['damage']*(1+sum(ps['secondary_ratios'])+ps['dot_per_tick_ratio']*ps['dot_ticks'])})
    # Twelve arena gates must collectively expose every active module exactly once.
    opened=[mid for a in live['arenas'] for mid in a['new_cards']]
    assert len(live['arenas'])==12 and all(a['new_cards'] for a in live['arenas'])
    assert len(opened)==len(set(opened))==24 and set(opened)==set(by_id)
    assert d['migration']['normal_reset_flux_per_selected_tier_after_transition']==25
    assert not d['effect_contract']['derived_damage_retriggers_signatures']
    return {'kind':'design_schema_and_arithmetic_audit_not_engine_simulation','status':'pass','modules':24,'classes':3,'talent_options':192,
      'complete_four_tier_trees_at_level_15':384,'arithmetic_stress_configurations':1152,'legal_partial_or_full_configs_levels_1_8_15':valid,
      'runtime_values_changed':live.get('combat_ruleset')=='modules_v7','costs_match_existing_code':True,'arenas_match_existing_code':True,'examples':examples,'bounds':rows}

INTRO='''# GRIDSHARD — Nihai modül, enderlik ve yetenek kararları V7

**1 Kasım 2026 · V7 mekanikleri ana koda uygulandı; V7.1 denge ve Akım V8/eğitim güncellemesi.**
Bu belge mevcut 24 kart için yeni mekanik ve yetenek davranışlarının karar kaynağıdır.
V6 öneri listesinin yerine geçer. İmza mekanikleri ve yetenekler ana koda uygulandı.
V7.1’de savunma CAN’ları ilk V7 adayına göre %50 artırıldı; ayrıntılı ölçüm
`V7_UYGULAMA_VE_STRATEJI_TESTLERI_20261101.md` belgesindedir. Sayılar insan oyuncu
metasının nihai dengesi iddiası değildir. Mevcut telefondaki V6 paket ve onun
sunucusu bu çalışma sırasında yenilenmedi; gerçek oyuncu verisi açılıp değiştirilmedi.

Makine okunur kaynak: [NIHAI_MODUL_ENDERLIK_YETENEK_V7.json](NIHAI_MODUL_ENDERLIK_YETENEK_V7.json).
Bu belge `python -X utf8 tools/document_module_decisions_v7.py` ile o kaynaktan üretilir.

## Tasarımın sonucu

24 kart / 3 sınıf / mevcut arenalar ve sabit enderlikler korunur. Yeni bir zorunlu
Sistem sınıfı yoktur. Yaygın kartlar ana görevlerinde değerlidir; Efsanevi kart
aynı bedelle hem daha dayanıklı hem daha yüksek sürekli hasarlı otomatik üst sürüm
olmaz. Özellikle savunmaya yeni hasar motoru eklenmez: savunma zaman kazandırır,
Taktik fırsat yaratır, Saldırı karşı devreyi yıkar. Yansıtıcı tek başına güvenilir
bir saldırı ekonomisi kuramaz.

| Enderlik | Oyuncunun anlayacağı fark | Karmaşıklık bütçesi |
|---|---|---|
| Yaygın | Düzenli ateş / ağır darbe / blok / dayanıklılık / onarım | Bir temel görev; talimat okumadan ilk birkaç çevrimde anlaşılır |
| Nadir | Zırhı delme, geri yansıtma, iki hedef, kontrollü kesinti veya tek görevli destek | En fazla bir uzman koşul veya kısa takip etkisi |
| Destansı (Epik) | Zincir, iz, emilimi onarıma çevirme, kalkan sökme, tempo uzmanlığı | Bir bağlantılı imza; süre, hedef ve toplam bütçe sınırı |
| Efsanevi | Dördüncü isabet yankısı, Faz penceresi veya yıkım mirası | Görünür hazırlık/pencere/bir-kez tetiki; açık karşı hamle |

Enderlik **mekanik kimliktir**; ayrı gizli hasar/CAN/hız çarpanı değildir. Kart seviye
atlayınca enderliği değişmez. Temel imza yetenek satın almadan çalışır. Yetenekler
o imzayı odaklar; yeni oyuncunun kartını işlevli yapan zorunlu ücretli anahtar değildir.

## Benzer oyunlardan alınan fikirler

Yalnız yayıncıların resmî açıklamaları kullanıldı. Bunlar tarihli tasarım örnekleridir;
2026 güncel meta veya bugünkü kart sayılarının dengeli olduğu iddiası değildir.
Telifli görseller, adlar veya bire bir istatistikler aktarılmaz. Uyarlama sütunu
GRIDSHARD için bizim tasarım çıkarımımızdır.
'''

RULES='''## Korunan savaş ve ekonomi kuralları

- Saldırı 10 / Savunma 8 / Taktik 6; altı farklı kartlık destede en az bir Saldırı.
- Rastgele uygun boş hücre, mevcut ana hedef türü önceliği ve eşitlik sırası aynı.
  Yakınlık, komşuluk veya oyuncunun seçtiği hücre şartı yoktur. Zincir/yayılım
  mevcut ek hedef sırasını kullanır; asla ana hedefi değiştirmez.
- Aynı kart/sınıf kotası yok; merkez çekirdek dışında 14 hücre ve 3 sn enkaz aynı.
- Tek savaş ekonomisi Akım V8: başlangıç 7, depo 12, pasif 3 sn’de +1.
  Saldırı modüllerinin 100 yeni rakip CAN kaybı VE Savunma modüllerinin 50 yeni
  kendi CAN kaybı birlikte ek +1 kazandırır. Bonus beklemesi yok; artan ilerleme
  taşınır, depo dolduğunda sayaçlar sıfırlanır. Engellenen hasar sayılmaz.
- Süreli/ikincil saldırı CAN kaybı aynı kaynak oyuncunun 100 hasar sayacına **bir kez**
  girer; ayrı gelir kaynağı açılmaz. Onarılmış aynı CAN, yansıma, kalkan kırımı,
  emilim, dost hasarı, fazla hasar ve iyileştirme gelir oluşturmaz.
- Enerji/Isı, sınıf/kopya kotası, üçüncü dakikada hasar/onarım baskısı ve zorunlu
  maç bitişi geri gelmez. 900 sn test gözlem sınırıdır, oyun süresi sınırı değildir.
- Modül mutlak CAN/hasar/onarım/kalkan bütçeleri mevcut `1,04^(seviye−1)` ile
  **bir kez** büyür. Oranlar, hedef sayısı, süreler ve Akım bedeli seviyeyle büyümez.
- Çekirdeğin V5 doğrudan rolleri, eski yetenek bedelleri ve V6 lider sunumu korunur.
  Güçlendirici/Röle modül atışlarını etkiler; çekirdeğin aktif gücünü veya dolumunu etkilemez.

## Etki sözleşmesi: belirsiz bırakılmayacak noktalar

**Temel sıra.** Faz/uygunluk → gerekiyorsa Kırıcı ek kalkan silme → mevcut
zırh/periyodik blok/Kubbe → CAN kalkanları → gerçek CAN kaybı → onarım/yansıma/
iz/yankı türetme. Fazdayken kalkan silinmez. Önceden uygulanmış iz/yük kaynak ölse de
kendi sonuna kadar kalır; hedef ölünce veya savaş bitince iptal olur. Aynı motor
adımındaki mevcut saldırı niyeti sırası korunur. Ölen hedefe yeni ek hedef aranmaz.

**Türeyen hasar.** Füze takip patlaması, Plazma İzi ve Kuantum yankısı ilk doğrudan
vuruşun kalkan/azaltım/overkill sonrası gerçek CAN kaybından hesaplanır. İlk
vuruşun tümü kalkan tarafından emildiyse bu üçü sıfır üretir. Ark/Dron/Plazma
anlık yayılımı ise atışın ham ana hasarı × ilgili oran üzerinden kendi savunma
kontrolüne girer. Her tür hasar Faz ve gerçek CAN kalkanından geçer. Süreli iz/yük
zırhtan etkilenir ama periyodik blok/Kubbe yükü tüketmez; Kuantum yankısı normal
ikincil isabet gibi blok/Kubbeden geçer. Sırf yüzde olduğu için gerçek/saf hasar sayılmaz.

**Özyineleme yok.** Ana/seri mermisi `direct`, yayılım/zincir `secondary`, iz `dot`,
füze takibi `followup`, yankı `echo`, dönüş `reflection` olarak kaynaklanır.
İkincil, iz, takip, yankı ve yansıma yeni iz/yankı/yansıma/atış bonusu doğurmaz.
Yalnız uygun doğrudan isabet Yansıtıcıyı tetikler. Süreli hasarda Tampon emilim
yapabilir; aynı emilim yalnız bir onarım olayı üretir. Canı sıfıra inen kaynak
geri onarımla dirilemez. Kesirli bütçeler biriktirilip deterministik dağıtılır;
1 CAN’ın altındaki her darbeyi sıfıra yuvarlayıp etkiyi yok etmek veya her hedefi
yukarı yuvarlayıp toplamı aşmak yasaktır. Kesir kaydı kaynak/etkiyle sınırlıdır.

**Yığılma.** Bir hedefte bir Plazma İzi, bir Virüs, bir füze takip yükü ve aynı aileden
bir atış/hız yükü bulunur. Yeni tam bütçesi kalan eski bütçeden büyük olan iz/yük
eskinin yerini alabilir; taşan bütçe eklenmez. Eşit/zayıf uygulama süreyi yenilemez.
Virüste daha güçlü oran seçilir; eşit oran süreyi yenilemez. Güçlü Virüs kalan
süresiyle yaşar, sonra yenisi seçilebilir. Temizleme bittiğinde aynı kalan etki
tekrar doğmaz; sonraki gerçek atış yeni etki uygulayabilir. Aynı aile CAN kalkanı
toplanmaz; kalanla yeni bütçenin büyüğü tutulur. Tampon yenilense bile tek havuz;
yenileme başlı başına onarım yaratmaz. Farklı aile kalkanları mevcut kuralla yaşar.

**Tampon ayrıntısı.** Önce sona erecek kalkanın tüketilmesi dahil mevcut kalkan
sırası korunur. Tampon sırası geldiğinde kalan uygun hasarın en çok %70’ini emer;
kalıntı diğer kalkanlardan/CAN’dan geçer. Aynı isabette bir Tampon dönüşümü olur.
İki yaralı alıcı eksik CAN oranı ve mevcut örnek kimliği sırasıyla seçilir; toplam
onarım eşit pay edilir, birinin alamadığı pay aynı iki alıcının diğerine verilebilir.
Yeni üçüncü alıcı aranmaz. Alıcı yoksa paket kaybolur. Tamponu doğrudan hedeflemek
bu kuralı atlatmaz. Yıkılan Tampon kaynağının önceden verdiği havuz süre bitimine
kadar kalır. Kalkan kırımı emilmiş darbe değildir ve dönüşüm üretmez.

**Kuantum ayrıntısı.** Aynı hedefe gerçek doğrudan temaslar sayılır; Fazla tamamen
boşa çıkan atış sayılmaz. Tam CAN kalkanının emdiği gerçek temas sayılır. Dördüncü
atışta CAN kaybı yoksa yankı yoktur. Diğer canlı rakip modüller mevcut sıra ile
alınır; kişi başı en çok %20, toplam temel %60 / yetenekle en çok %80. Havuz
uygun hedeflere eşit bölünür, kişi başı sınır nedeniyle artan pay kaybolur.
Ana hedef çekirdek olabilir ama ek yankı hedefi çekirdek olamaz. Bir kaynak kendi
1–4 sayacını tutar; başka Kuantumların isabetleriyle dolmaz.

**Son Siper ayrıntısı.** Çekirdek kalkanı harcanana kadar kalır, iki dostun kalkanı
5 sn sürer; ikisi ayrı aile bütçeleridir. Dost seçimi canlı, çekirdek olmayan,
kaynak olmayan modüllerde eksik CAN oranı/örnek kimliği sırasıdır. Tek alıcı varsa
40 toplamı o alır; iki alıcı varsa 20/20. Kalkanlar yığılmaz. Gelecekte diriltme
eklenirse aynı savaş örneğinin yıkım tetiki tekrar açılamaz.

**Arındırıcı ayrıntısı.** Dost hedef seçicisi mevcut İmha önceliğini korur. Değişen
şey, seçilmiş dostta kaldırılacak etki için açık sıra tanımlanmasıdır. Temiz Koruma
yalnız sonraki EMP/Virüs **süresini** %30 kısaltır, şiddetini/toparlanmayı değiştirmez.
Süreli koruma yığılmaz, tazelenince kalanla yeni sürenin büyüğü tutulur. Bir kullanım
sonra biter. İmha, Plazma ve füze yükünü engellemez.

## Yetenek sistemi ve eski emek

Dört eşik, her eşikte iki seçenek ve aynı fiyatlar korunur. Kimlikler `0/1/2/3`
ve `power/resilience` aynı kalır; dal adı artık her kartta o etkiye göre gösterilir.
Her kartın aşağıdaki dört satırı **sekiz açık seçenek**, toplam 192 seçenektir.

- Temel: görev gücü +%3 veya CAN +%5.
- İmza: karta özel iki uzmanlık. Yaygınlarda sade sayı/zaman seçimi yeterlidir;
  Destansı/Efsanevilerde etki dağılımını değiştiren seçimler kullanılır.
- İnce ayar: çevrim −%4 (çevrimsiz kartta görev gücü +%4) veya CAN +%5.
- Ustalık: temel görevin gücü +%6 veya CAN +%8; önceki imza dalını seçmek şart değil.

Hesap sırası: yeni temel → imza değişimi → görev çarpanları → diğer çarpanlar →
seviye eğrisi → güvenlik tavanları → bütçeyi koruyan yuvarlama. +%3, +3 yüzde
puan değildir. Örneğin %60 blok ×1,03 = %61,8. Dördüncü Kuantum hasarı ana hasarla
birlikte bir kez artar; ondan türeyen yankı oranı ikinci kez büyütülmez. Tamponda
görev gücü yalnız havuzu büyütür; dönüşüm yüzdesi ayrıca büyümez. Son Siperde iki
kalkan bütçesi birer kez artar. Onarımda 15 toplamdır, üç kere 15 değildir.

**Kayıt geçişi kararı:** Geçerli satın alınmış eşikler aynı yuvada ve ek ücret
almadan yeni karşılıklarına taşınır; seviyeler, parça bakiyeleri, fişler ve önceki
arşivler korunur. Davranışı değişen kartların seçili dalları için geçiş sürümünde
**bir defalık ücretsiz yeniden seçim** hakkı verilir; eski ücretli bedeller iade
edilmez. Hak kart başına/sürüm başına kaydedilir, yeniden girişte çoğalmaz. Geçiş
sonrası normal sıfırlama seçilmiş eşik başına 25 Akı olarak kalır. Bu geçiş kodda
uygulandı ve izole kayıt testlerinden geçti; gerçek oyuncu dosyaları değiştirilmedi.

Koleksiyon açıklaması kısa temel görev + bir imza cümlesi olmalı. İmza dalları
karşılaştırmasında hangi payın arttığı **ve hangisinin azaldığı** birlikte görünür.
Çekirdek yetenek ağacı bu modül kararının kapsamı dışında, V5 olarak korunur.
'''

ENDING='''## Sayısal kararların gerekçesi

Yeni imza eklerken her silahın toplamını da büyütmüyoruz. Seviye 1, yeteneksiz,
tüm hedefler uygun ve savunmasızken; aşağıdakiler analitik üst sınırlardır:

| Kart | Önce | Yeni başlangıç bütçesi | Sonuç |
|---|---:|---:|---|
| Füze | 34 / 3 sn | 29 ×1,20 = en çok 34,8 / 3 sn | Hasarın bir kısmı gecikmeli ve temizlenebilir |
| Ark | 22 ×1,45 =31,9 / 1,8 sn | 20 ×1,65 =33 / 1,8 sn | Üçüncü hedefe erişim; toplamda yaklaşık +%3,4 |
| Plazma | 32 ×1,60 =51,2 / 3,6 sn | 29 ×1,75 =50,75 / 3,6 sn | Süreli iz eklenirken toplam korunur |
| Kuantum | 3×10+24 =54 / 5,6 sn | en çok 3×10+24×1,60 =68,4 / 5,6 sn | Dolu tahtada +%26,7; tek hedefte eski toplam, testte özellikle izlenir |
| Tampon | en çok 60 / 6 sn koruma | en çok (60+24) / 8 sn =10,5 CAN/sn | Eski 10’a yakın; korumanın bir bölümü onarıma dönüşür |
| Son Siper | 320 CAN +75 çekirdek kalkanı | 420 CAN +75 çekirdek +40 dost kalkanı | İlk V7 adayı 280 CAN idi; V7.1 savunma dayanıklılık kararıyla 420 oldu |

Bu toplamlar farklı hedeflere yayılır; tek hedef öldürme süresi veya gerçek
onarım verimiyle aynı değildir. Plazma/füze/yankının gerçek CAN kaybından türemesi
savunmaya karşı bu üst sınırı daha da düşürür. Kuantumun en yüksek dolu tahta
kazancı riskli bir ilk test değeridir: aşırı baskın çıkarsa önce toplam yankı
%60 → %40 denenir; ek çekirdek hedefi veya bedel artışıyla sorun gizlenmez.
V7 mekaniklerinin ilk testinde yalnız Saldırı baskın kaldı. Savunma CAN’ında
×1,25 / ×1,50 / ×1,75 / ×2 karşılaştırıldı. ×1,50 karma stratejiyi avantajlı
duruma taşırken ×1,75 ve ×2 ek kazanım vermeden gözlem aşımı üretti. Bu nedenle
sekiz Savunmanın CAN’ı **ilk V7 adayına göre ×1,50** seçildi. Bu açık kart
istatistiğidir; devreye karma sınıf koyana gizli bonus veya kota verilmedi.

Güvenlik tavanları seviyeden bağımsızdır: sıradan zırh %40, tek blok %80,
Kubbe %55, yansıma %50, Faz en çok 1,5 sn ve çevrimin %25’i, EMP en çok 1,5 sn
ve ardından en az 3 sn koruma; Virüs aralık uzatması %35, onarım cezası %25;
Güçlendirici %40, Röle %30; Tampon emilim %70/dönüşüm %60; yankı hedef başına
%20/toplam %80; Plazma toplam iz %24. Normal seçimler tavanı sessizce aşmamalı;
denge incelemesi bunu belge denetiminde de kontrol eder. Çekirdek lider güçleri
ayrı sözleşmedir; bu modül tavanlarına kırpılmaz.

## Arena ve sezon kararı

Mevcut Devre Yolu adları/eşikleri, kartların arena açılışları ve ücretsiz kazanımı
korunur. Her arenada en az bir yeni kart: aşağıdaki dağılım ana veriden doğrulanır.
İlk arenada karmaşık iz/yankı yok; önce ateş, korunma ve destek anlaşılır.

{ARENAS}

Her sezon en az bir yeni kart ve biriken katalog ilkesi korunur. Bu çalışma
başlangıçtaki 24 karta odaklıdır; sonraki sezonda 25+ olabilir. Her sezon Efsanevi
eklemek gerekmez. Yeni kart temel görev çakışmasını azaltmalı, ücretsiz erişim,
görsel, ses, gerçek mekanik ve karşı hamle testinden geçmeli. Önceki sezon
fikirlerinin durumu bu kararla güncellenmiştir:

{SEASONS}

Henüz hazır olmayan sezon kartını isim doldurmak için yayınlamayacağız. Burada
sezon takvimi, yeni kart fiyatı veya arenaya hazır olmayan kart kaydı değiştirilmedi.

## Görsel, ses ve öğretici sözleşmesi

Her kartın aşağıdaki görsel kanıtı gerçek kaynak ve hedefe bağlanır. Mevcut
en fazla üç küçük durum rozeti sınırı korunur; yeni bar/ek ekonomi yok.
İzlerde kalan darbeler, Kuantumda 1–4 sayaç, Tamponda kalan havuz, Fazda açık
pencere, Son Siperde gerçek varış hedefleri görünür. İşlem gerçekleşmezse sahte
hasar/onarım efekti oynatılmaz. Renk tek başına bilgi taşımaz; biçim/ses de ayrıdır.
Yetenekler aynı görsel aileyi değiştirir, her dal yeni büyük ekran efekti açmaz.

Çekirdeğin büyük mühürleri, kanadı, kale/portal/yarık dili ve 14 lider sesi
modüllere verilmez. Modül sesleri küçük isabetlerdir; ikincil/çoklu isabet aynı
olayda ses yığını üretmez. Geçmiş V6 kaynak bütçeleri korunur; zayıf telefonda da
esas hedef bağlantısı ve imza sayacı kalır, süs azaltılır. Gizlenme/maç sonu/reset
VFX ve ses sahipliğini bırakır. Yeni ısı barı veya tam ekran sürekli titreşim yok.

İlk öğretici akışı kısa: “Kartına dokun, boş hücreye kurulsun” → gerçek saldırı
ve CAN kaybı → “Akım doldukça devreni büyüt” → hazır çekirdek. Zincir/iz/emilim
ilk edinildiğinde tek satır kart bilgisiyle anlatılır. Oyuncu metni okumadan
oynamaya devam edebilir; okunabilir etki hedefte görülür.

## Aşamalı uygulama ve her adımın test kapısı

{ROLLOUT}

Her adım sonunda sonuç yazılır, sonraki adımın sayıları ona göre güncellenir.
Yeni mekanik eski hatayla dengelenmez. Gerekirse sıradaki kart bekler; biten
adımın gerçek motor/arayüz tutarlılığı önce çözülür. Ayrı kalıcı deney oyunu
açılmaz; ana oyunun aynı motoru ve izole test verileri kullanılır. Kullanıcı
telefonda oynarken sunucu veya paket bu belge yazımı nedeniyle yenilenmez.

**Motor kontrolü:** kalkan/Faz/ölüm/arınma; iki taraflı aynı adım; ölen kaynak;
overkill; 1 CAN; kesirli bütçe; kayıt/yeniden bağlanma/tekrarlanan olay; aynı
karta çoklu kopya; çekirdek V5’in yedi rolü; eski fiyatların bağımsız sözleşmesi.
24 kart × 16 tam ağaç =384 son-seviye ağaç kombinasyonu parametre doğrulaması,
ayrıca seviye 1/8/15’te yalnız açılmış dallarla gerçek savaş matrisi gerekir.
Bütün 384×384 deste eşleşmesi test edildiği iddia edilmeyecek.

**Karşılaştırmalı savaş matrisi:** aynı başlangıç durumu, seviye, tohum ve AI
politikası; taraflar değiştirilerek eski/yeni çiftleri. Her kart için yer aldığı
en az iki altılı deste: rolünü kullanan ve zayıf kaldığı rakibe karşı. Tek silah+
beş savunma/taktik, çok saldırı, karma, kesinti ve arındırma desteleri; düşük,
orta ve 14 modüllü tahta; yeteneksiz/tüm sol/tüm sağ ve karışık dallar. Günlük
meta kapalı taban ölçümünün ardından beş metayla etkileşim. Hazır tahta hasar
testi ile sıfırdan gelişen gerçek ekonomi savaşı ayrı raporlanır.

**Ölçümler:** ilk kurulumdan ilk modül kaybına süre; silahın katkı vermeden
yıkılma oranı; ilk 3 çevrimde öldürme; gerçekten eksilen ve yeni sayılan CAN;
emilim/onarım/boşa onarım; Akım bonus payı; çekirdek kullanım/katkısı; medyan/p90
savaş süresi; sonsuz onarım veya kontrol kilidi; AI tercihleri; iki dalın işe
yaradığı karşılaşmalar. İyi silahı ilk kuran her eşleşmede otomatik kazanmamalı.
Tek-Saldırı deste tercih edilen karşılarını yenebilir; karma Saldırıya karşı
evrensel üstünlüğü olmamalı. Yalnız simülasyon kazanma yüzdesinden insan metası
çıkarılmaz; süre uzaması tek başına kalite değildir.

**İlk inceleme eşikleri (otomatik güçlendirme/nerf değil):** eşit seviyede temel
tek silah tek dolu CAN’lı silahı 3 veya daha az normal çevrimde yok ediyorsa;
ilgili eski/yeni eşleşme medyanı %20’den fazla kısalıyorsa; tek-Saldırı kamp
desteleri karşı matrisin %55’inden fazlasını kazanıyorsa; 900 sn gözlem aşımları
%1’i geçiyorsa inceleme durur. 900 sn’ye ulaşan sonuç beraberlik/kazanma diye
sayılmaz. Sonraki karar için gerçek maç kaydı ve oyuncu gözlemi gerekir.

**Telefon/yayın:** 320/375/393 CSS piksel, düşük görsel kalite ve hareket azaltma,
14 modül+çoklu imza, tekrar maç/arka plana alıp geri dönme kontrol edilir.
Kaynak/hedef/sayaç gözle anlaşılır olmalı. Sunucu+istemci kural sürümü aynı
paketle çıkar; eski istemci yeni etkiyi sessizce yanlış çizmez. Açık maç eski
kural sürümünde tamamlanır veya güvenli sürüm kapısıyla korunur. Geri dönüş
oyuncu satın alma/yeniden seçim kaydını silmez. Mağaza/üretim yayını ayrı işlemdir.

## Bu çalışmada doğrulanan ve bekleyen

{AUDIT}

Buradaki doğrulama tasarım dosyası/aritmetik denetimidir. Gerçek motor, kayıt,
istemci ve karşılaştırmalı savaş testleri ayrı uygulama raporunda listelenir.
Mevcut V6 telefondadır; V7’nin telefona kurulduğu anlamına gelmez.
'''

def render(d,result):
    parts=[INTRO,'\n| Resmî örnek | Belgelenen davranış | GRIDSHARD çıkarımı |\n|---|---|---|']
    for s in d['sources']:parts.append(f"| [{s['title']}]({s['url']}) | {s['observed']} | {s['adaptation']} |")
    parts.append('\n'+RULES)
    parts.append('\n### Korunan seviye ve fiyat tablosu\n\nHer fiyat Devre Kredisi / Akı; her eşikte yalnız seçilen dal ücretlenir.\n\n| Enderlik | Seviyeler | Temel | İmza | İnce ayar | Ustalık |\n|---|---|---|---|---|---|')
    for rarity,levels in d['talent_levels'].items():
        cells=[' / '.join(str(v) for v in c) for c in d['talent_costs_credits_flux'][rarity]]
        parts.append(f"| {R[rarity]} | {' / '.join(map(str,levels))} | {' | '.join(cells)} |")
    parts.append('\n## 24 kartın nihai görev ve yetenek kartları\n\nSayılar 1. seviye/yeteneksiz tabandır. Yetenek açıklamasındaki sabit değiştirmeler\nimza aşamasında uygulanır; temel/ustalık çarpanları bundan sonra gelir.\n')
    for category,title in [('saldırı','Saldırı — 10 kart'),('savunma','Savunma — 8 kart'),('taktik','Taktik — 6 kart')]:
        parts.append(f'\n### {title}\n')
        for m in d['modules']:
            if m['category']!=category:continue
            b=deepcopy(m['current_live']);b.update(m['base_changes'])
            hp=m['current_live']['hp'];damage=m['current_live']['damage'];period=m['current_live']['period_ms']
            def changed(a,z):return str(a) if a==z else f'{a} → {z}'
            parts.append(f"\n#### {m['name_tr']} — {R[m['rarity']]} · Arena {m['arena']}\n\n"
              f"**Akım {b['current_cost']} · CAN {changed(hp,b['hp'])} · Ana hasar {changed(damage,b['damage'])} · Çevrim {changed(period,b['period_ms'])} ms.**\n\n"
              f"{m['final_rule_tr']}\n\n**Karşı hamle ve sınır:** {m['counterplay_tr']}\n\n**Oyuncunun göreceği:** {m['presentation_tr']}\n\n"
              '| Eşik / seviye | Sol dal (`power`) | Sağ dal (`resilience`) |\n|---|---|---|')
            for t in m['talents']:
                a,z=t['choices'];label={'basic':'Temel','signature':'İmza','tuning':'İnce ayar','mastery':'Ustalık'}[t['kind']]
                parts.append(f"| {label} / SV {t['level']} | **{a['name_tr']}** — {a['description_tr']} | **{z['name_tr']}** — {z['description_tr']} |")
    live=json.loads((ROOT/'server/data/module_roster_v2.json').read_text(encoding='utf8'))
    names={m['id']:m['name_tr'] for m in d['modules']}
    arenas='| Arena | Yeni kartlar |\n|---|---|\n'+'\n'.join(f"| {a['index']} — {a['name_tr']} | {', '.join(names[i] for i in a['new_cards'])} |" for a in live['arenas'])
    seasons='| Önceki sezon fikri | Yeni karar | Gerekçe |\n|---|---|---|\n'+'\n'.join(f"| {s['old']} | {s['decision']} | {s['reason']} |" for s in d['season_backlog'])
    rollout='| Sıra | İş | Geçiş koşulu |\n|---|---|---|\n'+'\n'.join(f"| {s['step']} | {', '.join(s['scope'])} | {s['pass_condition']} |" for s in d['rollout_order'])
    checked=f"24/24 kart, 10/8/6 sınıf dağılımı, 8/8/5/3 enderlik dağılımı, 12/12 arena açılışı,\n192/192 seçenek, 384 tam ağaç ve üç seviyede 1.152 aritmetik stres yapılandırması\ndoğrulandı. Seviye kilitlerine uygun, boş seçime de izin veren {result['legal_partial_or_full_configs_levels_1_8_15']}\nkısmi/tam yapılandırma sayıldı. Fiyat ve eşikler mevcut kodla bire bir; Akım\nbedelleri aynı. Sayı güvenlik tavanları geçildi. Kanıt:\n`artifacts/module-decisions-v7/design-audit.json`. Bu **tasarım/aritmetik denetimidir**."
    parts.append(ENDING.replace('{ARENAS}',arenas).replace('{SEASONS}',seasons).replace('{ROLLOUT}',rollout).replace('{AUDIT}',checked))
    return '\n'.join(parts)+'\n'

if __name__=='__main__':
    data=json.loads(SPEC.read_text(encoding='utf8'));result=audit(data)
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'design-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    DOC.write_text(render(data,result),encoding='utf8')
    print(json.dumps({k:v for k,v in result.items() if k not in {'bounds','examples'}},ensure_ascii=False))
