---
name: ruledwdl-events
description: Skill for AI agents to use @ruledwdl/events DOM event adapter for RuledWDL component event handling, listener binding, and modifier parsing. Trigger whenever binding DOM events, handling interactive component triggers, or wiring event handlers in RuledWDL.
license: AGPL-3.0-or-later
metadata:
  website: ruledwdl.dev
  author: Pradeep Dabane
---

# RuledWDL Event Adapter (`@ruledwdl/events`) Guide

`@ruledwdl/events` is the pluggable, neutral DOM event adapter for RuledWDL components. It reads declarative `:event.modifier` directives from component `attr` objects, wires native DOM listeners, and executes named handler functions with `(event, state, ctx)`.

---

## 1. Installation & Import

### NPM Package
```bash
npm install @ruledwdl/events
```

```javascript
import {
  createEventAdapter,
  fromState,
  registerEvent,
  registerModifier,
  listEvents,
  listModifiers
} from '@ruledwdl/events';
```

### Browser CDN Imports (ESM)
```html
<!-- jsDelivr CDN -->
<script type="module">
  import { createEventAdapter, fromState, registerEvent, registerModifier } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/events/dist/wdl-events.min.js';
</script>

<!-- unpkg CDN -->
<script type="module">
  import { createEventAdapter, fromState, registerEvent, registerModifier } from 'https://unpkg.com/@ruledwdl/events/dist/wdl-events.min.js';
</script>
```

---

## 2. Supported Events & Modifiers

### Core Events
`click`, `dblclick`, `mousedown`, `mouseup`, `mouseenter`, `mouseleave`, `mouseover`, `mouseout`, `mousemove`, `contextmenu`, `wheel`, `pointerdown`, `pointerup`, `pointermove`, `pointerenter`, `pointerleave`, `pointercancel`, `keydown`, `keyup`, `input`, `change`, `focus`, `blur`, `focusin`, `focusout`, `submit`, `reset`, `invalid`, `select`, `touchstart`, `touchend`, `touchmove`, `touchcancel`, `scroll`.

### Built-in Modifiers

| Modifier | Effect |
| :--- | :--- |
| `.prevent` | Calls `event.preventDefault()` |
| `.stop` | Calls `event.stopPropagation()` |
| `.once` | Passes `{ once: true }` to `addEventListener` |
| `.passive` | Passes `{ passive: true }` to `addEventListener` |
| `.capture` | Passes `{ capture: true }` to `addEventListener` |
| `.self` | Only fires if `event.target === element` |
| `.window` | Attaches listener to `window` |
| `.document` | Attaches listener to `document` |
| `.enter` / `.escape` / `.tab` / `.space` / `.up` / `.down` / `.left` / `.right` | Key filter for keyboard events |

---

## 3. Core API

### `createEventAdapter(options)`
```javascript
const adapter = createEventAdapter({
  root: document.getElementById('app'), // ParentNode to scan (default: document)
  handlers: {
    saveItem(event, state, ctx) {
      console.log('Saved', state?.data?.get('itemName'));
    },
    updateQuery(event, state, ctx) {
      state?.data?.set('query', event.target.value);
    }
  },
  getState: (el) => componentStateInstance, // Function returning component state
  state: fixedStateInstance,                // Fixed state instance (optional)
  attrPrefix: ':',                          // Default ':'
  debug: false                              // Enable console logging
});

// Bind event listeners using component attributes map
adapter.bind({
  '.cta': { ':click': 'saveItem', ':click.once': 'trackClick' },
  '.search': { ':input': 'updateQuery', ':keydown.enter': 'runSearch' }
});

// Adapter instance properties & methods
console.log(adapter.size); // Number of active event bindings
adapter.rebind();          // Unbind + re-scan and bind
adapter.unbind();          // Clean up all DOM event listeners
```

### `fromState({ root, state, handlers, debug })`
Shorthand utility for binding directly to a `@ruledwdl/state` (or compatible) component instance.

---

## 4. Declarative Component Definition with DATA_SCHEMA

In WDL JSON / component definitions, declare event directives alongside `DATA` and `DATA_SCHEMA`:

```json
{
  "id": "search-form",
  "definition": {
    "REGISTRY": {
      "$version": "2.1",
      "search_box": { "rules": [{ "selector": ":scope", "css": { "display": "flex" } }] }
    },
    "COMPONENTS": [
      {
        "layers": "form.search_box > input.search_input + button.search_btn",
        "attr": {
          ".search_box": {
            ":submit.prevent": "handleSubmit"
          },
          ".search_input": {
            "type": "text",
            "placeholder": "${placeholder}",
            "value": "${query}",
            ":input": "updateQuery",
            ":keydown.enter": "handleSubmit"
          },
          ".search_btn": {
            "type": "submit",
            "text": "Search",
            ":click": "trackSearchClick"
          }
        }
      }
    ],
    "DATA": {
      "query": "",
      "placeholder": "Search articles..."
    },
    "DATA_SCHEMA": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "title": "SearchFormData",
      "properties": {
        "query": { "type": "string", "description": "Current search query string" },
        "placeholder": { "type": "string", "description": "Input placeholder text" }
      },
      "required": ["placeholder"]
    }
  }
}
```

### Handler Signature
```javascript
function handler(event, state, ctx) {
  // event : Native DOM Event
  // state : Component state (from getState or fixed state)
  // ctx   : { element, selector, event, modifiers }
}
```

---

## 5. Extensions (Custom Events & Modifiers)

```javascript
import { registerEvent, registerModifier, listEvents, listModifiers } from '@ruledwdl/events';

// Register a custom event name
registerEvent('swipedleft');

// Register a custom modifier function (return false to cancel handler execution)
registerModifier('outside', (event, el) => {
  return !el.contains(event.target);
});

// Inspect registry
console.log(listEvents());     // Includes 'swipedleft'
console.log(listModifiers());  // Includes 'outside'
```
