#!/usr/bin/env node
// ruledwdl render <project-dir> <slug>   → render one WDL page to HTML on stdout.
// ruledwdl serve  [project-dir] [port]   → live preview server: open pages in a browser (edit JSON, refresh).
// Proves the package drops into any project (no Cloudflare); also the harness for rendering.
import { composePage } from '../src/index.js';
import { createFileStore } from '../src/stores/file-store.js';
import { createServer } from 'node:http';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [, , cmd, a, b] = process.argv;

function listSlugs(dir) {
  const p = join(dir, 'pages');
  if (!existsSync(p)) return [];
  return readdirSync(p).filter(f => f.endsWith('.json')).map(f => {
    const base = f.replace(/\.json$/, '');
    return base === 'index' ? '/' : '/' + base.replace(/_/g, '/');
  });
}

if (cmd === 'render') {
  if (!a || !b) { console.error('usage: ruledwdl render <project-dir> <slug>'); process.exit(1); }
  const store = createFileStore(a);
  const page = await store.getPage('cli', b);
  if (!page) { console.error(`page not found: ${b}`); process.exit(1); }
  const { html, dynamic } = await composePage(store, 'cli', page);
  process.stderr.write(`[ruledwdl] rendered ${b} (${html.length} bytes${dynamic ? ', dynamic' : ''})\n`);
  process.stdout.write(html);

} else if (cmd === 'serve') {
  const dir = a || 'fixtures/demo';
  const port = Number(b) || 4321;
  const store = createFileStore(dir);
  const server = createServer(async (req, res) => {
    const slug = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    try {
      const page = await store.getPage('serve', slug);
      if (!page) {
        const links = listSlugs(dir).map(s => `<li><a href="${s}">${s}</a></li>`).join('');
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<body style="font-family:ui-monospace;padding:40px"><h2>No page for <code>${slug}</code></h2><p>Pages in <code>${dir}</code>:</p><ul>${links}</ul></body>`);
        return;
      }
      const { html } = await composePage(store, 'serve', page);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('render error: ' + (e && e.stack || e));
    }
  });
  server.listen(port, () => {
    console.error(`[ruledwdl] serving "${dir}" at http://localhost:${port}`);
    console.error(`[ruledwdl] pages: ${listSlugs(dir).join('  ') || '(none)'}`);
  });

} else {
  console.error('usage:\n  ruledwdl render <project-dir> <slug>\n  ruledwdl serve  [project-dir] [port]');
  process.exit(1);
}
