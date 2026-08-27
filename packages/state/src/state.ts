import { EventBus } from "./events.js";
import type {
    ComponentSnapshot,
    ChangeEvent,
    EventHandler,
} from "./types.js";
import {
    parseLayers,
    findNode,
    serializeLayers,
    createNode,
    type LayerNode,
} from "./layers.js";

export class ComponentState {
    readonly id: string;
    private _registry?: Record<string, any>;
    private _layers: string | any[];
    private _attr: Record<string, any>;
    private _data: Record<string, any>;
    private _dataSchema?: Record<string, any>;
    private bus = new EventBus();

    constructor(initial: ComponentSnapshot) {
        this.id = initial.id;
        this._registry = initial.registry ? structuredClone(initial.registry) : undefined;
        this._layers = structuredClone(initial.layers);
        this._attr = structuredClone(initial.attr || {});
        this._data = structuredClone(initial.data || {});
        this._dataSchema = initial.dataSchema
            ? structuredClone(initial.dataSchema)
            : undefined;
    }

    // ---------- Snapshot ----------
    getSnapshot(): ComponentSnapshot {
        return {
            id: this.id,
            registry: this._registry ? structuredClone(this._registry) : undefined,
            layers: structuredClone(this._layers),
            attr: structuredClone(this._attr),
            data: structuredClone(this._data),
            dataSchema: this._dataSchema
                ? structuredClone(this._dataSchema)
                : undefined,
        };
    }

