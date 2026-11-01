"""Paired report: start 7, 3s passive, 100 dealt AND 50 received HP -> +1."""
from pathlib import Path
import json,statistics,collections
import probe_strategy_v7 as probe

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/received-current-final'
DOC=ROOT/'docs/AKIM_100_VERILEN_50_ALINAN_BASLANGIC7_TESTI_20261101.md'


def load(name,file='battles.json'):
    return json.loads((ROOT/'artifacts'/name/file).read_text(encoding='utf8'))


def metrics(rows):
    result=probe.summarize(rows);result['telemetry']={}
    for policy in ('attack','defense','mixed'):
        sides=[(r,s) for r in rows for s,p in r['policies'].items() if p==policy]
        minutes=sum(r['seconds'] for r,s in sides)/60
        result['telemetry'][policy]={
            'appearances':len(sides),'combat_bonus':sum(r['damage_current'][s] for r,s in sides),
            'bonus_per_minute':round(sum(r['damage_current'][s] for r,s in sides)/minutes,2),
            'no_combat_bonus':sum(r['damage_current'][s]==0 for r,s in sides),
            'median_placements':statistics.median(sum(r['placements'][s].values()) for r,s in sides),
            'median_total_income':statistics.median(r['economy_end'][s]['earned'] for r,s in sides)}
    result['unfinished_by_core']=dict(collections.Counter(r['core'] for r in rows if not r['finished']))
    result['by_level']={}
    for level in (1,8,15):
        games=[r for r in rows if r['level']==level]
        result['by_level'][level]=probe.summarize(games)
    return result


