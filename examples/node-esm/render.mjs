// examples/node-esm/render.mjs — @ruledwdl/core@0.3.0 as a plain ES module import
// 100% Zero-Dependency Core Engine with WDLDomTree & Pluggable Transformation Hooks.
//
// Run: node examples/node-esm/render.mjs
import { composePage, createMemoryStore, WDLDomTree } from '../../src/index.js';
import { createFileStore } from '../../src/stores/file-store.js';
import { marked } from 'marked';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// 1) File-backed store — reuses the repo's own fixtures/demo project (a folder of JSON).
const fileStore = createFileStore(join(here, '..', '..', 'fixtures', 'demo'));
const demoPage = await fileStore.getPage('demo', '/');
const { html: fileHtml, versions } = await composePage(fileStore, 'demo', demoPage);
console.log('--- rendered from fixtures/demo (file store) ---');
console.log('Versions metadata:', versions);
console.log(fileHtml.slice(0, 120) + ' ...\n');

// 2) In-memory store — Schema v2.0 component definitions with WDLDomTree 5-element tuple arrays
const memStore = createMemoryStore({
  layouts: {
    base: {
      $version: '2.0',
      name: 'base',
      COMPONENTS: [
        {
          $version: '2.0',
          // 5-element tuple array state format: [depth, operator, tag, semantic_id, repeator]
          layers: [
            [0, '',  'main', 'wrap', null]
          ],
          attr: { '.wrap': { text: '{{content}}' } }
        }
      ],
      DATA: { $version: '2.0', __design_tokens: ':root{--accent:#059669;}' },
    },
  },
});

const page = {
  $version: '0.3.0',
  title: 'Node ESM example v0.3.0',
  layout: 'base',
  REGISTRY: {
    $version: '2.0',
    title: { style: 'color:var(--accent);font-family:system-ui;' },
    body: { style: 'font-family:system-ui;margin-top:8px;' }
  },
  COMPONENTS: [
    {
      $version: '2.0',
      // Space-free flat string array format
      layers: [
        'h1.title',
        '+ p.body_md'
      ],
      attr: {
        '.title': { text: 'Hello ${name} from Node (v0.3.0)' },
        '.body_md': { text: 'This text is transformed via external **marked** parser plugged into `opts.transformText` hook.' }
      }
    }
  ],
  DATA: { $version: '2.0', name: 'World' },
};

// Render with Stage-1 transformData and Stage-2 transformText hooks
const { html: memHtml } = await composePage(memStore, 'demo', page, {
  transformData: (data) => {
    data.name = data.name.toUpperCase();
    return data;
  },
  transformText: (text, node) => {
    if (node.classes.includes('body_md')) {
      return marked.parseInline(text);
    }
    return text;
  }
});

console.log('--- rendered from in-memory store with transformation hooks ---');
console.log(memHtml);
