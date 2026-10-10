// Focused renderer checks. Run: node tests/test_journal_typography.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..', 'emotion_rec', 'static');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const renderer = source.slice(source.indexOf('function typographyRuns('), source.indexOf('function averageMatches('));
assert.ok(renderer.startsWith('function typographyRuns('));

class Node {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.className = '';
    this.text = '';
    this.style = {setProperty(name, value) {this[name] = value;}};
  }
  set textContent(value) {this.children = []; this.text = value;}
  get textContent() {return this.text + this.children.map(node => node.textContent).join('');}
  appendChild(node) {
    if (node.tag === 'fragment') this.children.push(...node.children);
    else this.children.push(node);
    return node;
  }
}
const stage = new Node('stage');
let insertions = new Map();
const context = vm.createContext({
  typeStage: stage,
  document: {createElement: tag => new Node(tag), createDocumentFragment: () => new Node('fragment')},
  buildEmojiInsertions: () => insertions,
  applyIntensity: value => value,
  animationClass: value => value ? `anim-${value}` : '',
  createEmojiGlyph(emoji) {const node = new Node('span'); node.className = 'glyph emoji'; node.textContent = emoji; return node;}
});
vm.runInContext(renderer, context);
const render = (text, design = {}) => context.renderTypography(text, design);
const words = () => stage.children.filter(node => node.className === 'type-word');
const restored = () => stage.textContent.replace(/\u00a0/g, ' ');

render("EmoMirror can't split well-being, don't or I'm.");
assert.deepEqual(words().map(node => node.textContent), ['EmoMirror', "can't", 'split', 'well-being,', "don't", 'or', "I'm."]);
assert.equal(restored(), "EmoMirror can't split well-being, don't or I'm.");
assert.ok(words().every(word => word.children.every(glyph => glyph.className.includes('glyph'))));

render('中文 mixed 情绪 café naïve B2B co‑operate');
assert.deepEqual(words().map(node => node.textContent), ['mixed', 'café', 'naïve', 'B2B', 'co‑operate']);
assert.equal(restored(), '中文 mixed 情绪 café naïve B2B co‑operate');
assert.equal(stage.children.filter(node => node.className.startsWith('glyph') && /[中\u6587情绪]/u.test(node.textContent)).length, 4);

render('First line\r\nSecond line\nThird line');
assert.equal(stage.children.filter(node => node.className === 'type-break').length, 2);
assert.equal(restored(), 'First line\nSecond line\nThird line');

render('Color', {'0': {backgroundColor: '#ff0000', weight: 850, color: '#ef4444', scale: 1.6, animation: 'shake-hard'}});
const first = words()[0].children[0];
assert.equal(first.style.backgroundColor, undefined);
assert.equal(first.style['--glyph-color'], '#ef4444');
assert.equal(first.style['--glyph-weight'], 850);
assert.equal(first.style['--scale'], 1.6);
assert.ok(first.className.includes('anim-shake-hard'));

// Partial model segments must not insert emoji inside an intact English word.
insertions = new Map([[2, {emoji: '✨', mapping: {}}]]);
render('excited');
assert.equal(words()[0].textContent, 'excited✨');
assert.equal(words()[0].children.at(-1).className, 'glyph emoji');

// Emoji insertion offsets use the source string's UTF-16 offsets, not glyph count.
insertions = new Map([[5, {emoji: '🌿', mapping: {}}]]);
render('😀 calm');
assert.equal(words()[0].textContent, 'calm🌿');
insertions = new Map();

render('internationalization');
assert.equal(words().length, 1);
assert.equal(words()[0].textContent, 'internationalization');
render('');
assert.ok(stage.textContent.includes('Start'));
render('<b>safe</b>');
assert.equal(restored(), '<b>safe</b>');

const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const wordStyle = css.match(/\.type-word\s*\{([^}]+)\}/)[1];
assert.match(wordStyle, /flex-wrap:\s*nowrap/);
assert.match(wordStyle, /flex:\s*0 0 auto/);
assert.match(wordStyle, /white-space:\s*nowrap/);
assert.match(css, /\.type-stage \.glyph:not\(\.emoji\)\s*\{\s*background:\s*none/);
console.log('Journal typography checks passed: whole words, transparent letters, line breaks, styling and emoji placement.');
