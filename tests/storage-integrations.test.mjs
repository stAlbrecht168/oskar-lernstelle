import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function source(file, start, end) {
  const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  const begin=text.indexOf(start), finish=text.indexOf(end,begin);
  assert.ok(begin>=0 && finish>begin,'existing integration boundaries');
  return text.slice(begin,finish);
}
function deferred(){
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function context(extra={}){
  let generation=1;
  const sandbox={
    AbortSignal, ...extra,
    oskarLocal:{getContext:()=>generation,isCurrent:old=>old===generation,isSwitching:()=>false,isReady:()=>true,...extra.oskarLocal}
  };
  sandbox.window=sandbox;
  return {sandbox,switchFolder(){generation++;}};
}

test('validated assessment replacement preserves all fields without saving or truncating',()=>{
  const sandbox={
    localStorage:{getItem:()=>null,setItem(){throw Error('unexpected save');}},
    noHtml:String,OskarAssessmentCore:{validGrade:()=>true},subject:()=>true
  };
  vm.runInNewContext(source('assessment-v08.js',"const KEY=",'const tab='),sandbox);
  const records=Array.from({length:105},(_,i)=>({id:'synthetic-'+i,subject:'math',title:'Synthetic assessment',
    areas:Array.from({length:12},(_,j)=>({topic:'Synthetic topic '+j,status:'approved'})),extra:{preserved:true}}));
  sandbox.oskarSetAssessments(records);
  const restored=sandbox.oskarExportAssessments();
  assert.equal(restored.length,105);
  assert.equal(restored[0].areas.length,12);
  assert.equal(restored[0].extra.preserved,true);
  records[0].extra.preserved=false;
  assert.equal(restored[0].extra.preserved,true,'setter takes a detached copy');
});

test('assessment startup retains larger restored lists and adding at capacity never deletes old grades',()=>{
  const records=Array.from({length:105},(_,i)=>({id:'synthetic-'+i,subject:'math',grade:'2',title:'Synthetic assessment',areas:[]}));
  const nodes=new Map(),messages=[];let handler,saves=0;
  const sandbox={
    localStorage:{getItem:()=>JSON.stringify(records),setItem(){saves++;}},
    noHtml:String,OskarAssessmentCore:{validGrade:()=>true},subject:()=>true,
    document:{getElementById:id=>nodes.get(id)},toast:message=>messages.push(message)
  };
  for(const id of ['assSubject','assGrade','assTitle','assFeedback','assText','assDate','assTopics'])nodes.set(id,{value:id==='assGrade'?'1':id==='assSubject'?'math':''});
  nodes.set('assSave',{addEventListener(event,callback){handler=callback;}});
  vm.runInNewContext(source('assessment-v08.js',"const KEY=",'const tab='),sandbox);
  assert.equal(sandbox.oskarExportAssessments().length,105,'reloading must keep every restored record');
  vm.runInNewContext(source('assessment-v08.js',"el('assSave').addEventListener('click',()=>{", "panel.addEventListener('click',async e=>"),sandbox);
  handler();
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.oskarExportAssessments())),records);
  assert.equal(saves,0);
  assert.match(messages[0],/Bestehende Arbeiten bleiben erhalten/);
  assert.equal(nodes.get('assGrade').value,'1','unsaved input stays available');
});

test('assessment analysis from an earlier folder cannot change restored grades or focus areas',async()=>{
  const pending=deferred(),nodes=new Map();let handler,saves=0;
  const {sandbox,switchFolder}=context({
    localStorage:{getItem:()=>null,setItem(){saves++;}},
    noHtml:String,OskarAssessmentCore:{validGrade:()=>true},subject:()=>({name:'Mathe'}),URL,
    document:{getElementById:id=>nodes.get(id)},
    panel:{addEventListener(event,callback){handler=callback;}},confirm:()=>true,
    fetch:()=>pending.promise,oskarLocal:{snapshot(){saves++;}},render(){throw Error('stale render');}
  });
  nodes.set('aiEndpoint',{value:'https://synthetic.invalid'});
  nodes.set('aiToken',{value:'synthetic-token'});nodes.set('assStatus',{textContent:''});
  vm.runInNewContext(source('assessment-v08.js',"const KEY=",'const tab='),sandbox);
  vm.runInNewContext(source('assessment-v08.js',"panel.addEventListener('click',async e=>",'paint();\n})();'),sandbox);
  sandbox.oskarSetAssessments([{id:'synthetic-assessment',subject:'math',text:'Synthetic corrected exam text long enough.',feedback:'',grade:'2',areas:[]}]);
  const button={dataset:{assAnalyze:'synthetic-assessment'}};
  const operation=handler({target:{closest:()=>button}});
  switchFolder();
  sandbox.oskarSetAssessments([{id:'synthetic-assessment',subject:'math',grade:'1',areas:[{topic:'New folder focus'}]}]);
  pending.resolve({ok:true,json:async()=>({areas:[{topic:'Stale focus'}]})});
  await operation;
  const record=sandbox.oskarExportAssessments()[0];
  assert.equal(record.grade,'1');assert.equal(record.areas[0].topic,'New folder focus');
  assert.equal(saves,0);
});

