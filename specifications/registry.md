# WDL Specification: REGISTRY (v2.1)

> **Specification Version**: `2.1`  
> **Status**: Active Standard  
> **Maintained in**: [`specifications/registry.md`](file:///home/pradeep/cloudflare/workers/wdl/wdl-core/specifications/registry.md)

---

## 1. Overview

The **`REGISTRY`** section maps reusable component identifiers and token definitions into a type-safe, inheritable design system. Version 2.1 introduces native **Scoped CSS Rules (`@scope`)** alongside WDL's existing **Utility Class** mode (`base`, `variants`, `states`, `breakpoints`).

It supports:
1. **Utility Class Mode**: Stamp utility classes (Tailwind, UnoCSS, custom utilities) directly onto element `class` attributes.
2. **Scoped CSS Rules Mode**: Flat CSS rule objects (`rules: [{ selector, media?, css }]`) that compile to native browser `@scope (tag.semantic_id)` blocks inside `<style data-wdl="components">`.
3. **Hybrid Mode**: Combine utility classes for single-node styling and `rules` for parent-to-child component interaction recipes.

---

## 2. Schema Structure (v2.1)

```json
{
  "REGISTRY": {
    "$version": "2.1",
    "__tokens__": {
      "vars": {
        "color-primary": "#4f46e5",
        "color-primary-hover": "#4338ca",
        "radius-card": "0.75rem",
        "spacing-card": "1.5rem"
      }
    },
    "card-base": {
      "vars": {
        "pad": "${spacing-card}",
        "radius": "${radius-card}"
      },
      "rules": [
        {
          "selector": ":scope",
          "css": {
            "padding": "$_{pad}",
            "border-radius": "$_{radius}"
          }
        }
      ]
    },
    "card": {
      "uses": ["card-base"],
      "vars": {
        "bg": "#ffffff"
      },
      "base": "shadow-md transition-all",
      "defaultVariant": "elevated",
      "variants": {
        "elevated": {
          "css": {
            "box-shadow": "0 10px 15px -3px rgba(0,0,0,0.1)",
            "border": "1px solid transparent"
          }
        },
        "flat": {
          "css": {
            "box-shadow": "none",
            "border": "1px solid #e5e7eb"
          }
        }
      },
      "rules": [
        {
          "selector": ":scope",
          "css": {
            "display": "flex",
            "flex-direction": "column",
            "gap": "0.75rem",
            "background": "$_{bg}"
          }
        },
        {
          "selector": "& .button",
          "css": {
            "background": "#e5e7eb",
            "color": "#111827"
          }
        },
        {
          "media": "(min-width: 768px)",
          "selector": "&:hover .button",
          "css": {
            "background": "${color-primary-hover}",
            "color": "#ffffff"
          }
        }
      ]
    }
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
4. **Flat Scoped CSS Rules (`rules`)**:
   - Flat rule array containing `{ selector, media?, css: { property: value } }`. Compiles to native `@scope (tag.semantic_id)` CSS blocks.
5. **Variant Attributes (`data-variant`)**:
   - Variant rule objects (`variants: { elevated: { css: {...} } }`) compile to `:scope[data-variant="elevated"]` rules and emit `data-variant="elevated"` on elements.
6. **Backward Compatibility**:
   - Legacy v1.0 flat string maps (`"card": "p-4 bg-white"`), v1.0 attribute objects (`"card": { "class": "p-4" }`), and v2.0 structured utility entries (`base`, `states`, `breakpoints`) remain 100% supported without modification.

---

## 4. Changelog

* **`2.1`** (Core v0.3.1): Added Scoped CSS Rules (`rules: [{ selector, media?, css }]`), native `@scope` compilation under `<style data-wdl="components">`, `data-variant` attribute generation, and updated `@ruledwdl/csr` and `@ruledwdl/state` packages.
* **`2.0`** (Core v0.2.0): Revamped REGISTRY into a token-driven design system with `__tokens__`, `prefix-$_{scoped-var}` placeholder expansion, `uses` inheritance, variant maps, states, breakpoints, and container queries.
* **`1.0`** (Core v0.1.x): Baseline flat registry key mapping.
