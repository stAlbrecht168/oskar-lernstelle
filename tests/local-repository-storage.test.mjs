import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../local-folder-v10.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ignore=readFileSync(new URL('../.gitignore',import.meta.url),'utf8');
const deploy=readFileSync(new URL('../.github/workflows/deploy-pages.yml',import.meta.url),'utf8');
const ass=readFileSync(new URL('../assessment-v08.js',import.meta.url),'utf8');
const journeys=readFileSync(new URL('../journeys-v05.js',import.meta.url),'utf8');
const connections=readFileSync(new URL('../connections-v07.js',import.meta.url),'utf8');

test('user selects clone root and private data is written to its ignored subfolder',()=>{
 assert.match(source,/await handle\.getDirectoryHandle\('local-data',\{create:true\}\)/);
 assert.match(source,/await files\.getDirectoryHandle\(subjectId,\{create:true\}\)/);
 assert.match(source,/getDirectoryHandle\('Originaldateien',\{create:true\}\)/);
 assert.match(source,/const \{materials,\.\.\.progress\}=store/);
 assert.match(source,/materials,cards,tasks:aiTasks,progress/);
 assert.match(source,/await commitBundle\(target,candidate,check\)/);
 assert.match(source,/await flush\(\)/);
 assert.match(ignore,/^\/local-data\/$/m);
 assert.match(source,/for\(const key of \[KEY,CARD_KEY,TASK_KEY/);
});

test('folder access remains explicitly permissioned by user',()=>{
 assert.match(source,/showDirectoryPicker\(/);
 assert.match(source,/queryPermission\(/);
 assert.match(source,/requestPermission\(/);
 assert.match(source,/handleDb\('put',handle\)/);
 assert.match(source,/hasFolderApi\(\)/);
});

test('learning app deployment includes folder integration but not local student files',()=>{
 assert.match(html,/<script src="local-folder-v10\.js" defer><\/script>/);
 assert.match(deploy,/cp index\.html[^\n]*local-folder-v10\.js public\//);
 assert.match(deploy,/node --check local-folder-v10\.js/);
 assert.doesNotMatch(deploy,/cp [^\n]*local-data/);
});

test('grades, journeys and AI connections use local folder after connection',()=>{
 assert.match(source,/FS_FILES\.assessments/);
 assert.match(source,/FS_FILES\.journeys/);
 assert.match(source,/FS_FILES\.connections/);
 assert.match(ass,/globalThis\.oskarLocal\?\.isReady\(\)/);
 assert.match(journeys,/window\.oskarLocal\?\.isReady\(\)/);
 assert.match(connections,/window\.oskarLocal\?\.isReady\(\)/);
});
