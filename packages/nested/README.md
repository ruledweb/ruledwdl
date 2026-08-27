# `@ruledwdl/nested`

> Nested component resolver and library catalog store adapter for RuledWDL.

`@ruledwdl/nested` provides recursive `@component` and `@component*loop` macro resolution in WDL Layers definitions. It enables page authors to nest, reuse, and loop library components seamlessly within complex layout trees while isolating namespaces, merging Scoped CSS registries, and deduplicating script dependencies.

[![npm version](https://img.shields.io/npm/v/@ruledwdl/nested.svg)](https://www.npmjs.com/package/@ruledwdl/nested)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

---

## Features

- **Nested Component Macros**: Reference catalog components directly in WDL layers (e.g. `div.grid > @stat-item*stats` or `div.hero-wrap > @hero-banner`).
- **Data Loop Key Contexts**: Automatically forwards loop keys (`*items`, `*stats`) to the sub-component's root AST node.
- **Class & Modifier Merging**: Merges classes and modifier selectors across parent placeholders and sub-component roots.
- **Registry & Scoped CSS Aggregation**: Merges Schema v2.0 utility classes and Schema v2.1 Scoped CSS rules (`rules: [{ selector, css }]`) into composite registries.
- **Library Store Adapter (`createLibraryStore`)**: Backs WDL stores with `wdl-components-library.json` catalogs.
- **Cycle & Recursion Guard**: Built-in visited chain tracking and maximum depth ceiling.
- **Zero Dependencies**: Pure JavaScript ESM engine; runs natively in Edge runtimes, Cloudflare Workers, Node.js, and modern browsers via CDN.

---

## Installation

### NPM Package
```bash
npm install @ruledwdl/nested @ruledwdl/core
```

```javascript
import { composePage } from '@ruledwdl/core';
import { createNestedResolver, createLibraryStore } from '@ruledwdl/nested';
```

---

## CDN / Direct Browser Usage (Zero Build Step)

### ESM Import via jsDelivr
```html
<script type="module">
  import { composePage, createMemoryStore } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/core/dist/ruledwdl.esm.js';
  import { createNestedResolver, createLibraryStore } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/nested/dist/wdl-nested.min.js';
</script>
```

### ESM Import via unpkg
```html
<script type="module">
  import { createNestedResolver, createLibraryStore } from 'https://unpkg.com/@ruledwdl/nested/dist/wdl-nested.min.js';
</script>
```

---

## Quick Start Example

```javascript
import { composePage } from '@ruledwdl/core';
import { createNestedResolver, createLibraryStore } from '@ruledwdl/nested';

// 1. Initialize a Library Store with catalog definitions
const store = createLibraryStore({
  library: [
    {
      id: 'stat-item',
      definition: {
        layers: 'div.stat > span.value + span.label',
        attr: {
          '.value': { text: '${value}' },
          '.label': { text: '${label}' }
        }
      }
    },
    {
      id: 'hero-banner',
      definition: {
        layers: 'section.hero > h1.title + p.subtitle',
        attr: {
          '.title': { text: '${title}' },
          '.subtitle': { text: '${subtitle}' }
        }
      }
    }
  ]
});

// 2. Define a Page with Nested Component References
const page = {
  title: 'Dashboard Page',
  COMPONENTS: [
    {
      layers: 'div.hero-container > @hero-banner'
    },
    {
      layers: 'section.stats-grid > div.row > @stat-item*stats'
    }
  ],
  DATA: {
    title: 'Welcome to RuledWDL',
    subtitle: 'High performance declarative UI',
    stats: [
      { value: '100+', label: 'Components' },
      { value: '< 2ms', label: 'Edge Render' }
    ]
  }
};

// 3. Compose Page with Nested Component Resolution Hook
const resolver = createNestedResolver({ store });

const { html } = await composePage(store, 'demo-tenant', page, {
  resolveComponent: resolver
});

console.log(html);
```

---

## Core API

### `createNestedResolver(options)`
Returns a `resolveComponent` hook function conforming to `@ruledwdl/core`'s `composePage` options.
- `store` (`object`): Optional default store instance.
- `parseLayers` (`Function`): Custom layers parser (defaults to global `WDL.parseLayers` or built-in parser).
- `maxDepth` (`number`): Maximum recursion depth guard (default: `15`).
- `onMissingComponent` (`(compId, node) => void`): Callback when a referenced `@component` is missing from the store.

### `createLibraryStore(options)`
Creates a WDL Store backed by an in-memory component catalog.
- `library` (`object | Array`): `wdl-components-library.json` object or component array.
- `layouts` (`object`): Map of layout definitions `{ [layoutId]: layoutDef }`.
- `scripts` (`object`): Map of script strings `{ [scriptId]: scriptContent }`.
- `baseStore` (`object`): Optional fallback store.

### `normalizeRegistry(registry)`
Normalizes Schema v2.0 (`base` / `class`) and Schema v2.1 (`rules` / `vars`) definitions into a consistent object structure.

### `mergeRegistries(target, source)`
Deep-merges two component registries, combining utility classes, Scoped CSS rules, and design tokens.

---

## License

Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0-or-later)](./LICENSE).
