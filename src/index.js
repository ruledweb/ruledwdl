// @wdl/core — public entry (Workers-safe: pure ES modules, no node:* / no storage imports).
// The file-store (Node fs) is a separate entry: import { createFileStore } from '@wdl/core/file-store'.
//
// Pure renderer: emmet → HTML, REGISTRY/attr merging, DATA binding, layouts + slots, markdown-in-text,
// script bucket injection. CMS-flavored features (forms, email templates, saved queries, plugins,
// system components, content-schema validation) live in wdl-extensions/* — see wdl-extensions/README.md
// and composePage's `resolveComponent`/`extraScripts` hooks in layout-composer.js.

export { parseEmmet } from './emmet-parser.js';
export { buildEl, toHTML, esc } from './element-builder.js';
export { resolvePath, resolveStr, resolveAll } from './data-resolver.js';
export { renderAll, wrapPage } from './render-engine.js';
export {
  composePage, resolveLayoutChain, loadDesignContext, resolveComponent,
  resolveScriptDef, collectAndDedupScripts,
} from './layout-composer.js';
export { renderInlineMarkdown } from './markdown.js';
export { createMemoryStore } from './store.js';
