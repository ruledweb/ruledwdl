# WDL DATA Specification Index

The **`DATA`** section manages state, dynamic data loops, head element injections, and design token cascades for WDL page rendering.

---

## 📚 DATA Specification Versions

| Version | Spec File | Status | Description |
| :--- | :--- | :--- | :--- |
| **`v2.0`** | [`v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/data/v2.0.md) | **Active Standard** | State model v2.0: token cascade precedence (`__design_tokens` $\rightarrow$ `__brand_tokens`), `data-wdl-index` iteration tracking, and `$version` metadata. |
| **`1.0`** | [`v1.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/data/v1.0.md) | Legacy Standard | Baseline state object and `${var}` data binding. |

---

## 📌 Usage Notice
For WDL Core v0.2.0+, `v2.0` is the default active standard.
