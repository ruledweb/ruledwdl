/**
 * @ruledwdl/dom — Native DOM runtime for @ruledwdl/state
 *
 * Listens to every event emitted by ComponentState / ComponentManager and
 * applies surgical DOM mutations with createElement / insertBefore / remove.
 * No innerHTML on updates.
 *
 * State events handled (from @ruledwdl/state):
 *   layers:change   actions: set | append | before | after | wrap | remove | update
 *   attr:change     actions: set | update | remove
 *   data:change     actions: set | remove          (optional data-* / text binding)
 *   variant:change  actions: set
 *   registry:change actions: set | update | addRule | removeRule
 *
 * Event payload shape (from state.emit):
 *   {
 *     type: string,           // e.g. "layers:change"
 *     componentId: string,
 *     action: string,         // e.g. "append"
 *     targetId?: string,      // semantic id involved
 *     payload?: any,          // layer expr | attrs | path value | rule …
 *     timestamp: number
 *   }
 *
 * Usage:
 *   import { createWdlDom } from './wdl-dom.js';
 *   // or: import { ComponentManager } from '@ruledwdl/state';
 *
 *   const hero = manager.create('hero', { layers: '...', attr: {...} });
 *   const dom = createWdlDom({
 *     container: document.getElementById('app'),
 *     component: hero,          // ComponentState instance
 *     // optional:
 *     // onDataBind: (el, path, value) => { ... },
 *     // styleTarget: document.head,
 *   });
 *
 *   // later: hero.attr.set('title', { text: 'Hi' });  // → surgical update
 *   // destroy: dom.destroy();
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ATTR_SKIP = new Set(['text', 'class', 'html']);

/**
 * Parse a single layer token: "button.cta" | "div" | "h1.title"
 * @returns {{ tag: string, semanticId: string }}
 */
function parseLayerToken(expr) {
  if (typeof expr !== 'string') {
    if (expr && typeof expr === 'object') {
      return {
        tag: String(expr.tag || 'div').toLowerCase(),
        semanticId: String(expr.semanticId || expr.id || '').replace(/^\./, ''),
      };
    }
    throw new Error('[wdl-dom] invalid layer expression');
  }
  const trimmed = expr.trim();
  const m = trimmed.match(/^([a-zA-Z][a-zA-Z0-9_-]*)(?:\.([a-zA-Z0-9_-]+))?$/);
  if (!m) {
    // fallback: treat whole string as tag
    return { tag: trimmed.toLowerCase() || 'div', semanticId: '' };
  }
  return {
    tag: m[1].toLowerCase(),
    semanticId: (m[2] || '').replace(/^\./, ''),
  };
}

/**
 * Very small layers string → tree (supports > and + only).
 * For full WDL grammar prefer tree from component.layers.tree().
 */
function parseLayersSimple(str) {
  if (Array.isArray(str)) return structuredClone(str);
  if (typeof str !== 'string' || !str.trim()) return [];

  const root = { tag: '__root__', semanticId: '', children: [] };
  const stack = [root];
  let i = 0;

  const top = () => stack[stack.length - 1];

  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '>') {
      const last = top().children[top().children.length - 1];
      if (last) stack.push(last);
      i++;
      continue;
    }
    if (ch === '+') { i++; continue; }
    if (ch === '<') {
      i++;
      if (stack.length > 1) stack.pop();
      continue;
    }
    // element token
    let tag = '';
    while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) tag += str[i++];
    let semanticId = '';
    if (str[i] === '.') {
      i++;
      while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) semanticId += str[i++];
    }
    top().children.push({ tag: tag.toLowerCase() || 'div', semanticId, children: [] });
  }
  return root.children;
}

function normalizeId(id) {
  if (id == null) return '';
  return String(id).replace(/^\./, '');
}

// ---------------------------------------------------------------------------
// WdlDom
// ---------------------------------------------------------------------------

