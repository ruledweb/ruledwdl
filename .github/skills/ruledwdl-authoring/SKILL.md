---
name: ruledwdl-authoring
description: Skill for AI agents to generate valid RuledWDL JSON (REGISTRY, COMPONENTS, DATA) to produce clean HTML markup. Trigger whenever building, editing, or authoring RuledWDL page layouts, components, or HTML structures.
license: AGPL-3.0-or-later
metadata:
  website: ruledwdl.dev
  author: Pradeep Dabane
---

# RuledWDL Authoring Guide for AI Agents

RuledWDL is a declarative JSON specification that turns structured WDL JSON into clean HTML markup. This skill teaches AI agents how to generate 100% valid RuledWDL JSON objects.

For comprehensive examples and anti-patterns to prevent model hallucinations, inspect [references/examples.md](file:///home/pradeep/cloudflare/workers/wdl-core/.github/skills/ruledwdl-authoring/references/examples.md).

---

## 1. Top-Level Page & Sub-schema Specifications (v2.1)

A complete RuledWDL page is a single JSON object with three primary sections: `REGISTRY`, `COMPONENTS`, and `DATA`. Each section follows an independent specification versioned up to **`2.1`** (see [`specifications/`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/README.md)).

```json
{
  "layout": "default",
  "fullPage": false,
  "REGISTRY": {
    "$version": "2.1",
    "card": {
      "rules": [
        { "selector": ":scope", "css": { "display": "flex", "padding": "var(--space-card)" } },
        { "selector": "& .button", "css": { "background": "#e5e7eb" } }
      ]
    }
  },
  "COMPONENTS": [
    {
      "$version": "2.0",
      "layers": "section.hero>h1.title"
    }
  ],
  "DATA": {
    "$version": "2.0"
  }
}
```

- **`REGISTRY`** ([`specifications/registry/v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/registry/v2.0.md)): Map of component tokens, base attributes, `__tokens__`, and `script_deps` (v2.0).
- **`COMPONENTS`** ([`specifications/component/v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/component/v2.0.md)): Ordered array of visual layer definitions or component references (v2.0).
- **`DATA`** ([`specifications/data/v2.0.md`](file:///home/pradeep/cloudflare/workers/wdl-core/specifications/data/v2.0.md)): State object containing dynamic variables, loop arrays, head elements, and CSS design tokens (v2.0).
- **`layout`** *(optional)*: Name of the layout wrapper to extend.
- **`fullPage`** *(optional)*: Boolean. Set `true` only if the layout outputs a complete `<html>` document. If `false` (default), the renderer automatically wraps output with UTF-8, viewport, title, and Tailwind CSS.

> **Pre-v0.2.0 Compatibility Notice**:  
> Applications, page authors, and CMS backends targeting WDL core versions prior to 0.2.0 MUST explicitly specify/maintain schema versions at their end to ensure backward compatibility routing.

---

## 2. COMPONENTS Structure

`COMPONENTS` is an array containing two entry types:

### A. Layers Form (Direct DOM Tree)
```json
{
  "layers": "section>div.hero>h1.title+p.subtitle+button.cta_btn",
  "attr": {
    ".title": { "text": "${heading}" },
    ".subtitle": { "text": "${subheading}" },
    ".cta_btn": { "text": "Get Started", "type": "button" }
  }
}
```

### B. Component Reference Form
```json
{
  "component": "card",
  "data_overrides": {
    "title": "Custom Card Title"
  },
  "style_overrides": {
    ".card": { "class": "bg-gray-100 p-6 rounded-lg" }
  }
}
```

> **Note on Overrides:**
> - `data_overrides`: Merged **page-wide** into the `DATA` object (visible to all components).
> - `style_overrides`: Shallow-merged per selector key onto the resolved `attr` object. A selector key present in `style_overrides` fully replaces that selector's `attr` entry.

---

## 3. WDL Layers Grammar & Scoping Rules

The `layers` string defines the DOM hierarchy using a compact selector syntax.

### Syntax Rules
- **Element Node Format**: Must strictly be `tag.semantic_id` (e.g. `div.hero`, `h1.title`, `button.submit`).
- **Default Tag**: `.card` evaluates to `div.card`.
- **Operators**:
  - `>` : Descend to child scope (`>` binds tighter than `+`).
  - `+` : Add sibling at current scope level.
  - `<` : De-indent 1 parent scope level (`<<` climbs 2 levels).
  - `<*N` : De-indent repeater ($N$ levels, e.g. `<*3` $\equiv$ `<<<`).
  - `<@N` : De-indent to absolute depth level $N$ (where depth 0 = root layer elements).
  - `*N` : Static numeric multiplier (`li.item*3`).
  - `*key` or `*key.path` : Data array loop (`li.post_item*posts`).
- **Automatic Attributes**:
  - Every rendered element automatically receives `wdl-comp="{semantic-id}"` (`{semantic-id}` is the class name or tag fallback, overrideable in `attr`).

### Scoping & Authoring Format Examples

#### Format 1: Single String Expression
```
header>div.container>h1.title+p.sub<div.banner
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

## 4. REGISTRY (Style Tokens)

The `REGISTRY` maps bare class names to default attribute objects.

```json
"REGISTRY": {
  "site-header": {
    "class": "bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between"
  },
  "btn-primary": {
    "class": "bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition"
  }
}
```

### Registry Key Rules
- Keys MUST be bare class names (e.g. `"site-header"` or `"btn-primary"`).
- **FORBIDDEN**: `"header.site-header"` (tag+class) or `"header"` (bare tag) — these will never match or will be ignored.

---

## 5. Attribute Matching (`attr`) Rules

The `attr` object maps element selectors to HTML attributes.

### Match Precedence Order
1. **First Matching Class Selector**: `attr[".classname"]` (**ALWAYS PREFERRED**).
2. **Tag Fallback**: `attr["tagname"]` (applies to ALL elements of that tag).

```json
"attr": {
  ".project_title": { "text": "${title}" },
  ".css_link": { "rel": "stylesheet", "href": "/main.css" }
}
```

> **CRITICAL**: Never use combined selectors like `"h1.project_title"` in `attr`. Combined keys fail matching and result in unstyled elements with empty text.

### Any HTML Attribute Supported
Every key in an `attr` entry (except special keys) passes directly through to HTML attributes: `href`, `src`, `id`, `type`, `placeholder`, `required`, `disabled`, `data-*`, `aria-*`, `style`, `tabindex`, etc.

### Special Attr Keys
- **`class`**: CSS class string, merged with layers class and matching `REGISTRY` entries.
- **`attr-ref`**: String key of a `REGISTRY` entry to inherit base attributes from.
- **`text`**: Inner content rendered as **inline Markdown** (escaped HTML) or raw text for `<script>`/`<style>`.
- **`alpine`**: Object containing Alpine.js directives flattened onto the element (`x-data`, `@click`, `x-show`, `x-init`, etc.).
- **`htmx`**: Object containing `hx-*` directives.

### Inline Markdown Rules for `text`
`text` supports inline Markdown formatting:
- `**bold**` -> `<strong>bold</strong>`
- `*italic*` / `_italic_` -> `<em>italic</em>`
- `` `code` `` -> `<code>code</code>`
- `[link text](url)` -> `<a href="url">link text</a>`

**Markdown Restrictions:**
- **Inline only**: Leading `#`, `-`, `>`, or `1.` stay literal text (do not create headings/lists/blockquotes; use layers structure instead).
- Safe by construction: Raw HTML tags inside `text` are escaped (`<script>` will not execute).
- Generated Markdown tags carry no classes (style them via parent container class).

---

## 6. DATA Binding & Array Loop Rules

### Basic Value Binding
- `${key}`: Binds top-level `DATA` string/number.
- `${nested.path}`: Binds object property paths.

### Loop Arrays (`*loopKey`)
When repeating elements via `*loopKey` in layers (e.g. `li.item*items`):
- **MUST be an array of objects**: `[{"label": "Alpha"}, {"label": "Beta"}]`.
- **FORBIDDEN**: Arrays of primitive strings `["Alpha", "Beta"]` (causes empty string binding). Wrap strings as `[{"item": "Alpha"}, {"item": "Beta"}]` and use `${item}`.
- **Direct Variable Access**: Inside the loop body, bind properties directly as `${label}` (NOT `${items.label}`).
- **Index**: Use `${_index}` for zero-based position.

```json
{
  "COMPONENTS": [
    {
      "layers": "ul.nav_list>li.nav_item*menuItems",
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

## 7. Reserved DATA Keys

| Reserved Key | Type | Description |
| :--- | :--- | :--- |
| **`__seo`** | Object | SEO meta tags (`title`, `description`, `canonical`, etc.). |
| **`__head`** | Array | Raw `<head>` tags (e.g. `<link rel="icon">`, preconnects, theme-color). |
| **`__design_tokens`** | String \| Array | Layered CSS custom properties (e.g. Tailwind v4 `@theme` / `:root` declarations). |
| **`__brand_tokens`** | String \| Array | Final-priority CSS custom properties (always overrides `__design_tokens`). |

### Head and Design Tokens Example
```json
"DATA": {
  "__seo": {
    "title": "Product Documentation",
    "description": "Comprehensive guide to RuledWDL architecture."
  },
  "__head": [
    "<link rel=\"icon\" href=\"/favicon.ico\">",
    "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">"
  ],
  "__design_tokens": ":root { --color-primary: #3b82f6; --radius: 0.5rem; }",
  "__brand_tokens": ":root { --color-primary: #1d4ed8; }"
}
```

---

## 8. Alpine.js & Script Dependency Rules

To use frontend interactivity with Alpine.js:

1. Declare script dependencies on the component (`script_deps`).
2. Attach directives in `attr[".selector"].alpine`.

```json
{
  "COMPONENTS": [
    {
      "layers": "div.dropdown>button.toggle+div.menu",
      "attr": {
        ".dropdown": { "alpine": { "x-data": "{ open: false }" } },
        ".toggle":   { "alpine": { "@click": "open = !open" }, "text": "Menu" },
        ".menu":     { "alpine": { "x-show": "open", "@click.outside": "open = false" }, "text": "Content" }
      },
      "script_deps": ["alpine-cdn"]
    }
  ]
}
```

### Script Ordering Rule for Cross-Component Stores
When registering custom Alpine stores across separate components:
- Register the inline store script **BEFORE** `"alpine-cdn"` in `script_deps`:

```json
"script_deps": ["store-ui", "alpine-cdn"]
```

> **Warning**: Listing `"alpine-cdn"` before custom store scripts will cause `$store` to fail silently without errors.

---

## 9. Pre-Flight Automated Validation Script

AI agents **MUST** run the bundled validation script to verify generated WDL JSON before completing authoring tasks:

```bash
node .github/skills/ruledwdl-authoring/scripts/validate-wdl.js <path-to-json-file>
```

The script automatically verifies:
1. Valid JSON object structure.
2. WDL Layers syntax rules & single `semantic_id` constraint via `parseLayers`.
3. Bare class name format for `REGISTRY` keys (no `tag.class` keys).
4. `attr` selector formatting (no combined `tag.class` keys).
5. Array of objects rule for `DATA` loop arrays (no primitive strings).
6. Complete document compilation via `@ruledwdl/core` engine.

