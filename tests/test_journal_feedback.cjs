// Deterministic Journal scheduling checks; no network, model or user data.
// Run: node tests/test_journal_feedback.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'emotion_rec', 'static');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const helpers = source.slice(source.indexOf('function renderPlainMirror('), source.indexOf('function saveEntries('));
const preference = source.slice(source.indexOf('function readFeedbackPreference('), source.indexOf('let realtimeFeedbackEnabled ='));
const modeSync = source.slice(source.indexOf('function syncRealtimeFeedbackToggle('), source.indexOf('function hexToRgba('));

function element() {
  const classes = new Set();
  return {value: '', textContent: '', hidden: false, dataset: {}, style: {},
    setAttribute(name, value) {this[name] = value;},
    classList: {toggle(name, active) {if (active) classes.add(name); else classes.delete(name);}}, classes};
}
const flush = async () => {for (let i = 0; i < 12; i++) await Promise.resolve();};
function harness(language = 'en', mode = null, blockedStorage = false, demo = false) {
  const requests = [], renders = [], applied = [], events = [], tasks = new Map();
  let now = 0, nextId = 1, localCalls = 0;
  const window = {};
  const document = {readyState: 'loading', documentElement: {}, addEventListener() {}, querySelectorAll: () => [],
    dispatchEvent(event) {events.push(event);}};
  const localStorage = {getItem(key) {
    if (blockedStorage) throw Error('Storage unavailable');
    return key === 'emomirror.lang' ? language : key === 'emomirror.feedbackMode' ? mode : 'true';
  }, setItem(key, value) {if (blockedStorage) throw Error('Storage unavailable'); if (key === 'emomirror.feedbackMode') mode = value;}};
  const context = vm.createContext({window, document, localStorage});
  vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), context);
  Object.assign(context, {
    AbortController, CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options.detail;}},
    journalText: {value: demo ? 'Starter sample' : 'First entry'}, currentDesign: {}, currentVAMapping: null, analysisCache: new Map(),
    journalDemoActive: demo, journalDemoText: demo ? 'Starter sample' : null,
    activeAnalysisController: null, inflightAnalysisKey: '', analyzeTimer: null, analysisSequence: 0,
    scheduledAnalysisKey: null, renderedAnalysisKey: null, analysisPhase: 'idle', isComposingJournal: false,
    JOURNAL_ANALYSIS_DELAY_MS: 3000, JOURNAL_REQUEST_TIMEOUT_MS: 60000,
    palette: {mauve: '#BEAACF'}, analysisKeyFor: text => String(text || ''),
    uiText: (zh, en) => language === 'zh' ? zh : en, t: key => window.SharedI18N.t(key),
    typeStage: element(), analysisNotice: element(), analysisNoticeText: element(), retryAnalysisButton: element(),
    realtimeFeedbackToggle: element(), llmFeedbackToggle: element(),
    primaryEmotion: element(), reflectionText: element(), confidenceMeter: element(), emotionDot: element(), emotionChips: element(),
    updateVAControl() {}, setStatus(text) {context.status = text;}, setLlmReady(ready) {context.ready = ready;},
    localEmotion: () => ({}), localVAMapping: () => ({}),
    localDesign() {localCalls++; return {'0': {animation: 'pulse-scale'}};},
    renderTypography(text, design) {renders.push({text, design});},
    applyAnalysis(payload, options = {}) {
      applied.push({payload, options}); context.currentDesign = payload.llm_design;
      renders.push({text: context.journalText.value, design: payload.llm_design});
    },
    setTimeout(callback, ms) {const id = nextId++; tasks.set(id, {callback, at: now + ms}); return id;},
    clearTimeout(id) {tasks.delete(id);},
    async fetch(url, options) {
      requests.push({url, options});
      return {ok: true, async json() {return {llm_design: {'0': {color: '#123456', animation: 'calm-float'}}};}};
    }
  });
  vm.runInContext(preference, context);
  context.realtimeFeedbackEnabled = demo || context.readFeedbackPreference();
  vm.runInContext(modeSync + helpers, context);
  async function advance(ms) {
    const target = now + ms;
    while (true) {
      const next = [...tasks.entries()].filter(([, task]) => task.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      const [id, task] = next; tasks.delete(id); now = task.at;
      task.callback(); await flush();
    }
    now = target; await flush();
  }
  function input(text, isComposing = false) {context.journalText.value = text; context.handleJournalInput({isComposing});}
  function pendingFetch(abortAware = false) {
    let complete, reject;
    context.fetch = (url, options) => {
      requests.push({url, options});
      return new Promise((resolve, fail) => {
        complete = resolve; reject = fail;
        if (abortAware) options.signal.addEventListener('abort', () => fail(Object.assign(new Error('Aborted'), {name: 'AbortError'})));
      });
    };
    return {resolve(payload) {complete({ok: true, async json() {return payload;}});}, reject(error) {reject(error);}};
  }
  return {context, requests, renders, applied, events, tasks, advance, input, pendingFetch, localCalls: () => localCalls};
}

