import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source = readFileSync(new URL('../local-folder-v10.js', import.meta.url), 'utf8');
const FILES = {
  materials:'materialien.json', cards:'lernkarten.json', tasks:'aufgaben.json',
  progress:'lernstand.json', assessments:'klassenarbeiten.json',
  journeys:'entdeckerreisen.json', connections:'fachverbindungen.json'
};
const BROWSER_KEYS = ['synthetic-progress', 'synthetic-cards', 'synthetic-tasks',
  'oskar-lernstelle-assessments-v1', 'oskar-lernstelle-journeys-v1', 'oskar-subject-connections-v1'];
const clone = value => JSON.parse(JSON.stringify(value));
const notFound = () => Object.assign(new Error('Synthetic missing entry'), {name:'NotFoundError'});

function dataset(label = 'a') {
  const materials = [
    {id:'math-' + label, subject:'math', title:'Synthetic quantities ' + label, text:'Ein Liter entspricht 1000 Millilitern. Zwei Liter entsprechen 2000 Millilitern.', created:'2026-10-28T12:00:00.000Z'},
    {id:'bio-' + label, subject:'biology', title:'Synthetic plants ' + label, text:'Pflanzen brauchen Wasser. Die Wurzeln nehmen Wasser aus dem Boden auf.', created:'2026-10-28T12:00:00.000Z'}
  ];
  const cards = [{id:'card-' + label, subject:'math', sourceId:materials[0].id, sourceTitle:materials[0].title,
    term:'Ein Liter', definition:'1000 Milliliter', evidence:'Ein Liter entspricht 1000 Millilitern.', status:'approved', generatedByAI:true, reviewedByHuman:false}];
  const tasks = [{id:'task-' + label, subject:'math', sourceId:materials[0].id, sourceTitle:materials[0].title,
    type:'choice', question:'Wie viele Milliliter sind ein Liter?', options:['1000 Milliliter', '100 Milliliter', '10 Milliliter'],
    correctIndex:0, explanation:'Ein Liter entspricht 1000 Millilitern.', evidence:'Ein Liter entspricht 1000 Millilitern.',
    status:'approved', generatedByAI:true, reviewedByHuman:false}];
  const progress = {xp:42, completed:['math:0'], errors:[{subject:'math', index:'ai:task-' + label}], days:['2026-10-28'],
    studyLog:[{date:'2026-10-28', subject:'math', correct:1, total:1, kind:'school', timestamp:'2026-10-28T12:00:00.000Z'}],
    examDates:{math:'2026-11-02', biology:null}};
  const assessments = [{id:'assessment-' + label, subject:'math', title:'Synthetic corrected exercise ' + label,
    date:'2026-10-27', grade:'2', text:'Beim Umrechnen wurde der Faktor verwechselt.', feedback:'Milliliter und Liter üben.',
    areas:[{topic:'Volumeneinheiten', reason:'Der Faktor wurde verwechselt.', evidence:'Beim Umrechnen wurde der Faktor verwechselt.',
      practiceHint:'Liter in Milliliter umrechnen.', priority:'medium', status:'approved'}]}];
  const station = (material, index) => ({sourceId:material.id, subject:material.subject, heading:'Synthetic station ' + index,
    context:'Wir untersuchen eine synthetische Quelle.', question:'Was steht in dieser synthetischen Quelle?',
    options:['Erste Antwort', 'Zweite Antwort', 'Dritte Antwort'], correctIndex:0,
    explanation:'Die richtige Antwort steht in der angegebenen Quelle.', evidence:material.text.split('. ')[0] + '.'});
  const journeys = {start:{done:true}, reflection:'Synthetic reflection',
    aiJourneys:[{id:'journey-' + label, title:'Synthetic water journey', guidingQuestion:'Wie hängen Wasser und Pflanzen zusammen?',
      hook:'Zwei synthetische Quellen helfen uns.', connection:'Wassermengen messen und Pflanzen versorgen.', reflectionPrompt:'Was hast du gelernt?',
      status:'approved', stations:materials.map(station)}], aiProgress:{['journey-' + label]:{step:1, completed:false, reflection:''}}};
  const connections = {signature:'synthetic-' + label, updatedAt:'2026-10-28T12:00:00.000Z', connections:[{
    title:'Wasser messen und nutzen', sharedIdea:'Wasser lässt sich messen und versorgt Pflanzen.',
    howToCombine:'Wir berechnen eine Wassermenge und untersuchen die Versorgung der Pflanzen.',
    challenge:'Wie kannst du die Wassermenge für eine Pflanze messen?',
    evidence:materials.map(material => ({sourceId:material.id, subject:material.subject, quote:material.text.split('. ')[0] + '.'}))
  }]};
  return {materials, cards, tasks, progress, assessments, journeys, connections};
}

function emptyDataset() {
  return {materials:[], cards:[], tasks:[], progress:{xp:0, completed:[], errors:[], days:[], studyLog:[], examDates:{}},
    assessments:[], journeys:{}, connections:null};
}

function browserValues(data) {
  return Object.fromEntries(BROWSER_KEYS.map((key, index) => [key, JSON.stringify([
    {...data.progress, materials:data.materials}, data.cards, data.tasks,
    data.assessments, data.journeys, data.connections
  ][index])]));
}

