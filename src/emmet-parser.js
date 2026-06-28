// src/renderer/emmet-parser.js

export function parseEmmet(str) {
  const bad = String(str).match(/[{}\[\]^()]/);
  if (bad) {
    const ch = bad[0];
    const hint =
      ch === '{' || ch === '}'
        ? 'Inline text `{...}` is not supported. Put text in DATA and reference with ${key}, or set `text` on the element via the attr object.'
        : ch === '[' || ch === ']'
        ? 'Inline attributes `[name=value]` are not supported. Put attributes in the attr object, keyed by tag or `.class`.'
        : ch === '^'
        ? 'Climb-up `^` is not supported. Add a second root entry to COMPONENTS instead of escaping up with `^`.'
        : 'Grouping `(...)` is not supported. Split into multiple COMPONENTS entries instead of grouping with `()`.';
    throw new Error(`parseEmmet: unsupported character "${ch}" in "${str}". ${hint}`);
  }
  function seg(s) {
    const nodes = [];
    let i = 0;
    while (i <= s.length) {
      let token = '';
      while (i < s.length && s[i] !== '>' && s[i] !== '+') token += s[i++];
      if (!token.trim()) {
        i++;
        continue;
      }
      let repeat = 1,
        loopKey = null;
      const rNum = token.match(/\*(\d+)$/);
      const rArr = token.match(/\*([a-zA-Z][\w.]*)$/);
      if (rNum) {
        repeat = +rNum[1];
        token = token.replace(/\*\d+$/, '');
      } else if (rArr) {
        loopKey = rArr[1];
        token = token.replace(/\*[a-zA-Z][\w.]*$/, '');
      }
      const tagM = token.match(/^([a-zA-Z][\w-]*)/);
      const idM = token.match(/#([\w-]+)/);
      const clsM = token.match(/\.([\w-]+(?:\.[\w-]+)*)/);
      const tag = tagM ? tagM[1] : 'div';
      const id = idM ? idM[1] : null;
      const cls = clsM ? clsM[1].split('.') : [];
      let children = [];
      if (i < s.length && s[i] === '>') {
        i++;
        children = seg(s.slice(i));
        i = s.length;
      }
      const count = loopKey ? 1 : repeat;
      for (let r = 0; r < count; r++) {
        const n = { tag, classes: [...cls], children: [...children] };
        if (id) n.id = id;
        if (loopKey) n.loopKey = loopKey;
        nodes.push(n);
      }
      if (i < s.length && s[i] === '+') i++;
      else break;
    }
    return nodes;
  }
  return seg(str);
}

export function matchAttr(node, attr) {
  for (const c of node.classes) {
    if (attr['.' + c]) return attr['.' + c];
  }
  return attr[node.tag] || {};
}
