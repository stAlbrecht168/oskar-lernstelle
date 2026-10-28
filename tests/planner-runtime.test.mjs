import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const planner = readFileSync(new URL('../planner-v08.js', import.meta.url), 'utf8');

// Minimal DOM for executing the complete planner with synthetic state, without
// browser storage, folder permissions or network access.
function loadPlanner({missing = [], examDay = false} = {}) {
  const elements = new Map();
  function element() {
    const classes = new Set(), listeners = new Map();
    return {
      textContent: '', innerHTML: '', style: {}, dataset: {}, isConnected: true,
      classList: {
        add: name => classes.add(name), remove: name => classes.delete(name),
        contains: name => classes.has(name),
        toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }
      },
      addEventListener(name, callback) {
        if (!listeners.has(name)) listeners.set(name, []);
        listeners.get(name).push(callback);
      },
      click() {
        const event = {target: this, stopImmediatePropagation() {}};
        for (const callback of listeners.get('click') || []) callback(event);
      },
      focus() {},
      querySelectorAll() { return []; }
    };
  }
  function register(html) {
    for (const match of html.matchAll(/\bid="([^"]+)"/g)) {
      if (!missing.includes(match[1])) elements.set(match[1], element());
    }
  }
  register(page.split('<script')[0]);
  const document = {
    head: {appendChild() {}},
    body: {style: {}, insertAdjacentHTML(position, html) { register(html); }},
    getElementById: id => elements.get(id) || null,
    createElement: element, addEventListener() {}, activeElement: null
  };
  const state = {xp: 12, completed: [], errors: [], days: [], materials: [], studyLog: [], examDates: {}};
  const exams = [
    {id: 'music', name: 'Musik', icon: '♪', date: examDay ? '2026-10-28' : '2026-11-02'},
    {id: 'math', name: 'Mathe', icon: '+', date: examDay ? null : '2026-11-05'}
  ];
  let renders = 0;
  const starts = [];
  const sandbox = {
    document, store: state, EXAMS: exams, session: null,
    $: document.getElementById, noHtml: text => String(text),
    todayKey: () => '2026-10-28',
    location: {hash: '', pathname: '/', search: ''}, history: {replaceState() {}},
    addEventListener() {}, persist() {}, toast() {},
    render() { renders++; },
    finishLesson() { if (sandbox.session) sandbox.session.done = true; },
    chooseSubject() { sandbox.render(); },
    isLevelDone: () => false, hasSources: () => false, realQuestions: () => [],
    startLesson(id, level) {
      starts.push({id, level});
      sandbox.session = {id, level, correctCount: 2, items: [{}, {}, {}], custom: false, review: false};
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(planner, sandbox, {filename: 'planner-v08.js'});
  return {sandbox, elements, state, starts, renders: () => renders};
}

test('daily mission initializes from the actual page and remains renderable after lesson completion', () => {
  const {sandbox, elements, state, starts, renders} = loadPlanner();
  const status = elements.get('heroDailyStatus');
  assert.ok(status, 'the main mission must include its status element');
  assert.equal(status.textContent, 'Heute noch offen');
  assert.match(elements.get('heroTitle').textContent, /Musik: Üben & anwenden/);
  assert.equal(elements.get('heroBtn').textContent, 'Mit Beispielen starten');

  elements.get('heroBtn').click();
  assert.deepEqual(starts, [{id: 'music', level: 0}]);
  assert.equal(state.studyLog.length, 0, 'starting alone must not count as learned');
  sandbox.finishLesson();
  assert.equal(state.studyLog.length, 1);
  assert.equal(state.studyLog[0].subject, 'music');
  assert.equal(state.studyLog[0].total, 3);
  assert.equal(status.textContent, 'Heute gelernt ✓');
  assert.equal(status.classList.contains('is-done'), true);
  assert.equal(elements.get('heroBtn').textContent, 'Noch eine Runde üben');
  assert.equal(state.xp, 12, 'the planner must leave XP accounting to the lesson');
  const before = renders();
  sandbox.render();
  assert.equal(renders(), before + 1, 'the existing render chain must keep running');
});

test('missing supplemental status and source do not block initialization, learning or the plan dialog', () => {
  const {sandbox, elements, starts} = loadPlanner({missing: ['heroDailyStatus', 'heroSource']});
  sandbox.render();
  elements.get('planOpen').click();
  assert.equal(elements.get('plannerOverlay').classList.contains('show'), true);
  assert.equal((elements.get('planContent').innerHTML.match(/<article class="plan-row/g) || []).length, 14);
  elements.get('heroBtn').click();
  assert.deepEqual(starts, [{id: 'music', level: 0}]);
  assert.equal(elements.get('plannerOverlay').classList.contains('show'), false);
  assert.doesNotThrow(() => sandbox.finishLesson());
});

test('the planner tolerates missing mission elements and still invokes the previous renderer', () => {
  const {sandbox, renders} = loadPlanner({missing: ['heroMeta', 'heroTitle', 'heroDesc', 'heroSource', 'heroDailyStatus', 'heroBtn', 'planOpen']});
  const before = renders();
  assert.doesNotThrow(() => sandbox.render());
  assert.equal(renders(), before + 1);
});

test('on the exam day the mission opens the plan instead of starting a mandatory lesson', () => {
  const {elements, state, starts} = loadPlanner({examDay: true});
  assert.equal(elements.get('heroDailyStatus').textContent, 'Klassenarbeit');
  assert.equal(elements.get('heroBtn').textContent, 'Zum Lernplan');
  elements.get('heroBtn').click();
  assert.equal(starts.length, 0);
  assert.equal(state.studyLog.length, 0);
  assert.equal(elements.get('plannerOverlay').classList.contains('show'), true);
});
