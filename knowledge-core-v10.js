/* Pure data operations for the browser-local, source-grounded knowledge wiki. */
(function(root){
'use strict';
const normalize=x=>String(x||'').normalize('NFKC').toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();
const subjects=new Set(['math','biology','music','art','physics','history','geography','values']);
const str=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.length<=max;
const safeId=x=>str(x,1,100)&&/^[-a-zA-Z0-9_:.]+$/.test(x);
function digest(text){
 let a=2166136261,b=5381;
 for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
 return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
const revisions=new WeakMap();
function revision(source){
 const cached=revisions.get(source);
 if(cached&&cached.text===source.text&&cached.subject===source.subject)return cached.value;
 const value='v1:'+digest(String(source.subject||'')+'\n'+String(source.text||''));
 revisions.set(source,{text:source.text,subject:source.subject,value});return value;
}
const empty=()=>({version:1,contributions:[],processed:[],conflicts:[]});
function restore(raw,sources){
 const out=empty(),byId=new Map(sources.map(s=>[s.id,s]));
 if(!raw||raw.version!==1)return out;
 const ids=new Set();
 for(const c of Array.isArray(raw.contributions)?raw.contributions:[]){
  if(!c||!safeId(c.topicId)||!safeId(c.sourceId)||!byId.has(c.sourceId)||!subjects.has(c.subject)||byId.get(c.sourceId).subject!==c.subject||!str(c.title,2,100)||!str(c.summary,5,500)||!str(c.quote,10,350)||!/^v1:[0-9a-f]{16}$/.test(c.sourceRevision)||ids.has(c.topicId+'|'+c.sourceId))continue;
  ids.add(c.topicId+'|'+c.sourceId);
  out.contributions.push({topicId:c.topicId,sourceId:c.sourceId,sourceRevision:c.sourceRevision,subject:c.subject,title:c.title.trim(),summary:c.summary.trim(),quote:c.quote.trim(),terms:(Array.isArray(c.terms)?c.terms:[]).filter(t=>str(t,2,60)).slice(0,6),updatedAt:str(c.updatedAt,1,40)?c.updatedAt:''});
  if(out.contributions.length>=1200)break;
 }
 const processedIds=new Set();
 for(const p of Array.isArray(raw.processed)?raw.processed:[]){
  if(p&&safeId(p.sourceId)&&byId.has(p.sourceId)&&!processedIds.has(p.sourceId)&&/^v1:[0-9a-f]{16}$/.test(p.revision)){
   processedIds.add(p.sourceId);out.processed.push({sourceId:p.sourceId,revision:p.revision,updatedAt:String(p.updatedAt||'').slice(0,40)});
  }
 }
 for(const c of Array.isArray(raw.conflicts)?raw.conflicts:[]){
  if(!c||!safeId(c.topicId)||!safeId(c.sourceId)||!safeId(c.newSourceId)||!byId.has(c.sourceId)||!byId.has(c.newSourceId)||!str(c.quote,10,350)||!str(c.newQuote,10,350)||!str(c.reason,15,400)||!/^v1:[0-9a-f]{16}$/.test(c.sourceRevision)||!/^v1:[0-9a-f]{16}$/.test(c.newSourceRevision))continue;
  out.conflicts.push({topicId:c.topicId,sourceId:c.sourceId,newSourceId:c.newSourceId,quote:c.quote,newQuote:c.newQuote,reason:c.reason,sourceRevision:c.sourceRevision,newSourceRevision:c.newSourceRevision});
  if(out.conflicts.length>=100)break;
 }
 return out;
}
function validContribution(c,sources){
 const source=sources.find(s=>s.id===c.sourceId);
 return !!source&&source.subject===c.subject&&revision(source)===c.sourceRevision&&normalize(source.text).includes(normalize(c.quote));
}
function activeConflicts(state,sources){
 return state.conflicts.filter(c=>{
  const a=sources.find(s=>s.id===c.sourceId),b=sources.find(s=>s.id===c.newSourceId);
  return a&&b&&revision(a)===c.sourceRevision&&revision(b)===c.newSourceRevision&&normalize(a.text).includes(normalize(c.quote))&&normalize(b.text).includes(normalize(c.newQuote));
 });
}
function pages(state,sources){
 const groups=new Map(),conflicts=activeConflicts(state,sources);
 for(const c of state.contributions){
  if(!sources.some(s=>s.id===c.sourceId))continue;
  if(!groups.has(c.topicId))groups.set(c.topicId,{id:c.topicId,title:c.title,subject:c.subject,contributions:[],stale:[],terms:[],conflicts:[]});
  const p=groups.get(c.topicId);(validContribution(c,sources)?p.contributions:p.stale).push(c);
 }
 for(const page of groups.values()){
  page.terms=[...new Set(page.contributions.flatMap(c=>c.terms))];
  page.conflicts=conflicts.filter(c=>c.topicId===page.id);
  page.status=page.conflicts.length?'conflict':page.contributions.length?'ready':'outdated';
  page.sourceIds=[...new Set(page.contributions.map(c=>c.sourceId))];
 }
 return [...groups.values()].sort((a,b)=>a.title.localeCompare(b.title,'de'));
}
function pending(state,sources){
 return sources.filter(s=>str(s.text,30,30000)&&subjects.has(s.subject)&&!state.processed.some(p=>p.sourceId===s.id&&p.revision===revision(s)));
}
function applyAnalysis(state,source,result,sources,now=new Date().toISOString()){
 if(!safeId(source.id)||!subjects.has(source.subject))throw new Error('Ungültige Schulquelle.');
 const next=restore(state,sources),oldPages=pages(next,sources),known=new Map(oldPages.map(p=>[p.id,p]));
 const incoming=Array.isArray(result.topics)&&result.topics.length?result.topics:(Array.isArray(result.cards)?result.cards.map(c=>({title:c.term,summary:c.definition,quote:c.evidence,terms:[c.term],topicId:''})):[]);
 const entries=[],seen=new Set(),src=normalize(source.text);
 for(const row of incoming){
  if(!row||!str(row.title,2,100)||!str(row.summary,5,500)||!str(row.quote,10,350)||!src.includes(normalize(row.quote)))continue;
  let existing=row.topicId?known.get(row.topicId):null;
  if(row.topicId&&(!existing||existing.subject!==source.subject))continue;
  if(!existing)existing=oldPages.find(p=>p.subject===source.subject&&normalize(p.title)===normalize(row.title));
  const title=existing?.title||row.title.trim(),id=existing?.id||'topic-'+source.subject+'-'+digest(normalize(title));
  if(seen.has(id))continue;seen.add(id);
  entries.push({topicId:id,title,subject:source.subject,summary:row.summary.trim(),quote:row.quote.trim(),terms:(Array.isArray(row.terms)?row.terms:[]).filter(t=>str(t,2,60)&&src.includes(normalize(t))).slice(0,6),sourceId:source.id,sourceRevision:revision(source),updatedAt:now});
  if(entries.length>=10)break;
 }
 next.contributions=next.contributions.filter(c=>c.sourceId!==source.id).concat(entries);
 next.processed=next.processed.filter(p=>p.sourceId!==source.id).concat({sourceId:source.id,revision:revision(source),updatedAt:now});
 next.conflicts=next.conflicts.filter(c=>c.newSourceId!==source.id&&c.sourceId!==source.id);
 for(const row of Array.isArray(result.conflicts)?result.conflicts:[]){
  const previous=sources.find(s=>s.id===row?.sourceId),p=known.get(row?.topicId);
  if(!previous||!p||!p.contributions.some(c=>c.sourceId===previous.id)||!str(row.quote,10,350)||!normalize(previous.text).includes(normalize(row.quote))||!str(row.newQuote,10,350)||!src.includes(normalize(row.newQuote))||!str(row.reason,15,400))continue;
  next.conflicts.push({topicId:p.id,sourceId:previous.id,newSourceId:source.id,quote:row.quote.trim(),newQuote:row.newQuote.trim(),reason:row.reason.trim(),sourceRevision:revision(previous),newSourceRevision:revision(source)});
 }
 return next;
}
function topicContext(state,sources,source){
 const words=new Set(normalize(source.text).split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>=4));
 return pages(state,sources).filter(p=>p.status==='ready').map(p=>{
  const c=p.contributions.find(c=>c.sourceId!==source.id);
  const score=normalize(p.title+' '+p.terms.join(' ')).split(/[^\p{L}\p{N}]+/u).reduce((n,w)=>n+(words.has(w)?1:0),0)+(p.subject===source.subject?1:0);
  return c?{score,id:p.id,title:p.title,subject:p.subject,summary:c.summary,sourceId:c.sourceId,quote:c.quote}:null;
 }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,12).map(({score,...p})=>p);
}
function excerpt(source,quote,max=4000){
 const literal=String(quote).trim().split(/\s+/).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s+');
 const match=new RegExp(literal,'iu').exec(String(source.text));
 const at=match?.index??-1,start=at<0?0:Math.max(0,at-600);
 return source.text.slice(start,start+max);
}
function topicSources(page,sources){
 if(!page||page.status!=='ready')return [];
 return page.sourceIds.slice(0,4).map(id=>{
  const source=sources.find(s=>s.id===id),c=page.contributions.find(c=>c.sourceId===id);
  return {id:source.id,subject:source.subject,title:String(source.title||'Schulquelle').slice(0,120),text:excerpt(source,c.quote)};
 });
}
const stop=new Set(['wie','was','ist','die','der','das','den','dem','des','und','mit','für','von','auf','aus','ein','zum','zur','hat','bei','als','nur','mir','wir','uns','ich','eine','einer','eines','einem','einen','euch','auch','diese','dieser','dieses','kann','kannst','bitte','erkläre','erklären','warum','welche','welcher','welches','werden','wurde','wird','sind','mein','meine','deine','denn','noch','über','unter','dass','sich','hier','habe','haben','können','beim']);
function search(state,sources,query){
 const tokens=normalize(query).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=3&&!stop.has(w));
 const all=pages(state,sources);
 if(!tokens.length)return all;
 return all.map(p=>{
  const hay=normalize(p.title+' '+p.terms.join(' ')+' '+p.contributions.map(c=>c.summary).join(' '));
  const score=tokens.reduce((n,t)=>n+(hay.includes(t)?1:0),0);
  return {p,score};
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).map(x=>x.p);
}
function questionSources(state,sources,question,topicId=''){
 const found=topicId?pages(state,sources).filter(p=>p.id===topicId&&p.status==='ready'):search(state,sources,question).filter(p=>p.status==='ready');
 const out=[],seen=new Set();
 for(const page of found)for(const source of topicSources(page,sources)){
  if(seen.has(source.id))continue;seen.add(source.id);out.push(source);
  if(out.length===4)return out;
 }
 return out;
}
function validTask(task,sources){
 const source=sources.find(s=>s.id===task.sourceId&&s.subject===task.subject);
 return !!source&&str(task.evidence,10,350)&&normalize(source.text).includes(normalize(task.evidence))&&(!task.sourceRevision||task.sourceRevision===revision(source));
}
function audit(state,sources){
 return {pending:pending(state,sources),outdated:state.contributions.filter(c=>!validContribution(c,sources)),conflicts:activeConflicts(state,sources)};
}
root.OskarKnowledgeCore=Object.freeze({normalize,revision,empty,restore,validContribution,activeConflicts,pages,pending,applyAnalysis,topicContext,topicSources,questionSources,search,validTask,audit});
})(globalThis);
