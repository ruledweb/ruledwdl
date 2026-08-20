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
                // Target (and its descendants) move inside the wrapper.
                // Following siblings stay on `list`; serializeLayers emits `<` / `<*N`
                // on the next sibling so it de-indents to the wrapper's depth.
                wrapper.children = [found.node];

                const list = found.parent ? found.parent.children : tree;
                list[found.index] = wrapper;

                setTree(tree);
                self.emit("layers:change", "wrap", targetSemanticId, wrapperLayer);
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

            update(semanticId: string, patch: { tag?: string; semanticId?: string }) {
                const tree = getTree();
                const found = findNode(tree, semanticId);

                if (!found) {
                    throw new Error(`Semantic id "${semanticId}" not found`);
                }

                if (patch.tag) found.node.tag = patch.tag;
                if (patch.semanticId) found.node.semanticId = patch.semanticId;

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