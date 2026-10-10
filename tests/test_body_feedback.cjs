// Body Sense frontend resilience checks: no browser, network or user data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'emotion_rec', 'static');
class Element {
  constructor() {
    this.children = []; this.value = ''; this.style = {}; this.listeners = {};
    this.classList = {add() {}};
  }
  set textContent(text) {this.text = text; this.children = [];}
  get textContent() {return (this.text || '') + this.children.map(child => child.textContent).join('');}
  append(...children) {this.children.push(...children);}
  appendChild(child) {this.append(child);}
  addEventListener(name, fn) {this.listeners[name] = fn;}
  setAttribute(name, value) {this[name] = value;}
}
function harness(uiLanguage = 'en') {
  const nodes = new Map(), timers = new Map(), sent = [];
  const document = {readyState: 'loading', documentElement: {}, addEventListener() {}, querySelectorAll: () => [],
    createElement: () => new Element(), querySelector: () => new Element(),
    getElementById(id) {if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id);}};
  const window = {location: {search: ''}};
  const context = vm.createContext({window, document, AbortController, URLSearchParams,
    localStorage: {getItem: key => key === 'emomirror.lang' ? uiLanguage : null, setItem() {}},
    setTimeout(fn, ms) {const id = timers.size + 1; timers.set(id, {fn, ms}); return id;},
    clearTimeout(id) {timers.delete(id);}});
  vm.runInContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), context);
  context.SharedI18N = window.SharedI18N;
  vm.runInContext(fs.readFileSync(path.join(root, 'body_sensation.js'), 'utf8'), context);
  context.Auth = {isLoggedIn: () => true, getUser: () => ({username: 'qa_user'}),
    async apiJson(url, options) {sent.push({url, options}); return {status: 'success', language: 'en',
      advice: {title: 'Notice your body', summary: 'You described a mild sensation.', source: 'llm', steps: ['Take a short pause.']}};}};
  return {context, nodes, timers, sent, state: vm.runInContext('state', context)};
}
async function run() {
  const h = harness(), c = h.context;
  await c.submitAdvice();
  assert.equal(h.sent.length, 1);
  assert.equal(JSON.parse(h.sent[0].options.body).ui_language, 'en');
  assert.ok(h.sent[0].options.signal);
  assert.equal(h.nodes.get('bodySubmitBtn').disabled, false);
  assert.equal(h.nodes.get('bodySubmitBtn')['aria-busy'], 'false');
  assert.equal(h.nodes.get('bodyAdviceContent').lang, 'en');
  assert.ok(h.nodes.get('bodyAdviceContent').textContent.includes('Model-generated'));
  assert.equal(h.timers.size, 0);

  // Reply language changes the card only, never the default English website.
  const zh = harness('en');
  zh.context.Auth.apiJson = async () => ({status: 'success', language: 'zh',
    advice: {title: '留意身体信号', summary: '你记录了头部的感受。', source: 'fallback', steps: ['先暂停当前任务。']},
    debug: {fallback_reason: 'timeout'}});
  zh.nodes.get('bodyFreeText').value = '今天坐得太久了';
  await zh.context.submitAdvice();
  const result = zh.nodes.get('bodyAdviceContent');
  assert.equal(result.lang, 'zh-CN');
  assert.ok(result.textContent.includes('可尝试步骤'));
  assert.ok(result.textContent.includes('一般性保底提醒'));
  assert.equal(zh.context.bodyLang(), 'en');
  assert.equal(zh.nodes.get('bodySubmitBtn').textContent, 'Generate Body Advice');

  // Even a stalled request that ignores AbortController cannot leave the button stuck.
  const stalled = harness(); let signal;
  stalled.context.Auth.apiJson = (_url, options) => {signal = options.signal; return new Promise(() => {});};
  const pending = stalled.context.submitAdvice();
  assert.equal(stalled.state.submitting, true); assert.equal(stalled.nodes.get('bodySubmitBtn').disabled, true);
  await stalled.context.submitAdvice(); assert.equal(stalled.timers.size, 2, 'repeated clicks do not create extra requests');
  [...stalled.timers.values()].find(timer => timer.ms === 8000).fn();
  assert.match(stalled.nodes.get('bodySubmitStatus').textContent, /Still waiting/);
  [...stalled.timers.values()].find(timer => timer.ms === 45000).fn(); await pending;
  assert.equal(signal.aborted, true); assert.equal(stalled.state.submitting, false);
  assert.equal(stalled.nodes.get('bodySubmitBtn').disabled, false);
  assert.match(stalled.nodes.get('bodySubmitStatus').textContent, /timed out/);
  assert.equal(stalled.timers.size, 0);

  for (const response of [null, {}, {status: 'error', message: 'Unavailable', advice: {summary: 'Error', steps: []}}]) {
    const bad = harness(); bad.context.Auth.apiJson = async () => response;
    await bad.context.submitAdvice();
    assert.equal(bad.nodes.get('bodySubmitBtn').disabled, false);
    assert.equal(bad.nodes.get('bodyAdviceState').textContent, 'Failed');
    assert.equal(bad.nodes.get('bodyAdviceContent').textContent, '');
    assert.equal(bad.timers.size, 0);
  }
  console.log('Body Sense frontend checks passed: English defaults, input-language cards, clear fallback, progress, bounded wait, invalid responses and button recovery.');
}
run().catch(error => {console.error(error); process.exitCode = 1;});
