import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('../index.html', import.meta.url),'utf8');
const planner=readFileSync(new URL('../planner-v08.js', import.meta.url),'utf8');

test('one primary mission and no duplicate daily mission card',()=>{
 assert.equal((page.match(/id="heroBtn"/g)||[]).length,1);
 assert.equal((page.match(/id="planOpen"/g)||[]).length,1);
 assert.equal((page.match(/id="heroDailyStatus"/g)||[]).length,1);
 assert.equal((page.match(/id="heroSource"/g)||[]).length,1);
 assert.ok(!planner.includes('planTeaser'));
 assert.ok(!planner.includes('planStart'));
});

test('the primary action launches the planned lesson instead of the old exam shortcut',()=>{
 assert.match(planner,/heroBtn'\)\.addEventListener\('click'/);
 assert.match(planner,/event\.stopImmediatePropagation\(\)/);
 assert.match(planner,/startPlanned\(\)/);
 assert.match(planner,/heroBtn'\)\.textContent/);
});

test('planning and status are part of the same main card',()=>{
 assert.match(page,/class="hero-status" id="heroDailyStatus"/);
 assert.match(page,/class="hero-actions"/);
 assert.match(planner,/heroMeta'\)\.textContent='Deine Tagesmission/);
 assert.match(planner,/heroDailyStatus'\)\.textContent=/);
 assert.match(planner,/heroDesc'\)\.textContent=/);
});

test('left-side learning content is primary and aside contains only supporting panels',()=>{
 assert.match(page,/grid-template-columns:minmax\(0,1fr\) 252px/);
 const start=page.indexOf('<section class="left-col">');
 const end=page.indexOf('</aside>',start);
 const block=page.slice(start,end);
 assert.ok(block.indexOf('id="heroBtn"')>0);
 assert.ok(block.indexOf('id="learn"')>block.indexOf('id="heroBtn"'));
 assert.ok(block.indexOf('<aside class="right-col">')>block.indexOf('id="learn"'));
 assert.ok(block.indexOf('id="reviewBtn"')>0);
 assert.ok(block.indexOf('id="reviewBtn"')<block.indexOf('<aside class="right-col">'));
 assert.ok(block.indexOf('id="exams"')>block.indexOf('<aside class="right-col">'));
});
