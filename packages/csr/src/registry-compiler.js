// src/registry-compiler.js — Synced from @ruledwdl/core
import { expandScopedVars, resolveVariableValue } from './token-expander.js';

/**
 * Expands ${global-token} to var(--global-token) and $_{local-var} to resolved variable expression or raw value.
 *
 * @param {string} val - Raw CSS property value string
 * @param {Object} localVars - Local component vars
 * @param {Object} globalTokens - Global __tokens__.vars
 * @returns {string} Expanded CSS value string
 */
export function expandCssValue(val, localVars = {}, globalTokens = {}) {
  if (typeof val !== 'string') return String(val ?? '');
  let result = val;

  // Replace $_{local-var}
  result = result.replace(/\$_{([a-zA-Z0-9_-]+)}/g, (match, varName) => {
    const res = resolveVariableValue(varName, localVars, globalTokens);
    return res !== null ? res : match;
  });

  // Replace ${global-token}
  result = result.replace(/\${([a-zA-Z0-9_-]+)}/g, (match, tokenName) => {
    return `var(--${tokenName})`;
  });

  return result;
}

/**
 * Compiles component rules array and variant css maps into native @scope CSS blocks.
 *
 * @param {string} key - Component semantic ID (e.g. "card")
 * @param {Object} entry - Resolved REGISTRY entry
 * @param {Object} globalTokens - Global __tokens__.vars
 * @param {string} tag - Tag fallback for @scope selector (default: "div")
 * @returns {string} Compiled @scope CSS string
 */
export function compileComponentRules(key, entry = {}, globalTokens = {}, tag = 'div') {
  if (!entry || typeof entry !== 'object') return '';

  const localVars = entry.vars || {};
  const rootBody = [];
  const nestedBody = [];

  // 1. Process flat rules array
  if (Array.isArray(entry.rules)) {
    for (const rule of entry.rules) {
      if (!rule || !rule.css || typeof rule.css !== 'object') continue;
      const decls = Object.entries(rule.css)
        .map(([p, v]) => `${p}:${expandCssValue(v, localVars, globalTokens)};`)
        .join('');

      const sel = rule.selector || ':scope';
      if (sel === ':scope' && !rule.media) {
        rootBody.push(decls);
      } else if (rule.media) {
        nestedBody.push(`@media ${rule.media}{${sel}{${decls}}}`);
      } else {
        nestedBody.push(`${sel}{${decls}}`);
      }
    }
  }

  // 2. Process variant CSS rule maps
  if (entry.variants && typeof entry.variants === 'object') {
    for (const [vName, vDef] of Object.entries(entry.variants)) {
      if (vDef && typeof vDef === 'object' && vDef.css && typeof vDef.css === 'object') {
        const decls = Object.entries(vDef.css)
          .map(([p, v]) => `${p}:${expandCssValue(v, localVars, globalTokens)};`)
          .join('');
        nestedBody.push(`:scope[data-variant="${vName}"]{${decls}}`);
      }
    }
  }

  if (!rootBody.length && !nestedBody.length) return '';

  const bodyStr = [rootBody.join(''), nestedBody.join('')].filter(Boolean).join('');
  return `@scope (${tag}.${key}){:scope{${bodyStr}}}`;
}

/**
 * Compiles global theme tokens dictionary (__tokens__.vars) into a :root CSS custom property block.
 *
 * @param {Object} tokensVars - Dictionary of token name to value (e.g. { "color-primary": "#4f46e5" })
 * @returns {string} Compiled CSS block string
 */
export function compileGlobalTokens(tokensVars = {}) {
  if (!tokensVars || typeof tokensVars !== 'object') return '';
  const rules = [];
  for (const [key, val] of Object.entries(tokensVars)) {
    if (val != null && val !== '') {
      rules.push(`  --${key}: ${val};`);
    }
  }
  if (!rules.length) return '';
  return `:root {\n${rules.join('\n')}\n}`;
}

