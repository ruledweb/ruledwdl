export interface LayerNode {
    tag: string;
    semanticId: string;
    children: LayerNode[];
    repeator?: string | null;
}

/**
 * Parse WDL layers (string, nested tree, or 5-element tuples) into a nested tree.
 * Operators: `>` child, `+` sibling, `<` / `<*N` / `<@N` de-indent.
 */
export function parseLayers(layers: string | any[]): LayerNode[] {
    if (Array.isArray(layers)) {
        if (layers.length === 0) return [];
        if (Array.isArray(layers[0])) return tuplesToTree(layers as any[]);
        return cloneTree(layers as LayerNode[]);
    }

    if (typeof layers !== "string" || !layers.trim()) {
        return [];
    }

    return parseExpression(layers);
}

function cloneTree(nodes: LayerNode[]): LayerNode[] {
    return nodes.map((n) => ({
        tag: n.tag,
        semanticId: n.semanticId,
        children: n.children ? cloneTree(n.children) : [],
        repeator: n.repeator ?? null,
    }));
}

function tuplesToTree(tuples: any[]): LayerNode[] {
    const roots: LayerNode[] = [];
    const stack: { node: LayerNode; depth: number }[] = [];

    for (const entry of tuples) {
        const depth = Math.max(0, Number(entry[0]) || 0);
        const tag = String(entry[2] || "div").toLowerCase();
        const semanticId = String(entry[3] || "").replace(/^\./, "");
        const repeator = entry[4] ? String(entry[4]) : null;
        const node: LayerNode = { tag, semanticId, children: [], repeator };

        while (stack.length && stack[stack.length - 1].depth >= depth) {
            stack.pop();
        }
        if (stack.length === 0) {
            roots.push(node);
        } else {
            stack[stack.length - 1].node.children.push(node);
        }
        stack.push({ node, depth });
    }

    return roots;
}

function parseExpression(str: string): LayerNode[] {
    const root: LayerNode = { tag: "__root__", semanticId: "", children: [] };
    const stack: LayerNode[] = [root];
    let i = 0;

    const top = () => stack[stack.length - 1];

    while (i < str.length) {
        const ch = str[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        if (ch === ">") {
            const last = top().children[top().children.length - 1];
            if (last) stack.push(last);
            i++;
            continue;
        }
        if (ch === "+") {
            i++;
            continue;
        }
        if (ch === "<") {
            i++;
            if (i < str.length && str[i] === "*") {
                i++;
                let numStr = "";
                while (i < str.length && /\d/.test(str[i])) {
                    numStr += str[i++];
                }
                const count = numStr ? parseInt(numStr, 10) : 1;
                for (let k = 0; k < count; k++) {
                    if (stack.length > 1) stack.pop();
                }
            } else if (i < str.length && str[i] === "@") {
                i++;
                let numStr = "";
                while (i < str.length && /\d/.test(str[i])) {
                    numStr += str[i++];
                }
                const targetStackLen = (numStr ? parseInt(numStr, 10) : 0) + 1;
                while (stack.length > targetStackLen && stack.length > 1) {
                    stack.pop();
                }
            } else {
                let count = 1;
                while (i < str.length && str[i] === "<") {
                    count++;
                    i++;
                }
                for (let k = 0; k < count; k++) {
                    if (stack.length > 1) stack.pop();
                }
            }
            continue;
        }

        const parsed = parseElementToken(str, i);
        i = parsed.next;
        top().children.push(parsed.node);
    }

    return root.children;
}

function parseElementToken(
    str: string,
    start: number
): { node: LayerNode; next: number } {
    let i = start;
    let tag = "";
    while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) {
        tag += str[i++];
    }

    let semanticId = "";
    if (i < str.length && str[i] === ".") {
        i++;
        while (i < str.length && /[a-zA-Z0-9_-]/.test(str[i])) {
            semanticId += str[i++];
        }
    }

    let repeator: string | null = null;
    if (i < str.length && str[i] === "*") {
        i++;
        let mult = "";
        while (i < str.length && /[a-zA-Z0-9_.]/.test(str[i])) {
            mult += str[i++];
        }
        if (mult) repeator = mult;
    }

    tag = tag || "div";
    if (!semanticId) semanticId = tag;

    return {
        node: { tag, semanticId, children: [], repeator },
        next: i,
    };
}

function parseSingleNode(token: string): LayerNode {
    return parseElementToken(token.trim(), 0).node;
}

/**
 * Find a node by semanticId (depth-first)
 */
export function findNode(
    nodes: LayerNode[],
    semanticId: string
): { node: LayerNode; parent: LayerNode | null; index: number } | null {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (node.semanticId === semanticId) {
            return { node, parent: null, index: i };
        }
        const found = findNode(node.children || [], semanticId);
        if (found) {
            if (found.parent === null) {
                found.parent = node;
            }
            return found;
        }
    }
    return null;
}

function formatNode(node: LayerNode): string {
    const sem = node.semanticId ? `.${node.semanticId}` : "";
    const rep = node.repeator
        ? node.repeator.startsWith("*")
            ? node.repeator
            : `*${node.repeator}`
        : "";
    return `${node.tag || "div"}${sem}${rep}`;
}

function flatten(
    nodes: LayerNode[],
    depth = 0,
    out: { depth: number; node: LayerNode }[] = []
): { depth: number; node: LayerNode }[] {
    for (const node of nodes) {
        out.push({ depth, node });
        if (node.children && node.children.length) {
            flatten(node.children, depth + 1, out);
        }
    }
    return out;
}

/**
 * Serialize a nested tree to a WDL layers string.
 * Operators are derived from depth deltas so wrap/append round-trip with `<` / `<*N`.
 */
export function serializeLayers(nodes: LayerNode[]): string {
    const flat = flatten(nodes);
    return flat
        .map((item, i) => {
            const self = formatNode(item.node);
            if (i === 0) return self;
            const prev = flat[i - 1].depth;
            const depth = item.depth;
            let op: string;
            if (depth === prev + 1) op = ">";
            else if (depth === prev) op = "+";
            else if (depth < prev) {
                const climb = prev - depth;
                op = climb === 1 ? "<" : `<*${climb}`;
            } else {
                op = ">";
            }
            return `${op} ${self}`;
        })
        .join(" ");
}

/**
 * Create a node from a short layer string (e.g. "div.card" or "h2.title")
 */
export function createNode(layer: string): LayerNode {
    return parseSingleNode(layer);
}
