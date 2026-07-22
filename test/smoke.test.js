// Smoke test — proves @wdl/core renders end-to-end from a folder of JSON via the FileStore,
// and that the in-memory store path works too. Run: node test/smoke.test.js
import { composePage, renderAll, createMemoryStore, parseLayers } from '../src/index.js';
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
ok('page component renders', html.includes('@ruledwdl/core'));
ok('layout slot {{content}} injected (div.shell wraps content)', /<div class="[^"]*shell[^"]*"><div class="[^"]*card[^"]*">/.test(html));
ok('tailwind CDN script injected', html.includes('@tailwindcss/browser@4'));
ok('title applied', html.includes('<title>WDL Demo</title>'));

// 2) In-memory store renders identically (no fs) — same base layout as fixtures/demo/layouts/base.json
const mem = createMemoryStore({
  layouts: {
    base: {
      name: 'base',
      REGISTRY: {
        shell: { class: 'min-h-screen bg-gradient-to-br from-slate-100 to-indigo-200 flex items-center justify-center p-6' }
      },
      COMPONENTS: [{
        layers: 'div.shell',
        attr: { '.shell': { text: '{{content}}' } },
      }],
      DATA: {},
    },
  },
});
const { html: memHtml } = await composePage(mem, 'demo', page);
ok('memory store === file store output', memHtml === html);

// 3) Pure renderAll works standalone (no store)
const frag = renderAll({}, [{ layers: 'span.x', attr: { '.x': { text: '${v}' } } }], { v: 'hi' });
ok('renderAll standalone', frag.includes('hi') && frag.includes('class="x"'));

// 4) Design/brand token cascade: base layout → page (__design_tokens), then __brand_tokens wins
{
  const tokenStore = createMemoryStore({
    layouts: {
      base: {
        name: 'base',
        COMPONENTS: [{ layers: 'div.shell', attr: { '.shell': { text: '{{content}}' } } }],
        DATA: {
          __design_tokens: ':root{--color-primary:#4f46e5;}',
          __brand_tokens: ':root{--color-primary:#000000;}',
        },
      },
    },
  });
  const tokenPage = {
    layout: 'base',
    COMPONENTS: [{ layers: 'p' }],
    DATA: { __design_tokens: ':root{--color-primary:#059669;}' },
  };
  const { html: tokenHtml } = await composePage(tokenStore, 'demo', tokenPage);
  const designIdx = tokenHtml.indexOf('data-wdl="design-tokens"');
  const brandIdx = tokenHtml.indexOf('data-wdl="brand-tokens"');
  ok('design tokens layered base→page in one style tag', /--color-primary:#4f46e5[\s\S]*--color-primary:#059669/.test(tokenHtml));
  ok('brand tokens emitted after design tokens (wins cascade)', designIdx > -1 && brandIdx > designIdx);
}

// 5) WDL Layers syntax — de-indentation / subset operator (<)
{
  const ast = parseLayers('header>div.container>h1+p<div.banner');
  const header = ast[0];
  const container = header.children[0];
  const banner = header.children[1];
  ok('< operator de-indents to parent scope (container and banner are siblings under header)',
    header.tag === 'header' &&
    container.classes.includes('container') &&
    container.children.length === 2 &&
    banner.classes.includes('banner')
  );

  const astMulti = parseLayers('div.shell>main>article>h1<<footer');
  const shell = astMulti[0];
  const footer = shell.children[1];
  ok('<< operator de-indents multiple levels (footer is sibling of main under shell)',
    shell.children.length === 2 &&
    shell.children[0].tag === 'main' &&
    footer.tag === 'footer'
  );
}

// 6) WDL Layers strict single semantic_id rule
{
  let threw = false;
  try {
    parseLayers('div.card.featured');
  } catch (err) {
    threw = err.message.includes('Multiple dot selectors in "div.card.featured" are not allowed');
  }
  ok('restricts multiple dot selectors and enforces 1 semantic_id per node', threw);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
