## pool

Generic ObjectPool<T> to reduce allocations. Key APIs:

- constructor(factory, reset, initialSize?, maxSize?) -> factory function creates new objects, reset prepares object for reuse

- acquire() -> returns an object from the pool (creates new if empty)

- release(obj) -> returns object to pool and calls reset(obj)

- releaseAll(objects) -> release multiple objects in one call

- clear() -> clear available and in-use sets

- getStats() -> returns PoolStats (available, inUse, totalCreated, totalAcquired, totalReleased, hitRate)

- size -> number of available objects

- inUseCount -> number of objects currently checked out

