/* Lernstelle 0.4: Materialbibliothek direkt am Fach, KI-Aufgaben mit Freigabe. */
'use strict';
const TASK_KEY='oskar-lernstelle-tasks-v1';
let aiTasks=[];
try {const saved=JSON.parse(localStorage.getItem(TASK_KEY)||'[]');if(Array.isArray(saved))aiTasks=saved.filter(t=>t&&typeof t.question==='string');}catch{}
function saveTasks(){try{localStorage.setItem(TASK_KEY,JSON.stringify(aiTasks));return true}catch{toast('Speicher voll. Bitte Backup erstellen.');return false}}
function sourceTasks(id){return aiTasks.filter(t=>t.subject===id&&t.status==='approved').map(t=>({q:t.question,a:t.options,correct:t.correctIndex,why:t.explanation+' Quelle: '+t.sourceTitle+' · „'+t.evidence+'“',origin:id,index:'ai:'+t.id,custom:true,type:t.type,sourceTitle:t.sourceTitle}));}
function realQuestions(id){return [...sourceTasks(id),...generatedQuestions(id)];}
function hasSources(id){return store.materials.some(m=>m.subject===id);}
function levelStudyKey(id,level){const keys=realQuestions(id).map(q=>q.index).sort().join('|');let h=5381;for(let i=0;i<keys.length;i++)h=((h<<5)+h)^keys.charCodeAt(i);return 'study:'+id+':'+level+':'+(h>>>0).toString(36);}
function isLevelDone(id,l){return store.completed.includes(hasSources(id)?levelStudyKey(id,l):id+':'+l);}
function lessonItems(id,level){const all=realQuestions(id);if(!all.length)return [];
  // Jedes Level hat eine eigene Rotation. Zusätzliche Fragen werden verteilt.
  const count=Math.min(level===2?5:3,all.length),start=(level*3)%all.length;
  return Array.from({length:count},(_,i)=>all[(start+i)%all.length]);
}
const originalRender=render;
render=function(){originalRender();
 const n=realQuestions(selected).length,has=hasSources(selected),done=[0,1,2].filter(i=>isLevelDone(selected,i)).length;
 $('pathPill').textContent=done+' / 3 Levels';$('subjectCounter').textContent=done+' von 3 geschafft';
 const pathButtons=$('path').querySelectorAll('[data-level]');const labels=$('path').querySelectorAll('.level-sub');
 pathButtons.forEach((btn,i)=>{const complete=isLevelDone(selected,i),unlocked=i===0||isLevelDone(selected,i-1);btn.disabled=has?(!n||!unlocked):!unlocked;btn.classList.toggle('complete',complete);btn.classList.toggle('unlocked',!complete&&unlocked);btn.textContent=complete?'⭐':unlocked?['🌱','🧠','🏆'][i]:'🔒';if(labels[i])labels[i].textContent=complete?'Geschafft · Wiederholen?':has&&!n?'Erst Aufgaben freigeben':unlocked?(has?n+' Fragen aus deinem Schulstoff':'Demoaufgaben'):'Erst Level '+i+' schaffen';});
 $('heroMeta').textContent='Nächste Klassenarbeit · '+dayLabel(nextExam().date);
 const notes=store.materials.filter(m=>m.subject===selected).length;
 const ready=aiTasks.filter(t=>t.subject===selected&&t.status==='approved').length+approvedCards(selected).length;
 $('materialProgress').textContent=`${notes} ${notes===1?'Quelle':'Quellen'} · ${ready} geprüfte Karten und Aufgaben`;
 $('customPracticeBtn').disabled=!n;$('customPracticeBtn').textContent=n?'Schulstoff üben · '+n+' Aufgaben':'Noch keine freigegebenen Aufgaben';
 $('materialsList').querySelectorAll('.source-item').forEach((el,i)=>{el.hidden=store.materials[i]?.subject!==selected;});
 $('materialCount').textContent='('+notes+')';
 $('cardsList').querySelectorAll('[data-card-index]').forEach(el=>{el.hidden=cards[Number(el.dataset.cardIndex)]?.subject!==selected;});
 const selectedCards=cards.filter(x=>x.subject===selected);$('cardCount').textContent=selectedCards.filter(x=>x.status!=='approved').length+' zu prüfen · '+selectedCards.filter(x=>x.status==='approved').length+' freigegeben';
 $('studyNotice').textContent=has?(n?'Deine Levels verwenden jetzt die freigegebenen Fragen aus dieser Materialbibliothek.':'Material vorhanden. Erzeuge Aufgaben und gib sie frei, um die Levels zu starten.'):'Noch kein Material für dieses Fach. Du kannst Demofragen üben oder Schulstoff hinzufügen.';
 const c=EXAMS.filter(e=>e.date&&[0,1,2].some(i=>isLevelDone(e.id,i))).reduce((s,e)=>s+[0,1,2].filter(i=>isLevelDone(e.id,i)).length,0);$('progressPercent').textContent=Math.round(c/21*100)+' %';$('progressBar').style.width=Math.round(c/21*100)+'%';$('wins').textContent=c;
 $('materialSubject').value=selected;
 renderAiTasks();
};
const originalRenderQuestion=renderQuestion;
renderQuestion=function(){originalRenderQuestion();if(!session)return;const ex=subject(session.items[session.index].origin);$('questionKicker').textContent=ex.name+' · '+(session.review?'Wiederholung':'Level '+(session.level+1));};
startLesson=function(id,level,errorsOnly=false){let items;
 if(errorsOnly){items=store.errors.map(findErrorQuestion).filter(Boolean).slice(0,8);if(!items.length){toast('Noch keine Fehler zum Wiederholen.');return;}}
 else if(hasSources(id)){items=lessonItems(id,level);if(!items.length){toast('Erst Material hinzufügen und Aufgaben freigeben.');chooseSubject(id);openMaterials();return;}}
 else items=levelQuestions(id,level).map(q=>({...q,origin:id,index:BANK[id].indexOf(q)}));
 session={id,level,items,index:0,chosen:null,checked:false,correctCount:0,review:errorsOnly,custom:hasSources(id)};
 $('lessonOverlay').classList.add('show');document.body.style.overflow='hidden';renderQuestion();
};
const originalFindErrorQuestion=findErrorQuestion;
findErrorQuestion=function(entry){if(typeof entry.index==='string'&&entry.index.startsWith('ai:'))return sourceTasks(entry.subject).find(q=>q.index===entry.index)||null;return originalFindErrorQuestion(entry);};
const originalFinishLesson=finishLesson;
finishLesson=function(){if(session?.custom&&!session.review){const {id,level,correctCount,items}=session;const passed=correctCount>=Math.ceil(items.length*.66);if(passed&&!store.completed.includes(levelStudyKey(id,level)))store.completed.push(levelStudyKey(id,level));
 const originalKey=id+':'+level; // Alte Demo-Erfolge werden nicht als Erfolge für neues Material gezählt.
 store.completed=store.completed.filter(k=>k!==originalKey);
 // Die alte Abschlussfunktion vergibt weiterhin XP und zeigt das Ergebnis an.
 originalFinishLesson();store.completed=store.completed.filter(k=>k!==originalKey);persist();render();return;}
 originalFinishLesson();};
