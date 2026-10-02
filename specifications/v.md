# WDL Specification Version Logs (`v.md`)

This log tracks all version changes, specification releases, and schema updates across **`REGISTRY`**, **`COMPONENTS`**, and **`DATA`**.

---

## 📜 Specification Version History

### Layers grammar clarification (Core v0.3.5)

> **Status**: Parser rule for the existing `<@N` operator  
> **Target Engine**: `@ruledwdl/core` 0.3.5

* `<@N` is an absolute depth climb only when a digit is present. `<@0` climbs to the root. `<@1` climbs to depth 1.
* A bare `<@` climbs one level. Core prints the following name as the tag `<@name>`.

Core only, using `renderAll` and this layers string:

```
div.drawer>aside.panel>div.header>button.close<@vertical-menu
```

```
div.drawer
  aside.panel
    div.header
      button.close
    @vertical-menu
```

```html
<div class="drawer" wdl-comp="drawer"><aside class="panel" wdl-comp="panel"><div class="header" wdl-comp="header"><button class="close" wdl-comp="close"></button></div><@vertical-menu wdl-comp="@vertical-menu"></@vertical-menu></aside></div>
```

`@vertical-menu` is inside `aside.panel`. The printed tag is `<@vertical-menu></@vertical-menu>`. It is not placed beside `div.drawer`.

### Version 0.3.0 Release (Released: 2026-08-12 — WDL Core v0.3.0)

> **Status**: Released  
> **Target Engine**: `@ruledwdl/core@^0.3.0`, `@ruledwdl/csr@^0.3.0`

* **100% Zero-Dependency Core Engine**:
  * Removed internal `marked` dependency. Bundle size dropped from **96 kB $\rightarrow$ ~13.5 kB** (**~71% size reduction**).
* **Pluggable Transformation Pipeline Hooks**:
  * Added Stage-1 state pre-processing hook: `opts.transformData(data)`.
  * Added Stage-2 element text hook: `opts.transformText(text, node)`. Enables external Markdown (`marked`, `markdown-it`), MDX, shortcode, or i18n parser plugging.

---

### Version 2.0 (Released: 2026-08-12 — WDL Core v0.2.0)

> **Status**: Current Active Standard  
> **Target Engine**: `@ruledwdl/core@^0.2.0`, `@ruledwdl/csr@^0.2.0`

* **`REGISTRY` Specification (`v2.0`)**:
  * Formalized `$version: "2.0"` schema property.
  * Standardized host-agnostic component bindings, slot rules, and `script_deps` ordering guarantees.

* **`COMPONENTS` Specification (`v2.0`)**:
  * Formalized `$version: "2.0"` schema property.
  * Added `<*N` **Multi-level Repeater De-indentation** operator.
  * Added `<@N` **Absolute Depth Reference** operator ($0$ = root scope).
  * Added automatic `wdl-comp="{semantic-id}"` attribute emission.

* **`DATA` Specification (`v2.0`)**:
  * Formalized `$version: "2.0"` schema property.
  * Standardized token cascade precedence (`__design_tokens` $\rightarrow$ `__brand_tokens`).
  * Added automatic `data-wdl-index` iteration tracking in array loops.

---

### Version 1.0 (Released: 2026-06-28 — WDL Core v0.1.0)

> **Status**: Legacy Standard  
> **Target Engine**: `@ruledwdl/core@0.1.x`

* **`REGISTRY` Specification (`v1.0`)**: Baseline component ID dictionary.
* **`COMPONENTS` Specification (`v1.0`)**: Baseline WDL Layers syntax (`>`, `+`, `<`).
* **`DATA` Specification (`v1.0`)**: Initial state model and template string interpolation.

---

## 📌 Maintenance & Migration Note

> All downstream applications, CMS plugins, and page generation engines built prior to `@ruledwdl/core@0.2.0` MUST maintain schema version routing at their end. When interacting with v0.2.0+ core engines, payloads omitting `$version` default to backward-compatible fallback mode.
