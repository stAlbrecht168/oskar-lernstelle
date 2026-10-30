import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{cleanCards,cleanTasks,cleanSources,cleanJourney,cleanConnections} from '../index.js';
const origin='https://stalbrecht168.github.io';
const env={OPENAI_API_KEY:'test-api-key',ACCESS_TOKEN:'test-token',ALLOWED_ORIGIN:origin,OPENAI_MODEL:'gpt-5-mini'};
const passage='Eine ganze Note dauert vier Viertelschläge. Eine halbe Note dauert zwei Viertelschläge. Die Viertelnote dauert einen Viertelschlag.';
const query=(path,method='POST',payload={subject:'Musik',text:passage},code='test-token')=>new Request('https://test.workers.dev'+path,{method,headers:{Origin:origin,Authorization:'Bearer '+code,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(payload)}:{})});
test('CORS weist andere Websites ab',async()=>{const r=await worker.fetch(new Request('https://test.workers.dev/health',{headers:{origin:'https://evil.example'}}),env);assert.equal(r.status,403);});
test('Health zeigt fehlende Konfiguration',async()=>{const r=await worker.fetch(query('/health','GET'),{ALLOWED_ORIGIN:origin});assert.deepEqual(await r.json(),{ok:true,configured:false,journeyGenerator:true,crossSubjectConnections:true});});
test('ohne Familientoken kein OpenAI-Aufruf',async()=>{const r=await worker.fetch(query('/generate','POST',undefined,'wrong'),env);assert.equal(r.status,401);});
test('nur belegte Aufgaben und Karten akzeptieren',()=>{const sample=[{type:'choice',question:'Wie lange dauert eine ganze Note?',options:['Vier Schläge','Zwei Schläge'],correctIndex:0,explanation:'Laut Material vier Schläge.',evidence:'Eine ganze Note dauert vier Viertelschläge.'},{type:'choice',question:'Was ist ein Lügner?',options:['a','b'],correctIndex:0,explanation:'Unbelegt im Material und falsch.',evidence:'Es gibt keinen Beleg für diese Antwort.'}];assert.equal(cleanTasks(sample,passage).length,1);assert.equal(cleanCards([{term:'Ganze Note',definition:'Vier Viertelschläge.',evidence:'Eine ganze Note dauert vier Viertelschläge.'}],passage).length,1);});
test('liefert Aufgaben, ohne unbestätigte Antworten automatisch freizugeben',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({cards:[{term:'Ganze Note',definition:'Vier Viertelschläge.',evidence:'Eine ganze Note dauert vier Viertelschläge.'}],tasks:[{type:'true_false',question:'Eine ganze Note dauert vier Viertelschläge.',options:['Richtig','Falsch'],correctIndex:0,explanation:'Der Quelltext nennt vier Viertelschläge.',evidence:'Eine ganze Note dauert vier Viertelschläge.'}]})}]}]});const r=await worker.fetch(query('/generate'),env);assert.equal(r.status,200);const j=await r.json();assert.equal(j.tasks.length,1);assert.equal(j.cards.length,1);assert.equal(j.reviewRequired,true);}finally{globalThis.fetch=old;}});

const journeySources=[{id:'math-water',subject:'math',title:'Maßeinheiten',text:'Wassermengen werden in Litern und Millilitern gemessen. Ein Liter entspricht 1000 Millilitern. Zwei Liter entsprechen 2000 Millilitern.'},{id:'biology-water',subject:'biology',title:'Pflanzen',text:'Pflanzen brauchen Wasser zum Leben. Die Wurzeln nehmen Wasser aus dem Boden auf. Ohne Wasser können Pflanzen welken.'}];
const journeyAnswer={title:'Die Wasserforscher',guidingQuestion:'Warum müssen wir Wasser messen?',hook:'Stell dir einen kleinen Garten vor, in dem Wasser knapp ist.',connection:'Mit Mathe messen wir die Mengen; in Biologie verstehen wir, warum Pflanzen Wasser brauchen.',reflectionPrompt:'Wie hilft das Rechnen beim Gießen?',stations:[{sourceId:'math-water',subject:'math',heading:'Wasser messen',context:'Wie viel passt in die Gießkanne?',question:'Wie viele Milliliter sind ein Liter?',options:['100 Milliliter','1000 Milliliter','10 Milliliter'],correctIndex:1,explanation:'Im Material steht: Ein Liter entspricht 1000 Millilitern.',evidence:'Ein Liter entspricht 1000 Millilitern.'},{sourceId:'biology-water',subject:'biology',heading:'Wurzeln auf Spurensuche',context:'Wo holen Pflanzen ihr Wasser her?',question:'Welcher Pflanzenteil nimmt Wasser aus dem Boden auf?',options:['Die Früchte','Die Blüten','Die Wurzeln'],correctIndex:2,explanation:'Die Quelle sagt, dass die Wurzeln Wasser aufnehmen.',evidence:'Die Wurzeln nehmen Wasser aus dem Boden auf.'}]};
test('Reisen erfordern mehrere Fächer und belegte Quellen',()=>{assert.equal(cleanSources(journeySources).length,2);assert.equal(cleanSources([journeySources[0],{...journeySources[1],subject:'math'}]),null);assert.equal(cleanJourney(journeyAnswer,journeySources).stations.length,2);assert.equal(cleanJourney({...journeyAnswer,stations:journeyAnswer.stations.map(x=>({...x,evidence:'Diesen Satz gibt es nicht.'}))},journeySources),null);});
test('Reise wird als ungeprüfter Entwurf zurückgegeben',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(journeyAnswer)}]}]});const r=await worker.fetch(query('/journey','POST',{topic:'Wasser',sources:journeySources}),env);assert.equal(r.status,200);const j=await r.json();assert.equal(j.reviewRequired,true);assert.equal(j.videosAnalyzed,false);assert.equal(j.journey.stations.length,2);}finally{globalThis.fetch=old;}});
test('Reiseaufruf ohne Token verweigert und vor OpenAI validiert',async()=>{const r=await worker.fetch(query('/journey','POST',{topic:'Wasser',sources:journeySources},'wrong'),env);assert.equal(r.status,401);const invalid=await worker.fetch(query('/journey','POST',{topic:'Wasser',sources:[journeySources[0]]}),env);assert.equal(invalid.status,400);});

