/**
 * @ruledwdl/dom — Native DOM runtime for @ruledwdl/state
 *
 * Listens to every event emitted by ComponentState / ComponentManager and
 * applies surgical DOM mutations with createElement / insertBefore / remove.
 * No innerHTML on updates.
 *
 * State events handled (from @ruledwdl/state):
 *   layers:change   actions: set | append | prepend | before | after | wrap | unwrap | move | remove | update
 *   attr:change     actions: set | update | remove
 *   data:change     actions: set | update | remove (surgical loop child reconciliation & item-scoped binding)
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
 *   import { createWdlDom } from '@ruledwdl/dom';
 *   // or: import { ComponentManager } from '@ruledwdl/state';
 *
 *   const comp = manager.create('pricing-card', {
 *     layers: 'ul.features > li.feature*features',
 *     attr: { '.feature': { text: '${text}' } },
 *     data: { features: [{ text: 'First' }, { text: 'Second' }] }
 *   });
 *   const dom = createWdlDom({
 *     container: document.getElementById('app'),
 *     component: comp
 *   });
 *
 *   // later: comp.data.set('features', [{ text: 'Updated' }]); // → surgical row reconciliation
 *   // destroy: dom.destroy();
 */

// ---------------------------------------------------------------------------
// Helpers & Data Resolvers
// ---------------------------------------------------------------------------

const ATTR_SKIP = new Set(['text', 'class', 'html', 'alpine', 'htmx', 'attr-ref']);

/**
 * Resolve dot-notated path on an object (e.g. "user.name" or "text")
 */
export function resolvePath(obj, path) {
  if (!path || obj == null) return obj ?? '';
  return String(path).split('.').reduce((a, k) => (a != null ? a[k] : ''), obj) ?? '';
}

/**
 * Resolve template strings with ${path} or {{path}} expressions
 */
export function resolveStr(str, data) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/\$\{([\w.]+)\}/g, (_, p) => {
      const val = resolvePath(data, p);
      return val != null ? String(val) : '';
    })
    .replace(/\{\{([\w.]+)\}\}/g, (_, p) => {
      const val = resolvePath(data, p);
      return val != null ? String(val) : '';
    });
}

/**
 * Deeply resolve string templates within objects/arrays
 */
export function resolveAll(obj, data) {
  if (obj == null) return obj;
  if (typeof obj === 'function') return '';
  if (typeof obj === 'string') return resolveStr(obj, data);
  if (Array.isArray(obj)) return obj.map((v) => resolveAll(v, data));
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, resolveAll(v, data)])
    );
  }
  return obj;
}

/**
 * Parse a single layer token: "button.cta" | "li.feature*features" | "div.card*3"
 * @returns {{ tag: string, semanticId: string, repeator: string | null }}
 */
export function parseLayerToken(expr) {
  if (typeof expr !== 'string') {
    if (expr && typeof expr === 'object') {
      return {
        tag: String(expr.tag || 'div').toLowerCase(),
        semanticId: String(expr.semanticId || expr.id || '').replace(/^\./, ''),
        repeator: expr.repeator || expr.loopKey || null,
      };
    }
    throw new Error('[wdl-dom] invalid layer expression');
  }
  const trimmed = expr.trim();
  let str = trimmed;
  let repeator = null;
  const multIdx = str.indexOf('*');
  if (multIdx !== -1) {
    repeator = str.slice(multIdx + 1);
    str = str.slice(0, multIdx);
  }
  const m = str.match(/^([a-zA-Z][a-zA-Z0-9_-]*)(?:\.([a-zA-Z0-9_-]+))?$/);
  if (!m) {
    // fallback: treat whole string as tag
    return { tag: str.toLowerCase() || 'div', semanticId: '', repeator };
  }
  return {
    tag: m[1].toLowerCase(),
    semanticId: (m[2] || '').replace(/^\./, ''),
    repeator,
  };
}

/**
 * Simple layers string → tree parser (supports >, +, <, <*N, <@N, and *repeator).
 * For full WDL grammar prefer tree from component.layers.tree().
 */
