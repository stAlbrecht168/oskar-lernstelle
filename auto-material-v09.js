/* Version 0.9: Schulfach wählen, Datei hochladen, automatisch Lernen.
   Der KI-Worker verlangt weiterhin den privaten Zugriffscode. */
'use strict';
const AUTO_WORKER_URL='https://oskar-lernstelle-ai.sha-2d1.workers.dev';
let autoUploadBusy=false,autoAnalysisBusy=false,autoAnalysisQueue=[];
const uploadElement=document.querySelector('#materialFile');
const uploadStatus=document.createElement('div');
uploadStatus.id='autoMaterialStatus';uploadStatus.setAttribute('role','status');uploadStatus.setAttribute('aria-live','polite');
const uploadHistory=document.createElement('div');uploadHistory.id='autoMaterialHistory';
function materialPlayable(m){
 if(!m)return false;
 if(aiTasks.some(t=>t.sourceId===m.id&&t.status==='approved'&&Array.isArray(t.options)&&t.options.length>=2))return true;
 return new Set(cards.filter(c=>c.sourceId===m.id&&c.status==='approved'&&typeof c.term==='string'&&typeof c.definition==='string').map(c=>String(c.term).toLocaleLowerCase('de-DE').trim())).size>=2;
}
function materialNeedsAnalysis(m){
 if(!m||typeof m.text!=='string'||m.text.trim().length<30)return false;
 return !materialPlayable(m);
}
const recentMaterialText=m=>materialPlayable(m)?'Übungen bereit':m.analysisState==='processing'?'KI analysiert':m.analysisState==='waiting'?'KI-Verbindung fehlt':m.analysisState==='failed'?'Analyse fehlgeschlagen':'Gespeichert, noch keine Übungen';
function setAutoStatus(message,kind='working'){
 uploadStatus.dataset.state=kind;
 uploadStatus.textContent=message;
}
function displayAutoHistory(){
 if(!uploadHistory.isConnected)return;
 const list=store.materials.slice(-3).reverse();
 uploadHistory.innerHTML=list.length?'<h3>Bereits hinzugefügt</h3>'+list.map(m=>'<div class="auto-source"><span><strong>'+noHtml(m.title||'Schulmaterial')+'</strong><small>'+noHtml(subject(m.subject)?.name||m.subject)+'</small></span><span class="auto-state">'+noHtml(recentMaterialText(m))+'</span></div>').join(''):'';
}
function setupSimplifiedMaterials(){
 const materials=$('parentMaterials');
 const subjectField=$('materialSubject').closest('.field');
 const fileField=$('materialFile').closest('.field');
 const content=materials.parentElement;
 const tabBar=content.querySelector('.parent-tabs');
 const details=document.createElement('details');
 details.id='materialAdvanced';
 details.innerHTML='<summary>Weitere Einstellungen und Korrekturen</summary><div class="auto-advanced-body"></div>';
 const inner=details.querySelector('.auto-advanced-body');
 const materialSummary=content.querySelector('.material-summary');
 if(materialSummary)inner.appendChild(materialSummary);
 const extras=[...materials.children].filter(x=>x!==subjectField&&x!==fileField);
 for(const el of extras)inner.appendChild(el);
 materials.append(subjectField,fileField,uploadStatus,uploadHistory,details);
 if(tabBar)inner.insertBefore(tabBar,inner.firstChild);
 const note=document.createElement('p');note.className='small auto-note';
 note.textContent='Nach der Auswahl wird die Datei lokal gelesen und gespeichert. Für KI-Übungen wird der erkannte Text an deinen geschützten KI-Dienst übermittelt.';
 materials.insertBefore(note,subjectField);
 const recentLabel=fileField.querySelector('label');if(recentLabel)recentLabel.textContent='Schulmaterial auswählen (PDF, Foto oder Text)';
 const subjectLabel=subjectField.querySelector('label');if(subjectLabel)subjectLabel.textContent='Schulfach';
 const back=()=>{setParentTab('materials');details.open=true;};
 for(const panel of [$('parentReview'),$('parentAbout')]){
   if(panel){const button=document.createElement('button');button.className='btn btn-outline btn-mini';button.type='button';button.textContent='Zurück zur Materialbibliothek';button.addEventListener('click',back);panel.prepend(button);}
 }
 $('parentTitle').textContent='Schulmaterial hinzufügen';
 if(!$('aiEndpoint').value.trim()){$('aiEndpoint').value=AUTO_WORKER_URL;localStorage.setItem('oskar-ai-endpoint',AUTO_WORKER_URL);}
 const savedToken=sessionStorage.getItem('oskar-ai-access')||'';
 if(savedToken)$('aiToken').value=savedToken;
 $('aiToken').addEventListener('change',()=>{
   const token=$('aiToken').value.trim();
   if(token)sessionStorage.setItem('oskar-ai-access',token);
   else sessionStorage.removeItem('oskar-ai-access');
   if(token)processPendingMaterials();
 });
 $('aiEndpoint').addEventListener('change',()=>processPendingMaterials());
 uploadStatus.addEventListener('click',event=>{
   const b=event.target.closest('[data-auto-action]');if(!b)return;
   if(b.dataset.autoAction==='connect'){details.open=true;$('aiToken').focus();}
   if(b.dataset.autoAction==='retry')processPendingMaterials();
 });
 displayAutoHistory();
 if(store.materials.some(materialNeedsAnalysis))processPendingMaterials();
}
function workerConnection(){
 const endpoint=$('aiEndpoint').value.trim().replace(/\/+$/,'');
 const token=$('aiToken').value.trim()||sessionStorage.getItem('oskar-ai-access')||'';
 return {endpoint,token,ready:/^https:\/\/[^\s/]+$/.test(endpoint)&&!!token};
}
const evidenceNorm=s=>String(s||'').toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();
function vettedTasks(raw,m){
 const items=Array.isArray(raw)?raw:[],seen=new Set(),out=[];
 for(const t of items){
   if(!t||!['choice','true_false','gap'].includes(t.type)||typeof t.question!=='string'||t.question.length<8||t.question.length>240||typeof t.explanation!=='string'||t.explanation.length<10||t.explanation.length>420||typeof t.evidence!=='string'||t.evidence.length<10||t.evidence.length>350||!evidenceNorm(m.text).includes(evidenceNorm(t.evidence)))continue;
   if(!Array.isArray(t.options)||t.options.length<2||t.options.length>4||t.options.some(o=>typeof o!=='string'||!o.trim()||o.length>140)||new Set(t.options.map(evidenceNorm)).size!==t.options.length||!Number.isInteger(t.correctIndex)||t.correctIndex<0||t.correctIndex>=t.options.length)continue;
   if(t.type==='true_false'&&(t.options.length!==2||t.options[0]!=='Richtig'||t.options[1]!=='Falsch'))continue;
   if(t.type==='gap'&&!t.question.includes('___'))continue;
   const key=evidenceNorm(t.question);if(seen.has(key))continue;seen.add(key);
   out.push({id:uniqueId(),sourceId:m.id,sourceTitle:m.title,subject:m.subject,type:t.type,question:t.question,options:t.options,correctIndex:t.correctIndex,explanation:t.explanation,evidence:t.evidence,status:'approved',generatedByAI:true,reviewedByHuman:false,created:new Date().toISOString()});
 }
 return out.slice(0,12);
}
function vettedCards(raw,m){
 const items=Array.isArray(raw)?raw:[],seen=new Set(),out=[];
 for(const c of items){
   if(!c||typeof c.term!=='string'||c.term.length<2||c.term.length>90||typeof c.definition!=='string'||c.definition.length<5||c.definition.length>320||typeof c.evidence!=='string'||c.evidence.length<10||c.evidence.length>350||!evidenceNorm(m.text).includes(evidenceNorm(c.evidence)))continue;
   const key=evidenceNorm(c.term);if(seen.has(key))continue;seen.add(key);
   out.push({id:uniqueId(),sourceId:m.id,sourceTitle:m.title,subject:m.subject,term:c.term,definition:c.definition,evidence:c.evidence,status:'approved',generatedByAI:true,reviewedByHuman:false,created:new Date().toISOString()});
 }
 return out.slice(0,10);
}
async function analyzeUploadedMaterial(m){
 if(!window.oskarLocal?.isReady()||window.oskarLocal?.isSwitching?.())return;
 const context=window.oskarLocal?.getContext?.()??0;
 const current=()=>!window.oskarLocal?.isSwitching?.()&&(!window.oskarLocal?.isCurrent||window.oskarLocal.isCurrent(context))&&store.materials.includes(m);
 if(!current())return;
 const connection=workerConnection();
 if(!connection.ready){
  m.analysisState='waiting';persist();displayAutoHistory();if(typeof renderSubjectMaterialStatus==='function')renderSubjectMaterialStatus();
  setAutoStatus('Datei gespeichert. Für die automatische KI-Analyse bitte einmal den privaten Zugriffscode eingeben.','waiting');
  const b=document.createElement('button');b.className='btn btn-outline btn-mini';b.dataset.autoAction='connect';b.textContent='KI-Verbindung einrichten';uploadStatus.appendChild(b);
  return;
 }
 m.analysisState='processing';persist();displayAutoHistory();if(typeof renderSubjectMaterialStatus==='function')renderSubjectMaterialStatus();
 setAutoStatus('Datei gespeichert. Die KI erstellt jetzt Lernkarten und Übungsaufgaben …','working');
 try{
  const resp=await fetch(connection.endpoint+'/generate',{method:'POST',headers:{authorization:'Bearer '+connection.token,'content-type':'application/json'},body:JSON.stringify({subject:subject(m.subject).name,text:m.text.slice(0,18000)}),signal:AbortSignal.timeout(45000)});
  let result;try{result=await resp.json();}catch{throw Error('Ungültige Antwort des KI-Dienstes.');}
  if(!current())return;
  if(!resp.ok)throw Error(result.error||'KI-Dienst meldet Fehler '+resp.status);
  const tasks=vettedTasks(result.tasks,m),newCards=vettedCards(result.cards,m);
  if(!tasks.length&&newCards.length<2)throw Error('Die Datei enthält zu wenig eindeutige Aussagen für ein Quiz. Bitte eine zusätzliche oder besser lesbare Seite hochladen.');
  aiTasks=aiTasks.filter(t=>t.sourceId!==m.id).concat(tasks);
  cards=cards.filter(c=>c.sourceId!==m.id).concat(newCards);
  if(!saveTasks()||!persistCards())throw Error('Die Aufgaben konnten nicht gespeichert werden.');
  await window.oskarLocal.flush();
  if(!current())return;
  m.analysisState='ready';m.analysisCount=tasks.length+newCards.length;m.analysisError='';
  persist();await window.oskarLocal.flush();if(!current())return;render();displayAutoHistory();
  setAutoStatus('Fertig! '+tasks.length+' Übungen und '+newCards.length+' Lernkarten für '+subject(m.subject).name+' erstellt. Die Levels verwenden jetzt deinen Schulstoff. Die KI-Inhalte sind automatisch erzeugt und sollten stichprobenartig geprüft werden.','ready');
  if(typeof scheduleAiConnections==='function')scheduleAiConnections();
 }catch(err){
  if(!current())return;
  m.analysisState='failed';m.analysisError=String(err.message||'Unbekannter Fehler').slice(0,180);
  persist();displayAutoHistory();if(typeof renderSubjectMaterialStatus==='function')renderSubjectMaterialStatus();
  setAutoStatus('Datei gespeichert, aber die KI-Analyse ist fehlgeschlagen: '+m.analysisError,'failed');
  const b=document.createElement('button');b.className='btn btn-outline btn-mini';b.dataset.autoAction='retry';b.textContent='Analyse erneut versuchen';uploadStatus.appendChild(b);
 }
}
async function processPendingMaterials(){
 if(!window.oskarLocal?.isReady()||window.oskarLocal?.isSwitching?.()||autoUploadBusy||autoAnalysisBusy)return;
 const context=window.oskarLocal?.getContext?.()??0;
 const connection=workerConnection();
 if(!connection.ready){displayAutoHistory();return;}
 autoAnalysisBusy=true;
 try{
  const pending=store.materials.filter(materialNeedsAnalysis);
  for(const m of pending){if(!store.materials.includes(m))continue;await analyzeUploadedMaterial(m);}
 }finally{
  autoAnalysisBusy=false;
  // Ein alter Auftrag kann den Start nach einem Ordnerwechsel kurz blockiert
  // haben. Nur in einer neuen Generation genau eine aktuelle Queue starten.
  if((window.oskarLocal?.getContext?.()??0)!==context&&!window.oskarLocal?.isSwitching?.()&&window.oskarLocal?.isReady())void processPendingMaterials();
 }
}
async function readScannedPdf(file){
 if(!window.pdfjsLib)await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',()=>!!window.pdfjsLib);
 window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',()=>!!window.Tesseract);
 const pdf=await window.pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 let extracted='';
 const limit=Math.min(5,pdf.numPages);
 for(let i=1;i<=limit;i++){
  setAutoStatus('Gescanntes PDF erkannt. Texterkennung für Seite '+i+' von '+limit+' …','working');
  const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.8});
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  await page.render({canvasContext:ctx,viewport}).promise;
  const result=await window.Tesseract.recognize(canvas,'deu+eng');
  extracted+='\nSeite '+i+'\n'+result.data.text+'\n';
  canvas.width=0;canvas.height=0;
 }
 return extracted;
}
async function ingestSchoolFile(file){
 if(!window.oskarLocal?.isReady()){setAutoStatus('Bitte zuerst einen lokalen Ordner auswählen.','waiting');return;}
 if(window.oskarLocal?.isSwitching?.()){setAutoStatus('Bitte warten, bis der Speicherordner verbunden ist.','waiting');return;}
 if(autoUploadBusy)return;
 if(!file)return;
 const context=window.oskarLocal?.getContext?.()??0;
 const current=()=>!window.oskarLocal?.isSwitching?.()&&(!window.oskarLocal?.isCurrent||window.oskarLocal.isCurrent(context));
 if(!subject($('materialSubject').value)){setAutoStatus('Bitte zuerst ein Schulfach auswählen.','failed');return;}
 autoUploadBusy=true;uploadElement.disabled=true;
 const subjectId=$('materialSubject').value;
 setAutoStatus('Lese '+file.name+' und erkenne den Schulstoff …','working');
 try{
  let text;
  try{text=await extractFileText(file);}catch(err){
   if((file.type==='application/pdf'||/\.pdf$/i.test(file.name))&&/Scan|Texterkennung/i.test(err.message||''))text=await readScannedPdf(file);
   else throw err;
  }
  if(!current())return;
  text=String(text||'').trim();
  if(text.length<30)throw Error('Zu wenig lesbarer Text. Verwende eine gut lesbare PDF- oder Fotoaufnahme mit mindestens 30 Zeichen.');
  if(store.materials.length>=100)throw Error('Maximale Zahl von Quellen erreicht. Bitte alte Quellen entfernen oder ein Backup anlegen.');
  const id=uniqueId();
  const originalPath=await window.oskarLocal.saveOriginal(file,id,subjectId);
  if(!current())return;
  const m={id,subject:subjectId,title:file.name.slice(0,100),originalPath,text:text.slice(0,30000),created:new Date().toISOString(),analysisState:'waiting'};
  store.materials.push(m);persist();await window.oskarLocal.flush();if(!current())return;render();displayAutoHistory();
  setAutoStatus('Datei gespeichert. Bereite die Lernaufgaben vor …','working');
  if(typeof scheduleAiConnections==='function')scheduleAiConnections();
  await analyzeUploadedMaterial(m);
 }catch(err){
  if(!current())return;
  setAutoStatus('Datei konnte nicht übernommen werden: '+(err.message||'Unbekannter Fehler'),'failed');
 }finally{if(current())uploadElement.value='';uploadElement.disabled=!window.oskarLocal?.isReady()||!!window.oskarLocal?.isSwitching?.();autoUploadBusy=false;}
}
const AUTO_MATERIAL_STYLES=String.raw`
#parentOverlay #parentMaterials>.auto-note{font-size:13px;color:#687893;line-height:1.45;margin:6px 0 18px}
#parentOverlay #parentMaterials>.field{margin-bottom:18px}
#parentOverlay #parentMaterials>.field label{font-size:14px;font-weight:850;display:block;margin-bottom:6px}
#parentOverlay #parentMaterials>.field select{width:100%;min-height:48px}
#parentOverlay #materialFile{border:2px dashed #b9c8e5;padding:16px;border-radius:14px;width:100%;background:#f8faff}
#autoMaterialStatus{padding:13px 16px;border:1px solid #dce6f3;background:#f8faff;border-radius:14px;color:#415470;font-size:14px;display:grid;gap:10px}
#autoMaterialStatus:empty{display:none}
#autoMaterialStatus[data-state="ready"]{background:#eefaef;color:#1b6947;border-color:#bce8c8}
#autoMaterialStatus[data-state="failed"]{background:#fff4ec;color:#92531f;border-color:#f8dbc6}
#autoMaterialHistory{margin:20px 0}
#autoMaterialHistory h3{font-size:14px;margin:0 0 8px}
.auto-source{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #e9edf7;font-size:13px}
.auto-source span:first-child{min-width:0}
.auto-source strong{display:block;overflow-wrap:anywhere}
.auto-source small{display:block;color:#71809a}
.auto-state{color:#566b8a;font-size:12px;flex-shrink:0}
#materialAdvanced{border-top:1px solid #e8eefa;margin-top:16px;padding-top:12px}
#materialAdvanced>summary{font-size:13px;cursor:pointer;color:#6c7892;font-weight:700}
#materialAdvanced .auto-advanced-body{padding-top:20px}
#materialAdvanced .parent-tabs{display:flex;flex-wrap:wrap;margin-bottom:18px}
#materialAdvanced .manual-card{margin-top:24px}
`;
const css=document.createElement('style');css.textContent=AUTO_MATERIAL_STYLES;document.head.appendChild(css);
// Den bisherigen zweistufigen Dateiimport durch den automatischen Ablauf ersetzen.
// Capture verhindert, dass der alte Handler anschließend nur das Textfeld befüllt.
uploadElement.addEventListener('change',event=>{
  event.stopImmediatePropagation();
  const file=event.target.files?.[0];
  if(file)void ingestSchoolFile(file);
},true);
setupSimplifiedMaterials();

