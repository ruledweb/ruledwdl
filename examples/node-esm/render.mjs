// examples/node-esm/render.mjs — using @wdl/core as a plain ES module import in your own script,
// as opposed to going through the packaged `wdl` CLI (bin/wdl.js). Same package, different entry
// point: this is what embedding the renderer inside a bigger Node program looks like (a build step,
// an SSG, a Worker's fetch handler in dev, a test harness, ...).
//
// Run: node examples/node-esm/render.mjs
import { composePage, createMemoryStore } from '../../src/index.js';
import { createFileStore } from '../../src/stores/file-store.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// 1) File-backed store — reuses the repo's own fixtures/demo project (a folder of JSON).
const fileStore = createFileStore(join(here, '..', '..', 'fixtures', 'demo'));
const demoPage = await fileStore.getPage('demo', '/');
const { html: fileHtml } = await composePage(fileStore, 'demo', demoPage);
console.log('--- rendered from fixtures/demo (file store) ---');
console.log(fileHtml.slice(0, 120) + ' ...\n');

// 2) In-memory store — no filesystem at all, useful for tests or when pages are generated
// programmatically rather than authored as files (e.g. fetched from an API at request time).
const memStore = createMemoryStore({
  layouts: {
    base: {
      name: 'base',
      COMPONENTS: [{ emmet: 'main.wrap', attr: { '.wrap': { text: '{{content}}' } } }],
      DATA: { __design_tokens: ':root{--accent:#059669;}' },
    },
  },
});
const page = {
  title: 'Node ESM example',
  layout: 'base',
  REGISTRY: { h1: { style: 'color:var(--accent);font-family:system-ui;' } },
  COMPONENTS: [{ emmet: 'h1', attr: { h1: { text: 'Hello ${name} from Node' } } }],
  DATA: { name: 'World' },
};
const { html: memHtml } = await composePage(memStore, 'demo', page);
console.log('--- rendered from an in-memory store ---');
console.log(memHtml);
