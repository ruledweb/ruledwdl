---
name: ruledwdl-dom
description: Skill for AI agents to use @ruledwdl/dom native DOM runtime for @ruledwdl/state. Trigger whenever performing surgical DOM mutations, live element editing, state-event driven element building, or browser DOM synchronization without innerHTML rebuilds.
license: AGPL-3.0-or-later
metadata:
  website: ruledwdl.dev
  author: Pradeep Dabane
---

# RuledWDL DOM Runtime (`@ruledwdl/dom`) Guide

`@ruledwdl/dom` is the surgical, native DOM runtime for `@ruledwdl/state`. It listens to every fine-grained event emitted by `ComponentState` / `ComponentManager` (`layers:change`, `attr:change`, `data:change`, `variant:change`, `registry:change`) and applies precision DOM mutations using `createElement`, `insertBefore`, and `remove`.

> **Core Invariant**: WDL-JSON state is the single source of truth. **No `innerHTML` on state updates.**

---

## 1. Installation & Import

### NPM Package
```bash
npm install @ruledwdl/dom @ruledwdl/state
```

```javascript
import { ComponentManager } from '@ruledwdl/state';
import { createWdlDom, WdlDom } from '@ruledwdl/dom';
```

### Browser CDN / ESM Imports
```html
<!-- ESM Module via jsDelivr CDN -->
<script type="module">
  import { ComponentManager } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/state/dist/index.js';
  import { createWdlDom } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/dom/dist/wdl-dom.min.js';
</script>

<!-- ESM Module via unpkg CDN -->
<script type="module">
  import { ComponentManager } from 'https://unpkg.com/@ruledwdl/state/dist/index.js';
  import { createWdlDom } from 'https://unpkg.com/@ruledwdl/dom/dist/wdl-dom.min.js';
</script>
```

---

## 2. Quick Start

```javascript
import { ComponentManager } from '@ruledwdl/state';
import { createWdlDom } from '@ruledwdl/dom';

// 1. Create component state instance
const mgr = new ComponentManager();
const hero = mgr.create('hero', {
  layers: 'section.hero > h1.title + p.subtitle',
  attr: {
    '.title': { text: 'Hello' },
    '.subtitle': { text: 'World' }
  }
});

// 2. Mount DOM adapter
const dom = createWdlDom({
  container: document.getElementById('app'),
  component: hero,   // live ComponentState instance
  debug: false
});

// 3. Mutate state → DOM updates surgically in real-time
hero.attr.set('title', { text: 'Updated Title' });
hero.layers.append('hero', 'button.cta');
hero.variant.set('elevated');

// 4. Teardown / Cleanup
dom.destroy();
```

---

## 3. Core API

### `createWdlDom(options)` → `WdlDom`

| Option | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `container` | `HTMLElement \| string` | **Yes** | Mount target element or CSS selector query string |
| `component` | `ComponentState` | **Yes** | Live instance from `@ruledwdl/state` |
| `onDataBind` | `(container, path, value) => void` | No | Callback invoked on `data:change` events |
| `styleTarget` | `HTMLElement \| Document` | No | Target container where registry `<style>` is injected (default: `document.head`) |
| `debug` | `boolean` | No | Enables detailed operation console logging |

### Instance Methods

| Method | Description |
| :--- | :--- |
| `remount()` | Performs full rebuild of DOM tree from current state snapshot |
| `getLiveMap()` | Returns a copy of the active semantic ID mapping `Map<semanticId, HTMLElement>` |
| `destroy()` | Unsubscribes state listeners, empties container, and removes generated `<style>` tag |

---

## 4. State Event Handling (`@ruledwdl/state` Contract)

Every surgical DOM update is triggered by state events of shape:

