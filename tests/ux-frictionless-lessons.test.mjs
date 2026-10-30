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
test('distinct soft background areas separate lessons, discoveries and supporting information',()=>{
 // Surface identity matters; padding values and declaration order do not.
 const mission=page.match(/\.hero\s*\{[^{}]*\bbackground\s*:\s*(linear-gradient\([^;{}]+)\s*[;}]/)?.[1];
 const discoveries=page.match(/\.left-col\s*>\s*#discoveries\s*\{[^{}]*\bbackground\s*:\s*(linear-gradient\([^;{}]+)\s*[;}]/)?.[1];
 assert.ok(mission,'the daily mission retains its own gradient surface');
 assert.ok(discoveries,'discoveries retain their own gradient surface');
 assert.notEqual(mission.replace(/\s+/g,''),discoveries.replace(/\s+/g,''));
 assert.match(page,/\.left-col\s*>\s*#learn\s*\{[^{}]*\bbackground\s*:\s*#fff(?:fff)?\s*[;}]/);
 assert.match(page,/\.right-col\s+\.panel\s*\{[^{}]*\bbackground\s*:\s*rgba\(/);
 assert.doesNotMatch(page,/erst Karten freigeben/);
});
