// @wdl/core — public entry (Workers-safe: pure ES modules, no node:* / no storage imports).
// The file-store (Node fs) is a separate entry: import { createFileStore } from '@wdl/core/file-store'.
//
// Pure renderer: layers → HTML, REGISTRY/attr merging, DATA binding, layouts + slots, markdown-in-text,
// script bucket injection.
// and composePage's `resolveComponent`/`extraScripts` hooks in layout-composer.js.

export { parseLayers } from './layers-parser.js';
export { buildEl, toHTML, esc } from './element-builder.js';
export { resolvePath, resolveStr, resolveAll } from './data-resolver.js';
export { renderAll, wrapPage } from './render-engine.js';
export {
  composePage, resolveLayoutChain, loadDesignContext, resolveComponent,
  resolveScriptDef, collectAndDedupScripts,
} from './layout-composer.js';
export { renderInlineMarkdown } from './markdown.js';
export { createMemoryStore } from './store.js';