for(const rejected of [false,true]){
  test('material analysis ignores '+(rejected?'failure':'success')+' from a previous folder',async()=>{
    const pending=deferred(),material={id:'synthetic-math',subject:'math',text:'Synthetic source text long enough for an exercise.'};
    let saves=0;
    const {sandbox,switchFolder}=context({
      store:{materials:[material]},aiTasks:[],cards:[],
      workerConnection:()=>({ready:true,endpoint:'https://synthetic.invalid',token:'synthetic-token'}),
      subject:()=>({name:'Mathe'}),persist(){saves++;},displayAutoHistory(){},setAutoStatus(){},
      fetch:()=>pending.promise,vettedTasks:()=>[{id:'unwanted'}],vettedCards:()=>[],
      saveTasks(){throw Error('stale tasks saved');},persistCards(){throw Error('stale cards saved');}
    });
    vm.runInNewContext(source('auto-material-v09.js','async function analyzeUploadedMaterial','async function processPendingMaterials'),sandbox);
    const operation=sandbox.analyzeUploadedMaterial(material);
    assert.equal(saves,1);
    switchFolder();
    sandbox.aiTasks=[{id:'new-folder-task'}];sandbox.cards=[{id:'new-folder-card'}];
    if(rejected)pending.reject(Error('synthetic unavailable'));
    else pending.resolve({ok:true,json:async()=>({tasks:[],cards:[]})});
    await operation;
    assert.deepEqual(sandbox.aiTasks,[{id:'new-folder-task'}]);
    assert.deepEqual(sandbox.cards,[{id:'new-folder-card'}]);
    assert.equal(saves,1);
    assert.equal(material.analysisState,'processing','stale failure must not mutate the old source');
  });
}

test('pending materials in a new folder resume once an older busy analysis finishes',async()=>{
  const pending=deferred(),calls=[];
  const {sandbox,switchFolder}=context({
    store:{materials:[{id:'old-folder-source'}]},autoUploadBusy:false,autoAnalysisBusy:false,
    workerConnection:()=>({ready:true}),materialNeedsAnalysis:()=>true,displayAutoHistory(){},
    async analyzeUploadedMaterial(material){
      calls.push(material.id);
      if(material.id==='old-folder-source')await pending.promise;
    }
  });
  vm.runInNewContext(source('auto-material-v09.js','async function processPendingMaterials','async function readScannedPdf'),sandbox);
  const oldOperation=sandbox.processPendingMaterials();
  assert.equal(sandbox.autoAnalysisBusy,true);
  switchFolder();sandbox.store.materials=[{id:'new-folder-source'}];
  await sandbox.processPendingMaterials();
  assert.deepEqual(calls,['old-folder-source'],'the new activation initially waits for the old busy task');
  pending.resolve();await oldOperation;
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(calls,['old-folder-source','new-folder-source']);
  assert.equal(sandbox.autoAnalysisBusy,false);
});

test('a normally failed analysis does not create an automatic retry loop in the same folder',async()=>{
  let calls=0;
  const {sandbox}=context({
    store:{materials:[{id:'synthetic-failed-source'}]},autoUploadBusy:false,autoAnalysisBusy:false,
    workerConnection:()=>({ready:true}),materialNeedsAnalysis:()=>true,displayAutoHistory(){},
    async analyzeUploadedMaterial(material){calls++;material.analysisState='failed';}
  });
  vm.runInNewContext(source('auto-material-v09.js','async function processPendingMaterials','async function readScannedPdf'),sandbox);
  await sandbox.processPendingMaterials();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1);assert.equal(sandbox.autoAnalysisBusy,false);
});

