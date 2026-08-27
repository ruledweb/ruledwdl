# Web Definition Language — CSR Engine (`@ruledwdl/csr`)

> An ultra-lightweight client-side rendering (CSR) extension for WDL components.

`@ruledwdl/csr` is an exported, minimal subset of the main [@ruledwdl/core](https://github.com/ruledweb/ruledwdl) engine. It is specifically built and packaged separately for **client-side component rendering** and dynamic DOM hydration in the browser.

By stripping out full-page composition, design token cascading, script bucket management, and Markdown parsing, `@ruledwdl/csr` provides a pure, synchronous rendering loop that maps JSON directly to HTML fragments with automatic `<head>` Scoped CSS injection (Schema v2.1).

---

## Features

- **Tiny Footprint:** Zero external dependencies (no markdown parsers, no DOM sanitizers). Minified bundle is under **13kb**.
- **Pure Rendering:** Takes `REGISTRY`, `COMPONENTS`, and `DATA` JSON definitions and returns clean HTML strings.
- **Automatic Head CSS Injection:** Compiles Schema V2.1 Scoped CSS `rules` into native `@scope (tag.semantic_id)` blocks and auto-injects `<style data-wdl="theme-tokens">` and `<style data-wdl="components">` into `document.head`.
- **WDL Layers Syntax v0.3.x:** Full support for Emmet-like component expressions including `<` parent step-back, `<*N` multi-level repeater, and `<@N` absolute depth reference.
- **Component Identifier Attributes:** Automatically emits `wdl-comp="{semantic-id}"` attributes on generated DOM elements for precise CSS/JS targeting.
- **Auto-Hydration:** Includes a built-in `hydrate()` function that scans the DOM for elements marked with the `wdl-csr` attribute and automatically renders the corresponding JSON payload into them.

---

## Installation

### NPM ESM Package
```bash
npm install @ruledwdl/csr
```

---

## CDN / Browser Usage (Zero Build Step)

### jsDelivr CDN
```html
<script type="module">
  import { render, hydrate } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/csr/dist/wdl-csr.min.js';
</script>
```

### unpkg CDN
```html
<script type="module">
  import { render, hydrate } from 'https://unpkg.com/@ruledwdl/csr/dist/wdl-csr.min.js';
</script>
```

---

## Usage & Examples

A complete standalone example page is available in the [`examples/index.html`](./examples/index.html) file:

### 1. Direct Synchronous Rendering (ESM)
```javascript
import { render } from '@ruledwdl/csr';

const registry = {
  $version: "2.1",
  card: {
    rules: [
      { selector: ":scope", css: { display: "flex", padding: "16px" } },
      { selector: "& .title", css: { color: "var(--color-primary)" } }
    ]
  }
};

const components = [
  { layers: "div.card > h2.title", attr: { ".title": { text: "Client Component" } } }
];

// Returns compiled HTML string & injects @scope CSS into document.head
const html = render(registry, components, {});
document.getElementById('app').innerHTML = html;
```

### 2. Auto-Hydration (`wdl-csr`)
Place target elements with `wdl-csr="payload-id"` in your HTML markup, attach your payloads to `window.WDL_CSR`, and call `hydrate()`:

```html
<div wdl-csr="hero-widget"></div>

<script type="module">
  import { hydrate } from '@ruledwdl/csr';

  window.WDL_CSR = {
    "hero-widget": {
      REGISTRY: { /* ... */ },
      COMPONENTS: [ /* ... */ ],
      DATA: { /* ... */ }
    }
  };

  // Scans [wdl-csr] targets, renders components, and updates document.head
  hydrate();
</script>
```

---

## License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-or-later).
