// @wdl/core — stores/file-store.js  (Node-only: imports node:fs)
// A Store backed by a "WDL project on disk" — a folder of JSON files. This is the DEFAULT source and
// doubles as a git-versionable export/import format. NOT re-exported from the package root, so the
// Workers-safe entry (`@wdl/core`) never pulls node:fs. Import as `@wdl/core/file-store`.
//
// Convention (relative to <root>):
//   layouts/<name>.json          components/<id>.json        scripts/<id>.json
//   system/<id>.json             forms/<id>.json             pages/<slug>.json   ('/' → index.json)
//   design/registry.json (or registry.json)                  plugins.json
//   queries/<id>.result.json     ({ inject_as, data } fixture for a dynamic component)
//
// Design/brand tokens are NOT read here — they're authored in WDL JSON itself
// (DATA.__design_tokens / DATA.__brand_tokens on layouts/pages), not fetched via the store.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function createFileStore(root) {
  const read = (...p) => {
    const f = join(root, ...p);
    return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : null;
  };
  const qid = (q) => (typeof q === 'string' ? q : (q && q.id) || '');
  const slugFile = (slug) => (slug === '/' ? 'index' : String(slug).replace(/^\//, '').replace(/\//g, '_')) + '.json';

  return {
    getLayout:            async (_p, name) => read('layouts', name + '.json'),
    getComponent:         async (_p, id)   => read('components', id + '.json'),
    getScript:            async (_p, id)   => read('scripts', id + '.json'),
    getSystemComponent:   async (_p, id)   => read('system', id + '.json'),
    getForm:              async (_p, id)   => read('forms', id + '.json'),
    getComponentRegistry: async (_p)       => read('design', 'registry.json') || read('registry.json') || {},
    listPlugins:          async (_p)       => read('plugins.json') || [],
    executeQuery:         async (_p, q)    => read('queries', qid(q) + '.result.json'),
    getPageCss:           async (_p, _slug) => null,

    // Convenience for the CLI / harness (not part of the render Store interface):
    getPage:              async (_p, slug) => read('pages', slugFile(slug)),
  };
}
