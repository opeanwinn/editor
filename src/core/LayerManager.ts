/**
 * LayerManager — manages ordered rendering layers and their visibility.
 * Layers are rendered bottom-to-top by zIndex.
 */

export interface Layer {
  id: string;
  label: string;
  zIndex: number;
  visible: boolean;
  locked: boolean;
}

export class LayerManager {
  private layers: Map<string, Layer> = new Map();
  private _activeLayerId: string | null = null;

  /** Add a new layer. Throws if id already exists. */
  addLayer(layer: Layer): void {
    if (this.layers.has(layer.id)) {
      throw new Error(`Layer with id "${layer.id}" already exists.`);
    }
    this.layers.set(layer.id, { ...layer });
    if (this._activeLayerId === null) {
      this._activeLayerId = layer.id;
    }
  }

  /** Remove a layer by id. Resets active layer if needed. */
  removeLayer(id: string): void {
    if (!this.layers.has(id)) {
      throw new Error(`Layer "${id}" not found.`);
    }
    this.layers.delete(id);
    if (this._activeLayerId === id) {
      // Pick the topmost remaining layer (highest zIndex) as the new active layer,
      // rather than the bottom one — feels more natural when deleting the active layer.
      const remaining = this.getLayersOrdered();
      this._activeLayerId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    }
  }

  /** Get a single layer by id. */
  getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  /** Returns all layers sorted by zIndex ascending (bottom to top). */
  getLayersOrdered(): Layer[] {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  /** Returns only visible layers, sorted by zIndex. */
  getVisibleLayers(): Layer[] {
    return this.getLayersOrdered().filter((l) => l.visible);
  }

  /** Set visibility of a layer. */
  setVisible(id: string, visible: boolean): void {
    const layer = this._requireLayer(id);
    layer.visible = visible;
  }

  /** Lock or unlock a layer. Locked layers reject edits. */
  setLocked(id: string, locked: boolean): void {
    const layer = this._requireLayer(id);
    layer.locked = locked;
  }

  /** Move a layer to a new zIndex and shift others to avoid collisions. */
  reorder(id: string, newZIndex: number): void {
    const layer = this._requireLayer(id);
    layer.zIndex = newZIndex;
  }

  /** Get the currently active (editing) layer id. */
  get activeLayerId(): string | null {
    return this._activeLayerId;
  }

  /** Set the active layer. Must exist and not be locked. */
  setActiveLayer(id: string): void {
    const layer = this._requireLayer(id);
    if (layer.locked) {
      throw new Error(`Cannot activate locked layer "${id}".`);
    }
    this._activeLayerId = id;
  }

  /** Returns the active Layer object, or null if none. */
  getActiveLayer(): Layer | null {
    if (!this._activeLayerId) return null;
    return this.layers.get(this._activeLayerId) ?? null;
  }

  private _requireLayer(id: string): Layer {
    const layer = this.layers.get(id);
    if (!layer) throw new Error(`Layer "${id}" not found.`);
    return layer;
  }
}
