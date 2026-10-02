# WDL REGISTRY Specification Index

The **`REGISTRY`** section maps reusable component identifiers and token definitions into a type-safe, inheritable design system.

---

## 📚 REGISTRY Specification Versions

| Version | Spec File | Status | Description |
| :--- | :--- | :--- | :--- |
| **`v2.1`** | [`../registry.md`](../registry.md) · [`v2.1.schema.json`](v2.1.schema.json) | **Active Standard** | Utility classes and scoped CSS `rules` on the same entry. Scope root is `.semantic_id`. |
| **`v2.0`** | [`v2.0.md`](v2.0.md) · [`v2.0.schema.json`](v2.0.schema.json) | Valid | Utility classes: `__tokens__`, `uses`, variants, states, breakpoints, container queries. |
| **`v1.0`** | [`v1.0.md`](v1.0.md) | Legacy Standard | Flat class string and attribute object. |

---

## 📌 Usage Notice
`v2.1` is the active registry standard. A `v2.0` utility entry still validates and still renders. An entry with no v2 keys is read as a v1 class string or attribute object.
