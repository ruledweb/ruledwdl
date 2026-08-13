# Examples — @ruledwdl/core@0.3.0 as a drop-in library

Four working examples, one per usage mode. All examples demonstrate **WDL Core v0.3.0** (100% Zero-Dependency Core Engine, Schema v2.0 standards, space-free flat string arrays, `WDLDomTree` 5-element tuple arrays, and pluggable `transformData` / `transformText` hooks).

## 1. `plain-html/` — no build step, direct `<script type="module">`

The renderer runs entirely in the browser, resolved via a native [import map](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) pointing directly at `@ruledwdl/core` — no bundler, no npm install, 100% zero external runtime dependencies.

```bash
npx serve .                          # from the repo root
# or: python3 -m http.server
```
then open `http://localhost:<port>/examples/plain-html/`.

## 2. `node-esm/` — programmatic Node usage (not via the CLI)

```bash
node examples/node-esm/render.mjs
```

Shows `@ruledwdl/core` imported directly in your Node script (`createFileStore`, `createMemoryStore`, `WDLDomTree`, and `transformData`/`transformText` composition hooks).

## 3. `frontend-vite/` — npm dependency inside a bundler-based frontend project

```bash
cd examples/frontend-vite
npm install
npm run dev      # http://localhost:5173
npm run build    # verified: produces a working dist/
```

`@ruledwdl/core` is declared as a normal `dependencies` entry and imported like any library in Vite/webpack/esbuild.

## 4. `alpine-store/` — grafted into the real page DOM (no iframe), Alpine.js cross-component store

```bash
npx serve .                          # from the repo root
# or: python3 -m http.server
```
then open `http://localhost:<port>/examples/alpine-store/`.

Demonstrates grafting WDL components directly into the host page's real `<body>` without an iframe, connecting separate WDL components via a shared global `Alpine.store()`. Uses `dist/ruledwdl.esm.js` for ES module CDN import.

## Common pattern (plain-html, node-esm, frontend-vite)

`composePage()` returns `{ html, dynamic, versions }`. It emits a full HTML document (`<!DOCTYPE html>...`), which can be hosted in an `<iframe srcdoc="...">` or grafted directly into the DOM.