// The entire file system is synthetic and held in memory. No browser folder,
// IndexedDB database or private on-disk school file is accessed by these tests.
function memoryFolder(name = 'synthetic-repository') {
  const faults = [], events = [];
  async function operation(phase, path, payload) {
    const event = {phase, path, name:path.split('/').at(-1), payload};
    events.push(event);
    for (const fault of faults) {
      if (!fault.used && fault.matches(event)) {
        fault.used = true;
        if (fault.action) return fault.action(event);
        throw Object.assign(new Error('Synthetic ' + phase + ' failure at ' + event.name), {name:'NotAllowedError'});
      }
    }
  }
  function directory(directoryName, path) {
    const files = new Map(), directories = new Map();
    return {
      kind:'directory', name:directoryName, files, directories,
      async getDirectoryHandle(child, options = {}) {
        await operation('directory', path + '/' + child);
        if (!directories.has(child)) {
          if (!options.create) throw notFound();
          directories.set(child, directory(child, path + '/' + child));
        }
        return directories.get(child);
      },
      async getFileHandle(filename, options = {}) {
        await operation('file', path + '/' + filename);
        if (!files.has(filename)) {
          if (!options.create) throw notFound();
          files.set(filename, '');
        }
        return {
          kind:'file', name:filename,
          async getFile() {
            await operation('read', path + '/' + filename);
            const content = files.get(filename);
            return {size:content.length, async text() { return typeof content==='string'?content:new TextDecoder().decode(content); }, async arrayBuffer(){ return typeof content==='string'?new TextEncoder().encode(content).buffer:Uint8Array.from(content).buffer; }};
          },
          async createWritable() {
            await operation('writable', path + '/' + filename);
            let pending = '', aborted = false;
            return {
              async write(value) { await operation('write', path + '/' + filename, value); pending = typeof value === 'string' ? value : value instanceof Uint8Array ? Uint8Array.from(value) : await value.text(); },
              async close() { await operation('close', path + '/' + filename, pending); if (!aborted) files.set(filename, pending); },
              async abort() { aborted = true; await operation('abort', path + '/' + filename); }
            };
          }
        };
      },
      async removeEntry(filename) {
        await operation('remove', path + '/' + filename);
        if (!files.delete(filename) && !directories.delete(filename)) throw notFound();
      },
      async *entries() { yield* directories; for (const [name] of files) yield [name, await this.getFileHandle(name)]; },
      async isSameEntry(other) { return other === this; },
      async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; }
    };
  }
  const handle = directory(name, name);
  const data = directory('local-data', name + '/local-data');
  handle.directories.set('local-data', data);
  return {
    handle, data, events,
    seed(values) { for (const [key, value] of Object.entries(values)) data.files.set(FILES[key], JSON.stringify(value)); return this; },
    fail(matches, action) { const fault = {matches, action, used:false}; faults.push(fault); return fault; },
    image() { return clone(Object.fromEntries([...data.files.entries()].sort(([a], [b]) => a.localeCompare(b)))); },
    primary() { return Object.fromEntries(Object.values(FILES).map(file => [file, data.files.get(file)])); }
  };
}

function runtime(initial = emptyDataset(), {browserData} = {}) {
  const elements = new Map();
  function element() { return {dataset:{}, disabled:false, textContent:'', append() {}, setAttribute() {}, addEventListener() {}, querySelector() {return null;}}; }
  for (const id of ['materialFile', 'saveMaterial', 'parentMaterials']) elements.set(id, element());
  const browser = new Map(browserData ? Object.entries(browserData) : BROWSER_KEYS.map(key => [key, 'synthetic browser sentinel']));
  let assessments = clone(initial.assessments), paints = 0;
  const sandbox = {
    document:{createElement:element, getElementById:id => elements.get(id) || null},
    crypto:webcrypto, TextEncoder, TextDecoder, Uint8Array, DataView, Map, Blob, structuredClone, DOMException,
    EXAMS:[{id:'math'}, {id:'biology'}], KEY:BROWSER_KEYS[0], CARD_KEY:BROWSER_KEYS[1], TASK_KEY:BROWSER_KEYS[2],
    store:{...clone(initial.progress), materials:clone(initial.materials)}, cards:clone(initial.cards), aiTasks:clone(initial.tasks),
    journeyState:clone(initial.journeys), connectionsCache:clone(initial.connections),
    oskarExportAssessments:() => assessments,
    oskarSetAssessments(raw) { assessments = clone(raw); },
    oskarImportAssessments(raw) { assessments = clone(raw); sandbox.persist(); sandbox.render(); },
    persist() {}, persistCards() { return true; }, saveTasks() { return true; },
    render() { paints++; },
    localStorage:{getItem:key => browser.get(key) ?? null, setItem:(key, value) => browser.set(key, String(value)), removeItem:key => browser.delete(key)},
    indexedDB:{open() { throw Error('Synthetic handle storage unavailable'); }},
    confirm:() => true
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, {filename:'local-folder-v10.js'});
  return {
    api:sandbox.oskarLocal, sandbox, browser,
    state() { const {materials, ...progress} = sandbox.store; return clone({materials, cards:sandbox.cards, tasks:sandbox.aiTasks,
      progress, assessments, journeys:sandbox.journeyState, connections:sandbox.connectionsCache}); },
    setState(value) {
      sandbox.store = {...clone(value.progress), materials:clone(value.materials)};
      sandbox.cards = clone(value.cards); sandbox.aiTasks = clone(value.tasks);
      sandbox.journeyState = clone(value.journeys); sandbox.connectionsCache = clone(value.connections);
      assessments = clone(value.assessments);
    },
    paints:() => paints
  };
}

test('all seven data groups round-trip without dropping grades, journey state or connection evidence', async () => {
  const expected = dataset();
  const folder = memoryFolder().seed(expected);
  const app = runtime();
  await app.api.connect(folder.handle);
  assert.deepEqual(app.state(), expected);
  const changed = dataset('changed'); changed.progress.xp = 87;
  app.setState(changed); app.api.snapshot(); await app.api.flush();
  const fresh = runtime(); await fresh.api.connect(folder.handle);
  assert.deepEqual(fresh.state(), changed);
});

test('the initial browser migration durably saves all data groups before clearing browser copies', async () => {
  const expected = dataset('browser'), app = runtime(expected), folder = memoryFolder('new');
  await app.api.connect(folder.handle);
  assert.deepEqual(app.state(), expected);
  const fresh = runtime(); await fresh.api.connect(folder.handle);
  assert.deepEqual(fresh.state(), expected);
  for (const key of BROWSER_KEYS) assert.equal(app.browser.has(key), false, key);
});

