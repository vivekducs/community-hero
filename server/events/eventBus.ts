import { AppEvent, EventType } from './eventTypes';

type EventCallback<T extends EventType> = (event: AppEvent<T>) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private listeners: Map<EventType, EventCallback<any>[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Subscribe to a specific event type
   */
  public subscribe<T extends EventType>(type: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);

    // Return an unsubscribe function
    return () => {
      const list = this.listeners.get(type);
      if (list) {
        this.listeners.set(type, list.filter(cb => cb !== callback));
      }
    };
  }

  /**
   * Publish an event to all subscribers asynchronously
   */
  public async publish<T extends EventType>(type: T, payload: any, metadata?: Record<string, any>): Promise<void> {
    const event: AppEvent<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      metadata
    };

    const list = this.listeners.get(type) || [];
    
    // Execute all listeners in parallel, catch errors to ensure isolation
    const promises = list.map(async (callback) => {
      try {
        await callback(event);
      } catch (err) {
        console.error(`Error in event subscriber for ${type}:`, err);
      }
    });

    await Promise.all(promises);
  }
}

export const eventBus = EventBus.getInstance();
