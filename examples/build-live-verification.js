import { composePage, createMemoryStore } from '../src/index.js';
import { marked } from 'marked';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. The full WDL JSON landing page from skill references/examples.md (v0.3.0)
const landingPageWDL = {
  $version: '0.3.0',
  layout: 'default',
  fullPage: false,
  REGISTRY: {
    $version: '2.0',
    'site-header': {
      class: 'bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm'
    },
    'hero-section': {
      class: 'py-20 px-6 max-w-5xl mx-auto text-center'
    },
    'feature-card': {
      class: 'p-8 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300'
    },
    'btn-primary': {
      class: 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-md hover:shadow-indigo-200 inline-block'
    }
  },
  COMPONENTS: [
    {
      $version: '2.0',
      layers: [
        'header.site-header',
        '> div.logo_box',
        '  > a.brand_link',
        '  + span.version_badge',
        '< nav.main_nav',
        '  > a.nav_link*navLinks'
      ],
      attr: {
        '.logo_box': { class: 'flex items-center space-x-2' },
        '.brand_link': { href: '/', text: 'RuledWDL', class: 'text-xl font-bold text-gray-900 tracking-tight' },
        '.version_badge': { class: 'text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 font-semibold', text: 'v0.3.0' },
        '.main_nav': { class: 'flex items-center space-x-8' },
        '.nav_link': { href: '${href}', text: '${label}', class: 'text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors' }
      }
    },
    {
      $version: '2.0',
      layers: [
        'section.hero-section',
        '> h1.hero_heading',
        '+ p.hero_sub',
        '+ div.cta_group',
        '  > a.cta_primary',
        '  + a.cta_secondary'
      ],
      attr: {
        '.hero_heading': { class: 'text-5xl font-black text-gray-900 mb-6 tracking-tight leading-tight', text: '${heroTitle}' },
        '.hero_sub': { class: 'text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed', text: 'Build stateful HTML pages using **declarative JSON layout rules** and zero client runtime bloat.' },
        '.cta_group': { class: 'flex items-center justify-center space-x-4' },
        '.cta_primary': { 'attr-ref': 'btn-primary', href: '/docs', text: 'Read Documentation' },
        '.cta_secondary': { class: 'text-gray-700 hover:text-gray-900 px-6 py-3 rounded-xl border border-gray-300 font-semibold transition hover:bg-gray-50', href: 'https://github.com/ruledweb/ruledwdl', text: 'GitHub Repository' }
      }
    },
    {
      $version: '2.0',
      layers: [
        'section.features',
        '> div.container',
        '  > div.header_block',
        '    > h2.sec_title',
        '    + p.sec_sub',
        '  < div.grid_shell',
        '    > div.feature-card*features',
        '      > div.icon_box',
        '      + h3.card_title',
        '      + p.card_desc'
      ],
      attr: {
        '.features': { class: 'py-20 bg-slate-50 px-6 border-t border-gray-100' },
        '.container': { class: 'max-w-6xl mx-auto' },
        '.header_block': { class: 'text-center mb-16' },
        '.sec_title': { class: 'text-3xl font-extrabold text-gray-900 mb-3', text: 'Why Choose RuledWDL?' },
        '.sec_sub': { class: 'text-gray-600 max-w-lg mx-auto', text: 'Designed specifically for deterministic HTML compilation from AI agents.' },
        '.grid_shell': { class: 'grid grid-cols-1 md:grid-cols-3 gap-8' },
        '.icon_box': { class: 'w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg mb-4', text: '${badge}' },
        '.card_title': { class: 'text-xl font-bold text-gray-900 mb-3', text: '${title}' },
        '.card_desc': { class: 'text-gray-600 text-sm leading-relaxed', text: '${description}' }
      }
    },
    {
      $version: '2.0',
      layers: [
        'footer.site_footer',
        '> div.footer_container',
        '  > p.copyright',
        '  + p.meta'
      ],
      attr: {
        '.site_footer': { class: 'bg-white border-t border-gray-200 py-10 px-6 text-center text-sm text-gray-500' },
        '.footer_container': { class: 'max-w-5xl mx-auto space-y-2' },
        '.copyright': { text: '© 2026 RuledWDL Project. Author: **Pradeep Dabane**.' },
        '.meta': { text: 'Licensed under AGPL 3.0 / GPL 3.0 for Agent Skill Specs.' }
      }
    }
  ],
  DATA: {
    $version: '2.0',
    heroTitle: 'Declarative Web Layout Engine for AI Agents',
    navLinks: [
      { label: 'Documentation', href: '/docs' },
      { label: 'Specification', href: 'https://github.com/ruledweb/ruledwdl' },
      { label: 'GitHub', href: 'https://github.com/ruledweb/ruledwdl' }
    ],
    features: [
      { badge: '⚡', title: '100% Zero Runtime Dependencies', description: 'Compiles WDL JSON directly into deterministic, minimal server-rendered HTML.' },
      { badge: '🧩', title: 'Alpine.js & HTMX Native', description: 'Declarative state binding without complex frontend build toolchains or SPA overhead.' },
      { badge: '🎨', title: 'Tailwind CSS Built-in', description: 'Automatic utility styling, design tokens, and CSS custom property cascading.' }
    ],
    __seo: {
      title: 'RuledWDL v0.3.0 — Live Skill Verification',
      description: 'Live verification page rendered from RuledWDL Agent Skill JSON.'
    },
    __head: [
      '<link rel="icon" href="/favicon.ico">',
      '<link rel="preconnect" href="https://fonts.googleapis.com">'
    ],
    __design_tokens: ':root { --brand-accent: #4f46e5; }'
  }
};

async function buildLivePreview() {
  const store = createMemoryStore({});
  const { html, versions } = await composePage(store, 'skill-verification', landingPageWDL, {
    transformText: (text, node) => {
      if (node.classes.includes('hero_sub') || node.classes.includes('copyright')) {
        return marked.parseInline(text);
      }
      return text;
    }
  });
  
  console.log('Compiled Schema Versions:', versions);
  const outputPath = join(__dirname, 'live-verification.html');
  writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ Successfully compiled WDL JSON example! Output written to:\n   ${outputPath}`);
}

buildLivePreview();
