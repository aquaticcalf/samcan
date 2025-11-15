/**
 * Generic object pool for reducing garbage collection pressure
 */
export class ObjectPool<T> {
    private _available: T[] = []
    private _inUse = new Set<T>()
    private _factory: () => T
    private _reset: (obj: T) => void
    private _maxSize: number

    // Statistics
    private _totalCreated = 0
    private _totalAcquired = 0
    private _totalReleased = 0

    constructor(
        factory: () => T,
        reset: (obj: T) => void,
        initialSize: number = 10,
        maxSize: number = 1000,
    ) {
        this._factory = factory
        this._reset = reset
        this._maxSize = maxSize

        // Pre-populate pool (don't count these in totalCreated for hit rate calculation)
        for (let i = 0; i < initialSize; i++) {
            this._available.push(this._factory())
        }
    }

    /**
     * Acquire an object from the pool
     */
    acquire(): T {
        this._totalAcquired++

        let obj = this._available.pop()

        if (!obj) {
            // Pool is empty, create new object
            obj = this._factory()
            this._totalCreated++
        }

        this._inUse.add(obj)
        return obj
    }

    /**
     * Release an object back to the pool
     */
    release(obj: T): void {
        if (!this._inUse.has(obj)) {
            // Object not from this pool or already released
            return
        }

        this._inUse.delete(obj)
        this._totalReleased++

        // Reset object to default state
        this._reset(obj)

        // Only keep up to maxSize objects in pool
        if (this._available.length < this._maxSize) {
            this._available.push(obj)
        }
    }

    /**
     * Release multiple objects at once
     */
    releaseAll(objects: T[]): void {
        for (const obj of objects) {
            this.release(obj)
        }
    }

    /**
     * Clear the pool
     */
    clear(): void {
        this._available = []
        this._inUse.clear()
    }

    /**
     * Get pool statistics
     */
    getStats(): PoolStats {
        return {
            available: this._available.length,
            inUse: this._inUse.size,
            totalCreated: this._totalCreated,
            totalAcquired: this._totalAcquired,
            totalReleased: this._totalReleased,
            hitRate:
                this._totalAcquired > 0
                    ? 1 - this._totalCreated / this._totalAcquired
                    : 0,
        }
    }

    /**
     * Get the current size of available objects
     */
    get size(): number {
        return this._available.length
    }

    /**
     * Get the number of objects currently in use
     */
    get inUseCount(): number {
        return this._inUse.size
    }
}

/**
 * Pool statistics interface
 */
export interface PoolStats {
    available: number
    inUse: number
    totalCreated: number
    totalAcquired: number
    totalReleased: number
    hitRate: number // Percentage of acquires that didn't require new allocation
}
