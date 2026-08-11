# Web Definition Language (WDL) — Specification Index

This directory contains the formal specifications for the **Web Definition Language (WDL)** primitives. In WDL v0.2.0+, each core payload block (`REGISTRY`, `COMPONENTS`, `DATA`) is independently versioned starting at **v2.0** to allow loose coupling and independent evolution.

---

## 📚 Specification Modules

| Specification | Version | Spec File | Description |
| :--- | :--- | :--- | :--- |
| **`REGISTRY`** | `2.0` | [`registry.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/registry.md) | Component registry contract, slot definitions, script dependencies (`script_deps`), and style overrides. |
| **`COMPONENTS`** | `2.0` | [`component.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/component.md) | WDL Layers DOM expression syntax (`tag.semantic_id`, `>`, `+`, `<*N`, `<@N`), component references, and automatic `wdl-comp` attributes. |
| **`DATA`** | `2.0` | [`data.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/data.md) | Page state model, array loops, design token cascade (`__design_tokens`, `__brand_tokens`), and `<head>` string injection. |
| **Version Logs** | — | [`v.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/v.md) | Complete versioning history and changelog across all specifications. |

---

## ⚙️ Schema Versioning Architecture

Each WDL block may declare its schema version via an optional `$version` property:

```json
{
  "REGISTRY": {
    "$version": "2.0",
    "card": { "layers": "div.card>h2.title+p.body" }
  },
  "COMPONENTS": [
    {
      "$version": "2.0",
      "layers": "section.hero>h1.title+p.subtitle<*2footer"
    }
  ],
  "DATA": {
    "$version": "2.0",
    "title": "WDL v2.0 Page"
  }
}
```

---

## 📌 Downstream Compatibility Note

> [!IMPORTANT]
> **Legacy Version Maintenance Notice**:
> All applications, headless CMS backends, page authoring tools, and parsers developed for WDL core **prior to version 0.2.0** MUST explicitly maintain and specify schema versions (`$version`) at their end when interacting with v0.2.0+ core engines to ensure proper backwards compatibility routing.
