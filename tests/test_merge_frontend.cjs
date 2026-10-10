// Focused regressions for features preserved from both main and v2-new.
// Run: node tests/test_merge_frontend.cjs (no browser, network or real user data).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'emotion_rec', 'static');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const body = fs.readFileSync(path.join(root, 'body_sensation.js'), 'utf8');
const i18n = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');

class Element {
  constructor() {
    this.children = [];
    this.value = '';
    this._text = '';
    this.listeners = {};
    this.dataset = {};
    this.classes = new Set();
    this.style = {setProperty(name, value) {this[name] = value;}};
    this.classList = {
      add: name => this.classes.add(name),
      remove: name => this.classes.delete(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
    };
  }
  set textContent(value) {this._text = value; this.children = [];}
  get textContent() {return this._text + this.children.map(node => node.textContent).join('');}
  append(...nodes) {this.children.push(...nodes);}
  appendChild(node) {this.append(node); return node;}
  addEventListener(name, listener) {this.listeners[name] = listener;}
  setAttribute(name, value) {this[name] = value;}
}

function bodyContext(language) {
  const elements = new Map();
  const document = {
    readyState: 'loading', documentElement: {}, addEventListener() {},
    querySelectorAll() {return [];}, createElement() {return new Element();},
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    },
    querySelector() {return new Element();}
  };
  const localStorage = {getItem(key) {return key === 'emomirror.lang' ? language : null;}, setItem() {}};
  const window = {location: {search: '?participant_code=qa_from_url'}};
  const context = vm.createContext({window, document, localStorage, URLSearchParams});
  vm.runInContext(i18n, context);
  context.SharedI18N = window.SharedI18N;
  vm.runInContext(body, context);
  return {context, elements, ui: window.SharedI18N, state: vm.runInContext('state', context)};
}

for (const language of ['en', 'zh']) {
  const {context, elements, state, ui} = bodyContext(language);
  for (const key of ['essay.moment', 'essay.diary', 'journal.uploadImage',
    'journal.realtimeFeedback', 'journal.llmReady', 'journal.vaUser',
    'journal.vaImage', 'journal.multimodal', 'body.loading', 'body.loadedRecords',
    'body.generatedStatus', 'body.requestFailed', 'body.nonMedicalNote']) {
    assert.notEqual(ui.t(key), key, `${language}: lost ${key}`);
  }
  assert.equal(context.bodyLang(), language);
  assert.equal(context.bodyEmotionLabel('羞耻'), language === 'en' ? 'Shame' : '羞耻');
  assert.equal(ui.label('焦虑 / 开心'), language === 'en' ? 'Anxious / Happy' : '焦虑 / 开心');
  assert.equal(ui.label('我的自定义情绪'), '我的自定义情绪');
  state.pairs.push({region: state.selectedRegion, symptom: state.selectedSymptom, severity: 3, duration: '2 hours'});
  context.renderPairs();
  assert.equal(elements.get('bodyPairCount').textContent, language === 'en' ? '1 pair' : '1 组');
  context.renderAdvice({
    advice: {summary: 'Specific advice', state_reading: 'State reading', source: 'llm',
      steps: ['Take a break'], reflection_prompt: 'What changed?', when_to_seek_help: ['Seek help if symptoms persist']},
    emotion_context: {primary_label: '羞耻'},
    possible_links: [{label: 'Posture', explanation: 'New explanation field'}, {label: 'Rest', description: 'Legacy description field'}],
    safety: {risk_level: 'high', red_flags: ['Urgent warning']}
  });
  const rendered = elements.get('bodyAdviceContent').textContent;
  for (const copy of ['State reading', 'New explanation field', 'Legacy description field',
    'Take a break', 'What changed?', 'Seek help if symptoms persist', 'Urgent warning']) {
    assert.ok(rendered.includes(copy), `lost advice field: ${copy}`);
  }
  assert.ok(rendered.includes(language === 'en' ? 'Shame' : '羞耻'));
  // The existing remove action must still update state and the counter.
  elements.get('bodySelectedPairs').children[0].children.at(-1).listeners.click();
  assert.equal(state.pairs.length, 0);
  assert.equal(elements.get('bodyPairCount').textContent, language === 'en' ? '0 pairs' : '0 组');
}

