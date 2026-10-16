# `@ruledwdl/presets`

Early preset resolver for RuledWDL.

Resolves `active_preset`, replaces `layers` with the chosen preset, and trims `registry` and `attr` to only the semantic IDs that remain. Runs before `@ruledwdl/nested` and core composition.

---

## Features

- **Preset resolution**: `active_preset` selects a layers string from `presets`.
- **Registry trim**: Removes REGISTRY entries for semantic IDs no longer present. Keeps `__tokens__`.
- **Attr trim**: Drops attribute entries whose selectors no longer match.
- **data-preset stamp**: Optionally sets `data-preset` on the root element.
- **Zero dependencies**: Pure ESM. Runs in Node, Workers, and browsers.

---

## Installation

```bash
npm install @ruledwdl/presets
```

---

## Usage

```js
import { resolvePresets } from '@ruledwdl/presets';

const definition = {
  layers: 'div.card > img.image + div.body > h3.title + p.excerpt',
  presets: {
    'card-no-image': 'div.card > div.body > h3.title + p.excerpt',
    'card-compact': 'div.card > div.body > h3.title',
  },
  active_preset: 'card-no-image',
  attr: {
    '.image': { src: '/placeholder.jpg' },
    '.title': { text: '${title}' },
  },
  registry: {
    $version: '2.1',
    card: { base: 'rounded-lg shadow' },
    image: { base: 'w-full h-48 object-cover' },
    title: { base: 'text-xl font-semibold' },
  },
};

const resolved = resolvePresets(definition);
// resolved.layers === 'div.card > div.body > h3.title + p.excerpt'
// resolved.attr has no .image
// resolved.registry has no image
// resolved.presets and active_preset are removed
```

### Pipeline

```
presets → nested → core composer
```

No other package needs to know about presets.

---

## License

AGPL-3.0-or-later
