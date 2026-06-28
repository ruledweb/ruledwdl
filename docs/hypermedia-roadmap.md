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

## 2b. Landscape & positioning — the Generative UI ("UI as data") category

The category went mainstream in late 2025/2026: Google open-sourced **A2UI** (v0.9, headlined at I/O 2026),
and Anthropic+OpenAI standardized **MCP-UI**. This **validates WDL's core bet** — *UI as data, no executable
code* — and pins down where WDL sits. The 2026 agent stack has **two layers; don't conflate them**:

- **Transports (how events move):** **MCP** (agent↔tools) · **A2A** (agent↔agent) · **AG-UI** (agent↔UI, an
  SSE event stream, bi-directional).
- **UI-as-data specs (what the UI *is*, declarative JSON, no shipped code):** **A2UI** (Google → native
  widgets, Flutter-first) · **Adaptive Cards** (Microsoft → host-app cards) · **MCP-UI** (Anthropic/OpenAI →
  React inline in ChatGPT).

**WDL is in the UI-as-data family** (same DNA: declarative JSON, AI-authored, no executable code) — but every
peer targets a **conversational/host surface** rendering **ephemeral UI per agent turn**. WDL targets the one
surface none of them own: **the open web — persistent, SEO-able, edge-rendered whole sites** (hypermedia
stack), backed by a CMS (RuledWeb).

| | Render target | Scope | Lifetime | Host |
|---|---|---|---|---|
| A2UI | native widgets (Flutter/web) | component/view | per turn | an app |
| Adaptive Cards | host-app cards | card | per message | Teams/Outlook |
| MCP-UI / OpenAI Apps | React in ChatGPT | inline panel | per turn | the chat |
| **WDL** | **HTML / hypermedia** | **whole pages & sites** | **persistent, hosted** | **the open web (edge)** |

Same thesis, **different target + scope: "generative UI for the web/sites," not "for chat surfaces."**

- **Edges:** open-web HTML target (SEO, links) not a host sandbox; **whole sites + CMS + edge persistence**
  (not transient widgets); isomorphic (static/edge/client); natively aligned with the "no executable code" thesis.
- **Risks (clear-eyed):** A2UI is framework-agnostic and will likely grow a **web/HTML renderer** → the one
  that could encroach. If it does, WDL's moat is **scope (whole sites) + CMS + edge hosting**, not the JSON
  format (which commoditizes). Do **not** try to out-standardize Google/MS/OpenAI on chat widgets — own the
  *website* surface.
- **Posture:** own "generative UI for websites"; **interoperate** with the protocol stack rather than rival it
  (see §3.9). One-liner: *"an agent uses MCP for tools, A2UI for in-app widgets, and **WDL for the actual
  website it builds and hosts.**"*

## 3. Design pillars to specify (the actual roadmap work)

Each is a *spec to write*, not code to ship yet.

### 3.1 Actions — native HTMx pass-through (NO wrapper) — DECISION 2026-06-28
**Do NOT invent a WDL "action vocabulary" that wraps `hx-*`.** WDL's whole advantage is that models
already know HTMx/Tailwind/Alpine zero-shot (millions of training examples). A wrapper forfeits exactly
that: the AI would have to *learn* our dialect → worse generation, a leaky abstraction (never covers all
of HTMx), and a mapping layer we maintain. WDL's `attr` block **already passes native attributes through**,
so `hx-get`/`hx-target`/`hx-swap`/… are expressible *today* with nothing new to learn. WDL owns
**structure / composition / data / runtime**, not the leaf vocabularies.

The two things that *seemed* to need a wrapper are solved with **native attributes + thin conventions**:
- **Fragment endpoints** (point at WDL, not a raw URL): a **URL convention** — e.g. `hx-get="/_wdl/posts"`
  — still native `hx-get`; the edge runtime routes `/_wdl/<fragment>` to a WDL-rendered fragment (which
  component/slug + DATA scope). No new keyword.
- **Isomorphism (client mode)**: a tiny **client interpreter that reads the SAME native `hx-` attributes**
  and renders the fragment locally — HTMx-compatible attributes, alternate executor. Native authoring AND
  client mode, no DSL.
