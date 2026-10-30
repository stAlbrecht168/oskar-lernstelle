// Eigenständiger, strikt begrenzter ZIP-STORE-Codec. Keine Downloads oder Anbieteraufrufe.
globalThis.OskarBackupZip=(()=>{
 'use strict';
 const limits=Object.freeze({archive:256*1024*1024,file:64*1024*1024,entries:2000,manifest:1024*1024});
 const fail=()=>{throw Error('Ungültiges oder unvollständiges ZIP-Backup.');};
 function path(name){
  if(typeof name!=='string'||name.length>240||!name||!/^[A-Za-z0-9._/-]+$/.test(name))fail();
  if(name.split('/').some(p=>!p||p==='.'||p==='..'||p.endsWith('.')||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p)))fail();
  return name;
 }
 function crc(bytes){let n=0xffffffff;for(const b of bytes){n^=b;for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
 async function sha(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 function encode(text){return new TextEncoder().encode(text);}
 function decode(bytes){return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
 function pack(entries){
  if(!(entries instanceof Map)||entries.size>limits.entries)fail();
  let size=22;const names=new Set();
  for(const [name,bytes] of entries){path(name);if(names.has(name.toLowerCase())||!(bytes instanceof Uint8Array)||bytes.length>limits.file)fail();names.add(name.toLowerCase());size+=76+2*name.length+bytes.length;}
  if(size>limits.archive)throw Error('Backup ist zu groß (maximal 256 MB).');
  const out=new Uint8Array(size),v=new DataView(out.buffer),central=[];let pos=0;
  for(const [name,bytes] of entries){
   const filename=encode(name),offset=pos,checksum=crc(bytes);
   v.setUint32(pos,0x04034b50,true);v.setUint16(pos+4,20,true);v.setUint16(pos+6,0x800,true);v.setUint16(pos+12,33,true);
   v.setUint32(pos+14,checksum,true);v.setUint32(pos+18,bytes.length,true);v.setUint32(pos+22,bytes.length,true);v.setUint16(pos+26,filename.length,true);
   out.set(filename,pos+30);out.set(bytes,pos+30+filename.length);pos+=30+filename.length+bytes.length;
   central.push({filename,offset,checksum,size:bytes.length});
  }
  const start=pos;
  for(const e of central){
   v.setUint32(pos,0x02014b50,true);v.setUint16(pos+4,20,true);v.setUint16(pos+6,20,true);v.setUint16(pos+8,0x800,true);v.setUint16(pos+14,33,true);
   v.setUint32(pos+16,e.checksum,true);v.setUint32(pos+20,e.size,true);v.setUint32(pos+24,e.size,true);v.setUint16(pos+28,e.filename.length,true);v.setUint32(pos+42,e.offset,true);
   out.set(e.filename,pos+46);pos+=46+e.filename.length;
  }
  v.setUint32(pos,0x06054b50,true);v.setUint16(pos+8,entries.size,true);v.setUint16(pos+10,entries.size,true);v.setUint32(pos+12,pos-start,true);v.setUint32(pos+16,start,true);
  return out;
 }
 function unpack(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<22||bytes.length>limits.archive)fail();
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),end=bytes.length-22;
  if(v.getUint32(end,true)!==0x06054b50||v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+20,true))fail();
  const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true);
  if(!count||count>limits.entries||v.getUint16(end+8,true)!==count||start+v.getUint32(end+12,true)!==end)fail();
  let pos=start,local=0,total=0;const entries=new Map(),names=new Set();
  for(let i=0;i<count;i++){
   if(pos+46>end||v.getUint32(pos,true)!==0x02014b50)fail();
   const flags=v.getUint16(pos+8,true),method=v.getUint16(pos+10,true),sum=v.getUint32(pos+16,true),size=v.getUint32(pos+24,true),len=v.getUint16(pos+28,true),offset=v.getUint32(pos+42,true);
   if(flags!==0x800||method!==0||v.getUint32(pos+20,true)!==size||size>limits.file||v.getUint16(pos+30,true)||v.getUint16(pos+32,true)||v.getUint16(pos+34,true)||v.getUint32(pos+38,true)||pos+46+len>end||offset!==local||local+30>start)fail();
   const name=path(decode(bytes.subarray(pos+46,pos+46+len)));
   if(names.has(name.toLowerCase())||v.getUint32(local,true)!==0x04034b50||v.getUint16(local+6,true)!==flags||v.getUint16(local+8,true)!==method||v.getUint32(local+14,true)!==sum||v.getUint32(local+18,true)!==size||v.getUint32(local+22,true)!==size||v.getUint16(local+26,true)!==len||v.getUint16(local+28,true))fail();
   const body=local+30+len;
   if(body+size>start||decode(bytes.subarray(local+30,body))!==name)fail();
   const data=bytes.subarray(body,body+size);
   if(crc(data)!==sum)fail();
   total+=size;if(total>limits.archive)fail();
   entries.set(name,data);names.add(name.toLowerCase());local=body+size;pos+=46+len;
  }
  if(local!==start||pos!==end)fail();
  return entries;
 }
 async function create(entries){
  if(entries.has('manifest.json'))fail();
  const files=[];
  for(const [name,bytes] of entries)files.push({path:name,size:bytes.length,sha256:await sha(bytes)});
  const manifest=encode(JSON.stringify({format:'oskar-full-backup',version:1,created:new Date().toISOString(),files},null,2));
  if(manifest.length>limits.manifest)fail();
  return pack(new Map([['manifest.json',manifest],...entries]));
 }
 async function validate(bytes){
  const entries=unpack(bytes),raw=entries.get('manifest.json');
  if(!raw||raw.length>limits.manifest)fail();
  let m;try{m=JSON.parse(decode(raw));}catch{fail();}
  if(m?.format!=='oskar-full-backup'||m.version!==1||typeof m.created!=='string'||!Number.isFinite(Date.parse(m.created))||!Array.isArray(m.files)||m.files.length!==entries.size-1)fail();
  const seen=new Set();
  for(const f of m.files){
   if(!f||typeof f!=='object')fail();path(f.path);
   if(f.path==='manifest.json'||seen.has(f.path)||!Number.isSafeInteger(f.size)||f.size<0||f.size>limits.file||!/^[a-f0-9]{64}$/.test(f.sha256))fail();
   const data=entries.get(f.path);if(!data||data.length!==f.size||await sha(data)!==f.sha256)fail();seen.add(f.path);
  }
  entries.delete('manifest.json');return entries;
 }
 return Object.freeze({limits,path,sha,encode,decode,pack,unpack,create,validate});
})();