const originalPrint=printWorksheet;
printWorksheet=function(){if(!hasSources(selected))return originalPrint();const qs=realQuestions(selected),ex=subject(selected);if(!qs.length){toast('Es gibt noch keine freigegebenen Aufgaben.');return;}
 $('printArea').innerHTML='<h1>Übungsblatt · '+noHtml(ex.name)+'</h1><div class="print-meta">Name: __________________ &nbsp;&nbsp; Datum: __________</div>'+qs.map((q,i)=>`<section class="print-question"><h2>${i+1}. ${noHtml(q.q)}</h2><div class="print-choices">${q.a.map((a,j)=>`<div>☐ ${String.fromCharCode(65+j)}) ${noHtml(a)}</div>`).join('')}</div></section>`).join('')+'<section class="answer-key"><h1>Lösungen und Quellen</h1>'+qs.map((q,i)=>`<p><strong>${i+1}. ${noHtml(q.a[q.correct])}</strong><br>${noHtml(q.why)}</p>`).join('')+'</section>';window.print();};
function renderAiTasks(){const c=$('aiTaskList');if(!c)return;const current=aiTasks.filter(t=>t.subject===selected);
 c.innerHTML=current.length?current.slice().reverse().map(t=>{const index=aiTasks.indexOf(t),draft=t.status!=='approved';return `<article class="knowledge-card" data-task="${index}"><div class="card-top"><b>${noHtml(t.type==='true_false'?'Richtig oder falsch':t.type==='gap'?'Lücke ergänzen':'Auswahlfrage')}</b><span class="tiny-tag ${draft?'pending':'ready'}">${draft?'Entwurf':'Freigegeben'}</span></div><label>Frage<input data-tq maxlength="240" value="${noHtml(t.question)}" ${draft?'':'readonly'}></label><div class="task-options">${t.options.map((v,j)=>`<label>Antwort ${j+1}<input data-opt="${j}" maxlength="140" value="${noHtml(v)}" ${draft?'':'readonly'}></label>`).join('')}</div><label>Richtige Antwort<select data-correct ${draft?'':'disabled'}>${t.options.map((v,j)=>`<option value="${j}" ${j===t.correctIndex?'selected':''}>${j+1}. ${noHtml(v.slice(0,65))}</option>`).join('')}</select></label><label>Erklärung<textarea data-explanation maxlength="420" ${draft?'':'readonly'}>${noHtml(t.explanation)}</textarea></label><div class="card-origin">Quelle: ${noHtml(t.sourceTitle)} · Beleg: „${noHtml(t.evidence)}“</div><div class="card-actions"><button class="btn btn-green btn-mini" data-task-approve="${index}">${draft?'Prüfen und freigeben':'Wieder bearbeiten'}</button><button class="btn btn-outline btn-mini" data-task-delete="${index}">Löschen</button></div></article>`;}).join(''):'<p class="empty">Noch keine KI-Aufgaben für dieses Fach.</p>';
 $('taskCount').textContent=current.filter(t=>t.status!=='approved').length+' zu prüfen · '+current.filter(t=>t.status==='approved').length+' freigegeben';}
