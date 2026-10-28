/* Oskars Lernstelle · Klausurbezogener Lernplan und lokales Tagestracking (v0.8).
   Keine Telemetrie oder Hintergrundüberwachung. Ein Lerntag zählt erst nach Abschluss. */
(function () {
  'use strict';
  if (!Array.isArray(store.studyLog)) store.studyLog = [];
  if (!store.examDates || typeof store.examDates !== 'object' || Array.isArray(store.examDates)) store.examDates = {};
  var defaultDates = Object.fromEntries(EXAMS.map(function (e) { return [e.id, e.date]; }));
  var activeTab = 'plan';

  function validDate(value) {
    if (value === null || value === '') return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var d = new Date(value + 'T12:00:00');
    return !Number.isNaN(d.getTime()) && keyOf(d) === value;
  }
  function keyOf(d) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  }
  function offsetDate(base, offset) {
    var d = new Date(base + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    return keyOf(d);
  }
  function daysBetween(start, end) {
    var a = new Date(start + 'T12:00:00'), b = new Date(end + 'T12:00:00');
    return Math.round((b - a) / 86400000);
  }
  function fullDate(date) {
    return new Date(date + 'T12:00:00').toLocaleDateString('de-DE', {weekday:'short', day:'numeric', month:'short', year:'numeric'});
  }
  function applyDates() {
    EXAMS.forEach(function (e) {
      var val = Object.prototype.hasOwnProperty.call(store.examDates, e.id) ? store.examDates[e.id] : defaultDates[e.id];
      e.date = validDate(val) ? (val || null) : defaultDates[e.id];
    });
    EXAMS.sort(function (a, b) {return (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99');});
  }
  function futureExams(day) {
    return EXAMS.filter(function (e) {return e.date && e.date >= day;})
      .sort(function (a, b) {return a.date.localeCompare(b.date);});
  }
  function phase(days) {
    if (days <= 1) return {title:'Kurzer Wissenscheck', detail:'Bekannte Fragen wiederholen, keine neuen Themen.', duration:10, level:0, type:'review'};
    if (days <= 3) return {title:'Probe & Fehlertraining', detail:'Ohne Spickzettel üben, danach Fehler klären.', duration:15, level:2, type:'test'};
    if (days <= 7) return {title:'Üben & anwenden', detail:'Fragen beantworten und Erklärungen prüfen.', duration:15, level:1, type:'practice'};
    return {title:'Grundlagen verstehen', detail:'Stoff aus dem Heft durchgehen und erste Fragen lösen.', duration:15, level:0, type:'learn'};
  }
  function planOn(day) {
    var exams = futureExams(day);
    if (!exams.length) {
      var fallback = EXAMS.find(function (e) {return e.id === (Number(day.slice(-2)) % 2 ? 'math' : 'biology');}) || EXAMS[0];
      return {exam:fallback, days:null, phase:{title:'Wissen auffrischen', detail:'Eine kurze, freie Wiederholung ohne Klausurdruck.',duration:10,level:0,type:'learn'}, extra:null};
    }
    /* Nur eine Hauptmission. Bei größerem Abstand erhält gelegentlich das zweite Fach den Vortritt. */
    var primary = exams[0];
    var left = daysBetween(day, primary.date);
    if (left >= 8 && exams[1] && daysBetween(day, exams[1].date) <= 20 && Number(day.slice(-2)) % 3 === 0) primary = exams[1];
    left = daysBetween(day, primary.date);
    /* Am Klausurtag ist die Klausur selbst die Aufgabe, keine verpflichtende Übung. */
    if (left === 0) {
      var next = exams.find(function (e) {return e.id !== primary.id && e.date > day;});
      if (next) {primary = next;left = daysBetween(day, primary.date);}
      else return {exam:primary, days:0, phase:{title:'Klausurtag – viel Erfolg!',detail:'Heute keine zusätzliche Pflichtübung.', duration:0, level:0, type:'exam'},extra:null};
    }
    var extra = exams.find(function (e) {return e.id !== primary.id && e.date > day && daysBetween(day, e.date) <= 12;});
    return {exam:primary, days:left, phase:phase(left), extra:extra || null};
  }
  function learned(day) {
    return (Array.isArray(store.days) && store.days.includes(day)) || store.studyLog.some(function (x) {return x.date === day;});
  }
  function entries(day) {
    return store.studyLog.filter(function (x) {return x.date === day;});
  }
  function percentCorrect(log) {
    var totals = log.reduce(function (x, y) {x.correct += Number(y.correct)||0;x.total += Number(y.total)||0;return x;},{correct:0,total:0});
    return totals.total ? Math.round(100 * totals.correct / totals.total) + ' %' : '–';
  }
  function sourceHint(id) {
    if (typeof hasSources === 'function' && hasSources(id)) {
      return typeof realQuestions === 'function' && realQuestions(id).length
        ? 'Mit freigegebenen Aufgaben aus deinem Schulstoff'
        : 'Schulstoff vorhanden – bitte zuerst Aufgaben freigeben';
    }
    return 'Derzeit nur Demoaufgaben – Schulmaterial ergänzen';
  }
  function safe(s) {return noHtml(String(s));}

  var style = document.createElement('style');
  style.textContent = [
    '.plan-teaser{padding:19px 22px}.plan-top{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap}',
    '.plan-kicker{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6773c9;font-weight:900}',
    '.plan-top h2{margin:3px 0 4px;font-size:19px}.plan-description{margin:0;color:#66748e;font-size:13px}',
    '.plan-status{display:inline-block;border-radius:20px;background:#e8f8ed;color:#147a58;padding:5px 10px;font-weight:800;font-size:12px}',
    '.plan-status.pending{background:#f0f2fb;color:#5967a1}.plan-sub{font-size:12px;color:#7885a0;margin:9px 0 0}',
    '.plan-short-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-top:14px}.plan-short-actions .btn{padding:10px 14px;font-size:12px}',
    '.plan-dialog{max-width:760px}.plan-tabs{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:18px}',
    '.plan-tabs button{border:0;background:#eff2fa;color:#5c6686;border-radius:11px;padding:10px 13px;font-weight:800;font-size:12px}',
    '.plan-tabs button.active{background:#e4f8ed;color:#157a56}.plan-schedule{display:grid;gap:9px}',
    '.plan-row{border:1px solid #e7ecf6;border-radius:16px;padding:13px;display:flex;align-items:flex-start;gap:12px}',
    '.plan-row.today{border-color:#7ad7ab;background:#f5fff9}.plan-row.past{opacity:.9}',
    '.plan-date{min-width:77px;font-size:12px;color:#62728e;font-weight:800}.plan-date strong{display:block;color:#2b3b5c;font-size:14px}',
    '.plan-detail{flex:1;min-width:0}.plan-detail strong{font-size:13px}.plan-detail p{font-size:12px;color:#738098;margin:3px 0 0}',
    '.plan-chip{font-size:11px;font-weight:900;border-radius:10px;padding:5px 8px;white-space:nowrap;background:#f1f4fb;color:#5d6a84}',
    '.plan-chip.complete{background:#dff7e9;color:#18734f}.plan-toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}',
    '.plan-exam-edit{display:grid;grid-template-columns:1fr minmax(136px,185px);align-items:center;gap:10px;border-bottom:1px solid #edf1f7;padding:10px 0;font-size:13px}',
    '.plan-exam-edit input{width:100%;padding:8px;border:1px solid #d9e1ef;border-radius:10px;color:#243453}',
    '.plan-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:14px 0 18px}',
    '.plan-metric{padding:14px 10px;background:#f6f8fc;border-radius:13px}.plan-metric b{font-size:22px;display:block}.plan-metric small{color:#6d7b92;font-size:11px}',
    '.plan-empty{font-size:13px;color:#728099;padding:12px;background:#f7f9fc;border-radius:12px}',
    '@media(max-width:550px){.plan-metrics{grid-template-columns:repeat(3,1fr)}.plan-metric{padding:10px 7px}.plan-metric b{font-size:18px}.plan-date{min-width:63px}.plan-row{gap:7px;padding:10px}.plan-chip{font-size:10px}}'
  ].join('\n');
  document.head.appendChild(style);

  var hero = $('heroBtn').closest('.hero');
  hero.insertAdjacentHTML('afterend',
    '<section class="panel plan-teaser" id="planTeaser" aria-label="Deine Tagesmission">' +
    '<div class="plan-top"><div><div class="plan-kicker">Dein Lernrhythmus</div><h2>Deine Tagesmission</h2>' +
    '<p class="plan-description" id="planTeaserText"></p></div><span class="plan-status pending" id="planTeaserStatus"></span></div>' +
    '<p class="plan-sub" id="planTeaserSource"></p><div class="plan-short-actions">' +
    '<button type="button" class="btn btn-green" id="planStart">Jetzt üben</button>' +
    '<button type="button" class="btn btn-light" id="planOpen">Lernplan & Tracking</button></div></section>');
  document.body.insertAdjacentHTML('beforeend',
    '<div class="overlay" id="plannerOverlay" role="presentation"><section class="dialog plan-dialog" role="dialog" aria-modal="true" aria-labelledby="plannerHeading">' +
    '<div class="dialog-head"><div class="title" id="plannerHeading">Lernplan bis zur Klassenarbeit</div>' +
    '<button class="close" id="plannerClose" aria-label="Lernplan schließen">×</button></div>' +
    '<div class="dialog-content"><nav class="plan-tabs" aria-label="Lernplan-Ansichten">' +
    '<button data-plan-tab="plan" class="active">14-Tage-Plan</button>' +
    '<button data-plan-tab="tracking">Lerntracking</button>' +
    '<button data-plan-tab="dates">Klausurtermine</button></nav>' +
    '<div id="planContent"></div></div></section></div>');
  var overlay = $('plannerOverlay');
  var previousFocus = null;
  function openPlanner(tab) {
    previousFocus = document.activeElement;
    activeTab = tab || 'plan';
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    renderPlannerDialog();
    $('plannerClose').focus({preventScroll:true});
  }
  function closePlanner() {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    if (location.hash === '#lernplan' || location.hash === '#tracking') history.replaceState(null,'',location.pathname + location.search);
    if (previousFocus && previousFocus.isConnected) previousFocus.focus({preventScroll:true});
    previousFocus = null;
  }
  function logLearning(entry) {
    if (!Array.isArray(store.studyLog)) store.studyLog = [];
    store.studyLog.push(entry);
    if (store.studyLog.length > 730) store.studyLog = store.studyLog.slice(-730);
    if (!store.days.includes(entry.date)) store.days.push(entry.date);
    persist();
    render();
  }
  function recordFinishedLesson(data) {
    logLearning({
      date: todayKey(), subject: data.id, correct: data.correctCount,
      total: data.items.length, kind: data.review ? 'review' : data.custom ? 'school' : 'demo',
      timestamp: new Date().toISOString()
    });
  }

  /* Bestehende Abschlussfunktion ist das alleinige Erfolgssignal; keine bloßen Klicks zählen. */
  var finishBeforePlanner = finishLesson;
  finishLesson = function () {
    var data = session && !session.done && Array.isArray(session.items) ? {
      id:session.id, correctCount:session.correctCount, items:session.items,
      custom:!!session.custom, review:!!session.review
    } : null;
    finishBeforePlanner();
    if (data && session && session.done) recordFinishedLesson(data);
  };
  window.oskarRegisterJourney = function (journeyId) {
    logLearning({date:todayKey(),subject:'journey',journeyId:String(journeyId||'').slice(0,100),correct:0,total:0,kind:'journey',timestamp:new Date().toISOString()});
  };
  var previousJourneyDone = typeof setJourneyDone === 'function' ? setJourneyDone : null;
  if (previousJourneyDone) {
    setJourneyDone = function (id) {
      previousJourneyDone(id);
      if (id === 'final') window.oskarRegisterJourney('wasserreise');
    };
  }

  function startPlanned() {
    var p = planOn(todayKey()), e = p.exam;
    if (!p.phase.duration) {openPlanner('plan');return;}
    closePlanner();
    chooseSubject(e.id);
    if (typeof hasSources === 'function' && hasSources(e.id) && !realQuestions(e.id).length) {
      toast('Bitte zuerst Schulstoff-Aufgaben freigeben.');
      if (typeof openMaterials === 'function') openMaterials();
      else openParent();
      return;
    }
    if (p.phase.type === 'review' || p.phase.type === 'test') {
      var items = store.errors.filter(function (x) {return x.subject === e.id;})
        .map(findErrorQuestion).filter(Boolean).slice(0,6);
      if (items.length) {
        session = {id:e.id,level:0,items:items,index:0,chosen:null,checked:false,correctCount:0,review:true,custom:hasSources(e.id)};
        $('lessonOverlay').classList.add('show');
        document.body.style.overflow = 'hidden';
        renderQuestion();
        return;
      }
    }
    var requested = p.phase.level;
    var unlocked = requested;
    while (unlocked > 0 && !isLevelDone(e.id, unlocked-1)) unlocked--;
    startLesson(e.id, unlocked);
  }
  function renderPlanTab() {
    var today = todayKey(), html = '<p class="small">Jeden Tag eine kurze Hauptmission (10–15 Minuten). Die App plant nach dem nächsten Termin und passt die Übungen an. Die Themen entsprechen erst dann Oskars Schulstoff, wenn geprüfte Materialien vorliegen.</p><div class="plan-schedule">';
    for (var i=0;i<14;i++) {
      var day=offsetDate(today,i), p=planOn(day);
      var done=learned(day), hasSubject=entries(day).some(function (x) {return x.subject === p.exam.id;});
      var label=done?(hasSubject?'Plan erfüllt':'Gelernt'):p.phase.duration?('ca. '+p.phase.duration+' Min.'):'Klausur';
      html += '<article class="plan-row'+(i===0?' today':'')+'"><div class="plan-date"><strong>'+safe(new Date(day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short'}))+'</strong>'+safe(new Date(day+'T12:00:00').toLocaleDateString('de-DE',{day:'numeric',month:'short'}))+'</div>'+
        '<div class="plan-detail"><strong>'+safe(p.exam.icon+' '+p.exam.name+' · '+p.phase.title)+'</strong><p>'+safe(p.phase.detail)+
        (p.days!==null && p.days>0?' · Klausur in '+p.days+' Tagen':'')+'</p></div>'+
        '<span class="plan-chip'+(done?' complete':'')+'">'+safe(label)+'</span></article>';
    }
    return html+'</div><p class="small" style="margin-top:13px">Wird eine Übung an einem anderen Fach abgeschlossen, zählt der Lerntag trotzdem. Der nächste Tag wird automatisch neu berechnet.</p>';
  }
  function renderTrackingTab() {
    var today=todayKey(), todayIndex=store.days || [], n=0, missed=0, rows='';
    for(var i=0;i<14;i++){
      var day=offsetDate(today,-i), done=learned(day), log=entries(day);
      if(done)n++;else if(i>0)missed++;
      var names=[...new Set(log.map(function(x){return subject(x.subject)?.name || (x.kind==='journey'?'Entdeckerreise':'Lernen');}))];
      var detail=log.length ? log.length+' Übung'+(log.length===1?'':'en')+' · '+names.join(', ')+(log.some(function(x){return x.total>0;})?' · '+percentCorrect(log):'')
        : done?'Lerneinheit abgeschlossen (älterer Eintrag)':'Kein abgeschlossener Lernvorgang gespeichert';
      rows+='<div class="plan-row past"><div class="plan-date"><strong>'+safe(new Date(day+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short'}))+'</strong>'+safe(new Date(day+'T12:00:00').toLocaleDateString('de-DE',{day:'numeric',month:'short'}))+'</div>'+
        '<div class="plan-detail"><strong>'+safe(done?'Lernen abgeschlossen':i===0?'Heute noch offen':'Ohne Eintrag')+'</strong><p>'+safe(detail)+'</p></div>'+
        '<span class="plan-chip'+(done?' complete':'')+'">'+(done?'✓':'–')+'</span></div>';
    }
    var rated=store.studyLog.filter(function(x){return x.kind==='school' && x.total>0;});
    return '<p class="small">Nur vollständig abgeschlossene Übungen werden gezählt. Frühere Lerntage ohne Einzelergebnis bleiben erhalten. Keine automatische Kontrolle außerhalb dieses Browsers.</p>'+
      '<div class="plan-metrics"><div class="plan-metric"><b>'+n+'/14</b><small>Lerntage</small></div>'+
      '<div class="plan-metric"><b>'+calcStreak()+'</b><small>Tage in Folge</small></div>'+
      '<div class="plan-metric"><b>'+percentCorrect(rated)+'</b><small>Richtige Antworten aus Schulstoff</small></div></div>'+
      '<div class="plan-toolbar"><strong>Letzte 14 Tage</strong><span class="caption">'+missed+' Tage ohne Eintrag (ohne heute)</span></div><div class="plan-schedule">'+rows+'</div>';
  }
  function renderDatesTab() {
    var html='<p class="small">Termine sind aus dem bestehenden Klassenarbeitsplan vorbelegt. Bitte kontrollieren und bei Änderungen korrigieren. Ein leeres Datum bedeutet: Noch kein Termin bekannt.</p><form id="planDateForm">';
    EXAMS.slice().sort(function(a,b){return a.name.localeCompare(b.name,'de');}).forEach(function(e){
      html += '<label class="plan-exam-edit"><span>'+safe(e.icon+' '+e.name)+'</span><input type="date" data-exam-id="'+safe(e.id)+'" value="'+safe(e.date||'')+'"></label>';
    });
    return html+'</form><div class="plan-short-actions"><button class="btn btn-green" id="planSaveDates">Termine speichern</button></div><p class="small" style="margin-top:12px">Termine und Lernfortschritte werden ausschließlich im Browser dieses Geräts gespeichert und im JSON-Backup mitgesichert.</p>';
  }
  function renderPlannerDialog() {
    if (!overlay.classList.contains('show')) return;
    overlay.querySelectorAll('[data-plan-tab]').forEach(function(btn){btn.classList.toggle('active',btn.dataset.planTab===activeTab);});
    $('planContent').innerHTML = activeTab==='tracking' ? renderTrackingTab() : activeTab==='dates' ? renderDatesTab() : renderPlanTab();
  }
  function renderPlanner() {
    var today=todayKey(), plan=planOn(today), done=learned(today), e=plan.exam;
    $('planTeaserText').textContent = plan.phase.duration
      ? e.icon+' '+e.name+' · '+plan.phase.title+' · etwa '+plan.phase.duration+' Minuten'
      : e.icon+' '+e.name+' · '+plan.phase.title;
    $('planTeaserStatus').textContent=done?'Heute gelernt ✓':plan.phase.duration?'Heute noch offen':'Heute Klausur';
    $('planTeaserStatus').classList.toggle('pending',!done);
    $('planTeaserSource').textContent=plan.phase.duration ? sourceHint(e.id) : 'Die Klausur ersetzt heute die tägliche Lernmission.';
    $('planStart').textContent=done?'Noch eine Runde üben':'Tagesmission starten';
    $('planStart').disabled=!plan.phase.duration;
    renderPlannerDialog();
  }
  function saveDates() {
    var values={}, invalid=false;
    $('planDateForm').querySelectorAll('input[data-exam-id]').forEach(function(el) {
      if (!validDate(el.value)) invalid=true;
      values[el.dataset.examId]=el.value || null;
    });
    if (invalid) {toast('Bitte gültige Klausurtermine eingeben.');return;}
    store.examDates=values;
    persist();
    render();
    toast('Klausurtermine und Lernplan aktualisiert.');
  }
  $('planStart').addEventListener('click',startPlanned);
  $('planOpen').addEventListener('click',function(){openPlanner('plan');});
  function syncPlannerHash() {
    if (location.hash === '#lernplan') openPlanner('plan');
    else if (location.hash === '#tracking') openPlanner('tracking');
  }
  window.addEventListener('hashchange',syncPlannerHash);
  $('plannerClose').addEventListener('click',closePlanner);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closePlanner();});
  overlay.addEventListener('click',function(e){
    var tab=e.target.closest('[data-plan-tab]');
    if(tab){activeTab=tab.dataset.planTab;renderPlannerDialog();return;}
    if(e.target.closest('#planSaveDates')) saveDates();
  });
  document.addEventListener('keydown',function(e){if(e.key==='Escape' && overlay.classList.contains('show'))closePlanner();});
  var oldRender=render;
  render=function(){applyDates();oldRender();renderPlanner();};
  applyDates();
  render();
  syncPlannerHash();
})();