const connectionsAnswer={connections:[{
 title:'Wasser messen und Pflanzen versorgen',
 sharedIdea:'Die Menge an Wasser ist für die Pflanze entscheidend.',
 howToCombine:'In Mathe berechnest du benötigte Wassermengen. Biologie erklärt, wozu Pflanzen Wasser benötigen.',
 challenge:'Wie viel Wasser ist für drei Pflanzen nötig, wenn jede 250 Milliliter braucht?',
 evidence:[
   {sourceId:'math-water',subject:'math',quote:'Ein Liter entspricht 1000 Millilitern.'},
   {sourceId:'biology-water',subject:'biology',quote:'Die Wurzeln nehmen Wasser aus dem Boden auf.'}
 ]
}]};
test('KI-Fachverbindungen verlangen zwei echte Textzitate aus unterschiedlichen Fächern',()=>{
  assert.equal(cleanConnections(connectionsAnswer,journeySources).length,1);
  const badQuote=structuredClone(connectionsAnswer);badQuote.connections[0].evidence[1].quote='Erfundenes Zitat, das nirgends vorkommt.';
  assert.equal(cleanConnections(badQuote,journeySources).length,0);
  const sameSubject=structuredClone(connectionsAnswer);sameSubject.connections[0].evidence[1].subject='math';
  assert.equal(cleanConnections(sameSubject,journeySources).length,0);
  assert.deepEqual(cleanConnections({connections:[]},journeySources),[]);
});
test('KI-Fachverbindungen werden nur aus zulässigen Quellen erzeugt',async()=>{
  const wrong=await worker.fetch(query('/connections','POST',{sources:journeySources},'wrong'),env);
  assert.equal(wrong.status,401);
  const invalid=await worker.fetch(query('/connections','POST',{sources:[journeySources[0]]}),env);
  assert.equal(invalid.status,400);
});
test('KI-Fachverbindungen liefern Quellenangaben und keine automatisch benoteten Aufgaben',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(connectionsAnswer)}]}]});
    const response=await worker.fetch(query('/connections','POST',{sources:journeySources}),env);
    assert.equal(response.status,200);
    const json=await response.json();
    assert.equal(json.connections.length,1);
    assert.equal(json.connections[0].evidence.length,2);
    assert.equal(json.reviewRecommended,true);
    assert.equal(json.source,'provided_material');
  }finally{globalThis.fetch=old;}
});
test('KI kann ohne belegbare Überschneidung eine leere Vorschlagsliste zurückgeben',async()=>{
  const old=globalThis.fetch;
  try{
    globalThis.fetch=async()=>Response.json({output:[{content:[{type:'output_text',text:'{"connections":[]}'}]}]});
    const response=await worker.fetch(query('/connections','POST',{sources:journeySources}),env);
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).connections,[]);
  }finally{globalThis.fetch=old;}
});

test('malformed model envelopes and JSON roots return a readable 502 instead of throwing',async()=>{
 const old=globalThis.fetch;
 try{
  for(const payload of [null,{output:{}},{output:[{content:{}}]},
   {output:[{content:[null,{type:'output_text',text:'null'}]}]},
   {output:[{content:[{type:'output_text',text:'[]'}]}]},
   {output:[{content:[{type:'output_text',text:'{'}]}]}]){
   globalThis.fetch=async()=>Response.json(payload);
   const response=await worker.fetch(query('/generate'),env);
   assert.equal(response.status,502);assert.equal(typeof (await response.json()).error,'string');
  }
 }finally{globalThis.fetch=old;}
});
test('null and array request bodies are rejected before any model call',async()=>{
 const old=globalThis.fetch;let called=false;
 try{
  globalThis.fetch=async()=>{called=true;throw Error('must not call a model');};
  for(const body of [null,[]])assert.equal((await worker.fetch(query('/generate','POST',body),env)).status,400);
  assert.equal(called,false);
 }finally{globalThis.fetch=old;}
});
