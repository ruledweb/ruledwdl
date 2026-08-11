# WDL Specification: REGISTRY (v2.0)

> **Specification Version**: `2.0`  
> **Status**: Active Standard  
> **Maintained in**: [`specifications/registry.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/registry.md)

---

## 1. Overview

The **`REGISTRY`** section maps reusable component identifiers and token definitions into a type-safe, inheritable design system. It supports global theme tokens (`__tokens__`), unbracketed variable placeholders (`prefix-$_{scoped-var}`), token inheritance (`uses`), responsive breakpoints, container queries, and component variant maps.

---

## 2. Schema Structure (v2.0)

```json
{
  "REGISTRY": {
    "$version": "2.0",
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
      "base": "p-$_{pad} rounded-$_{radius} shadow-sm"
    },
    "card": {
      "uses": ["card-base"],
      "vars": {
        "bg": "#ffffff"
      },
      "base": "bg-$_{bg} border border-gray-200",
      "variants": {
        "elevated": "shadow-lg border-transparent",
        "flat": "border-none shadow-none"
      },
      "defaultVariant": "elevated",
      "states": {
        "hover": "border-$_{color-primary}"
      },
      "breakpoints": {
        "md": "p-8"
      },
      "containers": {
        "@sm": "flex-row"
      }
    }
  }
}
```

---

## 3. Specification Features & Syntax Rules

1. **Global Tokens (`__tokens__.vars`)**:
   * Global theme dictionary rendered into CSS custom properties under `<style data-wdl="theme-tokens">`.
2. **Variable References & Placeholders**:
   * `${user-var}`: References a global token in `__tokens__.vars` (e.g. `"${spacing-card}"`).
   * `$_{scoped-var}`: Component-scoped local variable alias defined inside `vars`.
   * `prefix-$_{scoped-var}`: Unbracketed placeholder syntax (e.g. `p-$_{pad}`). The engine auto-expands this to `p-[var(--spacing-card)]` or `p-[1.5rem]`.
3. **Token Inheritance (`uses`)**:
   * `uses: ["parent-token-id"]`: Evaluates parent definitions, merging `base`, `variants`, `states`, `breakpoints`, `containers`, `scopes`, and local `vars`.
4. **Declarative State Keys**:
   * `base`: Baseline utility string.
   * `variants` & `defaultVariant`: Variation dictionary and fallback variant identifier.
   * `states`: Pseudo-classes / context flags (e.g. `"hover"`, `"focus"`).
   * `breakpoints`: Media query responsive class map (e.g. `"md"`, `"lg"`).
   * `containers`: Container query threshold class map (e.g. `"@sm"`, `"@md"`).
   * `scopes`: Child selector overrides (`& .child`).
5. **Backward Compatibility**:
   * Legacy v1.0 flat string maps (`"card": "p-4 bg-white"`) and attribute objects (`"card": { "class": "p-4" }`) remain 100% supported without modification.

---

## 4. Changelog

* **`2.0`** (Core v0.2.0): Revamped REGISTRY into a full token-driven design system with `__tokens__`, `prefix-$_{scoped-var}` placeholder expansion, `uses` inheritance, variant maps, states, breakpoints, and container queries.
* **`1.0`** (Core v0.1.x): Baseline flat registry key mapping.
