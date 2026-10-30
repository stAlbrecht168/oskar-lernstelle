/** Runs only in the authorized deployment job, using its existing family access secret. */
import assert from 'node:assert/strict';
import {cleanWikiTopics,cleanKnowledgeAnswer} from '../knowledge.js';
import {cleanTasks} from '../index.js';
const endpoint=process.env.WORKER_URL;
const access=process.env.ACCESS_TOKEN;
assert.equal(endpoint,'https://oskar-lernstelle-ai.sha-2d1.workers.dev','Unexpected Worker address');
assert.ok(access,'Missing runtime access token');
const origin='https://stalbrecht168.github.io';
async function call(path,body){
 const response=await fetch(endpoint+path,{method:body?'POST':'GET',headers:{origin,authorization:'Bearer '+access,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(65000)});
 assert.ok(response.ok,'Worker returned HTTP '+response.status+' for '+path);
 return response.json();
}
// Invented school text only. Never print tokens, request bodies or model passages.
const source={id:'deployment-smoke',subject:'music',title:'Erfundener Prüftext',text:'Eine ganze Note dauert vier Viertelschläge. Eine halbe Note dauert zwei Viertelschläge. Eine Viertelnote dauert einen Viertelschlag. Zwei halbe Noten dauern zusammen so lange wie eine ganze Note.'};
const health=await call('/health');
assert.equal(health.configured,true);assert.equal(health.knowledgeWiki,true);
console.log('Worker reachable; runtime secrets and knowledge endpoints configured.');
const generated=await call('/generate',{subject:'Musik',subjectId:'music',text:source.text,existingTopics:[]});
assert.ok(cleanWikiTopics(generated.topics,source.text,[],'music').length>0,'No grounded topic returned');
assert.ok(cleanTasks(generated.tasks,source.text).length>0,'No grounded exercise returned');
console.log('Live topic generation and source evidence verified.');
const answered=await call('/knowledge-ask',{question:'Wie lange dauert eine ganze Note?',sources:[source]});
assert.ok(cleanKnowledgeAnswer(answered,[source]),'Answer evidence is invalid');
assert.equal(answered.insufficient,false);
console.log('Live question answer and citations verified.');
const practiced=await call('/topic-practice',{topic:'Notenwerte',sources:[source]});
assert.ok(practiced.tasks.some(t=>t.sourceId===source.id&&cleanTasks([t],source.text).length),'No grounded topic practice returned');
console.log('Live topic practice verified. No personal school material used.');
