// Synthetic journeys, real Three.js rendering in an isolated Chrome profile.
// PLAYWRIGHT_MODULE=/path/playwright-core/index.mjs THREE_DIST=/path/three node tests/browser-story-intros.mjs
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {startDevServer} from '../scripts/dev-server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
if(!process.env.THREE_DIST)throw Error('THREE_DIST must point to three@0.180.0.');
const temp=await mkdtemp(join(tmpdir(),'oskar-synthetic-story-')),server=await startDevServer({port:0});
const origin='http://127.0.0.1:'+server.address().port;
let browser;const errors=[],requests=[];let failLibrary=false;
try{
 browser=await chromium.launchPersistentContext(temp,{channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await browser.route('**/*',async route=>{
  const url=route.request().url();if(url.startsWith(origin+'/'))return route.continue();
  if(url.startsWith('https://cdn.jsdelivr.net/npm/three@0.180.0/build/')){
   requests.push(url);if(failLibrary)return route.abort();
   const name=url.split('/').at(-1);assert.ok(['three.module.js','three.core.js'].includes(name));
   return route.fulfill({contentType:'text/javascript',body:await readFile(join(process.env.THREE_DIST,'build',name)),headers:{'access-control-allow-origin':'*'}});
  }
  return route.abort();
 });
 const page=browser.pages()[0];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [1200,390]){
  await page.setViewportSize({width,height:850});await page.goto(origin);await page.waitForFunction(()=>typeof journeyStoryIntro!=='undefined');
  const before=requests.length;assert.equal(await page.locator('.story-intro').count(),0);assert.equal(requests.length,before);
  await page.locator('[data-journey="start"]').click();
  await page.waitForFunction(()=>document.querySelector('.story-intro')?.dataset.state==='playing');
  assert.equal(await page.locator('.story-intro canvas').count(),1);
  if(process.env.STORY_PREVIEW&&width===1200)await page.screenshot({path:process.env.STORY_PREVIEW});
  await page.locator('[data-story-pause]').click();assert.equal(await page.locator('.story-intro').getAttribute('data-state'),'paused');
  await page.locator('[data-story-pause]').click();assert.equal(await page.locator('.story-intro').getAttribute('data-state'),'playing');
  await page.locator('[data-story-skip]').click();assert.equal(await page.locator('.story-intro').getAttribute('data-state'),'finished');
  await page.locator('[data-jaction="complete"]').click();assert.equal(await page.locator('.story-intro canvas').count(),0);
  await page.locator('#closeJourney').click();
  // Immediate progression and repeated opening clean up an active renderer.
  await page.locator('[data-journey="start"]').click();await page.locator('[data-jaction="complete"]').click();await page.locator('#closeJourney').click();
  assert.equal(await page.locator('.story-intro canvas').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  // Exercise every supported decorative theme with actual geometry, no data/model access.
  for(const theme of ['plant','earth','light','data','book']){
   await page.evaluate(theme=>{
    const host=document.createElement('div');host.id='synthetic-intro';host.innerHTML=journeyStoryIntro.markup(theme);document.body.append(host);journeyStoryIntro.mount(host.firstChild);
   },theme);
   await page.waitForFunction(()=>document.querySelector('#synthetic-intro .story-intro')?.dataset.state==='playing');
   if(theme==='book')await page.waitForFunction(()=>document.querySelector('#synthetic-intro .story-intro')?.dataset.state==='finished',{},{timeout:10000});
   await page.evaluate(()=>{journeyStoryIntro.stop();document.getElementById('synthetic-intro').remove();});
  }
  console.log('PASS '+width+'px: water intro, 6 themes, pause/resume, skip, immediate story progression, automatic finish, renderer cleanup and layout.');
 }
 // A real generated journey player with synthetic, grounded sources.
 await page.evaluate(()=>{
  store.materials=[{id:'synthetic-m',subject:'math',title:'Synthetic math',text:'Ein Liter entspricht 1000 Millilitern.'},{id:'synthetic-b',subject:'biology',title:'Synthetic biology',text:'Die Wurzeln nehmen Wasser aus dem Boden auf.'}];
  journeyState.aiJourneys=[{id:'synthetic-story',title:'Wasser entdecken',guidingQuestion:'Wie hilft Wasser den Pflanzen?',hook:'Folge der Spur eines Tropfens.',connection:'Wasser messen und Pflanzen versorgen.',reflectionPrompt:'Was hast du entdeckt?',status:'approved',stations:store.materials.map((m,i)=>({sourceId:m.id,subject:m.subject,heading:'Synthetische Station',context:'Wir lesen eine Quelle.',question:'Was steht in der Quelle?',options:['Antwort eins','Antwort zwei','Antwort drei'],correctIndex:0,explanation:'Die Quelle liefert die Antwort.',evidence:m.text})),videoId:null}];render();
 });
 await page.locator('[data-jrun="synthetic-story"]').click();await page.waitForFunction(()=>document.querySelector('#aiJourneyScene .story-intro')?.dataset.state==='playing');
 await page.locator('[data-aiaction="next"]').click();assert.equal(await page.locator('#aiJourneyScene .story-intro').count(),0);assert.equal(await page.locator('[data-aichoice]').count(),3);await page.locator('#closeAiJourney').click();
 // Reduced motion must not even fetch Three.js.
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();const before=requests.length;
 await page.locator('[data-journey="start"]').click();assert.equal(await page.locator('.story-intro').getAttribute('data-state'),'static');assert.equal(requests.length,before);assert.equal(await page.locator('.story-intro canvas').count(),0);await page.locator('#closeJourney').click();
 // WebGL unavailable: the readable scene and learning action remain usable.
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args);};});
 await page.reload();await page.locator('[data-journey="start"]').click();assert.equal(await page.locator('.story-intro').getAttribute('data-state'),'static');assert.equal(await page.locator('[data-jaction="complete"]').isEnabled(),true);await page.locator('#closeJourney').click();
 // Use another page without the WebGL override to verify CDN failure fallback.
 const other=await browser.newPage();other.on('pageerror',e=>errors.push(e.message));failLibrary=true;
 await other.goto(origin);await other.locator('[data-journey="start"]').click();await other.waitForFunction(()=>document.querySelector('.story-intro')?.dataset.state==='static');
 assert.equal(await other.locator('[data-jaction="complete"]').isEnabled(),true);assert.deepEqual(errors,[]);
 console.log('PASS generated journey, reduced motion/no library fetch, no WebGL, CDN failure; no page errors.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
