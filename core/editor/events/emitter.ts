/**
 * Generic event emitter for typed events
 */
export class EventEmitter<TEvents extends Record<string, unknown>> {
    private listeners: Map<keyof TEvents, Set<(data: any) => void>> = new Map()

    /**
     * Register an event listener
     * @param event Event name
     * @param callback Callback function
     * @returns Unsubscribe function
     */
    on<K extends keyof TEvents>(
        event: K,
        callback: (data: TEvents[K]) => void,
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        this.listeners.get(event)!.add(callback)

        // Return unsubscribe function
        return () => {
            this.off(event, callback)
        }
    }

    /**
     * Register a one-time event listener
     * @param event Event name
     * @param callback Callback function
     */
    once<K extends keyof TEvents>(
        event: K,
        callback: (data: TEvents[K]) => void,
    ): void {
        const onceCallback = (data: TEvents[K]) => {
            this.off(event, onceCallback)
            callback(data)
        }
        this.on(event, onceCallback)
    }

    /**
     * Remove event listeners
     * @param event Event name
     * @param callback Specific callback to remove (optional)
     */
    off<K extends keyof TEvents>(
        event: K,
        callback?: (data: TEvents[K]) => void,
    ): void {
        if (!this.listeners.has(event)) {
            return
        }

        if (callback) {
            this.listeners.get(event)!.delete(callback)
        } else {
            this.listeners.delete(event)
        }
    }

    /**
     * Emit an event to all listeners
     * @param event Event name
     * @param data Event data
     */
    emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
        if (!this.listeners.has(event)) {
            return
        }

        for (const callback of this.listeners.get(event)!) {
            try {
                callback(data)
            } catch (error) {
                console.error(
                    `Error in event listener for '${String(event)}':`,
                    error,
                )
            }
        }
    }

    /**
     * Remove all event listeners
     */
    removeAllListeners(): void {
        this.listeners.clear()
    }

    /**
     * Get the number of listeners for an event
     * @param event Event name
     */
    listenerCount(event: keyof TEvents): number {
        return this.listeners.get(event)?.size ?? 0
    }

    /**
     * Get all event names that have listeners
     */
    eventNames(): (keyof TEvents)[] {
        return Array.from(this.listeners.keys())
    }
}