export class WdlDom {
  /**
   * @param {object} options
   * @param {HTMLElement|string} options.container
   * @param {object} options.component   ComponentState instance (has .on, .layers, .attr, .getSnapshot)
   * @param {(el: HTMLElement, path: string, value: any) => void} [options.onDataBind]
   * @param {HTMLElement|Document} [options.styleTarget=document.head]
   * @param {boolean} [options.debug=false]
   */
  constructor(options = {}) {
    const {
      container,
      component,
      onDataBind = null,
      styleTarget = typeof document !== 'undefined' ? document.head : null,
      debug = false,
    } = options;

    if (!container) throw new Error('[wdl-dom] container is required');
    if (!component) throw new Error('[wdl-dom] component (ComponentState) is required');

    this.container =
      typeof container === 'string'
        ? document.querySelector(container)
        : container;
    if (!this.container) throw new Error('[wdl-dom] container not found');

    this.component = component;
    this.onDataBind = onDataBind;
    this.styleTarget = styleTarget;
    this.debug = debug;

    /** @type {Map<string, HTMLElement>} semanticId → element */
    this.liveMap = new Map();

    /** @type {Array<() => void>} */
    this._unsubs = [];

    /** style element for registry rules */
    this._styleEl = null;

    this._mount();
    this._bindStateEvents();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Force full remount from current snapshot */
  remount() {
    this._mount();
  }

  /** Current live map (read-only view) */
  getLiveMap() {
    return new Map(this.liveMap);
  }

  /** Clean up listeners and DOM */
  destroy() {
    this._unsubs.forEach((u) => {
      try { u(); } catch (_) {}
    });
    this._unsubs = [];
    this.container.replaceChildren();
    this.liveMap.clear();
    if (this._styleEl && this._styleEl.parentNode) {
      this._styleEl.parentNode.removeChild(this._styleEl);
    }
    this._styleEl = null;
  }

  // -----------------------------------------------------------------------
  // Initial mount
  // -----------------------------------------------------------------------

  _mount() {
    this.container.replaceChildren();
    this.liveMap.clear();

    let tree;
    try {
      tree = typeof this.component.layers?.tree === 'function'
        ? this.component.layers.tree()
        : parseLayersSimple(this.component.layers?.list?.() ?? this.component.getSnapshot?.()?.layers);
    } catch (e) {
      this._log('warn', 'tree() failed, falling back to simple parse', e);
      const layers = this.component.getSnapshot?.()?.layers ?? '';
      tree = parseLayersSimple(layers);
    }

    if (!Array.isArray(tree)) tree = [];

    for (const node of tree) {
      const el = this._createElementFromNode(node);
      this.container.appendChild(el);
    }

    // Apply all current attributes
    const attrMap =
      this.component.attr?.list?.() ??
      this.component.getSnapshot?.()?.attr ??
      {};
    for (const [sel, props] of Object.entries(attrMap)) {
      this._applyAttrs(normalizeId(sel), props);
    }

    // Apply variant if present on root
    this._applyRootVariant();

    // Registry styles
    this._syncRegistryStyles();

    this._log('mount', `mounted ${this.liveMap.size} nodes`);
  }

  /**
   * @param {{ tag: string, semanticId?: string, id?: string, children?: any[] }} node
   */
  _createElementFromNode(node) {
    const tag = (node.tag || 'div').toLowerCase();
    const id = normalizeId(node.semanticId || node.id || '');
    const el = document.createElement(tag);

    if (id) {
      el.classList.add(id);
      el.setAttribute('wdl-comp', id);
      this.liveMap.set(id, el);
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        el.appendChild(this._createElementFromNode(child));
      }
    }
    return el;
  }

  // -----------------------------------------------------------------------
  // State event binding
  // -----------------------------------------------------------------------

  _bindStateEvents() {
    const c = this.component;
    if (typeof c.on !== 'function') {
      this._log('warn', 'component has no .on() — events will not be applied');
      return;
    }

    const handler = (event) => this._onStateEvent(event);

    // All events documented by @ruledwdl/state
    const types = [
      'layers:change',
      'attr:change',
      'data:change',
      'variant:change',
      'registry:change',
    ];

    for (const type of types) {
      const off = c.on(type, handler);
      // state.on may return unsubscribe fn or nothing
      if (typeof off === 'function') this._unsubs.push(off);
      else this._unsubs.push(() => c.off?.(type, handler));
    }
  }

