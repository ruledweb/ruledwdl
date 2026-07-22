// @wdl/core — store.js
// The Store is the renderer's ONLY data source: a plain object of async methods. Any backend
// implements it (D1/KV in a host CMS, an HTTP API, a folder of JSON files via ./stores/file-store.js,
// or the in-memory store below). This keeps the renderer host-agnostic — it never imports storage.
//
// This is the CORE interface — only what layout-composer.js itself reads. Extensions
// (wdl-extensions/{forms,queries,plugins,system-components}) require additional Store methods of
// their own (getForm, executeQuery, listPlugins, getSystemComponent, ...); since Store is duck-typed,
// a single store object can implement the core methods plus whatever extras your chosen extensions
// need — see each extension's README for its required methods.
//
// @typedef {Object} Store
// @property {(project:string, name:string)   => Promise<object|null>} getLayout
// @property {(project:string, id:string)     => Promise<object|null>} getComponent
// @property {(project:string, id:string)     => Promise<object|null>} getScript
// @property {(project:string)                => Promise<object>}      getComponentRegistry   named class → utilities
//
// Design/brand tokens are NOT a store concept — they're authored directly in WDL JSON via the
// reserved DATA.__design_tokens / DATA.__brand_tokens keys (layered across the layout chain + page,
// see docs/ruledwdl-reference.md), so there is no getDesignTokens method here.

// In-memory store — pure (Workers-safe), handy for tests and embedding. Pass any subset of the keys.
export function createMemoryStore(data = {}) {
  const d = {
    layouts: {}, components: {}, scripts: {},
    componentRegistry: {}, ...data,
  };
  return {
    getLayout:            async (_p, name) => d.layouts[name]    || null,
    getComponent:         async (_p, id)   => d.components[id]   || null,
    getScript:            async (_p, id)   => d.scripts[id]      || null,
    getComponentRegistry: async (_p)       => d.componentRegistry || {},
  };
}
