---
name: events
description: Skill for AI agents to use @ruledwdl/events DOM event adapter for RuledWDL component event handling, listener binding, and modifier parsing. Trigger whenever binding DOM events, handling interactive component triggers, or wiring event handlers in RuledWDL.
license: GPL-3.0-or-later
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
import { createEventAdapter, fromState, registerEvent, registerModifier } from '@ruledwdl/events';
```

### Browser Script Import
```html
<!-- ESM -->
<script type="module">
  import { createEventAdapter, fromState } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/events/dist/wdl-events.min.js';
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
| `.enter` / `.escape` / etc. | Key filter for `keydown` / `keyup` events |

---

## 3. Core API

### `createEventAdapter(options)`
```javascript
const adapter = createEventAdapter({
  root,        // ParentNode to scan (default: document)
  handlers,    // { [handlerName]: (event, state, ctx) => void }
  getState,    // (el) => stateInstance (optional)
  state,       // fixed state instance (optional)
  attrPrefix,  // default ':'
  query,       // custom (selector, root) => Element[]
  debug        // boolean console logging
});

adapter.bind(attrMap); // Attach event listeners
adapter.unbind();      // Remove event listeners
adapter.rebind();      // Unbind + Bind
```

### `fromState({ root, state, handlers, debug })`
Shorthand utility for binding directly to a `@ruledwdl/state` (or compatible) component instance.

---

## 4. WDL Component Declarative Syntax

In WDL JSON / component definitions, add event bindings using `:event` keys in `attr`:

```json
{
  "layers": "button.cta + input.search + form.login",
  "attr": {
    ".cta": {
      "text": "Save",
      ":click": "saveItem",
      ":click.once": "trackClick"
    },
    ".search": {
      "type": "text",
      ":input": "updateQuery",
      ":keydown.enter": "runSearch"
    },
    ".login": {
      ":submit.prevent": "handleSubmit"
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
// Register a custom event name
registerEvent('swipedleft');

// Register a custom modifier function (return false to cancel handler execution)
registerModifier('outside', (event, el) => {
  return !el.contains(event.target);
});
```
