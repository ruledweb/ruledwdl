#!/usr/bin/env node
// wdl render <project-dir> <slug>  — render a WDL page from a folder of JSON files to HTML on stdout.
// Proves the package drops into any project (no Cloudflare); also the harness for the byte-diff gate.
import { composePage } from '../src/index.js';
import { createFileStore } from '../src/stores/file-store.js';

const [, , cmd, dir, slug] = process.argv;
if (cmd !== 'render' || !dir || !slug) {
  console.error('usage: wdl render <project-dir> <slug>');
  process.exit(1);
}

const store = createFileStore(dir);
const page = await store.getPage('cli', slug);
if (!page) { console.error(`page not found: ${slug}`); process.exit(1); }

const { html, dynamic } = await composePage(store, 'cli', page);
process.stderr.write(`[wdl] rendered ${slug} (${html.length} bytes${dynamic ? ', dynamic' : ''})\n`);
process.stdout.write(html);
