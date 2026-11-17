const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const folder = path.join(root, 'client/assets/ui/module-candidates-v1');
const data = JSON.parse(fs.readFileSync(path.join(folder, 'recoil_cannon-directions.json')));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('all eight actual directional files and portable master match their recorded hashes', () => {
  assert.deepEqual(data.frames.map(f => f.id), ['e','ne','n','nw','w','sw','s','se']);
  assert.equal(new Set(data.frames.map(f => f.sha256)).size, 8);
  for (const frame of [...data.frames, data.master, data.overview]) {
    assert.match(frame.file, /^recoil_cannon-[a-z-]+\.webp$/);
    assert.equal(hash(fs.readFileSync(path.join(folder, frame.file))), frame.sha256);
  }
  for (const frame of data.frames) {
    assert.equal(frame.width, 512); assert.equal(frame.height, 512);
    assert.ok(frame.ground_pivot.y > .7 && frame.ground_pivot.y < 1);
    const scale = .7/frame.pedestal_width;
    const top = .94-frame.ground_pivot.y*scale + frame.bounds.y/512*scale;
    assert.ok(top >= 0, `${frame.id}: must not clip the upper silhouette after pedestal alignment`);
  }
});

test('offline direction data matches the atlas source and never promotes a live module', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root,'docs/planning/prototypes/recoil-cannon/directions-data.js'),'utf8'), context);
  assert.equal(JSON.stringify(context.window.RECOIL_DIRECTIONS), JSON.stringify(data));
  assert.equal(data.flat_rotation, false); assert.equal(data.mirrored_views, false);
  assert.equal(data.runtime_registered, false); assert.equal(data.release_art_accepted, false);
  const roster = require('../../server/data/module_roster_v2.json');
  assert.equal(roster.modules.length, 24);
  assert.equal(roster.modules.some(m => m.id === data.module_id), false);
});
