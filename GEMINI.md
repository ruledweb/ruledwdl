# WDL Core — Session Bootstrap & Operational Guidelines

## 0. Mandatory Structured File Architecture & Development Rule
- **Always Start With Structured Files**: Always establish a clean, modular directory structure (`src/`) with single-responsibility modules from the start of development.
- **Never Bloat Monolithic Files**: Never allow single files to accumulate all UI, state, history, and inspector logic into bloated monoliths. Break down features into modular ESM files (e.g., `src/wdl-dom-tree.js`, `src/token-expander.js`, `src/registry-compiler.js`, `src/schema-version.js`).

## 1. Core Architecture & Engine Principles
- **Host-Agnostic Core (`@ruledwdl/core`)**: Pure ESM engine (`src/`) rendering declarative WDL definitions (`REGISTRY` / `COMPONENTS` / `DATA`) into clean HTML using a pluggable store interface (`src/store.js`). Zero hard framework, D1, KV, or Node IO bindings. Zero external runtime dependencies.
- **CMS & Extension Decoupling**: Core engine stays lean. CMS features (forms, schemas, query resolvers, email rendering) belong in `wdl-extensions/` or host integration libraries.
- **Layers Syntax & State Machine (`WDLDomTree`)**: Emmet-like `tag.semantic_id` syntax backed by `WDLDomTree` ([`src/wdl-dom-tree.js`](file:///home/pradeep/cloudflare/workers/wdl-core/src/wdl-dom-tree.js)).
  - Authoring Formats: Single string expressions, space-free flat string arrays (`["> div.container", "> h2.title"]`), or 5-element tuple arrays (`[depth, operator, tag, semantic_id, repeator]`).
  - Supported Operators: `>`, `+`, `<` (de-indent 1 level), `<*N` (repeater: de-indents N levels), `<@N` (depth reference: de-indents to depth N where 0 = root layer), `*N` multipliers, `*items` data loops.
  - Restricted: Strictly ONE `semantic_id` per node (no `.class1.class2`). Inline text `{}` and inline attributes `[]` are forbidden.
  - Attribute Generation: Automatically emits `wdl-comp="{semantic-id}"` attribute on every generated HTML element (defaults to class semantic ID or tag fallback, overrideable via `attr` object).
- **Native Pass-Through Principle**: NO custom wrapper abstractions on top of HTMx, Alpine.js, or Tailwind CSS. Pass standard `hx-*`, `x-*`, and utility classes through raw `attr` objects.
- **Alpine.js Critical Rules**:
  - **Script Ordering**: Any component specifying shared `Alpine.store()` scripts in `script_deps` MUST list the store registration script BEFORE `alpine-cdn` so `alpine:init` executes in order.
  - **Dynamic Insertion**: HTML inserted post-load (e.g. `htmx:afterSwap` or `innerHTML`) MUST call `Alpine.initTree(container)` to initialize reactive directives.
- **Design Token & Head Cascade**: Layered CSS variables via `DATA.__design_tokens` -> `DATA.__brand_tokens` (where `__brand_tokens` overrides), and raw `<head>` string injection via `DATA.__head`.

## 2. CSR Extension Synchronization (`@ruledwdl/csr`)
- `@ruledwdl/csr` is the zero-dependency, ultra-lightweight client-side rendering variant of WDL core.
- Whenever modifying core layers parsing, element building, or state machine logic in `@ruledwdl/core`, **MUST** run:
  ```bash
  npm run sync:csr
  ```
  This automatically syncs `layers-parser.js`, `data-resolver.js`, `token-expander.js`, `registry-compiler.js`, `element-builder.js`, and `wdl-dom-tree.js` to `packages/csr/src/` and rebuilds `packages/csr/dist/wdl-csr.min.js`.

## 3. Agent Skills & GitHub Integration
- Repository-native Agent Skills are maintained under `.github/skills/` (e.g. `.github/skills/ruledwdl-authoring/`).
- Pre-flight WDL JSON candidate validation MUST use the script:
  ```bash
  node .github/skills/ruledwdl-authoring/scripts/validate-wdl.js <path-to-json>
  ```

## 4. Git & Commit Guidelines
- **Author Identity**: ALL git commits MUST be authored by **Pradeep Dabane** (`pradeep@ruledweb.com`). NEVER use the `developerpaddy` account.
- **SSH & Remote Push**: All git pushes MUST be executed using `ruledweb` SSH access targeting `git@github.com:ruledweb/ruledwdl.git`.

## 5. NPM Package Release & Update Workflow
Whenever making updates to `@ruledwdl/core` and publishing a release:
1. **Verification**: Run `npm test` to ensure all smoke and core tests pass cleanly.
2. **Build Bundles**: Run `npm run build` to generate `dist/ruledwdl.js`, `dist/ruledwdl.min.js`, and `dist/ruledwdl.esm.js`.
3. **Sync CSR**: Run `npm run sync:csr` to update `@ruledwdl/csr`.
4. **Version Bump**: Bump the version in `package.json` using `npm version <patch|minor|major>`.
5. **Publish**: Publish the package using `npm publish --access public`.
6. **Git Push**: Push the commit and updated tags to the remote repository using `ruledweb` SSH access:
   ```bash
   git push origin main --tags
   ```

---
*Reference Documents:*
- [ruledwdl-reference.md](file:///home/pradeep/cloudflare/workers/wdl-core/docs/ruledwdl-reference.md)
- [architecture.html](file:///home/pradeep/cloudflare/workers/wdl-core/docs/architecture.html)
