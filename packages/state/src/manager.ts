import { ComponentState } from "./state.js";
import type { ComponentSnapshot, EventHandler } from "./types.js";
import { EventBus } from "./events.js";

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