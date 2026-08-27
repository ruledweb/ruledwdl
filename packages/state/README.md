# `@ruledwdl/state`

State management, DOM tree mutation, and event bus manager for RuledWDL components.

[![npm version](https://img.shields.io/npm/v/@ruledwdl/state.svg)](https://www.npmjs.com/package/@ruledwdl/state)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)

---

## Features

- **Component Management**: Multi-component registry lifecycle (`list`, `get`, `create`, `remove`).
- **Layers Positioning & Tree Mutations**: AST layer operations (`append`, `prepend`, `before`, `after`, `wrap`, `unwrap`, `move`, `remove`, `update`, `set`, `tree`, `list`) with full support for WDL operator grammars (`>`, `+`, `<`, `<*N`, `<@N`).
- **Attribute & Variant Operations**: Read, set, update, and remove element attributes, plus a first-class `variant` API for managing `data-variant` attributes.
- **Data Binding Operations**: Path-based state getter/setters (`hero.data.get('user.name')`, `hero.data.set(...)`).
- **REGISTRY Schema V2.1 Management**: Add, update, and remove Schema V2.1 Scoped CSS rules (`hero.registry.addRule(...)`) and variables.
- **Pub/Sub Event Bus**: Typed event notifications for `layers:change`, `attr:change`, `data:change`, `variant:change`, and `registry:change`.
- **Headless & Platform-Agnostic**: Pure JavaScript/TypeScript in-memory state engine — runs natively in Node.js, Web Workers, Cloudflare Workers, or Browsers.

---

## Installation

### NPM Package
```bash
npm install @ruledwdl/state
```

---

## CDN / Browser Usage (Zero Build Step)

### jsDelivr CDN
```html
<script type="module">
  import { ComponentManager, ComponentState } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/state/dist/index.js';
</script>
```

### unpkg CDN
```html
<script type="module">
  import { ComponentManager, ComponentState } from 'https://unpkg.com/@ruledwdl/state/dist/index.js';
</script>
```

---

## Usage Example

```typescript
import { ComponentManager } from '@ruledwdl/state';

const manager = new ComponentManager();

// 1. Create a Component State instance
const hero = manager.create('hero', {
  layers: 'section.hero > div.container > h1.title + p.subtitle',
  attr: { '.title': { text: 'Hello World' } },
  data: { user: { name: 'Pradeep' } },
  registry: {
    $version: '2.1',
    vars: { bg: '#ffffff' }
  }
});

// 2. Layer Positioning & Tree Mutations
hero.layers.prepend('container', 'span.badge');    // Prepend <span class="badge"> as first child
hero.layers.after('subtitle', 'button.cta');      // Inserts sibling <button class="cta">
hero.layers.wrap('title', 'div.title-wrapper');   // Wraps title in <div class="title-wrapper">
hero.layers.unwrap('title-wrapper');              // Unwraps container and hoists title back
hero.layers.move('cta', 'title', 'before');       // Moves cta before title
hero.layers.append('container', 'p.footer_note'); // Appends <p class="footer_note"> inside container

// 3. Variant & Attribute Management
hero.variant.set('elevated');                   // Sets data-variant="elevated" on root element
hero.attr.set('.cta', { text: 'Get Started' });  // Updates element attributes

// 4. Data State Operations
hero.data.set('user.role', 'Admin');

// 5. REGISTRY Schema V2.1 Rules Management
hero.registry.addRule({
  selector: '&:hover .cta',
  css: { background: 'var(--color-primary-hover)' }
});

// 6. Listen to State Events
hero.on('variant:change', (event) => {
  console.log('Variant updated:', event);
});

// 7. Get Serialized Layers String
console.log(hero.layers.list());
```

---

## License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-or-later).