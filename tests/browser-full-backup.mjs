// Chrome smoke test, isolated temporary profiles and synthetic OPFS files only.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs node tests/browser-full-backup.mjs
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {startDevServer} from '../scripts/dev-server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const temp=await mkdtemp(join(tmpdir(),'oskar-synthetic-chrome-'));
const server=await startDevServer({port:0});
const origin='http://127.0.0.1:'+server.address().port;
let browser;const errors=[],external=[];
async function launch(name){
 browser=await chromium.launchPersistentContext(join(temp,name),{
  channel:'chrome',headless:true,acceptDownloads:true,viewport:{width:1200,height:900}
 });
 await browser.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();external.push({url:route.request().url(),type:route.request().resourceType()});return route.abort();});
 const page=browser.pages()[0]||await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.waitForFunction(()=>!!window.oskarLocal);
 return page;
}
async function connect(page){
 await page.evaluate(async()=>{
  const root=await navigator.storage.getDirectory();
  await oskarLocal.connect(await root.getDirectoryHandle('synthetic-repository',{create:true}));
 });
}
async function snapshot(page){
 return page.evaluate(async()=>{
  await oskarLocal.flush();
  const {materials,...progress}=store;
  const data={materials:structuredClone(materials),progress,cards,tasks:aiTasks,assessments:oskarExportAssessments(),journeys:journeyState,connections:connectionsCache};
  // Original paths are intentionally relocated; compare bytes and all remaining metadata.
  for(const m of data.materials)delete m.originalPath;
  const root=await navigator.storage.getDirectory(),repo=await root.getDirectoryHandle('synthetic-repository'),local=await repo.getDirectoryHandle('local-data'),base=await local.getDirectoryHandle('Originaldateien');
  const originals=[];
  for await(const [,dir] of base.entries())for await(const [,handle] of dir.entries())originals.push([...new Uint8Array(await (await handle.getFile()).arrayBuffer())]);
  originals.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {data,originals};
 });
}
try{
 let page=await launch('source');await connect(page);
 await page.evaluate(async()=>{
  const pdf=new File([new Uint8Array([37,80,68,70,45,49,10,0,255])],'synthetic.pdf'),photo=new File([new Uint8Array([255,216,255,0,255,217])],'synthetic.jpg');
  const pdfPath=await oskarLocal.saveOriginal(pdf,'synthetic-pdf','math'),photoPath=await oskarLocal.saveOriginal(photo,'synthetic-photo','biology');
  await oskarLocal.restoreBackup({
   materials:[{id:'synthetic-pdf',subject:'math',title:'Synthetic PDF',text:'Ein Liter sind tausend Milliliter.',originalPath:pdfPath,analysisState:'ready'},
    {id:'synthetic-photo',subject:'biology',title:'Synthetic photo',text:'Pflanzen benötigen Wasser.',originalPath:photoPath,analysisState:'ready'}],
   progress:{xp:123,completed:['math:0'],errors:[],days:['2026-10-28'],studyLog:[{date:'2026-10-28',subject:'math',kind:'school',correct:2,total:3}],examDates:{math:'2026-11-02'}},
   cards:[{id:'synthetic-card',subject:'math',term:'Liter',definition:'1000 Milliliter',status:'approved',sourceId:'synthetic-pdf'}],
   tasks:[{id:'synthetic-task',subject:'math',question:'Ein Liter?',options:['1000 ml','10 ml'],correctIndex:0,explanation:'1000 ml',status:'approved',sourceId:'synthetic-pdf'}],
   assessments:[{id:'synthetic-assessment',subject:'math',title:'Synthetic assessment',grade:'2',areas:[{topic:'Liter',status:'approved',priority:'medium'}]}],
   journeys:{start:{done:true},reflection:'Synthetic reflection',aiJourneys:[],aiProgress:{}},
   connections:{signature:'synthetic',connections:[]}
  });
 });
 const expected=await snapshot(page);
 await page.locator('#parentBtn').click();
 assert.equal(await page.locator('#exportFullBackup').innerText(),'Vollständiges Backup herunterladen');
 const downloadEvent=page.waitForEvent('download');await page.locator('#exportFullBackup').click();const download=await downloadEvent;
 const archive=join(temp,'synthetic-export.zip');await download.saveAs(archive);
 assert.ok((await readFile(archive)).length>1000);await browser.close();browser=null;
 // A second isolated profile models a different computer without browser copies.
 page=await launch('destination');await connect(page);
 await page.locator('#parentBtn').click();page.once('dialog',dialog=>dialog.accept());
 await page.locator('#importFullBackup').setInputFiles(archive);
 await page.waitForFunction(()=>document.getElementById('localFolderStatus').textContent.includes('mit allen Originaldateien wiederhergestellt'));
 assert.deepEqual(await snapshot(page),expected);
 // A damaged archive must fail in the UI without a confirmation or state change.
 const broken=Buffer.from(await readFile(archive));broken[50]^=1;
 let invalidDialog=false;const refuse=dialog=>{invalidDialog=true;void dialog.dismiss();};page.on('dialog',refuse);
 await page.locator('#importFullBackup').setInputFiles({name:'synthetic-broken.zip',mimeType:'application/zip',buffer:broken});
 await page.waitForFunction(()=>document.querySelector('#localFolderSetup').textContent.includes('Backup fehlgeschlagen:'));
 assert.equal(invalidDialog,false);assert.deepEqual(await snapshot(page),expected);page.off('dialog',refuse);
 await page.locator('#closeParent').click();await page.locator('#heroBtn').click();
 assert.equal(await page.locator('#lessonOverlay').evaluate(el=>el.classList.contains('show')),true);
 await page.locator('#closeLesson').click();
 await page.setViewportSize({width:390,height:850});await page.locator('#mobParent').click();
 assert.equal(await page.locator('#exportFullBackup').isVisible(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 await browser.close();browser=null;
 page=await launch('destination');
 await page.waitForFunction(()=>window.oskarLocal.isReady());
 assert.deepEqual(await snapshot(page),expected);
 assert.deepEqual(errors,[]);assert.ok(external.every(request=>request.type==='image'),'all non-image external requests must be absent');
 console.log('Chrome: UI ZIP download/import, separate computer profile, native OPFS binary files, browser restart and seven-group comparison, lesson start, mobile layout: PASS. All external image requests blocked; no external API requests.');
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});
}