export function parseLayersSimple(str) {
  if (Array.isArray(str)) return structuredClone(str);
  if (typeof str !== 'string' || !str.trim()) return [];

  const root = { tag: '__root__', semanticId: '', children: [] };
  const stack = [root];
  let i = 0;

  const top = () => stack[stack.length - 1];

  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '>') {
      const last = top().children[top().children.length - 1];
      if (last) stack.push(last);
      i++;
      continue;
    }
    if (ch === '+') {
      i++;
      continue;
    }
    if (ch === '<') {
      i++;
      if (i < str.length && str[i] === '*') {
        i++;
        let numStr = '';
        while (i < str.length && /\d/.test(str[i])) {
          numStr += str[i++];
        }
        const count = numStr ? parseInt(numStr, 10) : 1;
        for (let k = 0; k < count; k++) {
          if (stack.length > 1) stack.pop();
        }
      } else if (i < str.length && str[i] === '@') {
        i++;
        let numStr = '';
        while (i < str.length && /\d/.test(str[i])) {
          numStr += str[i++];
        }
        const targetDepth = numStr ? parseInt(numStr, 10) : 0;
        const targetStackLen = targetDepth + 1;
        while (stack.length > targetStackLen && stack.length > 1) {
          stack.pop();
        }
      } else {
        let count = 1;
        while (i < str.length && str[i] === '<') {
          count++;
          i++;
        }
        for (let k = 0; k < count; k++) {
          if (stack.length > 1) stack.pop();
        }
      }
      continue;
    }

    // Element token
    let tag = '';
    while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) tag += str[i++];
    let semanticId = '';
    if (str[i] === '.') {
      i++;
      while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) semanticId += str[i++];
    }
    let repeator = null;
    if (str[i] === '*') {
      i++;
      let rep = '';
      while (i < str.length && /[a-zA-Z0-9_.]/.test(str[i])) rep += str[i++];
      if (rep) repeator = rep;
    }
    top().children.push({
      tag: tag.toLowerCase() || 'div',
      semanticId,
      repeator,
      children: [],
    });
  }
  return root.children;
}

