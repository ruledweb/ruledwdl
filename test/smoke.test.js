import { composePage, renderAll, createMemoryStore, parseLayers, resolveSchemaVersions, WDLDomTree } from '../src/index.js';
import { createFileStore } from '../src/stores/file-store.js';
import { marked } from 'marked';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const ok = (label, cond) => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`); };

// 1) FileStore + layout chain + data binding + slot injection
const store = createFileStore(join(here, '..', 'fixtures', 'demo'));
const page = await store.getPage('demo', '/');
const { html } = await composePage(store, 'demo', page);
ok('renders a doc', html.includes('<!DOCTYPE html>'));
ok('data binding ${name} → World', html.includes('Hello World'));
ok('page component renders', html.includes('@ruledwdl/core'));
ok('layout slot {{content}} injected (div.shell wraps content)', /<div class="[^"]*shell[^"]*" wdl-comp="shell"><div class="[^"]*card[^"]*" wdl-comp="card">/.test(html));
ok('tailwind CDN script injected', html.includes('@tailwindcss/browser@4'));
ok('title applied', html.includes('<title>WDL Demo</title>'));

// 2) In-memory store renders identically (no fs) — same base layout as fixtures/demo/layouts/base.json
const mem = createMemoryStore({
  layouts: {
    base: {
      name: 'base',
      REGISTRY: {
        shell: { class: 'min-h-screen bg-gradient-to-br from-slate-100 to-indigo-200 flex items-center justify-center p-6' }
      },
      COMPONENTS: [{
        layers: 'div.shell',
        attr: { '.shell': { text: '{{content}}' } },
      }],
      DATA: {},
    },
  },
});
const { html: memHtml } = await composePage(mem, 'demo', page);
ok('memory store === file store output', memHtml === html);

// 3) Pure renderAll works standalone (no store)
const frag = renderAll({}, [{ layers: 'span.x', attr: { '.x': { text: '${v}' } } }], { v: 'hi' });
ok('renderAll standalone', frag.includes('hi') && frag.includes('class="x"'));

// 4) Design/brand token cascade: base layout → page (__design_tokens), then __brand_tokens wins
{
  const tokenStore = createMemoryStore({
    layouts: {
      base: {
        name: 'base',
        COMPONENTS: [{ layers: 'div.shell', attr: { '.shell': { text: '{{content}}' } } }],
        DATA: {
          __design_tokens: ':root{--color-primary:#4f46e5;}',
          __brand_tokens: ':root{--color-primary:#000000;}',
        },
      },
    },
  });
  const tokenPage = {
    layout: 'base',
    COMPONENTS: [{ layers: 'p' }],
    DATA: { __design_tokens: ':root{--color-primary:#059669;}' },
  };
  const { html: tokenHtml } = await composePage(tokenStore, 'demo', tokenPage);
  const designIdx = tokenHtml.indexOf('data-wdl="design-tokens"');
  const brandIdx = tokenHtml.indexOf('data-wdl="brand-tokens"');
  ok('design tokens layered base→page in one style tag', /--color-primary:#4f46e5[\s\S]*--color-primary:#059669/.test(tokenHtml));
  ok('brand tokens emitted after design tokens (wins cascade)', designIdx > -1 && brandIdx > designIdx);
}

// 5) WDL Layers syntax — de-indentation / subset operator (<, <*N, <@N)
{
  const ast = parseLayers('header>div.container>h1+p<div.banner');
  const header = ast[0];
  const container = header.children[0];
  const banner = header.children[1];
  ok('< operator de-indents to parent scope (container and banner are siblings under header)',
    header.tag === 'header' &&
    container.classes.includes('container') &&
    container.children.length === 2 &&
    banner.classes.includes('banner')
  );

  const astMulti = parseLayers('div.shell>main>article>h1<<footer');
  const shell = astMulti[0];
  const footer = shell.children[1];
  ok('<< operator de-indents multiple levels (footer is sibling of main under shell)',
    shell.children.length === 2 &&
    shell.children[0].tag === 'main' &&
    footer.tag === 'footer'
  );

  // <*N repeater
  const astRepeat = parseLayers('div.row>div.col>article>p<*2footer');
  const rowRep = astRepeat[0];
  const footerRep = rowRep.children[1];
  ok('<*N operator repeats de-indentation N levels',
    rowRep.children.length === 2 &&
    rowRep.children[0].classes.includes('col') &&
    footerRep.tag === 'footer'
  );

  // <@N depth reference (0 = root level elements)
  const astDepth = parseLayers('div.row>div.col>article>p<@0section.footer');
  ok('<@N operator de-indents to absolute depth level N (0 = root layer)',
    astDepth.length === 2 &&
    astDepth[0].classes.includes('row') &&
    astDepth[1].classes.includes('footer')
  );
  
  const astDepth1 = parseLayers('div.row>div.col>article>p<@1section.side');
  const rowD1 = astDepth1[0];
  ok('<@1 de-indents to depth 1 (child of div.row)',
    rowD1.children.length === 2 &&
    rowD1.children[0].classes.includes('col') &&
    rowD1.children[1].classes.includes('side')
  );
}

// 6) WDL Layers strict single semantic_id rule
{
  let threw = false;
  try {
    parseLayers('div.card.featured');
  } catch (err) {
    threw = err.message.includes('Multiple dot selectors in "div.card.featured" are not allowed');
  }
  ok('restricts multiple dot selectors and enforces 1 semantic_id per node', threw);
}

// 7) wdl-comp="{semantic-id}" data attribute generation
{
  const htmlComp = renderAll({}, [{ layers: 'section.hero>h1.title+p' }], {});
  ok('generates wdl-comp="{semantic-id}" on elements (class semantic-id and tag fallback)',
    htmlComp.includes('wdl-comp="hero"') &&
    htmlComp.includes('wdl-comp="title"') &&
    htmlComp.includes('wdl-comp="p"')
  );

  const htmlOverride = renderAll({}, [{ layers: 'button.cta', attr: { '.cta': { 'wdl-comp': 'custom-cta' } } }], {});
  ok('respects explicit wdl-comp attribute overrides from attr object',
    htmlOverride.includes('wdl-comp="custom-cta"')
  );
}

// 8) Schema version resolution (schema_version, REGISTRY v2.0, COMPONENTS v2.0, DATA v2.0)
{
  const emptyVer = resolveSchemaVersions({});
  ok('defaults to schema 0.2.0 and sub-schemas 2.0 when omitted',
    emptyVer.schema_version === '0.2.0' &&
    emptyVer.registry_version === '2.0' &&
    emptyVer.components_version === '2.0' &&
    emptyVer.data_version === '2.0'
  );

  const customVer = resolveSchemaVersions({
    schema_version: '0.2.0',
    REGISTRY: { $version: '2.0' },
    COMPONENTS: [{ $version: '2.0', layers: 'div.hero' }],
    DATA: { $version: '2.0' }
  });
  ok('extracts explicit sub-schema versions accurately',
    customVer.schema_version === '0.2.0' &&
    customVer.registry_version === '2.0' &&
    customVer.components_version === '2.0' &&
    customVer.data_version === '2.0'
  );

  const storeVer = createMemoryStore({});
  const resVer = await composePage(storeVer, 'demo', {
    schema_version: '0.2.0',
    COMPONENTS: [{ layers: 'div.test' }]
  });
  ok('composePage returns versions metadata in output',
    resVer.versions && resVer.versions.schema_version === '0.2.0'
  );
}

// 9) Registry Schema V2.0 (__tokens__, uses inheritance, prefix-$_{scoped-var}, variants, states)
{
  const storeV2 = createMemoryStore({});
  const pageV2 = {
    schema_version: '0.2.0',
    REGISTRY: {
      $version: '2.0',
      __tokens__: {
        vars: {
          'spacing-card': '1.5rem',
          'color-primary': '#4f46e5'
        }
      },
      'card-base': {
        vars: {
          pad: '${spacing-card}'
        },
        base: 'p-$_{pad} rounded-lg'
      },
      'hero-card': {
        uses: ['card-base'],
        vars: {
          bg: '#ffffff'
        },
        base: 'bg-$_{bg} shadow-md',
        variants: {
          elevated: 'border border-gray-200'
        },
        defaultVariant: 'elevated',
        states: {
          hover: 'bg-$_{color-primary}'
        },
        breakpoints: {
          md: 'p-8'
        }
      }
    },
    COMPONENTS: [
      { layers: 'div.hero-card>h1.title', attr: { '.title': { text: 'V2 Card' } } }
    ]
  };

  const { html } = await composePage(storeV2, 'demo', pageV2);

  ok('compiles REGISTRY.__tokens__.vars into <style data-wdl="theme-tokens">',
    html.includes('<style data-wdl="theme-tokens">') &&
    html.includes('--spacing-card: 1.5rem;') &&
    html.includes('--color-primary: #4f46e5;')
  );

  ok('expands uses inheritance, prefix-$_{scoped-var}, variants, states, and breakpoints into class attribute',
    html.includes('p-[var(--spacing-card)]') &&
    html.includes('bg-[#ffffff]') &&
    html.includes('border border-gray-200') &&
    html.includes('hover:bg-[var(--color-primary)]') &&
    html.includes('md:p-8')
  );
}

// 10) Pluggable Transformation Hooks (transformData & transformText)
{
  const storeHook = createMemoryStore({});
  const pageHook = {
    schema_version: '0.3.0',
    COMPONENTS: [
      { layers: 'h1.title+p.md-text', attr: { '.title': { text: '${heading}' }, '.md-text': { text: 'Hello **World**' } } }
    ],
    DATA: {
      heading: '  Raw Title  '
    }
  };

  const { html: htmlHook } = await composePage(storeHook, 'demo', pageHook, {
    // Stage 1: Data pre-processing hook
    transformData: (data) => {
      data.heading = data.heading.trim().toUpperCase();
      return data;
    },
    // Stage 2: Selective element-level text hook (plugging marked externally)
    transformText: (text, node) => {
      if (node.classes.includes('md-text')) {
        return marked.parseInline(text);
      }
      return text;
    }
  });

  ok('transformData pre-processes state variables before composition',
    htmlHook.includes('RAW TITLE')
  );

  ok('transformText passes element node allowing selective external parser plugging (e.g. marked)',
    htmlHook.includes('Hello <strong>World</strong>')
  );
}

// 11) WDLDomTree State Machine & 5-element tuple validation
{
  const tree = WDLDomTree.from([
    [0, '', 'form', 'login', null],
    [1, '>', 'div', 'container', null],
    [2, '>', 'h2', 'title', null],
    [2, '+', 'input', 'email', null],
    [1, '<@1', 'a', 'forgot', null]
  ]);

  ok('WDLDomTree ingests 5-element tuple array state', tree.length === 5);
  ok('WDLDomTree.toString converts tuples to WDL layers string',
    tree.toString() === 'form.login > div.container > h2.title + input.email <@1 a.forgot'
  );

  // Test wrapping mutation
  tree.wrap(2, 'div', 'title_wrap');
  ok('WDLDomTree.wrap inserts wrapper node and indents target node',
    tree.toString().includes('div.title_wrap > h2.title')
  );

  // Test operator validation error
  let opErr = false;
  try {
    WDLDomTree.from([[0, 'INVALID_OP', 'div', 'card']]);
  } catch (err) {
    opErr = err.message.includes('Invalid operator "INVALID_OP"');
  }
  ok('WDLDomTree enforces allowed WDL operators', opErr);

  // Test single semantic ID restriction error
  let semErr = false;
  try {
    WDLDomTree.from([[0, '', 'div', 'card1.card2']]);
  } catch (err) {
    semErr = err.message.includes('Multiple dot selectors in "card1.card2" are not allowed');
  }
  ok('WDLDomTree enforces single semantic_id per node', semErr);

  // Test renderAll with WDLDomTree instance directly
  const htmlTree = renderAll({}, [{ layers: tree }], {});
  ok('renderAll renders WDLDomTree instances directly',
    htmlTree.includes('wdl-comp="login"') &&
    htmlTree.includes('wdl-comp="title_wrap"')
  );
}

// 12) @ruledwdl/state ComponentManager and ComponentState operations
{
  const { ComponentManager } = await import('../packages/state/dist/index.js');
  const mgr = new ComponentManager();
  const hero = mgr.create('hero', {
    layers: 'section.hero > div.container > h1.title + p.subtitle',
    attr: {},
    data: {},
  });
  hero.layers.after('subtitle', 'button.cta');
  hero.layers.wrap('title', 'div.title-wrapper');
  hero.layers.append('container', 'span.badge');
  hero.layers.remove('subtitle');
  const updatedLayers = hero.layers.list();

  hero.variant.set('flat');
  hero.registry.addRule({ selector: '&:hover', css: { background: 'red' } });
  ok('@ruledwdl/state ComponentState manages variant and Schema V2.1 registry rules',
    hero.variant.get() === 'flat' &&
    hero.registry.get().rules.length === 1 &&
    hero.registry.get().rules[0].selector === '&:hover'
  );

  // Test bulk operations (bulkCreate, loadPage, clear)
  const bulkStates = mgr.bulkCreate([
    { component: 'comp-1', layers: 'div.comp1' },
    { component: 'comp-2', layers: 'div.comp2' }
  ]);
  ok('@ruledwdl/state ComponentManager bulkCreate registers multiple components',
    bulkStates.length === 2 && mgr.has('comp-1') && mgr.has('comp-2')
  );

  const pageComponents = mgr.loadPage({
    COMPONENTS: [
      { component: 'page-comp-1', layers: 'header.top' },
      { component: 'page-comp-2', layers: 'footer.bottom' }
    ]
  }, { reset: true });
  ok('@ruledwdl/state ComponentManager loadPage with reset replaces state',
    pageComponents.length === 2 && mgr.list().length === 2 && mgr.has('page-comp-1') && !mgr.has('hero')
  );

  mgr.clear();
  ok('@ruledwdl/state ComponentManager clear removes all components', mgr.list().length === 0);
}


// 13) Registry Schema V2.1 Scoped CSS Rules (@scope), data-variant, and token resolution
{
  const storeV21 = createMemoryStore({});
  const pageV21 = {
    $version: '0.3.0',
    title: 'V2.1 Scoped CSS Test',
    REGISTRY: {
      $version: '2.1',
      __tokens__: {
        vars: {
          'color-primary-hover': '#4338ca',
          'space-card': '1.5rem'
        }
      },
      'card-base': {
        vars: {
          pad: '${space-card}'
        },
        rules: [
          { selector: ':scope', css: { padding: '$_{pad}' } }
        ]
      },
      card: {
        uses: ['card-base'],
        vars: {
          bg: '#ffffff'
        },
        defaultVariant: 'elevated',
        variants: {
          elevated: { css: { 'box-shadow': '0 10px 15px rgba(0,0,0,0.1)' } }
        },
        rules: [
          { selector: ':scope', css: { display: 'flex', background: '$_{bg}' } },
          { selector: '& .button', css: { background: '#e5e7eb' } },
          { media: '(min-width: 768px)', selector: '&:hover .button', css: { background: '${color-primary-hover}' } }
        ]
      }
    },
    COMPONENTS: [
      { layers: 'div.card > button.button' }
    ]
  };

  const { html: htmlV21 } = await composePage(storeV21, 'demo', pageV21);

  ok('V2.1 emits <style data-wdl="components"> with @scope rules',
    htmlV21.includes('<style data-wdl="components">') &&
    htmlV21.includes('@scope (div.card)') &&
    htmlV21.includes('padding:var(--space-card)') &&
    htmlV21.includes(':scope[data-variant="elevated"]') &&
    htmlV21.includes('@media (min-width: 768px)')
  );

  ok('V2.1 renders data-variant attribute on element',
    htmlV21.includes('data-variant="elevated"') &&
    htmlV21.includes('wdl-comp="card"')
  );

  // Test @ruledwdl/csr render module
  const { render: csrRender } = await import('../packages/csr/src/index.js');
  const csrHtml = csrRender(pageV21.REGISTRY, pageV21.COMPONENTS, pageV21.DATA);
  ok('@ruledwdl/csr renders components with V2.1 normalized registry attributes',
    csrHtml.includes('data-variant="elevated"') && csrHtml.includes('class="card"')
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
