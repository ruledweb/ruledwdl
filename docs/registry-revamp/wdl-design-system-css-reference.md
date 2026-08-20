# WDL Design System & CSS Architecture Reference

**Status:** Proposal / working reference (not yet core)  
**Audience:** RuledWDL authors, editor/generator implementers, future `@ruledwdl/ds`  
**Scope:** How REGISTRY, tokens, cascade layers, and compiled CSS fit together — concepts → structure → output  

---

## Table of contents

1. [Problem this document solves](#1-problem-this-document-solves)
2. [Core ideas in one page](#2-core-ideas-in-one-page)
3. [Cascade & modern CSS layers](#3-cascade--modern-css-layers)
4. [Design tokens](#4-design-tokens)
5. [REGISTRY: two authoring styles, one IR](#5-registry-two-authoring-styles-one-ir)
6. [What `@ruledwdl/core` does today](#6-what-ruledwdlcore-does-today)
7. [Proposed compile pipeline (outside or future core)](#7-proposed-compile-pipeline-outside-or-future-core)
8. [Worked example: card (parent → child × breakpoint)](#8-worked-example-card-parent--child--breakpoint)
9. [Example compiled CSS output](#9-example-compiled-css-output)
10. [HTML output from core](#10-html-output-from-core)
11. [Responsibility split](#11-responsibility-split)
12. [Edge cases the definition model cannot fully own](#12-edge-cases-the-definition-model-cannot-fully-own)
13. [Glossary](#13-glossary)
14. [Checklist](#14-checklist)

---

## 1. Problem this document solves

People mixing up:

| Confused as… | Actually… |
|--------------|-----------|
| REGISTRY = a stylesheet | REGISTRY = **structured source**; CSS is a **compile target** |
| `class` and `css` are the same | `class` → utility names on the element; `css` / selector rules → **emitted stylesheet** |
| `states` and `breakpoints` are CSS | In **current core** they become **Tailwind-like class prefixes** on the **same** element |
| `[wdl-comp="card"]` is required | Stable hook today; preferred modern emit can use **`:scope` / `@scope`** |
| Design system = Tailwind only | DS = **tokens + recipes + layers**; Tailwind is one delivery mode for utilities |
| Nested JSON vs selector keys | Two **authoring** fronts; both should lower to the same **IR** |

This doc is the single top-to-bottom map: **concepts → REGISTRY shape → IR → CSS → HTML**.

---

## 2. Core ideas in one page

```
Design decisions
  → Tokens (primitive → semantic → component aliases)
  → REGISTRY recipes (structure of UI styling intent)
  → Optional utility classes on instances
        ↓  DS compiler
  @layer tokens
  @layer components   (:scope, nesting, media, parent→child)
  @layer utilities    (Tailwind or hand-written utilities)
        ↓
  HTML from @ruledwdl/core (layers + class + wdl-comp + text)
```

**Principles**

1. **Tokens** hold values (color, space, type, radius, shadow).  
2. **Components** hold recipes (how a card looks and behaves).  
3. **Utilities** hold one-off tweaks (extra padding on *this* instance).  
4. **`@layer` order** makes utilities able to override components without `!important`.  
5. **Parent → child** and **breakpoint × hover × child** belong in **component CSS**, not only child utility classes.  
6. Core **renders DOM**; a DS layer **compiles CSS** (today outside core; later optionally in core).

---

## 3. Cascade & modern CSS layers

### 3.1 Browser resolution (simplified)

1. Origin / `!important`  
2. **`@layer` order** (author styles)  
3. Specificity  
4. Source order  
5. Inheritance  

Design systems should control **layers + tokens + low specificity**, not `!important`.

### 3.2 Recommended layer stack

```css
@layer reset, tokens, base, typography, components, patterns, utilities, overrides;
```

| Layer | Purpose | Typical source |
|-------|---------|----------------|
| **reset** | Neutralize UA defaults | Optional global |
| **tokens** | `:root { --… }` | `__tokens__.vars` / token JSON |
| **base** | Unclassed `a`, `h1`, `p`, `button` | Optional DS |
| **typography** | Prose / type scale | Optional DS |
| **components** | `.card`, scoped recipes, parent→child | REGISTRY compile |
| **patterns** | Multi-block layouts | Product |
| **utilities** | `.mt-4`, `.flex`, Tailwind | `class` / `base` strings |
| **overrides** | Rare page exceptions | App only |

**Why utilities after components:** so `class="card p-8"` can adjust a recipe without fighting component CSS.

### 3.3 Other “layers” (not `@layer`, but part of the system)

| Axis | Scale |
|------|--------|
| **Token tiers** | primitive → semantic → component |
| **Responsive** | default → sm → md → lg (+ container queries) |
| **State** | rest → hover → focus-visible → active → disabled |
| **Context** | page → region → component → slot |
| **Delivery** | critical → deferred → print / reduced-motion |

---

## 4. Design tokens

### 4.1 Tiers

```text
primitive     --blue-600, --space-4
semantic      --color-primary, --space-card
component     --card-padding: var(--space-card)
```

Themes (light/dark) should mostly swap **semantic** values.

### 4.2 Groups a full DS usually covers

| Group | Examples |
|-------|----------|
| Color | surface, text, text-muted, primary, border, danger |
| Typography | font-family, text sizes, weights, line-heights |
| Spacing | scale + semantic (card, section, field-gap) |
| Radius | sm / md / lg / card |
| Shadow | sm / md / lg / card |
| Border | width, subtle/strong color |
| Motion | duration, easing (respect `prefers-reduced-motion`) |
| Z-index | dropdown, modal, toast (named, not magic numbers) |

### 4.3 Emission target

```css
@layer tokens {
  :root {
    --color-primary: #4f46e5;
    --space-card: 1.5rem;
    --radius-card: 0.75rem;
    /* … */
  }
}
```

In WDL today this can be injected via `DATA.__design_tokens` / `__brand_tokens` or `cssDelivery`, or from `compileGlobalTokens(__tokens__.vars)`.

---

## 5. REGISTRY: two authoring styles, one IR

### 5.1 Intermediate representation (IR) — single compile target

Every authoring style should lower to an ordered list:

```ts
type StyleRule = {
  layer?: string;      // default: "components"
  media?: string;      // e.g. "(min-width: 768px)"
  selector: string;    // e.g. ":scope:hover .button"
  css: Record<string, string>;
};
```

Emitter prints modern CSS from this list only.

### 5.2 Style A — Nested sugar (editor / AI field-friendly)

Good for forms: fixed fields for hover, md, child scopes.

```json
{
  "card": {
    "css": { "display": "flex", "padding": "var(--space-card)" },
    "scopes": {
      "button": {
        "css": { "background": "#e5e7eb" }
      }
    },
    "breakpoints": {
      "md": {
        "media": "(min-width: 768px)",
        "states": {
          "hover": {
            "scopes": {
              "button": {
                "css": {
                  "background": "var(--color-btn-desktop-hover)",
                  "color": "#fff"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Desugar:** `breakpoints.md.states.hover.scopes.button`  
→ `{ media: "(min-width: 768px)", selector: ":scope:hover .button", css: { … } }`

### 5.3 Style B — Selector map / ordered rules (CSS-native)

Good for full selector power (`:has`, siblings, explicit media).

```json
{
  "card": {
    "layer": "components",
    "rules": [
      {
        "selector": ":scope",
        "css": {
          "display": "flex",
          "padding": "var(--space-card)"
        }
      },
      {
        "selector": ":scope .button",
        "css": { "background": "#e5e7eb" }
      },
      {
        "media": "(min-width: 768px)",
        "selector": ":scope:hover .button",
        "css": {
          "background": "var(--color-btn-desktop-hover)",
          "color": "#fff"
        }
      }
    ]
  }
}
```

### 5.4 What current core REGISTRY v2 actually does

Today `base` / `variants` / `states` / `breakpoints` / `containers` compile to a **single `class` string** (utility prefixes like `hover:`, `md:`), **not** to a stylesheet of nested selectors.

So:

- **Current core** = utility-oriented path.  
- **This document’s CSS path** = proposed DS compiler (or future core) path.

Both can coexist: utilities via `class`; scoped CSS via compiled rules.

---

## 6. What `@ruledwdl/core` does today

| Input | Output |
|-------|--------|
| Layers `div.card>h2.heading+…` | DOM tree + semantic class + `wdl-comp="card"` |
| REGISTRY entry (v1 string / `{ class }` / v2 `base`…) | Merged into element **attributes**, mainly `class` |
| `__tokens__.vars` | Optional `:root` string via `compileGlobalTokens` |
| `attr.style` | Inline `style="…"` on the element |
| `DATA.__design_tokens` / `__brand_tokens` | Raw CSS injected in page shell (when using compose path) |

**Does not (today):**

- Emit `@layer components { @scope … }` from REGISTRY  
- Nest `states` under `breakpoints` as media + parent→child selectors  
- Treat REGISTRY as a full stylesheet authoring surface  

**Implication:** component-scoped modern CSS requires a **pre-compiler** (app / generator / future package) until core grows that capability.

---

## 7. Proposed compile pipeline (outside or future core)

```text
tokens.json + REGISTRY (sugar or selector rules)
        ↓
  resolve `uses` inheritance
        ↓
  lower to StyleRule[] IR
        ↓
  emit CSS string
        ↓
  inject (@layer tokens + components) via __design_tokens / cssDelivery
        ↓
  normalize REGISTRY for core (class-only / strip css maps)
        ↓
  renderAll(REGISTRY, COMPONENTS, DATA) → HTML
```

**Root selector policy (pick one and document it):**

- `@scope (div.card)` / `@scope (.card)` using layers semantic id, or  
- `:scope` only inside a known host, or  
- light-DOM `.card` with nesting (no `@scope`)

This reference prefers **`@scope` + `:scope` + nesting** for component recipes.

---

## 8. Worked example: card (parent → child × breakpoint)

### Intent

- Card uses design tokens for padding and radius.  
- Default button gray.  
- **Mobile:** hover **card** → button **blue**.  
- **Desktop:** hover **card** → button **red**.

### 8.1 Tokens

```json
{
  "__tokens__": {
    "vars": {
      "color-btn-mobile-hover": "#3b82f6",
      "color-btn-desktop-hover": "#ef4444",
      "space-card": "1.5rem",
      "radius-card": "0.75rem",
      "color-surface": "#ffffff",
      "color-border": "#e5e7eb"
    }
  }
}
```

### 8.2 REGISTRY (selector-rule style — canonical for compile)

```json
{
  "card": {
    "layer": "components",
    "rules": [
      {
        "selector": ":scope",
        "css": {
          "display": "flex",
          "flex-direction": "column",
          "gap": "0.75rem",
          "padding": "var(--space-card)",
          "border-radius": "var(--radius-card)",
          "background": "var(--color-surface)",
          "border": "1px solid var(--color-border)"
        }
      },
      {
        "selector": ":scope .button",
        "css": {
          "background": "#e5e7eb",
          "color": "#111827",
          "transition": "background 0.15s ease"
        }
      },
      {
        "media": "(max-width: 767px)",
        "selector": ":scope:hover .button",
        "css": {
          "background": "var(--color-btn-mobile-hover)",
          "color": "#ffffff"
        }
      },
      {
        "media": "(min-width: 768px)",
        "selector": ":scope:hover .button",
        "css": {
          "background": "var(--color-btn-desktop-hover)",
          "color": "#ffffff"
        }
      }
    ]
  }
}
```

### 8.3 Same intent as nested sugar (equivalent)

```json
{
  "card": {
    "css": {
      "display": "flex",
      "flex-direction": "column",
      "gap": "0.75rem",
      "padding": "var(--space-card)",
      "border-radius": "var(--radius-card)",
      "background": "var(--color-surface)",
      "border": "1px solid var(--color-border)"
    },
    "scopes": {
      "button": {
        "css": {
          "background": "#e5e7eb",
          "color": "#111827",
          "transition": "background 0.15s ease"
        }
      }
    },
    "breakpoints": {
      "max-md": {
        "media": "(max-width: 767px)",
        "states": {
          "hover": {
            "scopes": {
              "button": {
                "css": {
                  "background": "var(--color-btn-mobile-hover)",
                  "color": "#ffffff"
                }
              }
            }
          }
        }
      },
      "md": {
        "media": "(min-width: 768px)",
        "states": {
          "hover": {
            "scopes": {
              "button": {
                "css": {
                  "background": "var(--color-btn-desktop-hover)",
                  "color": "#ffffff"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 8.4 Layers (structure only)

```text
div.card > p.desc + button.button
```

Semantic ids `card`, `desc`, `button` align with scopes / selectors.

---

## 9. Example compiled CSS output

```css
@layer tokens {
  :root {
    --color-btn-mobile-hover: #3b82f6;
    --color-btn-desktop-hover: #ef4444;
    --space-card: 1.5rem;
    --radius-card: 0.75rem;
    --color-surface: #ffffff;
    --color-border: #e5e7eb;
  }
}

@layer components {
  @scope (div.card) {
    :scope {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: var(--space-card);
      border-radius: var(--radius-card);
      background: var(--color-surface);
      border: 1px solid var(--color-border);

      & .button {
        background: #e5e7eb;
        color: #111827;
        transition: background 0.15s ease;
      }

      @media (max-width: 767px) {
        &:hover .button {
          background: var(--color-btn-mobile-hover);
          color: #ffffff;
        }
      }

      @media (min-width: 768px) {
        &:hover .button {
          background: var(--color-btn-desktop-hover);
          color: #ffffff;
        }
      }
    }
  }
}
```

**Optional utilities** (instance tweak, separate layer):

```css
@layer utilities {
  /* from Tailwind CDN or your utility sheet — wins over components by layer order */
}
```

---

## 10. HTML output from core

Illustrative (not exact minify):

```html
<div class="card" wdl-comp="card">
  <p class="desc" wdl-comp="desc">…</p>
  <button class="button" wdl-comp="button">…</button>
</div>
```

- Structure and `wdl-comp` come from **core**.  
- Look-and-feel for the recipe comes from **compiled `@layer components`**.  
- Extra utilities on the node (if any) come from REGISTRY `class` / attr and live in **utilities** layer.

---

## 11. Responsibility split

| Concern | Owner |
|---------|--------|
| DOM structure (layers) | `@ruledwdl/core` |
| Text / data binding | core + DATA |
| Utility `class` strings | core (stamp) + Tailwind or utility CSS |
| Token definitions | DS / REGISTRY `__tokens__` |
| Component scoped CSS | DS compiler → inject |
| Parent → child × media | DS compiler (IR rules) |
| Page shell injection | composePage / `__design_tokens` / `cssDelivery` |
| App state (auth, route) | Host (Alpine, classes, data-attrs) — not REGISTRY |

---

## 12. Edge cases the definition model cannot fully own

Even with selector IR + layers:

1. **Cross-tree UI** — hover item in sidebar highlights panel elsewhere (no shared ancestor).  
2. **Non-CSS conditions** — logged-in, feature flag, form validity (host state).  
3. **Content-driven rules** — “if title length > 80”.  
4. **Heavy animation choreography** — staggered timelines beyond a few `animation` names.  
5. **Unsafe global selectors** — free-text selectors need allowlists or `@scope` discipline.  
6. **Shadow DOM / slots** — `::slotted` / `::part` need explicit policy.  
7. **Merge policy on `uses`** — same selector, conflicting props; must define replace vs property merge.  

Escape hatches: raw CSS strings in a rule, host classes, or overrides layer — not silent magic in REGISTRY.

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| **REGISTRY** | Map of semantic ids → style/attr recipes |
| **Semantic id** | Single class token in layers (`card` in `div.card`) |
| **Token** | Named design value, usually a CSS custom property |
| **IR** | Ordered `{ layer, media?, selector, css }[]` |
| **Utility** | Single-purpose class (spacing, flex, text size) |
| **Component recipe** | Full look + interaction CSS for a unit (card, button) |
| **`:scope`** | Refers to the scoped root inside `@scope` |
| **`wdl-comp`** | Auto attribute from core; optional hook for attribute selectors |
| **Sugar** | Nested breakpoints/states/scopes that desugar to IR |
| **Selector map** | Authoring where keys/rules are CSS selectors |

---

## 14. Checklist

- [ ] Tokens cover color, type, space, radius, shadow (primitives + semantic).  
- [ ] `@layer` order: tokens → components → utilities.  
- [ ] Component recipes compile to scoped CSS (`:scope` / `@scope`), not only child utilities.  
- [ ] Parent → child × breakpoint expressible in IR.  
- [ ] Core still owns HTML; DS owns compiled CSS injection.  
- [ ] Utilities can override components without `!important`.  
- [ ] Theme switch = token swap, not forked components.  
- [ ] Escape hatches documented for cross-tree and app state.  

---

## Document history

| Version | Notes |
|---------|--------|
| 2026-08-20 | Initial reference from architecture discussion (REGISTRY gaps, `:scope`, layers, sugar vs selector IR, core vs DS split) |

---

*This is a working reference for product/editor design and a possible future core or `@ruledwdl/ds` package. It does not change published `@ruledwdl/core` behavior until explicitly implemented.*
