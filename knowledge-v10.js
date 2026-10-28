/* Persistent knowledge pages, grounded questions and topic practice. Existing accounts are reused. */
(function(){
'use strict';
const core=globalThis.OskarKnowledgeCore,files=globalThis.OskarKnowledgeFiles;
const el=id=>document.getElementById(id),escape=noHtml;
let state=core.empty(),activeTopic='',busy=false,lastSourceSignature='',questionSerial=0;
function save(next=state){
 state=next;
 try{if(globalThis.oskarLocal?.isReady())globalThis.oskarLocal.snapshot();return true;}
 catch{toast('Wissen konnte nicht im lokalen Ordner gespeichert werden.');return false;}
}
function seedExisting(){
 if(!globalThis.oskarLocal?.isReady())return;
 let next=state,changed=false;
 for(const source of store.materials){
  if(state.processed.some(p=>p.sourceId===source.id))continue;
  const sourceCards=cards.filter(c=>c.sourceId===source.id&&c.generatedByAI&&core.validTask({...c,evidence:c.evidence},store.materials));
  if(sourceCards.length){next=core.applyAnalysis(next,source,{cards:sourceCards},store.materials);changed=true;}
 }
 if(changed)save(next);
 let changedTasks=false,changedCards=false;
 for(const t of aiTasks)if(!t.sourceRevision&&core.validTask(t,store.materials)){t.sourceRevision=core.revision(materialById(t.sourceId));changedTasks=true;}
 for(const c of cards)if(c.sourceId&&!c.sourceRevision&&core.validTask(c,store.materials)){c.sourceRevision=core.revision(materialById(c.sourceId));changedCards=true;}
 if(changedTasks)saveTasks();if(changedCards)persistCards();
}
seedExisting();
function blockedSources(){
 return new Set(core.pages(state,store.materials).filter(p=>p.status==='conflict').flatMap(p=>p.sourceIds));
}
const oldSourceTasks=sourceTasks;
sourceTasks=function(id){
 const blocked=blockedSources();
 const live=new Set(aiTasks.filter(t=>!blocked.has(t.sourceId)&&core.validTask(t,store.materials)).map(t=>'ai:'+t.id));
 return oldSourceTasks(id).filter(q=>live.has(q.index));
};
const oldApprovedCards=approvedCards;
approvedCards=function(id){const blocked=blockedSources();return oldApprovedCards(id).filter(c=>!c.sourceId||(!blocked.has(c.sourceId)&&core.validTask(c,store.materials)));};

const content=el('parentOverlay').querySelector('.dialog-content');
const nav=document.createElement('nav');nav.className='knowledge-nav';nav.setAttribute('aria-label','Schulmaterial und Wissen');
nav.innerHTML='<button type="button" data-knowledge-view="materials" aria-pressed="true">＋ Material hinzufügen</button><button type="button" data-knowledge-view="knowledge" aria-pressed="false">📖 Mein Wissen <span id="knowledgeCount">0</span></button>';
content.prepend(nav);
const panel=document.createElement('section');panel.id='parentKnowledge';panel.hidden=true;
panel.innerHTML=`
 <div class="wiki-heading"><div><span class="wiki-eyebrow">Dein Second Brain</span><h2>Dein Wissen wächst mit dir.</h2><p>Aus deinen Schulunterlagen. Mit Quellen, die du nachlesen kannst.</p></div><span class="wiki-symbol" aria-hidden="true">📖</span></div>
 <div class="wiki-summary" id="knowledgeSummary" aria-live="polite"></div>
 <div class="wiki-controls"><label for="knowledgeSearch">Themen suchen<input id="knowledgeSearch" type="search" placeholder="Zum Beispiel Notenwerte oder Licht" autocomplete="off"></label><label for="knowledgeSubject">Fach<select id="knowledgeSubject"><option value="">Alle Fächer</option></select></label></div>
 <div id="knowledgeTopics" class="wiki-topics"></div>
 <div id="knowledgeDetail" hidden></div>
 <section class="wiki-question"><h3>Frag dein Wissen</h3><p class="small" id="knowledgeQuestionHint">ChatGPT antwortet aus bis zu vier passenden Schulquellen.</p><form id="knowledgeQuestionForm"><label for="knowledgeQuestion">Was möchtest du verstehen?</label><div class="wiki-ask-row"><input id="knowledgeQuestion" maxlength="400" placeholder="Warum entsteht ein Schatten?" required minlength="5"><button class="btn btn-green" type="submit" id="knowledgeAsk">Fragen</button></div></form><div id="knowledgeAnswer" role="status" aria-live="polite"></div></section>
 <section id="knowledgeConnections"></section>
 <details class="wiki-audit"><summary>Wissensbasis prüfen und ergänzen</summary><div id="knowledgeAudit"></div><button class="btn btn-outline btn-mini" type="button" id="knowledgeSync">Fehlendes Wissen mit ChatGPT ergänzen</button><p class="small">Bereits aktuelle Quellen werden wiederverwendet. Dateien und Lernstände werden in deinem gewählten local-data-Ordner gespeichert. Zur KI-Verarbeitung werden ausgewählte Schultexte an den eingerichteten Dienst übertragen.</p></details>
 <p id="knowledgeActionStatus" class="small" role="status" aria-live="polite"></p>
`;
content.append(panel);
el('knowledgeSubject').insertAdjacentHTML('beforeend',EXAMS.map(s=>'<option value="'+escape(s.id)+'">'+escape(s.name)+'</option>').join(''));
const knowledgeButton=document.createElement('button');knowledgeButton.type='button';knowledgeButton.id='knowledgeOpen';knowledgeButton.className='btn btn-outline wiki-open';knowledgeButton.textContent='📖 Mein Wissen entdecken';
el('customPracticeBtn').after(knowledgeButton);
const previousSetTab=setParentTab;
setParentTab=function(name){
 if(name==='knowledge'){
  previousSetTab('materials');el('parentMaterials').hidden=true;panel.hidden=false;
  el('parentTitle').textContent='Dein Wissen';paint();
 }else{panel.hidden=true;previousSetTab(name);el('parentTitle').textContent=name==='materials'?'Schulmaterial hinzufügen':'Materialbibliothek';}
 nav.querySelectorAll('[data-knowledge-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.knowledgeView===(name==='knowledge'?'knowledge':'materials'))));
};
function openKnowledge(){openParent();setParentTab('knowledge');}
knowledgeButton.addEventListener('click',openKnowledge);
el('subjectMaterialStatus')?.addEventListener('click',event=>{if(event.target.closest('[data-wiki-conflicts]'))openKnowledge();});
nav.addEventListener('click',event=>{const b=event.target.closest('[data-knowledge-view]');if(b)setParentTab(b.dataset.knowledgeView);});
function currentPage(){return core.pages(state,store.materials).find(p=>p.id===activeTopic);}
function evidenceHTML(sourceId,quote){
 const source=materialById(sourceId);
 return '<details class="wiki-evidence"><summary>Quelle: '+escape(source?.title||'Schulquelle')+'</summary><blockquote>„'+escape(quote)+'“</blockquote><small>'+escape(subject(source?.subject)?.name||'')+' · aus deinem gespeicherten Schultext</small></details>';
}
function sourceEditor(source){
 return '<details class="wiki-source-edit"><summary>'+escape(source.title||'Schulquelle')+' ansehen und korrigieren</summary>'+
 '<label>Titel<input data-source-title="'+escape(source.id)+'" maxlength="100" value="'+escape(source.title||'')+'"></label>'+
 '<label>Gespeicherten Schultext korrigieren<textarea data-source-text="'+escape(source.id)+'" rows="6" maxlength="30000">'+escape(source.text)+'</textarea></label>'+
 '<p class="small">Eine Textkorrektur macht bisherige Ableitungen ungültig. ChatGPT aktualisiert daraus Wissen und Aufgaben. Die Originaldatei bleibt erhalten.'+(source.text.length>18000?' Ausgewertet werden die ersten 18.000 Zeichen des erkannten Textes.':'')+'</p>'+
 '<div class="wiki-actions"><button type="button" class="btn btn-outline btn-mini" data-source-save="'+escape(source.id)+'" '+(busy?'disabled':'')+'>Korrektur speichern</button><button type="button" class="btn btn-outline btn-mini" data-source-refresh="'+escape(source.id)+'" '+(busy?'disabled':'')+'>Mit ChatGPT neu ordnen</button>'+
 (source.originalPath?'<button type="button" class="btn btn-outline btn-mini" data-source-original="'+escape(source.id)+'">Original herunterladen</button>':'')+'</div>'+
 (source.originalError?'<p class="small">Original nicht gesichert: '+escape(source.originalError)+'</p>':'')+'</details>';
}
function paintDetail(page){
 const detail=el('knowledgeDetail');detail.hidden=!page;
 el('knowledgeTopics').hidden=!!page;
 if(!page){detail.innerHTML='';return;}
 const related=core.pages(state,store.materials).filter(p=>p.id!==page.id&&p.status==='ready'&&p.sourceIds.some(id=>page.sourceIds.includes(id))).slice(0,6);
 const sources=[...new Set([...page.contributions,...page.stale].map(c=>c.sourceId))].map(materialById).filter(Boolean);
 const grouped=new Map();
 for(const c of page.contributions){const key=core.normalize(c.summary);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(c);}
 detail.innerHTML='<button type="button" class="wiki-back" data-wiki-back>← Alle Themen</button><div class="wiki-topic-heading"><div><span class="wiki-eyebrow">'+escape(subject(page.subject)?.name||page.subject)+' · KI-erstellt</span><h2>'+escape(page.title)+'</h2></div><span class="wiki-label '+page.status+'">'+(page.status==='ready'?'Mit Quellen':page.status==='conflict'?'Unklarheit prüfen':'Aktualisierung nötig')+'</span></div>'+
 (page.status==='outdated'?'<p class="wiki-warning">Die Schulquelle wurde verändert. Die frühere Erklärung wird erst nach einer neuen Auswertung wieder verwendet.</p>':'')+
 [...grouped.values()].map(rows=>'<article class="wiki-explanation"><p>'+escape(rows[0].summary)+'</p>'+rows.map(c=>evidenceHTML(c.sourceId,c.quote)).join('')+'</article>').join('')+
 page.conflicts.map(c=>'<article class="wiki-warning"><h3>Zwei Aussagen passen möglicherweise nicht zusammen</h3><p>'+escape(c.reason)+'</p>'+evidenceHTML(c.sourceId,c.quote)+evidenceHTML(c.newSourceId,c.newQuote)+'<p class="small">KI-Hinweis. Prüft den Zusammenhang und die Texterkennung; bis dahin sind Themenübungen pausiert.</p></article>').join('')+
 '<div class="wiki-actions"><button class="btn btn-green" type="button" data-wiki-practice="'+escape(page.id)+'" '+(busy||page.status!=='ready'?'disabled':'')+'>Dieses Thema üben</button><button class="btn btn-outline" type="button" data-wiki-print="'+escape(page.id)+'" '+(busy||page.status!=='ready'?'disabled':'')+'>Arbeitsblatt drucken</button></div>'+
 (related.length?'<div class="wiki-related"><h3>Aus denselben Unterlagen</h3>'+related.map(p=>'<button type="button" data-knowledge-topic="'+escape(p.id)+'">'+escape(p.title)+' ↗</button>').join('')+'</div>':'')+
 '<details class="wiki-sources"><summary>Quellen und Korrekturen ('+sources.length+')</summary>'+sources.map(sourceEditor).join('')+'</details>';
 el('knowledgeQuestionHint').textContent='Frage zum Thema „'+page.title+'“. ChatGPT verwendet die zugehörigen Schulquellen.';
}
function paintConnections(){
 let rows=[];
 if(typeof connectionsCache!=='undefined'&&connectionsCache&&typeof connectionSources==='function'&&typeof connectionSignature==='function'){
  const sources=connectionSources();
  if(connectionsCache.signature===connectionSignature(sources))rows=(connectionsCache.connections||[]).filter(c=>validAiConnection(c,sources));
 }
 el('knowledgeConnections').innerHTML=rows.length?'<h3>Zusammenhänge zwischen deinen Fächern</h3>'+rows.slice(0,3).map(c=>'<article class="wiki-link"><span class="wiki-eyebrow">KI-Vorschlag mit Quellen</span><h4>'+escape(c.title)+'</h4><p>'+escape(c.howToCombine)+'</p>'+c.evidence.map(e=>evidenceHTML(e.sourceId,e.quote)).join('')+'</article>').join(''):'';
}
function paint(){
 const all=core.pages(state,store.materials),audit=core.audit(state,store.materials),ready=all.filter(p=>p.status==='ready'),page=all.find(p=>p.id===activeTopic);
 if(!page)activeTopic='';
 el('knowledgeCount').textContent=String(all.length);
 el('knowledgeSummary').innerHTML='<span><strong>'+all.length+'</strong> '+(all.length===1?'gespeichertes Thema':'gespeicherte Themen')+'</span><span><strong>'+store.materials.length+'</strong> '+(store.materials.length===1?'Schulquelle':'Schulquellen')+'</span><span class="wiki-local">'+(globalThis.oskarLocal?.isReady()?'Speicherort: dein privater local-data-Ordner':'Verbinde dein lokales Repository unter „Material hinzufügen“.')+'</span>';
 const query=el('knowledgeSearch').value,subjectId=el('knowledgeSubject').value;
 const found=core.search(state,store.materials,query).filter(p=>!subjectId||p.subject===subjectId);
 el('knowledgeTopics').innerHTML=found.length?found.map(p=>'<button class="wiki-topic" type="button" data-knowledge-topic="'+escape(p.id)+'"><span class="wiki-topic-icon" aria-hidden="true">'+escape(subject(p.subject)?.icon||'📖')+'</span><span><small>'+escape(subject(p.subject)?.name||p.subject)+'</small><strong>'+escape(p.title)+'</strong><span>'+ (p.status==='outdated'?'Quelle geändert · bitte aktualisieren':p.status==='conflict'?'Unklarheit in den Quellen':p.sourceIds.length+' '+(p.sourceIds.length===1?'Quelle':'Quellen'))+'</span></span><b aria-hidden="true">↗</b></button>').join(''):
 '<div class="wiki-empty"><span aria-hidden="true">🌱</span><h3>'+(all.length?'Kein passendes Thema gefunden':'Hier wächst dein Schulwissen')+'</h3><p>'+(all.length?'Versuche einen Begriff aus deinen Unterlagen.':store.materials.length?'Deine Quellen sind gespeichert. Mit der nächsten KI-Auswertung entstehen hier Themenseiten.':'Lade eine Buch- oder Mappenseite hoch. ChatGPT erstellt daraus Themen und Übungen.')+'</p><button type="button" class="btn btn-outline" data-wiki-add>Schulmaterial hinzufügen</button></div>';
 el('knowledgeQuestionHint').textContent='ChatGPT antwortet aus bis zu vier passenden Schulquellen.';
 paintDetail(page);paintConnections();
 el('knowledgeAudit').innerHTML='<p>'+audit.pending.length+' Quellen warten auf Ergänzung oder Aktualisierung. '+audit.outdated.length+' ältere Themenbeiträge sind bis zur Aktualisierung ausgeschlossen. '+audit.conflicts.length+' mögliche Widersprüche brauchen Klärung.</p>'+
 audit.pending.slice(0,10).map(s=>'<p class="small">'+escape(s.title||'Schulquelle')+' · '+escape(subject(s.subject)?.name||s.subject)+'</p>').join('');
 el('knowledgeSync').disabled=busy||!audit.pending.length;
 knowledgeButton.textContent='📖 Mein Wissen entdecken'+(all.length?' · '+all.length+' '+(all.length===1?'Thema':'Themen'):'');
}
function changeTopic(id){activeTopic=id;questionSerial++;el('knowledgeAnswer').textContent='';paint();if(id)el('knowledgeDetail').scrollIntoView({block:'nearest',behavior:'smooth'});}
el('knowledgeSearch').addEventListener('input',()=>{activeTopic='';paint();});
el('knowledgeSubject').addEventListener('change',()=>{activeTopic='';paint();});
function sourcesChanged(){
 const signature=store.materials.map(m=>m.id+':'+core.revision(m)).join('|');
 if(signature!==lastSourceSignature){
  lastSourceSignature=signature;questionSerial++;el('knowledgeAnswer').textContent='';
  const next=core.restore(state,store.materials);if(JSON.stringify(next)!==JSON.stringify(state))save(next);
 }
 if(!panel.hidden)paint();
}
globalThis.oskarKnowledgeSourcesChanged=sourcesChanged;
const previousPersist=persist;
persist=function(){const saved=previousPersist();sourcesChanged();return saved;};
const previousRender=render;
render=function(){previousRender();if(!panel.hidden)paint();else el('knowledgeCount').textContent=String(core.pages(state,store.materials).length);const blocked=blockedSources();if(store.materials.some(m=>m.subject===selected&&blocked.has(m.id))){el('studyNotice').textContent='In diesem Fach gibt es einen möglichen Quellenwiderspruch. Betroffene Übungen sind pausiert. Öffne „Mein Wissen“, um die Belege und den Schultext zu prüfen.';const line=el('subjectMaterialStatus');if(line){line.hidden=false;line.innerHTML='<span class="subject-source-label">'+escape(subject(selected).name)+': Möglicher Widerspruch in den Schulquellen. Betroffene Übungen sind pausiert.</span><button type="button" class="btn btn-outline btn-mini" data-wiki-conflicts>Belege prüfen</button>';}}};
globalThis.oskarKnowledgeContext=source=>core.topicContext(state,store.materials,source);
globalThis.oskarRememberKnowledge=async(source,result)=>{
 if(!store.materials.includes(source))return;
 save(core.applyAnalysis(state,source,result,store.materials));await globalThis.oskarLocal.flush();paint();
};
globalThis.oskarKnowledgeChanged=()=>{if(!panel.hidden)paint();};
globalThis.oskarExportKnowledge=()=>structuredClone(state);
globalThis.oskarPrepareKnowledgeImport=(raw,sources)=>core.restore(raw,sources);
globalThis.oskarImportKnowledge=prepared=>{questionSerial++;activeTopic='';save(core.restore(prepared,store.materials));paint();};
globalThis.oskarKnowledgeLoaded=()=>{seedExisting();lastSourceSignature='';sourcesChanged();paint();};
function requireConnection(){
 if(!globalThis.oskarLocal?.isReady()){el('knowledgeActionStatus').textContent='Bitte zuerst unter „Material hinzufügen“ dein lokales Repository verbinden.';return null;}
 const config=workerConnection();
 if(config.ready)return config;
 el('knowledgeActionStatus').textContent='Der private Zugriffscode fehlt. Unter „Material hinzufügen → Weitere Einstellungen“ einmal den eingerichteten KI-Dienst verbinden.';
 toast('Bitte den vorhandenen privaten Zugriffscode eingeben.');return null;
}
async function request(path,payload){
 const config=requireConnection();if(!config)throw new Error('KI-Verbindung fehlt. Die gespeicherten Quellen bleiben erhalten.');
 const response=await fetch(config.endpoint+path,{method:'POST',headers:{authorization:'Bearer '+config.token,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(60000)});
 let data;try{data=await response.json();}catch{throw new Error('Der KI-Dienst hat keine lesbare Antwort geliefert.');}
 if(!response.ok)throw new Error(data.error||'Der KI-Dienst meldet Fehler '+response.status+'.');
 return data;
}
async function refreshSource(id){
 if(busy||autoAnalysisBusy||autoUploadBusy){toast('Eine Auswertung läuft bereits. Bitte kurz warten.');return;}
 const source=materialById(id);if(!source||!requireConnection())return;
 busy=true;paint();el('knowledgeActionStatus').textContent='ChatGPT aktualisiert die Quelle und ihre Themen …';
 try{await analyzeUploadedMaterial(source);el('knowledgeActionStatus').textContent=source.analysisState==='ready'?'Themen und Aufgaben aktualisiert.':'Die Quelle bleibt gespeichert. '+(source.analysisError||'Die KI-Verbindung konnte noch nicht verwendet werden.');}
 finally{busy=false;paint();}
}
// The existing per-source AI button uses the same pipeline, including the saved wiki.
createAiCardsForMaterial=async function(id){await refreshSource(id);};
el('knowledgeSync').addEventListener('click',async()=>{
 if(busy||autoAnalysisBusy||autoUploadBusy||!requireConnection())return;
 busy=true;paint();
 try{for(const source of core.pending(state,store.materials)){
  el('knowledgeActionStatus').textContent='ChatGPT ergänzt „'+source.title+'“ …';
  await analyzeUploadedMaterial(source);if(source.analysisState!=='ready')break;
 }}finally{busy=false;paint();el('knowledgeActionStatus').textContent=core.pending(state,store.materials).length?'Einige Quellen konnten noch nicht ergänzt werden. Prüfe die KI-Verbindung und die Lesbarkeit.':'Die gespeicherten Themen sind auf dem aktuellen Quellenstand.';}
});
function quizItems(tasks){return tasks.map(t=>({q:t.question,a:t.options,correct:t.correctIndex,why:t.explanation+' Quelle: '+t.sourceTitle+' · „'+t.evidence+'“',origin:t.subject,index:'ai:'+t.id,custom:true,type:t.type,sourceTitle:t.sourceTitle}));}
async function practice(id,mode){
 const page=core.pages(state,store.materials).find(p=>p.id===id);
 if(!page||page.status!=='ready'||busy)return;
 let tasks=aiTasks.filter(t=>t.knowledgeTopicId===id&&t.status==='approved'&&core.validTask(t,store.materials));
 if(!tasks.length){
  const sources=core.topicSources(page,store.materials),snapshots=new Map(sources.map(s=>[s.id,core.revision(materialById(s.id))]));
  if(!requireConnection())return;
  busy=true;paint();el('knowledgeActionStatus').textContent='ChatGPT erstellt passende Übungen zu „'+page.title+'“ …';
  try{
   const data=await request('/topic-practice',{topic:page.title,sources});
   if(sources.some(s=>!materialById(s.id)||core.revision(materialById(s.id))!==snapshots.get(s.id)))throw new Error('Die Schulquelle hat sich während der Erstellung verändert. Bitte erneut versuchen.');
   tasks=(Array.isArray(data.tasks)?data.tasks:[]).flatMap(t=>{
    const source=materialById(t?.sourceId);return source&&snapshots.has(source.id)?vettedTasks([t],source).map(clean=>({...clean,sourceRevision:snapshots.get(source.id),knowledgeTopicId:id})):[];
   }).slice(0,6);
   if(!tasks.length)throw new Error('Die KI konnte keine ausreichend belegten Themenübungen erstellen.');
   const before=aiTasks;aiTasks=aiTasks.filter(t=>t.knowledgeTopicId!==id).concat(tasks);
   if(!saveTasks()){aiTasks=before;throw new Error('Die neuen Übungen konnten nicht gespeichert werden.');}
   el('knowledgeActionStatus').textContent=tasks.length+' KI-Übungen mit Quellen gespeichert.';
  }catch(error){el('knowledgeActionStatus').textContent=error.message;return;}
  finally{busy=false;paint();}
 }
 const items=quizItems(tasks);
 if(mode==='print'){
  el('printArea').innerHTML='<h1>Übungsblatt · '+escape(page.title)+'</h1><p>'+escape(subject(page.subject).name)+' · KI-Aufgaben aus deinem Schulmaterial</p>'+items.map((q,i)=>'<section class="print-question"><h2>'+(i+1)+'. '+escape(q.q)+'</h2>'+q.a.map(a=>'<p>☐ '+escape(a)+'</p>').join('')+'</section>').join('')+'<section class="answer-key"><h1>Lösungen und Quellen</h1>'+items.map((q,i)=>'<p><strong>'+(i+1)+'. '+escape(q.a[q.correct])+'</strong><br>'+escape(q.why)+'</p>').join('')+'</section>';
  window.print();return;
 }
 selected=page.subject;closeParent();
 session={id:page.subject,level:0,items,index:0,chosen:null,checked:false,correctCount:0,review:true,custom:true};
 el('lessonOverlay').classList.add('show');document.body.style.overflow='hidden';renderQuestion();
}
panel.addEventListener('click',async event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.knowledgeTopic){changeTopic(button.dataset.knowledgeTopic);return;}
 if(button.hasAttribute('data-wiki-back')){changeTopic('');return;}
 if(button.hasAttribute('data-wiki-add')){setParentTab('materials');return;}
 if(button.dataset.wikiPractice){await practice(button.dataset.wikiPractice,'learn');return;}
 if(button.dataset.wikiPrint){await practice(button.dataset.wikiPrint,'print');return;}
 if(button.dataset.sourceRefresh){await refreshSource(button.dataset.sourceRefresh);return;}
 if(button.dataset.sourceOriginal){try{if(!await files.download(button.dataset.sourceOriginal))toast('Diese Originaldatei ist in diesem Browser nicht vorhanden.');}catch(error){toast(error.message);}return;}
 if(button.dataset.sourceSave){
  const source=materialById(button.dataset.sourceSave);
  if(!source||busy||autoUploadBusy||autoAnalysisBusy){toast('Bitte die laufende Analyse abwarten.');return;}
  const text=panel.querySelector('[data-source-text="'+source.id+'"]').value.trim(),title=panel.querySelector('[data-source-title="'+source.id+'"]').value.trim();
  if(text.length<30){toast('Für eine Schulquelle werden mindestens 30 lesbare Zeichen benötigt.');return;}
  const changed=source.text!==text;
  source.text=text;source.title=title||source.title;
  if(changed){source.analysisState='waiting';source.analysisError='';source.modified=new Date().toISOString();}
  persist();render();if(changed)await refreshSource(source.id);else toast('Titel gespeichert.');
 }
});
el('knowledgeQuestionForm').addEventListener('submit',async event=>{
 event.preventDefault();const question=el('knowledgeQuestion').value.trim();
 if(question.length<5||busy)return;
 const sources=core.questionSources(state,store.materials,question,activeTopic);
 if(!sources.length){el('knowledgeAnswer').textContent='Dazu finde ich noch keine passende, aktuelle Themenseite. Ergänze eine Schulquelle oder wähle ein vorhandenes Thema.';return;}
 const version=++questionSerial,snapshots=new Map(sources.map(s=>[s.id,core.revision(materialById(s.id))]));
 el('knowledgeAsk').disabled=true;el('knowledgeAnswer').textContent='ChatGPT liest die passenden Schulquellen …';
 try{
  const data=await request('/knowledge-ask',{question,sources});
  if(version!==questionSerial)return;
  if(sources.some(s=>!materialById(s.id)||core.revision(materialById(s.id))!==snapshots.get(s.id)))throw new Error('Die Quellen haben sich geändert. Bitte die Frage erneut stellen.');
  if(typeof data.answer!=='string'||data.answer.length>1800||typeof data.insufficient!=='boolean'||!Array.isArray(data.evidence)||(!data.insufficient&&!data.evidence.length))throw new Error('Die Antwort konnte nicht überprüft werden.');
  const byId=new Map(sources.map(s=>[s.id,s]));
  if(data.evidence.some(e=>!byId.has(e?.sourceId)||typeof e.quote!=='string'||e.quote.length<10||e.quote.length>350||!core.normalize(byId.get(e.sourceId).text).includes(core.normalize(e.quote))))throw new Error('Die Antwort enthält keinen passenden Quellenbeleg.');
  el('knowledgeAnswer').innerHTML='<div class="wiki-answer"><span class="wiki-eyebrow">'+(data.insufficient?'Grundlage reicht nicht aus':'ChatGPT · Aus deinen Schulquellen')+'</span><p>'+escape(data.answer)+'</p>'+data.evidence.map(e=>evidenceHTML(e.sourceId,e.quote)).join('')+'<small>Berücksichtigt: '+sources.length+' ausgewählte Schulquelle'+(sources.length===1?'':'n')+'. KI-Antwort, keine Benotung.</small></div>';
 }catch(error){if(version===questionSerial)el('knowledgeAnswer').textContent=error.message;}
 finally{el('knowledgeAsk').disabled=false;}
});
globalThis.oskarBackupOriginals=(ids=store.materials.map(s=>s.id))=>store.materials.some(s=>s.originalPath)?files.backup(ids):Promise.resolve([]);
globalThis.oskarPrepareOriginalImport=(raw,sources)=>files.validateBundle(raw||[],sources);
globalThis.oskarRestoreOriginals=async(rows,sources)=>{
 const restored=await files.restore(rows);
 for(const row of restored){const source=sources.find(s=>s.id===row.sourceId);if(source){source.originalPath=row.path;source.original={name:row.name,size:row.size,sha256:row.sha256};}}
};
const style=document.createElement('style');
style.textContent=`
.wiki-open{margin-top:10px;width:100%;font-size:14px}.knowledge-nav{display:flex;gap:6px;padding:5px;background:#f1f3fa;border-radius:14px;margin-bottom:22px}.knowledge-nav button{flex:1;border:0;padding:11px 8px;border-radius:10px;background:transparent;color:#66738e;font:inherit;font-size:13px;font-weight:800;cursor:pointer}.knowledge-nav button[aria-pressed="true"]{background:white;color:#4d4cc7;box-shadow:0 2px 5px #2424540b}.knowledge-nav span{background:#e9e9fc;padding:2px 6px;border-radius:20px;margin-left:3px}.wiki-heading{display:flex;align-items:center;gap:16px;margin-bottom:18px}.wiki-eyebrow{font-size:10px;font-weight:900;letter-spacing:1.1px;color:#7373b0}.wiki-heading h2,.wiki-topic-heading h2{font-size:25px;line-height:1.2;margin:7px 0 10px;letter-spacing:-.7px;color:#263651}.wiki-heading p{font-size:13px;color:#718099;line-height:1.6;margin:0}.wiki-symbol{font-size:54px;margin-left:auto}.wiki-summary{display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center;border-top:1px solid #e8edf5;border-bottom:1px solid #e8edf5;padding:14px 0;margin-bottom:22px;font-size:12px;color:#718099}.wiki-summary strong{font-size:20px;color:#354667;margin-right:5px}.wiki-local{font-size:10px;width:100%;color:#8590a5}.wiki-controls{display:grid;grid-template-columns:1fr 150px;gap:12px;margin-bottom:18px}.wiki-controls label,.wiki-question label,.wiki-source-edit label{display:block;font-size:12px;font-weight:800;color:#66738b}.wiki-controls input,.wiki-controls select,.wiki-question input,.wiki-source-edit input,.wiki-source-edit textarea{display:block;width:100%;margin-top:6px;border:1px solid #dce3f0;border-radius:10px;padding:11px 12px;font:inherit;font-size:14px;background:white;color:#293b59;min-height:42px}.wiki-topics{display:grid;grid-template-columns:1fr 1fr;gap:10px}.wiki-topic{display:flex;gap:11px;align-items:start;text-align:left;padding:16px 12px;border:1px solid #e5e9f4;border-radius:14px;background:white;cursor:pointer;color:#344866;font:inherit;min-width:0}.wiki-topic:hover{border-color:#9f9ee6;background:#fafaff}.wiki-topic-icon{font-size:24px}.wiki-topic>span:nth-child(2){display:grid;gap:5px;min-width:0}.wiki-topic small{font-size:10px;color:#8290a7}.wiki-topic strong{font-size:14px;line-height:1.35;overflow-wrap:anywhere}.wiki-topic span span{font-size:10px;color:#8190a9}.wiki-topic>b{margin-left:auto;font-size:15px;color:#9da6c5}.wiki-empty{grid-column:1/-1;text-align:center;padding:22px 16px;background:#f7f8fc;border-radius:16px}.wiki-empty>span{font-size:40px}.wiki-empty h3{font-size:17px;color:#344563}.wiki-empty p{font-size:13px;line-height:1.6;color:#7b87a0}.wiki-back{background:none;border:0;font:inherit;font-size:12px;color:#6865cc;cursor:pointer;padding:0;margin:0 0 16px}.wiki-topic-heading{display:flex;align-items:start;gap:8px}.wiki-topic-heading h2{font-size:26px}.wiki-label{font-size:10px;white-space:nowrap;padding:5px 8px;background:#e8f6ee;color:#38875e;border-radius:20px;margin-left:auto}.wiki-label.conflict,.wiki-label.outdated{background:#fff2dc;color:#91652d}.wiki-explanation{padding:0 0 14px;margin-bottom:14px;border-bottom:1px solid #edf0f7}.wiki-explanation>p{font-size:16px;line-height:1.7;color:#334561;white-space:pre-wrap}.wiki-evidence{font-size:11px;color:#8290a4;margin-top:10px}.wiki-evidence summary{cursor:pointer;overflow-wrap:anywhere}.wiki-evidence blockquote{margin:10px 0;border-left:3px solid #ccc9ed;padding:9px 12px;background:#f7f6ff;color:#5e6389;line-height:1.7;overflow-wrap:anywhere}.wiki-warning{background:#fff5e9;padding:14px 16px;color:#875b30;border-radius:12px;margin:12px 0;font-size:13px;line-height:1.6}.wiki-warning h3{font-size:14px;margin:0 0 8px}.wiki-actions{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0}.wiki-actions .btn{font-size:12px;padding:11px 15px}.wiki-related,.wiki-sources,.wiki-question,.wiki-audit,#knowledgeConnections{margin-top:24px}.wiki-related h3,.wiki-question h3,#knowledgeConnections h3{font-size:15px;margin-bottom:10px}.wiki-related button{background:#f2f1fb;color:#6560b7;border:0;border-radius:8px;padding:8px 11px;font:inherit;font-size:11px;cursor:pointer;margin:0 5px 6px 0}.wiki-sources>summary,.wiki-audit>summary{font-size:12px;font-weight:800;color:#70819c;cursor:pointer}.wiki-source-edit{padding:12px 0;border-bottom:1px solid #edf0f6;font-size:12px;color:#6f7f98}.wiki-source-edit>summary{cursor:pointer;font-weight:700}.wiki-source-edit label{margin-top:12px}.wiki-source-edit textarea{resize:vertical;line-height:1.5}.wiki-question{border-top:1px solid #e8edf5;padding-top:18px}.wiki-ask-row{display:flex;gap:8px;align-items:center}.wiki-ask-row input{min-width:0;flex:1}.wiki-ask-row button{font-size:12px;padding:12px 16px;margin-top:6px}.wiki-answer{margin-top:15px;background:#f5f6fc;border-radius:13px;padding:16px}.wiki-answer>p{font-size:14px;line-height:1.7;white-space:pre-wrap}.wiki-answer>small{display:block;color:#8a95aa;font-size:10px;margin-top:14px}.wiki-audit{border-top:1px solid #edf0f7;padding-top:16px;font-size:12px;color:#77869c}.wiki-audit p{line-height:1.6}.wiki-link{background:#f6f7fb;border-radius:12px;padding:14px;margin-top:10px}.wiki-link h4{margin:8px 0;font-size:14px;color:#435372}.wiki-link p{font-size:12px;line-height:1.7;color:#6a7893}#knowledgeActionStatus{line-height:1.6;overflow-wrap:anywhere}#parentKnowledge [hidden]{display:none!important}.source-actions [data-make]{display:none}
@media(max-width:540px){.wiki-controls{grid-template-columns:1fr 110px;gap:8px}.wiki-topics{grid-template-columns:1fr}.wiki-symbol{font-size:40px}.wiki-heading h2{font-size:23px}.wiki-topic-heading{display:block}.wiki-label{display:inline-block;margin:0 0 8px}.wiki-ask-row{flex-wrap:wrap}.wiki-ask-row input{flex-basis:100%}.wiki-ask-row button{width:100%;margin-top:0}.wiki-summary{gap:8px 13px}.knowledge-nav button{font-size:11px}}
`;
document.head.append(style);
lastSourceSignature=store.materials.map(m=>m.id+':'+core.revision(m)).join('|');
function syncHash(){if(location.hash==='#wissen')openKnowledge();}
window.addEventListener('hashchange',syncHash);syncHash();if(globalThis.oskarLocal?.isReady()){globalThis.oskarImportKnowledge(globalThis.oskarLocal.knowledgeData);globalThis.oskarKnowledgeLoaded();}paint();render();
})();
