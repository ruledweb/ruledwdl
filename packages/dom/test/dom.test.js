import assert from 'node:assert';
import { createWdlDom, WdlDom } from '../src/index.js';

console.log('Running @ruledwdl/dom unit tests...');

// ---------------------------------------------------------------------------
// Minimal DOM Mock for Node testing
// ---------------------------------------------------------------------------
class MockElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.classList = new Set();
    this.classList.add = (c) => Set.prototype.add.call(this.classList, c);
    this.classList.remove = (c) => Set.prototype.delete.call(this.classList, c);
    this.dataset = {};
    this.style = {};
    this._textContent = '';
    this._innerHTML = '';
    this.parentNode = null;
  }

  get textContent() {
    return this._textContent;
  }
  set textContent(v) {
    this._textContent = String(v);
  }

  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(v) {
    this._innerHTML = String(v);
  }

  get className() {
    return Array.from(this.classList).join(' ');
  }
  set className(v) {
    this.classList.clear();
    if (v) {
      v.split(/\s+/).filter(Boolean).forEach((c) => this.classList.add(c));
    }
  }

  get firstChild() {
    return this.children[0] || null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.children.indexOf(this);
    return idx >= 0 && idx < this.parentNode.children.length - 1
      ? this.parentNode.children[idx + 1]
      : null;
  }

  setAttribute(k, v) {
    this.attributes.set(k, String(v));
  }

  getAttribute(k) {
    return this.attributes.get(k);
  }

  removeAttribute(k) {
    this.attributes.delete(k);
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
    const idx = this.children.indexOf(refChild);
    if (idx === -1) return this.appendChild(newChild);
    newChild.parentNode = this;
    this.children.splice(idx, 0, newChild);
    return newChild;
  }

  replaceChild(newChild, oldChild) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
      newChild.parentNode = this;
      oldChild.parentNode = null;
      this.children[idx] = newChild;
    }
    return oldChild;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parentNode = null;
      this.children.splice(idx, 1);
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  replaceChildren(...newChildren) {
    this.children.forEach((c) => (c.parentNode = null));
    this.children = [];
    newChildren.forEach((c) => this.appendChild(c));
  }

  contains(other) {
    let curr = other;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }
}

class MockComment {
  constructor(data = '') {
    this.nodeType = 8;
    this.data = String(data);
    this.parentNode = null;
  }
  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }
}