for (const name of ['index.html', 'essay.html']) {
  const html = fs.readFileSync(path.join(root, name), 'utf8');
  for (const id of ['realtimeFeedbackToggle', 'llmFeedbackToggle', 'analysisNotice', 'retryAnalysisButton', 'llmReadyBadge', 'intensityRange', 'voiceButton',
    'saveEntry', 'typeStage', 'customEmotionLabel', 'vaPlane']) {
    assert.equal([...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length, 1, `${name}: missing or duplicate ${id}`);
  }
  assert.match(html, /Real-time Feedback/);
  assert.match(html, /\/static\/app\.js\?v=20261010d/);
}
const essay = fs.readFileSync(path.join(root, 'essay.html'), 'utf8');
assert.match(essay, /id="journalImageInput"/);
assert.match(essay, /id="affectDuo"/);
assert.match(essay, /data-target="diaryView"/);

function analysisContext() {
  const applied = [], rendered = [], requests = [], timers = [];
  const context = vm.createContext({
    journalText: {value: 'First entry'}, currentDesign: {}, currentVAMapping: null,
    realtimeFeedbackEnabled: true, analysisCache: new Map(), analysisSequence: 0,
    activeAnalysisController: null, inflightAnalysisKey: '', analyzeTimer: null, AbortController,
    scheduledAnalysisKey: null, renderedAnalysisKey: null, analysisPhase: 'idle', isComposingJournal: false,
    JOURNAL_ANALYSIS_DELAY_MS: 3000, JOURNAL_REQUEST_TIMEOUT_MS: 60000,
    typeStage: new Element(), analysisNotice: new Element(), analysisNoticeText: new Element(), retryAnalysisButton: new Element(),
    primaryEmotion: new Element(), reflectionText: new Element(), confidenceMeter: new Element(), emotionDot: new Element(), emotionChips: new Element(),
    palette: {mauve: '#BEAACF'}, updateVAControl() {},
    document: {dispatchEvent() {}}, CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options.detail;}},
    t: key => key,
    analysisKeyFor: text => String(text || ''), getIntensity: () => 0.8,
    uiText: (_, en) => en, setStatus() {}, setLlmReady() {},
    localVAMapping: () => ({}), localEmotion: () => ({}), localDesign: () => ({'0': {animation: 'pulse-scale'}}),
    renderTypography: (text, design) => rendered.push({text, design}),
    applyAnalysis(payload, options = {}) {
      applied.push({payload, options});
      context.currentDesign = payload.llm_design || {};
    },
    clearTimeout() {}, setTimeout(callback) {timers.push(callback); return timers.length;},
    async fetch(url, options) {
      requests.push({url, options});
      return {ok: true, async json() {return {llm_design: {'0': {color: '#123456'}}};}};
    }
  });
  const helpers = app.slice(app.indexOf('function renderPlainMirror('), app.indexOf('function saveEntries('));
  assert.ok(helpers.startsWith('function renderPlainMirror('));
  vm.runInContext(helpers, context);
  return {context, applied, rendered, requests, timers};
}

async function run() {
  const {context, applied, rendered, requests, timers} = analysisContext();
  await context.analyzeText();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/analyze-text');
  assert.equal(JSON.parse(requests[0].options.body).intensity, 1);
  await context.analyzeText();
  assert.equal(requests.length, 1, 'cached text must not call the model twice');
  assert.equal(applied.at(-1).options.markComplete, true);

  context.realtimeFeedbackEnabled = false;
  context.journalText.value = 'Next entry';
  context.scheduleAnalysis();
  assert.equal(Object.keys(rendered.at(-1).design).length, 0, 'feedback-off must initially show plain typography');
  await timers.at(-1)();
  assert.equal(requests.length, 2);
  assert.equal(applied.at(-1).options.allowLocalDesignFallback, false);
  context.rerenderCurrentTypography();
  assert.equal(requests.length, 2, 'adjusting intensity must not request another model result');
  assert.equal(rendered.at(-1).design['0'].color, '#123456');

  let completeOld;
  let oldSignal;
  context.fetch = (_url, options) => {
    oldSignal = options.signal;
    return new Promise(resolve => {completeOld = resolve;});
  };
  context.journalText.value = 'Old pending entry';
  const pending = context.analyzeText();
  context.journalText.value = 'Next entry';
  context.scheduleAnalysis();
  assert.equal(oldSignal.aborted, true, 'typing must cancel the previous request');
  const appliedBefore = applied.length;
  completeOld({ok: true, async json() {return {stale: true, llm_design: {}};}});
  await pending;
  assert.equal(applied.length, appliedBefore, 'late responses must not overwrite the current entry');
  assert.equal(context.analysisCache.has('Old pending entry'), false);

  for (const language of ['en', 'zh']) {
    const {context: bodyVm, elements, state} = bodyContext(language);
    let sent;
    bodyVm.Auth = {
      isLoggedIn: () => true, getUser: () => ({username: 'qa_logged_in'}),
      async apiJson(url, options) {
        sent = {url, payload: JSON.parse(options.body)};
        return {advice: {summary: 'Specific advice', source: 'llm'}};
      }
    };
    state.pairs.push({region: state.selectedRegion, symptom: state.selectedSymptom, severity: 3, duration: '2 hours'});
    elements.get('bodyJournalText').value = 'User journal text stays unchanged';
    elements.get('bodyFreeText').value = 'User body notes';
    await bodyVm.submitAdvice();
    assert.equal(sent.url, '/body-sensation/advice');
    assert.equal(bodyVm.bodyLang(), language);
    assert.equal(sent.payload.participant_code, 'qa_logged_in');
    assert.equal(sent.payload.journal_text, 'User journal text stays unchanged');
    assert.equal(sent.payload.include_recent_diaries, true);
    assert.equal(sent.payload.recent_diary_limit, 5);
    assert.equal(sent.payload.symptoms.length, 1);
    assert.equal(elements.get('bodySubmitBtn').disabled, false);
    assert.equal(elements.get('bodySubmitBtn').textContent, bodyVm.SharedI18N.t('body.generate'));
  }
  console.log('Merge regressions passed: both languages, real-time controls, caching, cancellation, intensity, multimodal controls and complete body advice.');
}
run().catch(error => {console.error(error); process.exitCode = 1;});
