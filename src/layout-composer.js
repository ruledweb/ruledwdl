// @wdl/core — layout-composer.js
// Host-agnostic composition. All structured reads go through an injected `store` (see store.js) —
// NEVER imports D1/KV/env. Pure renderer core: layout chaining, REGISTRY/DATA merging, script bucket
// dedup, slot injection, design-token cascade. CMS-flavored features (forms, saved queries, plugins,
// system components, per-page CSS override) live in wdl-extensions/* and plug in via the
// `resolveComponent`/`extraScripts` hooks below — core has no built-in knowledge of any of them.
import { renderAll, wrapPage } from './render-engine.js';
import { resolvePath } from './data-resolver.js';

const SLOT = '{{content}}';

export async function resolveLayoutChain(store, project, layoutName) {
  const chain = [];
  let current = layoutName;
  const visited = new Set();
  while (current) {
    if (visited.has(current)) break;
    visited.add(current);
    const layout = await store.getLayout(project, current);
    if (!layout) break;
    chain.unshift(layout); // outermost first
    current = layout.extends || null;
  }
  return chain;
}

export async function loadDesignContext(store, project) {
  const componentRegistry = await store.getComponentRegistry(project);
  return { componentRegistry };
}

// Default component resolver: project-local lookup only (store.getComponent). Returns null when
// `compId` isn't found locally (NOT a passthrough fallback) so it composes correctly with
// wdl-extensions/compose.js's composeResolvers — a null result means "try the next tier",
// letting plugins/system-components/etc. take over. composePage supplies the final fallback
// if every resolver (including this one) comes back empty.
export async function resolveComponent(store, project, block, designCtx) {
  if (block.emmet) return { ...block, _script_deps: [] };

  const compId = block.component;
  if (!compId) return { ...block, _script_deps: [] };

  const def = await store.getComponent(project, compId);
  if (!def) return null;

  return {
    emmet:        def.emmet,
    attr:         { ...def.attr, ...(block.style_overrides || {}) },
    _script_deps: def.script_deps || [],
  };
}

export async function resolveScriptDef(store, project, scriptId) {
  return store.getScript(project, scriptId);
}

function evaluateCondition(condition, data) {
  if (!condition) return true;
  return !!resolvePath(data, condition);
}

