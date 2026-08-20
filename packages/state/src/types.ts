export interface ComponentSnapshot {
    id: string;
    registry?: Record<string, any>;
    layers: string | any[];
    attr: Record<string, any>;
    data: Record<string, any>;
    dataSchema?: Record<string, any>;
}

export interface LayerNode {
    tag: string;
    semanticId: string;
    children?: LayerNode[];
}

export type LayerAction =
    | "append"
    | "before"
    | "after"
    | "wrap"
    | "update"
    | "remove";

export interface ChangeEvent {
    type: "layers:change" | "attr:change" | "data:change" | "change";
    componentId: string;
    action?: string;
    targetId?: string;
    payload?: any;
    timestamp: number;
}

export type EventHandler = (event: ChangeEvent) => void;