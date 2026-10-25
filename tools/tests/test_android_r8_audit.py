import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import zipfile

import pytest

spec = importlib.util.spec_from_file_location('android_r8_audit', Path(__file__).parents[1] / 'audit_android_r8.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


def table_fixture(visibility=1):
    """Minimal DEX tables; references alone must not count as defined classes."""
    data = bytearray(172)
    data[:8] = b'dex\n037\0'
    put = lambda at, value: struct.pack_into('<I', data, at, value)
    put(40, 0x12345678)
    put(56, 3); put(60, 112)
    put(64, 2); put(68, 124)
    put(88, 1); put(92, 132)
    put(96, 1); put(100, 140)
    for i, string in enumerate(('Lsample/Plugin;', audit.ANNOTATION, '<init>')):
        put(112 + i * 4, len(data))
        data.extend(bytes([len(string)]) + string.encode() + b'\0')
    put(124, 0); put(128, 1)
    put(136, 2)  # method name string index
    annotation = len(data); data.extend(bytes([visibility, 1, 0]))
    while len(data) % 4:
        data.append(0)
    annotation_set = len(data); data.extend(struct.pack('<II', 1, annotation))
    directory = len(data); data.extend(struct.pack('<IIII', annotation_set, 0, 0, 0))
    class_data = len(data); data.extend(bytes([0, 0, 1, 0, 0, 1, 0]))
    put(160, directory); put(164, class_data); put(32, len(data))
    return bytes(data)


def test_dex_checks_definitions_and_runtime_visibility_not_string_matches():
    classes = audit.dex_classes(table_fixture())
    assert classes['Lsample/Plugin;']['methods'] == {'<init>'}
    assert classes['Lsample/Plugin;']['annotations'] == {audit.ANNOTATION}
    assert audit.ANNOTATION not in classes, 'a referenced type is not necessarily defined'
    assert not audit.dex_classes(table_fixture(visibility=0))['Lsample/Plugin;']['annotations']
    with pytest.raises(ValueError, match='Unsupported'):
        audit.dex_classes(b'not a dex file')


def bundle(tmp_path, *, option=None, resource=True, checksum=None):
    data = table_fixture()
    metadata = {'version': 'fixture', 'options': {
        'isObfuscationEnabled': True, 'isOptimizationsEnabled': True, 'isShrinkingEnabled': True,
        'isProGuardCompatibilityModeEnabled': False,
        'keepAttributes': {'isRuntimeVisibleAnnotationsKept': True}},
        'resourceOptimization': {'isOptimizedShrinkingEnabled': resource},
        'dexFiles': [{'checksum': checksum or hashlib.sha256(data).hexdigest()}]}
    if option:
        metadata['options'][option] = False
    target = tmp_path / 'test.aab'
    with zipfile.ZipFile(target, 'w') as z:
        z.writestr(audit.R8_METADATA, json.dumps(metadata))
        z.writestr(audit.MAPPING, '# compiler: R8\n')
        z.writestr('base/dex/classes.dex', data)
        z.writestr('base/assets/capacitor.plugins.json', '[{"classpath":"sample.Plugin"}]')
    return target


@pytest.mark.parametrize('option', ['isObfuscationEnabled', 'isOptimizationsEnabled', 'isShrinkingEnabled'])
def test_disabled_optimizer_is_rejected(tmp_path, option):
    with pytest.raises(ValueError, match='R8 option disabled'):
        audit.audit(bundle(tmp_path, option=option))


def test_resource_optimization_and_metadata_integrity_are_required(tmp_path):
    with pytest.raises(ValueError, match='resource shrinking disabled'):
        audit.audit(bundle(tmp_path, resource=False))
    with pytest.raises(ValueError, match='does not match packaged DEX'):
        audit.audit(bundle(tmp_path, checksum='wrong'))


def test_removed_plugin_annotation_fails_even_with_present_class_and_constructor(tmp_path, monkeypatch):
    monkeypatch.setattr(audit, 'dex_classes', lambda _: {
        'Lsample/Plugin;': {'methods': {'<init>'}, 'annotations': set()}})
    with pytest.raises(ValueError, match='Plugin runtime annotation removed: sample.Plugin'):
        audit.audit(bundle(tmp_path))
