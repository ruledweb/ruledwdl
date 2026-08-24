/**
 * @ruledwdl/events – Pluggable DOM event adapter for RuledWDL
 *
 * Neutral binding layer: reads `:event.modifier` keys from component attr,
 * wires native listeners, and calls named handlers with (event, state, ctx).
 *
 * Does not own state. Does not decide source vs destination.
 * Just connects DOM events → handler functions.
 *
 * Usage:
 *   import { createEventAdapter, registerEvent, registerModifier } from './wdl-events.js';
 *
 *   const adapter = createEventAdapter({
 *     root: document.getElementById('app'),
 *     getState: (el) => manager.get(el.dataset.wdlComp), // or fixed component
 *     handlers: { increment, reset, updateName },
 *   });
 *   adapter.bind();           // scan & attach
 *   adapter.unbind();         // cleanup
 *   adapter.rebind();         // unbind + bind
 */

// ---------------------------------------------------------------------------
// Core event set (deterministic, widely supported)
// ---------------------------------------------------------------------------
const CORE_EVENTS = new Set([
  // Mouse / pointer
  'click', 'dblclick',
  'mousedown', 'mouseup',
  'mouseenter', 'mouseleave',
  'mouseover', 'mouseout',
  'mousemove',
  'contextmenu',
  'wheel',
  'pointerdown', 'pointerup', 'pointermove',
  'pointerenter', 'pointerleave', 'pointercancel',

  // Keyboard
  'keydown', 'keyup',

  // Form / input
  'input', 'change',
  'focus', 'blur',
  'focusin', 'focusout',
  'submit', 'reset',
  'invalid', 'select',

  // Touch
  'touchstart', 'touchend', 'touchmove', 'touchcancel',

  // Scroll
  'scroll',
]);

// ---------------------------------------------------------------------------
// Built-in modifiers
// ---------------------------------------------------------------------------
const CORE_MODIFIERS = {
  prevent(event) {
    event.preventDefault();
  },
  stop(event) {
    event.stopPropagation();
  },
  once: null, // handled via addEventListener options
  passive: null, // handled via addEventListener options
  capture: null, // handled via addEventListener options
  self(event, el) {
    return event.target === el;
  },
  // Target scope helpers (resolved at bind time)
  window: null,
  document: null,
};

// ---------------------------------------------------------------------------
// Extension registries (pluggable)
// ---------------------------------------------------------------------------
const customEvents = new Set();
const customModifiers = Object.create(null);

/**
 * Register an additional event name that the adapter should recognise.
 * @param {string} name
 */
export function registerEvent(name) {
  if (typeof name === 'string' && name.length) {
    customEvents.add(name.toLowerCase());
  }
}

/**
 * Register a custom modifier.
 * @param {string} name
 * @param {(event: Event, el: Element, ctx: object) => boolean|void} fn
 *        Return `false` to cancel the handler call.
 */
export function registerModifier(name, fn) {
  if (typeof name === 'string' && typeof fn === 'function') {
    customModifiers[name.toLowerCase()] = fn;
  }
}

/**
 * List all currently known events (core + custom).
 */
export function listEvents() {
  return [...CORE_EVENTS, ...customEvents];
}

/**
 * List all currently known modifiers (core + custom).
 */
export function listModifiers() {
  return [...Object.keys(CORE_MODIFIERS), ...Object.keys(customModifiers)];
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a key such as ":click.prevent.once" or ":keydown.enter".
 * @returns {{ event: string, modifiers: string[], keyFilter?: string } | null}
 */
function parseEventKey(key) {
  if (typeof key !== 'string' || !key.startsWith(':')) return null;

  const raw = key.slice(1).trim();
  if (!raw) return null;

  const parts = raw.split('.').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;

  const event = parts[0].toLowerCase();
  const modifiers = [];
  let keyFilter = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    // Keyboard key filter: :keydown.enter, :keyup.escape, etc.
    if ((event === 'keydown' || event === 'keyup') && isKeyName(part)) {
      keyFilter = part;
    } else {
      modifiers.push(part);
    }
  }

  return { event, modifiers, keyFilter };
}

const KEY_NAMES = new Set([
  'enter', 'escape', 'esc', 'tab', 'space', ' ',
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'backspace', 'delete', 'home', 'end', 'pageup', 'pagedown',
]);

function isKeyName(name) {
  return KEY_NAMES.has(name) || name.length === 1;
}

function matchKeyFilter(event, keyFilter) {
  if (!keyFilter) return true;
  const key = (event.key || '').toLowerCase();
  if (keyFilter === 'esc') return key === 'escape';
  if (keyFilter === 'space') return key === ' ' || key === 'spacebar';
  return key === keyFilter;
}

