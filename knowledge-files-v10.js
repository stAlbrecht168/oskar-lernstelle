/* Original school files use the permissioned local-data folder, outside the public repository. */
(function(root){
'use strict';
const MAX_BYTES=40*1024*1024,MAX_FILE=12*1024*1024;
const local=()=>root.oskarLocal;
function requireFolder(){if(!local()?.isReady())throw new Error('Bitte zuerst dein lokales Repository verbinden.');return local();}
async function fingerprint(file){return root.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join(''):'';}
async function put(sourceId,file){
 const gateway=requireFolder(),source=materialById(sourceId);
 if(!source)throw new Error('Die Schulquelle ist nicht mehr vorhanden.');
 if(!source.originalPath)source.originalPath=await gateway.saveOriginal(file,sourceId,source.subject);
 return {name:file.name.slice(0,160),size:file.size,sha256:await fingerprint(file)};
}
async function download(sourceId){
 const source=materialById(sourceId);if(!source)return false;
 const file=await requireFolder().readOriginal(source);if(!file)return false;
 const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=source.original?.name||source.title||'Schulquelle';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);return true;
}
async function backup(ids){
 const gateway=requireFolder(),out=[];let total=0;
 for(const source of store.materials.filter(s=>ids.includes(s.id)&&s.originalPath)){
  const file=await gateway.readOriginal(source);
  if(!file)throw new Error('Original fehlt: '+source.title+'. Bitte den vollständigen privaten local-data-Ordner sichern.');
  total+=file.size;if(total>MAX_BYTES)throw new Error('Originale über 40 MB bitte durch Kopieren des privaten local-data-Ordners sichern.');
  const bytes=new Uint8Array(await file.arrayBuffer());let binary='';
  for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
  out.push({sourceId:source.id,name:source.original?.name||source.title||file.name,type:file.type||'application/octet-stream',size:bytes.length,sha256:await fingerprint(file),data:btoa(binary)});
 }
 return out;
}
function validateBundle(raw,sources){
 if(!Array.isArray(raw)||raw.length>100)throw new Error('Ungültige Originaldateien im Backup.');
 const byId=new Map(sources.map(s=>typeof s==='string'?[s,null]:[s.id,s])),wanted=new Set(byId.keys()),seen=new Set(),out=[];let total=0;
 for(const row of raw){
  if(!row||!wanted.has(row.sourceId)||seen.has(row.sourceId)||typeof row.name!=='string'||row.name.length>160||typeof row.type!=='string'||row.type.length>100||typeof row.data!=='string'||row.data.length>MAX_FILE*4/3+8||!Number.isInteger(row.size)||row.size<0||row.size>MAX_FILE||!/^[-a-zA-Z0-9_:.]{1,100}$/.test(row.sourceId)||!/^[A-Za-z0-9+/]*={0,2}$/.test(row.data))throw new Error('Eine Originaldatei im Backup ist ungültig.');
  const binary=atob(row.data);
  if(binary.length!==row.size)throw new Error('Eine Originaldatei im Backup ist unvollständig.');
  total+=binary.length;if(total>MAX_BYTES)throw new Error('Die Originaldateien im Backup überschreiten 40 MB.');
  const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  seen.add(row.sourceId);out.push({sourceId:row.sourceId,subject:byId.get(row.sourceId)?.subject,name:row.name,type:row.type,blob:new Blob([bytes],{type:row.type}),sha256:typeof row.sha256==='string'?row.sha256.slice(0,64):''});
 }
 return out;
}
async function restore(rows){
 for(const row of rows)if(row.sha256&&root.crypto?.subtle){
  const hash=await fingerprint(row.blob);
  if(hash!==row.sha256)throw new Error('Eine Originaldatei im Backup besteht die Prüfsummenprüfung nicht.');
 }
 const gateway=requireFolder(),saved=[];
 for(const row of rows){
  if(!['math','biology','music','art','physics','history','geography','values'].includes(row.subject))throw new Error('Originaldatei ohne gültiges Fach.');
  // New filenames preserve the previous originals if a later restore step fails.
  const file=new File([row.blob],'restored-'+Date.now()+'-'+row.name,{type:row.type});
  const path=await gateway.saveOriginal(file,row.sourceId,row.subject);
  saved.push({sourceId:row.sourceId,path,name:row.name,size:row.blob.size,sha256:row.sha256});
 }
 return saved;
}
root.OskarKnowledgeFiles=Object.freeze({put,download,backup,validateBundle,restore,fingerprint});
})(globalThis);
