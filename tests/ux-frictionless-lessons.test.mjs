import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=file('index.html');
const study=file('study-v04.js');
const planner=file('planner-v08.js');
const journey=file('journeys-v05.js');
const generator=file('journey-generator-v06.js');

test('levels are unlocked by progress, not by approving tasks',()=>{
 assert.match(study,/btn\.disabled=!unlocked/);
 assert.match(study,/else if\(realQuestions\(id\)\.length\)/);
 assert.match(study,/items=levelQuestions\(id,level\)/);
 assert.doesNotMatch(study,/Erst Aufgaben freigeben/);
 assert.doesNotMatch(study,/Erst Material hinzufügen und Aufgaben freigeben/);
});

test('previous grounded AI drafts become playable automatically',()=>{
 assert.match(study,/function activateExistingAiExercises/);
 assert.match(study,/norm\(source\.text\)\.includes\(norm\(t\.evidence\)\)/);
 assert.match(study,/t\.status='approved'/);
 assert.match(study,/card\.status='approved'/);
 assert.match(study,/reviewedByHuman=false/);
});
test('daily mission runs even with school material and no generated questions',()=>{
 assert.doesNotMatch(planner,/Bitte zuerst Schulstoff-Aufgaben freigeben/);
 assert.match(planner,/startLesson\(e\.id, unlocked\)/);
 assert.match(planner,/Beispielaufgaben/);
 assert.match(study,/customPracticeBtn'\)\.addEventListener\('click',event/);
});
test('discovery section focuses on journeys without separate bridge catalog',()=>{
 assert.match(journey,/panel\.className='discover-panel'/);
 assert.doesNotMatch(journey,/Fächer verbinden/);
 assert.doesNotMatch(journey,/Inspiration: BBC Tunnels/);
 assert.doesNotMatch(journey,/bridge-head/);
 assert.doesNotMatch(journey,/bridgeList/);
 assert.match(generator,/\$\('discoveries'\)\.append\(section\)/);
});
test('open visual layout focuses on main lessons rather than white panel outlines',()=>{
 assert.match(page,/\.left-col>\#learn,\.left-col>\#discoveries\{background:transparent;border:0/);
 assert.match(page,/\.right-col \.panel\{padding:18px 0 20px;background:transparent;border:0/);
 assert.match(page,/\#discoveries \.journey-node button\{border:0/);
 assert.doesNotMatch(page,/erst Karten freigeben/);
});