$('aiTaskList').addEventListener('click',e=>{const b=e.target.closest('[data-task-approve],[data-task-delete]');if(!b)return;const index=Number(b.dataset.taskApprove??b.dataset.taskDelete),t=aiTasks[index];if(!t)return;
 if(b.dataset.taskDelete!==undefined)aiTasks.splice(index,1);else if(t.status==='approved')t.status='draft';else{const container=b.closest('[data-task]');const question=container.querySelector('[data-tq]').value.trim(),options=[...container.querySelectorAll('[data-opt]')].map(x=>x.value.trim()),explanation=container.querySelector('[data-explanation]').value.trim(),correctIndex=Number(container.querySelector('[data-correct]').value);if(question.length<8||options.some(x=>x.length<1)||new Set(options.map(x=>x.toLowerCase())).size!==options.length||!options[correctIndex]||explanation.length<10){toast('Bitte Frage, eindeutige Antworten und Erklärung prüfen.');return;}Object.assign(t,{question,options,correctIndex,explanation,status:'approved'});}
 saveTasks();render();});
function openMaterials(tab='materials'){openParent();setParentTab(tab);$('materialSubject').value=selected;}
// Die Materialbibliothek bleibt im Dialog. Keine zweite, dauerhaft sichtbare Verwaltungsfläche.
const library=$('parentOverlay').querySelector('.dialog');
library.id='materials';library.classList.add('material-library');
const content=library.querySelector('.dialog-content');
const summary=document.createElement('div');summary.className='material-summary';
summary.innerHTML='<span class="caption" id="materialProgress"></span><p class="small" id="studyNotice"></p>';
content.insertBefore(summary,content.firstChild);
$('parentTitle').textContent='Materialbibliothek';
$('closeParent').setAttribute('aria-label','Materialbibliothek schließen');
$('parentBtn').textContent='Materialbibliothek';
$('mobParent').innerHTML='<span>📚</span>Material';
$('parentBtn').addEventListener('click',e=>{e.stopImmediatePropagation();openMaterials();},true);
$('mobParent').addEventListener('click',e=>{e.stopImmediatePropagation();openMaterials();},true);
$('parentOverlay').addEventListener('keydown',e=>{
 if(e.key!=='Tab')return;
 const controls=Array.from(library.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0);
 if(!controls.length)return;
 const first=controls[0],last=controls[controls.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
$('materialSubject').addEventListener('change',e=>chooseSubject(e.target.value));
$('aiEndpoint').value=localStorage.getItem('oskar-ai-endpoint')||'';
$('aiEndpoint').addEventListener('change',()=>{const val=$('aiEndpoint').value.trim();if(val.startsWith('https://'))localStorage.setItem('oskar-ai-endpoint',val);else localStorage.removeItem('oskar-ai-endpoint');});
$('testAi').addEventListener('click',async()=>{let url=$('aiEndpoint').value.trim().replace(/\/+$/,'');if(!/^https:\/\/[^\s/]+/.test(url)){toast('Bitte zuerst die HTTPS-Adresse des Workers eingeben.');return;}const status=$('aiStatus');status.textContent='Prüfe KI-Dienst …';try{const result=await fetch(url+'/health');const payload=await result.json();status.textContent=result.ok&&payload.ok&&payload.configured?'KI-Dienst erreichbar und konfiguriert.':'Der Worker ist erreichbar, aber noch nicht vollständig eingerichtet.';}catch{status.textContent='KI-Dienst nicht erreichbar. Bitte Adresse und Bereitstellung prüfen.';}});
// Bestehende Funktion ergänzen: Die KI liefert geprüfte Entwürfe für Karten und abwechslungsreiche Quizaufgaben.
createAiCardsForMaterial=async function(id){const m=materialById(id);if(!m)return;const endpoint=$('aiEndpoint').value.trim().replace(/\/+$/,''),token=$('aiToken').value.trim();if(!/^https:\/\/[^\s/]+/.test(endpoint)||!token){toast('Bitte HTTPS-Adresse und persönlichen Zugriffscode eingeben.');openMaterials();return;}
 const status=$('aiStatus');status.textContent='KI erstellt Fragen aus „'+m.title+'“ …';
 try{const response=await fetch(endpoint+'/generate',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({subject:subject(m.subject).name,text:m.text.slice(0,18000)})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Dienst meldet '+response.status);
 const norm=s=>String(s).toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();const supported=(result.cards||[]).filter(c=>typeof c.term==='string'&&typeof c.definition==='string'&&typeof c.evidence==='string'&&norm(m.text).includes(norm(c.evidence))).slice(0,10);
 const newCards=supported.map(c=>({id:uniqueId(),sourceId:m.id,sourceTitle:m.title,subject:m.subject,term:c.term.slice(0,90),definition:c.definition.slice(0,320),evidence:c.evidence.slice(0,350),status:'draft',created:new Date().toISOString()}));
 const supportedTasks=(result.tasks||[]).filter(t=>['choice','true_false','gap'].includes(t.type)&&typeof t.question==='string'&&Array.isArray(t.options)&&t.options.length>=2&&t.options.length<=4&&t.options.every(v=>typeof v==='string'&&v.length>0)&&Number.isInteger(t.correctIndex)&&t.correctIndex>=0&&t.correctIndex<t.options.length&&typeof t.explanation==='string'&&typeof t.evidence==='string'&&norm(m.text).includes(norm(t.evidence))).slice(0,12);
 const tasks=supportedTasks.map(t=>({id:uniqueId(),sourceId:m.id,sourceTitle:m.title,subject:m.subject,type:t.type,question:t.question.slice(0,240),options:t.options.map(x=>x.slice(0,140)),correctIndex:t.correctIndex,explanation:t.explanation.slice(0,420),evidence:t.evidence.slice(0,350),status:'draft',created:new Date().toISOString()}));
 aiTasks.push(...tasks);cards.push(...newCards);saveTasks();persistCards();render();setParentTab('review');status.textContent='';toast(tasks.length+' Aufgaben und '+newCards.length+' Karten zum Prüfen erstellt.');
 }catch(err){status.textContent='KI nicht verfügbar: '+(err.message||'Unbekannter Fehler');toast('Erstellen fehlgeschlagen.');}};
// Die bereits eingerichtete Eventdelegation in materialsList ruft die neu belegte Funktion auf.
const oldExport=exportData;
$('exportBackup').addEventListener('click',e=>{e.stopImmediatePropagation();const data=JSON.stringify({version:2,exported:new Date().toISOString(),progress:store,cards,tasks:aiTasks,journeys:typeof journeyState==='object'?journeyState:{},connections:typeof connectionsCache!=='undefined'?connectionsCache:null},null,2),url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='oskar-lernstelle-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);},true);
$('importBackup').addEventListener('change',async e=>{e.stopImmediatePropagation();const f=e.target.files?.[0];if(!f)return;try{if(f.size>3*1024*1024)throw Error('Backup ist zu groß');const obj=JSON.parse(await f.text());if(![1,2].includes(obj.version)||!obj.progress||!Array.isArray(obj.cards)||!Array.isArray(obj.progress.materials))throw Error('Ungültiges Backup');if(!confirm('Vorhandene lokale Daten durch dieses Backup ersetzen?'))return;store={xp:Number(obj.progress.xp)||0,completed:Array.isArray(obj.progress.completed)?obj.progress.completed:[],errors:Array.isArray(obj.progress.errors)?obj.progress.errors:[],days:Array.isArray(obj.progress.days)?obj.progress.days:[],materials:obj.progress.materials.filter(x=>subject(x.subject)&&typeof x.text==='string').slice(0,100)};cards=obj.cards.filter(x=>subject(x.subject)&&typeof x.term==='string'&&['draft','approved'].includes(x.status)).slice(0,500);aiTasks=(obj.tasks||[]).filter(x=>subject(x.subject)&&typeof x.question==='string'&&['draft','approved'].includes(x.status)).slice(0,500);if(obj.journeys&&typeof obj.journeys==='object'&&!Array.isArray(obj.journeys)&&typeof journeyState==='object'){journeyState=obj.journeys;saveJourneyState();}if(typeof connectionsCache!=='undefined'){
 const savedConnections=obj.connections;
 if(savedConnections&&typeof savedConnections.signature==='string'&&Array.isArray(savedConnections.connections)){
   connectionsCache=savedConnections;
   try{localStorage.setItem(CONNECTIONS_KEY,JSON.stringify(connectionsCache));}catch{}
 }else{connectionsCache=null;localStorage.removeItem(CONNECTIONS_KEY);}
}
persist();persistCards();saveTasks();render();if(typeof autoAnalyzeConnections==='function')autoAnalyzeConnections();toast('Backup wiederhergestellt.');}catch(err){toast('Import fehlgeschlagen: '+err.message);}finally{$('importBackup').value='';}},true);
// Wenn eine Materialquelle entfernt wird, werden ihre KI-Aufgaben mit entfernt.
$('materialsList').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;const id=store.materials[Number(b.dataset.remove)]?.id;if(id){aiTasks=aiTasks.filter(t=>t.sourceId!==id);saveTasks();}},true);
// Button direkt beim Lernpfad führt zur Bibliothek.
// Die Materialbibliothek wird ausschließlich über Navigation und Kontextaktionen geöffnet.
// Zusätzlicher Bereich im vorhandenen Prüftab.
render();