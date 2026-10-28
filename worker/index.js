/**
 * Optional, private AI gateway for Oskars Lernstelle.
 * Deploy separately as Cloudflare Worker; secrets are not committed.
 * Security: shared ACCESS_TOKEN is a family-only MVP gate, not user management.
 */
const reply=(body,status=200,origin='')=>new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json; charset=utf-8',
    'access-control-allow-origin':origin||'null',
    'access-control-allow-methods':'POST, OPTIONS',
    'access-control-allow-headers':'content-type, authorization',
    'cache-control':'no-store','vary':'Origin',
    'x-content-type-options':'nosniff'}
});
const schema={type:'object',additionalProperties:false,required:['cards'],properties:{cards:{type:'array',items:{type:'object',additionalProperties:false,required:['term','definition','evidence'],properties:{term:{type:'string'},definition:{type:'string'},evidence:{type:'string'}}}}}};
const normalized = text => text.toLocaleLowerCase('de-DE').replace(/\s+/g,' ').trim();
export default {
  async fetch(request,env){
    const origin=request.headers.get('origin')||'';
    const allowed=env.ALLOWED_ORIGIN||'https://stalbrecht168.github.io';
    if(origin!==allowed)return reply({error:'Origin ist nicht freigegeben.'},403);
    const path=new URL(request.url).pathname;
    if(path!=='/generate')return reply({error:'Nicht gefunden'},404,origin);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type, authorization','vary':'Origin'}});
    if(request.method!=='POST')return reply({error:'Nur POST erlaubt'},405,origin);
    if(!env.OPENAI_API_KEY||!env.ACCESS_TOKEN)return reply({error:'Server nicht konfiguriert.'},503,origin);
    const supplied=request.headers.get('authorization')||'';
    if(supplied!=='Bearer '+env.ACCESS_TOKEN)return reply({error:'Nicht autorisiert'},401,origin);
    if(Number(request.headers.get('content-length')||0)>34000)return reply({error:'Text ist zu groß'},413,origin);
    let body;
    try{body=await request.json();}catch{return reply({error:'Ungültiges JSON'},400,origin);}
    const subject=String(body?.subject||'').slice(0,80),text=String(body?.text||'').slice(0,18000);
    if(!subject||text.trim().length<30)return reply({error:'Zu wenig Quelltext oder kein Fach'},400,origin);
    const prompt='Du entwickelst altersgerechte Wissenskarten für die 5. Klasse in Niedersachsen. Extrahiere bis zu 10 eindeutige Begriffe und überprüfbare, sachlich korrekte Erklärungen NUR aus der Quelle. Für jede Karte muss evidence eine wörtlich identische kurze Textstelle aus der Quelle enthalten. Nichts erfinden. Keine Quellen außerhalb des Materials. Keine personenbezogenen Details übernehmen. Sind Fakten unklar oder nicht belegt, erzeuge keine Karte. Schreibe auf Deutsch.';
    const payload={model:env.OPENAI_MODEL||'gpt-5-mini',store:false,input:[{role:'developer',content:prompt},{role:'user',content:'Fach: '+subject+'\n\nQuelle:\n'+text}],text:{format:{type:'json_schema',name:'study_cards',strict:true,schema}},max_output_tokens:1800};
    let result;
    try{
      const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'authorization':'Bearer '+env.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify(payload)});
      if(!response.ok)return reply({error:'Der KI-Dienst konnte keine Karten erzeugen.',detail:response.status},502,origin);
      result=await response.json();
    }catch{return reply({error:'KI-Dienst nicht erreichbar'},502,origin);}
    const output=(result.output||[]).flatMap(x=>(x.content||[]).filter(y=>y.type==='output_text').map(y=>y.text)).join('');
    let parsed;
    try{parsed=JSON.parse(output);}catch{return reply({error:'Ungültige KI-Ausgabe'},502,origin);}
    const source=normalized(text),seen=new Set();
    const cards=(Array.isArray(parsed.cards)?parsed.cards:[]).filter(c=>{
      if(typeof c.term!=='string'||typeof c.definition!=='string'||typeof c.evidence!=='string')return false;
      const key=normalized(c.term);if(!key||seen.has(key)||key.length>90||c.definition.length>320||c.evidence.length<10||!source.includes(normalized(c.evidence)))return false;
      seen.add(key);return true;
    }).slice(0,10).map(c=>({term:c.term.trim(),definition:c.definition.trim(),evidence:c.evidence.trim()}));
    return reply({cards,count:cards.length,reviewRequired:true},200,origin);
  }
};