// Smoke test — proves @wdl/core renders end-to-end from a folder of JSON via the FileStore,
// and that the in-memory store path works too. Run: node test/smoke.test.js
import { composePage, renderAll, createMemoryStore } from '../src/index.js';
import { createFileStore } from '../src/stores/file-store.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (label, cond) => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`); };

// 1) FileStore + layout chain + data binding + slot injection
const store = createFileStore(join(here, '..', 'fixtures', 'demo'));
const page = await store.getPage('demo', '/');
const { html } = await composePage(store, 'demo', page);
ok('renders a doc', html.includes('<!DOCTYPE html>'));
ok('data binding ${name} → World', html.includes('Hello World'));
ok('page component renders', html.includes('@wdl/core'));
ok('layout slot {{content}} injected (div.shell wraps content)', /<div class="shell[^"]*"><div class="card[^"]*">/.test(html));
ok('tailwind CDN script injected', html.includes('@tailwindcss/browser@4'));
ok('title applied', html.includes('<title>WDL Demo</title>'));

// 2) In-memory store renders identically (no fs) — same base layout as fixtures/demo/layouts/base.json
const mem = createMemoryStore({
  layouts: {
    base: {
      name: 'base',
      COMPONENTS: [{
        emmet: 'div.shell.min-h-screen.bg-gradient-to-br.from-slate-100.to-indigo-200.flex.items-center.justify-center.p-6',
        attr: { '.shell': { text: '{{content}}' } },
      }],
      DATA: {},
    },
  },
});
const { html: memHtml } = await composePage(mem, 'demo', page);
ok('memory store === file store output', memHtml === html);

// 3) Pure renderAll works standalone (no store)
const frag = renderAll({}, [{ emmet: 'span.x', attr: { '.x': { text: '${v}' } } }], { v: 'hi' });
ok('renderAll standalone', frag.includes('hi') && frag.includes('class="x"'));

// 4) Design/brand token cascade: base layout → page (__design_tokens), then __brand_tokens wins
{
  const tokenStore = createMemoryStore({
    layouts: {
      base: {
        name: 'base',
        COMPONENTS: [{ emmet: 'div.shell', attr: { '.shell': { text: '{{content}}' } } }],
        DATA: {
          __design_tokens: ':root{--color-primary:#4f46e5;}',
          __brand_tokens: ':root{--color-primary:#000000;}',
        },
      },
    },
  });
  const tokenPage = {
    layout: 'base',
    COMPONENTS: [{ emmet: 'p' }],
    DATA: { __design_tokens: ':root{--color-primary:#059669;}' },
  };
  const { html: tokenHtml } = await composePage(tokenStore, 'demo', tokenPage);
  const designIdx = tokenHtml.indexOf('data-wdl="design-tokens"');
  const brandIdx = tokenHtml.indexOf('data-wdl="brand-tokens"');
  ok('design tokens layered base→page in one style tag', /--color-primary:#4f46e5[\s\S]*--color-primary:#059669/.test(tokenHtml));
  ok('brand tokens emitted after design tokens (wins cascade)', designIdx > -1 && brandIdx > designIdx);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