/**
 * Recursively resolves inheritance (`uses`) for a registry token key.
 *
 * @param {string} key - Component token key in registry
 * @param {Object} registry - Raw registry dictionary
 * @param {Set} visited - Cycle detection set
 * @returns {Object} Merged v2.0 component token object
 */
export function resolveTokenInheritance(key, registry = {}, visited = new Set()) {
  const raw = registry[key];
  if (!raw || typeof raw !== 'object') return raw || {};
  if (visited.has(key)) return raw; // Prevent cyclic inheritance
  visited.add(key);

  if (!Array.isArray(raw.uses) || !raw.uses.length) {
    return { ...raw };
  }

  // Merge parent entries in order
  let merged = {
    vars: {},
    base: '',
    variants: {},
    states: {},
    breakpoints: {},
    containers: {},
    scopes: {},
    rules: []
  };

  for (const parentKey of raw.uses) {
    const parentResolved = resolveTokenInheritance(parentKey, registry, visited);
    if (parentResolved && typeof parentResolved === 'object') {
      merged.vars = { ...merged.vars, ...(parentResolved.vars || {}) };
      merged.base = [merged.base, parentResolved.base].filter(Boolean).join(' ');
      merged.variants = { ...merged.variants, ...(parentResolved.variants || {}) };
      merged.states = { ...merged.states, ...(parentResolved.states || {}) };
      merged.breakpoints = { ...merged.breakpoints, ...(parentResolved.breakpoints || {}) };
      merged.containers = { ...merged.containers, ...(parentResolved.containers || {}) };
      merged.scopes = { ...merged.scopes, ...(parentResolved.scopes || {}) };
      merged.rules = [...merged.rules, ...(parentResolved.rules || [])];
    }
  }

  // Merge child (current entry) on top of inherited parent
  return {
    ...merged,
    ...raw,
    vars: { ...merged.vars, ...(raw.vars || {}) },
    base: [merged.base, raw.base].filter(Boolean).join(' '),
    variants: { ...merged.variants, ...(raw.variants || {}) },
    states: { ...merged.states, ...(raw.states || {}) },
    breakpoints: { ...merged.breakpoints, ...(raw.breakpoints || {}) },
    containers: { ...merged.containers, ...(raw.containers || {}) },
    scopes: { ...merged.scopes, ...(raw.scopes || {}) },
    rules: [...merged.rules, ...(raw.rules || [])]
  };
}

/**
 * Normalizes a single REGISTRY entry (v1.0 string/object or v2.0 structured object)
 * into a flat element attribute object { class: "..." }.
 *
 * @param {Object|string} entry - Raw registry entry
 * @param {Object} globalTokens - Global __tokens__.vars
 * @returns {Object} Normalized flat attribute object
 */
