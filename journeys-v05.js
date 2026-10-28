/* Oskars Lernstelle v0.5: thematische Entdeckerreise und belegte Fächerbrücken.
 * Video-Link ist redaktionell ausgewählt. Kein Scraping, keine Behauptung,
 * dass das Video die Beispielaufgaben oder die Schulmaterialien belegt. */
'use strict';
const JOURNEY_KEY = 'oskar-lernstelle-journeys-v1';
const WATER_JOURNEY = {
  id:'water', title:'Das Geheimnis des Wassers', question:'Warum ist Wasser so wertvoll?',
  videoTitle:'Das üble Geschäft mit Wasser',
  videoUrl:'https://www.youtube.com/watch?v=e-IlDMOaX8A',
  steps:[
    {id:'start',name:'Die Spur beginnt',icon:'🧭',type:'intro'},
    {id:'video',name:'Ein Blick hinter die Kulissen',icon:'🎬',type:'video'},
    {id:'math',name:'Das Wasserlabor',icon:'🧮',type:'quiz',subject:'math'},
    {id:'biology',name:'Pflanzen und Wasser',icon:'🌱',type:'quiz',subject:'biology'},
    {id:'geography',name:'Wasser auf der Welt',icon:'🌍',type:'quiz',subject:'geography'},
    {id:'final',name:'Deine Entdeckung',icon:'🏆',type:'reflection'}
  ]
};
const WATER_DEMO = {
  math:{q:'Drei Pflanzen erhalten jeweils 250 ml Wasser. Wie viel ist das insgesamt?',a:['500 ml','750 ml','1.250 ml','250 ml'],correct:1,why:'3 × 250 ml = 750 ml.'},
  biology:{q:'Welcher Teil einer Pflanze nimmt hauptsächlich Wasser aus dem Boden auf?',a:['Die Wurzeln','Die Blütenblätter','Die Früchte','Die Samen'],correct:0,why:'Die Wurzeln nehmen Wasser aus dem Boden auf.'},
  geography:{q:'Welche Größe zeigt auf einer Wetterkarte, wie viel Regen an einem Ort gefallen ist?',a:['Die Niederschlagsmenge','Die Zeitzone','Die Einwohnerzahl','Die Landesgrenze'],correct:0,why:'Die Niederschlagsmenge beschreibt, wie viel Regen oder anderer Niederschlag an einem Ort gefallen ist.'}
};
let journeyState={};
try {const raw=JSON.parse(localStorage.getItem(JOURNEY_KEY)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))journeyState=raw;}catch{}
function saveJourneyState(){try{localStorage.setItem(JOURNEY_KEY,JSON.stringify(journeyState));}catch{toast('Entdeckerreise konnte nicht gespeichert werden.');}}
function journeyDone(id){return !!journeyState[id]?.done;}
function setJourneyDone(id){if(journeyDone(id))return;journeyState[id]={...(journeyState[id]||{}),done:true};saveJourneyState();renderDiscoveries();}
function journeyUnlocked(id){if(id==='start')return true;if(id==='video')return journeyDone('start');if(id==='final')return ['math','biology','geography'].filter(journeyDone).length>=2;return journeyDone('video');}
function subjectMaterial(id){return store.materials.filter(m=>m.subject===id);}
function topicQuestion(id,topic){const words=topic==='water'?['wasser','pflanz','wurzel','regen','niederschlag','liter',' ml']:[];
 return realQuestions(id).find(q=>words.some(w=>(q.q+' '+q.why).toLocaleLowerCase('de-DE').includes(w)))||null;
}
function journeyQuiz(id){
 const sourced=topicQuestion(id,'water');if(sourced)return {question:sourced,isDemo:false};
 // Sind bereits Quellen vorhanden, darf keine Beispielfrage als Schulstoff ausgegeben werden.
 if(subjectMaterial(id).length)return null;
 return {question:WATER_DEMO[id],isDemo:true};
}
function createDiscoveries(){
 const panel=document.createElement('section');panel.className='discover-panel';panel.id='discoveries';
 panel.innerHTML=`<div class="panel-head"><h2>Entdeckerreisen</h2></div>
 <div class="journey-intro jmedia-intro"><img class="jmedia-img" loading="lazy" decoding="async" src="${JOURNEY_MEDIA_IMAGES.water.src}" alt="${JOURNEY_MEDIA_IMAGES.water.alt}"><div class="jmedia-intro-copy"><span class="journey-flag">Unsere erste Reise</span><h3>Das Geheimnis des Wassers</h3><p>Bilder, Videos und Rätsel – folge der Spur durch drei Schulfächer.</p><span class="journey-subjects">🧮 Mathe · 🌱 Biologie · 🌍 Erdkunde</span></div><span class="jmedia-intro-credit">CC0 · <a href="${JOURNEY_MEDIA_IMAGES.water.source}" target="_blank" rel="noopener noreferrer">Bildquelle</a></span></div>
 <div class="journey-progress"><div class="journey-progress-label"><strong id="journeyProgressText">0 von 6 Stationen</strong><span>Du bestimmst den Weg</span></div><div class="journey-progress-track"><div id="journeyProgressFill"></div></div></div>
 <div id="journeyMap" class="journey-map" aria-label="Stationen der Entdeckerreise"></div>
 `;
 $('learn').after(panel);
 const overlay=document.createElement('div');overlay.className='overlay';overlay.id='journeyOverlay';overlay.setAttribute('role','presentation');
 overlay.innerHTML='<section class="dialog journey-dialog" role="dialog" aria-modal="true" aria-labelledby="journeySceneTitle"><div class="dialog-head"><strong id="journeySceneHead">Entdeckerreise</strong><button type="button" class="close" id="closeJourney" aria-label="Entdeckerreise schließen">×</button></div><div class="dialog-content journey-scene" id="journeySceneBody"></div></section>';
 document.body.appendChild(overlay);
 $('journeyMap').addEventListener('click',e=>{const b=e.target.closest('[data-journey]');if(b)openJourney(b.dataset.journey);});
 // Die Interaktionen für fachübergreifende KI-Verbindungen steuert connections-v07.js.
 $('closeJourney').addEventListener('click',closeJourney);
 overlay.addEventListener('click',e=>{if(e.target===overlay)closeJourney();});
 $('journeySceneBody').addEventListener('click',onJourneyAction);
 renderDiscoveries();
}
function renderDiscoveries(){
 const done=WATER_JOURNEY.steps.filter(s=>journeyDone(s.id)).length;
 $('journeyProgressText').textContent=`${done} von 6 Stationen`;
 $('journeyProgressFill').style.width=(done/6*100)+'%';
 $('journeyMap').innerHTML=WATER_JOURNEY.steps.map((s,i)=>{
 const unlocked=journeyUnlocked(s.id),complete=journeyDone(s.id);
 const status=complete?'Erkundet':unlocked?'Erkunden':'Noch gesperrt';
 return `<div class="journey-node ${complete?'is-done':unlocked?'is-open':'is-locked'}">
 <div class="journey-node-number">${i+1}</div><button type="button" data-journey="${s.id}" ${unlocked?'':'disabled'} aria-label="${noHtml(s.name)}: ${status}"><span class="journey-node-icon">${complete?'✓':s.icon}</span>${journeyMediaThumb(s.subject?journeyMediaKey(s.name,s.subject):s.id==='final'?'earth':'water')}<span class="journey-node-copy"><strong>${noHtml(s.name)}</strong><small>${status}${s.subject?' · '+noHtml(subject(s.subject).name):''}</small></span><span aria-hidden="true">${unlocked?'›':'🔒'}</span></button></div>`;
 }).join('');
 // KI-Verbindungen werden im Hintergrund verwendet, ohne weitere Listen im Lernpfad.
}
function openJourney(stepId){if(!journeyUnlocked(stepId)){toast('Entdecke zuerst die vorherigen Stationen.');return;}
 const step=WATER_JOURNEY.steps.find(s=>s.id===stepId);if(!step)return;
 const scene=$('journeySceneBody');scene.dataset.step=stepId;
 $('journeySceneHead').textContent=`${step.icon} ${step.name}`;
 let html='';
 if(step.type==='intro')html='<div class="scene-badge">Deine Mission</div><h2 id="journeySceneTitle">Warum ist Wasser so wertvoll?</h2><p>Stell dir vor, du hast nur einen einzigen Kanister Wasser. Wofür brauchst du ihn zuerst? Pflanzen, Menschen und Tiere sind auf Wasser angewiesen.</p><p>Du gehst einer Frage nach und entdeckst, wie Mathe, Biologie und Erdkunde zusammenhängen.</p><button type="button" class="btn btn-green journey-action" data-jaction="complete">Spur aufnehmen</button>';
 else if(step.type==='video')html=`<div class="scene-badge">Video-Stopp · Vorschau empfohlen</div><h2 id="journeySceneTitle">Ein Video, viele Fragen</h2><p>Sieh dir einen geeigneten Ausschnitt aus „${noHtml(WATER_JOURNEY.videoTitle)}“ an. Frage dich: Wer nutzt Wasser? Warum kann es knapp oder teuer sein?</p><a href="${WATER_JOURNEY.videoUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline journey-link">Video bei YouTube öffnen ↗</a><p class="small">Simplicissimus richtet sich nicht speziell an Zehnjährige. Schau dir das Video am besten vorher selbst an. Du kannst auch ohne Video fortfahren.</p><button type="button" class="btn btn-green journey-action" data-jaction="complete">Weiter zu den Fachwegen</button>`;
 else if(step.type==='quiz'){
 const data=journeyQuiz(step.subject);const name=subject(step.subject).name;
 if(!data){html=`<div class="scene-badge">${noHtml(name)} · Material bereit</div><h2 id="journeySceneTitle">Eine passende Frage fehlt noch</h2><p>Für ${noHtml(name)} ist bereits Schulstoff gespeichert. Es gibt aber noch keine freigegebene Frage mit Bezug zu Wasser.</p><p>Öffne die Materialbibliothek, erzeuge eine Frage zu Wasser und gib sie nach dem Prüfen frei. Eine Demofrage würde hier nicht so tun, als stamme sie aus Oskars Heft.</p><button type="button" class="btn btn-outline" data-jaction="materials" data-subject="${step.subject}">Zur Materialbibliothek</button>`;}
 else{const q=data.question;
 html=`<div class="scene-badge">${noHtml(name)} · ${data.isDemo?'Beispielaufgabe':'Aus deinem Schulmaterial'}</div><h2 id="journeySceneTitle">${noHtml(q.q)}</h2><div class="journey-choices">${q.a.map((a,i)=>`<button type="button" data-janswer="${i}" class="journey-choice"><span>${i+1}</span>${noHtml(a)}</button>`).join('')}</div><div id="journeyAnswerFeedback" role="status" aria-live="polite"></div><button type="button" class="btn btn-green journey-action" data-jaction="check" data-subject="${step.subject}" disabled>Antwort prüfen</button><p class="small">${data.isDemo?'Beispielwissen: nicht aus Oskars Unterrichtsmaterial übernommen.':'Die Erklärung zeigt die hinterlegte Quelle.'}</p>`;
 }}
 else html=`<div class="scene-badge">Deine Entdeckung</div><h2 id="journeySceneTitle">Was haben die Fächer gemeinsam?</h2><p>Du hast unterschiedliche Blickwinkel erkundet. Erzähle in einem Satz, warum Mathe und Biologie beide beim Thema Wasser helfen können.</p><label for="journeyReflection">Mein Gedanke</label><textarea id="journeyReflection" rows="4" maxlength="500" placeholder="Zum Beispiel: Mit Mathe kann ich ... und in Biologie verstehe ich ...">${noHtml(journeyState.reflection||'')}</textarea><p class="small">Hier gibt es kein automatisches Richtig oder Falsch. Du kannst deinen Gedanken anschließend gemeinsam besprechen.</p><button type="button" class="btn btn-green journey-action" data-jaction="finish">Entdeckung abschließen</button>`;
 if(step.type==='video') {
  html=html.replace('<a href="'+WATER_JOURNEY.videoUrl+'"', '<div class="jmedia-video-grid"><div>'+journeyMediaVideo('simpli-water')+'</div><div>'+journeyMediaVideo('nasa-cycle')+'</div></div><a href="'+WATER_JOURNEY.videoUrl+'"');
 } else {
  const imageKey=step.subject?journeyMediaKey(step.name,step.subject):step.type==='reflection'?'earth':'water';
  html=journeyMediaImage(imageKey,step.type==='quiz'?'Dein '+subject(step.subject).name+'-Labor':step.type==='reflection'?'Deine große Entdeckung':'Dein Abenteuer beginnt')+html;
 }
 scene.innerHTML=html;
 $('journeyOverlay').classList.add('show');document.body.style.overflow='hidden';
}
function closeJourney(){$('journeySceneBody').replaceChildren();$('journeyOverlay').classList.remove('show');document.body.style.overflow='';}
function onJourneyAction(e){
 const choice=e.target.closest('[data-janswer]');if(choice){const scene=$('journeySceneBody');scene.dataset.answer=choice.dataset.janswer;scene.querySelectorAll('[data-janswer]').forEach(b=>b.classList.toggle('active',b===choice));scene.querySelector('[data-jaction="check"]').disabled=false;return;}
 const action=e.target.closest('[data-jaction]');if(!action)return;const stepId=$('journeySceneBody').dataset.step;
 if(action.dataset.jaction==='materials'){closeJourney();chooseSubject(action.dataset.subject);openMaterials('materials');return;}
 if(action.dataset.jaction==='complete'){setJourneyDone(stepId);closeJourney();if(stepId==='start')openJourney('video');return;}
 if(action.dataset.jaction==='check'){
 const data=journeyQuiz(action.dataset.subject);if(!data)return;
 const q=data.question,chosen=Number($('journeySceneBody').dataset.answer),correct=chosen===q.correct;
 const msg=$('journeyAnswerFeedback');
 msg.className='journey-feedback '+(correct?'success':'retry');
 msg.textContent=(correct?'Richtig. ':'Noch nicht. ')+q.why;
 if(correct){setJourneyDone(stepId);action.textContent='Weiter erkunden';action.dataset.jaction='continue';action.disabled=false;
 $('journeySceneBody').querySelectorAll('[data-janswer]').forEach(b=>b.disabled=true);
 }else{action.textContent='Noch einmal prüfen';action.disabled=true;delete $('journeySceneBody').dataset.answer;}
 return;
 }
 if(action.dataset.jaction==='continue'){closeJourney();return;}
 if(action.dataset.jaction==='finish'){
 const response=$('journeyReflection').value.trim();if(response.length<12){toast('Schreib erst einen kurzen Gedanken auf.');return;}
 journeyState.reflection=response;
 if(!journeyDone('final')){store.xp+=15;persist();}
 setJourneyDone('final');saveJourneyState();closeJourney();render();toast('Entdeckerreise abgeschlossen. +15 XP');
 }
}
const JOURNEY_STYLES=`
.discover-panel{scroll-margin-top:92px}.journey-intro{display:flex;align-items:center;gap:12px;justify-content:space-between;border-radius:21px;padding:20px 22px;background:linear-gradient(125deg,#e8f8fe,#f1eefd);margin-bottom:17px}
.journey-intro h3{font-size:23px;letter-spacing:-.5px;margin:5px 0 6px}.journey-intro p{font-size:14px;color:#536482;margin:0 0 10px}.journey-flag,.journey-subjects{font-weight:850;color:#5869ac;font-size:12px}.journey-illustration{font-size:60px;line-height:1}
.journey-progress-label{display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#697793;margin-bottom:8px}.journey-progress-label strong{color:#273b64}
.journey-progress-track{height:11px;border-radius:20px;overflow:hidden;background:#edf0f9}.journey-progress-track div{height:100%;background:linear-gradient(90deg,#38b884,#66cc9d);transition:width .24s ease}
.journey-map{position:relative;display:grid;gap:10px;padding:20px 4px 10px}.journey-map:before{content:'';position:absolute;top:29px;bottom:30px;left:29px;border-left:3px dashed #d5dfef}
.journey-node{display:flex;align-items:center;gap:8px;position:relative}.journey-node-number{width:49px;height:49px;flex:0 0 49px;display:grid;place-items:center;border-radius:50%;background:#fff;border:3px solid #cdd8ec;font-weight:900;color:#536582;z-index:1}
.journey-node.is-done .journey-node-number{background:#38b884;color:#fff;border-color:#38b884}.journey-node.is-open .journey-node-number{background:#e6f8ed;color:#138756;border-color:#77cda8}
.journey-node button{min-width:0;display:flex;align-items:center;gap:11px;text-align:left;flex:1;padding:10px 14px;border:1px solid #e5ebf5;background:#fff;border-radius:17px;color:#253654;font:inherit;box-shadow:0 4px 10px rgba(31,55,92,.03)}
.journey-node button:disabled{cursor:not-allowed;background:#f5f6fa;color:#8e9bb1;box-shadow:none}.journey-node.is-open button{border-color:#77cda8;background:#f6fcf8}.journey-node-icon{font-size:25px;width:34px;text-align:center}.journey-node-copy{flex:1;min-width:0;display:grid;gap:1px}.journey-node-copy strong{font-size:13px}.journey-node-copy small{font-size:11px;color:#7b8ba4}

.bridge-list{display:grid;gap:13px}.bridge-empty{background:#f7f9fd;border:1px dashed #d5dfef;border-radius:15px;padding:17px;color:#74829c;font-size:13px}.bridge-card{background:#fbfcff;border:1px solid #e1e9f5;border-radius:18px;padding:17px}.bridge-card>strong{font-size:15px}.bridge-card p{font-size:12px;color:#64738f;margin:6px 0}.bridge-sources{display:grid;gap:10px;margin:12px 0}.bridge-sources>div{padding:12px;background:#fff;border:1px solid #e7ecf4;border-radius:12px}.bridge-sources b{font-size:12px}.bridge-sources blockquote{border-left:3px solid #9dc9bd;font-size:12px;margin:5px 0 0;padding-left:9px;color:#5a6680}
.journey-dialog{max-width:610px}.journey-scene{overflow-y:auto}.journey-scene h2{font-size:24px;letter-spacing:-.6px;line-height:1.2;margin:6px 0 16px}.journey-scene p{color:#5c6b81;font-size:15px}.journey-scene .scene-badge{font-size:12px;font-weight:900;color:#239b70;letter-spacing:.2px}.journey-scene .journey-action{margin-top:14px}.journey-choices{display:grid;gap:9px;margin:18px 0}.journey-choice{border:2px solid #e4eaf4;background:#fff;border-radius:14px;padding:13px;text-align:left;color:#304060;display:flex;align-items:center;gap:10px;font:inherit;font-weight:700}.journey-choice span{border:1px solid #cad5e8;width:28px;height:28px;display:grid;place-items:center;border-radius:9px}.journey-choice.active{background:#eff1ff;border-color:#7f83ed}.journey-choice:disabled{cursor:default}.journey-feedback{border-radius:13px;padding:11px 13px;margin-top:8px;font-size:13px;font-weight:700}.journey-feedback.success{background:#e4f8eb;color:#16794e}.journey-feedback.retry{background:#fff2dd;color:#825a18}.journey-scene textarea{width:100%;border-radius:13px;border:1px solid #d5dfed;padding:12px}.journey-link{display:inline-block;text-decoration:none;margin:12px 0}
@media(max-width:560px){.journey-intro{padding:17px}.journey-intro h3{font-size:20px}.journey-illustration{font-size:47px}.journey-node button{padding:9px}.journey-node-copy strong{font-size:12px}}
`;
const journeyStyle=document.createElement('style');journeyStyle.textContent=JOURNEY_STYLES;document.head.appendChild(journeyStyle);
// Die beiden bestehenden Datenquellen bleiben die einzige Wahrheit für Schulstoff.
const renderBeforeJourneys=render;
render=function(){renderBeforeJourneys();renderDiscoveries();};
createDiscoveries();