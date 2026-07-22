// examples/frontend-vite/src/main.js — @wdl/core consumed as a normal npm dependency inside a
// bundler-based frontend project. This is the same import you'd write in a React/Vue/Svelte
// component: Vite (or webpack, Rollup, esbuild, ...) resolves `@wdl/core` from node_modules and
// bundles it like any other library — no special-casing needed on wdl-core's side.
import { composePage, createMemoryStore } from '@wdl/core';

// In a real app this content would come from your CMS/API — hardcoded here to keep the example
// self-contained. The point being demonstrated is the import + bundling, not the data source.
const store = createMemoryStore({
  layouts: {
    base: {
      name: 'base',
      COMPONENTS: [{ layers: 'div.wrap', attr: { '.wrap': { text: '{{content}}' } } }],
      DATA: { __brand_tokens: ':root{--brand:#2563eb;}' },
    },
  },
});

const page = {
  title: 'Bundled with Vite',
  layout: 'base',
  REGISTRY: {
    wrap: { style: 'font-family:system-ui;padding:24px;' },
    cta:  { style: 'display:inline-block;background:var(--brand);color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;' },
  },
  COMPONENTS: [{
    layers: 'h2+p+a.cta',
    attr: {
      h2: { text: 'Rendered by @wdl/core, bundled by Vite' },
      p:  { text: 'This block is authored as WDL JSON, imported as a normal dependency.' },
      a:  { text: 'Learn more', href: 'https://example.com' },
    },
  }],
  DATA: {},
};

// Wrapped in an async IIFE rather than a top-level `await` — esbuild's default production build
// target (set by Vite for broad browser support) doesn't allow top-level await; an IIFE avoids
// forcing every consumer to bump their build target just to call an async render function.
(async () => {
  const { html } = await composePage(store, 'app', page);
  document.getElementById('wdl-block').srcdoc = html;
})();
