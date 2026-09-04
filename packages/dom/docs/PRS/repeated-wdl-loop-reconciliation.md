# PR: Reconcile repeated WDL loop items from ComponentState data

## Problem

`@ruledwdl/core` correctly expands a WDL loop such as
`li.price_feature*features` into one DOM node per data item. `@ruledwdl/dom`
does not. Its initial mount creates one element for each parsed layer node and
its `liveMap` stores one element per semantic ID. A repeated semantic ID is
therefore reduced to a single live node.

On `data:change`, `WdlDom._handleData()` only delegates to the optional
`onDataBind` callback. It has no built-in logic to create, update, reorder, or
remove repeated loop children.

This forces editor consumers to duplicate WDL rendering logic in callbacks,
which breaks the package-first State → DOM contract.

## Reproduction

```js
const component = manager.create('pricing-card', {
  layers: 'ul.features > li.feature*features',
  attr: { '.feature': { text: '${text}' } },
  data: { features: [{ text: 'First' }, { text: 'Second' }] }
});

createWdlDom({ container, component });
```

Expected: two `<li>` elements, with `data-wdl-index="0"` and
`data-wdl-index="1"` and the respective text values.

Actual: one `<li>` element is mounted. Updating `features` does not reconcile
the child count or per-item bindings unless the consumer supplies custom DOM
logic through `onDataBind`.

## Proposed package behavior

- Preserve loop/repeater metadata when translating WDL layers into the DOM
  runtime tree.
- Materialize every item in a loop at initial mount.
- On a `data:change` whose path affects a loop, reconcile that loop’s direct
  children surgically: update retained rows, insert added rows, and remove
  deleted rows.
- Bind each row against its item scope, emit `data-wdl-index`, and keep stable
  non-repeated ancestors mounted.
- Represent repeated semantic IDs without collapsing them in `liveMap`; expose
  a repeat-aware lookup or retain an indexed collection internally.
- Keep `onDataBind` as an extension hook, not as the required path for normal
  WDL `${data}` and `*loop` behavior.

## Acceptance criteria

1. A `*features` loop mounts one node per initial item.
2. `component.data.set('features', nextItems)` updates, adds, and removes loop
   rows without a component remount or `innerHTML` replacement.
3. Each repeated item resolves its own `${text}` binding.
4. Repeated rows expose their correct `data-wdl-index` values.
5. Non-repeated data and layer/attribute mutation behavior remains unchanged.
6. Add unit tests for initial loop mount, item text update, append, and remove.

## Scope

This is a package-level `@ruledwdl/dom` feature/gap fix. It should remove the
need for editor-specific repeated-child reconciliation.
