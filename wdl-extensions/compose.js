// wdl-extensions/compose.js — chain multiple resolveComponent-compatible functions together so
// several extensions (forms, plugins, system-components, queries) can plug into the SAME
// composePage({ resolveComponent }) hook at once, in priority order.
//
// Usage:
//   import { composePage } from '@wdl/core';
//   import { resolveComponent as resolveProjectLocal } from '@wdl/core'; // core's default tier
//   import { composeResolvers } from '@wdl/core/extensions/compose';
//   import { createFormResolver } from '@wdl/core/extensions/forms';
//   import { createPluginResolver } from '@wdl/core/extensions/plugins';
//   import { createSystemComponentResolver } from '@wdl/core/extensions/system-components';
//
//   const resolveComponent = composeResolvers(
//     createFormResolver({ siteKey }),          // special-case: system "form" component
//     resolveProjectLocal,                       // project-local (core default)
//     createPluginResolver(plugins),             // plugins, install order
//     createSystemComponentResolver(),           // read-only system components
//   );
//   await composePage(store, project, page, { resolveComponent });
//
// Each resolver is tried in order; the first to return a non-null result wins for that block, so
// list resolvers most-specific-first (e.g. forms before the generic project-local tier). The
// queries extension (createQueryResolver) is a special case — it re-implements the project-local
// lookup itself, so it REPLACES `resolveProjectLocal` in the list rather than sitting alongside it;
// see wdl-extensions/queries/index.js.

export function composeResolvers(...resolvers) {
  return async function composedResolver(store, project, block, designCtx) {
    for (const resolve of resolvers) {
      if (!resolve) continue;
      const result = await resolve(store, project, block, designCtx);
      if (result) return result;
    }
    return null;
  };
}
