// wdl-extensions/forms/form-renderer.js — turns a saved form definition into <form> HTML.
//
// Pure function (no I/O): loading the form definition and wiring it into a page is index.js's
// job (createFormResolver, plugged into composePage via opts.resolveComponent); this module only
// renders markup given a form object already in hand.
//
// A page references a saved form with:
//   { "component": "form", "data_overrides": { "form_id": "contact" } }
//
// Styling is SELF-CONTAINED — a scoped <style> block shipped inside the form
// HTML, NOT Tailwind utilities. A form is a critical interactive widget that
// must render correctly regardless of host CSS-delivery state (first render, stale cache,
// or classes Tailwind can't emit — the old honeypot relied on `-left-[5000px]`,
// which Tailwind v4 never generated, leaving the honeypot VISIBLE and silently
// dropping real submissions). The scoped <style> ships with every form render,
// so forms never depend on the page stylesheet.
import { esc } from '../../src/element-builder.js';

const TURNSTILE_API = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const DEFAULT_ACCENT = '#111827';

// One scoped stylesheet per form (parametrised by accent). Selectors are all
// under .rw-form so it can't leak onto the host page.
function formCss(accent) {
  return '<style>'
    + `.rw-form{max-width:34rem;margin:32px auto;display:flex;flex-direction:column;gap:16px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;box-sizing:border-box;font-family:${FONT};color:#111827}`
    + '.rw-form .rw-field{display:flex;flex-direction:column;gap:6px}'
    + '.rw-form .rw-label{font-size:13px;font-weight:600;color:#374151}'
    + '.rw-form .rw-input{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:11px 13px;font-size:15px;line-height:1.4;color:#111827;background:#fff;box-sizing:border-box;font-family:inherit}'
    + '.rw-form textarea.rw-input{min-height:120px;resize:vertical}'
    + `.rw-form .rw-input:focus{outline:none;border-color:${accent};box-shadow:0 0 0 3px ${accent}22}`
    + '.rw-form .rw-input::placeholder{color:#9ca3af}'
    + '.rw-form .rw-check{display:flex;align-items:center;gap:8px;font-size:14px;color:#374151}'
    + '.rw-form .rw-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}'
    + `.rw-form .rw-submit{appearance:none;border:0;width:100%;background:${accent};color:#fff;font-weight:700;font-size:15px;padding:13px 20px;border-radius:8px;cursor:pointer;font-family:inherit}`
    + '.rw-form .rw-submit:hover{filter:brightness(1.07)}'
    + '</style>';
}

function fieldHtml(f) {
  const name = esc(f.name || '');
  if (!name) return '';
  const req = f.required ? ' required' : '';
  const ph  = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
  const max = f.max ? ` maxlength="${esc(f.max)}"` : '';
  const id  = `f_${name}`;
  const labelText = esc(f.label || f.name);

  switch (f.type) {
    case 'honeypot':
      // Hidden via the scoped .rw-hp rule (position:absolute;left:-9999px) — so
      // it is hidden unconditionally, never depending on a generated class. The
      // submit handler drops any submission where this is filled.
      return `<div class="rw-hp" aria-hidden="true"><label>Leave this empty`
        + `<input type="text" name="${name}" tabindex="-1" autocomplete="off"></label></div>`;

    case 'textarea':
      return `<div class="rw-field"><label class="rw-label" for="${id}">${labelText}</label>`
        + `<textarea class="rw-input" id="${id}" name="${name}"${req}${ph}${max}></textarea></div>`;

    case 'select': {
      const opts = (f.options || []).map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
      return `<div class="rw-field"><label class="rw-label" for="${id}">${labelText}</label>`
        + `<select class="rw-input" id="${id}" name="${name}"${req}>${opts}</select></div>`;
    }

    case 'checkbox':
      return `<div class="rw-check"><input type="checkbox" id="${id}" name="${name}" value="yes"${req}>`
        + `<label for="${id}">${labelText}</label></div>`;

    case 'email':
    case 'text':
    default:
      return `<div class="rw-field"><label class="rw-label" for="${id}">${labelText}</label>`
        + `<input type="${f.type === 'email' ? 'email' : 'text'}" class="rw-input" id="${id}" name="${name}"${req}${ph}${max}></div>`;
  }
}

// form     — the saved definition { id, fields, turnstile, accent? }
// opts.siteKey — Turnstile public site key (null → no widget rendered)
// opts.submitLabel — overrides the button text (from data_overrides.submit_label)
export function renderForm(form, { siteKey = null, submitLabel = 'Send' } = {}) {
  if (!form || !form.id) return '<!-- rw:form missing definition -->';

  const fields = Array.isArray(form.fields) ? form.fields : [];
  const fieldsHtml = fields.map(fieldHtml).join('');
  const accent = (typeof form.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(form.accent))
    ? form.accent : DEFAULT_ACCENT;

  // Widget renders only when both the form opts in AND a site key is configured.
  // site.js gates submit-time validation on the same site-key presence, so the
  // widget and the check stay consistent (no "captcha required but none shown").
  const turnstile = form.turnstile && siteKey
    ? `<div class="cf-turnstile" data-sitekey="${esc(siteKey)}" style="margin-top:4px"></div>`
      + `<script src="${TURNSTILE_API}" async defer></script>`
    : '';

  // Host-relative action: project is resolved from the request host, so
  // /_form/<id> routes correctly on the apex, a subdomain, or a custom domain.
  const action = `/_form/${esc(form.id)}`;

  return formCss(accent)
    + `<form class="rw-form" method="POST" action="${action}">`
    + fieldsHtml
    + turnstile
    + `<button type="submit" class="rw-submit">${esc(submitLabel)}</button>`
    + `</form>`;
}