/* Musik, Mathe usw. zeigen die wirkliche Materialnutzung direkt im Lernpfad. */
function initSubjectMaterialStatus(){
 const learn=$('learn'),progress=learn.querySelector('.path-progress');
 if(!learn||!progress)return;
 const line=document.createElement('div');
 line.id='subjectMaterialStatus';
 line.className='subject-source-status';
 line.setAttribute('role','status');
 line.setAttribute('aria-live','polite');
 line.hidden=true;
 progress.insertAdjacentElement('afterend',line);
 line.addEventListener('click',event=>{
   const b=event.target.closest('[data-material-action]');if(!b)return;
   if(b.dataset.materialAction==='connect'){
     if(typeof openMaterials==='function')openMaterials();
     else openParent();
     const details=$('materialAdvanced');if(details)details.open=true;
     $('aiToken').focus();
     return;
   }
   if(b.dataset.materialAction==='retry'){
     if(typeof openMaterials==='function')openMaterials();
     else openParent();
     processPendingMaterials();
   }
 });
 const originalRenderWithSources=render;
 render=function(){
   originalRenderWithSources();
   renderSubjectMaterialStatus();
 };
 renderSubjectMaterialStatus();
}
function renderSubjectMaterialStatus(){
 const line=$('subjectMaterialStatus');if(!line)return;
 const current=store.materials.filter(m=>m.subject===selected);
 if(!current.length){line.hidden=true;line.replaceChildren();return;}
 line.hidden=false;
 const name=subject(selected)?.name||'Schulfach';
 const total=realQuestions(selected).length;
 const waiting=current.some(materialNeedsAnalysis);
 const analyzing=current.some(m=>m.analysisState==='processing'&&materialNeedsAnalysis(m));
 const error=current.some(m=>m.analysisState==='failed'&&materialNeedsAnalysis(m));
 const label=document.createElement('span');
 label.className='subject-source-label';
 let description='';
 let action='';
 let actionName='';
 if(total){
   description=name+': '+current.length+' '+(current.length===1?'Quelle':'Quellen')+' · '+total+' Aufgaben aus deinem Schulstoff';
   if(waiting){description+=' · weiteres Material wird analysiert';}
 }else if(analyzing){
   description=name+': '+current.length+' '+(current.length===1?'Quelle':'Quellen')+' gespeichert. KI erstellt Aufgaben.';
 }else if(!workerConnection().ready){
   description=name+': '+current.length+' '+(current.length===1?'Quelle':'Quellen')+' gespeichert. KI-Verbindung fehlt, deshalb siehst du Beispielaufgaben.';
   action='connect';actionName='KI verbinden';
 }else if(error){
   description=name+': '+current.length+' '+(current.length===1?'Quelle':'Quellen')+' gespeichert. KI-Analyse fehlgeschlagen.';
   action='retry';actionName='Erneut versuchen';
 }else{
   description=name+': '+current.length+' '+(current.length===1?'Quelle':'Quellen')+' gespeichert. Noch keine KI-Aufgaben.';
   action='retry';actionName='Aufgaben erzeugen';
 }
 label.textContent=description;
 line.replaceChildren(label);
 if(action){
   const button=document.createElement('button');button.type='button';button.className='btn btn-outline btn-mini';
   button.dataset.materialAction=action;button.textContent=actionName;
   line.appendChild(button);
 }
}

initSubjectMaterialStatus();
