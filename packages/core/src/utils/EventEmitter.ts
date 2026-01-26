/**
 * Type-safe event emitter using native EventTarget
 * Supports AbortController signals for cleanup
 */

/**
 * Custom event with typed detail
 */
export class ChartEvent<T = unknown> extends CustomEvent<T> {
  constructor(type: string, detail: T) {
    super(type, { detail, bubbles: false, cancelable: true });
  }
}

/**
 * Event map type - any object mapping string keys to event data types
 */
type EventMap = { [key: string]: unknown };

/**
 * Options for event listener registration
 */
export interface ListenerOptions {
  /** AbortSignal for automatic cleanup */
  signal?: AbortSignal;
  /** Only fire once */
  once?: boolean;
}

/**
 * Type-safe event emitter extending native EventTarget
 *
 * Benefits of using EventTarget:
 * - Native browser API with excellent performance
 * - Supports AbortController signals for automatic cleanup
 * - Built-in once option
 * - Compatible with standard event patterns
 *
 * @example
 * ```ts
 * const emitter = new EventEmitter<{ click: { x: number; y: number } }>();
 *
 * // With AbortController for cleanup
 * const controller = new AbortController();
 * emitter.on('click', (e) => console.log(e.detail.x), { signal: controller.signal });
 *
 * // Later, to remove all listeners:
 * controller.abort();
 * ```
 */
export class EventEmitter<Events extends EventMap = EventMap> extends EventTarget {
  /**
   * Subscribe to an event
   * @param type - Event type
   * @param handler - Event handler
   * @param options - Listener options (signal, once)
   * @returns Unsubscribe function
   */
  on<K extends keyof Events & string>(
    type: K,
    handler: (event: ChartEvent<Events[K]>) => void,
    options?: ListenerOptions
  ): () => void {
    const listener = handler as EventListener;

    this.addEventListener(type, listener, {
      signal: options?.signal,
      once: options?.once,
    });

    return () => this.removeEventListener(type, listener);
  }

  /**
   * Subscribe to an event for a single emission
   * @param type - Event type
   * @param handler - Event handler
   * @param options - Listener options (signal)
   * @returns Unsubscribe function
   */
  once<K extends keyof Events & string>(
    type: K,
    handler: (event: ChartEvent<Events[K]>) => void,
    options?: Pick<ListenerOptions, 'signal'>
  ): () => void {
    return this.on(type, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   * @param type - Event type
   * @param handler - Event handler to remove
   */
  off<K extends keyof Events & string>(
    type: K,
    handler: (event: ChartEvent<Events[K]>) => void
  ): void {
    this.removeEventListener(type, handler as EventListener);
  }

  /**
   * Emit an event to all subscribers
   * @param type - Event type
   * @param detail - Event payload
   * @returns Whether the event was not cancelled
   */
  emit<K extends keyof Events & string>(type: K, detail: Events[K]): boolean {
    const event = new ChartEvent(type, detail);
    return this.dispatchEvent(event);
  }
}

/**
 * Create a managed event listener with automatic cleanup
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 *
 * addManagedListener(window, 'resize', handleResize, { signal: controller.signal });
 * addManagedListener(document, 'click', handleClick, { signal: controller.signal });
 *
 * // Cleanup all listeners at once
 * controller.abort();
 * ```
 */
export function addManagedListener<K extends keyof WindowEventMap>(
  target: Window,
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
): () => void;
export function addManagedListener<K extends keyof DocumentEventMap>(
  target: Document,
  type: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions
): () => void;
export function addManagedListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions
): () => void;
export function addManagedListener(
  target: EventTarget,
  type: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): () => void {
  target.addEventListener(type, handler, options);
  return () => target.removeEventListener(type, handler, options);
}
