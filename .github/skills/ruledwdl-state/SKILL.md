---
name: ruledwdl-state
description: Skill for AI agents to manage WDL component state, DOM tree mutations, registry rules, variants, and event subscriptions using @ruledwdl/state. Trigger whenever performing state management, live component edits, layer operations, or component batch loading.
license: AGPL-3.0-or-later
metadata:
  website: ruledwdl.dev
  author: Pradeep Dabane
---

# RuledWDL State Management (`@ruledwdl/state`) Guide

`@ruledwdl/state` is the state, mutation operations, and event management package for RuledWDL components. It provides reactive component state wrappers (`ComponentState`) and container management (`ComponentManager`) for live component editing, dynamic tree manipulation, and page state composition.

---

## 1. Installation & Import

### NPM Package
```bash
npm install @ruledwdl/state
```

```typescript
import { ComponentManager, ComponentState } from "@ruledwdl/state";
import type { ComponentSnapshot, ComponentInput, ChangeEvent } from "@ruledwdl/state";
```

### Browser CDN Imports (ESM)
```html
<!-- jsDelivr CDN -->
<script type="module">
  import { ComponentManager, ComponentState } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/state/dist/index.js';
</script>

<!-- unpkg CDN -->
<script type="module">
  import { ComponentManager, ComponentState } from 'https://unpkg.com/@ruledwdl/state/dist/index.js';
</script>
```

---

## 2. `ComponentManager` API

`ComponentManager` tracks and manages multiple `ComponentState` instances.

### Creating & Managing Individual Components
```typescript
const mgr = new ComponentManager();

// Create a component state instance with DATA and DATA_SCHEMA
const heroState = mgr.create('hero', {
  layers: 'section.hero > div.container > h1.title + p.subtitle',
  attr: { '.title': { text: '${title}' }, '.subtitle': { text: '${subtitle}' } },
  data: { title: 'Welcome to RuledWDL', subtitle: 'Stateful UI components' },
  data_schema: {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "subtitle": { "type": "string" }
    },
    "required": ["title"]
  }
});

// Check & retrieve
mgr.has('hero');                           // true
const snapshot = mgr.get('hero');           // Read-only ComponentSnapshot
const liveState = mgr.getInstance('hero');  // Mutable ComponentState instance
mgr.list();                                // ['hero']
mgr.remove('hero');                        // true
```

### Bulk Operations & Page State Loading
```typescript
// 1. Bulk create multiple components
mgr.bulkCreate([
  { component: 'header', layers: 'header.site_header' },
  { component: 'footer', layers: 'footer.site_footer' }
]);

// 2. Load an entire WDL page object into state (with optional reset)
mgr.loadPage(pageData, { reset: true });

// 3. Clear all managed components
mgr.clear();
```

---

## 3. `ComponentState` Operations

Each `ComponentState` instance manages tree structure, attributes, data bindings, variants, and registry rules.

### A. Layers Operations (`.layers`)
```typescript
const hero = mgr.getInstance('hero')!;

// Get layers as string/array or inspect AST tree
hero.layers.list(); // Current layers string/array
hero.layers.tree(); // LayerNode[] AST

// Set entire layers definition
hero.layers.set('section.hero > h1.title');

// Append child layer inside parent
hero.layers.append('container', 'button.cta');

// Insert sibling before/after target semantic ID
hero.layers.before('title', 'span.badge');
hero.layers.after('title', 'p.subtitle');

// Wrap target semantic ID inside wrapper layer
hero.layers.wrap('title', 'div.title-wrapper');

// Update tag or semantic ID
hero.layers.update('title', { tag: 'h2', semanticId: 'main_title' });

// Remove layer node
hero.layers.remove('subtitle');
```

### B. Attribute Operations (`.attr`)
```typescript
// Get attributes for semantic ID
hero.attr.get('title'); // { text: '${title}' }

// Set or update attributes
hero.attr.set('title', { text: 'New Title', class: 'text-2xl font-bold' });
hero.attr.update('title', { 'data-active': 'true' });

// Remove attribute key or entire entry
hero.attr.remove('title', 'data-active'); // Removes single key
hero.attr.remove('title');               // Removes entire selector entry
```

### C. Data Binding Operations (`.data`)
```typescript
// Get nested path or full data object
hero.data.get();             // Full DATA object
hero.data.get('user.name');  // Nested property

// Set or update data paths
hero.data.set('user.name', 'Pradeep');
hero.data.update('user', { role: 'admin' });

// Remove data path
hero.data.remove('user.role');
```

### D. Variant Operations (`.variant`)
```typescript
// Set data-variant attribute on component root or target element
hero.variant.set('elevated');            // Sets data-variant="elevated" on root
hero.variant.set('outlined', '.card');   // Sets data-variant="outlined" on .card

// Get variant name
hero.variant.get();        // 'elevated'
hero.variant.get('.card'); // 'outlined'
```

### E. Registry & Scoped CSS Rules (`.registry`)
```typescript
// Add V2.1 Scoped CSS rule
hero.registry.addRule({
  selector: '&:hover',
  css: { background: 'var(--color-primary-hover)' }
});

// Remove rule by selector
hero.registry.removeRule('&:hover');

// Update registry object
hero.registry.update({ class: 'p-6 rounded-lg' });
```

---

## 4. Events & Reactive Change Subscriptions

Both `ComponentManager` and `ComponentState` support event listening:

```typescript
// Subscribe to component change events
hero.on('layers:change', (event: ChangeEvent) => {
  console.log(`Action: ${event.action}, Target: ${event.targetId}`);
});

hero.on('attr:change', (event: ChangeEvent) => {
  console.log(`Attr updated on: ${event.targetId}`);
});

hero.on('data:change', (event: ChangeEvent) => {
  console.log(`Data modified at path: ${event.targetId}`);
});

// Unsubscribe
const unsub = hero.on('variant:change', (event) => { ... });
unsub(); // or hero.off('variant:change', handler)

// Manager level change events
mgr.on('change', (event: ChangeEvent) => {
  console.log(`Component ${event.componentId} action ${event.action}`);
});
```

---

## 5. Exporting Snapshots with Schema

To render a `ComponentState` with `@ruledwdl/core` or `@ruledwdl/csr`:

```typescript
const snapshot = hero.getSnapshot();

// Snapshot is a complete WDL Component payload:
// {
//   id: 'hero',
//   layers: 'section.hero > h1.title',
//   attr: { '.title': { text: 'Welcome' } },
//   data: { title: 'Welcome' },
//   data_schema: {
//     "$schema": "http://json-schema.org/draft-07/schema#",
//     "type": "object",
//     "properties": { "title": { "type": "string" } },
//     "required": ["title"]
//   }
// }
```
