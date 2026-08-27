---
name: ruledwdl-csr
description: Skill for AI agents to use @ruledwdl/csr (Client-Side Rendering) for ultra-lightweight WDL component rendering and DOM hydration in browsers and client-side applications. Trigger whenever building client-side dynamic interfaces, single-page app components, or browser DOM updates using RuledWDL.
license: AGPL-3.0-or-later
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
import { render, hydrate, parseLayers, buildEl, resolvePath } from '@ruledwdl/csr';
```

### Browser CDN Imports (ESM)
```html
<!-- jsDelivr CDN -->
<script type="module">
  import { render, hydrate, parseLayers, buildEl, resolvePath } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/csr/dist/wdl-csr.min.js';
</script>

<!-- unpkg CDN -->
<script type="module">
  import { render, hydrate, parseLayers, buildEl, resolvePath } from 'https://unpkg.com/@ruledwdl/csr/dist/wdl-csr.min.js';
</script>
```

---

## 2. Core API

### `render(REGISTRY, COMPONENTS, DATA, options)`
Synchronously renders WDL components directly to an HTML fragment string and injects Schema v2.1 Scoped CSS into `document.head`.

```javascript
import { render } from '@ruledwdl/csr';

// 1. Scoped CSS & Tokens Registry
const REGISTRY = {
  $version: '2.1',
  'card': {
    rules: [
      { selector: ':scope', css: { padding: '1.5rem', border: '1px solid #e2e8f0', 'border-radius': '0.75rem' } },
      { selector: '& .title', css: { color: '#0f172a', 'font-size': '1.25rem', 'font-weight': '700' } }
    ]
  }
};

// 2. Component Layers Definition
const COMPONENTS = [
  {
    layers: 'div.card > h2.title + p.description',
    attr: {
      '.title': { text: '${title}' },
      '.description': { text: '${desc}' }
    }
  }
];

// 3. Runtime Data State
const DATA = {
  title: 'CSR Powered Component',
  desc: 'Rendered instantly on the client with zero build step.'
};

// 4. JSON Schema Definition (Draft-07 Standard)
const DATA_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "CardProps",
  "properties": {
    "title": { "type": "string", "description": "Card headline" },
    "desc": { "type": "string", "description": "Card body copy" }
  },
  "required": ["title", "desc"]
};

// 5. Render HTML
const html = render(REGISTRY, COMPONENTS, DATA);
document.getElementById('app').innerHTML = html;
```

---

### `hydrate(options)`
Automatically scans the DOM for elements marked with `[wdl-csr="payloadId"]` and hydrates them with payloads from `window.WDL_CSR`:

```html
<div wdl-csr="hero-widget"></div>

<script type="module">
  import { hydrate } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/csr/dist/wdl-csr.min.js';

  window.WDL_CSR = {
    "hero-widget": {
      REGISTRY: {
        $version: "2.1",
        hero: { rules: [{ selector: ":scope", css: { padding: "2rem" } }] }
      },
      COMPONENTS: [
        { layers: "section.hero > h1.title", attr: { ".title": { text: "${heading}" } } }
      ],
      DATA: { heading: "Hydrated Widget" },
      DATA_SCHEMA: {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": { "heading": { "type": "string" } },
        "required": ["heading"]
      }
    }
  };

  hydrate();
</script>
```

---

### `parseLayers(layersStr)`
Parses a WDL layers string into an AST tree:
```javascript
import { parseLayers } from '@ruledwdl/csr';

const ast = parseLayers('section.hero > h1.title + p.desc');
// returns: [ { tag: 'section', classes: ['hero'], children: [ ... ] } ]
```

---

### `buildEl(node, attrMap, dataCtx)`
Lower-level element compiler that builds an HTML string for a single AST node:
```javascript
import { buildEl } from '@ruledwdl/csr';

const html = buildEl({ tag: 'button', classes: ['cta'] }, { '.cta': { text: 'Click Me' } }, {});
// '<button class="cta" wdl-comp="cta">Click Me</button>'
```

---

### `resolvePath(obj, path)`
Resolves dot-separated data path references (e.g. `user.profile.name`):
```javascript
import { resolvePath } from '@ruledwdl/csr';

const name = resolvePath({ user: { profile: { name: 'Pradeep' } } }, 'user.profile.name');
// 'Pradeep'
```

---

## 3. Options & Custom Transformations

`render()` accepts an optional `options` parameter:

```javascript
const html = render(REGISTRY, COMPONENTS, DATA, {
  // Pre-process data variables before rendering
  transformData: (data) => {
    return { ...data, title: String(data.title).toUpperCase() };
  },

  // Selective text parser hook (e.g. Markdown or custom formatting)
  transformText: (text, node) => {
    if (node.classes.includes('description')) {
      return text.replace(/client/g, '⚡ client');
    }
    return text;
  }
});
```

---

## 4. Post-Load DOM Insertion & Alpine.js Hydration

When inserting rendered HTML post-load, re-initialize reactive directive trees:

```javascript
const container = document.getElementById('app');
container.innerHTML = render(REGISTRY, COMPONENTS, DATA);

if (window.Alpine) {
  window.Alpine.initTree(container);
}
```
