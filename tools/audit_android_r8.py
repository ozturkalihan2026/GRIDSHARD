"""Verify the optimizer and runtime-discovered Capacitor classes in the AAB.

DEX tables follow https://source.android.com/docs/core/runtime/dex-format.
This is a release artifact check, not a replacement for device testing.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import zipfile

R8_METADATA = 'BUNDLE-METADATA/com.android.tools/r8.json'
MAPPING = 'BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map'
ANNOTATION = 'Lcom/getcapacitor/annotation/CapacitorPlugin;'
POLICY = json.loads((Path(__file__).resolve().parents[1] / 'config/mobile-distribution.json').read_text(encoding='utf-8'))
FORBIDDEN_PACKAGES = ('com.android.billingclient.', 'ee.forgr.nativepurchases.',
                      'com.getcapacitor.community.admob.', 'com.google.android.gms.ads.',
                      'com.google.android.gms.internal.ads.', 'com.google.ads.', 'com.google.android.ump.',
                      'com.gridshard.nativeui.GridshardAdSafety')


def without_monetization(version):
    if not re.fullmatch(r'\d+\.\d+\.\d+', version):
        raise ValueError('Invalid packaged release version')
    return tuple(map(int, version.split('.'))) >= tuple(map(int, POLICY['without_monetization_from'].split('.')))


def audit_no_monetization(bundle, plugins, classes, mapping):
    """Inspect the final artifact, including original names before obfuscation."""
    if any(p.get('pkg') in POLICY['excluded_plugins']
           or p['classpath'].startswith(FORBIDDEN_PACKAGES) for p in plugins):
        raise ValueError('Monetization plugin packaged in a free release')
    names = [name[1:-1].replace('/', '.') for name in classes]
    names += re.findall(r'^([^\s#]+) -> [^\r\n]+:\r?$', mapping.decode('utf-8'), re.M)
    if any(name.startswith(FORBIDDEN_PACKAGES) for name in names):
        raise ValueError('Advertising or Billing SDK packaged in a free release')
    # AAB manifests use protobuf. Attribute strings are stored as UTF-8 even
    # without a human-readable XML dump; scan every module's manifest.
    forbidden = ('com.android.vending.BILLING', 'com.google.android.gms.permission.AD_ID',
                 'android.permission.ACCESS_ADSERVICES_', 'com.google.android.gms.ads.')
    manifests = [name for name in bundle.namelist() if name.endswith('/manifest/AndroidManifest.xml')]
    if not manifests:
        raise ValueError('Missing packaged manifest')
    for name in manifests:
        data = bundle.read(name)
        if any(value.encode('utf-8') in data for value in forbidden):
            raise ValueError('Advertising/Billing manifest entry in free release: ' + name)


def dex_classes(data):
    """Return defined classes, declared methods and runtime class annotations."""
    if data[:4] != b'dex\n' or data[4:7] not in (b'035', b'037', b'038', b'039', b'040'):
        raise ValueError('Unsupported DEX format')
    uint = lambda at: struct.unpack_from('<I', data, at)[0]
    if uint(32) != len(data) or uint(40) != 0x12345678:
        raise ValueError('Invalid DEX header')

    def uleb(at):
        value = 0
        for shift in range(0, 35, 7):
            byte = data[at]; at += 1
            value |= (byte & 127) << shift
            if not byte & 128:
                return value, at
        raise ValueError('Invalid DEX integer')

    strings = []
    for i in range(uint(56)):
        _, start = uleb(uint(uint(60) + i * 4))
        end = data.index(b'\0', start)
        # All descriptors/method names checked below are ASCII; other strings
        # can contain DEX modified UTF-8 and need not be interpreted here.
        strings.append(data[start:end].decode('utf-8', errors='replace'))
    types = [strings[uint(uint(68) + i * 4)] for i in range(uint(64))]
    method_names = [strings[uint(uint(92) + i * 8 + 4)] for i in range(uint(88))]
    result = {}
    for i in range(uint(96)):
        item = uint(100) + i * 32
        descriptor = types[uint(item)]
        annotations, methods = set(), set()
        directory, class_data = uint(item + 20), uint(item + 24)
        if directory and uint(directory):
            annotation_set = uint(directory)
            for j in range(uint(annotation_set)):
                annotation = uint(annotation_set + 4 + j * 4)
                if data[annotation] == 1:  # VISIBILITY_RUNTIME
                    type_index, _ = uleb(annotation + 1)
                    annotations.add(types[type_index])
        if class_data:
            counts, at = [], class_data
            for _ in range(4):
                count, at = uleb(at); counts.append(count)
            for _ in range(counts[0] + counts[1]):
                _, at = uleb(at); _, at = uleb(at)
            for count in counts[2:]:
                index = 0
                for _ in range(count):
                    delta, at = uleb(at); index += delta
                    _, at = uleb(at); _, at = uleb(at)
                    methods.add(method_names[index])
        result[descriptor] = {'methods': methods, 'annotations': annotations}
    return result


def audit(aab):
    with zipfile.ZipFile(aab) as bundle:
        metadata = json.loads(bundle.read(R8_METADATA))
        options = metadata['options']
        for option in ('isObfuscationEnabled', 'isOptimizationsEnabled', 'isShrinkingEnabled'):
            if options.get(option) is not True:
                raise ValueError('R8 option disabled: ' + option)
        if options.get('isProGuardCompatibilityModeEnabled') is not False:
            raise ValueError('R8 full mode disabled')
        if not metadata.get('resourceOptimization', {}).get('isOptimizedShrinkingEnabled'):
            raise ValueError('Optimized resource shrinking disabled')
        if not options.get('keepAttributes', {}).get('isRuntimeVisibleAnnotationsKept'):
            raise ValueError('Runtime annotation attributes removed')
        mapping = bundle.read(MAPPING)
        if not mapping.startswith(b'# compiler: R8'):
            raise ValueError('Missing R8 mapping')
        classes, dex_bytes, checksums = {}, 0, set()
        for name in bundle.namelist():
            if re.fullmatch(r'base/dex/classes\d*\.dex', name):
                data = bundle.read(name); dex_bytes += len(data)
                checksums.add(hashlib.sha256(data).hexdigest())
                classes.update(dex_classes(data))
        if not checksums or checksums != {entry['checksum'] for entry in metadata['dexFiles']}:
            raise ValueError('R8 metadata does not match packaged DEX')
        plugins = json.loads(bundle.read('base/assets/capacitor.plugins.json'))
        html = bundle.read('base/assets/public/index.html').decode('utf-8')
        versions = re.findall(r'id="boot-version"[^>]*data-version="([^"]+)"', html)
        if len(versions) != 1:
            raise ValueError('Missing unique packaged release version')
        exclude_monetization = without_monetization(versions[0])
        if exclude_monetization:
            audit_no_monetization(bundle, plugins, classes, mapping)
        required = {plugin['classpath']: set() for plugin in plugins}
        required.update({
            'com.aparajita.capacitor.securestorage.SecureStorage': {'internalSetItem', 'internalGetItem'},
            'com.gridshard.nativeui.GridshardPlayGames': {'getStatus', 'signIn'},
            'com.getcapacitor.plugin.SystemBars': set(),
        })
        if not exclude_monetization:
            required.update({
                'ee.forgr.nativepurchases.NativePurchasesPlugin':
                    {'getProducts', 'purchaseProduct', 'getPurchases', 'restorePurchases', 'isBillingSupported'},
                'com.gridshard.nativeui.GridshardAdSafety': {'verifyLiveBuild', 'verifyTestDevice'},
            })
        for name, methods in required.items():
            descriptor = 'L' + name.replace('.', '/') + ';'
            definition = classes.get(descriptor)
            if not definition or '<init>' not in definition['methods']:
                raise ValueError('Plugin or constructor removed/renamed: ' + name)
            if ANNOTATION not in definition['annotations']:
                raise ValueError('Plugin runtime annotation removed: ' + name)
            if not methods <= definition['methods']:
                raise ValueError('Plugin method removed/renamed: ' + name)
        for annotation in (ANNOTATION, 'Lcom/getcapacitor/PluginMethod;',
                           'Lcom/getcapacitor/annotation/ActivityCallback;',
                           'Lcom/getcapacitor/annotation/PermissionCallback;'):
            if annotation not in classes:
                raise ValueError('Reflection annotation type removed: ' + annotation)
        return {'r8_version': metadata['version'], 'full_mode': True,
                'code_optimization': True, 'resource_optimization': True,
                'runtime_plugins_verified': len(required), 'dex_bytes': dex_bytes,
                'release_version': versions[0], 'monetization_excluded': exclude_monetization,
                'mapping_sha256': hashlib.sha256(mapping).hexdigest(),
                'optimizer_stats': metadata.get('stats', {}),
                'device_runtime_verified': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('aab', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    result = audit(args.aab)
    serialized = json.dumps(result, indent=2) + '\n'
    if args.output:
        args.output.write_text(serialized, encoding='utf-8')
    print(serialized)
