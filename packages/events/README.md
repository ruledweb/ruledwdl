# `@ruledwdl/events`

> Pluggable DOM event adapter for RuledWDL component event handling, listener binding, and modifier parsing.

`@ruledwdl/events` provides a lightweight, framework-agnostic binding layer that parses declarative `:event.modifier` keys from component `attr` definitions, wires native DOM listeners, and executes named handler functions.

---

## Features

- **Neutral Binding Layer**: Connects DOM events (`:click`, `:input`, `:keydown.enter`) directly to named handler functions `(event, state, ctx)`.
- **Built-in Modifiers**: `.prevent`, `.stop`, `.once`, `.passive`, `.capture`, `.self`, `.window`, `.document`, and key filters (`.enter`, `.escape`, `.tab`, `.space`, etc.).
- **Pluggable Registries**: Register custom event names (`registerEvent`) or custom modifiers (`registerModifier`).
- **Zero Dependencies**: Pure JavaScript ESM runtime library with browser script support (`window.WDLEvents`).

---

## Installation

### NPM Package
```bash
npm install @ruledwdl/events
```

---

## CDN / Browser Usage (Zero Build Step)

### jsDelivr CDN
```html
<script type="module">
  import { createEventAdapter, fromState, registerEvent, registerModifier } from 'https://cdn.jsdelivr.net/npm/@ruledwdl/events/dist/wdl-events.min.js';
</script>
```

### unpkg CDN
```html
<script type="module">
  import { createEventAdapter, fromState, registerEvent, registerModifier } from 'https://unpkg.com/@ruledwdl/events/dist/wdl-events.min.js';
</script>
```

---

## Usage

```javascript
import { createEventAdapter, fromState } from '@ruledwdl/events';

// 1. Define named event handlers
const handlers = {
  increment(event, state, ctx) {
    state.data.set('count', state.data.get('count') + 1);
  },
  updateQuery(event, state, ctx) {
    state.data.set('query', event.target.value);
  }
};

// 2. Create event adapter
const adapter = createEventAdapter({
  root: document.getElementById('app'),
  handlers,
  getState: (el) => componentState
});

// 3. Bind listeners after rendering
adapter.bind({
  '.cta': { ':click': 'increment' },
  '.search': { ':input': 'updateQuery' }
});

// Clean up listeners on unmount
adapter.unbind();
```

---

## License

Licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0-or-later)](./LICENSE).
