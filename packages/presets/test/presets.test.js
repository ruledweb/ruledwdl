import { resolvePresets } from '../src/index.js';
import assert from 'node:assert/strict';

const def = {
  layers: 'div.card > img.image + div.body > h3.title + p.excerpt',
  presets: {
    'card-no-image': 'div.card > div.body > h3.title + p.excerpt',
  },
  active_preset: 'card-no-image',
  attr: {
    '.image': { src: '/placeholder.jpg' },
    '.title': { text: '${title}' },
    '.excerpt': { text: '${excerpt}' },
  },
  registry: {
    $version: '2.1',
    card: { base: 'rounded' },
    image: { base: 'w-full' },
    title: { base: 'text-xl' },
    excerpt: { base: 'text-sm' },
  },
  data: { title: 'Hello' },
};

const out = resolvePresets(def);

assert.equal(out.layers, 'div.card > div.body > h3.title + p.excerpt');
assert.equal(out.presets, undefined);
assert.equal(out.active_preset, undefined);
assert.equal(out.attr['.image'], undefined);
assert.ok(out.attr['.title']);
assert.equal(out.registry.image, undefined);
assert.ok(out.registry.title);
assert.equal(out.registry.$version, '2.1');
assert.equal(out.data.title, 'Hello');
assert.equal(out.attr['.card']?.['data-preset'], 'card-no-image');

console.log('presets tests passed');