  /**
   * @param {{ type: string, action: string, targetId?: string, payload?: any, componentId?: string }} event
   */
  _onStateEvent(event) {
    if (!event || !event.type) return;
    this._log('event', event.type, event.action, event.targetId, event.payload);

    switch (event.type) {
      case 'layers:change':
        this._handleLayers(event);
        break;
      case 'attr:change':
        this._handleAttr(event);
        break;
      case 'data:change':
        this._handleData(event);
        break;
      case 'variant:change':
        this._handleVariant(event);
        break;
      case 'registry:change':
        this._handleRegistry(event);
        break;
      default:
        this._log('warn', 'unknown event type', event.type);
    }
  }

  // -----------------------------------------------------------------------
  // layers:change
  // actions: set | append | before | after | wrap | remove | update
  // -----------------------------------------------------------------------

  _handleLayers(event) {
    const { action, targetId, payload } = event;
    const id = normalizeId(targetId);

    switch (action) {
      case 'set': {
        // Full layers replacement → remount
        this._mount();
        break;
      }
      case 'append': {
        // payload = layer expression (string or node-like)
        const parentEl = this.liveMap.get(id);
        if (!parentEl) {
          this._log('warn', `append: parent "${id}" not in liveMap — remounting`);
          this._mount();
          return;
        }
        const token = parseLayerToken(payload);
        const el = this._createElementFromNode({
          tag: token.tag,
          semanticId: token.semanticId,
          children: [],
        });
        parentEl.appendChild(el);
        this._log('op', `append <${token.tag}.${token.semanticId}> → #${id}`);
        break;
      }
      case 'before':
      case 'after': {
        const targetEl = this.liveMap.get(id);
        if (!targetEl || !targetEl.parentNode) {
          this._log('warn', `${action}: target "${id}" missing — remounting`);
          this._mount();
          return;
        }
        const token = parseLayerToken(payload);
        const el = this._createElementFromNode({
          tag: token.tag,
          semanticId: token.semanticId,
          children: [],
        });
        if (action === 'before') {
          targetEl.parentNode.insertBefore(el, targetEl);
        } else {
          targetEl.parentNode.insertBefore(el, targetEl.nextSibling);
        }
        this._log('op', `${action} <${token.tag}.${token.semanticId}> relative to #${id}`);
        break;
      }
      case 'wrap': {
        // payload = wrapper layer expression
        const targetEl = this.liveMap.get(id);
        if (!targetEl || !targetEl.parentNode) {
          this._log('warn', `wrap: target "${id}" missing — remounting`);
          this._mount();
          return;
        }
        const token = parseLayerToken(payload);
        const wrapper = this._createElementFromNode({
          tag: token.tag,
          semanticId: token.semanticId,
          children: [],
        });
        targetEl.parentNode.insertBefore(wrapper, targetEl);
        wrapper.appendChild(targetEl);
        this._log('op', `wrap #${id} with <${token.tag}.${token.semanticId}>`);
        break;
      }
      case 'remove': {
        const el = this.liveMap.get(id);
        if (!el) {
          this._log('warn', `remove: #${id} not in liveMap`);
          return;
        }
        // Remove descendants from liveMap first
        for (const [sid, node] of [...this.liveMap]) {
          if (sid !== id && el.contains(node)) this.liveMap.delete(sid);
        }
        el.remove();
        this.liveMap.delete(id);
        this._log('op', `remove #${id}`);
        break;
      }
      case 'update': {
        // payload = { tag?, semanticId? }
        const el = this.liveMap.get(id);
        if (!el) {
          this._log('warn', `update: #${id} missing — remounting`);
          this._mount();
          return;
        }
        const patch = payload || {};
        if (patch.tag && patch.tag.toLowerCase() !== el.tagName.toLowerCase()) {
          // Tag change requires recreate
          const next = document.createElement(String(patch.tag).toLowerCase());
          // copy attributes & children
          for (const attr of el.attributes) next.setAttribute(attr.name, attr.value);
          while (el.firstChild) next.appendChild(el.firstChild);
          el.parentNode?.replaceChild(next, el);
          this.liveMap.set(id, next);
          if (patch.semanticId && normalizeId(patch.semanticId) !== id) {
            const newId = normalizeId(patch.semanticId);
            next.classList.remove(id);
            next.classList.add(newId);
            next.setAttribute('wdl-comp', newId);
            this.liveMap.delete(id);
            this.liveMap.set(newId, next);
          }
        } else if (patch.semanticId && normalizeId(patch.semanticId) !== id) {
          const newId = normalizeId(patch.semanticId);
          el.classList.remove(id);
          el.classList.add(newId);
          el.setAttribute('wdl-comp', newId);
          this.liveMap.delete(id);
          this.liveMap.set(newId, el);
        }
        this._log('op', `update #${id}`, patch);
        break;
      }
      default:
        this._log('warn', `layers: unknown action "${action}" — remounting`);
        this._mount();
    }
  }

