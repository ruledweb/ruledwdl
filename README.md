# Web Definition Language — Core Engine (`@ruledwdl/core`)

> **WDL (Web Definition Language)** is a host-agnostic, declarative language runtime and component layout engine. It renders WDL definitions (`REGISTRY` / `COMPONENTS` / `DATA`, layouts, and components) directly to optimized HTML using a pluggable store.

[![npm version](https://img.shields.io/npm/v/@ruledwdl/core.svg)](https://www.npmjs.com/package/@ruledwdl/core)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Spec License: GPL v3](https://img.shields.io/badge/Spec_License-GPL_v3-green.svg)](docs/ruledwdl-reference.md)

---

## Features & Recent Updates (v0.3.3)

- **Host-Agnostic Engine**: Zero framework overhead — runs natively in Node.js, Cloudflare Workers, Edge runtimes, or modern browsers with **0 build tools**.
- **Registry Schema V2.1**: Native browser **Scoped CSS Rules (`@scope`)** support via flat `rules: [{ selector, media?, css }]` arrays compiled directly into `<style data-wdl="components">`.
- **Variant Attribute Generation**: Automatic `data-variant="..."` attribute emission and `:scope[data-variant="..."]` CSS selector mapping.
- **Layers Component Expressions**: Ultra-lean component syntax using WDL Layers expressions (`tag.semantic_id`, `>`, `+`, `<` de-indent/subset, `<*N` repeaters, `<@N` depth reference, `*` data loops) backed by `WDLDomTree`.
- **Pluggable Event Adapter (`@ruledwdl/events`)**: Declarative `:event.modifier` DOM event routing (`:click`, `:input`, `:submit.prevent`, `:keydown.enter`) connecting rendered component elements to JS handlers.
- **Design Token Cascade**: Layered design and brand tokens integrated directly into WDL JSON and compiled into `<style data-wdl="theme-tokens">`, `design-tokens`, and `brand-tokens`.
- **100% Zero-Dependency Core**: Zero external markdown runtime requirement; includes pluggable `transformData` and `transformText` hooks for external markdown engines (`marked`, `markdown-it`, `remark`).

---

## Specifications & Documentation

- **[REGISTRY Specification (v2.1)](specifications/registry.md)** — Scoped CSS rules, token inheritance & syntax rules.
- **[Registry Schema V2.1 Reference](docs/registry-revamp/RegistrySchemaV2.1.md)** — Complete Scoped CSS `@scope` rules design guide.
- **[COMPONENTS Specification (v2.0)](specifications/component/v2.0.md)** — Component definitions, overrides, and layers grammar.
- **[DATA Specification (v2.0)](specifications/data/v2.0.md)** — Page state, array loop binding, SEO, and token declarations.
- **[RuledWDL Complete Engine Reference](docs/ruledwdl-reference.md)** — Architecture, stores, and layout composition guide.

---

## Installation

```bash
npm install @ruledwdl/core
```

---

## Ecosystem Packages

The RuledWDL monorepo maintains six core packages:

| Package | Workspace Folder | NPM Package | Version | License | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`@ruledwdl/core`** | [Root (`./`)](./) | [`@ruledwdl/core`](https://www.npmjs.com/package/@ruledwdl/core) | `0.3.3` | `AGPL-3.0-or-later` | Core layout composition engine, layers parser, store interfaces, and registry compiler. |
| **`@ruledwdl/csr`** | [`packages/csr`](packages/csr) | [`@ruledwdl/csr`](https://www.npmjs.com/package/@ruledwdl/csr) | `0.3.3` | `AGPL-3.0-or-later` | Ultra-lightweight client-side renderer & DOM hydrator with auto-injection of `<style>` tags in `<head>`. |
| **`@ruledwdl/state`** | [`packages/state`](packages/state) | [`@ruledwdl/state`](https://www.npmjs.com/package/@ruledwdl/state) | `0.1.3` | `AGPL-3.0-or-later` | Headless component state manager for `layers`, `attr`, `data`, `variant`, and `registry` rules. |
| **`@ruledwdl/events`** | [`packages/events`](packages/events) | [`@ruledwdl/events`](https://www.npmjs.com/package/@ruledwdl/events) | `0.1.0` | `AGPL-3.0-or-later` | Pluggable DOM event adapter for declarative `:event.modifier` binding (`:click`, `:input`, `:keydown.enter`). |
| **`@ruledwdl/dom`** | [`packages/dom`](packages/dom) | [`@ruledwdl/dom`](https://www.npmjs.com/package/@ruledwdl/dom) | `0.1.1` | `AGPL-3.0-or-later` | Native DOM runtime for `@ruledwdl/state` with surgical element updates driven by state events. |
| **`@ruledwdl/nested`** | [`packages/nested`](packages/nested) | [`@ruledwdl/nested`](https://www.npmjs.com/package/@ruledwdl/nested) | `0.1.0` | `AGPL-3.0-or-later` | Nested component resolver and catalog store adapter for recursive `@component` layer macro expansion. |

---

## CDN & ESM Browser Links (Zero Build Step)

All RuledWDL packages are compiled to standalone bundles and distributed via global CDNs (jsDelivr and unpkg):

| Package | jsDelivr CDN (ESM / Bundle) | unpkg CDN |
| :--- | :--- | :--- |
| **`@ruledwdl/core`** (IIFE) | `https://cdn.jsdelivr.net/npm/@ruledwdl/core/dist/ruledwdl.min.js` | `https://unpkg.com/@ruledwdl/core/dist/ruledwdl.min.js` |
| **`@ruledwdl/core`** (ESM) | `https://cdn.jsdelivr.net/npm/@ruledwdl/core/dist/ruledwdl.esm.js` | `https://unpkg.com/@ruledwdl/core/dist/ruledwdl.esm.js` |
| **`@ruledwdl/csr`** (ESM) | `https://cdn.jsdelivr.net/npm/@ruledwdl/csr/dist/wdl-csr.min.js` | `https://unpkg.com/@ruledwdl/csr/dist/wdl-csr.min.js` |
| **`@ruledwdl/state`** (ESM) | `https://cdn.jsdelivr.net/npm/@ruledwdl/state/dist/index.js` | `https://unpkg.com/@ruledwdl/state/dist/index.js` |
| **`@ruledwdl/events`** (ESM) | `https://cdn.jsdelivr.net/npm/@ruledwdl/events/dist/wdl-events.min.js` | `https://unpkg.com/@ruledwdl/events/dist/wdl-events.min.js` |
| **`@ruledwdl/dom`** (ESM) | `https://cdn.jsdelivr.net/npm/@ruledwdl/dom/dist/wdl-dom.min.js` | `https://unpkg.com/@ruledwdl/dom/dist/wdl-dom.min.js` |
| **`@ruledwdl/nested`** (ESM) | `https://cdn.jsdelivr.net/npm/@ruledwdl/nested/dist/wdl-nested.min.js` | `https://unpkg.com/@ruledwdl/nested/dist/wdl-nested.min.js` |

### Browser ESM Import Example
```html
<script type="module">
  import { ComponentManager } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/state/dist/index.js';
  import { createWdlDom } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/dom/dist/wdl-dom.min.js';

  const mgr = new ComponentManager();
  const hero = mgr.create('hero', {
    layers: 'section.hero > h1.title + p.subtitle',
    attr: {
      '.title': { text: 'Hello from CDN' },
      '.subtitle': { text: 'Reactive WDL Component' }
    }
  });

  const dom = createWdlDom({
    container: document.getElementById('app'),
    component: hero
  });
</script>
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

// 2. Define a WDL Page with Schema V2.1 Scoped CSS Rules & Event Directives
const page = {
  title: 'Home Page',
  layout: 'base',
  REGISTRY: {
    $version: '2.1',
    card: {
      rules: [
        { selector: ':scope', css: { display: 'flex', padding: '1.5rem' } },
        { selector: '& .title', css: { color: 'var(--color-primary)' } }
      ]
    }
  },
  COMPONENTS: [
    {
      layers: 'div.card > h1.title + button.cta',
      attr: {
        '.title': { text: 'Welcome ${name}' },
        '.cta': { text: 'Click Me', ':click': 'handleClick' }
      }
    }
  ],
  DATA: { name: 'World' }
};

// 3. Compose to HTML
const { html, dynamic } = await composePage(store, 'demo-tenant', page);
console.log(html);
```

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

## License & Specifications

- **All Monorepo Packages (`@ruledwdl/core`, `@ruledwdl/csr`, `@ruledwdl/state`, `@ruledwdl/events`, `@ruledwdl/dom`)**: Licensed under [GNU Affero General Public License v3.0 (AGPL-3.0-or-later)](LICENSE).
- **Language Specifications & Docs**: Licensed under [GNU General Public License v3.0 (GPL-3.0)](docs/ruledwdl-reference.md).