globalThis.document = {
  createElement(tag) {
    return new MockElement(tag);
  },
  createComment(data) {
    return new MockComment(data);
  },
  head: new MockElement('head'),
  querySelector(sel) {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Mock ComponentState
// ---------------------------------------------------------------------------
class MockComponentState {
  constructor(id, initial) {
    this.id = id;
    this.listeners = new Map();
    this.snapshot = {
      id,
      layers: initial.layers || '',
      attr: initial.attr || {},
      data: initial.data || {},
      registry: initial.registry || null,
    };
  }

  on(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    const list = this.listeners.get(type) || [];
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  emit(type, event) {
    const list = this.listeners.get(type) || [];
    list.forEach((fn) => fn(event));
  }

  getSnapshot() {
    return this.snapshot;
  }
}

// ---------------------------------------------------------------------------
// Test 1: Instantiation & Initial Mount
// ---------------------------------------------------------------------------
const container = new MockElement('div');
const comp = new MockComponentState('hero', {
  layers: 'section.hero > h1.title + p.subtitle',
  attr: {
    '.title': { text: 'Hello WDL' },
    '.subtitle': { text: 'Sub text' }
  }
});

const dom = createWdlDom({
  container,
  component: comp,
  styleTarget: globalThis.document.head
});

assert(dom instanceof WdlDom, 'Should be instance of WdlDom');
const liveMap = dom.getLiveMap();
assert.strictEqual(liveMap.size, 3, 'Should have 3 nodes in liveMap (hero, title, subtitle)');
assert(liveMap.has('hero'), 'Should have hero node');
assert(liveMap.has('title'), 'Should have title node');
assert(liveMap.has('subtitle'), 'Should have subtitle node');

const titleEl = liveMap.get('title');
assert.strictEqual(titleEl.textContent, 'Hello WDL', 'Title text should be set');
assert.strictEqual(titleEl.getAttribute('wdl-comp'), 'title', 'wdl-comp should be set');
assert(titleEl.classList.has('title'), 'Class title should be present');

// ---------------------------------------------------------------------------
// Test 2: Surgical layers:change (append, before, after, wrap, remove)
// ---------------------------------------------------------------------------
// Append button.cta under hero
comp.emit('layers:change', {
  type: 'layers:change',
  componentId: 'hero',
  action: 'append',
  targetId: 'hero',
  payload: 'button.cta'
});
const updatedMap = dom.getLiveMap();
assert(updatedMap.has('cta'), 'Should have appended cta node');
const ctaEl = updatedMap.get('cta');
assert.strictEqual(ctaEl.tagName, 'BUTTON', 'CTA tag should be BUTTON');
assert.strictEqual(ctaEl.parentNode, liveMap.get('hero'), 'CTA parent should be hero');

// Insert span.badge before title
comp.emit('layers:change', {
  type: 'layers:change',
  action: 'before',
  targetId: 'title',
  payload: 'span.badge'
});
const badgeEl = dom.getLiveMap().get('badge');
assert(badgeEl, 'Should have badge node');
assert.strictEqual(badgeEl.tagName, 'SPAN');

// Prepend top_bar into hero
comp.emit('layers:change', {
  type: 'layers:change',
  action: 'prepend',
  targetId: 'hero',
  payload: 'div.top_bar'
});
const topBarEl = dom.getLiveMap().get('top_bar');
assert(topBarEl, 'Should have prepended top_bar node');
assert.strictEqual(liveMap.get('hero').children[0], topBarEl, 'top_bar should be first child of hero');

// Wrap title in title_box
comp.emit('layers:change', {
  type: 'layers:change',
  action: 'wrap',
  targetId: 'title',
  payload: 'div.title_box'
});
const titleBoxEl = dom.getLiveMap().get('title_box');
assert(titleBoxEl, 'Should have title_box wrapper');
assert.strictEqual(titleEl.parentNode, titleBoxEl, 'title parent should be title_box');

// Unwrap title_box (hoist title back to hero)
comp.emit('layers:change', {
  type: 'layers:change',
  action: 'unwrap',
  targetId: 'title_box'
});
assert(!dom.getLiveMap().has('title_box'), 'title_box should be removed from liveMap');
assert.strictEqual(titleEl.parentNode, liveMap.get('hero'), 'title parent should be hero after unwrap');

// Move cta before title
comp.emit('layers:change', {
  type: 'layers:change',
  action: 'move',
  targetId: 'cta',
  payload: { targetSemanticId: 'title', position: 'before' }
});
const heroChildren = liveMap.get('hero').children;
const ctaIdx = heroChildren.indexOf(ctaEl);
const titleIdx = heroChildren.indexOf(titleEl);
assert(ctaIdx < titleIdx, 'cta should now be before title after move');

// Remove subtitle
comp.emit('layers:change', {
  type: 'layers:change',
  action: 'remove',
  targetId: 'subtitle'
});
assert(!dom.getLiveMap().has('subtitle'), 'Subtitle should be removed from liveMap');

// ---------------------------------------------------------------------------
// Test 3: attr:change (set, update, remove)
// ---------------------------------------------------------------------------
comp.emit('attr:change', {
  type: 'attr:change',
  action: 'update',
  targetId: 'title',
  payload: { text: 'New Title', 'data-count': '5' }
});
assert.strictEqual(titleEl.textContent, 'New Title', 'Title should be updated');
assert.strictEqual(titleEl.getAttribute('data-count'), '5', 'Attribute data-count should be set');

// ---------------------------------------------------------------------------
// Test 4: variant:change
// ---------------------------------------------------------------------------
comp.emit('variant:change', {
  type: 'variant:change',
  targetId: 'hero',
  payload: 'elevated'
});
assert.strictEqual(liveMap.get('hero').dataset.variant, 'elevated', 'Variant should be set');

// ---------------------------------------------------------------------------
// Test 5: registry:change
// ---------------------------------------------------------------------------
comp.snapshot.registry = {
  $version: '2.1',
  vars: { primary: '#0284c7' },
  rules: [
    { selector: ':scope', css: { padding: '16px' } }
  ]
};
comp.emit('registry:change', {
  type: 'registry:change',
  action: 'update'
});
assert(globalThis.document.head.children.length > 0, 'Head should contain injected style');

// ---------------------------------------------------------------------------
// Test 6: destroy
// ---------------------------------------------------------------------------
dom.destroy();
assert.strictEqual(dom.getLiveMap().size, 0, 'LiveMap should be empty after destroy');
assert.strictEqual(container.children.length, 0, 'Container should be emptied after destroy');

// ---------------------------------------------------------------------------
// Test 7: Repeated WDL Loop Initial Mount & data-wdl-index Emission
// ---------------------------------------------------------------------------
const loopContainer = new MockElement('div');
const pricingComp = new MockComponentState('pricing-card', {
  layers: 'ul.features > li.feature*features',
  attr: {
    '.feature': { text: '${text}' }
  },
  data: {
    features: [
      { text: 'First feature' },
      { text: 'Second feature' }
    ]
  }
});

const loopDom = createWdlDom({
  container: loopContainer,
  component: pricingComp
});

const featureNodes = loopDom.getLiveNodes('feature');
assert.strictEqual(featureNodes.length, 2, 'Should mount two feature li elements');
assert.strictEqual(featureNodes[0].tagName, 'LI', 'Feature tag should be LI');
assert.strictEqual(featureNodes[0].getAttribute('data-wdl-index'), '0', 'Row 0 index should be 0');
assert.strictEqual(featureNodes[0].textContent, 'First feature', 'Row 0 text should be resolved');
assert.strictEqual(featureNodes[1].getAttribute('data-wdl-index'), '1', 'Row 1 index should be 1');
assert.strictEqual(featureNodes[1].textContent, 'Second feature', 'Row 1 text should be resolved');
assert.strictEqual(loopDom.getLiveMap().has('feature'), true, 'liveMap should contain feature key');
assert.strictEqual(loopDom.getLiveMap().get('feature'), featureNodes[0], 'liveMap.get should return first element');

// ---------------------------------------------------------------------------
// Test 8: Surgical data:change (Update item text, Append rows, Remove rows)
// ---------------------------------------------------------------------------
const originalNode0 = featureNodes[0];
const originalNode1 = featureNodes[1];

// 8a: Update existing items and append 3rd item
pricingComp.snapshot.data.features = [
  { text: 'Updated First' },
  { text: 'Updated Second' },
  { text: 'Third feature' }
];
pricingComp.emit('data:change', {
  type: 'data:change',
  action: 'set',
  targetId: 'features',
  payload: pricingComp.snapshot.data.features
});

const updatedNodes = loopDom.getLiveNodes('feature');
assert.strictEqual(updatedNodes.length, 3, 'Should now have 3 feature elements');
assert.strictEqual(updatedNodes[0], originalNode0, 'Row 0 DOM reference should be preserved (surgical update)');
assert.strictEqual(updatedNodes[1], originalNode1, 'Row 1 DOM reference should be preserved (surgical update)');
assert.strictEqual(updatedNodes[0].textContent, 'Updated First', 'Row 0 text should update');
assert.strictEqual(updatedNodes[1].textContent, 'Updated Second', 'Row 1 text should update');
assert.strictEqual(updatedNodes[2].textContent, 'Third feature', 'Row 2 text should be set');
assert.strictEqual(updatedNodes[2].getAttribute('data-wdl-index'), '2', 'Row 2 index should be 2');

// 8b: Remove rows (shrink to 1 item)
pricingComp.snapshot.data.features = [
  { text: 'Solo Feature' }
];
pricingComp.emit('data:change', {
  type: 'data:change',
  action: 'set',
  targetId: 'features',
  payload: pricingComp.snapshot.data.features
});

const shrunkNodes = loopDom.getLiveNodes('feature');
assert.strictEqual(shrunkNodes.length, 1, 'Should now have 1 feature element');
assert.strictEqual(shrunkNodes[0], originalNode0, 'Row 0 DOM node should remain mounted');
assert.strictEqual(shrunkNodes[0].textContent, 'Solo Feature', 'Row 0 text updated');
assert.strictEqual(shrunkNodes[0].getAttribute('data-wdl-index'), '0', 'Row 0 index remains 0');

// ---------------------------------------------------------------------------
// Test 9: Loop with Nested Children
// ---------------------------------------------------------------------------
const listContainer = new MockElement('div');
const listComp = new MockComponentState('todo-list', {
  layers: 'ul.items > li.item*todos > span.label + span.badge',
  attr: {
    '.label': { text: '${title}' },
    '.badge': { text: '${status}' }
  },
  data: {
    todos: [
      { title: 'Task 1', status: 'done' },
      { title: 'Task 2', status: 'pending' }
    ]
  }
});

const listDom = createWdlDom({
  container: listContainer,
  component: listComp
});

const items = listDom.getLiveNodes('item');
assert.strictEqual(items.length, 2, 'Should mount 2 item elements');
const label0 = listDom.getNode('label', 0);
const label1 = listDom.getNode('label', 1);
assert.strictEqual(label0.textContent, 'Task 1', 'Label 0 text');
assert.strictEqual(label1.textContent, 'Task 2', 'Label 1 text');

// ---------------------------------------------------------------------------
// Test 10: onDataBind Extension Hook
// ---------------------------------------------------------------------------
let customHookCalled = false;
let customPath = '';
const hookContainer = new MockElement('div');
const hookComp = new MockComponentState('hook-test', {
  layers: 'div.box > p.text',
  attr: { '.text': { text: 'Initial' } },
  data: { count: 42 }
});

const hookDom = createWdlDom({
  container: hookContainer,
  component: hookComp,
  onDataBind: (el, path, val) => {
    customHookCalled = true;
    customPath = path;
  }
});

hookComp.emit('data:change', {
  type: 'data:change',
  action: 'set',
  targetId: 'count',
  payload: 100
});

assert.strictEqual(customHookCalled, true, 'onDataBind extension hook should be invoked');
assert.strictEqual(customPath, 'count', 'onDataBind received targetId path');

console.log('PASS — @ruledwdl/dom unit tests passed cleanly!');

