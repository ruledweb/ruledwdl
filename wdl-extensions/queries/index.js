// wdl-extensions/queries — dynamic data injection: a component definition's `data_query` field is
// executed at render time and merged into page DATA, and the page is marked non-cacheable.
//
// Requires your Store to also implement:
//   executeQuery(project, query) => Promise<{ inject_as: string, data: any } | null>
//
// Usage:
//   import { composePage } from '@wdl/core';
//   import { createQueryResolver } from '@wdl/core/extensions/queries';
//   await composePage(store, project, page, { resolveComponent: createQueryResolver() });
//
// This resolver covers project-local components only (store.getComponent) — it re-implements core's
// default project-local lookup plus the data_query check, since composePage's `resolveComponent` hook
// only sees composePage's raw output shape, not the intermediate component definition. Because of
// that, IT REPLACES core's default resolveComponent for the project-local tier rather than composing
// alongside it — put it FIRST in composeResolvers (before core's `resolveComponent`), otherwise
// core's resolver will already have resolved local components before this one ever runs. If you also
// need plugin- or system-tier components with data_query, compose your own resolver that checks
// `def.data_query` after whichever tier resolves `def`.
export function createQueryResolver() {
  return async function resolveWithQuery(store, project, block) {
    if (block.emmet || !block.component || !store.executeQuery) return null;

    const def = await store.getComponent(project, block.component);
    if (!def) return null;

    let _data_injection = null;
    if (def.data_query) {
      const qResult = await store.executeQuery(project, def.data_query);
      if (qResult) _data_injection = { [qResult.inject_as]: qResult.data };
    }

    return {
      emmet:        def.emmet,
      attr:         { ...def.attr, ...(block.style_overrides || {}) },
      _script_deps: def.script_deps || [],
      _data_injection,
    };
  };
}
