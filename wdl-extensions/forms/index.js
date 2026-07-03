// wdl-extensions/forms — plugs a "form" system component into @wdl/core's composePage.
//
// Requires your Store to also implement:
//   getForm(project, formId) => Promise<{ id, fields, turnstile, accent } | null>
//
// Usage:
//   import { composePage } from '@wdl/core';
//   import { createFormResolver } from '@wdl/core/extensions/forms';
//
//   const resolveComponent = createFormResolver({ siteKey: env.TURNSTILE_SITE_KEY });
//   await composePage(store, project, page, { resolveComponent });
//
// If you also use other extensions (plugins, system-components, queries), compose their
// resolvers together with composeResolvers() from wdl-extensions/compose.js.
import { renderForm } from './form-renderer.js';

// createFormResolver(opts) → resolveComponent-compatible function for composePage.
//   opts.siteKey — public Turnstile site key (omit/null → no captcha widget, honeypot only)
export function createFormResolver({ siteKey = null } = {}) {
  return async function resolveFormComponent(store, project, block) {
    if (block.component !== 'form') return null;

    const o = block.data_overrides || {};
    const formId = o.form_id;
    const form = formId ? await store.getForm(project, formId) : null;
    if (!form) {
      return { _raw_html: `<!-- wdl:form '${formId || ''}' not found -->`, _script_deps: [] };
    }
    const html = renderForm(form, { siteKey, submitLabel: o.submit_label || 'Send' });
    return { _raw_html: html, _script_deps: [] };
  };
}

export { renderForm } from './form-renderer.js';
