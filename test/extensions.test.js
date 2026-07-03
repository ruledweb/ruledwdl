// Smoke test — proves wdl-extensions/* compose into composePage via opts.resolveComponent /
// opts.extraScripts without src/ knowing about any of them. Run: node test/extensions.test.js
import { composePage, resolveComponent, createMemoryStore } from '../src/index.js';
import { composeResolvers } from '../wdl-extensions/compose.js';
import { createFormResolver, renderForm } from '../wdl-extensions/forms/index.js';
import { renderEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from '../wdl-extensions/email/index.js';
import { createQueryResolver } from '../wdl-extensions/queries/index.js';
import { createPluginResolver, withPlugins, collectPluginScripts } from '../wdl-extensions/plugins/index.js';
import { createSystemComponentResolver } from '../wdl-extensions/system-components/index.js';
import { validateComponentId, validateDataAgainstSchema } from '../wdl-extensions/content-schema/index.js';

let pass = 0, fail = 0;
const ok = (label, cond) => { (cond ? pass++ : fail++); console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`); };

// 1) Forms — pure render + composePage wiring via resolveComponent
const formHtml = renderForm({ id: 'contact', turnstile: false, fields: [
  { name: 'email', type: 'email', label: 'Email', required: true },
  { name: 'hp', type: 'honeypot' },
] }, { submitLabel: 'Go' });
ok('renderForm produces a form', formHtml.includes('<form') && formHtml.includes('type="email"'));

{
  const store = createMemoryStore({});
  store.getForm = async (_p, id) => (id === 'contact' ? { id: 'contact', fields: [{ name: 'email', type: 'email' }] } : null);
  const page = { COMPONENTS: [{ component: 'form', data_overrides: { form_id: 'contact' } }] };
  const { html } = await composePage(store, 'p', page, { resolveComponent: createFormResolver({}) });
  ok('composePage + forms resolver renders the form', html.includes('rw-form'));
}

// 2) Email — pure render, no store/composePage involvement
{
  const { html, subject } = renderEmailTemplate(DEFAULT_EMAIL_TEMPLATE, { form_id: 'contact', site_name: 'Acme', heading: 'Hi', fields: [{ label: 'Email', value: 'a@b.com' }] });
  ok('renderEmailTemplate renders default template', html.includes('Acme') && html.includes('a@b.com'));
  ok('renderEmailTemplate resolves subject binding', subject === 'New submission: contact');
}

// 3) Plugins + system-components + queries composed together via composeResolvers
{
  const plugins = [{
    id: 'p1',
    components: [{ id: 'plugin-card', emmet: 'div.pcard', attr: {} }],
    registry_tokens: { pcard: { class: 'p-4' } },
    scripts: [{ id: 'p1-script', type: 'inline', inline: 'console.log(1)', load_position: 'body_end' }],
  }];
  let store = createMemoryStore({ components: { 'q-comp': { emmet: 'div.q', data_query: 'recent' } } });
  store.getSystemComponent = async (_p, id) => (id === 'sys-hero' ? { emmet: 'div.hero', attr: {} } : null);
  store.executeQuery = async (_p, q) => (q === 'recent' ? { inject_as: 'recentPosts', data: [{ title: 'A' }] } : null);
  store = withPlugins(store, plugins);

  const resolver = composeResolvers(createQueryResolver(), createPluginResolver(plugins), createSystemComponentResolver());
  const page = { COMPONENTS: [{ component: 'plugin-card' }, { component: 'sys-hero' }, { component: 'q-comp' }] };
  const { html, dynamic } = await composePage(store, 'p', page, { resolveComponent: resolver, extraScripts: collectPluginScripts(plugins) });

  ok('plugin component resolves with merged registry token', html.includes('class="p-4 pcard"'));
  ok('system component resolves', html.includes('class="hero"'));
  ok('query-backed component resolves', html.includes('class="q"'));
  ok('query marks page dynamic', dynamic === true);
  ok('plugin script injected via extraScripts', html.includes('console.log(1)'));
}

// 4) Unresolved component ID falls through to composePage's final passthrough fallback (empty <div>)
{
  const store = createMemoryStore({});
  const page = { COMPONENTS: [{ component: 'missing-id' }] };
  const { html } = await composePage(store, 'p', page, { resolveComponent: resolveComponent });
  ok('unknown component id renders empty fallback, not a throw', html.includes('<div></div>'));
}

// 5) content-schema validators are pure, no store/composePage involvement
ok('validateComponentId accepts kebab-case', validateComponentId('hero-centered') === null);
ok('validateComponentId rejects colons', typeof validateComponentId('plugin:hero') === 'string');
ok('validateDataAgainstSchema flags missing required field', validateDataAgainstSchema({}, { title: { type: 'string', required: true } }).valid === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