// extraScripts — optional array of script defs (or async fn(pageDATA) => script defs) supplied via
// opts.extraScripts, e.g. by the plugins extension to inject plugin-manifest scripts.
export async function collectAndDedupScripts(store, project, resolvedCOMPS, pageScripts, pageDATA, extraScripts) {
  const seen = new Set();
  const srcSeen = new Set();
  const buckets = { head_blocking: [], head_defer: [], body_end: [] };

  function addScript(s) {
    if (!s || !s.id) return;
    if (seen.has(s.id)) return;
    if (s.src && srcSeen.has(s.src)) return;
    if (!evaluateCondition(s.condition, pageDATA)) return;
    seen.add(s.id);
    if (s.src) srcSeen.add(s.src);
    const pos = s.load_position || 'body_end';
    if (buckets[pos]) buckets[pos].push(s);
  }

  // Extension-supplied scripts (e.g. plugin manifests) — resolved before component/page scripts
  // so a page/component script with the same id can still win the dedup race.
  const extra = typeof extraScripts === 'function' ? await extraScripts(pageDATA) : extraScripts;
  for (const s of extra || []) addScript(s);

  // Component script_deps
  for (const comp of resolvedCOMPS) {
    for (const depId of comp._script_deps || []) {
      const def = await resolveScriptDef(store, project, depId);
      if (def) addScript(def);
    }
  }

  // Page-level scripts
  for (const s of pageScripts || []) addScript(s);

  // Tailwind CDN — always present unless overridden by a saved script with id 'tailwind-cdn'
  addScript({ id: 'tailwind-cdn', type: 'external', src: 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4', load_position: 'head_blocking' });
  // Alpine.js — opt-in only: declare script_deps: ['alpine-cdn'] on any component or layout that uses Alpine.

  return buckets;
}

// Collects DATA[key] across the layout chain (base→specific) then the page, same order/shape as
// __head. Each contribution is a raw CSS string (or array of them) — concatenated in that order,
// so later (more specific) contributions win the cascade for any custom property they redeclare.
function collectCssTokens(key, chain, pageData) {
  const parts = [
    ...chain.flatMap(l => [].concat(l.DATA?.[key] || [])),
    ...[].concat(pageData[key] || []),
  ].filter(Boolean);
  return parts.join('\n');
}

function tokenStyleTag(name, css) {
  return css ? `<style data-wdl="${name}">${css}</style>` : '';
}

// Builds the design/brand-token <style> tags for one render: __design_tokens first (layered,
// base layout → page), __brand_tokens second so it always wins any overlapping custom property
// regardless of which level declared it — see docs/WDL-Reference.md "Design tokens".
function buildTokenStyles(chain, pageData) {
  return [
    tokenStyleTag('design-tokens', collectCssTokens('__design_tokens', chain, pageData)),
    tokenStyleTag('brand-tokens', collectCssTokens('__brand_tokens', chain, pageData)),
  ].filter(Boolean);
}

// composePage(store, project, page, opts) → { html, dynamic }.
//   store    — see store.js (the only data source; no env/D1/KV imports).
//   opts.cssDelivery     — { mode:'cdn'|'inline'|'link', css?, href? }. Omit for CDN Tailwind.
//                          Core does NO CSS I/O of its own — pass a pre-resolved value if your
//                          host app looks up per-page CSS overrides.
//   opts.headInject      — extra <head> strings (analytics/verification) appended after page __head.
//   opts.resolveComponent(store, project, block, designCtx) — optional override called BEFORE the
//                          default project-local lookup; return a resolved-component-shaped object
//                          (or null/undefined to fall through to the default). This is how
//                          wdl-extensions/{forms,plugins,system-components,queries} plug in without
//                          core knowing about any of them.
//   opts.extraScripts    — array (or async fn(pageDATA) => array) of extra script defs, e.g. from
//                          the plugins extension's manifest scripts.
export async function composePage(store, project, page, { cssDelivery, headInject, resolveComponent: resolveComponentOverride, extraScripts } = {}) {
  const pageREG   = page.REGISTRY   || {};
  const pageCOMPS = page.COMPONENTS || [];
  const pageDATA  = page.DATA       || {};

  const designCtx = await loadDesignContext(store, project);

  let mergedPageData = { ...pageDATA };
  let hasDynamicComponents = false;

  const resolveBlocks = async (blocks) => {
    const out = [];
    for (const block of blocks || []) {
      const resolved = (resolveComponentOverride && await resolveComponentOverride(store, project, block, designCtx))
        || await resolveComponent(store, project, block, designCtx)
        || { ...block, _script_deps: [] };
      out.push(resolved);
      if (resolved._data_injection) {
        mergedPageData = { ...mergedPageData, ...resolved._data_injection };
        hasDynamicComponents = true;
      }
      if (block.data_overrides) mergedPageData = { ...mergedPageData, ...block.data_overrides };
    }
    return out;
  };

  const resolvedCOMPS = await resolveBlocks(pageCOMPS);

  const chain = page.layout ? await resolveLayoutChain(store, project, page.layout) : [];
  const resolvedLayerCOMPS = [];   // parallel to `chain`
  for (const layout of chain) {
    resolvedLayerCOMPS.push(await resolveBlocks(layout.COMPONENTS || []));
  }
  const allLayoutCOMPS = resolvedLayerCOMPS.flat();

  let mergedReg = { ...(designCtx.componentRegistry || {}), ...pageREG };

  const scriptBuckets = await collectAndDedupScripts(store, project, [...resolvedCOMPS, ...allLayoutCOMPS], page.scripts || null, mergedPageData, extraScripts);

  const seo = mergedPageData.__seo || null;
  const css = cssDelivery !== undefined ? cssDelivery : null;

  const ret = (html) => ({ html, dynamic: hasDynamicComponents });
  const inject = [].concat(headInject || []).filter(Boolean);

  if (!chain.length) {
    const head0 = [...buildTokenStyles([], mergedPageData), ...[].concat(mergedPageData.__head || []), ...inject].filter(Boolean);
    return ret(wrapPage(renderAll(mergedReg, resolvedCOMPS, mergedPageData), page.title, scriptBuckets, seo, css, head0));
  }

  const mergedData = Object.assign({}, ...chain.map(l => l.DATA || {}), mergedPageData);
  mergedReg = Object.assign({}, mergedReg, ...chain.map(l => l.REGISTRY || {}), pageREG);

  let html = renderAll(mergedReg, resolvedCOMPS, mergedData);

  for (let i = chain.length - 1; i >= 0; i--) {
    const layerReg = Object.assign({}, ...chain.slice(0, i + 1).map(l => l.REGISTRY || {}), mergedReg);
    const layoutHTML = renderAll(layerReg, resolvedLayerCOMPS[i], mergedData);
    html = layoutHTML.includes(SLOT) ? layoutHTML.replace(SLOT, html) : layoutHTML + html;
  }

  if (chain[0]?.fullPage === true) return ret(html || '<!DOCTYPE html><html><body></body></html>');
  const headExtra = [
    ...buildTokenStyles(chain, mergedPageData),
    ...chain.flatMap(l => [].concat(l.DATA?.__head || [])),
    ...[].concat(mergedPageData.__head || []),
    ...inject,
  ].filter(Boolean);
  return ret(wrapPage(html, page.title, scriptBuckets, seo, css, headExtra));
}
