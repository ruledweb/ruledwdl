# `@ruledwdl/dom` — Update Logs & Changelog

All notable changes, architectural updates, and version releases for `@ruledwdl/dom` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] — 2026-09-04

### Added
- **Component REGISTRY Utility Class Resolution**:
  - Automatically resolves and merges `component.registry` classes onto live DOM element `className` attributes alongside `semanticId` and `attr.class`.
  - Supports `REGISTRY[semanticId].base`, `REGISTRY[semanticId].class`, string shorthand, `variants`, `states` (e.g. `hover:shadow-lg`), and `breakpoints` (e.g. `md:p-8`).
  - Evaluates data scopes for tokenized values inside registry class strings.
- **Dynamic Live Class Reactivity**:
  - `registry:change`: Automatically re-evaluates and updates `className` across all live DOM elements.
  - `variant:change`: Dynamically applies the target variant's utility classes and removes old variant classes from live elements in real-time.

---

## [0.1.1] — 2026-09-04

### Added
- **Repeated WDL Loop Materialization**:
  - Initial mounting now fully expands loop layers (e.g. `li.feature*features` or `div.card*items`) into one live DOM element per item in the data array.
  - Added support for numeric repeaters (e.g. `div.star*5`).
- **Item-Scoped Data & Attribute Binding**:
  - Automatically evaluates template strings (`${field}`, `{{field}}`, `${_index}`) against each row's data scope (`{ ...componentData, ...item, _index: i }`).
  - Emits `data-wdl-index="0"`, `data-wdl-index="1"`, etc. on all repeated row elements and keeps `dataset.wdlIndex` in sync.
- **Surgical `data:change` Child Reconciliation**:
  - On `data:change` (via `component.data.set(...)` or state events), loop rows are reconciled surgically:
    - **Retained rows**: Updated in-place without tearing down DOM nodes or resetting focus/listeners.
    - **Added rows**: Injected before loop boundary anchors/siblings.
    - **Removed rows**: Cleanly unmounted and removed from live registries.
- **Multi-Element Live Node Registry (`liveNodes`)**:
  - `dom.getLiveNodes(semanticId)`: Returns an array of all live DOM elements matching a semantic ID across loops.
  - `dom.getNode(semanticId, index = 0)`: Returns the live DOM element at the given index.
  - Preserved `dom.getLiveMap()` returning the primary element for backward compatibility.
- **Static Template Binding Reactivity**:
  - Automatically re-evaluates non-loop elements containing `${field}` or `{{field}}` templates on `data:change`.

### Changed
- Refactored `parseLayersSimple` and `parseLayerToken` to extract and preserve `repeator` and `loopKey` metadata.
- Preserved `onDataBind` as an optional extension hook rather than a required mechanism for standard loops.

### Fixed
- Fixed single-node collapse where repeated semantic IDs were previously reduced to a single element in `liveMap`.

---

## [0.1.0] — 2026-07-15

### Added
- Initial release of `@ruledwdl/dom` native DOM runtime for `@ruledwdl/state`.
- Surgical DOM operations on state events:
  - `layers:change`: `set`, `append`, `prepend`, `before`, `after`, `wrap`, `unwrap`, `move`, `remove`, `update`.
  - `attr:change`: `set`, `update`, `remove`.
  - `variant:change`: `set` (`data-variant` attribute emission).
  - `registry:change`: `set`, `update`, `addRule`, `removeRule` (dynamic `<style data-wdl-dom="...">` injection).
- Fast $O(1)$ `liveMap` element registry.
- Zero external runtime dependencies.