    // ---------- Layers ----------
    get layers() {
        const self = this;

        // Helper to get current tree
        const getTree = (): LayerNode[] => {
            if (typeof self._layers === "string") {
                return parseLayers(self._layers);
            }
            // If already a tree, use it
            return structuredClone(self._layers) as LayerNode[];
        };

        const setTree = (tree: LayerNode[]) => {
            self._layers = serializeLayers(tree);
            // You can also keep the tree if you prefer:
            // self._layers = tree;
        };

        return {
            list(): string | any[] {
                return structuredClone(self._layers);
            },

            /** Get the internal tree (useful for debugging) */
            tree(): LayerNode[] {
                return getTree();
            },

            set(layers: string | any[]) {
                self._layers = structuredClone(layers);
                self.emit("layers:change", "set");
            },

            append(parentSemanticId: string, layer: string) {
                const tree = getTree();
                const found = findNode(tree, parentSemanticId);

                if (!found) {
                    throw new Error(`Parent semantic id "${parentSemanticId}" not found`);
                }

                const newNode = createNode(layer);
                if (!found.node.children) found.node.children = [];
                found.node.children.push(newNode);

                setTree(tree);
                self.emit("layers:change", "append", parentSemanticId, layer);
            },

            prepend(parentSemanticId: string, layer: string) {
                const tree = getTree();
                const found = findNode(tree, parentSemanticId);

                if (!found) {
                    throw new Error(`Parent semantic id "${parentSemanticId}" not found`);
                }

                const newNode = createNode(layer);
                if (!found.node.children) found.node.children = [];
                found.node.children.unshift(newNode);

                setTree(tree);
                self.emit("layers:change", "prepend", parentSemanticId, layer);
            },

            before(targetSemanticId: string, layer: string) {
                const tree = getTree();
                const found = findNode(tree, targetSemanticId);

                if (!found) {
                    throw new Error(`Target semantic id "${targetSemanticId}" not found`);
                }

                const newNode = createNode(layer);
                const list = found.parent ? found.parent.children : tree;
                list.splice(found.index, 0, newNode);

                setTree(tree);
                self.emit("layers:change", "before", targetSemanticId, layer);
            },

            after(targetSemanticId: string, layer: string) {
                const tree = getTree();
                const found = findNode(tree, targetSemanticId);

                if (!found) {
                    throw new Error(`Target semantic id "${targetSemanticId}" not found`);
                }

                const newNode = createNode(layer);
                const list = found.parent ? found.parent.children : tree;
                list.splice(found.index + 1, 0, newNode);

                setTree(tree);
                self.emit("layers:change", "after", targetSemanticId, layer);
            },

            wrap(targetSemanticId: string, wrapperLayer: string) {
                const tree = getTree();
                const found = findNode(tree, targetSemanticId);

                if (!found) {
                    throw new Error(`Target semantic id "${targetSemanticId}" not found`);
                }

                const wrapper = createNode(wrapperLayer);
                wrapper.children = [found.node];

                const list = found.parent ? found.parent.children : tree;
                list[found.index] = wrapper;

                setTree(tree);
                self.emit("layers:change", "wrap", targetSemanticId, wrapperLayer);
            },

            unwrap(targetSemanticId: string) {
                const tree = getTree();
                const found = findNode(tree, targetSemanticId);

                if (!found) {
                    throw new Error(`Target semantic id "${targetSemanticId}" not found`);
                }

                const children = found.node.children || [];
                const list = found.parent ? found.parent.children : tree;
                list.splice(found.index, 1, ...children);

                setTree(tree);
                self.emit("layers:change", "unwrap", targetSemanticId);
            },

            move(sourceSemanticId: string, targetSemanticId: string, position: "before" | "after" | "inside" = "inside") {
                const tree = getTree();
                const sourceFound = findNode(tree, sourceSemanticId);

                if (!sourceFound) {
                    throw new Error(`Source semantic id "${sourceSemanticId}" not found`);
                }

                // Remove source node from its current position
                const sourceList = sourceFound.parent ? sourceFound.parent.children : tree;
                const [sourceNode] = sourceList.splice(sourceFound.index, 1);

                // Find target in updated tree
                const targetFound = findNode(tree, targetSemanticId);
                if (!targetFound) {
                    throw new Error(`Target semantic id "${targetSemanticId}" not found`);
                }

                if (position === "before") {
                    const targetList = targetFound.parent ? targetFound.parent.children : tree;
                    targetList.splice(targetFound.index, 0, sourceNode);
                } else if (position === "after") {
                    const targetList = targetFound.parent ? targetFound.parent.children : tree;
                    targetList.splice(targetFound.index + 1, 0, sourceNode);
                } else {
                    if (!targetFound.node.children) targetFound.node.children = [];
                    targetFound.node.children.push(sourceNode);
                }

                setTree(tree);
                self.emit("layers:change", "move", sourceSemanticId, { targetSemanticId, position });
            },

            remove(semanticId: string) {
                const tree = getTree();
                const found = findNode(tree, semanticId);

                if (!found) {
                    throw new Error(`Semantic id "${semanticId}" not found`);
                }

                const list = found.parent ? found.parent.children : tree;
                list.splice(found.index, 1);

                setTree(tree);
                self.emit("layers:change", "remove", semanticId);
            },

            update(semanticId: string, patch: { tag?: string; semanticId?: string; repeator?: string | null }) {
                const tree = getTree();
                const found = findNode(tree, semanticId);

                if (!found) {
                    throw new Error(`Semantic id "${semanticId}" not found`);
                }

                if (patch.tag) found.node.tag = patch.tag;
                if (patch.semanticId) found.node.semanticId = patch.semanticId;
                if (patch.repeator !== undefined) found.node.repeator = patch.repeator;

                setTree(tree);
                self.emit("layers:change", "update", semanticId, patch);
            },
        };
    }

