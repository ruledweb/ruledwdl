# @wdl/core

The **WDL renderer** — the language runtime, **host-agnostic**. It renders WDL JSON
(`REGISTRY` / `COMPONENTS` / `DATA`, layouts, components) to HTML given a **pluggable store**.
RuledWeb is one runtime; any project can embed this. No build step, no TypeScript — plain ES
modules that run in **Node** and the **Cloudflare Workers** runtime.

> Status: **0.1.0 — standalone R&D sandbox. DO NOT wire into any live/launching project.**
> Rendering works; production-readiness is **unconfirmed**. This is the isolated ground for the
> broader WDL roadmap — **lifecycle, hooks, third-party data injection**, and more — so live
> projects (currently launching) are never destabilized by experimentation. Injecting it into a
> host is explicitly deferred; not a near-term goal.

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
Core only needs these async methods for any backend (D1, KV, an HTTP API, files, in-memory):

```
getLayout(project, name)  getComponent(project, id)  getScript(project, id)
getComponentRegistry(project)
```
- **`createMemoryStore(data)`** (from `@wdl/core`) — pure, Workers-safe. For tests/embedding.
- **`createFileStore(dir)`** (from `@wdl/core/file-store`, Node only) — a "WDL project on disk":
  `layouts/<name>.json`, `components/<id>.json`, `pages/<slug>.json`, `design/registry.json`.
  Doubles as a git-versionable export format.

Design/brand tokens are **not** a store concern — see `DATA.__design_tokens` /
`DATA.__brand_tokens` in `docs/WDL-Reference.md`, authored directly in WDL JSON and layered across
the layout chain via plain CSS cascade.

## Examples
Three ways to consume this as a drop-in library — plain HTML with no build step, a Node ESM
script, and inside a Vite/bundler-based frontend project. See `examples/README.md`.

## CLI
```
node bin/wdl.js render <project-dir> <slug>      # → HTML on stdout
npm test                                          # smoke tests
```

## What lives here vs. extensions vs. a host CMS
- **Here (`src/`) — pure renderer:** emmet parse, element build, data binding, layout composition,
  design-token cascade, script collection.
- **`wdl-extensions/*` — optional, opt-in:** forms, email templates, saved queries, plugins, system
  components, content-schema validation. Plug into `composePage` via its `resolveComponent` /
  `extraScripts` hooks; see `wdl-extensions/README.md`.
- **A host CMS (e.g. RuledWeb):** storage, auth, caching, CSS collection/extraction, SQL execution,
  submission handling, mail delivery, routing. Not implemented anywhere in this repo — the host
  implements the store (plus whatever extra methods its chosen extensions need) and injects
  `cssDelivery` / `headInject`.
