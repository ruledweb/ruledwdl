---
name: ruledwdl-csr
description: Skill for AI agents to use @ruledwdl/csr (Client-Side Rendering) for ultra-lightweight WDL component rendering and DOM hydration in browsers and client-side applications. Trigger whenever building client-side dynamic interfaces, single-page app components, or browser DOM updates using RuledWDL.
license: GPL-3.0-or-later
metadata:
  website: ruledwdl.dev
  author: Pradeep Dabane
---

# RuledWDL Client-Side Rendering (`@ruledwdl/csr`) Guide

`@ruledwdl/csr` is the zero-dependency, ultra-lightweight client-side rendering variant of `@ruledwdl/core`. It provides fast in-browser rendering of declarative WDL definitions (`REGISTRY`, `COMPONENTS`, `DATA`) into clean HTML markup without server I/O or heavy DOM overhead.

---

## 1. Installation & Import

### NPM ESM Package
```bash
npm install @ruledwdl/csr
```

```javascript
import { render, parseLayers, buildEl, resolvePath } from '@ruledwdl/csr';
```

### Browser Script Import (CDN / Direct)
```html
<script type="module">
  import { render } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/csr/dist/wdl-csr.min.js';
</script>
```

---

## 2. Core API: `render()`

The primary entry point is `render(REGISTRY, COMPONENTS, DATA, options)`:

```javascript
import { render } from '@ruledwdl/csr';

const REGISTRY = {
  $version: '2.1',
  'card': {
    class: 'p-4 rounded-lg bg-white shadow-md'
  }
};

const COMPONENTS = [
  {
    layers: 'div.card > h2.title + p.description',
    attr: {
      '.title': { text: '${title}' },
      '.description': { text: '${desc}' }
    }
  }
];

const DATA = {
  title: 'CSR Powered Component',
  desc: 'Rendered instantly on the client.'
};

// Returns HTML string ready for innerHTML insertion
const html = render(REGISTRY, COMPONENTS, DATA);
```

---

## 3. Options & Custom Transformations

`render()` accepts an optional `options` parameter for custom text and data transformation hooks:

```javascript
const html = render(REGISTRY, COMPONENTS, DATA, {
  // Pre-process data variables before rendering
  transformData: (data) => {
    return { ...data, title: data.title.toUpperCase() };
  },

  // Selective text parser hook (e.g. inline Markdown or custom formatting)
  transformText: (text, node) => {
    if (node.classes.includes('description')) {
      return text.replace(/client/g, '⚡ client');
    }
    return text;
  }
});
```

---

## 4. In-Browser DOM Insertion & Alpine.js Hydration

When inserting rendered CSR HTML into the DOM dynamically post-load (e.g. via `innerHTML`, `fetch`, or event handlers), interactive directives (such as Alpine.js) must be hydrated:

```javascript
const container = document.getElementById('app');

// 1. Render HTML
container.innerHTML = render(REGISTRY, COMPONENTS, DATA);

// 2. Hydrate Alpine.js tree (Critical for post-load dynamic insertion)
if (window.Alpine) {
  window.Alpine.initTree(container);
}
```

---

## 5. Synchronization with Core (`npm run sync:csr`)

Whenever modifying core layers parsing, element building, data resolution, or state machine logic in `@ruledwdl/core`, **MUST** sync files to `@ruledwdl/csr`:

```bash
npm run sync:csr
```

This automatically syncs:
- `layers-parser.js`
- `data-resolver.js`
- `token-expander.js`
- `registry-compiler.js`
- `element-builder.js`
- `wdl-dom-tree.js`

to `packages/csr/src/` and rebuilds `packages/csr/dist/wdl-csr.min.js`.
