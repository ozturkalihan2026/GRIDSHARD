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
    band = x[:]
    coefficient = math.exp(-2 * math.pi * 600 / rate)
    for _ in range(3):
        filtered, previous_input, previous_output = [], 0, 0
        for value in band:
            previous_output = coefficient * (previous_output + value - previous_input)
            previous_input = value
            filtered.append(previous_output)
        band = filtered
    peak = max(map(abs, x))
    rms = math.sqrt(sum(v*v for v in x) / len(x))
    return dict(seconds=round(len(x)/rate, 5), sample_rate=rate, peak=round(peak, 6),
        rms=round(rms, 6), dc=round(sum(x)/len(x), 8),
        max_step=round(max(abs(b-a) for a,b in zip(x,x[1:])), 6),
        phone_band_rms_ratio=round(math.sqrt(sum(v*v for v in band) / len(band)) / rms, 6),
        boundary=max(abs(x[0]),abs(x[-1])), clipped_samples=sum(abs(v)>=.999 for v in x),
        sha256=hashlib.sha256(path.read_bytes()).hexdigest())


def build():
    script = r"""
const fs=require('fs'),vm=require('vm');
const profiles=require('./client/src/battle/module-presentation-profiles.js');
require('./client/src/gridshard-audio.js');
const source=fs.readFileSync('./client/src/app.js','utf8'),ctx=vm.createContext({GridshardModulePresentation:profiles});
vm.runInContext(source.slice(source.indexOf('  const WEAPON_PRESENTATION = Object.freeze({'),source.indexOf('  function selectedBattlePoolDefinitionIds()')),ctx);
const support={shield:'module_shield',armor:'module_armor',repair:'repair_beam',amplifier:'amplifier_charge',emp:'emp'};
console.log(JSON.stringify({modules:Object.values(profiles).map(p=>({id:p.id,family:p.audioFamily,cue:p.travel!==null?ctx.weaponCue(p.id):(support[p.id]||p.cue)})),
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
    modules = [dict(id=row['id'], family=row['family'], category=MODULE_SPECS[row['id']]['category'], **asset(row['cue'])) for row in runtime['modules']]
    cores = [dict(id=identity, kind=kind, required_event='core_power_used' if kind=='activate' else
                  'not_used_by_current_reinforcement_mechanic' if identity=='core_capacitor' else 'attack_performed/core_attack',
                  **asset(identity+'_'+kind)) for identity in runtime['cores'] for kind in ('activate','shot')]
    return dict(revision=1, device_listening_verified=False, modules=modules, cores=cores,
        voice_budget=runtime['voices']['maxRoutineVoices'], mix=runtime['mix'])


def render(report, core=False):
    title = '# 2.4.0 / AUDIO-02 — çekirdek ses matrisi' if core else '# 2.4.0 / AUDIO-01 — modül ses matrisi'
    lines = [title, '', 'Kaynak/bağlantı ve telefon bandı ölçümüdür; fiziksel Android dinleme kabulü değildir. '
             '6 Kasım fiziksel testinde v19 efektleri müzik altında duyulmadı, müziksiz çok kısık duyuldu. '
             'v20 ile duyulabilirlik kullanıcı tarafından doğrulandı; müzik dengesi ve çekirdeğin karakteri yetersiz bulundu. '
             'v21 görev temalı yeni ses ailesidir; yeni fiziksel kabul henüz verilmedi.', '',
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
        lines += ['', 'Katmanlar zamanla sürekli faz kullanır; nota sınırı veya sert kesme üretilmez. '
                  'Güncel en büyük örnek farkları yukarıdaki tabloda ölçülür; kesintisiz faz ve yumuşak sınırlar korunur. '
                  'v21 aktivasyonları 0,90–1,08 s; kısa etki örnekleri 0,23–0,32 s. '
                  'D/A açık beşli enerji toplanması, fiziksel boşalma ve kısa kristal kuyruk ortak imzadır; '
                  'yedi güç kendi dalga/kilit/alev/işaret/çağrı/onarım/yarık dokusunu taşır. '
                  'Yumuşak crest/slew denetimi, sıfır sınır ve DC düzeltmesi kullanılır; sert kırpma yoktur.']
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
                  'aynı üreticiye bağlıdır. v21 bütün 24 modülü göreve göre yeniden yazar: silah boşalır, '
                  'savunma emer/kilitlenir, destek onarır/yönlendirir. Kalkan ve Zırh aynı isabet sesi kullanmaz. '
                  'Güçlendirici artık UI Akım sesini paylaşmaz. Lazer kısa tek atış olarak kalır.']
    lines += ['', 'v21: savaş efekt çarpanı 0,70, savaş müzik çarpanı 2,35; v20’ye göre müzik '
              'geri alınır ve rutin efektler biraz geriye çekilir. Müzik dosyaları, menü/sonuç '
              'müziği ve kullanıcı sliderları değişmez. Çekirdek aktivasyon/atış trimleri '
              '0,78/0,58; modül trimleri göreve göre ayrıdır. Yeni bankada 24 modül, '
              '14 çekirdek ve altı mevcut yönlendirme kaynağı olmak üzere 44 WAV vardır. '
              'JSON içindeki phone_band_rms_ratio üç kademeli '
              '600 Hz yüksek geçiren filtreyle kalan RMS oranıdır; fiziksel SPL ölçümü değildir.']
    lines += ['', 'Üç rutin ses / 420 ms bütçesi, öncelikli çekirdek ve tekrar aralıkları korunur. '
              '`triggerCue.played` kabulü, `playback` gerçek başlatma sonucunu gösterir; `suppression` '
              'sessiz/etkin olmayan durumla voice-limit bastırmasını ayırır. Her eşzamanlı olayı ayrı sesle çalmak vaat edilmez.', '',
              'Yerel doğrulama: kaynak/codec hash ve PCM sınır testleri, gerçek Chrome OGG/AAC decode ve '
              'WAV bulunmayan paket fallback’i, mute/düşük ses/arka plan ve re-render tekilliği. '
              'Dört saniyelik yoğun savaş/müzik çevriminin güncel tepe/kırpma kanıtı '
              'e2e/battle-audio.spec.js çıktısındaki decoded-mobile-cue-matrix ekinde tutulur; '
              'eski v19 tepe ölçümü yeni miksin kabulü değildir. Windows WebKit ikilisinde AudioContext '
              'bulunmadığından bu yerel ses senaryosu atlanır; macOS WebKit CI kapısı açıktır. '
              'Gerçek hoparlör/kulaklık dinlemesi yeni test paketinden sonra kullanıcıdan beklenir; '
              'duyulabilirlik ve cızırtısızlık kabulü verilmedi.', '']
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
