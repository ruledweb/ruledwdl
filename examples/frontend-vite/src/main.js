// examples/frontend-vite/src/main.js — @ruledwdl/core@0.3.0 consumed as a normal npm dependency
// inside a bundler-based frontend project.
import { composePage, createMemoryStore, WDLDomTree } from '@ruledwdl/core';

const store = createMemoryStore({
  layouts: {
    base: {
      $version: '2.0',
      name: 'base',
      COMPONENTS: [
        {
          $version: '2.0',
          layers: [
            [0, '', 'div', 'wrap', null]
          ],
          attr: { '.wrap': { text: '{{content}}' } }
        }
      ],
      DATA: { $version: '2.0', __brand_tokens: ':root{--brand:#2563eb;}' },
    },
  },
});

const page = {
  $version: '0.3.0',
  title: 'Bundled with Vite — v0.3.0',
  layout: 'base',
  REGISTRY: {
    $version: '2.0',
    wrap: { style: 'font-family:system-ui;padding:24px;' },
    cta:  { style: 'display:inline-block;background:var(--brand);color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;' },
  },
  COMPONENTS: [{
    $version: '2.0',
    // Space-free flat string array format
    layers: [
      'h2.card_title',
      '+ p.card_sub',
      '+ a.cta'
    ],
    attr: {
      '.card_title': { text: 'Rendered by @ruledwdl/core v0.3.0, bundled by Vite' },
      '.card_sub':   { text: 'Authored as WDL JSON Schema v2.0, imported as a normal dependency.' },
      '.cta':        { text: 'Learn more', href: 'https://github.com/ruledweb/ruledwdl' },
    },
  }],
  DATA: { $version: '2.0' },
};

(async () => {
  const { html, versions } = await composePage(store, 'app', page);
  console.log('Schema versions:', versions);
  document.getElementById('wdl-block').srcdoc = html;
})();
