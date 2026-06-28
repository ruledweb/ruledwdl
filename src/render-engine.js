// src/renderer/render-engine.js
import { parseEmmet } from './emmet-parser.js';
import { toHTML, esc } from './element-builder.js';

export function renderAll(REG, COMPS, DAT) {
  return COMPS.map(comp => {
    // Raw-HTML escape hatch: a resolved component may emit finished HTML instead
    // of an emmet string (e.g. the system "form" component — see resolveComponent
    // / form-renderer.js). Emitted verbatim; the producer is responsible for esc.
    if (comp._raw_html != null) return comp._raw_html;
    return parseEmmet(comp.emmet || 'div')
      .map(n => toHTML(n, comp.attr || {}, DAT, REG))
      .join('');
  }).join('');
}

function buildSeoTags(title, seo) {
  if (!seo || typeof seo !== 'object') return { title, meta: '' };
  const metaTitle = seo.title || title;
  const desc = seo.description || '';
  const ogTitle = seo.og_title || metaTitle;
  const ogDesc = seo.og_description || desc;
  const tags = [];
  if (desc) tags.push(`<meta name="description" content="${esc(desc)}">`);
  if (seo.robots) tags.push(`<meta name="robots" content="${esc(seo.robots)}">`);
  if (seo.canonical) tags.push(`<link rel="canonical" href="${esc(seo.canonical)}">`);
  tags.push(`<meta property="og:title" content="${esc(ogTitle)}">`);
  if (ogDesc) tags.push(`<meta property="og:description" content="${esc(ogDesc)}">`);
  tags.push(`<meta property="og:type" content="${esc(seo.og_type || 'website')}">`);
  if (seo.og_image) tags.push(`<meta property="og:image" content="${esc(seo.og_image)}">`);
  return { title: metaTitle, meta: tags.join('\n') };
}

// CSS delivery is decided by the CMS (site.js) and passed in — the renderer does no CSS
// I/O. `cssDelivery` is one of: a descriptor { mode: 'cdn' | 'inline' | 'link', css?, href? },
// a legacy string (treated as inline static CSS), or null (CDN). 'inline'/'link' drop the
// Tailwind CDN runtime; 'cdn' keeps it. See docs/plan/global-g-css-implementation.md.
function normalizeCssDelivery(d) {
  if (!d) return { mode: 'cdn' };
  if (typeof d === 'string') return { mode: 'inline', css: d };
  return d;
}

export function wrapPage(body, title, scripts, seo, cssDelivery = null, headExtra = null) {
  const raw = scripts || { head_blocking: [], head_defer: [], body_end: [] };
  const cd = normalizeCssDelivery(cssDelivery);
  const useExternalCss = cd.mode === 'inline' || cd.mode === 'link';
  // With inline/link CSS the Tailwind CDN runtime is no longer needed — drop it.
  const head_blocking = useExternalCss
    ? raw.head_blocking.filter(s => s.id !== 'tailwind-cdn')
    : raw.head_blocking;
  const { head_defer, body_end } = raw;

  const headBlockingHTML = head_blocking
    .map(s => {
      if (s.type === 'external') {
        return (
          '<script src="' +
          s.src +
          '"' +
          (s.async ? ' async' : '') +
          (s.defer ? ' defer' : '') +
          '></script>'
        );
      }
      return '<script>' + s.inline + '</script>';
    })
    .join('\n');

  const headDeferHTML = head_defer
    .map(s => {
      if (s.type === 'external') {
        return (
          '<script src="' +
          s.src +
          '"' +
          (s.async ? ' async' : '') +
          ' defer></script>'
        );
      }
      return '<script defer>' + s.inline + '</script>';
    })
    .join('\n');

  const bodyEndHTML = body_end
    .map(s => {
      if (s.type === 'external') {
        return (
          '<script src="' +
          s.src +
          '"' +
          (s.async ? ' async' : '') +
          (s.defer ? ' defer' : '') +
          '></script>'
        );
      }
      return '<script>' + s.inline + '</script>';
    })
    .join('\n');

  const { title: pageTitle, meta: seoMeta } = buildSeoTags(title, seo);
  // Custom head elements (meta/link/JSON-LD) injected verbatim from DATA.__head.
  // Authored by trusted MCP/admin, so emitted raw — like inline <script> text.
  const headExtraHTML = Array.isArray(headExtra)
    ? headExtra.filter(Boolean).map(String).join('\n')
    : (headExtra ? String(headExtra) : '');
  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' +
    esc(pageTitle || 'RuledWeb') +
    '</title>' +
    (seoMeta ? '\n' + seoMeta + '\n' : '') +
    (headExtraHTML ? headExtraHTML + '\n' : '') +
    headBlockingHTML +
    (cd.mode === 'link' && cd.href ? '<link rel="stylesheet" href="' + cd.href + '">' : '') +
    (cd.mode === 'inline' && cd.css ? '<style>' + cd.css + '</style>' : '') +
    headDeferHTML +
    '</head><body>' +
    body +
    bodyEndHTML +
    '</body></html>'
  );
}
