---
name: ruledwdl-nested
description: Skill for AI agents to use @ruledwdl/nested component resolver and library catalog store adapter for RuledWDL. Trigger whenever resolving nested @component or @component*loop macros in WDL layers, integrating component library catalogs, or aggregating multi-component registries.
license: AGPL-3.0-or-later
metadata:
  website: ruledwdl.dev
  author: Pradeep Dabane
---

# RuledWDL Nested Component Resolver (`@ruledwdl/nested`) Guide

`@ruledwdl/nested` is the pluggable component macro expansion engine and library catalog adapter for RuledWDL. It resolves declarative `@component` and `@component*loopKey` references in WDL Layers, splices sub-component AST trees, cascades loop binding contexts, merges Scoped CSS registries, and deduplicates script dependencies.

---

## 1. Installation & Import

### NPM Package
```bash
npm install @ruledwdl/nested @ruledwdl/core
```

```javascript
import { composePage } from '@ruledwdl/core';
import {
  createNestedResolver,
  createLibraryStore,
  normalizeRegistry,
  mergeRegistries,
  parseLayersToAst,
  serializeAst
} from '@ruledwdl/nested';
```

### Browser CDN Imports (ESM)
```html
<!-- jsDelivr CDN -->
<script type="module">
  import { composePage, createMemoryStore } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/core/dist/ruledwdl.esm.js';
  import { createNestedResolver, createLibraryStore } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/nested/dist/wdl-nested.min.js';
</script>

<!-- unpkg CDN -->
<script type="module">
  import { createNestedResolver, createLibraryStore } from 'https://unpkg.com/@ruledwdl/nested/dist/wdl-nested.min.js';
</script>
```

---

## 2. Quick Start with DATA & DATA_SCHEMA

```javascript
import { composePage } from '@ruledwdl/core';
import { createNestedResolver, createLibraryStore } from '@ruledwdl/nested';

// 1. Initialize a library store with component definitions containing JSON Schemas
const store = createLibraryStore({
  library: [
    {
      id: 'stat-item',
      definition: {
        layers: 'div.stat > span.value + span.label',
        attr: {
          '.value': { text: '${value}' },
          '.label': { text: '${label}' }
        },
        DATA: { value: '0', label: 'Metric' },
        DATA_SCHEMA: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "label": { "type": "string" }
          },
          "required": ["value", "label"]
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
        },
        DATA: { title: 'Welcome', subtitle: 'Headline description' },
        DATA_SCHEMA: {
          "$schema": "http://json-schema.org/draft-07/schema#",
          "type": "object",
          "properties": {
            "title": { "type": "string" },
            "subtitle": { "type": "string" }
          },
          "required": ["title"]
        }
      }
    }
  ]
});

// 2. Define a page referencing nested components in layers
const page = {
  title: 'Dashboard Page',
  COMPONENTS: [
    {
      layers: 'div.hero-wrap > @hero-banner'
    },
    {
      layers: 'section.stats-grid > div.row > @stat-item*stats'
    }
  ],
  DATA: {
    title: 'Hello RuledWDL',
    subtitle: 'Ultra-fast declarative components',
    stats: [
      { value: '15+', label: 'Components' },
      { value: '< 2ms', label: 'Edge Render' }
    ]
  },
  DATA_SCHEMA: {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "subtitle": { "type": "string" },
      "stats": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "value": { "type": "string" },
            "label": { "type": "string" }
          },
          "required": ["value", "label"]
        }
      }
    },
    "required": ["title", "stats"]
  }
};

// 3. Resolve and Compose Page to HTML
const resolver = createNestedResolver({ store });

const { html } = await composePage(store, 'default', page, {
  resolveComponent: resolver
});

console.log(html);
```

---

## 3. Core API

### `createNestedResolver(options)`
Returns a `resolveComponent` hook function conforming to `@ruledwdl/core`'s `composePage` options:
- `store` (`object`): Optional default store instance.
- `parseLayers` (`Function`): Custom layers parser function.
- `maxDepth` (`number`): Maximum nested recursion depth guard (default: `15`).
- `onMissingComponent` (`(compId, node) => void`): Callback when a referenced `@component` is missing.

### `createLibraryStore(options)`
Creates a WDL Store backed by a catalog or array of components:
- `library` (`object | Array`): `wdl-components-library.json` payload, component array, or map.
- `layouts` (`object`): Map of layout definitions `{ [layoutId]: layoutDef }`.
- `scripts` (`object`): Map of script strings `{ [scriptId]: scriptContent }`.
- `baseStore` (`object`): Optional fallback store.
- Store instance methods:
  - `store.getComponent(project, id)`: Returns component definition.
  - `store.getLayout(project, name)`: Returns layout definition.
  - `store.getScript(project, id)`: Returns script content.
  - `store.getComponentRegistry(project)`: Compiles composite `REGISTRY` across all catalog components.
  - `store.listComponents()`: Lists registered component IDs.
  - `store.registerComponent(id, def)`: Dynamically registers or overrides a component in memory.

### `normalizeRegistry(registry)`
Normalizes Schema v2.0 (`base` / `class`) and Schema v2.1 (`rules` / `vars`) into a standard object representation.

### `mergeRegistries(target, source)`
Deep-merges two component registries, combining utility classes, Scoped CSS rules, and design tokens.

### `parseLayersToAst(layersStr)`
Parses a WDL layers string into an AST tree with tag, classes, loopKey, and children.

### `serializeAst(astNodes)`
Serializes an AST tree back into a standard WDL layers expression.

---

## 4. Architectural Rules

1. **Cycle & Depth Guard**: Recursion depth is tracked per expansion branch (`maxDepth = 15`), preventing infinite loops and timeouts.
2. **Loop Key Forwarding**: `@stat-item*stats` automatically attaches `loopKey = 'stats'` to the sub-component's root AST node.
3. **Class Propagation**: Extra classes on placeholder nodes (e.g. `@card.featured`) merge onto the sub-component root classes.
4. **Script Dependency Deduplication**: `script_deps` from all nested components are collected into a unique set.
