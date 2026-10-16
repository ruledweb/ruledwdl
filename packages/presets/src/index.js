/**
 * @ruledwdl/presets — Early preset resolver for RuledWDL
 *
 * Resolves active_preset, replaces layers, and trims registry + attr
 * to only the semantic IDs that remain. Runs before nested and core.
 *
 * @license AGPL-3.0-or-later
 * @author Pradeep Dabane <pradeep@ruledweb.com>
 */

/**
 * Extract semantic IDs from a layers string.
 * Matches tag.semanticId patterns (e.g. div.card, img.image, h3.title).
 */
function collectSemanticIds(layers) {
  if (!layers || typeof layers !== 'string') return new Set();
  const ids = new Set();
  const re = /(?:^|[\s>+])([a-zA-Z][a-zA-Z0-9-]*)\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
  let m;
  while ((m = re.exec(layers)) !== null) {
    ids.add(m[2]);
  }
  return ids;
}

/**
 * Trim an attr map to only selectors that reference remaining semantic IDs.
 */
function trimAttr(attr, semanticIds) {
  if (!attr || typeof attr !== 'object') return attr;
  const out = {};
  for (const [selector, value] of Object.entries(attr)) {
    const id = selector.replace(/^\./, '').split(/[\s>+]/)[0];
    if (semanticIds.has(id) || selector === ':root' || selector.startsWith('data-')) {
      out[selector] = value;
    }
  }
  return out;
}

/**
 * Trim registry to only remaining semantic IDs. Always keep __tokens__.
 */
function trimRegistry(registry, semanticIds) {
  if (!registry || typeof registry !== 'object') return registry;
  const out = {};
  if (registry.$version) out.$version = registry.$version;
  if (registry.__tokens__) out.__tokens__ = registry.__tokens__;
  for (const [key, value] of Object.entries(registry)) {
    if (key === '$version' || key === '__tokens__') continue;
    if (semanticIds.has(key)) out[key] = value;
  }
  return out;
}

/**
 * Resolve presets on a component definition.
 * Returns a new definition with layers replaced, registry/attr trimmed,
 * and presets/active_preset removed.
 */
export function resolvePresets(definition) {
  if (!definition || typeof definition !== 'object') return definition;

  const { presets, active_preset, layers, attr, registry, ...rest } = definition;

  let resolvedLayers = layers;
  if (active_preset && presets && presets[active_preset]) {
    resolvedLayers = presets[active_preset];
  }

  const semanticIds = collectSemanticIds(resolvedLayers);

  const trimmedAttr = trimAttr(attr, semanticIds);
  const trimmedRegistry = trimRegistry(registry, semanticIds);

  // Stamp data-preset on root if active
  if (active_preset && trimmedAttr) {
    const rootId = [...semanticIds][0];
    if (rootId) {
      const rootKey = '.' + rootId;
      trimmedAttr[rootKey] = {
        ...(trimmedAttr[rootKey] || {}),
        'data-preset': active_preset,
      };
    }
  }

  return {
    ...rest,
    layers: resolvedLayers,
    ...(trimmedAttr && Object.keys(trimmedAttr).length ? { attr: trimmedAttr } : {}),
    ...(trimmedRegistry && Object.keys(trimmedRegistry).length ? { registry: trimmedRegistry } : {}),
  };
}

export default resolvePresets;
