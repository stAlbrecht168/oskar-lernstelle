/* Quellgebundene Entdeckerreisen. Keine Videos als Wissensbeleg verwenden.
 * Gespeichert werden nur geprüfte Entwürfe und Lernfortschritt im lokalen Browser. */
'use strict';
const JOURNEY_VIDEOS = Object.freeze({
  'simpli-water': {
    title:'Das üble Geschäft mit Wasser',channel:'Simplicissimus',
    url:'https://www.youtube.com/watch?v=e-IlDMOaX8A',
    note:'Längeres Video über das Geschäft mit Flaschenwasser, mit Werbeabschnitt. Vorher selbst ansehen und geeignete Ausschnitte auswählen.',
    tags:['wasser','flaschenwasser','ressourcen','trinkwasser']
  }
});
const journeyDraftItems=()=>Array.isArray(journeyState.aiJourneys)?journeyState.aiJourneys:[];
const journeyProgress=()=>journeyState.aiProgress&&typeof journeyState.aiProgress==='object'?journeyState.aiProgress:{};
const journeyNormalize=s=>String(s||'').toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();
const journeySource=id=>store.materials.find(m=>m.id===id);
const journeyId=()=>uniqueId();
let journeyOpened=null;
function saveAiJourney(){saveJourneyState();renderGeneratedJourneys();}
function journeySourceValid(station){const m=journeySource(station.sourceId);return !!(m&&m.subject===station.subject&&journeyNormalize(m.text).includes(journeyNormalize(station.evidence))&&station.evidence.length>=10);}
function journeyValid(j){return j&&Array.isArray(j.stations)&&j.stations.length>=2&&j.stations.length<=4&&j.stations.every(s=>journeySourceValid(s)&&s.options.length>=3&&s.options.length<=4&&Number.isInteger(s.correctIndex)&&s.correctIndex>=0&&s.correctIndex<s.options.length)&&new Set(j.stations.map(s=>s.subject)).size>=2;}
function videoForJourney(j){const id=j.videoId;return id&&Object.prototype.hasOwnProperty.call(JOURNEY_VIDEOS,id)?JOURNEY_VIDEOS[id]:null;}
function videoCandidate(j){const raw=journeyNormalize([j.title,j.guidingQuestion,j.connection].join(' '));return Object.entries(JOURNEY_VIDEOS).find(([,v])=>v.tags.some(t=>raw.includes(t)))?.[0]||'';}
function createJourneyBuilder(){
 const section=document.createElement('section');section.id='aiJourneySection';section.className='ai-journey-area';
 section.innerHTML=`<div class="ai-journey-header"><div><h3>Deine eigenen Entdeckerreisen</h3><p>Verbinde Inhalte aus deinen Schulheften. Die KI schlägt eine Reise vor, du prüfst sie vor dem Spielen.</p></div><button type="button" id="openJourneyBuilder" class="btn btn-green btn-mini">Neue Reise planen</button></div>
 <div id="journeyBuilder" hidden><label for="journeyTopic">Was möchtest du entdecken?</label><input id="journeyTopic" maxlength="120" placeholder="Zum Beispiel Wasser, Diagramme oder Licht"><p class="small">Wähle zwei bis vier gespeicherte Schulquellen aus mindestens zwei Fächern. Es werden nur diese Texte an den KI-Dienst gesendet.</p><div id="journeySourcePicker" class="journey-source-picker"></div><button type="button" class="btn btn-green" id="createAiJourney">Reise mit KI vorschlagen</button><div id="journeyCreateStatus" role="status" aria-live="polite" class="small"></div><p class="small">Der HTTPS-KI-Dienst und dein privater Zugriffscode werden in der Materialbibliothek eingetragen. Der Code wird nicht gespeichert.</p></div>
 <div id="journeyPending" class="journey-pending"></div><div id="journeyApproved" class="journey-approved"></div>`;
 $('bridgeList').after(section);
 const overlay=document.createElement('div');overlay.id='aiJourneyOverlay';overlay.className='overlay';overlay.innerHTML=`<section class="dialog journey-dialog" role="dialog" aria-modal="true" aria-labelledby="aiJourneyTitle"><div class="dialog-head"><strong id="aiJourneyHeader">Entdeckerreise</strong><button type="button" class="close" id="closeAiJourney" aria-label="Reise schließen">×</button></div><div class="dialog-content ai-journey-scene" id="aiJourneyScene"></div></section>`;
 document.body.appendChild(overlay);
 $('openJourneyBuilder').addEventListener('click',()=>{const el=$('journeyBuilder');el.hidden=!el.hidden;renderJourneySources();if(!el.hidden)$('journeyTopic').focus();});
 $('createAiJourney').addEventListener('click',generateAiJourney);
 $('journeyPending').addEventListener('click',handleJourneyReview);
 $('journeyApproved').addEventListener('click',handleJourneyList);
 $('aiJourneyScene').addEventListener('click',handleJourneyPlayer);
 $('closeAiJourney').addEventListener('click',closeAiJourney);
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeAiJourney();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('aiJourneyOverlay').classList.contains('show')){e.stopImmediatePropagation();closeAiJourney();}},true);
 renderGeneratedJourneys();
}
function renderJourneySources(){
 const sources=store.materials.filter(m=>typeof m.text==='string'&&m.text.trim().length>=40&&subject(m.subject));
 const chosen=new Set([...document.querySelectorAll('#journeySourcePicker input:checked')].map(e=>e.value));
 const shouldAuto=chosen.size===0;
 $('journeySourcePicker').innerHTML=sources.length?sources.map((m,i)=>`<label class="journey-source-choice"><input type="checkbox" value="${noHtml(m.id)}" ${chosen.has(m.id)||(shouldAuto&&i<4)?'checked':''}><span><b>${noHtml(subject(m.subject).icon)} ${noHtml(subject(m.subject).name)} · ${noHtml(m.title)}</b><small>${m.text.length.toLocaleString('de-DE')} Zeichen</small></span></label>`).join(''):'<p class="bridge-empty">Noch keine längeren Schulquellen vorhanden. Füge zunächst Text oder ein Heftfoto in der Materialbibliothek hinzu.</p>';
}
function validateGeneratedJourney(j){if(!j||!Array.isArray(j.stations))return false;
 const bounds=(s,n,min=1)=>typeof s==='string'&&s.trim().length>=min&&s.length<=n;
 if(!bounds(j.title,100,5)||!bounds(j.guidingQuestion,200,10)||!bounds(j.hook,480,10)||!bounds(j.connection,500,10)||!bounds(j.reflectionPrompt,240,10)||j.stations.length<2||j.stations.length>4)return false;
 if(new Set(j.stations.map(s=>s.subject)).size<2)return false;
 return j.stations.every(s=>{const m=journeySource(s.sourceId);return m&&m.subject===s.subject&&subject(s.subject)&&bounds(s.heading,90,3)&&bounds(s.context,320,10)&&bounds(s.question,240,10)&&bounds(s.explanation,380,10)&&bounds(s.evidence,240,10)&&journeySourceValid(s)&&Array.isArray(s.options)&&s.options.length>=3&&s.options.length<=4&&s.options.every(o=>bounds(o,140))&&new Set(s.options.map(journeyNormalize)).size===s.options.length&&Number.isInteger(s.correctIndex)&&s.correctIndex>=0&&s.correctIndex<s.options.length;});
}
async function generateAiJourney(){
 const status=$('journeyCreateStatus');const chosen=[...document.querySelectorAll('#journeySourcePicker input:checked')].map(x=>journeySource(x.value)).filter(Boolean);
 if(chosen.length<2||chosen.length>4||new Set(chosen.map(x=>x.subject)).size<2){status.textContent='Bitte zwei bis vier Quellen aus mindestens zwei verschiedenen Fächern auswählen.';return;}
 const sources=chosen.map(m=>({id:m.id,subject:m.subject,title:m.title,text:m.text.slice(0,6500)}));
 if(sources.reduce((sum,s)=>sum+s.text.length,0)>15000){status.textContent='Die ausgewählten Quellentexte sind zusammen zu lang. Bitte weniger Material auswählen.';return;}
 const endpoint=$('aiEndpoint').value.trim().replace(/\/+$/,''),token=$('aiToken').value.trim();
 if(!/^https:\/\/[^\s/]+/.test(endpoint)||!token){status.textContent='Bitte in der Materialbibliothek zuerst die HTTPS-Adresse des KI-Dienstes und deinen Zugriffscode eingeben.';return;}
 const button=$('createAiJourney');button.disabled=true;status.textContent='Die KI sucht Verbindungen und Aufgaben mit Quellenbelegen …';
 try{
  const response=await fetch(endpoint+'/journey',{method:'POST',headers:{'authorization':'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({topic:$('journeyTopic').value.trim(),sources})});
  let payload;try{payload=await response.json();}catch{throw Error('Ungültige Serverantwort.');}
  if(!response.ok)throw Error(payload.error||'Der KI-Dienst ist nicht erreichbar.');
  if(!validateGeneratedJourney(payload.journey))throw Error('Der Vorschlag enthält keine zwei vollständig belegten Fachstationen. Andere Quellen versuchen.');
  const j={...payload.journey,id:journeyId(),status:'draft',created:new Date().toISOString(),videoId:null};
  journeyState.aiJourneys=[j,...journeyDraftItems()].slice(0,35);saveAiJourney();
  status.textContent='Ein neuer Entwurf ist bereit. Bitte Fragen, Antworten und Quellen prüfen.';
  $('journeyPending').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(err){status.textContent='Reise konnte nicht erstellt werden: '+err.message;}
 finally{button.disabled=false;}
}
function renderGeneratedJourneys(){
 if(!$('journeyPending'))return;
 const items=journeyDraftItems();
 const pending=items.filter(j=>j.status==='draft');const approved=items.filter(j=>j.status==='approved');
 $('journeyPending').innerHTML=pending.length?`<h3>Reisen zur Prüfung</h3>`+pending.map(j=>renderJourneyDraft(j)).join(''):'';
 $('journeyApproved').innerHTML=`<h3>Deine Reisen</h3>`+(approved.length?approved.map(j=>{const ok=journeyValid(j);const progress=journeyProgress()[j.id]||{};return `<article class="ai-journey-tile jmedia-tile">${journeyMediaThumb(journeyMediaKey([j.title,j.guidingQuestion].join(' ')))}<div class="jmedia-tile-body"><strong>${noHtml(j.title)}</strong><p>${noHtml(j.guidingQuestion)}</p><small>${[...new Set(j.stations.map(s=>subject(s.subject)?.name||s.subject))].map(noHtml).join(' · ')}${videoForJourney(j)?' · 🎬 Video':''}</small>${!ok?'<p class="journey-warning">Quellen fehlen oder wurden geändert. Diese Reise ist derzeit gesperrt.</p>':''}</div><div class="journey-tile-actions"><button type="button" data-jrun="${noHtml(j.id)}" class="btn btn-green btn-mini" ${!ok?'disabled':''}>${progress.completed?'Wiederholen':progress.step?'Fortsetzen':'Entdecken'}</button><button type="button" data-jedit="${noHtml(j.id)}" class="btn btn-outline btn-mini">Bearbeiten</button><button type="button" data-jdelete="${noHtml(j.id)}" class="btn btn-outline btn-mini">Löschen</button></div></article>`;}).join(''):'<p class="bridge-empty">Hier erscheinen die geprüften, freigegebenen Reisen. Die Wasserreise darüber ist weiterhin als Beispiel verfügbar.</p>');
}
function renderJourneyDraft(j){
 const candidate=videoCandidate(j),video=candidate&&JOURNEY_VIDEOS[candidate],ok=journeyValid(j);
 return `<article class="ai-journey-draft" data-jdraft="${noHtml(j.id)}"><div class="card-top"><b>KI-Vorschlag, noch nicht freigegeben</b><span class="tiny-tag pending">Prüfen</span></div>
 <label>Titel<input data-jfield="title" maxlength="100" value="${noHtml(j.title)}"></label>
 <label>Leitfrage<input data-jfield="guidingQuestion" maxlength="200" value="${noHtml(j.guidingQuestion)}"></label>
 <label>Einleitung<textarea data-jfield="hook" maxlength="480" rows="2">${noHtml(j.hook)}</textarea></label>
 <label>Was verbindet die Fächer?<textarea data-jfield="connection" maxlength="500" rows="3">${noHtml(j.connection)}</textarea></label>
 ${j.stations.map((s,i)=>`<div class="ai-journey-review-station" data-jstation="${i}"><strong>${i+1}. ${noHtml(subject(s.subject)?.icon||'📄')} ${noHtml(subject(s.subject)?.name||s.subject)} · ${noHtml(journeySource(s.sourceId)?.title||'Quelle fehlt')}</strong>
 <label>Stationstitel<input data-jstation-field="heading" maxlength="90" value="${noHtml(s.heading)}"></label>
 <label>Geschichte / Kontext<textarea data-jstation-field="context" maxlength="320" rows="2">${noHtml(s.context)}</textarea></label>
 <label>Frage<input data-jstation-field="question" maxlength="240" value="${noHtml(s.question)}"></label>
 <div class="journey-edit-choices">${s.options.map((o,k)=>`<label>Antwort ${k+1}<input data-jopt="${k}" maxlength="140" value="${noHtml(o)}"></label>`).join('')}</div>
 <label>Richtige Antwort<select data-jcorrect>${s.options.map((o,k)=>`<option value="${k}" ${k===s.correctIndex?'selected':''}>Antwort ${k+1}</option>`).join('')}</select></label>
 <label>Erklärung<textarea data-jstation-field="explanation" maxlength="380" rows="2">${noHtml(s.explanation)}</textarea></label>
 <div class="journey-evidence">Beleg aus Schulquelle: „${noHtml(s.evidence)}“</div>${!journeySourceValid(s)?'<p class="journey-warning">Dieser Quellenbeleg wurde im Schulmaterial nicht mehr gefunden.</p>':''}</div>`).join('')}
 <label>Abschlussfrage<textarea data-jfield="reflectionPrompt" maxlength="240" rows="2">${noHtml(j.reflectionPrompt)}</textarea></label>
 ${video?`<label class="journey-video-opt"><input data-jvideo type="checkbox" value="${noHtml(candidate)}" ${j.videoId===candidate?'checked':''}><span><strong>Video optional hinzufügen: ${noHtml(video.title)}</strong><br><small>${noHtml(video.note)}</small><br><a href="${video.url}" rel="noopener noreferrer" target="_blank">Video zuerst ansehen</a>. Es wird nicht als Sachquelle für Aufgaben verwendet.</span></label>`:'<p class="small">Kein passendes, überprüftes Video im kleinen Katalog. Die Reise funktioniert ohne Video.</p>'}
 <div class="journey-review-actions"><button type="button" data-jsave="${noHtml(j.id)}" class="btn btn-outline btn-mini">Änderungen speichern</button><button type="button" data-japprove="${noHtml(j.id)}" class="btn btn-green btn-mini" ${!ok?'disabled':''}>Prüfen und freigeben</button><button type="button" data-jdelete="${noHtml(j.id)}" class="btn btn-outline btn-mini">Entwurf löschen</button></div></article>`;
}
function collectJourneyDraft(button){
 const el=button.closest('[data-jdraft]'),j=journeyDraftItems().find(j=>j.id===el?.dataset.jdraft);
 if(!j)return false;
 for(const field of ['title','guidingQuestion','hook','connection','reflectionPrompt'])j[field]=el.querySelector(`[data-jfield="${field}"]`).value.trim();
 j.stations.forEach((s,i)=>{const root=el.querySelector(`[data-jstation="${i}"]`);
  for(const field of ['heading','context','question','explanation'])s[field]=root.querySelector(`[data-jstation-field="${field}"]`).value.trim();
  s.options=[...root.querySelectorAll('[data-jopt]')].map(x=>x.value.trim());
  s.correctIndex=Number(root.querySelector('[data-jcorrect]').value);
 });
 j.videoId=el.querySelector('[data-jvideo]:checked')?.value||null;
 const valid=validateGeneratedJourney(j);
 if(!valid){toast('Bitte Texte, Antworten und Quellen prüfen. Mindestens zwei Fächer müssen belegt sein.');return false;}
 return true;
}
function handleJourneyReview(e){const b=e.target.closest('[data-japprove],[data-jsave],[data-jdelete]');if(!b)return;
 const id=b.dataset.japprove||b.dataset.jsave||b.dataset.jdelete;const j=journeyDraftItems().find(j=>j.id===id);if(!j)return;
 if(b.hasAttribute('data-jdelete')){if(!confirm('Diesen Reiseentwurf löschen?'))return;journeyState.aiJourneys=journeyDraftItems().filter(x=>x.id!==id);saveAiJourney();return;}
 if(!collectJourneyDraft(b))return;
 if(b.hasAttribute('data-japprove'))j.status='approved';
 saveAiJourney();toast(j.status==='approved'?'Reise geprüft und freigegeben.':'Entwurf gespeichert.');
}
function handleJourneyList(e){const b=e.target.closest('[data-jrun],[data-jedit],[data-jdelete]');if(!b)return;const id=b.dataset.jrun||b.dataset.jedit||b.dataset.jdelete;
 const j=journeyDraftItems().find(j=>j.id===id);if(!j)return;
 if(b.dataset.jrun){openAiJourney(id);return;}
 if(b.dataset.jedit){j.status='draft';saveAiJourney();$('journeyPending').scrollIntoView({behavior:'smooth',block:'start'});return;}
 if(!confirm('Diese Reise und ihren Fortschritt löschen?'))return;
 journeyState.aiJourneys=journeyDraftItems().filter(x=>x.id!==id);delete journeyProgress()[id];saveAiJourney();
}
function closeAiJourney(){journeyOpened=null;$('aiJourneyScene').replaceChildren();$('aiJourneyOverlay').classList.remove('show');document.body.style.overflow='';}
function aiJourneySteps(j){return [{type:'intro'},...(videoForJourney(j)?[{type:'video'}]:[]),...j.stations.map((s,i)=>({type:'quiz',index:i})),{type:'reflection'}];}
function openAiJourney(id){const j=journeyDraftItems().find(x=>x.id===id&&x.status==='approved');if(!j||!journeyValid(j)){toast('Die Quellen dieser Reise sind nicht mehr gültig.');return;}
 journeyOpened=id;$('aiJourneyOverlay').classList.add('show');document.body.style.overflow='hidden';renderAiJourneyScene();
}
function advanceAiJourney(){const j=journeyDraftItems().find(x=>x.id===journeyOpened),progress=journeyProgress();if(!j)return;
 const saved=progress[j.id]||{step:0,completed:false,reflection:''};saved.step=Math.min(saved.step+1,aiJourneySteps(j).length-1);progress[j.id]=saved;journeyState.aiProgress=progress;saveJourneyState();renderAiJourneyScene();
}
function renderAiJourneyScene(){const j=journeyDraftItems().find(x=>x.id===journeyOpened);if(!j)return;
 const progress=journeyProgress()[j.id]||{step:0,completed:false,reflection:''};const steps=aiJourneySteps(j);const at=Math.min(Math.max(0,Number(progress.step)||0),steps.length-1);const step=steps[at];$('aiJourneyHeader').textContent=j.title;
 let html=`<div class="ai-scene-progress">Station ${at+1} von ${steps.length} · ${noHtml(j.title)}</div><div class="journey-progress-track"><div style="width:${Math.round(at/Math.max(1,steps.length-1)*100)}%"></div></div>`;
 if(step.type==='intro')html+=`<div class="scene-badge">Deine Spur</div><h2 id="aiJourneyTitle">${noHtml(j.guidingQuestion)}</h2><p>${noHtml(j.hook)}</p><p class="ai-journey-connection">${noHtml(j.connection)}</p><div class="small">${[...new Set(j.stations.map(s=>subject(s.subject)?.name||s.subject))].map(noHtml).join(' · ')}</div><button type="button" data-aiaction="next" class="btn btn-green">Spur aufnehmen</button>`;
 if(step.type==='video'){const v=videoForJourney(j);html+=`<div class="scene-badge">Optionaler Video-Stopp</div><h2 id="aiJourneyTitle">Eine neue Perspektive entdecken</h2><p>${noHtml(v.note)}</p><a class="btn btn-outline journey-link" target="_blank" rel="noopener noreferrer" href="${v.url}">Video von ${noHtml(v.channel)} öffnen</a><p class="small">Die Fragen der Reise stammen nur aus Schulquellen. Das Video ist kein Beleg. Du kannst es überspringen.</p><button type="button" data-aiaction="next" class="btn btn-green">Weiter zu den Fachstationen</button>`;}
 if(step.type==='quiz'){const s=j.stations[step.index],m=journeySource(s.sourceId);
 html+=`<div class="scene-badge">${noHtml(subject(s.subject).icon)} ${noHtml(subject(s.subject).name)} · Entdeckung ${step.index+1}</div><h2 id="aiJourneyTitle">${noHtml(s.heading)}</h2><p>${noHtml(s.context)}</p><h3>${noHtml(s.question)}</h3><div class="journey-choices">${s.options.map((o,i)=>`<button type="button" data-aichoice="${i}" class="journey-choice"><span>${i+1}</span>${noHtml(o)}</button>`).join('')}</div><div id="aiJourneyFeedback" role="status" aria-live="polite"></div><button type="button" data-aiaction="check" class="btn btn-green" disabled>Antwort prüfen</button><p class="small">Quelle: ${noHtml(m?.title||'Schulmaterial')}</p>`;
 }
 if(step.type==='reflection')html+=`<div class="scene-badge">Deine Entdeckung</div><h2 id="aiJourneyTitle">Was hast du herausgefunden?</h2><p>${noHtml(j.reflectionPrompt)}</p><textarea id="aiJourneyReflection" rows="4" maxlength="500" placeholder="Dein Gedanke ...">${noHtml(progress.reflection||'')}</textarea><p class="small">Deine Antwort wird nicht automatisch benotet. Sprich mit jemandem darüber, wenn du magst.</p><button type="button" data-aiaction="finish" class="btn btn-green">Reise abschließen</button>`;
 if(step.type==='video') {
  html=html.replace('<div class="scene-badge">',journeyMediaVideo(j.videoId)+'<div class="scene-badge">');
 } else {
  const imageKey=step.type==='quiz'?journeyMediaKey(j.title,j.stations[step.index].subject):step.type==='reflection'?journeyMediaKey(j.title):journeyMediaKey([j.title,j.guidingQuestion,j.connection].join(' '));
  const caption=step.type==='quiz'?'Fachstation · '+(subject(j.stations[step.index].subject)?.name||'Entdecken'):step.type==='reflection'?'Deine Entdeckung':'Die Welt hinter deiner Frage';
  html=html.replace('<div class="scene-badge">',journeyMediaImage(imageKey,caption,step.type==='quiz'?'compact':'scene')+'<div class="scene-badge">');
 }
 $('aiJourneyScene').innerHTML=html;
}
function handleJourneyPlayer(e){const choice=e.target.closest('[data-aichoice]');if(choice){const scene=$('aiJourneyScene');scene.dataset.choice=choice.dataset.aichoice;scene.querySelectorAll('[data-aichoice]').forEach(b=>b.classList.toggle('active',b===choice));scene.querySelector('[data-aiaction="check"]').disabled=false;return;}
 const button=e.target.closest('[data-aiaction]');if(!button)return;const j=journeyDraftItems().find(x=>x.id===journeyOpened);if(!j)return;
 const progress=journeyProgress()[j.id]||{step:0,completed:false,reflection:''},steps=aiJourneySteps(j),at=Math.min(Number(progress.step)||0,steps.length-1),step=steps[at];
 if(button.dataset.aiaction==='next'){advanceAiJourney();return;}
 if(button.dataset.aiaction==='check'&&step.type==='quiz'){const s=j.stations[step.index],scene=$('aiJourneyScene'),index=Number(scene.dataset.choice),ok=index===s.correctIndex,msg=$('aiJourneyFeedback');
  msg.className='journey-feedback '+(ok?'success':'retry');msg.textContent=(ok?'Richtig! ':'Probier es noch einmal. ')+s.explanation;
  if(ok){const m=journeySource(s.sourceId),quote=document.createElement('p');quote.className='journey-evidence';quote.textContent=`Aus „${m.title}“: „${s.evidence}“`;msg.appendChild(quote);scene.querySelectorAll('[data-aichoice]').forEach(b=>b.disabled=true);button.textContent='Weiter zur nächsten Spur';button.dataset.aiaction='next';button.disabled=false;}
  else{button.disabled=true;delete scene.dataset.choice;scene.querySelectorAll('[data-aichoice]').forEach(b=>b.classList.remove('active'));}return;
 }
 if(button.dataset.aiaction==='finish'&&step.type==='reflection'){
  const reflection=$('aiJourneyReflection').value.trim();if(reflection.length<12){toast('Schreib noch kurz, was du entdeckt hast.');return;}
  const all=journeyProgress();const old=all[j.id]||{};all[j.id]={step:steps.length-1,reflection,completed:true};journeyState.aiProgress=all;
  if(!old.completed){store.xp+=15;persist();}
  saveAiJourney();closeAiJourney();render();toast(old.completed?'Reise wiederholt.':'Entdeckerreise geschafft: +15 XP');
 }
}
const aiJourneyStyles=`
.ai-journey-area{border-top:1px solid #e1e8f4;margin-top:22px;padding-top:20px}.ai-journey-area h3{font-size:18px;margin:0 0 7px}.ai-journey-header{display:flex;align-items:start;justify-content:space-between;gap:14px;flex-wrap:wrap}.ai-journey-header p{font-size:13px;color:#65748e;max-width:520px;margin:0 0 13px}
#journeyBuilder{padding:17px;border-radius:16px;background:#f8faff;border:1px solid #dfe7f4;margin:13px 0 21px}#journeyBuilder[hidden]{display:none}#journeyBuilder>label{display:block;font-weight:800;margin:0 0 8px}#journeyTopic{display:block;width:100%;padding:12px;border:1px solid #cdd8e9;border-radius:11px;font:inherit}#journeyCreateStatus{margin-top:12px}
.journey-source-picker{display:grid;gap:7px;max-height:280px;overflow-y:auto;margin:14px 0}.journey-source-choice{display:flex;align-items:center;gap:12px;border-radius:12px;border:1px solid #e2e9f5;background:white;padding:10px}.journey-source-choice>input{width:20px;height:20px;flex-shrink:0}.journey-source-choice span{min-width:0}.journey-source-choice b{display:block;font-size:12px}.journey-source-choice small{display:block;color:#7e8ba0;font-size:11px;margin-top:3px}
.journey-pending h3,.journey-approved h3{margin:19px 0 10px}.ai-journey-draft{border:2px solid #d9e9f8;background:#fafdff;border-radius:17px;padding:17px;margin:14px 0}.ai-journey-draft label{display:block;font-size:12px;font-weight:750;margin-top:9px}.ai-journey-draft input:not([type=checkbox]),.ai-journey-draft textarea,.ai-journey-draft select{display:block;width:100%;border:1px solid #ccd8e8;border-radius:9px;padding:9px;margin-top:4px;font:inherit;color:#2b3d61;background:white}.ai-journey-review-station{border:1px solid #d6e0f0;background:white;border-radius:13px;padding:12px;margin:15px 0}.ai-journey-review-station>strong{font-size:13px}.journey-edit-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px}.journey-evidence{background:#f1f7f4;border-left:3px solid #67bc95;padding:9px;margin:11px 0;color:#3b5a4d;font-size:12px;line-height:1.5;overflow-wrap:anywhere}.journey-warning{color:#9b4c20;font-weight:750;font-size:12px}.journey-video-opt{display:flex!important;align-items:start;gap:9px;border-radius:12px;background:#fff4e3;padding:12px;font-weight:400!important}.journey-video-opt input{width:20px;height:20px;margin:2px 0 0;flex-shrink:0}.journey-video-opt span{flex:1}.journey-review-actions,.journey-tile-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.ai-journey-tile{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;border:1px solid #e1e9f5;background:#fff;padding:15px;border-radius:15px;margin:10px 0}.ai-journey-tile strong{font-size:15px}.ai-journey-tile p{color:#61718c;font-size:12px;margin:3px 0}.ai-journey-tile small{color:#7790a1}.ai-journey-scene{overflow-y:auto}.ai-journey-scene h2{font-size:23px;line-height:1.2;margin:12px 0}.ai-journey-scene h3{font-size:17px;margin:18px 0}.ai-journey-scene textarea{display:block;width:100%;padding:12px;border:1px solid #d2def0;border-radius:12px;margin:12px 0}.ai-journey-connection{background:#f5f7ff;padding:12px;border-radius:12px}.ai-scene-progress{font-size:12px;color:#71809a;margin-bottom:9px}
@media(max-width:520px){.ai-journey-area{margin-top:16px}.journey-edit-choices{grid-template-columns:1fr}.ai-journey-header{align-items:start}.ai-journey-draft{padding:12px}.ai-journey-tile{align-items:stretch}}
`;
const aiStyle=document.createElement('style');aiStyle.textContent=aiJourneyStyles;document.head.appendChild(aiStyle);
const beforeAiJourneyRender=render;
render=function(){beforeAiJourneyRender();renderJourneySources();renderGeneratedJourneys();};
createJourneyBuilder();