test('upload does not attach an original from the previous folder to the new state',async()=>{
  const pending=deferred(),began=deferred();
  const {sandbox,switchFolder}=context({
    store:{materials:[]},autoUploadBusy:false,uploadElement:{},
    $:()=>({value:'math'}),subject:()=>({name:'Mathe'}),setAutoStatus(){},
    extractFileText:async()=> 'Synthetic lesson text with more than thirty characters.',uniqueId:()=> 'synthetic-id',
    oskarLocal:{saveOriginal(){began.resolve();return pending.promise;}},
    persist(){throw Error('stale material saved');}
  });
  vm.runInNewContext(source('auto-material-v09.js','async function ingestSchoolFile','const AUTO_MATERIAL_STYLES'),sandbox);
  const operation=sandbox.ingestSchoolFile({name:'synthetic.txt',type:'text/plain'});
  await began.promise;
  switchFolder();pending.resolve('Originaldateien/math/synthetic.txt');
  await operation;
  assert.equal(sandbox.store.materials.length,0);
  assert.equal(sandbox.autoUploadBusy,false);
});

test('connection results cannot cross folders with identical source signatures',async()=>{
  const pending=deferred();let saves=0;
  const {sandbox,switchFolder}=context({
    connectionsCache:null,connectionsBusy:false,connectionsQueued:false,
    connectionSources:()=>[{id:'same-source'}],connectionSignature:()=> 'same-signature',
    connectionConfig:()=>({ready:true,endpoint:'https://synthetic.invalid',token:'synthetic-token'}),
    renderAiConnections(){},fetch:()=>pending.promise,validAiConnection:()=>true,
    localStorage:{setItem(){saves++;}},oskarLocal:{snapshot(){saves++;}}
  });
  // The integration requires two sources, with the same signature across folders.
  sandbox.connectionSources=()=>[{id:'one'},{id:'two'}];
  vm.runInNewContext(source('connections-v07.js','async function autoAnalyzeConnections','function planJourneyFromConnection'),sandbox);
  const operation=sandbox.autoAnalyzeConnections();
  switchFolder();sandbox.connectionsCache={signature:'new-folder',connections:[]};
  pending.resolve({ok:true,json:async()=>({connections:[{title:'stale'}]})});
  await operation;
  assert.equal(sandbox.connectionsCache.signature,'new-folder');
  assert.equal(saves,0);
});

test('journey generation cannot add a result after the storage folder changes',async()=>{
  const pending=deferred(),button={disabled:false},status={textContent:''};let saves=0;
  const sources=[{id:'math',subject:'math',title:'Synthetic math',text:'Synthetic math source'},{id:'bio',subject:'biology',title:'Synthetic biology',text:'Synthetic biology source'}];
  const {sandbox,switchFolder}=context({
    document:{querySelectorAll:()=>sources.map(x=>({value:x.id}))},
    $:id=>id==='createAiJourney'?button:id==='journeyCreateStatus'?status:{value:id==='aiEndpoint'?'https://synthetic.invalid':'synthetic'},
    journeySource:id=>sources.find(x=>x.id===id),fetch:()=>pending.promise,
    journeyState:{},validateGeneratedJourney:()=>true,journeyId:()=> 'synthetic-journey',
    journeyDraftItems:()=>[],saveAiJourney(){saves++;}
  });
  vm.runInNewContext(source('journey-generator-v06.js','async function generateAiJourney','function renderGeneratedJourneys'),sandbox);
  const operation=sandbox.generateAiJourney();
  switchFolder();pending.resolve({ok:true,json:async()=>({journey:{title:'Stale synthetic journey'}})});
  await operation;
  assert.equal(sandbox.journeyState.aiJourneys,undefined);
  assert.equal(saves,0);assert.equal(button.disabled,false);
});