test('conflicting browser and folder entity IDs do not silently overwrite either copy', async () => {
  const browserData = dataset('shared'), folderData = dataset('shared');
  folderData.materials[0].text = 'Abweichender synthetischer Text muss ebenfalls erhalten bleiben.';
  const app = runtime(browserData), folder = memoryFolder().seed(folderData), before = folder.image();
  await assert.rejects(app.api.connect(folder.handle));
  assert.deepEqual(app.state(), browserData);
  assert.deepEqual(folder.image(), before);
  for (const key of BROWSER_KEYS) assert.equal(app.browser.has(key), true, key);
});

test('malformed JSON and invalid data shapes leave active state and both folders unchanged', async t => {
  for (const [file, invalid] of [['materialien.json', '{broken'], ['lernkarten.json', '{}'],
    ['aufgaben.json', '[null]'], ['lernstand.json', '{"xp":"not-a-number"}'],
    ['klassenarbeiten.json', '{}'], ['entdeckerreisen.json', '[]'], ['fachverbindungen.json', '[]']]) {
    await t.test(file, async () => {
      const expected = dataset('old');
      const oldFolder = memoryFolder('old').seed(expected), badFolder = memoryFolder('bad').seed(dataset('bad'));
      badFolder.data.files.set(file, invalid);
      const app = runtime(); await app.api.connect(oldFolder.handle);
      const oldImage = oldFolder.image(), badImage = badFolder.image();
      await assert.rejects(app.api.connect(badFolder.handle));
      assert.deepEqual(app.state(), expected);
      assert.deepEqual(oldFolder.image(), oldImage);
      assert.deepEqual(badFolder.image(), badImage);
      assert.equal(app.api.isReady(), true);
    });
  }
});

test('duplicate entity IDs and malformed nested fields are rejected instead of silently dropped', async t => {
  const cases = [
    ['materials', values => values.materials.push(clone(values.materials[0]))],
    ['cards', values => { values.cards[0].definition = 123; }],
    ['tasks', values => { values.tasks[0].correctIndex = 7; }],
    ['assessments', values => { values.assessments[0].areas = 'not-a-list'; }]
  ];
  for (const [name, damage] of cases) {
    await t.test(name, async () => {
      const expected = dataset('old'), app = runtime();
      await app.api.connect(memoryFolder('old').seed(expected).handle);
      const invalid = dataset('bad'); damage(invalid);
      const target = memoryFolder('bad').seed(invalid), before = target.image();
      await assert.rejects(app.api.connect(target.handle));
      assert.deepEqual(app.state(), expected);
      assert.deepEqual(target.image(), before);
    });
  }
});

test('read failures do not partially activate a candidate folder or change disk data', async () => {
  const app = runtime(), oldFolder = memoryFolder('old').seed(dataset('old'));
  await app.api.connect(oldFolder.handle);
  const candidate = memoryFolder('candidate').seed(dataset('candidate'));
  const before = app.state(), disk = candidate.image();
  candidate.fail(event => event.phase === 'read' && event.name === 'klassenarbeiten.json');
  await assert.rejects(app.api.connect(candidate.handle));
  assert.deepEqual(app.state(), before);
  assert.deepEqual(candidate.image(), disk);
});

test('switching to a folder with missing files restores defaults for every absent category', async () => {
  const app = runtime();
  await app.api.connect(memoryFolder('old').seed(dataset('old')).handle);
  const target = memoryFolder('empty');
  await app.api.connect(target.handle);
  assert.deepEqual(app.state(), emptyDataset());
  const fresh = runtime(); await fresh.api.connect(target.handle);
  assert.deepEqual(fresh.state(), emptyDataset());
});

test('a partially populated target does not inherit missing progress fields or journeys', async () => {
  const app = runtime(); await app.api.connect(memoryFolder('old').seed(dataset('old')).handle);
  const target = memoryFolder('partial').seed({materials:dataset('new').materials, progress:{xp:5}});
  await app.api.connect(target.handle);
  const expected = emptyDataset(); expected.materials = dataset('new').materials; expected.progress.xp = 5;
  assert.deepEqual(app.state(), expected);
});

test('a failed initial migration retains browser data and rolls back destination files', async () => {
  const expected = dataset('browser'), app = runtime(expected), target = memoryFolder('new');
  const browserBefore = clone([...app.browser]);
  target.fail(event => event.phase === 'close' && event.name === 'aufgaben.json');
  await assert.rejects(app.api.connect(target.handle));
  assert.deepEqual(app.state(), expected);
  assert.deepEqual([...app.browser], browserBefore);
  assert.equal(app.api.isReady(), false);
  for (const filename of Object.values(FILES)) assert.equal(target.data.files.has(filename), false, filename);
});

test('snapshot failure rejects flush, preserves disk generation and leaves RAM available for retry', async () => {
  const app = runtime(), target = memoryFolder().seed(dataset('old'));
  await app.api.connect(target.handle);
  const before = target.primary(), changed = dataset('new');
  changed.progress.xp = 99; app.setState(changed);
  target.fail(event => event.phase === 'close' && event.name === 'aufgaben.json');
  app.api.snapshot();
  await assert.rejects(app.api.flush());
  assert.deepEqual(target.primary(), before);
  assert.deepEqual(app.state(), changed);
  const fresh = runtime(); await fresh.api.connect(target.handle);
  assert.deepEqual(fresh.state(), dataset('old'));
  app.api.snapshot(); await app.api.flush();
  const retried = runtime(); await retried.api.connect(target.handle);
  assert.deepEqual(retried.state(), changed);
});

