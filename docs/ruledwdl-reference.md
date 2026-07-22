# RuledWDL Reference — @ruledwdl/core

A WDL page is a JSON object with three keys: REGISTRY, COMPONENTS, DATA.
`src/` is the host-agnostic renderer: it turns that JSON into HTML given an
injected `store` (see `src/store.js`) — no D1/KV/env imports, and no
built-in knowledge of forms, email, SQL queries, plugins, or content
schemas. This document covers only what `src/` itself implements.

## COMPONENTS — structure

An array of entries. Two forms:

  { "layers": "section>div.hero>h1+p+button" }
  { "component": "card", "data_overrides": {...}, "style_overrides": {...} }

The layers form is parsed into a tree. The component form resolves an ID via
`store.getComponent(project, id)` — project-local lookup only.

`data_overrides` is merged into the **page-wide** DATA object (not scoped
to just that component) — it is visible to every other component and layout
block rendered on the page, and later blocks' overrides win on key collision
(`layout-composer.js:resolveBlocks`). `style_overrides` is shallow-merged
onto the component's resolved `attr` object one selector-key at a time: a
selector present in `style_overrides` fully replaces that selector's attr
entry (no per-field deep-merge); selectors you don't mention are untouched.

## WDL Layers syntax & subset

Every element node in a `layers` expression MUST follow the clean format:
`tag.semantic_id` (e.g. `div.card`, `h1.title`, `button.cta_btn`).

Supported:
  tag          div, section, my-custom-el
  id           #main (one per element)
  semantic_id  .card (exactly ONE semantic_id per node)
  default tag  .foo → div.foo
  child        >   (descend one level)
  sibling      +   (sibling at current level)
  de-indent    <   (climb up one parent scope / subset level; << climbs 2 levels, etc.)
  numeric *N   li*3
  data loop    li*items  or  li*items.posts (renders one per DATA array entry)

Precedence & Scoping:
- `>` binds tighter than `+`. Once you descend with `>`, subsequent `+` stay at that inner level.
- Use `<` to de-indent / climb back up to parent scope.
  Example: `header>div.container>h1+p<div.banner` renders `header` containing `div.container` (with `h1` and `p`), followed by sibling `div.banner` directly inside `header`.
  Example: `div.shell>main>article>h1<<footer` renders `footer` as a sibling of `main` under `div.shell`.

Unsupported & Restricted (will THROW at parse time with a hint):
  .class1.class2 Multiple dot selectors — restricted! Strictly 1 `semantic_id` per element node. For extra CSS classes, use `REGISTRY` or `attr[".semantic_id"].class`.
  { }            inline text — put text in DATA or attr.text
  [ ]            inline attributes — put them in the attr object
  ^              climb-up — unsupported; use `<` for de-indentation / subset instead
  ( )            grouping — split into multiple COMPONENTS entries

## REGISTRY — style tokens

Each entry is a class-name-only key mapped to an object of attributes to
merge onto every element carrying that class. `"class"` is the common case,
but ANY attribute key is allowed:

  "site-header": { "class": "bg-white border-b px-6 py-4 flex items-center" }

REGISTRY keys MUST be the bare class name — never "tag.class" or "tag":
  ✓  "site-header"        — matches elements with class="site-header"
  ✗  "header.site-header" — never matches anything (silently ignored)
  ✗  "header"             — only matches bare <header> with no classes

element-builder looks up each element's classes via registry[className] and
merges the whole object (all keys, not just "class") onto the element.
A wrong key means zero styles applied with no error.

## The attr object — any HTML attribute passes through