export function normalizeId(id) {
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
   * @param {object} options.component   ComponentState instance (has .on, .layers, .attr, .data, .getSnapshot)
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

    /** @type {Map<string, HTMLElement>} semanticId → first live element (backward compatible) */
    this.liveMap = new Map();

    /** @type {Map<string, HTMLElement[]>} semanticId → all live elements */
    this.liveNodes = new Map();

    /**
     * Active loop bindings for surgical reconciliation
     * @type {Array<{ parentEl: HTMLElement, node: any, repeator: string, elements: HTMLElement[], anchor: any }>}
     */
    this._loopBindings = [];

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

  /** Current live map of first elements (read-only view) */
  getLiveMap() {
    return new Map(this.liveMap);
  }

  /** Get all live elements matching a semantic ID */
  getLiveNodes(semanticId) {
    const id = normalizeId(semanticId);
    return [...(this.liveNodes.get(id) || [])];
  }

  /** Get single element by semantic ID and optional index */
  getNode(semanticId, index = 0) {
    const list = this.getLiveNodes(semanticId);
    return list[index] || null;
  }

  /** Clean up listeners and DOM */
  destroy() {
    this._unsubs.forEach((u) => {
      try {
        u();
      } catch (_) {}
    });
    this._unsubs = [];
    this.container.replaceChildren();
    this.liveMap.clear();
    this.liveNodes.clear();
    this._loopBindings = [];
    if (this._styleEl && this._styleEl.parentNode) {
      this._styleEl.parentNode.removeChild(this._styleEl);
    }
    this._styleEl = null;
  }

  // -----------------------------------------------------------------------
  // Node Registry Management
  // -----------------------------------------------------------------------

  _registerNode(id, el) {
    if (!id) return;
    const norm = normalizeId(id);
    if (!this.liveNodes.has(norm)) {
      this.liveNodes.set(norm, []);
    }
    const list = this.liveNodes.get(norm);
    if (!list.includes(el)) {
      list.push(el);
    }
    this.liveMap.set(norm, list[0]);
  }

  _unregisterNode(id, el) {
    if (!id) return;
    const norm = normalizeId(id);
    if (this.liveNodes.has(norm)) {
      const list = this.liveNodes.get(norm);
      const idx = list.indexOf(el);
      if (idx !== -1) list.splice(idx, 1);
      if (list.length === 0) {
        this.liveNodes.delete(norm);
        this.liveMap.delete(norm);
      } else {
        this.liveMap.set(norm, list[0]);
      }
    } else {
      this.liveMap.delete(norm);
    }
  }

  _unregisterElementHierarchy(el) {
    if (!el) return;
    const compId = el.getAttribute?.('wdl-comp');
    if (compId) {
      this._unregisterNode(compId, el);
    }
    if (Array.isArray(el.children)) {
      for (const child of el.children) {
        this._unregisterElementHierarchy(child);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Data and Scope Helpers
  // -----------------------------------------------------------------------

  _getComponentData() {
    return (
      this.component.data?.get?.() ??
      this.component.getSnapshot?.()?.data ??
      {}
    );
  }

  _getComponentAttrMap() {
    return (
      this.component.attr?.list?.() ??
      this.component.getSnapshot?.()?.attr ??
      {}
    );
  }

  _getComponentRegistry() {
    return (
      this.component.registry?.get?.() ??
      this.component.getSnapshot?.()?.registry ??
      {}
    );
  }

  _getRegistryClasses(id, tag, dataScope, el) {
    const registry = this._getComponentRegistry();
    if (!registry || typeof registry !== 'object') return '';

    const entry =
      (id ? registry[id] || registry['.' + id] : null) ||
      (tag ? registry[tag] : null);

    if (!entry) return '';

    if (typeof entry === 'string') {
      return resolveStr(entry, dataScope);
    }

    if (typeof entry !== 'object' || entry === null) return '';

    const classes = [];

    // Base utility class string
    if (typeof entry.base === 'string' && entry.base) {
      classes.push(resolveStr(entry.base, dataScope));
    } else if (typeof entry.class === 'string' && entry.class) {
      classes.push(resolveStr(entry.class, dataScope));
    }

    // Active Variant classes
    const activeVariant =
      el?.dataset?.variant ||
      el?.getAttribute?.('data-variant') ||
      this.component.variant?.get?.(id) ||
      entry.defaultVariant ||
      null;

    if (activeVariant && entry.variants && typeof entry.variants === 'object') {
      const vVal = entry.variants[activeVariant];
      if (typeof vVal === 'string' && vVal) {
        classes.push(resolveStr(vVal, dataScope));
      }
    }

    // States (e.g. hover, focus)
    if (entry.states && typeof entry.states === 'object') {
      for (const [state, cls] of Object.entries(entry.states)) {
        if (typeof cls === 'string' && cls) {
          const resolved = resolveStr(cls, dataScope);
          const formatted = resolved
            .split(/\s+/)
            .filter(Boolean)
            .map((c) => (c.includes(':') ? c : `${state}:${c}`))
            .join(' ');
          classes.push(formatted);
        }
      }
    }

    // Breakpoints (e.g. md, lg)
    if (entry.breakpoints && typeof entry.breakpoints === 'object') {
      for (const [bp, cls] of Object.entries(entry.breakpoints)) {
        if (typeof cls === 'string' && cls) {
          const resolved = resolveStr(cls, dataScope);
          const formatted = resolved
            .split(/\s+/)
            .filter(Boolean)
            .map((c) => (c.includes(':') ? c : `${bp}:${c}`))
            .join(' ');
          classes.push(formatted);
        }
      }
    }

    return classes.filter(Boolean).join(' ');
  }

  _resolveLoopItems(repeator, dataScope) {
    if (!repeator) return [];
    if (/^\d+$/.test(String(repeator))) {
      const count = parseInt(repeator, 10);
      return Array.from({ length: Math.max(0, count) }, (_, idx) => ({ _index: idx }));
    }
    const resolved = resolvePath(dataScope, repeator);
    if (Array.isArray(resolved)) return resolved;
    if (typeof resolved === 'number') {
      return Array.from({ length: Math.max(0, resolved) }, (_, idx) => ({ _index: idx }));
    }
    return [];
  }

  _createItemScope(item, index, baseData) {
    const data = baseData || this._getComponentData();
    if (typeof item === 'object' && item !== null) {
      return { ...data, ...item, item, _index: index };
    }
    return { ...data, value: item, item, _index: index };
  }

  // -----------------------------------------------------------------------
  // Initial mount
  // -----------------------------------------------------------------------

  _mount() {
    this.container.replaceChildren();
    this.liveMap.clear();
    this.liveNodes.clear();
    this._loopBindings = [];

    let tree;
    try {
      tree =
        typeof this.component.layers?.tree === 'function'
          ? this.component.layers.tree()
          : parseLayersSimple(
              this.component.layers?.list?.() ??
                this.component.getSnapshot?.()?.layers
            );
    } catch (e) {
      this._log('warn', 'tree() failed, falling back to simple parse', e);
      const layers = this.component.getSnapshot?.()?.layers ?? '';
      tree = parseLayersSimple(layers);
    }

    if (!Array.isArray(tree)) tree = [];

    const compData = this._getComponentData();

    for (const node of tree) {
      this._mountLayerNode(this.container, node, compData);
    }

    // Apply variant if present on root
    this._applyRootVariant();

    // Registry styles
    this._syncRegistryStyles();

    this._log('mount', `mounted ${this.liveMap.size} semantic keys, ${this._loopBindings.length} loops`);
  }

  /**
   * Mount a layer node into a parent container/element.
   * Handles loop expansion vs single element mounting.
   */
  _mountLayerNode(parentEl, node, dataScope) {
    if (node.repeator) {
      const items = this._resolveLoopItems(node.repeator, dataScope);
      const elements = [];

      for (let i = 0; i < items.length; i++) {
        const itemScope = this._createItemScope(items[i], i, dataScope);
        const el = this._createSingleElement(node, itemScope, i);
        parentEl.appendChild(el);
        elements.push(el);
      }

      // Create comment anchor to keep track of loop boundary
      let anchor = null;
      if (typeof document.createComment === 'function') {
        anchor = document.createComment(`wdl-loop:${node.repeator}`);
        parentEl.appendChild(anchor);
      }

      this._loopBindings.push({
        parentEl,
        node,
        repeator: node.repeator,
        elements,
        anchor,
      });
      return;
    }

    const el = this._createSingleElement(node, dataScope);
    parentEl.appendChild(el);
  }

  /**
   * Create a single DOM element for a layer node with item scope and attributes.
   */
  _createSingleElement(node, dataScope, index) {
    const tag = (node.tag || 'div').toLowerCase();
    const id = normalizeId(node.semanticId || node.id || '');
    const el = document.createElement(tag);

    if (id) {
      el.classList.add(id);
      el.setAttribute('wdl-comp', id);
      this._registerNode(id, el);
    }

    const effectiveIndex = index !== undefined ? index : dataScope?._index;
    if (effectiveIndex !== undefined) {
      const idxStr = String(effectiveIndex);
      el.setAttribute('data-wdl-index', idxStr);
      if (el.dataset) el.dataset.wdlIndex = idxStr;
    }

    this._applyNodeAttrs(el, node, dataScope);

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        this._mountLayerNode(el, child, dataScope);
      }
    }

    return el;
  }

  /**
   * Apply matching attributes to an element using resolved dataScope.
   */
  _applyNodeAttrs(el, node, dataScope) {
    const attrMap = this._getComponentAttrMap();
    const id = normalizeId(node.semanticId || node.id || '');
    const tag = (node.tag || 'div').toLowerCase();

    // Priority: tag fallback -> semanticId (.id or id)
    const tagAttrs = attrMap[tag] || {};
    const idDotAttrs = id ? attrMap['.' + id] || {} : {};
    const idAttrs = id ? attrMap[id] || {} : {};

    const merged = { ...tagAttrs, ...idDotAttrs, ...idAttrs };
    const resolved = resolveAll(merged, dataScope);

    // Merge semantic ID, registry classes, and attr classes
    const registryClasses = this._getRegistryClasses(id, tag, dataScope, el);
    const attrClasses = typeof resolved.class === 'string' ? resolved.class : '';

    const combinedClasses = [
      id,
      registryClasses,
      attrClasses,
    ]
      .filter(Boolean)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean);

    const uniqueClasses = Array.from(new Set(combinedClasses)).join(' ');

    this._applyPropsToElement(el, id, { ...resolved, class: uniqueClasses });
  }

  _refreshElementClasses(el, id) {
    if (!el) return;
    const normId = normalizeId(id || el.getAttribute('wdl-comp') || '');
    const compData = this._getComponentData();
    const attrMap = this._getComponentAttrMap();
    const tag = (el.tagName || 'div').toLowerCase();

    const idx = el.getAttribute('data-wdl-index');
    let scope = compData;
    if (idx !== null && idx !== undefined) {
      const indexNum = parseInt(idx, 10);
      const loop = this._findLoopForElement(el);
      if (loop) {
        const items = resolvePath(compData, loop.repeator);
        if (Array.isArray(items) && items[indexNum] !== undefined) {
          scope = this._createItemScope(items[indexNum], indexNum, compData);
        } else {
          scope = { ...compData, _index: indexNum };
        }
      } else {
        scope = { ...compData, _index: indexNum };
      }
    }

    const tagAttrs = attrMap[tag] || {};
    const idDotAttrs = normId ? attrMap['.' + normId] || {} : {};
    const idAttrs = normId ? attrMap[normId] || {} : {};
    const merged = { ...tagAttrs, ...idDotAttrs, ...idAttrs };
    const resolved = resolveAll(merged, scope);

    const registryClasses = this._getRegistryClasses(normId, tag, scope, el);
    const attrClasses = typeof resolved.class === 'string' ? resolved.class : '';

    const combinedClasses = [
      normId,
      registryClasses,
      attrClasses,
    ]
      .filter(Boolean)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean);

    el.className = Array.from(new Set(combinedClasses)).join(' ');
  }

  _refreshAllElementClasses() {
    for (const [id, nodes] of this.liveNodes) {
      for (const el of nodes) {
        this._refreshElementClasses(el, id);
      }
    }
  }

  /**
   * Directly apply a resolved properties dictionary onto an element.
   */
  _applyPropsToElement(el, id, props) {
    if (!props || typeof props !== 'object') return;

    if (props.text !== undefined) {
      el.textContent = String(props.text);
    }
    if (props.html !== undefined) {
      el.innerHTML = String(props.html);
    }
    if (props.class !== undefined) {
      el.className = String(props.class).trim();
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
  // State event binding
  // -----------------------------------------------------------------------

  _bindStateEvents() {
    const c = this.component;
    if (typeof c.on !== 'function') {
      this._log('warn', 'component has no .on() — events will not be applied');
      return;
    }

    const handler = (event) => this._onStateEvent(event);

    const types = [
      'layers:change',
      'attr:change',
      'data:change',
      'variant:change',
      'registry:change',
    ];

    for (const type of types) {
      const off = c.on(type, handler);
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
  // actions: set | append | prepend | before | after | wrap | unwrap | move | remove | update
  // -----------------------------------------------------------------------

  _handleLayers(event) {
    const { action, targetId, payload } = event;
    const id = normalizeId(targetId);
    const compData = this._getComponentData();

    switch (action) {
      case 'set': {
        this._mount();
        break;
      }
      case 'append': {
        const parentEl = this.getNode(id);
        if (!parentEl) {
          this._log('warn', `append: parent "${id}" not in liveMap — remounting`);
          this._mount();
          return;
        }
        const token = parseLayerToken(payload);
        this._mountLayerNode(parentEl, token, compData);
        this._log('op', `append <${token.tag}.${token.semanticId}> → #${id}`);
        break;
      }
      case 'prepend': {
        const parentEl = this.getNode(id);
        if (!parentEl) {
          this._log('warn', `prepend: parent "${id}" not in liveMap — remounting`);
          this._mount();
          return;
        }
        const token = parseLayerToken(payload);
        const el = this._createSingleElement(token, compData);
        parentEl.insertBefore(el, parentEl.firstChild);
        this._log('op', `prepend <${token.tag}.${token.semanticId}> → #${id}`);
        break;
      }
      case 'before':
      case 'after': {
        const targetEl = this.getNode(id);
        if (!targetEl || !targetEl.parentNode) {
          this._log('warn', `${action}: target "${id}" missing — remounting`);
          this._mount();
          return;
        }
        const token = parseLayerToken(payload);
        const el = this._createSingleElement(token, compData);
        if (action === 'before') {
          targetEl.parentNode.insertBefore(el, targetEl);
        } else {
          targetEl.parentNode.insertBefore(el, targetEl.nextSibling);
        }
        this._log('op', `${action} <${token.tag}.${token.semanticId}> relative to #${id}`);
        break;
      }
      case 'wrap': {
        const targetEl = this.getNode(id);
        if (!targetEl || !targetEl.parentNode) {
          this._log('warn', `wrap: target "${id}" missing — remounting`);
          this._mount();
          return;
        }
        const token = parseLayerToken(payload);
        const wrapper = this._createSingleElement(token, compData);
        targetEl.parentNode.insertBefore(wrapper, targetEl);
        wrapper.appendChild(targetEl);
        this._log('op', `wrap #${id} with <${token.tag}.${token.semanticId}>`);
        break;
      }
      case 'unwrap': {
        const wrapperEl = this.getNode(id);
        if (!wrapperEl || !wrapperEl.parentNode) {
          this._log('warn', `unwrap: target "${id}" missing — remounting`);
          this._mount();
          return;
        }
        const parent = wrapperEl.parentNode;
        while (wrapperEl.firstChild) {
          parent.insertBefore(wrapperEl.firstChild, wrapperEl);
        }
        this._unregisterElementHierarchy(wrapperEl);
        wrapperEl.remove();
        this._log('op', `unwrap #${id}`);
        break;
      }
      case 'move': {
        const sourceEl = this.getNode(id);
        const { targetSemanticId, position } = payload || {};
        const targetId = normalizeId(targetSemanticId);
        const targetEl = this.getNode(targetId);

        if (!sourceEl || !targetEl) {
          this._log('warn', `move: source "${id}" or target "${targetId}" missing — remounting`);
          this._mount();
          return;
        }

        if (position === 'before') {
          targetEl.parentNode?.insertBefore(sourceEl, targetEl);
        } else if (position === 'after') {
          targetEl.parentNode?.insertBefore(sourceEl, targetEl.nextSibling);
        } else {
          targetEl.appendChild(sourceEl);
        }
        this._log('op', `move #${id} -> ${position} #${targetId}`);
        break;
      }
      case 'remove': {
        const nodes = this.getLiveNodes(id);
        if (nodes.length === 0) {
          this._log('warn', `remove: #${id} not in liveMap`);
          return;
        }
        for (const el of nodes) {
          this._unregisterElementHierarchy(el);
          el.remove();
        }
        // Also cleanup loop bindings associated with this semantic ID
        this._loopBindings = this._loopBindings.filter((l) => l.node.semanticId !== id);
        this._log('op', `remove #${id}`);
        break;
      }
      case 'update': {
        const el = this.getNode(id);
        if (!el) {
          this._log('warn', `update: #${id} missing — remounting`);
          this._mount();
          return;
        }
        const patch = payload || {};
        if (patch.tag && patch.tag.toLowerCase() !== el.tagName.toLowerCase()) {
          const next = document.createElement(String(patch.tag).toLowerCase());
          for (const attr of el.attributes) next.setAttribute(attr.name, attr.value);
          while (el.firstChild) next.appendChild(el.firstChild);
          el.parentNode?.replaceChild(next, el);
          this._unregisterNode(id, el);
          const finalId = patch.semanticId ? normalizeId(patch.semanticId) : id;
          if (patch.semanticId && finalId !== id) {
            next.classList.remove(id);
            next.classList.add(finalId);
            next.setAttribute('wdl-comp', finalId);
          }
          this._registerNode(finalId, next);
        } else if (patch.semanticId && normalizeId(patch.semanticId) !== id) {
          const newId = normalizeId(patch.semanticId);
          el.classList.remove(id);
          el.classList.add(newId);
          el.setAttribute('wdl-comp', newId);
          this._unregisterNode(id, el);
          this._registerNode(newId, el);
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
      const nodes = this.getLiveNodes(id);
      if (nodes.length === 0) {
        this._log('warn', `attr: #${id} not in liveMap`);
        return;
      }
      const compData = this._getComponentData();
      for (const el of nodes) {
        const idx = el.getAttribute('data-wdl-index');
        let scope = compData;
        if (idx !== null && idx !== undefined) {
          const indexNum = parseInt(idx, 10);
          const loop = this._findLoopForElement(el);
          if (loop) {
            const items = resolvePath(compData, loop.repeator);
            if (Array.isArray(items) && items[indexNum] !== undefined) {
              scope = this._createItemScope(items[indexNum], indexNum, compData);
            } else {
              scope = { ...compData, _index: indexNum };
            }
          } else {
            scope = { ...compData, _index: indexNum };
          }
        }
        const resolved = resolveAll(payload || {}, scope);
        this._applyPropsToElement(el, id, resolved);
      }
      this._log('op', `attr.${action} #${id}`, payload);
      return;
    }

    if (action === 'remove') {
      const nodes = this.getLiveNodes(id);
      if (nodes.length === 0) return;
      const attrKey = payload;
      for (const el of nodes) {
        if (attrKey == null || attrKey === '') {
          el.textContent = '';
          el.className = id;
        } else if (attrKey === 'text') {
          el.textContent = '';
        } else if (attrKey === 'class') {
          el.className = id;
        } else if (attrKey === 'html') {
          el.innerHTML = '';
        } else {
          el.removeAttribute(attrKey);
        }
      }
      this._log('op', `attr.remove ${attrKey || 'all'} from #${id}`);
    }
  }

  _applyAttrs(id, props) {
    const nodes = this.getLiveNodes(id);
    if (nodes.length === 0) {
      this._log('warn', `attr: #${id} not in liveMap`);
      return;
    }
    const compData = this._getComponentData();
    for (const el of nodes) {
      const idx = el.getAttribute('data-wdl-index');
      let scope = compData;
      if (idx !== null && idx !== undefined) {
        const indexNum = parseInt(idx, 10);
        const loop = this._findLoopForElement(el);
        if (loop) {
          const items = resolvePath(compData, loop.repeator);
          if (Array.isArray(items) && items[indexNum] !== undefined) {
            scope = this._createItemScope(items[indexNum], indexNum, compData);
          } else {
            scope = { ...compData, _index: indexNum };
          }
        }
      }
      const resolved = resolveAll(props || {}, scope);
      this._applyPropsToElement(el, id, resolved);
    }
  }

  _findLoopForElement(el) {
    return this._loopBindings.find((l) => l.elements.includes(el)) || null;
  }

  // -----------------------------------------------------------------------
  // data:change
  // actions: set | update | remove
  // Surgically reconciles repeated loop items & per-item template bindings
  // -----------------------------------------------------------------------

  _handleData(event) {
    const { action, targetId, payload } = event;
    const path = targetId || '';
    const compData = this._getComponentData();

    // 1. Surgically reconcile all matching loop bindings
    this._reconcileLoops(path, compData);

    // 2. Reconcile non-loop elements bound to this path or full data
    this._reconcileStaticDataBindings(path, compData);

    // 3. Optional onDataBind callback hook for external consumers
    if (typeof this.onDataBind === 'function') {
      try {
        this.onDataBind(
          this.container,
          path,
          action === 'remove' ? undefined : payload
        );
      } catch (e) {
        this._log('warn', 'onDataBind error', e);
      }
    }
    this._log('op', `data.${action} ${path}`, action === 'remove' ? undefined : payload);
  }

  /**
   * Reconcile loop children surgically on data change.
   */
  _reconcileLoops(path, compData) {
    for (const loop of this._loopBindings) {
      const matches =
        !path ||
        loop.repeator === path ||
        path.startsWith(loop.repeator + '.') ||
        loop.repeator.startsWith(path + '.');

      if (!matches) continue;

      const items = this._resolveLoopItems(loop.repeator, compData);
      const nextCount = items.length;
      const prevCount = loop.elements.length;
      const minCount = Math.min(prevCount, nextCount);

      // 1. Update retained rows in place
      for (let i = 0; i < minCount; i++) {
        const el = loop.elements[i];
        const itemScope = this._createItemScope(items[i], i, compData);
        el.setAttribute('data-wdl-index', String(i));
        if (el.dataset) el.dataset.wdlIndex = String(i);
        this._updateElementSubtree(el, loop.node, itemScope, i);
      }

      // 2. Insert newly added rows
      if (nextCount > prevCount) {
        for (let i = prevCount; i < nextCount; i++) {
          const itemScope = this._createItemScope(items[i], i, compData);
          const newEl = this._createSingleElement(loop.node, itemScope, i);
          if (loop.anchor && loop.anchor.parentNode === loop.parentEl) {
            loop.parentEl.insertBefore(newEl, loop.anchor);
          } else if (loop.elements.length > 0) {
            const lastEl = loop.elements[loop.elements.length - 1];
            loop.parentEl.insertBefore(newEl, lastEl.nextSibling);
          } else {
            loop.parentEl.appendChild(newEl);
          }
          loop.elements.push(newEl);
        }
      }

      // 3. Remove deleted rows
      if (nextCount < prevCount) {
        for (let i = prevCount - 1; i >= nextCount; i--) {
          const delEl = loop.elements[i];
          this._unregisterElementHierarchy(delEl);
          delEl.remove();
          loop.elements.pop();
        }
      }
    }
  }

  /**
   * Update an element and its non-loop children with new itemScope.
   */
  _updateElementSubtree(el, node, itemScope, index) {
    this._applyNodeAttrs(el, node, itemScope);

    if (Array.isArray(node.children) && Array.isArray(el.children)) {
      let childElIdx = 0;
      for (const childNode of node.children) {
        if (childNode.repeator) {
          // Nested loop: find its binding and reconcile
          const childLoop = this._loopBindings.find(
            (l) => l.parentEl === el && l.node === childNode
          );
          if (childLoop) {
            this._reconcileLoops(childLoop.repeator, itemScope);
          }
        } else if (el.children[childElIdx]) {
          this._updateElementSubtree(
            el.children[childElIdx],
            childNode,
            itemScope,
            index
          );
          childElIdx++;
        }
      }
    }
  }

  /**
   * Update non-loop live elements that reference template data bindings.
   */
  _reconcileStaticDataBindings(path, compData) {
    const attrMap = this._getComponentAttrMap();
    for (const [key, props] of Object.entries(attrMap)) {
      const id = normalizeId(key);
      const str = JSON.stringify(props);
      if (!str.includes('${') && !str.includes('{{')) continue;
      if (path && !str.includes(path)) continue;

      const nodes = this.getLiveNodes(id);
      for (const el of nodes) {
        // Skip elements governed by loops as they are reconciled separately
        if (el.hasAttribute('data-wdl-index') || this._findLoopForElement(el)) continue;
        const resolved = resolveAll(props, compData);
        this._applyPropsToElement(el, id, resolved);
      }
    }
  }

  // -----------------------------------------------------------------------
  // variant:change
  // action: set   targetId = semanticId (or component id)  payload = variantName
  // -----------------------------------------------------------------------

  _handleVariant(event) {
    const { targetId, payload } = event;
    const id = normalizeId(targetId) || this._rootSemanticId();
    const el = this.getNode(id);
    if (!el) {
      const rootId = this._rootSemanticId();
      const rootEl = rootId ? this.getNode(rootId) : null;
      if (rootEl) {
        if (payload) rootEl.dataset.variant = String(payload);
        else delete rootEl.dataset.variant;
        this._refreshElementClasses(rootEl, rootId);
        this._log('op', `variant → ${payload || '(none)'} on #${rootId}`);
      }
      return;
    }
    if (payload) el.dataset.variant = String(payload);
    else delete el.dataset.variant;
    this._refreshElementClasses(el, id);
    this._log('op', `variant → ${payload || '(none)'} on #${id}`);
  }

  _applyRootVariant() {
    const attr = this._getComponentAttrMap();
    const rootId = this._rootSemanticId();
    if (!rootId) return;
    const rootKey = '.' + rootId;
    const variant =
      attr[rootKey]?.['data-variant'] ??
      attr['.']?.['data-variant'] ??
      null;
    if (variant && this.liveMap.has(rootId)) {
      const el = this.getNode(rootId);
      if (el && el.dataset) {
        el.dataset.variant = String(variant);
        this._refreshElementClasses(el, rootId);
      }
    }
  }

  _rootSemanticId() {
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
    this._refreshAllElementClasses();
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

