/* Lokaler Ordner als dauerhafte Quelle für Schulmaterial, Aufgaben und Lernstand.
   Ausschließlich das Ordner-Handle (kein Materialinhalt) wird in IndexedDB gemerkt. */
(function(){
'use strict';
const DB='oskar-folder-handle-v1', STORE='folders', HANDLE_KEY='selected';
const FS_FILES={materials:'materialien.json',cards:'lernkarten.json',tasks:'aufgaben.json',progress:'lernstand.json',assessments:'klassenarbeiten.json',journeys:'entdeckerreisen.json',connections:'fachverbindungen.json'};
let directory=null,savedHandle=null,activated=false,writeQueue=Promise.resolve(),writeError=null;
const scheduled=new Map();
const $=id=>document.getElementById(id);
const button=document.createElement('button'),status=document.createElement('p'),host=document.createElement('div');
host.id='localFolderSetup';host.className='local-folder-setup';
button.type='button';button.id='localFolderButton';button.className='btn btn-green btn-mini';
status.id='localFolderStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
host.append(button,status);
const subjects=new Set(EXAMS.map(e=>e.id));
const isReady=()=>!!directory;
const hasFolderApi=()=>typeof window.showDirectoryPicker==='function';
function setStatus(message,state='info'){
 status.textContent=message;status.dataset.state=state;
 button.textContent=directory?'Anderes Repository auswählen':savedHandle?'Repository wieder verbinden':'Lokales Repository auswählen';
 $('materialFile').disabled=!isReady();
 if($('saveMaterial'))$('saveMaterial').disabled=!isReady();
}
function openDb(){
 return new Promise((resolve,reject)=>{
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error);
 });
}
async function handleDb(op,value){
 const db=await openDb();
 try{
   return await new Promise((resolve,reject)=>{
     const tx=db.transaction(STORE,op==='get'?'readonly':'readwrite'),os=tx.objectStore(STORE);
     const q=op==='get'?os.get(HANDLE_KEY):os.put(value,HANDLE_KEY);
     q.onsuccess=()=>resolve(q.result);
     q.onerror=()=>reject(q.error);
   });
 }finally{db.close();}
}
function mergeById(a,b){
 const out=new Map();
 for(const item of [...a,...b])if(item&&typeof item.id==='string')out.set(item.id,item);
 return [...out.values()];
}
async function readJson(name){
 try{
   const handle=await directory.getFileHandle(name);
   const text=await (await handle.getFile()).text(),data=JSON.parse(text);
   if(data===null)return null;
   if(!Array.isArray(data)&&typeof data!=='object')throw Error('Ungültiges JSON');
   return data;
 }catch(e){if(e.name==='NotFoundError')return null;throw new Error('Kann '+name+' nicht lesen: '+e.message);}
}
async function writeFile(name,payload){
 const handle=await directory.getFileHandle(name,{create:true});
 const writable=await handle.createWritable();
 try{await writable.write(payload);await writable.close();}
 catch(e){try{await writable.abort();}catch{}throw e;}
}
function writeSnapshot(name,content){
 if(!directory)return;
 const value=JSON.stringify(content,null,2);
 if(scheduled.get(name)===value)return;
 scheduled.set(name,value);
 const target=directory;
 writeQueue=writeQueue.catch(()=>{}).then(async()=>{
   if(target!==directory)return;
   try{await writeFile(name,value);writeError=null;}
   catch(err){writeError=err;scheduled.delete(name);setStatus('Lokales Speichern fehlgeschlagen: '+err.message,'error');throw err;}
 });
}
function snapshot(){
 if(!directory)return;
 writeSnapshot(FS_FILES.materials,store.materials);
 writeSnapshot(FS_FILES.cards,cards);
 writeSnapshot(FS_FILES.tasks,aiTasks);
 const {materials,...progress}=store;
 writeSnapshot(FS_FILES.progress,progress);
 if(typeof globalThis.oskarExportAssessments==='function')writeSnapshot(FS_FILES.assessments,globalThis.oskarExportAssessments());
 if(typeof journeyState==='object')writeSnapshot(FS_FILES.journeys,journeyState);
 if(typeof connectionsCache!=='undefined'&&connectionsCache!==null)writeSnapshot(FS_FILES.connections,connectionsCache);
}
async function flush(){
 await writeQueue;
 if(writeError)throw writeError;
}
function wrapPersistence(){
 if(activated)return;
 activated=true;
 persist=function(){snapshot();};
 persistCards=function(){snapshot();return true;};
 saveTasks=function(){snapshot();return true;};
}
async function saveOriginal(file,id,subjectId){
 if(!directory)throw Error('Wähle zuerst einen lokalen Ordner.');
 if(!subjects.has(subjectId))throw Error('Unbekanntes Fach.');
 const safe=String(file.name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(-110)||'datei';
 const name=String(id).replace(/[^a-zA-Z0-9_-]/g,'')+'-'+safe;
 const files=await directory.getDirectoryHandle('Originaldateien',{create:true});
 const folder=await files.getDirectoryHandle(subjectId,{create:true});
 const handle=await folder.getFileHandle(name,{create:true});
 const writer=await handle.createWritable();
 try{await writer.write(file);await writer.close();}
 catch(e){try{await writer.abort();}catch{}throw e;}
 return 'Originaldateien/'+subjectId+'/'+name;
}
async function removeOriginal(item){
 if(!directory||!item?.originalPath)return;
 const parts=item.originalPath.split('/');
 if(parts.length!==3||parts[0]!=='Originaldateien'||!subjects.has(parts[1])||!parts[2].startsWith(String(item.id)))return;
 try{
   const base=await directory.getDirectoryHandle('Originaldateien'),sub=await base.getDirectoryHandle(parts[1]);
   await sub.removeEntry(parts[2]);
 }catch(e){if(e.name!=='NotFoundError')setStatus('Originaldatei konnte nicht gelöscht werden: '+e.message,'error');}
}
async function connect(handle){
 if(!handle||handle.kind!=='directory')throw Error('Es wurde kein Ordner ausgewählt.');
 // Read existing files before changing the active source to avoid partial migrations.
 const previous=directory,wasActive=activated;
 // Der ausgewählte Ordner ist das geklonte Repository.
 // Alle persönlichen Dateien bleiben ausschließlich in local-data/, das Git ignoriert.
 directory=await handle.getDirectoryHandle('local-data',{create:true});
 try{
   const existingM=await readJson(FS_FILES.materials),existingC=await readJson(FS_FILES.cards),
         existingT=await readJson(FS_FILES.tasks),existingP=await readJson(FS_FILES.progress),
         existingA=await readJson(FS_FILES.assessments),existingJ=await readJson(FS_FILES.journeys),existingCo=await readJson(FS_FILES.connections);
   if(existingM&&!Array.isArray(existingM))throw Error('materialien.json muss eine Liste enthalten.');
   if(existingC&&!Array.isArray(existingC))throw Error('lernkarten.json muss eine Liste enthalten.');
   if(existingT&&!Array.isArray(existingT))throw Error('aufgaben.json muss eine Liste enthalten.');
   if(existingA&&!Array.isArray(existingA))throw Error('klassenarbeiten.json muss eine Liste enthalten.');
   // Legacy browser data is migrated once, but switching to another folder does not copy old folder data.
   const legacyM=wasActive?[]:store.materials;
   const legacyC=wasActive?[]:cards,legacyT=wasActive?[]:aiTasks;
   store.materials=mergeById(existingM||[],legacyM).filter(m=>subjects.has(m.subject)&&typeof m.text==='string');
   cards=mergeById(existingC||[],legacyC);
   aiTasks=mergeById(existingT||[],legacyT);
   if(existingP&&typeof existingP==='object'){
     for(const key of ['xp','completed','errors','days','studyLog','examDates'])if(Object.hasOwn(existingP,key))store[key]=existingP[key];
   }else if(wasActive){
     for(const key of ['xp','completed','errors','days','studyLog','examDates']){
       store[key]=key==='xp'?0:key==='examDates'?{}:[];
     }
   }
   if(typeof journeyState==='object'&&existingJ&&typeof existingJ==='object'&&!Array.isArray(existingJ))journeyState=existingJ;
   if(typeof connectionsCache!=='undefined'&&existingCo&&typeof existingCo==='object')connectionsCache=existingCo;
   if(typeof globalThis.oskarImportAssessments==='function'){
     const oldAssessments=wasActive?[]:globalThis.oskarExportAssessments();
     globalThis.oskarImportAssessments(mergeById(existingA||[],oldAssessments));
   }
   scheduled.clear();wrapPersistence();snapshot();await flush();
   // Browser data is erased only after the folder has been successfully written.
   for(const key of [KEY,CARD_KEY,TASK_KEY,'oskar-lernstelle-assessments-v1','oskar-lernstelle-journeys-v1','oskar-subject-connections-v1'])localStorage.removeItem(key);
   savedHandle=handle;
   try{await handleDb('put',handle);}catch{}
   setStatus('Speicherort: '+handle.name+'/local-data. Schulmaterial, Aufgaben und Lernstand werden lokal gespeichert und nicht ins Git-Repository übertragen.','ready');
   render();if(typeof displayAutoHistory==='function')displayAutoHistory();
   if(typeof renderSubjectMaterialStatus==='function')renderSubjectMaterialStatus();
   if(typeof renderJourneySources==='function')renderJourneySources();
   if(typeof processPendingMaterials==='function')void processPendingMaterials();
 }catch(err){directory=previous;throw err;}
}
button.addEventListener('click',async()=>{
 if(!hasFolderApi()){setStatus('Direkter Ordnerzugriff wird hier nicht unterstützt. Bitte Chrome oder Edge auf einem Computer verwenden.','error');return;}
 try{
   let handle;
   if(!directory&&savedHandle){
     let permission=await savedHandle.queryPermission({mode:'readwrite'});
     if(permission!=='granted')permission=await savedHandle.requestPermission({mode:'readwrite'});
     if(permission==='granted')handle=savedHandle;
   }
   if(!handle)handle=await window.showDirectoryPicker({id:'oskar-lernstelle',mode:'readwrite',startIn:'documents'});
   if(!handle)return;
   if(directory&&savedHandle&&!(await handle.isSameEntry(savedHandle))&&!confirm('Anderes Repository wählen? Der Inhalt aus dessen local-data-Ordner ersetzt die aktuelle Materialansicht.'))return;
   setStatus('Lokaler Speicherordner wird geöffnet ...');
   await connect(handle);
 }catch(e){if(e.name==='AbortError')return;setStatus('Ordner nicht verbunden: '+e.message,'error');}
});
const firstField=$('parentMaterials')?.querySelector('.field');
if(firstField)firstField.before(host);
window.oskarLocal={isReady,saveOriginal,removeOriginal,flush,connect,snapshot};
setStatus(hasFolderApi()?'Wähle einmal deinen geklonten Ordner oskar-lernstelle. Die App erstellt darin local-data und speichert dort Schuldateien und KI-Aufgaben.':'Lokaler Ordnerzugriff benötigt Chrome oder Edge auf dem Computer.');
if(hasFolderApi()){
 handleDb('get').then(async handle=>{
   if(!handle||directory)return;
   savedHandle=handle;
   try{if(await handle.queryPermission({mode:'readwrite'})==='granted')await connect(handle);else setStatus('Gespeicherter Ordner: '+handle.name+'. Bitte erneut Zugriff erlauben.');}
   catch(e){setStatus('Ordner bitte erneut verbinden: '+e.message,'error');}
 }).catch(()=>{});
}
})();