```javascript
{
  type: 'layers:change',   // 'layers:change' | 'attr:change' | 'data:change' | 'variant:change' | 'registry:change'
  componentId: 'hero',
  action: 'append',        // Mutation action
  targetId: 'container',   // Semantic ID involved
  payload: 'button.cta',   // Expression / attrs / value / rule
  timestamp: 1710000000000
}
```

---

## 5. Surgical Layer Operations (`layers:change`)

### `set` — Replace Entire Layers Tree
```javascript
hero.layers.set('section.hero > h1.title');
// → Full clean remount of component DOM
```

### `append` — Add Child Under Parent Semantic ID
```javascript
hero.layers.append('hero', 'button.cta');
// → createElement('button'), class="cta", wdl-comp="cta"
// → parent.appendChild(el)
```

### `before` — Insert Sibling Before Target
```javascript
hero.layers.before('title', 'span.badge');
// → insertBefore(badgeEl, titleEl)
```

### `after` — Insert Sibling After Target
```javascript
hero.layers.after('title', 'p.subtitle');
// → insertBefore(subtitleEl, titleEl.nextSibling)
```

### `wrap` — Wrap Target Inside New Parent
```javascript
hero.layers.wrap('title', 'div.title-wrapper');
// → Creates wrapper, inserts before target, reparents target inside wrapper
```

### `remove` — Remove Node and Subtree
```javascript
hero.layers.remove('subtitle');
// → subtitleEl.remove(), liveMap removes 'subtitle' and descendant IDs
```

### `update` — Change Tag or Semantic ID
```javascript
hero.layers.update('title', { tag: 'h2', semanticId: 'main_title' });
// → Recreates element if tag changes, updates class and wdl-comp attribute
```

---

## 6. Attribute Operations (`attr:change`)

### `set` & `update`
```javascript
hero.attr.set('title', { text: 'New Title', class: 'text-2xl font-bold' });
hero.attr.update('title', { 'data-active': 'true' });
```

**Attribute Keys Handling:**
| Key | DOM Effect |
| :--- | :--- |
| `text` | `el.textContent = value` |
| `html` | `el.innerHTML = value` (use only when sanitized/intended) |
| `class` | `el.className = semanticId + ' ' + value` |
| `style` | `Object.assign(el.style, value)` for style objects |
| any other | `el.setAttribute(key, String(value))` |

### `remove`
```javascript
hero.attr.remove('title', 'data-active'); // Removes single attribute
hero.attr.remove('title');               // Resets text and reverts class to semanticId
```

---

## 7. Data Binding (`data:change`)

```javascript
hero.data.set('user.name', 'Pradeep');

// Custom binding via onDataBind:
createWdlDom({
  container: '#app',
  component: hero,
  onDataBind(root, path, value) {
    const el = root.querySelector(`[data-bind="${path}"]`);
    if (el) el.textContent = value ?? '';
  }
});
```

---

## 8. Variants (`variant:change`)

```javascript
hero.variant.set('elevated');        // rootEl.dataset.variant = 'elevated'
hero.variant.set('outlined', 'card'); // liveMap.get('card').dataset.variant = 'outlined'
```

---

## 9. Scoped CSS Registry (`registry:change`)

Injects/updates `<style data-wdl-dom="hero">` in target `<head>` or custom target:

```javascript
hero.registry.addRule({
  selector: '&:hover .cta',
  css: { background: '#0284c7' }
});
// → Injects [wdl-comp="hero"]:hover .cta { background: #0284c7; }
```

---

## 10. Architectural Principles

1. **State is Source of Truth**: Never directly mutate DOM expecting state to follow.
2. **Surgical Updates**: Only modified elements and subtrees are touched.
3. **No External VDOM**: Built 100% on native standard Web APIs.
4. **Ecosystem Interoperability**:
   - `@ruledwdl/state`: State store & event emitter.
   - `@ruledwdl/dom`: Real-time surgical DOM updater.
   - `@ruledwdl/csr`: Static/SSR HTML string generator.
   - `@ruledwdl/events`: Declarative event binding adapter.
