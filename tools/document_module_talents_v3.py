"""Regenerate the active talent specification from the same data as combat."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'server'))
from app.module_roster import MODULE_SPECS
from app.game.module_talents_v3 import SPECIALIZATIONS
from app.game.talents import TALENT_COSTS,TALENT_LEVELS

lines=['# GRIDSHARD — Modül yetenekleri V7.1, 1 Kasım 2026','',
       'Aktif 24 modül için geçerlidir. Kaynak `server/app/game/module_talents_v3.py`; eşik ve fiyat kaynağı `server/app/game/talents.py`. `python tools/document_module_talents_v3.py` ile yeniden üretilir.','',
       'Her eşikte iki daldan biri seçilir. Kartların mevcut görevi geliştirilir; yetenekler rastgele yerleşimi, öncelikli hedefleri ve kartın Akım bedelini değiştirmez. Savaşın tek ekonomisi Akımdır. Enerji/Isı ya da emekli kartlar geri gelmez. Çekirdek dalları bu değişikliğin kapsamında değildir.','',
       '| Eşik | Sol dal | Sağ dal |','|---|---|---|',
       '| Temel | Mevcut işin gücü +%3 | Azami CAN +%5 |',
       '| İmza | Aşağıdaki karta özel sol uzmanlık | Karta özel sağ uzmanlık |',
       '| İnce ayar | Atış/eylem aralığı −%4; pasif kartlarda işin gücü +%4 | Azami CAN +%5 |',
       '| Ustalık | Mevcut işin gücü +%6 | Azami CAN +%8 |','',
       'İşin gücü: saldırıda hasar; diğer kartlarda blok, zırh, yansıma, dost koruması, faz süresi, kalkan CAN, onarım, atış bonusu, kesinti süresi, yavaşlatma veya hız yükü. Bariyer’de alınan onarım artar. Arındırıcı’da arındırma dolumu kısalır; tek seferde yine bir olumsuz etki silinir. Ustalık bağımsızdır; imza seçilmemişken de yarar sağlar.','',
       'Önce imza dalının sabit değer/dağılım değişimleri, sonra temel/ince ayar/ustalık çarpanları uygulanır. +%3, +3 yüzde puan değildir. Örneğin %60 blok ×1,03=%61,8. Süre ve oranlar seviyeyle büyümez; mutlak miktarlar seviye eğrisini bir kez alır. Ayrıntılı karar ve testler: `NIHAI_MODUL_ENDERLIK_YETENEK_V7_20261101.md` ve `V7_UYGULAMA_VE_STRATEJI_TESTLERI_20261101.md`.','',
       '## Aynen korunan maliyetler','',
       'Her hücre **Devre Kredisi / Akı** biçimindedir. Normal ücret ve seçili eşik başına **25 Akı** sıfırlama değişmedi. V7 geçişinde davranışı değişen kartlarda önceden ücretli seçilmiş eşikler için bir defalık ücretsiz yeniden seçim vardır: ücretsiz sıfırlama + yalnız eski satın alınmış eşiklerin ücretsiz tekrar seçimi. Yeni eşikler ücretlidir; hak tekrar girişte yenilenmez. Eski bedeller iade edilmez.','',
       '| Enderlik | Açıldığı seviyeler | Temel | İmza | İnce ayar | Ustalık |','|---|---|---|---|---|---|']
for rarity,label in (('common','Yaygın'),('rare','Nadir'),('epic','Epik'),('legendary','Efsanevi')):
    prices=[f'{credits:,} / {flux:,}'.replace(',','.') for credits,flux in TALENT_COSTS[rarity]]
    lines.append('| '+' | '.join([label,' / '.join(map(str,TALENT_LEVELS[rarity])),*prices])+' |')
lines+=['','## Kartlara özel imza seçenekleri','','| Modül | Sol dal | Sağ dal |','|---|---|---|']
for key,spec in MODULE_SPECS.items():
    choices=[f"**{c['name_tr']}** — {c['description_tr']}" for c in SPECIALIZATIONS[key]]
    lines.append('| '+' | '.join([spec['name_tr'],*choices])+' |')
lines+=['','## Kayıt ve uygulama','',
        'Eski eşik (`0`–`3`) ve dal (`power`/`resilience`) kimlikleri korunur. Arşivdeki geçerli ücretli seçimler yalnız halen aktif kartlara, ek ücret alınmadan ve mevcut yeni seçimlerin üzerine yazılmadan bir kez bağlanır. Sonraki sıfırlama kalıcıdır. Emekli kartların kayıtları özel arşivde kalır; işlem fişleri değişmez.','',
        'Kart ekranının istatistikleri ile savaş aynı hesaplanan parametreleri kullanır. Yetersiz cüzdan, seviye kilidi ve yinelenen istekler sunucuda denetlenir. Bu kodu geliştirmek gerçek oyuncu verilerinin veya telefondaki uygulamanın güncellendiği anlamına gelmez.','']
(ROOT/'docs/YETENEK_KANONU.md').write_text('\n'.join(lines),encoding='utf8')
print('docs/YETENEK_KANONU.md updated')
