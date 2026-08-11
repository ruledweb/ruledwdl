# WDL Specification: REGISTRY (v2.0)

> **Specification Version**: `2.0`  
> **Status**: Active Standard  
> **Maintained in**: [`specifications/registry.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/registry.md)

---

## 1. Overview

The **`REGISTRY`** section maps reusable component identifiers to layer definitions, default attribute bindings, slots, and external script dependencies (`script_deps`).

---

## 2. Schema Structure (v2.0)

A valid `REGISTRY` object is a dictionary of bare class-name component IDs:

```json
{
  "$version": "2.0",
  "hero-card": {
    "layers": "div.hero_card>h2.title+p.body+button.action_btn",
    "attr": {
      ".title": { "text": "${heading}" },
      ".body": { "text": "${description}" },
      ".action_btn": { "text": "Learn More", "type": "button" }
    },
    "script_deps": [
      "https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
    ]
  }
}
```

---

## 3. Specification Rules

1. **Component Key Naming**: Keys must be bare identifier strings (e.g. `"hero-card"` or `"card"`). Selector dots (`.` or `#`) are strictly forbidden in REGISTRY keys.
2. **`layers` Property**: Standard WDL Layers expression mapping to component template DOM.
3. **`attr` Property**: Dictionary mapping element selectors (e.g. `".title"`) to attribute objects (`text`, `class`, `hx-*`, `x-*`).
4. **`script_deps` Property**: Array of CDN JavaScript URL dependencies required by the component. Script injection ordering guarantees dependencies listed before `alpine-cdn` execute prior to Alpine initialization.
5. **Schema Versioning**: Default version for WDL core 0.2.0+ is `"2.0"`.

---

## 4. Changelog

* **`2.0`** (Core v0.2.0): Introduced explicit `$version` schema field; formalized host-agnostic component script binding specs.
* **`1.0`** (Core v0.1.x): Baseline inline registry key mapping.
