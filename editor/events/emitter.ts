/**
 * Type-safe event emitter for editor events
 */

type EventHandler<T> = (data: T) => void

export class EventEmitter<TEvents extends Record<string, any>> {
    private _listeners: Map<keyof TEvents, Set<EventHandler<unknown>>>

    constructor() {
        this._listeners = new Map()
    }

    /**
     * Subscribe to an event
     * @returns Unsubscribe function
     */
    on<K extends keyof TEvents>(
        event: K,
        handler: EventHandler<TEvents[K]>,
    ): () => void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set())
        }

        const handlers = this._listeners.get(event)!
        handlers.add(handler as EventHandler<unknown>)

        // Return unsubscribe function
        return () => {
            handlers.delete(handler as EventHandler<unknown>)
        }
    }

    /**
     * Subscribe to an event (fires once then unsubscribes)
     */
    once<K extends keyof TEvents>(
        event: K,
        handler: EventHandler<TEvents[K]>,
    ): void {
        const unsubscribe = this.on(event, (data) => {
            handler(data)
            unsubscribe()
        })
    }

    /**
     * Emit an event to all subscribers
     */
    emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
        const handlers = this._listeners.get(event)
        if (!handlers) return

        for (const handler of handlers) {
            handler(data)
        }
    }

    /**
     * Remove all listeners for an event
     */
    off<K extends keyof TEvents>(event: K): void {
        this._listeners.delete(event)
    }

    /**
     * Remove all listeners for all events
     */
    removeAllListeners(): void {
        this._listeners.clear()
    }
}