    // ---------- Attr ----------
    get attr() {
        const self = this;
        return {
            list(): Record<string, any> {
                return structuredClone(self._attr);
            },

            get(semanticId: string): Record<string, any> | undefined {
                const key = semanticId.startsWith(".") ? semanticId : `.${semanticId}`;
                return self._attr[key] ? structuredClone(self._attr[key]) : undefined;
            },

            set(semanticId: string, attrs: Record<string, any>) {
                const key = semanticId.startsWith(".") ? semanticId : `.${semanticId}`;
                self._attr[key] = structuredClone(attrs);
                self.emit("attr:change", "set", semanticId, attrs);
            },

            update(semanticId: string, patch: Record<string, any>) {
                const key = semanticId.startsWith(".") ? semanticId : `.${semanticId}`;
                self._attr[key] = {
                    ...(self._attr[key] || {}),
                    ...structuredClone(patch),
                };
                self.emit("attr:change", "update", semanticId, patch);
            },

            remove(semanticId: string, attrKey?: string) {
                const key = semanticId.startsWith(".") ? semanticId : `.${semanticId}`;
                if (attrKey) {
                    if (self._attr[key]) {
                        delete self._attr[key][attrKey];
                    }
                } else {
                    delete self._attr[key];
                }
                self.emit("attr:change", "remove", semanticId, attrKey);
            },
        };
    }

    // ---------- Data ----------
    get data() {
        const self = this;
        return {
            get(path?: string): any {
                if (!path) return structuredClone(self._data);
                const parts = path.split(".");
                let current: any = self._data;
                for (const p of parts) {
                    if (current == null) return undefined;
                    current = current[p];
                }
                return structuredClone(current);
            },

            set(path: string, value: any) {
                const parts = path.split(".");
                let current: any = self._data;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (current[parts[i]] == null) current[parts[i]] = {};
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = structuredClone(value);
                self.emit("data:change", "set", path, value);
            },

            update(path: string, patch: Record<string, any>) {
                const current = this.get(path) || {};
                this.set(path, { ...current, ...patch });
            },

            remove(path: string) {
                const parts = path.split(".");
                let current: any = self._data;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (current[parts[i]] == null) return;
                    current = current[parts[i]];
                }
                delete current[parts[parts.length - 1]];
                self.emit("data:change", "remove", path);
            },
        };
    }

    // ---------- Variant ----------
    get variant() {
        const self = this;
        return {
            get(semanticId?: string): string | undefined {
                const key = semanticId ? (semanticId.startsWith(".") ? semanticId : `.${semanticId}`) : ".";
                return self._attr[key]?.["data-variant"];
            },

            set(variantName: string, semanticId?: string) {
                const key = semanticId ? (semanticId.startsWith(".") ? semanticId : `.${semanticId}`) : ".";
                self._attr[key] = {
                    ...(self._attr[key] || {}),
                    "data-variant": variantName,
                };
                self.emit("variant:change" as any, "set", semanticId || self.id, variantName);
            },
        };
    }

    // ---------- Registry ----------
    get registry() {
        const self = this;
        return {
            get(): Record<string, any> | undefined {
                return self._registry ? structuredClone(self._registry) : undefined;
            },

            set(registry: Record<string, any>) {
                self._registry = structuredClone(registry);
                self.emit("registry:change" as any, "set", self.id, self._registry);
            },

            update(patch: Record<string, any>) {
                self._registry = { ...(self._registry || {}), ...structuredClone(patch) };
                self.emit("registry:change" as any, "update", self.id, patch);
            },

            addRule(rule: { selector: string; media?: string; css: Record<string, string> }) {
                if (!self._registry) self._registry = {};
                if (!Array.isArray(self._registry.rules)) self._registry.rules = [];
                self._registry.rules.push(structuredClone(rule));
                self.emit("registry:change" as any, "addRule", self.id, rule);
            },

            removeRule(selector: string) {
                if (self._registry && Array.isArray(self._registry.rules)) {
                    self._registry.rules = self._registry.rules.filter((r: any) => r.selector !== selector);
                    self.emit("registry:change" as any, "removeRule", self.id, selector);
                }
            },
        };
    }

    // ---------- Events ----------
    on(event: string, handler: EventHandler): () => void {
        return this.bus.on(event, handler);
    }

    off(event: string, handler: EventHandler): void {
        this.bus.off(event, handler);
    }

    private emit(
        type: ChangeEvent["type"],
        action?: string,
        targetId?: string,
        payload?: any
    ) {
        this.bus.emit({
            type,
            componentId: this.id,
            action,
            targetId,
            payload,
            timestamp: Date.now(),
        });
    }
}