def main():
    OUT.mkdir(exist_ok=True)
    parts=[ load('received-current-final','deck0-frozen.json'),
        load('received-current-100-50-deck1'),load('received-current-100-50-deck2')]
    assert [len(r) for r in parts]==[216,216,216],'Wait for all three complete deck shards'
    candidate=sum(parts,[])
    live=load('received-current-live-control');passive=load('received-current-passive-control')
    for rows in (live,passive):
        assert len(rows)==len(candidate)==648
        for old,new in zip(rows,candidate):
            for key in ('policies','deck_index','decks','core','level','seed','swapped','talents'):
                assert old[key]==new[key],key
    (OUT/'battles.json').write_text(json.dumps(candidate,ensure_ascii=False,indent=2),encoding='utf8')
    result={'live':metrics(live),'passive_control':metrics(passive),'candidate':metrics(candidate),
        'candidate_config':{'starting':7,'capacity':12,'passive_ms':3000,'damage_threshold':100,
            'received_hp_threshold':50,'bonus_wait_ms':0,'new_hp_only':True,'automatic_class_quota':False},
        'sources':['received-current-final/deck0-frozen.json','received-current-100-50-deck1','received-current-100-50-deck2']}
    (OUT/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    text='''# Akım: 100 verilen + 50 alınan CAN, 3 sn pasif, başlangıç 7

1 Kasım 2026. **Yalnız motor/simülasyon adayı. Ana oyun varsayılanı,
telefon APK’sı, çalışan telefon sunucusu ve oyuncu verileri değişmedi.**

## Test edilen tanım

- Başlangıç **7**, depo **12**, pasif **3000 ms’de +1**.
- Saldırı modüllerinin verdiği **100 yeni düşman CAN kaybı** VE kendi devrenin
  aldığı **50 yeni CAN kaybı** birlikte **ek +1 Akım**. Bekleme süresi **0**.
  Eşikler birlikte tüketilir; fazlalık taşınır, aynı anda çoklu ödeme olabilir.
- “Alınan” bu tur **gerçek CAN kaybıdır**, önceki adayın “emilen/engellenen”
  hasarı değildir. Zırh/Kalkan/Faz/Kubbe engellediği kısımla 50 sayacını
  doldurmaz. Savunma kartı bulundurmak koşul değildir; saldırı kartı veya
  çekirdek CAN kaybettiğinde de alınan hasar sayılır.
- Her iki yönde onarılan aynı CAN’ı tekrar kaybetmek kazanımı çoğaltmaz.
  Overkill, dost hasarı, kalkan oluşturma/silme ve yansıma kazanç değildir.
  Uygulanmış Plazma izi/Füze yükü gibi gerçek düşman silah hasarları sayılır.
- Önceki birleşik adayla aynı kaynak sınırı korunur: çekirdek saldırısı
  100’lük giden hasar koşulunu doldurmaz; düşman çekirdeğinin size verdiği
  gerçek CAN hasarı 50’lik alınan hasara dahildir. Ayrı İmha Kazancı +1’i
  bu adayda kapalıdır. Ana oyunun çekirdek/yetenek tanımı değişmemiştir.
- Depo 12’ye ister bonus ister pasif dolumla ulaşılsın, birleşik bonus
  sayaçları silinir. Depo dışında gizli Akım biriktirilmez.
- Aynı 24 kart, CAN/hasar/maliyet, 3 sınıf, yetenek fiyatları, hedef önceliği
  ve rastgele yerleşim kullanılır. Sınıf/kopya kotası veya karma deste buff’ı yoktur.

## Deney düzeni

Üç serinin **her birinde 648 maç**: 3 strateji çifti × 3 deste × 6 çekirdek ×
3 seviye (1/8/15) × 2 taraf × 2 tohum. Aynı adaptif yerleştirme politikası
her üç ekonomide kullanılır; eşleşmiş desteler/çekirdek/seviye/tohum/taraf
rapor betiğinde birebir doğrulanır. Normal modül ve çekirdek yetenek seçimi
yoktur. Takviye çekirdeği kendi modül çağırmasıyla “yalnız Savunma” koşulunu
bozabildiğinden bu matrise dahil değildir. Sonuçlar bu bot/deste örneklemine
aittir; insan kazanma oranı veya tüm desteler için denge onayı değildir.

Üç ekonomi:

1. Mevcut varsayılan: başlangıç 6 / 2,5 sn pasif / 200 yeni CAN +1 / bonus en az 6 sn.
2. Pasif kontrol: başlangıç 7 / 3 sn pasif / **savaş bonusu yok**.
3. Kullanıcı adayı: başlangıç 7 / 3 sn pasif / **100 verilen + 50 alınan** ek +1 / bekleme yok.

Gözlem 900 saniyede durur; motorda süreyle otomatik galip/mağlup veya zorunlu
bitiş yoktur. Süren maçlar tabloda galibiyet ya da mağlubiyet sayılmaz.
Uzayan savaşların yalnız biten altkümesindeki süre ortancası genel maç
süresiymiş gibi okunmamalıdır. Aday üç bağımsız deste grubunda çalıştırılıp
tek 648’lik diziye birleştirilmiştir; mükerrer maçlar sonuçlara eklenmez.

## Sonuçlar

| Ölçüm | Mevcut | 7 başlangıç / 3 sn, bonus yok | 7 başlangıç / 3 sn, 100+50 |
|---|---:|---:|---:|
'''
    variants=[result[k] for k in ('live','passive_control','candidate')]
    for title,key in [('Biten maç','finished'),('900 sn’de süren maç','timeouts'),('Bitenlerde ortanca süre (sn)','seconds_median_finished')]:
        text+='| '+title+' | '+' | '.join(str(v[key]) for v in variants)+' |\n'
    text+='\n| Eşleşme | Mevcut: karma kazanır | Pasif kontrol: karma kazanır | Aday: karma kazanır | Aday: rakip kazanır | Aday: sürer |\n|---|---:|---:|---:|---:|---:|\n'
    for pair,label in [('attack_vs_mixed','Karma–Saldırı'),('defense_vs_mixed','Karma–Savunma')]:
        a,b,c=[v['pairs'][pair] for v in variants]
        text+=f"| {label} | {a['right_wins']}/216 | {b['right_wins']}/216 | {c['right_wins']}/216 | {c['left_wins']}/216 | {c['timeouts']}/216 |\n"
    text+='\n### Adaydaki strateji başına gelir ve yerleştirme\n\n| Strateji | Katılım | Kazanır | Kaybeder | Sürer | Savaş bonusu / oyun dakikası | Ortanca yerleştirme |\n|---|---:|---:|---:|---:|---:|---:|\n'
    for p,label in [('attack','Saldırı'),('defense','Savunma'),('mixed','Karma')]:
        s=result['candidate']['policies'][p];t=result['candidate']['telemetry'][p]
        text+=f"| {label} | {s['games']} | {s['wins']} | {s['losses']} | {s['timeouts']} | {t['bonus_per_minute']} | {t['median_placements']} |\n"
    text+='\nBonus/dakika toplam savaş bonusunun toplam oyuncu oyun süresine bölünmesidir; pasif ve başlangıç hariçtir. Bir maç iki farklı strateji katılımı içerir.\n'
    text+='\n### Seviyeye göre süren maç\n\n| Seviye | Mevcut | Pasif kontrol | Aday |\n|---|---:|---:|---:|\n'
    for level in (1,8,15):text+=f"| {level} | "+' | '.join(str(v['by_level'][level]['timeouts'])+'/216' for v in variants)+' |\n'
    timeouts=[r for r in candidate if not r['finished']]
    text+='\n## Gelir akışı incelemesi\n\n'
    if timeouts:
        r=timeouts[0]
        text+=f"İlk süren örnek: {r['core']}, SV{r['level']}, seed {r['seed']}, {r['policies']}.\n\n"
        for side in ('a','b'):
            p=r['policies'][side];eco=r['economy_end'][side]
            text+=f"- {p}: 900 sn’de {r['damage_current'][side]} bonus Akım, {sum(r['placements'][side].values())} yerleştirme; son bakiye {eco['balance']}.\n"
        text+='\nBu, önceki pasifsiz adayın 0 Akımla iki çekirdekte kalmasıyla aynı sorun değildir. Devreler savaşır, Akım kazanır ve silahlarını yeniler; gözlem içinde savaş sonuçlanmaz. 900 sn’de süren her maçın sonsuza kadar süreceği iddia edilmez.\n'
    text+='''
## Değerlendirme ve uygulama sınırı

**Başlangıç 7**, testteki en ucuz 4+3 Saldırı/Savunma çiftini başlangıçta
alınabilir yapar. **3 sn pasif**, savaş hasarı olmadan da yeni kart için
bütçenin zamanla oluşmasını sağlar. Önceki pasifsiz adayın ekonomik çıkış
yokluğu böylece giderilir.

Ancak **gerçek CAN kaybını** ödüllendirmek Savunma sınıfını zorunlu kılmaz:
yalnız silah kuran oyuncu da vurup vurularak aynı bonusu kazanır. Koruma
hasarı önlediğinde 50’lik sayacın artışını da yavaşlatır. Bu nedenle yeni
bonus, karma devreyi ödüllendiren bir savunma koşulu olarak yorumlanmamalıdır.

100/50’nin 6 sn aralığı olmadan sürekli yeni kurulan modüllerden gelmesi,
yüksek tempoda yerleştirme/hasar/yeniden yerleştirme akışını büyütebilir.
Raporun mevcut ve pasif kontrol sütunları, bonusun etkisini başlangıç ve
pasif dolum değişikliğinden ayırmak içindir. Aday otomatik biçimde ana oyuna
alınmamıştır; bir sonraki ayar kararı bu ölçümler üzerinden verilmelidir.

Bu testte hedeflenen “doğru karma yalnız Saldırıdan üstün olsun” sonucu
sağlanmamıştır: 216 eşleşmede karma 28, yalnız Saldırı 121 galibiyet alır;
67 maç gözlem sonunda sürer. Aynı başlangıç/pasif dolumla bonus kapalıyken
karma 170/216 kazanmıştır ve bütün maçlar bitmiştir. Dolayısıyla başlangıç
7 ve pasif 3 sn ile **alınan CAN bonusunu** aynı karar gibi değerlendirmemek
gerekir. Sonraki aday önerisi: bu başlangıç/pasif değerlerini koruyup bonusun
ikinci koşulunu gerçek Savunma kaynaklı emilen/engellenen hasarla sınamak.
Bu sonraki kombinasyon henüz bu raporda test edilmiş veya onaylanmış değildir.

314 odaklı sunucu testi PASS (14 yeni alınan-hasar adayı, 15 önceki emilim
adayı ve 285 mevcut oyun kontrolü). Tam tarihsel sunucu kümesi/istemci
sunumu/telefon testi iddiası yoktur. Checkpoint ve bu rapor güncellenmiştir.

## Tekrar üretme

- `tools/probe_strategy_v7.py --all-cores --seeds 2 --seed-base 523 --mixed-third buffer --output NAME`.
- Pasif kontrol için `--starting 7 --regen 3000 --threshold 0`.
- Aday için `--starting 7 --regen 3000 --threshold 100 --joint-received 50`.
  İsteğe bağlı `--deck-index 0/1/2` grupları bağımsız çalıştırır.
- `tools/report_received_current_v7.py` eşitliği doğrular, ham aday maçlarını
  `artifacts/received-current-final/battles.json` içinde toplar ve raporu üretir.
- Kaynak seriler `artifacts/received-current-*`; test kaydı
  `artifacts/module-v7-rollout/received-current-regression-tests.log`.
'''
    DOC.write_text(text,encoding='utf8')
    print(json.dumps({'report':str(DOC),'candidate':result['candidate']['pairs'],'running':len(timeouts)},ensure_ascii=False))


if __name__=='__main__':main()
