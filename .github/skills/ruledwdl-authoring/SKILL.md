---
name: ruledwdl-authoring
description: Skill for AI agents to generate valid RuledWDL JSON (REGISTRY, COMPONENTS, DATA, DATA_SCHEMA) and use @ruledwdl/core APIs to produce clean HTML markup. Trigger whenever building, editing, or authoring RuledWDL page layouts, components, stores, or HTML structures.
license: AGPL-3.0-or-later
metadata:
  website: ruledwdl.dev
  author: Pradeep Dabane
---

# RuledWDL Authoring & Core API Guide

RuledWDL is a declarative JSON specification and host-agnostic layout runtime that compiles structured WDL JSON (`REGISTRY`, `COMPONENTS`, `DATA`, `DATA_SCHEMA`) directly into optimized HTML.

For full landing page blueprints and anti-pattern pairs, inspect [references/examples.md](file:///home/pradeep/cloudflare/workers/wdl-core/.github/skills/ruledwdl-authoring/references/examples.md).

---

## 1. Top-Level Page & Sub-schema Specifications (v2.1)

A complete RuledWDL page is a JSON object composed of four key sections: `REGISTRY` (v2.1), `COMPONENTS` (v2.0), `DATA` (v2.0), and `DATA_SCHEMA` (JSON Schema Draft-07):

```json
{
  "layout": "default",
  "fullPage": false,
  "title": "Product Overview",
  "REGISTRY": {
    "$version": "2.1",
    "card": {
      "rules": [
        { "selector": ":scope", "css": { "display": "flex", "padding": "var(--space-card)" } },
        { "selector": "& .button", "css": { "background": "var(--color-primary)" } }
      ],
      "vars": {
        "space-card": "1.5rem",
        "color-primary": "#0284c7"
      }
    }
  },
  "COMPONENTS": [
    {
      "$version": "2.0",
      "layers": "section.hero > h1.title + p.subtitle + a.cta_btn",
      "attr": {
        ".title": { "text": "${heading}" },
        ".subtitle": { "text": "${subheading}" },
        ".cta_btn": { "text": "Get Started", "href": "/signup" }
      }
    }
  ],
  "DATA": {
    "$version": "2.0",
    "heading": "Ship High-Performance Web Apps",
    "subheading": "Declarative JSON to clean HTML with zero framework overhead."
  },
  "DATA_SCHEMA": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "title": "PageDataProps",
    "properties": {
      "heading": { "type": "string" },
      "subheading": { "type": "string" }
    },
    "required": ["heading"]
  }
}
```

- **`REGISTRY`** ([`specifications/registry/v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/registry/v2.0.md)): Map of component tokens, base attributes, Scoped CSS `@scope` rules, and CSS variables.
- **`COMPONENTS`** ([`specifications/component/v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/component/v2.0.md)): Ordered array of visual layer definitions or component references.
- **`DATA`** ([`specifications/data/v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/data/v2.0.md)): State object containing dynamic variables, loop arrays, head elements, and CSS design tokens.
- **`DATA_SCHEMA`**: Standard JSON Schema (Draft-07) defining the typing contract and property validation for `DATA`.
- **`layout`** *(optional)*: Name of the layout wrapper to extend.
- **`fullPage`** *(optional)*: Boolean. If `false` (default), the renderer wraps the output with UTF-8, viewport, title, and Tailwind CSS.

---

## 2. `@ruledwdl/core` Programmatic Engine APIs

### `composePage(store, tenant, page, options)`
Composes a full WDL page with layout wrappers, design token cascading, script bucket management, and component resolution:

```javascript
import { composePage, createMemoryStore } from '@ruledwdl/core';

const store = createMemoryStore({
  layouts: {
    default: {
      name: 'default',
      COMPONENTS: [{ layers: 'div.shell', attr: { '.shell': { text: '{{content}}' } } }],
      DATA: { __design_tokens: ':root { --color-primary: #0284c7; }' }
    }
  }
});

const { html, dynamic, tokens, versions, script_deps } = await composePage(store, 'tenant-id', pageDef, {
  resolveComponent: async (store, project, block) => null, // Optional component macro resolver hook
  transformData: (data) => data,                           // Pre-process data state
  transformText: (text, node) => text                      // Pluggable markdown parser (e.g. marked)
});
```

### `renderAll(REGISTRY, COMPONENTS, DATA, options)`
Synchronous, standalone renderer that maps components directly into an HTML fragment without layout stores:

```javascript
import { renderAll } from '@ruledwdl/core';

const html = renderAll(REGISTRY, COMPONENTS, DATA);
```

### `createMemoryStore(initialData)` & `createFileStore(rootDir)`
Initializes in-memory or filesystem-backed WDL stores conforming to the Store contract (`getLayout`, `getComponent`, `getScript`, `getComponentRegistry`, `getDoc`):

```javascript
import { createMemoryStore, createFileStore } from '@ruledwdl/core';

// In-Memory Store
const memStore = createMemoryStore({
  layouts: { ... },
  components: { ... }
});

// File System Store (Node.js environments)
const fileStore = createFileStore('/path/to/wdl/project');
```

### `WDLDomTree` (AST State Machine)
Low-level tree state machine supporting 5-element tuple arrays (`[depth, operator, tag, semantic_id, repeator]`), AST mutations, and serialization:

```javascript
import { WDLDomTree } from '@ruledwdl/core';

// Ingest from layers string or 5-element tuple array
const tree = new WDLDomTree('section.hero > h1.title + p.subtitle');

// Sibling and child mutations
tree.wrap('title', 'div.title_wrapper');
tree.append('hero', 'button.cta');

// Serialize back to WDL layers string
console.log(tree.toString()); // 'section.hero>div.title_wrapper>h1.title<p.subtitle+button.cta'
```

---

## 3. WDL Layers Grammar & Scoping Rules

The `layers` string defines the visual DOM hierarchy using a compact selector syntax.

### Syntax Rules
- **Element Node Format**: Must strictly be `tag.semantic_id` (e.g. `div.hero`, `h1.title`, `button.submit`).
- **Default Tag**: Bare `.card` evaluates to `div.card`.
- **Supported Operators**:
  - `>` : Descend to child scope (`>` binds tighter than `+`).
  - `+` : Add sibling at current scope level.
  - `<` : De-indent 1 parent scope level (`<<` climbs 2 levels).
  - `<*N` : De-indent repeater ($N$ levels, e.g. `<*3` $\equiv$ `<<<`).
  - `<@N` : De-indent to absolute depth level $N$ (where depth 0 = root layer elements).
  - `*N` : Static numeric multiplier (`li.item*3`).
  - `*key` or `*nested.path` : Data array loop (`div.card*features`).
- **Automatic Attributes**:
  - Every rendered element automatically receives `wdl-comp="{semantic-id}"` (`{semantic-id}` is the class name or tag fallback, overrideable in `attr`).

### Operator Examples

#### 1. Child (`>`) & Sibling (`+`)
```
section.hero > h1.title + p.subtitle + button.cta
```

#### 2. Scope Climb (`<`, `<<`, `<*N`, `<@N`)
```
// '<' climbs 1 level: banner is sibling of container inside header
header > div.container > h1.title + p.sub < div.banner

// '<<' climbs 2 levels: footer is sibling of main inside shell
div.shell > main > div.content > p.text << footer.site_footer

// '<*3' repeats de-indent 3 levels
div.level0 > div.level1 > div.level2 > div.level3 > p.leaf <*3 div.sibling_of_level1

// '<@0' jumps back to absolute root depth (depth 0)
section.section1 > div.container > h2.title <@0 section.section2 > div.container > h2.title
```

#### 3. Data Loop (`*loopKey`)
```
ul.list > li.item*posts > h3.post_title + p.post_excerpt
```

### Authoring Formats

#### Format 1: Single String Expression
```
header > div.container > h1.title + p.sub < div.banner
```

#### Format 2: Flat String Array (Clean, Zero Indent Whitespace Burden)
```json
"layers": [
  "header",
  "> div.container",
  "> h1.title",
  "+ p.sub",
  "< div.banner"
]
```

#### Format 3: 5-Element Tuple Array (`[depth, operator, tag, semantic_id, repeator]`)
```json
"layers": [
  [0, "",  "header", "site_header", null],
  [1, ">", "div",    "container",   null],
  [2, ">", "h1",     "title",       null],
  [2, "+", "p",      "sub",         null],
  [1, "<", "div",    "banner",      null]
]
```

### Strict Negative Constraints (Will Throw Parse Errors)
- **NO Multiple Classes**: Strictly max 1 `semantic_id` per node (`.class1.class2` is FORBIDDEN). Place additional CSS classes in `REGISTRY` or `attr[".semantic_id"].class`.
- **NO Inline Text `{}`**: Text MUST go in `attr[".semantic_id"].text` or `DATA`.
- **NO Inline Attributes `[]`**: HTML attributes MUST go in the `attr` object.
- **NO `^` Operator**: Scope climbing with `^` is forbidden; use `<` instead.
- **NO Grouping `()`**: Split complex structures into multiple `COMPONENTS` entries.

---

## 4. REGISTRY (Schema v2.1 Scoped CSS & Tokens)

The `REGISTRY` maps semantic component IDs to default attributes, Scoped CSS rules, and variables:

```json
"REGISTRY": {
  "$version": "2.1",
  "card": {
    "class": "bg-white rounded-xl shadow-md transition hover:shadow-lg",
    "rules": [
      { "selector": ":scope", "css": { "padding": "var(--space-card)", "display": "flex", "flex-direction": "column" } },
      { "selector": "&:hover .title", "css": { "color": "var(--color-primary)" } },
      { "selector": "& .badge", "media": "(max-width: 640px)", "css": { "display": "none" } }
    ],
    "vars": {
      "space-card": "1.5rem",
      "color-primary": "#0284c7"
    }
  }
}
```

### Registry Features
- **Scoped CSS Rules (`@scope`)**: Compiled directly into `<style data-wdl="components">` using native CSS `@scope (tag.semantic_id)`.
- **`:scope`**: Refers to the component root element.
- **`& .child`**: Refers to descendants inside the component boundary.
- **`vars`**: Emits scoped CSS custom properties `--var-name: value`.

---

## 5. Attribute Matching (`attr`) Rules

The `attr` object maps element selectors to HTML attributes.

### Match Precedence Order
1. **First Matching Class Selector**: `attr[".classname"]` (**ALWAYS PREFERRED**).
2. **Tag Fallback**: `attr["tagname"]` (applies to all elements of that tag).

```json
"attr": {
  ".title": { "text": "${title}" },
  ".link": { "href": "${url}", "target": "_blank", "rel": "noopener" },
  ".avatar": { "src": "${user.avatar}", "alt": "${user.name}", "loading": "lazy" }
}
```

> **CRITICAL**: Never use combined selectors like `"h1.title"` in `attr`. Always use bare `".title"`.

### Special Attr Keys
- **`class`**: CSS class string, merged with layers class and matching `REGISTRY` entries.
- **`attr-ref`**: String key of a `REGISTRY` entry to inherit base attributes from.
- **`text`**: Inner content rendered as **inline Markdown** (escaped HTML) or raw text for `<script>`/`<style>`.
- **`html`**: Raw unsanitized HTML (use only when explicitly intended).
- **`alpine`**: Object containing Alpine.js directives (`{ "x-data": "...", "@click": "..." }`).
- **`htmx`**: Object containing HTMx directives (`{ "hx-get": "/api", "hx-target": "#app" }`).
- **`:event.modifier`**: Declarative DOM event bindings (`{ ":click": "save", ":submit.prevent": "handleSubmit" }`).

### Inline Markdown Rules for `text`
- `**bold**` $\to$ `<strong>bold</strong>`
- `*italic*` $\to$ `<em>italic</em>`
- `` `code` `` $\to$ `<code>code</code>`
- `[link text](url)` $\to$ `<a href="url">link text</a>`

---

## 6. DATA Binding & Array Loop Rules

### Basic Value Binding
- `${key}`: Binds top-level `DATA` string/number.
- `${nested.path}`: Binds object property paths.

### Loop Arrays (`*loopKey`)
- **MUST be an array of objects**: `[{"label": "Alpha"}, {"label": "Beta"}]`.
- **FORBIDDEN**: Arrays of primitive strings `["Alpha", "Beta"]`.
- **Direct Variable Access**: Inside the loop body, bind properties directly as `${label}`.
- **Index**: Use `${_index}` for zero-based loop index.

```json
{
  "COMPONENTS": [
    {
      "layers": "ul.nav_list > li.nav_item*menuItems",
      "attr": {
        ".nav_item": {
          "text": "${label}",
          "data-index": "${_index}"
        }
      }
    }
  ],
  "DATA": {
    "menuItems": [
      { "label": "Home" },
      { "label": "About" },
      { "label": "Contact" }
    ]
  }
}
```

---

## 7. DATA_SCHEMA (JSON Schema Draft-07 Standard)

Every reusable component definition and page state model can specify a **`DATA_SCHEMA`** complying with standard **JSON Schema (Draft-07)**:

```json
{
  "id": "feature-card",
  "definition": {
    "REGISTRY": {
      "$version": "2.1",
      "card": {
        "rules": [
          { "selector": ":scope", "css": { "padding": "1.5rem", "border-radius": "0.75rem" } }
        ]
      }
    },
    "COMPONENTS": [
      {
        "layers": "div.card > span.badge + h3.title + p.desc + a.link",
        "attr": {
          ".badge": { "text": "${badge}" },
          ".title": { "text": "${title}" },
          ".desc": { "text": "${description}" },
          ".link": { "text": "${cta.label}", "href": "${cta.url}" }
        }
      }
    ],
    "DATA": {
      "badge": "New",
      "title": "Edge Runtime",
      "description": "Blazing fast SSR and CSR with zero dependencies.",
      "cta": { "label": "Learn More", "url": "/docs" }
    },
    "DATA_SCHEMA": {
      "$schema": "http://json-schema.org/draft-07/schema#",
      "type": "object",
      "title": "FeatureCardProps",
      "description": "Schema contract for feature card component properties",
      "properties": {
        "badge": { "type": "string", "description": "Top badge text" },
        "title": { "type": "string", "description": "Card main headline" },
        "description": { "type": "string", "description": "Card body paragraph" },
        "cta": {
          "type": "object",
          "properties": {
            "label": { "type": "string" },
            "url": { "type": "string", "format": "uri-reference" }
          },
          "required": ["label", "url"]
        }
      },
      "required": ["title", "description"]
    }
  }
}
```

---

## 8. Reserved DATA Keys

| Reserved Key | Type | Description |
| :--- | :--- | :--- |
| **`__seo`** | Object | SEO meta tags (`title`, `description`, `canonical`, `og:*`, etc.). |
| **`__head`** | Array | Raw `<head>` tags (e.g. `<link rel="icon">`, preconnects, theme-color). |
| **`__design_tokens`** | String \| Array | Layered base CSS custom properties (e.g. Tailwind v4 `@theme` / `:root` declarations). |
| **`__brand_tokens`** | String \| Array | Brand override CSS custom properties (always overrides `__design_tokens`). |

---

## 9. Alpine.js & Script Dependency Rules

To use frontend interactivity with Alpine.js:
1. Declare script dependencies on the component (`script_deps`).
2. Attach directives in `attr[".selector"].alpine`.

```json
{
  "COMPONENTS": [
    {
      "layers": "div.dropdown > button.toggle + div.menu",
      "attr": {
        ".dropdown": { "alpine": { "x-data": "{ open: false }" } },
        ".toggle":   { "alpine": { "@click": "open = !open" }, "text": "Menu" },
        ".menu":     { "alpine": { "x-show": "open", "@click.outside": "open = false" }, "text": "Content" }
      },
      "script_deps": ["store-ui", "alpine-cdn"]
    }
  ]
}
```

> **Script Ordering Rule**: When registering shared stores across separate components, always list the store script **BEFORE** `"alpine-cdn"` in `script_deps` so `alpine:init` fires in order.

---

## 10. CLI Usage

```bash
# Render a page to stdout
npx ruledwdl render <project-dir> <slug>

# Run live preview server
npx ruledwdl serve [project-dir] [port]
```

---

## 11. Pre-Flight Automated Validation Script

AI agents **MUST** run the bundled validation script to verify generated WDL JSON before completing authoring tasks:

```bash
node .github/skills/ruledwdl-authoring/scripts/validate-wdl.js <path-to-json-file>
```
