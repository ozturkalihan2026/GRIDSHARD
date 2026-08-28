const fs = require('fs');
const assert = require('assert');

const app = fs.readFileSync('./src/app.js', 'utf8');
const css = fs.readFileSync('./src/styles.css', 'utf8');
const html = fs.readFileSync('./index.html', 'utf8');

assert.ok(app.includes('battle-live-ticker'));
assert.ok(app.includes('module-live-status-row'));
assert.ok(app.includes('floatingFeedbackLive'));
assert.ok(app.includes('5. hak Dron Üssü · 6. hak Güçlendirici'));
assert.ok(css.includes('Beta.37 Hotfix V6'));
assert.ok(css.includes('.battle-live-ticker'));
assert.ok(css.includes('.module-live-status-row'));
assert.ok(css.includes('--gs-shell-width-v6:1320px'));
assert.ok(html.includes('id="battle-live-ticker"'));
assert.ok(html.includes('lobby-dock-settings'));
assert.ok(html.includes('lobby-dock-team'));

console.log('beta37 hotfix v6 client test passed');
