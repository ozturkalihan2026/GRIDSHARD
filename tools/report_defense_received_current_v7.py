"""Paired decisions for 100 outgoing + 50 HP lost specifically by Defense."""
import json,statistics,collections
from pathlib import Path
from report_received_current_v7 import metrics

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/defense-received-final'
DOC=ROOT/'docs/AKIM_100_HASAR_50_SAVUNMA_CAN_BASLANGIC7_TESTI_20261101.md'


def load(name,file='battles.json'):
    return json.loads((ROOT/'artifacts'/name/file).read_text(encoding='utf8'))


def paired(a,b,n):
    assert len(a)==len(b)==n
    for old,new in zip(a,b):
        for key in ('policies','deck_index','decks','core','level','seed','swapped','talents'):
            assert old[key]==new[key],key


def main():
    OUT.mkdir(exist_ok=True)
    parts=[load(f'defense-received-100-50-deck{i}') for i in range(3)]
    assert [len(r) for r in parts]==[216,216,216]
    rows=sum(parts,[])
    sources={'live':load('received-current-live-control'),
        'passive':load('received-current-passive-control'),
        'any_received':load('received-current-final'),'defense_received':rows}
    for comparison in sources.values():paired(rows,comparison,648)
    result={name:metrics(r) for name,r in sources.items()}
    shared=load('defense-received-shared');shared_control=load('defense-received-shared-control')
    paired(shared,shared_control,324)
    camp=load('defense-received-camp','summary.json')
    paired(load('defense-received-camp','candidate-battles.json'),load('defense-received-camp','passive_control-battles.json'),54)
    weak=load('defense-received-weak-mixed','summary.json')
    paired(load('defense-received-weak-mixed','candidate-battles.json'),load('defense-received-weak-mixed','passive_control-battles.json'),18)
    talents={branch:load(f'defense-received-talents-{branch}','summary.json') for branch in ('power','resilience')}
    result['shared']={'candidate':metrics(shared),'control':metrics(shared_control)}
    result.update(camp=camp,talents=talents,alternative_mixed=weak)
    result['candidate_config']={'starting':7,'capacity':12,'passive_ms':3000,'outgoing_attack_hp':100,
        'received_defense_hp':50,'bonus_wait_ms':0,'actual_hp_not_absorption':True,'new_hp_only':True}
    (OUT/'battles.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
    (OUT/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    text='''# Akım: 100 verilen hasar + Savunma modüllerinin 50 CAN kaybı

1 Kasım 2026. **Opt-in simülasyon adayıdır; ana ekonomi, telefon APK’sı,
çalışan telefon sunucusu ve gerçek oyuncu verileri değiştirilmedi.**

## Kesin kural

- Başlangıç **7**, depo **12**, pasif **3000 ms’de +1**.
- Saldırı sınıfındaki modüllerin verdiği **100 yeni gerçek düşman CAN kaybı**
  VE Savunma sınıfındaki kendi modüllerimizin aldığı **50 yeni gerçek CAN
  kaybı**, birlikte **ek +1 Akım** verir. Bonus beklemesi **0**.
- **Alınan CAN ile emilen hasar farklıdır.** Zırh/Kalkan/Faz/Kubbe önlediği
  miktarla 50 koşulunu doldurmaz; koruma sonrası Savunma kartının gerçekten
  kaybettiği CAN sayılır. Savunma kartının başka bir Saldırı kartına verdiği
  kalkan, o Saldırı kartının CAN kaybını Savunmaya ait yapmaz.
- Saldırı/Taktik kartlarının ve çekirdeğin kendi CAN kaybı 50’ye dahil değildir.
  Düşman Saldırı kartı veya çekirdeğinden Savunmaya gelen gerçek hasar sayılır.
- Önceki adaylarda olduğu gibi, çekirdeğin verdiği hasar 100’lük Saldırı
  koşulunu doldurmaz. Yansıma, dost hasarı, overkill, kalkan üretimi/silinmesi
  ve onarılarak tekrar kaybedilen aynı CAN gelir doğurmaz. Uygulanmış gerçek
  düşman silah izi/fünye/yankı etkileri kaynaklarıyla sayılır.
- İki eşik birlikte tüketilir, artan miktar taşınır; bir anda birkaç çift
  tamamlanırsa birkaç Akım verilebilir. Pasif veya bonusla 12’ye ulaşınca
  iki sayaç da temizlenir; depo dışında gizli bankalama yoktur.
- Ayrı İmha Kazancı +1’i adayda kapalıdır. Asıl çekirdek/yetenek tanımı,
  24 kart, CAN/hasar/maliyet, rastgele yerleşim, hedef önceliği ve kopya/sınıf
  kotasızlığı korunur. Yeni kural sadece config ile açılır; UI’ye yüklenmedi.

## Eşleştirilmiş ana deney

Her ekonomi **648 maç**: 3 strateji çifti × 3 deste × 6 aynı çekirdek ×
SV1/8/15 × 2 taraf × 2 tohum (523/624 + deste indeksi). Önceki aynı adaptif
bot politikası korunur. Önceki üç ekonomi için kaydedilmiş doğrulanmış maçlar
yeniden kullanılır; yeni adayın her maçında deste/çekirdek/seviye/tohum/taraf
eşitliği rapor betiğinde doğrulanır.

Ana deneyde modül/çekirdek yetenekleri seçili değildir. Takviye, normal kart
oynamadan Saldırı çağırıp “yalnız Savunma” koşulunu bozabildiği için ana
matrise dahil değildir. Yalnız Savunma destesi yasal zorunlu Saldırı kartını
taşır fakat oynamaz. Çekirdek gücü bütün politikalarda aynı bot kuralıyla
kullanılır. Bunlar seçili bot/deste sonuçlarıdır; insan kazanma oranı veya
bütün kombinasyonlar için onay değildir.

Normal gözlem **900 saniye**. Süre dolunca zorunlu bitiş/galip/mağlup
üretilmez; sürmekte olan maçlar kazanç/kayıp sayılmaz. Süre ortancaları
yalnız biten maçlar içindir.

| Ölçüm | Mevcut 6 / 2,5 sn / 200 | 7 / 3 sn, bonus yok | 7 / 3 sn, herhangi kartta 50 CAN | 7 / 3 sn, yalnız Savunmada 50 CAN |
|---|---:|---:|---:|---:|
'''
    vs=[result[k] for k in ('live','passive','any_received','defense_received')]
    for label,key in [('Biten maç','finished'),('900 sn’de sürer','timeouts'),('Bitenlerde ortanca süre (sn)','seconds_median_finished')]:
        text+='| '+label+' | '+' | '.join(str(v[key]) for v in vs)+' |\n'
    text+='\n| Karma stratejinin rakibi | Mevcut: karma galibiyet | Bonus yok: karma galibiyet | Herhangi CAN: karma galibiyet | Yalnız Savunma CAN: karma galibiyet |\n|---|---:|---:|---:|---:|\n'
    for pair,label in [('attack_vs_mixed','Yalnız Saldırı'),('defense_vs_mixed','Yalnız Savunma')]:
        text+='| '+label+' | '+' | '.join(str(v['pairs'][pair]['right_wins'])+'/216' for v in vs)+' |\n'
    text+='\n### Yeni adayın stratejileri\n\n| Politika | Katılım | Kazanır | Kaybeder | Sürer | Bonus / oyun dakikası | Hiç bonus almayan |\n|---|---:|---:|---:|---:|---:|---:|\n'
    for policy,label in [('attack','Saldırı'),('defense','Savunma'),('mixed','Karma')]:
        p=result['defense_received']['policies'][policy];t=result['defense_received']['telemetry'][policy]
        text+=f"| {label} | {p['games']} | {p['wins']} | {p['losses']} | {p['timeouts']} | {t['bonus_per_minute']} | {t['no_combat_bonus']} |\n"
    text+='\nBonus/dakika toplam savaş bonusu / toplam oyuncu süresidir; başlangıç ve pasif hariçtir. Katılımlar iki rakip sınıfına eşit dağılır; eşleşme tablosu genel kazanma yüzdesinden daha açıklayıcıdır.\n'
    text+='\n## Ek kontroller\n\n### Aynı altı kart havuzu\n\n'
    text+='Yeni tohum 847, aynı kart havuzu her iki tarafta, altı çekirdek/üç seviye/iki taraf: 324 maç. Alınan kartların gücü farklılığını azaltıp oynama politikasını karşılaştırır. Aynı eşler 7 başlangıç/3 sn pasif, bonus kapalı olarak da çalıştırılır.\n\n'
    text+='| Eşleşme | Bonus yok: karma kazanır | Bonus yok: sürer | Yeni aday: karma kazanır | Yeni aday: sürer |\n|---|---:|---:|---:|---:|\n'
    for pair,label in [('attack_vs_mixed','Karma–Saldırı'),('defense_vs_mixed','Karma–Savunma')]:
        a=result['shared']['control']['pairs'][pair];b=result['shared']['candidate']['pairs'][pair]
        text+=f"| {label} | {a['right_wins']}/{a['games']} | {a['timeouts']}/{a['games']} | {b['right_wins']}/{b['games']} | {b['timeouts']}/{b['games']} |\n"
    text+=f"\nAdayda süren 34 maçın tamamı Kuantum/Dron/Zırh/Tampon/Onarım/Virüs havuzundadır. Savunma politikası Tampon ve Zırhı tekrarlar; karma devre bu havuzda Kırıcı veya alan hasarı seçemez. Bonus kapalı aynı-havuz kontrolünde de {result['shared']['control']['timeouts']}/324 maç sürmektedir; bu nedenle bütün 34 uzamayı yeni bonusa bağlamak doğru değildir. Bu, bütün karma destelerin her savunma yığılmasını çözebildiği anlamına gelmediğini gösterir. Sonuç zorunlu bitiş veya gizli hasar artışıyla düzeltilmemiştir.\n"
    text+='\n### Tek canlı silah + savunma yığma\n\n'
    for key,label in [('passive_control','7/3 sn, bonus yok'),('candidate','Yeni aday')]:
        p=camp[key]['policies']['mixed'];text+=f"- {label}: karma {p['wins']}/{p['games']} kazanır, {p['losses']} kaybeder, {p['timeouts']} maç sürer.\n"
    text+='\nAynı üç kamp destesi × üç çekirdek × SV1/8/15 × iki taraf =54 eş. Kart sayısına veya silah adedine yeni oyuncu kotası getirilmez; tek silah sınırı yalnız bu bot politikasıdır.\n'
    text+='\n### Modül yetenekleri\n\n'
    for branch,label in [('power','Güç dalı'),('resilience','Dayanıklılık dalı')]:
        t=talents[branch];a=t['pairs']['attack_vs_mixed'];d=t['pairs']['defense_vs_mixed']
        text+=f"- {label}, SV15/üç çekirdek: {t['finished']}/{t['games']} biter; karma Saldırıya {a['right_wins']}/{a['games']}, Savunmaya {d['right_wins']}/{d['games']} kazanır.\n"
    text+='\nBunlar tüm modüllerde aynı dalın seçildiği iki stres örneğidir; tüm karışık yetenek ağacı kombinasyonlarının simülasyonu değildir. Çekirdek yeteneği seçilmemiştir.\n'
    text+='\n### Onarım/güçlendirme içermeyen alternatif karma\n\n'
    for name,label in [('passive_control','Bonus kapalı'),('candidate','Yeni aday')]:
        p=weak[name]['pairs']['attack_vs_mixed'];text+=f"- {label}: karma {p['right_wins']}/{p['games']} kazanır, {p['left_wins']} kaybeder, {p['timeouts']} maç sürer.\n"
    text+='''
Bu deste Kuantum/Kırıcı/Faz/Son Siper/EMP/Virüs içerir; üç çekirdek, üç
seviye, iki taraf =18 eş. “Kötü deste” olduğu matematiksel bir gerçek değildir;
yalnız bonus olmayan kontrolde zayıf kalan başka bir bileşimdir. Sonuç,
bonusta sınıf bileşiminin büyük ekonomik etkisini gösterir; küçük karar ve
karşı-kart farklarını bastırıp bastırmadığı insan testinde de incelenmelidir.

## Karar

**Bu aday, denenen iki uç stratejiye karşı karma devreyi destekleme hedefini
ana örneklemde sağlıyor.** Başlangıç 7 ve 3 sn pasif, yeniden kurulum çıkışını
korur; yalnız silah kurmak 50 Savunma CAN koşulunu, yalnız savunma kurmak
100 Saldırı CAN koşulunu dolduramaz. Taktik sınıfı için yapay gelir koşulu yoktur.

**Buna bütün oyunun nihai dengesi denmez.** Ana örneklemde 100% karma
başarısı güçlü bir sınıf avantajına işaret eder; aynı havuzdaki Tampon yığılması
34 maçı sonuçsuz bırakır ve alternatif karma da bonusla çok güçlenir.
Savunma yığılmasına karşı kart erişimi ve bonusun avantaj büyüklüğü sonraki
denge kararında ayrıca değerlendirilmelidir. Modül/AI/yerleşim kuralı sonucu
istenen yöne taşımak için değiştirilmemiştir. Yeni sayılar ana oyuna otomatik
yazılmamış, APK üretilmemiş/yüklenmemiştir.

325 odaklı sunucu testi PASS: 11 Savunma-CAN adayı kontrolü + önceki 314
kontrol. Tam tarihsel sunucu/istemci/telefon onayı iddiası yoktur.

## Kanıt ve tekrar üretme

- `tools/probe_strategy_v7.py --all-cores --seeds 2 --seed-base 523 --mixed-third buffer --starting 7 --regen 3000 --threshold 100 --joint-received 50 --received-defense-only --deck-index 0/1/2 --output NAME`.
- Aynı havuz: `--shared-deck --seeds 1 --seed-base 847`; bonus olmayan kontrol `--threshold 0` ve joint bayrakları olmadan.
- `tools/probe_defense_received_camp_v7.py`: 54 eş kamp/karma, iki ekonomi.
- Modül yetenekleri: `--talent power/resilience --seed-base 1189`, üç çekirdek.
- `tools/report_defense_received_current_v7.py`: eşleşme doğrulaması, bu belge,
  `artifacts/defense-received-final/battles.json` ve `summary.json`.
- Kaynaklar `artifacts/defense-received-*`; test kaydı
  `artifacts/module-v7-rollout/defense-received-regression-tests.log`.
'''
    DOC.write_text(text,encoding='utf8')
    print(json.dumps({'report':str(DOC),'main':result['defense_received']['pairs'],
        'shared_control':result['shared']['control']['pairs'],'shared_candidate':result['shared']['candidate']['pairs']},ensure_ascii=False))


if __name__=='__main__':main()
