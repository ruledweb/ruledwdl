import type { ChangeEvent, EventHandler } from "./types.js";

export class EventBus {
    private listeners = new Map<string, Set<EventHandler>>();

    on(event: string, handler: EventHandler): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
        return () => this.off(event, handler);
    }

    off(event: string, handler: EventHandler): void {
        this.listeners.get(event)?.delete(handler);
    }

    emit(event: ChangeEvent): void {
        const handlers = this.listeners.get(event.type);
        if (handlers) {
            handlers.forEach((h) => h(event));
        }
        if (event.type !== "change") {
            const all = this.listeners.get("change");
            if (all) {
                all.forEach((h) => h({ ...event, type: "change" }));
            }
        }
    }

    clear(): void {
        this.listeners.clear();
    }
}