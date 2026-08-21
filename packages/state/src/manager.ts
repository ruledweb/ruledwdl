import { ComponentState } from "./state.js";
import type { ComponentSnapshot, EventHandler } from "./types.js";
import { EventBus } from "./events.js";

export type ComponentInput = Partial<ComponentSnapshot> & {
    id?: string;
    component?: string;
    layers: string | any[];
};

export class ComponentManager {
    private components = new Map<string, ComponentState>();
    private bus = new EventBus();

    list(): string[] {
        return Array.from(this.components.keys());
    }

    has(id: string): boolean {
        return this.components.has(id);
    }

    get(id: string): ComponentSnapshot | null {
        const comp = this.components.get(id);
        return comp ? comp.getSnapshot() : null;
    }

    /** Returns the live ComponentState instance (for ops) */
    getInstance(id: string): ComponentState | null {
        return this.components.get(id) || null;
    }

    create(id: string, initial: Omit<ComponentSnapshot, "id">): ComponentState {
        if (this.components.has(id)) {
            throw new Error(`Component with id "${id}" already exists`);
        }

        const state = new ComponentState({ id, ...initial });
        this.components.set(id, state);

        this.bus.emit({
            type: "change",
            componentId: id,
            action: "create",
            timestamp: Date.now(),
        });

        return state;
    }

    /**
     * Bulk creates multiple components at once.
     * Skips items without a valid id/component property or that already exist in state.
     */
    bulkCreate(components: ComponentInput[]): ComponentState[] {
        const created: ComponentState[] = [];

        for (const item of components) {
            const id = item.id || item.component;
            if (!id || this.components.has(id)) continue;

            const state = new ComponentState({
                id,
                layers: item.layers,
                attr: item.attr || {},
                data: item.data || {},
                registry: item.registry,
                dataSchema: item.dataSchema,
            });

            this.components.set(id, state);
            created.push(state);
        }

        if (created.length > 0) {
            this.bus.emit({
                type: "change",
                componentId: "*",
                action: "bulkCreate",
                payload: { count: created.length, ids: created.map((c) => c.id) },
                timestamp: Date.now(),
            });
        }

        return created;
    }

    /**
     * Loads components from a page definition object into state.
     * Optionally resets (clears) existing components first.
     */
    loadPage(page: { COMPONENTS?: ComponentInput[] }, options: { reset?: boolean } = {}): ComponentState[] {
        if (options.reset) {
            this.clear();
        }
        return this.bulkCreate(page.COMPONENTS || []);
    }

    /**
     * Removes all components from the manager.
     */
    clear(): void {
        const ids = Array.from(this.components.keys());
        if (ids.length === 0) return;

        this.components.clear();

        this.bus.emit({
            type: "change",
            componentId: "*",
            action: "clear",
            payload: { removedIds: ids },
            timestamp: Date.now(),
        });
    }

    remove(id: string): boolean {
        const existed = this.components.delete(id);
        if (existed) {
            this.bus.emit({
                type: "change",
                componentId: id,
                action: "remove",
                timestamp: Date.now(),
            });
        }
        return existed;
    }

    on(event: string, handler: EventHandler): () => void {
        return this.bus.on(event, handler);
    }

    off(event: string, handler: EventHandler): void {
        this.bus.off(event, handler);
    }
}