export function normalizeRegistryEntry(entry, globalTokens = {}) {
  if (!entry) return {};

  // Case 1: Legacy v1.0 String (e.g. "p-4 bg-white")
  if (typeof entry === 'string') {
    return { class: entry };
  }

  // Case 2: Detect V2.0 / V2.1 Structured Entry
  const isV2 = typeof entry === 'object' && (
    'base' in entry ||
    'variants' in entry ||
    'states' in entry ||
    'breakpoints' in entry ||
    'containers' in entry ||
    'scopes' in entry ||
    'uses' in entry ||
    'vars' in entry ||
    'rules' in entry
  );

  // Case 3: Legacy v1.0 Flat Attribute Object (e.g. { class: "p-4", text: "${title}" })
  if (!isV2) {
    return { ...entry };
  }

  // Case 4: V2.0 / V2.1 Structured Entry Compilation
  const localVars = entry.vars || {};
  const classes = [];

  // Base utilities
  if (entry.base) {
    classes.push(expandScopedVars(entry.base, localVars, globalTokens));
  }

  // Default Variant (or variants map)
  let activeVariant = entry.defaultVariant || null;
  if (entry.variants && typeof entry.variants === 'object') {
    const variantNames = Object.keys(entry.variants);
    if (!activeVariant && variantNames.length > 0) {
      activeVariant = variantNames[0];
    }
    if (activeVariant && entry.variants[activeVariant]) {
      const vVal = entry.variants[activeVariant];
      if (typeof vVal === 'string') {
        classes.push(expandScopedVars(vVal, localVars, globalTokens));
      }
    }
  }

  // States (e.g. hover, focus)
  if (entry.states && typeof entry.states === 'object') {
    for (const [state, cls] of Object.entries(entry.states)) {
      if (typeof cls === 'string' && cls) {
        const expanded = expandScopedVars(cls, localVars, globalTokens);
        const formatted = expanded.split(' ').map(c => (c.includes(':') ? c : `${state}:${c}`)).join(' ');
        classes.push(formatted);
      }
    }
  }

  // Breakpoints (e.g. md, lg)
  if (entry.breakpoints && typeof entry.breakpoints === 'object') {
    for (const [bp, cls] of Object.entries(entry.breakpoints)) {
      if (typeof cls === 'string' && cls) {
        const expanded = expandScopedVars(cls, localVars, globalTokens);
        const formatted = expanded.split(' ').map(c => (c.includes(':') ? c : `${bp}:${c}`)).join(' ');
        classes.push(formatted);
      }
    }
  }

  // Containers (e.g. @sm, @md)
  if (entry.containers && typeof entry.containers === 'object') {
    for (const [cont, cls] of Object.entries(entry.containers)) {
      if (typeof cls === 'string' && cls) {
        const expanded = expandScopedVars(cls, localVars, globalTokens);
        const formatted = expanded.split(' ').map(c => (c.includes(':') ? c : `${cont}:${c}`)).join(' ');
        classes.push(formatted);
      }
    }
  }

  const finalClass = classes.filter(Boolean).join(' ');

  // Preserve non-V2 extra attributes (e.g. text, attr-ref, x-data, data-variant)
  const SKIP_V2_KEYS = new Set(['base', 'variants', 'defaultVariant', 'states', 'breakpoints', 'containers', 'scopes', 'uses', 'vars', 'rules']);
  const extraAttrs = {};
  for (const [k, v] of Object.entries(entry)) {
    if (!SKIP_V2_KEYS.has(k)) {
      extraAttrs[k] = v;
    }
  }

  // Set data-variant attribute if activeVariant is present and not explicitly set
  if (activeVariant && !('data-variant' in extraAttrs)) {
    extraAttrs['data-variant'] = activeVariant;
  }

  return {
    class: finalClass,
    ...extraAttrs
  };
}

/**
 * Normalizes an entire REGISTRY object:
 * 1. Extracts __tokens__.vars and generates theme CSS.
 * 2. Resolves token inheritance (uses).
 * 3. Normalizes entries into flat class attribute objects and compiles component CSS rules.
 *
 * @param {Object} rawRegistry - Incoming raw REGISTRY object
 * @returns {Object} { normalizedRegistry, themeCss, componentCss }
 */
export function normalizeRegistry(rawRegistry = {}) {
  if (!rawRegistry || typeof rawRegistry !== 'object') {
    return { normalizedRegistry: {}, themeCss: '', componentCss: '' };
  }

  const globalTokens = rawRegistry.__tokens__?.vars || {};
  const themeCss = compileGlobalTokens(globalTokens);

  const normalizedRegistry = {};
  const componentCssRules = [];

  for (const key of Object.keys(rawRegistry)) {
    if (key === '__tokens__' || key === '$version') continue;
    const resolvedEntry = resolveTokenInheritance(key, rawRegistry);
    normalizedRegistry[key] = normalizeRegistryEntry(resolvedEntry, globalTokens);

    const compCss = compileComponentRules(key, resolvedEntry, globalTokens);
    if (compCss) {
      componentCssRules.push(compCss);
    }
  }

  const componentCss = componentCssRules.join('\n');

  return { normalizedRegistry, themeCss, componentCss };
}

