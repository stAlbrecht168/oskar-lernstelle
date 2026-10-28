/* Automatische KI-Verbindungen für Oskars Schulmaterialien.
 * Die Quellen bleiben lokal, bis eine konfigurierte KI-Verbindung sie nach dem Speichern analysiert.
 * Alle Textbelege werden auch im Browser gegen die Originalquellen geprüft. */
'use strict';
const CONNECTIONS_KEY='oskar-subject-connections-v1';
let connectionsCache=null,connectionsBusy=false,connectionsQueued=false;
try{
 const value=JSON.parse(localStorage.getItem(CONNECTIONS_KEY)||'null');
 if(value&&typeof value.signature==='string'&&Array.isArray(value.connections))connectionsCache=value;
}catch{}
const connectionNorm=s=>String(s||'').toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();
function connectionSources(){
 const eligible=store.materials.filter(m=>m&&typeof m.id==='string'&&typeof m.text==='string'&&m.text.trim().length>=40&&typeof m.title==='string'&&subject(m.subject));
 if(new Set(eligible.map(m=>m.subject)).size<2)return [];
 const last=eligible[eligible.length-1];
 const other=[...eligible].reverse().find(m=>m.subject!==last.subject);
 if(!other)return [];
 const chosen=[last,other];
 for(const m of [...eligible].reverse()){
   if(chosen.length>=4)break;
   if(!chosen.some(x=>x.id===m.id))chosen.push(m);
 }
 return chosen.reverse().map(m=>({id:m.id,subject:m.subject,title:m.title.slice(0,120),text:m.text.slice(0,3500)}));
}
function connectionSignature(sources){
 const raw=sources.map(s=>[s.id,s.subject,s.title,s.text].join(':')).join('\n');
 let h=2166136261;for(let i=0;i<raw.length;i++)h=Math.imul(h^raw.charCodeAt(i),16777619);
 return 'v1:'+raw.length+':'+(h>>>0).toString(16);
}
function validAiConnection(item,sources){
 if(!item||typeof item.title!=='string'||typeof item.sharedIdea!=='string'||typeof item.howToCombine!=='string'||typeof item.challenge!=='string'||!Array.isArray(item.evidence))return false;
 const byId=new Map(sources.map(x=>[x.id,x])),seen=new Set(),subjects=new Set();
 if(item.title.trim().length<4||item.sharedIdea.trim().length<15||item.howToCombine.trim().length<20||item.challenge.trim().length<12)return false;
 for(const e of item.evidence){
   const src=byId.get(e?.sourceId);
   if(!src||seen.has(src.id)||e.subject!==src.subject||typeof e.quote!=='string'||e.quote.length<10||!connectionNorm(src.text).includes(connectionNorm(e.quote)))return false;
   seen.add(src.id);subjects.add(src.subject);
 }
 return seen.size>=2&&subjects.size>=2;
}
function connectionConfig(){
 const endpoint=$('aiEndpoint')?.value.trim().replace(/\/+$/,'')||'';
 const token=$('aiToken')?.value.trim()||'';
 return {endpoint,token,ready:/^https:\/\/[^\s/]+/.test(endpoint)&&token.length>0};
}
function connectionStatus(message,action=''){
 const list=$('bridgeList');if(!list)return;
 list.innerHTML='<div class="bridge-empty" role="status">'+noHtml(message)+(action?'<div style="margin-top:12px"><button class="btn btn-outline btn-mini" type="button" data-connection-action="'+action+'">'+(action==='settings'?'KI-Dienst verbinden':'Erneut analysieren')+'</button></div>':'')+'</div>';
}
function renderAiConnections(){
 const list=$('bridgeList');if(!list)return;
 const sources=connectionSources();
 if(sources.length<2){connectionStatus('Füge zunächst mindestens zwei längere Schulquellen aus unterschiedlichen Fächern hinzu.');return;}
 const signature=connectionSignature(sources);
 if(connectionsBusy){connectionStatus('Die KI untersucht mögliche Zusammenhänge und prüft die Textbelege …');return;}
 if(connectionsCache?.signature===signature){
   if(connectionsCache.error){connectionStatus('KI-Analyse nicht möglich: '+connectionsCache.error,'retry');return;}
   if(!connectionsCache.connections.length){connectionStatus('Die KI hat in diesen Quellen keine ausreichend belegbare fachliche Verbindung gefunden. Das ist kein Fehler.');return;}
   const approved=connectionsCache.connections.filter(c=>validAiConnection(c,sources));
   if(!approved.length){connectionStatus('Quellenbelege passen nicht mehr zum gespeicherten Vorschlag. Die KI muss erneut prüfen.','retry');return;}
   list.innerHTML=approved.map((c,i)=>'<article class="bridge-card"><strong>🔗 '+noHtml(c.title)+'</strong><p><b>Gemeinsame Idee:</b> '+noHtml(c.sharedIdea)+'</p><p><b>So hilft ein Fach dem anderen:</b> '+noHtml(c.howToCombine)+'</p><div class="bridge-sources">'+c.evidence.map(e=>{const m=sources.find(s=>s.id===e.sourceId);return '<div><b>'+noHtml(subject(e.subject)?.name||e.subject)+' · '+noHtml(m?.title||'Quelle')+'</b><blockquote>„'+noHtml(e.quote)+'“</blockquote></div>';}).join('')+'</div><p><b>Entdeckerfrage:</b> '+noHtml(c.challenge)+'</p><p class="small">KI-Vorschlag, bitte fachlich prüfen. Die Zitate stammen aus den gespeicherten Schultexten.</p><button class="btn btn-outline btn-mini" type="button" data-connection-action="journey" data-connection-index="'+i+'">Entdeckerreise daraus planen</button></article>').join('');
   return;
 }
 if(!connectionConfig().ready){connectionStatus('Zwei Fächer sind bereit. Verbinde einmal den KI-Dienst in der Materialbibliothek, dann startet die Analyse beim Hinzufügen neuer Quellen automatisch.','settings');return;}
 connectionStatus('Neue Quellen warten auf die automatische KI-Analyse …');
}
let connectionsTimer=null;
function scheduleAiConnections(){if(connectionsTimer)clearTimeout(connectionsTimer);connectionsTimer=setTimeout(()=>{connectionsTimer=null;autoAnalyzeConnections();},1800);renderAiConnections();}
async function autoAnalyzeConnections(force=false){
 const sources=connectionSources(),signature=connectionSignature(sources);
 if(sources.length<2){renderAiConnections();return;}
 if(!force&&connectionsCache?.signature===signature&&!connectionsCache.error){renderAiConnections();return;}
 const config=connectionConfig();
 if(!config.ready){renderAiConnections();return;}
 if(connectionsBusy){connectionsQueued=true;return;}
 connectionsBusy=true;renderAiConnections();
 try{
   const response=await fetch(config.endpoint+'/connections',{
     method:'POST',headers:{authorization:'Bearer '+config.token,'content-type':'application/json'},
     body:JSON.stringify({sources}),signal:AbortSignal.timeout(45000)
   });
   let data;try{data=await response.json();}catch{throw new Error('Der KI-Dienst hat keine gültige Antwort geliefert.');}
   if(!response.ok)throw new Error(data.error||'Der KI-Dienst meldet Fehler '+response.status);
   if(!Array.isArray(data.connections))throw new Error('Die KI-Antwort enthält keine Verbindungsliste.');
   const clean=data.connections.slice(0,3).filter(c=>validAiConnection(c,sources));
   // Keine alten Ergebnisse auf neuere, zwischenzeitlich gespeicherte Materialien anwenden.
   if(connectionSignature(connectionSources())===signature){
     connectionsCache={signature,connections:clean,updatedAt:new Date().toISOString()};
     if(window.oskarLocal?.isReady())window.oskarLocal.snapshot();else localStorage.setItem(CONNECTIONS_KEY,JSON.stringify(connectionsCache));
   }else connectionsQueued=true;
 }catch(error){
   if(connectionSignature(connectionSources())===signature){
     connectionsCache={signature,connections:[],error:String(error.message||'Unbekannter Fehler').slice(0,180)};
   }else connectionsQueued=true;
 }finally{
   connectionsBusy=false;renderAiConnections();
   if(connectionsQueued){connectionsQueued=false;autoAnalyzeConnections();}
 }
}
function planJourneyFromConnection(index){
 const sources=connectionSources(),signature=connectionSignature(sources);
 if(connectionsCache?.signature!==signature)return;
 const c=connectionsCache.connections.filter(item=>validAiConnection(item,sources))[index];
 if(!c||!$('journeyBuilder'))return;
 $('journeyBuilder').hidden=false;
 renderJourneySources();
 const ids=new Set(c.evidence.map(e=>e.sourceId));
 $('journeySourcePicker').querySelectorAll('input[type="checkbox"]').forEach(input=>{input.checked=ids.has(input.value);});
 $('journeyTopic').value=c.title.slice(0,120);
 $('journeyBuilder').scrollIntoView({behavior:'smooth',block:'center'});
 $('journeyTopic').focus({preventScroll:true});
}
$('bridgeList')?.addEventListener('click',event=>{
 const b=event.target.closest('[data-connection-action]');if(!b)return;
 if(b.dataset.connectionAction==='settings'){openMaterials('materials');$('aiEndpoint').focus();return;}
 if(b.dataset.connectionAction==='retry'){connectionsCache=null;autoAnalyzeConnections(true);return;}
 if(b.dataset.connectionAction==='journey')planJourneyFromConnection(Number(b.dataset.connectionIndex));
});
$('aiToken')?.addEventListener('change',()=>autoAnalyzeConnections());
$('aiEndpoint')?.addEventListener('change',()=>autoAnalyzeConnections());
$('materialsList')?.addEventListener('click',e=>{
 if(e.target.closest('[data-remove]'))queueMicrotask(()=>autoAnalyzeConnections());
});
renderAiConnections();
autoAnalyzeConnections();
