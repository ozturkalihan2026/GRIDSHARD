"""Source/cue/mobile inventory and PCM measurements; never claims device listening."""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
from app.module_roster import MODULE_SPECS

OUTPUT = ROOT / 'docs/planning/release-240-audio-measurements.json'
MODULE_DOC = ROOT / 'docs/planning/release-240-module-audio-matrix.md'
CORE_DOC = ROOT / 'docs/planning/release-240-core-audio-matrix.md'


def pcm(path):
    with wave.open(str(path), 'rb') as reader:
        if reader.getsampwidth() != 2 or reader.getnchannels() != 1:
            raise ValueError(f'Expected mono PCM16 SFX: {path}')
        samples = array.array('h', reader.readframes(reader.getnframes()))
        rate = reader.getframerate()
    x = [v / 32768 for v in samples]
    peak = max(map(abs, x))
    rms = math.sqrt(sum(v*v for v in x) / len(x))
    return dict(seconds=round(len(x)/rate, 5), sample_rate=rate, peak=round(peak, 6),
        rms=round(rms, 6), dc=round(sum(x)/len(x), 8),
        max_step=round(max(abs(b-a) for a,b in zip(x,x[1:])), 6),
        boundary=max(abs(x[0]),abs(x[-1])), clipped_samples=sum(abs(v)>=.999 for v in x),
        sha256=hashlib.sha256(path.read_bytes()).hexdigest())


def build():
    script = r"""
const fs=require('fs'),vm=require('vm');
const profiles=require('./client/src/battle/module-presentation-profiles.js');
require('./client/src/gridshard-audio.js');
const source=fs.readFileSync('./client/src/app.js','utf8'),ctx=vm.createContext({GridshardModulePresentation:profiles});
vm.runInContext(source.slice(source.indexOf('  const WEAPON_PRESENTATION = Object.freeze({'),source.indexOf('  function selectedBattlePoolDefinitionIds()')),ctx);
const support={shield:'shield_absorb',armor:'shield_absorb',repair:'repair_beam',amplifier:'amplifier_charge',emp:'emp'};
console.log(JSON.stringify({modules:Object.values(profiles).map(p=>({id:p.id,cue:p.travel!==null?ctx.weaponCue(p.id):(support[p.id]||p.cue)})),
 cues:global.GRIDSHARD_SFX_CUES,cores:Object.keys(require('./client/src/battle/core-vfx-v6.js').THEMES),mix:global.GRIDSHARD_AUDIO_MIX,
 voices:global.GRIDSHARD_SFX_VOICE_LIMIT}));
"""
    runtime = json.loads(subprocess.check_output(['node', '-e', script], cwd=ROOT, text=True))
    manifest = json.loads((ROOT / 'client/assets/audio/mobile/manifest.json').read_text(encoding='utf-8'))
    def asset(cue):
        definition = runtime['cues'][cue]
        source = ROOT / 'client' / definition['asset']
        identity = source.relative_to(ROOT / 'client/assets/audio').with_suffix('').as_posix()
        metrics = pcm(source)
        entry = manifest['sources'][identity]
        if entry['sha256'] != metrics['sha256']:
            raise ValueError(f'Stale master: {cue}')
        for extension in ('ogg','m4a'):
            path = ROOT / 'client/assets/audio/mobile' / f'{identity}.{extension}'
            if hashlib.sha256(path.read_bytes()).hexdigest() != entry[f'{extension}_sha256']:
                raise ValueError(f'Stale/corrupt mobile derivative: {cue} {extension}')
        gain = definition.get('gain', 1)
        return dict(cue=cue, asset=definition['asset'], gain=gain,
                    effective_rms_before_bus=round(metrics['rms']*gain,6), mobile=['ogg','m4a'], **metrics)
    modules = [dict(id=row['id'], category=MODULE_SPECS[row['id']]['category'], **asset(row['cue'])) for row in runtime['modules']]
    cores = [dict(id=identity, kind=kind, required_event='core_power_used' if kind=='activate' else
                  'not_used_by_current_reinforcement_mechanic' if identity=='core_capacitor' else 'attack_performed/core_attack',
                  **asset(identity+'_'+kind)) for identity in runtime['cores'] for kind in ('activate','shot')]
    return dict(revision=1, device_listening_verified=False, modules=modules, cores=cores,
        voice_budget=runtime['voices']['maxRoutineVoices'], mix=runtime['mix'])