/* Lokaler Ordner als dauerhafte Quelle für Schulmaterial, Aufgaben und Lernstand.
   Ausschließlich das Ordner-Handle (kein Materialinhalt) wird in IndexedDB gemerkt. */
(function(){
'use strict';
const DB='oskar-folder-handle-v1', STORE='folders', HANDLE_KEY='selected';
const FS_FILES={materials:'materialien.json',cards:'lernkarten.json',tasks:'aufgaben.json',progress:'lernstand.json',assessments:'klassenarbeiten.json',journeys:'entdeckerreisen.json',connections:'fachverbindungen.json'};
const JOURNAL='.oskar-transaction.json', BROWSER_JOURNAL='oskar-storage-transaction-v1';
let directory=null,savedHandle=null,activated=false,writeQueue=Promise.resolve(),writeError=null;
let connecting=false,generation=0,revision=0,originalWrites=0,lastScheduled=null;
let deferredSnapshot=false,errorRevision=0,browserRecoveryError=null,browserRecoveryApply=true;
const $=id=>document.getElementById(id);
const button=document.createElement('button'),status=document.createElement('p'),host=document.createElement('div');
host.id='localFolderSetup';host.className='local-folder-setup';
button.type='button';button.id='localFolderButton';button.className='btn btn-green btn-mini';
status.id='localFolderStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
host.append(button,status);
const subjects=new Set(EXAMS.map(e=>e.id));
const isReady=()=>!!directory;
const hasFolderApi=()=>typeof window.showDirectoryPicker==='function';
const clone=value=>JSON.parse(JSON.stringify(value));
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const owns=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
function setStatus(message,state='info'){
 status.textContent=message;status.dataset.state=state;
 button.disabled=connecting;
 button.textContent=directory&&writeError?'Erneut lokal speichern':directory?'Anderes Repository auswählen':savedHandle?'Repository wieder verbinden':'Lokales Repository auswählen';
 if($('materialFile'))$('materialFile').disabled=!isReady()||connecting;
 if($('saveMaterial'))$('saveMaterial').disabled=!isReady()||connecting;
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
     let result;
     q.onsuccess=()=>{result=q.result;};
     q.onerror=()=>reject(q.error);
     tx.oncomplete=()=>resolve(result);
     tx.onerror=()=>reject(tx.error);
     tx.onabort=()=>reject(tx.error||Error('Ordnerzugriff konnte nicht gemerkt werden.'));
   });
 }finally{db.close();}
}
function invalid(name){throw Error(name+' enthält ungültige Daten. Es wurde nichts übernommen.');}
function date(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00');
 return !Number.isNaN(d.getTime())&&d.getFullYear()===Number(value.slice(0,4))&&d.getMonth()+1===Number(value.slice(5,7))&&d.getDate()===Number(value.slice(8));
}
function records(values,name,check){
 if(!Array.isArray(values))invalid(name);
 const ids=new Set();
 for(const item of values){
   if(!object(item)||typeof item.id!=='string'||!item.id||ids.has(item.id)||!subjects.has(item.subject)||!check(item))invalid(name);
   ids.add(item.id);
 }
}
function texts(item,keys){return keys.every(key=>!owns(item,key)||typeof item[key]==='string');}
function choices(item){return Array.isArray(item.options)&&item.options.length>=2&&item.options.length<=4&&item.options.every(x=>typeof x==='string'&&x.trim())&&Number.isInteger(item.correctIndex)&&item.correctIndex>=0&&item.correctIndex<item.options.length;}
function defaults(){return {materials:[],cards:[],tasks:[],progress:{xp:0,completed:[],errors:[],days:[],studyLog:[],examDates:{}},assessments:[],journeys:{},connections:null};}
function validateBundle(raw){
 if(!object(raw))invalid('Speicherstand');
 const data=clone(raw),base=defaults();
 for(const key of Object.keys(FS_FILES))if(!owns(data,key))data[key]=base[key];
 records(data.materials,FS_FILES.materials,m=>typeof m.text==='string'&&texts(m,['title','created','originalPath']));
 records(data.cards,FS_FILES.cards,c=>typeof c.term==='string'&&typeof c.definition==='string'&&['draft','approved'].includes(c.status)&&(!owns(c,'sourceId')||c.sourceId===null||typeof c.sourceId==='string')&&texts(c,['sourceTitle','evidence','created']));
 records(data.tasks,FS_FILES.tasks,t=>typeof t.question==='string'&&typeof t.explanation==='string'&&choices(t)&&['draft','approved'].includes(t.status)&&(!owns(t,'type')||['choice','true_false','gap'].includes(t.type))&&texts(t,['sourceId','sourceTitle','evidence','created']));
 const p=data.progress;
 if(!object(p))invalid(FS_FILES.progress);
 for(const [key,value] of Object.entries(base.progress))if(!owns(p,key))p[key]=value;
 if(typeof p.xp!=='number'||!Number.isFinite(p.xp)||p.xp<0||!Array.isArray(p.completed)||p.completed.some(x=>typeof x!=='string')||!Array.isArray(p.days)||p.days.some(x=>!date(x))||!Array.isArray(p.errors)||p.errors.some(e=>!object(e)||!subjects.has(e.subject)||!(typeof e.index==='string'||Number.isInteger(e.index)&&e.index>=0)))invalid(FS_FILES.progress);
 if(!Array.isArray(p.studyLog)||p.studyLog.some(e=>!object(e)||!date(e.date)||!(subjects.has(e.subject)||e.subject==='journey')||!['school','demo','review','journey'].includes(e.kind)||!Number.isInteger(e.total)||e.total<0||!Number.isInteger(e.correct)||e.correct<0||e.correct>e.total)||!object(p.examDates)||Object.entries(p.examDates).some(([key,value])=>!subjects.has(key)||!(value===null||value===''||date(value))))invalid(FS_FILES.progress);
 records(data.assessments,FS_FILES.assessments,a=>typeof a.title==='string'&&texts(a,['text','feedback','date','grade'])&&(!a.date||date(a.date))&&(!a.grade||/^[1-6][+-]?$/.test(a.grade))&&Array.isArray(a.areas)&&a.areas.every(x=>object(x)&&typeof x.topic==='string'&&['draft','approved','dismissed'].includes(x.status)&&texts(x,['reason','evidence','practiceHint'])&&(!owns(x,'priority')||['high','medium'].includes(x.priority))));
 const j=data.journeys;
 if(!object(j)||!texts(j,['reflection']))invalid(FS_FILES.journeys);
 if(owns(j,'aiJourneys')){
   if(!Array.isArray(j.aiJourneys))invalid(FS_FILES.journeys);
   const ids=new Set();
   for(const item of j.aiJourneys){
     if(!object(item)||typeof item.id!=='string'||ids.has(item.id)||typeof item.title!=='string'||!['draft','approved'].includes(item.status)||!texts(item,['guidingQuestion','hook','connection','reflectionPrompt'])||!Array.isArray(item.stations)||item.stations.some(s=>!object(s)||!subjects.has(s.subject)||typeof s.sourceId!=='string'||!choices(s)||!texts(s,['heading','context','question','explanation','evidence'])))invalid(FS_FILES.journeys);
     ids.add(item.id);
   }
 }
 if(owns(j,'aiProgress')&&(!object(j.aiProgress)||Object.values(j.aiProgress).some(x=>!object(x)||!Number.isInteger(x.step)||x.step<0||typeof x.completed!=='boolean'||!texts(x,['reflection']))))invalid(FS_FILES.journeys);
 for(const key of ['start','video','math','biology','geography','final'])if(owns(j,key)&&(!object(j[key])||typeof j[key].done!=='boolean'))invalid(FS_FILES.journeys);
 const c=data.connections;
 if(c!==null&&(!object(c)||typeof c.signature!=='string'||!texts(c,['error','updatedAt'])||!Array.isArray(c.connections)||c.connections.some(x=>!object(x)||!['title','sharedIdea','howToCombine','challenge'].every(key=>typeof x[key]==='string')||!Array.isArray(x.evidence)||x.evidence.some(e=>!object(e)||typeof e.sourceId!=='string'||!subjects.has(e.subject)||typeof e.quote!=='string'))))invalid(FS_FILES.connections);
 return data;
}
function captureBundle(){
 const {materials,...progress}=store;
 return validateBundle({materials,cards,tasks:aiTasks,progress,assessments:typeof globalThis.oskarExportAssessments==='function'?globalThis.oskarExportAssessments():[],journeys:typeof journeyState==='object'?journeyState:{},connections:typeof connectionsCache!=='undefined'?connectionsCache:null});
}
function applyBundle(raw){
 const data=clone(raw);
 if(typeof globalThis.oskarSetAssessments==='function')globalThis.oskarSetAssessments(data.assessments);
 else if(data.assessments.length)throw Error('Klassenarbeiten können hier nicht vollständig übernommen werden.');
 store={...data.progress,materials:data.materials};cards=data.cards;aiTasks=data.tasks;
 if(typeof journeyState==='object')journeyState=data.journeys;
 if(typeof connectionsCache!=='undefined')connectionsCache=data.connections;
}
async function readText(target,name){
 try{return await (await (await target.getFileHandle(name)).getFile()).text();}
 catch(e){if(e.name==='NotFoundError')return null;throw Error(name+' konnte nicht gelesen werden.');}
}
async function readFiles(target){
 const files={};
 for(const name of Object.values(FS_FILES))files[name]=await readText(target,name);
 return files;
}
function decodeFiles(files){
 const data={};
 for(const [key,name] of Object.entries(FS_FILES)){
   if(files[name]===null)continue;
   try{data[key]=JSON.parse(files[name]);}catch{invalid(name);}
 }
 return validateBundle(data);
}
async function writeFile(target,name,payload){
 const handle=await target.getFileHandle(name,{create:true});
 const writable=await handle.createWritable();
 try{await writable.write(payload);await writable.close();}
 catch(e){try{await writable.abort();}catch{}throw e;}
}
async function removeFile(target,name){
 try{await target.removeEntry(name);}catch(e){if(e.name!=='NotFoundError')throw e;}
}
function originalParts(path){
 const parts=globalThis.OskarBackupZip.path(path).split('/');
 if(parts.length!==3||parts[0]!=='Originaldateien'||!subjects.has(parts[1]))throw Error('Ungültiger Originaldateipfad.');
 return parts;
}
async function originalFolder(target,path){
 const parts=originalParts(path);
 const base=await target.getDirectoryHandle(parts[0],{create:true});
 return {folder:await base.getDirectoryHandle(parts[1],{create:true}),name:parts[2]};
}
async function rollback(target,before,createdOriginals=[]){
 let failed=false;
 for(const [name,text] of Object.entries(before)){
   try{if(text===null)await removeFile(target,name);else await writeFile(target,name,text);}catch{failed=true;}
 }
 if(!failed)for(const path of createdOriginals){try{const {folder,name}=await originalFolder(target,path);await removeFile(folder,name);}catch{failed=true;}}
 if(failed)throw Error('Wiederherstellung unvollständig. Das Wiederherstellungsjournal bleibt erhalten. Bitte denselben Ordner erneut verbinden.');
 await removeFile(target,JOURNAL);
}
async function recover(target){
 const text=await readText(target,JOURNAL);
 if(text===null)return;
 let journal;try{journal=JSON.parse(text);}catch{invalid('Wiederherstellungsjournal');}
 if(!object(journal)||journal.version!==1||!object(journal.before)||Object.keys(journal.before).length!==Object.keys(FS_FILES).length||Object.values(FS_FILES).some(name=>!owns(journal.before,name)||!(journal.before[name]===null||typeof journal.before[name]==='string')))invalid('Wiederherstellungsjournal');
 decodeFiles(journal.before);
 const created=owns(journal,'createdOriginals')?journal.createdOriginals:[];
 if(!Array.isArray(created)||created.length>globalThis.OskarBackupZip.limits.entries)invalid('Wiederherstellungsjournal');
 const oldPaths=new Set(decodeFiles(journal.before).materials.map(m=>m.originalPath).filter(Boolean));
 for(const path of created){originalParts(path);if(!/^Originaldateien\/[a-z]+\/restore-[a-f0-9-]+-[0-9]+-[A-Za-z0-9._-]+$/.test(path)||oldPaths.has(path))invalid('Wiederherstellungsjournal');}
 await rollback(target,journal.before,created);
}
async function commitBundle(target,data,check=()=>{},originals=new Map()){
 await recover(target);
 const before=await readFiles(target);
 decodeFiles(before); // Auch zwischenzeitlich beschädigte Dateien niemals überschreiben.
 const next=Object.fromEntries(Object.entries(FS_FILES).map(([key,name])=>[name,JSON.stringify(data[key],null,2)]));
 check();
 const createdOriginals=[...originals.keys()];
 // Vor dem Journal prüfen: niemals ein existierendes Original ersetzen.
 for(const path of createdOriginals){
   const {folder,name}=await originalFolder(target,path);
   try{await folder.getFileHandle(name);throw Error('Zieldatei existiert bereits.');}catch(e){if(e.name!=='NotFoundError')throw e;}
 }
 if(!createdOriginals.length&&Object.keys(next).every(name=>before[name]===next[name]))return;
 // Erst das vollständige vorherige Dateiset sichern. File System Access ersetzt
 // den Inhalt einer einzelnen Datei erst beim erfolgreichen close().
 try{await writeFile(target,JOURNAL,JSON.stringify({version:1,before,createdOriginals}));}
 catch{
   try{await removeFile(target,JOURNAL);}catch{}
   throw Error('Wiederherstellungsjournal konnte nicht gespeichert werden. Der bisherige Datenbestand bleibt erhalten.');
 }
 try{
   for(const [path,bytes] of originals){
     const {folder,name}=await originalFolder(target,path);
     // Während eines Imports bleibt derselbe Ordner exklusiv aktiv.
     await writeFile(folder,name,bytes);check();
   }
   for(const [name,text] of Object.entries(next))if(before[name]!==text){await writeFile(target,name,text);check();}
   // Erst das Entfernen des Journals bestätigt das komplette Dateiset.
   await removeFile(target,JOURNAL);
 }catch{
   try{await rollback(target,before,createdOriginals);}catch(error){error.storageIncomplete=true;throw error;}
   throw Error('Speichern fehlgeschlagen. Der bisherige Datenbestand wurde wiederhergestellt; neue Änderungen bleiben im Arbeitsspeicher.');
 }
}
function snapshot(){
 if(!directory)return false;
 revision++;
 let data,value;try{data=captureBundle();value=JSON.stringify(data);}catch(error){writeError=error;errorRevision=revision;setStatus(error.message,'error');return false;}
 // Keine zweite Transaktion starten, solange ein Ordnerwechsel/Import läuft.
 if(connecting){deferredSnapshot=true;return true;}
 const snapshotRevision=revision;
 const retry=!!writeError;
 if(value===lastScheduled&&!retry)return true;
 lastScheduled=value;
 const target=directory;
 setStatus('Änderungen werden lokal gespeichert ...','working');
 // Fehler werden sofort behandelt, bleiben aber bis zu einem erfolgreichen
 // vollständigen Retry für flush() sichtbar. Kein einzelner Folgeschreibzugriff
 // darf einen bereits gescheiterten Datensatz als gespeichert ausgeben.
 writeQueue=writeQueue.then(async()=>{
   if(writeError&&!retry)return;
   try{
     await commitBundle(target,data);
     if(errorRevision<=snapshotRevision){writeError=null;setStatus('Alle Änderungen wurden lokal gespeichert.','ready');}
   }catch(error){
     if(errorRevision<=snapshotRevision){writeError=error;errorRevision=snapshotRevision;}
     lastScheduled=null;setStatus(writeError.message,'error');
   }
 });
 return true;
}
async function flush(){
 let queued;
 do{queued=writeQueue;await queued;}while(queued!==writeQueue);
 if(writeError)throw writeError;
 if(connecting&&deferredSnapshot)throw Error('Änderungen während eines Speicherwechsels werden anschließend im bisherigen Speicher gesichert.');
}
function wrapPersistence(){
 if(activated)return;
 activated=true;
 persist=function(){return snapshot();};
 persistCards=function(){return snapshot();};
 saveTasks=function(){return snapshot();};
}
function mergeRecords(a,b,name){
 const items=new Map(a.map(x=>[x.id,x]));
 for(const item of b){
   if(items.has(item.id)&&JSON.stringify(items.get(item.id))!==JSON.stringify(item))throw Error(name+': widersprüchliche Datensätze mit derselben ID. Bitte zuerst ein Backup sichern.');
   items.set(item.id,item);
 }
 return [...items.values()];
}
function mergeInitial(disk,legacy,files){
 const result=clone(disk);
 for(const key of ['materials','cards','tasks','assessments'])result[key]=mergeRecords(disk[key],legacy[key],FS_FILES[key]);
 // Bereits vorhandene Lernstände nicht durch einen leeren Browser überschreiben.
 // Bei zwei unterschiedlichen nichtleeren Ständen ist eine bewusste Auswahl nötig.
 const empty=defaults();
 for(const key of ['progress','journeys','connections']){
   const old=JSON.stringify(legacy[key]),none=JSON.stringify(empty[key]);
   if(files[FS_FILES[key]]===null)result[key]=legacy[key];
   else if(old!==none&&old!==JSON.stringify(disk[key]))throw Error(FS_FILES[key]+': Browser und Ordner enthalten unterschiedliche Lernstände. Bitte zuerst ein Backup sichern.');
 }
 return validateBundle(result);
}
function assertIdle(){
 if(connecting)throw Error('Ein Speicherwechsel läuft bereits. Bitte kurz warten.');
 assertNoActivity();
}
function assertNoActivity(){
 if(originalWrites||typeof autoUploadBusy!=='undefined'&&autoUploadBusy)throw Error('Bitte zuerst den laufenden Dateiimport abschließen.');
 if(typeof session!=='undefined'&&session&&!session.done)throw Error('Bitte zuerst die laufende Übung beenden oder schließen.');
 for(const id of ['journeyOverlay','aiJourneyOverlay'])if($(id)?.classList?.contains('show'))throw Error('Bitte zuerst die laufende Entdeckerreise schließen.');
}
function refresh(){
 // Ein Darstellungsfehler nach dem Commit darf keine Datentransaktion zurückrollen.
 try{
   render();if(typeof displayAutoHistory==='function')displayAutoHistory();
   if(typeof renderSubjectMaterialStatus==='function')renderSubjectMaterialStatus();
   if(typeof renderJourneySources==='function')renderJourneySources();
 }catch{setStatus('Daten gespeichert. Die Ansicht konnte nicht vollständig aktualisiert werden. Bitte neu öffnen.','error');}
}
async function connect(handle){
 if(!handle||handle.kind!=='directory')throw Error('Es wurde kein Ordner ausgewählt.');
 assertIdle();connecting=true;
 setStatus('Lokaler Speicherordner wird geprüft ...');
 try{
   retryBrowserRecovery();
   await flush();
   const startRevision=revision,previousState=captureBundle(),fingerprint=JSON.stringify(previousState);
   const check=()=>{
     if(revision!==startRevision||JSON.stringify(captureBundle())!==fingerprint)throw Error('Während des Verbindens wurden Daten geändert. Bitte erneut verbinden.');
     assertNoActivity();
   };
   const target=await handle.getDirectoryHandle('local-data',{create:true});
   await recover(target);
   const files=await readFiles(target),disk=decodeFiles(files);
   const candidate=activated?disk:mergeInitial(disk,previousState,files);
   check();
   await commitBundle(target,candidate,check);
   // Bis zu diesem Punkt wurden weder RAM noch aktiver Ordner ausgetauscht.
   check();
   applyBundle(candidate);
   directory=target;savedHandle=handle;generation++;lastScheduled=JSON.stringify(candidate);
   wrapPersistence();
   // Alte Browserkopien erst nach vollständig bestätigtem Dateiset entfernen.
   for(const key of [KEY,CARD_KEY,TASK_KEY,'oskar-lernstelle-assessments-v1','oskar-lernstelle-journeys-v1','oskar-subject-connections-v1']){
     try{localStorage.removeItem(key);}catch{}
   }
   try{await handleDb('put',handle);}catch{}
   setStatus('Speicherort: '+handle.name+'/local-data. Alle Daten wurden vollständig verbunden.','ready');
   refresh();
 }catch(error){
   if(directory&&error.storageIncomplete){writeError=error;errorRevision=revision;lastScheduled=null;}
   setStatus(error.message,'error');throw error;
 }finally{finishSwitch();}
}
async function saveOriginal(file,id,subjectId){
 if(!directory||connecting)throw Error('Bitte zuerst einen lokalen Ordner vollständig verbinden.');
 if(!subjects.has(subjectId))throw Error('Unbekanntes Fach.');
 const target=directory;
 const safe=String(file.name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(-110)||'datei';
 const name=String(id).replace(/[^a-zA-Z0-9_-]/g,'')+'-'+safe;
 originalWrites++;
 try{
   const files=await target.getDirectoryHandle('Originaldateien',{create:true});
   const folder=await files.getDirectoryHandle(subjectId,{create:true});
   // Bestehende Originale niemals überschreiben, auch bei einer ID-Kollision.
   try{await folder.getFileHandle(name);throw Error('Diese Originaldatei existiert bereits.');}catch(e){if(e.name!=='NotFoundError')throw e;}
   const handle=await folder.getFileHandle(name,{create:true});
   const writer=await handle.createWritable();
   try{await writer.write(file);await writer.close();}
   catch(e){try{await writer.abort();}catch{}try{await removeFile(folder,name);}catch{}throw e;}
   return 'Originaldateien/'+subjectId+'/'+name;
 }finally{originalWrites--;}
}
async function removeOriginal(item){
 if(!directory||connecting||!item?.originalPath)return;
 const target=directory,context=generation,parts=item.originalPath.split('/');
 if(parts.length!==3||parts[0]!=='Originaldateien'||!subjects.has(parts[1])||!parts[2].startsWith(String(item.id))||parts[2]==='.'||parts[2]==='..')return;
 originalWrites++;
 try{
   // Erst löschen, wenn die Quellenentfernung dauerhaft bestätigt ist.
   await flush();
   if(context!==generation||connecting||store.materials.some(m=>m.id===item.id||m.originalPath===item.originalPath))return;
   const committed=decodeFiles(await readFiles(target));
   if(committed.materials.some(m=>m.id===item.id||m.originalPath===item.originalPath))return;
   const base=await target.getDirectoryHandle('Originaldateien'),sub=await base.getDirectoryHandle(parts[1]);
   if(context!==generation||connecting||store.materials.some(m=>m.id===item.id||m.originalPath===item.originalPath))return;
   await sub.removeEntry(parts[2]);
 }catch(e){if(e.name!=='NotFoundError')setStatus('Originaldatei bleibt erhalten, weil das Speichern oder Löschen nicht abgeschlossen werden konnte.','error');}
 finally{originalWrites--;}
}
function browserKeys(){return {progress:KEY,cards:CARD_KEY,tasks:TASK_KEY,assessments:'oskar-lernstelle-assessments-v1',journeys:'oskar-lernstelle-journeys-v1',connections:'oskar-subject-connections-v1'};}
function browserBeforeBundle(before){
 const keys=browserKeys();
 if(!object(before)||Object.keys(before).length!==Object.keys(keys).length||Object.values(keys).some(key=>!owns(before,key)||!(before[key]===null||typeof before[key]==='string')))invalid('Browser-Wiederherstellungsjournal');
 const data=defaults();
 for(const [group,key] of Object.entries(keys)){
   if(before[key]===null)continue;
   let value;try{value=JSON.parse(before[key]);}catch{invalid('Browser-Wiederherstellungsjournal');}
   if(group==='progress'){
     if(!object(value))invalid('Browser-Wiederherstellungsjournal');
     const {materials=[],...progress}=value;data.materials=materials;data.progress=progress;
   }else data[group]=value;
 }
 return validateBundle(data);
}
function recoverBrowser({apply=true}={}){
 const text=localStorage.getItem(BROWSER_JOURNAL);
 if(text===null)return false;
 let journal;try{journal=JSON.parse(text);}catch{invalid('Browser-Wiederherstellungsjournal');}
 if(!object(journal)||journal.version!==1)invalid('Browser-Wiederherstellungsjournal');
 const data=browserBeforeBundle(journal.before);
 // Neue Werte erst entfernen, um für das Wiederherstellen Platz freizugeben.
 // Das Journal bleibt bis zum letzten erfolgreichen Schreibzugriff erhalten.
 for(const key of Object.keys(journal.before))localStorage.removeItem(key);
 for(const [key,value] of Object.entries(journal.before))if(value!==null)localStorage.setItem(key,value);
 localStorage.removeItem(BROWSER_JOURNAL);
 if(apply)applyBundle(data);
 return true;
}
function retryBrowserRecovery(){
 if(browserRecoveryError){
   recoverBrowser({apply:browserRecoveryApply});browserRecoveryError=null;writeError=null;
 }
}
function commitBrowser(data){
 const keys=browserKeys(),before={};
 for(const key of Object.values(keys))before[key]=localStorage.getItem(key);
 try{localStorage.setItem(BROWSER_JOURNAL,JSON.stringify({version:1,before}));}catch{throw Error('Browser-Backup konnte nicht vorbereitet werden. Bisherige Daten bleiben erhalten.');}
 try{
   for(const [key,name] of Object.entries(keys))localStorage.setItem(name,JSON.stringify(key==='progress'?{...data.progress,materials:data.materials}:data[key]));
   localStorage.removeItem(BROWSER_JOURNAL);
 }catch{
   try{recoverBrowser({apply:false});}
   catch(error){browserRecoveryError=error;browserRecoveryApply=false;throw Error('Browser-Speichern unterbrochen. Das Wiederherstellungsjournal bleibt erhalten. Bitte erneut versuchen.');}
   throw Error('Backup konnte nicht gespeichert werden. Der bisherige Browserstand wurde wiederhergestellt.');
 }
}
function finishSwitch(){
 connecting=false;button.disabled=false;
 if($('materialFile'))$('materialFile').disabled=!isReady();
 if($('saveMaterial'))$('saveMaterial').disabled=!isReady();
 if(deferredSnapshot){deferredSnapshot=false;if(directory)snapshot();}
 if(typeof processPendingMaterials==='function')Promise.resolve().then(()=>processPendingMaterials()).catch(()=>{
   setStatus('Automatische Verarbeitung konnte nicht fortgesetzt werden. Gespeicherte Quellen bleiben erhalten.','error');
 });
}
async function restoreBackup(raw){
 assertIdle();
 const candidate=validateBundle(raw);
 connecting=true;
 try{
   retryBrowserRecovery();await flush();
   const startRevision=revision,fingerprint=JSON.stringify(captureBundle());
   const check=()=>{if(revision!==startRevision||JSON.stringify(captureBundle())!==fingerprint)throw Error('Während des Imports wurden Daten geändert. Bitte erneut versuchen.');assertNoActivity();};
   if(directory)await commitBundle(directory,candidate,check);else{check();commitBrowser(candidate);}
   check();applyBundle(candidate);generation++;lastScheduled=JSON.stringify(candidate);refresh();
 }catch(error){
   if(directory&&error.storageIncomplete){writeError=error;errorRevision=revision;lastScheduled=null;}
   setStatus(error.message,'error');throw error;
 }finally{finishSwitch();}
}
async function exportFullBackup(){
 assertIdle();
 if(!directory)throw Error('Bitte zuerst den lokalen Speicherordner verbinden.');
 connecting=true;setStatus('Vollständiges Backup wird zusammengestellt ...','working');
 try{
   await flush();
   const data=captureBundle(),startRevision=revision,fingerprint=JSON.stringify(data),zip=globalThis.OskarBackupZip;
   const check=()=>{if(revision!==startRevision||JSON.stringify(captureBundle())!==fingerprint)throw Error('Daten wurden während des Backups geändert. Bitte erneut sichern.');assertNoActivity();};
   const entries=new Map();let total=0;
   const add=(path,bytes)=>{zip.path(path);total+=bytes.length;if(bytes.length>zip.limits.file||total>zip.limits.archive||entries.size>=zip.limits.entries-1)throw Error('Backup überschreitet die Grenze von 256 MB, 64 MB je Datei oder 2000 Einträgen.');entries.set(path,bytes);};
   for(const [key,name] of Object.entries(FS_FILES)){
     const bytes=zip.encode(JSON.stringify(data[key],null,2));
     if(bytes.length>32*1024*1024)throw Error('Datengruppe ist zu groß für ein Backup: '+name);
     add(name,bytes);
   }
   let base;try{base=await directory.getDirectoryHandle('Originaldateien');}catch(e){if(e.name!=='NotFoundError')throw e;}
   if(base){
     for await(const [subjectId,folder] of base.entries()){
       if(!subjects.has(subjectId)||folder.kind!=='directory')throw Error('Unbekannter Eintrag im Originaldateiordner. Bitte separat prüfen.');
       for await(const [name,handle] of folder.entries()){
         const path='Originaldateien/'+subjectId+'/'+name;originalParts(path);
         if(handle.kind!=='file')throw Error('Unterordner in Originaldateien werden nicht unterstützt.');
         const file=await handle.getFile();
         if(file.size>zip.limits.file||total+file.size>zip.limits.archive)throw Error('Originaldateien sind zu groß für ein einzelnes Backup.');
         add(path,new Uint8Array(await file.arrayBuffer()));check();
       }
     }
   }
   for(const m of data.materials)if(m.originalPath){originalParts(m.originalPath);if(!entries.has(m.originalPath))throw Error('Eine verknüpfte Originaldatei fehlt. Das vollständige Backup wurde abgebrochen.');}
   const bytes=await zip.create(entries);check();
   setStatus('Vollständiges Backup erstellt. Bitte die heruntergeladene ZIP-Datei privat aufbewahren.','ready');
   return new Blob([bytes],{type:'application/zip'});
 }finally{finishSwitch();}
}
async function restoreFullBackup(file,{approve=()=>true}={}){
 assertIdle();
 if(!directory)throw Error('Bitte zuerst einen leeren lokalen Zielordner verbinden.');
 const target=directory,context=generation,zip=globalThis.OskarBackupZip;
 if(!file||!Number.isSafeInteger(file.size)||file.size>zip.limits.archive||file.size<22)throw Error('ZIP-Backup ist zu groß oder ungültig (maximal 256 MB).');
 // Die gesamte Prüfung erfolgt ohne Schreibzugriff, noch vor Bestätigung und Journal.
 const entries=await zip.validate(new Uint8Array(await file.arrayBuffer())),raw={},originals=new Map();
 for(const [key,name] of Object.entries(FS_FILES)){
   const bytes=entries.get(name);if(!bytes||bytes.length>32*1024*1024)throw Error('Datengruppe fehlt oder ist zu groß: '+name);
   try{raw[key]=JSON.parse(zip.decode(bytes));}catch{invalid(name);}entries.delete(name);
 }
 const candidate=validateBundle(raw);
 for(const [path,bytes] of entries){originalParts(path);originals.set(path,bytes);}
 for(const m of candidate.materials)if(m.originalPath){originalParts(m.originalPath);if(!originals.has(m.originalPath))throw Error('Verknüpfte Originaldatei fehlt im Backup.');}
 assertIdle();if(target!==directory||context!==generation)throw Error('Speicherordner wurde geändert. Bitte erneut auswählen.');
 if(!approve())return false;
 connecting=true;setStatus('Backup geprüft. Daten werden wiederhergestellt ...','working');
 try{
   await flush();const startRevision=revision,fingerprint=JSON.stringify(captureBundle());
   const check=()=>{if(target!==directory||context!==generation||revision!==startRevision||JSON.stringify(captureBundle())!==fingerprint)throw Error('Daten wurden während der Wiederherstellung geändert. Bitte erneut versuchen.');assertNoActivity();};
   // Neue Namen schützen auch unreferenzierte Originale im Ziel vor Überschreiben.
   const restored=new Map(),paths=new Map(),id=crypto.randomUUID();let n=0;
   for(const [path,bytes] of originals){const parts=originalParts(path),next='Originaldateien/'+parts[1]+'/restore-'+id+'-'+n+++'-'+parts[2].slice(-110);paths.set(path,next);restored.set(next,bytes);}
   for(const m of candidate.materials)if(m.originalPath)m.originalPath=paths.get(m.originalPath);
   await commitBundle(target,candidate,check,restored);
   applyBundle(candidate);generation++;lastScheduled=JSON.stringify(candidate);refresh();
   setStatus('Vollständiges Backup wurde mit allen Originaldateien wiederhergestellt.','ready');return true;
 }catch(error){
   if(error.storageIncomplete){writeError=error;errorRevision=revision;lastScheduled=null;}
   setStatus(error.message,'error');throw error;
 }finally{finishSwitch();}
}
function installFullBackupControls(){
 const container=document.createElement('div');container.className='backup-controls';
 const download=document.createElement('button');download.id='exportFullBackup';download.className='btn btn-outline btn-mini';download.textContent='Vollständiges Backup herunterladen';
 const label=document.createElement('label');label.textContent='Backup wiederherstellen ';
 const upload=document.createElement('input');upload.id='importFullBackup';upload.type='file';upload.accept='.zip,application/zip';label.append(upload);
 const info=document.createElement('p');info.className='small';info.textContent='ZIP mit allen Lerndaten und Originaldateien. Privat und unverschlüsselt, maximal 256 MB. Zum Übertragen auf dem anderen Rechner zuerst einen leeren lokalen Ordner verbinden.';
 const feedback=document.createElement('p');feedback.className='small';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 container.append(download,label);host.append(container,info,feedback);
 let busy=false;
 async function run(action){
   if(busy)return;busy=true;download.disabled=upload.disabled=true;
   feedback.textContent='Backup wird geprüft und verarbeitet ...';
   try{const result=await action();feedback.textContent=result===false?'Wiederherstellung abgebrochen.':'Fertig. '+status.textContent;}
   catch(error){feedback.textContent='Backup fehlgeschlagen: '+error.message;}
   finally{busy=false;download.disabled=upload.disabled=false;upload.value='';}
 }
 download.addEventListener('click',()=>run(async()=>{
   const blob=await exportFullBackup(),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='oskar-vollstaendig-'+new Date().toISOString().slice(0,10)+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }));
 upload.addEventListener('change',()=>{const file=upload.files?.[0];if(file)void run(()=>restoreFullBackup(file,{approve:()=>confirm('Das Backup wurde vollständig geprüft. Alle sieben Datengruppen im verbundenen Ordner durch dieses Backup ersetzen? Vorhandene Originaldateien bleiben erhalten. Sichere den bisherigen Stand vorher bei Bedarf separat.')}));});
}

button.addEventListener('click',async()=>{
 if(!hasFolderApi()){setStatus('Direkter Ordnerzugriff wird hier nicht unterstützt. Bitte Chrome oder Edge auf einem Computer verwenden.','error');return;}
 try{
   if(directory&&writeError){
     if(savedHandle&&await savedHandle.queryPermission({mode:'readwrite'})!=='granted')await savedHandle.requestPermission({mode:'readwrite'});
     snapshot();await flush();return;
   }
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
installFullBackupControls();
let browserRecovered=false;
try{browserRecovered=recoverBrowser();}catch(error){browserRecoveryError=error;writeError=error;setStatus('Browser-Wiederherstellung konnte nicht abgeschlossen werden. Bitte erneut verbinden.','error');}
window.oskarLocal={isReady,saveOriginal,removeOriginal,flush,connect,snapshot,restoreBackup,exportFullBackup,restoreFullBackup,getContext:()=>generation,isCurrent:context=>context===generation&&!connecting,isSwitching:()=>connecting};
if(!browserRecoveryError)setStatus(hasFolderApi()?'Wähle einmal deinen geklonten Ordner oskar-lernstelle. Die App erstellt darin local-data und speichert dort Schuldateien und KI-Aufgaben.':'Lokaler Ordnerzugriff benötigt Chrome oder Edge auf dem Computer.');
if(browserRecovered)refresh();
if(hasFolderApi()){
 handleDb('get').then(async handle=>{
   if(!handle||directory)return;
   savedHandle=handle;
   try{if(await handle.queryPermission({mode:'readwrite'})==='granted')await connect(handle);else setStatus('Gespeicherter Ordner: '+handle.name+'. Bitte erneut Zugriff erlauben.');}
   catch(e){setStatus('Ordner bitte erneut verbinden: '+e.message,'error');}
 }).catch(()=>{});
}
})();
