import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {cleanFocus} from '../worker/assessment.js';
const sandbox={};vm.runInNewContext(readFileSync(new URL('../assessment-core-v08.js',import.meta.url),'utf8'),sandbox);
const {focus,sessions,validGrade}=sandbox.OskarAssessmentCore;
test('grades cannot imply a topic',()=>{
 assert.equal(validGrade('4'),true);assert.equal(validGrade('9'),false);
 assert.equal(focus([{subject:'math',grade:'5',areas:[]}],[],[]).length,0);
});
test('only approved topics produce study sessions',()=>{
 const rows=focus([{subject:'math',areas:[{topic:'Brüche',priority:'high',status:'draft'},{topic:'Zeitangaben',priority:'medium',status:'approved'}]}],[],[]);
 assert.equal(rows.length,1);assert.equal(rows[0].topic,'Zeitangaben');assert.equal(sessions(rows,undefined,5).length,5);
});
test('unquoted evidence is discarded',()=>{
 const item={topic:'Brüche',reason:'Wiederholt falsch gerechnet',practiceHint:'Brüche addieren üben',evidence:'falsches Addieren der Nenner',priority:'medium'};
 assert.equal(cleanFocus([item],'falsches Addieren der Nenner').length,1);
 assert.equal(cleanFocus([item],'kein passender Kommentar').length,0);
});
