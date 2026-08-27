import assert from 'node:assert';
import {
  createNestedResolver,
  createLibraryStore,
  normalizeRegistry,
  mergeRegistries,
  parseLayersToAst,
  serializeAst
} from '../src/index.js';
import { composePage } from '../../../src/index.js';

console.log('Running @ruledwdl/nested unit tests...');

// ---------------------------------------------------------------------------
// Test 1: Parser & Serializer Round-trip
// ---------------------------------------------------------------------------
const layers1 = 'section.hero>div.container>h1.title+p.subtitle';
const ast1 = parseLayersToAst(layers1);
assert.strictEqual(ast1.length, 1);
assert.strictEqual(ast1[0].tag, 'section');
assert.strictEqual(ast1[0].classes[0], 'hero');
const serialized1 = serializeAst(ast1);
assert.strictEqual(serialized1, layers1);

const layers2 = 'div.grid>@card.premium*items';
const ast2 = parseLayersToAst(layers2);
assert.strictEqual(ast2[0].children[0].tag, '@card');
assert.strictEqual(ast2[0].children[0].classes[0], 'premium');
assert.strictEqual(ast2[0].children[0].loopKey, 'items');

// ---------------------------------------------------------------------------
// Test 2: Registry Normalization & Merging
// ---------------------------------------------------------------------------
const reg2_0 = normalizeRegistry({
  btn: { base: 'px-4 py-2 bg-blue-500' },
  card: 'p-6 rounded-lg'
});
assert.strictEqual(reg2_0.btn.class, 'px-4 py-2 bg-blue-500');
assert.strictEqual(reg2_0.card.class, 'p-6 rounded-lg');

const reg2_1 = normalizeRegistry({
  card: {
    $version: '2.1',
    rules: [{ selector: ':scope', css: { padding: '16px' } }],
    vars: { bg: '#fff' }
  }
});
assert.strictEqual(reg2_1.card.$version, '2.1');
assert.strictEqual(reg2_1.card.rules.length, 1);

const merged = mergeRegistries(reg2_0, reg2_1);
assert.strictEqual(merged.btn.class, 'px-4 py-2 bg-blue-500');
assert.strictEqual(merged.card.rules.length, 1);
assert.strictEqual(merged.card.vars.bg, '#fff');

// ---------------------------------------------------------------------------
// Test 3: Library Store Adapter
// ---------------------------------------------------------------------------
const store = createLibraryStore({
  library: [
    {
      id: 'stat-item',
      definition: {
        layers: 'div.stat > span.val + span.lbl',
        attr: {
          '.val': { text: '${value}' },
          '.lbl': { text: '${label}' }
        },
        REGISTRY: {
          stat: { base: 'text-center p-4' }
        }
      }
    },
    {
      id: 'hero-banner',
      definition: {
        layers: 'section.hero > h1.title',
        attr: {
          '.title': { text: '${title}' }
        }
      }
    }
  ],
  layouts: {
    base: {
      name: 'base',
      COMPONENTS: [{ layers: 'div.shell', attr: { '.shell': { text: '{{content}}' } } }]
    }
  }
});

const statDef = await store.getComponent('default', 'stat-item');
assert(statDef, 'stat-item should be retrieved from store');
assert.strictEqual(statDef.layers, 'div.stat > span.val + span.lbl');

const layout = await store.getLayout('default', 'base');
assert(layout, 'base layout should be retrieved');

const compReg = await store.getComponentRegistry('default');
assert(compReg.stat, 'Composite registry should contain stat component tokens');

// ---------------------------------------------------------------------------
// Test 4: Nested Component Resolution (Static Macro)
// ---------------------------------------------------------------------------
const resolver = createNestedResolver({ store });

const block1 = {
  layers: 'div.wrapper > @hero-banner',
  attr: { '.wrapper': { class: 'max-w-5xl' } }
};

const resolvedBlock1 = await resolver(store, 'default', block1);
assert(resolvedBlock1, 'Should resolve nested block');
assert(resolvedBlock1.layers.includes('section.hero'), 'Should expand hero component');
assert(resolvedBlock1.attr['.title'], 'Should merge sub-component attributes');

// ---------------------------------------------------------------------------
// Test 5: Nested Component Resolution with Loop Key
// ---------------------------------------------------------------------------
const block2 = {
  layers: 'div.grid > @stat-item.featured*stats',
  attr: {}
};

const resolvedBlock2 = await resolver(store, 'default', block2);
assert(resolvedBlock2.layers.includes('div.stat.featured*stats'), 'Should propagate loopKey and extra classes onto sub-root');

// ---------------------------------------------------------------------------
// Test 6: Full composePage Integration
// ---------------------------------------------------------------------------
const page = {
  title: 'Test Dashboard',
  COMPONENTS: [
    {
      layers: 'div.hero-wrap > @hero-banner'
    },
    {
      layers: 'div.stats-row > @stat-item*stats'
    }
  ],
  DATA: {
    title: 'Hello Nested Components',
    stats: [
      { value: '42', label: 'Score' },
      { value: '100', label: 'Percent' }
    ]
  }
};

const { html } = await composePage(store, 'default', page, {
  resolveComponent: resolver
});

assert(html.includes('Hello Nested Components'), 'Should render resolved hero component text');
assert(html.includes('42'), 'Should render first looped stat item value');
assert(html.includes('100'), 'Should render second looped stat item value');
assert(html.includes('Score'), 'Should render first looped stat item label');

// ---------------------------------------------------------------------------
// Test 7: Cycle Protection Guard
// ---------------------------------------------------------------------------
store.registerComponent('cycle-a', { layers: 'div.a > @cycle-b' });
store.registerComponent('cycle-b', { layers: 'div.b > @cycle-a' });

const cycleBlock = { layers: 'div.root > @cycle-a' };
const cycleResult = await resolver(store, 'default', cycleBlock);
assert(cycleResult, 'Should not throw or crash on circular reference');

console.log('PASS — @ruledwdl/nested unit tests passed cleanly!');