  // -----------------------------------------------------------------------
  // attr:change
  // actions: set | update | remove
  // -----------------------------------------------------------------------

  _handleAttr(event) {
    const { action, targetId, payload } = event;
    const id = normalizeId(targetId);

    if (action === 'set' || action === 'update') {
      // payload = full attrs object (set) or patch (update)
      this._applyAttrs(id, payload || {});
      this._log('op', `attr.${action} #${id}`, payload);
      return;
    }

    if (action === 'remove') {
      const el = this.liveMap.get(id);
      if (!el) return;
      const attrKey = payload; // may be undefined → remove whole entry
      if (attrKey == null || attrKey === '') {
        el.textContent = '';
        // keep semantic class
        el.className = id;
        this._log('op', `attr.remove entire #${id}`);
      } else if (attrKey === 'text') {
        el.textContent = '';
        this._log('op', `attr.remove text from #${id}`);
      } else if (attrKey === 'class') {
        el.className = id;
        this._log('op', `attr.remove class from #${id}`);
      } else if (attrKey === 'html') {
        el.innerHTML = '';
        this._log('op', `attr.remove html from #${id}`);
      } else {
        el.removeAttribute(attrKey);
        this._log('op', `attr.remove ${attrKey} from #${id}`);
      }
    }
  }