async function run() {
  // Personal writing still defaults to wait; a marked, untouched demo starts live.
  for (const mode of [null, '', 'invalid', 'wait']) assert.equal(harness('en', mode).context.realtimeFeedbackEnabled, false);
  assert.equal(harness('en', null, true).context.realtimeFeedbackEnabled, false);
  assert.equal(harness('en', 'live').context.realtimeFeedbackEnabled, true);

  const startup = source.slice(source.indexOf('// Only the untouched'), source.indexOf('let activeAnalysisController ='));
  for (const saved of [null, 'wait', 'live']) {
    for (const value of ['Starter sample', 'Restored personal journal']) {
      const initial = vm.createContext({journalText: {dataset: {demo: 'true'}, defaultValue: 'Starter sample', value},
        localStorage: {getItem: () => saved}});
      vm.runInContext(startup, initial);
      const flags = vm.runInContext('({journalDemoActive, realtimeFeedbackEnabled})', initial);
      assert.equal(flags.journalDemoActive, value === 'Starter sample');
      assert.equal(flags.realtimeFeedbackEnabled, value === 'Starter sample', 'restored personal text defaults to LLM, regardless of prior preference');
    }
  }

  for (const language of ['en', 'zh']) {
    const demo = harness(language, 'wait', false, true), d = demo.context;
    d.scheduleAnalysis();
    assert.equal(d.analysisPhase, 'demo');
    assert.equal(d.realtimeFeedbackToggle['aria-pressed'], 'true');
    assert.equal(d.typeStage['aria-busy'], 'false');
    assert.equal(d.ready, false, 'a local demo must not claim to be an LLM result');
    assert.equal(demo.localCalls(), 1);
    assert.match(d.analysisNoticeText.textContent, language === 'en' ? /sample.*instant feedback/ : /初始示例.*即时反馈/);
    const renderCount = demo.renders.length;
    demo.input('Starter sample'); await demo.advance(120000); await d.analyzeText();
    assert.equal(demo.requests.length, 0, 'untouched starter demo must never automatically call LLM');
    assert.equal(demo.tasks.size, 0);
    assert.equal(demo.renders.length, renderCount, 'idle demo keeps stable animations');
    assert.equal(d.readFeedbackPreference(), false, 'the demo must not overwrite the personal mode preference');
    demo.input('My own journal');
    assert.equal(d.journalDemoActive, false);
    assert.equal(d.realtimeFeedbackEnabled, false);
    assert.equal(d.llmFeedbackToggle['aria-pressed'], 'true');
    assert.equal(Object.keys(demo.renders.at(-1).design).length, 0, 'personal writing must not inherit demo effects');
    await demo.advance(3000);
    assert.equal(demo.requests.length, 1);
    assert.equal(JSON.parse(demo.requests[0].options.body).text, 'My own journal');
    assert.equal(demo.localCalls(), 1);
    d.selectFeedbackMode(true); demo.input('I explicitly prefer live feedback');
    assert.equal(d.realtimeFeedbackEnabled, true, 'the demo transition only happens once, preserving later manual choices');
    assert.equal(demo.localCalls(), 2);
    demo.input('Starter sample');
    assert.equal(d.journalDemoActive, false, 'undoing back to the sample must not reactivate the initial demo');
  }

  const clearedDemo = harness('en', 'live', false, true);
  clearedDemo.context.scheduleAnalysis(); clearedDemo.input(''); await clearedDemo.advance(120000);
  assert.equal(clearedDemo.context.realtimeFeedbackEnabled, false);
  assert.equal(clearedDemo.context.analysisPhase, 'idle'); assert.equal(clearedDemo.requests.length, 0);
  const voiceDemo = harness('en', null, false, true);
  voiceDemo.context.scheduleAnalysis(); voiceDemo.context.journalText.value += ' Transcribed words';
  voiceDemo.context.scheduleAnalysis();
  assert.equal(voiceDemo.context.realtimeFeedbackEnabled, false, 'voice/prompt changes share the first-edit transition');
  const imeDemo = harness('zh', null, false, true);
  imeDemo.context.scheduleAnalysis(); imeDemo.context.startJournalComposition();
  imeDemo.input('jin', true);
  assert.equal(imeDemo.context.realtimeFeedbackEnabled, false);
  assert.equal(Object.keys(imeDemo.renders.at(-1).design).length, 0);
  await imeDemo.advance(10000); assert.equal(imeDemo.requests.length, 0);
  imeDemo.context.journalText.value = '今天感觉平静'; imeDemo.context.finishJournalComposition();
  await imeDemo.advance(3000); assert.equal(imeDemo.requests.length, 1);
  const manualDemo = harness('en', null, false, true);
  manualDemo.context.scheduleAnalysis(); manualDemo.context.selectFeedbackMode(false);
  await manualDemo.advance(3000); assert.equal(manualDemo.requests.length, 1, 'explicitly choosing LLM can analyze the sample');
  manualDemo.context.selectFeedbackMode(true); await manualDemo.advance(120000);
  assert.equal(manualDemo.context.analysisPhase, 'demo'); assert.equal(manualDemo.requests.length, 1);

  const h = harness(), c = h.context;
  c.syncRealtimeFeedbackToggle();
  assert.equal(c.llmFeedbackToggle['aria-pressed'], 'true');
  assert.equal(c.realtimeFeedbackToggle['aria-pressed'], 'false');
  c.scheduleAnalysis();
  assert.equal(h.localCalls(), 0, 'wait mode must never invoke local typography');
  assert.equal(Object.keys(h.renders.at(-1).design).length, 0);
  assert.equal(c.analysisPhase, 'typing');
  assert.match(c.analysisNoticeText.textContent, /3-second pause/);
  await h.advance(2200); h.input('First entry is growing');
  await h.advance(2200); h.input('First entry is complete');
  await h.advance(2999); assert.equal(h.requests.length, 0);
  await h.advance(1); assert.equal(h.requests.length, 1);
  assert.equal(JSON.parse(h.requests[0].options.body).text, 'First entry is complete');
  assert.equal(JSON.parse(h.requests[0].options.body).intensity, 1);
  assert.equal(c.analysisPhase, 'ready');
  assert.equal(c.typeStage['aria-busy'], 'false');
  assert.equal(h.localCalls(), 0);
  assert.equal(h.applied.at(-1).options.allowLocalDesignFallback, false);
  const count = h.renders.length;
  h.input(c.journalText.value); await h.advance(120000); await c.analyzeText();
  assert.equal(h.requests.length, 1, 'idle time or duplicate events must not repeat a request');
  assert.equal(h.renders.length, count, 'cached results must not restart animations');
  c.selectFeedbackMode(true); c.selectFeedbackMode(false);
  assert.equal(h.renders.length, count, 'mode switches keep an already returned design stable');
  assert.equal(h.requests.length, 1);
  c.rerenderCurrentTypography(); assert.equal(h.requests.length, 1, 'intensity is frontend-only');

  // Pending work survives preview mode switches; local effects only run when selected.
  const p = harness(), pending = p.pendingFetch();
  p.context.scheduleAnalysis(); await p.advance(3000);
  assert.equal(p.context.analysisPhase, 'waiting');
  assert.match(p.context.analysisNoticeText.textContent, /Waiting for the LLM result/);
  assert.equal(p.context.typeStage['aria-busy'], 'true');
  p.context.selectFeedbackMode(true); assert.equal(p.localCalls(), 1);
  p.context.selectFeedbackMode(false);
  assert.equal(Object.keys(p.renders.at(-1).design).length, 0);
  assert.equal(p.requests[0].options.signal.aborted, false);
  pending.resolve({llm_design: {'0': {color: '#ff1234'}}}); await flush();
  assert.equal(p.context.analysisPhase, 'ready'); assert.equal(p.requests.length, 1);
  assert.equal(p.events.filter(event => event.type === 'journal-analysis-ready').length, 1);

  // Responses for older text and same-text/undo races cannot overwrite newer state.
  const stale = harness(), old = stale.pendingFetch();
  stale.context.scheduleAnalysis(); await stale.advance(3000);
  stale.input('New text'); assert.equal(stale.requests[0].options.signal.aborted, true);
  stale.input('First entry');
  old.resolve({llm_design: {'0': {color: '#badbad'}}}); await flush();
  assert.equal(stale.context.analysisCache.size, 0);
  assert.equal(stale.applied.length, 0);
  assert.equal(stale.context.analysisPhase, 'typing');

  // Chinese IME composition must never request partial phonetic input.
  const ime = harness('zh');
  ime.context.scheduleAnalysis(); ime.context.startJournalComposition();
  ime.input('jin', true); await ime.advance(10000);
  assert.equal(ime.requests.length, 0);
  ime.context.journalText.value = '今天感觉平静'; ime.context.finishJournalComposition();
  ime.input('今天感觉平静'); await ime.advance(3000);
  assert.equal(ime.requests.length, 1);
  assert.equal(JSON.parse(ime.requests[0].options.body).text, '今天感觉平静');
  assert.equal(ime.context.analysisPhase, 'ready');
  assert.equal(ime.context.status, '镜像已就绪');

  // Errors, timeouts and empty designs never automatically retry or become local effects.
  for (const kind of ['network', 'timeout', 'empty']) {
    const error = harness();
    if (kind === 'network') error.context.fetch = async () => {throw Error('Offline');};
    if (kind === 'empty') error.context.fetch = async () => ({ok: true, async json() {return {llm_design: {}};}});
    if (kind === 'timeout') error.pendingFetch(true);
    error.context.scheduleAnalysis(); await error.advance(kind === 'timeout' ? 63000 : 3000);
    assert.equal(error.context.analysisPhase, 'error', kind);
    assert.equal(error.context.retryAnalysisButton.hidden, false);
    assert.equal(error.context.typeStage['aria-busy'], 'false');
    assert.equal(error.context.ready, false);
    assert.equal(error.localCalls(), 0);
    assert.equal(error.context.analysisCache.size, 0);
    const errorRenders = error.renders.length; await error.advance(120000);
    assert.equal(error.renders.length, errorRenders);
    assert.equal(error.tasks.size, 0, 'no background polling or automatic retries');
    error.context.fetch = async () => ({ok: true, async json() {return {llm_design: {'0': {color: '#123456'}}};}});
    error.context.scheduleAnalysis({force: true}); await error.context.analyzeText();
    assert.equal(error.context.analysisPhase, 'ready');
    assert.equal(error.context.retryAnalysisButton.hidden, true);
    assert.equal(error.tasks.size, 0);
  }
  const empty = harness(); empty.input('   '); await empty.advance(120000);
  assert.equal(empty.requests.length, 0); assert.equal(empty.context.analysisPhase, 'idle');

  // Image+text analysis follows settled Journal events, not its own input timer.
  const essay = fs.readFileSync(path.join(root, 'essay.html'), 'utf8');
  const inline = [...essay.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1].replace(/\r\n/g, '\n')).find(script => script.includes('var _combinedSequence'));
  const combined = inline.slice(inline.indexOf("(function () {\n  var btn = document.getElementById('journalImageBtn');"));
  assert.ok(combined.startsWith('(function () {'));
  const elements = new Map(), listeners = {}, combinedRequests = [];
  const dom = {getElementById(id) {
    if (!elements.has(id)) elements.set(id, {...element(), listeners: {}, addEventListener(name, fn) {this.listeners[name] = fn;}});
    return elements.get(id);
  }, addEventListener(name, fn) {listeners[name] = fn;}};
  const combinedWindow = {};
  const combinedVm = vm.createContext({document: dom, window: combinedWindow,
    SharedI18N: {pick: (_, en) => en, label: text => text},
    async fetch(url, options) {
      combinedRequests.push({url, body: JSON.parse(options.body)});
      return {async json() {return {combined_emotion: {label: 'Calm', valence: 0.4, arousal: -0.5}};}};
    }, setTimeout() {throw Error('Combined analysis must not have an independent timer');}});
  vm.runInContext(combined, combinedVm);
  const image = {color: '#123456'}; combinedWindow._journalImageAnalyses.push(image);
  const textarea = elements.get('journalText'), card = dom.getElementById('combinedAffectCard');
  textarea.value = 'Settled text'; textarea.listeners.input();
  assert.equal(combinedRequests.length, 0);
  listeners['journal-analysis-ready']({detail: {text: textarea.value}}); await flush();
  assert.equal(combinedRequests.length, 1); assert.equal(card.hidden, false);
  textarea.listeners.input(); assert.equal(card.hidden, false, 'unchanged input must not hide a valid combined result');
  listeners['journal-analysis-ready']({detail: {text: textarea.value}}); await flush();
  assert.equal(combinedRequests.length, 1);
  textarea.value = 'New text'; textarea.listeners.input(); assert.equal(card.hidden, true);
  textarea.value = 'Settled text'; textarea.listeners.input();
  listeners['journal-analysis-ready']({detail: {text: textarea.value}}); await flush();
  assert.equal(card.hidden, false); assert.equal(combinedRequests.length, 1, 'restore completed combined result without another request');

  let completeCombined;
  combinedVm.fetch = () => new Promise(resolve => {completeCombined = resolve;});
  textarea.value = 'Older text'; textarea.listeners.input();
  listeners['journal-analysis-ready']({detail: {text: textarea.value}});
  textarea.value = 'Latest text'; textarea.listeners.input();
  completeCombined({async json() {return {combined_emotion: {label: 'Outdated'}};}}); await flush();
  assert.equal(card.hidden, true, 'late combined responses must not show outdated results');
  assert.notEqual(elements.get('journalCombinedLabel').textContent, 'Outdated');

  const bindings = source.slice(source.indexOf('function bindEvents('), source.indexOf('async function boot('));
  assert.match(bindings, /compositionstart.*startJournalComposition/);
  assert.match(bindings, /compositionend.*finishJournalComposition/);
  const boot = source.slice(source.indexOf('async function boot('), source.indexOf('const I18N ='));
  assert.match(boot, /scheduleAnalysis\(\);[\s\S]*await loadParticipantEntries\(\)/, 'demo rendering must not wait for account history');
  for (const name of ['essay.html', 'index.html']) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    assert.match(html, /id="journalText"\s+data-demo="true"/);
    assert.match(html, /id="llmFeedbackToggle" aria-pressed="false"/);
    assert.match(html, /id="realtimeFeedbackToggle" aria-pressed="true"/);
    assert.match(html, /id="analysisNotice"[^>]+role="status"/);
  }
  console.log('Journal feedback checks passed: instant starter demo, one-time switch to LLM for personal writing, manual choices, 3-second debounce, cache, no polling, cancellation, IME, timeout, retry and multimodal analysis.');
}
run().catch(error => {console.error(error); process.exitCode = 1;});
