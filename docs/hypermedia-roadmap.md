# WDL Hypermedia Roadmap (planning — do NOT build yet)

**Status:** PLANNING ONLY. This is a design doc to agree *before* any experimentation in the
`@wdl/core` sandbox. Nothing here is implemented. Live projects are untouched and stay untouched.

> Decision standing (2026-06-28): plan the WDL roadmap before experimenting; `@wdl/core` is an
> isolated sandbox; never wire into a live/launching project until explicitly decided.

---

## 1. Positioning — what WDL *is*

**WDL is the declarative, AI-native design language for the hypermedia web.** It is **not** a lighter
React. React is a client reactive runtime (virtual DOM, hooks, client state). WDL is a *design
language* whose compile target is the **hypermedia stack**:

| Layer | Job | Form (declarative) |
|---|---|---|
| **WDL** | structure + composition (the design language) | **JSON** (REGISTRY / COMPONENTS / DATA) |
| **Tailwind** | styling | utility **classes** |
| **Alpine** | local/ephemeral interactivity (toggle, tabs, dropdown) | `x-` **attributes** |
| **HTMx** | server actions (fragment swap, forms, pagination, live) | `hx-` **attributes** |

The thesis: **every layer is declarative markup or data — nothing is imperative code.** That is what
makes the *entire* app authorable by an AI (JSON + `class`/`x-`/`hx-` attributes), and what makes WDL
the unifying layer — the AI writes WDL; WDL knows how to emit the right Tailwind classes, Alpine
directives, HTMx hooks, and fragment boundaries.

**Non-goal:** competing with React/SPA for heavy client apps (complex local state, offline, canvas,
realtime, design-tool-grade UIs). Hypermedia targets the ~80% that is content + forms + CRUD +
mostly-server-driven UIs. Do not chase the 20%.

---

## 2. The core architectural insight — WDL is **isomorphic** (tri-modal)

One design language, one renderer, **three rendering locations**, chosen per page/fragment:

| Mode | WDL renders… | State lives | Client JS | Use for |
|---|---|---|---|---|
| **Static (SSG)** | at build time | frozen | none | content/marketing; deploy to any dumb host |
| **Edge-hypermedia (HTMx)** | server/edge per request | **server** | tiny (htmx) | CRUD, forms, fresh/secured/large data |
| **Client (React-like)** | in the browser | browser | WDL.js + data | interactions over **already-local** data |

Author **once** in WDL; pick where it renders. (React can't easily be static or server-only; WDL can
be all three.)

### The "WDL.js in the browser" answer (settled 2026-06-28)
The pure renderer runs in the browser (no node deps), so client-side `composePage` works → you *can*
do swaps with **no server** for **data the browser already has**. But:
- This **replaces** HTMx with client-side WDL rendering; it is **not** "HTMx without a server." HTMx's
  reason for being is server-as-state / HTML-over-the-wire.
- **Data the browser doesn't have still needs a server** to fetch (WDL.js renders it on arrival).
  "No server" only holds for local data.
- Client mode **ships a JS runtime** (WDL.js + data) → you forfeit zero-JS/pure-HTML. Deliberate, per page.

### The discipline that keeps WDL from becoming React (hard rule)
- **No virtual DOM, no reconciler, no fine-grained reactive binding in WDL.** Client mode does
  **coarse fragment swaps only** — recompute a fragment's HTML string, `innerHTML`-swap it (HTMx's
  model, optionally local).
- **Fine-grained reactivity is Alpine's job.** The moment WDL reaches for diffing/per-node updates,
  it has rebuilt React → explicit **non-goal**.

---

## 3. Design pillars to specify (the actual roadmap work)

Each is a *spec to write*, not code to ship yet.

### 3.1 Actions — WDL vocabulary for HTMx (`hx-*`)
How does a WDL component **declare an action** without hand-writing `hx-` attributes? Define a WDL-level
shape, e.g. an `action` block on a component/element: `{ on, get|post, target, swap, params, indicator }`
→ compiles to the right `hx-get`/`hx-target`/`hx-swap`/… Decide:
- The **fragment endpoint contract**: a request that returns a WDL-rendered fragment (which page/
  component/slug + what DATA scope). How the edge runtime routes it.
