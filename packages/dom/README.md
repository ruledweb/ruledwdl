# `@ruledwdl/dom`

> Native DOM runtime for `@ruledwdl/state` with surgical element updates driven by state events.

`@ruledwdl/dom` provides fine-grained, surgical DOM updates for components managed by `@ruledwdl/state`. Whenever layer structures, attributes, variants, registry rules, or data change in state, `@ruledwdl/dom` updates the live DOM using native browser APIs (`createElement`, `insertBefore`, `remove`, `setAttribute`) without full re-renders or `innerHTML` wipes.

[![npm version](https://img.shields.io/npm/v/@ruledwdl/dom.svg)](https://www.npmjs.com/package/@ruledwdl/dom)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

---

## Features

- **Surgical DOM Updates**: Real-time element insertions, deletions, re-ordering, wrapping, and tag updates driven by `@ruledwdl/state` change events.
- **Zero `innerHTML` on Mutations**: Preserves existing DOM state, focus, transitions, and event listeners during updates.
- **Registry Scoped CSS Injection**: Automatically generates and updates `<style data-wdl-dom="...">` tags for Schema V2.1 Scoped CSS rules.
- **Fast Live Map**: Maintains an internal `Map<semanticId, HTMLElement>` for O(1) element lookups and precision patching.
- **Zero External Dependencies**: Pure native ESM package; works directly in modern browsers and client-side web apps.

---

## Installation

### NPM Package
```bash
npm install @ruledwdl/dom @ruledwdl/state
```

```javascript
import { ComponentManager } from '@ruledwdl/state';
import { createWdlDom, WdlDom } from '@ruledwdl/dom';
```

---

## CDN / Direct Browser Usage (No Build Step)

### ESM Import via jsDelivr
```html
<script type="module">
  import { ComponentManager } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/state/dist/index.js';
  import { createWdlDom } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/dom/dist/wdl-dom.min.js';

  const mgr = new ComponentManager();
  const hero = mgr.create('hero', {
    layers: 'section.hero > h1.title + p.subtitle',
    attr: {
      '.title': { text: 'Hello World' },
      '.subtitle': { text: 'Reactive WDL Component' }
    }
  });

  const dom = createWdlDom({
    container: document.getElementById('app'),
    component: hero
  });
</script>
```

### ESM Import via unpkg
```html
<script type="module">
  import { ComponentManager } from 'https://unpkg.com/@ruledwdl/state/dist/index.js';
  import { createWdlDom } from 'https://unpkg.com/@ruledwdl/dom/dist/wdl-dom.min.js';
</script>
```

---

## Quick Start Example

```javascript
import { ComponentManager } from '@ruledwdl/state';
import { createWdlDom } from '@ruledwdl/dom';

// 1. Initialize component state
const manager = new ComponentManager();
const hero = manager.create('hero', {
  layers: 'section.hero > h1.title',
  attr: {
    '.title': { text: 'Hello RuledWDL' }
  }
});

// 2. Mount DOM runtime
const dom = createWdlDom({
  container: document.querySelector('#app'),
  component: hero
});

// 3. Surgical Mutations:
// Prepend child
hero.layers.prepend('hero', 'span.badge');
hero.attr.set('badge', { text: 'New Release' });

// Sibling insertion
hero.layers.after('title', 'p.subtitle');
hero.attr.set('subtitle', { text: 'Surgically injected subtitle' });

// Child append
hero.layers.append('hero', 'button.cta');
hero.attr.set('cta', { text: 'Click Here', class: 'btn-primary' });

// Wrap element
hero.layers.wrap('title', 'div.title-wrapper');

// Unwrap element (hoist title back)
hero.layers.unwrap('title-wrapper');

// Move element
hero.layers.move('cta', 'title', 'before');

// Variant change (adds data-variant="elevated")
hero.variant.set('elevated');

// Registry Scoped CSS update (updates <style data-wdl-dom="hero">)
hero.registry.addRule({
  selector: '& .cta',
  css: { background: '#0284c7', color: '#ffffff' }
});

// 4. Teardown
// dom.destroy();
```

---

## Core API

### `createWdlDom(options)`
- `container` (`HTMLElement | string`): Container element or selector to mount into.
- `component` (`ComponentState`): Live `ComponentState` instance from `@ruledwdl/state`.
- `onDataBind` (`(container, path, value) => void`): Optional callback for data binding.
- `styleTarget` (`HTMLElement | Document`): Where to inject component style tags (default: `document.head`).
- `debug` (`boolean`): Enable console logging.

### Instance Methods
- `dom.remount()`: Rebuild the entire DOM from state snapshot.
- `dom.getLiveMap()`: Returns a snapshot copy of `Map<semanticId, HTMLElement>` (first element per semantic ID).
- `dom.getLiveNodes(semanticId)`: Returns an array of all live elements matching `semanticId` (e.g. repeated loop rows).
- `dom.getNode(semanticId, index = 0)`: Returns the live element at the specified index for `semanticId`.
- `dom.destroy()`: Removes event listeners, empties container, and cleans up style tags.

### Repeated Loops & Surgical Data Reconciliation
`@ruledwdl/dom` natively reconciles repeated WDL loop layers (e.g. `li.feature*features`) without remounting or wiping `innerHTML`:
- Materializes all items on initial mount with `data-wdl-index="0"`, `data-wdl-index="1"`, etc.
- Resolves per-item attribute templates (e.g. `${text}`, `${_index}`).
- On `component.data.set('features', nextItems)`, surgically updates retained rows, appends added rows, and removes deleted rows.

---

## License

Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0-or-later)](./LICENSE).