function isKnownEvent(name) {
  return CORE_EVENTS.has(name) || customEvents.has(name);
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

/**
 * @typedef {object} EventAdapterOptions
 * @property {ParentNode} root                 - Root element to scan
 * @property {Record<string, Function>} handlers - Named handler map
 * @property {(el: Element) => any} [getState] - Resolve state for an element
 * @property {any} [state]                     - Fixed state (if no getState)
 * @property {string} [attrPrefix=':']         - Prefix for event keys
 * @property {(sel: string, root: ParentNode) => Element[]} [query] - Custom element resolver
 * @property {boolean} [debug=false]
 */

/**
 * Create a pluggable event adapter.
 * @param {EventAdapterOptions} options
 */
export function createEventAdapter(options = {}) {
  const {
    root = document,
    handlers = {},
    getState = null,
    state: fixedState = null,
    attrPrefix = ':',
    query = defaultQuery,
    debug = false,
  } = options;

  /** @type {Array<() => void>} */
  let cleanups = [];

  function log(...args) {
    if (debug) console.debug('[wdl-events]', ...args);
  }

  /**
   * Resolve the attr map that should be scanned.
   * Prefer an explicit attr map passed to bind(); otherwise try state.attr.all().
   */
  function resolveAttrMap(attrMap) {
    if (attrMap && typeof attrMap === 'object') return attrMap;
    const s = fixedState;
    if (s && s.attr && typeof s.attr.all === 'function') return s.attr.all();
    return null;
  }

  /**
   * Bind listeners.
   * @param {object} [attrMap] - Optional attr object { ".cta": { ":click": "increment", ... }, ... }
   */
  function bind(attrMap) {
    unbind();

    const map = resolveAttrMap(attrMap);
    if (!map) {
      log('no attr map – nothing to bind');
      return;
    }

    Object.entries(map).forEach(([selector, attrs]) => {
      if (!attrs || typeof attrs !== 'object') return;

      const elements = query(selector, root);
      if (!elements.length) {
        log('no elements for selector', selector);
        return;
      }

      Object.entries(attrs).forEach(([key, handlerName]) => {
        if (!key.startsWith(attrPrefix)) return;

        const parsed = parseEventKey(key);
        if (!parsed) return;

        if (!isKnownEvent(parsed.event)) {
          log('unknown event (register it with registerEvent)', parsed.event);
          // still allow it – browser may support it
        }

        const handler = handlers[handlerName];
        if (typeof handler !== 'function') {
          console.warn(`[wdl-events] handler "${handlerName}" not found for ${key}`);
          return;
        }

        elements.forEach((el) => {
          const listener = buildListener(el, parsed, handler);
          const opts = buildListenerOptions(parsed.modifiers);
          const target = resolveTarget(el, parsed.modifiers);

          target.addEventListener(parsed.event, listener, opts);
          cleanups.push(() => target.removeEventListener(parsed.event, listener, opts));

          log('bound', parsed.event, '→', handlerName, 'on', selector);
        });
      });
    });
  }

  function buildListener(el, parsed, handler) {
    return function listener(event) {
      // Key filter (e.g. :keydown.enter)
      if (!matchKeyFilter(event, parsed.keyFilter)) return;

      // Run modifiers that can cancel
      for (const mod of parsed.modifiers) {
        const fn = customModifiers[mod] || CORE_MODIFIERS[mod];
        if (typeof fn === 'function') {
          const result = fn(event, el, { state: resolveState(el) });
          if (result === false) return; // cancelled
        }
      }

      const state = resolveState(el);
      const ctx = {
        element: el,
        selector: null,
        event: parsed.event,
        modifiers: parsed.modifiers,
      };

      try {
        handler(event, state, ctx);
      } catch (err) {
        console.error(`[wdl-events] handler error`, err);
      }
    };
  }

  function buildListenerOptions(modifiers) {
    const opts = {};
    if (modifiers.includes('once')) opts.once = true;
    if (modifiers.includes('passive')) opts.passive = true;
    if (modifiers.includes('capture')) opts.capture = true;
    return opts;
  }

  function resolveTarget(el, modifiers) {
    if (modifiers.includes('window')) return window;
    if (modifiers.includes('document')) return document;
    return el;
  }

  function resolveState(el) {
    if (typeof getState === 'function') return getState(el);
    return fixedState;
  }

  function unbind() {
    while (cleanups.length) {
      const fn = cleanups.pop();
      try { fn(); } catch (_) {}
    }
  }

  function rebind(attrMap) {
    unbind();
    bind(attrMap);
  }

  return {
    bind,
    unbind,
    rebind,
    /** Inspect current cleanup count (useful for tests) */
    get size() { return cleanups.length; },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultQuery(selector, root) {
  // Support plain class selectors that WDL uses (".cta", ".search")
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Convenience: auto-detect attr map from a state instance
// ---------------------------------------------------------------------------

/**
 * Shorthand when you already have a single component state.
 *
 * @example
 *   const adapter = fromState({
 *     root: document.getElementById('root'),
 *     state: counterState,
 *     handlers: { increment, reset },
 *   });
 *   adapter.bind();
 */
export function fromState({ root, state, handlers, debug = false }) {
  return createEventAdapter({
    root,
    state,
    handlers,
    debug,
  });
}

// ---------------------------------------------------------------------------
// Default export for UMD / simple script usage
// ---------------------------------------------------------------------------
const wdlEvents = {
  createEventAdapter,
  fromState,
  registerEvent,
  registerModifier,
  listEvents,
  listModifiers,
  CORE_EVENTS: [...CORE_EVENTS],
};

export default wdlEvents;

// Also attach to global when loaded via plain <script>
if (typeof window !== 'undefined') {
  window.WDLEvents = wdlEvents;
}
