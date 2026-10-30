// Exclusively invented material. No files from local-data or other school folders.
export const sentences=[
 'Ein Liter entspricht 1000 Millilitern.',
 'Zwei Liter entsprechen 2000 Millilitern.',
 'Ein halber Liter entspricht 500 Millilitern.',
 'Ein Viertelliter entspricht 250 Millilitern.',
 'Vier Viertelliter ergeben einen Liter.',
 'Drei Liter entsprechen 3000 Millilitern.'
];
export const lines=['Mathematik - Klasse 5 - Synthetisches Lernmaterial',
 'Gymnasium Niedersachsen - Groessen und Einheiten',...sentences];
export const modelAnswer={
 cards:[
  {term:'Liter',definition:'1000 Milliliter',evidence:sentences[0]},
  {term:'Halber Liter',definition:'500 Milliliter',evidence:sentences[2]},
  {term:'Viertelliter',definition:'250 Milliliter',evidence:sentences[3]}
 ],
 tasks:[
  {type:'choice',question:'Wie viele Milliliter sind ein Liter?',options:['1000 Milliliter','100 Milliliter','10 Milliliter'],correctIndex:0,explanation:'Ein Liter entspricht laut Quelle 1000 Millilitern.',evidence:sentences[0]},
  {type:'choice',question:'Wie viele Milliliter sind zwei Liter?',options:['200 Milliliter','2000 Milliliter','20 Milliliter'],correctIndex:1,explanation:'Zwei Liter entsprechen laut Quelle 2000 Millilitern.',evidence:sentences[1]},
  {type:'gap',question:'Ein halber Liter entspricht ___ Millilitern.',options:['50','500','5000'],correctIndex:1,explanation:'Die Quelle nennt 500 Milliliter als einen halben Liter.',evidence:sentences[2]},
  {type:'choice',question:'Wie viele Viertelliter ergeben einen Liter?',options:['Zwei','Drei','Vier'],correctIndex:2,explanation:'Vier Viertelliter ergeben nach dem Quelltext einen Liter.',evidence:sentences[4]},
  {type:'true_false',question:'Drei Liter entsprechen 3000 Millilitern.',options:['Richtig','Falsch'],correctIndex:0,explanation:'Der Satz steht genau so im synthetischen Lernmaterial.',evidence:sentences[5]},
  {type:'gap',question:'Ein Viertelliter entspricht ___ Millilitern.',options:['25','2500','250'],correctIndex:2,explanation:'Im Lernmaterial entsprechen 250 Milliliter einem Viertelliter.',evidence:sentences[3]}
 ]
};
export function noisyModelAnswer(){
 const data=structuredClone(modelAnswer);
 data.tasks.push({...data.tasks[0],question:'  '+data.tasks[0].question.toUpperCase()+'  '},
  {...data.tasks[0],question:'Welche Tiere leben auf dem Mond?',evidence:'Diesen erfundenen Satz gibt es nicht im Schulmaterial.'},
  {...data.tasks[0],question:'Welche Antwort hat einen ungültigen Index?',correctIndex:99},
  {...data.tasks[0],question:'Sind diese zwei Antworten verschieden?',options:['1000 Milliliter','1000 Milliliter']});
 data.cards.push({...data.cards[0],term:' LITER '},{term:'Mondtiere',definition:'Erfundenes Wissen',evidence:'Dieser Beleg wurde erfunden und steht nicht im Material.'});
 return data;
}
// Minimal standards-compliant text PDF with actual Helvetica text operators and xref.
export function syntheticPdf(content=lines){
 const escape=s=>s.replace(/([\\()])/g,'\\$1');
 const stream='BT /F1 12 Tf 50 780 Td 20 TL '+content.map((line,i)=>(i?'T* ':'')+'('+escape(line)+') Tj').join('\n')+' ET\n';
 const objects=[
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  '<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'endstream'
 ];
 let pdf='%PDF-1.4\n';const offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const start=Buffer.byteLength(pdf);pdf+='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
 pdf+='trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n';
 return Buffer.from(pdf);
}
