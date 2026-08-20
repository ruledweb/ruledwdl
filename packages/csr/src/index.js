import { parseLayers } from './layers-parser.js';
import { toHTML } from './element-builder.js';
import { normalizeRegistry } from './registry-compiler.js';

/**
 * Pure, synchronous rendering function for components.
 */
export function render(REG, COMPS, DAT) {
  const { normalizedRegistry, themeCss, componentCss } = normalizeRegistry(REG || {});

  // Auto-inject theme and component CSS in browser environment if head exists
  if (typeof document !== 'undefined' && document.head) {
    if (themeCss) {
      let themeTag = document.querySelector('style[data-wdl="theme-tokens"]');
      if (!themeTag) {
        themeTag = document.createElement('style');
        themeTag.setAttribute('data-wdl', 'theme-tokens');
        document.head.appendChild(themeTag);
      }
      themeTag.textContent = themeCss;
    }
    if (componentCss) {
      let compTag = document.querySelector('style[data-wdl="components"]');
      if (!compTag) {
        compTag = document.createElement('style');
        compTag.setAttribute('data-wdl', 'components');
        document.head.appendChild(compTag);
      }
      if (!compTag.textContent.includes(componentCss)) {
        compTag.textContent = [compTag.textContent, componentCss].filter(Boolean).join('\n');
      }
    }
  }

  return COMPS.map(comp => {
    if (comp._raw_html != null) return comp._raw_html;
    return parseLayers(comp.layers || 'div')
      .map(n => toHTML(n, comp.attr || {}, DAT, normalizedRegistry))
      .join('');
  }).join('');
}

/**
 * Client-side auto-mounter. 
 * Looks for any element with `wdl-csr` attribute containing a payload ID
 * and hydrates the DOM with the compiled output.
 */
export function hydrate(globalPayloads = null) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  const payloads = globalPayloads || window.WDL_CSR || {};
  const targets = document.querySelectorAll('[wdl-csr]');
  
  targets.forEach(target => {
    try {
      const compId = target.getAttribute('wdl-csr');
      if (!compId) return;
      
      const payload = payloads[compId];
      if (!payload) {
        console.warn(`WDL CSR: No payload found for component ID "${compId}"`);
        return;
      }
      
      const { REGISTRY = {}, COMPONENTS = [], DATA = {} } = payload;
      target.innerHTML = render(REGISTRY, COMPONENTS, DATA);
    } catch (err) {
      console.error('WDL CSR Error: Failed to render target.', target, err);
    }
  });
}
