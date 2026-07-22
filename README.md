# Web Definition Language — Core Engine (`@ruledwdl/core`)

> **WDL (Web Definition Language)** is a host-agnostic, declarative language runtime and component layout engine. It renders WDL definitions (`REGISTRY` / `COMPONENTS` / `DATA`, layouts, and components) directly to optimized HTML using a pluggable store.

[![npm version](https://img.shields.io/npm/v/@ruledwdl/core.svg)](https://www.npmjs.com/package/@ruledwdl/core)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Spec License: GPL v3](https://img.shields.io/badge/Spec_License-GPL_v3-green.svg)](docs/ruledwdl-reference.md)

---

## Features

- **Host-Agnostic Engine**: Zero framework overhead — runs natively in Node.js, Cloudflare Workers, Edge runtimes, or modern browsers.
- **Layers Component Expressions**: Ultra-lean component syntax using WDL Layers expressions (`tag.semantic_id`, `>`, `+`, `<` de-indent/subset, `*` loops).
- **Pluggable Data Store**: Pure interface separating storage (in-memory, file system, D1, KV, SQL) from rendering logic.
- **Design Token Cascade**: Layered design and brand tokens integrated directly into WDL JSON and compiled into single CSS cascade tags.
- **Extensible Architecture**: Custom components and plugins connect seamlessly via `resolveComponent` and `extraScripts` hooks.

---

## Installation

```bash
npm install @ruledwdl/core
```

---

## Quick Start

```javascript
import { composePage, createMemoryStore } from '@ruledwdl/core';

// 1. Initialize a WDL Store
const store = createMemoryStore({
  layouts: {
    base: {
      name: 'base',
      COMPONENTS: [{ layers: 'div.shell', attr: { '.shell': { text: '{{content}}' } } }],
      DATA: { __design_tokens: ':root { --color-primary: #0284c7; }' }
    }
  }
});

// 2. Define a WDL Page
const page = {
  title: 'Home Page',
  layout: 'base',
  COMPONENTS: [
    { layers: 'h1.title', attr: { '.title': { text: 'Welcome ${name}' } } }
  ],
  DATA: { name: 'World' }
};

// 3. Compose to HTML
const { html, dynamic } = await composePage(store, 'demo-tenant', page);
console.log(html);
```

---

## Data Stores

WDL separates storage completely from rendering logic:

- **`createMemoryStore(data)`**: In-memory, Workers-safe store ideal for testing, serverless functions, or client-side rendering.
- **`createFileStore(dir)`** *(Node.js only)*: Import via `import { createFileStore } from '@ruledwdl/core/file-store'`. Loads disk layouts (`layouts/<name>.json`), components (`components/<id>.json`), and pages (`pages/<slug>.json`).

---

## Direct Browser / CDN Usage (No Build Step)

Include the single standalone bundle file directly in your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/@ruledwdl/core/dist/ruledwdl.min.js"></script>
<script>
  const { composePage, createMemoryStore } = WDL;
  // Use WDL directly in the browser via window.WDL
</script>
```

---

## CLI Usage

```bash
# Render a page to stdout
npx ruledwdl render <project-dir> <slug>

# Run live preview server
npx ruledwdl serve [project-dir] [port]
```

---

## Running Tests

```bash
npm test
```

---

## Ecosystem & Extensions

- **Core Engine (`@ruledwdl/core`)**: Pure runtime engine (WDL Layers parsing, element building, layout composition, script collection).
- **WDL Extensions (`wdl/extensions`)**: Optional opt-in modules for forms, email rendering, system components, content schema validation, and dynamic queries.
- **WDL Libraries (`wdl/libraries`)**: Host integration packages, including WordPress integration (`wdl-wp`) and Visual Editor (`wdl-editor`).

---

## License & Specifications

- **Code Implementation**: Licensed under [GNU Affero General Public License v3.0 (AGPL-3.0-or-later)](LICENSE).
- **Language Specifications & Docs**: Licensed under [GNU General Public License v3.0 (GPL-3.0)](docs/ruledwdl-reference.md).
