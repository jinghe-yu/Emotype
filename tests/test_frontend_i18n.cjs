// Run: node tests/test_frontend_i18n.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'emotion_rec', 'static');
function load(language, blockedStorage = false) {
  const document = {readyState: 'loading', addEventListener() {}, querySelectorAll() {return [];}, documentElement: {}};
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'i18n.js'), 'utf8'), {
    window, document, localStorage: {getItem() {if (blockedStorage) throw Error('blocked'); return language;}}
  });
  return window.SharedI18N;
}
for (const value of [null, '', 'invalid']) assert.equal(load(value).lang(), 'en');
assert.equal(load(null, true).lang(), 'en');
assert.equal(load('zh').lang(), 'zh');
assert.equal(load(null).t('nav.body'), 'Body Sense');
assert.equal(load(null).label('焦虑'), 'Anxious');
assert.equal(load('zh').label('焦虑'), '焦虑');
// User text that is not system copy must stay unchanged.
assert.equal(load(null).text('我的私人日记内容'), '我的私人日记内容');
const labels = JSON.parse(fs.readFileSync(path.join(root, '..', 'shared', 'emotion_labels_en.json'), 'utf8'));
for (const [zh, en] of Object.entries(labels)) assert.equal(load(null).label(zh), en);
for (const name of fs.readdirSync(root)) {
  if (name.endsWith('.js')) new vm.Script(fs.readFileSync(path.join(root, name), 'utf8'), {filename: name});
  if (!name.endsWith('.html')) continue;
  const source = fs.readFileSync(path.join(root, name), 'utf8');
  assert.match(source, /<html lang="en">/, name);
  for (const match of source.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)) {
    assert.notEqual(load(null).t(match[1]), match[1], `${name}: missing ${match[1]}`);
  }
  for (const match of source.matchAll(/data-ui-(?:copy|placeholder|title|alt|aria-label)="([^"]+)"/g)) {
    assert.doesNotMatch(load(null).text(match[1]), /[\u3400-\u9fff]/, `${name}: untranslated ${match[1]}`);
  }
  let index = 0;
  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    if (match[1].trim()) new vm.Script(match[1], {filename: `${name}:inline-${index++}`});
  }
}
console.log('Frontend language and JavaScript syntax checks passed.');
