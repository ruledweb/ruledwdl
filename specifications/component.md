# WDL Specification: COMPONENTS (v2.0)

> **Specification Version**: `2.0`  
> **Status**: Active Standard  
> **Maintained in**: [`specifications/component.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/component.md)

---

## 1. Overview

The **`COMPONENTS`** specification governs the declarative presentation hierarchy of a WDL page. It supports inline WDL Layers string expressions and re-usable component references.

---

## 2. Schema Structure (v2.0)

`COMPONENTS` is an array of component definitions. Each entry follows either the **Layers Form** or **Component Reference Form**:

### A. Layers Form
```json
{
  "$version": "2.0",
  "layers": "section.hero>div.container>h1.title+p.subtitle<*2footer.site_footer",
  "attr": {
    ".title": { "text": "${page_title}" },
    ".subtitle": { "text": "${page_subtitle}" }
  }
}
```

### B. Component Reference Form
```json
{
  "$version": "2.0",
  "component": "hero-card",
  "data_overrides": {
    "heading": "Custom Heading Title"
  },
  "style_overrides": {
    ".hero_card": { "class": "bg-blue-900 text-white p-8 rounded-xl" }
  }
}
```

---

## 3. WDL Layers Grammar v2.0

Every element node in a `layers` expression MUST follow `tag.semantic_id`. Strictly **one** semantic class ID per node.

| Syntax | Operator Name | Description |
| :--- | :--- | :--- |
| `>` | Child | Descend into child DOM level. |
| `+` | Sibling | Add sibling at current DOM level. |
| `<` | De-indent | Climb up 1 parent scope level (`<<` climbs 2 levels). |
| `<*N` | Repeater De-indent | De-indents $N$ parent levels (e.g. `<*3` $\equiv$ `<<<`). *(New in v2.0)* |
| `<@N` | Absolute Depth | De-indents directly to absolute depth level $N$ ($0$ = root scope). *(New in v2.0)* |
| `*N` | Static Multiplier | Renders element $N$ times (`li.item*3`). |
| `*items` | Data Loop | Renders array loop over `DATA.items` (`li.post*posts`). |

---

## 4. Automatic Attribute Emission v2.0

* **`wdl-comp="{semantic-id}"`**: Emitted on every element (class semantic ID or tag fallback, overrideable in `attr`).
* **`data-wdl-index="{index}"`**: Emitted automatically on data loop item elements.

---

## 5. Changelog

* **`2.0`** (Core v0.2.0): Added `<*N` repeater operator, `<@N` absolute depth reference operator, automatic `wdl-comp` attribute emission, and `$version` schema field.
* **`1.0`** (Core v0.1.x): Baseline WDL Layers syntax (`>`, `+`, `<`).
