# wdl-extensions

Optional, CMS-flavored features that plug into `@wdl/core`'s `composePage` without core knowing
about any of them. Core (`src/`) only exposes two extension points:

- `opts.resolveComponent(store, project, block, designCtx) => resolved | null` — tried before
  core's own project-local lookup; return `null`/`undefined` to fall through.
- `opts.extraScripts` — an array (or `async fn(pageDATA) => array`) of extra script defs merged
  into the page's script buckets, e.g. plugin-manifest scripts.

Each extension below is a standalone folder exporting plain functions — no shared base class, no
required install order beyond what's documented per extension. Use `compose.js`'s
`composeResolvers(...)` to chain several `resolveComponent`-compatible functions together in
priority order.

| Extension | What it adds | Extra Store methods required |
|---|---|---|
| `forms/` | Renders a `{ component: "form" }` block into a self-contained `<form>` (honeypot + optional Turnstile) | `getForm(project, id)` |
| `email/` | Renders a WDL JSON email template (`{ subject?, REGISTRY?, COMPONENTS?, DATA? }`) to an email-safe HTML string | `getEmailTemplate(project, id)` (only for `renderEmailById`) |
| `queries/` | Executes a component's `data_query` at render time and injects the result into page DATA, marking the page dynamic | `executeQuery(project, query)` |
| `plugins/` | Install-order component/script/registry-token resolution across installed plugin manifests | `listPlugins(project)` |
| `system-components/` | A read-only, built-in component tier checked after project-local/plugins | `getSystemComponent(project, id)` |
| `content-schema/` | Authoring-time validation: page DATA against a content-type schema, component ID naming conventions | none (pure functions) |

## Composing several at once

```js
import { composePage, resolveComponent as resolveProjectLocal, createMemoryStore } from '@wdl/core';
import { composeResolvers } from '@wdl/core/extensions/compose';
import { createFormResolver } from '@wdl/core/extensions/forms';
import { createPluginResolver, withPlugins, collectPluginScripts } from '@wdl/core/extensions/plugins';
import { createSystemComponentResolver } from '@wdl/core/extensions/system-components';

const plugins = await store.listPlugins(project);
const pluginStore = withPlugins(store, plugins);

const resolveComponent = composeResolvers(
  createFormResolver({ siteKey: env.TURNSTILE_SITE_KEY }),
  resolveProjectLocal,
  createPluginResolver(plugins),
  createSystemComponentResolver(),
);

const { html } = await composePage(pluginStore, project, page, {
  resolveComponent,
  extraScripts: collectPluginScripts(plugins),
});
```

If you use `queries/`, put `createQueryResolver()` FIRST in the chain (it re-implements the
project-local tier itself, so it replaces `resolveProjectLocal` rather than sitting alongside it)
— see `queries/index.js` for why.

## Why these live outside `src/`

`src/` is a pure renderer: emmet → HTML, REGISTRY/attr merging, DATA binding, layouts + slots,
markdown-in-text, script injection. It has no concept of forms, spam protection, SQL, plugin
marketplaces, or content schemas — those are product decisions a host CMS makes, not rendering
concerns. Splitting them out here means `src/` stays embeddable in any project (a static site
generator, a different CMS, a one-off tool) without dragging in assumptions that only make sense
for one specific product.