Pair each layers entry with an attr object keyed by .class selector or tag name.
NO allowlist — every key becomes an HTML attribute:

  name, content, href, src, rel, type, role, title, lang, dir,
  id (also #id in layers), charset, placeholder, required, disabled,
  checked, value, for, action, method, data-*, aria-*, on* (onclick...),
  style, tabindex, contenteditable — anything a browser accepts.

Special keys (NOT rendered as attributes):
  class     merged with layers classes and registry entries.
  text      inner text. Rendered as inline Markdown → safe HTML for normal tags
            (see "Markdown in text" below); emitted RAW for <script> and <style>.
            Use ${key} to bind DATA values.
  attr-ref  string reference to a REGISTRY entry whose contents become
            the base attributes (overrideable by this attr entry).
  alpine    nested object flattened onto the element (x-data, @click...).
  htmx      same convenience namespace for hx-* directives.

attr key rules — matchAttr checks in this order:
  1. First matching class: attr[".classname"] — ALWAYS prefer this
  2. Tag fallback:         attr["tagname"]    — applies to ALL elements of that tag

  ✓  ".project-title": { "text": "${title}" }
  ✗  "h1.project-title": { ... }  — combined form never matches, text is empty silently

## Per-element attrs on same-tag siblings

Tag-keyed attrs apply to EVERY element of that tag. Use classes as
lookup selectors — they don't need to be Tailwind utilities:

  COMPONENTS: [
    { "layers": "meta.charset+meta.viewport+meta.og+link.css" }
  ]
  attr: {
    ".charset":  { "charset": "UTF-8" },
    ".viewport": { "name": "viewport",
                   "content": "width=device-width,initial-scale=1.0" },
    ".og":       { "property": "og:title", "content": "${title}" },
    ".css":      { "rel": "stylesheet", "href": "/s.css" }
  }

## Markdown in text

Any `text` value is rendered as **inline Markdown** → safe HTML. Write links and
emphasis directly in text instead of decomposing into sibling elements:

  ".body": { "text": "Read **this** and the [full guide](/docs/x) for `details`." }
  →  Read <strong>this</strong> and the <a href="/docs/x">full guide</a> for <code>details</code>.

Supported (inline only):
  **bold**        → <strong>      *italic* or _italic_ → <em>
  `code`          → <code>        [text](url)          → <a href="url">

Rules & limits:
  • Inline only — block syntax does NOT apply: a leading #, -, >, or 1. stays literal
    (no headings/lists/blockquotes). Build those with layers structure instead.
  • Plain text is unaffected — only real syntax transforms. "5 * 3", "snake_case",
    and "array[0]" stay literal (a lone/spaced * and intra-word _ are not emphasis,
    and [x] without (url) is not a link).
  • Safe by construction — raw HTML in text is escaped (`<script>` never executes)
    and `javascript:`/`data:` link URLs are neutralised. You do not sanitise yourself.
  • Generated tags carry no classes — a Markdown `<a>`/`<strong>` is unstyled. Style
    them via a parent (e.g. a `.prose`-style REGISTRY class on the container).
  • text vs children — an element renders its `text` OR its child elements, never both
    (unchanged). Markdown covers inline formatting within a single text value.

## DATA binding

  ${key}         — top-level value
  ${nested.path} — dot-path into objects
  *loopKey        — in layers, repeat one element per DATA[loopKey] entry;
                    inside the loop body each item's fields are bound directly:
                    ${field} (NOT ${item.field}) resolves per clone
  ${_index}      — zero-based position of the current clone within the loop

Loop arrays MUST be arrays of objects — never arrays of primitives:
  ✓  "tags": [{"label": "Cloudflare"}, {"label": "MCP"}]  → ${label} in attr
  ✗  "tags": ["Cloudflare", "MCP"]  → spreading a string gives char indices, ${label} is empty

For strings, wrap each item: [{"item": "Cloudflare"}] and use ${item} in attr.

## Layouts and fullPage

A page may declare "layout": "name" to wrap in a named layout. Layouts
chain via "extends". Slot injection uses literal {{content}} (NOT ${}).

fullPage: true on the outermost layout skips wrapPage() (the default
<html>/<head>/Tailwind shell). Use only if your layout produces the
complete HTML document. Otherwise keep fullPage: false — you get
UTF-8 charset, viewport meta, <title>, and Tailwind for free.

### Custom <head> elements without fullPage — DATA.__head

To add head elements (favicon, fonts/preconnect, theme-color, verification meta,
JSON-LD, …) to the default shell WITHOUT going fullPage, set DATA.__head to an
array of raw head-tag strings. The renderer injects them verbatim into <head>.

  "DATA": {
    "__head": [
      "<link rel=\"icon\" href=\"/favicon.ico\">",
      "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">",
      "<meta name=\"theme-color\" content=\"#1a3560\">",
      "<script type=\"application/ld+json\">{ ... }<\\/script>"
    ]
  }

- Put it on the **base layout** for site-wide head elements; put it on a **page**
  for page-specific ones. Both are collected (page tags are appended, not
  overridden), so a base layout + page can each contribute.
- Emitted RAW (authored by you, like inline <script> text) — do not put
  untrusted input here.

### Design tokens — DATA.__design_tokens / DATA.__brand_tokens

Two reserved keys hold raw CSS (a string, or an array of strings) meant to
declare/override CSS custom properties (e.g. Tailwind v4 `@theme` / `:root`
blocks). Like __head, each is collected across the layout chain
(**base layout → intermediate layouts → page**, in that order) and
concatenated into a single `<style>` tag — core does no parsing or merging,
so later contributions win the normal CSS cascade for any property they
redeclare (target the same selector, e.g. `:root`, across levels):

  "DATA": {
    "__design_tokens": ":root{--color-primary:#4f46e5;--radius-card:0.75rem;}"
  }

`__brand_tokens` uses the exact same collection mechanism, but is always
emitted **after** `__design_tokens` in `<head>` — so wherever it's declared
(base layout, page, anywhere in the chain), it has final say over any
property both keys redeclare:

  "DATA": {
    "__brand_tokens": ":root{--color-primary:#000000;}"
  }

Emission order in `<head>`: `__design_tokens` → `__brand_tokens` →
`__head` → `headInject` (opts). Both are skipped when a layout sets
`fullPage: true` (same as `__head` — you own the whole document in that
case). There is no store-backed design-token source — tokens are pure WDL
JSON, authored the same way as any other reserved DATA key.

## Reserved DATA keys (processed before render, not bound as ${var})

  __seo             object          — SEO meta tags, passed through to `wrapPage`
  __head            array           — raw head-tag strings injected into <head>. See above.
  __design_tokens   string | array  — layered CSS custom properties. See "Design tokens" above.
  __brand_tokens    string | array  — final-priority CSS custom properties, wins over __design_tokens.

## Scripts

Prefer the script injection system over text: on <script> elements.
Three buckets: head_blocking, head_defer, body_end. Dedup by id then
src. Sources:

  page.scripts          — per-page array
  component.script_deps — declared by components (whether the component is placed
                          on the page OR referenced from a layout); the script
                          loads only on pages where that component actually renders

So a script is page-scoped: attach it to a component via script_deps, and it loads
only on the pages that use that component — not globally.

A script definition may include a `condition` field: a DATA path string. The
script is only included in its bucket if `resolvePath(pageData, condition)`
is truthy — e.g. `"condition": "hasComments"` skips the script on pages
where `DATA.hasComments` is falsy/absent (`layout-composer.js:evaluateCondition`).

text: on <script>/<style> is RAW (not escaped), so one-off inline
snippets work — but reusable scripts belong in the injection system.

## Styling — Tailwind CSS

By default (no `cssDelivery` option passed to `composePage`), pages load
`@tailwindcss/browser@4` from a CDN — a script with id `tailwind-cdn`,
injected `head_blocking` — which generates CSS from class names at runtime
in the browser. No build step required; use any Tailwind v4 utility class.

To replace Tailwind with a different framework, add your own script with id
`tailwind-cdn` to `page.scripts` — the dedup system (dedup by id) uses
yours instead of the default.

`composePage`'s `opts.cssDelivery` — `{ mode: 'cdn'|'inline'|'link', css?,
href? }` — controls delivery: `'inline'`/`'link'` drop the Tailwind CDN
script and either inline a `<style>` block or link an external stylesheet
you supply. `src/` does no CSS I/O of its own; you pass the CSS in.

## Alpine.js — opt-in frontend interactions

Alpine.js is **not loaded by default**. To use Alpine on a component, declare
it as a script dependency on that component's definition — it will be
deduped and injected once per page:

  { "id": "site-nav", "layers": "...", "script_deps": ["alpine-cdn"] }

Use the `alpine` key in any attr object to attach Alpine directives to an element.

### Self-contained interactions

Tabs, accordions, dropdowns, tooltips, modals, toggles — any pattern where
the trigger and the content it controls are in the same component:

```json
{
  "layers": "div>button.toggle+div.panel",
  "attr": {
    "div":           { "alpine": { "x-data": "{ open: false }" } },
    "button.toggle": { "alpine": { "@click": "open = !open" }, "text": "Toggle" },
    "div.panel":     { "alpine": { "x-show": "open" }, "text": "${body}" }
  }
}
```

All Alpine directives pass through: x-data, x-show, x-if, x-bind:*, @click,
x-text, x-model, x-transition, x-init, x-ref, $refs, $dispatch, @click.outside,
event modifiers (.prevent .stop .once) — everything works.

### Cross-component state

When the trigger and target are in **different WDL components** (e.g. a hamburger
button in the nav layout and a drawer in the page body), they have separate x-data
scopes and cannot share state natively.

**Workaround:** register an `Alpine.store()` via a `head_blocking` script (a
component's script_deps can reference this script id):

```json
{
  "id":            "store-ui",
  "type":          "inline",
  "inline":        "document.addEventListener('alpine:init', () => { Alpine.store('ui', { drawerOpen: false }); });",
  "load_position": "head_blocking"
}
```

The dedup system ensures it registers only once regardless of how many
components declare it as a script_dep. Components then use
`$store.ui.drawerOpen`.

**Script order matters — list the store script BEFORE `alpine-cdn`:**

  { "id": "site-nav", "layers": "...", "script_deps": ["store-ui", "alpine-cdn"] }

`collectAndDedupScripts` preserves `script_deps` order into the `head_blocking`
bucket. The store-registration script must execute before Alpine's own bootstrap
script fires its `alpine:init` event, or the store never gets created. Get this
backwards and there's **no error** — `$store.ui` silently does nothing, `x-show`
never toggles. If a hamburger-menu-style pattern (trigger + target in separate
components) "isn't working" with no console error, check this ordering first.

### Re-initializing Alpine after content is added post-load

On a normal server-rendered page (the browser parses the whole document, including
`<script>` tags, top to bottom on first load) this all works with no extra effort —
native HTML parsing handles script execution order correctly by itself.

It stops working automatically the moment WDL-rendered markup is inserted into an
**already-loaded** page — an htmx swap, a fragment fetched and injected via
`innerHTML`, anything client-side-dynamic. Two independent reasons:

1. **`<script>` elements inserted via `innerHTML` never execute.** This is a
   browser security behavior, not a bug — if a swapped-in fragment carries its own
   `<script>` tags (rare for a component fragment, but possible if a component's
   `text` was authored as raw script content), they're inert on arrival.
2. **Alpine's CDN bundle auto-starts once, on load** (it schedules
   `Alpine.start()` via `queueMicrotask` right after its own script runs) and
   scans the document **at that moment**. Content that arrives later — including
   via a later `innerHTML` write or an htmx swap — is never scanned, so
   `x-data`/`x-show`/`@click`/`$store` in it are all inert, again with **no
   error**.

**Fix:** call `Alpine.initTree(el)` — Alpine's own documented API for "initialize
this element (and its children) even though I already started" — on whatever
element just received new WDL-rendered content. If you're using htmx (this
project's default interaction layer alongside Alpine — see
`docs/hypermedia-roadmap.md`), wire this once, globally, rather than per swap:

```js
document.addEventListener('htmx:afterSwap', (e) => {
  window.Alpine?.initTree(e.detail.target);
});
```

For a plain `innerHTML` write outside of htmx, call `Alpine.initTree(container)`
immediately after setting the content — see `examples/alpine-store/index.html`
for a worked example (WDL output grafted into a live page's real DOM, not an
iframe, including this exact fix).
