# RuledWDL Reference Examples & Anti-Patterns

This document provides complete, valid RuledWDL JSON examples and explicit Anti-Pattern pairs to prevent AI model hallucinations.

---

## 1. Complete Landing Page Layout

A production-ready WDL JSON page showing `REGISTRY`, `COMPONENTS`, `DATA`, `__seo`, `__head`, and `__design_tokens`.

```json
{
  "layout": "default",
  "fullPage": false,
  "REGISTRY": {
    "site-header": {
      "class": "bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50"
    },
    "hero-section": {
      "class": "py-20 px-6 max-w-5xl mx-auto text-center"
    },
    "feature-card": {
      "class": "p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition"
    },
    "btn-primary": {
      "class": "bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition inline-block"
    }
  },
  "COMPONENTS": [
    {
      "layers": "header.site-header>div.logo_box>a.brand_link+span.version_badge<nav.main_nav>a.nav_link*navLinks",
      "attr": {
        ".brand_link": { "href": "/", "text": "RuledWDL" },
        ".version_badge": { "class": "text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-2", "text": "v1.0" },
        ".main_nav": { "class": "flex space-x-6" },
        ".nav_link": { "href": "${href}", "text": "${label}", "class": "text-sm text-gray-600 hover:text-gray-900" }
      }
    },
    {
      "layers": "section.hero-section>h1.hero_heading+p.hero_sub+div.cta_group>a.cta_primary+a.cta_secondary",
      "attr": {
        ".hero_heading": { "class": "text-4xl font-extrabold text-gray-900 mb-4", "text": "${heroTitle}" },
        ".hero_sub": { "class": "text-lg text-gray-600 mb-8 max-w-2xl mx-auto", "text": "Build stateful HTML pages using **declarative JSON layout rules** and zero client runtime bloat." },
        ".cta_group": { "class": "flex justify-center space-x-4" },
        ".cta_primary": { "attr-ref": "btn-primary", "href": "/docs", "text": "Read Documentation" },
        ".cta_secondary": { "class": "text-gray-700 hover:text-gray-900 px-5 py-2.5 rounded-lg border border-gray-300 font-medium", "href": "https://github.com", "text": "GitHub" }
      }
    },
    {
      "layers": "section.features>div.container>div.grid_shell>div.feature-card*features>h3.card_title+p.card_desc",
      "attr": {
        ".features": { "class": "py-16 bg-gray-50 px-6" },
        ".container": { "class": "max-w-6xl mx-auto" },
        ".grid_shell": { "class": "grid grid-cols-1 md:grid-cols-3 gap-8" },
        ".card_title": { "class": "text-xl font-bold text-gray-900 mb-2", "text": "${title}" },
        ".card_desc": { "class": "text-sm text-gray-600", "text": "${description}" }
      }
    }
  ],
  "DATA": {
    "heroTitle": "Declarative Web Layout Engine",
    "navLinks": [
      { "label": "Docs", "href": "/docs" },
      { "label": "Examples", "href": "/examples" },
      { "label": "GitHub", "href": "https://github.com" }
    ],
    "features": [
      { "title": "Zero Runtime", "description": "Compiles WDL JSON directly into optimized server HTML string." },
      { "title": "Alpine.js Native", "description": "Opt-in frontend state and interactions without bundle bloat." },
      { "title": "Tailwind CSS Tokenized", "description": "Utility classes and custom CSS properties handled out of the box." }
    ],
    "__seo": {
      "title": "RuledWDL — Declarative Layouts",
      "description": "Generate clean HTML from WDL JSON schemas."
    },
    "__head": [
      "<link rel=\"icon\" href=\"/favicon.ico\">",
      "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">"
    ],
    "__design_tokens": ":root { --brand-accent: #4f46e5; }"
  }
}
```

---

## 2. Alpine.js Cross-Component State & Script Ordering

When sharing state between two components (e.g. Hamburger trigger in Header, Navigation Drawer in Body):

```json
{
  "COMPONENTS": [
    {
      "layers": "header>button.menu_toggle",
      "attr": {
        ".menu_toggle": {
          "alpine": {
            "@click": "$store.ui.drawerOpen = !$store.ui.drawerOpen"
          },
          "text": "Toggle Menu"
        }
      },
      "script_deps": ["store-ui", "alpine-cdn"]
    },
    {
      "layers": "aside.drawer>nav.drawer_nav",
      "attr": {
        ".drawer": {
          "alpine": {
            "x-show": "$store.ui.drawerOpen",
            "x-transition": ""
          }
        }
      },
      "script_deps": ["store-ui", "alpine-cdn"]
    }
  ]
}
```

> **CRITICAL**: Notice `"script_deps": ["store-ui", "alpine-cdn"]`. The store initialization script (`store-ui`) MUST be listed BEFORE `alpine-cdn`. Listing `alpine-cdn` first breaks state initialization silently.

---

## 3. Hallucination Guard: Anti-Pattern Cheatsheet

### Anti-Pattern 1: Multiple Dot Selectors in Layers
- ❌ **Wrong**: `"layers": "div.card.shadow-lg.p-4>h1.title.text-xl"`
- ✅ **Right**: `"layers": "div.card>h1.title"` with `attr`:
  ```json
  "attr": {
    ".card": { "class": "shadow-lg p-4" },
    ".title": { "class": "text-xl", "text": "Title" }
  }
  ```

---

### Anti-Pattern 2: Combined `tag.class` Selectors in `attr`
- ❌ **Wrong**: `"attr": { "h1.title": { "text": "Heading" } }`
- ✅ **Right**: `"attr": { ".title": { "text": "Heading" } }`

---

### Anti-Pattern 3: Arrays of Primitive Strings in Data Loops
- ❌ **Wrong**:
  ```json
  "DATA": { "categories": ["Design", "Engineering", "Marketing"] }
  ```
- ✅ **Right**:
  ```json
  "DATA": {
    "categories": [
      { "name": "Design" },
      { "name": "Engineering" },
      { "name": "Marketing" }
    ]
  }
  ```
  *In layers:* `"layers": "li.cat_item*categories"`  
  *In attr:* `".cat_item": { "text": "${name}" }`

---

### Anti-Pattern 4: Inline Text `{}` or Attributes `[]` in Layers
- ❌ **Wrong**: `"layers": "a.link[href='/about']{About Us}"`
- ✅ **Right**: `"layers": "a.link"`, with `attr`:
  ```json
  "attr": {
    ".link": { "href": "/about", "text": "About Us" }
  }
  ```

---

### Anti-Pattern 5: Scope Climbing with `^`
- ❌ **Wrong**: `"layers": "div.hero>h1.title^div.sidebar"`
- ✅ **Right**: `"layers": "div.hero>h1.title<div.sidebar"`
