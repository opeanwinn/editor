/**
 * EventBus — central pub/sub system for editor events.
 * All layers, renderers, and selection managers communicate
 * through this bus to stay decoupled from one another.
 */

type EventHandler<T = unknown> = (payload: T) => void;

interface Subscription {
  unsubscribe(): void;
}

class EventBus {
  private listeners: Map<string, Set<EventHandler<unknown>>> = new Map();

  /**
   * Subscribe to an event by name.
   * Returns a subscription handle for cleanup.
   */
  on<T = unknown>(event: string, handler: EventHandler<T>): Subscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;
    handlers.add(handler as EventHandler<unknown>);

    return {
      unsubscribe: () => {
        handlers.delete(handler as EventHandler<unknown>);
        if (handlers.size === 0) {
          this.listeners.delete(event);
        }
      },
    };
  }

  /**
   * Subscribe to an event, auto-unsubscribing after the first emission.
   */
  once<T = unknown>(event: string, handler: EventHandler<T>): Subscription {
    const sub = this.on<T>(event, (payload) => {
      handler(payload);
      sub.unsubscribe();
    });
    return sub;
  }

  /**
   * Emit an event, invoking all registered handlers synchronously.
   */
  emit<T = unknown>(event: string, payload: T): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    // Snapshot to avoid mutation issues during iteration
    for (const handler of [...handlers]) {
      handler(payload);
    }
  }

  /**
   * Remove all listeners for a specific event, or all events if none specified.
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Returns the number of handlers registered for a given event.
   * Useful for debugging and tests.
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /**
   * Returns a list of all event names that currently have active listeners.
   * Handy for debugging — I kept forgetting which events were still live.
   */
  activeEvents(): string[] {
    return [...this.listeners.keys()];
  }
}

// Singleton instance shared across the editor
export const eventBus = new EventBus();
export type { EventHandler, Subscription };
export { EventBus };
