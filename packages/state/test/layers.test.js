import assert from 'node:assert/strict';
import {
  parseLayers,
  serializeLayers,
  createNode,
  isComponentRef
} from '../dist/layers.js';
import { ComponentManager } from '../dist/index.js';

console.log('Running @ruledwdl/state @component layer tests...');

const tree = parseLayers(
  'section.section>div.section_body>@feature-card+@promo-panel*items'
);
assert.equal(tree[0].tag, 'section');
assert.equal(tree[0].children[0].semanticId, 'section_body');
const refs = tree[0].children[0].children;
assert.equal(refs.length, 2);
assert.equal(refs[0].tag, '@feature-card');
assert.equal(refs[0].semanticId, 'feature-card');
assert.equal(refs[1].tag, '@promo-panel');
assert.equal(refs[1].repeator, 'items');
assert.equal(isComponentRef(refs[0].tag), true);

const roundTrip = parseLayers(serializeLayers(tree));
assert.equal(roundTrip[0].children[0].children[0].tag, '@feature-card');
assert.equal(roundTrip[0].children[0].children[1].tag, '@promo-panel');

const extra = createNode('@card.premium');
assert.equal(extra.tag, '@card');
assert.equal(extra.semanticId, 'premium');
assert.match(serializeLayers([extra]), /@card\.premium/);

const mgr = new ComponentManager();
const layout = mgr.create('layout', {
  layers: 'div.container',
  attr: {},
  data: {}
});
layout.layers.append('container', '@child-1');
assert.match(String(layout.layers.list()), /@child-1/);
const afterAppend = layout.layers.tree();
assert.equal(afterAppend[0].children[0].tag, '@child-1');
JSON.stringify(afterAppend);

layout.layers.set('div.container>@a+@b');
assert.equal(layout.layers.tree()[0].children.length, 2);
JSON.stringify(layout.layers.tree());

console.log('  @ruledwdl/state @component layer tests passed.');
