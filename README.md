# Web Definition Language — Core Engine (`@ruledwdl/core`)

> **WDL (Web Definition Language)** is a host-agnostic, declarative language runtime and component layout engine. It renders WDL definitions (`REGISTRY` / `COMPONENTS` / `DATA`, layouts, and components) directly to optimized HTML using a pluggable store.

[![npm version](https://img.shields.io/npm/v/@ruledwdl/core.svg)](https://www.npmjs.com/package/@ruledwdl/core)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Spec License: GPL v3](https://img.shields.io/badge/Spec_License-GPL_v3-green.svg)](docs/ruledwdl-reference.md)

---

## Features & Recent Updates (v0.3.1)

- **Host-Agnostic Engine**: Zero framework overhead — runs natively in Node.js, Cloudflare Workers, Edge runtimes, or modern browsers with **0 build tools**.
- **Registry Schema V2.1**: Native browser **Scoped CSS Rules (`@scope`)** support via flat `rules: [{ selector, media?, css }]` arrays compiled directly into `<style data-wdl="components">`.
- **Variant Attribute Generation**: Automatic `data-variant="..."` attribute emission and `:scope[data-variant="..."]` CSS selector mapping.
- **Layers Component Expressions**: Ultra-lean component syntax using WDL Layers expressions (`tag.semantic_id`, `>`, `+`, `<` de-indent/subset, `<*N` repeaters, `<@N` depth reference, `*` data loops) backed by `WDLDomTree`.
- **Design Token Cascade**: Layered design and brand tokens integrated directly into WDL JSON and compiled into `<style data-wdl="theme-tokens">`, `design-tokens`, and `brand-tokens`.
- **100% Zero-Dependency Core**: Zero external markdown runtime requirement; includes pluggable `transformData` and `transformText` hooks for external markdown engines (`marked`, `markdown-it`, `remark`).

---

## Specifications & Documentation

- **[`specifications/registry.md`](file:///home/pradeep/cloudflare/workers/wdl/wdl-core/specifications/registry.md)** — `REGISTRY` Specification (`v2.1`)
- **[`docs/registry-revamp/RegistrySchemaV2.1.md`](file:///home/pradeep/cloudflare/workers/wdl/wdl-core/docs/registry-revamp/RegistrySchemaV2.1.md)** — Schema V2.1 Scoped CSS Rules (`@scope`) Reference
- **[`specifications/component/v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl/wdl-core/specifications/component/v2.0.md)** — `COMPONENTS` Specification (`v2.0`)
- **[`specifications/data/v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl/wdl-core/specifications/data/v2.0.md)** — `DATA` Specification (`v2.0`)
- **[`docs/ruledwdl-reference.md`](file:///home/pradeep/cloudflare/workers/wdl/wdl-core/docs/ruledwdl-reference.md)** — RuledWDL Complete Engine Reference

---

## Installation

```bash
npm install @ruledwdl/core
```

---

## Ecosystem Packages

The RuledWDL monorepo maintains three core packages under `packages/`:

| Package | Version | Description |
|---|---|---|
| **[`@ruledwdl/core`](https://www.npmjs.com/package/@ruledwdl/core)** | `0.3.1` | Core layout composition engine, layers parser, store interfaces, and registry compiler. |
| **[`@ruledwdl/csr`](https://www.npmjs.com/package/@ruledwdl/csr)** | `0.3.1` | Ultra-lightweight client-side renderer & DOM hydrator with auto-injection of `<style>` tags in `<head>`. |
| **[`@ruledwdl/state`](https://www.npmjs.com/package/@ruledwdl/state)** | `0.1.1` | Headless in-memory component state manager for `layers`, `attr`, `data`, `variant`, and Schema V2.1 `registry` rules. |

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

// 2. Define a WDL Page with Schema V2.1 Scoped CSS Rules
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
    { layers: 'div.card > h1.title', attr: { '.title': { text: 'Welcome ${name}' } } }
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

- **Code Implementation**: Licensed under [GNU Affero General Public License v3.0 (AGPL-3.0-or-later)](LICENSE).
- **Language Specifications & Docs**: Licensed under [GNU General Public License v3.0 (GPL-3.0)](docs/ruledwdl-reference.md).
