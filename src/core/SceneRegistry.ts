import { EventBus } from './EventBus';

/**
 * NodeRenderer interface — every renderer must implement render().
 */
export interface NodeRenderer<T = unknown> {
  readonly type: string;
  render(node: T, ctx: CanvasRenderingContext2D): void;
  hitTest?(node: T, x: number, y: number): boolean;
}

/**
 * SceneNode is the base shape stored in the scene graph.
 */
export interface SceneNode {
  id: string;
  type: string;
  layerId: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

/**
 * SceneRegistry maintains a map of node-type → renderer and
 * the flat list of scene nodes. It emits events through the
 * shared EventBus so layers and selection managers can react.
 */
export class SceneRegistry {
  private renderers = new Map<string, NodeRenderer>();
  private nodes = new Map<string, SceneNode>();
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  // ── Renderers ────────────────────────────────────────────────

  /** Register a renderer for a given node type. */
  registerRenderer<T>(renderer: NodeRenderer<T>): void {
    if (this.renderers.has(renderer.type)) {
      console.warn(`[SceneRegistry] Overwriting renderer for type "${renderer.type}"`);
    }
    this.renderers.set(renderer.type, renderer as NodeRenderer);
    this.bus.emit('renderer:registered', { type: renderer.type });
  }

  /** Retrieve a renderer by node type. Returns undefined if not found. */
  getRenderer(type: string): NodeRenderer | undefined {
    return this.renderers.get(type);
  }

  // ── Nodes ─────────────────────────────────────────────────────

  /** Add a node to the scene. Emits 'node:added'. */
  addNode(node: SceneNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`[SceneRegistry] Node with id "${node.id}" already exists.`);
    }
    this.nodes.set(node.id, node);
    this.bus.emit('node:added', { node });
  }

  /** Update an existing node by merging a partial patch. Emits 'node:updated'. */
  updateNode(id: string, patch: Partial<SceneNode>): void {
    const existing = this.nodes.get(id);
    if (!existing) {
      throw new Error(`[SceneRegistry] Node "${id}" not found.`);
    }
    // Prevent accidental type changes via patch — type should be immutable after creation.
    const { type: _ignoredType, ...safePatch } = patch as Partial<SceneNode> & { type?: string };
    const updated = { ...existing, ...safePatch, id };
    this.nodes.set(id, updated);
    this.bus.emit('node:updated', { node: updated });
  }

  /** Remove a node by id. Emits 'node:removed'. */
  removeNode(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;
    this.nodes.delete(id);
    this.bus.emit('node:removed', { node });
  }

  /** Return all nodes, optionally filtered by layerId. */
  getNodes(layerId?: string): SceneNode[] {
    const all = Array.from(this.nodes.values());
    return layerId ? all.filter(n => n.layerId === layerId) : all;
  }

  /** Look up a single node by id. */
  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }
}
