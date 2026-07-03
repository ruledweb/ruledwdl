// wdl-extensions/system-components — a read-only, built-in component library tier, checked after
// project-local and plugin components. Compose with core's default resolver (and optionally
// plugins) via wdl-extensions/compose.js.
//
// Requires your Store to also implement:
//   getSystemComponent(project, id) => Promise<{ emmet, attr?, script_deps? } | null>

export function createSystemComponentResolver() {
  return async function resolveSystemComponent(store, project, block) {
    if (block.emmet || !block.component || !store.getSystemComponent) return null;
    const def = await store.getSystemComponent(project, block.component);
    if (!def) return null;
    return {
      emmet:        def.emmet,
      attr:         { ...def.attr, ...(block.style_overrides || {}) },
      _script_deps: def.script_deps || [],
    };
  };
}
