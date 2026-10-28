/* Pure planning rules. Grade values are context, never proof of a topic weakness. */
(function(root){
  'use strict';
  const normalize=x=>String(x||'').toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();
  const validGrade=x=>/^[1-6][+-]?$/.test(String(x||'').trim());
  function focus(records,errors,exams,now){
    const found=new Map();
    const date=now instanceof Date?now:new Date();
    const daysUntil=s=>s?Math.ceil((new Date(s+'T12:00:00')-date)/86400000):Infinity;
    for(const record of records||[]){
      if(!record||typeof record.subject!=='string')continue;
      for(const area of record.areas||[]){
        if(!area||area.status!=='approved'||typeof area.topic!=='string'||!area.topic.trim())continue;
        const key=record.subject+'|'+normalize(area.topic);
        const prev=found.get(key), exam=(exams||[]).find(e=>e.id===record.subject);
        const until=daysUntil(exam?.date),urgency=until>=0&&until<=14?2:0;
        const score=(area.priority==='high'?4:2)+urgency;
        if(prev){prev.score+=2;prev.count++;if(score>prev.strongest)prev.strongest=score;}
        else found.set(key,{subject:record.subject,topic:area.topic.trim().slice(0,85),reason:String(area.reason||'Aus einer korrigierten Arbeit').slice(0,260),hint:String(area.practiceHint||'Einige kurze Übungen dazu lösen').slice(0,250),score, strongest:score,count:1,kind:'assessment'});
      }
    }
    const errorCounts=new Map();
    for(const err of errors||[])if(err&&typeof err.subject==='string')errorCounts.set(err.subject,(errorCounts.get(err.subject)||0)+1);
    for(const [subject,count] of errorCounts){
      const key=subject+'|__quiz_errors';
      if(!found.has(key))found.set(key,{subject,topic:'Fehler aus bisherigen Übungen',reason:count+' noch offene Frage(n) in der Lernstelle',hint:'Bereits falsch beantwortete Fragen wiederholen',score:Math.min(7,1+count),strongest:0,count,kind:'review'});
    }
    return [...found.values()].sort((a,b)=>b.score-a.score||a.subject.localeCompare(b.subject)||a.topic.localeCompare(b.topic)).slice(0,12);
  }
  function sessions(items,start,count=5){
    const date=start instanceof Date?new Date(start):new Date();
    const out=[],unique=(items||[]).slice(0,6);
    if(!unique.length)return out;
    let day=0;
    while(out.length<count&&day<30){
      const d=new Date(date);d.setDate(d.getDate()+day++);if(d.getDay()===0||d.getDay()===6)continue;
      const item=unique[out.length%unique.length];
      out.push({...item,date:[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),minutes:15});
    }
    return out;
  }
  root.OskarAssessmentCore={focus,sessions,validGrade,normalize};
})(globalThis);
