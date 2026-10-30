import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {sentences,noisyModelAnswer} from './fixtures/learning-synthetic.mjs';
const auto=readFileSync(new URL('../auto-material-v09.js',import.meta.url),'utf8');
function pipeline(extra={}){
 let id=0,saves=0;const material={id:'synthetic-source',title:'Synthetic PDF',subject:'math',text:sentences.join(' ')};
 const sandbox={
  store:{materials:[material]},cards:[],aiTasks:[],uniqueId:()=> 'synthetic-'+(++id),
  subject:()=>({name:'Mathe'}),persist(){saves++;},saveTasks:()=>true,persistCards:()=>true,
  displayAutoHistory(){},renderSubjectMaterialStatus(){},setAutoStatus(){},render(){},
  uploadStatus:{appendChild(){}},document:{createElement:()=>({dataset:{}})},
  workerConnection:()=>({ready:true,endpoint:'https://synthetic.invalid',token:'synthetic-only'}),
  oskarLocal:{isReady:()=>true,isSwitching:()=>false,getContext:()=>1,isCurrent:()=>true,flush:async()=>{}},
  fetch:async()=>({ok:true,json:async()=>noisyModelAnswer()}),AbortSignal,...extra
 };
 sandbox.window=sandbox;
 vm.runInNewContext(auto.slice(auto.indexOf('function materialPlayable('),auto.indexOf('function materialNeedsAnalysis(')),sandbox);
 vm.runInNewContext(auto.slice(auto.indexOf('const evidenceNorm='),auto.indexOf('async function readScannedPdf')),sandbox);
 return {sandbox,material,saves:()=>saves};
}
test('automatic vetting rejects duplicates, unsupported evidence, invalid options and indexes',()=>{
 const {sandbox,material}=pipeline(),answer=noisyModelAnswer();
 const tasks=sandbox.vettedTasks(answer.tasks,material),cards=sandbox.vettedCards(answer.cards,material);
 assert.equal(tasks.length,6);assert.equal(cards.length,3);
 for(const item of [...tasks,...cards]){assert.equal(item.sourceId,material.id);assert.ok(material.text.includes(item.evidence));assert.equal(item.status,'approved');}
});
test('identical regeneration keeps task/card IDs; changed answer choices get a new task ID',async()=>{
 const {sandbox,material}=pipeline();await sandbox.analyzeUploadedMaterial(material);
 const ids=sandbox.aiTasks.map(t=>t.id),cardIds=sandbox.cards.map(c=>c.id);
 await sandbox.analyzeUploadedMaterial(material);
 assert.deepEqual(sandbox.aiTasks.map(t=>t.id),ids);assert.deepEqual(sandbox.cards.map(c=>c.id),cardIds);
 const answer=noisyModelAnswer();answer.tasks[0].options=['10 Milliliter','100 Milliliter','1000 Milliliter'];answer.tasks[0].correctIndex=2;
 const changed=sandbox.vettedTasks(answer.tasks,material);assert.notEqual(changed[0].id,ids[0]);
});
test('concurrent analysis of the same material issues just one request and releases its guard',async()=>{
 let resolve,calls=0;const pending=new Promise(done=>{resolve=done;});
 const {sandbox,material}=pipeline({fetch(){calls++;return pending;}});
 const one=sandbox.analyzeUploadedMaterial(material),two=sandbox.analyzeUploadedMaterial(material);
 assert.equal(calls,1);resolve({ok:true,json:async()=>noisyModelAnswer()});await Promise.all([one,two]);
 assert.equal(sandbox.aiTasks.length,6);assert.equal(sandbox.cards.length,3);
 await sandbox.analyzeUploadedMaterial(material);assert.equal(calls,2);
});
test('a malformed gateway response gives a readable error and retains previous playable exercises',async()=>{
 const {sandbox,material}=pipeline();await sandbox.analyzeUploadedMaterial(material);
 const ids=sandbox.aiTasks.map(t=>t.id);sandbox.fetch=async()=>({ok:true,json:async()=>null});
 await sandbox.analyzeUploadedMaterial(material);assert.equal(material.analysisState,'failed');assert.match(material.analysisError,/gültigen Übungen/);
 assert.deepEqual(sandbox.aiTasks.map(t=>t.id),ids);
 sandbox.fetch=async()=>({ok:true,json:async()=>noisyModelAnswer()});await sandbox.analyzeUploadedMaterial(material);assert.equal(material.analysisState,'ready');
});

for(const name of ['TypeError','TimeoutError','AbortError']){
 test(name+' during generation keeps a readable retryable error',async()=>{
  const {sandbox,material}=pipeline({fetch:async()=>{throw Object.assign(Error('technical network details'),{name});}});
  await sandbox.analyzeUploadedMaterial(material);
  assert.equal(material.analysisState,'failed');assert.match(material.analysisError,/erneut versuchen/);assert.doesNotMatch(material.analysisError,/technical/);
 });
}