test('journey capacity rejects generation before an API call and keeps every existing journey',async()=>{
  const journeys=Array.from({length:35},(_,i)=>({id:'synthetic-'+i})),status={textContent:''};
  const {sandbox}=context({
    $:()=>status,journeyState:{aiJourneys:journeys},journeyDraftItems:()=>journeys,
    fetch(){throw Error('API must not be called at capacity');},
    document:{querySelectorAll(){throw Error('capacity must be checked before source processing');}}
  });
  vm.runInNewContext(source('journey-generator-v06.js','async function generateAiJourney','function renderGeneratedJourneys'),sandbox);
  await sandbox.generateAiJourney();
  assert.equal(sandbox.journeyState.aiJourneys,journeys);
  assert.equal(journeys.length,35);
  assert.match(status.textContent,/Bestehende Reisen bleiben erhalten/);
});

function backupHandlers(){
  const handlers=new Map(),messages=[];
  let blob,bundle;
  const {sandbox,switchFolder}=context({
    store:{materials:[{id:'synthetic-source'}],xp:7,completed:[],errors:[],days:[],studyLog:[],examDates:{}},
    cards:[{id:'synthetic-card'}],aiTasks:[{id:'synthetic-task'}],journeyState:{reflection:'Synthetic reflection'},connectionsCache:{signature:'synthetic',connections:[]},
    oskarExportAssessments:()=>[{id:'synthetic-assessment'}],exportData(){},
    $:id=>({addEventListener:(event,callback)=>handlers.set(id,callback),value:''}),
    document:{createElement:()=>({click(){}})},Blob,
    URL:{createObjectURL(value){blob=value;return 'blob:synthetic';},revokeObjectURL(){}},
    setTimeout(){},confirm:message=>{messages.push(message);return true;},toast:message=>messages.push(message),
    oskarLocal:{async restoreBackup(value){bundle=value;}}
  });
  vm.runInNewContext(source('study-v04.js','const oldExport=','// Wenn eine Materialquelle entfernt'),sandbox);
  return {handlers,messages,sandbox,switchFolder,getBlob:()=>blob,getBundle:()=>bundle};
}

test('the active backup export contains all seven data groups, including assessments',async()=>{
  const fixture=backupHandlers();
  fixture.handlers.get('exportBackup')({stopImmediatePropagation(){}});
  const data=JSON.parse(await fixture.getBlob().text());
  assert.equal(data.progress.materials[0].id,'synthetic-source');
  for(const key of ['cards','tasks','assessments','journeys','connections'])assert.ok(Object.hasOwn(data,key),key);
  assert.equal(data.assessments[0].id,'synthetic-assessment');
});

test('an exported text backup larger than the old 3 MB limit can be selected for restore',async()=>{
  const fixture=backupHandlers();
  fixture.sandbox.store.materials[0].text='Synthetic school text. '.repeat(160000);
  fixture.handlers.get('exportBackup')({stopImmediatePropagation(){}});
  const file=fixture.getBlob();
  assert.ok(file.size>3*1024*1024);
  await fixture.handlers.get('importBackup')({stopImmediatePropagation(){},target:{files:[file]}});
  assert.equal(fixture.getBundle().materials[0].text,fixture.sandbox.store.materials[0].text);
});

test('legacy backup import preserves missing groups and delegates the full restore atomically',async()=>{
  const fixture=backupHandlers(),backup={version:1,progress:{materials:[],xp:2},cards:[]};
  await fixture.handlers.get('importBackup')({stopImmediatePropagation(){},target:{files:[{size:1,text:async()=>JSON.stringify(backup)}]}});
  const restored=fixture.getBundle();
  assert.equal(restored.progress.xp,2);
  assert.equal(restored.assessments[0].id,'synthetic-assessment');
  assert.equal(restored.tasks[0].id,'synthetic-task');
  assert.equal(restored.journeys.reflection,'Synthetic reflection');
  assert.equal(restored.connections.signature,'synthetic');
  assert.match(fixture.messages[0],/ältere Backup.*Klassenarbeiten.*bleiben erhalten/);
  assert.equal(fixture.sandbox.store.xp,7,'handler must not replace state before storage commits');
});

test('a folder switch while reading a backup prevents restoring into the new folder',async()=>{
  const fixture=backupHandlers(),pending=deferred();
  const operation=fixture.handlers.get('importBackup')({stopImmediatePropagation(){},target:{files:[{size:1,text:()=>pending.promise}]}});
  fixture.switchFolder();pending.resolve(JSON.stringify({version:2,progress:{materials:[]},cards:[]}));
  await operation;
  assert.equal(fixture.getBundle(),undefined);
  assert.match(fixture.messages.at(-1),/Speicherordner wurde geändert/);
});