  /**
   * Apply attribute object onto live element.
   * Supports: text, class, html, data-*, style object, arbitrary attrs.
   */
  _applyAttrs(id, props) {
    if (!props || typeof props !== 'object') return;
    const el = this.liveMap.get(id);
    if (!el) {
      this._log('warn', `attr: #${id} not in liveMap`);
      return;
    }

    if (props.text !== undefined) {
      el.textContent = String(props.text);
    }
    if (props.html !== undefined) {
      el.innerHTML = String(props.html);
    }
    if (props.class !== undefined) {
      const extra = String(props.class).trim();
      el.className = extra ? `${id} ${extra}` : id;
    }

    for (const [key, value] of Object.entries(props)) {
      if (ATTR_SKIP.has(key)) continue;
      if (key === 'style' && value && typeof value === 'object') {
        Object.assign(el.style, value);
        continue;
      }
      if (value == null) {
        el.removeAttribute(key);
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }

  // -----------------------------------------------------------------------
  // data:change
  // actions: set | remove
  // Optional: onDataBind callback for custom binding
  // -----------------------------------------------------------------------

  _handleData(event) {
    const { action, targetId, payload } = event;
    // targetId is the path (e.g. "user.name"), payload is the value
    const path = targetId || '';
    if (typeof this.onDataBind === 'function') {
      // Let consumer decide how data maps to DOM
      // We pass the root container + path + value
      try {
        this.onDataBind(this.container, path, action === 'remove' ? undefined : payload);
      } catch (e) {
        this._log('warn', 'onDataBind error', e);
      }
    }
    this._log('op', `data.${action} ${path}`, action === 'remove' ? undefined : payload);
  }

  // -----------------------------------------------------------------------
  // variant:change
  // action: set   targetId = semanticId (or component id)  payload = variantName
  // -----------------------------------------------------------------------

  _handleVariant(event) {
    const { targetId, payload } = event;
    const id = normalizeId(targetId) || this._rootSemanticId();
    const el = this.liveMap.get(id);
    if (!el) {
      // try root
      const rootId = this._rootSemanticId();
      const rootEl = rootId ? this.liveMap.get(rootId) : null;
      if (rootEl) {
        if (payload) rootEl.dataset.variant = String(payload);
        else delete rootEl.dataset.variant;
        this._log('op', `variant → ${payload || '(none)'} on #${rootId}`);
      }
      return;
    }
    if (payload) el.dataset.variant = String(payload);
    else delete el.dataset.variant;
    this._log('op', `variant → ${payload || '(none)'} on #${id}`);
  }

  _applyRootVariant() {
    // Read current variant from attr if present
    const attr =
      this.component.attr?.list?.() ??
      this.component.getSnapshot?.()?.attr ??
      {};
    const rootId = this._rootSemanticId();
    if (!rootId) return;
    const rootKey = '.' + rootId;
    const variant =
      attr[rootKey]?.['data-variant'] ??
      attr['.']?.['data-variant'] ??
      null;
    if (variant && this.liveMap.has(rootId)) {
      this.liveMap.get(rootId).dataset.variant = String(variant);
    }
  }

  _rootSemanticId() {
    // First entry in liveMap that is a direct child of container, or first key
    for (const [id, el] of this.liveMap) {
      if (el.parentNode === this.container) return id;
    }
    const first = this.liveMap.keys().next();
    return first.done ? '' : first.value;
  }

  // -----------------------------------------------------------------------
  // registry:change
  // actions: set | update | addRule | removeRule
  // Injects / updates a <style data-wdl-dom="componentId"> in styleTarget
  // -----------------------------------------------------------------------

  _handleRegistry(event) {
    this._syncRegistryStyles();
    this._log('op', `registry.${event.action}`);
  }

  _syncRegistryStyles() {
    if (!this.styleTarget) return;

    const registry =
      this.component.registry?.get?.() ??
      this.component.getSnapshot?.()?.registry ??
      null;

    const componentId = this.component.id || this.component.getSnapshot?.()?.id || 'comp';

    if (!this._styleEl) {
      this._styleEl = document.createElement('style');
      this._styleEl.setAttribute('data-wdl-dom', componentId);
      this.styleTarget.appendChild(this._styleEl);
    }

    if (!registry) {
      this._styleEl.textContent = '';
      return;
    }

    const rules = Array.isArray(registry.rules) ? registry.rules : [];
    const parts = [];

    // CSS variables
    if (registry.vars && typeof registry.vars === 'object') {
      const decls = Object.entries(registry.vars)
        .map(([k, v]) => `--${k}: ${v};`)
        .join(' ');
      if (decls) parts.push(`:root, [wdl-comp] { ${decls} }`);
    }

    for (const rule of rules) {
      if (!rule || !rule.selector) continue;
      const css =
        typeof rule.css === 'string'
          ? rule.css
          : rule.css && typeof rule.css === 'object'
            ? Object.entries(rule.css)
                .map(([k, v]) => `${camelToKebab(k)}: ${v};`)
                .join(' ')
            : '';
      if (!css) continue;
      const selector = rule.selector.startsWith('&')
        ? rule.selector.replace('&', `[wdl-comp="${componentId}"]`)
        : rule.selector;
      const media = rule.media ? `@media ${rule.media} { ${selector} { ${css} } }` : `${selector} { ${css} }`;
      parts.push(media);
    }

    this._styleEl.textContent = parts.join('\n');
  }

  // -----------------------------------------------------------------------
  // Utils
  // -----------------------------------------------------------------------

  _log(kind, ...args) {
    if (!this.debug && kind !== 'warn') return;
    const prefix = `[wdl-dom:${kind}]`;
    if (kind === 'warn') console.warn(prefix, ...args);
    else console.log(prefix, ...args);
  }
}

function camelToKebab(str) {
  return String(str).replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create and mount a WdlDom runtime.
 * @param {ConstructorParameters<typeof WdlDom>[0]} options
 * @returns {WdlDom}
 */
export function createWdlDom(options) {
  return new WdlDom(options);
}

export default createWdlDom;
