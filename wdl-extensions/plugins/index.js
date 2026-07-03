// wdl-extensions/plugins — install-order component/script/registry-token resolution across
// installed plugins. Sits between project-local and system-tier component lookup — compose it
// with core's default resolver and (optionally) system-components via wdl-extensions/compose.js.
//
// Requires your Store to also implement:
//   listPlugins(project) => Promise<Array<{ id, components?, scripts?, registry_tokens? }>>
//
// A plugin manifest shape: { id, components?: [{id, emmet, attr, script_deps}], scripts?: [...],
// registry_tokens?: {} }.
//
// Usage:
//   const plugins = await store.listPlugins(project);
//   await composePage(withPlugins(store, plugins), project, page, {
//     resolveComponent: composeResolvers(coreResolveComponent, createPluginResolver(plugins)),
//     extraScripts: collectPluginScripts(plugins),
//   });

// withPlugins — wraps a store so:
//   - getComponentRegistry also merges each plugin's registry_tokens (install order; later
//     plugins win on key collision)
//   - getScript falls back to a plugin manifest's `scripts` array when store.getScript(project, id)
//     returns null — so a component's script_deps can reference a plugin-only script id
// Same behavior core used to implement internally.
export function withPlugins(store, plugins) {
  return {
    ...store,
    getComponentRegistry: async (project) => {
      const base = await store.getComponentRegistry(project);
      return (plugins || []).reduce((reg, p) => ({ ...reg, ...(p.registry_tokens || {}) }), { ...base });
    },
    getScript: async (project, id) => {
      const found = await store.getScript(project, id);
      if (found) return found;
      for (const plugin of plugins || []) {
        const s = plugin.scripts?.find(sc => sc.id === id);
        if (s) return s;
      }
      return null;
    },
  };
}

// createPluginResolver(plugins) → resolveComponent-compatible function that checks each plugin's
// `components` array (in install order) for a matching id.
export function createPluginResolver(plugins) {
  return async function resolvePluginComponent(store, project, block) {
    if (block.emmet || !block.component) return null;
    for (const plugin of plugins || []) {
      const found = plugin.components?.find(c => c.id === block.component);
      if (found) {
        return {
          emmet:        found.emmet,
          attr:         { ...found.attr, ...(block.style_overrides || {}) },
          _script_deps: found.script_deps || [],
        };
      }
    }
    return null;
  };
}

// collectPluginScripts(plugins) → flat array of plugin-manifest scripts, for composePage's
// opts.extraScripts.
export function collectPluginScripts(plugins) {
  return (plugins || []).flatMap(p => p.scripts || []);
}
