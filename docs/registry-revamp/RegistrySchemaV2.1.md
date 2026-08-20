# RuledWDL Registry Schema V2.1 Specification

**Status:** Final Additive Specification  
**Scope:** `@ruledwdl/core` Engine Registry Compiler (`src/registry-compiler.js`)  
**Principles:** 100% Additive to V2.0, Zero Build Step, Edge-Ready, Native Browser Standards  

---

## 1. Overview

Registry Schema V2.1 introduces native **Scoped CSS Rules (`@scope`)** alongside WDL's existing **Utility Class** mode (`base`, `variants`, `states`, `breakpoints`). 

Authors can choose:
1. **Utility Class Mode**: Stamp utility classes (Tailwind, UnoCSS, custom utility classes) directly onto HTML element `class` attributes.
2. **Scoped CSS Rules Mode**: Define flat CSS rule objects (`rules: [{ selector, media?, css }]`) that compile to native browser `@scope` blocks in a `<style data-wdl="components">` tag.
3. **Hybrid Mode**: Use utility classes for single-node styling and `rules` for parent-to-child component interaction recipes within the same component definition.

---

## 2. Schema Specification (V2.1)

```json
{
  "REGISTRY": {
    "$version": "2.1",
    "__tokens__": {
      "vars": {
        "color-primary": "#4f46e5",
        "color-primary-hover": "#4338ca",
        "space-card": "1.5rem",
        "radius-card": "0.75rem"
      }
    },
    "card-base": {
      "vars": {
        "pad": "${space-card}",
        "radius": "${radius-card}"
      },
      "rules": [
        {
          "selector": ":scope",
          "css": {
            "padding": "$_{pad}",
            "border-radius": "$_{radius}"
          }
        }
      ]
    },
    "card": {
      "uses": ["card-base"],
      "vars": {
        "bg": "#ffffff"
      },
      "defaultVariant": "elevated",
      "variants": {
        "elevated": {
          "css": {
            "box-shadow": "0 10px 15px -3px rgba(0,0,0,0.1)",
            "border": "1px solid transparent"
          }
        },
        "flat": {
          "css": {
            "box-shadow": "none",
            "border": "1px solid #e5e7eb"
          }
        }
      },
      "rules": [
        {
          "selector": ":scope",
          "css": {
            "display": "flex",
            "flex-direction": "column",
            "gap": "0.75rem",
            "background": "$_{bg}"
          }
        },
        {
          "selector": "& .button",
          "css": {
            "background": "#e5e7eb",
            "color": "#111827"
          }
        },
        {
          "media": "(min-width: 768px)",
          "selector": "&:hover .button",
          "css": {
            "background": "${color-primary-hover}",
            "color": "#ffffff"
          }
        }
      ]
    }
  }
}
```

---

## 3. Token Resolution & Variable Syntax Rules

The variable expansion syntax remains 100% unified across both Utility Classes and CSS Rules:

| Syntax | Description | Resolution in Utility Mode | Resolution in Scoped CSS Mode |
|---|---|---|---|
| **`${global-token}`** | Reference to a global token in `__tokens__.vars` | `[var(--global-token)]` | `var(--global-token)` |
| **`$_{local-var}`** | Reference to a local component variable in `"vars": {}` | Value or `[var(--global-token)]` | Value or `var(--global-token)` |

---

## 4. Mode 1: Utility Class Mode Example

Used when styling single elements with utility classes.

### REGISTRY Input:
```json
{
  "badge": {
    "base": "inline-block px-3 py-1 text-xs font-semibold rounded-full",
    "variants": {
      "primary": "bg-indigo-600 text-white",
      "secondary": "bg-gray-100 text-gray-800"
    },
    "defaultVariant": "primary",
    "states": {
      "hover": "opacity-90"
    },
    "breakpoints": {
      "md": "text-sm"
    }
  }
}
```

### Compiled DOM Output:
```html
<span class="badge inline-block px-3 py-1 text-xs font-semibold rounded-full bg-indigo-600 text-white hover:opacity-90 md:text-sm" wdl-comp="badge">
  New Feature
</span>
```

---

## 5. Mode 2: Scoped CSS Rules Mode Example (`@scope` with `uses`, `vars`, `variants`, `rules`)

Used when defining complete component recipes leveraging inheritance (`uses`), local variables (`vars`), variants (`variants`), and scoped child selectors (`rules`).

