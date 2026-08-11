# WDL REGISTRY Specification Index

The **`REGISTRY`** section maps reusable component identifiers and token definitions into a type-safe, inheritable design system.

---

## 📚 REGISTRY Specification Versions

| Version | Spec File | Status | Description |
| :--- | :--- | :--- | :--- |
| **`v2.0`** | [`v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/registry/v2.0.md) | **Active Standard** | Structured design system: `__tokens__`, unbracketed placeholders (`prefix-$_{var}`), `uses` inheritance, variants, states, breakpoints, container queries. |
| **`v1.0`** | [`v1.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/registry/v1.0.md) | Legacy Standard | Baseline flat registry string and attribute key mapping. |

---

## 📌 Usage Notice
For WDL Core v0.2.0+, `v2.0` is the default active standard. Legacy payloads without `v2.0` keys are automatically parsed in `v1.0` backward-compatibility mode.
