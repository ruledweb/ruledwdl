// wdl-extensions/email — render a WDL email template, with an id-based lookup helper.
//
// Requires your Store to also implement (if you use renderEmailById):
//   getEmailTemplate(project, templateId) => Promise<EmailTemplate | null>
//
// Usage:
//   import { renderEmailById } from '@wdl/core/extensions/email';
//   const { html, subject } = await renderEmailById(store, project, 'form-notify', data);
import { renderEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from './email-renderer.js';

// renderEmailById — loads a template by id via store.getEmailTemplate, falling back to
// DEFAULT_EMAIL_TEMPLATE when the id isn't found (so email always renders something).
export async function renderEmailById(store, project, templateId, data = {}) {
  const template = (templateId && await store.getEmailTemplate?.(project, templateId)) || DEFAULT_EMAIL_TEMPLATE;
  return renderEmailTemplate(template, data);
}

export { wrapEmailDoc, renderEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from './email-renderer.js';
