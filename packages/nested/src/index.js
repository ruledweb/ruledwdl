/**
 * @ruledwdl/nested — Nested Component Resolver & Catalog Adapter for RuledWDL
 *
 * Provides recursive @component and @component*loop macro expansion,
 * library catalog store adapters, and Schema v2.0/v2.1 registry aggregation.
 *
 * @license AGPL-3.0-or-later
 * @author Pradeep Dabane <pradeep@ruledweb.com>
 */

export { createNestedResolver, parseLayersToAst, serializeAst } from './resolver.js';
export { createLibraryStore } from './library-store.js';
export { normalizeRegistry, mergeRegistries } from './registry-merger.js';

import { createNestedResolver } from './resolver.js';
export default createNestedResolver;
