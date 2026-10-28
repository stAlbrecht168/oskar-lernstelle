import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../auto-material-v09.js',import.meta.url),'utf8');
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const study=readFileSync(new URL('../study-v04.js',import.meta.url),'utf8');

test('saved music sources that have no playable tasks remain eligible for processing',()=>{
 assert.match(source,/function materialNeedsAnalysis\(m\)/);
 assert.match(source,/return !materialPlayable\(m\)/);
 assert.match(source,/const pending=store\.materials\.filter\(materialNeedsAnalysis\)/);
 assert.match(source,/m\.analysisState='failed'/);
 assert.match(source,/store\.materials\.some\(materialNeedsAnalysis\)/);
});
test('the learning path explains material state and offers an action when AI is disconnected',()=>{
 assert.match(source,/subjectMaterialStatus/);
 assert.match(source,/renderSubjectMaterialStatus/);
 assert.match(source,/KI-Verbindung fehlt/);
 assert.match(source,/Analyse fehlgeschlagen/);
 assert.match(source,/data-material-action/);
 assert.match(source,/action='retry';actionName='Erneut versuchen'/);
 assert.match(source,/b\.dataset\.materialAction==='retry'/);
 assert.match(study,/realQuestions\(selected\)\.length/);
});
test('materials and tasks remain in the private local browser store',()=>{
 assert.match(source,/const m=\{id:uniqueId\(\),subject:subjectId/);
 assert.match(source,/store\.materials\.push\(m\);persist\(\)/);
 assert.match(source,/sessionStorage\.getItem\('oskar-ai-access'\)/);
});
test('distinct section surfaces do not add repeated framed cards',()=>{
 assert.match(page,/\.left-col>\#learn\{background:\#fff;border:0/);
 assert.match(page,/\.left-col>\#discoveries\{background:linear-gradient\(/);
 assert.match(page,/\.right-col \.panel\{padding:18px;background:rgba\(/);
 assert.match(page,/\.subject-source-status\{display:flex/);
});