- **Bounded-parity caveat:** full client-side HTMx parity is limited (SSE, history, out-of-band swaps assume
  a server). Scope client mode to the sensible subset; the rest stays edge/server. (Runtime concern, not an
  authoring one — the AI writes plain HTMx regardless.)

### 3.2 Interactions — native Alpine pass-through (same rule)
Same principle: **pass `x-data`/`x-show`/`x-on`/transitions through natively** via `attr` — do NOT wrap
Alpine in a WDL dialect. Keep Alpine opt-in (as today). The only WDL-level concern is *ergonomics of
authoring attributes in JSON* (and ensuring the `alpine-cdn` script loads when used), never re-inventing
the `x-` vocabulary.

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

### 3.9 Interop with the agent protocol stack (be a citizen, not a rival)
Make WDL a first-class payload in the emerging stack (§2b) instead of competing with it:
- **Deliverable over AG-UI** — WDL fragments/pages streamed to a frontend over the AG-UI event transport
  (pairs naturally with the isomorphic client/edge modes).
- **A2UI ↔ WDL mapping** — a translation layer to/from A2UI (a.k.a. Open-JSON-UI): *import* an agent's A2UI
  description and render it as a WDL page/site; optionally *export* WDL → A2UI for in-app surfaces. Watch
  A2UI's web/HTML render target — interop there, or differentiate on CMS/edge/whole-site scope.
- **MCP-UI web resource** — expose WDL-rendered pages/fragments as MCP-UI resources so MCP hosts (ChatGPT
  Apps, Claude) can embed a WDL-built site or live preview. (We already run an MCP server + have MCP Apps UI
  experience — see RuledWeb `mcp/app-ui.js`.)
- **Boundary decision:** WDL **owns** the persistent web-site surface; **cede** ephemeral chat widgets to
  A2UI / Adaptive Cards / MCP-UI.

Decisions: which transport is primary; mapping fidelity (WDL is richer — *whole sites* — than a single A2UI
view, so the mapping is lossy in the WDL→A2UI direction); preserving the "UI as data, no executable code"
trust-boundary guarantee across the bridge.

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
- **Never wrap Tailwind / Alpine / HTMx in a WDL dialect — pass them through natively.** Models already
  know those zero-shot; that fluency is WDL's core asset. A wrapper would force the AI to learn our
  vocabulary (worse output, leaky, maintenance) and contradict the §2 thesis. WDL owns composition / data /
  runtime; the leaf vocabularies stay themselves. (See §3.1, §3.2.)
- No virtual DOM / reconciler / fine-grained reactivity (that's Alpine's lane / React's lane).
- No build toolchain requirement (plain ES modules, runs in Node + Workers + browser).
- Not for heavy client apps. Not a JS framework. A **design language** + a small isomorphic renderer.

---

*References (internal): `../README.md` (package), RuledWeb `docs/generative-ui/wdl-ruledweb-separation.md`,
`docs/plan/renderer-lifecycle-extensibility.md`, `docs/GTM Tasks/03-renderer-as-library.md`.*

*Generative-UI landscape (external, verified 2026-06):*
- Google A2UI v0.9 — https://developers.googleblog.com/a2ui-v0-9-generative-ui/
- A2UI announcement — https://www.marktechpost.com/2025/12/22/google-introduces-a2ui-agent-to-user-interface-an-open-sourc-protocol-for-agent-driven-interfaces/
- AG-UI — https://docs.ag-ui.com/introduction
- State of Agentic UI (AG-UI vs MCP-UI vs A2UI) — https://www.copilotkit.ai/blog/the-state-of-agentic-ui-comparing-ag-ui-mcp-ui-and-a2ui-protocols
- 2026 agent protocol stack (A2A/MCP/AG-UI/A2UI) — https://medium.com/@visrow/a2a-mcp-ag-ui-a2ui-the-essential-2026-ai-agent-protocol-stack-ee0e65a672ef
- Microsoft Adaptive Cards — https://microsoft.github.io/copilot-camp/pages/extend-m365-copilot/05-add-adaptive-card/
