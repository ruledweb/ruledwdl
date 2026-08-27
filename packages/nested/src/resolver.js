/**
 * @ruledwdl/nested — Nested Component Resolver
 *
 * Implements recursive AST macro expansion for `@component` and `@component*loop` references
 * in WDL Layers definitions, with namespace isolation, loop context binding,
 * script dependency deduplication, and cycle detection.
 */

/**
 * Lightweight layers parser fallback if global WDL.parseLayers is not provided.
 * Supports standard WDL operator grammars: >, +, <, <*N, <@N, *multiplier, *loopKey.
 */
export function parseLayersToAst(str) {
  if (Array.isArray(str)) return structuredClone(str);
  if (typeof str !== 'string' || !str.trim()) return [];

  const root = { tag: '__root__', classes: [], loopKey: null, children: [] };
  const stack = [root];
  let i = 0;
  const s = str.trim();

  const top = () => stack[stack.length - 1];

  while (i < s.length) {
    const ch = s[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === '>') {
      const last = top().children[top().children.length - 1];
      if (last) stack.push(last);
      i++;
      continue;
    }

    if (ch === '+') {
      i++;
      continue;
    }

    if (ch === '<') {
      i++;
      let levels = 1;
      if (s[i] === '*') {
        i++;
        let numStr = '';
        while (i < s.length && /\d/.test(s[i])) numStr += s[i++];
        levels = parseInt(numStr, 10) || 1;
      } else {
        while (i < s.length && s[i] === '<') {
          levels++;
          i++;
        }
      }
      for (let l = 0; l < levels; l++) {
        if (stack.length > 1) stack.pop();
      }
      continue;
    }

    // Node token: tag.class1.class2*loopKey
    let tag = '';
    while (i < s.length && /[a-zA-Z0-9_@-]/.test(s[i])) {
      tag += s[i++];
    }

    const classes = [];
    while (i < s.length && s[i] === '.') {
      i++;
      let cls = '';
      while (i < s.length && /[a-zA-Z0-9_-]/.test(s[i])) {
        cls += s[i++];
      }
      if (cls) classes.push(cls);
    }

    let loopKey = null;
    if (i < s.length && s[i] === '*') {
      i++;
      let lk = '';
      while (i < s.length && /[a-zA-Z0-9_.]/.test(s[i])) {
        lk += s[i++];
      }
      loopKey = lk || null;
    }

    const node = {
      tag: tag || 'div',
      classes,
      loopKey,
      children: []
    };

    top().children.push(node);
  }

  return root.children;
}

/**
 * Serializes an AST node tree back into a standard WDL layers string expression.
 *
 * @param {Array<object>} nodes - AST node array
 * @returns {string} WDL layers expression
 */
export function serializeAst(nodes) {
  function serializeNode(node) {
    let s = node.tag || 'div';
    if (Array.isArray(node.classes) && node.classes.length) {
      s += '.' + node.classes.join('.');
    }
    if (node.loopKey) {
      s += '*' + node.loopKey;
    }
    return s;
  }

  function serializeTree(nodeList) {
    const parts = [];
    for (let i = 0; i < nodeList.length; i++) {
      const curr = nodeList[i];
      let currStr = serializeNode(curr);
      if (curr.children && curr.children.length) {
        currStr += '>' + serializeTree(curr.children);
        if (i < nodeList.length - 1) {
          currStr += '<';
        }
      }
      parts.push(currStr);
    }
    return parts.join('+');
  }

  return serializeTree(nodes);
}

/**
 * Creates a nested component resolver hook compatible with @ruledwdl/core composePage options.
 *
 * @param {object} [options={}]
 * @param {object} [options.store] - Store instance containing component definitions
 * @param {Function} [options.parseLayers] - Custom layers parser function
 * @param {number} [options.maxDepth=15] - Maximum nested component recursion depth
 * @param {Function} [options.onMissingComponent] - Callback invoked when a referenced @component is not found
 * @returns {Function} Hook function `(store, project, block, designCtx) => Promise<object|null>`
 */
export function createNestedResolver(options = {}) {
  const {
    store: defaultStore = null,
    parseLayers = (typeof globalThis !== 'undefined' && globalThis.WDL?.parseLayers) || parseLayersToAst,
    maxDepth = 15,
    onMissingComponent = null
  } = options;

  return async function nestedComponentsResolver(storeArg, project, block, designCtx) {
    const store = storeArg || defaultStore;
    if (!store || typeof store.getComponent !== 'function') {
      return null;
    }

    let layersStr = block.layers || '';
    let compDef = null;

    if (!layersStr && block.component) {
      compDef = await store.getComponent(project, block.component);
      if (compDef) {
        layersStr = compDef.COMPONENTS?.[0]?.layers || compDef.layers || '';
      }
    }

    if (!layersStr.includes('@')) {
      return null; // Pass-through standard components without @ references
    }

    const ast = parseLayers(layersStr);
    const mergedAttr = { ...(compDef?.attr || {}), ...(block.attr || {}) };
    const scriptDeps = new Set([
      ...(compDef?.script_deps || []),
      ...(block._script_deps || []),
      ...(block.script_deps || [])
    ]);

    async function expand(nodes, depth = 0, visited = new Set()) {
      if (depth > maxDepth) {
        console.warn(`[WDL Nested] Max recursion depth (${maxDepth}) exceeded at component expansion.`);
        return;
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];

        if (node.tag && node.tag.startsWith('@')) {
          const compId = node.tag.slice(1);

          if (visited.has(compId)) {
            console.warn(`[WDL Nested] Circular component reference detected: ${Array.from(visited).join(' -> ')} -> ${compId}`);
            continue;
          }

          const subDef = await store.getComponent(project, compId);
          if (!subDef) {
            if (typeof onMissingComponent === 'function') {
              onMissingComponent(compId, node);
            }
            continue;
          }

          const subBlock = subDef.COMPONENTS?.[0] || subDef;
          const subLayers = subBlock.layers || 'div';
          const subAttrs = subBlock.attr || {};
          const subScripts = subDef.script_deps || subBlock.script_deps || [];

          // Collect script dependencies
          subScripts.forEach((s) => scriptDeps.add(s));

          // Parse sub-component AST
          const subAst = parseLayers(subLayers);
          if (!subAst.length) continue;

          // Merge attributes
          Object.assign(mergedAttr, subAttrs);

          const subRoot = subAst[0];
          
          // Inherit loop key from placeholder if defined (e.g. @stat-item*stats)
          if (node.loopKey) {
            subRoot.loopKey = node.loopKey;
          }

          // Combine classes from placeholder node onto sub-component root
          if (Array.isArray(node.classes) && node.classes.length) {
            subRoot.classes = [...new Set([...(subRoot.classes || []), ...node.classes])];
          }

          // Recursively expand nested sub-components inside this sub-component
          visited.add(compId);
          await expand(subAst, depth + 1, visited);
          visited.delete(compId);

          // Splice expanded subtree into parent AST
          nodes.splice(i, 1, ...subAst);
          i += subAst.length - 1;
        } else if (node.children && node.children.length) {
          await expand(node.children, depth, visited);
        }
      }
    }

    await expand(ast, 0, new Set());

    return {
      ...block,
      layers: serializeAst(ast),
      attr: mergedAttr,
      _script_deps: Array.from(scriptDeps)
    };
  };
}

export default createNestedResolver;
