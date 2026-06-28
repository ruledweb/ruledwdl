// @wdl/core — store.js
// The Store is the renderer's ONLY data source: a plain object of async methods. Any backend
// implements it (D1/KV in RuledWeb, an HTTP API, a folder of JSON files via ./stores/file-store.js,
// or the in-memory store below). This keeps the renderer host-agnostic — it never imports storage.
//
// @typedef {Object} Store
// @property {(project:string, name:string)   => Promise<object|null>} getLayout
// @property {(project:string, id:string)     => Promise<object|null>} getComponent
// @property {(project:string, id:string)     => Promise<object|null>} getScript
// @property {(project:string, id:string)     => Promise<object|null>} [getSystemComponent]  read-only system components
// @property {(project:string, id:string)     => Promise<object|null>} getForm
// @property {(project:string)                => Promise<object|null>} getDesignTokens
// @property {(project:string)                => Promise<object>}      getComponentRegistry   named class → utilities
// @property {(project:string)                => Promise<Array>}       listPlugins
// @property {(project:string, query:any)     => Promise<{inject_as:string,data:any}|null>} [executeQuery]  dynamic components
// @property {(project:string, slug:string)   => Promise<string|null>} [getPageCss]           per-page CSS override

// In-memory store — pure (Workers-safe), handy for tests and embedding. Pass any subset of the keys.
export function createMemoryStore(data = {}) {
  const d = {
    layouts: {}, components: {}, scripts: {}, system: {}, forms: {}, queries: {},
    designTokens: null, componentRegistry: {}, plugins: [], pageCss: {}, ...data,
  };
  const qid = (q) => (typeof q === 'string' ? q : (q && q.id) || '');
  return {
    getLayout:            async (_p, name) => d.layouts[name]    || null,
    getComponent:         async (_p, id)   => d.components[id]   || null,
    getScript:            async (_p, id)   => d.scripts[id]      || null,
    getSystemComponent:   async (_p, id)   => d.system[id]       || null,
    getForm:              async (_p, id)   => d.forms[id]        || null,
    getDesignTokens:      async (_p)       => d.designTokens     || null,
    getComponentRegistry: async (_p)       => d.componentRegistry || {},
    listPlugins:          async (_p)       => d.plugins          || [],
    executeQuery:         async (_p, q)    => d.queries[qid(q)]  || null,
    getPageCss:           async (_p, slug) => d.pageCss[slug]    || null,
  };
}
