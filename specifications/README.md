# Web Definition Language (WDL) — Specification Matrix

This directory contains the formal specifications for the **Web Definition Language (WDL)** primitives. In WDL v0.2.0+, each core payload block (`REGISTRY`, `COMPONENTS`, `DATA`) is independently versioned starting at **`v2.0`** to allow loose coupling and independent evolution.

---

## 📚 Specification Primitive Matrix

| Specification Domain | Active Standard | Legacy Standard | Index & Specs Directory |
| :--- | :--- | :--- | :--- |
| **`REGISTRY`** | [`v2.1`](registry.md) · [`schema`](registry/v2.1.schema.json) | [`v2.0`](registry/v2.0.md) · [`v1.0`](registry/v1.0.md) | [`registry/`](registry/README.md) |
| **`COMPONENTS`** | [`v2.0`](component/v2.0.md) · [`schema`](component/v2.0.schema.json) | [`v1.0`](component/v1.0.md) | [`component/`](component/README.md) |
| **`DATA`** | [`v2.0` envelope](data/v2.0.md) | [`v1.0`](data/v1.0.md) | [`data/`](data/README.md) |
| **Version Logs** | — | — | [`v.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/v.md) |

---

## ⚙️ Schema Versioning Architecture

Each WDL block declares its schema version via an optional `$version` property:

```json
{
  "REGISTRY": {
    "$version": "2.0",
    "card": { "base": "p-$_{pad} bg-$_{bg}" }
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
