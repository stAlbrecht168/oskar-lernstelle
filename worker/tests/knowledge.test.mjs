import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../index.js';
import {cleanTopicContext,cleanWikiTopics,cleanWikiConflicts,cleanKnowledgeSources,cleanKnowledgeAnswer} from '../knowledge.js';
const origin='https://stalbrecht168.github.io';
const env={OPENAI_API_KEY:'test-key',ACCESS_TOKEN:'test-token',ALLOWED_ORIGIN:origin};
const source={id:'source-a',subject:'music',title:'Notenwerte',text:'Eine ganze Note dauert vier Viertelschläge. Eine halbe Note dauert zwei Viertelschläge.'};
const query=(path,body,token='test-token')=>new Request('https://example.workers.dev'+path,{method:'POST',headers:{origin,authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
const topic={topicId:'topic-music-123',title:'Notenwerte',summary:'Eine ganze Note dauert vier Viertelschläge.',quote:'Eine ganze Note dauert vier Viertelschläge.',terms:['Note']};
const context=[{id:topic.topicId,subject:'music',title:'Notenwerte',summary:topic.summary,sourceId:source.id,quote:topic.quote}];
test('existing wiki context is bounded and validates IDs and subjects',()=>{
 assert.equal(cleanTopicContext(context).length,1);
 assert.equal(cleanTopicContext([...context,...context]),null);
 assert.equal(cleanTopicContext([{...context[0],subject:'unknown'}]),null);
});
test('only quoted topic contributions can reuse an existing topic in the same subject',()=>{
 assert.equal(cleanWikiTopics([topic],source.text,context,'music').length,1);
 assert.equal(cleanWikiTopics([topic],source.text,context,'math').length,0);
 assert.equal(cleanWikiTopics([{...topic,quote:'Dieser Satz steht nicht in der Quelle.'}],source.text,context,'music').length,0);
});
test('a possible contradiction needs a real quote from both specified sources',()=>{
 const text='Eine ganze Note dauert acht Viertelschläge.';
 const conflict={topicId:topic.topicId,sourceId:source.id,quote:topic.quote,newQuote:text,reason:'Die Quellen nennen verschiedene Werte.'};
 assert.equal(cleanWikiConflicts([conflict],text,context).length,1);
 assert.equal(cleanWikiConflicts([{...conflict,sourceId:'fake'}],text,context).length,0);
});
test('knowledge question answers cannot cite nonexistent sources',()=>{
 assert.equal(cleanKnowledgeSources([source]).length,1);
 assert.equal(cleanKnowledgeAnswer({answer:'Eine ganze Note dauert vier Viertelschläge.',insufficient:false,evidence:[]},[source]),null);
 assert.equal(cleanKnowledgeAnswer({answer:'Eine ganze Note dauert vier Viertelschläge.',insufficient:false,evidence:[{sourceId:'fake',quote:topic.quote}]},[source]),null);
 assert.equal(cleanKnowledgeAnswer({answer:'Dazu fehlen passende Schulquellen.',insufficient:true,evidence:[]},[source]).insufficient,true);
});
test('new endpoints authenticate before any model access',async()=>{
 for(const path of ['/knowledge-ask','/topic-practice']){
  const response=await worker.fetch(query(path,{sources:[source],question:'Was ist eine ganze Note?',topic:'Notenwerte'},'wrong'),env);
  assert.equal(response.status,401);
 }
});
test('topic practice discards fabricated source assignments',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({tasks:[{sourceId:'fake',type:'choice',question:'Wie lange dauert die ganze Note?',options:['Vier','Zwei','Eins'],correctIndex:0,explanation:'Der Text nennt vier Viertelschläge.',evidence:topic.quote}]})}]}]});
  const response=await worker.fetch(query('/topic-practice',{sources:[source],topic:'Notenwerte'}),env);
  assert.equal(response.status,422);
 }finally{globalThis.fetch=old;}
});
test('a successful grounded answer uses the Responses schema and does not store inputs',async()=>{
 const old=globalThis.fetch;let sent;
 try{
  globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');sent=JSON.parse(options.body);return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({answer:'Eine ganze Note dauert vier Viertelschläge.',insufficient:false,evidence:[{sourceId:source.id,quote:topic.quote}]})}]}]});};
  const response=await worker.fetch(query('/knowledge-ask',{sources:[source],question:'Wie lange dauert eine ganze Note?'}),env);
  assert.equal(response.status,200);assert.equal((await response.json()).evidence[0].sourceId,source.id);
  assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);
 }finally{globalThis.fetch=old;}
});
test('incomplete model output is not accepted as saved knowledge',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json({status:'incomplete',output:[{content:[{type:'output_text',text:JSON.stringify({answer:'Eine ganze Note dauert vier Viertelschläge.',insufficient:false,evidence:[{sourceId:source.id,quote:topic.quote}]})}]}]});
  const response=await worker.fetch(query('/knowledge-ask',{sources:[source],question:'Wie lange dauert eine ganze Note?'}),env);
  assert.equal(response.status,502);
 }finally{globalThis.fetch=old;}
});
