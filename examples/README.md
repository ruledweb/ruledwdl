# Examples — @wdl/core as a drop-in library

Four examples, one per usage mode. All are verified working (browser/Vite/Alpine examples run
through an actual Chrome tab; the Node example is run directly).

## 1. `plain-html/` — no build step, direct `<script type="module">`

The renderer runs entirely in the browser, resolved via a native [import
map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) — no
bundler, no npm install.

```
npx serve .                          # from the repo root
# or: python3 -m http.server
```
then open `http://localhost:<port>/examples/plain-html/`.

`src/markdown.js`'s only dependency (`marked`) is mapped to a CDN ESM build in the import map —
that's the one thing you can't avoid fetching from somewhere, since browsers don't resolve bare
npm specifiers on their own.

## 2. `node-esm/` — programmatic Node usage (not via the CLI)

```
node examples/node-esm/render.mjs
```

Shows `@wdl/core` imported directly in your own Node script (both `createFileStore` and
`createMemoryStore`), as opposed to going through the packaged `wdl` CLI (`bin/wdl.js`). This is
what embedding the renderer inside a bigger Node program looks like — a build step, a static-site
generator, a test harness, a Worker's `fetch` handler during local dev.

## 3. `frontend-vite/` — as an npm dependency inside a bundler-based frontend project

```
cd examples/frontend-vite
npm install
npm run dev      # http://localhost:5173
npm run build    # verified: produces a working dist/
```

`@wdl/core` is declared as a normal `dependencies` entry (`"file:../.."`, i.e. this repo) and
imported the same way you'd import it into a React/Vue/Svelte component — Vite/webpack/esbuild
resolve and bundle it like any other library. There's nothing wdl-core-specific about the bundler
config.

**Note on top-level `await`:** `composePage` is async. Calling it at module top level
(`const { html } = await composePage(...)`) breaks production builds under esbuild's default
target (`Top-level await is not available in the configured target environment`) — wrap the call
in an async IIFE instead (see `frontend-vite/src/main.js`). This isn't a wdl-core limitation, it's
generic advice for consuming any async API from a bundled entry point.

## 4. `alpine-store/` — grafted into the real page DOM (no iframe), Alpine.js cross-component store

```
npx serve .                          # from the repo root
# or: python3 -m http.server
```
then open `http://localhost:<port>/examples/alpine-store/`.

Unlike the other examples, this one does NOT use an iframe — `composePage()`'s output is parsed
with `DOMParser` and grafted directly into the host page's real `<body>`, so the WDL-rendered
markup is genuinely part of the visible page (inspectable in normal devtools, no frame boundary).
It renders two **separate** WDL components — a nav bar with a hamburger button and a drawer panel
— that share open/closed state only through a global `Alpine.store('ui', ...)`, the pattern
documented under "Cross-component state" in `docs/ruledwdl-reference.md`.

**Two real gotchas this example had to solve** (both are properties of dynamically injecting HTML
after page load, not of `@wdl/core` itself):
1. **Script tags inserted via `innerHTML` don't execute.** `<script>` elements are pulled out of
   the parsed document and re-created with `document.createElement('script')` so the browser
   actually runs them, in the same order WDL's script-bucket system produced them.
2. **Alpine's CDN bundle auto-starts and scans the DOM on load** (`queueMicrotask(() =>
   Alpine.start())`), which can race ahead of dynamically-injected content and silently skip it —
   there's no reliable way to make it wait. The fix is `Alpine.initTree(el)`, Alpine's documented
   API for "initialize this element even though I already started" — called once Alpine's script
   has loaded, targeting the container the WDL content was just written into.

## Common pattern (plain-html, node-esm, frontend-vite)

`composePage()` returns a **full HTML document** (`<!DOCTYPE html>...`), not a fragment — so those
three examples host the result in an `<iframe srcdoc="...">` rather than injecting it into the
host page's own DOM (which would nest `<html>`/`<head>` inside a `<div>`, invalid and not rendered
correctly by browsers). `alpine-store/` shows the alternative (parse + graft into the real DOM) for
when you specifically need the content to NOT be iframe-isolated. If you only need a fragment to
drop into `innerHTML`/`dangerouslySetInnerHTML` and don't need layouts/scripts/`<head>` handling at
all, call `renderAll(REGISTRY, COMPONENTS, DATA)` directly instead of `composePage` — see
`src/render-engine.js`.
