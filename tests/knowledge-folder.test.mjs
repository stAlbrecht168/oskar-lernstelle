import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(){
 const storage=new Map(),failures=new Set();
 class Folder{
  constructor(name,path=''){this.kind='directory';this.name=name;this.path=path;}
  async getDirectoryHandle(name){return new Folder(name,this.path+name+'/');}
  async getFileHandle(name,{create=false}={}){
   const key=this.path+name;
   if(!create&&!storage.has(key)){const e=new Error('missing');e.name='NotFoundError';throw e;}
   return {getFile:async()=>new File([storage.get(key)],name),createWritable:async()=>{
    let value;return {write:async content=>{if(failures.has(name))throw Error('synthetic write failure');value=content;},close:async()=>storage.set(key,value),abort:async()=>{}};
   }};
  }
  async queryPermission(){return 'granted';}
 }
 const node=()=>({dataset:{},append(){},setAttribute(){},addEventListener(){},before(){},querySelector(){return node();}});
 const elements=new Map(),document={createElement:node,getElementById(id){if(!elements.has(id))elements.set(id,node());return elements.get(id);}};
 const sandbox={document,console,File,Blob,Map,Set,Promise,localStorage:{removeItem(){}},render(){},EXAMS:[{id:'music'}],KEY:'test-progress',CARD_KEY:'test-cards',TASK_KEY:'test-tasks',store:{materials:[],xp:0},cards:[],aiTasks:[],wiki:{version:1,contributions:[],processed:[],conflicts:[]}};
 sandbox.window=sandbox;sandbox.oskarExportKnowledge=()=>sandbox.wiki;
 vm.runInNewContext(readFileSync(new URL('../local-folder-v10.js',import.meta.url),'utf8'),sandbox);
 return {sandbox,api:sandbox.oskarLocal,storage,failures,folder:new Folder('synthetic-test-repository')};
}
test('knowledge pages are written to the selected private folder',async()=>{
 const f=fixture();await f.api.connect(f.folder);
 f.sandbox.wiki={version:1,contributions:[{topicId:'topic-music-example',summary:'Erfundener Prüftext'}],processed:[],conflicts:[]};
 f.api.snapshot();await f.api.flush();
 const saved=JSON.parse(f.storage.get('local-data/wissen.json'));
 assert.equal(saved.contributions[0].topicId,'topic-music-example');
});
test('an earlier failed file write cannot be hidden by a later successful write',async()=>{
 const f=fixture();await f.api.connect(f.folder);
 f.failures.add('materialien.json');f.sandbox.store.materials=[{id:'synthetic-source',subject:'music',text:'Erfundener, nicht persönlicher Prüftext.'}];f.sandbox.store.xp=3;
 f.api.snapshot();await assert.rejects(f.api.flush(),/synthetic write failure/);
 f.failures.clear();f.api.snapshot();await f.api.flush();
 assert.equal(JSON.parse(f.storage.get('local-data/materialien.json')).length,1);
});
test('source-change observers run before the folder snapshot',async()=>{
 const f=fixture();await f.api.connect(f.folder);let observed=0;
 f.sandbox.oskarKnowledgeSourcesChanged=()=>{observed++;};
 f.sandbox.persist();await f.api.flush();assert.equal(observed,1);
});
test('originals are read only through validated references inside the selected folder',async()=>{
 const f=fixture();await f.api.connect(f.folder);
 const path=await f.api.saveOriginal(new File(['erfundener Text'],'Test.txt'),'synthetic-source','music');
 const file=await f.api.readOriginal({id:'synthetic-source',subject:'music',originalPath:path});
 assert.equal(await file.text(),'erfundener Text');
 await assert.rejects(f.api.readOriginal({id:'other-source',subject:'music',originalPath:path}),/Ungültiger/);
 await assert.rejects(f.api.readOriginal({id:'synthetic-source',subject:'music',originalPath:'../private.txt'}),/Ungültiger/);
});
test('import preparation pauses snapshots until all application data are ready',async()=>{
 const f=fixture();await f.api.connect(f.folder);
 await f.api.beginImport();f.sandbox.store.xp=12;f.api.snapshot();
 assert.equal(JSON.parse(f.storage.get('local-data/lernstand.json')).xp,0);
 await f.api.finishImport();assert.equal(JSON.parse(f.storage.get('local-data/lernstand.json')).xp,12);
});
