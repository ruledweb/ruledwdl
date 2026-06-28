// src/renderer/markdown.js
// Inline Markdown for WDL `text`. We do NOT rely on marked for safety:
//   - escape-before: HTML-escape the source so raw HTML can never pass through marked
//     (marked otherwise emits inline HTML verbatim). Markdown punctuation (* _ [ ] ( ) `)
//     is left intact so the syntax still parses.
//   - sanitize-after: neutralise dangerous URL schemes in generated href/src and strip
//     any on* handlers. With an escaped source marked only emits its own inline tags, so
//     this is a small targeted pass — not a full DOM sanitiser (Workers have no DOM).
//
// parseInline (not parse) is used so no wrapping <p> is added — the WDL element's own
// tag stays the container. gfm:false keeps it predictable: only explicit Markdown
// (**bold**, *italic*, `code`, [text](url)) transforms; bare URLs are NOT auto-linked.
import { marked } from 'marked';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BAD_SCHEME = /^\s*(?:javascript|data|vbscript):/i;

function sanitizeHtml(html) {
  // Neutralise dangerous href/src URL schemes (single- or double-quoted).
  html = html.replace(/\b(href|src)\s*=\s*("([^"]*)"|'([^']*)')/gi, (m, attr, _q, dq, sq) => {
    const url = dq !== undefined ? dq : sq;
    return BAD_SCHEME.test(url) ? `${attr}="#"` : m;
  });
  // Strip inline event handlers (should not survive the escape step — belt-and-suspenders).
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '');
  return html;
}

// Render a WDL text value as inline Markdown → safe HTML string.
export function renderInlineMarkdown(text) {
  if (text == null || text === '') return '';
  const html = marked.parseInline(escapeHtml(String(text)), { gfm: false });
  return sanitizeHtml(html);
}