- Same `action` shape should be retargetable to **client mode** (resolve locally) vs **edge mode**
  (HTMx round-trip) without rewriting the component — the isomorphic promise.

### 3.2 Interactions — WDL vocabulary for Alpine (`x-*`)
A first-class way to attach local behavior/state (`x-data`, `x-show`, `x-on`, transitions) from WDL
without raw attribute soup. Decide how much to wrap vs pass-through. Keep Alpine opt-in (as today).

### 3.3 Fragments & boundaries
- What is a **fragment** in WDL (a named, independently-renderable sub-tree of a page/component).
- The **static ↔ edge ↔ client boundary**: which fragments are baked, which are HTMx endpoints, which
  are client-rendered. How a page mixes modes.

### 3.4 Lifecycle (render phases)
Make the implicit pipeline explicit and hookable: **parse → resolve data → compose (layout chain) →
emit**. Define pre/post stages for each. This is where data injection, actions, and CSS delivery attach.

### 3.5 Hooks (extensibility)
Named extension points around each lifecycle phase (e.g. `beforeResolve`, `afterCompose`, `transformEmit`)
so plugins/sources/integrations attach without forking the renderer. Define the hook signature + ordering.

### 3.6 Third-party data injection
Pages/components **declare external data sources** (beyond the store's `executeQuery`), e.g.
`"sources": [{ id, from, inject_as, mode }]`, resolved in the lifecycle and merged into DATA. Decide
where each source resolves per mode: **build** (snapshot/fixture), **edge** (live fetch, cached),
**client** (fetch then WDL render). Caching, auth, and failure semantics.

### 3.7 Static-build path (SSG)
`wdl build <project-dir> <out-dir>` → render every page in a store to plain `.html` (+ assets) → deploy
to any dumb static host, zero server runtime. Open questions: **CSS at build** (emit real CSS,
Global-G-style, not the Tailwind CDN, for pure HTML/CSS no-JS output); **dynamic pages** (resolve at
build from fixtures/snapshot vs leave for edge); **emitted routing/asset layout**; **incremental vs
full rebuilds**. Rides the store seam — a build-time driver over any store.

### 3.8 The store across modes
The single `store` interface (already built: getLayout/getComponent/…/executeQuery/getPageCss) must
have a clean implementation per mode: **FileStore** (build), **D1/KV or API** (edge), **fetch/memory**
(client). Confirm the interface is sufficient for all three; extend only if a pillar above demands it.

---

## 4. Open questions / decisions to make in planning
- Client runtime packaging: how WDL.js + the needed WDL JSON + data ship to the browser (one bundle?
  per-fragment lazy?). Keep it KB-scale.
- First paint for client/edge modes: SSR/SSG the first paint, hydrate fragments after (isomorphic) —
  vs client-only (empty first paint, bad SEO). Default to server-first.
- How `action` chooses its mode (authoring hint vs runtime capability detection).
- Security: fragment endpoints + data sources need the same tenant scoping discipline as today.
- Versioning/open-core boundary: language open, CMS/runtime proprietary?

## 5. Phasing (PLAN order — still no build until agreed)
1. **Specs first** (this doc → detailed sub-specs for §3.1–3.8). No code.
2. Prototype in the **sandbox only**, one pillar at a time, each behind the byte-diff/parity discipline.
3. Re-evaluate host injection (RuledWeb) only after the language stabilizes AND live projects are past
   launch — per the standing decision. Not now.

## 6. Non-goals (keep WDL small and itself)
- No virtual DOM / reconciler / fine-grained reactivity (that's Alpine's lane / React's lane).
- No build toolchain requirement (plain ES modules, runs in Node + Workers + browser).
- Not for heavy client apps. Not a JS framework. A **design language** + a small isomorphic renderer.

---

*References: `../README.md` (package), RuledWeb `docs/generative-ui/wdl-ruledweb-separation.md`,
`docs/plan/renderer-lifecycle-extensibility.md`, `docs/GTM Tasks/03-renderer-as-library.md`.*