### REGISTRY Input:
```json
{
  "__tokens__": {
    "vars": {
      "color-primary-hover": "#4338ca",
      "space-card": "1.5rem",
      "radius-card": "0.75rem"
    }
  },
  "card-base": {
    "vars": {
      "pad": "${space-card}",
      "radius": "${radius-card}"
    },
    "rules": [
      {
        "selector": ":scope",
        "css": {
          "padding": "$_{pad}",
          "border-radius": "$_{radius}"
        }
      }
    ]
  },
  "card": {
    "uses": ["card-base"],
    "vars": {
      "bg": "#ffffff"
    },
    "defaultVariant": "elevated",
    "variants": {
      "elevated": {
        "css": {
          "box-shadow": "0 10px 15px -3px rgba(0,0,0,0.1)",
          "border": "1px solid transparent"
        }
      },
      "flat": {
        "css": {
          "box-shadow": "none",
          "border": "1px solid #e5e7eb"
        }
      }
    },
    "rules": [
      {
        "selector": ":scope",
        "css": {
          "display": "flex",
          "flex-direction": "column",
          "gap": "0.75rem",
          "background": "$_{bg}"
        }
      },
      {
        "selector": "& .title",
        "css": {
          "font-size": "1.25rem",
          "font-weight": "600"
        }
      },
      {
        "selector": "& .button",
        "css": {
          "background": "#e5e7eb",
          "color": "#111827"
        }
      },
      {
        "media": "(min-width: 768px)",
        "selector": "&:hover .button",
        "css": {
          "background": "${color-primary-hover}",
          "color": "#ffffff"
        }
      }
    ]
  }
}
```

### Compiled Head `<style>` Tags:
```html
<style data-wdl="theme-tokens">
:root {
  --color-primary-hover: #4338ca;
  --space-card: 1.5rem;
  --radius-card: 0.75rem;
}
</style>

<style data-wdl="components">
@scope (div.card) {
  /* Inherited from card-base + card root rules */
  :scope {
    padding: var(--space-card);
    border-radius: var(--radius-card);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: #ffffff;
  }

  /* variants mapped to attribute selectors */
  :scope[data-variant="elevated"] {
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    border: 1px solid transparent;
  }

  :scope[data-variant="flat"] {
    box-shadow: none;
    border: 1px solid #e5e7eb;
  }

  /* child scopes */
  & .title {
    font-size: 1.25rem;
    font-weight: 600;
  }

  & .button {
    background: #e5e7eb;
    color: #111827;
  }

  /* responsive state */
  @media (min-width: 768px) {
    &:hover .button {
      background: var(--color-primary-hover);
      color: #ffffff;
    }
  }
}
</style>
```

### Compiled DOM Output:
```html
<div class="card" data-variant="elevated" wdl-comp="card">
  <h2 class="title" wdl-comp="title">Card Title</h2>
  <button class="button" wdl-comp="button">Action</button>
</div>
```

---

## 6. Mode 3: Combined Hybrid Mode Example

Used when combining utility classes on the container with scoped CSS rules for child elements.

### REGISTRY Input:
```json
{
  "card": {
    "base": "shadow-lg transition-shadow duration-200",
    "rules": [
      {
        "selector": ":scope",
        "css": {
          "padding": "1.5rem"
        }
      },
      {
        "selector": "& .title",
        "css": {
          "font-size": "1.25rem",
          "font-weight": "600"
        }
      }
    ]
  }
}
```

### Compiled DOM Output:
```html
<div class="card shadow-lg transition-shadow duration-200" wdl-comp="card">
  <h2 class="title" wdl-comp="title">Card Title</h2>
</div>
```

---

## 7. Engine Compiler Execution Pipeline (`src/registry-compiler.js`)

When `@ruledwdl/core` processes a page via `composePage()` or `renderAll()`:

1. **Extract Global Tokens**: Converts `REGISTRY.__tokens__.vars` to `:root { --key: val; }` inside `<style data-wdl="theme-tokens">`.
2. **Resolve Inheritance (`uses`)**: Merges inherited parent `vars`, `base`, `variants`, `states`, `breakpoints`, and `rules` in order.
3. **Compile Utility Classes**: Normalizes `base`, `variants`, `states`, `breakpoints` into element `class="..."` attributes.
4. **Compile Scoped CSS Rules**: If `rules` array exists, groups all rules under `@scope (tag.semantic_id)` and appends to `<style data-wdl="components">`.
5. **Render Clean DOM**: Injects standard HTML attributes (`wdl-comp`, `class`, `data-variant`) and returns the complete markup document.
