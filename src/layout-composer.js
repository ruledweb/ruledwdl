// @wdl/core — layout-composer.js
// Host-agnostic composition. All structured reads go through an injected `store` (see store.js) —
// NEVER imports D1/KV/env. Logic is a 1:1 port of RuledWeb's renderer so output is byte-identical;
// only the data source is abstracted. CSS delivery + turnstile key + head injection are options.
import { renderAll, wrapPage } from './render-engine.js';
import { resolvePath } from './data-resolver.js';
import { renderForm } from './form-renderer.js';

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
  const [tokens, componentRegistry, plugins] = await Promise.all([
    store.getDesignTokens(project),
    store.getComponentRegistry(project),
    store.listPlugins(project),
  ]);
  return { tokens, componentRegistry, plugins: plugins || [] };
}

export async function resolveComponent(store, project, block, designCtx) {
  if (block.emmet) return { ...block, _script_deps: [] };

  const compId = block.component;
  if (!compId) return { ...block, _script_deps: [] };

  // System "form" component — renders a saved form definition (loaded by id) into finished <form>
  // HTML via form-renderer.js. The page only references the form by id; fields/honeypot/turnstile
  // come from the stored definition (single source of truth). Emitted through the _raw_html hatch.
  if (compId === 'form') {
    const o = block.data_overrides || {};
    const formId = o.form_id;
    const form = formId ? await store.getForm(project, formId) : null;
    if (!form) {
      return { _raw_html: `<!-- rw:form '${formId || ''}' not found -->`, _script_deps: [] };
    }
    const html = renderForm(form, {
      siteKey:     designCtx?.turnstileSiteKey || null,
      submitLabel: o.submit_label || 'Send',
    });
    return { _raw_html: html, _script_deps: [] };
  }

  let def = null;

  // 1. Project-local
  def = await store.getComponent(project, compId);

  // 2. Plugins
  if (!def && designCtx?.plugins?.length) {
    for (const plugin of designCtx.plugins) {
      const found = plugin.components?.find(c => c.id === compId);
      if (found) { def = found; break; }
    }
  }

  // 3. System components (read-only)
  if (!def && store.getSystemComponent) {
    const sys = await store.getSystemComponent(project, compId);
    if (sys) def = sys;
  }

  if (!def) return { ...block, _script_deps: [] };

  let _data_injection = null;
  if (def.data_query && store.executeQuery) {
    const qResult = await store.executeQuery(project, def.data_query);
    if (qResult) _data_injection = { [qResult.inject_as]: qResult.data };
  }

  return {
    emmet:           def.emmet,
    attr:            { ...def.attr, ...(block.style_overrides || {}) },
    _script_deps:    def.script_deps || [],
    _data_injection,
  };
}

export async function resolveScriptDef(store, project, scriptId, designCtx) {
  const script = await store.getScript(project, scriptId);
  if (script) return script;

  if (designCtx?.plugins) {
    for (const plugin of designCtx.plugins) {
      if (plugin.scripts) {
        const found = plugin.scripts.find(s => s.id === scriptId);
        if (found) return found;
      }
    }
  }
  return null;
}

function evaluateCondition(condition, data) {
  if (!condition) return true;
  return !!resolvePath(data, condition);
}

export async function collectAndDedupScripts(store, project, resolvedCOMPS, pageScripts, designCtx, pageDATA) {
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

  // Plugin scripts
  for (const plugin of designCtx?.plugins || []) {
    for (const s of plugin.scripts || []) addScript(s);
  }

  // Component script_deps
  for (const comp of resolvedCOMPS) {
    for (const depId of comp._script_deps || []) {
      const def = await resolveScriptDef(store, project, depId, designCtx);
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

// composePage(store, project, page, opts) → { html, dynamic }.
//   store    — see store.js (the only data source; no env/D1/KV imports).
//   opts.cssDelivery     — { mode:'cdn'|'inline'|'link', css?, href? }. When provided the renderer does
//                          NO CSS I/O; when omitted it falls back to store.getPageCss (per-page override).
//   opts.headInject      — extra <head> strings (analytics/verification) appended after page __head.
//   opts.turnstileSiteKey— public Turnstile site key for the form component (null → widget skipped).
//   opts.skipStaticCss   — skip the legacy per-page CSS read.
export async function composePage(store, project, page, { skipStaticCss = false, cssDelivery, headInject, turnstileSiteKey } = {}) {
  const pageREG   = page.REGISTRY   || {};
  const pageCOMPS = page.COMPONENTS || [];
  const pageDATA  = page.DATA       || {};

  const designCtx = await loadDesignContext(store, project);
  designCtx.turnstileSiteKey = turnstileSiteKey || null;

  let mergedPageData = { ...pageDATA };
  let hasDynamicComponents = false;

  const resolveBlocks = async (blocks) => {
    const out = [];
    for (const block of blocks || []) {
      const resolved = await resolveComponent(store, project, block, designCtx);
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

  let mergedReg = { ...(designCtx.componentRegistry || {}) };
  for (const plugin of designCtx.plugins || []) {
    if (plugin.registry_tokens) mergedReg = { ...mergedReg, ...plugin.registry_tokens };
  }
  mergedReg = { ...mergedReg, ...pageREG };

  const scriptBuckets = await collectAndDedupScripts(store, project, [...resolvedCOMPS, ...allLayoutCOMPS], page.scripts || null, designCtx, mergedPageData);

  const seo = mergedPageData.__seo || null;
  const css = cssDelivery !== undefined
    ? cssDelivery
    : ((!skipStaticCss && page.slug && store.getPageCss) ? await store.getPageCss(project, page.slug) : null);

  const ret = (html) => ({ html, dynamic: hasDynamicComponents });
  const inject = [].concat(headInject || []).filter(Boolean);

  if (!chain.length) {
    const head0 = [...[].concat(mergedPageData.__head || []), ...inject].filter(Boolean);
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
    ...chain.flatMap(l => [].concat(l.DATA?.__head || [])),
    ...[].concat(mergedPageData.__head || []),
    ...inject,
  ].filter(Boolean);
  return ret(wrapPage(html, page.title, scriptBuckets, seo, css, headExtra));
}
