// @wdl/core — public entry (Workers-safe: pure ES modules, no node:* / no storage imports).
// The file-store (Node fs) is a separate entry: import { createFileStore } from '@wdl/core/file-store'.

export { parseEmmet } from './emmet-parser.js';
export { buildEl, toHTML, esc } from './element-builder.js';
export { resolvePath, resolveStr, resolveAll } from './data-resolver.js';
export { renderAll, wrapPage } from './render-engine.js';
export {
  composePage, resolveLayoutChain, loadDesignContext, resolveComponent,
  resolveScriptDef, collectAndDedupScripts,
} from './layout-composer.js';
export { renderForm } from './form-renderer.js';
export { renderInlineMarkdown } from './markdown.js';
export { wrapEmailDoc, renderEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from './email-renderer.js';
export { validateDataAgainstSchema, validateComponentId, validatePluginComponentId } from './validator.js';
export { createMemoryStore } from './store.js';