def render(report, core=False):
    title = '# 2.4.0 / AUDIO-02 — çekirdek ses matrisi' if core else '# 2.4.0 / AUDIO-01 — modül ses matrisi'
    lines = [title, '', 'Yerel kaynak/bağlantı ölçümüdür; fiziksel Android dinleme kabulü değildir. '
             'Kullanıcı bu turda yerel kontrollerle ilerlenmesini istedi.', '',
             '[Ölçümler](release-240-audio-measurements.json) · [Gezinme kabulü](release-240-navigation-matrix.md) · '
             '[2.4.0 briefi](releases/2.4.0.md)', '',
             'Üretim: `python tools/report_combat_audio.py --write`; CI tutarlılığı: `--check`. '
             'OGG/AAC kaynak ve türev hash’leri denetlenir. Mobil çözümlemede diğer paketlenmiş biçim WAV’dan önce denenir.', '']
    if core:
        lines += ['Yedi çekirdek aktivasyonu ve altı gerçek saldırı ailesi sunucu olaylarından duyulur. '
                  'Takviye çekirdeğinin `shot` dosyası uyumluluk için vardır; takviye mekaniğine yapay atış eklenmedi. '
                  'Görsel ankraj bulunamasa da gerçek olayın sesi çalışır; snapshot tekrarından ses üretilmez.', '',
                  '| Çekirdek / tür | Olay | Cue / WAV | Süre | Tepe | RMS | En büyük örnek adımı |',
                  '| --- | --- | --- | --- | --- | --- | --- |']
        for row in report['cores']:
            lines.append(f"| {row['id']} / {row['kind']} | {row['required_event']} | `{row['cue']}` | {row['seconds']} s | {row['peak']} | {row['rms']} | {row['max_step']} |")
        lines += ['', 'Kondansatör örneğinde nota sınırında `f*t` faz sıçraması kaldırıldı; faz her örnekte biriktirilir. '
                  'En büyük komşu örnek farkı aktivasyonda 0,1431’den 0,05536’ya, kısa etkide 0,1868’den 0,04053’e indi. '
                  'Aktivasyonlar 0,48–0,64 s, kısa etki örnekleri 0,20–0,27 s. Sürekli gürültü katmanı yoktur; '
                  'yumuşak giriş/çıkış ve tek doğrusal normalizasyon kullanılır. Ham kaynaklarda sert kırpma yoktur.']
    else:
        lines += ['Aktif 24 modülün on saldırı ailesi `attack_performed` üzerinden gerçek `weaponCue` seçimiyle '
                  'çözülür. Diğer on dört modülün savunma/onarım/arındırma/EMP/Akım olayları aynı mevcut VFX '
                  'sahibinde kalır. Hasar veren echo/followup/dot olaylarının sesi module-vfx tarafından bir kez verilir; '
                  'ikinci bir atış başlatılmaz.', '',
                  '| Modül | Sınıf | Cue | Kaynak WAV | Süre | Tepe | Cue sonrası RMS | Mobil |',
                  '| --- | --- | --- | --- | --- | --- | --- | --- |']
        for row in report['modules']:
            lines.append(f"| {row['id']} | {row['category']} | `{row['cue']}` | `{row['asset']}` | {row['seconds']} s | {row['peak']} | {row['effective_rms_before_bus']} | OGG/AAC |")
        lines += ['', 'Özellikle Railgun, Ark Topu, Dron, Plazma Havan, Kuantum Tekrarlayıcı, Seri Top ve '
                  'Kalkan Kırıcı örnekleri kısa, fazı sürekli ve eşit RMS hedefiyle üretildi. Darbe Topu kaynağı da '
                  'aynı üreticiye bağlıdır. Lazerin onaylı kısa darbesi korunur. Atış/isabet trimleri birbirini bastırmayacak '
                  'şekilde ayrılır; genel müzik ve SFX kanalını yükseltme yapılmadı.']
    lines += ['', 'Üç rutin ses / 420 ms bütçesi, öncelikli çekirdek ve tekrar aralıkları korunur. '
              '`triggerCue.played` kabulü, `playback` gerçek başlatma sonucunu gösterir; `suppression` '
              'sessiz/etkin olmayan durumla voice-limit bastırmasını ayırır. Her eşzamanlı olayı ayrı sesle çalmak vaat edilmez.', '',
              'Yerel doğrulama: kaynak/codec hash ve PCM sınır testleri, gerçek Chrome OGG/AAC decode ve '
              'WAV bulunmayan paket fallback’i, mute/düşük ses/arka plan ve re-render tekilliği. '
              'Dört saniyelik yoğun savaş/müzik çevriminde yerel Chromium ve Android öykünmesi '
              '0,782059 tepe ve sıfır kırpılan örnek verdi. Windows WebKit ikilisinde AudioContext '
              'bulunmadığından bu yerel ses senaryosu atlanır; macOS WebKit CI kapısı açıktır. '
              'Gerçek hoparlör/kulaklık dinlemesi kullanıcı tarafından sonraya bırakıldı; cızırtının fiziksel cihazda '
              'duyulmadığına dair kabul verilmedi.', '']
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--write', action='store_true')
    group.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    outputs = {OUTPUT:json.dumps(report,ensure_ascii=False,indent=2)+'\n', MODULE_DOC:render(report), CORE_DOC:render(report,True)}
    for path, expected in outputs.items():
        if args.write: path.write_text(expected,encoding='utf-8')
        elif not path.is_file() or path.read_text(encoding='utf-8') != expected:
            raise ValueError(f'Audio inventory differs: {path}; run --write')
    print(json.dumps(dict(modules=len(report['modules']),cores=len(report['cores'])//2,device_listening_verified=False)))


if __name__ == '__main__':
    main()
