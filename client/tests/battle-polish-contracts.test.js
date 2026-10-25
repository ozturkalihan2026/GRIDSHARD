"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('resource plus has its own upright gold geometry, not a stroked blurry font glyph',()=>{
  const html=read('client/index.html'),css=read('client/src/home-interface-v3.css');
  assert.equal((html.match(/class="resource-plus-face"/g)||[]).length,2);
  assert.doesNotMatch(html,/class="app-resource-plus"[^>]*>\+/);
  assert.match(css,/\.resource-plus-face \{ fill:#ffcc45;/);
  assert.match(css,/text-shadow:none; -webkit-text-stroke:0/);
  assert.doesNotMatch(css,/-webkit-text-stroke:1\.2px|text-shadow:0 2px #c58b21/);
  assert.match(css,/\.app-resource-plus > svg \{[^}]*filter:none; transform:none/);
  assert.match(css,/\.app-resource-plus > svg \{[^}]*width:20px; height:23px;/);
});

test('CI bounds only browser setup, keeps real FPS assertions and discovers the polish cases on all projects',()=>{
  const workflow=read('.github/workflows/quality.yml');
  assert.match(workflow,/Restore pinned Playwright browser cache/);
  assert.match(workflow,/timeout --kill-after=10s 180s node node_modules\/@playwright\/test\/cli.js install chromium webkit/);
  assert.match(workflow,/for attempt in 1 2 3/);assert.match(workflow,/exit 1/);
  assert.ok(workflow.includes('e2e/battle-render-budget.spec.js'));
  assert.ok(workflow.includes('e2e/battle-polish.spec.js'));
  const config=require('../../playwright.config.js');
  for(const project of config.projects)assert.ok(project.testMatch.test('battle-polish.spec.js'),project.name);
  assert.doesNotMatch(workflow,/continue-on-error: true/);
  assert.ok(!read('client/src/app.js').includes('battle-ended-banner'));
});