test('a failure is not hidden by a later successful write and blocks switching away', async () => {
  const app = runtime(), oldFolder = memoryFolder('old').seed(dataset('old'));
  await app.api.connect(oldFolder.handle);
  app.setState(dataset('new'));
  oldFolder.fail(event => event.phase === 'close' && event.name === 'lernkarten.json');
  app.api.snapshot();
  await assert.rejects(app.api.flush());
  const candidate = memoryFolder('candidate').seed(dataset('candidate')), before = candidate.image();
  await assert.rejects(app.api.connect(candidate.handle));
  assert.deepEqual(candidate.image(), before);
  assert.deepEqual(app.state(), dataset('new'));
});

test('a folder switch waits for pending writes to finish in the original folder', async () => {
  const app = runtime(), oldFolder = memoryFolder('old').seed(dataset('old'));
  await app.api.connect(oldFolder.handle);
  app.setState(dataset('pending'));
  let reached, release;
  const writing = new Promise(resolve => { reached = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  oldFolder.fail(event => event.phase === 'close' && event.name === 'aufgaben.json', () => { reached(); return gate; });
  app.api.snapshot(); await writing;
  const candidate = memoryFolder('candidate').seed(dataset('candidate'));
  let switched = false;
  const connecting = app.api.connect(candidate.handle).then(() => { switched = true; });
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(switched, false);
    assert.deepEqual(app.state(), dataset('pending'));
  } finally { release(); }
  await connecting;
  assert.deepEqual(app.state(), dataset('candidate'));
  const fresh = runtime(); await fresh.api.connect(oldFolder.handle);
  assert.deepEqual(fresh.state(), dataset('pending'));
});

test('a failed rollback keeps enough recovery information for the next fresh connection', async () => {
  const app = runtime(), folder = memoryFolder().seed(dataset('old'));
  await app.api.connect(folder.handle);
  app.setState(dataset('new'));
  const forwardFailure = folder.fail(event => event.phase === 'close' && event.name === 'aufgaben.json');
  folder.fail(event => forwardFailure.used && event.phase === 'close' && event.name === 'materialien.json');
  app.api.snapshot(); await assert.rejects(app.api.flush());
  assert.deepEqual(app.state(), dataset('new'));
  const fresh = runtime(); await fresh.api.connect(folder.handle);
  assert.deepEqual(fresh.state(), dataset('old'));
});

test('an original file is retained when persisting its removal fails', async () => {
  const expected = dataset('old'), removed = expected.materials[0];
  removed.originalPath = 'Originaldateien/math/' + removed.id + '-synthetic.txt';
  const folder = memoryFolder().seed(expected), app = runtime();
  const originals = await folder.data.getDirectoryHandle('Originaldateien', {create:true});
  const math = await originals.getDirectoryHandle('math', {create:true});
  math.files.set(removed.id + '-synthetic.txt', 'Synthetic original file text');
  await app.api.connect(folder.handle);
  const changed = emptyDataset(); changed.materials = [expected.materials[1]];
  app.setState(changed);
  folder.fail(event => event.phase === 'close' && event.name === 'materialien.json');
  app.api.snapshot();
  await app.api.removeOriginal(removed);
  await assert.rejects(app.api.flush());
  assert.equal(math.files.get(removed.id + '-synthetic.txt'), 'Synthetic original file text');
});

test('an original file is deleted only after the successful metadata removal commits', async () => {
  const expected = dataset('old'), removed = expected.materials[0];
  removed.originalPath = 'Originaldateien/math/' + removed.id + '-synthetic.txt';
  const folder = memoryFolder().seed(expected), app = runtime();
  const originals = await folder.data.getDirectoryHandle('Originaldateien', {create:true});
  const math = await originals.getDirectoryHandle('math', {create:true});
  math.files.set(removed.id + '-synthetic.txt', 'Synthetic original file text');
  await app.api.connect(folder.handle);
  const changed = emptyDataset(); changed.materials = [expected.materials[1]];
  app.setState(changed); app.api.snapshot();
  await app.api.removeOriginal(removed);
  await app.api.flush();
  assert.equal(math.files.has(removed.id + '-synthetic.txt'), false);
  assert.deepEqual(JSON.parse(folder.data.files.get(FILES.materials)), changed.materials);
});

test('an original still referenced by committed metadata cannot be deleted', async () => {
  const expected = dataset('old'), item = expected.materials[0];
  item.originalPath = 'Originaldateien/math/' + item.id + '-synthetic.txt';
  const folder = memoryFolder().seed(expected), app = runtime();
  const originals = await folder.data.getDirectoryHandle('Originaldateien', {create:true});
  const math = await originals.getDirectoryHandle('math', {create:true});
  math.files.set(item.id + '-synthetic.txt', 'Synthetic original file text');
  await app.api.connect(folder.handle);
  await app.api.removeOriginal(item);
  assert.equal(math.files.has(item.id + '-synthetic.txt'), true);
});

test('a folder cannot switch while an original file is being written', async () => {
  const folder = memoryFolder('old').seed(dataset('old')), app = runtime();
  await app.api.connect(folder.handle);
  let reached, release;
  const writing = new Promise(resolve => { reached = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  folder.fail(event => event.phase === 'close' && event.name === 'upload-synthetic.txt', () => { reached(); return gate; });
  const saving = app.api.saveOriginal({name:'synthetic.txt', async text() {return 'Synthetic upload';}}, 'upload', 'math');
  await writing;
  const candidate = memoryFolder('candidate').seed(dataset('candidate')), before = candidate.image();
  try {
    await assert.rejects(app.api.connect(candidate.handle));
    assert.deepEqual(app.state(), dataset('old'));
    assert.deepEqual(candidate.image(), before);
  } finally { release(); }
  const originalPath = await saving;
  assert.equal(originalPath, 'Originaldateien/math/upload-synthetic.txt');
  const originalDir = folder.data.directories.get('Originaldateien').directories.get('math');
  assert.equal(originalDir.files.get('upload-synthetic.txt'), 'Synthetic upload');
});

test('reopening after an interrupted multi-file write restores the last complete generation', async () => {
  const app = runtime(), folder = memoryFolder().seed(dataset('old'));
  await app.api.connect(folder.handle);
  app.setState(dataset('interrupted'));
  let reached;
  const writing = new Promise(resolve => { reached = resolve; });
  folder.fail(event => event.phase === 'close' && event.name === 'aufgaben.json', () => {reached(); return new Promise(() => {});});
  app.api.snapshot(); await writing;
  const restarted = runtime(); await restarted.api.connect(folder.handle);
  assert.deepEqual(restarted.state(), dataset('old'));
});

test('an earlier valid queued commit cannot clear the error from a newer invalid snapshot', async () => {
  const folder = memoryFolder().seed(dataset('old')), app = runtime();
  await app.api.connect(folder.handle);
  const valid = dataset('pending'); app.setState(valid);
  let reached, release;
  const writing = new Promise(resolve => { reached = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  folder.fail(event => event.phase === 'close' && event.name === 'aufgaben.json', () => { reached(); return gate; });
  app.api.snapshot(); await writing;
  const invalid = clone(valid); invalid.progress.xp = 'invalid'; app.setState(invalid);
  assert.equal(app.api.snapshot(), false);
  release(); await assert.rejects(app.api.flush());
  assert.equal(app.state().progress.xp, 'invalid');
  const fresh = runtime(); await fresh.api.connect(folder.handle);
  assert.deepEqual(fresh.state(), valid);
});

test('edits during candidate reads abort the switch and save the newer state in the old folder', async () => {
  const oldFolder = memoryFolder('old').seed(dataset('old')), app = runtime();
  await app.api.connect(oldFolder.handle);
  const candidate = memoryFolder('candidate').seed(dataset('candidate')), before = candidate.image();
  let reached, release;
  const reading = new Promise(resolve => { reached = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  candidate.fail(event => event.phase === 'read' && event.name === 'materialien.json', () => { reached(); return gate; });
  const connecting = app.api.connect(candidate.handle);
  await reading;
  const edited = dataset('edited'); app.setState(edited); app.api.snapshot();
  release(); await assert.rejects(connecting); await app.api.flush();
  assert.deepEqual(app.state(), edited);
  assert.deepEqual(candidate.image(), before);
  const fresh = runtime(); await fresh.api.connect(oldFolder.handle);
  assert.deepEqual(fresh.state(), edited);
});

test('edits during candidate writes roll back its transaction before deferring the old-folder save', async () => {
  const oldFolder = memoryFolder('old').seed(dataset('old')), app = runtime();
  await app.api.connect(oldFolder.handle);
  // Compact seed JSON differs from the formatted representation, so connecting
  // exercises a real candidate transaction even without browser migration.
  const candidate = memoryFolder('candidate').seed(dataset('candidate')), before = candidate.primary();
  let reached, release;
  const writing = new Promise(resolve => { reached = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  candidate.fail(event => event.phase === 'close' && event.name === 'materialien.json', () => { reached(); return gate; });
  const connecting = app.api.connect(candidate.handle);
  await writing;
  const edited = dataset('edited'); app.setState(edited); app.api.snapshot();
  release(); await assert.rejects(connecting); await app.api.flush();
  assert.deepEqual(candidate.primary(), before);
  assert.deepEqual(app.state(), edited);
  const fresh = runtime(); await fresh.api.connect(oldFolder.handle);
  assert.deepEqual(fresh.state(), edited);
});

test('browser-only backup restore round-trips every category without selecting a folder', async () => {
  const old = dataset('old'), restored = dataset('restored');
  const app = runtime(old, {browserData:browserValues(old)});
  await app.api.restoreBackup(restored);
  assert.deepEqual(app.state(), restored);
  assert.deepEqual(Object.fromEntries(app.browser), browserValues(restored));
  assert.equal(app.api.isReady(), false);
});

test('a browser quota error restores browser copies without replacing newer RAM data', async () => {
  const old = dataset('old'), unsaved = dataset('unsaved'), imported = dataset('import');
  const app = runtime(unsaved, {browserData:browserValues(old)});
  const setItem = app.sandbox.localStorage.setItem;
  let failed = false;
  app.sandbox.localStorage.setItem = (key, value) => {
    if (!failed && key === BROWSER_KEYS[2]) {failed = true; throw Object.assign(Error('Synthetic quota'), {name:'QuotaExceededError'});}
    setItem(key, value);
  };
  await assert.rejects(app.api.restoreBackup(imported));
  assert.deepEqual(app.state(), unsaved);
  assert.deepEqual(Object.fromEntries(app.browser), browserValues(old));
});

test('startup recovers all browser categories from an interrupted restore journal', () => {
  const old = dataset('old'), partial = dataset('partial');
  const browserData = {...browserValues(partial), 'oskar-storage-transaction-v1':JSON.stringify({version:1, before:browserValues(old)})};
  const app = runtime(partial, {browserData});
  assert.deepEqual(app.state(), old);
  assert.deepEqual(Object.fromEntries(app.browser), browserValues(old));
});

test('a failed browser rollback preserves its journal and newer RAM until startup recovery succeeds', async () => {
  const old = dataset('old'), unsaved = dataset('unsaved');
  const app = runtime(unsaved, {browserData:browserValues(old)});
  const setItem = app.sandbox.localStorage.setItem;
  let failures = 0;
  app.sandbox.localStorage.setItem = (key, value) => {
    if (key === BROWSER_KEYS[2] && failures++ < 2) throw Object.assign(Error('Synthetic repeated quota'), {name:'QuotaExceededError'});
    setItem(key, value);
  };
  await assert.rejects(app.api.restoreBackup(dataset('import')));
  assert.deepEqual(app.state(), unsaved);
  assert.equal(app.browser.has('oskar-storage-transaction-v1'), true);
  const restarted = runtime(emptyDataset(), {browserData:Object.fromEntries(app.browser)});
  assert.deepEqual(restarted.state(), old);
  assert.deepEqual(Object.fromEntries(restarted.browser), browserValues(old));
});

test('manual cards and all assessment areas and metadata survive reconnect unchanged', async () => {
  const expected = dataset('complete');
  expected.cards.push({id:'manual', subject:'math', term:'Synthetische Karte', definition:'Eine manuelle Erklärung', sourceId:null, status:'draft'});
  expected.assessments[0].areas = Array.from({length:14}, (_, i) => ({...expected.assessments[0].areas[0], topic:'Synthetic topic ' + i}));
  expected.assessments[0].customNote = 'Synthetic additional metadata';
  const folder = memoryFolder().seed(expected), app = runtime();
  await app.api.connect(folder.handle);
  assert.deepEqual(app.state(), expected);
  app.api.snapshot(); await app.api.flush();
  const fresh = runtime(); await fresh.api.connect(folder.handle);
  assert.deepEqual(fresh.state(), expected);
});

test('metadata reads during original deletion pin the folder against restore and switching', async () => {
  const expected = dataset('old'), item = expected.materials[0];
  item.originalPath = 'Originaldateien/math/' + item.id + '-synthetic.txt';
  const folder = memoryFolder('old').seed(expected), app = runtime();
  const originals = await folder.data.getDirectoryHandle('Originaldateien', {create:true});
  const math = await originals.getDirectoryHandle('math', {create:true});
  math.files.set(item.id + '-synthetic.txt', 'Synthetic original file text');
  await app.api.connect(folder.handle);
  const changed = emptyDataset(); changed.materials = [expected.materials[1]];
  app.setState(changed); app.api.snapshot(); await app.api.flush();
  let reached, release;
  const reading = new Promise(resolve => { reached = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  folder.fail(event => event.phase === 'read' && event.name === 'materialien.json', () => { reached(); return gate; });
  const removing = app.api.removeOriginal(item); await reading;
  try {
    await assert.rejects(app.api.restoreBackup(expected));
    await assert.rejects(app.api.connect(memoryFolder('candidate').seed(dataset('candidate')).handle));
  } finally { release(); }
  await removing;
  assert.deepEqual(app.state(), changed);
  assert.equal(math.files.has(item.id + '-synthetic.txt'), false);
});

async function seedOriginals(folder,data){
 const base=await folder.data.getDirectoryHandle('Originaldateien',{create:true});
 const originals=new Map([
  ['Originaldateien/math/synthetic.pdf',new Uint8Array([37,80,68,70,45,49,46,55,10,0,255])],
  ['Originaldateien/biology/synthetic.jpg',new Uint8Array([255,216,255,0,1,2,255,217])],
  ['Originaldateien/math/synthetic.txt',new TextEncoder().encode('Nur synthetischer Beispieltext.')]
 ]);
 data.materials[0].originalPath='Originaldateien/math/synthetic.pdf';
 data.materials[1].originalPath='Originaldateien/biology/synthetic.jpg';
 for(const [path,bytes] of originals){const parts=path.split('/'),subject=await base.getDirectoryHandle(parts[1],{create:true});subject.files.set(parts[2],bytes);}
 return originals;
}
async function fullFixture(){
 const expected=dataset('full'),folder=memoryFolder('source'),originals=await seedOriginals(folder,expected);
 folder.seed(expected);const app=runtime();await app.api.connect(folder.handle);
 const blob=await app.api.exportFullBackup();return {expected,folder,originals,app,blob,zip:app.sandbox.OskarBackupZip};
}
async function originalBytes(folder,path){
 const parts=path.split('/');return [...folder.data.directories.get(parts[0]).directories.get(parts[1]).files.get(parts[2])];
}
async function alteredBlob(fixture,change,{rehash=false}={}){
 const entries=fixture.zip.unpack(new Uint8Array(await fixture.blob.arrayBuffer()));
 await change(entries);
 if(rehash){entries.delete('manifest.json');return new Blob([await fixture.zip.create(entries)]);}
 return new Blob([fixture.zip.pack(entries)]);
}

test('full ZIP includes all seven groups, binary originals, orphan originals and versioned SHA-256 manifest',async()=>{
 const f=await fullFixture(),entries=f.zip.unpack(new Uint8Array(await f.blob.arrayBuffer()));
 const manifest=JSON.parse(f.zip.decode(entries.get('manifest.json')));
 assert.equal(manifest.version,1);assert.equal(manifest.format,'oskar-full-backup');
 assert.equal(manifest.files.length,10);
 for(const file of manifest.files){assert.equal(file.size,entries.get(file.path).length);assert.equal(file.sha256,await f.zip.sha(entries.get(file.path)));}
 for(const [path,bytes] of f.originals)assert.deepEqual([...entries.get(path)],[...bytes]);
 for(const [group,name] of Object.entries(FILES))assert.deepEqual(JSON.parse(f.zip.decode(entries.get(name))),f.expected[group]);
});

test('full restore into empty folder survives a fresh runtime with all data and binary originals intact',async()=>{
 const f=await fullFixture(),folder=memoryFolder('destination'),app=runtime();await app.api.connect(folder.handle);
 assert.equal(await app.api.restoreFullBackup(f.blob),true);
 const state=app.state(),expected=clone(f.expected);
 for(let i=0;i<expected.materials.length;i++){
  assert.notEqual(state.materials[i].originalPath,expected.materials[i].originalPath);
  assert.deepEqual(await originalBytes(folder,state.materials[i].originalPath),[...f.originals.get(expected.materials[i].originalPath)]);
  expected.materials[i].originalPath=state.materials[i].originalPath;
 }
 assert.deepEqual(state,expected);
 const restarted=runtime();await restarted.api.connect(folder.handle);assert.deepEqual(restarted.state(),expected);
 const again=restarted.sandbox.OskarBackupZip.unpack(new Uint8Array(await (await restarted.api.exportFullBackup()).arrayBuffer()));
 assert.equal([...again.keys()].filter(p=>p.startsWith('Originaldateien/')).length,3);
 assert.equal(folder.data.files.has('.oskar-transaction.json'),false);
});

for(const mode of ['truncated','checksum','missing','extra','invalid-json','missing-reference','slip','duplicate','compression','oversized-entry','bad-central','invalid-manifest-version']){
 test('invalid ZIP '+mode+' changes neither current state nor destination files',async()=>{
  const f=await fullFixture();let blob;
  if(mode==='truncated')blob=f.blob.slice(0,-1);
  else if(mode==='slip'){
   const bytes=new Uint8Array(await f.blob.arrayBuffer());
   // Replace a same-length ASCII name in local and central headers.
   const from=new TextEncoder().encode('materialien.json'),to=new TextEncoder().encode('../evilfile.json');
   for(let i=0;i<=bytes.length-from.length;i++)if(from.every((v,j)=>bytes[i+j]===v))bytes.set(to,i);
   blob=new Blob([bytes]);
  }else if(['compression','oversized-entry','bad-central'].includes(mode)){
   const bytes=new Uint8Array(await f.blob.arrayBuffer()),v=new DataView(bytes.buffer);
   if(mode==='compression')v.setUint16(8,8,true);
   if(mode==='oversized-entry')v.setUint32(22,0xffffffff,true);
   if(mode==='bad-central')v.setUint32(bytes.length-6,0xffffffff,true);
   blob=new Blob([bytes]);
  }else blob=await alteredBlob(f,entries=>{
   if(mode==='checksum'){const m=JSON.parse(f.zip.decode(entries.get('manifest.json')));m.files[0].sha256='0'.repeat(64);entries.set('manifest.json',f.zip.encode(JSON.stringify(m)));}
   if(mode==='invalid-manifest-version'){const m=JSON.parse(f.zip.decode(entries.get('manifest.json')));m.version=999;entries.set('manifest.json',f.zip.encode(JSON.stringify(m)));}
   if(mode==='missing')entries.delete('Originaldateien/math/synthetic.pdf');
   if(mode==='extra')entries.set('unexpected.txt',f.zip.encode('synthetic'));
   if(mode==='invalid-json')entries.set('lernstand.json',f.zip.encode('{broken'));
   if(mode==='missing-reference')entries.delete('Originaldateien/math/synthetic.pdf');
   if(mode==='duplicate'){const m=JSON.parse(f.zip.decode(entries.get('manifest.json')));m.files[1]=m.files[0];entries.set('manifest.json',f.zip.encode(JSON.stringify(m)));}
  },{rehash:['invalid-json','missing-reference'].includes(mode)});
  const expected=dataset('existing'),folder=memoryFolder('target').seed(expected),app=runtime();await app.api.connect(folder.handle);
  const before=folder.image(),events=folder.events.length;let approved=false;
  await assert.rejects(app.api.restoreFullBackup(blob,{approve(){approved=true;return true;}}));
  assert.deepEqual(app.state(),expected);assert.deepEqual(folder.image(),before);
  assert.equal(folder.events.length,events,'invalid archive must not access destination');assert.equal(approved,false);
 });
}

test('full backup rejects oversized archive before reading and requires an explicitly connected folder',async()=>{
 const app=runtime();await assert.rejects(app.api.exportFullBackup());
 const folder=memoryFolder();await app.api.connect(folder.handle);
 await assert.rejects(app.api.restoreFullBackup({size:257*1024*1024,arrayBuffer(){throw Error('must not read');}}),/zu groß/);
});

test('missing original aborts export instead of issuing an incomplete full backup',async()=>{
 const app=runtime(),data=dataset();data.materials[0].originalPath='Originaldateien/math/missing.pdf';
 await app.api.connect(memoryFolder().seed(data).handle);await assert.rejects(app.api.exportFullBackup(),/Originaldatei fehlt/);
});

test('cancelling a valid restore leaves all destination data intact',async()=>{
 const f=await fullFixture(),app=runtime(),folder=memoryFolder().seed(dataset('existing'));await app.api.connect(folder.handle);
 const before=folder.image();assert.equal(await app.api.restoreFullBackup(f.blob,{approve:()=>false}),false);assert.deepEqual(folder.image(),before);
});

for(const phase of ['write','close'])for(const location of ['original','metadata']){
 test('full restore '+phase+' failure in '+location+' rolls back data and removes only newly staged originals',async()=>{
  const f=await fullFixture(),old=dataset('old'),folder=memoryFolder('destination'),oldOriginals=await seedOriginals(folder,old);
  folder.seed(old);const app=runtime();await app.api.connect(folder.handle);const before=folder.primary();
  folder.fail(e=>e.phase===phase&&(location==='original'?e.name.startsWith('restore-'):e.name==='aufgaben.json'));
  await assert.rejects(app.api.restoreFullBackup(f.blob));assert.deepEqual(app.state(),old);assert.deepEqual(folder.primary(),before);
  for(const [path,bytes] of oldOriginals)assert.deepEqual(await originalBytes(folder,path),[...bytes]);
  for(const dir of folder.data.directories.get('Originaldateien').directories.values())assert.equal([...dir.files.keys()].some(n=>n.startsWith('restore-')),false);
  const restarted=runtime();await restarted.api.connect(folder.handle);assert.deepEqual(restarted.state(),old);
 });
}

test('interrupted full restore recovers both metadata and staged originals on a fresh runtime',async()=>{
 const f=await fullFixture(),old=dataset('old'),folder=memoryFolder().seed(old),app=runtime();await app.api.connect(folder.handle);
 let reached;const writing=new Promise(resolve=>{reached=resolve;});
 folder.fail(e=>e.phase==='close'&&e.name==='aufgaben.json',()=>{reached();return new Promise(()=>{});});
 void app.api.restoreFullBackup(f.blob);await writing;
 assert.equal(folder.data.files.has('.oskar-transaction.json'),true);
 const restarted=runtime();await restarted.api.connect(folder.handle);assert.deepEqual(restarted.state(),old);
 assert.equal(folder.data.files.has('.oskar-transaction.json'),false);
 for(const dir of folder.data.directories.get('Originaldateien').directories.values())assert.equal(dir.files.size,0);
});

test('failed cleanup retains the journal and a fresh connection completes recovery',async()=>{
 const f=await fullFixture(),old=dataset('old'),folder=memoryFolder().seed(old),app=runtime();await app.api.connect(folder.handle);
 const failure=folder.fail(e=>e.phase==='close'&&e.name==='aufgaben.json');
 folder.fail(e=>failure.used&&e.phase==='remove'&&e.name.startsWith('restore-'));
 await assert.rejects(app.api.restoreFullBackup(f.blob));assert.equal(folder.data.files.has('.oskar-transaction.json'),true);
 const restarted=runtime();await restarted.api.connect(folder.handle);assert.deepEqual(restarted.state(),old);
 assert.equal(folder.data.files.has('.oskar-transaction.json'),false);
});

test('ZIP paths reject traversal, Windows paths, ambiguous aliases, devices and case duplicates',()=>{
 const zip=runtime().sandbox.OskarBackupZip;
 for(const path of ['../x','/x','C:/x','a\\b','a//b','a/./b','a/../b','a/%2e%2e/x','a/CON.txt','a/file.','a/ü.pdf','a\0b'])assert.throws(()=>zip.path(path));
 assert.throws(()=>zip.pack(new Map([['a',new Uint8Array()],['A',new Uint8Array()]])));
});

test('a validly checksummed archive with an unknown payload or missing data group is still refused',async()=>{
 const f=await fullFixture(),app=runtime(),folder=memoryFolder().seed(dataset('existing'));await app.api.connect(folder.handle);const before=folder.image();
 for(const mutate of [entries=>entries.set('unexpected.txt',f.zip.encode('synthetic')),entries=>entries.delete('aufgaben.json')]){
  const blob=await alteredBlob(f,mutate,{rehash:true});await assert.rejects(app.api.restoreFullBackup(blob));assert.deepEqual(folder.image(),before);
 }
});

test('CRC detects altered payload bytes even before manifest validation',async()=>{
 const f=await fullFixture(),bytes=new Uint8Array(await f.blob.arrayBuffer());bytes[50]^=1;
 assert.throws(()=>f.zip.unpack(bytes));
});

test('restore preflight refuses an existing generated destination filename without overwriting it',async()=>{
 const f=await fullFixture(),old=dataset('old'),folder=memoryFolder().seed(old),app=runtime();await app.api.connect(folder.handle);
 const id='00000000-0000-4000-8000-000000000000';
 app.sandbox.crypto={subtle:webcrypto.subtle,randomUUID:()=>id};
 const base=await folder.data.getDirectoryHandle('Originaldateien',{create:true}),math=await base.getDirectoryHandle('math',{create:true});
 const name='restore-'+id+'-0-synthetic.pdf';math.files.set(name,new Uint8Array([17,18,19]));
 const before=folder.primary();await assert.rejects(app.api.restoreFullBackup(f.blob),/existiert bereits/);
 assert.deepEqual([...math.files.get(name)],[17,18,19]);assert.deepEqual(folder.primary(),before);assert.deepEqual(app.state(),old);
});

test('interruption during original writing cleans staged files and restores previous data after restart',async()=>{
 const f=await fullFixture(),old=dataset('old'),folder=memoryFolder().seed(old),app=runtime();await app.api.connect(folder.handle);
 let reached;const writing=new Promise(resolve=>{reached=resolve;});
 folder.fail(e=>e.phase==='close'&&e.name.startsWith('restore-'),()=>{reached();return new Promise(()=>{});});
 void app.api.restoreFullBackup(f.blob);await writing;
 const restarted=runtime();await restarted.api.connect(folder.handle);assert.deepEqual(restarted.state(),old);
 for(const dir of folder.data.directories.get('Originaldateien').directories.values())assert.equal(dir.files.size,0);
});

test('editing data while originals are exported aborts the backup and preserves the newer state',async()=>{
 const f=await fullFixture();let reached,release;
 const reading=new Promise(resolve=>{reached=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 f.folder.fail(e=>e.phase==='read'&&e.name==='synthetic.pdf',()=>{reached();return gate;});
 const exporting=f.app.api.exportFullBackup();await reading;
 const newer=clone(f.expected);newer.progress.xp=777;f.app.setState(newer);f.app.api.snapshot();release();
 await assert.rejects(exporting,/geändert/);await f.app.api.flush();assert.deepEqual(f.app.state(),newer);
 const restarted=runtime();await restarted.api.connect(f.folder.handle);assert.deepEqual(restarted.state(),newer);
});

test('editing data during an original restore rolls back before saving the newer current state',async()=>{
 const f=await fullFixture(),old=dataset('old'),folder=memoryFolder().seed(old),app=runtime();await app.api.connect(folder.handle);
 let reached,release;const writing=new Promise(resolve=>{reached=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 folder.fail(e=>e.phase==='close'&&e.name.startsWith('restore-'),()=>{reached();return gate;});
 const restoring=app.api.restoreFullBackup(f.blob);await writing;
 const newer=dataset('newer');app.setState(newer);app.api.snapshot();release();
 await assert.rejects(restoring);await app.api.flush();assert.deepEqual(app.state(),newer);
 const restarted=runtime();await restarted.api.connect(folder.handle);assert.deepEqual(restarted.state(),newer);
});
