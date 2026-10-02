# WDL Specification: REGISTRY (v2.1)

> **Specification Version**: `2.1`  
> **Status**: Active Standard  
> **Maintained in**: [`specifications/registry.md`](file:///home/pradeep/cloudflare/workers/wdl/wdl-core/specifications/registry.md)

---

## 1. Overview

The **`REGISTRY`** section maps reusable component identifiers and token definitions into a type-safe, inheritable design system. Version 2.1 introduces native **Scoped CSS Rules (`@scope`)** alongside WDL's existing **Utility Class** mode (`base`, `variants`, `states`, `breakpoints`).

It supports:
1. **Utility Class Mode**: Stamp utility classes (Tailwind, UnoCSS, custom utilities) directly onto element `class` attributes.
2. **Scoped CSS Rules Mode**: Flat CSS rule objects (`rules: [{ selector, media?, css }]`) that compile to native browser `@scope (.semantic_id)` blocks inside `<style data-wdl="components">`. The scope root is the semantic id class, so the same rules match a `div`, `button`, `section`, or any other tag that carries that id.
3. **Hybrid Mode**: Combine utility classes for single-node styling and `rules` for parent-to-child component interaction recipes.

---

## 2. Schema

The normative contract is [`registry/v2.1.schema.json`](registry/v2.1.schema.json) (JSON Schema draft 2020-12). The example below is that file's example. It uses every compiled property once. `surface` is a utility string. `link` is an attribute object. `card` is a structured entry with utility classes and `rules` together.

`rules` compile to `@scope (.card)`. The HTML tag stays in the layers string. `scopes` is not part of this schema.

```json
{
  "$version": "2.1",
  "__tokens__": {
    "vars": {
      "color-primary": "#4f46e5",
      "space-card": "1.5rem"
    }
  },
  "surface": "bg-white",
  "link": { "class": "underline", "href": "${url}" },
  "card": {
    "uses": ["surface"],
    "vars": { "pad": "${space-card}" },
    "base": "shadow-md p-$_{pad}",
    "defaultVariant": "elevated",
    "variants": {
      "elevated": "shadow-lg",
      "flat": { "css": { "box-shadow": "none", "border": "1px solid #e5e7eb" } }
    },
    "states": { "hover": "shadow-lg" },
    "breakpoints": { "md": "p-8" },
    "containers": { "@md": "flex-row" },
    "rules": [
      { "selector": ":scope", "css": { "display": "flex", "gap": "0.75rem" } },
      { "selector": "& .button", "css": { "background": "#e5e7eb" } },
      { "media": "(max-width: 640px)", "selector": "& .badge", "css": { "display": "none" } }
    ]
  }
}
```

---

## 3. Specification Features & Syntax Rules

1. **Global Tokens (`__tokens__.vars`)**:
   - Rendered into CSS custom properties under `<style data-wdl="theme-tokens">`.
2. **Variable References & Syntax**:
   - `${global-token}`: References a global token in `__tokens__.vars`. Expands to `[var(--global-token)]` in Utility mode or `var(--global-token)` in Scoped CSS mode.
   - `$_{scoped-var}`: Local component variable alias defined inside `vars`. Resolves value or `var(--...)`.
   - `prefix-$_{scoped-var}`: Unbracketed placeholder syntax (e.g. `p-$_{pad}`). Engine auto-expands to `p-[var(--spacing-card)]` or `p-[1.5rem]`.
3. **Token Inheritance (`uses`)**:
   - `uses: ["parent-token-id"]`: Evaluates parent definitions in order, merging `vars`, `base`, `variants`, `states`, `breakpoints`, `containers`, and `rules` array.
4. **Utility maps (`states`, `breakpoints`, `containers`)**:
   - The map key is prefixed onto every class. `"hover": "shadow-lg"` becomes `hover:shadow-lg`. `"md": "p-8 hover:bg-blue"` becomes `md:p-8 md:hover:bg-blue`. A class that already starts with that same prefix is left as written, so `"md": "md:p-8"` stays `md:p-8`.
5. **Flat Scoped CSS Rules (`rules`)**:
   - Flat rule array containing `{ selector, media?, css: { property: value } }`. Compiles to native `@scope (.semantic_id)` CSS blocks.
6. **Variant Attributes (`data-variant`)**:
   - Variant rule objects (`variants: { elevated: { css: {...} } }`) compile to `:scope[data-variant="elevated"]` rules and emit `data-variant="elevated"` on elements.
7. **Backward Compatibility**:
   - Legacy v1.0 flat string maps (`"card": "p-4 bg-white"`), v1.0 attribute objects (`"card": { "class": "p-4" }`), and v2.0 structured utility entries (`base`, `states`, `breakpoints`) remain 100% supported without modification.

---

## 4. Changelog

* **`2.1`** (Core v0.3.5): `states`, `breakpoints`, and `containers` prefix every class with the map key. A value of `hover:bg-blue` under `md` compiles to `md:hover:bg-blue`. A class that already starts with the same prefix is unchanged.
* **`2.1`** (Core v0.3.1): Added Scoped CSS Rules (`rules: [{ selector, media?, css }]`), native `@scope` compilation under `<style data-wdl="components">`, `data-variant` attribute generation, and updated `@ruledwdl/csr` and `@ruledwdl/state` packages.
* **`2.0`** (Core v0.2.0): Revamped REGISTRY into a token-driven design system with `__tokens__`, `prefix-$_{scoped-var}` placeholder expansion, `uses` inheritance, variant maps, states, breakpoints, and container queries.
* **`1.0`** (Core v0.1.x): Baseline flat registry key mapping.
