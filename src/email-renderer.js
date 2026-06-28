// src/renderer/email-renderer.js — render a WDL email template to HTML.
//
// Reuses the same WDL→HTML engine as pages (`renderAll`), so emails are authored
// as WDL JSON ({ subject?, REGISTRY?, COMPONENTS, DATA? }). Pure (no I/O — the D1
// template load happens in the caller), keeping it @wdl/core-extractable.
//
// Email rules differ from web pages: clients strip <style>/external CSS and don't
// run JS, so templates use INLINE styles (REGISTRY `style` tokens by class, or
// attr.style), table/block layout, and ABSOLUTE URLs. No Tailwind CDN, no
// Global-G, no web <head> shell. See docs/plan/email-templates-wdl.md.
import { renderAll } from './render-engine.js';
import { resolveStr } from './data-resolver.js';

// Minimal email-safe document shell — charset + viewport + a neutral page bg.
export function wrapEmailDoc(bodyHtml, { lang = 'en' } = {}) {
  return '<!DOCTYPE html><html lang="' + lang + '"><head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
    + '<meta name="color-scheme" content="light only">'
    + '</head><body style="margin:0;padding:24px 0;background:#f4f4f5">'
    + bodyHtml
    + '</body></html>';
}

// template — WDL email template { subject?, REGISTRY?, COMPONENTS, DATA? }
// data     — values merged over template.DATA for ${} binding + *loops
// returns  — { html, subject } (subject is binding-resolved, or null)
export function renderEmailTemplate(template, data = {}) {
  const REG    = template.REGISTRY   || {};
  const COMPS  = template.COMPONENTS || [];
  const merged = { ...(template.DATA || {}), ...data };
  const body   = renderAll(REG, COMPS, merged);
  const subject = template.subject ? resolveStr(template.subject, merged) : null;
  return { html: wrapEmailDoc(body), subject };
}

// Built-in branded form-notification template. Used as the fallback when a form's
// email_template id isn't found, so HTML email works out of the box. Inline-style
// tokens live in REGISTRY (applied by class); two stacked top-level entries (card
// + button) because emmet has no grouping/climb-up. `fields` is an array of
// { label, value } rows.
export const DEFAULT_EMAIL_TEMPLATE = {
  subject: 'New submission: ${form_id}',
  REGISTRY: {
    wrap:    { style: 'max-width:600px;margin:0 auto;padding:0 16px' },
    card:    { style: 'background:#ffffff;border:1px solid #e4e4e7;border-radius:10px;padding:28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif' },
    brand:   { style: 'font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#10b981;margin:0 0 6px' },
    title:   { style: 'font-size:18px;color:#111111;margin:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif' },
    rows:    { style: 'border-top:1px solid #f0f0f0' },
    row:     { style: 'padding:10px 0;border-bottom:1px solid #f0f0f0' },
    label:   { style: 'display:block;font-size:11px;color:#999999;text-transform:uppercase;letter-spacing:1px' },
    value:   { style: 'display:block;font-size:14px;color:#111111;margin-top:3px;word-break:break-word' },
    btnwrap: { style: 'max-width:600px;margin:18px auto 0;padding:0 16px;text-align:center' },
    btn:     { style: 'display:inline-block;background:#10b981;color:#000000;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:6px;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif' },
  },
  COMPONENTS: [
    {
      emmet: 'div.wrap>div.card>p.brand+h1.title+div.rows>div.row*fields>span.label+span.value',
      attr: {
        '.brand': { text: '${site_name}' },
        '.title': { text: '${heading}' },
        '.label': { text: '${label}' },
        '.value': { text: '${value}' },
      },
    },
    {
      emmet: 'div.btnwrap>a.btn',
      attr: { '.btn': { href: '${cta_url}', text: '${cta_label}' } },
    },
  ],
  DATA: {
    site_name: 'RuledWeb',
    heading:   'New form submission',
    cta_label: 'View submission',
    cta_url:   '#',
    fields:    [],
  },
};
