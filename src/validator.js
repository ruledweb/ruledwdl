// src/renderer/validator.js

export function validateDataAgainstSchema(data, schema) {
  if (!schema) return { valid: true, errors: [] };
  const errors = [];
  for (const [field, def] of Object.entries(schema)) {
    const typeStr = (def.type || def).toLowerCase();
    const value = data[field];

    if (def.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, expected: typeStr, got: 'missing', message: `Required field "${field}" is missing` });
      continue;
    }
    if (value === undefined || value === null) continue; // Optional field not set

    if (typeStr === 'string' && typeof value !== 'string') {
      errors.push({ field, expected: 'string', got: typeof value, message: `Field "${field}" expected string, got ${typeof value}` });
    } else if (typeStr === 'number' && typeof value !== 'number') {
      errors.push({ field, expected: 'number', got: typeof value, message: `Field "${field}" expected number, got ${typeof value}` });
    } else if (typeStr === 'boolean' && typeof value !== 'boolean') {
      errors.push({ field, expected: 'boolean', got: typeof value, message: `Field "${field}" expected boolean, got ${typeof value}` });
    } else if (typeStr === 'array' && !Array.isArray(value)) {
      errors.push({ field, expected: 'array', got: typeof value, message: `Field "${field}" expected array, got ${typeof value}` });
    } else if (typeStr === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push({ field, expected: 'object', got: Array.isArray(value) ? 'array' : typeof value, message: `Field "${field}" expected object, got ${typeof value}` });
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateComponentId(id) {
  if (!id || typeof id !== 'string') return 'Component ID is required';
  if (id.includes(':')) return 'Component ID cannot contain colons (reserved for plugin namespace)';
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(id)) return 'Component ID must be lowercase kebab-case (e.g. hero-centered)';
  return null;
}

export function validatePluginComponentId(componentId, pluginId) {
  if (!componentId.startsWith(pluginId + ':')) return `Plugin component ID must be prefixed with "${pluginId}:" (got "${componentId}")`;
  const suffix = componentId.slice(pluginId.length + 1);
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(suffix)) return `Plugin component suffix must be lowercase kebab-case (got "${suffix}")`;
  return null;
}
