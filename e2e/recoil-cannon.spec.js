const { test, expect } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let server, url;
// WebKit does not reliably decode local file:// WAV. Serve only this preview's
// public files over an ephemeral loopback port, with no application backend.
test.beforeAll(async () => {
  server = http.createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const allowed = pathname === '/client/src/battle/recoil-cannon-presentation.js' || /^\/docs\/planning\/prototypes\/recoil-cannon\/[\w.-]+$/.test(pathname) ||
      /^\/client\/assets\/(ui\/(module-candidates-v1|modules-physical-v[12])|audio\/candidates-v1)\/[\w.-]+$/.test(pathname);
    if (!allowed || !['GET','HEAD'].includes(request.method)) { response.writeHead(404).end(); return; }
    try {
      const body = await fs.readFile(path.join(root, pathname));
      response.setHeader('Content-Type', { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.wav': 'audio/wav' }[path.extname(pathname)] || 'application/octet-stream');
      response.setHeader('Accept-Ranges','bytes');
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '');
      if (range) {
        const start = Number(range[1]), end = Math.min(body.length-1,range[2] ? Number(range[2]) : body.length-1);
        if(start>end || start>=body.length){response.writeHead(416,{'Content-Range':`bytes */${body.length}`}).end();return;}
        response.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${body.length}`,'Content-Length':end-start+1});
        response.end(request.method==='HEAD' ? undefined : body.subarray(start,end+1));return;
      }
      response.setHeader('Content-Length',body.length);
      if(request.method==='HEAD'){response.end();return;}
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}/docs/planning/prototypes/recoil-cannon/index.html`;
});
test.afterAll(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

test('candidate replay shows authoritative counterplay without touching live accounts', async ({ page }) => {
  const errors = [], network = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.method() !== 'GET' || !request.url().startsWith(new URL(url).origin + '/')) network.push(request.url()); });
  await page.goto(url);
  await expect(page.locator('#gun-hp')).toHaveText('240 / 240 CAN');
  await page.locator('#next').click();
  await expect(page.locator('#gun-hp')).toHaveText('224 / 240 CAN');
  await expect(page.locator('#target-hp')).toHaveText('394 / 432 CAN');
  await page.locator('#scenario').selectOption('phase');
  await page.locator('#next').click();
  await expect(page.locator('#gun-hp')).toHaveText('224 / 240 CAN');
  await expect(page.locator('#target-hp')).toHaveText('420 / 420 CAN');
  await page.locator('#scenario').selectOption('emp');
  await page.locator('#next').click();
  await expect(page.locator('#gun-hp')).toHaveText('240 / 240 CAN');
  await expect(page.locator('#summary')).toContainText('geri tepme bedeli yok');
  for (let i = 0; i < 6; i++) await page.locator('#next').click();
  await expect(page.locator('#gun-hp')).toHaveText('224 / 240 CAN');
  await page.locator('#scenario').selectOption('low-hp');
  await page.locator('#next').click();
  await expect(page.locator('#gun-hp')).toHaveText('1 / 240 CAN');
  await expect(page.locator('#own-shield')).toHaveText('Kalkan: 100');
  await expect(page.locator('#events')).toContainText('Gövde aşınması: 4 CAN');
  expect(await page.locator('img').evaluateAll(nodes => nodes.every(n => n.complete && n.naturalWidth > 0))).toBe(true);
  expect(network).toEqual([]);
  expect(errors).toEqual([]);
});

test('all eight painted headings load and stay upright on one ground pivot', async ({ page }) => {
  await page.setViewportSize({ width:320,height:852 });
  await page.goto(url);
  for (const id of ['e','ne','n','nw','w','sw','s','se']) {
    await page.locator('#direction').selectOption(id);
    await page.locator('#direction-art').evaluate(img => img.decode());
    await expect(page.locator('#direction-art')).toHaveAttribute('src', new RegExp(`recoil_cannon-${id}\\.webp$`));
    const measured = await page.locator('#direction-art').evaluate(img => ({width:img.naturalWidth,height:img.naturalHeight,transform:getComputedStyle(img).transform}));
    expect(measured).toEqual({width:512,height:512,transform:'none'});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('#next-direction').click();
  await expect(page.locator('#direction')).toHaveValue('e');
  await expect(page.locator('#direction-thumbnails img')).toHaveCount(8);
});

for (const width of [320, 393]) test(`candidate readability and explicit audio ${width}px`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: 852 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.locator('.hero').evaluate(img => img.decode());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#audio-status')).toHaveText('Ses kendiliğinden başlamaz.');
  await page.locator('#shot').click();
  await expect(page.locator('#audio-status')).toContainText('Atış ve piston dönüşü başlatıldı');
  await page.locator('#hit').click();
  await expect(page.locator('#audio-status')).toHaveText('İsabet başlatıldı.');
  await page.locator('#stop').click();
  await expect(page.locator('#audio-status')).toHaveText('Ses durduruldu.');
  await page.locator('#next').click();
  expect(await page.locator('#gun').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await page.screenshot({ path: `qa_reports/card01-${info.project.name}-${width}.png`, fullPage: true });
});
