// Real UI -> real PDF.js -> real local Worker -> mocked OpenAI -> native OPFS -> learning UI.
// Only synthetic fixtures; all unhandled external requests are blocked.
// PLAYWRIGHT_MODULE=/path/playwright-core/index.mjs PDFJS_DIST=/path/pdfjs-dist node tests/browser-learning-flow.mjs
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import worker from '../worker/index.js';
import {startDevServer} from '../scripts/dev-server.mjs';
import {lines,sentences,syntheticPdf,noisyModelAnswer} from './fixtures/learning-synthetic.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const pdfjs=process.env.PDFJS_DIST;
if(!pdfjs)throw Error('PDFJS_DIST must point to the locally installed pdfjs-dist@3.11.174 directory.');
const pdfScript=await readFile(join(pdfjs,'build/pdf.min.js'));
const pdfWorker=await readFile(join(pdfjs,'build/pdf.worker.min.js'));
const temp=await mkdtemp(join(tmpdir(),'oskar-synthetic-learning-'));
const server=await startDevServer({port:0}),origin='http://127.0.0.1:'+server.address().port;
const gateway='https://synthetic-learning.invalid';
let browser,mode='success';const errors=[],blocked=[],workerCalls=[],modelCalls=[],covered=new Set();
const actualFetch=globalThis.fetch;
// This function never delegates to the network. Worker authentication uses invented test values.
globalThis.fetch=async(url,options)=>{
 assert.equal(url,'https://api.openai.com/v1/responses');
 const payload=JSON.parse(options.body);modelCalls.push(payload);
 assert.equal(payload.store,false);assert.equal(payload.text.format.name,'oskar_study_tasks');
 assert.ok(payload.input[1].content.includes(sentences[0]));
 if(mode==='upstream-error')return new Response('',{status:503});
 if(mode==='network-error')throw Error('Synthetic network error');
 if(mode==='invalid-model-json')return Response.json({output:[{content:[{type:'output_text',text:'{'}]}]});
 if(mode==='invalid-envelope')return Response.json({output:{unexpected:true}});
 const answer=mode==='null-model'?null:mode==='ungrounded'?{cards:[],tasks:[{...noisyModelAnswer().tasks[0],evidence:'Dieser Satz steht nicht in der Quelle.'}]}:noisyModelAnswer();
 return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(answer)}]}]});
};
async function coverage(cdp){
 const {result}=await cdp.send('Profiler.takePreciseCoverage');
 for(const script of result)if(script.url.startsWith(origin))for(const f of script.functions)if(f.ranges[0]?.count>0)covered.add(f.functionName);
}
async function launch(name,width,{configured=true}={}){
 browser=await chromium.launchPersistentContext(join(temp,name),{channel:'chrome',headless:true,viewport:{width,height:900}});
 await browser.addInitScript(({gateway,configured})=>{
  localStorage.setItem('oskar-ai-endpoint',gateway);
  if(configured)sessionStorage.setItem('oskar-ai-access','synthetic-access-only');else sessionStorage.removeItem('oskar-ai-access');
  // Real Chrome FileSystemDirectoryHandles in an isolated browser sandbox.
  window.showDirectoryPicker=async()=>{const root=await navigator.storage.getDirectory();return root.getDirectoryHandle('synthetic-school',{create:true});};
 },{gateway,configured});
 await browser.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.startsWith(origin+'/'))return route.continue();
  if(url==='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')return route.fulfill({contentType:'text/javascript',body:pdfScript,headers:{'access-control-allow-origin':'*'}});
  if(url==='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js')return route.fulfill({contentType:'text/javascript',body:pdfWorker,headers:{'access-control-allow-origin':'*'}});
  if(url.startsWith(gateway+'/')){
   if(req.method()==='POST')workerCalls.push({path:new URL(url).pathname,body:req.postDataJSON(),mode});
   if(mode==='gateway-network-error'&&req.method()==='POST')return route.abort();
   if(mode==='invalid-gateway-json'&&req.method()==='POST')return route.fulfill({status:200,body:'{',headers:{'content-type':'application/json','access-control-allow-origin':origin}});
   const response=await worker.fetch(new Request(url,{method:req.method(),headers:{...req.headers(),origin},...(req.method()==='POST'?{body:req.postData()}: {})}),{
    OPENAI_API_KEY:'synthetic-model-key-never-sent',ACCESS_TOKEN:'synthetic-access-only',ALLOWED_ORIGIN:origin
   });
   return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  }
  blocked.push({url,type:req.resourceType()});await route.abort();
 });
 const page=browser.pages()[0]||await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 page.on('dialog',dialog=>{errors.push('Unexpected technical dialog: '+dialog.message());void dialog.dismiss();});
 const cdp=await browser.newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.startPreciseCoverage',{callCount:true,detailed:true});
 await page.goto(origin);await page.waitForFunction(()=>!!window.oskarLocal);
 await page.locator(width<760?'#mobParent':'#parentBtn').click();
 await page.locator('#localFolderButton').click();await page.waitForFunction(()=>oskarLocal.isReady());
 await page.locator('#materialSubject').selectOption('math');
 return {page,cdp};
}
async function upload(page,{name='synthetic-units.pdf',buffer=syntheticPdf()}={}){
 await page.locator('#materialFile').setInputFiles({name,mimeType:'application/pdf',buffer});
 await page.waitForFunction(()=>!autoUploadBusy);
}
async function state(page){return page.evaluate(async()=>{await oskarLocal.flush();return {store,cards,aiTasks};});}
async function originalCount(page){return page.evaluate(async()=>{
 const root=await navigator.storage.getDirectory(),repo=await root.getDirectoryHandle('synthetic-school'),data=await repo.getDirectoryHandle('local-data');
 let count=0;try{const originals=await data.getDirectoryHandle('Originaldateien');for await(const [,dir] of originals.entries())for await(const [] of dir.entries())count++;}catch(e){if(e.name!=='NotFoundError')throw e;}return count;
});}
async function answerLesson(page,{wrongFirst=false}={}){
 const items=await page.evaluate(()=>session.items.map(q=>({index:q.index,q:q.q,why:q.why})));
 assert.ok(items.length>0);
 for(let i=0;i<items.length;i++){
  const q=await page.evaluate(()=>session.items[session.index]);
  const answer=wrongFirst&&i===0?(q.correct+1)%q.a.length:q.correct;
  await page.locator('[data-answer="'+answer+'"]').click();await page.locator('#nextBtn').click();
  assert.match(await page.locator('#feedback').innerText(),wrongFirst&&i===0?/Fast!/:/Richtig!/);
  assert.equal(await page.locator('#feedback').innerText().then(t=>t.includes(q.sourceTitle)),true);
  await page.locator('#nextBtn').click();
 }
 assert.equal(await page.evaluate(()=>session.done),true);return items;
}
try{
 for(const width of [1200,390]){
  mode='success';const {page,cdp}=await launch('learning-'+width,width);
  const beforeCalls=workerCalls.length;await upload(page);
  assert.equal(workerCalls.length,beforeCalls+1);
  assert.equal(workerCalls.at(-1).path,'/generate');assert.equal(workerCalls.at(-1).body.subject,'Mathe');
  const saved=await state(page);assert.equal(saved.store.materials.length,1);assert.equal(saved.aiTasks.length,6);assert.equal(saved.cards.length,3);
  const source=saved.store.materials[0];assert.equal(source.subject,'math');assert.equal(source.analysisState,'ready');
  for(const sentence of sentences)assert.ok(source.text.includes(sentence));
  assert.equal(source.contentHash,createHash('sha256').update(syntheticPdf()).digest('hex'));
  for(const item of [...saved.aiTasks,...saved.cards]){
   assert.equal(item.sourceId,source.id);assert.equal(item.sourceTitle,source.title);assert.equal(item.subject,'math');
   assert.equal(item.status,'approved');assert.equal(item.generatedByAI,true);assert.equal(item.reviewedByHuman,false);
   assert.ok(source.text.toLowerCase().includes(item.evidence.toLowerCase()));
  }
  assert.equal(new Set(saved.aiTasks.map(t=>t.question.toLowerCase().trim())).size,6);
  assert.equal(await originalCount(page),1);
  const original=await page.evaluate(async path=>{
   const parts=path.split('/'),root=await navigator.storage.getDirectory(),repo=await root.getDirectoryHandle('synthetic-school');
   let dir=await repo.getDirectoryHandle('local-data');for(const part of parts.slice(0,-1))dir=await dir.getDirectoryHandle(part);
   return [...new Uint8Array(await (await (await dir.getFileHandle(parts.at(-1))).getFile()).arrayBuffer())];
  },source.originalPath);assert.deepEqual(original,[...syntheticPdf()]);
  // Exact bytes and different PDF bytes with identical extracted content must both deduplicate.
  for(const buffer of [syntheticPdf(),Buffer.concat([syntheticPdf(),Buffer.from('\n%synthetic duplicate\n')])]){
   await upload(page,{name:'renamed-synthetic.pdf',buffer});assert.match(await page.locator('#autoMaterialStatus').innerText(),/bereits gespeichert/);
  }
  assert.equal(workerCalls.length,beforeCalls+1);assert.equal((await state(page)).store.materials.length,1);assert.equal(await originalCount(page),1);
  await page.locator('[data-auto-action="learn"]').click();
  assert.equal(await page.locator('#parentOverlay').evaluate(el=>el.classList.contains('show')),false);
  assert.equal(await page.evaluate(()=>session.id),'math');
  const items=await answerLesson(page,{wrongFirst:true});
  assert.ok(items.every(item=>item.index.startsWith('ai:')));
  let finished=await state(page);assert.equal(finished.store.xp,25);assert.equal(finished.store.errors.length,1);
  assert.equal(finished.store.errors[0].index,items[0].index);assert.equal(finished.store.studyLog.at(-1).kind,'school');
  assert.equal(finished.store.studyLog.at(-1).correct,2);assert.equal(finished.store.studyLog.at(-1).total,3);
  assert.equal(await page.locator('#progressPercent').innerText(),'33 %');assert.equal(await page.locator('#xp').innerText(),'25');
  await page.locator('#nextBtn').click();
  // The existing advanced AI action must use the same validated pipeline and stable IDs.
  await page.locator(width<760?'#mobParent':'#parentBtn').click();
  await page.locator('#materialAdvanced > summary').click();
  const requestsBeforeRegeneration=workerCalls.length;
  await page.locator('[data-ai="'+source.id+'"]').dblclick();
  await page.waitForFunction(()=>store.materials[0].analysisState==='ready');
  assert.equal(workerCalls.length,requestsBeforeRegeneration+1,'double click cannot launch duplicate generation');
  const regenerated=await state(page);
  assert.deepEqual(regenerated.aiTasks.map(t=>t.id),finished.aiTasks.map(t=>t.id));
  assert.deepEqual(regenerated.cards.map(c=>c.id),finished.cards.map(c=>c.id));
  assert.deepEqual(regenerated.store.errors,finished.store.errors);assert.deepEqual(regenerated.store.completed,finished.store.completed);
  finished=regenerated;await page.locator('#closeParent').click();await coverage(cdp);
  await page.reload();await page.waitForFunction(()=>oskarLocal?.isReady());
  const reloaded=await state(page);assert.deepEqual(reloaded,finished);
  await page.locator('[data-subject="math"]').click();assert.equal(await page.locator('#progressPercent').innerText(),'33 %');
  assert.match(await page.locator('#reviewBtn').innerText(),/1/);
  await page.locator('#reviewBtn').click();assert.equal(await page.evaluate(()=>session.items[0].index),items[0].index);
  await answerLesson(page);assert.equal((await state(page)).store.errors.length,0);assert.equal((await state(page)).store.xp,28);
  await page.locator('#nextBtn').click();
  await page.locator('[data-level="0"]').click();await answerLesson(page);
  assert.equal((await state(page)).store.xp,37,'repeated school level awards 3 XP per answer, not another first-pass bonus');
  await page.locator('#nextBtn').click();
  // Level 2 uses the remaining types; level 3 also exercises card-generated questions.
  for(const level of [1,2]){
   await page.locator('[data-level="'+level+'"]').click();
   const levelItems=await answerLesson(page,{wrongFirst:level===2});await page.locator('#nextBtn').click();
   if(level===2){
    assert.ok(levelItems[0].index.startsWith('card:'));
    assert.equal((await state(page)).store.errors[0].index,levelItems[0].index);
    await page.locator('#reviewBtn').click();assert.equal(await page.evaluate(()=>session.items[0].index),levelItems[0].index);
    await answerLesson(page);await page.locator('#nextBtn').click();assert.equal((await state(page)).store.errors.length,0);
   }
  }
  assert.equal(await page.locator('#progressPercent').innerText(),'100 %');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  await coverage(cdp);await browser.close();browser=null;
  console.log('PASS '+width+'px: real PDF upload/extraction, Worker/OpenAI mock, provenance, duplicates, all levels, wrong-answer review, XP, reload and no approval/configuration dialogs.');
 }
 // Error scenarios reuse one isolated fixture profile, with unique synthetic text per material.
 const {page,cdp}=await launch('errors',1200);let n=0;
 for(const failure of ['upstream-error','network-error','invalid-model-json','invalid-envelope','null-model','ungrounded','invalid-gateway-json','gateway-network-error']){
  mode=failure;const initial=await state(page),requests=workerCalls.length;
  await upload(page,{name:'synthetic-'+failure+'.pdf',buffer:syntheticPdf([...lines,'Synthetischer Fehlerfall Nummer '+(++n)])});
  assert.equal(workerCalls.length,requests+1);
  assert.equal(await page.locator('#autoMaterialStatus').getAttribute('data-state'),'failed');
  const message=await page.locator('#autoMaterialStatus').innerText();assert.match(message,/fehlgeschlagen/);assert.doesNotMatch(message,/TypeError|Cannot read|undefined|flatMap/);
  const failed=await state(page);assert.equal(failed.store.materials.length,initial.store.materials.length+1);assert.equal(failed.aiTasks.length,initial.aiTasks.length);
  mode='success';await page.locator('[data-auto-action="retry"]').click();await page.waitForFunction(()=>!autoAnalysisBusy);
  assert.equal(await page.locator('#autoMaterialStatus').getAttribute('data-state'),'ready');
  assert.equal((await state(page)).store.materials.length,failed.store.materials.length);
  const newest=(await state(page)).store.materials.at(-1);
  await page.locator('[data-auto-action="learn"]').click();
  assert.equal(await page.evaluate(id=>session.items.every(q=>q.sourceId===id),newest.id),true,'the direct action must practice the newly uploaded source rather than older material');
  await page.locator('#closeLesson').click();await page.locator('#parentBtn').click();
 }
 const count=(await state(page)).store.materials.length,originals=await originalCount(page),calls=workerCalls.length;
 await upload(page,{name:'synthetic-damaged.pdf',buffer:Buffer.from('This is deliberately not a PDF.')});
 assert.match(await page.locator('#autoMaterialStatus').innerText(),/gültige PDF-Datei/);
 assert.equal((await state(page)).store.materials.length,count);assert.equal(await originalCount(page),originals);assert.equal(workerCalls.length,calls);
 await upload(page,{name:'synthetic-too-large.pdf',buffer:Buffer.alloc(12*1024*1024+1)});
 assert.match(await page.locator('#autoMaterialStatus').innerText(),/12 MB/);assert.equal((await state(page)).store.materials.length,count);
 await coverage(cdp);await browser.close();browser=null;
 mode='success';const first=await launch('no-configuration',390,{configured:false}),firstCalls=workerCalls.length;
 await upload(first.page);assert.equal(workerCalls.length,firstCalls);
 assert.match(await first.page.locator('#autoMaterialStatus').innerText(),/Zugriffscode/);
 assert.equal((await state(first.page)).store.materials[0].analysisState,'waiting');
 await first.page.locator('#closeParent').click();await first.page.locator('#customPracticeBtn').click();
 assert.equal(await first.page.locator('#lessonOverlay').evaluate(el=>el.classList.contains('show')),true);
 assert.equal(await first.page.locator('#parentOverlay').evaluate(el=>el.classList.contains('show')),false);
 await coverage(first.cdp);await browser.close();browser=null;
 const required=['createAiCardsForMaterial','offerMaterialPractice','sourceTasks','renderQuestion','closeLesson','startLesson','finishLesson','processPendingMaterials','saveOriginal','isLevelDone','levelStudyKey','renderSubjectMaterialStatus','extractFileText','ingestSchoolFile','analyzeUploadedMaterial','vettedTasks','vettedCards','materialPlayable','lessonItems','generatedQuestions','findErrorQuestion','chooseAnswer','stepLesson','snapshot','commitBundle','flush','connect'];
 assert.deepEqual(required.filter(name=>!covered.has(name)),[],'the actual core functions must execute, not replacements');
 assert.deepEqual(errors,[]);assert.ok(blocked.every(r=>r.type==='image'),'no external API or library request may escape the explicit local fixtures');
 console.log('PASS errors: PDF corruption/size, upstream/network/JSON/schema/grounding failures, recovery through UI retry, first-use fallback.');
 console.log('Coverage: '+required.length+'/'+required.length+' required production functions executed; Worker calls '+workerCalls.length+', mocked OpenAI calls '+modelCalls.length+'. No real AI calls.');
}finally{
 globalThis.fetch=actualFetch;if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});
}
