# @wdl/core

The **WDL renderer** — the language runtime, **host-agnostic**. It renders WDL JSON
(`REGISTRY` / `COMPONENTS` / `DATA`, layouts, components) to HTML given a **pluggable store**.
RuledWeb is one runtime; any project can embed this. No build step, no TypeScript — plain ES
modules that run in **Node** and the **Cloudflare Workers** runtime.

> Status: **0.1.0 — standalone, not yet wired into any project.** Stabilizing in isolation first
> (byte-diff parity against RuledWeb) before it's injected anywhere.

## Install (local)
```jsonc
// in a consumer's package.json
"dependencies": { "@wdl/core": "file:../wdl-core" }
```

## Render
```js
import { composePage, createMemoryStore } from '@wdl/core';

const store = createMemoryStore({
  layouts: { base: { COMPONENTS: [{ emmet: 'div.wrap', attr: { '.wrap': { text: '{{content}}' } } }] } },
});
const page = { slug: '/', title: 'Home', layout: 'base',
  COMPONENTS: [{ emmet: 'h1', attr: { h1: { text: 'Hello ${name}' } } }], DATA: { name: 'World' } };

const { html, dynamic } = await composePage(store, 'my-project', page);
```

## The store (the only data source)
`composePage` never imports D1/KV/env — every structured read goes through an injected **store**.
Implement these async methods for any backend (D1, KV, an HTTP API, files, in-memory):

```
getLayout(project, name)  getComponent(project, id)  getScript(project, id)
getSystemComponent(project, id)?  getForm(project, id)  getDesignTokens(project)
getComponentRegistry(project)  listPlugins(project)
executeQuery(project, query)?  getPageCss(project, slug)?
```
- **`createMemoryStore(data)`** (from `@wdl/core`) — pure, Workers-safe. For tests/embedding.
- **`createFileStore(dir)`** (from `@wdl/core/file-store`, Node only) — a "WDL project on disk":
  `layouts/<name>.json`, `components/<id>.json`, `pages/<slug>.json`, `design/{tokens,registry}.json`,
  `forms/<id>.json`, `queries/<id>.result.json`, `plugins.json`. Doubles as a git-versionable export format.

## CLI
```
node bin/wdl.js render <project-dir> <slug>      # → HTML on stdout
npm test                                          # smoke tests
```

## What lives here vs. the host
- **Here (language):** emmet parse, element build, data binding, layout composition, script collection,
  form/email/markdown rendering, schema validation.
- **Host (RuledWeb):** all storage, auth, caching, Global-G CSS I/O, saved-query SQL execution, archive
  hydration, MCP/routes/dispatcher. The host implements the store and injects `cssDelivery` / `headInject`.
