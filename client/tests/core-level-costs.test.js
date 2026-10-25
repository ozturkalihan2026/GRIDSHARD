const {test}=require('node:test');
const assert=require('node:assert/strict');
const i18n=require('../src/i18n.js');

test('core rarity prices explain credits and optional Flux in English',()=>{
  const examples=[
    ['2 çekirdek parçası + 100 Devre Kredisi gerekli.','Requires 2 core shards + 100 Circuit Credits.'],
    ['60 çekirdek parçası + 96.000 Devre Kredisi + 120 Akı gerekli.','Requires 60 core shards + 96.000 Circuit Credits + 120 Flux.'],
    ['3 çekirdek parçası + 20 Akı gerekli.','Requires 3 core shards + 20 Flux.'],
    ['Gerekli: 96000 Devre Kredisi, 60 çekirdek parçası ve 120 Akı.','Requires 96000 Circuit Credits, 60 core shards and 120 Flux.'],
  ];
  for(const [tr,en]of examples)assert.equal(i18n.translateText(tr,'en'),en);
});
