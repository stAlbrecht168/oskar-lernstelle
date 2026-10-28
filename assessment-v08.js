/* Oskars Lernstelle: local assessments, opt-in AI analysis and adaptive practice. */
(function(){
'use strict';
const KEY='oskar-lernstelle-assessments-v1';
let assessments=[];
try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(saved))assessments=saved.filter(x=>x&&typeof x.subject==='string').slice(0,100);}catch{}
const el=id=>document.getElementById(id),escape=noHtml,core=globalThis.OskarAssessmentCore;
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(assessments));return true;}
  catch{toast('Lokaler Speicher voll. Bitte Daten sichern und nicht benötigte Arbeiten löschen.');return false;}
}
globalThis.oskarExportAssessments=()=>assessments;
globalThis.oskarImportAssessments=raw=>{
  assessments=Array.isArray(raw)?raw.filter(x=>x&&subject(x.subject)&&typeof x.id==='string'&&typeof x.title==='string'&&Array.isArray(x.areas)).slice(0,100).map(x=>({
    id:x.id,subject:x.subject,title:x.title.slice(0,100),date:String(x.date||'').slice(0,10),
    grade:core.validGrade(x.grade)?x.grade:'',text:String(x.text||'').slice(0,12000),
    feedback:String(x.feedback||'').slice(0,2500),
    areas:x.areas.filter(a=>a&&typeof a.topic==='string'&&['draft','approved','dismissed'].includes(a.status)).slice(0,10)
  })):[];
  save();paint();
};
const tab=document.createElement('button');tab.dataset.tab='assessments';tab.textContent='Noten & Arbeiten';
document.querySelector('.parent-tabs').insertBefore(tab,document.querySelector('[data-tab="review"]'));
const panel=document.createElement('div');panel.id='parentAssessments';panel.hidden=true;
panel.innerHTML=`
 <div class="hint"><strong>Aus Fehlern lernen.</strong> Noten allein zeigen keine konkreten Wissenslücken. Nutze Korrekturen, Lehrerkommentare oder eigene Beobachtungen, um den Übungsplan anzupassen. Der offizielle Lehrplan bleibt unverändert.</div>
 <div class="manual-card" style="margin-top:16px">
  <h3>Klassenarbeit oder Note erfassen</h3>
  <div class="manual-grid">
   <div class="field"><label for="assSubject">Fach</label><select id="assSubject"></select></div>
   <div class="field"><label for="assGrade">Note (optional)</label><select id="assGrade"><option value="">Keine Note</option><option>1</option><option>1-</option><option>2+</option><option>2</option><option>2-</option><option>3+</option><option>3</option><option>3-</option><option>4+</option><option>4</option><option>4-</option><option>5+</option><option>5</option><option>5-</option><option>6</option></select></div>
  </div>
  <div class="field"><label for="assFile">Korrigierte Arbeit hochladen (Foto, PDF oder Text; optional)</label><input id="assFile" class="file-picker" type="file" accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp,text/plain,application/pdf,image/*"></div>
  <div class="field"><label for="assFeedback">Was war schwierig? (Korrekturen / Lehrerhinweise)</label><textarea id="assFeedback" rows="3" maxlength="2500" placeholder="z. B. Bei Aufgaben zu Brüchen häufig Zähler und Nenner vertauscht."></textarea></div>
  <details><summary>Weitere Angaben (optional)</summary>
    <div class="field"><label for="assTitle">Titel</label><input id="assTitle" maxlength="100" placeholder="z. B. Mathearbeit · Brüche"></div>
    <div class="field"><label for="assDate">Datum der Arbeit</label><input id="assDate" type="date"></div>
    <div class="field"><label for="assTopics">Bekannte Übungsthemen, durch Komma getrennt</label><input id="assTopics" maxlength="300" placeholder="Brüche, Sachaufgaben"></div>
    <div class="field"><label for="assText">Erkannten Text prüfen und korrigieren</label><textarea id="assText" rows="5" maxlength="12000" placeholder="Hier erscheint der Text der hochgeladenen Arbeit. Namen und Schulangaben entfernen."></textarea></div>
  </details>
  <p class="small">Die Arbeit wird ausschließlich als Text in diesem Browser gespeichert, nicht in GitHub. Die KI erhält sie nur, wenn du ausdrücklich „KI auswerten“ anklickst. Entferne vorher Namen und persönliche Angaben.</p>
  <div class="split-actions"><button class="btn btn-green" id="assSave" type="button">Arbeit / Note speichern</button></div>
  <p id="assStatus" class="small" role="status" aria-live="polite"></p>
 </div>
 <div class="manual-card"><h3>Dein angepasster Lernplan</h3><p class="small">5 kurze Einheiten à 15 Minuten an Werktagen. Priorität erhalten bestätigte Fehlerschwerpunkte und noch offene Quizfehler; anstehende Arbeiten werden berücksichtigt.</p><div id="assPlan" aria-live="polite"></div></div>
 <h3 style="margin:24px 0 10px">Vergangene Arbeiten</h3><div id="assRecords"></div>
`;
el('parentAbout').before(panel);
el('assDate').value=new Date().toLocaleDateString('sv-SE');
function paint(){
 const id=el('assSubject').value||selected;
 el('assSubject').innerHTML=EXAMS.map(e=>'<option value="'+escape(e.id)+'">'+escape(e.name)+'</option>').join('');
 el('assSubject').value=subject(id)?id:selected;
 const rows=core.focus(assessments,store.errors,EXAMS,new Date());
 const sessions=core.sessions(rows,new Date(),5);
 el('assPlan').innerHTML=sessions.length?sessions.map((p,i)=>{
  const course=subject(p.subject);const localDate=new Date(p.date+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});
  const hasExercise=p.kind==='review'?store.errors.some(e=>e.subject===p.subject):matchingQuestions(p.subject,p.topic).length>0;
  return '<article class="source" style="margin:7px 0;align-items:start"><strong>'+escape(localDate)+'</strong><span><b>'+escape(course?.name||p.subject)+' · '+escape(p.topic)+'</b><br><small>'+escape(p.reason)+' · '+p.minutes+' Minuten</small><br><small>'+escape(p.hint)+'</small></span><div class="source-actions"><button type="button" class="btn-mini" data-ass-practice="'+escape(p.subject)+'" data-ass-topic="'+escape(p.topic)+'" data-ass-kind="'+escape(p.kind)+'">'+(hasExercise?'Jetzt üben':'Aufgaben vorbereiten')+'</button></div></article>';
 }).join(''):'<div class="empty">Noch keine überprüften Fehlerschwerpunkte. Erfasse Korrekturhinweise oder übe zunächst einige Fragen. Eine Note allein erzeugt keinen Themenplan.</div>';
 el('assRecords').innerHTML=assessments.length?assessments.slice().reverse().map(r=>{
 const areas=(r.areas||[]).filter(a=>a.status!=='dismissed');
 const pending=areas.filter(a=>a.status==='draft').length;
 const displayDate=r.date?new Date(r.date+'T12:00:00').toLocaleDateString('de-DE'):'ohne Datum';
 return '<article class="knowledge-card" style="margin-bottom:12px"><div class="card-top"><b>'+escape(subject(r.subject)?.name||r.subject)+' · '+escape(r.title)+'</b><span class="tiny-tag">'+(r.grade?'Note '+escape(r.grade):'Keine Note')+'</span></div><p class="small">'+escape(displayDate)+(r.text?' · Arbeit gespeichert':' · Ohne Arbeitsdatei')+'</p>'+
 (r.feedback?'<p class="small">Hinweise: '+escape(r.feedback.slice(0,220))+'</p>':'')+
 (areas.length?areas.map((a,j)=>'<div class="hint" style="margin:8px 0"><strong>'+escape(a.topic)+'</strong> · '+(a.status==='approved'?'Für Lernplan bestätigt':'KI-Vorschlag – bitte prüfen')+'<p class="small">'+escape(a.reason||'')+'</p>'+(a.evidence?'<p class="small">Beleg: „'+escape(a.evidence.slice(0,180))+'“</p>':'')+
 (a.status==='draft'?'<button class="btn-mini" data-ass-approve="'+escape(r.id)+'" data-area-index="'+j+'">Übernehmen</button> <button class="btn-mini" data-ass-dismiss="'+escape(r.id)+'" data-area-index="'+j+'">Verwerfen</button>':'')+'</div>').join(''):'<p class="small">Noch keine belegten Übungsschwerpunkte. Ergänze Fehlerhinweise oder lass eine korrigierte Arbeit analysieren.</p>')+
 '<div class="card-actions"><button type="button" class="btn btn-outline btn-mini" data-ass-analyze="'+escape(r.id)+'">KI auswerten</button><button type="button" class="btn btn-outline btn-mini" data-ass-delete="'+escape(r.id)+'">Löschen</button></div>'+(pending?'<p class="small">'+pending+' Vorschlag/Vorschläge warten auf deine Freigabe.</p>':'')+'</article>';
 }).join(''):'<div class="empty">Noch keine Noten oder Klassenarbeiten erfasst.</div>';
}
function matchingQuestions(id,topic){
 const needle=core.normalize(topic),terms=needle.split(/[^a-zäöüß0-9]+/).filter(w=>w.length>=5);
 return realQuestions(id).filter(q=>{const hay=core.normalize(q.q+' '+q.why);return (needle.length>=5&&hay.includes(needle))||(terms.length>=2&&terms.filter(t=>hay.includes(t)).length>=2)||(terms.length===1&&hay.includes(terms[0]));}).slice(0,6);
}
function learn(id,topic,kind){
 if(!subject(id))return;
 selected=id;render();
 if(kind==='review'){closeParent();startLesson(id,0,true);return;}
 const qs=matchingQuestions(id,topic);
 if(!qs.length){setParentTab('materials');toast('Für dieses Thema fehlen noch passende, freigegebene Aufgaben. Bitte Schulstoff hinzufügen.');return;}
 closeParent();session={id,level:0,items:qs,index:0,chosen:null,checked:false,correctCount:0,review:true,custom:true};
 el('lessonOverlay').classList.add('show');document.body.style.overflow='hidden';renderQuestion();
}
const previousSetTab=setParentTab;
setParentTab=function(name){
 if(name==='assessments'){
  for(const other of ['materials','review','about'])el('parent'+other[0].toUpperCase()+other.slice(1)).hidden=true;
  panel.hidden=false;
  document.querySelectorAll('[data-tab]').forEach(x=>{const is=x.dataset.tab===name;x.classList.toggle('active',is);x.setAttribute('aria-selected',String(is));});
  el('assSubject').value=selected;paint();
 }else{panel.hidden=true;previousSetTab(name);}
};
const previousRender=render;
render=function(){previousRender();if(!panel.hidden)paint();};
el('assFile').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 el('assStatus').textContent='Datei wird lokal ausgelesen …';
 try{
  const t=await extractFileText(file);
  if(!t.trim())throw new Error('Kein Text erkannt.');
  el('assText').value=t.slice(0,12000);
  if(!el('assTitle').value)el('assTitle').value=file.name.slice(0,100);
  el('assText').closest('details').open=true;
  el('assStatus').textContent='Text erkannt. Bitte besonders Markierungen, Fehler und personenbezogene Angaben kontrollieren.';
 }catch(err){el('assStatus').textContent=err.message||'Datei konnte nicht gelesen werden.';}
});
el('assSave').addEventListener('click',()=>{
 const id=el('assSubject').value,grade=el('assGrade').value,title=el('assTitle').value.trim()||'Klassenarbeit',
 feedback=el('assFeedback').value.trim(),text=el('assText').value.trim(),date=el('assDate').value;
 if(!subject(id)||grade&&!core.validGrade(grade)){toast('Bitte gültiges Fach und gültige Note auswählen.');return;}
 if(!grade&&!text&&!feedback&&!el('assTopics').value.trim()){toast('Bitte mindestens Note, korrigierte Arbeit oder Fehlerhinweise eingeben.');return;}
 const topics=[...new Set(el('assTopics').value.split(/[,;\n]/).map(s=>s.trim()).filter(s=>s.length>=3&&s.length<=85))].slice(0,5);
 const record={id:uniqueId(),subject:id,title:title.slice(0,100),date,grade,text:text.slice(0,12000),feedback:feedback.slice(0,2500),
 areas:topics.map(topic=>({topic,reason:'Von Elternteil als Übungsthema eingetragen',practiceHint:'Passende Übungen aus dem Schulmaterial lösen',evidence:'',priority:'medium',status:'approved'}))};
 assessments.push(record);if(assessments.length>100)assessments.shift();
 if(!save()){assessments.pop();return;}
 for(const key of ['assGrade','assTitle','assFeedback','assTopics','assText','assFile'])el(key).value='';
 el('assStatus').textContent='Gespeichert. Falls konkrete Korrekturhinweise vorhanden sind, kannst du die KI-Auswertung starten.';
 render();
});
panel.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.assPractice){learn(button.dataset.assPractice,button.dataset.assTopic,button.dataset.assKind);return;}
 const id=button.dataset.assAnalyze||button.dataset.assDelete||button.dataset.assApprove||button.dataset.assDismiss;
 if(!id)return;const record=assessments.find(x=>x.id===id);if(!record)return;
 if(button.dataset.assDelete){if(confirm('Diese Klassenarbeit und ihre Analyse endgültig aus diesem Browser löschen?')){assessments=assessments.filter(r=>r!==record);save();render();}return;}
 if(button.dataset.assApprove||button.dataset.assDismiss){
  const visible=(record.areas||[]).filter(x=>x.status!=='dismissed'),area=visible[Number(button.dataset.areaIndex)];
  if(!area)return;area.status=button.dataset.assApprove?'approved':'dismissed';save();render();return;
 }
 if(button.dataset.assAnalyze){
  const endpoint=el('aiEndpoint').value.trim().replace(/\/+$/,''),token=el('aiToken').value.trim();
  let url;try{url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password)throw Error();}catch{toast('Zuerst im Material-Tab den HTTPS-KI-Dienst einrichten.');return;}
  if(!token){toast('Zuerst im Material-Tab den privaten Zugriffscode eingeben.');return;}
  if((record.feedback+' '+record.text).trim().length<25){toast('Für die KI-Auswertung fehlen noch korrigierte Aufgaben oder Fehlerhinweise.');return;}
  if(!confirm('Korrigierte Arbeit und Fehlerhinweise jetzt zur Analyse an deinen KI-Dienst und OpenAI senden? Bitte zuvor Namen und persönliche Angaben entfernen.'))return;
  button.disabled=true;button.textContent='Wird ausgewertet …';el('assStatus').textContent='KI prüft die Fehlerhinweise …';
  try{
   const response=await fetch(url.href.replace(/\/$/,'')+'/analyze-assessment',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({subject:subject(record.subject).name,text:record.text,feedback:record.feedback})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'KI-Auswertung fehlgeschlagen.');
   record.areas=(record.areas||[]).filter(x=>x.status==='approved').concat((data.areas||[]).map(a=>({...a,status:'draft'})));save();render();
   el('assStatus').textContent=data.areas?.length?'Vorschläge erhalten. Bitte anhand der Korrekturen prüfen und übernehmen.':'Keine eindeutigen Lernlücken erkennbar. Ergänze konkrete Korrekturhinweise.';
  }catch(err){el('assStatus').textContent=err.message||'KI-Dienst antwortet nicht.';}
  finally{button.disabled=false;button.textContent='KI auswerten';}
 }
});
paint();
})();
