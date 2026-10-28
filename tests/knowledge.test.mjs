import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const sandbox={};
vm.runInNewContext(readFileSync(new URL('../knowledge-core-v10.js',import.meta.url),'utf8'),sandbox);
const core=sandbox.OskarKnowledgeCore;
const sourceA={id:'source-a',subject:'music',title:'Notenwerte · Seite 1',text:'Eine ganze Note dauert vier Viertelschläge. Eine halbe Note dauert zwei Viertelschläge.'};
const sourceB={id:'source-b',subject:'music',title:'Notenwerte · Seite 2',text:'Zwei halbe Noten dauern zusammen vier Viertelschläge. Eine ganze Note dauert vier Viertelschläge.'};
const topic={topicId:'',title:'Notenwerte',summary:'Eine ganze Note dauert vier Viertelschläge.',quote:'Eine ganze Note dauert vier Viertelschläge.',terms:['Note','Viertelschläge']};
const add=(state,source,topics=[topic],sources=[sourceA,sourceB])=>core.applyAnalysis(state,source,{topics},sources,'2026-10-28T12:00:00.000Z');
test('new pages extend a stable topic and retain both source contributions',()=>{
 const once=add(core.empty(),sourceA),id=core.pages(once,[sourceA,sourceB])[0].id;
 const twice=add(once,sourceB,[{...topic,title:'Notenlängen',topicId:id}]);
 const pages=core.pages(twice,[sourceA,sourceB]);
 assert.equal(pages.length,1);assert.equal(pages[0].id,id);assert.equal(pages[0].title,'Notenwerte');assert.equal(pages[0].contributions.length,2);
});
test('unchanged sources are not queued for another model request',()=>{
 const state=add(core.empty(),sourceA);
 assert.equal(core.pending(state,[sourceA]).length,0);
 assert.equal(core.pending(state,[sourceA,sourceB]).length,1);
 assert.equal(add(state,sourceA).contributions.length,1);
});
test('source corrections invalidate explanations and previous quiz answers even when an old quote remains',()=>{
 const state=add(core.empty(),sourceA),updated={...sourceA,text:sourceA.text+' Ein Takt ordnet die Schläge.'};
 assert.equal(core.pages(state,[updated])[0].status,'outdated');
 assert.equal(core.pending(state,[updated]).length,1);
 assert.equal(core.validTask({sourceId:sourceA.id,subject:'music',evidence:topic.quote,sourceRevision:core.revision(sourceA)},[updated]),false);
});
test('changed sources cannot leak into the context or a question answer',()=>{
 const state=add(core.empty(),sourceA),updated={...sourceA,text:'Die Notenzeile hat fünf Linien. Notenschlüssel ordnen den Linien Tonhöhen zu.'};
 assert.equal(core.topicContext(state,[updated],sourceB).length,0);
 assert.equal(core.questionSources(state,[updated],'Was sind Notenwerte?').length,0);
});
test('removing a source prunes its pages and leaves other contributions intact',()=>{
 let state=add(core.empty(),sourceA);state=add(state,sourceB);
 const restored=core.restore(state,[sourceB]);
 assert.equal(restored.contributions.length,1);assert.equal(restored.contributions[0].sourceId,'source-b');
 assert.equal(core.restore(state,[]).contributions.length,0);
});
test('invented evidence and a foreign topic ID do not become knowledge',()=>{
 const one=add(core.empty(),sourceA,[{...topic,quote:'Dies ist keine echte Quellenstelle.'}]);
 assert.equal(one.contributions.length,0);
 const two=add(core.empty(),sourceA,[{...topic,topicId:'invented-topic'}]);
 assert.equal(two.contributions.length,0);
});
test('topic titles from different school subjects are kept separate',()=>{
 const other={...sourceB,id:'physics-a',subject:'physics'};
 let state=core.applyAnalysis(core.empty(),sourceA,{topics:[topic]},[sourceA,other]);
 const id=core.pages(state,[sourceA,other])[0].id;
 state=core.applyAnalysis(state,other,{topics:[{...topic,topicId:id}]},[sourceA,other]);
 assert.equal(state.contributions.length,1);
});
test('confirmed quote pairs flag a conflict without silently overwriting either source',()=>{
 const bad={...sourceB,text:'Eine ganze Note dauert acht Viertelschläge. Dies ist ein erfundener Testtext.'};
 let state=add(core.empty(),sourceA,[topic],[sourceA,bad]);
 const id=core.pages(state,[sourceA,bad])[0].id;
 state=core.applyAnalysis(state,bad,{topics:[{...topic,topicId:id,summary:'Eine ganze Note dauert acht Viertelschläge.',quote:'Eine ganze Note dauert acht Viertelschläge.'}],conflicts:[{topicId:id,sourceId:sourceA.id,quote:topic.quote,newQuote:'Eine ganze Note dauert acht Viertelschläge.',reason:'Die beiden Quellen nennen unterschiedliche Dauern.'}]},[sourceA,bad]);
 const page=core.pages(state,[sourceA,bad])[0];
 assert.equal(page.status,'conflict');assert.equal(page.contributions.length,2);assert.equal(core.topicSources(page,[sourceA,bad]).length,0);
});
test('knowledge data survives a private JSON backup round trip',()=>{
 const state=add(add(core.empty(),sourceA),sourceB);
 const restored=core.restore(JSON.parse(JSON.stringify(state)),[sourceA,sourceB]);
 assert.equal(core.pages(restored,[sourceA,sourceB])[0].contributions.length,2);
 assert.equal(core.pending(restored,[sourceA,sourceB]).length,0);
});
test('question retrieval uses the saved concepts and rejects unsupported topics',()=>{
 const state=add(core.empty(),sourceA);
 assert.equal(core.questionSources(state,[sourceA],'Wie lange dauert eine ganze Note?').length,1);
 assert.equal(core.questionSources(state,[sourceA],'Wie funktioniert Photosynthese?').length,0);
});
test('a quote late in a document with line breaks is included in the model excerpt',()=>{
 const source={...sourceA,text:'Einleitung '.repeat(700)+'Eine ganze Note dauert\nvier Viertelschläge. Mehr zum Thema.'};
 const state=add(core.empty(),source,[topic],[source]);
 const extracted=core.topicSources(core.pages(state,[source])[0],[source])[0].text;
 assert.equal(core.normalize(extracted).includes(core.normalize(topic.quote)),true);
});

const fileSandbox={Blob,Uint8Array,atob,btoa,crypto:webcrypto};
vm.runInNewContext(readFileSync(new URL('../knowledge-files-v10.js',import.meta.url),'utf8'),fileSandbox);
const files=fileSandbox.OskarKnowledgeFiles;
test('original-file backup rejects missing sources and truncated binary data',()=>{
 const row={sourceId:'source-a',name:'Test.txt',type:'text/plain',size:4,data:btoa('test'),sha256:''};
 assert.equal(files.validateBundle([row],['source-a'])[0].blob.size,4);
 assert.throws(()=>files.validateBundle([row],['other']));
 assert.throws(()=>files.validateBundle([{...row,size:8}],['source-a']));
});
test('modified original bytes fail checksum validation before replacing any files',async()=>{
 const row={sourceId:'source-a',name:'Test.txt',type:'text/plain',size:4,data:btoa('test'),sha256:'0'.repeat(64)};
 const prepared=files.validateBundle([row],['source-a']);
 await assert.rejects(files.restore(prepared),/Prüfsummenprüfung/);
});
