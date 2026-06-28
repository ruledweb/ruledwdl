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
ok('page component renders', html.includes('Welcome to WDL'));
ok('layout slot {{content}} injected (div.wrap wraps content)', /<div class="wrap"><h1[^>]*>Hello World/.test(html));
ok('tailwind CDN script injected', html.includes('@tailwindcss/browser@4'));
ok('title applied', html.includes('<title>Home</title>'));

// 2) In-memory store renders identically (no fs)
const mem = createMemoryStore({
  layouts: { base: { name: 'base', COMPONENTS: [{ emmet: 'div.wrap', attr: { '.wrap': { text: '{{content}}' } } }], DATA: {} } },
});
const { html: memHtml } = await composePage(mem, 'demo', page);
ok('memory store === file store output', memHtml === html);

// 3) Pure renderAll works standalone (no store)
const frag = renderAll({}, [{ emmet: 'span.x', attr: { '.x': { text: '${v}' } } }], { v: 'hi' });
ok('renderAll standalone', frag.includes('hi') && frag.includes('class="x"'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
