// @wdl/core — schema-version.js
// Extracts and normalizes schema versions for top-level pages/layouts and individual sub-schemas
// (REGISTRY, COMPONENTS, DATA).

/**
 * Resolves normalized schema versions from a WDL page or layout definition object.
 * Defaults to current core standards (schema_version: '0.2.0', sub-schemas: '2.0').
 *
 * @param {Object} page - WDL page or layout object
 * @returns {Object} { schema_version, registry_version, components_version, data_version }
 */
export function resolveSchemaVersions(page = {}) {
  if (!page || typeof page !== 'object') {
    return {
      schema_version: '0.2.0',
      registry_version: '2.0',
      components_version: '2.0',
      data_version: '2.0',
    };
  }

  const schema_version = page.schema_version
    || page.$schema_version
    || page.version
    || '0.2.0';

  const registry_version = page.REGISTRY?.$version
    || page.REGISTRY?.version
    || '2.0';

  let components_version = '2.0';
  if (Array.isArray(page.COMPONENTS)) {
    components_version = page.COMPONENTS[0]?.$version
      || page.COMPONENTS[0]?.version
      || '2.0';
  } else if (page.COMPONENTS && typeof page.COMPONENTS === 'object') {
    components_version = page.COMPONENTS.$version
      || page.COMPONENTS.version
      || '2.0';
  }

  const data_version = page.DATA?.$version
    || page.DATA?.version
    || '2.0';

  return {
    schema_version,
    registry_version,
    components_version,
    data_version,
  };
}
