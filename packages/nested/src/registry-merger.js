/**
 * @ruledwdl/nested — Registry Normalization & Aggregation
 *
 * Normalizes Schema v2.0 and Schema v2.1 component registries and merges them cleanly
 * into page-level registries without attribute or selector clashes.
 */

/**
 * Normalizes a REGISTRY block to ensure compatibility across Schema v2.0 ('base' / 'class')
 * and Schema v2.1 ('rules' / 'vars').
 *
 * @param {object} [registry={}] - Component or page registry object
 * @returns {object} Normalized registry object
 */
export function normalizeRegistry(registry = {}) {
  if (!registry || typeof registry !== 'object') return {};

  const normalized = {};

  for (const [key, val] of Object.entries(registry)) {
    if (key === '$version') {
      normalized.$version = val;
      continue;
    }

    if (key === '__tokens__') {
      normalized.__tokens__ = structuredClone(val);
      continue;
    }

    if (typeof val === 'object' && val !== null) {
      if (Array.isArray(val.rules) || val.vars) {
        // Schema v2.1 Scoped CSS format
        normalized[key] = {
          $version: '2.1',
          class: val.class || val.base || '',
          ...val
        };
      } else {
        // Schema v2.0 Utility class format
        normalized[key] = {
          class: val.class || val.base || '',
          ...val
        };
      }
    } else if (typeof val === 'string') {
      normalized[key] = { class: val };
    } else {
      normalized[key] = val;
    }
  }

  return normalized;
}

/**
 * Merges multiple component registries into a single composite page registry.
 *
 * @param {object} target - Target page registry
 * @param {object} source - Source component registry to merge
 * @returns {object} Merged registry
 */
export function mergeRegistries(target = {}, source = {}) {
  const normTarget = normalizeRegistry(target);
  const normSource = normalizeRegistry(source);

  const result = { ...normTarget };

  for (const [key, val] of Object.entries(normSource)) {
    if (key === '$version') continue;

    if (key === '__tokens__') {
      result.__tokens__ = {
        ...(result.__tokens__ || {}),
        vars: {
          ...(result.__tokens__?.vars || {}),
          ...(val.vars || {})
        }
      };
      continue;
    }

    if (!result[key]) {
      result[key] = structuredClone(val);
    } else {
      // Merge rules if Schema v2.1
      const targetRules = Array.isArray(result[key].rules) ? result[key].rules : [];
      const sourceRules = Array.isArray(val.rules) ? val.rules : [];
      
      const mergedClass = [
        result[key].class || '',
        val.class || ''
      ].filter(Boolean).join(' ');

      result[key] = {
        ...val,
        ...result[key],
        class: [...new Set(mergedClass.split(/\s+/))].filter(Boolean).join(' '),
        rules: [...targetRules, ...sourceRules],
        vars: {
          ...(val.vars || {}),
          ...(result[key].vars || {})
        }
      };
    }
  }

  return result;
}
