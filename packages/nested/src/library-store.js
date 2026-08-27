/**
 * @ruledwdl/nested — Library Store Adapter
 *
 * Pluggable Store adapter conforming to the WDL Store contract that provides
 * component catalog lookups, layout retrieval, and composite registry compilation
 * from standard `wdl-components-library.json` files or in-memory definitions.
 */

import { normalizeRegistry, mergeRegistries } from './registry-merger.js';

/**
 * Creates a WDL Store backed by a component library catalog.
 *
 * @param {object} [options={}]
 * @param {object|Array} [options.library] - `wdl-components-library.json` payload or components array
 * @param {object} [options.layouts={}] - Map of layout definitions { [layoutId]: layoutDef }
 * @param {object} [options.scripts={}] - Map of script strings { [scriptId]: scriptContent }
 * @param {object} [options.baseStore] - Optional underlying store to fallback to
 * @returns {object} WDL Store conforming to @ruledwdl/core Store contract
 */
export function createLibraryStore(options = {}) {
  const {
    library = null,
    layouts = {},
    scripts = {},
    baseStore = null
  } = options;

  const componentMap = new Map();

  // Ingest library components
  if (library) {
    const rawList = Array.isArray(library)
      ? library
      : Array.isArray(library.components)
        ? library.components
        : typeof library === 'object'
          ? Object.entries(library).map(([id, def]) => ({ id, definition: def }))
          : [];

    for (const item of rawList) {
      if (!item || !item.id) continue;
      const cleanId = String(item.id).replace(/^@\{?|\}$/g, '');
      const def = item.definition || item;
      componentMap.set(cleanId, structuredClone(def));
    }
  }

  return {
    /**
     * Retrieve a layout definition by name.
     */
    async getLayout(project, name) {
      if (layouts[name]) {
        const layout = structuredClone(layouts[name]);
        if (layout.REGISTRY) {
          layout.REGISTRY = normalizeRegistry(layout.REGISTRY);
        }
        return layout;
      }
      if (baseStore && typeof baseStore.getLayout === 'function') {
        return await baseStore.getLayout(project, name);
      }
      return null;
    },

    /**
     * Retrieve a component definition by ID.
     */
    async getComponent(project, id) {
      const cleanId = String(id).replace(/^@\{?|\}$/g, '');
      if (componentMap.has(cleanId)) {
        const def = structuredClone(componentMap.get(cleanId));
        if (def.REGISTRY) {
          def.REGISTRY = normalizeRegistry(def.REGISTRY);
        }
        return def;
      }
      if (baseStore && typeof baseStore.getComponent === 'function') {
        return await baseStore.getComponent(project, id);
      }
      return null;
    },

    /**
     * Retrieve a script by ID.
     */
    async getScript(project, id) {
      if (scripts[id]) return scripts[id];
      if (baseStore && typeof baseStore.getScript === 'function') {
        return await baseStore.getScript(project, id);
      }
      return null;
    },

    /**
     * Compile composite component registry across all catalog components.
     */
    async getComponentRegistry(project) {
      let compositeRegistry = {};

      for (const def of componentMap.values()) {
        const compRegistry = def.REGISTRY || def.definition?.REGISTRY;
        if (compRegistry) {
          compositeRegistry = mergeRegistries(compositeRegistry, compRegistry);
        }
      }

      if (baseStore && typeof baseStore.getComponentRegistry === 'function') {
        const baseReg = await baseStore.getComponentRegistry(project);
        if (baseReg) {
          compositeRegistry = mergeRegistries(compositeRegistry, baseReg);
        }
      }

      return compositeRegistry;
    },

    /**
     * List all registered component IDs in the library.
     */
    listComponents() {
      return Array.from(componentMap.keys());
    },

    /**
     * Register or override a component in the catalog at runtime.
     */
    registerComponent(id, definition) {
      const cleanId = String(id).replace(/^@\{?|\}$/g, '');
      componentMap.set(cleanId, structuredClone(definition));
    }
  };
}
